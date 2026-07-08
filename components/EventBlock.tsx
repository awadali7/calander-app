"use client";

import { useRef, useState } from "react";
import type { ClientEvent } from "@/lib/calendar-types";

const HOUR_START = 0;
const HOUR_END = 24;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const HOUR_HEIGHT_PX = 64;
const SNAP_MINUTES = 15;
const DRAG_THRESHOLD_PX = 4;

function hourFraction(date: Date): number {
  const hours = date.getHours() + date.getMinutes() / 60;
  return Math.min(Math.max(hours - HOUR_START, 0), TOTAL_HOURS);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function snapMinutes(minutes: number): number {
  return Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
}

type DragMode = "move" | "resize";

export function EventBlock({
  event,
  isConflicting,
  isSelected,
  column,
  columns,
  onClick,
  onReschedule,
}: {
  event: ClientEvent;
  isConflicting: boolean;
  isSelected: boolean;
  column: number;
  columns: number;
  onClick: () => void;
  onReschedule: (start: Date, end: Date) => void;
}) {
  const [preview, setPreview] = useState<{ start: Date; end: Date } | null>(null);
  const previewRef = useRef<{ start: Date; end: Date } | null>(null);
  const dragState = useRef<{
    mode: DragMode;
    startY: number;
    originalStart: Date;
    originalEnd: Date;
    moved: boolean;
  } | null>(null);

  function updatePreview(next: { start: Date; end: Date } | null) {
    previewRef.current = next;
    setPreview(next);
  }

  const displayStart = preview?.start ?? event.start;
  const displayEnd = preview?.end ?? event.end;

  const top = (hourFraction(displayStart) / TOTAL_HOURS) * 100;
  const bottom = (hourFraction(displayEnd) / TOTAL_HOURS) * 100;
  const height = Math.max(bottom - top, 4);
  const width = 100 / columns;
  const left = width * column;

  function beginDrag(mode: DragMode, e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragState.current = {
      mode,
      startY: e.clientY,
      originalStart: event.start,
      originalEnd: event.end,
      moved: false,
    };

    const dayStart = startOfDay(event.start).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    function handleMove(ev: PointerEvent) {
      const state = dragState.current;
      if (!state) return;
      const deltaPx = ev.clientY - state.startY;
      if (Math.abs(deltaPx) > DRAG_THRESHOLD_PX) state.moved = true;
      const deltaMinutes = snapMinutes((deltaPx / HOUR_HEIGHT_PX) * 60);

      if (state.mode === "move") {
        const duration = state.originalEnd.getTime() - state.originalStart.getTime();
        let newStart = state.originalStart.getTime() + deltaMinutes * 60 * 1000;
        newStart = Math.min(Math.max(newStart, dayStart), dayEnd - duration);
        updatePreview({ start: new Date(newStart), end: new Date(newStart + duration) });
      } else {
        let newEnd = state.originalEnd.getTime() + deltaMinutes * 60 * 1000;
        const minEnd = state.originalStart.getTime() + SNAP_MINUTES * 60 * 1000;
        newEnd = Math.min(Math.max(newEnd, minEnd), dayEnd);
        updatePreview({ start: state.originalStart, end: new Date(newEnd) });
      }
    }

    function handleUp() {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      const state = dragState.current;
      dragState.current = null;
      if (!state) return;

      if (!state.moved) {
        updatePreview(null);
        onClick();
        return;
      }

      const final = previewRef.current;
      updatePreview(null);
      if (final) onReschedule(final.start, final.end);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={(e) => beginDrag("move", e)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      className={`absolute rounded-input px-2 py-1 text-left overflow-hidden text-white text-xs shadow-sm transition cursor-grab select-none ${
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
      <p className="truncate opacity-80">{formatTime(displayStart)}</p>
      <p className="truncate opacity-70">{event.account}</p>
      <div
        onPointerDown={(e) => beginDrag("resize", e)}
        className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize"
      />
    </div>
  );
}
