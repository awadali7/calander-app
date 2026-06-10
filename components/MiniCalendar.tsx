"use client";

import { useState } from "react";

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function MiniCalendar({
  selected,
  onSelect,
}: {
  selected: Date;
  onSelect: (date: Date) => void;
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(selected));
  const today = new Date();

  const firstOfMonth = startOfMonth(cursor);
  // Monday-first offset
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1)),
  ];

  return (
    <div className="rounded-card border border-border bg-card p-3 text-xs">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-background transition"
          aria-label="Previous month"
        >
          ‹
        </button>
        <p className="font-medium">
          {cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
        </p>
        <button
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-background transition"
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-foreground/40">
        {WEEKDAY_LABELS.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={i} />;
          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, selected);
          return (
            <button
              key={i}
              onClick={() => onSelect(date)}
              className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center transition ${
                isSelected
                  ? "bg-primary text-white font-semibold"
                  : isToday
                  ? "border border-primary text-primary font-semibold"
                  : "text-foreground hover:bg-background"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
