"use client";

import type { ClientEvent } from "@/lib/calendar-types";

const HOUR_START = 8;
const HOUR_END = 18;
const TOTAL_HOURS = HOUR_END - HOUR_START;

function hourFraction(date: Date): number {
  const hours = date.getHours() + date.getMinutes() / 60;
  return Math.min(Math.max(hours - HOUR_START, 0), TOTAL_HOURS);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function EventBlock({
  event,
  isConflicting,
  isSelected,
  column,
  columns,
  onClick,
}: {
  event: ClientEvent;
  isConflicting: boolean;
  isSelected: boolean;
  column: number;
  columns: number;
  onClick: () => void;
}) {
  const top = (hourFraction(event.start) / TOTAL_HOURS) * 100;
  const bottom = (hourFraction(event.end) / TOTAL_HOURS) * 100;
  const height = Math.max(bottom - top, 4);
  const width = 100 / columns;
  const left = width * column;

  return (
    <button
      onClick={onClick}
      className={`absolute rounded-input px-2 py-1 text-left overflow-hidden text-white text-xs shadow-sm transition ${
        isSelected ? "ring-2 ring-offset-1 ring-foreground/40 z-10" : ""
      } ${isConflicting ? "border-2 border-dashed border-conflict" : ""}`}
      style={{
        top: `${top}%`,
        height: `${height}%`,
        left: `calc(${left}% + 2px)`,
        width: `calc(${width}% - 4px)`,
        background: isConflicting ? "#EF4444" : event.color,
      }}
    >
      <p className="font-medium truncate flex items-center gap-1">
        {isConflicting && <span aria-hidden>⚠</span>}
        {event.title}
      </p>
      <p className="truncate opacity-80">{formatTime(event.start)}</p>
      <p className="truncate opacity-70">{event.account}</p>
    </button>
  );
}
