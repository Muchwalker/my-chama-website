import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatMoney } from "@/lib/format";
import { ArrowLeft, Banknote, AlertTriangle, HandCoins } from "lucide-react";

export const Route = createFileRoute("/_authenticated/members/$id")({
  head: () => ({ meta: [{ title: "Member profile — SmartChama" }] }),
  component: MemberDetail,
});

function MemberDetail() {
  const { id } = Route.useParams();
  const { data } = useQuery({
    queryKey: ["member", id],
    queryFn: async () => {
      const [p, c, f, l] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        supabase.from("contributions").select("*").eq("member_id", id).order("period_month", { ascending: false }),
        supabase.from("fines").select("*, fine_categories(name)").eq("member_id", id).order("issued_on", { ascending: false }),
        supabase.from("loans").select("*").eq("member_id", id).order("applied_on", { ascending: false }),
      ]);
      return { profile: p.data, contributions: c.data ?? [], fines: f.data ?? [], loans: l.data ?? [] };
    },
  });

  if (!data?.profile) return <div>Loading…</div>;
  const p = data.profile;
  const totalContrib = data.contributions.reduce((s, r) => s + Number(r.amount), 0);
  const outstandingFines = data.fines.filter((f) => f.status === "outstanding").reduce((s, r) => s + Number(r.amount), 0);
  const activeLoans = data.loans.filter((l) => l.status === "active").reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-4"><Link to="/members"><ArrowLeft className="mr-2 h-4 w-4" />Back to members</Link></Button>
      <PageHeader title={p.full_name} description={`${p.member_no} • Joined ${formatDate(p.joined_at)}`} actions={<Badge className="capitalize">{p.status}</Badge>} />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Contributions" value={formatMoney(totalContrib)} icon={<Banknote className="h-5 w-5" />} tone="success" />
        <StatCard label="Outstanding Fines" value={formatMoney(outstandingFines)} icon={<AlertTriangle className="h-5 w-5" />} tone="warning" />
        <StatCard label="Active Loans" value={formatMoney(activeLoans)} icon={<HandCoins className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Contributions</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {data.contributions.slice(0, 8).map((c) => (
                <li key={c.id} className="flex justify-between py-2">
                  <span>{formatDate(c.period_month)}</span><span className="font-medium">{formatMoney(c.amount)}</span>
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
              {data.fines.slice(0, 8).map((f: any) => (
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
