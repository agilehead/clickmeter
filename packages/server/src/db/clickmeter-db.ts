import { int, long } from "@tsonic/core/types.js";
import { Convert, DateTimeOffset, Guid } from "@tsonic/dotnet/System.js";
import { Encoding } from "@tsonic/dotnet/System.Text.js";
import { SHA256 } from "@tsonic/dotnet/System.Security.Cryptography.js";
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";

import type { ClickmeterDbContext } from "./context.ts";
import { ClickmeterDbContext as ClickmeterDbContextCtor } from "./context.ts";
import type { ApiKeyKind } from "./entities.ts";
import { ApiKey, Event, EventDim, PropertyRow } from "./entities.ts";
import type { DbContextOptions } from "@tsonic/efcore/Microsoft.EntityFrameworkCore.js";
import { createDbOptions } from "./options.ts";
import type { MetricsRow as ApiMetricsRow, MetricsTotals, OverviewTotals } from "../model/api.ts";
import { parseStringArray } from "../json/parse-string-array.ts";
import { stringifyStringArray } from "../json/stringify-string-array.ts";
import { queryMetrics as runQueryMetrics } from "./query-metrics.ts";
import { queryTopCampaigns as runQueryTopCampaigns } from "./query-top-campaigns.ts";
import { queryTopPaths as runQueryTopPaths } from "./query-top-paths.ts";
import { queryTotals as runQueryTotals } from "./query-totals.ts";

export type KeyRecord = {
  readonly property_id: string;
  readonly kind: ApiKeyKind;
};

export type PropertyRecord = {
  readonly property_id: string;
  readonly allowed_origins: readonly string[];
};

export type CreatePropertyResult = {
  readonly property_id: string;
  readonly write_key: string;
  readonly read_key: string;
};

export type InsertEvent = {
  readonly event_id: string;
  readonly type: string;
  readonly ts: long;
  readonly received_at: long;

  readonly url?: string;
  readonly path?: string;
  readonly title?: string;
  readonly referrer?: string;

  readonly campaign_id?: string;
  readonly utm_source?: string;
  readonly utm_medium?: string;
  readonly utm_campaign?: string;

  readonly visitor_id?: string;
  readonly session_id?: string;
  readonly user_id_hash?: string;

  readonly scope_type?: string;
  readonly scope_id?: string;

  readonly data_json?: string;
  readonly dims?: Record<string, string>;
  readonly dims_json?: string;

  readonly user_agent?: string;
  readonly ip?: string;
};

export type IngestInsertResult = {
  readonly accepted: int;
  readonly deduped: int;
};

export type TopRow = {
  readonly key: string;
  readonly pageviews: int;
  readonly unique_visitors: int;
};

export type MetricName = "pageviews" | "unique_visitors" | "sessions";
export type GroupByKey = "path" | "campaign_id" | "scope_type" | "scope_id";

export type MetricsQuery = {
  readonly fromMs: long;
  readonly toMsExclusive: long;
  readonly metrics: readonly MetricName[];
  readonly groupBy: readonly GroupByKey[];
  readonly paths?: readonly string[];
  readonly campaignId?: string;
  readonly scopeType?: string;
  readonly scopeId?: string;
  readonly limit?: int;
};

export type MetricsResult = {
  readonly rows: ApiMetricsRow[];
  readonly totals: MetricsTotals;
};

const EMPTY_STRING_ARRAY: string[] = [];

const nowUnixMs = (): long => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

const sha256Hex = (value: string): string => {
  const bytes = Encoding.UTF8.GetBytes(value);
  const hash = SHA256.HashData(bytes);
  return Convert.ToHexStringLower(hash);
};

const randomKey = (): string => Guid.NewGuid().ToString("N");

const normalizeOrigin = (origin: string): string => origin.Trim().ToLowerInvariant();

export class ClickmeterDb {
  private readonly options: DbContextOptions;

  constructor(dbPath: string) {
    this.options = createDbOptions(dbPath);
  }

  private open(): ClickmeterDbContext {
    return new ClickmeterDbContextCtor(this.options);
  }

  async getProperty(propertyId: string): Promise<PropertyRecord | undefined> {
    const db = this.open();
    try {
      const db0 = db;
      const propertyId0 = propertyId;

      const row = await db0.Properties
        .Where((p) => p.PropertyId === propertyId0)
        .FirstOrDefaultAsync();
      if (!row) return undefined;

      const allowed = parseStringArray(row.AllowedOriginsJson) ?? EMPTY_STRING_ARRAY;
      return { property_id: row.PropertyId, allowed_origins: allowed };
    } finally {
      db.Dispose();
    }
  }

  async lookupKey(token: string): Promise<KeyRecord | undefined> {
    const db = this.open();
    try {
      const hash = sha256Hex(token);
      const db0 = db;
      const hash0 = hash;

      const key = await db0.ApiKeys.Where((k) => k.KeyHash === hash0).FirstOrDefaultAsync();
      if (!key) return undefined;
      if (key.RevokedAt !== undefined) return undefined;
      return { property_id: key.PropertyId, kind: key.Kind };
    } finally {
      db.Dispose();
    }
  }

  async createProperty(
    propertyId: string,
    allowedOrigins: readonly string[]
  ): Promise<CreatePropertyResult | undefined> {
    const db = this.open();
    try {
      const db0 = db;
      const propertyId0 = propertyId;

      const existing = await db0.Properties
        .Where((p) => p.PropertyId === propertyId0)
        .FirstOrDefaultAsync();
      if (existing) return undefined;

      const normalized = new List<string>();
      for (let i = 0; i < allowedOrigins.Length; i++) {
        const o = normalizeOrigin(allowedOrigins[i]);
        if (o !== "") normalized.Add(o);
      }

      const property = new PropertyRow();
      property.PropertyId = propertyId;
      property.AllowedOriginsJson = stringifyStringArray(normalized.ToArray());
      db.Properties.Add(property);

      const writeKey = randomKey();
      const readKey = randomKey();
      const now = nowUnixMs();

      const write = new ApiKey();
      write.KeyHash = sha256Hex(writeKey);
      write.PropertyId = propertyId;
      write.Property = property;
      write.Kind = "write";
      write.CreatedAt = now;

      const read = new ApiKey();
      read.KeyHash = sha256Hex(readKey);
      read.PropertyId = propertyId;
      read.Property = property;
      read.Kind = "read";
      read.CreatedAt = now;

      db.ApiKeys.Add(write);
      db.ApiKeys.Add(read);

      await db.SaveChangesAsync();
      return { property_id: propertyId, write_key: writeKey, read_key: readKey };
    } finally {
      db.Dispose();
    }
  }

  async insertEvents(
    propertyId: string,
    events: readonly InsertEvent[]
  ): Promise<IngestInsertResult> {
    if (events.Length === 0) return { accepted: 0, deduped: 0 };

    let accepted: int = 0;
    let deduped: int = 0;

    const db = this.open();
    try {
      const db0 = db;
      const propertyId0 = propertyId;

      for (let i = 0; i < events.Length; i++) {
        const e = events[i];

        const eventId0 = e.event_id;
        const exists = await db0.Events
          .Where((row) => row.PropertyId === propertyId0 && row.EventId === eventId0)
          .AnyAsync();
        if (exists) {
          deduped++;
          continue;
        }

        const row = new Event();
        row.PropertyId = propertyId0;
        row.EventId = e.event_id;
        row.Type = e.type;
        row.Ts = e.ts;
        row.ReceivedAt = e.received_at;

        row.Url = e.url;
        row.Path = e.path;
        row.Title = e.title;
        row.Referrer = e.referrer;

        row.CampaignId = e.campaign_id;
        row.UtmSource = e.utm_source;
        row.UtmMedium = e.utm_medium;
        row.UtmCampaign = e.utm_campaign;

        row.VisitorId = e.visitor_id;
        row.SessionId = e.session_id;
        row.UserIdHash = e.user_id_hash;

        row.ScopeType = e.scope_type;
        row.ScopeId = e.scope_id;

        row.DataJson = e.data_json;
        row.DimsJson = e.dims_json;

        row.UserAgent = e.user_agent;
        row.Ip = e.ip;

        db.Events.Add(row);
        accepted++;

        const dims = e.dims;
        if (dims) {
          for (const k in dims) {
            const raw = dims[k];
            if (typeof raw !== "string") continue;
            const v = raw.Trim();
            if (v === "") continue;

            const dim = new EventDim();
            dim.PropertyId = propertyId0;
            dim.EventId = e.event_id;
            dim.Event = row;
            dim.Key = k;
            dim.Value = v;
            db.EventDims.Add(dim);
          }
        }
      }

      await db.SaveChangesAsync();
      return { accepted, deduped };
    } finally {
      db.Dispose();
    }
  }

  async queryTotals(
    propertyId: string,
    fromMs: long,
    toMsExclusive: long
  ): Promise<OverviewTotals> {
    const db = this.open();
    try {
      return await runQueryTotals(db, propertyId, fromMs, toMsExclusive);
    } finally {
      db.Dispose();
    }
  }

  async queryTopPaths(
    propertyId: string,
    fromMs: long,
    toMsExclusive: long,
    limit: int
  ): Promise<TopRow[]> {
    const db = this.open();
    try {
      return await runQueryTopPaths(db, propertyId, fromMs, toMsExclusive, limit);
    } finally {
      db.Dispose();
    }
  }

  async queryTopCampaigns(
    propertyId: string,
    fromMs: long,
    toMsExclusive: long,
    limit: int
  ): Promise<TopRow[]> {
    const db = this.open();
    try {
      return await runQueryTopCampaigns(db, propertyId, fromMs, toMsExclusive, limit);
    } finally {
      db.Dispose();
    }
  }

  async queryMetrics(propertyId: string, query: MetricsQuery): Promise<MetricsResult> {
    const db = this.open();
    try {
      return await runQueryMetrics(db, propertyId, query);
    } finally {
      db.Dispose();
    }
  }
}
