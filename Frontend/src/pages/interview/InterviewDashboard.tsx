/**
 * INTERVIEW CANDIDATE DASHBOARD
 * File: Frontend/src/pages/interview/InterviewDashboard.tsx
 * Route: /interview-dashboard
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar, Clock, BookOpen, AlertTriangle,
  CheckCircle, XCircle, LogOut, Play, User
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface ExamInfo {
  id: string;
  title: string;
  topic: string;
  difficulty: string;
  duration_minutes: number;
  passing_percentage: number;
  scheduled_date: string;
  scheduled_time: string;
}

interface DashboardData {
  candidate: {
    id: string;
    full_name: string;
    email: string;
    username: string;
    mobile_number: string;
    status: string;
  };
  exam: ExamInfo | null;
  exam_status: "upcoming" | "active" | "completed" | "blocked";
}

const STATUS_CONFIG = {
  upcoming: { label: "Upcoming", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock },
  active: { label: "Active — Exam In Progress", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: Play },
  completed: { label: "Completed", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: CheckCircle },
  blocked: { label: "Blocked", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
};

export default function InterviewDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [serverTime, setServerTime] = useState<Date>(new Date());
  const navigate = useNavigate();

  const token = localStorage.getItem("interview_token");

  useEffect(() => {
    if (!token) { navigate("/interview-login"); return; }
    fetchDashboard();
    // Refresh every 30 seconds to update exam status in real time
    const interval = setInterval(fetchDashboard, 30000);
    // Live clock
    const clockInterval = setInterval(() => setServerTime(new Date()), 1000);
    return () => { clearInterval(interval); clearInterval(clockInterval); };
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/interview/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        handleLogout();
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("interview_token");
    localStorage.removeItem("interview_candidate");
    navigate("/interview-login");
  };

  const handleStartExam = () => {
    navigate("/interview-exam");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white animate-pulse">Loading your exam portal...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-red-400">Unable to load dashboard. Please login again.</div>
      </div>
    );
  }

  const { candidate, exam, exam_status } = data;
  const statusConfig = STATUS_CONFIG[exam_status] || STATUS_CONFIG.upcoming;
  const StatusIcon = statusConfig.icon;
  const canStartExam = exam_status === "active";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/60 backdrop-blur border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold">{candidate.full_name}</p>
            <p className="text-slate-400 text-xs">{candidate.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-slate-400 text-xs">Current Time</p>
            <p className="text-white text-sm font-mono">
              {serverTime.toLocaleTimeString("en-IN")}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Status Banner */}
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${statusConfig.color}`}>
          <StatusIcon className="w-5 h-5" />
          <span className="font-medium">{statusConfig.label}</span>
        </div>

        {/* Exam Card */}
        {exam ? (
          <Card className="bg-slate-800/60 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white text-xl">{exam.title}</CardTitle>
              <p className="text-slate-400 text-sm">Topic: {exam.topic}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Exam Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <InfoTile
                  icon={Calendar}
                  label="Date"
                  value={exam.scheduled_date}
                />
                <InfoTile
                  icon={Clock}
                  label="Time"
                  value={exam.scheduled_time}
                />
                <InfoTile
                  icon={Clock}
                  label="Duration"
                  value={`${exam.duration_minutes} minutes`}
                />
                <InfoTile
                  icon={BookOpen}
                  label="Questions"
                  value={String(exam.num_questions || "—")}
                />
                <InfoTile
                  icon={CheckCircle}
                  label="Passing"
                  value={`${exam.passing_percentage}%`}
                />
                <InfoTile
                  icon={AlertTriangle}
                  label="Difficulty"
                  value={exam.difficulty.charAt(0).toUpperCase() + exam.difficulty.slice(1)}
                />
              </div>

              {/* Instructions */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-2">
                <h3 className="text-white font-semibold text-sm">📋 Exam Instructions</h3>
                <ul className="text-slate-300 text-sm space-y-1 list-disc list-inside">
                  <li>The exam will be available only during the scheduled time window.</li>
                  <li>Switching browser tabs or windows will trigger a warning.</li>
                  <li>Three violations will automatically submit or block your exam.</li>
                  <li>Copy, paste, and right-click are disabled during the exam.</li>
                  <li>You must remain in fullscreen mode throughout the exam.</li>
                  <li>Your answers are auto-saved. Do not refresh the page.</li>
                  <li>Once submitted, answers cannot be changed.</li>
                </ul>
              </div>

              {/* CTA */}
              <div className="pt-2">
                <Button
                  onClick={handleStartExam}
                  disabled={!canStartExam}
                  size="lg"
                  className={`w-full font-bold py-3 text-base transition-all ${
                    canStartExam
                      ? "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/30"
                      : "bg-slate-700 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  {exam_status === "upcoming" && `Start Exam (Opens at ${exam.scheduled_time})`}
                  {exam_status === "active" && "▶ Start Exam Now"}
                  {exam_status === "completed" && "Exam Completed"}
                  {exam_status === "blocked" && "Account Blocked"}
                </Button>
                {exam_status === "upcoming" && (
                  <p className="text-center text-slate-500 text-xs mt-2">
                    The button will activate at your scheduled exam time.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-800/60 border-slate-700">
            <CardContent className="py-12 text-center">
              <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">No exam assigned yet.</p>
              <p className="text-slate-500 text-sm mt-1">
                Your examination coordinator will assign an exam to your account.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="bg-slate-900/50 rounded-lg p-3 flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-slate-400 text-xs">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <span className="text-white font-medium text-sm">{value}</span>
    </div>
  );
}