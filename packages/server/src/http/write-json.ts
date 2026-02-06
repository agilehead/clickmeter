import { int } from "@tsonic/core/types.js";
import { Task } from "@tsonic/dotnet/System.Threading.Tasks.js";

import { HttpResponse } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

import { writeText } from "./write-text.ts";

export const writeJson = (response: HttpResponse, statusCode: int, body: string): Task =>
  writeText(response, statusCode, "application/json; charset=utf-8", body);

