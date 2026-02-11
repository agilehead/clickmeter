import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

export const getPath = (ctx: HttpContext): string => ctx.Request.Path.Value ?? "";
