"use client";

import { useEffect, useRef } from "react";
import { EventBlock } from "@/components/EventBlock";
import type { ClientEvent } from "@/lib/calendar-types";

const HOUR_START = 0;
const HOUR_END = 24;
const SCROLL_TO_HOUR = 8;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfWeek(date: Date): Date {
  const day = (date.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(date);
  monday.setDate(date.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatHour(hour: number): string {
  const period = hour < 12 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display} ${period}`;
}

type LaidOutEvent = { event: ClientEvent; column: number; columns: number };

/** Places overlapping events into side-by-side columns within a day. */
function layoutDay(dayEvents: ClientEvent[]): LaidOutEvent[] {
  const sorted = [...dayEvents].sort((a, b) => a.start.getTime() - b.start.getTime());
  const result: LaidOutEvent[] = [];

  let cluster: ClientEvent[] = [];
  let clusterEnd = -Infinity;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const columnEnds: number[] = [];
    const placements = new Map<string, number>();
    for (const event of cluster) {
      let column = columnEnds.findIndex((end) => end <= event.start.getTime());
      if (column === -1) {
        column = columnEnds.length;
        columnEnds.push(event.end.getTime());
      } else {
        columnEnds[column] = event.end.getTime();
      }
      placements.set(event.id, column);
    }
    const columns = columnEnds.length;
    for (const event of cluster) {
      result.push({ event, column: placements.get(event.id) ?? 0, columns });
    }
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const event of sorted) {
    if (cluster.length > 0 && event.start.getTime() >= clusterEnd) {
      flushCluster();
    }
    cluster.push(event);
    clusterEnd = Math.max(clusterEnd, event.end.getTime());
  }
  flushCluster();

  return result;
}

export function CalendarGrid({
  selectedDate,
  events,
  conflictIds,
  selectedEventId,
  onSelectEvent,
}: {
  selectedDate: Date;
  events: ClientEvent[];
  conflictIds: Set<string>;
  selectedEventId: string | null;
  onSelectEvent: (event: ClientEvent) => void;
}) {
  const monday = startOfWeek(selectedDate);
  const days = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
  const today = new Date();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: SCROLL_TO_HOUR * 64 });
  }, []);

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto">
      <div className="min-w-[640px] grid" style={{ gridTemplateColumns: "64px repeat(5, 1fr)" }}>
        <div className="sticky top-0 z-10 bg-background" />
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div
              key={day.toISOString()}
              className="sticky top-0 z-10 bg-background border-b border-border px-2 py-3 text-center"
            >
              <p className="text-xs text-foreground/40 uppercase tracking-wide">
                {day.toLocaleDateString(undefined, { weekday: "short" })}
              </p>
              <p
                className={`mt-1 inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-medium ${
                  isToday ? "bg-primary text-white" : ""
                }`}
              >
                {day.getDate()}
              </p>
            </div>
          );
        })}

        <div className="border-r border-border">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className={`h-16 pr-2 text-right text-xs text-foreground/40 ${
                hour === HOUR_START ? "" : "-translate-y-2"
              }`}
            >
              {formatHour(hour)}
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayEvents = events.filter((e) => isSameDay(e.start, day));
          const laidOut = layoutDay(dayEvents);
          return (
            <div key={day.toISOString()} className="relative overflow-hidden border-r border-border last:border-r-0">
              {HOURS.map((hour) => (
                <div key={hour} className="h-16 border-b border-border/60" />
              ))}
              <div className="absolute inset-0">
                {laidOut.map(({ event, column, columns }) => (
                  <EventBlock
                    key={event.id}
                    event={event}
                    isConflicting={conflictIds.has(event.id)}
                    isSelected={selectedEventId === event.id}
                    column={column}
                    columns={columns}
                    onClick={() => onSelectEvent(event)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
