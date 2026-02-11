import { Environment } from "@tsonic/dotnet/System.js";

import type { Interface } from "@tsonic/core/lang.js";
import type { IDesignTimeDbContextFactory } from "@tsonic/efcore/Microsoft.EntityFrameworkCore.Design.js";

import { ClickmeterDbContext } from "./context.ts";
import { createDbOptions } from "./options.ts";

/**
 * EF tooling (dotnet-ef) uses this factory at design-time to construct the DbContext.
 * This is required for `dotnet ef dbcontext optimize` (compiled models).
 */
export class ClickmeterDbContextFactory
  implements Interface<IDesignTimeDbContextFactory<ClickmeterDbContext>>
{
  CreateDbContext(_args: string[]): ClickmeterDbContext {
    const dbPath = Environment.GetEnvironmentVariable("CLICKMETER_DB") ?? "clickmeter.db";
    return new ClickmeterDbContext(createDbOptions(dbPath));
  }
}
