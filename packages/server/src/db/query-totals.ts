import type { int, long } from "@tsonic/core/types.js";

import type { OverviewTotals } from "../model/api.ts";
import type { ClickmeterDbContext } from "./context.ts";

export const queryTotals = async (
  db: ClickmeterDbContext,
  propertyId: string,
  fromMs: long,
  toMsExclusive: long
): Promise<OverviewTotals> => {
  // EF query precompilation (NativeAOT) is sensitive to intermediate query
  // variables. Keep the query root as `db0.Events` and capture values into locals.
  const db0 = db;
  const propertyId0 = propertyId;
  const fromMs0 = fromMs;
  const toMsExclusive0 = toMsExclusive;

  const pageviews: int = await db0.Events
    .Where((e) => e.PropertyId === propertyId0 && e.Ts >= fromMs0 && e.Ts < toMsExclusive0)
    .CountAsync();

  const uniqueVisitors: int = await db0.Events
    .Where((e) => e.PropertyId === propertyId0 && e.Ts >= fromMs0 && e.Ts < toMsExclusive0)
    .Where((e) => e.VisitorId !== undefined && e.VisitorId !== "")
    .Select((e) => e.VisitorId!)
    .Distinct()
    .CountAsync();

  const sessions: int = await db0.Events
    .Where((e) => e.PropertyId === propertyId0 && e.Ts >= fromMs0 && e.Ts < toMsExclusive0)
    .Where((e) => e.SessionId !== undefined && e.SessionId !== "")
    .Select((e) => e.SessionId!)
    .Distinct()
    .CountAsync();

  return { pageviews, unique_visitors: uniqueVisitors, sessions };
};
