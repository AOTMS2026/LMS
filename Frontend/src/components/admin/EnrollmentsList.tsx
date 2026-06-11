import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  Search, 
  BookOpen, 
  Calendar, 
  CreditCard,
  Globe,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Fingerprint,
  Loader2,
  Trash2,
  Eye,
  GraduationCap,
  MoreVertical,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  TrendingUp,
  ArrowRight,
  RotateCcw
} from "lucide-react";
import { SyncDataButton } from "./data/SyncDataButton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { CourseEnrollment } from "@/hooks/useCourses";

interface EnrollmentsListProps {
  enrollments: CourseEnrollment[];
  loading: boolean;
  onUpdateStatus?: (id: string, status: 'active' | 'rejected') => Promise<void>;
  onUpdatePayment?: (id: string, term: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onResetATS?: (userId: string) => Promise<void>;
  onSync?: () => void;
}

export function EnrollmentsList({ 
  enrollments, 
  loading, 
  onUpdateStatus, 
  onUpdatePayment, 
  onDelete, 
  onResetATS,
  onSync
}: EnrollmentsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTimeframe, setFilterTimeframe] = useState("all");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState<CourseEnrollment | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const safeParsePrice = (price?: string | number) => {
    if (!price) return 0;
    if (typeof price === 'number') return price;
    const cleaned = price.toString().replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  };

  const EnrollmentAvatar = ({ enrollment }: { enrollment: CourseEnrollment }) => {
    const avatar = enrollment.user_avatar || (enrollment as any).profile?.avatar_url;
    const name = enrollment.user_name || (enrollment as any).profile?.full_name || 'U';

    if (avatar) {
      return (
        <div className="relative group">
          <div className="h-14 w-14 rounded-2xl overflow-hidden border border-slate-100 shadow-lg bg-slate-50 transition-transform duration-500 group-hover:scale-110">
            <img 
              src={avatar} 
              alt={name} 
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-slate-900 border-2 border-white shadow-sm flex items-center justify-center">
             <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
          </div>
        </div>
      );
    }

    return (
      <div className={cn(
        "h-14 w-14 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner border border-slate-100 transition-all duration-500 hover:scale-110",
        "bg-slate-900 text-white"
      )}>
         {name.charAt(0).toUpperCase()}{name.split(' ').length > 1 ? name.split(' ')[1].charAt(0).toUpperCase() : ''}
      </div>
    );
  };

  const copyToClipboard = async (text: string, enrollmentId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(enrollmentId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'active' | 'rejected') => {
    if (!onUpdateStatus) return;
    setProcessingId(id);
    try {
      await onUpdateStatus(id, status);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!onDelete) return;
    setProcessingId(id);
    try {
      await onDelete(id);
    } finally {
      setProcessingId(null);
    }
  };

  const getEnrollmentName = (e: CourseEnrollment) => e.user_name || (e as any).student_name || (e as any).profile?.full_name || 'Unknown Student';
  const getEnrollmentEmail = (e: CourseEnrollment) => e.user_email || (e as any).student_email || (e as any).profile?.email || 'N/A';
  const getCourseName = (e: CourseEnrollment) => e.course_name || (e as any).course_title || (e as any).course?.title || 'Unknown Course';
  const getAvatarUrl = (e: CourseEnrollment) => e.user_avatar || (e as any).student_avatar || (e as any).profile?.avatar_url || null;

  const courses = [...new Set((enrollments || []).map(e => getCourseName(e)).filter(Boolean))];

  const filteredEnrollments = (enrollments || []).filter(e => {
    const userName = getEnrollmentName(e);
    const userEmail = getEnrollmentEmail(e);
    const courseName = getCourseName(e);
    
    const matchesSearch = 
      userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.user_id || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCourse = filterCourse === "all" || courseName === filterCourse;
    const matchesStatus = filterStatus === "all" || e.status === filterStatus;

    let matchesTimeframe = true;
    if (filterTimeframe !== 'all') {
      const enrollmentDate = new Date(e.enrolled_at || (e as any).enrollment_date || 0);
      const now = new Date();
      
      switch (filterTimeframe) {
        case 'day':
          matchesTimeframe = enrollmentDate.toDateString() === now.toDateString();
          break;
        case 'week': {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          matchesTimeframe = enrollmentDate >= weekAgo;
          break;
        }
        case 'month': {
          const monthAgo = new Date();
          monthAgo.setMonth(now.getMonth() - 1);
          matchesTimeframe = enrollmentDate >= monthAgo;
          break;
        }
        case 'year': {
          const yearAgo = new Date();
          yearAgo.setFullYear(now.getFullYear() - 1);
          matchesTimeframe = enrollmentDate >= yearAgo;
          break;
        }
        case 'custom': {
          if (customFrom) {
            const from = new Date(customFrom);
            from.setHours(0, 0, 0, 0);
            matchesTimeframe = enrollmentDate >= from;
          }
          if (customTo) {
            const to = new Date(customTo);
            to.setHours(23, 59, 59, 999);
            matchesTimeframe = matchesTimeframe && enrollmentDate <= to;
          }
          break;
        }
      }
    }

    return matchesSearch && matchesCourse && matchesStatus && matchesTimeframe;
  });



  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 rounded-full border border-slate-800 shadow-lg shadow-slate-200">
            <CheckCircle className="h-3 w-3 text-white" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Approved</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-slate-200">
            <XCircle className="h-3 w-3 text-slate-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Rejected</span>
          </div>
        );
      case 'pending':
      default:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full border border-slate-200">
            <Clock className="h-3 w-3 text-slate-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pending</span>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 rounded-[2rem]" />)}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { icon: Users, label: "Total Enrollments", value: filteredEnrollments.length, color: "text-slate-900", bg: "bg-slate-100" },
          { icon: BookOpen, label: "Active Courses", value: courses.length, color: "text-slate-900", bg: "bg-slate-100" },
          { icon: TrendingUp, label: "Active Students", value: new Set(filteredEnrollments.map(e => e.user_id)).size, color: "text-slate-900", bg: "bg-slate-100" },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i}
          >
            <Card className="rounded-[2rem] border-none shadow-xl shadow-slate-200/40 bg-white/80 backdrop-blur-md hover:translate-y-[-5px] transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-5">
                  <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3", stat.bg)}>
                    <stat.icon className={cn("h-7 w-7", stat.color)} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-black tracking-tight text-slate-900">{stat.value}</p>
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter flex items-center gap-3">
             <div className="h-10 px-2 rounded-xl bg-slate-900 text-white text-xs flex items-center justify-center font-bold">LMS</div>
             Enrollment Hub
          </h2>
          <p className="text-sm font-bold text-slate-400">Manage and verify institutional admission pipelines</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by student name or course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 w-full bg-white border-none shadow-xl shadow-slate-200/20 rounded-2xl focus-visible:ring-2 focus-visible:ring-emerald-600 transition-all font-bold text-slate-900"
            />
          </div>
          
          {onSync && (
            <SyncDataButton 
              onSync={onSync} 
              isLoading={loading} 
              className="h-14 px-8 shadow-xl shadow-emerald-200/50"
            />
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Select value={filterCourse} onValueChange={setFilterCourse}>
              <SelectTrigger className="h-12 w-44 rounded-2xl bg-white border-none shadow-xl shadow-slate-200/20 font-bold">
                 <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl">
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map(course => (
                  <SelectItem key={course} value={course}>{course}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-12 w-40 rounded-2xl bg-white border-none shadow-xl shadow-slate-200/20 font-bold">
                 <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterTimeframe} onValueChange={(v) => { setFilterTimeframe(v); if (v !== 'custom') { setCustomFrom(''); setCustomTo(''); } }}>
              <SelectTrigger className="h-12 w-40 rounded-2xl bg-white border-none shadow-xl shadow-slate-200/20 font-bold">
                 <SelectValue placeholder="Timeframe" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-none shadow-2xl">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">Past Week</SelectItem>
                <SelectItem value="month">Past Month</SelectItem>
                <SelectItem value="year">Past Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {filterTimeframe === 'custom' && (
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-xl shadow-slate-200/20 border border-slate-100 flex-shrink-0 animate-in slide-in-from-right-4">
                <Calendar className="h-4 w-4 text-slate-400" />
                <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="h-9 border-none bg-transparent font-bold text-[10px] w-28 p-0 focus-visible:ring-0" />
                <div className="h-3 w-px bg-slate-200 mx-1" />
                <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="h-9 border-none bg-transparent font-bold text-[10px] w-28 p-0 focus-visible:ring-0" />
              </div>
            )}
          </div>
        </div>
      </div>
            
      <div className="min-h-[400px]">
        {filteredEnrollments.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 bg-white rounded-[3rem] border-4 border-dashed border-slate-100"
          >
            <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              <Users className="h-10 w-10 text-slate-200" />
            </div>
            <p className="text-lg font-black text-slate-300 uppercase tracking-widest">No matching records found</p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <div className="hidden xl:block">
              <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-8 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] w-[40%]">Student Profile</th>
                      <th className="px-6 py-8 text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] w-[40%]">Enrolled Course</th>
                      <th className="px-8 py-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-right w-[20%]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    <AnimatePresence mode="popLayout">
                      {filteredEnrollments.map((enrollment, index) => {
                        const fullFee = safeParsePrice(enrollment.final_price || enrollment.price);
                        const isPaidFull = enrollment.payment_term === 'full';
                        const isTerm1 = enrollment.payment_term === 'term1';
                        const isTerm2 = enrollment.payment_term === 'term2';
                        const term1Fee = Math.round(fullFee * 0.6);
                        const term2Fee = Math.round(fullFee * 0.4);
                        const depositedValue = isPaidFull || isTerm2 ? fullFee : isTerm1 ? term1Fee : 0;

                        return (
                          <motion.tr 
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: index * 0.05 }}
                            key={enrollment.id} 
                            className="hover:bg-slate-50/50 transition-colors group"
                          >
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-5">
                                <EnrollmentAvatar enrollment={enrollment} />
                                <div className="space-y-1 min-w-0">
                                  <div className="flex items-center gap-3">
                                    <h4 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors whitespace-nowrap">
                                      {enrollment.user_name || (enrollment as any).profile?.full_name}
                                    </h4>
                                    {getStatusBadge(enrollment.status || 'pending')}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-900 bg-slate-50/80 px-2 py-1 rounded-lg w-fit">
                                    <Calendar className="h-3 w-3 text-indigo-500" />
                                    <span>
                                      {(enrollment.enrolled_at || (enrollment as any).enrollment_date) 
                                        ? new Date(enrollment.enrolled_at || (enrollment as any).enrollment_date).toLocaleDateString('en-GB') + ' | ' + new Date(enrollment.enrolled_at || (enrollment as any).enrollment_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                                        : 'N/A'
                                      }
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-900 group-hover:text-slate-600 transition-colors">
                                    <Fingerprint className="h-3 w-3" />
                                    <span className="truncate max-w-[120px]">{enrollment.user_id}</span>
                                    <button
                                      onClick={() => copyToClipboard(enrollment.user_id || '', enrollment.id)}
                                      className="p-1 hover:bg-white rounded-md transition-all text-indigo-500"
                                    >
                                      {copiedId === enrollment.id ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-6 font-black">
                              <div className="space-y-2">
                                <p className="text-xs text-slate-900 leading-tight uppercase tracking-tight">
                                  {enrollment.course_name || (enrollment as any).course?.title}
                                </p>
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 w-fit">
                                  <Globe className="h-2.5 w-2.5 text-slate-400" />
                                  <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Course Bundle</span>
                                </div>
                                {(enrollment as any).requested_time_slot && (
                                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-50 w-fit border border-indigo-100">
                                    <Clock className="h-2.5 w-2.5 text-indigo-500" />
                                    <span className="text-[8px] font-black uppercase text-indigo-700 tracking-wider">Req: {(enrollment as any).requested_time_slot}</span>
                                  </div>
                                )}
                              </div>
                            </td>     </td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex items-center justify-end gap-3 transition-all duration-300">
                                {enrollment.status === 'pending' || !enrollment.status ? (
                                  <Button 
                                    onClick={() => handleUpdateStatus(enrollment.id, 'active')}
                                    disabled={processingId === enrollment.id}
                                    className="h-10 px-5 bg-slate-900 text-white font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-indigo-600 transition-all shadow-xl"
                                  >
                                    {processingId === enrollment.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Approve"}
                                  </Button>
                                ) : (
                                  <Button 
                                    onClick={() => setSelectedEnrollment(enrollment)}
                                    className="h-11 w-11 p-0 bg-white shadow-lg shadow-slate-200/50 text-indigo-600 rounded-2xl hover:scale-110 active:scale-95 transition-all border border-slate-50"
                                  >
                                    <Eye className="h-5 w-5" />
                                  </Button>
                                )}
                                
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-11 w-11 rounded-2xl text-slate-300 hover:text-slate-600 hover:bg-slate-50 transition-all">
                                      <MoreVertical className="h-5 w-5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="rounded-2xl p-2 border-none shadow-2xl w-52 bg-white/95 backdrop-blur-md">
                                    <DropdownMenuItem onClick={() => setSelectedEnrollment(enrollment)} className="rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-800 focus:bg-slate-900 focus:text-white transition-colors cursor-pointer">
                                      <Eye className="h-4 w-4 mr-3 text-indigo-500" /> View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(enrollment.id, 'active')} className="rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-600 focus:bg-emerald-600 focus:text-white transition-colors cursor-pointer">
                                      <ShieldCheck className="h-4 w-4 mr-3" /> Approve Access
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleUpdateStatus(enrollment.id, 'rejected')} className="rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-orange-600 focus:bg-orange-600 focus:text-white transition-colors cursor-pointer">
                                      <XCircle className="h-4 w-4 mr-3" /> Deny Access
                                    </DropdownMenuItem>
                                    <div className="h-px bg-slate-100 my-2" />
                                    <DropdownMenuItem 
                                      onClick={() => enrollment.user_id && onResetATS?.(enrollment.user_id)} 
                                      className="rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-amber-600 focus:bg-amber-600 focus:text-white transition-colors cursor-pointer"
                                    >
                                      <RotateCcw className="h-4 w-4 mr-3" /> Reset ATS Score
                                    </DropdownMenuItem>
                                    <div className="h-px bg-slate-100 my-2" />
                                    <DropdownMenuItem onClick={() => handleDelete(enrollment.id)} className="rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-rose-600 focus:bg-rose-600 focus:text-white transition-colors cursor-pointer">
                                      <Trash2 className="h-4 w-4 mr-3" /> Remove Record
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredEnrollments.map((enrollment, index) => {
                const fullFee = safeParsePrice(enrollment.final_price || enrollment.price);
                const term1Fee = Math.round(fullFee * 0.6);
                const term2Fee = Math.round(fullFee * 0.4);
                const isPaidFull = enrollment.payment_term === 'full';
                const isTerm1 = enrollment.payment_term === 'term1';
                const isTerm2 = enrollment.payment_term === 'term2';
                const depositedValue = isPaidFull || isTerm2 ? fullFee : isTerm1 ? term1Fee : 0;

                return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    key={enrollment.id}
                    className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden flex flex-col group hover:border-indigo-600/30 transition-all duration-500"
                  >
                    <div className="p-7 space-y-7 flex-1">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                          <EnrollmentAvatar enrollment={enrollment} />
                          <div className="space-y-1">
                            <h4 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                              {enrollment.user_name || (enrollment as any).profile?.full_name}
                            </h4>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate max-w-[140px]">
                              {enrollment.user_email || (enrollment as any).profile?.email}
                            </p>
                          </div>
                        </div>
                        {getStatusBadge(enrollment.status || 'pending')}
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enrolled Course</p>
                        <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-tight">
                          {enrollment.course_name || (enrollment as any).course?.title}
                        </h5>
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-indigo-500 tracking-widest pt-1">
                          <Globe className="h-3 w-3" />
                          <span>Course Bundle Access</span>
                        </div>
                              </div>

                      <div className="flex items-center lg:justify-end gap-3">
                        <Button 
                          onClick={() => setSelectedEnrollment(enrollment)}
                          className="flex-1 h-12 px-6 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-xl shadow-slate-200"
                        >
                           <Eye className="h-5 w-5 mr-2" />
                           <span className="text-[10px] font-black uppercase tracking-widest">Review</span>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-12 w-12 rounded-2xl border border-slate-100 text-slate-400">
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl border-none shadow-2xl bg-white/95 backdrop-blur-md">
                            <DropdownMenuItem 
                              onClick={() => handleUpdateStatus(enrollment.id, 'active')}
                              className="rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-900 hover:text-white transition-colors cursor-pointer"
                            >
                               <ShieldCheck className="h-4 w-4 mr-3" /> Approve Access
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleUpdateStatus(enrollment.id, 'rejected')}
                              className="rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                               <XCircle className="h-4 w-4 mr-3" /> Reject Access
                            </DropdownMenuItem>
                            <div className="h-px bg-slate-100 my-2" />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(enrollment.id)}
                              className="rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                               <Trash2 className="h-4 w-4 mr-3" /> Delete Record
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!selectedEnrollment} onOpenChange={(open) => !open && setSelectedEnrollment(null)}>
        <DialogContent className="w-[95vw] sm:max-w-md p-0 overflow-hidden bg-white border-none shadow-2xl rounded-[2.5rem] flex flex-col">
          <DialogHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
            <div className="space-y-1">
              <Badge className="bg-indigo-600 text-white rounded-lg px-3 py-1 text-[9px] uppercase font-black tracking-widest border-none shadow-lg shadow-indigo-200">Management Panel</Badge>
              <DialogTitle className="text-2xl font-black text-slate-900 tracking-tighter leading-[0.9] mt-2">
                Enrollment Details
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Review Candidate Registration
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
            {/* Student & Course Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-4 group">
                <div className="h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Student Name</p>
                  <p className="text-base font-black text-slate-900 leading-tight">
                    {selectedEnrollment ? getEnrollmentName(selectedEnrollment) : 'Unknown Student'}
                  </p>
                  <p className="text-xs text-slate-500 font-medium leading-none">
                    {selectedEnrollment ? getEnrollmentEmail(selectedEnrollment) : 'N/A'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 group">
                <div className="h-12 w-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center shadow-md">
                  <GraduationCap className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Course Selected</p>
                  <p className="text-base font-black text-slate-900 leading-tight">
                    {selectedEnrollment ? getCourseName(selectedEnrollment) : 'Unknown Course'}
                  </p>
                  <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">
                    Free Course
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100/50 text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Admission Status</span>
              <div className="inline-block">
                {selectedEnrollment && getStatusBadge(selectedEnrollment.status || 'pending')}
              </div>
            </div>
          </div>

          <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3 rounded-b-[2.5rem]">
            <Button variant="ghost" onClick={() => setSelectedEnrollment(null)} className="text-slate-400 font-black uppercase tracking-widest text-[10px] h-12 px-6 rounded-xl hover:bg-slate-100 transition-all">Close</Button>
            
            {selectedEnrollment?.status === 'pending' && (
              <>
                <Button 
                  variant="destructive"
                  className="rounded-xl h-12 px-6 font-black uppercase tracking-widest text-[10px] shadow-lg transition-all" 
                  onClick={() => { if(selectedEnrollment) handleUpdateStatus(selectedEnrollment.id, 'rejected'); setSelectedEnrollment(null); }}
                >
                  Reject
                </Button>
                <Button 
                  className="bg-indigo-600 hover:bg-slate-900 text-white rounded-xl h-12 px-8 font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-indigo-200" 
                  onClick={() => { if(selectedEnrollment) handleUpdateStatus(selectedEnrollment.id, 'active'); setSelectedEnrollment(null); }}
                >
                  Approve Enrollment
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            )}

            {selectedEnrollment?.status === 'active' && (
              <div className="flex items-center gap-2 px-4 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                 <ShieldCheck className="h-4 w-4" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Active Access</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
