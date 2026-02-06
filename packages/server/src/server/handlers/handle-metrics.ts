import { List } from "@tsonic/dotnet/System.Collections.Generic.js";
import { Task } from "@tsonic/dotnet/System.Threading.Tasks.js";

import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

import { getPath } from "../../http/get-path.ts";
import { getQuery } from "../../http/get-query.ts";
import { writeJson } from "../../http/write-json.ts";
import { jsonStringify } from "../../json/json-stringify.ts";
import type { GroupByKey, MetricName } from "../../db/clickmeter-db.ts";
import { getRequiredQuery } from "../lib/get-required-query.ts";
import { parseDateRangeUtc } from "../lib/parse-date-range-utc.ts";
import { parseLimit } from "../lib/parse-limit.ts";
import { parsePropertyIdFromPath } from "../lib/parse-property-id-from-path.ts";
import { requireReadKey } from "../lib/require-read-key.ts";
import { serializeError } from "../lib/serialize-error.ts";
import type { AppContext } from "../create-app-handlers.ts";

const splitCsv = (raw: string | undefined): string[] => {
  if (!raw) return [];
  const trimmed = raw.Trim();
  if (trimmed === "") return [];
  const parts = trimmed.Split(",");
  const out = new List<string>();
  for (let i = 0; i < parts.Length; i++) {
    const part = parts[i].Trim();
    if (part !== "") out.Add(part);
  }
  return out.ToArray();
};

const parseMetricsList = (raw: string | undefined): MetricName[] | undefined => {
  const items = splitCsv(raw);
  if (items.Length === 0) return ["pageviews", "unique_visitors", "sessions"];
  const out = new List<MetricName>();
  for (let i = 0; i < items.Length; i++) {
    const m = items[i];
    if (m === "pageviews" || m === "unique_visitors" || m === "sessions") out.Add(m);
    else return undefined;
  }
  return out.ToArray();
};

const parseGroupByList = (raw: string | undefined): GroupByKey[] | undefined => {
  const items = splitCsv(raw);
  if (items.Length === 0) return [];

  const deduped = new List<GroupByKey>();

  for (let i = 0; i < items.Length; i++) {
    const g = items[i];

    if (g !== "path" && g !== "campaign_id" && g !== "scope_type" && g !== "scope_id") return undefined;

    // Dedup while preserving order.
    if (!deduped.Contains(g as GroupByKey)) deduped.Add(g);
  }

  return deduped.ToArray();
};

export const handleMetrics = (app: AppContext, ctx: HttpContext): Task => {
  const path = getPath(ctx);
  const propertyId = parsePropertyIdFromPath(path);
  if (!propertyId) return writeJson(ctx.Response, 404, serializeError("not_found", "Invalid property route"));

  const auth = requireReadKey(app.db, ctx);
  if ("error" in auth) return auth.error;
  if (auth.property_id !== propertyId) return writeJson(ctx.Response, 403, serializeError("forbidden", "Key does not match property"));

  const from = getRequiredQuery(ctx, "from");
  const to = getRequiredQuery(ctx, "to");
  if (!from || !to) return writeJson(ctx.Response, 400, serializeError("invalid_request", "Missing from/to"));

  const range = parseDateRangeUtc(from, to);
  if (!range) return writeJson(ctx.Response, 400, serializeError("invalid_request", "Invalid from/to format (YYYY-MM-DD)"));

  const metrics = parseMetricsList(getQuery(ctx, "metrics"));
  if (!metrics) return writeJson(ctx.Response, 400, serializeError("invalid_request", "Invalid metrics list"));

  const groupBy = parseGroupByList(getQuery(ctx, "group_by"));
  if (!groupBy) return writeJson(ctx.Response, 400, serializeError("invalid_request", "Invalid group_by list"));

  const limitRaw = getQuery(ctx, "limit");
  const limit = limitRaw ? parseLimit(limitRaw, 100) : undefined;

  const paths = splitCsv(getQuery(ctx, "path"));
  const campaignId = getQuery(ctx, "campaign_id") ?? undefined;
  const scopeType = getQuery(ctx, "scope_type") ?? undefined;
  const scopeId = getQuery(ctx, "scope_id") ?? undefined;

  const result = app.db.queryMetrics(propertyId, {
    fromMs: range.fromMs,
    toMsExclusive: range.toMsExclusive,
    metrics,
    groupBy,
    paths: paths.Length > 0 ? paths : undefined,
    campaignId,
    scopeType,
    scopeId,
    limit,
  });

  const body = jsonStringify((w) => {
    w.WriteStartObject();
    w.WriteString("property_id", propertyId);
    w.WriteString("from", from);
    w.WriteString("to", to);
    w.WriteString("tz", "UTC");

    w.WriteStartArray("metrics");
    for (let i = 0; i < metrics.Length; i++) w.WriteStringValue(metrics[i]);
    w.WriteEndArray();

    w.WriteStartArray("group_by");
    for (let i = 0; i < groupBy.Length; i++) w.WriteStringValue(groupBy[i]);
    w.WriteEndArray();

    w.WriteStartObject("filters");
    w.WriteStartArray("path");
    for (let i = 0; i < paths.Length; i++) w.WriteStringValue(paths[i]);
    w.WriteEndArray();

    w.WriteStartArray("campaign_id");
    if (campaignId !== undefined) w.WriteStringValue(campaignId);
    w.WriteEndArray();

    w.WriteStartArray("scope_type");
    if (scopeType !== undefined) w.WriteStringValue(scopeType);
    w.WriteEndArray();

    w.WriteStartArray("scope_id");
    if (scopeId !== undefined) w.WriteStringValue(scopeId);
    w.WriteEndArray();
    w.WriteEndObject();

    w.WriteStartArray("rows");
    for (let i = 0; i < result.rows.Length; i++) {
      const row = result.rows[i];
      w.WriteStartObject();
      if (row.bucket !== undefined) w.WriteString("bucket", row.bucket);
      if (row.group !== undefined) {
        w.WriteStartObject("group");
        for (const k in row.group) w.WriteString(k, row.group[k]);
        w.WriteEndObject();
      }

      w.WriteStartObject("metrics");
      for (const k in row.metrics) w.WriteNumber(k, row.metrics[k]);
      w.WriteEndObject();
      w.WriteEndObject();
    }
    w.WriteEndArray();

    w.WriteStartObject("totals");
    for (const k in result.totals) w.WriteNumber(k, result.totals[k]);
    w.WriteEndObject();
    w.WriteEndObject();
  });

  return writeJson(ctx.Response, 200, body);
};
