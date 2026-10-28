import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { AppRole } from "@/hooks/use-auth";

export const Route = createFileRoute("/invites")({
  head: () => ({ meta: [{ title: "Accept Invite — SmartChama" }] }),
  component: InvitePage,
});

const passwordSchema = z.string().min(6, "At least 6 characters").max(72);

type InviteStatus = "loading" | "valid" | "invalid" | "used" | "expired" | "done";

function InvitePage() {
  const router = useRouter();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [status, setStatus] = useState<InviteStatus>("loading");
  const [invite, setInvite] = useState<{ email: string; role: string } | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    (async () => {
      const { data, error } = await supabase
        .from("invites")
        .select("email, role, used_at, expires_at")
        .eq("token", token)
        .single();

      if (error || !data) { setStatus("invalid"); return; }
      if (data.used_at) { setStatus("used"); return; }
      if (new Date(data.expires_at) < new Date()) { setStatus("expired"); return; }

      setInvite({ email: data.email, role: data.role });
      setStatus("valid");
    })();
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invite) return;
    setSubmitting(true);
    try {
      if (!fullName.trim()) throw new Error("Full name is required");
      passwordSchema.parse(password);

      // 1. Sign up
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName.trim() },
        },
      });
      if (signUpError) throw signUpError;
      const userId = authData.user?.id;
      if (!userId) throw new Error("Signup failed — no user ID returned");

      // 2. Assign role via service call (uses service_role key on server, or RLS bypass)
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: invite.role as AppRole });
      if (roleError) throw roleError;

      // 3. Mark invite as used
      await supabase
        .from("invites")
        .update({ used_at: new Date().toISOString() })
        .eq("token", token);

      setStatus("done");
      toast.success("Account created! Signing you in…");
      setTimeout(() => router.navigate({ to: "/dashboard" }), 1500);
    } catch (err: unknown) {
      const msg = err instanceof z.ZodError ? err.issues[0].message : (err as Error).message;
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-sidebar lg:flex lg:flex-col lg:justify-between lg:p-12 lg:text-sidebar-foreground">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">SC</div>
          <span className="text-lg font-semibold">SmartChama</span>
        </Link>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">
            "Our contributions, fines and loans finally make sense — in one dashboard."
          </h2>
          <p className="mt-4 text-sidebar-foreground/70">— Member, Tujenge Pamoja Chama</p>
        </div>
        <p className="text-xs text-sidebar-foreground/60">© {new Date().getFullYear()} SmartChama</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          {status === "loading" && (
            <>
              <CardHeader><CardTitle>Checking invite…</CardTitle></CardHeader>
              <CardContent className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </>
          )}

          {status === "invalid" && (
            <>
              <CardHeader>
                <div className="flex items-center gap-2 text-destructive"><XCircle className="h-5 w-5" /><CardTitle>Invalid invite</CardTitle></div>
                <CardDescription>This invite link is invalid or doesn't exist.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild className="w-full"><Link to="/auth">Go to sign in</Link></Button>
              </CardContent>
            </>
          )}

          {status === "used" && (
            <>
              <CardHeader>
                <div className="flex items-center gap-2 text-destructive"><XCircle className="h-5 w-5" /><CardTitle>Invite already used</CardTitle></div>
                <CardDescription>This invite link has already been used. Please sign in instead.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild className="w-full"><Link to="/auth">Go to sign in</Link></Button>
              </CardContent>
            </>
          )}

          {status === "expired" && (
            <>
              <CardHeader>
                <div className="flex items-center gap-2 text-destructive"><XCircle className="h-5 w-5" /><CardTitle>Invite expired</CardTitle></div>
                <CardDescription>This invite link has expired. Ask your administrator for a new one.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" asChild className="w-full"><Link to="/auth">Go to sign in</Link></Button>
              </CardContent>
            </>
          )}

          {status === "done" && (
            <>
              <CardHeader>
                <div className="flex items-center gap-2 text-green-600"><CheckCircle2 className="h-5 w-5" /><CardTitle>Account created!</CardTitle></div>
                <CardDescription>Redirecting you to the dashboard…</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </>
          )}

          {status === "valid" && invite && (
            <>
              <CardHeader>
                <CardTitle>You've been invited!</CardTitle>
                <CardDescription>
                  You're joining as <span className="capitalize font-medium text-foreground">{invite.role}</span>. Complete your account below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={invite.email} disabled className="bg-muted" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full name</Label>
                    <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating account…</> : "Create account"}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}