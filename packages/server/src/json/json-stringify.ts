import { MemoryStream } from "@tsonic/dotnet/System.IO.js";
import { Encoding } from "@tsonic/dotnet/System.Text.js";
import { JsonWriterOptions, Utf8JsonWriter } from "@tsonic/dotnet/System.Text.Json.js";

export const jsonStringify = (write: (writer: Utf8JsonWriter) => void): string => {
  const stream = new MemoryStream();
  const options = new JsonWriterOptions();
  const writer = new Utf8JsonWriter(stream, options);
  try {
    write(writer);
    writer.Flush();
    return Encoding.UTF8.GetString(stream.ToArray());
  } finally {
    writer.Dispose();
    stream.Dispose();
  }
};
