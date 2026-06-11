/**
 * useInterviewSocket — Custom hook for Interview Exam real-time events
 * File: Frontend/src/hooks/useInterviewSocket.ts
 *
 * Used inside InterviewExamEngine.tsx to listen for admin control events
 * (pause, resume, force_submit, block) pushed from the server in real time.
 */

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" ? "http://localhost:5000" : "https://loyola-lms.onrender.com");

interface ControlEvent {
  action: string;
  attempt_id: string;
  candidate_id: string;
}

interface UseInterviewSocketOptions {
  candidateId: string | null;
  onPause?: () => void;
  onResume?: () => void;
  onForceSubmit?: () => void;
  onBlock?: () => void;
}

export function useInterviewSocket({
  candidateId,
  onPause,
  onResume,
  onForceSubmit,
  onBlock,
}: UseInterviewSocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!candidateId) return;

    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    // Join candidate-specific room so admin controls reach only this candidate
    socket.on("connect", () => {
      socket.emit("interview_candidate_join", candidateId);
      console.log("[InterviewSocket] Connected and joined room:", `interview_candidate_${candidateId}`);
    });

    socket.on("interview_exam_paused", (data: ControlEvent) => {
      console.log("[InterviewSocket] Exam paused by admin");
      onPause?.();
    });

    socket.on("interview_exam_resumed", (data: ControlEvent) => {
      console.log("[InterviewSocket] Exam resumed by admin");
      onResume?.();
    });

    socket.on("interview_exam_force_submitted", (data: ControlEvent) => {
      console.log("[InterviewSocket] Force submitted by admin");
      onForceSubmit?.();
    });

    socket.on("interview_candidate_blocked", (data: ControlEvent) => {
      console.log("[InterviewSocket] Candidate blocked by admin");
      onBlock?.();
    });

    socket.on("disconnect", () => {
      console.log("[InterviewSocket] Disconnected");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [candidateId]);

  // Send heartbeat to keep admin monitor updated
  const sendHeartbeat = useCallback((attemptId: string, answersCount: number) => {
    socketRef.current?.emit("interview_heartbeat", {
      attempt_id: attemptId,
      candidate_id: candidateId,
      answers_count: answersCount,
    });
  }, [candidateId]);

  return { sendHeartbeat };
}