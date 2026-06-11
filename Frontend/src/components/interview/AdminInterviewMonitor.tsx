/**
 * ADMIN — INTERVIEW LIVE MONITORING DASHBOARD
 * File: Frontend/src/components/interview/AdminInterviewMonitor.tsx
 *
 * Add to AdminDashboard.tsx sidebar:
 *   { id: "interview-monitor", label: "Interview Monitor", icon: MonitorCheck }
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
  Shield, AlertTriangle, UserX, Eye, Trophy, MonitorCheck
} from "lucide-react";
import { io as socketIO } from "socket.io-client";

const API_BASE = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" ? "http://localhost:5000" : "https://loyola-lms.onrender.com");
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const STATUS_STYLE: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Warning: "bg-amber-50 text-amber-700 border-amber-200",
  Suspicious: "bg-orange-50 text-orange-700 border-orange-200",
  Blocked: "bg-red-50 text-red-600 border-red-200",
  Completed: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function AdminInterviewMonitor() {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [selectedExam, setSelectedExam] = useState("all");
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [results, setResults] = useState<any[]>([]);
  const [view, setView] = useState<"monitor" | "results" | "leaderboard">("monitor");
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
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
    socket.on("interview_exam_submitted", (data: any) => {
      toast({ title: "✅ Exam Submitted", description: `${data.candidate_name} — ${Math.round(data.percentage)}%` });
      fetchData();
    });
    socket.on("interview_candidate_blocked", () => fetchData());
    socket.on("interview_auto_submitted", () => fetchData());
    socket.on("interview_leaderboard_updated", () => {
      if (view === "leaderboard" && selectedExam !== "all") fetchLeaderboard(selectedExam);
    });

    return () => { clearInterval(interval); socket.disconnect(); };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/interview/monitor/live`, { headers: authHeaders() });
      const data = await res.json();
      if (Array.isArray(data)) setAttempts(data);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    const res = await fetch(`${API_BASE}/api/interview/exams`, { headers: authHeaders() });
    const data = await res.json();
    if (Array.isArray(data)) setExams(data);
  };

  const fetchResults = async (examId: string) => {
    if (!examId || examId === "all") return;
    const res = await fetch(`${API_BASE}/api/interview/results/${examId}`, { headers: authHeaders() });
    const data = await res.json();
    if (Array.isArray(data)) setResults(data);
  };

  const fetchLeaderboard = async (examId: string) => {
    if (!examId || examId === "all") return;
    const res = await fetch(`${API_BASE}/api/interview/leaderboard/${examId}`, { headers: authHeaders() });
    const data = await res.json();
    if (Array.isArray(data)) setLeaderboard(data);
  };

  const handleExamChange = (val: string) => {
    setSelectedExam(val);
    if (view === "results") fetchResults(val);
    if (view === "leaderboard") fetchLeaderboard(val);
  };

  const sendControl = async (action: string, attemptId: string, candidateId: string) => {
    const labels: Record<string, string> = {
      pause: "Pause exam?", resume: "Resume exam?",
      force_submit: "Force submit this candidate?", block_candidate: "Block this candidate?"
    };
    if (!confirm(labels[action] || `${action}?`)) return;

    const res = await fetch(`${API_BASE}/api/interview/admin/control`, {
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
  };

  const displayedAttempts = selectedExam === "all"
    ? attempts
    : attempts.filter(a => a.exam_id?.toString() === selectedExam);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const VIEW_TABS = [
    { key: "monitor", label: "Monitor", icon: Eye },
    { key: "results", label: "Results", icon: Shield },
    { key: "leaderboard", label: "Leaderboard", icon: Trophy },
  ];

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
            <SelectTrigger className="h-10 w-52 rounded-xl bg-white border-slate-200 text-slate-700 shadow-sm text-sm font-medium">
              <SelectValue placeholder="All Exams" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200">
              <SelectItem value="all" className="font-medium">All Exams</SelectItem>
              {exams.map(e => (
                <SelectItem key={e._id || e.id} value={e._id || e.id} className="font-medium text-sm">
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex gap-1 bg-slate-100/80 border border-slate-200 rounded-xl p-1">
            {VIEW_TABS.map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                size="sm"
                onClick={() => {
                  setView(key as any);
                  if (key === "results" && selectedExam !== "all") fetchResults(selectedExam);
                  if (key === "leaderboard" && selectedExam !== "all") fetchLeaderboard(selectedExam);
                }}
                className={`h-8 px-3 rounded-lg text-xs font-semibold transition-all ${
                  view === key
                    ? "bg-white text-primary shadow-sm"
                    : "bg-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="w-3.5 h-3.5 mr-1.5" />
                {label}
              </Button>
            ))}
          </div>

          <Button
            onClick={fetchData}
            size="sm"
            variant="outline"
            className="h-10 w-10 p-0 rounded-xl border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* MONITOR VIEW */}
      {view === "monitor" && (
        <>
          {displayedAttempts.length === 0 && (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <Eye className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No active exam sessions right now.</p>
              <p className="text-slate-400 text-sm">Active candidates will appear here in real time.</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayedAttempts.map(a => (
              <Card key={a.attempt_id} className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white hover:shadow-md transition-shadow">
                <CardHeader className="pb-3 border-b border-slate-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 font-bold truncate">{a.candidate_name}</p>
                      <p className="text-slate-400 text-xs font-medium truncate">{a.candidate_email}</p>
                    </div>
                    <Badge className={`text-xs border font-semibold ml-2 flex-shrink-0 ${STATUS_STYLE[a.display_status] || STATUS_STYLE.Active}`}>
                      {a.display_status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <p className="text-slate-400 text-xs font-medium truncate">📋 {a.exam_title}</p>

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-medium">
                      <span>Progress</span>
                      <span>{a.progress_percent}%</span>
                    </div>
                    <Progress value={a.progress_percent} className="h-1.5 bg-slate-100" />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2">
                      <p className="text-slate-900 font-bold text-sm">{formatTime(a.time_remaining_seconds)}</p>
                      <p className="text-slate-400 text-xs font-medium">Time Left</p>
                    </div>
                    <div className={`rounded-xl p-2 border ${a.tab_switch_count > 0 ? "bg-red-50 border-red-100" : "bg-slate-50 border-slate-100"}`}>
                      <p className={`font-bold text-sm ${a.tab_switch_count > 0 ? "text-red-600" : "text-slate-900"}`}>
                        {a.tab_switch_count}
                      </p>
                      <p className="text-slate-400 text-xs font-medium">Tab Switches</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-2">
                      <p className="text-slate-900 font-bold text-sm">{a.screenshot_count}</p>
                      <p className="text-slate-400 text-xs font-medium">Screenshots</p>
                    </div>
                  </div>

                  {/* Admin Controls */}
                  <div className="flex gap-1 flex-wrap pt-1">
                    <Button size="sm" variant="ghost"
                      className="h-7 px-2 rounded-lg text-amber-600 hover:bg-amber-50 text-xs font-semibold"
                      onClick={() => sendControl("pause", a.attempt_id, a.candidate_id)}>
                      <PauseCircle className="w-3 h-3 mr-1" /> Pause
                    </Button>
                    <Button size="sm" variant="ghost"
                      className="h-7 px-2 rounded-lg text-emerald-600 hover:bg-emerald-50 text-xs font-semibold"
                      onClick={() => sendControl("resume", a.attempt_id, a.candidate_id)}>
                      <PlayCircle className="w-3 h-3 mr-1" /> Resume
                    </Button>
                    <Button size="sm" variant="ghost"
                      className="h-7 px-2 rounded-lg text-orange-600 hover:bg-orange-50 text-xs font-semibold"
                      onClick={() => sendControl("force_submit", a.attempt_id, a.candidate_id)}>
                      <StopCircle className="w-3 h-3 mr-1" /> Submit
                    </Button>
                    <Button size="sm" variant="ghost"
                      className="h-7 px-2 rounded-lg text-red-500 hover:bg-red-50 text-xs font-semibold"
                      onClick={() => sendControl("block_candidate", a.attempt_id, a.candidate_id)}>
                      <UserX className="w-3 h-3 mr-1" /> Block
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* RESULTS VIEW */}
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
          {results.map((r, i) => (
            <Card key={i} className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-slate-900 font-bold">{r.candidate?.name}</p>
                    <p className="text-slate-400 text-xs font-medium">{r.candidate?.email}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-black ${r.exam?.passed ? "text-emerald-600" : "text-red-500"}`}>
                      {Math.round(r.exam?.percentage || 0)}%
                    </p>
                    <Badge className={`font-semibold border ${r.exam?.passed ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
                      {r.exam?.pass_fail}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 text-center">
                  {[
                    { label: "Total Qs", val: r.exam?.total_questions, color: "text-slate-900" },
                    { label: "Correct", val: r.exam?.correct_answers, color: "text-emerald-600" },
                    { label: "Wrong", val: r.exam?.wrong_answers, color: "text-red-500" },
                    { label: "Unanswered", val: r.exam?.unanswered, color: "text-amber-600" },
                  ].map(item => (
                    <div key={item.label} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                      <p className={`font-black text-xl ${item.color}`}>{item.val}</p>
                      <p className="text-slate-400 text-xs font-medium mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex gap-4 text-xs text-slate-400 flex-wrap font-medium">
                  <span>⏱ {Math.round((r.timing?.time_taken_seconds || 0) / 60)} min taken</span>
                  <span>🔀 {r.integrity?.tab_switch_count} tab switches</span>
                  <span>📸 {r.integrity?.screenshot_count} screenshots</span>
                  <span>Status: <span className="text-slate-700 font-semibold">{r.timing?.status}</span></span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* LEADERBOARD VIEW */}
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
            </div>
          )}
          {leaderboard.map((entry, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 p-4 rounded-2xl border shadow-sm transition-all ${
                i === 0 ? "bg-amber-50/80 border-amber-200" :
                i === 1 ? "bg-slate-50 border-slate-200" :
                i === 2 ? "bg-orange-50/60 border-orange-200" :
                "bg-white border-slate-200"
              }`}
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-lg flex-shrink-0 ${
                i === 0 ? "bg-amber-400 text-amber-900 shadow-sm" :
                i === 1 ? "bg-slate-300 text-slate-700 shadow-sm" :
                i === 2 ? "bg-orange-400 text-white shadow-sm" :
                "bg-slate-100 text-slate-500"
              }`}>
                {entry.rank}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-900 font-bold truncate">{entry.candidate_name}</p>
                <p className="text-slate-400 text-xs font-medium truncate">{entry.candidate_email}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-2xl font-black ${entry.passed ? "text-emerald-600" : "text-red-500"}`}>
                  {Math.round(entry.percentage)}%
                </p>
                <p className="text-slate-400 text-xs font-medium">
                  {entry.correct_answers} correct · {Math.round((entry.time_taken_seconds || 0) / 60)} min
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}