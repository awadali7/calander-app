import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Logo } from "@/components/Logo";
import { ConnectCalendars } from "@/components/ConnectCalendars";

export default async function ConnectPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 justify-center px-6 py-12">
      <div className="w-full max-w-2xl flex flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size={44} />
          <div>
            <h1 className="text-2xl font-semibold">Connect your calendars</h1>
            <p className="text-sm text-foreground/50 mt-1">
              Link Gmail, Outlook and Apple Calendar accounts to build your unified view.
            </p>
          </div>
        </div>
        <ConnectCalendars context="connect" />
      </div>
    </div>
  );
}
