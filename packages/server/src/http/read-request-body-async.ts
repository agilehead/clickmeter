import { StreamReader } from "@tsonic/dotnet/System.IO.js";
import { Encoding } from "@tsonic/dotnet/System.Text.js";

import { HttpContext } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

export const readRequestBodyAsync = async (ctx: HttpContext): Promise<string> => {
  const reader = new StreamReader(ctx.Request.Body, Encoding.UTF8);
  try {
    return await reader.ReadToEndAsync();
  } finally {
    reader.Close();
  }
};
