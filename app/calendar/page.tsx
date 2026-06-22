import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CalendarDashboard } from "@/components/CalendarDashboard";

export default async function CalendarPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <CalendarDashboard />
    </div>
  );
}
