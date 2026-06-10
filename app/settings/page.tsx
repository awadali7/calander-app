import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ConnectCalendars } from "@/components/ConnectCalendars";
import { SettingsPanels } from "@/components/SettingsPanels";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 justify-center px-6 py-10 overflow-y-auto">
      <div className="w-full max-w-2xl flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Settings</h1>
            <p className="text-sm text-foreground/50 mt-1">Manage connected accounts, reminders and notifications.</p>
          </div>
          <Link href="/calendar" className="rounded-pill border border-border text-sm font-medium px-4 py-2 hover:bg-background transition">
            ← Back to calendar
          </Link>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-lg">Connected accounts</h2>
          <ConnectCalendars context="settings" />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-lg">Preferences</h2>
          <SettingsPanels />
        </section>
      </div>
    </div>
  );
}
