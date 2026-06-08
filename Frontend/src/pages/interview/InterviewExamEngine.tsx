/**
 * INTERVIEW EXAM ENGINE — Full Anti-Cheat Examination Page
 * File: Frontend/src/pages/interview/InterviewExamEngine.tsx
 * Route: /interview-exam
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, ChevronLeft, ChevronRight, Send, PauseCircle } from "lucide-react";
import { useInterviewSocket } from "@/hooks/useInterviewSocket";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface Option { id: string; text: string; }
interface Question { id: string; order: number; question_text: string; marks: number; options: Option[]; }

export default function InterviewExamEngine() {
  const [examData, setExamData] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [attemptId, setAttemptId] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tabWarnings, setTabWarnings] = useState(0);
  const [warningMessage, setWarningMessage] = useState("");
  const [showWarning, setShowWarning] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [startTime] = useState<Date>(new Date());
  const navigate = useNavigate();

  const token = localStorage.getItem("interview_token");
  const candidateInfo = JSON.parse(localStorage.getItem("interview_candidate") || "{}");
  const maxViolations = useRef(3);
  const violationCount = useRef(0);
  const examConfig = useRef<any>(null);

  // ─── Admin Real-Time Control via Socket ──────────────────────────────────
  useInterviewSocket({
    candidateId: candidateInfo?.id || null,
    onPause: () => { setPaused(true); },
    onResume: () => { setPaused(false); },
    onForceSubmit: () => {
      if (!submitted && !submitting) submitExam("admin_force_submit");
    },
    onBlock: () => {
      setBlocked(true);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      alert("Your exam account has been blocked by the administrator. Contact your examination coordinator.");
      navigate("/interview-dashboard");
    },
  });

  useEffect(() => {
    if (!token) { navigate("/interview-login"); return; }
    startExam();
  }, []);

  const startExam = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/interview/exam/start`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Could not start exam.");
        navigate("/interview-dashboard");
        return;
      }

      setExamData(data.exam);
      setQuestions(data.questions);
      setAttemptId(data.attempt_id);
      setTimeLeft(data.time_remaining_seconds);
      setAnswers(data.existing_answers || {});
      examConfig.current = data.exam?.anti_cheat;
      maxViolations.current = data.exam?.anti_cheat?.max_tab_switches || 3;

      if (data.exam?.anti_cheat?.enforce_fullscreen) {
        requestFullscreen();
      }
    } catch (e) {
      alert("Network error. Please reload.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Countdown Timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!examData || submitted || blocked || paused) return;
    if (timeLeft <= 0) { handleAutoSubmit("time_expired"); return; }

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); handleAutoSubmit("time_expired"); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examData, submitted, blocked, paused]);

  // ─── Auto-save every 15 seconds ───────────────────────────────────────────
  useEffect(() => {
    if (!attemptId || submitted || blocked) return;
    const interval = setInterval(autoSaveAll, 15000);
    return () => clearInterval(interval);
  }, [answers, attemptId, submitted]);

  const autoSaveAll = useCallback(async () => {
    if (!attemptId || submitted) return;
    for (const [qId, ans] of Object.entries(answers)) {
      try {
        await fetch(`${API_BASE}/api/interview/exam/save-answer`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ attempt_id: attemptId, question_id: qId, answer: ans }),
        });
      } catch (_) { /* silent fail */ }
    }
  }, [answers, attemptId, submitted, token]);

  // ─── Anti-Cheat: Tab Switch / Blur ────────────────────────────────────────
  useEffect(() => {
    if (!examData) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !submitted && !blocked) logViolation("tab_switch");
    };
    const handleBlur = () => {
      if (!submitted && !blocked) logViolation("window_blur");
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !submitted && !blocked &&
          examConfig.current?.enforce_fullscreen) {
        logViolation("fullscreen_exit");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [examData, submitted, blocked]);

  // ─── Anti-Cheat: Disable Right-click, Copy/Paste ─────────────────────────
  useEffect(() => {
    if (!examData) return;
    const block = (e: Event) => e.preventDefault();
    const blockKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "u", "a", "s"].includes(e.key.toLowerCase())) {
        e.preventDefault();
        if (e.key.toLowerCase() === "c") logViolation("copy_attempt");
        if (e.key.toLowerCase() === "v") logViolation("paste_attempt");
      }
    };

    document.addEventListener("contextmenu", block);
    document.addEventListener("copy", block);
    document.addEventListener("paste", block);
    document.addEventListener("cut", block);
    document.addEventListener("keydown", blockKeys);

    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("copy", block);
      document.removeEventListener("paste", block);
      document.removeEventListener("cut", block);
      document.removeEventListener("keydown", blockKeys);
    };
  }, [examData]);

  const logViolation = async (type: string) => {
    violationCount.current += 1;
    const count = violationCount.current;
    setTabWarnings(count);

    if (count === 1) {
      setWarningMessage("⚠️ Warning 1: Tab switching detected. Please remain on this page.");
    } else if (count === 2) {
      setWarningMessage("⚠️ Warning 2: Second violation detected. One more will end your exam.");
    } else {
      setWarningMessage("🚫 Maximum violations reached. Your exam has been automatically submitted.");
    }
    setShowWarning(true);

    try {
      const res = await fetch(`${API_BASE}/api/interview/violations`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ attempt_id: attemptId, violation_type: type }),
      });
      const data = await res.json();

      if (data.action === "block") {
        setBlocked(true);
        setShowWarning(false);
        alert("Your exam has been blocked due to repeated violations. Contact the administrator.");
        navigate("/interview-dashboard");
      } else if (data.action === "submit" || count >= maxViolations.current) {
        handleAutoSubmit("max_violations");
      }
    } catch (_) { /* log regardless */ }

    captureScreenshot(type);
  };

  const captureScreenshot = async (triggerEvent: string) => {
    if (!examConfig.current?.capture_screenshots) return;
    // Best-effort: server records the violation event
  };

  const requestFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  };

  const handleAnswerSelect = (questionId: string, optionId: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    if (submitting || submitted) return;
    const confirmed = window.confirm("Are you sure you want to submit the exam? You cannot change answers after submission.");
    if (!confirmed) return;
    await submitExam();
  };

  const handleAutoSubmit = async (reason: string) => {
    if (submitting || submitted) return;
    await submitExam(reason);
  };

  const submitExam = async (reason?: string) => {
    setSubmitting(true);
    const timeTaken = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);

    try {
      const res = await fetch(`${API_BASE}/api/interview/exam/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ attempt_id: attemptId, answers, time_taken_seconds: timeTaken }),
      });
      if (res.ok) {
        setSubmitted(true);
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      }
    } catch (e) {
      alert("Failed to submit. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const timeColor =
    timeLeft < 300 ? "text-red-600" : timeLeft < 600 ? "text-amber-600" : "text-emerald-600";
  const timeBg =
    timeLeft < 300 ? "bg-red-50 border-red-200" : timeLeft < 600 ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200";

  // ─── Post-Submission Screen ───────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Send className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Thank You For Completing The Interview Examination
          </h1>
          <p className="text-slate-500 mt-4 font-medium">
            Exam: <span className="text-slate-800 font-bold">{examData?.title}</span>
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Submitted at: {new Date().toLocaleString("en-IN")}
          </p>
          <p className="text-slate-400 text-xs mt-4">
            Your results will be reviewed by the examination team.
          </p>
          <Button
            onClick={() => navigate("/interview-dashboard")}
            className="mt-6 h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
          <p className="text-slate-500 font-medium">Loading your examination...</p>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  return (
    <div
      className="min-h-screen bg-slate-50 flex flex-col select-none"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      {/* Warning Overlay */}
      {showWarning && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-red-200 rounded-2xl p-8 max-w-md text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-3">Violation Detected</h2>
            <p className="text-slate-600 mb-6 leading-relaxed">{warningMessage}</p>
            {violationCount.current < maxViolations.current && (
              <Button
                onClick={() => { setShowWarning(false); requestFullscreen(); }}
                className="bg-red-600 hover:bg-red-700 text-white px-8 h-11 rounded-xl font-semibold shadow-sm"
              >
                I Understand — Continue Exam
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Pause Overlay */}
      {paused && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-amber-200 rounded-2xl p-8 max-w-md text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto mb-4">
              <PauseCircle className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Exam Paused</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Your exam has been temporarily paused by the administrator.
              <br />Please wait — the exam will resume shortly.
            </p>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div>
          <h1 className="text-slate-900 font-bold text-sm">{examData?.title}</h1>
          <p className="text-slate-400 text-xs">
            Q {currentIdx + 1} of {questions.length} &bull; {answeredCount} answered
          </p>
        </div>
        <div className="flex items-center gap-3">
          {tabWarnings > 0 && (
            <div className="flex items-center gap-1.5 text-amber-600 text-xs font-semibold bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{tabWarnings} warning{tabWarnings > 1 ? "s" : ""}</span>
            </div>
          )}
          <div className={`font-mono font-bold text-lg px-3 py-1 rounded-xl border ${timeBg} ${timeColor}`}>
            ⏱ {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-white border-b border-slate-100 px-4 py-2">
        <div className="flex justify-between text-xs text-slate-400 mb-1 font-medium">
          <span>Progress</span>
          <span>{answeredCount} / {questions.length} answered</span>
        </div>
        <Progress value={progressPercent} className="h-1.5 bg-slate-100" />
      </div>

      {/* Question Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6">
          {currentQ && (
            <div className="space-y-4">
              {/* Question */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="bg-primary text-white text-sm font-bold rounded-xl w-8 h-8 flex items-center justify-center flex-shrink-0">
                    {currentQ.order}
                  </span>
                  <p className="text-slate-800 text-base leading-relaxed font-medium">{currentQ.question_text}</p>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQ.options.map((opt) => {
                  const isSelected = answers[currentQ.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleAnswerSelect(currentQ.id, opt.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        isSelected
                          ? "bg-primary/5 border-primary/40 shadow-sm"
                          : "bg-white border-slate-200 hover:border-primary/30 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected ? "border-primary bg-primary" : "border-slate-300"
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className={`text-sm font-medium ${isSelected ? "text-primary" : "text-slate-700"}`}>
                          {opt.text}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Navigation Footer */}
      <footer className="bg-white border-t border-slate-200 px-4 py-3 flex items-center justify-between sticky bottom-0 shadow-sm">
        <Button
          variant="outline"
          onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
          disabled={currentIdx === 0}
          className="h-10 px-4 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>

        {/* Question dots */}
        <div className="hidden sm:flex gap-1 flex-wrap justify-center max-w-xs">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(i)}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                i === currentIdx
                  ? "bg-primary text-white shadow-sm"
                  : answers[q.id]
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : "bg-slate-100 text-slate-400 hover:bg-slate-200"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {currentIdx < questions.length - 1 ? (
            <Button
              onClick={() => setCurrentIdx(prev => Math.min(questions.length - 1, prev + 1))}
              className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
            >
              {submitting ? "Submitting..." : "Submit Exam"}
              <Send className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}