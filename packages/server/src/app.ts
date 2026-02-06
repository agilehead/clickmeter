import { Console } from "@tsonic/dotnet/System.js";
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";
import { asinterface } from "@tsonic/core/lang.js";

import { WebApplication } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Builder.js";
import type { ExtensionMethods } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Builder.js";
import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

import { loadConfig } from "./load-config.ts";
import { ClickmeterDb } from "./db/clickmeter-db.ts";
import "./db/design-time-dbcontext-factory.ts";
import { createAppHandlers } from "./server/create-app-handlers.ts";

export function main(): void {
  const config = loadConfig();

  Console.WriteLine("==================================");
  Console.WriteLine(" Clickmeter (Analytics Server)");
  Console.WriteLine("==================================");
  Console.WriteLine(`DB: ${config.dbPath}`);
  Console.WriteLine(`Listen: ${config.listenUrl}`);

  const db = new ClickmeterDb(config.dbPath);

  const builder = WebApplication.CreateBuilder();
  const app = asinterface<ExtensionMethods<WebApplication>>(builder.Build());

  const handlers = createAppHandlers({ db, adminToken: config.adminToken });

  app.MapGet("/health", handlers.handleHealth);

  // CORS preflight for browser ingestion.
  const methods = new List<string>();
  methods.Add("OPTIONS");
  app.MapMethods("/v1/events", methods, handlers.handleIngestCorsPreflight);
  app.MapPost("/v1/events", handlers.handleIngest);
  app.MapGet("/v1/properties/{property_id}/overview", handlers.handleOverview);
  app.MapGet("/v1/properties/{property_id}/pages", handlers.handleTopPages);
  app.MapGet("/v1/properties/{property_id}/campaigns", handlers.handleTopCampaigns);
  app.MapGet("/v1/properties/{property_id}/metrics", handlers.handleMetrics);

  app.MapPost("/internal/admin/properties", handlers.handleAdminCreateProperty);

  app.Run(config.listenUrl);
}
