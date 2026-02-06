import { Task } from "@tsonic/dotnet/System.Threading.Tasks.js";

import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

import type { AppContext } from "../create-app-handlers.ts";
import { writePlain } from "../../http/write-plain.ts";
import { getOrigin } from "../lib/get-origin.ts";
import { setCorsHeaders } from "../lib/set-cors-headers.ts";

export const handleIngestCorsPreflight = (_app: AppContext, ctx: HttpContext): Task => {
  const origin = getOrigin(ctx);
  if (origin) setCorsHeaders(ctx, origin);
  return writePlain(ctx.Response, 204, "");
};

