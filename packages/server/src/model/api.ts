import { int } from "@tsonic/core/types.js";

export interface ScopeRef {
  type: string;
  id: string;
}

export interface PageContext {
  url?: string;
  path?: string;
  title?: string;
  referrer?: string;
}

export interface CampaignUtm {
  source?: string;
  medium?: string;
  campaign?: string;
}

export interface CampaignContext {
  campaign_id?: string;
  utm?: CampaignUtm;
}

export interface EventContext {
  page?: PageContext;
  campaign?: CampaignContext;
}

export interface EventIdentity {
  visitor_id?: string;
  session_id?: string;
  user_id_hash?: string;
}

/**
 * Generic event payload.
 *
 * Rules:
 * - `scope` is the primary per-property entity (tenant/store/workspace/etc).
 * - `dims` is an arbitrary key/value bag for secondary segmentation. Values are strings
 *   to keep the storage model deterministic and queryable.
 */
export interface IngestEvent {
  event_id: string;
  type: string; // MVP: "pageview"
  ts?: string;
  context?: EventContext;
  identity?: EventIdentity;
  scope?: ScopeRef;
  dims?: Record<string, string>;
  data?: Record<string, string>;
}

export interface IngestRequest {
  schema_version: int;
  property_id: string;
  sent_at?: string;
  scope?: ScopeRef;
  dims?: Record<string, string>;
  events: IngestEvent[];
}

export interface IngestErrorItem {
  index: int;
  code: string;
  message: string;
}

export interface IngestAck {
  accepted: int;
  rejected: int;
  deduped: int;
  errors: IngestErrorItem[];
}

export interface ErrorInfo {
  code: string;
  message: string;
  details?: Record<string, string>;
}

export interface ErrorResponse {
  error: ErrorInfo;
}

export interface OverviewTotals {
  pageviews: int;
  unique_visitors: int;
  sessions: int;
}

export interface OverviewResponse {
  property_id: string;
  from: string;
  to: string;
  tz: string;
  totals: OverviewTotals;
}

export interface TopPathRow {
  path: string;
  pageviews: int;
  unique_visitors: int;
}

export interface PagesResponse {
  property_id: string;
  from: string;
  to: string;
  tz: string;
  rows: TopPathRow[];
}

export interface CampaignRow {
  campaign_id: string;
  pageviews: int;
  unique_visitors: int;
}

export interface CampaignsResponse {
  property_id: string;
  from: string;
  to: string;
  tz: string;
  rows: CampaignRow[];
}

export interface MetricsTotals {
  [metric: string]: int;
}

export interface MetricsRow {
  bucket?: string;
  group?: Record<string, string>;
  metrics: MetricsTotals;
}

export interface MetricsResponse {
  property_id: string;
  from: string;
  to: string;
  tz: string;
  metrics: string[];
  group_by: string[];
  filters: Record<string, string[]>;
  rows: MetricsRow[];
  totals: MetricsTotals;
}

export interface AdminCreatePropertyRequest {
  property_id: string;
  allowed_origins?: string[];
}

export interface AdminCreatePropertyResponse {
  property_id: string;
  write_key: string;
  read_key: string;
}
