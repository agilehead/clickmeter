import { JsonValueKind } from "@tsonic/dotnet/System.Text.Json.js";
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";

import { parseJsonRoot } from "./parse-json-root.ts";
import type { StringRecord, StringRecordEntry } from "./record-entries.ts";

export const parseStringRecord = (json: string): StringRecord | undefined => {
  const root = parseJsonRoot(json);
  if (root.ValueKind !== JsonValueKind.Object) return undefined;

  const result = new List<StringRecordEntry>();
  const e = root.EnumerateObject();
  try {
    while (e.MoveNext()) {
      const p = e.Current;
      const v = p.Value;
      if (v.ValueKind === JsonValueKind.String) {
        const s = v.GetString();
        if (s !== null) result.Add({ key: p.Name, value: s });
      }
    }
  } finally {
    e.Dispose();
  }
  return result.ToArray();
};
