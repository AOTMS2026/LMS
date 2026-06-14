/**
 * StudentDirectory — All students with filters: Course, Year, Dept, Batch
 * File: Frontend/src/components/admin/StudentDirectory.tsx
 */
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, Phone, Mail } from "lucide-react";

const DEPARTMENTS = ["CSE", "ECE", "EEE", "DS", "AI/ML", "IT"];

interface EnrolledCourse { _id?: string; id?: string; title?: string; }

interface Student {
  id: string;
  full_name: string;
  email: string;
  roll_number?: string;
  year?: string;
  department?: string;
  mobile_number?: string;
  approval_status?: string;
  enrolled_courses?: EnrolledCourse[];
}

export function StudentDirectory() {
  const { user, userRole } = useAuth();
  const managerDept = userRole === "manager" ? ((user as any)?.department?.toUpperCase() || null) : null;
  const [search, setSearch]       = useState("");
  const [courseFilter, setCourse] = useState("all");
  const [yearFilter, setYear]     = useState("all");
  const [deptFilter, setDept]     = useState(managerDept || "all");
  const [batchFilter, setBatch]   = useState("all");

  const { data: students = [], isLoading } = useQuery<Student[]>({
    queryKey: ["student-directory"],
    queryFn: () => fetchWithAuth("/admin/students"),
  });

  const { data: batches = [] } = useQuery<{id: string; _id?: string; batch_name: string}[]>({
    queryKey: ["all-batches-dir"],
    queryFn: () => fetchWithAuth("/batches"),
  });

  // When a batch is selected, fetch its student IDs
  const [batchStudentIds, setBatchStudentIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (batchFilter === "all") { setBatchStudentIds(new Set()); return; }
    fetchWithAuth(`/admin/batches/${batchFilter}/students`)
      .then((data: any) => {
        const ids = new Set<string>((data || []).map((s: any) => 
          (s.student_id || s.user_id || s.id || s._id)?.toString()
        ).filter(Boolean));
        setBatchStudentIds(ids);
      })
      .catch(() => setBatchStudentIds(new Set()));
  }, [batchFilter]);

  // Build courses list from enrolled_courses across all students
  const allCourses = useMemo(() => {
    const map = new Map<string, string>();
    students.forEach(s => {
      (s.enrolled_courses || []).forEach(c => {
        const cid = c._id || c.id || "";
        if (cid && c.title) map.set(cid, c.title);
      });
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [students]);

  const filteredBatches = useMemo(() =>
    deptFilter === "all" ? batches :
    batches.filter(b => b.batch_name.toLowerCase().startsWith(
      deptFilter.toLowerCase().replace("/","").replace("-","").substring(0,3)
    )),
  [batches, deptFilter]);

  const filtered = useMemo(() => students.filter(s => {
    const q = search.toLowerCase();
    if (q && !s.full_name?.toLowerCase().includes(q) && !s.email?.toLowerCase().includes(q) && !(s.roll_number||"").toLowerCase().includes(q)) return false;
    if (courseFilter !== "all" && !(s.enrolled_courses||[]).some(c => (c._id||c.id) === courseFilter)) return false;
    if (yearFilter !== "all" && String(s.year||"") !== yearFilter) return false;
    if (deptFilter !== "all" && (s.department||"").toUpperCase() !== deptFilter) return false;
    if (batchFilter !== "all") {
      // Use actual batch student membership
      if (batchStudentIds.size > 0 && !batchStudentIds.has(s.id?.toString()) && !batchStudentIds.has((s as any)._id?.toString())) return false;
    }
    return true;
  }), [students, search, courseFilter, yearFilter, deptFilter, batchFilter, batchStudentIds]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" /> Students
          </h2>
          <p className="text-slate-500 text-sm font-medium mt-0.5">All registered students</p>
        </div>
        <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
          {filtered.length} / {students.length}
        </Badge>
      </div>

      {/* Filters — Course first */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search name, email, roll no..." value={search}
            onChange={e => setSearch(e.target.value)} className="pl-9 h-10 rounded-xl border-slate-200" />
        </div>

        {/* Course filter first */}
        <Select value={courseFilter} onValueChange={setCourse}>
          <SelectTrigger className="w-[160px] h-10 rounded-xl border-slate-200 text-xs font-bold">
            <SelectValue placeholder="All Courses" />
          </SelectTrigger>
          <SelectContent className="rounded-xl shadow-xl max-h-60">
            <SelectItem value="all" className="font-bold">All Courses</SelectItem>
            {allCourses.map(c => (
              <SelectItem key={c.id} value={c.id} className="font-bold text-xs">{c.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={yearFilter} onValueChange={setYear}>
          <SelectTrigger className="w-[110px] h-10 rounded-xl border-slate-200 text-xs font-bold">
            <SelectValue placeholder="All Years" />
          </SelectTrigger>
          <SelectContent className="rounded-xl shadow-xl">
            <SelectItem value="all" className="font-bold">All Years</SelectItem>
            {["1","2","3","4"].map(y => (
              <SelectItem key={y} value={y} className="font-bold">Year {y}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={deptFilter} onValueChange={v => { setDept(v); setBatch("all"); }} disabled={!!managerDept}>
          <SelectTrigger className="w-[110px] h-10 rounded-xl border-slate-200 text-xs font-bold">
            <SelectValue placeholder="All Depts" />
          </SelectTrigger>
          <SelectContent className="rounded-xl shadow-xl">
            {!managerDept && <SelectItem value="all" className="font-bold">All Depts</SelectItem>}
            {(managerDept ? [managerDept] : DEPARTMENTS).map(d => (
              <SelectItem key={d} value={d} className="font-bold">{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={batchFilter} onValueChange={setBatch}>
          <SelectTrigger className="w-[130px] h-10 rounded-xl border-slate-200 text-xs font-bold">
            <SelectValue placeholder="All Batches" />
          </SelectTrigger>
          <SelectContent className="rounded-xl shadow-xl">
            <SelectItem value="all" className="font-bold">All Batches</SelectItem>
            {filteredBatches.map(b => (
              <SelectItem key={b.id || b._id} value={b.id || b._id || ""} className="font-bold">
                {b.batch_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Student Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-36 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
          <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-semibold">No students found</p>
          <p className="text-slate-300 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div key={s.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-lg font-black text-primary">
                    {(s.full_name||"?").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-900 truncate">{s.full_name}</p>
                  <p className="text-[11px] text-primary font-bold truncate">{s.roll_number || "—"}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {s.department && (
                      <Badge className="text-[9px] font-black uppercase bg-blue-50 text-blue-700 border-blue-200 h-4 px-1.5 border">
                        {s.department}
                      </Badge>
                    )}
                    {s.year && (
                      <Badge className="text-[9px] font-black uppercase bg-slate-50 text-slate-500 border-slate-200 h-4 px-1.5 border">
                        Y{s.year}
                      </Badge>
                    )}
                    <Badge className={`text-[9px] font-black uppercase h-4 px-1.5 border ${
                      s.approval_status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      s.approval_status === "suspended" ? "bg-rose-50 text-rose-700 border-rose-200" :
                      "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {s.approval_status || "pending"}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="mt-4 space-y-1.5 border-t border-slate-50 pt-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{s.email}</span>
                </div>
                {s.mobile_number && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span>{s.mobile_number}</span>
                  </div>
                )}
                {(s.enrolled_courses||[]).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(s.enrolled_courses||[]).slice(0,2).map((c,i) => (
                      <span key={i} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium truncate max-w-[120px]">
                        {c.title}
                      </span>
                    ))}
                    {(s.enrolled_courses||[]).length > 2 && (
                      <span className="text-[9px] text-slate-400">+{(s.enrolled_courses||[]).length - 2} more</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}