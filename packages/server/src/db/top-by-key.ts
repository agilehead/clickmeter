import type { int } from "@tsonic/core/types.js";
import type { out } from "@tsonic/core/types.js";
import { Dictionary, HashSet, List } from "@tsonic/dotnet/System.Collections.Generic.js";

import type { Event as EventEntity } from "./entities.ts";
import type { TopRow } from "./clickmeter-db.ts";

class CounterBucket {
  pageviews: int = 0;
  readonly visitors: HashSet<string> = new HashSet<string>();
}

export const topByKey = (
  events: readonly EventEntity[],
  limit: int,
  getKey: (e: EventEntity) => string,
  getVisitor: (e: EventEntity) => string | undefined
): TopRow[] => {
  const map = new Dictionary<string, CounterBucket>();

  for (let i = 0; i < events.Length; i++) {
    const e = events[i];
    const key = getKey(e);

    let counter = null as unknown as CounterBucket;
    if (!map.TryGetValue(key, counter as out<CounterBucket>)) {
      counter = new CounterBucket();
      map.Add(key, counter);
    }

    counter.pageviews++;
    const v = getVisitor(e);
    if (v !== undefined && v !== "") counter.visitors.Add(v);
  }

  const rows = new List<TopRow>();
  const iter = map.GetEnumerator();
  while (iter.MoveNext()) {
    const pair = iter.Current;
    rows.Add({
      key: pair.Key,
      pageviews: pair.Value.pageviews,
      unique_visitors: pair.Value.visitors.Count,
    });
  }

  const arr = rows.ToArray();
  // Simple in-place sort (descending by pageviews)
  for (let i = 0; i < arr.Length; i++) {
    for (let j = i + 1; j < arr.Length; j++) {
      if (arr[j].pageviews > arr[i].pageviews) {
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
      }
    }
  }

  const take = limit < arr.Length ? limit : arr.Length;
  const outRows = new List<TopRow>();
  for (let i = 0; i < take; i++) outRows.Add(arr[i]);
  return outRows.ToArray();
};

