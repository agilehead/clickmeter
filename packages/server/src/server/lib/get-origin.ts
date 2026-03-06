import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

const normalizeOrigin = (origin: string): string => origin.trim().toLowerCase();

export const getOrigin = (ctx: HttpContext): string | undefined => {
  const raw = ctx.Request.Headers.Origin.ToString();
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : normalizeOrigin(trimmed);
};
