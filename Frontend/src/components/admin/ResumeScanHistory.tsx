import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/api";
import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SyncDataButton } from "./data/SyncDataButton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  History, FileSearch, Calendar, CheckCircle, AlertCircle,
  TrendingUp, BrainCircuit, Layout, Mail
} from "lucide-react";
import { format } from "date-fns";

interface ScanResult {
  id: string;
  user_id: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string;
  };
  score: number;
  year?: string;
  department?: string;
  analysis: {
    missing_keywords: string[];
    formatting_issues: string[];
    suggestions: string[];
  };
  file_name: string;
  created_at: string;
}

const DEPARTMENTS = ["CSE", "ECE", "EEE", "DS", "AI/ML", "IT"];

export function ResumeScanHistory() {
  const { user, userRole } = useAuth();
  const managerDept = userRole === "manager" ? ((user as any)?.department?.toUpperCase() || null) : null;
  const [yearFilter, setYearFilter]   = useState("all");
  const [deptFilter, setDeptFilter]   = useState(managerDept || "all");

  const { data: scans = [], isLoading, refetch } = useQuery<ScanResult[]>({
    queryKey: ['admin-resume-scans'],
    queryFn: async () => fetchWithAuth('/admin/resume-scans')
  });

  const filtered = useMemo(() => scans.filter(s => {
    if (yearFilter !== "all" && String(s.year || "") !== yearFilter) return false;
    if (deptFilter !== "all" && (s.department || "").toUpperCase() !== deptFilter) return false;
    return true;
  }), [scans, yearFilter, deptFilter]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <History className="h-7 w-7 text-primary" />
            Resume Scan History
          </h2>
          <p className="text-slate-500 text-sm font-medium">View all student ATS resume analysis results</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Year filter */}
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[120px] h-9 rounded-xl border-slate-200 text-xs font-bold">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-xl">
              <SelectItem value="all" className="font-bold">All Years</SelectItem>
              <SelectItem value="1" className="font-bold">Year 1</SelectItem>
              <SelectItem value="2" className="font-bold">Year 2</SelectItem>
              <SelectItem value="3" className="font-bold">Year 3</SelectItem>
              <SelectItem value="4" className="font-bold">Year 4</SelectItem>
            </SelectContent>
          </Select>
          {/* Dept filter */}
          <Select value={deptFilter} onValueChange={setDeptFilter} disabled={!!managerDept}>
            <SelectTrigger className="w-[120px] h-9 rounded-xl border-slate-200 text-xs font-bold">
              <SelectValue placeholder="All Depts" />
            </SelectTrigger>
            <SelectContent className="rounded-xl shadow-xl">
              {!managerDept && <SelectItem value="all" className="font-bold">All Depts</SelectItem>}
              {(managerDept ? [managerDept] : DEPARTMENTS).map(d => (
                <SelectItem key={d} value={d} className="font-bold">{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="bg-white border-slate-200 px-4 py-1.5 rounded-full shadow-sm text-[10px] uppercase font-black tracking-widest text-slate-400 shrink-0">
            {filtered.length} Scans
          </Badge>
          <SyncDataButton onSync={async () => { await refetch(); }} isLoading={isLoading} className="h-10 px-4" />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-2 bg-slate-50/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-slate-400">
            <FileSearch className="h-12 w-12 mb-4 opacity-20" />
            <p className="font-medium text-lg">No scans found</p>
            <p className="text-sm">Try adjusting your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filtered.map((scan) => (
            <Card key={scan.id} className="overflow-hidden border-slate-200/60 hover:shadow-lg transition-all duration-300">
              <CardHeader className="p-4 sm:p-6 bg-slate-50/50 border-b border-slate-100">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-center gap-4 overflow-hidden">
                    <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center border-4 border-white shadow-md shrink-0">
                      <span className="text-xl font-black text-primary">
                        {scan.user_id?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="space-y-1 overflow-hidden">
                      <CardTitle className="text-lg font-black text-slate-900 leading-none truncate">
                        {scan.user_id?.full_name || 'Scholar'}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1.5 text-xs font-medium text-slate-500 truncate">
                        <Mail className="h-3 w-3 shrink-0" /> {scan.user_id?.email || 'N/A'}
                      </CardDescription>
                      <div className="flex items-center gap-1.5 mt-1">
                        {scan.department && (
                          <Badge variant="outline" className="text-[9px] font-black uppercase bg-blue-50 text-blue-700 border-blue-200 h-5 px-2">
                            {scan.department}
                          </Badge>
                        )}
                        {scan.year && (
                          <Badge variant="outline" className="text-[9px] font-black uppercase bg-slate-50 text-slate-500 border-slate-200 h-5 px-2">
                            Year {scan.year}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="hidden lg:flex flex-col items-end gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-widest">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(scan.created_at), 'MMMM dd, yyyy HH:mm')}
                    </div>
                    <Badge variant={scan.score >= 80 ? 'default' : scan.score >= 60 ? 'secondary' : 'destructive'} className="px-4 py-1.5 rounded-xl shadow-lg shadow-primary/20 text-sm font-black whitespace-nowrap">
                      ATS SCORE: {scan.score}/100
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 grid md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b pb-2">
                    <BrainCircuit className="h-4 w-4 text-primary" /> Missing Keywords
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {scan.analysis.missing_keywords?.map((kw, i) => (
                      <Badge key={i} variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">{kw}</Badge>
                    )) || <span className="text-xs text-slate-400 italic">None identified</span>}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b pb-2">
                    <Layout className="h-4 w-4 text-primary" /> Formatting Issues
                  </div>
                  <ul className="space-y-1.5">
                    {scan.analysis.formatting_issues?.map((issue, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0 mt-0.5" />{issue}
                      </li>
                    )) || <li className="text-xs text-slate-400 italic">No major issues</li>}
                  </ul>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900 border-b pb-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Key Suggestions
                  </div>
                  <ul className="space-y-1.5">
                    {scan.analysis.suggestions?.map((sug, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />{sug}
                      </li>
                    )) || <li className="text-xs text-slate-400 italic">Everything looks great!</li>}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}