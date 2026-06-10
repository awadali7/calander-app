"use client";

import { useState } from "react";

const REMINDER_OPTIONS = [5, 10, 15, 30, 60];
const TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
];

type Prefs = {
  defaultReminderMinutes: number;
  timezone: string;
  notifyEmail: boolean;
  notifyPush: boolean;
  notifyConflicts: boolean;
};

const STORAGE_KEY = "unical:preferences";

const DEFAULT_PREFS: Prefs = {
  defaultReminderMinutes: 15,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
  notifyEmail: true,
  notifyPush: true,
  notifyConflicts: true,
};

function loadStoredPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULT_PREFS, ...JSON.parse(stored) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function SettingsPanels() {
  const [prefs, setPrefs] = useState<Prefs>(loadStoredPrefs);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-card bg-card border border-border p-5 flex flex-col gap-4">
        <div>
          <h2 className="font-semibold">Reminder preferences</h2>
          <p className="text-sm text-foreground/50">Choose how far ahead UniCal should remind you of events by default.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {REMINDER_OPTIONS.map((minutes) => (
            <button
              key={minutes}
              onClick={() => update("defaultReminderMinutes", minutes)}
              className={`rounded-pill border px-4 py-2 text-sm font-medium transition ${
                prefs.defaultReminderMinutes === minutes
                  ? "bg-primary text-white border-primary"
                  : "border-border hover:bg-background"
              }`}
            >
              {minutes} min before
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-card bg-card border border-border p-5 flex flex-col gap-4">
        <div>
          <h2 className="font-semibold">Time zone</h2>
          <p className="text-sm text-foreground/50">All event times are shown in this time zone.</p>
        </div>
        <select
          value={prefs.timezone}
          onChange={(e) => update("timezone", e.target.value)}
          className="rounded-input border border-border bg-background px-3 py-2 text-sm w-full max-w-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {[prefs.timezone, ...TIMEZONES.filter((tz) => tz !== prefs.timezone)].map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </section>

      <section className="rounded-card bg-card border border-border p-5 flex flex-col gap-3">
        <div>
          <h2 className="font-semibold">Notifications</h2>
          <p className="text-sm text-foreground/50">Control how UniCal reaches you about events and conflicts.</p>
        </div>
        <ToggleRow
          label="Email reminders"
          description="Get an email before each event starts."
          checked={prefs.notifyEmail}
          onChange={(v) => update("notifyEmail", v)}
        />
        <ToggleRow
          label="Push notifications"
          description="Get a browser/device notification before each event starts."
          checked={prefs.notifyPush}
          onChange={(v) => update("notifyPush", v)}
        />
        <ToggleRow
          label="Conflict alerts"
          description="Get notified as soon as a scheduling conflict is detected."
          checked={prefs.notifyConflicts}
          onChange={(v) => update("notifyConflicts", v)}
        />
      </section>

      <p className={`text-xs text-foreground/40 transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}>
        Preferences saved
      </p>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer py-1">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-foreground/50">{description}</p>
      </div>
      <span
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill transition ${
          checked ? "bg-primary" : "bg-border"
        }`}
      >
        <span
          className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow transition ${
            checked ? "translate-x-5.5" : "translate-x-1"
          }`}
          style={{ height: 18, width: 18 }}
        />
      </span>
    </label>
  );
}
