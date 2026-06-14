import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayCircle, ArrowRight, Layers, User, Trash2, Loader2, MoreVertical, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from 'date-fns';
import { useInstructorS3Courses } from '@/hooks/useCourseBuilder';
import { API_URL, fetchWithAuth } from '@/lib/api';
import { Course } from '@/hooks/useInstructorData';
import { CourseBuilder } from '../instructor/courses/CourseBuilder';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Clock, Calendar, ShieldAlert, GraduationCap, Mail, Monitor, BookOpen as BookOpenIcon } from 'lucide-react';

export function ManagerCourses({ managerDept }: { managerDept?: string | null } = {}) {
    const { data: allCourses, isLoading, refetch } = useInstructorS3Courses(true);

    // Filter to manager's department only (skip filter if no dept set)
    const courses = React.useMemo(() => {
        const list = Array.isArray(allCourses) ? allCourses as Course[] : [];
        if (!managerDept) return list;
        return list.filter(c =>
            (c.department || c.category || '').toLowerCase() === managerDept.toLowerCase()
        );
    }, [allCourses, managerDept]);
    const [viewingCourse, setViewingCourse] = useState<Course | null>(null);
    const [selectedCourseProfile, setSelectedCourseProfile] = useState<Course | null>(null);
    const [showProfile, setShowProfile] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const { toast } = useToast();



    if (viewingCourse) {
        return <CourseBuilder course={viewingCourse} onBack={() => setViewingCourse(null)} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">All Courses</h2>
                    <p className="text-muted-foreground mt-1">View and manage all courses in the system.</p>
                </div>
            </div>

            {isLoading ? (
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Card key={i} className="animate-pulse bg-muted/50 h-[280px]" />
                    ))}
                </div>
            ) : courses?.length === 0 ? (
                <Card className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="bg-primary/10 p-4 rounded-full mb-4">
                        <Layers className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="mb-2">No Courses Available</CardTitle>
                    <p className="text-muted-foreground max-w-sm">
                        There are no courses in the system yet. Courses will appear here once created by admins.
                    </p>
                </Card>
            ) : (
                <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    <AnimatePresence>
                        {courses?.map((course: Course, index: number) => (
                            <motion.div
                                key={course.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className="overflow-hidden h-full flex flex-col hover:border-primary/50 transition-colors group cursor-pointer" onClick={() => setViewingCourse(course)}>
                                    <div className="relative aspect-video bg-muted border-b">
                                        {course.thumbnail_url ? (
                                            <img
                                                src={course.thumbnail_url.startsWith('http') ? course.thumbnail_url : `${API_URL}/s3/public/${course.thumbnail_url}`}
                                                alt={course.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop'; }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                                                <PlayCircle className="h-12 w-12 text-muted-foreground/30" />
                                            </div>
                                        )}
                                        <div className="absolute top-3 left-3 flex gap-2">
                                            <span className="bg-primary hover:bg-primary/90 text-primary-foreground px-2 py-1 rounded-md text-xs font-medium shadow-sm backdrop-blur-md">
                                                {course.category || 'Course'}
                                            </span>
                                        </div>
                                        </div>
                                    </div>
                                    <CardContent className="p-4 flex-1 flex flex-col">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                                                {course.title}
                                            </h3>
                                            <p className="text-muted-foreground text-sm line-clamp-2">
                                                {course.description || "No description provided."}
                                            </p>
                                        </div>
                                        <div className="mt-4 pt-3 border-t flex items-center justify-between">
                                            <div className="text-xs text-muted-foreground">
                                                {course.created_at ? format(new Date(course.created_at), 'MMM d, yyyy') : ''}
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="group-hover:scale-110 transition-transform h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedCourseProfile(course);
                                                    setShowProfile(true);
                                                }}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}

            {/* Course Profile View Modal */}
            <Dialog open={showProfile} onOpenChange={setShowProfile}>
                <DialogContent className="max-w-xl pro-modal">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <BookOpenIcon className="h-5 w-5 text-primary" />
                            Course Profile
                        </DialogTitle>
                        <DialogDescription>
                            Comprehensive overview of system curriculum content
                        </DialogDescription>
                    </DialogHeader>
                    
                    {selectedCourseProfile && (
                        <div className="space-y-6 py-4">
                            <div className="aspect-video relative rounded-xl overflow-hidden bg-slate-100 border shadow-inner">
                                {selectedCourseProfile.thumbnail_url || selectedCourseProfile.image ? (
                                    <img 
                                        src={selectedCourseProfile.thumbnail_url?.startsWith('http') ? selectedCourseProfile.thumbnail_url : 
                                            (selectedCourseProfile.image?.startsWith('http') ? selectedCourseProfile.image : 
                                            `${API_URL}/s3/public/${selectedCourseProfile.thumbnail_url || selectedCourseProfile.image}`)}
                                        alt={selectedCourseProfile.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <BookOpenIcon className="h-12 w-12 text-slate-300" />
                                    </div>
                                )}
                                <div className="absolute top-4 left-4">
                                    <span className="bg-white/90 text-primary px-3 py-1 rounded-full text-xs font-bold shadow-sm backdrop-blur-sm">
                                        {selectedCourseProfile.category || 'Curriculum'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold tracking-tight text-slate-900">{selectedCourseProfile.title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed">
                                    {selectedCourseProfile.description || 'Detailed curriculum and teaching modules for professional development.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Course Info</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Clock className="h-4 w-4 text-slate-400" />
                                            <span>{selectedCourseProfile.duration || '0'} duration</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Layers className="h-4 w-4 text-slate-400" />
                                            <span>Level: {selectedCourseProfile.level || 'Standard'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-3">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-primary/60">Management</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-slate-700">
                                            <User className="h-4 w-4 text-primary/40" />
                                            <span className="font-medium truncate">{selectedCourseProfile.instructor_id ? 'Instructor Assigned' : 'Internal Library'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-slate-700">
                                            <Calendar className="h-4 w-4 text-primary/40" />
                                            <span>Created {selectedCourseProfile.created_at ? format(new Date(selectedCourseProfile.created_at), 'MMM d, yyyy') : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="border-t pt-4">
                        <Button variant="outline" className="rounded-lg h-10 px-6 font-semibold" onClick={() => setShowProfile(false)}>
                            Close
                        </Button>
                        <Button 
                            className="pro-button-primary h-10 px-8 rounded-lg shadow-md" 
                            onClick={() => {
                                setShowProfile(false);
                                setViewingCourse(selectedCourseProfile);
                            }}
                        >
                            Manage Content
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}