import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney } from "@/lib/format";
import { ArrowLeft, Banknote, AlertTriangle, HandCoins, Percent } from "lucide-react";
import { computeMemberPercentage, CATEGORY_LABEL, type ContributionCategory } from "@/lib/chama";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/members")({
  head: () => ({ meta: [{ title: "Member profile — SmartChama" }] }),
  component: MemberDetail,
});

function MemberDetail() {
  const {user} = useAuth();
  const id =user?.id;
  const { data, isLoading } = useQuery({
  queryKey: ["member", id],
  enabled: !!id,
  queryFn: async () => {
    const [p, c, f, l, gc, gf] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("id", id!)
        .single(),

      supabase
        .from("contributions")
        .select("*")
        .eq("member_id", id!)
        .order("period_month", { ascending: false }),

      supabase
        .from("fines")
        .select("*, fine_categories(name)")
        .eq("member_id", id!)
        .order("issued_on", { ascending: false }),

      supabase
        .from("loans")
        .select("*")
        .eq("member_id", id!)
        .order("applied_on", { ascending: false }),

      supabase
        .from("contributions")
        .select("amount,"),

      supabase
        .from("fines")
        .select("amount"),
    ]);

    return {
      profile: p.data,
      contributions: c.data ?? [],
      fines: f.data ?? [],
      loans: l.data ?? [],
      groupContributions: gc.data ?? [],
      groupFines: gf.data ?? [],
    };
  },
});

  if (isLoading) {
  return <div>Loading...</div>;
}

if (!user) {
  return <div>Please sign in.</div>;
}

if (!data?.profile) {
  return <div>Your member profile was not found.</div>;
}
  const p = data.profile;
  const totalContrib = data.contributions.reduce((s, r) => s + Number(r.amount), 0);
  const outstandingFines = data.fines.filter((f) => f.status === "outstanding").reduce((s, r) => s + Number(r.amount), 0);
  const activeLoans = data.loans.filter((l) => l.status === "active").reduce((s, r) => s + Number(r.amount), 0);

  const stats = computeMemberPercentage({
    memberContributions: data.contributions.map((c: any) => ({
  amount: c.amount,
  category: "monthly" as ContributionCategory,
})),
    memberFines: data.fines,
    groupContributions: data.groupContributions,
    groupFines: data.groupFines,
  });

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-4"><Link to="/members"><ArrowLeft className="mr-2 h-4 w-4" />Back to members</Link></Button>
      <PageHeader title={p.full_name} description={`${p.member_no} • Joined ${formatDate(p.joined_at)}`} actions={<Badge className="capitalize">{p.status}</Badge>} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Deposits" value={formatMoney(totalContrib)} icon={<Banknote className="h-5 w-5" />} tone="success" />
        <StatCard label="Outstanding Fines" value={formatMoney(outstandingFines)} icon={<AlertTriangle className="h-5 w-5" />} tone="warning" />
        <StatCard label="Active Loans" value={formatMoney(activeLoans)} icon={<HandCoins className="h-5 w-5" />} />
        <StatCard label="Net Contribution %" value={`${stats.pct.toFixed(2)}%`} icon={<Percent className="h-5 w-5" />} hint={`Net ${formatMoney(stats.net)} of ${formatMoney(stats.groupTotal)}`} />
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Contribution breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <Row label="Deposits (all categories)" value={formatMoney(stats.memberDeposits)} />
            <Row label="Minus fines" value={`- ${formatMoney(stats.memberFineTotal)}`} />
            <Row label="Minus annual subscription" value={`- ${formatMoney(stats.memberAnnual)}`} />
            <Row label="Minus registration fee" value={`- ${formatMoney(stats.memberReg)}`} />
          </div>
          <div className="mt-4 rounded-xl bg-muted/50 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Net contribution</span>
              <span className="font-semibold">{formatMoney(stats.net)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Group total received</span>
              <span className="font-semibold">{formatMoney(stats.groupTotal)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Share of group</span>
              <span className="text-2xl font-bold text-primary">{stats.pct.toFixed(2)}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Contributions</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {data.contributions.slice(0, 10).map((c: any) => (
                <li key={c.id} className="flex justify-between py-2">
                  <span>
                    <span className="font-medium">{formatDate(c.period_month)}</span>
                    <Badge variant="secondary" className="ml-2 text-[10px]">{CATEGORY_LABEL[(c.category ?? "monthly") as ContributionCategory]}</Badge>
                  </span>
                  <span className="font-medium">{formatMoney(c.amount)}</span>
                </li>
              ))}
              {data.contributions.length === 0 && <li className="py-4 text-muted-foreground">No contributions</li>}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Fines</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {data.fines.slice(0, 10).map((f: any) => (
                <li key={f.id} className="flex justify-between py-2">
                  <span>{f.fine_categories?.name ?? "Fine"}</span>
                  <span className="font-medium">{formatMoney(f.amount)} <Badge variant={f.status === "outstanding" ? "destructive" : "secondary"} className="ml-1 capitalize">{f.status}</Badge></span>
                </li>
              ))}
              {data.fines.length === 0 && <li className="py-4 text-muted-foreground">No fines</li>}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Loans</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {data.loans.map((l) => (
                <li key={l.id} className="flex justify-between py-2">
                  <span>{l.purpose ?? "Loan"}</span>
                  <span className="font-medium">{formatMoney(l.amount)} <Badge variant="outline" className="ml-1 capitalize">{l.status}</Badge></span>
                </li>
              ))}
              {data.loans.length === 0 && <li className="py-4 text-muted-foreground">No loans</li>}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  );
}
