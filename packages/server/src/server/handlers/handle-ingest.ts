import { int, long } from "@tsonic/core/types.js";
import { DateTimeOffset } from "@tsonic/dotnet/System.js";
import { JsonElement, JsonValueKind } from "@tsonic/dotnet/System.Text.Json.js";
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";

import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

import type { IngestErrorItem } from "../../model/api.ts";
import { readRequestBodyAsync } from "../../http/read-request-body-async.ts";
import { writeJson } from "../../http/write-json.ts";
import { jsonStringify } from "../../json/json-stringify.ts";
import { parseJsonRoot } from "../../json/parse-json-root.ts";
import { stringifyStringRecord } from "../../json/stringify-string-record.ts";
import type { InsertEvent } from "../../db/clickmeter-db.ts";
import type { KeyRecord } from "../../db/clickmeter-db.ts";
import { getBearerToken } from "../lib/get-bearer-token.ts";
import { getOrigin } from "../lib/get-origin.ts";
import { serializeError } from "../lib/serialize-error.ts";
import { setCorsHeaders } from "../lib/set-cors-headers.ts";
import type { AppContext } from "../create-app-handlers.ts";

const parseIsoOrNowUnixMs = (value: string | undefined): long => {
  if (value === undefined || value.Trim() === "") return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
  try {
    return DateTimeOffset.Parse(value).ToUnixTimeMilliseconds();
  } catch (_err) {
    return DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
  }
};

const mergeDims = (
  base: Record<string, string> | undefined,
  overlay: Record<string, string> | undefined
): Record<string, string> | undefined => {
  if (base === undefined && overlay === undefined) return undefined;
  const merged: Record<string, string> = {};
  if (base) {
    for (const k in base) merged[k] = base[k];
  }
  if (overlay) {
    for (const k in overlay) merged[k] = overlay[k];
  }
  return merged;
};

const getOptionalObject = (obj: JsonElement, name: string): JsonElement => {
  try {
    const el = obj.GetProperty(name);
    return el.ValueKind === JsonValueKind.Object ? el : new JsonElement();
  } catch (_err) {
    return new JsonElement();
  }
};

const getOptionalString = (obj: JsonElement, name: string): string | undefined => {
  try {
    const el = obj.GetProperty(name);
    if (el.ValueKind !== JsonValueKind.String) return undefined;
    const s = el.GetString();
    return s === undefined ? undefined : s;
  } catch (_err) {
    return undefined;
  }
};

const readStringRecord = (obj: JsonElement): Record<string, string> | undefined => {
  if (obj.ValueKind !== JsonValueKind.Object) return undefined;

  const out: Record<string, string> = {};
  const e = obj.EnumerateObject();
  try {
    while (e.MoveNext()) {
      const p = e.Current;
      const v = p.Value;
      if (v.ValueKind === JsonValueKind.String) {
        const s = v.GetString();
        if (s !== undefined) out[p.Name] = s;
      }
    }
  } finally {
    e.Dispose();
  }
  return out;
};

const serializeIngestAck = (accepted: int, rejected: int, deduped: int, errors: readonly IngestErrorItem[]): string => {
  return jsonStringify((w) => {
    w.WriteStartObject();
    w.WriteNumber("accepted", accepted);
    w.WriteNumber("rejected", rejected);
    w.WriteNumber("deduped", deduped);
    w.WriteStartArray("errors");
    for (let i = 0; i < errors.Length; i++) {
      const e = errors[i];
      w.WriteStartObject();
      w.WriteNumber("index", e.index);
      w.WriteString("code", e.code);
      w.WriteString("message", e.message);
      w.WriteEndObject();
    }
    w.WriteEndArray();
    w.WriteEndObject();
  });
};

export const handleIngest = (app: AppContext, ctx: HttpContext): PromiseLike<void> => {
  const { db } = app;

  const token = getBearerToken(ctx);
  if (!token) return writeJson(ctx.Response, 401, serializeError("unauthorized", "Missing bearer token"));

  const key = db.lookupKey(token);
  if (!key || key.kind !== "write") {
    return writeJson(ctx.Response, 401, serializeError("unauthorized", "Invalid write key"));
  }

  return handleIngestBody(app, ctx, key);
};

const handleIngestBody = async (app: AppContext, ctx: HttpContext, key: KeyRecord): Promise<void> => {
  const { db } = app;

  const body = await readRequestBodyAsync(ctx);
  const root = parseJsonRoot(body);
  if (root.ValueKind !== JsonValueKind.Object) {
    await writeJson(
      ctx.Response,
      400,
      serializeError("invalid_request", "Invalid JSON envelope")
    );
    return;
  }

  let schemaVersion: int = 0;
  try {
    schemaVersion = root.GetProperty("schema_version").GetInt32();
  } catch (_err) {
    await writeJson(
      ctx.Response,
      400,
      serializeError("invalid_request", "Invalid JSON envelope")
    );
    return;
  }

  const propertyId = getOptionalString(root, "property_id");
  if (propertyId === undefined || propertyId.Trim() === "") {
    await writeJson(
      ctx.Response,
      400,
      serializeError("invalid_request", "Invalid JSON envelope")
    );
    return;
  }

  const propertyIdTrimmed = propertyId.Trim();

  if (propertyIdTrimmed !== key.property_id) {
    await writeJson(
      ctx.Response,
      403,
      serializeError("forbidden", "Key does not match property_id")
    );
    return;
  }

  const property = db.getProperty(propertyIdTrimmed);
  if (!property) {
    await writeJson(
      ctx.Response,
      404,
      serializeError("not_found", "Unknown property_id")
    );
    return;
  }

  const origin = getOrigin(ctx);
  if (origin) {
    if (property.allowed_origins.Length > 0) {
      let ok = false;
      for (
        let originIndex = 0;
        originIndex < property.allowed_origins.Length;
        originIndex++
      ) {
        if (property.allowed_origins[originIndex] === origin) {
          ok = true;
          break;
        }
      }
      if (!ok) {
        await writeJson(
          ctx.Response,
          403,
          serializeError("origin_forbidden", "Origin not allowed for this property")
        );
        return;
      }
    }
    setCorsHeaders(ctx, origin);
  }

  if (schemaVersion !== 1) {
    await writeJson(
      ctx.Response,
      400,
      serializeError("unsupported_schema", "Only schema_version=1 is supported")
    );
    return;
  }

  let eventsEl = new JsonElement();
  try {
    eventsEl = root.GetProperty("events");
  } catch (_missing) {
    await writeJson(
      ctx.Response,
      400,
      serializeError("invalid_request", "Invalid JSON envelope: missing events")
    );
    return;
  }
  if (eventsEl.ValueKind !== JsonValueKind.Array) {
    await writeJson(
      ctx.Response,
      400,
      serializeError("invalid_request", "Invalid JSON envelope: missing events")
    );
    return;
  }

  const errors = new List<IngestErrorItem>();
  const inserts = new List<InsertEvent>();
  let rejected: int = 0;

  const scopeObj = getOptionalObject(root, "scope");
  const envelopeScopeType = getOptionalString(scopeObj, "type");
  const envelopeScopeId = getOptionalString(scopeObj, "id");
  const envelopeDims = readStringRecord(getOptionalObject(root, "dims"));

  const receivedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

  const ua = ctx.Request.Headers.UserAgent.ToString();
  const userAgent = ua.Trim() === "" ? undefined : ua;
  const ip = ctx.Connection.RemoteIpAddress?.ToString();

  const ev = eventsEl.EnumerateArray();
  let eventIndex = 0;
  try {
    while (ev.MoveNext()) {
      const e = ev.Current;
      if (e.ValueKind !== JsonValueKind.Object) {
        errors.Add({
          index: eventIndex as int,
          code: "invalid_event",
          message: "Event must be an object",
        });
        rejected = rejected + 1;
        eventIndex++;
        continue;
      }

      const eventId = getOptionalString(e, "event_id");
      const type = getOptionalString(e, "type");
      if (
        eventId === undefined ||
        eventId.Trim() === "" ||
        type === undefined ||
        type.Trim() === ""
      ) {
        errors.Add({
          index: eventIndex as int,
          code: "invalid_event",
          message: "Missing event_id or type",
        });
        rejected = rejected + 1;
        eventIndex++;
        continue;
      }

      const tsIso = getOptionalString(e, "ts");
      const ts = parseIsoOrNowUnixMs(tsIso);

      const eventScope = getOptionalObject(e, "scope");
      const scopeType = getOptionalString(eventScope, "type") ?? envelopeScopeType;
      const scopeId = getOptionalString(eventScope, "id") ?? envelopeScopeId;

      const eventDims = readStringRecord(getOptionalObject(e, "dims"));
      const mergedDims = mergeDims(envelopeDims, eventDims);
      const dimsJson = mergedDims ? stringifyStringRecord(mergedDims) : undefined;

      const data = readStringRecord(getOptionalObject(e, "data"));
      const dataJson = data ? stringifyStringRecord(data) : undefined;

      const context = getOptionalObject(e, "context");
      const page = getOptionalObject(context, "page");
      const campaign = getOptionalObject(context, "campaign");
      const utm = getOptionalObject(campaign, "utm");

      const identity = getOptionalObject(e, "identity");

      inserts.Add({
        event_id: eventId.Trim(),
        type: type.Trim(),
        ts,
        received_at: receivedAt,
        url: getOptionalString(page, "url"),
        path: getOptionalString(page, "path"),
        title: getOptionalString(page, "title"),
        referrer: getOptionalString(page, "referrer"),
        campaign_id: getOptionalString(campaign, "campaign_id"),
        utm_source: getOptionalString(utm, "source"),
        utm_medium: getOptionalString(utm, "medium"),
        utm_campaign: getOptionalString(utm, "campaign"),
        visitor_id: getOptionalString(identity, "visitor_id"),
        session_id: getOptionalString(identity, "session_id"),
        user_id_hash: getOptionalString(identity, "user_id_hash"),
        scope_type: scopeType,
        scope_id: scopeId,
        data_json: dataJson,
        dims: mergedDims,
        dims_json: dimsJson,
        user_agent: userAgent,
        ip: ip ?? undefined,
      });

      eventIndex++;
    }
  } finally {
    ev.Dispose();
  }

  const result = db.insertEvents(propertyIdTrimmed, inserts.ToArray());

  const ackBody = serializeIngestAck(
    result.accepted,
    rejected,
    result.deduped,
    errors.ToArray()
  );
  await writeJson(ctx.Response, 200, ackBody);
};
