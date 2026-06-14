import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Layers,
  ShieldCheck,
  Plus,
  ArrowRight,
  Check,
  MoreVertical,
  Trash2,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchWithAuth } from "@/lib/api";
import { CourseBuilder } from "@/components/instructor/courses/CourseBuilder";
import { Course as InstructorCourse } from "@/hooks/useInstructorData";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { SyncDataButton } from "@/components/admin/data/SyncDataButton";

interface AdminCourse {
  id: string;
  title: string;
  description: string | null;
  instructor_id: string | null;
  instructor_name: string | null;
  instructor_email: string | null;
  instructor_avatar?: string | null;
  status:
    | "pending"
    | "approved"
    | "rejected"
    | "published"
    | "draft"
    | "disabled";
  category: string | null;
  thumbnail_url: string | null;
  image?: string | null;
  submitted_at?: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  batch_type?: string;
  batch_name?: string;
  row_id: string;
  processed_by_name?: string | null;
  processed_at?: string | null;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  draft: number;
}

interface InstructorAccessProps {
  onSync?: () => void;
  loading?: boolean;
}

export default function InstructorAccess({ onSync, loading: externalLoading }: InstructorAccessProps) {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const loading = externalLoading || internalLoading;
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<AdminCourse | null>(
    null,
  );
  const [selectedInstructorId, setSelectedInstructorId] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    draft: 0,
  });
  const [buildingCourse, setBuildingCourse] = useState<AdminCourse | null>(
    null,
  );

  const fetchCourses = useCallback(async () => {
    setInternalLoading(true);
    try {
      const data = await fetchWithAuth("/admin/courses-with-instructors");
      const coursesData = (data as AdminCourse[]).map((c: AdminCourse) => ({
        ...c,
        image: c.image || c.thumbnail_url,
      }));

      setCourses(coursesData);

      const s: Stats = {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        draft: 0,
      };
      coursesData.forEach((c: AdminCourse) => {
        s.total++;
        const status = c.status?.toLowerCase();
        if (status === "pending") s.pending++;
        else if (status === "approved" || status === "published") s.approved++;
        else if (status === "rejected") s.rejected++;
        else s.draft++;
      });
      setStats(s);
    } catch (err) {
      console.error("Failed to fetch courses:", err);
      toast.error("Failed to load requests");
    } finally {
      setInternalLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleApprove = async (courseId: string, title: string, instructorId?: string) => {
    setProcessing(true);
    try {
      await fetchWithAuth("/admin/approve-course", {
        method: "PUT",
        body: JSON.stringify({ courseId, instructorId, status: "approved" }),
      });
      
      // Update local state immediately for visual responsiveness
      setCourses(prevCourses => prevCourses.map(c => {
        const isTarget = instructorId 
          ? (c.id === courseId && c.instructor_id === instructorId)
          : (c.id === courseId);
          
        if (isTarget) {
          return { ...c, status: "approved" };
        }
        return c;
      }));

      // Update stats locally
      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
        approved: prev.approved + 1
      }));

      toast.success(`Access granted for: ${title}`);
      
      // Refresh to sync everything else
      fetchCourses();
    } catch (err) {
      console.error("Failed to approve:", err);
      toast.error("Failed to grant access");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteCourse = async (course: AdminCourse) => {
    const courseId = course.id;
    const instructorId = course.instructor_id;
    const title = course.title;
    const instructorName = course.instructor_name;

    if (
      !confirm(
        `Are you sure you want to revoke access for "${instructorName}" from "${title}"? This will also delete their specific teaching batches.`,
      )
    )
      return;

    setProcessing(true);
    try {
        if (instructorId) {
            // Surgical Revocation
            await fetchWithAuth(`/admin/revoke-instructor-access/${courseId}/${instructorId}`, {
                method: "DELETE",
            });
        } else {
            // Legacy / Clear All fallback
            await fetchWithAuth(`/admin/clear-course-instructors/${courseId}`, {
                method: "DELETE",
            });
        }
      toast.success(`Access removed for ${instructorName}`);
      fetchCourses();
    } catch (err) {
      console.error("Failed to revoke access:", err);
      toast.error("Failed to remove instructor access");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedCourse || !rejectReason) return;
    setProcessing(true);
    try {
      await fetchWithAuth("/admin/approve-course", {
        method: "PUT",
        body: JSON.stringify({
          courseId: selectedCourse.id,
          instructorId: selectedInstructorId,
          status: "rejected",
          rejectionReason: rejectReason,
        }),
      });
      toast.info(`Request rejected for: ${selectedCourse.title}`);
      setShowRejectDialog(false);
      setSelectedCourse(null);
      setSelectedInstructorId(null);
      setRejectReason("");
      fetchCourses();
    } catch (err) {
      console.error("Failed to reject:", err);
      toast.error("Failed to process rejection");
    } finally {
      setProcessing(false);
    }
  };

  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.instructor_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      course.instructor_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || course.status?.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (buildingCourse) {
    return (
      <CourseBuilder
        course={buildingCourse as unknown as InstructorCourse}
        onBack={() => setBuildingCourse(null)}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Primary Header - Grant Access Style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm shrink-0">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Staff Permissions
            </h2>
          </div>
          <p className="text-[11px] sm:text-[13px] font-medium text-slate-500 sm:ml-13 uppercase tracking-[0.2em]">
            Manage curriculum publishing permissions
          </p>
        </div>

        <div className="flex items-center gap-4">
          <SyncDataButton 
            onSync={() => {
              if (onSync) onSync();
              fetchCourses();
            }} 
            isLoading={loading} 
            className="h-14 px-6 rounded-3xl bg-white shadow-sm border-slate-100"
          />
          <div className="flex items-center justify-between sm:justify-end gap-3 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm w-full sm:w-auto">
            <div className="flex -space-x-2 sm:-space-x-3 px-2">
              {courses.slice(0, 4).map((c, i) => (
                <Avatar
                  key={i}
                  className="h-8 w-8 border-2 border-white ring-1 ring-slate-100 italic"
                >
                  <AvatarImage src={c.instructor_avatar || ""} />
                  <AvatarFallback className="bg-slate-100 text-[10px] font-bold">
                    {c.instructor_name?.[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <div className="h-4 w-px bg-slate-200 mx-1" />
            <Badge
              variant="secondary"
              className="px-3 py-1 bg-primary/5 text-primary border-none font-bold"
            >
              {stats.pending} Pending Request{stats.pending !== 1 && "s"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Grid Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            label: "Course Submissions",
            count: stats.total,
            color: "bg-slate-900",
            icon: Layers,
            desc: "Total courses submitted by faculty",
          },
          {
            label: "Pending Review",
            count: stats.pending,
            color: "bg-amber-500",
            icon: Clock,
            desc: "Needs administrative approval",
            active: stats.pending > 0,
          },
          {
            label: "Verified Courses",
            count: stats.approved,
            color: "bg-emerald-600",
            icon: CheckCircle,
            desc: "Ready for platform students",
          },
          {
            label: "Admin Overview",
            count: stats.total,
            color: "bg-rose-500",
            icon: ShieldCheck,
            desc: "Combined course inventory",
            isHigh: true,
          },
        ].map((role) => (
          <Card
            key={role.label}
            className={`border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden group transition-all duration-500 hover:-translate-y-2 ${role.isHigh ? "bg-primary shadow-primary/30" : "bg-white"}`}
          >
            <CardContent className="p-6 sm:p-8">
              <div className="flex justify-between items-start mb-8">
                <div
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-500 group-hover:rotate-12 ${role.isHigh ? "bg-white/20" : "bg-slate-50"}`}
                >
                  <role.icon
                    className={`h-6 w-6 ${role.isHigh ? "text-white" : "text-slate-600"}`}
                  />
                </div>
                {role.active && (
                  <div
                    className={`h-2 w-2 rounded-full animate-ping bg-amber-500/60`}
                  />
                )}
              </div>

              <div className="space-y-1">
                <h5
                  className={`text-[10px] font-black uppercase tracking-[0.2em] ${role.isHigh ? "text-white" : "text-slate-900"}`}
                >
                  {role.label}
                </h5>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-3xl font-black tracking-tighter ${role.isHigh ? "text-white" : "text-slate-900"}`}
                  >
                    {role.count}
                  </span>
                    <span
                    className={`text-[11px] font-bold ${role.isHigh ? "text-white" : "text-slate-900"}`}
                  >
                    Courses
                  </span>
                </div>
                <p
                  className={`text-[11px] font-medium pt-3 border-t mt-4 ${role.isHigh ? "text-white border-white/20" : "text-slate-900 border-slate-100"}`}
                >
                  {role.desc}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Filter & Horizontal Grid Section */}
      <Card className="border-none shadow-2xl shadow-slate-200/40 rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-white flex items-center justify-center shadow-sm shrink-0 border border-slate-100">
                <Layers className="h-6 w-6 text-primary/60" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">
                  Instructor Proposals
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  Submission Register
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-full sm:w-[350px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search proposals or instructors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 h-12 rounded-2xl bg-white border-slate-200/60 focus:ring-2 focus:ring-primary/20 transition-all font-bold placeholder:font-medium placeholder:text-slate-400 shadow-sm"
                />
              </div>
              <div className="flex items-center gap-2 bg-white/50 p-1 rounded-2xl border border-slate-200/60 shadow-sm overflow-x-auto scrollbar-none">
                {["all", "pending", "approved", "rejected"].map((s) => (
                  <Button
                    key={s}
                    variant="ghost"
                    size="sm"
                    onClick={() => setStatusFilter(s)}
                    className={`capitalize rounded-xl px-5 h-9 text-[10px] font-black tracking-widest transition-all ${
                      statusFilter === s
                        ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-20 rounded-2xl bg-slate-50 animate-pulse border border-slate-100"
                />
              ))}
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-20 w-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 border border-slate-100 shadow-inner">
                <BookOpen className="h-10 w-10 text-slate-200" />
              </div>
              <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">
                No Requests Logged
              </h3>
              <p className="text-sm text-slate-300 font-medium max-w-xs mt-3 uppercase tracking-tight">
                The platform registry is currently clear of pending proposals.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Table Header - Visible on Desktop */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50/50 rounded-2xl border border-slate-100 mb-2">
                <div className="col-span-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Image</div>
                <div className="col-span-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Instructor & Email</div>
                <div className="col-span-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Course Target</div>
                <div className="col-span-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Batch</div>
                <div className="col-span-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</div>
                <div className="col-span-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</div>
                <div className="col-span-2 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</div>
              </div>

              <AnimatePresence mode="popLayout">
                {filteredCourses.map((course) => (
                  <motion.div
                    key={course.row_id || `${course.id}_${course.instructor_id}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="flex flex-col md:grid md:grid-cols-12 gap-4 md:items-center p-4 md:p-6 bg-white rounded-[2rem] border border-slate-100 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 relative group"
                  >
                    {/* Main Row Content */}
                      
                      {/* Mobile Header: Avatar + Info */}
                      <div className="md:col-span-4 flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-slate-50 shadow-sm rounded-xl overflow-hidden group-hover:scale-110 transition-transform shrink-0">
                          <AvatarImage src={course.instructor_avatar || ""} />
                          <AvatarFallback className="bg-primary/5 text-primary text-xs font-black">
                            {course.instructor_name?.[0] || 'I'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 space-y-0.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm md:text-base font-black text-slate-900 truncate tracking-tight">{course.instructor_name}</h4>
                            {course.batch_name && (
                                <Badge variant="outline" className="px-2 py-1 text-[9px] font-black uppercase border-slate-200 text-slate-500 bg-slate-50 whitespace-nowrap truncate max-w-[150px] md:max-w-[200px]">
                                    {course.batch_name}
                                </Badge>
                            )}
                          </div>
                          <p className="text-[11px] md:text-sm font-medium text-slate-400 truncate tracking-tight uppercase">{course.instructor_email}</p>
                        </div>
                      </div>

                      {/* Course Information */}
                      <div className="md:col-span-2 flex flex-col md:block gap-1 mt-2 md:mt-0">
                        <span className="md:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest">Course</span>
                        <div className="flex items-center gap-3">
                           <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                             <BookOpen className="h-4 w-4 text-indigo-500" />
                           </div>
                           <p className="text-xs md:text-sm font-black text-slate-800 line-clamp-1">{course.title}</p>
                        </div>
                      </div>

                      {/* Batch Column */}
                      <div className="md:col-span-2 flex flex-col md:block gap-1 mt-2 md:mt-0">
                         <span className="md:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest">Batch</span>
                         <div className="flex items-center gap-2">
                            {course.batch_name ? (
                              <Badge variant="outline" className="px-3 py-1 text-[10px] font-black uppercase bg-primary/5 text-primary border-primary/20">
                                {course.batch_name}
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium">No batch</span>
                            )}
                         </div>
                      </div>

                      {/* Status Column */}
                      <div className="md:col-span-1 flex flex-col md:block gap-1 mt-2 md:mt-0">
                         <span className="md:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</span>
                         <div className="flex items-center">
                            <Badge className={`rounded-xl px-3 py-1 font-black text-[9px] uppercase tracking-widest border-none ${
                              course.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                              course.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                              'bg-rose-100 text-rose-600'
                            }`}>
                              {course.status}
                            </Badge>
                         </div>
                      </div>

                      {/* Date/Audit Column */}
                      <div className="md:col-span-1 flex flex-col md:block gap-1 mt-2 md:mt-0">
                         <span className="md:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</span>
                         <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1.5 md:block">
                               <Calendar className="h-3 w-3 md:hidden text-slate-300" />
                               {course.created_at ? new Date(course.created_at).toLocaleDateString('en-GB') : 'N/A'}
                            </span>
                            {course.status === 'approved' && course.processed_by_name && (
                               <div className="flex flex-col mt-1">
                                  <span className="text-[8px] font-bold text-emerald-500 uppercase leading-tight">Approved By:</span>
                                  <span className="text-[9px] font-black text-slate-600 truncate max-w-[80px]">{course.processed_by_name}</span>
                                  {course.processed_at && (
                                     <span className="text-[8px] font-medium text-slate-400">
                                        {new Date(course.processed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                     </span>
                                  )}
                               </div>
                            )}
                         </div>
                      </div>

                      {/* Actions Column */}
                      <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0 w-full md:w-auto">
                        {course.status === 'pending' && (
                          <div className="flex items-center gap-2 flex-1 md:flex-initial">
                            <Button 
                              onClick={() => handleApprove(course.id, course.title, course.instructor_id)}
                              disabled={processing}
                              className="h-10 px-4 bg-[#0084FF] hover:bg-[#0073e6] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-500/20 w-full md:w-auto"
                            >
                              Grant Access
                            </Button>
                            <Button 
                               variant="ghost" 
                               onClick={() => { 
                                 setSelectedCourse(course); 
                                 setSelectedInstructorId(course.instructor_id || null);
                                 setShowRejectDialog(true); 
                               }}
                               disabled={processing}
                               className="h-10 w-10 p-0 text-rose-500 hover:bg-rose-50 rounded-xl shrink-0"
                            >
                               <XCircle className="h-5 w-5" />
                            </Button>
                          </div>
                        )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:text-slate-600 rounded-xl">
                            <MoreVertical className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-2xl border-none shadow-2xl p-2 bg-white/95 backdrop-blur-md">
                           {course.status !== 'approved' && (
                             <DropdownMenuItem 
                               onClick={() => handleApprove(course.id, course.title, course.instructor_id)} 
                               className="text-emerald-600 font-bold p-3 rounded-xl cursor-pointer"
                             >
                                <CheckCircle className="h-4 w-4 mr-3" />
                                Grant Access
                             </DropdownMenuItem>
                           )}
                           {course.status !== 'rejected' && (
                             <DropdownMenuItem 
                               onClick={() => {
                                 setSelectedCourse(course);
                                 setSelectedInstructorId(course.instructor_id || null);
                                 setShowRejectDialog(true);
                               }} 
                               className="text-amber-600 font-bold p-3 rounded-xl cursor-pointer"
                             >
                                <XCircle className="h-4 w-4 mr-3" />
                                Reject Request
                             </DropdownMenuItem>
                           )}
                           <DropdownMenuItem onClick={() => handleDeleteCourse(course)} className="text-rose-600 font-bold p-3 rounded-xl cursor-pointer">
                              <Trash2 className="h-4 w-4 mr-3" />
                              Revoke Status
                           </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-md bg-white border border-slate-200 shadow-2xl rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-rose-600" />
              </div>
              Reject Proposal
            </DialogTitle>
            <DialogDescription>
              Please provide formal justification for rejecting "
              {selectedCourse?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Textarea
              placeholder="Detailed reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              className="rounded-2xl border-slate-200 focus:ring-rose-500/20"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRejectDialog(false)}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason || processing}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 font-bold px-8 shadow-lg shadow-rose-200"
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}