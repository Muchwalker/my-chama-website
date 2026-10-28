import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Bell, Check } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — SmartChama" }] }),
  component: Notifications,
});

function Notifications() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false })).data ?? [],
    enabled: !!user,
  });

  const markRead = async (id: string) => {
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  };

  return (
    <div>
      <PageHeader title="Notifications" description="Reminders and alerts" />
      <Card><CardContent className="p-4">
        {(data ?? []).length === 0 ? (
          <EmptyState title="You're all caught up" description="Reminders for contributions, fines, loan repayments and meetings will appear here." />
        ) : (
          <ul className="divide-y">
            {(data ?? []).map((n) => (
              <li key={n.id} className="flex items-start gap-3 py-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"><Bell className="h-4 w-4" /></div>
                <div className="flex-1">
                  <div className="font-medium">{n.title}</div>
                  <div className="text-sm text-muted-foreground">{n.message}</div>
                  <div className="text-xs text-muted-foreground">{formatDateTime(n.created_at)}</div>
                </div>
                {!n.read && <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}><Check className="h-4 w-4" /></Button>}
              </li>
            ))}
          </ul>
        )}
      </CardContent></Card>
    </div>
  );
}
