import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

export const getBearerToken = (ctx: HttpContext): string | undefined => {
  const raw = ctx.Request.Headers.Authorization.ToString().Trim();
  if (raw === "") return undefined;
  const prefix = "Bearer ";
  if (raw.StartsWith(prefix)) return raw.Substring(prefix.Length).Trim();
  return raw;
};

