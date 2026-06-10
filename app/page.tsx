import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Logo } from "@/components/Logo";
import { SignInButton } from "@/components/SignInButton";

export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect("/connect");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-8 rounded-card bg-card border border-border p-10 text-center">
        <Logo size={56} />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">UniCal</h1>
          <p className="text-sm text-foreground/60">All your calendars. One place.</p>
        </div>
        <SignInButton />
        <p className="text-xs text-foreground/40">
          Read-only access only — UniCal never edits your source calendars.
        </p>
      </div>
    </div>
  );
}
