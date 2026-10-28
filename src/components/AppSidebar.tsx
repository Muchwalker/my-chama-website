import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Banknote, AlertTriangle, HandCoins, Calendar,
  FileBarChart, Bell, Settings as SettingsIcon, Shield, ScrollText, LogOut, TrendingUp
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { roles, hasRole, isStaff, signOut, user } = useAuth();

  const main = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, show: true },
    { title: "Members", url: "/members", icon: Users, show: true },
    { title: "Contributions", url: "/contributions", icon: Banknote, show: true },
    { title: "Fines", url: "/fines", icon: AlertTriangle, show: true },
    { title: "Loans", url: "/loans", icon: HandCoins, show: true },
    { title: "Meetings", url: "/meetings", icon: Calendar, show: true },
    { title: "Investments", url: "/investments", icon: TrendingUp, show: true },
    { title: "Reports", url: "/reports", icon: FileBarChart, show: isStaff },
    { title: "Notifications", url: "/notifications", icon: Bell, show: true },
  ];
  const admin = [
    { title: "Users & Roles", url: "/users", icon: Shield, show: hasRole("administrator") },
    { title: "Audit Log", url: "/audit", icon: ScrollText, show: hasRole("administrator") },
    { title: "Settings", url: "/settings", icon: SettingsIcon, show: hasRole("administrator") },
  ];

  const isActive = (url: string) => path === url || path.startsWith(url + "/");
  const primaryRole = roles[0] ?? "member";

 const renderItem = (item: { title: string; url: string; icon: typeof LayoutDashboard }) => {
  const active = isActive(item.url);
  return (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton
        asChild
        isActive={active}
        className={cn(
          "relative h-11 rounded-xl px-3 font-medium transition",
          active
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        )}
      >
        <Link to={item.url} className="flex items-center gap-3">
          <span
            className={cn(
              "grid h-8 w-8 place-items-center rounded-lg transition",
              active ? "bg-primary text-primary-foreground shadow-horizon-sm" : "bg-transparent text-current"
            )}
          >
            <item.icon className="h-4 w-4" />
          </span>
          {!collapsed && <span className="text-sm">{item.title}</span>}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-3 py-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-bold text-sm shadow-horizon-sm">
            SC
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="text-sm font-bold tracking-tight">SmartChama</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">FREE</div>
            </div>
          )}
        </div>
        <div className="mx-3 mb-2 h-px bg-sidebar-border" />
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="px-2 text-[10px] uppercase tracking-widest">Main</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {main.filter((i) => i.show).map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {admin.some((i) => i.show) && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="px-2 text-[10px] uppercase tracking-widest">Administration</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {admin.filter((i) => i.show).map(renderItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-3">
        {!collapsed && (
          <div className="mb-2 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3">
            <div className="truncate text-sm font-semibold text-sidebar-foreground">{user?.email}</div>
            <div className="mt-0.5 text-xs capitalize text-muted-foreground">{primaryRole}</div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="justify-start gap-2 rounded-xl text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}