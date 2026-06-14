import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch as UISwitch } from "@/components/ui/switch";
import {
  Users,
  Search,
  RefreshCw,
  Mail,
  User,
  BookOpen,
  MoreVertical,
  Plus,
  Trash2,
  Loader2,
  Award,
  Shield,
  Eye,
  ArrowRight,
  Phone,
  Lock as LockIcon,
  Unlock as UnlockIcon,
  ExternalLink,
  Calendar,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/api";
import { toast } from "sonner";
import { SyncDataButton } from "./data/SyncDataButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Instructor {
  user_id: string;
  full_name: string;
  email: string;
  mobile_number?: string;
  phone?: string;
  avatar_url?: string;
  status: "active" | "suspended";
  role: string;
  created_at?: string;
}

interface Course {
  id: string;
  title: string;
  category?: string;
  instructor_ids?: string[];
  instructors?: { id: string; full_name: string; avatar_url: string }[];
  instructor_id?: string;
  course_id?: string;
}

interface MockPaper {
  id: string;
  title: string;
}

interface Batch {
  id: string;
  batch_name: string;
  batch_type: string;
  course_id: string;
  instructor_id?: string;
  studentCount?: number;
  start_time?: string;
  end_time?: string;
}

interface StudentBatch {
  id: string;
  student_id: string;
  batch_id: string;
  course_id: string;
}

interface Profile {
  user_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  role?: string;
}

interface InstructorManagementProps {
  onSync?: () => void;
  loading?: boolean;
}

export function InstructorManagement({ onSync, loading: parentLoading = false }: InstructorManagementProps) {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Assignment Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [manageAssignmentsOpen, setManageAssignmentsOpen] = useState(false);
  const [selectedInstructor, setSelectedInstructor] =
    useState<Instructor | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [batchTypeFilter, setBatchTypeFilter] = useState("all");

  const [instructorBatches, setInstructorBatches] = useState<Batch[]>([]);
  const [batchStudents, setBatchStudents] = useState<Record<string, Profile[]>>(
    {},
  );
  const [loadingMockData, setLoadingMockData] = useState(false);
  const [assignmentBatches, setAssignmentBatches] = useState<Batch[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);

  const loadData = async (showToast = false) => {
    setLoading(true);
    try {
      const [instructorsData, coursesData] = (await Promise.all([
        fetchWithAuth("/admin/instructors"),
        fetchWithAuth("/admin/courses-with-instructors"),
      ])) as [Instructor[], Course[]];
      setInstructors(instructorsData || []);
      setCourses(coursesData || []);
      if (showToast) toast.success("Faculty data synchronized");
    } catch (err) {
      console.error("Failed to load data:", err);
      toast.error("Failed to load instructors or courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAssignModal = (instructor: Instructor) => {
    setSelectedInstructor(instructor);
    setSelectedCourseId("");
    setShowAllCourses(true);
    setAssignModalOpen(true);
  };

  const handleOpenProfileModal = async (instructor: Instructor) => {
    setSelectedInstructor(instructor);
    setProfileModalOpen(true);
    setLoadingMockData(true);
    setInstructorBatches([]);
    setBatchStudents({});

    try {
      const assignedCourseIds = courses
        .filter((c) => c.instructor_id === instructor.user_id)
        .map((c) => c.course_id || c.id);

      if (assignedCourseIds.length > 0) {
        const batches = (await fetchWithAuth(
          `/data/batches?course_id=in.(${assignedCourseIds.join(",")})`,
        )) as Batch[];

        if (batches && batches.length > 0) {
          const batchIds = batches.map((b) => b.id);
          const studentBatches = (await fetchWithAuth(
            `/data/student_batches?batch_id=in.(${batchIds.join(",")})`,
          )) as StudentBatch[];

          // Fetch real student profiles
          const studentIds = [
            ...new Set(studentBatches.map((sb) => sb.student_id)),
          ];
          if (studentIds.length > 0) {
           const [profiles, users] = (await Promise.all([
            fetchWithAuth<Profile[]>(`/data/profiles?user_id=in.(${studentIds.join(",")})`),
            fetchWithAuth<User[]>(`/data/users?id=in.(${studentIds.join(",")})`)
          ])) as [Profile[], User[]];

          const userMap = users.reduce((acc, u) => { acc[u.id] = u; return acc; }, {});

          const studentsByBatch: Record<string, Profile[]> = {};

          batches.forEach((b) => {
            const bStudentIds = studentBatches
              .filter((sb) => sb.batch_id === b.id)
              .map((sb) => sb.student_id);

            studentsByBatch[b.id] = bStudentIds.map(sid => {
                const profile = profiles.find(p => p.user_id === sid);
                const user = userMap[sid];
                return {
                    user_id: sid,
                    full_name: profile?.full_name || user?.full_name || 'Student',
                    email: profile?.email || user?.email || 'N/A',
                    avatar_url: profile?.avatar_url
                } as Profile;
            });
          });
          setBatchStudents(studentsByBatch);
          }

          const batchesWithCounts = batches.map((b) => ({
            ...b,
            studentCount: new Set(
              studentBatches
                .filter((sb) => sb.batch_id === b.id)
                .map((sb) => sb.student_id),
            ).size,
          }));

          setInstructorBatches(batchesWithCounts);
        }
      }
    } catch (err) {
      console.error("Failed to load profile batch data:", err);
    } finally {
      setLoadingMockData(false);
    }
  };

  const handleOpenManageAssignments = async (instructor: Instructor) => {
    setSelectedInstructor(instructor);
    setManageAssignmentsOpen(true);
    setLoadingAssignments(true);
    setAssignmentBatches([]);
    try {
      const assignedCourseIds = courses
        .filter((c) => c.instructor_id === instructor.user_id)
        .map((c) => c.course_id || c.id);

      if (assignedCourseIds.length > 0) {
        const batches = (await fetchWithAuth(
          `/data/batches?course_id=in.(${assignedCourseIds.join(",")})`,
        )) as Batch[];

        if (batches && batches.length > 0) {
          const batchIds = batches.map((b) => b.id);
          const studentBatches = (await fetchWithAuth(
            `/data/student_batches?batch_id=in.(${batchIds.join(",")})`,
          )) as StudentBatch[];

          const batchesWithCounts = batches.map((b) => ({
            ...b,
            studentCount: new Set(
              studentBatches
                .filter((sb) => sb.batch_id === b.id)
                .map((sb) => sb.student_id),
            ).size,
          }));
          setAssignmentBatches(batchesWithCounts);
        } else {
          setAssignmentBatches([]);
        }
      }
    } catch (err) {
      console.error("Failed to load assignment batches:", err);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const handleAssignCourse = async () => {
    if (!selectedInstructor || !selectedCourseId) return;

    setAssigning(true);
    try {
      await fetchWithAuth(`/admin/assign-course`, {
        method: "POST", // Use our new dedicated endpoint
        body: JSON.stringify({
          courseId: selectedCourseId,
          instructorId: selectedInstructor.user_id,
        }),
      });

      toast.success(`Course assigned to ${selectedInstructor.full_name}`);
      setAssignModalOpen(false);
      loadData();
    } catch (err) {
      console.error("Failed to assign course:", err);
      toast.error("Failed to assign course");
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignCourse = async (
    courseId: string,
    courseTitle: string,
  ) => {
    if (
      !confirm(
        `Are you sure you want to unassign "${courseTitle}" from this instructor?`,
      )
    )
      return;

    setAssigning(true);
    try {
      await fetchWithAuth(`/data/courses/${courseId}`, {
        method: "PUT",
        body: JSON.stringify({
          instructor_id: null,
        }),
      });

      toast.success(`Course "${courseTitle}" unassigned`);
      loadData();
    } catch (err) {
      console.error("Failed to unassign course:", err);
      toast.error("Failed to unassign course");
    } finally {
      setAssigning(false);
    }
  };

  const handleDeleteInstructor = async (userId: string, name: string) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete instructor "${name}"? This will remove their access and unassign their courses.`,
      )
    ) {
      return;
    }

    setProcessingId(userId);
    try {
      await fetchWithAuth(`/admin/delete-user/${userId}`, {
        method: "DELETE",
      });
      toast.success(`Instructor ${name} deleted successfully`);

      // Update list locally
      setInstructors((prev) => prev.filter((i) => i.user_id !== userId));

      // Also refresh to sync any course changes
      loadData();
    } catch (err) {
      console.error("Failed to delete instructor:", err);
      toast.error("Failed to delete instructor");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredInstructors = instructors.filter(
    (i) =>
      i.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Filter and deduplicate courses for the dropdown
  const uniqueCourses = courses.reduce((acc, current) => {
    const courseId = current.course_id || current.id;
    if (!acc.some((item) => (item.course_id || item.id) === courseId)) {
      acc.push(current);
    }
    return acc;
  }, [] as Course[]);

  const filteredCoursesDropdown = uniqueCourses.filter((course) => {
    if (showAllCourses) return true;
    // By default, only show courses where this instructor is NOT already assigned
    return !course.instructor_ids?.includes(selectedInstructor?.user_id || "");
  });

  const availableCourses = filteredCoursesDropdown.sort((a, b) => {
    const aCount = a.instructor_ids?.length || 0;
    const bCount = b.instructor_ids?.length || 0;
    return aCount - bCount || a.title.localeCompare(b.title);
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          {
            icon: Users,
            label: "Total Instructors",
            value: instructors.length,
            color: "text-indigo-600",
            bg: "bg-indigo-50",
            gradient: "from-indigo-500/10 to-transparent",
          },
          {
            icon: Shield,
            label: "Active Faculty",
            value: instructors.filter((i) => i.status !== "suspended").length,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            gradient: "from-emerald-500/10 to-transparent",
          },
          {
            icon: BookOpen,
            label: "Course Assignments",
            value: courses.filter((c) => c.instructor_ids?.length).length,
            color: "text-orange-600",
            bg: "bg-orange-50",
            gradient: "from-orange-500/10 to-transparent",
          },
        ].map((stat, i) => (
          <Card
            key={i}
            className="rounded-[2rem] border-none shadow-xl shadow-slate-200/40 bg-white/80 backdrop-blur-md overflow-hidden group hover:translate-y-[-4px] transition-all duration-300"
          >
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
                stat.gradient,
              )}
            />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center gap-5">
                <div
                  className={cn(
                    "h-14 w-14 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-transform",
                    stat.bg,
                  )}
                >
                  <stat.icon className={cn("h-7 w-7", stat.color)} />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {stat.value}
                  </p>
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    {stat.label}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      {/* Search & Actions Area */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search instructors by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-14 w-full bg-white border-none shadow-xl shadow-slate-200/20 rounded-2xl focus-visible:ring-2 focus-visible:ring-indigo-600 transition-all font-bold text-slate-900"
          />
        </div>
        <SyncDataButton 
          onSync={onSync || (() => loadData(true))}
          isLoading={parentLoading || loading}
          className="h-14 px-8 shadow-xl shadow-indigo-200/50"
        />
      </div>

      {/* Instructor List */}
      {filteredInstructors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No instructors found</p>
            {searchQuery && (
              <p className="text-sm mt-1">Try adjusting your search</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredInstructors.map((instructor) => {
            const assignedCourses = courses
              .filter((c) => c.instructor_id === instructor.user_id)
              .reduce((acc, current) => {
                const courseId = current.course_id || current.id;
                if (!acc.some((c) => (c.course_id || c.id) === courseId)) {
                  acc.push(current);
                }
                return acc;
              }, [] as Course[]);
            const isSuspended = instructor.status === "suspended";

            return (
              <div
                key={instructor.user_id}
                className={cn(
                  "group relative bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden flex flex-col transition-all duration-500 hover:border-primary/30 hover:translate-y-[-4px]",
                  isSuspended && "opacity-80 grayscale-[0.2]",
                )}
              >
                {/* Status Accent Bar */}
                <div
                  className={cn(
                    "absolute top-0 left-0 right-0 h-1.5",
                    isSuspended ? "bg-rose-500" : "bg-gradient-to-r from-primary to-accent",
                  )}
                />

                <div className="p-7 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-slate-50 shadow-lg bg-slate-100 group-hover:scale-105 transition-transform duration-500">
                        <Avatar className="h-full w-full rounded-none">
                          <AvatarImage
                            src={instructor.avatar_url}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-primary/5 text-primary font-black text-xl">
                            {instructor.full_name?.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div
                        className={cn(
                          "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white shadow-md flex items-center justify-center",
                          isSuspended ? "bg-rose-500" : "bg-primary",
                        )}
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 rounded-xl text-slate-300 hover:text-slate-600 hover:bg-slate-50 transition-all"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-56 p-2 rounded-2xl shadow-2xl border-none bg-white/95 backdrop-blur-md"
                      >
                        <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                          Operations
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() =>
                            handleOpenManageAssignments(instructor)
                          }
                          className="rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 focus:bg-slate-900 focus:text-white transition-colors cursor-pointer"
                        >
                          <BookOpen className="h-4 w-4 mr-3 text-indigo-500" />{" "}
                          Current Assignments
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-100" />
                        {isSuspended ? (
                          <DropdownMenuItem
                            className="rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-emerald-600 focus:bg-emerald-600 focus:text-white transition-colors cursor-pointer"
                            onClick={async () => {
                              try {
                                await fetchWithAuth(
                                  "/admin/update-user-status",
                                  {
                                    method: "PUT",
                                    body: JSON.stringify({
                                      userId: instructor.user_id,
                                      status: "approved",
                                    }),
                                  },
                                );
                                toast.success("Instructor node active");
                                loadData();
                              } catch (err) {
                                toast.error("Sync failure");
                              }
                            }}
                          >
                            <UnlockIcon className="h-4 w-4 mr-3" /> Unsuspend
                            Access
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-amber-600 focus:bg-amber-600 focus:text-white transition-colors cursor-pointer"
                            onClick={async () => {
                              if (!confirm(`Suspend ${instructor.full_name}?`))
                                return;
                              try {
                                await fetchWithAuth(
                                  "/admin/update-user-status",
                                  {
                                    method: "PUT",
                                    body: JSON.stringify({
                                      userId: instructor.user_id,
                                      status: "suspended",
                                      suspensionDays: "30",
                                    }),
                                  },
                                );
                                toast.success("Instructor offline");
                                loadData();
                              } catch (err) {
                                toast.error("Action failed");
                              }
                            }}
                          >
                            <LockIcon className="h-4 w-4 mr-3" /> Suspend
                            Faculty
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-rose-600 focus:bg-rose-600 focus:text-white transition-colors cursor-pointer"
                          onClick={() =>
                            handleDeleteInstructor(
                              instructor.user_id,
                              instructor.full_name,
                            )
                          }
                        >
                          <Trash2 className="h-4 w-4 mr-3" /> Delete Account
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xl font-black text-slate-900 tracking-tighter leading-none group-hover:text-primary transition-colors truncate">
                      {instructor.full_name}
                    </h4>
                    <p className="text-sm font-bold text-slate-400 truncate">
                      {instructor.email}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className="bg-primary/10 text-primary border-none px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">
                      Academic Faculty
                    </Badge>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                      <Calendar className="h-3 w-3 text-primary" />
                      {instructor.created_at
                        ? new Date(instructor.created_at).toLocaleDateString(
                            undefined,
                            { month: "short", year: "numeric" },
                          )
                        : "N/A"}
                    </div>
                  </div>

                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between group/status">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                        Curriculum Activity
                      </p>
                      <p className="text-sm font-black text-slate-800 tracking-tighter">
                        Teaching {assignedCourses.length} Courses
                      </p>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-primary transform group-hover/status:rotate-12 transition-transform">
                      <BookOpen className="h-5 w-5" />
                    </div>
                  </div>
                </div>

                <div className="mt-auto p-4 bg-slate-50/30 border-t border-slate-100 flex gap-3">
                  <Button
                    onClick={() => handleOpenProfileModal(instructor)}
                    className="flex-1 h-14 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:translate-y-[-2px] active:translate-y-0"
                  >
                    Manage Profile
                    <ArrowRight className="h-4 w-4 ml-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Profile Modal */}
      <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
        <DialogContent className="max-w-2xl bg-white/95 backdrop-blur-xl border-slate-200/60 shadow-2xl rounded-[2.5rem] p-0 overflow-hidden border-none pro-modal">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent pointer-events-none" />

          <DialogHeader className="p-8 pb-4 relative z-10 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <DialogTitle className="flex items-center gap-3 text-2xl font-black text-slate-900 tracking-tight text-center sm:text-left">
                <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center border border-primary/10 shadow-inner group shrink-0">
                  <Award className="h-6 w-6 text-primary group-hover:rotate-12 transition-transform" />
                </div>
                <div className="flex flex-col sm:flex-row items-center sm:gap-2">
                  <span>Instructor</span>
                  <span className="text-primary italic">Profile</span>
                </div>
              </DialogTitle>
              <Badge className="bg-emerald-500/10 text-emerald-600 border-none px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0">
                Certified Faculty
              </Badge>
            </div>
            <DialogDescription className="text-slate-500 font-medium text-sm mt-1 text-center sm:text-left">
              Management overview for assigned courses and student enrollment.
            </DialogDescription>
          </DialogHeader>

          {selectedInstructor && (
            <div className="px-5 sm:px-8 pb-20 pt-2 space-y-8 relative z-10 max-h-[75vh] overflow-y-auto scrollbar-hide">
              <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-6 sm:gap-8 bg-white/60 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] border border-white shadow-2xl shadow-slate-200/40 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative z-10 flex flex-col items-center">
                  <Avatar className="h-32 w-32 rounded-[2.5rem] border-4 border-white shadow-2xl shrink-0 overflow-hidden group-hover:scale-105 transition-transform duration-500">
                    <AvatarImage
                      src={selectedInstructor.avatar_url}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-5xl font-black text-primary bg-primary/5">
                      {selectedInstructor.full_name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 -right-2 h-10 w-10 rounded-2xl bg-emerald-500 border-4 border-white flex items-center justify-center shadow-lg">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="text-center sm:text-left space-y-4 relative z-10 min-w-0 flex-1 w-full">
                  <h3 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter leading-tight truncate w-full group-hover:text-primary transition-colors">
                    {selectedInstructor.full_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1 justify-center sm:justify-start">
                    <Badge className="bg-slate-900 text-white border-none py-1.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest">
                      {selectedInstructor.role === "admin"
                        ? "Root Administrator"
                        : "Academic Faculty"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        "rounded-xl py-1.5 px-4 text-[10px] uppercase font-black tracking-widest border-none",
                        selectedInstructor.status === "suspended"
                          ? "bg-rose-50 text-rose-600"
                          : "bg-emerald-50 text-emerald-600",
                      )}
                    >
                      {selectedInstructor.status === "suspended"
                        ? "Suspended"
                        : "Support Active"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    label: "Official Email",
                    value: selectedInstructor.email,
                    icon: Mail,
                  },
                  {
                    label: "Contact Terminal",
                    value:
                      selectedInstructor.mobile_number ||
                      selectedInstructor.phone ||
                      "N/A",
                    icon: Phone,
                  },
                  {
                    label: "Platform Role",
                    value:
                      selectedInstructor.role === "admin"
                        ? "System Administrator"
                        : "Senior Instructor",
                    icon: Award,
                  },
                  {
                    label: "Teaching Tenure",
                    value: selectedInstructor.created_at
                      ? new Date(
                          selectedInstructor.created_at,
                        ).toLocaleDateString(undefined, {
                          month: "long",
                          year: "numeric",
                        })
                      : "March 2026",
                    icon: Calendar,
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-white border border-slate-100 space-y-2 shadow-sm transition-all hover:border-indigo-600/20 hover:shadow-md group flex flex-col items-center sm:items-start text-center sm:text-left"
                  >
                    <div className="flex items-center justify-between w-full">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mx-auto sm:mx-0">
                        {item.label}
                      </p>
                      <item.icon className="h-3.5 w-3.5 text-slate-300 group-hover:text-indigo-600 transition-colors hidden sm:block" />
                    </div>
                    <p className="text-sm font-black text-slate-800 truncate w-full">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* New Feature: Batch & Student Lists */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <Users className="h-4 w-4 text-indigo-600" />
                    </div>
                    Candidate Enrollment
                  </h4>
                  <div className="flex items-center gap-3 bg-slate-50/50 px-4 py-2 rounded-2xl border border-slate-100 shadow-inner">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Total Students
                    </span>
                    <Badge className="bg-indigo-600 text-white border-none text-[10px] font-black rounded-lg h-6 px-3 shadow-lg shadow-indigo-100">
                      {new Set(Object.values(batchStudents).flatMap(list => list.map(s => s.user_id))).size}
                    </Badge>
                  </div>
                </div>

                {loadingMockData ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Skeleton
                        key={i}
                        className="h-28 w-full rounded-[1.5rem]"
                      />
                    ))}
                  </div>
                ) : instructorBatches.length === 0 ? (
                  <div className="p-12 text-center bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200 group hover:border-primary/20 transition-all duration-500">
                    <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Users className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                      Student pool is currently empty
                    </p>
                    <p className="text-[10px] text-slate-300 font-bold mt-2">
                      ASSIGN COURSES TO INITIALIZE BATCH NODES
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 pr-1">
                    {instructorBatches.map((batch) => (
                      <div
                        key={batch.id}
                        className="space-y-5 bg-slate-50/30 p-4 sm:p-5 rounded-[1.5rem] border border-slate-100 hover:border-indigo-600/10 transition-all shadow-sm"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                              <BookOpen className="h-5 w-5 text-slate-400" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-900 uppercase tracking-tight leading-tight truncate">
                                {batch.batch_name}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">

                                </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                            <div className="sm:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              Enrolled Personnel
                            </div>
                            <div>
                              <p className="text-xl font-black text-slate-900 leading-none">
                                {batch.studentCount || 0}
                              </p>
                              <p className="hidden sm:block text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                Personnel
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2.5 pt-2">
                          {batchStudents[batch.id]?.length > 0 ? (
                            batchStudents[batch.id].map((student) => (
                              <div
                                key={student.user_id}
                                className="flex items-center gap-3 p-1.5 pr-4 rounded-full bg-white border border-slate-100 shadow-sm hover:border-indigo-600/30 hover:shadow-md transition-all group/student cursor-default max-w-full"
                              >
                                <Avatar className="h-7 w-7 rounded-full border border-slate-50 group-hover/student:scale-110 transition-transform shrink-0">
                                  <AvatarImage src={student.avatar_url} />
                                  <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black italic">
                                    {student.full_name?.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="text-[11px] font-black text-slate-900 tracking-tight leading-none truncate">
                                    {student.full_name}
                                  </p>
                                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5 truncate">
                                    Academic Student
                                  </p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="w-full py-4 text-center border border-dashed border-slate-200 rounded-xl">
                              <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">
                                No candidates assigned
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-8 border-t flex flex-col sm:flex-row gap-3 pb-8">
                <Button
                  variant="ghost"
                  className="rounded-2xl flex-1 font-black uppercase tracking-widest text-[10px] h-12"
                  onClick={() => setProfileModalOpen(false)}
                >
                  Close Profile Window
                </Button>
                {selectedInstructor.status === "suspended" ? (
                  <Button
                    className="rounded-2xl flex-1 bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200 font-black uppercase tracking-widest text-[10px] h-12"
                    onClick={async () => {
                      try {
                        await fetchWithAuth("/admin/update-user-status", {
                          method: "PUT",
                          body: JSON.stringify({
                            userId: selectedInstructor.user_id,
                            status: "approved",
                          }),
                        });
                        toast.success("Access binary restored");
                        setProfileModalOpen(false);
                        loadData();
                      } catch (err) {
                        toast.error("Sync failure");
                      }
                    }}
                  >
                    Restore Instructor Access
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    className="rounded-2xl flex-1 shadow-xl shadow-rose-100 font-black uppercase tracking-widest text-[10px] h-12"
                    onClick={async () => {
                      if (
                        !confirm(
                          `Force suspend ${selectedInstructor.full_name}?`,
                        )
                      )
                        return;
                      try {
                        await fetchWithAuth("/admin/update-user-status", {
                          method: "PUT",
                          body: JSON.stringify({
                            userId: selectedInstructor.user_id,
                            status: "suspended",
                            suspensionDays: "30",
                          }),
                        });
                        toast.success("Instructor node offline");
                        setProfileModalOpen(false);
                        loadData();
                      } catch (err) {
                        toast.error("Protocol failed");
                      }
                    }}
                  >
                    Suspend Instructor Access
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Assignments Modal */}
      <Dialog
        open={manageAssignmentsOpen}
        onOpenChange={setManageAssignmentsOpen}
      >
        <DialogContent className="sm:max-w-2xl bg-white/95 backdrop-blur-xl border-none shadow-2xl rounded-[2.5rem] p-0 overflow-hidden pro-modal">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-500/20 via-indigo-50/5 to-transparent pointer-events-none" />

          <DialogHeader className="p-8 pb-4 relative z-10 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <DialogTitle className="flex items-center gap-3 text-2xl font-black text-slate-900 tracking-tight text-center sm:text-left">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100 shadow-inner group shrink-0">
                  <BookOpen className="h-6 w-6 text-indigo-600 group-hover:rotate-12 transition-transform" />
                </div>
                <div className="flex flex-col sm:flex-row items-center sm:gap-2">
                  <span>Current</span>
                  <span className="text-indigo-600 italic">Assignments</span>
                </div>
              </DialogTitle>
              <Badge className="bg-indigo-50 text-indigo-600 border-none px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shrink-0">
                Faculty workload
              </Badge>
            </div>
            <DialogDescription className="text-slate-500 font-medium text-sm mt-1 text-center sm:text-left">
              Courses and active batch sessions currently assigned to <b>{selectedInstructor?.full_name}</b>.
            </DialogDescription>
          </DialogHeader>

          <div className="px-8 pb-8 pt-2 space-y-6 relative z-10 max-h-[60vh] overflow-y-auto scrollbar-hide">
            {loadingAssignments ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  Loading assignment details...
                </p>
              </div>
            ) : (() => {
              const uniqueAssignedCourses = courses
                .filter((c) => c.instructor_id === selectedInstructor?.user_id)
                .reduce((acc, current) => {
                  const courseId = current.course_id || current.id;
                  if (!acc.some((c) => (c.course_id || c.id) === courseId)) {
                    acc.push(current);
                  }
                  return acc;
                }, [] as Course[]);

              if (uniqueAssignedCourses.length === 0) {
                return (
                  <div className="p-12 text-center bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                    <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="h-8 w-8 text-slate-300" />
                    </div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
                      No assigned courses found
                    </p>
                    <p className="text-[10px] text-slate-300 font-bold mt-2 uppercase">
                      ASSIGN COURSES FROM CURRICULUM MANAGEMENT
                    </p>
                  </div>
                );
              }

              return uniqueAssignedCourses.map((course) => {
                const courseBatches = assignmentBatches.filter(
                  (b) => b.course_id === course.id,
                );

                return (
                  <div
                    key={course.id}
                    className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-md hover:shadow-lg transition-all duration-300 space-y-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                          <BookOpen className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="text-md font-black text-slate-900 tracking-tight leading-tight">
                            {course.title}
                          </h4>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                            {course.category || "Curriculum Course"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 px-4 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors border border-rose-100/50 hover:border-rose-200 self-start sm:self-center"
                        onClick={() =>
                          handleUnassignCourse(course.id, course.title)
                        }
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Unassign Course
                      </Button>
                    </div>

                    {/* Batches Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Associated Batches
                        </span>
                        <Badge className="bg-indigo-50 text-indigo-600 border-none text-[10px] font-black rounded-lg h-5 px-2">
                          {courseBatches.length} {courseBatches.length === 1 ? 'Batch' : 'Batches'}
                        </Badge>
                      </div>

                      {courseBatches.length === 0 ? (
                        <div className="p-6 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/60">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            No active batches assigned for this course
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {courseBatches.map((batch) => (
                            <div
                              key={batch.id}
                              className="bg-slate-50/50 hover:bg-slate-50 border border-slate-100/80 hover:border-indigo-100 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between space-y-3 shadow-sm"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate max-w-[120px]">
                                    {batch.batch_name}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] font-black px-1.5 py-0.5 tracking-tighter uppercase text-slate-500 border-slate-200 shrink-0 whitespace-nowrap bg-white"
                                  >
                                    {batch.batch_type}
                                  </Badge>
                                </div>

                              </div>

                              <div className="flex items-center justify-between border-t border-slate-100/50 pt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span>Students</span>
                                <Badge className="bg-indigo-600 text-white border-none text-[9px] font-black rounded-md h-5 px-2">
                                  {batch.studentCount || 0} Enrolled
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          <DialogFooter className="p-6 border-t border-slate-100 bg-slate-50/30">
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-[10px] border-slate-200 hover:bg-slate-50"
              onClick={() => setManageAssignmentsOpen(false)}
            >
              Close Current Assignments
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Course Modal */}
      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent className="max-w-md bg-white/95 backdrop-blur-xl border-none shadow-2xl rounded-[2.5rem] p-8 pro-modal">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">
                Assign Course to{" "}
                <span className="text-primary italic">Instructor</span>
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
              Assigning <b>{selectedInstructor?.full_name}</b> as a primary
              instructor for a selected course.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 space-y-6">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-primary/20 transition-all">
              <div className="space-y-0.5">
                <Label
                  htmlFor="show-all"
                  className="text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer"
                >
                  Re-assignment Protocol
                </Label>
                <p className="text-[9px] text-slate-400 font-bold uppercase">
                  Include already assigned nodes
                </p>
              </div>
              <UISwitch
                id="show-all"
                checked={showAllCourses}
                onCheckedChange={(checked) =>
                  setShowAllCourses(checked as boolean)
                }
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">
                Select Curriculum Node
              </label>
              <Select
                value={selectedCourseId}
                onValueChange={setSelectedCourseId}
              >
                <SelectTrigger className="h-14 rounded-2xl bg-white border-slate-200 shadow-sm focus:ring-primary/20 focus:border-primary/50 font-bold text-slate-700">
                  <SelectValue placeholder="Select a course..." />
                </SelectTrigger>
                <SelectContent className="max-h-[300px] p-1 rounded-2xl shadow-2xl border-slate-200/60 overflow-hidden">
                  {availableCourses.length === 0 ? (
                    <div className="p-12 text-center space-y-3">
                      <div className="h-12 w-12 bg-slate-50 rounded-xl mx-auto flex items-center justify-center border border-dashed border-slate-200">
                        <BookOpen className="h-6 w-6 text-slate-200" />
                      </div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        No nodes available
                      </p>
                    </div>
                  ) : (
                    availableCourses.map((course) => {
                      const isAssignedToThis = course.instructor_ids?.includes(
                        selectedInstructor?.user_id || "",
                      );
                      const count = course.instructor_ids?.length || 0;

                      return (
                        <SelectItem
                          key={course.id}
                          value={String(course.id)}
                          disabled={isAssignedToThis}
                          className="rounded-xl py-3 focus:bg-primary/5 cursor-pointer group"
                        >
                          <div className="flex items-center justify-between w-full gap-4 pr-2">
                            <div className="min-w-0 flex flex-col">
                              <span className="truncate max-w-[180px] font-bold text-slate-900 group-hover:text-primary transition-colors">
                                {course.title}
                              </span>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                {course.category || "Curriculum Asset"}
                              </span>
                            </div>
                            <div className="shrink-0 flex items-center gap-1.5">
                              {isAssignedToThis ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[8px] font-black uppercase tracking-widest px-2 h-5">
                                  Current
                                </Badge>
                              ) : count > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="text-[8px] font-black uppercase tracking-widest px-2 h-5 border-slate-200 text-slate-400"
                                >
                                  {count} Assigned
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-500 text-white border-none text-[8px] font-black uppercase tracking-widest px-2 h-5 shadow-lg shadow-emerald-100">
                                  Unassigned
                                </Badge>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-3 sm:flex-col lg:flex-row">
            <Button
              variant="outline"
              className="h-12 rounded-2xl flex-1 font-bold text-slate-600 hover:bg-slate-50"
              onClick={() => setAssignModalOpen(false)}
            >
              Cancel Session
            </Button>
            <Button
              onClick={handleAssignCourse}
              disabled={!selectedCourseId || assigning}
              className="h-12 rounded-2xl flex-[2] font-black uppercase tracking-widest text-[11px] shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
            >
              {assigning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Synchronizing...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Deploy Assignment
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}