import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Play, BookOpen, Clock, Sparkles, ChevronRight, LayoutGrid, Layers, CheckCircle, Ban } from "lucide-react";
import { useEnrolledCourses, useAvailableCourses, StudentCourse, useStudentBatch } from "@/hooks/useStudentData";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CourseListProps {
    type?: 'enrolled' | 'available';
    onSelectCourse?: (course: StudentCourse) => void;
}

function CourseBatchBadge({ courseId }: { courseId: string }) {
    const { data: batch, isLoading } = useStudentBatch(courseId);

    if (isLoading || !batch) return null;

    const formatTime = (time?: string) => {
        if (!time) return '';
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH}:${minutes} ${ampm}`;
    };

    return (
        <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-xl animate-in fade-in slide-in-from-left-2">
            <Layers className="h-3 w-3 text-primary" />
            <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-primary leading-tight">Assigned: {batch.batch_name}</span>
            </div>
        </div>
    );
}

// Remove getYouTubeId as courses now use direct S3 image uploads

export function CourseList({ type = 'enrolled', onSelectCourse }: CourseListProps = {}) {
    const enrolledQuery = useEnrolledCourses();
    const availableQuery = useAvailableCourses();

    const query = type === 'enrolled' ? enrolledQuery : availableQuery;
    const { isLoading } = query;
    let { data: courses } = query;

    // Filter available courses to hide already enrolled ones + hide revoked courses from catalog
    if (type === 'available' && courses && enrolledQuery.data) {
        const enrolledIds = new Set(enrolledQuery.data.map(c => c.id || c._id));
        const revokedIds = new Set(enrolledQuery.data.filter((c: any) => c.is_revoked).map(c => c.id || c._id));
        courses = courses.filter(c => !enrolledIds.has(c.id || c._id) || revokedIds.has(c.id || c._id));
        // Fully hide revoked from catalog (they appear in My Courses with revoked badge)
        courses = courses.filter(c => !revokedIds.has(c.id || c._id));
    }

    // Sort alphabetically by title
    if (courses) {
        courses = [...courses].sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    if (isLoading) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="pro-card border-none shadow-sm overflow-hidden">
                        <Skeleton className="h-48 w-full" />
                        <CardHeader className="space-y-3">
                            <Skeleton className="h-5 w-3/4 rounded-full" />
                            <Skeleton className="h-4 w-1/2 rounded-full" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-10 w-full rounded-xl" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!courses || courses.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-primary/20 rounded-3xl bg-primary/5 backdrop-blur-sm"
            >
                <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <LayoutGrid className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight mb-2">No Courses Found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                    {type === 'enrolled'
                        ? "You haven't enrolled in any courses yet. Start your learning journey by exploring our available courses!"
                        : "There are currently no public courses available. Please check back later!"}
                </p>
            </motion.div>
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start">
            {courses.map((course: StudentCourse, index: number) => {
                const thumbnailUrl = course.thumbnail_url
                    ? (course.thumbnail_url.startsWith('http') ? course.thumbnail_url : (course.thumbnail_url.includes('s3') ? course.thumbnail_url : `/s3/public/${course.thumbnail_url}`))
                    : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop';

                return (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        key={course.id}
                        className="group relative"
                    >
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 to-accent/10 rounded-[2rem] blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                        <Card
                            className="pro-card relative flex flex-col h-full overflow-hidden cursor-pointer"
                            onClick={() => {
                                if ((course as any).is_revoked) return; // Block access to revoked courses
                                const isTerm2Pending = course.payment_term === 'term2' && course.category === 'remove';
                                const isApprovedWithBalance = course.category === 'approve' && (course.remaining_balance || 0) > 0;
                                const isDeactivated = course.enrollmentStatus === 'deactivate';
                                
                                if (type === 'enrolled' && (course.enrollmentStatus === 'active' || isDeactivated) && (isApprovedWithBalance || isTerm2Pending || isDeactivated)) {
                                    window.dispatchEvent(new CustomEvent('open-payment-modal', { detail: { course } }));
                                } else if (onSelectCourse) {
                                    onSelectCourse(course);
                                }
                            }}
                        >
                            <div className="aspect-[16/10] relative overflow-hidden bg-muted">
                                <img
                                    src={thumbnailUrl}
                                    alt={course.title}
                                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700 ease-in-out"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5 opacity-80 group-hover:opacity-100 transition-opacity">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md">
                                            {course.category || 'Course'}
                                        </Badge>
                                        {(type === 'enrolled' || course.enrollmentStatus) && course.enrollmentStatus && (
                                            <Badge 
                                                variant="secondary" 
                                                className={`border-none backdrop-blur-md gap-1 ${
                                                    (course as any).is_revoked ? 'bg-rose-600/90 hover:bg-rose-600 text-white' :
                                                    course.enrollmentStatus === 'active' ? 'bg-green-500/80 hover:bg-green-500 text-white' :
                                                    course.enrollmentStatus === 'pending' ? 'bg-amber-500/80 hover:bg-amber-500 text-white' :
                                                    'bg-red-500/80 hover:bg-red-500 text-white'
                                                }`}
                                            >
                                                {(course as any).is_revoked ? <><Ban className="h-3 w-3" /> Revoked</> :
                                                 course.enrollmentStatus === 'active' ? (type === 'available' ? 'Enrolled' : 'Approved') : 
                                                 course.enrollmentStatus === 'pending' ? 'Pending' : 'Rejected'}
                                            </Badge>
                                        )}
                                        {course.status === 'published' && type === 'available' && !course.enrollmentStatus && (
                                            <Badge variant="secondary" className="bg-green-500/80 hover:bg-green-500 text-white border-none backdrop-blur-md gap-1">
                                                <Sparkles className="h-3 w-3" /> New
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                                    <div className="h-16 w-16 rounded-full bg-primary/90 flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-500 shadow-xl shadow-primary/30 backdrop-blur-sm">
                                        <Play className="h-8 w-8 text-primary-foreground fill-current ml-1" />
                                    </div>
                                </div>
                            </div>

                            <CardHeader className="p-5 pb-2">
                                <div className="flex justify-between items-start gap-2">
                                    <CardTitle className="text-xl leading-tight font-bold group-hover:text-primary transition-colors line-clamp-2">
                                        {course.title}
                                    </CardTitle>
                                </div>
                                <CardDescription className="line-clamp-2 mt-2 text-sm text-muted-foreground leading-relaxed">
                                    {course.description || "Explore this comprehensive course and enhance your skills."}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-5 pt-0 flex flex-col flex-1">


                                <div className="mt-auto">
                                    {type === 'enrolled' ? (
                                        <div className="space-y-4 p-4 bg-muted/30 rounded-2xl border border-border/50 transition-colors group-hover:bg-primary/5 group-hover:border-primary/20">

                                        {(course as any).is_revoked ? (
                                            <div className="text-center py-3">
                                                <Badge variant="secondary" className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200 gap-1">
                                                    <Ban className="h-3 w-3" /> Access Revoked
                                                </Badge>
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    {(course as any).revoke_until
                                                        ? `Access restores on ${new Date((course as any).revoke_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                                        : 'Contact admin to restore access'}
                                                </p>
                                            </div>
                                        ) : course.enrollmentStatus === 'pending' ? (
                                            <div className="text-center py-2">
                                                <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200 gap-1">
                                                    Pending Approval
                                                </Badge>
                                                <p className="text-xs text-muted-foreground mt-2">Your enrollment is waiting for admin approval</p>
                                            </div>
                                        ) : course.enrollmentStatus === 'deactivate' ? (
                                            <div className="text-center py-2">
                                                <Badge variant="secondary" className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-rose-200 gap-1 animate-pulse">
                                                    Payment Pending
                                                </Badge>
                                                <p className="text-xs text-muted-foreground mt-2">Access restricted until payment is cleared</p>
                                            </div>
                                        ) : course.enrollmentStatus === 'rejected' ? (
                                            <div className="text-center py-2">
                                                <Badge variant="destructive" className="gap-1">
                                                    Enrollment Rejected
                                                </Badge>
                                                <p className="text-xs text-muted-foreground mt-2">Please contact support for more information</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex-1">
                                                    <CourseBatchBadge courseId={course.id} />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="mt-auto space-y-4">
                                        {course.enrollmentStatus === 'active' ? (
                                            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 text-center">
                                                <p className="text-xs font-bold text-emerald-700">You are enrolled in this course.</p>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="mt-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 font-bold"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelectCourse?.(course);
                                                    }}
                                                >
                                                    View Content <ChevronRight className="h-3 w-3 ml-1" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100/50">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fee</span>
                                                        <span className="text-sm font-bold text-slate-900">Free of Cost</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Access</span>
                                                        <p className="text-[16px] font-black text-emerald-600 leading-none mt-0.5">
                                                            Lifetime Free
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                <Button
                                                    className="w-full group/btn pro-button-primary mt-2"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelectCourse?.(course);
                                                    }}
                                                >
                                                    Enroll Now
                                                    <ChevronRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                        </Card>
                    </motion.div>
                )
            })}
        </div>
    );
}