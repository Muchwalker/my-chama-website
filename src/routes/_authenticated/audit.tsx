import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, EmptyState } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({ meta: [{ title: "Audit log — SmartChama" }] }),
  component: AuditPage,
});

function AuditPage() {
  const { hasRole } = useAuth();
  const { data } = useQuery({
    queryKey: ["audit"],
    queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });

  if (!hasRole("administrator")) return <div className="text-sm text-muted-foreground">Administrator access only.</div>;

  return (
    <div>
      <PageHeader title="Audit Log" description="Recent system activity" />
      <Card><CardContent className="p-4">
        {(data ?? []).length === 0 ? (
          <EmptyState title="No activity recorded yet" description="User actions will be logged here as they happen." />
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead></TableRow></TableHeader>
            <TableBody>
              {(data ?? []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{formatDateTime(l.created_at)}</TableCell>
                  <TableCell>{l.action}</TableCell>
                  <TableCell className="text-muted-foreground">{l.entity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>
    </div>
  );
}
