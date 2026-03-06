import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

export const getBearerToken = (ctx: HttpContext): string | undefined => {
  const raw = ctx.Request.Headers.Authorization.ToString().trim();
  if (raw === "") return undefined;
  const prefix = "Bearer ";
  if (raw.startsWith(prefix)) return raw.substring(prefix.length).trim();
  return raw;
};
