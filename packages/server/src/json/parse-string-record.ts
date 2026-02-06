import { JsonValueKind } from "@tsonic/dotnet/System.Text.Json.js";

import { parseJsonRoot } from "./parse-json-root.ts";

export const parseStringRecord = (json: string): Record<string, string> | undefined => {
  const root = parseJsonRoot(json);
  if (root.ValueKind !== JsonValueKind.Object) return undefined;

  const result: Record<string, string> = {};
  const e = root.EnumerateObject();
  try {
    while (e.MoveNext()) {
      const p = e.Current;
      const v = p.Value;
      if (v.ValueKind === JsonValueKind.String) {
        const s = v.GetString();
        if (s !== undefined) result[p.Name] = s;
      }
    }
  } finally {
    e.Dispose();
  }
  return result;
};
