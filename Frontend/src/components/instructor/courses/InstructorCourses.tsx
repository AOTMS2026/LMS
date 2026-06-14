import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayCircle, Edit, ArrowRight, Trash2, Layers, Clock, AlertCircle, CheckCircle, Send, FileEdit, MoreHorizontal, RefreshCw, Plus, Archive, ShieldAlert, BookOpen as BookOpenIcon, Calendar, Eye, Users, ShieldCheck } from 'lucide-react';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter 
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useInstructorS3Courses } from '@/hooks/useCourseBuilder';
import { API_URL } from '@/lib/api';
import { Course } from '@/hooks/useInstructorData';
import { CourseBuilder } from './CourseBuilder';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { fetchWithAuth } from '@/lib/api';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface InstructorCoursesProps {
    limit?: number;
    hideHeader?: boolean;
    showAll?: boolean;
    title?: string;
}

interface InstructorProfile {
    _id?: string;
    id?: string;
    full_name?: string;
    avatar_url?: string;
    assigned_session?: 'morning' | 'afternoon' | 'evening';
    is_approved?: boolean;
}

interface CourseWithSession extends Course {
    assigned_session?: 'morning' | 'afternoon' | 'evening';
    occupied_sessions?: string[];
}

export function InstructorCourses({ limit, hideHeader, showAll: initialShowAll, title }: InstructorCoursesProps = {}) {
    const [viewTab, setViewTab] = useState<'my' | 'catalog'>(initialShowAll ? 'catalog' : 'my');
    const { user } = useAuth();
    const { data: allCourses, isLoading, refetch } = useInstructorS3Courses(viewTab === 'catalog');
    const { toast } = useToast();
    
    const courses = (limit && Array.isArray(allCourses)) 
        ? (allCourses as Course[]).slice(0, limit) 
        : (Array.isArray(allCourses) ? allCourses : []) as Course[];
    const [viewingCourse, setViewingCourse] = useState<Course | null>(null);
    const [selectedProfile, setSelectedProfile] = useState<Course | null>(null);
    const [showProfile, setShowProfile] = useState(false);
    const [processing, setProcessing] = useState<string | null>(null);
    const [showEnrollModal, setShowEnrollModal] = useState(false);
    const [enrollingCourse, setEnrollingCourse] = useState<Course | null>(null);
    const [dealingSession, setDealingSession] = useState<'morning' | 'afternoon' | 'evening'>('morning');
    const [batchData, setBatchData] = useState({
        name: '',
        capacity: 50,
        startTime: '07:00',
        endTime: '09:00'
    });

    // New Course creation state
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creatingCourse, setCreatingCourse] = useState(false);
    const [newCourseData, setNewCourseData] = useState({
        title: '',
        description: '',
        category: 'Engineering',
        level: 'beginner',
        duration: '4 Months',
    });

    const handleCreateCourse = async () => {
        if (!newCourseData.title.trim()) {
            toast({ title: 'Error', description: 'Course title is required', variant: 'destructive' });
            return;
        }
        setCreatingCourse(true);
        try {
            const result = await fetchWithAuth('/data/courses', {
                method: 'POST',
                body: JSON.stringify({
                    ...newCourseData,
                    instructor_id: user?.id,
                    instructor_ids: [user?.id],
                    status: 'draft',
                    price: 0,
                    original_price: 19999,
                    is_active: true,
                }),
            }) as Course;
            toast({ title: 'Course Created', description: `"${newCourseData.title}" created as draft. Awaiting approval.` });
            setShowCreateModal(false);
            setNewCourseData({ title: '', description: '', category: 'Engineering', level: 'beginner', duration: '4 Months' });
            refetch();
            if (result?.id || (result as unknown as { _id: string })?._id) {
                setViewingCourse(result);
            }
        } catch (err: unknown) {
            toast({ title: 'Error', description: (err as Error).message || 'Failed to create course', variant: 'destructive' });
        } finally {
            setCreatingCourse(false);
        }
    };

    const handleSubmitForReview = async (courseId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setProcessing(courseId);
        try {
            await fetchWithAuth('/instructor/submit-course', {
                method: 'POST',
                body: JSON.stringify({ courseId })
            });
            toast({ title: 'Success', description: 'Course submitted for review' });
            refetch();
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to submit course', variant: 'destructive' });
        } finally {
            setProcessing(null);
        }
    };

    const handleSaveDraft = async (courseId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setProcessing(courseId);
        try {
            await fetchWithAuth('/instructor/save-draft', {
                method: 'POST',
                body: JSON.stringify({ courseId })
            });
            toast({ title: 'Success', description: 'Course saved as draft' });
            refetch();
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to save draft', variant: 'destructive' });
        } finally {
            setProcessing(null);
        }
    };


    const [assigning, setAssigning] = useState<string | null>(null);

    const handleAssignToMe = async (courseId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setAssigning(courseId);
        try {
            await fetchWithAuth(`/instructor/choose-course`, {
                method: 'POST',
                body: JSON.stringify({ 
                    courseId,
                    dealing_session: dealingSession,
                    batch_name: batchData.name || undefined,
                    capacity: batchData.capacity,
                    start_time: batchData.startTime,
                    end_time: batchData.endTime
                })
            });
            toast({ 
                title: 'Request Sent', 
                description: `Batch "${batchData.name || dealingSession}" initialized.` 
            });
            setShowEnrollModal(false);
            refetch();
        } catch (err) {
            toast({ title: 'Error', description: 'Failed to request enrollment.', variant: 'destructive' });
        } finally {
            setAssigning(null);
        }
    };

    if (viewingCourse) {
        return <CourseBuilder course={viewingCourse} onBack={() => setViewingCourse(null)} />;
    }

    return (
        <div className="space-y-6">
            {!hideHeader && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="space-y-2 w-full sm:w-auto">
                        <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as 'my' | 'catalog')} className="w-full sm:w-auto overflow-x-auto">
                            <TabsList className="bg-slate-100/50 p-1 rounded-xl w-full sm:w-auto flex">
                                <TabsTrigger value="my" className="rounded-lg px-4 sm:px-6 py-2 flex-1 sm:flex-none text-xs sm:text-sm">My Courses</TabsTrigger>
                                <TabsTrigger value="catalog" className="rounded-lg px-4 sm:px-6 py-2 flex-1 sm:flex-none text-xs sm:text-sm">Catalogue</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <p className="text-muted-foreground text-[10px] sm:text-xs font-medium max-w-md">
                            {viewTab === 'catalog' ? 'Explore and choose curricula to teach.' : 'View your assigned courses.'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button onClick={() => setShowCreateModal(true)} size="sm" className="hidden sm:flex gap-2 rounded-xl bg-primary text-white hover:bg-primary/90">
                            <Plus className="h-4 w-4" />
                            New Course
                        </Button>
                        <Button onClick={() => refetch()} variant="outline" size="sm" className="hidden sm:flex gap-2 shrink-0 rounded-xl">
                            <RefreshCw className="h-4 w-4" />
                            Sync
                        </Button>
                    </div>
                </div>
            )}

            {/* Create New Course Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 max-w-lg bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Create New Course</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">Fill in the details to create a new course draft. It will be sent for admin approval.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-5 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Course Title *</Label>
                            <Input
                                placeholder="e.g. Advanced Data Structures"
                                value={newCourseData.title}
                                onChange={e => setNewCourseData(p => ({ ...p, title: e.target.value }))}
                                className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:ring-primary/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Description</Label>
                            <textarea
                                placeholder="Brief description of course content..."
                                value={newCourseData.description}
                                onChange={e => setNewCourseData(p => ({ ...p, description: e.target.value }))}
                                className="w-full h-24 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Category</Label>
                                <Select value={newCourseData.category} onValueChange={v => setNewCourseData(p => ({ ...p, category: v }))}>
                                    <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 font-bold text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl">
                                        <SelectItem value="Engineering" className="font-bold">Engineering</SelectItem>
                                        <SelectItem value="Coding" className="font-bold">Coding</SelectItem>
                                        <SelectItem value="Aptitude" className="font-bold">Aptitude</SelectItem>
                                        <SelectItem value="Reasoning" className="font-bold">Reasoning</SelectItem>
                                        <SelectItem value="Data Science" className="font-bold">Data Science</SelectItem>
                                        <SelectItem value="AI & ML" className="font-bold">AI & ML</SelectItem>
                                        <SelectItem value="Web Development" className="font-bold">Web Development</SelectItem>
                                        <SelectItem value="Soft Skills" className="font-bold">Soft Skills</SelectItem>
                                        <SelectItem value="General" className="font-bold">General</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Level</Label>
                                <Select value={newCourseData.level} onValueChange={v => setNewCourseData(p => ({ ...p, level: v }))}>
                                    <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 font-bold text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl">
                                        <SelectItem value="beginner" className="font-bold">Beginner</SelectItem>
                                        <SelectItem value="intermediate" className="font-bold">Intermediate</SelectItem>
                                        <SelectItem value="advanced" className="font-bold">Advanced</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Duration</Label>
                            <Input
                                placeholder="e.g. 4 Months"
                                value={newCourseData.duration}
                                onChange={e => setNewCourseData(p => ({ ...p, duration: e.target.value }))}
                                className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:ring-primary/20"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateModal(false)} className="rounded-xl h-12">Cancel</Button>
                        <Button onClick={handleCreateCourse} disabled={creatingCourse} className="rounded-xl h-12 bg-primary text-white gap-2">
                            {creatingCourse ? <><RefreshCw className="h-4 w-4 animate-spin" /> Creating...</> : <><Plus className="h-4 w-4" /> Create Course</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Training Batch Modal - Styled exactly like the image */}
            <Dialog open={showEnrollModal} onOpenChange={setShowEnrollModal}>
                <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 max-w-md bg-white">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Create Training Batch</DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium">Define the schedule and capacity for a new student cohort.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Batch Label</Label>
                            <Input 
                                placeholder="e.g. Morning Batch 1" 
                                value={batchData.name}
                                onChange={(e) => setBatchData(prev => ({ ...prev, name: e.target.value }))}
                                className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:ring-primary/20" 
                            />
                        </div>

                    </div>

                    <DialogFooter className="flex items-center gap-3 pt-4">
                        <Button 
                            variant="ghost" 
                            onClick={() => setShowEnrollModal(false)}
                            className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400"
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={(e) => enrollingCourse && handleAssignToMe(enrollingCourse.id, e)}
                            disabled={assigning !== null}
                            className="flex-1 h-12 rounded-2xl bg-[#0084FF] hover:bg-[#0073e6] text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20"
                        >
                            {assigning ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : `Initialize Record`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {isLoading ? (
                <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i} className="animate-pulse bg-muted/30 h-[280px] rounded-2xl" />
                    ))}
                </div>
            ) : (() => {
                const filtered = courses?.filter(c => {
                    const isOwner = (c.instructor_ids || []).includes(user?.id || "");
                    if (viewTab === 'my') {
                        const isApproved = c.status?.toLowerCase() === 'approved' || 
                                           c.status?.toLowerCase() === 'published' || 
                                           c.status?.toLowerCase() === 'active';
                        return isOwner && isApproved;
                    } else {
                        return true;
                    }
                });

                if (!filtered || filtered.length === 0) {
                    return (
                        <Card className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-3xl border-dashed bg-slate-50/50">
                            <div className="bg-primary/5 p-4 rounded-full mb-4">
                                <Layers className="h-6 w-6 text-primary/40" />
                            </div>
                            <CardTitle className="text-lg sm:text-xl font-bold">No Courses Found</CardTitle>
                            <p className="text-muted-foreground max-w-sm mb-6 text-xs sm:text-sm">
                                {viewTab === 'catalog' 
                                    ? "There are no courses available in the catalogue at the moment." 
                                    : "You haven't requested to teach any courses yet. Explore the catalogue to get started."}
                            </p>
                            <Button onClick={() => refetch()} variant="outline" className="gap-2 rounded-xl text-xs">
                                <RefreshCw className="h-4 w-4" />
                                Refresh Status
                            </Button>
                        </Card>
                    );
                }

                return (
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        <AnimatePresence mode="popLayout">
                            {filtered.map((course: CourseWithSession, index: number) => {
                            const instructors = (course.instructor_ids || []) as string[];
                            const isInstructorOwner = instructors.includes(user?.id || "");
                            const isAssignedToOther = instructors.length > 0 && !isInstructorOwner;
                            
                            // For backward compatibility or specifically identifying the first instructor
                            const primaryInstructorName = course.instructors?.[0]?.full_name || "Another Instructor";
                            
                            const isInstructorApproved = isInstructorOwner && (
                                course.status?.toLowerCase() === 'approved' || 
                                course.status?.toLowerCase() === 'published' || 
                                course.status?.toLowerCase() === 'active'
                            );
                            
                            return (
                                <motion.div
                                    key={course.id || course._id}
                                    className="relative group h-full"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/10 to-accent/10 rounded-[2rem] blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                    <Card 
                                        className={cn(
                                            "pro-card relative flex flex-col h-full overflow-hidden cursor-pointer",
                                            isInstructorApproved ? "" : "opacity-90 grayscale-[0.3]"
                                        )} 
                                        onClick={() => isInstructorApproved && setViewingCourse(course)}
                                    >
                                        <div className="aspect-[16/10] relative overflow-hidden bg-muted border-b">
                                            {course.thumbnail_url || course.image ? (
                                                <img
                                                    src={(course.thumbnail_url || course.image).startsWith('http') ? (course.thumbnail_url || course.image) : `${API_URL}/s3/public/${course.thumbnail_url}`}
                                                    alt={course.title}
                                                    className="object-cover w-full h-full group-hover:scale-110 transition-transform duration-700 ease-in-out"
                                                    onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop'; }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                                    <PlayCircle className="h-12 w-12 text-muted-foreground/30" />
                                                </div>
                                            )}
                                            
                                            {/* Badge System */}
                                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-md text-[9px] font-black uppercase tracking-widest">
                                                        {course.category}
                                                    </Badge>
                                                    {isInstructorOwner && (
                                                        <Badge variant="secondary" className={cn(
                                                            "border-none backdrop-blur-md gap-1 text-[9px] font-black uppercase tracking-widest text-white",
                                                            (course.status?.toLowerCase() === 'approved' || course.status?.toLowerCase() === 'published') ? 'bg-emerald-500/80 shadow-lg shadow-emerald-500/20' :
                                                                course.status?.toLowerCase() === 'pending' ? 'bg-amber-500/80' :
                                                                    course.status?.toLowerCase() === 'rejected' ? 'bg-rose-500/80' : 'bg-slate-500/80'
                                                        )}>
                                                            {course.status === 'published' ? 'Published' : course.status === 'pending' ? 'Pending' : course.status === 'rejected' ? 'Rejected' : course.status === 'draft' ? 'Draft' : course.status || 'Active'}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {isInstructorOwner && (
                                                <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 bg-black/30 hover:bg-black/50 text-white rounded-full">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {(course.status === 'draft' || !course.status) && (
                                                                <DropdownMenuItem onClick={(e) => handleSubmitForReview(course.id, e)} disabled={processing === course.id}>
                                                                    <Send className="h-4 w-4 mr-2" />
                                                                    Submit for Review
                                                                </DropdownMenuItem>
                                                            )}
                                                            {course.status === 'pending' && (
                                                                <DropdownMenuItem onClick={(e) => handleSaveDraft(course.id, e)} disabled={processing === course.id}>
                                                                    <FileEdit className="h-4 w-4 mr-2" />
                                                                    Save as Draft
                                                                </DropdownMenuItem>
                                                            )}

                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            )}
                                        </div>
                                        <CardContent className="p-5 flex-1 flex flex-col">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                                                    {course.title}
                                                </h3>
                                                <p className="text-muted-foreground text-sm line-clamp-2">
                                                    {course.description || course.level || "No description provided."}
                                                </p>
                                            </div>
 
                                            <div className="mt-auto pt-4 border-t flex items-center justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    {isInstructorOwner ? (
                                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                                            {(course.status?.toLowerCase() === 'published' || course.status?.toLowerCase() === 'approved') 
                                                                ? <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                                                                : course.status?.toLowerCase() === 'rejected' 
                                                                    ? <AlertCircle className="h-3 w-3 text-rose-500 shrink-0" />
                                                                    : <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                                                            }
                                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter truncate">Owner Access</span>
                                                        </div>
                                                    ) : course.assigned_session ? (
                                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                                            <div className={cn(
                                                              "h-2 w-2 rounded-full animate-pulse shrink-0",
                                                              course.assigned_session === 'morning' ? 'bg-orange-500' :
                                                              course.assigned_session === 'afternoon' ? 'bg-blue-500' :
                                                              course.assigned_session === 'evening' ? 'bg-violet-500' : 'bg-emerald-500'
                                                            )} />
                                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-tighter truncate">
                                                              {course.assigned_session} Unit
                                                            </span>
                                                        </div>
                                                     ) : instructors.length > 0 ? (
                                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                                            <Users className="h-3 w-3 text-primary/40 shrink-0" />
                                                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter truncate">Team Managed</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-tighter truncate">{course.duration || 'Flexible'}</span>
                                                    )}
                                                </div>
                                                
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-full transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedProfile(course);
                                                            setShowProfile(true);
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {isInstructorApproved ? (
                                                        <Button variant="ghost" size="sm" className="h-8 px-2 sm:px-3 text-xs font-bold gap-1 group/btn hover:bg-primary hover:text-white rounded-lg transition-all">
                                                            <span className="hidden sm:inline">Manage</span> 
                                                            <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                                                        </Button>
                                                    ) : isInstructorOwner && course.status?.toLowerCase() === 'pending' ? (
                                                        <div className="px-2 py-1 rounded-md bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1.5 animate-pulse">
                                                            <Clock className="h-3 w-3" />
                                                            <span className="text-[8px] uppercase font-black tracking-widest">Pending</span>
                                                        </div>
                                                    ) : (
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="h-8 px-2 sm:px-3 text-[10px] font-black uppercase tracking-tighter border-primary/20 hover:bg-primary hover:text-white rounded-lg transition-all gap-1.5"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEnrollingCourse(course);
                                                                setShowEnrollModal(true);
                                                            }}
                                                            disabled={assigning === (course.id || course._id) || isInstructorOwner}
                                                        >
                                                            {(() => {
                                                                if (assigning === (course.id || course._id)) return <RefreshCw className="h-3 w-3 animate-spin text-primary" />;
                                                                return <Plus className="h-3 w-3" />;
                                                            })()}
                                                            <span className="hidden sm:inline">
                                                                Enroll
                                                            </span>
                                                        </Button>
                                                    )}

                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            );
          })()}
 
             {/* Course Profile View Modal */}
             <Dialog open={showProfile} onOpenChange={setShowProfile}>
                 <DialogContent className="max-w-xl pro-modal">
                     <DialogHeader>
                         <DialogTitle className="flex items-center gap-2 text-xl">
                             <BookOpenIcon className="h-5 w-5 text-primary" />
                             Course Profile
                         </DialogTitle>
                         <DialogDescription>
                             Detailed information about this training curriculum
                         </DialogDescription>
                     </DialogHeader>
                    
                    {selectedProfile && (
                        <div className="space-y-6 py-4">
                            <div className="aspect-video relative rounded-xl overflow-hidden bg-slate-100 border shadow-inner">
                                {selectedProfile.thumbnail_url || selectedProfile.image ? (
                                    <img 
                                        src={(selectedProfile.thumbnail_url || selectedProfile.image).startsWith('http') ? (selectedProfile.thumbnail_url || selectedProfile.image) : `${API_URL}/s3/public/${selectedProfile.thumbnail_url}`}
                                        alt={selectedProfile.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <BookOpenIcon className="h-12 w-12 text-slate-300" />
                                    </div>
                                )}
                                <div className="absolute top-4 left-4">
                                    <span className="bg-white/90 text-primary px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-sm">
                                        {selectedProfile.category || 'Curriculum'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold tracking-tight text-slate-900">{selectedProfile.title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    {selectedProfile.description || 'Professional aviation training curriculum designed for efficiency and safety.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Metadata</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Clock className="h-4 w-4 text-slate-400" />
                                            <span>{selectedProfile.duration || 'Flexible'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Layers className="h-4 w-4 text-slate-400" />
                                            <span>Level: {selectedProfile.level || 'All Levels'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-primary/60">Your Access</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-slate-700">
                                            <ShieldAlert className="h-4 w-4 text-primary/40" />
                                            <span className="font-medium truncate">
                                                {selectedProfile.instructor_ids?.includes(user?.id || "") 
                                                    ? 'My Assigned Course' 
                                                    : (selectedProfile.instructor_ids?.length || 0) > 0
                                                        ? `Team: ${selectedProfile.instructor_ids?.length} Instructors` 
                                                        : 'Available for Selection'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-700">
                                            <Calendar className="h-4 w-4 text-primary/40" />
                                            <span>Added {selectedProfile.created_at ? format(new Date(selectedProfile.created_at), 'MMM d, yyyy') : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="border-t pt-4">
                        <Button variant="outline" className="rounded-lg h-10 px-6 font-semibold" onClick={() => setShowProfile(false)}>
                            Close Profile
                        </Button>
                        {viewTab === 'my' && (
                            <Button className="pro-button-primary h-10 px-8 rounded-lg shadow-md" onClick={() => {
                                setShowProfile(false);
                                setViewingCourse(selectedProfile);
                            }}>
                                Manage Curriculum
                            </Button>
                        )}
                        {viewTab === 'catalog' && selectedProfile && !selectedProfile.instructor_ids?.includes(user?.id || "") && (
                             <Button 
                                className="pro-button-primary h-10 px-8 rounded-lg shadow-md" 
                                onClick={() => {
                                    setShowProfile(false);
                                    setEnrollingCourse(selectedProfile);
                                    setShowEnrollModal(true);
                                }}
                                disabled={assigning === (selectedProfile?.id || selectedProfile?._id) || selectedProfile.instructor_ids?.includes(user?.id || "")}
                             >
                                Enroll to Teach
                             </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}