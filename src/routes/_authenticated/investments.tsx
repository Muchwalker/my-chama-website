import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Plus, Building2, TrendingUp, Landmark } from "lucide-react";
import { formatDate, formatMoney } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/investments")({
  head: () => ({ meta: [{ title: "Investments — SmartChama" }] }),
  component: Investments,
});

function Investments() {
  const { hasRole } = useAuth();
  const canManage = hasRole(["treasurer", "administrator"]);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["investments-page"],
    queryFn: async () => {
      const [assets, stocks, money] = await Promise.all([
        supabase.from("assets").select("*").order("purchase_date", { ascending: false }),
        supabase.from("stocks").select("*").order("purchase_date", { ascending: false }),
        supabase.from("money_market").select("*").order("investment_date", { ascending: false }),
      ]);
      return { assets: assets.data ?? [], stocks: stocks.data ?? [], money: money.data ?? [] };
    },
  });

  const totalAssets = (data?.assets ?? []).reduce((s, r) => s + Number(r.current_value ?? r.purchase_amount), 0);
  const totalStocks = (data?.stocks ?? []).reduce((s, r) => s + Number(r.num_shares) * Number(r.price_per_share), 0);
  const totalMoney = (data?.money ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const totalInvestments = totalAssets + totalStocks + totalMoney;

  return (
    <div>
      <PageHeader title="Investments" description="Track chama assets, stocks and money market investments" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Investments" value={formatMoney(totalInvestments)} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
        <StatCard label="Assets" value={formatMoney(totalAssets)} icon={<Building2 className="h-5 w-5" />} hint={`${data?.assets.length ?? 0} items`} />
        <StatCard label="Stocks" value={formatMoney(totalStocks)} icon={<TrendingUp className="h-5 w-5" />} hint={`${data?.stocks.length ?? 0} holdings`} />
        <StatCard label="Money Market" value={formatMoney(totalMoney)} icon={<Landmark className="h-5 w-5" />} hint={`${data?.money.length ?? 0} accounts`} />
      </div>

      <Tabs defaultValue="assets" className="mt-6">
        <TabsList>
          <TabsTrigger value="assets">Assets ({data?.assets.length ?? 0})</TabsTrigger>
          <TabsTrigger value="stocks">Stocks ({data?.stocks.length ?? 0})</TabsTrigger>
          <TabsTrigger value="money">Money Market ({data?.money.length ?? 0})</TabsTrigger>
        </TabsList>

        {/* ── ASSETS ── */}
        <TabsContent value="assets">
          <div className="mb-4 flex justify-end">
            {canManage && <AddAssetDialog qc={qc} />}
          </div>
          <Card><CardContent className="p-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-right">Purchase Amount</TableHead>
                    <TableHead className="text-right">Current Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.assets ?? []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.name}</div>
                        {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
                      </TableCell>
                      <TableCell>{formatDate(r.purchase_date)}</TableCell>
                      <TableCell>{r.account ?? "—"}</TableCell>
                      <TableCell>{r.payment_method ?? "—"}</TableCell>
                      <TableCell className="text-right">{formatMoney(r.purchase_amount)}</TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(r.current_value ?? r.purchase_amount)}</TableCell>
                    </TableRow>
                  ))}
                  {(data?.assets ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No assets recorded yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* ── STOCKS ── */}
        <TabsContent value="stocks">
          <div className="mb-4 flex justify-end">
            {canManage && <AddStockDialog qc={qc} />}
          </div>
          <Card><CardContent className="p-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stock Name</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Price/Share</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.stocks ?? []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.stock_name}</TableCell>
                      <TableCell>{formatDate(r.purchase_date)}</TableCell>
                      <TableCell>{r.account ?? "—"}</TableCell>
                      <TableCell className="text-right">{r.num_shares}</TableCell>
                      <TableCell className="text-right">{formatMoney(r.price_per_share)}</TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(Number(r.num_shares) * Number(r.price_per_share))}</TableCell>
                    </TableRow>
                  ))}
                  {(data?.stocks ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No stock purchases recorded yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* ── MONEY MARKET ── */}
        <TabsContent value="money">
          <div className="mb-4 flex justify-end">
            {canManage && <AddMoneyMarketDialog qc={qc} />}
          </div>
          <Card><CardContent className="p-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Institution</TableHead>
                    <TableHead>Investment Date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.money ?? []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.institution}</TableCell>
                      <TableCell>{formatDate(r.investment_date)}</TableCell>
                      <TableCell>{r.account ?? "—"}</TableCell>
                      <TableCell>{r.description ?? "—"}</TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(r.amount)}</TableCell>
                    </TableRow>
                  ))}
                  {(data?.money ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No money market investments recorded yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── ADD ASSET ──────────────────────────────────────────────────────────────
function AddAssetDialog({ qc }: { qc: any }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", purchase_date: new Date().toISOString().slice(0, 10), purchase_amount: "", current_value: "", account: "", payment_method: "" });

  const save = async () => {
    if (!form.name || !form.purchase_amount) return toast.error("Name and purchase amount required");
    const { error } = await supabase.from("assets").insert({
      name: form.name,
      description: form.description || null,
      purchase_date: form.purchase_date,
      purchase_amount: Number(form.purchase_amount),
      current_value: form.current_value ? Number(form.current_value) : null,
      account: form.account || null,
      payment_method: form.payment_method || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Asset recorded");
    setOpen(false);
    setForm({ name: "", description: "", purchase_date: new Date().toISOString().slice(0, 10), purchase_amount: "", current_value: "", account: "", payment_method: "" });
    qc.invalidateQueries({ queryKey: ["investments-page"] });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Record Asset Purchase</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Asset Purchase</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Asset Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Office Printer" /></div>
          <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" /></div>
          <div><Label>Purchase Date *</Label><Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} /></div>
          <div><Label>Purchase Amount (KES) *</Label><Input type="number" value={form.purchase_amount} onChange={(e) => setForm({ ...form, purchase_amount: e.target.value })} /></div>
          <div><Label>Current Value (KES)</Label><Input type="number" value={form.current_value} onChange={(e) => setForm({ ...form, current_value: e.target.value })} placeholder="Leave blank if same as purchase" /></div>
          <div><Label>Account</Label><Input value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} placeholder="e.g. Equity Bank" /></div>
          <div><Label>Payment Method</Label><Input value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} placeholder="e.g. Bank Transfer, M-Pesa" /></div>
        </div>
        <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── ADD STOCK ──────────────────────────────────────────────────────────────
function AddStockDialog({ qc }: { qc: any }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ stock_name: "", purchase_date: new Date().toISOString().slice(0, 10), num_shares: "", price_per_share: "", account: "" });

  const save = async () => {
    if (!form.stock_name || !form.num_shares || !form.price_per_share) return toast.error("Stock name, shares and price required");
    const { error } = await supabase.from("stocks").insert({
      stock_name: form.stock_name,
      purchase_date: form.purchase_date,
      num_shares: Number(form.num_shares),
      price_per_share: Number(form.price_per_share),
      account: form.account || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Stock purchase recorded");
    setOpen(false);
    setForm({ stock_name: "", purchase_date: new Date().toISOString().slice(0, 10), num_shares: "", price_per_share: "", account: "" });
    qc.invalidateQueries({ queryKey: ["investments-page"] });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Record Stock Purchase</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Record Stock Purchase</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Stock Name *</Label><Input value={form.stock_name} onChange={(e) => setForm({ ...form, stock_name: e.target.value })} placeholder="e.g. Safaricom PLC" /></div>
          <div><Label>Purchase Date *</Label><Input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} /></div>
          <div><Label>Number of Shares *</Label><Input type="number" value={form.num_shares} onChange={(e) => setForm({ ...form, num_shares: e.target.value })} /></div>
          <div><Label>Price per Share (KES) *</Label><Input type="number" value={form.price_per_share} onChange={(e) => setForm({ ...form, price_per_share: e.target.value })} /></div>
          <div><Label>Account</Label><Input value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} placeholder="e.g. CDSC Account" /></div>
        </div>
        <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── ADD MONEY MARKET ───────────────────────────────────────────────────────
function AddMoneyMarketDialog({ qc }: { qc: any }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ institution: "", investment_date: new Date().toISOString().slice(0, 10), amount: "", account: "", description: "" });

  const save = async () => {
    if (!form.institution || !form.amount) return toast.error("Institution and amount required");
    const { error } = await supabase.from("money_market").insert({
      institution: form.institution,
      investment_date: form.investment_date,
      amount: Number(form.amount),
      account: form.account || null,
      description: form.description || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Money market investment recorded");
    setOpen(false);
    setForm({ institution: "", investment_date: new Date().toISOString().slice(0, 10), amount: "", account: "", description: "" });
    qc.invalidateQueries({ queryKey: ["investments-page"] });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Record Investment</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Money Market Investment</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Investment Institution *</Label><Input value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} placeholder="e.g. CIC Money Market Fund" /></div>
          <div><Label>Investment Date *</Label><Input type="date" value={form.investment_date} onChange={(e) => setForm({ ...form, investment_date: e.target.value })} /></div>
          <div><Label>Amount (KES) *</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div><Label>Account</Label><Input value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} placeholder="e.g. CIC Account No." /></div>
          <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional notes" /></div>
        </div>
        <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
