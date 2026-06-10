"use client";

import type { ClientAccount } from "@/lib/calendar-types";

export function AccountToggle({
  account,
  enabled,
  onToggle,
}: {
  account: ClientAccount;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-center gap-2 px-1 py-1 cursor-pointer text-sm group">
      <input
        type="checkbox"
        checked={enabled}
        onChange={onToggle}
        className="sr-only"
      />
      <span
        className="w-4 h-4 rounded shrink-0 border-2 flex items-center justify-center transition"
        style={{
          borderColor: account.color,
          background: enabled ? account.color : "transparent",
        }}
      >
        {enabled && (
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M3 8.5 6.5 12 13 4.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={`truncate ${enabled ? "text-foreground" : "text-foreground/40"}`}>
        {account.email}
      </span>
    </label>
  );
}
