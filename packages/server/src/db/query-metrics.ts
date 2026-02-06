import type { int, long } from "@tsonic/core/types.js";
import type { out } from "@tsonic/core/types.js";
import { asinterface } from "@tsonic/core/lang.js";
import { Dictionary, HashSet, List } from "@tsonic/dotnet/System.Collections.Generic.js";
import type { IQueryable } from "@tsonic/dotnet/System.Linq.js";
import type { ExtensionMethods as Linq } from "@tsonic/dotnet/System.Linq.js";

import type { MetricsRow as ApiMetricsRow, MetricsTotals } from "../model/api.ts";
import type { ClickmeterDbContext } from "./context.ts";
import type { Event as EventEntity } from "./entities.ts";
import type { GroupByKey, MetricName, MetricsQuery, MetricsResult } from "./clickmeter-db.ts";

type LinqQ<T> = Linq<IQueryable<T>>;

export const queryMetrics = (
  db: ClickmeterDbContext,
  propertyId: string,
  query: MetricsQuery
): MetricsResult => {
  const db0 = db;
  const propertyId0 = propertyId;

  const fromMs = query.fromMs;
  const toMsExclusive = query.toMsExclusive;
  const campaignId = query.campaignId;
  const scopeType = query.scopeType;
  const scopeId = query.scopeId;

  // Optional "paths IN (...)" filter:
  // - Always allocate a (possibly-empty) list so it can be safely captured into the expression tree.
  // - Gate the filter via hasPaths to avoid empty-IN semantics.
  const paths = new List<string>();
  const hasPaths = query.paths !== undefined && query.paths.Length > 0;
  if (query.paths) {
    for (let i = 0; i < query.paths.Length; i++) paths.Add(query.paths[i]);
  }

  // Totals (computed in DB)
  const totals: Record<string, int> = {};
  for (let i = 0; i < query.metrics.Length; i++) {
    const m = query.metrics[i];
    if (m === "pageviews") {
      totals[m] = asinterface<LinqQ<EventEntity>>(db0.Events)
        .Where((e) => e.PropertyId === propertyId0 && e.Ts >= fromMs && e.Ts < toMsExclusive)
        .Where((e) => !hasPaths || (e.Path !== undefined && paths.Contains(e.Path!)))
        .Where((e) => campaignId === undefined || e.CampaignId === campaignId)
        .Where((e) => scopeType === undefined || e.ScopeType === scopeType)
        .Where((e) => scopeId === undefined || e.ScopeId === scopeId)
        .Count();
    } else if (m === "unique_visitors") {
      totals[m] = asinterface<LinqQ<EventEntity>>(db0.Events)
        .Where((e) => e.PropertyId === propertyId0 && e.Ts >= fromMs && e.Ts < toMsExclusive)
        .Where((e) => !hasPaths || (e.Path !== undefined && paths.Contains(e.Path!)))
        .Where((e) => campaignId === undefined || e.CampaignId === campaignId)
        .Where((e) => scopeType === undefined || e.ScopeType === scopeType)
        .Where((e) => scopeId === undefined || e.ScopeId === scopeId)
        .Where((e) => e.VisitorId !== undefined && e.VisitorId !== "")
        .Select((e) => e.VisitorId!)
        .Distinct()
        .Count();
    } else if (m === "sessions") {
      totals[m] = asinterface<LinqQ<EventEntity>>(db0.Events)
        .Where((e) => e.PropertyId === propertyId0 && e.Ts >= fromMs && e.Ts < toMsExclusive)
        .Where((e) => !hasPaths || (e.Path !== undefined && paths.Contains(e.Path!)))
        .Where((e) => campaignId === undefined || e.CampaignId === campaignId)
        .Where((e) => scopeType === undefined || e.ScopeType === scopeType)
        .Where((e) => scopeId === undefined || e.ScopeId === scopeId)
        .Where((e) => e.SessionId !== undefined && e.SessionId !== "")
        .Select((e) => e.SessionId!)
        .Distinct()
        .Count();
    }
  }

  // Grouped rows: materialize and group in memory to avoid expression-tree projections.
  const events = asinterface<LinqQ<EventEntity>>(db0.Events)
    .Where((e) => e.PropertyId === propertyId0 && e.Ts >= fromMs && e.Ts < toMsExclusive)
    .Where((e) => !hasPaths || (e.Path !== undefined && paths.Contains(e.Path!)))
    .Where((e) => campaignId === undefined || e.CampaignId === campaignId)
    .Where((e) => scopeType === undefined || e.ScopeType === scopeType)
    .Where((e) => scopeId === undefined || e.ScopeId === scopeId)
    .ToArray();

  const rows = groupMetrics(events, query.metrics, query.groupBy, query.limit);
  return { rows, totals };
};

type MetricCounter = {
  pageviews: int;
  visitors: HashSet<string>;
  sessions: HashSet<string>;
};

class MetricBucket implements MetricCounter {
  readonly group: Record<string, string>;
  pageviews: int = 0;
  visitors: HashSet<string> = new HashSet<string>();
  sessions: HashSet<string> = new HashSet<string>();

  constructor(group: Record<string, string>) {
    this.group = group;
  }
}

const groupMetrics = (
  events: readonly EventEntity[],
  metrics: readonly MetricName[],
  groupBy: readonly GroupByKey[],
  limit?: int
): ApiMetricsRow[] => {
  if (groupBy.Length === 0) return [];

  const map = new Dictionary<string, MetricBucket>();

  for (let i = 0; i < events.Length; i++) {
    const e = events[i];

    const group: Record<string, string> = {};
    let key = "";
    for (let j = 0; j < groupBy.Length; j++) {
      const g = groupBy[j];
      let value = "";
      if (g === "path") value = e.Path ?? "";
      else if (g === "campaign_id") value = e.CampaignId ?? "";
      else if (g === "scope_type") value = e.ScopeType ?? "";
      else if (g === "scope_id") value = e.ScopeId ?? "";

      group[g] = value;
      key += `${g}=${value}\u001f`;
    }

    let bucket = null as unknown as MetricBucket;
    if (!map.TryGetValue(key, bucket as out<MetricBucket>)) {
      bucket = new MetricBucket(group);
      map.Add(key, bucket);
    }

    bucket.pageviews++;
    const v = e.VisitorId;
    if (v !== undefined && v !== "") bucket.visitors.Add(v);
    const s = e.SessionId;
    if (s !== undefined && s !== "") bucket.sessions.Add(s);
  }

  const rows = new List<ApiMetricsRow>();
  const iter = map.GetEnumerator();
  while (iter.MoveNext()) {
    const pair = iter.Current;
    const group = pair.Value.group;
    const out: MetricsTotals = {};
    for (let j = 0; j < metrics.Length; j++) {
      const m = metrics[j];
      if (m === "pageviews") out[m] = pair.Value.pageviews;
      else if (m === "unique_visitors") out[m] = pair.Value.visitors.Count;
      else if (m === "sessions") out[m] = pair.Value.sessions.Count;
    }

    rows.Add({ group, metrics: out });
  }

  const arr = rows.ToArray();
  // Desc by pageviews if present
  for (let i = 0; i < arr.Length; i++) {
    for (let j = i + 1; j < arr.Length; j++) {
      const a = arr[i].metrics["pageviews"] ?? 0;
      const b = arr[j].metrics["pageviews"] ?? 0;
      if (b > a) {
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
    }
  }

  if (limit !== undefined && limit > 0 && limit < arr.Length) {
    const out = new List<ApiMetricsRow>();
    for (let i = 0; i < limit; i++) out.Add(arr[i]);
    return out.ToArray();
  }

  return arr;
};
