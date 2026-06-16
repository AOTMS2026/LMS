/**
 * ADMIN — INTERVIEW LIVE MONITORING DASHBOARD
 * File: Frontend/src/components/interview/AdminInterviewMonitor.tsx
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  RefreshCw, PauseCircle, PlayCircle, StopCircle,
  Shield, AlertTriangle, UserX, Eye, Trophy, MonitorCheck,
  Copy, Clipboard, Maximize, CheckCircle2, XCircle, Minus,
  Clock, Camera, ChevronDown, ChevronUp
} from "lucide-react";
import { io as socketIO } from "socket.io-client";

const _rawApiUrl = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" ? "http://localhost:5000/api" : "https://loyola-lms.onrender.com/api");
const API_BASE = _rawApiUrl.replace(/\/api$/, '');

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

const STATUS_STYLE: Record<string, string> = {
  Active:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  Warning:    "bg-amber-50 text-amber-700 border-amber-200",
  Suspicious: "bg-orange-50 text-orange-700 border-orange-200",
  Blocked:    "bg-red-50 text-red-600 border-red-200",
  Completed:  "bg-blue-50 text-blue-700 border-blue-200",
};

export default function AdminInterviewMonitor() {
  const [attempts,    setAttempts]    = useState<any[]>([]);
  const [exams,       setExams]       = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState("all");
  const [loading,     setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [results,     setResults]     = useState<any[]>([]);
  const [view,        setView]        = useState<"results" | "leaderboard">("results");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [expandedResult, setExpandedResult] = useState<string | null>(null);
  const { toast } = useToast();
  const socketRef = useRef<any>(null);

  useEffect(() => {
    fetchData();
    fetchExams();
    const interval = setInterval(fetchData, 20000);

    const socket = socketIO(API_BASE);
    socketRef.current = socket;

    socket.on("interview_violation", (data: any) => {
      toast({
        title: "⚠️ Violation Detected",
        description: `${data.candidate_name}: ${data.violation_type} (Warning ${data.warning_number})`,
      });
      fetchData();
    });
    socket.on("interview_exam_submitted",    (data: any) => {
      toast({ title: "✅ Exam Submitted", description: `${data.candidate_name} — ${Math.round(data.percentage)}%` });
      fetchData();
    });
    socket.on("interview_candidate_blocked", () => fetchData());
    socket.on("interview_auto_submitted",    () => fetchData());
    socket.on("interview_leaderboard_updated", () => {
      if (view === "leaderboard" && selectedExam !== "all") fetchLeaderboard(selectedExam);
    });

    return () => { clearInterval(interval); socket.disconnect(); };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API_BASE}/api/interview/monitor/live`, { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) setAttempts(data);
      setLastRefresh(new Date());
    } catch (e) {
      console.error("Monitor fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      const res  = await fetch(`${API_BASE}/api/interview/exams`, { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) setExams(data);
    } catch (e) { console.error("Exams fetch error:", e); }
  };

  const fetchResults = async (examId: string) => {
    if (!examId || examId === "all") return;
    try {
      const res  = await fetch(`${API_BASE}/api/interview/results/${examId}`, { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) setResults(data);
    } catch (e) { console.error("Results fetch error:", e); }
  };

  const fetchLeaderboard = async (examId: string) => {
    if (!examId || examId === "all") return;
    try {
      const res  = await fetch(`${API_BASE}/api/interview/leaderboard/${examId}`, { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) setLeaderboard(data);
    } catch (e) { console.error("Leaderboard fetch error:", e); }
  };

  const rebuildLeaderboard = async () => {
    if (!selectedExam || selectedExam === "all") {
      toast({ title: "Select an exam first", variant: "destructive" }); return;
    }
    try {
      const res  = await fetch(`${API_BASE}/api/interview/leaderboard/${selectedExam}/rebuild`, {
        method: "POST", headers: authHeaders()
      });
      const data = await res.json();
      toast({ title: `Leaderboard rebuilt — ${data.count} entries` });
      if (Array.isArray(data.entries)) setLeaderboard(data.entries);
    } catch (e: any) {
      toast({ title: "Rebuild failed", description: e.message, variant: "destructive" });
    }
  };

  const handleExamChange = (val: string) => {
    setSelectedExam(val);
    if (view === "results")     fetchResults(val);
    if (view === "leaderboard") fetchLeaderboard(val);
  };

  const handleViewChange = (v: "results" | "leaderboard") => {
    setView(v);
    if (v === "results"     && selectedExam !== "all") fetchResults(selectedExam);
    if (v === "leaderboard" && selectedExam !== "all") fetchLeaderboard(selectedExam);
  };

  const sendControl = async (action: string, attemptId: string, candidateId: string) => {
    const labels: Record<string, string> = {
      pause:           "Pause exam?",
      resume:          "Resume exam?",
      force_submit:    "Force submit this candidate?",
      block_candidate: "Block this candidate permanently?",
    };
    if (!confirm(labels[action] || `${action}?`)) return;
    try {
      const res  = await fetch(`${API_BASE}/api/interview/admin/control`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ action, attempt_id: attemptId, candidate_id: candidateId })
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Action Executed", description: data.message });
        fetchData();
      } else {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
    } catch (e: any) {
      toast({ title: "Network Error", description: e.message, variant: "destructive" });
    }
  };

  const displayedAttempts = selectedExam === "all"
    ? attempts
    : attempts.filter(a => a.exam_id?.toString() === selectedExam);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const VIEW_TABS = [
    { key: "results",     label: "Results",     icon: Shield },
    { key: "leaderboard", label: "Leaderboard", icon: Trophy },
  ] as const;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <MonitorCheck className="h-6 w-6 text-primary" />
            Interview Live Monitor
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            Last refreshed: {lastRefresh.toLocaleTimeString()} · {displayedAttempts.length} active candidates
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Exam Filter */}
          <Select value={selectedExam} onValueChange={handleExamChange}>
            <SelectTrigger className="w-[200px] h-9 rounded-xl border-slate-200 bg-white text-sm font-semibold">
              <SelectValue placeholder="All Exams" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
              <SelectItem value="all" className="font-medium">All Exams</SelectItem>
              {exams.map(e => (
                <SelectItem key={e._id || e.id} value={e._id || e.id} className="font-medium">
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Tabs */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
            {VIEW_TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleViewChange(key as any)}
                className={`flex items-center gap-1.5 px-3 h-7 rounded-lg text-xs font-bold transition-all ${
                  view === key
                    ? "bg-white text-primary shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <Button size="sm" variant="outline"
            className="h-9 rounded-xl border-slate-200 text-slate-600 gap-1.5 font-semibold"
            onClick={fetchData} disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── RESULTS VIEW ──────────────────────────────────────────────────── */}
      {view === "results" && (
        <div className="space-y-4">
          {selectedExam === "all" && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Select a specific exam to view results.
            </div>
          )}
          {results.length === 0 && selectedExam !== "all" && (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No submissions yet for this exam.</p>
            </div>
          )}
          {results.map((r, i) => {
            const attemptId = String(r.attempt_id);
            const isExpanded = expandedResult === attemptId;
            return (
              <Card key={i} className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
                <CardContent className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-slate-900 font-bold">{r.candidate?.name}</p>
                      <p className="text-slate-400 text-xs font-medium">{r.candidate?.email}</p>
                      {r.candidate?.username && (
                        <p className="text-slate-400 text-xs font-medium">@{r.candidate?.username}</p>
                      )}
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className={`text-3xl font-black ${r.exam?.passed ? "text-emerald-600" : "text-red-500"}`}>
                          {Math.round(r.exam?.percentage || 0)}%
                        </p>
                        <Badge className={`font-bold border text-xs mt-1 ${r.exam?.passed
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-600 border-red-200"}`}>
                          {r.exam?.pass_fail}
                        </Badge>
                      </div>
                      <button
                        onClick={() => setExpandedResult(isExpanded ? null : attemptId)}
                        className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Score summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                    {[
                      { label: "Total Qs",   val: r.exam?.total_questions,  color: "text-slate-900",   icon: Clipboard  },
                      { label: "Correct",    val: r.exam?.correct_answers,  color: "text-emerald-600", icon: CheckCircle2 },
                      { label: "Wrong",      val: r.exam?.wrong_answers,    color: "text-red-500",     icon: XCircle    },
                      { label: "Unanswered", val: r.exam?.unanswered,       color: "text-amber-600",   icon: Minus      },
                    ].map(item => (
                      <div key={item.label} className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                        <p className={`font-black text-xl ${item.color}`}>{item.val ?? "—"}</p>
                        <p className="text-slate-400 text-xs font-medium mt-0.5">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Integrity summary */}
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Time Taken",      val: `${Math.round((r.timing?.time_taken_seconds || 0) / 60)} min`, icon: Clock,         color: "text-slate-700" },
                      { label: "Tab Switches",    val: r.integrity?.tab_switch_count,                                  icon: Eye,           color: r.integrity?.tab_switch_count > 0 ? "text-red-600" : "text-slate-700" },
                      { label: "Copy/Paste",      val: r.integrity?.copy_paste_count || 0,                            icon: Copy,          color: r.integrity?.copy_paste_count > 0 ? "text-amber-600" : "text-slate-700" },
                      { label: "Screenshots",     val: r.integrity?.screenshot_count,                                 icon: Camera,        color: "text-slate-700" },
                    ].map(item => (
                      <div key={item.label} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${
                        item.label === "Tab Switches" && (item.val as number) > 0 ? "bg-red-50 border-red-100" :
                        item.label === "Copy/Paste"   && (item.val as number) > 0 ? "bg-amber-50 border-amber-100" :
                        "bg-slate-50 border-slate-100"
                      }`}>
                        <item.icon className={`w-3.5 h-3.5 shrink-0 ${item.color}`} />
                        <div>
                          <p className={`font-black text-sm leading-none ${item.color}`}>{item.val}</p>
                          <p className="text-slate-400 text-[10px] mt-0.5">{item.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Expanded: violation log */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Violation Log</p>
                      {r.integrity?.violation_log?.length === 0 && (
                        <p className="text-slate-400 text-sm font-medium">No violations recorded.</p>
                      )}
                      <div className="space-y-2 max-h-52 overflow-y-auto">
                        {r.integrity?.violation_log?.map((v: any, vi: number) => (
                          <div key={vi} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-700 capitalize">
                                {(v.violation_type || "").replace(/_/g, " ")}
                                {v.warning_number && <span className="text-orange-500 ml-1">(Warning #{v.warning_number})</span>}
                              </p>
                              <p className="text-slate-400 truncate">{new Date(v.timestamp).toLocaleTimeString()}</p>
                              {v.description && <p className="text-slate-500 mt-0.5">{v.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Status */}
                      <p className="text-xs text-slate-400 font-medium pt-1">
                        Status: <span className="text-slate-700 font-bold capitalize">{r.timing?.status?.replace(/_/g, " ")}</span>
                        {r.timing?.submitted_at && (
                          <> · Submitted: {new Date(r.timing.submitted_at).toLocaleString()}</>
                        )}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── LEADERBOARD VIEW ──────────────────────────────────────────────── */}
      {view === "leaderboard" && (
        <div className="space-y-3">
          {selectedExam === "all" && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              Select a specific exam to view the leaderboard.
            </div>
          )}
          {leaderboard.length === 0 && selectedExam !== "all" && (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <Trophy className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">No leaderboard data yet.</p>
              <p className="text-slate-300 text-sm mt-1 mb-4">If a student has submitted, click Rebuild to generate rankings.</p>
              <Button size="sm" onClick={rebuildLeaderboard}
                className="h-8 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold gap-1.5">
                <RefreshCw className="w-3 h-3" /> Rebuild Leaderboard
              </Button>
            </div>
          )}
          {leaderboard.length > 0 && selectedExam !== "all" && (
            <div className="flex justify-end mb-2">
              <Button size="sm" variant="outline" onClick={rebuildLeaderboard}
                className="h-7 px-3 rounded-xl border-slate-200 text-slate-500 text-xs font-semibold gap-1.5">
                <RefreshCw className="w-3 h-3" /> Rebuild Rankings
              </Button>
            </div>
          )}
          {leaderboard.map((entry, i) => (
            <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl border shadow-sm ${
              i === 0 ? "bg-amber-50/80 border-amber-200" :
              i === 1 ? "bg-slate-50 border-slate-200" :
              i === 2 ? "bg-orange-50/60 border-orange-200" :
              "bg-white border-slate-200"
            }`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg shrink-0 ${
                i === 0 ? "bg-amber-400 text-amber-900" :
                i === 1 ? "bg-slate-300 text-slate-700" :
                i === 2 ? "bg-orange-400 text-white" :
                "bg-slate-100 text-slate-500"
              }`}>{entry.rank}</div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 font-bold truncate">{entry.candidate_name}</p>
                <p className="text-slate-400 text-xs font-medium truncate">{entry.candidate_email}</p>
              </div>
              <div className="text-right shrink-0 space-y-0.5">
                <p className={`text-2xl font-black ${entry.passed ? "text-emerald-600" : "text-red-500"}`}>
                  {Math.round(entry.percentage)}%
                </p>
                <p className="text-slate-400 text-xs font-medium">
                  {entry.correct_answers} correct · {Math.round((entry.time_taken_seconds || 0) / 60)} min
                </p>
                <Badge className={`text-[10px] font-bold border ${entry.passed
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-red-50 text-red-600 border-red-200"}`}>
                  {entry.passed ? "Pass" : "Fail"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatTile({ icon: Icon, label, value, color, highlight }: {
  icon: any; label: string; value: string; color: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl p-2.5 border text-center ${highlight ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"}`}>
      <p className={`font-bold text-sm ${color}`}>{value}</p>
      <p className="text-slate-400 text-[10px] font-medium mt-0.5 flex items-center justify-center gap-1">
        <Icon className="w-3 h-3" />{label}
      </p>
    </div>
  );
}

function ControlBtn({ color, icon: Icon, label, onClick }: {
  color: string; icon: any; label: string; onClick: () => void;
}) {
  const styles: Record<string, string> = {
    amber:   "text-amber-600 hover:bg-amber-50",
    emerald: "text-emerald-600 hover:bg-emerald-50",
    orange:  "text-orange-600 hover:bg-orange-50",
    red:     "text-red-500 hover:bg-red-50",
  };
  return (
    <Button size="sm" variant="ghost"
      className={`h-7 px-2 rounded-lg text-xs font-semibold ${styles[color]}`}
      onClick={onClick}>
      <Icon className="w-3 h-3 mr-1" />{label}
    </Button>
  );
}