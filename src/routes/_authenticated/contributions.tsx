import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Plus, Banknote } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/format";
import { CONTRIBUTION_CATEGORIES, CATEGORY_LABEL, type ContributionCategory } from "@/lib/chama";

export const Route = createFileRoute("/_authenticated/contributions")({
  head: () => ({ meta: [{ title: "Contributions — SmartChama" }] }),
  component: Contributions,
});

function Contributions() {
  const { hasRole } = useAuth();
  const canManage = hasRole(["treasurer", "financial_analyst", "administrator"]);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

  const [form, setForm] = useState<{
    member_id: string;
    category: ContributionCategory;
    amount: string;
    period_month: string;
    paid_on: string;
  }>({
    member_id: "",
    category: "monthly",
    amount: "10000",
    period_month: firstOfMonth,
    paid_on: new Date().toISOString().slice(0, 10),
  });

  const { data } = useQuery({
    queryKey: ["contributions-page"],
    queryFn: async () => {
      const [c, p, s] = await Promise.all([
        supabase.from("contributions").select("*, profiles(full_name, member_no)").order("paid_on", { ascending: false }).limit(500),
        supabase.from("profiles").select("id, full_name, member_no, status").eq("status", "active").order("full_name"),
        supabase.from("settings").select("*").single(),
      ]);
      return { rows: c.data ?? [], members: p.data ?? [], settings: s.data };
    },
  });

  const rows = data?.rows ?? [];
  const totals = rows.reduce((s, r) => s + Number(r.amount), 0);
  const thisMonth = rows.filter((r) => r.period_month === firstOfMonth && (r as any).category === "monthly").reduce((s, r) => s + Number(r.amount), 0);
  const byCategory = useMemo(() => {
    const m: Record<string, number> = { monthly: 0, annual: 0, registration: 0, one_off: 0 };
    rows.forEach((r: any) => { m[r.category] = (m[r.category] ?? 0) + Number(r.amount); });
    return m;
  }, [rows]);

  // overdue monthly: active members without a monthly contribution for current month
  const paidThisMonth = new Set(
    rows.filter((r: any) => r.period_month === firstOfMonth && r.category === "monthly").map((r) => r.member_id)
  );
  const overdue = (data?.members ?? []).filter((m) => !paidThisMonth.has(m.id));

  const selectCategory = (value: ContributionCategory) => {
    const cfg = CONTRIBUTION_CATEGORIES.find((c) => c.value === value)!;
    setForm((f) => ({
      ...f,
      category: value,
      amount: cfg.defaultAmount > 0 ? String(cfg.defaultAmount) : "",
      period_month:
        value === "annual"
          ? `${today.getFullYear()}-09-01`
          : value === "monthly"
            ? firstOfMonth
            : f.period_month,
    }));
  };

  const add = async () => {
    if (!form.member_id || !form.amount) return toast.error("Member and amount required");
    const amountNum = Number(form.amount);
    const cfg = CONTRIBUTION_CATEGORIES.find((c) => c.value === form.category)!;
    if (cfg.minAmount && amountNum < cfg.minAmount) {
      return toast.error(`${cfg.label} must be at least ${formatMoney(cfg.minAmount)}`);
    }
    const { error } = await supabase.from("contributions").insert({
      member_id: form.member_id,
      amount: amountNum,
      category: form.category,
      period_month: form.period_month,
      paid_on: form.paid_on,
    });
    if (error) return toast.error(error.message);
    toast.success("Contribution recorded");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["contributions-page"] });
  };

  const activeHint = CONTRIBUTION_CATEGORIES.find((c) => c.value === form.category)?.hint;

  return (
    <div>
      <PageHeader title="Contributions" description="Record and track member contributions across categories"
        actions={canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Record</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record contribution</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => selectCategory(v as ContributionCategory)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONTRIBUTION_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {activeHint && <p className="mt-1 text-xs text-muted-foreground">{activeHint}</p>}
                </div>
                <div><Label>Member</Label>
                  <Select value={form.member_id} onValueChange={(v) => setForm({ ...form, member_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                    <SelectContent>
                      {(data?.members ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name} ({m.member_no})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Amount (KES)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div><Label>Period (month)</Label><Input type="date" value={form.period_month} onChange={(e) => setForm({ ...form, period_month: e.target.value })} /></div>
                <div><Label>Paid on</Label><Input type="date" value={form.paid_on} onChange={(e) => setForm({ ...form, paid_on: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={add}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Collected" value={formatMoney(totals)} icon={<Banknote className="h-5 w-5" />} tone="success" />
        <StatCard label="Monthly (this month)" value={formatMoney(thisMonth)} icon={<Banknote className="h-5 w-5" />} />
        <StatCard label="Annual Subscriptions" value={formatMoney(byCategory.annual)} icon={<Banknote className="h-5 w-5" />} />
        <StatCard label="Overdue Monthly" value={overdue.length} tone="warning" hint="No monthly payment this month" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {CONTRIBUTION_CATEGORIES.map((c) => (
          <Card key={c.value}>
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</div>
              <div className="mt-1 text-xl font-semibold">{formatMoney(byCategory[c.value] ?? 0)}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{c.hint}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="history" className="mt-6">
        <TabsList><TabsTrigger value="history">Payment history</TabsTrigger><TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger></TabsList>
        <TabsContent value="history">
          <Card><CardContent className="p-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Category</TableHead><TableHead>Period</TableHead><TableHead>Paid on</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {rows.slice(0, 100).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell><div className="font-medium">{r.profiles?.full_name}</div><div className="text-xs text-muted-foreground">{r.profiles?.member_no}</div></TableCell>
                      <TableCell><Badge variant="secondary">{CATEGORY_LABEL[r.category as ContributionCategory] ?? r.category}</Badge></TableCell>
                      <TableCell>{formatDate(r.period_month)}</TableCell>
                      <TableCell>{formatDate(r.paid_on)}</TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(r.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent></Card>
        </TabsContent>
        <TabsContent value="overdue">
          <Card><CardContent className="p-4">
            <Table>
              <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Member No.</TableHead><TableHead>Expected</TableHead></TableRow></TableHeader>
              <TableBody>
                {overdue.map((m) => (
                  <TableRow key={m.id}><TableCell className="font-medium">{m.full_name}</TableCell><TableCell>{m.member_no}</TableCell><TableCell>{formatMoney(Math.max(data?.settings?.monthly_contribution ?? 0, 10000))}</TableCell></TableRow>
                ))}
                {overdue.length === 0 && <TableRow><TableCell colSpan={3} className="py-8 text-center text-sm text-muted-foreground">All members paid up 🎉</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
