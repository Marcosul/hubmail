import { cookies } from "next/headers";
import { AppSidebar } from "@/components/dashboard/app-sidebar";

export default async function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const email = cookieStore.get("hubmail_user_email")?.value;
  const userLabel = email?.includes("@") ? email.split("@")[0]! : email || "Account";

  return (
    <div className="flex min-h-screen">
      <AppSidebar userLabel={userLabel} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
