import { createFileRoute, Outlet, useRouter, useRouterState, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

const TITLES: Record<string, string> = {
  dashboard: "Dashboard", members: "Members", contributions: "Contributions",
  fines: "Fines", loans: "Loans", meetings: "Meetings", reports: "Reports",
  notifications: "Notifications", users: "Users & Roles", audit: "Audit Log", settings: "Settings",
};

function AuthLayout() {
  const { user, loading, roles } = useAuth();
  const router = useRouter();
  const path = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth" });
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const seg = path.split("/").filter(Boolean)[0] ?? "dashboard";
  const pageTitle = TITLES[seg] ?? "SmartChama";
  const primaryRole = roles[0] ?? "member";
  const initial = (user.email ?? "?")[0]?.toUpperCase();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-4 z-20 mx-4 mt-4 flex h-16 items-center gap-3 rounded-2xl border border-border/60 bg-card/80 px-4 shadow-horizon backdrop-blur-xl sm:mx-6">
            <SidebarTrigger className="rounded-xl" />
            <div className="hidden flex-col leading-tight md:flex">
              <Link to="/dashboard" className="text-xs text-muted-foreground">Pages / {pageTitle}</Link>
              <span className="text-base font-bold tracking-tight">{pageTitle}</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="relative hidden md:block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search…" className="h-10 w-64 rounded-full border-transparent bg-secondary pl-9" />
              </div>
              <Button asChild variant="ghost" size="icon" className="rounded-full bg-secondary text-foreground hover:bg-secondary/80">
                <Link to="/notifications" aria-label="Notifications"><Bell className="h-4 w-4" /></Link>
              </Button>
              <div className="ml-1 flex items-center gap-2 rounded-full bg-secondary py-1 pl-1 pr-3">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-sm font-semibold text-primary-foreground">
                  {initial}
                </div>
                <div className="hidden text-xs leading-tight sm:block">
                  <div className="font-semibold">{user.email?.split("@")[0]}</div>
                  <div className="capitalize text-muted-foreground">{primaryRole}</div>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
