import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useState } from "react";
import { Plus, Copy, Mail, Clock, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/format";

const ROLES: AppRole[] = ["administrator", "chairperson", "treasurer", "secretary", "member"];

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Users & Roles — SmartChama" }] }),
  component: UsersPage,
});

function UsersPage() {
  const { hasRole } = useAuth();
  const qc = useQueryClient();
  const [adding, setAdding] = useState<Record<string, AppRole>>({});
  const canInvite = hasRole(["administrator", "chairperson"]);

  const { data } = useQuery({
    queryKey: ["users-roles"],
    queryFn: async () => {
      const [p, r, inv] = await Promise.all([
        supabase.from("profiles").select("*").not("user_id", "is", null).order("full_name"),
        supabase.from("user_roles").select("*"),
        canInvite
          ? supabase.from("invites").select("*").order("created_at", { ascending: false })
          : Promise.resolve({ data: [] }),
      ]);
      return { profiles: p.data ?? [], roles: r.data ?? [], invites: inv.data ?? [] };
    },
  });

  if (!hasRole("administrator")) return <div className="text-sm text-muted-foreground">Administrator access only.</div>;

  const rolesByUser = new Map<string, string[]>();
  (data?.roles ?? []).forEach((r) => {
    const arr = rolesByUser.get(r.user_id) ?? [];
    arr.push(r.role); rolesByUser.set(r.user_id, arr);
  });

  const addRole = async (userId: string) => {
    const role = adding[userId];
    if (!role) return;
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (error) return toast.error(error.message);
    toast.success("Role added");
    qc.invalidateQueries({ queryKey: ["users-roles"] });
  };

  const removeRole = async (userId: string, role: string) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role as AppRole);
    if (error) return toast.error(error.message);
    toast.success("Role removed");
    qc.invalidateQueries({ queryKey: ["users-roles"] });
  };

  return (
    <div>
      <PageHeader title="Users & Roles" description="Assign roles to registered users" />

      <Tabs defaultValue="users" className="mt-2">
        <TabsList>
          <TabsTrigger value="users">Users ({data?.profiles.length ?? 0})</TabsTrigger>
          {canInvite && <TabsTrigger value="invites">Invites ({data?.invites.length ?? 0})</TabsTrigger>}
        </TabsList>

        {/* ── USERS ── */}
        <TabsContent value="users">
          <Card><CardContent className="p-4">
            <Table>
              <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Email</TableHead><TableHead>Roles</TableHead><TableHead>Add role</TableHead></TableRow></TableHeader>
              <TableBody>
                {(data?.profiles ?? []).map((p) => {
                  const userRoles = rolesByUser.get(p.user_id!) ?? [];
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.full_name}</TableCell>
                      <TableCell>{p.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {userRoles.map((r) => (
                            <Badge key={r} variant="secondary" className="capitalize">
                              {r}
                              <button onClick={() => removeRole(p.user_id!, r)} className="ml-1 text-muted-foreground hover:text-destructive">×</button>
                            </Badge>
                          ))}
                          {userRoles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Select value={adding[p.user_id!] ?? ""} onValueChange={(v) => setAdding({ ...adding, [p.user_id!]: v as AppRole })}>
                            <SelectTrigger className="w-36"><SelectValue placeholder="Choose…" /></SelectTrigger>
                            <SelectContent>{ROLES.filter((r) => !userRoles.includes(r)).map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
                          </Select>
                          <Button size="sm" onClick={() => addRole(p.user_id!)}>Add</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(data?.profiles ?? []).length === 0 && <TableRow><TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">No registered users yet</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ── INVITES ── */}
        {canInvite && (
          <TabsContent value="invites">
            <div className="mb-4 flex justify-end">
              <SendInviteDialog qc={qc} />
            </div>
            <Card><CardContent className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.invites ?? []).map((inv: any) => {
                    const expired = new Date(inv.expires_at) < new Date();
                    const used = !!inv.used_at;
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.email}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{inv.role}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(inv.expires_at)}</TableCell>
                        <TableCell>
                          {used ? (
                            <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="h-3 w-3" />Used</span>
                          ) : expired ? (
                            <span className="flex items-center gap-1 text-xs text-destructive"><Clock className="h-3 w-3" />Expired</span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />Pending</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {!used && !expired && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const link = `${window.location.origin}/invite?token=${inv.token}`;
                                navigator.clipboard.writeText(link);
                                toast.success("Invite link copied!");
                              }}
                            >
                              <Copy className="h-3 w-3 mr-1" />Copy
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(data?.invites ?? []).length === 0 && (
                    <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No invites sent yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ── SEND INVITE DIALOG ─────────────────────────────────────────────────────
function SendInviteDialog({ qc }: { qc: any }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", role: "member" as AppRole });
  const [saving, setSaving] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const send = async () => {
    if (!form.email) return toast.error("Email is required");
    setSaving(true);
    try {
      const { data: inv, error } = await supabase
        .from("invites")
        .insert({ email: form.email.trim().toLowerCase(), role: form.role, created_by: user?.id })
        .select("token")
        .single();
      if (error) throw error;

      const link = `${window.location.origin}/invite?token=${inv.token}`;
      setGeneratedLink(link);

      await supabase.auth.resetPasswordForEmail(form.email, { redirectTo: link });

      toast.success("Invite created and email sent!");
      qc.invalidateQueries({ queryKey: ["users-roles"] });
    } catch (err: unknown) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setForm({ email: "", role: "member" });
    setGeneratedLink(null);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); setOpen(o); }}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" />Invite Member</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Invite a Member</DialogTitle></DialogHeader>
        {!generatedLink ? (
          <>
            <div className="space-y-3">
              <div>
                <Label>Email address *</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="member@example.com" />
              </div>
              <div>
                <Label>Role *</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={send} disabled={saving}>
                {saving ? "Sending…" : <><Mail className="mr-2 h-4 w-4" />Send Invite</>}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Invite created! An email has been sent to <strong>{form.email}</strong>. You can also copy and share the link manually:
            </p>
            <div className="flex items-center gap-2 rounded-lg border bg-muted p-3">
              <code className="flex-1 truncate text-xs">{generatedLink}</code>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(generatedLink!); toast.success("Copied!"); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">This invite expires in 7 days.</p>
            <Button className="w-full" onClick={reset}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}