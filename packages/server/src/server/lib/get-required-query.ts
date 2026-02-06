import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

import { getQuery } from "../../http/get-query.ts";

export const getRequiredQuery = (ctx: HttpContext, key: string): string | undefined => {
  const value = getQuery(ctx, key);
  if (value === undefined) return undefined;
  const trimmed = value.Trim();
  return trimmed === "" ? undefined : trimmed;
};

