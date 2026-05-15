import type { int } from "@tsonic/core/types.js";
import { List } from "@tsonic/dotnet/System.Collections.Generic.js";

export interface StringRecordEntry {
  key: string;
  value: string;
}

export type StringRecord = StringRecordEntry[];

export interface IntRecordEntry {
  key: string;
  value: int;
}

export type IntRecord = IntRecordEntry[];

export const setStringRecordEntry = (
  entries: List<StringRecordEntry>,
  key: string,
  value: string
): void => {
  for (let i = 0; i < entries.Count; i++) {
    if (entries[i].key === key) {
      entries[i] = { key, value };
      return;
    }
  }
  entries.Add({ key, value });
};

export const copyStringRecordEntries = (
  source: readonly StringRecordEntry[],
  target: List<StringRecordEntry>
): void => {
  for (let i = 0; i < source.Length; i++) {
    const entry = source[i];
    setStringRecordEntry(target, entry.key, entry.value);
  }
};

export const setIntRecordEntry = (
  entries: List<IntRecordEntry>,
  key: string,
  value: int
): void => {
  for (let i = 0; i < entries.Count; i++) {
    if (entries[i].key === key) {
      entries[i] = { key, value };
      return;
    }
  }
  entries.Add({ key, value });
};

export const getIntRecordEntry = (
  entries: readonly IntRecordEntry[],
  key: string
): int | undefined => {
  for (let i = 0; i < entries.Length; i++) {
    const entry = entries[i];
    if (entry.key === key) return entry.value;
  }
  return undefined;
};
