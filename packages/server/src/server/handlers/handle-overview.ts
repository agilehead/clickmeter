import { Task } from "@tsonic/dotnet/System.Threading.Tasks.js";

import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

import { getPath } from "../../http/get-path.ts";
import { writeJson } from "../../http/write-json.ts";
import { jsonStringify } from "../../json/json-stringify.ts";
import { getRequiredQuery } from "../lib/get-required-query.ts";
import { parseDateRangeUtc } from "../lib/parse-date-range-utc.ts";
import { parsePropertyIdFromPath } from "../lib/parse-property-id-from-path.ts";
import { requireReadKey } from "../lib/require-read-key.ts";
import { serializeError } from "../lib/serialize-error.ts";
import type { AppContext } from "../create-app-handlers.ts";

export const handleOverview = (app: AppContext, ctx: HttpContext): Task => {
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

  const totals = app.db.queryTotals(propertyId, range.fromMs, range.toMsExclusive);
  const body = jsonStringify((w) => {
    w.WriteStartObject();
    w.WriteString("property_id", propertyId);
    w.WriteString("from", from);
    w.WriteString("to", to);
    w.WriteString("tz", "UTC");
    w.WriteStartObject("totals");
    w.WriteNumber("pageviews", totals.pageviews);
    w.WriteNumber("unique_visitors", totals.unique_visitors);
    w.WriteNumber("sessions", totals.sessions);
    w.WriteEndObject();
    w.WriteEndObject();
  });

  return writeJson(ctx.Response, 200, body);
};
