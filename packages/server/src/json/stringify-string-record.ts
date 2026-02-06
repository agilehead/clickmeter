import { jsonStringify } from "./json-stringify.ts";

export const stringifyStringRecord = (record: Record<string, string>): string => {
  return jsonStringify((w) => {
    w.WriteStartObject();
    for (const k in record) {
      w.WriteString(k, record[k]);
    }
    w.WriteEndObject();
  });
};

