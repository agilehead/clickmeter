import { JsonDocument, JsonElement } from "@tsonic/dotnet/System.Text.Json.js";

export const parseJsonRoot = (json: string): JsonElement => {
  try {
    const doc = JsonDocument.Parse(json);
    try {
      return doc.RootElement.Clone();
    } finally {
      doc.Dispose();
    }
  } catch (_err) {
    return new JsonElement();
  }
};
