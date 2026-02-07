import type { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

import type { ClickmeterDb } from "../db/clickmeter-db.ts";

import { handleAdminCreateProperty } from "./handlers/handle-admin-create-property.ts";
import { handleHealth } from "./handlers/handle-health.ts";
import { handleIngest } from "./handlers/handle-ingest.ts";
import { handleIngestCorsPreflight } from "./handlers/handle-ingest-cors-preflight.ts";
import { handleMetrics } from "./handlers/handle-metrics.ts";
import { handleOverview } from "./handlers/handle-overview.ts";
import { handleTopCampaigns } from "./handlers/handle-top-campaigns.ts";
import { handleTopPages } from "./handlers/handle-top-pages.ts";

export type AppHandlers = {
  readonly handleHealth: (ctx: HttpContext) => PromiseLike<void>;
  readonly handleIngestCorsPreflight: (ctx: HttpContext) => PromiseLike<void>;
  readonly handleIngest: (ctx: HttpContext) => PromiseLike<void>;
  readonly handleOverview: (ctx: HttpContext) => PromiseLike<void>;
  readonly handleTopPages: (ctx: HttpContext) => PromiseLike<void>;
  readonly handleTopCampaigns: (ctx: HttpContext) => PromiseLike<void>;
  readonly handleMetrics: (ctx: HttpContext) => PromiseLike<void>;
  readonly handleAdminCreateProperty: (ctx: HttpContext) => PromiseLike<void>;
};

export type AppContext = {
  readonly db: ClickmeterDb;
  readonly adminToken?: string;
};

export const createAppHandlers = (app: AppContext): AppHandlers => {
  return {
    handleHealth: (ctx: HttpContext): PromiseLike<void> => handleHealth(app, ctx),
    handleIngestCorsPreflight: (ctx: HttpContext): PromiseLike<void> =>
      handleIngestCorsPreflight(app, ctx),
    handleIngest: (ctx: HttpContext): PromiseLike<void> => handleIngest(app, ctx),
    handleOverview: (ctx: HttpContext): PromiseLike<void> => handleOverview(app, ctx),
    handleTopPages: (ctx: HttpContext): PromiseLike<void> => handleTopPages(app, ctx),
    handleTopCampaigns: (ctx: HttpContext): PromiseLike<void> => handleTopCampaigns(app, ctx),
    handleMetrics: (ctx: HttpContext): PromiseLike<void> => handleMetrics(app, ctx),
    handleAdminCreateProperty: (ctx: HttpContext): PromiseLike<void> =>
      handleAdminCreateProperty(app, ctx),
  };
};
