import { JsonValueKind } from "@tsonic/dotnet/System.Text.Json.js";
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";
import { Task, TaskExtensions } from "@tsonic/dotnet/System.Threading.Tasks.js";

import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

import type { AdminCreatePropertyResponse } from "../../model/api.ts";
import { readRequestBodyAsync } from "../../http/read-request-body-async.ts";
import { writeJson } from "../../http/write-json.ts";
import { jsonStringify } from "../../json/json-stringify.ts";
import { parseJsonRoot } from "../../json/parse-json-root.ts";
import { getBearerToken } from "../lib/get-bearer-token.ts";
import { serializeError } from "../lib/serialize-error.ts";
import type { AppContext } from "../create-app-handlers.ts";

const EMPTY_STRING_ARRAY: string[] = [];

type AdminCreatePropertyPayload = {
  readonly property_id: string;
  readonly allowed_origins: readonly string[];
};

const parseAdminCreatePropertyPayload = (json: string): AdminCreatePropertyPayload | undefined => {
  const root = parseJsonRoot(json);
  if (root.ValueKind !== JsonValueKind.Object) return undefined;

  try {
    const propertyId = root.GetProperty("property_id").GetString();
    if (propertyId === undefined || propertyId.Trim() === "") return undefined;

    let allowedOrigins = EMPTY_STRING_ARRAY;
    try {
      const allowed = root.GetProperty("allowed_origins");
      if (allowed.ValueKind === JsonValueKind.Array) {
        const items = new List<string>();
        const e = allowed.EnumerateArray();
        try {
          while (e.MoveNext()) {
            const s = e.Current.GetString();
            if (s !== undefined) items.Add(s);
          }
        } finally {
          e.Dispose();
        }
        allowedOrigins = items.ToArray();
      }
    } catch (_missing) {
      // optional
    }

    return { property_id: propertyId.Trim(), allowed_origins: allowedOrigins };
  } catch (_err) {
    return undefined;
  }
};

const serializeAdminCreatePropertyResponse = (res: AdminCreatePropertyResponse): string => {
  return jsonStringify((w) => {
    w.WriteStartObject();
    w.WriteString("property_id", res.property_id);
    w.WriteString("write_key", res.write_key);
    w.WriteString("read_key", res.read_key);
    w.WriteEndObject();
  });
};

export const handleAdminCreateProperty = (app: AppContext, ctx: HttpContext): Task => {
  const { db, adminToken } = app;

  if (!adminToken || adminToken.Trim() === "") {
    return writeJson(ctx.Response, 500, serializeError("misconfigured", "CLICKMETER_ADMIN_TOKEN is not set"));
  }

  const token = getBearerToken(ctx);
  if (!token || token !== adminToken) {
    return writeJson(ctx.Response, 401, serializeError("unauthorized", "Invalid admin token"));
  }

  return TaskExtensions.Unwrap(
    readRequestBodyAsync(ctx).ContinueWith<Task>((t, _state) => {
      const req = parseAdminCreatePropertyPayload(t.Result);
      if (!req) {
        return writeJson(ctx.Response, 400, serializeError("invalid_request", "Invalid JSON: expected {\"property_id\": \"...\"}"));
      }

      const created = db.createProperty(req.property_id, req.allowed_origins);
      if (created === undefined) {
        return writeJson(ctx.Response, 409, serializeError("conflict", "property_id already exists"));
      }

      const res: AdminCreatePropertyResponse = {
        property_id: created.property_id,
        write_key: created.write_key,
        read_key: created.read_key,
      };
      return writeJson(ctx.Response, 201, serializeAdminCreatePropertyResponse(res));
    }, undefined)
  );
};
