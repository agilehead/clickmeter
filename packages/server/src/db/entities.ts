import { long } from "@tsonic/core/types.js";
import { attributes as A } from "@tsonic/core/lang.js";

import { KeyAttribute } from "@tsonic/dotnet/System.ComponentModel.DataAnnotations.js";

import { IndexAttribute, PrimaryKeyAttribute } from "@tsonic/efcore/Microsoft.EntityFrameworkCore.js";

export type ApiKeyKind = "write" | "read";

// Avoid CLR name collisions with EF Core internal types (e.g. Metadata.Internal.Property)
// which can surface in `dotnet ef dbcontext optimize` generated interceptors.
export class PropertyRow {
  PropertyId!: string;
  AllowedOriginsJson!: string;
}

export class ApiKey {
  KeyHash!: string;
  PropertyId!: string;
  Property?: PropertyRow;
  Kind!: ApiKeyKind;
  CreatedAt!: long;
  RevokedAt?: long;
}

export class Event {
  PropertyId!: string;
  Property?: PropertyRow;
  EventId!: string;
  Type!: string;
  Ts!: long;
  ReceivedAt!: long;

  Url?: string;
  Path?: string;
  Title?: string;
  Referrer?: string;

  CampaignId?: string;
  UtmSource?: string;
  UtmMedium?: string;
  UtmCampaign?: string;

  VisitorId?: string;
  SessionId?: string;
  UserIdHash?: string;

  ScopeType?: string;
  ScopeId?: string;

  DataJson?: string;
  DimsJson?: string;

  UserAgent?: string;
  Ip?: string;
}

export class EventDim {
  PropertyId!: string;
  EventId!: string;
  Event?: Event;
  Key!: string;
  Value!: string;
}

// EF Core mappings (NativeAOT-friendly)
A.on(PropertyRow).prop((x) => x.PropertyId).add(KeyAttribute);

A.on(ApiKey).prop((x) => x.KeyHash).add(KeyAttribute);

A.on(Event).type.add(PrimaryKeyAttribute, "PropertyId", ["EventId"]);
A.on(Event).type.add(IndexAttribute, ["PropertyId", "Ts"]);
A.on(Event).type.add(IndexAttribute, ["PropertyId", "Path", "Ts"]);
A.on(Event).type.add(IndexAttribute, ["PropertyId", "CampaignId", "Ts"]);
A.on(Event).type.add(IndexAttribute, ["PropertyId", "ScopeType", "ScopeId", "Ts"]);

A.on(EventDim).type.add(PrimaryKeyAttribute, "PropertyId", ["EventId", "Key"]);
A.on(EventDim).type.add(IndexAttribute, ["Key", "Value"]);
