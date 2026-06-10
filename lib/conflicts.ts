type Interval = { id: string; start: Date; end: Date };

/** Returns the set of event ids that overlap with at least one other event. */
export function detectConflicts<T extends Interval>(events: T[]): Set<string> {
  const conflicts = new Set<string>();
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];
      if (a.start < b.end && b.start < a.end) {
        conflicts.add(a.id);
        conflicts.add(b.id);
      }
    }
  }
  return conflicts;
}

export type ConflictPair<T> = { a: T; b: T };

/** Returns each overlapping pair of events, across all connected accounts. */
export function detectConflictPairs<T extends Interval>(events: T[]): ConflictPair<T>[] {
  const pairs: ConflictPair<T>[] = [];
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];
      if (a.start < b.end && b.start < a.end) {
        pairs.push({ a, b });
      }
    }
  }
  return pairs;
}
