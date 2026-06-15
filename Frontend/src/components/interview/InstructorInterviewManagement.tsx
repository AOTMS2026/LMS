/**
 * INSTRUCTOR — INTERVIEW MANAGEMENT PANEL
 * File: Frontend/src/components/interview/InstructorInterviewManagement.tsx
 *
 * Add to InstructorDashboard.tsx sidebar menu:
 *   { id: "interview-management", label: "Interview Management", icon: ClipboardCheck }
 * And render this component when that tab is active.
 */

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Users, FileText,
  Sparkles, RefreshCw, UserPlus, Send, Eye, EyeOff, Key
} from "lucide-react";

// Strip trailing /api if VITE_API_URL already includes it, since this file appends /api paths manually
const _rawBase = import.meta.env.VITE_API_URL || (window.location.hostname === "localhost" ? "http://localhost:5000/api" : "https://loyola-lms.onrender.com/api");
const API_BASE = _rawBase.replace(/\/api$/, '');

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("access_token")}`,
});

// ─────────────────────────────────────────────────────────────────────────────

export default function InstructorInterviewManagement() {
  const [activeTab, setActiveTab] = useState("exams");
  const { toast } = useToast();

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            Interview Management
          </h2>
          <p className="text-slate-500 font-medium text-sm">
            Create exams, manage candidates, generate AI questions
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-11 bg-slate-100/80 border border-slate-200 rounded-xl p-1">
          <TabsTrigger
            value="exams"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-semibold text-slate-500 transition-all"
          >
            <FileText className="w-4 h-4 mr-2" /> Exams
          </TabsTrigger>
          <TabsTrigger
            value="candidates"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-semibold text-slate-500 transition-all"
          >
            <Users className="w-4 h-4 mr-2" /> Candidates
          </TabsTrigger>
          <TabsTrigger
            value="create-candidate"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm font-semibold text-slate-500 transition-all"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Add Candidate
          </TabsTrigger>
        </TabsList>

        <TabsContent value="exams" className="mt-4"><ExamsTab toast={toast} /></TabsContent>
        <TabsContent value="candidates" className="mt-4"><CandidatesTab toast={toast} /></TabsContent>
        <TabsContent value="create-candidate" className="mt-4"><CreateCandidateTab toast={toast} /></TabsContent>
      </Tabs>
    </div>

  );
}

// ─── EXAMS TAB ────────────────────────────────────────────────────────────────

function ExamsTab({ toast }: any) {
  const [exams, setExams] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [form, setForm] = useState({
    title: "", topic: "", difficulty: "medium",
    num_questions: 20, duration_minutes: 60,
    passing_percentage: 50, scheduled_date: "", scheduled_time: ""
  });

  useEffect(() => { fetchExams(); }, []);

  const fetchExams = async () => {
    const res = await fetch(`${API_BASE}/api/interview/exams`, { headers: authHeaders() });
    const data = await res.json();
    if (Array.isArray(data)) setExams(data);
  };

  const fetchQuestions = async (examId: string) => {
    setLoadingQuestions(true);
    const res = await fetch(`${API_BASE}/api/interview/exams/${examId}/questions`, { headers: authHeaders() });
    const data = await res.json();
    setQuestions(Array.isArray(data) ? data : []);
    setLoadingQuestions(false);
  };

  const handleSelectExam = (exam: any) => {
    setSelectedExam(exam);
    fetchQuestions(exam.id || exam._id);
  };

  const createExam = async () => {
    if (!form.title || !form.topic || !form.scheduled_date || !form.scheduled_time) {
      toast({ title: "Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    if (!form.num_questions || form.num_questions < 1) {
      toast({ title: "Error", description: "Number of questions must be at least 1.", variant: "destructive" });
      return;
    }
    if (!form.duration_minutes || form.duration_minutes < 1) {
      toast({ title: "Error", description: "Duration must be at least 1 minute.", variant: "destructive" });
      return;
    }
    const payload = {
      ...form,
      num_questions: Math.max(1, parseInt(String(form.num_questions)) || 10),
      duration_minutes: Math.max(1, parseInt(String(form.duration_minutes)) || 60),
      passing_percentage: Math.min(100, Math.max(0, parseInt(String(form.passing_percentage)) || 50)),
    };
    const res = await fetch(`${API_BASE}/api/interview/exams`, {
      method: "POST", headers: authHeaders(), body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok) {
      toast({ title: "Exam Created", description: data.exam?.title || "Done" });
      setShowCreate(false);
      setForm({ title: "", topic: "", difficulty: "medium", num_questions: 20, duration_minutes: 60, passing_percentage: 50, scheduled_date: "", scheduled_time: "" });
      fetchExams();
    } else {
      const errMsg = data.error || data.message || JSON.stringify(data);
      toast({ title: "Error", description: errMsg, variant: "destructive" });
    }
  };

  const generateAIQuestions = async () => {
    if (!selectedExam) return;
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/api/interview/exams/${selectedExam.id || selectedExam._id}/generate-questions`, {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ topic: selectedExam.topic, count: selectedExam.num_questions, difficulty: selectedExam.difficulty })
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Questions Generated", description: `${data.questions?.length || 0} questions ready` });
        fetchQuestions(selectedExam.id || selectedExam._id);
      } else {
        toast({ title: "Generation Failed", description: data.error, variant: "destructive" });
      }
    } finally {
      setGenerating(false);
    }
  };

  const deleteQuestion = async (qId: string) => {
    if (!confirm("Delete this question?")) return;
    await fetch(`${API_BASE}/api/interview/questions/${qId}`, {
      method: "DELETE", headers: authHeaders()
    });
    fetchQuestions(selectedExam.id || selectedExam._id);
  };

  const deleteExam = async (examId: string) => {
    if (!confirm("Delete this exam and all its questions?")) return;
    await fetch(`${API_BASE}/api/interview/exams/${examId}`, {
      method: "DELETE", headers: authHeaders()
    });
    setSelectedExam(null);
    fetchExams();
  };

  return (
    <div className="space-y-5">
      {/* Create Exam Form */}
      {showCreate ? (
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="pb-4 border-b border-slate-50">
            <CardTitle className="text-slate-900 text-lg font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Create New Exam
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Exam Title *" value={form.title} onChange={v => setForm(f => ({ ...f, title: v }))} placeholder="e.g. React Developer Assessment" />
              <Field label="Topic *" value={form.topic} onChange={v => setForm(f => ({ ...f, topic: v }))} placeholder="e.g. React JS" />
              <div>
                <Label className="text-slate-700 text-sm font-semibold">Difficulty</Label>
                <Select value={form.difficulty} onValueChange={v => setForm(f => ({ ...f, difficulty: v }))}>
                  <SelectTrigger className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-700 mt-1 focus:bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    {["easy", "medium", "hard"].map(d => (
                      <SelectItem key={d} value={d} className="capitalize font-medium">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field label="No. of Questions" value={String(form.num_questions)} onChange={v => setForm(f => ({ ...f, num_questions: Number(v) }))} type="number" min="1" />
              <Field label="Duration (minutes)" value={String(form.duration_minutes)} onChange={v => setForm(f => ({ ...f, duration_minutes: Number(v) }))} type="number" />
              <Field label="Passing Percentage %" value={String(form.passing_percentage)} onChange={v => setForm(f => ({ ...f, passing_percentage: Number(v) }))} type="number" />
              <Field label="Scheduled Date *" value={form.scheduled_date} onChange={v => setForm(f => ({ ...f, scheduled_date: v }))} type="date" />
              <Field label="Scheduled Time *" value={form.scheduled_time} onChange={v => setForm(f => ({ ...f, scheduled_time: v }))} type="time" />
            </div>
            <div className="flex gap-3 pt-1">
              <Button onClick={createExam} className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> Create Exam
              </Button>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="h-10 px-5 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowCreate(true)} className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Create New Exam
        </Button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Exam List */}
        <div className="space-y-3">
          <h3 className="text-slate-700 text-sm font-bold uppercase tracking-wide">
            Your Exams ({exams.length})
          </h3>
          {exams.length === 0 && (
            <div className="text-slate-400 text-sm p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-center">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-500">No exams created yet.</p>
            </div>
          )}
          {exams.map(exam => (
            <div
              key={exam._id || exam.id}
              onClick={() => handleSelectExam(exam)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                selectedExam?.id === exam.id || selectedExam?._id === exam._id
                  ? "border-primary/40 bg-primary/5 shadow-sm"
                  : "border-slate-200 bg-white hover:border-primary/30 hover:bg-slate-50 shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 font-semibold truncate">{exam.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5 font-medium">
                    {exam.topic} · {exam.difficulty} · {exam.num_questions}Q · {exam.duration_minutes}min
                  </p>
                  <p className="text-slate-400 text-xs mt-1">📅 {exam.scheduled_date} at {exam.scheduled_time}</p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <Badge variant="outline" className="text-slate-500 border-slate-200 text-xs bg-slate-50">
                    {exam.question_count || 0} Q
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); deleteExam(exam.id || exam._id); }}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 h-7 w-7 p-0 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Question Panel */}
        {selectedExam && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-slate-700 text-sm font-bold uppercase tracking-wide">
                Questions — {selectedExam.title} ({questions.length})
              </h3>
              <Button
                onClick={generateAIQuestions}
                disabled={generating}
                size="sm"
                className="h-8 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm"
              >
                {generating
                  ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Generating...</>
                  : <><Sparkles className="w-3 h-3 mr-1" /> Generate AI Questions</>
                }
              </Button>
            </div>

            {loadingQuestions && (
              <div className="flex items-center justify-center py-10 text-slate-400 text-sm">
                <div className="h-5 w-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin mr-2" />
                Loading questions...
              </div>
            )}

            {!loadingQuestions && questions.length === 0 && (
              <div className="text-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm font-medium">No questions yet.</p>
                <p className="text-slate-400 text-xs">Click "Generate AI Questions" to auto-generate.</p>
              </div>
            )}

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {questions.map((q, idx) => (
                <div key={q._id || q.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-slate-700 text-sm flex-1 leading-relaxed">
                      <span className="text-slate-400 mr-2 font-semibold">Q{idx + 1}.</span>
                      {q.question_text}
                    </p>
                    <Button size="sm" variant="ghost" onClick={() => deleteQuestion(q._id || q.id)}
                      className="text-red-400 hover:bg-red-50 h-6 w-6 p-0 flex-shrink-0 rounded-lg">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-1.5">
                    {q.options?.map((opt: any, i: number) => (
                      <span key={i} className={`text-xs px-2.5 py-1.5 rounded-lg font-medium ${
                        opt.is_correct
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-50 text-slate-500 border border-slate-200"
                      }`}>
                        {String.fromCharCode(65 + i)}. {opt.text}
                      </span>
                    ))}
                  </div>
                  {q.explanation && (
                    <p className="text-slate-400 text-xs mt-2 italic">💡 {q.explanation}</p>
                  )}
                  <Badge variant="outline" className={`mt-2 text-xs border-0 bg-transparent ${q.source === 'ai' ? 'text-purple-600' : 'text-primary'}`}>
                    {q.source === 'ai' ? '🤖 AI Generated' : '✏️ Manual'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

  );
}

// ─── CANDIDATES TAB ───────────────────────────────────────────────────────────

function CandidatesTab({ toast }: any) {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [assigning, setAssigning] = useState<any>(null);
  const [selectedExamForAssign, setSelectedExamForAssign] = useState("");

  useEffect(() => {
    fetchCandidates();
    fetchExams();
  }, []);

  const fetchCandidates = async () => {
    const res = await fetch(`${API_BASE}/api/interview/candidates`, { headers: authHeaders() });
    const data = await res.json();
    if (Array.isArray(data)) setCandidates(data);
  };

  const fetchExams = async () => {
    const res = await fetch(`${API_BASE}/api/interview/exams`, { headers: authHeaders() });
    const data = await res.json();
    if (Array.isArray(data)) setExams(data);
  };

  const assignToExam = async (candidateId: string) => {
    if (!selectedExamForAssign) {
      toast({ title: "Select an exam first", variant: "destructive" });
      return;
    }
    const res = await fetch(`${API_BASE}/api/interview/exams/${selectedExamForAssign}/assign`, {
      method: "POST", headers: authHeaders(),
      body: JSON.stringify({ candidate_ids: [candidateId] })
    });
    if (res.ok) {
      toast({ title: "Assigned", description: "Candidate assigned to exam" });
      setAssigning(null);
      fetchCandidates();
    }
  };

  const deleteCandidate = async (id: string) => {
    if (!confirm("Delete this candidate account?")) return;
    await fetch(`${API_BASE}/api/interview/candidates/${id}`, {
      method: "DELETE", headers: authHeaders()
    });
    fetchCandidates();
  };

  const STATUS_COLORS: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blocked: "bg-red-50 text-red-600 border-red-200",
    completed: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-slate-700 text-sm font-bold uppercase tracking-wide">
          All Candidates ({candidates.length})
        </h3>
        <Button onClick={fetchCandidates} size="sm" variant="outline" className="h-8 px-3 rounded-xl border-slate-200 text-slate-500 hover:bg-slate-50">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Refresh
        </Button>
      </div>

      {candidates.length === 0 && (
        <div className="text-center p-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No candidates created yet.</p>
          <p className="text-slate-400 text-sm">Use the "Add Candidate" tab to create accounts.</p>
        </div>
      )}

      <div className="space-y-3">
        {candidates.map(c => (
          <div key={c._id || c.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-slate-900 font-semibold">{c.full_name}</p>
                  <Badge className={`text-xs border font-medium ${STATUS_COLORS[c.status] || "bg-slate-100 text-slate-500 border-slate-200"}`}>
                    {c.status}
                  </Badge>
                </div>
                <p className="text-slate-400 text-xs mt-1 font-medium">
                  @{c.username} · {c.email} · {c.mobile_number}
                </p>
                {c.initial_password && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <Key className="w-3 h-3 text-slate-400" />
                    <span className="text-[11px] text-slate-500 font-medium">Password:</span>
                    <span className="text-[11px] font-bold text-slate-800 font-mono">
                      {showPasswords[c._id || c.id] ? c.initial_password : "********"}
                    </span>
                    <button
                      onClick={() => setShowPasswords(prev => ({ ...prev, [c._id || c.id]: !prev[c._id || c.id] }))}
                      className="text-slate-400 hover:text-primary transition-colors"
                    >
                      {showPasswords[c._id || c.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                )}
                {c.exam_title ? (
                  <p className="text-primary text-xs mt-1.5 font-medium">📋 {c.exam_title} · {c.exam_date} {c.exam_time}</p>
                ) : (
                  <p className="text-amber-500 text-xs mt-1.5 font-medium">⚠️ No exam assigned</p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="outline" onClick={() => setAssigning(c._id || c.id)}
                  className="h-8 px-3 rounded-xl border-primary/30 text-primary hover:bg-primary/5 text-xs font-semibold">
                  <Send className="w-3 h-3 mr-1.5" /> Assign
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteCandidate(c._id || c.id)}
                  className="text-red-400 hover:bg-red-50 hover:text-red-600 h-8 w-8 p-0 rounded-xl">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Inline assign panel */}
            {assigning === (c._id || c.id) && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2 items-center">
                <Select value={selectedExamForAssign} onValueChange={setSelectedExamForAssign}>
                  <SelectTrigger className="h-9 rounded-xl bg-slate-50 border-slate-200 text-slate-700 text-xs flex-1 focus:bg-white">
                    <SelectValue placeholder="Select exam..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200">
                    {exams.map(e => (
                      <SelectItem key={e._id || e.id} value={e._id || e.id} className="text-xs font-medium">
                        {e.title} — {e.scheduled_date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={() => assignToExam(c._id || c.id)} className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-semibold">
                  Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAssigning(null)} className="h-9 px-3 rounded-xl text-slate-400 text-xs">
                  Cancel
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>

  );
}

// ─── CREATE CANDIDATE TAB ─────────────────────────────────────────────────────

function CreateCandidateTab({ toast }: any) {
  const [exams, setExams] = React.useState<any[]>([]);
  const [bulkFile, setBulkFile] = React.useState<File | null>(null);
  const [bulkExamId, setBulkExamId] = React.useState('');
  const [bulkResult, setBulkResult] = React.useState<{created: number, failed: number, users?: {name:string,email:string,username:string,password:string}[]} | null>(null);
  const [bulkLoading, setBulkLoading] = React.useState(false);
  const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

  React.useEffect(() => {
    const token = localStorage.getItem('access_token');
    fetch(`${API_BASE}/api/interview/exams`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { if (Array.isArray(data)) setExams(data); }).catch(() => {});
  }, []);

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">📊</span>
          <div>
            <h3 className="text-lg font-black text-slate-900">Bulk Upload Candidates</h3>
            <p className="text-xs text-slate-400">Upload CSV with columns: <b>Name, Email, Mobile</b>. Usernames and passwords are auto-generated and emailed. Works for single or multiple candidates.</p>
          </div>
        </div>

        <a
          href={"data:text/csv;charset=utf-8,Name,Email,Mobile%0AMahesh%20Choudare,maheshchoudare21%40gmail.com,9999999999%0ASwathi%20Raguthu,swathiraguthu%40gmail.com,9999999998%0AStudent,23hp1a0549%40gmail.com,9999999997"}
          download="candidates_template.csv"
          className="inline-flex items-center gap-2 text-xs font-bold text-primary border border-primary/20 px-3 py-1.5 rounded-lg hover:bg-primary/5"
        >⬇️ Download Template CSV (Name, Email, Mobile)</a>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-700 uppercase tracking-widest">Assign Exam (Optional)</label>
          <select value={bulkExamId} onChange={e => setBulkExamId(e.target.value)} className="w-full h-10 border border-slate-200 rounded-xl px-3 text-sm bg-white">
            <option value="">Select exam to assign...</option>
            {exams.map((ex: any) => <option key={ex.id || ex._id} value={ex.id || ex._id}>{ex.title}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-700 uppercase tracking-widest">Upload CSV File</label>
          <input type="file" accept=".csv" onChange={e => setBulkFile(e.target.files?.[0] || null)} className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white" />
          <p className="text-[10px] text-slate-400">For a single candidate, add just one row to the CSV.</p>
        </div>

        <button
          disabled={!bulkFile || bulkLoading}
          onClick={async () => {
            if (!bulkFile) return;
            setBulkLoading(true); setBulkResult(null);
            try {
              const text = await bulkFile.text();
              const rows = text.split('\n').slice(1).filter(r => r.trim());
              const candidates = rows.map(r => {
                const c = r.split(',');
                return { name: c[0]?.trim(), email: c[1]?.trim(), mobile: c[2]?.trim() };
              }).filter((c: any) => c.name && c.email);

              if (candidates.length === 0) { alert('No valid candidates found. Check Name and Email columns.'); setBulkLoading(false); return; }

              const token = localStorage.getItem('access_token');
              const res = await fetch(`${API_BASE}/api/interview/candidates/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ candidates, examId: bulkExamId || undefined })
              });
              const data = await res.json();
              setBulkResult(data);
              if (data.created > 0) toast({ title: `✅ Created ${data.created} candidate(s)`, description: 'Credentials emailed to each candidate.' });
            } catch (e) { alert('Upload failed: ' + (e as Error).message); } finally { setBulkLoading(false); }
          }}
          className="w-full h-11 rounded-xl bg-primary text-white font-black text-sm disabled:opacity-50 cursor-pointer hover:bg-primary/90 transition-colors"
        >{bulkLoading ? '⏳ Processing...' : '🚀 Upload & Create Accounts'}</button>

        {bulkResult && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
            <p className="font-black text-green-700">✅ Created: {bulkResult.created} &nbsp; ❌ Failed: {bulkResult.failed}</p>
            {bulkResult.users && bulkResult.users.length > 0 && (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead><tr className="bg-green-100"><th className="p-2 text-left">Name</th><th className="p-2 text-left">Email</th><th className="p-2 text-left">Username</th><th className="p-2 text-left">Password</th></tr></thead>
                    <tbody>{bulkResult.users.map((u, i) => <tr key={i} className="border-t border-green-100"><td className="p-2">{u.name}</td><td className="p-2">{u.email}</td><td className="p-2 font-mono font-bold">{u.username}</td><td className="p-2 font-mono font-bold">{u.password}</td></tr>)}</tbody>
                  </table>
                </div>
                <button onClick={() => {
                  const csv = ['Name,Email,Username,Password', ...(bulkResult.users||[]).map(u=>`${u.name},${u.email},${u.username},${u.password}`)].join('\n');
                  const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv); a.download = 'credentials.csv'; a.click();
                }} className="w-full h-9 rounded-xl border border-green-400 text-green-700 font-bold text-xs cursor-pointer bg-white hover:bg-green-50">⬇️ Export Credentials CSV</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SHARED HELPER ─────────────────────────────────────────────────────────────

function Field({ label, value, onChange, type = "text", placeholder = "", min }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; min?: string;
}) {
  return (
    <div>
      <Label className="text-slate-700 text-sm font-semibold">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        className="h-10 rounded-xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 mt-1 focus:bg-white transition-all"
      />
    </div>

  );
}