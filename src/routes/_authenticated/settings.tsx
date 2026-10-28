import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — SmartChama" }] }),
  component: Settings,
});

function Settings() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>(null);

  const { data } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await supabase.from("settings").select("*").single()).data,
  });
  useEffect(() => { if (data) setForm(data); }, [data]);

  if (!hasRole("administrator")) return <div className="text-sm text-muted-foreground">Administrator access only.</div>;
  if (!form) return <div>Loading…</div>;

  const save = async () => {
    const { error } = await supabase.from("settings").update({
      chama_name: form.chama_name,
      monthly_contribution: Number(form.monthly_contribution),
      loan_interest_rate: Number(form.loan_interest_rate),
      auto_fine_missed_meeting: form.auto_fine_missed_meeting,
      missed_meeting_fine: Number(form.missed_meeting_fine),
      late_contribution_fine: Number(form.late_contribution_fine),
      currency: form.currency,
    }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Settings updated");
    qc.invalidateQueries({ queryKey: ["settings"] });
  };

  return (
    <div>
      <PageHeader title="System Settings" description="Chama configuration" />
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>General</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Chama name</Label><Input value={form.chama_name} onChange={(e) => setForm({ ...form, chama_name: e.target.value })} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
            <div><Label>Monthly contribution</Label><Input type="number" value={form.monthly_contribution} onChange={(e) => setForm({ ...form, monthly_contribution: e.target.value })} /></div>
            <div><Label>Loan interest rate (%)</Label><Input type="number" value={form.loan_interest_rate} onChange={(e) => setForm({ ...form, loan_interest_rate: e.target.value })} /></div>
            <div><Label>Late contribution fine</Label><Input type="number" value={form.late_contribution_fine} onChange={(e) => setForm({ ...form, late_contribution_fine: e.target.value })} /></div>
            <div><Label>Missed meeting fine</Label><Input type="number" value={form.missed_meeting_fine} onChange={(e) => setForm({ ...form, missed_meeting_fine: e.target.value })} /></div>
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div><div className="font-medium text-sm">Auto-fine missed meetings</div><div className="text-xs text-muted-foreground">Issue a fine automatically when saving attendance</div></div>
            <Switch checked={form.auto_fine_missed_meeting} onCheckedChange={(v) => setForm({ ...form, auto_fine_missed_meeting: v })} />
          </div>
          <Button onClick={save}>Save settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}
