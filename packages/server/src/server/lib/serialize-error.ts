import { jsonStringify } from "../../json/json-stringify.ts";

export const serializeError = (code: string, message: string, details?: Record<string, string>): string => {
  return jsonStringify((w) => {
    w.WriteStartObject();
    w.WriteStartObject("error");
    w.WriteString("code", code);
    w.WriteString("message", message);
    if (details) {
      w.WriteStartObject("details");
      for (const k in details) {
        w.WriteString(k, details[k]);
      }
      w.WriteEndObject();
    }
    w.WriteEndObject();
    w.WriteEndObject();
  });
};
