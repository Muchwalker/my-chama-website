import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard, EmptyState } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, Banknote, AlertTriangle, HandCoins, Calendar,
  TrendingUp, CheckCircle2, Clock, FileBarChart, Shield, ScrollText,
} from "lucide-react";
import { formatMoney, formatDate, monthKey } from "@/lib/format";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { computeMemberPercentage } from "@/lib/chama";
import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, Line, LineChart,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — SmartChama" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { roles, user } = useAuth();
  // Priority order so users with multiple roles see the most privileged view
  const priority: AppRole[] = [
    "administrator",
    "chairperson",
    "vice_chairperson",
    "treasurer",
    "financial_analyst",
    "secretary",
    "vice_secretary",
    "member",
    "silent_member",
  ];
  const primary = priority.find((r) => roles.includes(r)) ?? "member";

  const primaryLabel = primary.replace(/_/g, " ");
  const isAdmin = primary === "administrator";
  const isChairView = primary === "chairperson" || primary === "vice_chairperson";
  const isTreasurerView = primary === "treasurer" || primary === "financial_analyst";
  const isSecretaryView = primary === "secretary" || primary === "vice_secretary";
  const isMemberView = primary === "member" || primary === "silent_member";

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.email?.split("@")[0] ?? "there"}`}
        description={`Signed in as ${primaryLabel}`}
      />
      {isAdmin && <AdminDashboard />}
      {isChairView && <ChairpersonDashboard />}
      {isTreasurerView && <TreasurerDashboard />}
      {isSecretaryView && <SecretaryDashboard />}
      {isMemberView && <MemberDashboard userId={user?.id ?? ""} />}
    </div>
  );
}

/* ------------------------------ ADMIN ------------------------------ */
function AdminDashboard() {
  const { data } = useQuery({
    queryKey: ["dash-admin"],
    queryFn: async () => {
      const [mem, contr, fines, loans, meetings, users, audit] = await Promise.all([
        supabase.from("profiles").select("id,status"),
        supabase.from("contributions").select("amount,period_month"),
        supabase.from("fines").select("amount,status"),
        supabase.from("loans").select("amount,status"),
        supabase.from("meetings").select("id,title,scheduled_at,status").order("scheduled_at", { ascending: false }).limit(5),
        supabase.from("user_roles").select("user_id,role"),
        supabase.from("audit_logs").select("action,entity,created_at").order("created_at", { ascending: false }).limit(6),
      ]);
      return {
        mem: mem.data ?? [], contr: contr.data ?? [], fines: fines.data ?? [],
        loans: loans.data ?? [], meetings: meetings.data ?? [], users: users.data ?? [],
        audit: audit.data ?? [],
      };
    },
  });

  const totalContrib = (data?.contr ?? []).reduce((s, c) => s + Number(c.amount), 0);
  const outstandingFines = (data?.fines ?? []).filter((f) => f.status === "outstanding").reduce((s, f) => s + Number(f.amount), 0);
  const activeLoans = (data?.loans ?? []).filter((l) => l.status === "active").reduce((s, l) => s + Number(l.amount), 0);
  const activeMembers = (data?.mem ?? []).filter((m) => m.status === "active").length;

  const byMonth = new Map<string, number>();
  (data?.contr ?? []).forEach((c) => {
    const k = monthKey(c.period_month);
    byMonth.set(k, (byMonth.get(k) ?? 0) + Number(c.amount));
  });
  const chart = Array.from(byMonth.entries()).map(([month, total]) => ({ month, total })).slice(-6);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Members" value={activeMembers} icon={<Users className="h-5 w-5" />} hint={`${data?.mem.length ?? 0} total`} />
        <StatCard label="Total Contributions" value={formatMoney(totalContrib)} icon={<Banknote className="h-5 w-5" />} tone="success" />
        <StatCard label="Outstanding Fines" value={formatMoney(outstandingFines)} icon={<AlertTriangle className="h-5 w-5" />} tone="warning" />
        <StatCard label="Active Loans" value={formatMoney(activeLoans)} icon={<HandCoins className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Monthly Contributions</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Quick Admin Actions</CardTitle></CardHeader>
          <CardContent className="grid gap-2">
            <Button asChild variant="outline" className="justify-start"><Link to="/users"><Shield className="mr-2 h-4 w-4" />Manage Users & Roles</Link></Button>
            <Button asChild variant="outline" className="justify-start"><Link to="/settings"><FileBarChart className="mr-2 h-4 w-4" />Chama Settings</Link></Button>
            <Button asChild variant="outline" className="justify-start"><Link to="/audit"><ScrollText className="mr-2 h-4 w-4" />View Audit Log</Link></Button>
            <Button asChild variant="outline" className="justify-start"><Link to="/reports"><FileBarChart className="mr-2 h-4 w-4" />Generate Reports</Link></Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
        <CardContent>
          <ul className="divide-y">
            {(data?.audit ?? []).map((a, i) => (
              <li key={i} className="flex items-center justify-between py-3 text-sm">
                <div><span className="font-medium capitalize">{a.action}</span> {a.entity && <span className="text-muted-foreground">on {a.entity}</span>}</div>
                <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
              </li>
            ))}
            {(data?.audit ?? []).length === 0 && <EmptyState title="No activity yet" />}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

/* ----------------------------- CHAIRPERSON ----------------------------- */
function ChairpersonDashboard() {
  const { data } = useQuery({
    queryKey: ["dash-chair"],
    queryFn: async () => {
      const [mem, meetings, loans, contr] = await Promise.all([
        supabase.from("profiles").select("id,status"),
        supabase.from("meetings").select("id,title,scheduled_at,status").order("scheduled_at", { ascending: false }).limit(8),
        supabase.from("loans").select("id,amount,status,member_id").eq("status", "pending"),
        supabase.from("contributions").select("amount,period_month"),
      ]);
      return { mem: mem.data ?? [], meetings: meetings.data ?? [], loans: loans.data ?? [], contr: contr.data ?? [] };
    },
  });

  const total = (data?.contr ?? []).reduce((s, c) => s + Number(c.amount), 0);
  const upcoming = (data?.meetings ?? []).filter((m) => m.status === "scheduled").length;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active Members" value={(data?.mem ?? []).filter((m) => m.status === "active").length} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Upcoming Meetings" value={upcoming} icon={<Calendar className="h-5 w-5" />} tone="default" />
        <StatCard label="Loans Pending Approval" value={(data?.loans ?? []).length} icon={<HandCoins className="h-5 w-5" />} tone="warning" />
        <StatCard label="Total Contributions" value={formatMoney(total)} icon={<Banknote className="h-5 w-5" />} tone="success" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Loans Awaiting Approval</CardTitle>
            <Button asChild size="sm" variant="outline"><Link to="/loans">Review</Link></Button>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {(data?.loans ?? []).map((l) => (
                <li key={l.id} className="flex items-center justify-between py-3">
                  <span className="text-sm">Loan request</span>
                  <span className="font-semibold">{formatMoney(Number(l.amount))}</span>
                </li>
              ))}
              {(data?.loans ?? []).length === 0 && <EmptyState title="No pending approvals" />}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Meetings</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {(data?.meetings ?? []).map((m) => (
                <li key={m.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{m.title}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(m.scheduled_at)}</div>
                  </div>
                  <Badge variant="secondary" className="capitalize">{m.status}</Badge>
                </li>
              ))}
              {(data?.meetings ?? []).length === 0 && <EmptyState title="No meetings yet" />}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

/* ----------------------------- TREASURER ----------------------------- */
function TreasurerDashboard() {
  const { data } = useQuery({
    queryKey: ["dash-treasurer"],
    queryFn: async () => {
      const [contr, fines, loans, repay] = await Promise.all([
        supabase.from("contributions").select("amount,period_month,paid_on").order("paid_on", { ascending: false }),
        supabase.from("fines").select("amount,status"),
        supabase.from("loans").select("id,amount,status,due_date"),
        supabase.from("loan_repayments").select("amount,paid_on").order("paid_on", { ascending: false }).limit(10),
      ]);
      return { contr: contr.data ?? [], fines: fines.data ?? [], loans: loans.data ?? [], repay: repay.data ?? [] };
    },
  });

  const total = (data?.contr ?? []).reduce((s, c) => s + Number(c.amount), 0);
  const totalRepay = (data?.repay ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const outstanding = (data?.fines ?? []).filter((f) => f.status === "outstanding").reduce((s, f) => s + Number(f.amount), 0);
  const activeLoans = (data?.loans ?? []).filter((l) => l.status === "active").reduce((s, l) => s + Number(l.amount), 0);

  const byMonth = new Map<string, number>();
  (data?.contr ?? []).forEach((c) => {
    const k = monthKey(c.period_month);
    byMonth.set(k, (byMonth.get(k) ?? 0) + Number(c.amount));
  });
  const chart = Array.from(byMonth.entries()).map(([month, total]) => ({ month, total })).slice(-6);

  const pie = [
    { name: "Contributions", value: total, color: "var(--chart-1)" },
    { name: "Loan Repayments", value: totalRepay, color: "var(--chart-2)" },
    { name: "Outstanding Fines", value: outstanding, color: "var(--chart-3)" },
  ];

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Contributions Collected" value={formatMoney(total)} icon={<Banknote className="h-5 w-5" />} tone="success" />
        <StatCard label="Loan Repayments" value={formatMoney(totalRepay)} icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Active Loans" value={formatMoney(activeLoans)} icon={<HandCoins className="h-5 w-5" />} />
        <StatCard label="Outstanding Fines" value={formatMoney(outstanding)} icon={<AlertTriangle className="h-5 w-5" />} tone="warning" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Contributions Trend</CardTitle>
            <Button asChild size="sm"><Link to="/contributions">Record</Link></Button>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Cash Flow Mix</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                    {pie.map((p, i) => <Cell key={i} fill={p.color} />)}
                  </Pie>
                  <Tooltip /><Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Quick Treasurer Actions</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild><Link to="/contributions">Record Contribution</Link></Button>
          <Button asChild variant="outline"><Link to="/fines">Issue Fine</Link></Button>
          <Button asChild variant="outline"><Link to="/loans">Manage Loans</Link></Button>
          <Button asChild variant="outline"><Link to="/reports">Financial Reports</Link></Button>
        </CardContent>
      </Card>
    </>
  );
}

/* ----------------------------- SECRETARY ----------------------------- */
function SecretaryDashboard() {
  const { data } = useQuery({
    queryKey: ["dash-secretary"],
    queryFn: async () => {
      const [meetings, attendance, mem] = await Promise.all([
        supabase.from("meetings").select("id,title,scheduled_at,status,location").order("scheduled_at", { ascending: false }).limit(10),
        supabase.from("meeting_attendance").select("status"),
        supabase.from("profiles").select("id,status"),
      ]);
      return { meetings: meetings.data ?? [], attendance: attendance.data ?? [], mem: mem.data ?? [] };
    },
  });

  const present = (data?.attendance ?? []).filter((a) => a.status === "present").length;
  const absent = (data?.attendance ?? []).filter((a) => a.status === "absent").length;
  const upcoming = (data?.meetings ?? []).filter((m) => m.status === "scheduled");
  const past = (data?.meetings ?? []).filter((m) => m.status !== "scheduled");

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Meetings" value={(data?.meetings ?? []).length} icon={<Calendar className="h-5 w-5" />} />
        <StatCard label="Upcoming" value={upcoming.length} icon={<Clock className="h-5 w-5" />} tone="default" />
        <StatCard label="Attendance (Present)" value={present} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
        <StatCard label="Absences Recorded" value={absent} icon={<AlertTriangle className="h-5 w-5" />} tone="warning" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upcoming Meetings</CardTitle>
            <Button asChild size="sm"><Link to="/meetings">Schedule</Link></Button>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {upcoming.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link to="/meetings/$id" params={{ id: m.id }} className="font-medium hover:underline">{m.title}</Link>
                    <div className="text-xs text-muted-foreground">{formatDate(m.scheduled_at)} {m.location && `• ${m.location}`}</div>
                  </div>
                  <Badge variant="secondary" className="capitalize">{m.status}</Badge>
                </li>
              ))}
              {upcoming.length === 0 && <EmptyState title="Nothing scheduled" />}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Past Meetings</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {past.slice(0, 6).map((m) => (
                <li key={m.id} className="flex items-center justify-between py-3">
                  <div>
                    <Link to="/meetings/$id" params={{ id: m.id }} className="font-medium hover:underline">{m.title}</Link>
                    <div className="text-xs text-muted-foreground">{formatDate(m.scheduled_at)}</div>
                  </div>
                  <Badge variant="outline" className="capitalize">{m.status}</Badge>
                </li>
              ))}
              {past.length === 0 && <EmptyState title="No past meetings" />}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

/* ------------------------------- MEMBER ------------------------------- */
function MemberDashboard({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["dash-member", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
      if (!profile) return { profile: null, contr: [], fines: [], loans: [], meetings: [], notifs: [], groupContr: [], groupFines: [] };
      const [contr, fines, loans, meetings, notifs, groupContr, groupFines] = await Promise.all([
        supabase.from("contributions").select("amount,period_month,paid_on,category").eq("member_id", profile.id).order("paid_on", { ascending: false }),
        supabase.from("fines").select("amount,status,reason,issued_on").eq("member_id", profile.id),
        supabase.from("loans").select("id,amount,status,due_date,purpose,applied_on").eq("member_id", profile.id).order("applied_on", { ascending: false }),
        supabase.from("meetings").select("id,title,scheduled_at,status,location").eq("status", "scheduled").order("scheduled_at", { ascending: true }).limit(5),
        supabase.from("notifications").select("id,title,message,created_at,read").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
        supabase.from("contributions").select("amount,category"),
        supabase.from("fines").select("amount"),
      ]);
      return {
        profile,
        contr: contr.data ?? [],
        fines: fines.data ?? [],
        loans: loans.data ?? [],
        meetings: meetings.data ?? [],
        notifs: notifs.data ?? [],
        groupContr: groupContr.data ?? [],
        groupFines: groupFines.data ?? [],
      };
    },
  });

  if (!data?.profile) {
    return <EmptyState title="No member profile linked" description="Ask an administrator to link your account to a member profile." />;
  }

  const myContrib = (data.contr ?? []).reduce((s, c) => s + Number(c.amount), 0);
  const myOutstandingFines = (data.fines ?? []).filter((f) => f.status === "outstanding").reduce((s, f) => s + Number(f.amount), 0);
  const myActiveLoans = (data.loans ?? []).filter((l) => l.status === "active");
  const myLoanBalance = myActiveLoans.reduce((s, l) => s + Number(l.amount), 0);

  const share = computeMemberPercentage({
    memberContributions: (data.contr ?? []).map((c: any) => ({ amount: c.amount, category: (c.category ?? "monthly") })),
    memberFines: data.fines ?? [],
    groupContributions: data.groupContr ?? [],
    groupFines: data.groupFines ?? [],
  });

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="My Contributions" value={formatMoney(myContrib)} icon={<Banknote className="h-5 w-5" />} tone="success" hint={`${data.contr.length} payments`} />
        <StatCard label="Outstanding Fines" value={formatMoney(myOutstandingFines)} icon={<AlertTriangle className="h-5 w-5" />} tone={myOutstandingFines > 0 ? "warning" : "default"} />
        <StatCard label="Active Loans" value={formatMoney(myLoanBalance)} icon={<HandCoins className="h-5 w-5" />} hint={`${myActiveLoans.length} loan(s)`} />
        <StatCard label="My Share of Group" value={`${share.pct.toFixed(2)}%`} icon={<TrendingUp className="h-5 w-5" />} hint={`Net ${formatMoney(share.net)}`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent Contributions</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {data.contr.slice(0, 6).map((c, i) => (
                <li key={i} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <div className="font-medium">{formatMoney(Number(c.amount))}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(c.paid_on)}</div>
                  </div>
                  <Badge variant="secondary">{monthKey(c.period_month)}</Badge>
                </li>
              ))}
              {data.contr.length === 0 && <EmptyState title="No contributions yet" />}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Upcoming Meetings</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {data.meetings.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{m.title}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(m.scheduled_at)} {m.location && `• ${m.location}`}</div>
                  </div>
                  <Badge variant="secondary" className="capitalize">{m.status}</Badge>
                </li>
              ))}
              {data.meetings.length === 0 && <EmptyState title="No upcoming meetings" />}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Loans</CardTitle>
            <Button asChild size="sm" variant="outline"><Link to="/loans">Apply</Link></Button>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {data.loans.slice(0, 5).map((l) => (
                <li key={l.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{formatMoney(Number(l.amount))}</div>
                    <div className="text-xs text-muted-foreground">{l.purpose ?? "—"}</div>
                  </div>
                  <Badge variant="outline" className="capitalize">{l.status}</Badge>
                </li>
              ))}
              {data.loans.length === 0 && <EmptyState title="No loans" />}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Notifications</CardTitle>
            <Button asChild size="sm" variant="ghost"><Link to="/notifications">View all</Link></Button>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {data.notifs.map((n) => (
                <li key={n.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-sm">{n.title}</div>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                  </div>
                  {n.message && <div className="mt-0.5 text-xs text-muted-foreground">{n.message}</div>}
                  <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{formatDate(n.created_at)}</div>
                </li>
              ))}
              {data.notifs.length === 0 && <EmptyState title="No notifications" />}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
