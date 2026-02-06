import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";
import { StringValues } from "@tsonic/microsoft-extensions/Microsoft.Extensions.Primitives.js";

export const setCorsHeaders = (ctx: HttpContext, origin: string): void => {
  ctx.Response.Headers.AccessControlAllowOrigin = new StringValues(origin);
  ctx.Response.Headers.AccessControlAllowMethods = new StringValues("POST, OPTIONS");
  ctx.Response.Headers.AccessControlAllowHeaders = new StringValues("authorization, content-type");
  ctx.Response.Headers.AccessControlMaxAge = new StringValues("86400");
  ctx.Response.Headers.Vary = new StringValues("Origin");
};

