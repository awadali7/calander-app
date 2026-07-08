"use client";

import { useMemo, useRef, useState } from "react";
import type { ClientEvent } from "@/lib/calendar-types";

const MAX_RESULTS = 8;

export function SearchBox({
  events,
  onSelect,
}: {
  events: ClientEvent[];
  onSelect: (event: ClientEvent) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return events
      .filter((e) => e.title.toLowerCase().includes(q) || (e.location ?? "").toLowerCase().includes(q))
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, MAX_RESULTS);
  }, [events, query]);

  function pick(event: ClientEvent) {
    onSelect(event);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && results.length > 0) {
      pick(results[0]);
    } else if (e.key === "Escape") {
      setQuery("");
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div className="relative w-56">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        placeholder="Search events…"
        className="w-full rounded-pill border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-card border border-border bg-card shadow-lg overflow-hidden">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-xs text-foreground/40">No matching events.</p>
          ) : (
            results.map((event) => (
              <button
                key={event.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(event)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-background transition"
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: event.color }} />
                <div className="min-w-0">
                  <p className="truncate leading-tight">{event.title}</p>
                  <p className="text-xs text-foreground/40 leading-tight">
                    {event.start.toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
