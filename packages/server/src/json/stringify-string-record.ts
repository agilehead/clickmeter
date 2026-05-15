import { jsonStringify } from "./json-stringify.ts";
import type { StringRecordEntry } from "./record-entries.ts";

export const stringifyStringRecord = (
  record: readonly StringRecordEntry[]
): string => {
  return jsonStringify((w) => {
    w.WriteStartObject();
    for (let i = 0; i < record.Length; i++) {
      const entry = record[i];
      w.WriteString(entry.key, entry.value);
    }
    w.WriteEndObject();
  });
};
