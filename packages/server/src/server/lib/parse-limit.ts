import { int } from "@tsonic/core/types.js";
import { Int32 } from "@tsonic/dotnet/System.js";

export const parseLimit = (raw: string | undefined, fallback: int): int => {
  if (!raw) return fallback;
  const trimmed = raw.Trim();
  if (trimmed === "") return fallback;
  try {
    const n = Int32.Parse(trimmed);
    return n < 1 ? fallback : n;
  } catch (_err) {
    return fallback;
  }
};

