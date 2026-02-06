import { Task } from "@tsonic/dotnet/System.Threading.Tasks.js";

import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

import { getPath } from "../../http/get-path.ts";
import { getQuery } from "../../http/get-query.ts";
import { writeJson } from "../../http/write-json.ts";
import { jsonStringify } from "../../json/json-stringify.ts";
import { getRequiredQuery } from "../lib/get-required-query.ts";
import { parseDateRangeUtc } from "../lib/parse-date-range-utc.ts";
import { parseLimit } from "../lib/parse-limit.ts";
import { parsePropertyIdFromPath } from "../lib/parse-property-id-from-path.ts";
import { requireReadKey } from "../lib/require-read-key.ts";
import { serializeError } from "../lib/serialize-error.ts";
import type { AppContext } from "../create-app-handlers.ts";

export const handleTopCampaigns = (app: AppContext, ctx: HttpContext): Task => {
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

  const limit = parseLimit(getQuery(ctx, "limit"), 50);

  const rawRows = app.db.queryTopCampaigns(propertyId, range.fromMs, range.toMsExclusive, limit);

  const body = jsonStringify((w) => {
    w.WriteStartObject();
    w.WriteString("property_id", propertyId);
    w.WriteString("from", from);
    w.WriteString("to", to);
    w.WriteString("tz", "UTC");
    w.WriteStartArray("rows");
    for (let i = 0; i < rawRows.Length; i++) {
      const r = rawRows[i];
      w.WriteStartObject();
      w.WriteString("campaign_id", r.key);
      w.WriteNumber("pageviews", r.pageviews);
      w.WriteNumber("unique_visitors", r.unique_visitors);
      w.WriteEndObject();
    }
    w.WriteEndArray();
    w.WriteEndObject();
  });

  return writeJson(ctx.Response, 200, body);
};
