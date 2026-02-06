import { int, long } from "@tsonic/core/types.js";
import { DateTimeOffset, Int32, TimeSpan } from "@tsonic/dotnet/System.js";

export interface UtcDateRange {
  fromMs: long;
  toMsExclusive: long;
}

interface Ymd {
  y: int;
  m: int;
  d: int;
}

export const parseDateRangeUtc = (from: string, to: string): UtcDateRange | undefined => {
  const parse = (s: string): Ymd | undefined => {
    const parts = s.Split("-");
    if (parts.Length !== 3) return undefined;
    const y = Int32.Parse(parts[0]);
    const m = Int32.Parse(parts[1]);
    const d = Int32.Parse(parts[2]);
    if (m < 1 || m > 12) return undefined;
    if (d < 1 || d > 31) return undefined;
    return { y, m, d };
  };

  const f = parse(from);
  const t = parse(to);
  if (!f || !t) return undefined;

  const fromMs = new DateTimeOffset(f.y, f.m, f.d, 0, 0, 0, TimeSpan.Zero).ToUnixTimeMilliseconds();
  const toStart = new DateTimeOffset(t.y, t.m, t.d, 0, 0, 0, TimeSpan.Zero);
  const toMsExclusive = toStart.AddDays(1).ToUnixTimeMilliseconds();
  return { fromMs, toMsExclusive };
};
