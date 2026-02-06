import { JsonValueKind } from "@tsonic/dotnet/System.Text.Json.js";
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";

import { parseJsonRoot } from "./parse-json-root.ts";

export const parseStringArray = (json: string): string[] | undefined => {
  const root = parseJsonRoot(json);
  if (root.ValueKind !== JsonValueKind.Array) return undefined;

  const values = new List<string>();
  const e = root.EnumerateArray();
  try {
    while (e.MoveNext()) {
      const s = e.Current.GetString();
      if (s !== undefined) values.Add(s);
    }
  } finally {
    e.Dispose();
  }
  return values.ToArray();
};
