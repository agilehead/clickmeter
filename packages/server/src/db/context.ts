import { DbContext, DbContextOptions, DbSet } from "@tsonic/efcore/Microsoft.EntityFrameworkCore.js";

import type { ApiKey, Event, EventDim, PropertyRow } from "./entities.ts";

export class ClickmeterDbContext extends DbContext {
  get Properties(): DbSet<PropertyRow> {
    return this.Set<PropertyRow>();
  }

  get ApiKeys(): DbSet<ApiKey> {
    return this.Set<ApiKey>();
  }

  get Events(): DbSet<Event> {
    return this.Set<Event>();
  }

  get EventDims(): DbSet<EventDim> {
    return this.Set<EventDim>();
  }

  constructor(options: DbContextOptions) {
    super(options);
  }
}
