import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Plus, HandCoins, Check, X } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/loans")({
  head: () => ({ meta: [{ title: "Loans — SmartChama" }] }),
  component: Loans,
});

function Loans() {
  const { hasRole, user } = useAuth();
  const canApprove = hasRole(["chairperson", "administrator"]);
  const canRepay = hasRole(["treasurer", "administrator"]);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [repayOpen, setRepayOpen] = useState<string | null>(null);
  const [form, setForm] = useState({ member_id: "", amount: "", purpose: "", due_date: "" });
  const [repay, setRepay] = useState("");

  const { data } = useQuery({
    queryKey: ["loans"],
    queryFn: async () => {
      const [l, m, r] = await Promise.all([
        supabase.from("loans").select("*, profiles(full_name,member_no)").order("applied_on", { ascending: false }),
        supabase.from("profiles").select("id,full_name,member_no").order("full_name"),
        supabase.from("loan_repayments").select("loan_id, amount"),
      ]);
      const repaidMap = new Map<string, number>();
      (r.data ?? []).forEach((x) => repaidMap.set(x.loan_id, (repaidMap.get(x.loan_id) ?? 0) + Number(x.amount)));
      return { loans: l.data ?? [], members: m.data ?? [], repaidMap };
    },
  });

  const totalActive = (data?.loans ?? []).filter((l) => l.status === "active").reduce((s, l) => s + Number(l.amount), 0);
  const totalRepaid = Array.from(data?.repaidMap.values() ?? []).reduce((a, b) => a + b, 0);
  const pending = (data?.loans ?? []).filter((l) => l.status === "pending");

  const apply = async () => {
    if (!form.member_id || !form.amount) return toast.error("Required fields missing");
    const { error } = await supabase.from("loans").insert({
      member_id: form.member_id,
      amount: Number(form.amount),
      purpose: form.purpose || null,
      due_date: form.due_date || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Loan application submitted");
    setOpen(false);
    setForm({ member_id: "", amount: "", purpose: "", due_date: "" });
    qc.invalidateQueries({ queryKey: ["loans"] });
  };

  const decide = async (id: string, status: "approved" | "rejected") => {
    const payload: any = { status: status === "approved" ? "active" : "rejected", approved_on: new Date().toISOString().slice(0, 10), approved_by: user?.id };
    const { error } = await supabase.from("loans").update(payload).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Loan ${status}`);
    qc.invalidateQueries({ queryKey: ["loans"] });
  };

  const recordRepayment = async () => {
    if (!repayOpen || !repay) return;
    const { error } = await supabase.from("loan_repayments").insert({ loan_id: repayOpen, amount: Number(repay) });
    if (error) return toast.error(error.message);
    // Auto-mark repaid if balance reaches zero
    const loan = data?.loans.find((l) => l.id === repayOpen);
    const totalPaid = (data?.repaidMap.get(repayOpen) ?? 0) + Number(repay);
    if (loan && totalPaid >= Number(loan.amount) * (1 + Number(loan.interest_rate) / 100)) {
      await supabase.from("loans").update({ status: "repaid" }).eq("id", repayOpen);
    }
    toast.success("Repayment recorded");
    setRepayOpen(null); setRepay("");
    qc.invalidateQueries({ queryKey: ["loans"] });
  };

  return (
    <div>
      <PageHeader title="Loans" description="Applications, approvals and repayments"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New application</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Loan application</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Member</Label>
                  <Select value={form.member_id} onValueChange={(v) => setForm({ ...form, member_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{(data?.members ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div><Label>Purpose</Label><Textarea value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></div>
                <div><Label>Due date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={apply}>Submit</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Loans" value={formatMoney(totalActive)} icon={<HandCoins className="h-5 w-5" />} />
        <StatCard label="Total Repaid" value={formatMoney(totalRepaid)} tone="success" />
        <StatCard label="Pending Approvals" value={pending.length} tone="warning" />
      </div>

      <Card className="mt-6"><CardContent className="p-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Purpose</TableHead><TableHead>Applied</TableHead><TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Balance</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {(data?.loans ?? []).map((l: any) => {
                const due = Number(l.amount) * (1 + Number(l.interest_rate) / 100);
                const paid = data?.repaidMap.get(l.id) ?? 0;
                const balance = Math.max(0, due - paid);
                return (
                  <TableRow key={l.id}>
                    <TableCell><div className="font-medium">{l.profiles?.full_name}</div><div className="text-xs text-muted-foreground">{l.profiles?.member_no}</div></TableCell>
                    <TableCell className="max-w-xs truncate">{l.purpose}</TableCell>
                    <TableCell>{formatDate(l.applied_on)}</TableCell>
                    <TableCell>{formatDate(l.due_date)}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{l.status}</Badge></TableCell>
                    <TableCell className="text-right">{formatMoney(l.amount)}</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(balance)}</TableCell>
                    <TableCell className="space-x-1">
                      {canApprove && l.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => decide(l.id, "approved")}><Check className="h-3 w-3" /></Button>
                          <Button size="sm" variant="outline" onClick={() => decide(l.id, "rejected")}><X className="h-3 w-3" /></Button>
                        </>
                      )}
                      {canRepay && l.status === "active" && (
                        <Button size="sm" variant="outline" onClick={() => setRepayOpen(l.id)}>Repay</Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent></Card>

      <Dialog open={!!repayOpen} onOpenChange={(o) => !o && setRepayOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record repayment</DialogTitle></DialogHeader>
          <div className="space-y-3"><Label>Amount</Label><Input type="number" value={repay} onChange={(e) => setRepay(e.target.value)} /></div>
          <DialogFooter><Button onClick={recordRepayment}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
