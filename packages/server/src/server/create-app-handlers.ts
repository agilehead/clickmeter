import type { Task } from "@tsonic/dotnet/System.Threading.Tasks.js";

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
  readonly handleHealth: (ctx: HttpContext) => Task;
  readonly handleIngestCorsPreflight: (ctx: HttpContext) => Task;
  readonly handleIngest: (ctx: HttpContext) => Task;
  readonly handleOverview: (ctx: HttpContext) => Task;
  readonly handleTopPages: (ctx: HttpContext) => Task;
  readonly handleTopCampaigns: (ctx: HttpContext) => Task;
  readonly handleMetrics: (ctx: HttpContext) => Task;
  readonly handleAdminCreateProperty: (ctx: HttpContext) => Task;
};

export type AppContext = {
  readonly db: ClickmeterDb;
  readonly adminToken?: string;
};

export const createAppHandlers = (app: AppContext): AppHandlers => {
  return {
    handleHealth: (ctx: HttpContext): Task => handleHealth(app, ctx),
    handleIngestCorsPreflight: (ctx: HttpContext): Task =>
      handleIngestCorsPreflight(app, ctx),
    handleIngest: (ctx: HttpContext): Task => handleIngest(app, ctx),
    handleOverview: (ctx: HttpContext): Task => handleOverview(app, ctx),
    handleTopPages: (ctx: HttpContext): Task => handleTopPages(app, ctx),
    handleTopCampaigns: (ctx: HttpContext): Task => handleTopCampaigns(app, ctx),
    handleMetrics: (ctx: HttpContext): Task => handleMetrics(app, ctx),
    handleAdminCreateProperty: (ctx: HttpContext): Task =>
      handleAdminCreateProperty(app, ctx),
  };
};
