import type { int, long } from "@tsonic/core/types.js";
import { asinterface } from "@tsonic/core/lang.js";
import type { IQueryable } from "@tsonic/dotnet/System.Linq.js";
import type { ExtensionMethods as Linq } from "@tsonic/dotnet/System.Linq.js";

import type { ClickmeterDbContext } from "./context.ts";
import type { Event as EventEntity } from "./entities.ts";
import type { TopRow } from "./clickmeter-db.ts";
import { topByKey } from "./top-by-key.ts";

type LinqQ<T> = Linq<IQueryable<T>>;

export const queryTopCampaigns = (
  db: ClickmeterDbContext,
  propertyId: string,
  fromMs: long,
  toMsExclusive: long,
  limit: int
): TopRow[] => {
  const db0 = db;
  const propertyId0 = propertyId;
  const fromMs0 = fromMs;
  const toMsExclusive0 = toMsExclusive;

  const events = asinterface<LinqQ<EventEntity>>(db0.Events)
    .Where((e) => e.PropertyId === propertyId0 && e.Ts >= fromMs0 && e.Ts < toMsExclusive0)
    .Where((e) => e.CampaignId !== undefined && e.CampaignId !== "")
    .ToList()
    .ToArray();

  return topByKey(events, limit, (e) => e.CampaignId!, (e) => e.VisitorId);
};
