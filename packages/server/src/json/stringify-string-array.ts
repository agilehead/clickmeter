import { jsonStringify } from "./json-stringify.ts";

export const stringifyStringArray = (values: readonly string[]): string => {
  return jsonStringify((w) => {
    w.WriteStartArray();
    for (let i = 0; i < values.Length; i++) {
      w.WriteStringValue(values[i]);
    }
    w.WriteEndArray();
  });
};

