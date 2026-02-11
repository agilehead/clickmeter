import { asinterface } from "@tsonic/core/lang.js";
import type { ExtensionMethods as Linq } from "@tsonic/dotnet/System.Linq.js";
import type { ExtensionMethods as Ef } from "@tsonic/efcore/Microsoft.EntityFrameworkCore.js";
import { DbContext, DbContextOptions } from "@tsonic/efcore/Microsoft.EntityFrameworkCore.js";
import type { DbSet } from "@tsonic/efcore/Microsoft.EntityFrameworkCore.js";

import type { ApiKey, Event, EventDim, PropertyRow } from "./entities.ts";

type DbSetQuery<T> = Ef<Linq<DbSet<T>>>;

export class ClickmeterDbContext extends DbContext {
  get Properties(): DbSetQuery<PropertyRow> {
    return asinterface<DbSetQuery<PropertyRow>>(this.Set<PropertyRow>());
  }

  get ApiKeys(): DbSetQuery<ApiKey> {
    return asinterface<DbSetQuery<ApiKey>>(this.Set<ApiKey>());
  }

  get Events(): DbSetQuery<Event> {
    return asinterface<DbSetQuery<Event>>(this.Set<Event>());
  }

  get EventDims(): DbSetQuery<EventDim> {
    return asinterface<DbSetQuery<EventDim>>(this.Set<EventDim>());
  }

  constructor(options: DbContextOptions) {
    super(options);
  }
}
