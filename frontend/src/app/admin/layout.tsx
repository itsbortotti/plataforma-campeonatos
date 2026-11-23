import { Suspense } from "react";
import { redirect } from "next/navigation";
import { apiGet } from "@/lib/api-server";
import { getSeasons, getCurrentSeason } from "@/lib/queries";
import { AdminSidebar, AdminMobileMenu } from "@/components/admin/AdminSidebar";
import { AdminScopeSwitcher } from "@/components/admin/AdminScopeSwitcher";
import { SeasonWorkspaceNav } from "@/components/admin/SeasonWorkspaceNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let me: {
    user: { role: string };
    memberships?: Array<{ role: string }>;
  };
  try {
    me = await apiGet("/api/auth/me");
  } catch {
    redirect("/master/login");
  }

  const memberships = me.memberships ?? [];
  const canAdmin =
    me.user.role === "admin" ||
    memberships.some((m) => m.role === "owner" || m.role === "league_admin");
  if (!canAdmin) {
    redirect("/");
  }

  const [seasons, currentSeason] = await Promise.all([
    getSeasons(),
    getCurrentSeason(),
  ]);

  return (
    <div className="flex min-h-screen">
      <Suspense
        fallback={
          <div
            aria-hidden
            className="hidden md:block w-[248px] shrink-0"
          />
        }
      >
        <AdminSidebar />
      </Suspense>
      <div className="flex-1 min-w-0 flex flex-col overflow-auto md:h-screen">
        <header className="sticky top-0 z-40 border-b border-border/40 bg-background/90 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
            <Suspense fallback={null}>
              <AdminMobileMenu />
            </Suspense>
            <div className="min-w-0 flex-1">
              <Suspense fallback={null}>
                <AdminScopeSwitcher
                  seasons={seasons}
                  currentSeasonId={currentSeason?.id ?? ""}
                />
              </Suspense>
            </div>
            <div className="ml-auto flex items-center gap-2 [&_a]:text-foreground [&_button]:text-foreground">
              <UserMenu />
              <ThemeToggle />
            </div>
          </div>
          <div className="px-4 sm:px-6">
            <Suspense fallback={null}>
              <SeasonWorkspaceNav />
            </Suspense>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6 flex justify-center">
          <div className="w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
