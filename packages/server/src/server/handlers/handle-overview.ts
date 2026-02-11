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

export const handleOverview = async (app: AppContext, ctx: HttpContext): Promise<void> => {
  const path = getPath(ctx);
  const propertyId = parsePropertyIdFromPath(path);
  if (!propertyId) {
    await writeJson(ctx.Response, 404, serializeError("not_found", "Invalid property route"));
    return;
  }

  const auth = await requireReadKey(app.db, ctx);
  if ("error" in auth) {
    await auth.error;
    return;
  }
  if (auth.property_id !== propertyId) {
    await writeJson(ctx.Response, 403, serializeError("forbidden", "Key does not match property"));
    return;
  }

  const from = getRequiredQuery(ctx, "from");
  const to = getRequiredQuery(ctx, "to");
  if (!from || !to) {
    await writeJson(ctx.Response, 400, serializeError("invalid_request", "Missing from/to"));
    return;
  }

  const range = parseDateRangeUtc(from, to);
  if (!range) {
    await writeJson(ctx.Response, 400, serializeError("invalid_request", "Invalid from/to format (YYYY-MM-DD)"));
    return;
  }

  const totals = await app.db.queryTotals(propertyId, range.fromMs, range.toMsExclusive);
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

  await writeJson(ctx.Response, 200, body);
};
