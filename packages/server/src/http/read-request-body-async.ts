import { StreamReader } from "@tsonic/dotnet/System.IO.js";
import { Encoding } from "@tsonic/dotnet/System.Text.js";
import { Task } from "@tsonic/dotnet/System.Threading.Tasks.js";

import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

export const readRequestBodyAsync = (ctx: HttpContext): Task<string> => {
  const reader = new StreamReader(ctx.Request.Body, Encoding.UTF8);
  return reader.ReadToEndAsync().ContinueWith<string>((t, _state) => {
    reader.Close();
    return t.Result;
  }, undefined);
};

