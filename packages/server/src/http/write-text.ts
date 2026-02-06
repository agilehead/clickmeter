import { int } from "@tsonic/core/types.js";
import { Task } from "@tsonic/dotnet/System.Threading.Tasks.js";

import { HttpResponse, HttpResponseWritingExtensions } from "@tsonic/aspnetcore/Microsoft.AspNetCore.Http.js";

export const writeText = (response: HttpResponse, statusCode: int, contentType: string, body: string): Task => {
  response.StatusCode = statusCode;
  response.ContentType = contentType;

  // HTTP 204 (No Content) and 304 (Not Modified) must not include a response body.
  // Kestrel throws if we attempt to write a body for these status codes.
  if (statusCode === 204 || statusCode === 304 || (statusCode >= 100 && statusCode < 200)) {
    return Task.CompletedTask;
  }

  return HttpResponseWritingExtensions.WriteAsync(response, body);
};

