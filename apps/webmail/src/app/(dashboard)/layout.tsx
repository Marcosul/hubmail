import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { WorkspaceGate } from "@/components/workspace/workspace-gate";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export default async function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email;
  const userLabel = email?.includes("@") ? email.split("@")[0]! : email || "Account";

  return (
    <WorkspaceGate>
      <div className="flex min-h-screen bg-white dark:bg-[#0a0a0a]">
        <AppSidebar userLabel={userLabel} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col pt-14 lg:pt-0">{children}</div>
      </div>
    </WorkspaceGate>
  );
}
