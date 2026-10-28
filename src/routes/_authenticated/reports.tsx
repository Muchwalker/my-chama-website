import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Banknote, AlertTriangle, HandCoins, TrendingUp, Printer } from "lucide-react";
import { formatMoney, monthKey } from "@/lib/format";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Line, LineChart } from "recharts";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — SmartChama" }] }),
  component: Reports,
});

function Reports() {
  const { data } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const [c, f, l, r] = await Promise.all([
        supabase.from("contributions").select("amount, period_month"),
        supabase.from("fines").select("amount, status, issued_on"),
        supabase.from("loans").select("amount, status"),
        supabase.from("loan_repayments").select("amount, paid_on"),
      ]);
      return { c: c.data ?? [], f: f.data ?? [], l: l.data ?? [], r: r.data ?? [] };
    },
  });

  const totalContrib = (data?.c ?? []).reduce((s, x) => s + Number(x.amount), 0);
  const finesCollected = (data?.f ?? []).filter((x) => x.status === "paid").reduce((s, x) => s + Number(x.amount), 0);
  const activeLoans = (data?.l ?? []).filter((x) => x.status === "active").reduce((s, x) => s + Number(x.amount), 0);
  const repayments = (data?.r ?? []).reduce((s, x) => s + Number(x.amount), 0);

  const byMonth = new Map<string, { contrib: number; fines: number; repaid: number }>();
  (data?.c ?? []).forEach((x) => {
    const k = monthKey(x.period_month);
    const cur = byMonth.get(k) ?? { contrib: 0, fines: 0, repaid: 0 };
    cur.contrib += Number(x.amount);
    byMonth.set(k, cur);
  });
  (data?.f ?? []).filter((x) => x.status === "paid").forEach((x) => {
    const k = monthKey(x.issued_on);
    const cur = byMonth.get(k) ?? { contrib: 0, fines: 0, repaid: 0 };
    cur.fines += Number(x.amount); byMonth.set(k, cur);
  });
  (data?.r ?? []).forEach((x) => {
    const k = monthKey(x.paid_on);
    const cur = byMonth.get(k) ?? { contrib: 0, fines: 0, repaid: 0 };
    cur.repaid += Number(x.amount); byMonth.set(k, cur);
  });
  const series = Array.from(byMonth.entries()).map(([month, v]) => ({ month, ...v })).slice(-6);
  const incomeSeries = series.map((s) => ({ month: s.month, income: s.contrib + s.fines + s.repaid }));

  return (
    <div>
      <PageHeader title="Financial Reports" description="Performance overview and exports"
        actions={<Button variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Print / Save PDF</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Contributions" value={formatMoney(totalContrib)} icon={<Banknote className="h-5 w-5" />} tone="success" />
        <StatCard label="Fines Collected" value={formatMoney(finesCollected)} icon={<AlertTriangle className="h-5 w-5" />} tone="warning" />
        <StatCard label="Active Loans" value={formatMoney(activeLoans)} icon={<HandCoins className="h-5 w-5" />} />
        <StatCard label="Loan Repayments" value={formatMoney(repayments)} icon={<TrendingUp className="h-5 w-5" />} tone="success" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Monthly Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="contrib" stackId="a" fill="var(--chart-1)" name="Contributions" />
                  <Bar dataKey="fines" stackId="a" fill="var(--chart-3)" name="Fines" />
                  <Bar dataKey="repaid" stackId="a" fill="var(--chart-2)" name="Repayments" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Monthly Income Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={incomeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="income" stroke="var(--primary)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>Total income (contributions + fines + repayments): <span className="font-semibold">{formatMoney(totalContrib + finesCollected + repayments)}</span></div>
          <div>Loan portfolio outstanding: <span className="font-semibold">{formatMoney(activeLoans - repayments)}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
