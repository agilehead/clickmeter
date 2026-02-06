import { Task } from "@tsonic/dotnet/System.Threading.Tasks.js";

import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

import { writePlain } from "../../http/write-plain.ts";
import type { AppContext } from "../create-app-handlers.ts";

export const handleHealth = (_app: AppContext, ctx: HttpContext): Task => {
  return writePlain(ctx.Response, 200, "ok");
};

