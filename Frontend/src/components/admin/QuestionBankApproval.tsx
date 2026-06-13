import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { fetchWithAuth } from '@/lib/api';
import { Loader2, CheckCircle, XCircle, FileText, AlertCircle, LayoutGrid, Clock, History, Eye, Users, UserPlus, Trash2, ShieldCheck, BrainCircuit, RefreshCw, Award, Calendar, User, BookOpen, ArrowRight, ShieldAlert, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useCourses } from '@/hooks/useManagerData';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { SyncDataButton } from "./data/SyncDataButton";

interface PendingQuestionBank {
    topic: string;
    count: number;
    created_by: string;
    created_at: string;
    assigned_image?: string | null;
    duration?: number;
    total_marks?: number;
    shuffle?: boolean;
    retakes?: number;
    custom_fields?: { label: string; value: string }[];
}

interface StudentAccess {
    student_id: string;
    id?: string;
    student_name: string;
    student_email: string;
    student_avatar: string;
    assigned_by: string;
    granted_at: string;
    scheduled_date?: string;
    department?: string;
    reg_date?: string;
}

interface BatchStudentResponse {
    student_id?: string;
    id?: string;
    student_name?: string;
    student_email?: string;
    department?: string;
    profile?: {
        full_name?: string;
        email?: string;
        avatar_url?: string;
        department?: string;
    };
}

interface Student {
    id: string;
    full_name: string;
    email: string;
    department?: string;
    avatar_url?: string;
    profile?: {
        full_name?: string;
        email?: string;
        avatar_url?: string;
        department?: string;
    };
    student_name?: string;
    student_email?: string;
    student_id?: string;
    user_id?: string;
}

interface QuestionBankResponse {
    topic: string;
    approval_status: string;
    created_by: string;
    created_at: string;
    question_text?: string;
}

interface Question {
    id?: string;
    question_text: string;
    type: string;
    difficulty: string;
    options?: unknown;
    correct_answer?: unknown;
    topic: string;
}

interface Teacher {
    user_id: string;
    id?: string;
    full_name: string;
}

interface Batch {
    id: string;
    _id?: string;
    batch_name: string;
    batch_type: string;
    instructor_id: string;
    instructor?: string | { _id?: string; id?: string; full_name?: string };
    instructor_name?: string;
    student_count: number;
    start_time?: string;
    end_time?: string;
}

const API_URL = import.meta.env.VITE_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000/api' : 'https://loyola-lms.onrender.com/api');

interface QuestionBankApprovalProps {
    onSync?: () => void;
    loading?: boolean;
    mode?: string;
}

export function QuestionBankApproval({ onSync, loading: externalLoading, mode }: QuestionBankApprovalProps) {
    const getImageSrc = (path?: string | null) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        // In the student portal it uses /s3/public/
        return `${API_URL}/s3/public/${path}`;
    };
    const [internalLoading, setInternalLoading] = useState(true);
    const loading = externalLoading || internalLoading;
    const [processing, setProcessing] = useState<string | null>(null);
    const { toast } = useToast();

    const [showCourseDialog, setShowCourseDialog] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const { data: courses } = useCourses();
    const [approvedBanks, setApprovedBanks] = useState<PendingQuestionBank[]>([]);
    const [pendingBanks, setPendingBanks] = useState<PendingQuestionBank[]>([]);

    const [showAccessDialog, setShowAccessDialog] = useState(false);
    const [accessingTopic, setAccessingTopic] = useState<string | null>(null);
    const [accessList, setAccessList] = useState<StudentAccess[]>([]);
    const [loadingAccess, setLoadingAccess] = useState(false);
    const [accessCount, setAccessCount] = useState<Record<string, number>>({});

    const [showRemoveDialog, setShowRemoveDialog] = useState(false);
    const [removingTopic, setRemovingTopic] = useState<string | null>(null);

    const [showGrantDialog, setShowGrantDialog] = useState(false);
    const [grantingTopic, setGrantingTopic] = useState<string | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [isGranting, setIsGranting] = useState(false);

    const [grantType, setGrantType] = useState<'student' | 'batch' | 'dept'>('student');
    const [batches, setBatches] = useState<Batch[]>([]);
    const [selectedBatchId, setSelectedBatchId] = useState("");
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [instructors, setInstructors] = useState<Teacher[]>([]);
    const [selectedInstructorId, setSelectedInstructorId] = useState("all");
    const [selectedBatchTypeFilter, setSelectedBatchTypeFilter] = useState("all");
    const [batchStudents, setBatchStudents] = useState<Student[]>([]);
    const [loadingBatchStudents, setLoadingBatchStudents] = useState(false);
    
    // College Wise Grant
    const [selectedDept, setSelectedDept] = useState<string>("all");
    const [selectedDeptStudents, setSelectedDeptStudents] = useState<string[]>([]);

    const fetchPendingBanks = async (showLoading = true, showToast = false) => {
        try {
            if (showLoading && approvedBanks.length === 0) setInternalLoading(true);

            const summary = await fetchWithAuth('/admin/question-bank-summary') as (PendingQuestionBank & { approval_status: string, access_count: number })[];

            setApprovedBanks(summary);
            setPendingBanks([]);

            const counts: Record<string, number> = {};
            summary.forEach(s => {
                counts[s.topic] = s.access_count || 0;
            });
            setAccessCount(counts);
            if (showToast) {
                toast({ title: "Repository Synced", description: "Question bank data has been updated." });
            }
        } catch (err) {
            console.error('Failed to fetch question banks summary', err);
        } finally {
            setInternalLoading(false);
        }
    };

    const handleApproveBank = async (topic: string) => {
        try {
            setProcessing(topic);
            await fetchWithAuth(`/admin/question-bank/${encodeURIComponent(topic)}/approve`, {
                method: 'PUT'
            });
            toast({ title: "Protocol Initiated", description: `Topic ${topic} is now verified and ready for distribution.` });
            fetchPendingBanks(false);
        } catch (err) {
            toast({
                title: 'Approval Error',
                description: err instanceof Error ? err.message : 'System could not verify repository node',
                variant: 'destructive'
            });
        } finally {
            setProcessing(null);
        }
    };

    useEffect(() => {
        fetchPendingBanks();
        fetchStudents();
        fetchInstructors();
        const interval = setInterval(() => fetchPendingBanks(), 15000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (selectedBatchId && grantType === 'batch') {
            fetchBatchStudents(selectedBatchId);
        } else {
            setBatchStudents([]);
        }
    }, [selectedBatchId, grantType]);

    const fetchBatchStudents = async (batchId: string) => {
        setLoadingBatchStudents(true);
        try {
            const data = await fetchWithAuth(`/batches/${batchId}/students`) as BatchStudentResponse[];
            // Map the enrollment data to Student format
            const studentsList: Student[] = data.map(item => ({
                id: item.student_id || item.id,
                full_name: item.profile?.full_name || item.student_name || 'Anonymous',
                email: item.profile?.email || item.student_email || 'No email',
                avatar_url: item.profile?.avatar_url
            }));
            setBatchStudents(studentsList || []);
        } catch (err) {
            console.error('Failed to fetch batch students', err);
            setBatchStudents([]);
        } finally {
            setLoadingBatchStudents(false);
        }
    };

    const fetchInstructors = async () => {
        try {
            const data = await fetchWithAuth('/admin/instructors') as Teacher[];
            // Ensure every instructor has a string ID for React/Radix selection
            const sanitized = (data || []).map(inst => ({
                ...inst,
                id: (inst.user_id)?.toString()
            }));
            setInstructors(sanitized);
        } catch (err) {
            console.error('Failed to fetch instructors', err);
        }
    };

    const fetchStudents = async () => {
        setLoadingStudents(true);
        try {
            const res = await fetchWithAuth('/admin/students') as Student[];
            setStudents(res || []);
        } catch (err) {
            console.error('Failed to fetch students', err);
        } finally {
            setLoadingStudents(false);
        }
    };

    const [viewingQuestions, setViewingQuestions] = useState<string | null>(null);
    const [questionsList, setQuestionsList] = useState<Question[]>([]);
    const [loadingQuestions, setLoadingQuestions] = useState(false);

    const handlePreviewQuestions = async (topic: string) => {
        setViewingQuestions(topic);
        setLoadingQuestions(true);
        try {
            const res = await fetchWithAuth(`/data/question_bank?topic=${encodeURIComponent(topic)}`) as Question[];
            setQuestionsList(Array.isArray(res) ? res : []);
        } catch (err) {
            console.error('Failed to fetch questions preview', err);
        } finally {
            setLoadingQuestions(false);
        }
    };

    const handleRemoveClick = (topic: string) => {
        setRemovingTopic(topic);
        setShowRemoveDialog(true);
    };

    const confirmRemove = async () => {
        if (!removingTopic) return;
        try {
            setProcessing(removingTopic);
            await fetchWithAuth(`/admin/question-bank/${encodeURIComponent(removingTopic)}`, {
                method: 'DELETE'
            });

            toast({
                title: "Question Bank Removed",
                description: `Successfully removed topic: ${removingTopic}`
            });

            setApprovedBanks(prev => prev.filter(b => b.topic !== removingTopic));
            fetchPendingBanks(false);
        } catch (err) {
            toast({
                title: 'Remove Failed',
                description: err instanceof Error ? err.message : 'Failed to remove question bank',
                variant: 'destructive'
            });
        } finally {
            setProcessing(null);
            setRemovingTopic(null);
            setShowRemoveDialog(false);
        }
    };

    const handleViewAccess = async (topic: string) => {
        setAccessingTopic(topic);
        setShowAccessDialog(true);
        setLoadingAccess(true);
        try {
            const res = await fetchWithAuth(`/admin/question-bank/${encodeURIComponent(topic)}/access-list`) as { students: StudentAccess[] };
            setAccessList(res?.students || []);
        } catch (err) {
            console.error('Failed to fetch access list', err);
            setAccessList([]);
            toast({
                title: 'Error',
                description: 'Failed to load student access list',
                variant: 'destructive'
            });
        } finally {
            setLoadingAccess(false);
        }
    };

    const handleRevokeAccess = async (studentId: string) => {
        if (!accessingTopic) return;
        try {
            await fetchWithAuth(`/admin/question-bank/${encodeURIComponent(accessingTopic)}/revoke-access/${studentId}`, {
                method: 'DELETE'
            });
            toast({
                title: "Access Revoked",
                description: "Student will no longer see this mock test in their portal."
            });
            // Refresh list
            setAccessList(prev => prev.filter(s => (s.student_id?.toString() || s.id?.toString()) !== studentId));
            fetchPendingBanks(false);
        } catch (err) {
            toast({
                title: "Revocation Failed",
                description: err instanceof Error ? err.message : "Could not remove student access",
                variant: "destructive"
            });
        }
    };

    const handleGrantAccessClick = async (topic: string) => {
        setGrantingTopic(topic);
        setGrantType('student');
        setSelectedStudentId("");
        setSelectedBatchId("");
        setSelectedInstructorId("all");
        setSelectedBatchTypeFilter("all");
        setSelectedDept("all");
        setSelectedDeptStudents([]);
        setShowGrantDialog(true);
        setLoadingBatches(true);
        try {
            // "REMOVE CONCEPT" of course-matching: Just fetch all active batches 
            // and let the user filter by instructor/schedule manually.
            const batchData = await fetchWithAuth('/batches') as Batch[];
            setBatches(batchData || []);
        } catch (err) {
            console.error('Failed to fetch batches:', err);
        } finally {
            setLoadingBatches(false);
        }
    };

    const filteredBatches = useMemo(() => {
        if (!batches || batches.length === 0) return [];

        const filtered = batches.filter(b => {
            const inst = b.instructor;
            const batchInstructorId = (b.instructor_id || (typeof inst === 'object' ? (inst?._id || inst?.id) : inst))?.toString();

            const matchesInstructor = selectedInstructorId === 'all' || batchInstructorId === selectedInstructorId;
            const matchesType = selectedBatchTypeFilter === 'all' || b.batch_type === selectedBatchTypeFilter;

            return matchesInstructor && matchesType;
        });

        // "REMOVE CONCEPT" of empty states: If filtering returns nothing but we have batches, 
        // fallback to just showing all batches so the user can actually select something.
        return filtered.length > 0 ? filtered : batches;
    }, [batches, selectedInstructorId, selectedBatchTypeFilter]);

    const handleGrantAccess = async () => {
        if (!grantingTopic) return;
        // Determine grant type from what user actually selected
        if (selectedStudentId) setGrantType('student');
        else if (selectedBatchId && selectedBatchId !== 'all') setGrantType('batch');
        else if (selectedDeptStudents.length === 0) return;
        const resolvedType = selectedStudentId ? 'student' : (selectedBatchId && selectedBatchId !== 'all') ? 'batch' : 'dept';
        if (resolvedType === 'student' && !selectedStudentId) return;
        if (resolvedType === 'batch' && !selectedBatchId) return;
        if (resolvedType === 'dept' && selectedDeptStudents.length === 0) return;

        setIsGranting(true);
        try {
            await fetchWithAuth('/admin/question-bank/grant-access', {
                method: 'POST',
                body: JSON.stringify({
                    topic: grantingTopic,
                    userId: selectedStudentId || undefined,
                    userIds: (!selectedStudentId && (!selectedBatchId || selectedBatchId === 'all')) ? selectedDeptStudents : undefined,
                    batchId: (!selectedStudentId && selectedBatchId && selectedBatchId !== 'all') ? selectedBatchId : undefined,
                    type: selectedStudentId ? 'student' : (selectedBatchId && selectedBatchId !== 'all') ? 'batch' : 'dept'
                })
            });

            toast({
                title: grantType === 'batch' ? 'Batch Access Granted! 🚀' : 
                       grantType === 'dept' ? `College Access Granted for ${selectedDeptStudents.length} Students! 🚀` :
                       'Access Granted! 🚀',
                description: grantType === 'batch'
                    ? `All students in the selected batch now have access to ${grantingTopic}`
                    : grantType === 'dept'
                    ? `Selected students from ${selectedDept} now have access to ${grantingTopic}`
                    : `Student now has access to mock tests for ${grantingTopic}`
            });

            setShowGrantDialog(false);
            setGrantingTopic(null);
            setSelectedStudentId("");
            setSelectedBatchId("");
            setSelectedDept("all");
            setSelectedDeptStudents([]);
            fetchPendingBanks(false);
        } catch (err) {
            toast({
                title: 'Grant Failed',
                description: err instanceof Error ? err.message : 'Something went wrong',
                variant: 'destructive'
            });
        } finally {
            setIsGranting(false);
        }
    };

    if (loading && approvedBanks.length === 0) {
        return (
            <div className="py-24 text-center">
                <div className="relative inline-block">
                    <div className="h-20 w-20 rounded-full border-4 border-slate-100 animate-[spin_3s_linear_infinite]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    </div>
                </div>
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.3em] mt-6 animate-pulse">Running Integrity Audit...</h4>
            </div>
        );
    }


    return (
        <div className="pb-12 animate-in fade-in duration-700">
            {/* Premium Banner Header */}
            <div className="relative overflow-hidden rounded-[3rem] sm:p-12 text-white shadow-2xl shadow-slate-200">

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">

                            <div className="space-y-1">
                                <Badge className=" hover:bg-blue-500 text-white border-none px-3 py-0.5 text-[10px] font-black uppercase tracking-widest rounded-full">
                                    Administrative Hub
                                </Badge>
                                <h1 className="text-4xl sm:text-5xl font-black tracking-tighter uppercase italic leading-none text-slate-900">
                                    Question <span className="text-blue-400 not-italic">Access</span>
                                </h1>
                            </div>
                        </div>

                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Protocols</p>
                            <p className="text-4xl font-black text-slate-900 italic">{approvedBanks.length}</p>
                        </div>
                        <SyncDataButton 
                            onSync={() => {
                                if (onSync) onSync();
                                fetchPendingBanks(true, true);
                            }} 
                            isLoading={loading} 
                            className="h-14 px-8 shadow-2xl shadow-blue-500/20 rounded-2xl bg-slate-900/10 hover:bg-slate-900/20 border-white/20 text-slate-900"
                        />
                    </div>
                </div>
            </div>


            <div className="mt-12 space-y-6">
                    {approvedBanks.length === 0 ? (
                        <Card className="border-2 border-dashed border-slate-300 bg-slate-50/50 rounded-[2rem]">
                            <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                <div className="h-20 w-20 rounded-full bg-white flex items-center justify-center shadow-inner border border-slate-100">
                                    <LayoutGrid className="h-10 w-10 text-slate-900/20" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xl font-bold text-slate-900 italic uppercase">No Content Available</p>
                                    <p className="text-sm font-medium text-slate-500 max-w-sm uppercase tracking-widest text-[10px]">Approve an exam in scheduling to see it here.</p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-6">
                    {approvedBanks.map((bank) => (
                        <Card key={bank.topic} className="group overflow-hidden border-none shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-700 rounded-[3rem] bg-white relative">
                            {/* Animated Background Decor */}
                            <div className="absolute top-0 right-0 -mr-24 -mt-24 h-64 w-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-700" />
                            
                            <CardContent className="p-0 relative z-10">
                                <div className="flex flex-col lg:flex-row items-stretch">
                                    {/* Image/Poster Side */}
                                    <div className="relative w-full lg:w-[340px] h-[220px] lg:h-auto overflow-hidden shrink-0">
                                        {getImageSrc(bank.assigned_image) ? (
                                            <>
                                                <img 
                                                    src={getImageSrc(bank.assigned_image)!} 
                                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                                                    alt={bank.topic}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
                                            </>
                                        ) : (
                                            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950 flex flex-col items-center justify-center p-6 text-center">
                                                <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-4 shadow-2xl">
                                                    <BrainCircuit className="h-8 w-8 text-primary" />
                                                </div>
                                                <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.3em]">Module Repository</p>
                                            </div>
                                        )}

                                        {/* Questions Count Badge */}
                                        <div className="absolute top-6 left-6">
                                            <div className="px-4 py-2 bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center gap-2 group/badge transition-all hover:bg-primary hover:border-primary/50">
                                                <FileText className="h-3.5 w-3.5 text-primary group-hover/badge:text-white transition-colors" />
                                                <span className="text-[11px] font-black text-white uppercase tracking-wider">{bank.count} <span className="text-white/60 font-medium">Questions</span></span>
                                            </div>
                                        </div>

                                        {/* Status Indicators overlaying the image on mobile, or bottom left */}
                                        <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                                            <Badge className="bg-emerald-500 text-white border-none px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-500/20">
                                                Verified & Ready
                                            </Badge>
                                            <div className="h-10 w-10 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center shadow-lg">
                                                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Side */}
                                    <div className="flex-1 p-8 sm:p-10 flex flex-col justify-between min-w-0">
                                        <div className="space-y-6">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">Topic Repository</span>
                                                </div>
                                                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none truncate group-hover:text-primary transition-colors duration-300">
                                                    {bank.topic}
                                                </h3>
                                            </div>

                                            {/* Meta Tags Grid */}
                                            <div className="flex flex-wrap items-center gap-3">
                                                {[
                                                    { icon: Clock, label: `${bank.duration || 60}m`, color: "text-slate-900", bg: "bg-slate-100", border: "border-slate-200" },
                                                    { icon: Award, label: `${bank.total_marks || 0} Total Marks`, color: "text-slate-900", bg: "bg-slate-100", border: "border-slate-200" },
                                                    { icon: RefreshCw, label: `Shuffle: ${bank.shuffle ? 'ON' : 'OFF'}`, color: "text-slate-900", bg: "bg-slate-100", border: "border-slate-200" }
                                                ].map((tag, i) => (
                                                    <div key={i} className={cn("flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all hover:scale-105 duration-300", tag.bg, tag.border)}>
                                                        <tag.icon className={cn("h-4 w-4", tag.color)} />
                                                        <span className="text-[11px] font-extrabold text-slate-900 uppercase tracking-tight">{tag.label}</span>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Access Summary */}
                                            <div className="pt-6 border-t border-slate-900">
                                                <div 
                                                    onClick={() => handleViewAccess(bank.topic)}
                                                    className="inline-flex items-center gap-3 px-5 py-2.5 bg-slate-900 text-white rounded-2xl cursor-pointer hover:bg-primary transition-all duration-500 group/access shadow-lg shadow-slate-900/10"
                                                >
                                                    <div className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center">
                                                        <Users className="h-3.5 w-3.5 text-primary group-hover/access:text-white transition-colors" />
                                                    </div>
                                                    <span className="text-[11px] font-black uppercase tracking-[0.1em]">
                                                        {accessCount[bank.topic] || 0} Students Access Granted
                                                    </span>
                                                    <ArrowRight className="h-4 w-4 ml-1 opacity-0 -translate-x-2 group-hover/access:opacity-100 group-hover/access:translate-x-0 transition-all duration-300" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions Section */}
                                    <div className="p-8 lg:p-10 lg:bg-slate-50/50 flex flex-row lg:flex-col items-center justify-center gap-6 lg:border-l border-slate-100 shrink-0 min-w-0 lg:min-w-[260px] relative">
                                        <div className="flex flex-col w-full gap-3 items-center">
                                            <Button
                                                onClick={() => handlePreviewQuestions(bank.topic)}
                                                variant="outline"
                                                className="w-full h-14 rounded-2xl border-2 border-slate-200 bg-white text-slate-800 hover:border-primary hover:text-primary font-black text-[11px] uppercase tracking-[0.2em] shadow-sm transition-all"
                                            >
                                                <Eye className="h-4 w-4 mr-3" />
                                                View Test
                                            </Button>
                                            <Button
                                                onClick={() => handleGrantAccessClick(bank.topic)}
                                                className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-primary/25 transition-all active:scale-95 flex items-center justify-center"
                                            >
                                                <UserPlus className="h-4.5 w-4.5 mr-3" />
                                                Grant Access
                                            </Button>
                                        </div>

                                        <div className="hidden lg:flex items-center gap-3 w-full px-2">
                                            <div className="h-px flex-1 bg-slate-900" />
                                            <span className="text-[8px] font-black text-slate-900 uppercase tracking-widest leading-none">Options</span>
                                            <div className="h-px flex-1 bg-slate-900" />
                                        </div>

                                        <Button
                                            variant="ghost"
                                            onClick={() => handleRemoveClick(bank.topic)}
                                            disabled={!!processing}
                                            className="h-14 w-14 rounded-2xl text-slate-900 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100 flex items-center justify-center"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
            </div>

            {/* Student Access Dialog */}
            <Dialog open={showAccessDialog} onOpenChange={setShowAccessDialog}>
                <DialogContent className="w-[95vw] sm:max-w-[600px] rounded-[2.5rem] sm:rounded-[2rem] p-0 overflow-y-auto max-h-[90vh] border-none shadow-2xl flex flex-col">
                    <div className="bg-primary p-8 text-white relative">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

                        <div className="h-16 w-16 bg-white/20 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center mb-6 border border-white/30 shadow-xl relative z-10">
                            <Users className="h-8 w-8 text-white" />
                        </div>
                        <DialogTitle className="text-2xl font-black tracking-tight relative z-10">Student Access List</DialogTitle>
                        <DialogDescription className="text-white/80 mt-2 font-medium relative z-10">
                            Students with access to <span className="text-white underline underline-offset-4 decoration-2">{accessingTopic}</span>
                        </DialogDescription>
                    </div>

                    <div className="p-6 bg-white flex-1 overflow-y-auto">
                        {loadingAccess ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : accessList.length === 0 ? (
                            <div className="text-center py-12 space-y-3">
                                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                                    <Users className="h-8 w-8 text-slate-300" />
                                </div>
                                <p className="text-slate-600 font-semibold">No students have accessed this question bank yet.</p>
                                <p className="text-slate-400 text-sm">Students will appear here once granted access.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {accessList.map((student, idx) => (
                                    <div key={student.student_id || idx} className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={student.student_avatar} />
                                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                                {student.student_name?.charAt(0)?.toUpperCase() || 'S'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-900 truncate uppercase text-[11px] tracking-tight">{student.student_name}</p>
                                            <p className="text-[10px] text-slate-500 truncate lowercase font-medium">{student.student_email}</p>
                                            {student.department && (
                                                <p className="text-[9px] font-black text-primary uppercase mt-1 line-clamp-1 italic">
                                                    {student.department}
                                                </p>
                                            )}
                                            {student.reg_date && (
                                                <p className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter">
                                                    Member Since: {student.reg_date}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-right">
                                                <p className="text-xs text-slate-500">Granted by</p>
                                                <p className="text-sm font-semibold text-slate-700">{student.assigned_by}</p>
                                                <p className="text-xs text-slate-400">
                                                    Created: {new Date(student.granted_at).toLocaleDateString()}
                                                </p>
                                                {student.scheduled_date && (
                                                    <p className="text-[10px] font-black text-primary uppercase mt-1">
                                                        Go-Live: {new Date(student.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                    </p>
                                                )}
                                            </div>
                                            {student.assigned_by !== 'Course Enrollment' && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRevokeAccess(student.student_id?.toString() || idx.toString())}
                                                    className="h-10 w-10 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all ml-2"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-100">
                        <p className="text-sm font-bold text-slate-600 text-center">
                            Total: {accessList.length} student{accessList.length !== 1 ? 's' : ''} accessed
                        </p>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
                <DialogContent className="w-[95vw] sm:max-w-[400px] rounded-[2.5rem] sm:rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
                    <div className="bg-red-500 p-8 text-white relative">
                        <div className="h-16 w-16 bg-white/20 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center mb-6 border border-white/30 shadow-xl relative z-10">
                            <Trash2 className="h-8 w-8 text-white" />
                        </div>
                        <DialogTitle className="text-2xl font-black tracking-tight relative z-10">Remove Question Bank?</DialogTitle>
                        <DialogDescription className="text-white/80 mt-2 font-medium relative z-10">
                            Are you sure you want to remove <span className="text-white font-bold">{removingTopic}</span> from the library?
                        </DialogDescription>
                    </div>

                    <div className="p-6 bg-white space-y-4">
                        <p className="text-sm text-center font-bold text-red-600">
                            This action will PERMANENTLY remove this Repository and all associated Scheduled Exams from the Database. Students will lose access immediately.
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setShowRemoveDialog(false)}
                                className="flex-1 h-12 rounded-xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={confirmRemove}
                                className="flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white shadow-lg font-bold"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={!!viewingQuestions} onOpenChange={(v) => !v && setViewingQuestions(null)}>
                <DialogContent className="w-[95vw] sm:max-w-3xl overflow-hidden p-0 border-none shadow-2xl rounded-2xl sm:rounded-[2rem] bg-white flex flex-col max-h-[90vh]">
                    <div className="bg-white p-6 md:p-8 border-b border-slate-100 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-200 shadow-sm shrink-0">
                                <BrainCircuit className="h-8 w-8 text-slate-800" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black text-slate-900">{viewingQuestions}</DialogTitle>
                                <DialogDescription className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Repository Content Inspection</DialogDescription>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 md:p-8 flex flex-col flex-1 overflow-hidden min-h-0">
                        {loadingQuestions ? (
                            <div className="flex-1 py-16 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Analyzing Logic Streams...</p>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 scroll-smooth min-h-0">
                                {questionsList.length === 0 ? (
                                    <div className="py-20 text-center text-slate-400 italic">No questions found in this repository.</div>
                                ) : (
                                    questionsList.map((q, idx) => (
                                        <div key={q.id || idx} className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex gap-5 hover:bg-white hover:border-primary/20 hover:shadow-lg transition-all duration-300">
                                            <div className="h-8 w-8 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 border border-slate-200">
                                                <span className="text-[10px] font-black text-slate-400">{idx + 1}</span>
                                            </div>
                                            <div className="space-y-3 flex-1">
                                                <p className="text-sm font-bold text-slate-800 leading-relaxed">{q.question_text}</p>
                                                <div className="flex items-center gap-3">
                                                    <Badge variant="secondary" className="bg-white text-slate-500 border border-slate-100 font-bold text-[9px] uppercase px-2 py-0.5">
                                                        {q.type}
                                                    </Badge>
                                                    <Badge variant="secondary" className="bg-white text-slate-500 border border-slate-100 font-bold text-[9px] uppercase px-2 py-0.5">
                                                        {q.difficulty}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                        <div className="flex justify-end mt-6 border-t border-slate-100 pt-6 shrink-0">
                            <Button
                                onClick={() => setViewingQuestions(null)}
                                className="h-12 px-10 rounded-xl font-black bg-slate-900 hover:bg-black text-white uppercase tracking-widest text-[10px]"
                            >
                                Done Inspection
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
                <DialogContent className="sm:max-w-[480px] border-none shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] rounded-[2.5rem] bg-white p-0 overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="bg-gradient-to-br from-primary to-[#ff6a00] p-10 text-white relative overflow-hidden shrink-0">
                        {/* High-fidelity brand patterns */}
                        <div className="absolute inset-0 bg-white/10 opacity-20" />
                        <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 bg-white/20 rounded-full blur-3xl animate-pulse" />
                        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 h-64 w-64 bg-black/20 rounded-full blur-3xl" />

                        <div className="relative z-10">
                            <div className="h-16 w-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-6 shadow-2xl border border-white/30">
                                <Users className="h-8 w-8 text-white" />
                            </div>
                            <DialogTitle className="text-3xl font-black tracking-tight leading-none mb-3 text-white">
                                Grant <span className="text-white/80 font-medium italic">Student Access</span>
                            </DialogTitle>
                            <DialogDescription className="text-white/70 font-bold text-[10px] uppercase tracking-[0.3em] flex items-center gap-2">
                                <div className="h-1 w-4 bg-white/40 rounded-full" />
                                Repository: {grantingTopic}
                            </DialogDescription>
                        </div>
                    </div>

                    <ScrollArea className="flex-1 overflow-y-auto pr-1">
                        <div className="p-8 space-y-8 bg-white relative">
                            <div className="w-full space-y-6">

  {/* YEAR */}
  <div className="space-y-1.5">
    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Year</Label>
    <Select value={selectedBatchTypeFilter} onValueChange={(v) => {
      setSelectedBatchTypeFilter(v);
      setSelectedBatchId("all");
      setSelectedDeptStudents([]);
    }}>
      <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-slate-50 font-bold text-slate-700">
        <SelectValue placeholder="All Years" />
      </SelectTrigger>
      <SelectContent className="rounded-2xl shadow-xl p-1">
        <SelectItem value="all" className="font-bold rounded-xl">All Years</SelectItem>
        <SelectItem value="1" className="font-bold rounded-xl">Year 1</SelectItem>
        <SelectItem value="2" className="font-bold rounded-xl">Year 2</SelectItem>
        <SelectItem value="3" className="font-bold rounded-xl">Year 3</SelectItem>
        <SelectItem value="4" className="font-bold rounded-xl">Year 4</SelectItem>
      </SelectContent>
    </Select>
  </div>

  {/* DEPT */}
  <div className="space-y-1.5">
    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Department</Label>
    <Select value={selectedDept} onValueChange={(v) => {
      setSelectedDept(v);
      setSelectedBatchId("all");
      setSelectedStudentId("");
      const yearVal = selectedBatchTypeFilter;
      const pool = students.filter(s => (v === "all" || ((s as any).department || "").toUpperCase() === v.toUpperCase()) && (yearVal === "all" || String((s as any).year) === yearVal));
      setSelectedDeptStudents(pool.map(s => s.id));
      setGrantType("dept");
    }}>
      <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-slate-50 font-bold text-slate-700">
        <SelectValue placeholder="All Departments" />
      </SelectTrigger>
      <SelectContent className="rounded-2xl shadow-xl p-1">
        <SelectItem value="all" className="font-bold rounded-xl">All Departments</SelectItem>
        {Array.from(new Set(students.map(s => ((s as any).department || "").toUpperCase()).filter(Boolean))).map(dept => (
          <SelectItem key={dept} value={dept} className="font-bold rounded-xl">{dept}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>

  {/* BATCH filtered by dept */}
  <div className="space-y-1.5">
    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
      Batch {selectedBatchId && selectedBatchId !== "all" && batchStudents.length > 0 && <span className="text-primary ml-1">({batchStudents.length} auto-selected)</span>}
    </Label>
    <Select value={selectedBatchId} onValueChange={(v) => {
      setSelectedBatchId(v);
      setSelectedStudentId("");
      setGrantType(v && v !== "all" ? "batch" : "dept");
      // Student list will update via batchStudents after fetch (useEffect)
    }}>
      <SelectTrigger className="h-11 rounded-2xl border-slate-200 bg-slate-50 font-bold text-slate-700">
        <SelectValue placeholder="All Batches" />
      </SelectTrigger>
      <SelectContent className="rounded-2xl shadow-xl p-1 max-h-48">
        <SelectItem value="all" className="font-bold rounded-xl">All Batches</SelectItem>
        {(selectedDept === "all" ? batches : batches.filter(b => b.batch_name.toLowerCase().startsWith(selectedDept.toLowerCase().replace("/","").replace("-","").substring(0,3)))).map(b => (
          <SelectItem key={b.id || b._id} value={(b.id || b._id)?.toString() || ""} className="font-bold rounded-xl">
            {b.batch_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {batchStudents.length > 0 && selectedBatchId && selectedBatchId !== "all" && (
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-[10px] font-bold text-emerald-700">
        All {batchStudents.length} students in this batch will get access
      </div>
    )}
  </div>

  {/* STUDENTS multi-select */}
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
        Students {selectedDeptStudents.length > 0 && <span className="text-primary ml-1">({selectedDeptStudents.length} selected)</span>}
      </Label>
      <button type="button" onClick={() => {
        const pool = (selectedBatchId && selectedBatchId !== "all") ? batchStudents : students.filter(s => (selectedDept === "all" || ((s as any).department || "").toUpperCase() === selectedDept.toUpperCase()) && (selectedBatchTypeFilter === "all" || String((s as any).year) === selectedBatchTypeFilter));
        if (selectedDeptStudents.length === pool.length) { setSelectedDeptStudents([]); } else { setSelectedDeptStudents(pool.map(s => s.id)); }
        setGrantType("dept"); setSelectedBatchId("all"); setSelectedStudentId("");
      }} className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline">
        {selectedDeptStudents.length > 0 ? "Deselect All" : "Select All"}
      </button>
    </div>
    <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-52 overflow-y-auto bg-slate-50/50">
      {(selectedBatchId && selectedBatchId !== "all" ? batchStudents : students.filter(s => (selectedDept === "all" || ((s as any).department || "").toUpperCase() === selectedDept.toUpperCase()) && (selectedBatchTypeFilter === "all" || String((s as any).year) === selectedBatchTypeFilter))).map(s => {
        const isSel = selectedDeptStudents.includes(s.id);
        return (
          <div key={s.id} onClick={() => {
            setSelectedDeptStudents(prev => isSel ? prev.filter(id => id !== s.id) : [...prev, s.id]);
            setGrantType("dept"); setSelectedStudentId(""); setSelectedBatchId("all");
          }} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer border-b last:border-0 transition-colors ${isSel ? "bg-primary/5" : "hover:bg-white"}`}>
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${isSel ? "bg-primary border-primary" : "border-slate-300"}`}>
              {isSel && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{s.full_name}</p>
              <p className="text-[9px] text-slate-400 truncate">{(s as any).roll_number || s.email}</p>
            </div>
            {(s as any).year && <span className="text-[9px] font-bold text-slate-400 shrink-0">Y{(s as any).year}</span>}
          </div>
        );
      })}
    </div>
  </div>
</div>

                            
                            <div className="p-6 rounded-[1.5rem] bg-emerald-50/30 border border-emerald-500/10 space-y-3 relative overflow-hidden group">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-emerald-500 text-white border-none font-black text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-md">Instant Access</Badge>
                                    <div className="h-1 w-1 rounded-full bg-slate-300" />
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic leading-none pt-0.5">Live Sync</span>
                                </div>
                                <p className="text-[10px] text-slate-600 font-bold leading-relaxed uppercase tracking-tight opacity-80 relative z-10">
                                    {grantType === 'batch'
                                        ? "This will give access to ALL students in this batch. They will be notified via email/app immediately."
                                        : "The student will get immediate access and a notification to start the test."}
                                </p>
                            </div>

                            <div className="flex gap-4 pt-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => setShowGrantDialog(false)}
                                    className="flex-1 h-14 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-all"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleGrantAccess}
                                    disabled={(!selectedStudentId && !selectedBatchId && selectedDeptStudents.length === 0) || isGranting}
                                    className="flex-[2] h-14 rounded-3xl bg-slate-900 hover:bg-black text-white shadow-2xl shadow-slate-900/40 font-black text-[10px] uppercase tracking-[.2em] transition-all active:scale-[0.98]"
                                >
                                    {isGranting ? <Loader2 className="h-4 w-4 animate-spin mr-3" /> : <ShieldCheck className="h-4 w-4 mr-3 text-primary" />}
                                    {selectedStudentId ? 'Grant to Student' : selectedBatchId && selectedBatchId !== 'all' ? 'Grant to Batch' : selectedDeptStudents.length > 0 ? `Grant to ${selectedDeptStudents.length} Students` : 'Grant Access'}
                                </Button>
                            </div>
                        </div>
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    );
}