import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/meetings/$id")({
  head: () => ({ meta: [{ title: "Meeting — SmartChama" }] }),
  component: MeetingDetail,
});

function MeetingDetail() {
  const { id } = Route.useParams();
  const { hasRole, isStaff } = useAuth();
  const canManage = hasRole(["secretary", "administrator", "chairperson"]);
  const qc = useQueryClient();
  const [minutes, setMinutes] = useState("");
  const [attendance, setAttendance] = useState<Record<string, "present" | "absent" | "excused">>({});

  const { data } = useQuery({
    queryKey: ["meeting", id],
    queryFn: async () => {
      const [m, members, att, settings] = await Promise.all([
        supabase.from("meetings").select("*").eq("id", id).single(),
        supabase.from("profiles").select("id,full_name,member_no,status").eq("status", "active").order("full_name"),
        supabase.from("meeting_attendance").select("*").eq("meeting_id", id),
        supabase.from("settings").select("*").single(),
      ]);
      return { meeting: m.data, members: members.data ?? [], attendance: att.data ?? [], settings: settings.data };
    },
  });

  useEffect(() => {
    if (data) {
      setMinutes(data.meeting?.minutes ?? "");
      const map: Record<string, any> = {};
      data.attendance.forEach((a) => { map[a.member_id] = a.status; });
      setAttendance(map);
    }
  }, [data]);

  if (!data?.meeting) return <div>Loading…</div>;
  const m = data.meeting;

  const saveAttendance = async () => {
    const rows = (data.members ?? []).map((mem) => ({
      meeting_id: id,
      member_id: mem.id,
      status: attendance[mem.id] ?? "absent",
    }));
    const { error } = await supabase.from("meeting_attendance").upsert(rows, { onConflict: "meeting_id,member_id" });
    if (error) return toast.error(error.message);

    // Auto-fine absentees
    if (data.settings?.auto_fine_missed_meeting) {
      const cat = await supabase.from("fine_categories").select("id").eq("name", "Missed meeting").single();
      const absent = rows.filter((r) => r.status === "absent");
      if (cat.data && absent.length) {
        await supabase.from("fines").insert(absent.map((r) => ({
          member_id: r.member_id, category_id: cat.data!.id,
          amount: Number(data.settings!.missed_meeting_fine), reason: `Missed: ${m.title}`,
        })));
      }
    }
    toast.success("Attendance saved");
    qc.invalidateQueries({ queryKey: ["meeting", id] });
  };

  const saveMinutes = async () => {
    const { error } = await supabase.from("meetings").update({ minutes, status: "completed" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Minutes saved");
    qc.invalidateQueries({ queryKey: ["meeting", id] });
  };

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-4"><Link to="/meetings"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
      <PageHeader title={m.title} description={formatDateTime(m.scheduled_at)} actions={<Badge variant="outline" className="capitalize">{m.status}</Badge>} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Agenda</CardTitle></CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{m.agenda || <span className="text-muted-foreground">No agenda</span>}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Minutes</CardTitle></CardHeader>
          <CardContent>
            {canManage ? (
              <>
                <Textarea rows={6} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Meeting minutes…" />
                <Button onClick={saveMinutes} className="mt-3" size="sm"><Save className="mr-2 h-4 w-4" />Save minutes</Button>
              </>
            ) : <div className="whitespace-pre-wrap text-sm">{m.minutes || <span className="text-muted-foreground">No minutes yet</span>}</div>}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle>Attendance ({data.members.length} members)</CardTitle></CardHeader>
        <CardContent className="p-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.members.map((mem) => (
                  <TableRow key={mem.id}>
                    <TableCell className="font-medium">{mem.full_name} <span className="text-xs text-muted-foreground">({mem.member_no})</span></TableCell>
                    <TableCell>
                      {isStaff ? (
                        <Select value={attendance[mem.id] ?? "absent"} onValueChange={(v) => setAttendance({ ...attendance, [mem.id]: v as any })}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="present">Present</SelectItem>
                            <SelectItem value="absent">Absent</SelectItem>
                            <SelectItem value="excused">Excused</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : <Badge variant="outline" className="capitalize">{attendance[mem.id] ?? "absent"}</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {isStaff && <Button onClick={saveAttendance} className="mt-4"><Save className="mr-2 h-4 w-4" />Save attendance</Button>}
        </CardContent>
      </Card>
    </div>
  );
}
