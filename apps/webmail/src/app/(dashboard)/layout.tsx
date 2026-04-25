import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { WorkspaceGate } from "@/components/workspace/workspace-gate";
import { getMessages } from "@/i18n/messages";
import { getServerLocale } from "@/i18n/server";
import { isFatalAuthSessionError } from "@/lib/supabase/auth-session-errors";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export default async function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  const messages = getMessages(await getServerLocale());
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError && isFatalAuthSessionError(authError)) {
    await supabase.auth.signOut();
    redirect("/login");
  }
  const user = userData.user;
  if (!user) {
    redirect("/login");
  }
  const email = user.email;
  const userLabel = email?.includes("@") ? email.split("@")[0]! : email || messages.dashboard.account;

  return (
    <WorkspaceGate>
      <div className="flex min-h-screen bg-white dark:bg-[#0a0a0a]">
        <AppSidebar userLabel={userLabel} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col pt-14 lg:pt-0">{children}</div>
      </div>
    </WorkspaceGate>
  );
}
