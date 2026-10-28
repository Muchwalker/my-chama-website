import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Plus, Calendar } from "lucide-react";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/meetings")({
  head: () => ({ meta: [{ title: "Meetings — SmartChama" }] }),
  component: Meetings,
});

function Meetings() {
  const { hasRole, user } = useAuth();
  const canManage = hasRole(["secretary", "administrator", "chairperson"]);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", agenda: "", scheduled_at: "", location: "" });

  const { data: meetings } = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => (await supabase.from("meetings").select("*").order("scheduled_at", { ascending: false })).data ?? [],
  });

  const schedule = async () => {
    if (!form.title || !form.scheduled_at) return toast.error("Title and date required");
    const { error } = await supabase.from("meetings").insert({ ...form, created_by: user?.id });
    if (error) return toast.error(error.message);
    toast.success("Meeting scheduled");
    setOpen(false);
    setForm({ title: "", agenda: "", scheduled_at: "", location: "" });
    qc.invalidateQueries({ queryKey: ["meetings"] });
  };

  return (
    <div>
      <PageHeader title="Meetings" description="Schedule and track chama meetings"
        actions={canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Schedule</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Schedule meeting</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Date & time</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} /></div>
                <div><Label>Location</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
                <div><Label>Agenda</Label><Textarea value={form.agenda} onChange={(e) => setForm({ ...form, agenda: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={schedule}>Schedule</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(meetings ?? []).map((m) => (
          <Card key={m.id} className="transition hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary"><Calendar className="h-5 w-5" /></div>
                <Badge variant="outline" className="capitalize">{m.status}</Badge>
              </div>
              <h3 className="mt-3 font-semibold">{m.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(m.scheduled_at)}</p>
              {m.location && <p className="text-xs text-muted-foreground">📍 {m.location}</p>}
              <Button asChild size="sm" variant="outline" className="mt-4 w-full">
                <Link to="/meetings/$id" params={{ id: m.id }}>View details</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {(meetings ?? []).length === 0 && <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No meetings yet</CardContent></Card>}
      </div>
    </div>
  );
}
