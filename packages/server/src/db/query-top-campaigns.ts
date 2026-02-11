import type { int, long } from "@tsonic/core/types.js";

import type { ClickmeterDbContext } from "./context.ts";
import type { TopRow } from "./clickmeter-db.ts";
import { topByKey } from "./top-by-key.ts";

export const queryTopCampaigns = async (
  db: ClickmeterDbContext,
  propertyId: string,
  fromMs: long,
  toMsExclusive: long,
  limit: int
): Promise<TopRow[]> => {
  const db0 = db;
  const propertyId0 = propertyId;
  const fromMs0 = fromMs;
  const toMsExclusive0 = toMsExclusive;

  const events = await db0.Events
    .Where((e) => e.PropertyId === propertyId0 && e.Ts >= fromMs0 && e.Ts < toMsExclusive0)
    .Where((e) => e.CampaignId !== undefined && e.CampaignId !== "")
    .ToArrayAsync();

  return topByKey(events, limit, (e) => e.CampaignId!, (e) => e.VisitorId);
};
