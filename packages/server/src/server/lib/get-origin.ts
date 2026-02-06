import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

const normalizeOrigin = (origin: string): string => origin.Trim().ToLowerInvariant();

export const getOrigin = (ctx: HttpContext): string | undefined => {
  const raw = ctx.Request.Headers.Origin.ToString();
  const trimmed = raw.Trim();
  return trimmed === "" ? undefined : normalizeOrigin(trimmed);
};

