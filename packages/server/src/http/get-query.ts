import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

export const getQuery = (ctx: HttpContext, key: string): string | undefined => {
  const raw = ctx.Request.Query[key].ToString();
  const trimmed = raw.Trim();
  return trimmed === "" ? undefined : trimmed;
};
