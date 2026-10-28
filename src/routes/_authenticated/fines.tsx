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
import { Plus, AlertTriangle, Check } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/fines")({
  head: () => ({ meta: [{ title: "Fines — SmartChama" }] }),
  component: Fines,
});

function Fines() {
  const { isStaff } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ member_id: "", category_id: "", amount: "", reason: "" });

  const { data } = useQuery({
    queryKey: ["fines"],
    queryFn: async () => {
      const [f, m, c] = await Promise.all([
        supabase.from("fines").select("*, profiles(full_name,member_no), fine_categories(name)").order("issued_on", { ascending: false }),
        supabase.from("profiles").select("id,full_name,member_no,status").order("full_name"),
        supabase.from("fine_categories").select("*").order("name"),
      ]);
      return { fines: f.data ?? [], members: m.data ?? [], cats: c.data ?? [] };
    },
  });

  const outstanding = (data?.fines ?? []).filter((f) => f.status === "outstanding");
  const paid = (data?.fines ?? []).filter((f) => f.status === "paid");
  const totalOut = outstanding.reduce((s, f) => s + Number(f.amount), 0);
  const totalCollected = paid.reduce((s, f) => s + Number(f.amount), 0);

  const issue = async () => {
    if (!form.member_id || !form.amount) return toast.error("Member and amount required");
    const { error } = await supabase.from("fines").insert({
      member_id: form.member_id,
      category_id: form.category_id || null,
      amount: Number(form.amount),
      reason: form.reason || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Fine issued");
    setOpen(false);
    setForm({ member_id: "", category_id: "", amount: "", reason: "" });
    qc.invalidateQueries({ queryKey: ["fines"] });
  };

  const markPaid = async (id: string) => {
    const { error } = await supabase.from("fines").update({ status: "paid", paid_on: new Date().toISOString().slice(0, 10) }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Marked paid");
    qc.invalidateQueries({ queryKey: ["fines"] });
  };

  const onCat = (id: string) => {
    const c = data?.cats.find((x) => x.id === id);
    setForm({ ...form, category_id: id, amount: c?.default_amount?.toString() ?? form.amount });
  };

  return (
    <div>
      <PageHeader title="Fines" description="Issue and track member fines"
        actions={isStaff && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Issue fine</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Issue fine</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Member</Label>
                  <Select value={form.member_id} onValueChange={(v) => setForm({ ...form, member_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{(data?.members ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Category</Label>
                  <Select value={form.category_id} onValueChange={onCat}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{(data?.cats ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
                <div><Label>Reason</Label><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={issue}>Issue</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Outstanding" value={formatMoney(totalOut)} icon={<AlertTriangle className="h-5 w-5" />} tone="warning" hint={`${outstanding.length} fines`} />
        <StatCard label="Collected" value={formatMoney(totalCollected)} tone="success" hint={`${paid.length} payments`} />
        <StatCard label="Categories" value={data?.cats.length ?? 0} />
      </div>

      <Card className="mt-6"><CardContent className="p-4">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Category</TableHead><TableHead>Reason</TableHead><TableHead>Issued</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {(data?.fines ?? []).map((f: any) => (
                <TableRow key={f.id}>
                  <TableCell><div className="font-medium">{f.profiles?.full_name}</div><div className="text-xs text-muted-foreground">{f.profiles?.member_no}</div></TableCell>
                  <TableCell>{f.fine_categories?.name ?? "—"}</TableCell>
                  <TableCell className="max-w-xs truncate">{f.reason}</TableCell>
                  <TableCell>{formatDate(f.issued_on)}</TableCell>
                  <TableCell><Badge variant={f.status === "outstanding" ? "destructive" : "secondary"} className="capitalize">{f.status}</Badge></TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(f.amount)}</TableCell>
                  <TableCell>{isStaff && f.status === "outstanding" && <Button size="sm" variant="outline" onClick={() => markPaid(f.id)}><Check className="mr-1 h-3 w-3" />Paid</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent></Card>
    </div>
  );
}
