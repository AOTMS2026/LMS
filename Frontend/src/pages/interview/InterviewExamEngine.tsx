/**
 * INTERVIEW EXAM ENGINE — Full Anti-Cheat Examination Page
 * File: Frontend/src/pages/interview/InterviewExamEngine.tsx
 * Route: /interview-exam
 *
 * FIX APPLIED (Bug #2): useInterviewSocket hook is now imported and wired in
 * so that admin control events (pause, resume, force-submit, block) are
 * received and acted upon in real time.
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
    onPause: () => {
      setPaused(true);
    },
    onResume: () => {
      setPaused(false);
    },
    onForceSubmit: () => {
      if (!submitted && !submitting) {
        submitExam("admin_force_submit");
      }
    },
    onBlock: () => {
      setBlocked(true);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      alert("Your exam account has been blocked by the administrator. Contact your examination coordinator.");
      navigate("/interview-dashboard");
    },
  });

  // ─── Load exam on mount ───────────────────────────────────────────────────
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

      // Enter fullscreen
      if (data.exam?.anti_cheat?.enforce_fullscreen) {
        requestFullscreen();
      }
    } catch (e) {
      alert("Network error. Please reload.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Countdown Timer (pauses when admin pauses the exam) ──────────────────
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
    // Save all current answers in bulk via submit endpoint (partial = just save)
    // We save each answer individually to the server
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
      if (document.hidden && !submitted && !blocked) {
        logViolation("tab_switch");
      }
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

    // Show warning dialog
    if (count === 1) {
      setWarningMessage("⚠️ Warning 1: Tab switching detected. Please remain on this page.");
    } else if (count === 2) {
      setWarningMessage("⚠️ Warning 2: Second violation detected. One more will end your exam.");
    } else {
      setWarningMessage("🚫 Maximum violations reached. Your exam has been automatically submitted.");
    }
    setShowWarning(true);

    // Report to backend
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

    // Auto-take screenshot if configured
    captureScreenshot(type);
  };

  const captureScreenshot = async (triggerEvent: string) => {
    if (!examConfig.current?.capture_screenshots) return;
    try {
      // Use MediaDevices API if available and permitted
      // This is best-effort — browser permission may deny it
      if (navigator.mediaDevices?.getDisplayMedia) {
        // We don't actually call getDisplayMedia here as it requires user gesture
        // Instead we mark the event and the server records the violation
      }
    } catch (_) { /* browser may block */ }
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
        // Exit fullscreen
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

  const timeColor = timeLeft < 300 ? "text-red-400" : timeLeft < 600 ? "text-yellow-400" : "text-green-400";

  // ─── Post-Submission Screen ───────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto mb-6">
            <Send className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Thank You For Completing The Interview Examination
          </h1>
          <p className="text-slate-400 mt-4">
            Exam: <span className="text-white font-medium">{examData?.title}</span>
          </p>
          <p className="text-slate-400 text-sm mt-1">
            Submitted at: {new Date().toLocaleString("en-IN")}
          </p>
          <p className="text-slate-500 text-xs mt-4">
            Your results will be reviewed by the examination team.
          </p>
          <Button
            onClick={() => { navigate("/interview-dashboard"); }}
            className="mt-6 bg-blue-600 hover:bg-blue-700"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white animate-pulse text-lg">Loading your examination...</div>
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  return (
    <div
      className="min-h-screen bg-slate-950 flex flex-col select-none"
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
    >
      {/* Warning Overlay */}
      {showWarning && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-red-900/90 border border-red-500 rounded-xl p-8 max-w-md text-center shadow-2xl">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-3">Violation Detected</h2>
            <p className="text-red-200 mb-6">{warningMessage}</p>
            {violationCount.current < maxViolations.current && (
              <Button
                onClick={() => { setShowWarning(false); requestFullscreen(); }}
                className="bg-red-600 hover:bg-red-700 text-white px-8"
              >
                I Understand — Continue Exam
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Pause Overlay — shown when admin pauses exam */}
      {paused && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-600 rounded-xl p-8 max-w-md text-center shadow-2xl">
            <PauseCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Exam Paused</h2>
            <p className="text-slate-400 text-sm">
              Your exam has been temporarily paused by the administrator.<br />
              Please wait — the exam will resume shortly.
            </p>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-white font-semibold text-sm">{examData?.title}</h1>
          <p className="text-slate-400 text-xs">
            Q {currentIdx + 1} of {questions.length} &bull; {answeredCount} answered
          </p>
        </div>
        <div className="flex items-center gap-4">
          {tabWarnings > 0 && (
            <div className="flex items-center gap-1 text-yellow-400 text-xs">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{tabWarnings} warning{tabWarnings > 1 ? "s" : ""}</span>
            </div>
          )}
          <div className={`font-mono font-bold text-lg ${timeColor}`}>
            ⏱ {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-slate-800/50 px-4 py-1">
        <Progress value={progressPercent} className="h-1" />
      </div>

      {/* Question Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6">
          {currentQ && (
            <div className="space-y-6">
              {/* Question */}
              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <span className="bg-blue-600 text-white text-sm font-bold rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                    {currentQ.order}
                  </span>
                  <p className="text-white text-base leading-relaxed">{currentQ.question_text}</p>
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
                          ? "bg-blue-600/20 border-blue-500 text-white"
                          : "bg-slate-800/40 border-slate-700 text-slate-300 hover:border-slate-500 hover:bg-slate-700/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "border-blue-400 bg-blue-600" : "border-slate-500"
                        }`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className="text-sm">{opt.text}</span>
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
      <footer className="bg-slate-800 border-t border-slate-700 px-4 py-3 flex items-center justify-between sticky bottom-0">
        <Button
          variant="outline"
          onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
          disabled={currentIdx === 0}
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Previous
        </Button>

        {/* Question dots */}
        <div className="hidden sm:flex gap-1 flex-wrap justify-center max-w-xs">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIdx(i)}
              className={`w-6 h-6 rounded text-xs font-bold transition-all ${
                i === currentIdx
                  ? "bg-blue-600 text-white"
                  : answers[q.id]
                  ? "bg-green-600/70 text-white"
                  : "bg-slate-700 text-slate-400"
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
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 font-bold px-6"
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