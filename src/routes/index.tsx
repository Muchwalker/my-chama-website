import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Banknote, Users, Calendar, TrendingUp, Shield, Bell } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SmartChama — Modern Chama Management System" },
      { name: "description", content: "Track contributions, fines, loans, meetings and members. Built for Kenyan chamas." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.navigate({ to: "/dashboard" });
  }, [loading, user, router]);

  const features = [
    { icon: Users, title: "Member Management", desc: "Directory, profiles, status, contribution history." },
    { icon: Banknote, title: "Contributions & Fines", desc: "Record payments, track overdue, manage penalties." },
    { icon: TrendingUp, title: "Loans", desc: "Applications, approvals, repayments and balances." },
    { icon: Calendar, title: "Meetings", desc: "Schedule, attendance, minutes — auto-fine absentees." },
    { icon: Shield, title: "Role-Based Access", desc: "Admin, Chair, Treasurer, Secretary and Member roles." },
    { icon: Bell, title: "Smart Reminders", desc: "Dues, fines, repayments and meeting reminders." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">SC</div>
            <span className="text-lg font-semibold">SmartChama</span>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
            <Button asChild><Link to="/auth">Get started</Link></Button>
          </div>
        </div>
      </header>

      <main>
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="mx-auto max-w-3xl">
            <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
              Built for Chamas, Saccos & Investment Groups
            </span>
            <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl">
              Run your chama like a <span className="text-primary">professional fund</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              SmartChama gives your group a modern dashboard for contributions, fines, loans and meetings — with role-based control and clear financial reports.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg"><Link to="/auth">Start free</Link></Button>
              <Button asChild size="lg" variant="outline"><Link to="/auth">Sign in</Link></Button>
            </div>
          </div>
        </section>

        <section className="bg-secondary/40 py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-3xl font-bold">Everything your chama needs</h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div key={f.title} className="rounded-xl border bg-card p-6 shadow-sm">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} SmartChama
      </footer>
    </div>
  );
}
