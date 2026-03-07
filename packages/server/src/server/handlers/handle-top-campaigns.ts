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

export const handleTopCampaigns = async (app: AppContext, ctx: HttpContext): Promise<void> => {
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

  const limit = parseLimit(getQuery(ctx, "limit"), 50);

  const rawRows = await app.db.queryTopCampaigns(propertyId, range.fromMs, range.toMsExclusive, limit);

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

  await writeJson(ctx.Response, 200, body);
};
