"use client";

import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import type { ClientEvent } from "@/lib/calendar-types";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS = 3;

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function MonthGrid({
  monthDate,
  events,
  conflictIds,
  onSelectDay,
  onSelectEvent,
}: {
  monthDate: Date;
  events: ClientEvent[];
  conflictIds: Set<string>;
  onSelectDay: (date: Date) => void;
  onSelectEvent: (event: ClientEvent) => void;
}) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const today = new Date();

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="grid grid-cols-7 gap-px bg-border border border-border rounded-card overflow-hidden text-xs">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="bg-background px-2 py-2 text-center font-medium text-foreground/40 uppercase tracking-wide">
            {label}
          </div>
        ))}
        {days.map((day) => {
          const isCurrentMonth = day.getMonth() === monthDate.getMonth();
          const isToday = isSameDay(day, today);
          const dayEvents = events
            .filter((e) => isSameDay(e.start, day))
            .sort((a, b) => a.start.getTime() - b.start.getTime());
          const visible = dayEvents.slice(0, MAX_CHIPS);
          const overflow = dayEvents.length - visible.length;

          return (
            <div
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={`bg-card min-h-[100px] p-1.5 flex flex-col gap-1 cursor-pointer hover:bg-background/60 transition ${
                isCurrentMonth ? "" : "opacity-40"
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium ${
                  isToday ? "bg-primary text-white" : "text-foreground/70"
                }`}
              >
                {day.getDate()}
              </span>
              <div className="flex flex-col gap-0.5">
                {visible.map((event) => (
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(event);
                    }}
                    className={`flex items-center gap-1 rounded px-1 py-0.5 text-white truncate text-left ${
                      conflictIds.has(event.id) ? "border border-dashed border-conflict" : ""
                    }`}
                    style={{ background: conflictIds.has(event.id) ? "#EF4444" : event.color }}
                  >
                    <span className="truncate">{event.title}</span>
                  </button>
                ))}
                {overflow > 0 && <p className="text-foreground/40 px-1">+{overflow} more</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
