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
  Shield, AlertTriangle, UserX, Eye, Trophy
} from "lucide-react";
import { io as socketIO } from "socket.io-client";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const STATUS_STYLE: Record<string, string> = {
  Active: "bg-green-500/20 text-green-400 border-green-500/30",
  Warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Suspicious: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Blocked: "bg-red-500/20 text-red-400 border-red-500/30",
  Completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
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

    // Socket.IO for real-time events
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Interview Live Monitor</h1>
          <p className="text-slate-400 text-xs mt-1">
            Last refreshed: {lastRefresh.toLocaleTimeString()} · {displayedAttempts.length} active candidates
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedExam} onValueChange={handleExamChange}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white w-52">
              <SelectValue placeholder="All Exams" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white">All Exams</SelectItem>
              {exams.map(e => (
                <SelectItem key={e._id || e.id} value={e._id || e.id} className="text-white text-sm">
                  {e.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            {["monitor", "results", "leaderboard"].map(v => (
              <Button key={v} size="sm" variant={view === v ? "default" : "ghost"}
                onClick={() => {
                  setView(v as any);
                  if (v === "results" && selectedExam !== "all") fetchResults(selectedExam);
                  if (v === "leaderboard" && selectedExam !== "all") fetchLeaderboard(selectedExam);
                }}
                className={view === v ? "bg-blue-600" : "text-slate-400"}>
                {v === "monitor" && <Eye className="w-3.5 h-3.5 mr-1" />}
                {v === "results" && <Shield className="w-3.5 h-3.5 mr-1" />}
                {v === "leaderboard" && <Trophy className="w-3.5 h-3.5 mr-1" />}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </Button>
            ))}
          </div>

          <Button onClick={fetchData} size="sm" variant="ghost" className="text-slate-400">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* MONITOR VIEW */}
      {view === "monitor" && (
        <>
          {displayedAttempts.length === 0 && (
            <div className="text-center py-16 bg-slate-800/30 rounded-xl border border-dashed border-slate-700">
              <Eye className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No active exam sessions right now.</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayedAttempts.map(a => (
              <Card key={a.attempt_id} className="bg-slate-800/60 border-slate-700">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-semibold">{a.candidate_name}</p>
                      <p className="text-slate-400 text-xs">{a.candidate_email}</p>
                    </div>
                    <Badge className={`text-xs border ${STATUS_STYLE[a.display_status] || STATUS_STYLE.Active}`}>
                      {a.display_status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-slate-400 text-xs truncate">📋 {a.exam_title}</p>

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Progress</span>
                      <span>{a.progress_percent}%</span>
                    </div>
                    <Progress value={a.progress_percent} className="h-1.5" />
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-900/50 rounded p-2">
                      <p className="text-white font-bold text-sm">{formatTime(a.time_remaining_seconds)}</p>
                      <p className="text-slate-500 text-xs">Time Left</p>
                    </div>
                    <div className={`rounded p-2 ${a.tab_switch_count > 0 ? "bg-red-900/20" : "bg-slate-900/50"}`}>
                      <p className={`font-bold text-sm ${a.tab_switch_count > 0 ? "text-red-400" : "text-white"}`}>
                        {a.tab_switch_count}
                      </p>
                      <p className="text-slate-500 text-xs">Tab Switches</p>
                    </div>
                    <div className="bg-slate-900/50 rounded p-2">
                      <p className="text-white font-bold text-sm">{a.screenshot_count}</p>
                      <p className="text-slate-500 text-xs">Screenshots</p>
                    </div>
                  </div>

                  {/* Admin Controls */}
                  <div className="flex gap-1 flex-wrap pt-1">
                    <Button size="sm" variant="ghost" className="text-yellow-400 hover:bg-yellow-900/20 text-xs h-7 px-2"
                      onClick={() => sendControl("pause", a.attempt_id, a.candidate_id)}>
                      <PauseCircle className="w-3 h-3 mr-1" /> Pause
                    </Button>
                    <Button size="sm" variant="ghost" className="text-green-400 hover:bg-green-900/20 text-xs h-7 px-2"
                      onClick={() => sendControl("resume", a.attempt_id, a.candidate_id)}>
                      <PlayCircle className="w-3 h-3 mr-1" /> Resume
                    </Button>
                    <Button size="sm" variant="ghost" className="text-orange-400 hover:bg-orange-900/20 text-xs h-7 px-2"
                      onClick={() => sendControl("force_submit", a.attempt_id, a.candidate_id)}>
                      <StopCircle className="w-3 h-3 mr-1" /> Submit
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-900/20 text-xs h-7 px-2"
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
        <div className="space-y-3">
          {selectedExam === "all" && (
            <p className="text-yellow-400 text-sm">Select a specific exam to view results.</p>
          )}
          {results.length === 0 && selectedExam !== "all" && (
            <p className="text-slate-400 text-sm text-center py-8">No submissions yet for this exam.</p>
          )}
          {results.map((r, i) => (
            <Card key={i} className="bg-slate-800/60 border-slate-700">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Candidate */}
                  <div className="min-w-0">
                    <p className="text-white font-semibold">{r.candidate?.name}</p>
                    <p className="text-slate-400 text-xs">{r.candidate?.email}</p>
                  </div>
                  {/* Score */}
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${r.exam?.passed ? "text-green-400" : "text-red-400"}`}>
                      {Math.round(r.exam?.percentage || 0)}%
                    </p>
                    <Badge className={r.exam?.passed ? "bg-green-900/30 text-green-400 border-green-700/50" : "bg-red-900/30 text-red-400 border-red-700/50"}>
                      {r.exam?.pass_fail}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-center">
                  {[
                    { label: "Total Qs", val: r.exam?.total_questions },
                    { label: "Correct", val: r.exam?.correct_answers, color: "text-green-400" },
                    { label: "Wrong", val: r.exam?.wrong_answers, color: "text-red-400" },
                    { label: "Unanswered", val: r.exam?.unanswered, color: "text-yellow-400" },
                  ].map(item => (
                    <div key={item.label} className="bg-slate-900/50 rounded-lg p-2">
                      <p className={`font-bold text-lg ${item.color || "text-white"}`}>{item.val}</p>
                      <p className="text-slate-500 text-xs">{item.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex gap-4 text-xs text-slate-400 flex-wrap">
                  <span>⏱ {Math.round((r.timing?.time_taken_seconds || 0) / 60)} min taken</span>
                  <span>🔀 {r.integrity?.tab_switch_count} tab switches</span>
                  <span>📸 {r.integrity?.screenshot_count} screenshots</span>
                  <span>Status: <span className="text-white">{r.timing?.status}</span></span>
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
            <p className="text-yellow-400 text-sm">Select a specific exam to view the leaderboard.</p>
          )}
          {leaderboard.length === 0 && selectedExam !== "all" && (
            <p className="text-slate-400 text-sm text-center py-8">No leaderboard data yet.</p>
          )}
          {leaderboard.map((entry, i) => (
            <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border ${
              i === 0 ? "bg-yellow-900/20 border-yellow-700/50" :
              i === 1 ? "bg-slate-700/40 border-slate-600" :
              i === 2 ? "bg-orange-900/20 border-orange-700/50" :
              "bg-slate-800/40 border-slate-700"
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                i === 0 ? "bg-yellow-500 text-yellow-900" :
                i === 1 ? "bg-slate-400 text-slate-900" :
                i === 2 ? "bg-orange-600 text-white" :
                "bg-slate-700 text-slate-300"
              }`}>
                {entry.rank}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{entry.candidate_name}</p>
                <p className="text-slate-400 text-xs">{entry.candidate_email}</p>
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold ${entry.passed ? "text-green-400" : "text-red-400"}`}>
                  {Math.round(entry.percentage)}%
                </p>
                <p className="text-slate-400 text-xs">{entry.correct_answers} correct · {Math.round((entry.time_taken_seconds || 0) / 60)} min</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}