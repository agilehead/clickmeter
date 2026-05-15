import { jsonStringify } from "../../json/json-stringify.ts";
import type { StringRecordEntry } from "../../json/record-entries.ts";

export const serializeError = (
  code: string,
  message: string,
  details?: readonly StringRecordEntry[]
): string => {
  return jsonStringify((w) => {
    w.WriteStartObject();
    w.WriteStartObject("error");
    w.WriteString("code", code);
    w.WriteString("message", message);
    if (details) {
      w.WriteStartObject("details");
      for (let i = 0; i < details.Length; i++) {
        const entry = details[i];
        w.WriteString(entry.key, entry.value);
      }
      w.WriteEndObject();
    }
    w.WriteEndObject();
    w.WriteEndObject();
  });
};
