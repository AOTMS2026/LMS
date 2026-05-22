import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlayCircle, CheckCircle2, Video, BookOpen, Lock, Sparkles, GraduationCap, MessageCircle, X, Clock, QrCode, Phone, Upload, Mail, Loader2, Hash } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { fetchWithAuth } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { StudentCourse, useEnrollCourse } from '@/hooks/useStudentData';
import { useCourseModules, useModuleVideos, S3CourseVideo, CourseModule } from '@/hooks/useCourseBuilder';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '@/lib/api';

import { VideoPlayer } from './VideoPlayer';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface StudentCourseViewerProps {
    course: StudentCourse;
    isEnrolled?: boolean;
    onBack: () => void;
}

const isGoogleDriveUrl = (url?: string) => {
    if (!url) return false;
    return url.includes('drive.google.com') || url.includes('docs.google.com') || url.includes('/uc?id=');
};

export function StudentCourseViewer({ course, isEnrolled = true, onBack }: StudentCourseViewerProps) {
    const navigate = useNavigate();
    const { userRole } = useAuth();
    const { data: modules, isLoading: modulesLoading } = useCourseModules(course.id);
    const [selectedVideo, setSelectedVideo] = useState<S3CourseVideo | null>(null);
    const enrollMutation = useEnrollCourse();
    const [localIsEnrolled, setLocalIsEnrolled] = useState(isEnrolled);
    const [hasRequestedEnrollment, setHasRequestedEnrollment] = useState(false);
    const { toast } = useToast();

    // Drip Logic: Calculate days since enrollment
    const daysSinceEnrollment = React.useMemo(() => {
        if (!course.enrolled_at) return 1;
        const enrolled = new Date(course.enrolled_at);
        const now = new Date();
        const diffMs = now.getTime() - enrolled.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
        return diffDays;
    }, [course.enrolled_at]);

    // Admin/Manager/Instructor should see all modules regardless of drip
    const isPrivilegedUser = ['admin', 'manager', 'instructor'].includes(userRole || '');

    // Payment Modal States
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentProof, setPaymentProof] = useState<File | null>(null);
    const [utrNumber, setUtrNumber] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    // Sync with prop changes
    useEffect(() => {
        setLocalIsEnrolled(isEnrolled);
    }, [isEnrolled]);

    const isPending = hasRequestedEnrollment || course.enrollmentStatus === 'pending';

    const renderPlayer = () => {
        if (!selectedVideo) return (
            <div className="absolute inset-0 w-full h-full bg-slate-900 flex flex-col items-center justify-center overflow-hidden">
                {course.thumbnail_url && (
                    <>
                        <img 
                            src={course.thumbnail_url.startsWith('http') ? course.thumbnail_url : `/s3/public/${course.thumbnail_url}`} 
                            className="absolute inset-0 w-full h-full object-cover opacity-30 blur-xl scale-110" 
                            alt="" 
                        />
                        <div className="absolute inset-0 bg-black/40" />
                    </>
                )}
                <div className="relative z-10 flex flex-col items-center text-center p-6">
                    <div className="h-20 w-20 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center mb-6 border border-white/20 shadow-xl">
                        <PlayCircle className="h-10 w-10 text-white/80" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Ready to Start?</h3>
                    <p className="text-white/60 max-w-sm">Select a module from the list on the right to begin watching.</p>
                </div>
            </div>
        );

        let videoUrl = '';
        if (selectedVideo.video_url) {
            if (isGoogleDriveUrl(selectedVideo.video_url)) {
                videoUrl = selectedVideo.video_url;
            } else {
                let videoUrlKey = selectedVideo.video_url;
                // Extract key from full S3 URLs
                if (videoUrlKey.includes('.amazonaws.com/')) {
                    videoUrlKey = videoUrlKey.split('.amazonaws.com/')[1];
                }
                // Sanitize: Trim leading slash if present to avoid double slashes in concatenated URL
                const sanitizedKey = videoUrlKey.startsWith('/') ? videoUrlKey.slice(1) : videoUrlKey;
                videoUrl = selectedVideo.video_url.startsWith('http') && !selectedVideo.video_url.includes('.amazonaws.com/')
                    ? selectedVideo.video_url
                    : `${API_URL}/s3/public/${sanitizedKey}`;
            }
        } else if (selectedVideo.drive_link) {
            videoUrl = selectedVideo.drive_link;
        }

        return (
            <VideoPlayer 
                key={selectedVideo.id || videoUrl} // Re-mounts player when video ID or URL changes
                url={videoUrl}
                videoId={selectedVideo.id || 'unknown'}
                courseId={course.id}
                onComplete={() => {
                    // Logic for completion can be added here if needed to update UI locally
                    console.log(`Video ${selectedVideo.title} completed`);
                }}
            />
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <Button variant="ghost" onClick={onBack} className="gap-2 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors rounded-full px-4 w-fit">
                    <ArrowLeft className="h-4 w-4" /> Back to Library
                </Button>
                <div className="flex items-center gap-3">
                    <div className="px-5 py-1.5 bg-slate-900/5 backdrop-blur-md rounded-full border border-slate-200 shadow-sm flex items-center gap-3">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-xs font-black uppercase text-slate-500 tracking-widest">Enrollment Day {daysSinceEnrollment}</span>
                    </div>
                    {course.instructor_id && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => navigate(`/student-dashboard/chat?recipientId=${course.instructor_id}&showProfile=true`)}
                            className="gap-2 border-primary/20 text-primary hover:bg-primary/5 hover:text-primary rounded-full"
                        >
                            <MessageCircle className="h-4 w-4" /> Message Instructor
                        </Button>
                    )}
                    {!localIsEnrolled && (
                        <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium border border-primary/20">
                            <Sparkles className="h-4 w-4" /> Preview Mode
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Video Player */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="aspect-video bg-black/95 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group">
                        {!localIsEnrolled ? (
                            <div className="absolute inset-0 w-full h-full">
                                {/* Blurred Background using the course thumbnail or black */}
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background backdrop-blur-3xl z-0"></div>

                                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-center p-8 lg:p-16">
                                    <motion.div
                                        initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }}
                                        className="h-24 w-24 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-2xl shadow-primary/20"
                                    >
                                        <GraduationCap className="h-12 w-12 text-primary" />
                                    </motion.div>

                                    <h3 className="text-3xl font-bold text-foreground mb-3 drop-shadow-sm">
                                        {isPending ? "Enrollment Pending" : "Unlock Full Access"}
                                    </h3>
                                    <p className="text-muted-foreground max-w-md mx-auto text-lg mb-8">
                                        {isPending 
                                            ? "Your enrollment request has been submitted and is awaiting admin approval. You will be notified once access is granted."
                                            : "Enroll now to stream premium video modules, track your progress, and earn a certificate of completion."
                                        }
                                    </p>

                                    <Button
                                        className={`h-14 px-10 text-lg font-semibold rounded-full shadow-[0_0_40px_-10px_rgba(var(--primary),0.5)] transition-all ${
                                            isPending ? "bg-amber-500 hover:bg-amber-600 cursor-not-allowed opacity-80" : "bg-primary hover:bg-primary/90 hover:scale-105"
                                        }`}
                                        size="lg"
                                        onClick={() => {
                                            if (isPending) return;
                                            setShowPaymentModal(true);
                                        }}
                                        disabled={enrollMutation.isPending || isPending}
                                    >
                                        {enrollMutation.isPending ? "Setting up..." : isPending ? "Waiting for Approval" : "Purchase Course"}
                                    </Button>

                                    {/* Payment Modal inside Viewer */}
                                    <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
                                        <DialogContent className="max-w-4xl p-0 overflow-hidden border-0 rounded-3xl shadow-2xl bg-white">
                                            <div className="flex flex-col md:flex-row h-full">
                                                {/* Left Column: Course Summary */}
                                                <div className="md:w-[400px] bg-slate-900 p-8 text-white flex flex-col justify-between selection:bg-primary/30">
                                                    <div className="space-y-8">
                                                        <div className="flex items-center justify-between">
                                                            <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                                                                <BookOpen className="h-5 w-5 text-primary" />
                                                            </div>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="text-white/40 hover:text-white hover:bg-white/10 rounded-full md:hidden"
                                                                onClick={() => setShowPaymentModal(false)}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>

                                                        <div className="space-y-4">
                                                            <h2 className="text-3xl font-black tracking-tight leading-tight">
                                                                Review Your <span className="text-primary italic">Enrollment</span>
                                                            </h2>
                                                            <p className="text-slate-400 text-sm leading-relaxed">
                                                                You're one step away from mastering new skills. Complete the secure payment below to unlock full course access.
                                                            </p>
                                                        </div>

                                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 backdrop-blur-md">
                                                            <div className="flex items-start gap-4">
                                                                <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden border border-white/20">
                                                                    <img 
                                                                        src={course.thumbnail_url?.startsWith('http') ? course.thumbnail_url : `${API_URL}/s3/public/${course.thumbnail_url}`} 
                                                                        alt="" 
                                                                        className="h-full w-full object-cover" 
                                                                        onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop"; }}
                                                                    />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Target Course</div>
                                                                    <h3 className="font-bold text-sm leading-snug line-clamp-2">{course.title}</h3>
                                                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                                        <Clock className="h-3 w-3" />
                                                                        <span>Lifetime Access</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                                                                    <span className="text-sm font-medium text-slate-400">Course Value</span>
                                                                    <span className="text-sm line-through text-slate-500">
                                                                        {course.original_price ? `₹${course.original_price.toLocaleString('en-IN')}` : "₹00,000"}
                                                                    </span>
                                                                </div>
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-sm font-medium text-slate-400">Total Investment</span>
                                                                    <span className="text-2xl font-black text-white">
                                                                        {course.price === 0 ? "Free Access" : (course.price ? `₹${course.price.toLocaleString('en-IN')}` : "Contact Us")}
                                                                    </span>
                                                                </div>
                                                        </div>
                                                    </div>

                                                    <div className="pt-12 space-y-6">
                                                        <div className="flex items-center gap-4 group">
                                                            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center transition-all group-hover:scale-110 shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]">
                                                                <CheckCircle2 className="h-6 w-6 text-primary" />
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-black uppercase tracking-widest text-white/40 mb-0.5">Payment Verified</div>
                                                                <div className="text-sm font-bold text-white">Manual Admin Approval</div>
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium uppercase tracking-[0.1em]">
                                                            Secure transactions protected by standard SSL protocols and human verification systems.
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Right Column: Payment Details */}
                                                <div className="flex-1 p-8 md:p-12 space-y-8 bg-white selection:bg-slate-100">
                                                    <div className="flex justify-between items-start">
                                                        <div className="space-y-1 flex-1">
                                                            <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Payment Details</h3>
                                                            <p className="text-slate-500 text-sm font-medium">Scan the QR code below or use the payment credentials.</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-full hidden md:flex"
                                                                onClick={() => setShowPaymentModal(false)}
                                                            >
                                                                <X className="h-5 w-5" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {/* QR Section */}
                                                    <div className="relative group max-w-[280px] mx-auto">
                                                        <div className="absolute -inset-4 bg-primary/5 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition duration-500"></div>
                                                        <div className="relative bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-6 shadow-sm overflow-hidden flex flex-col items-center">
                                                            <div className="mb-4 text-center">
                                                                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-2">Secure UPI Gateway</div>
                                                                <div className="flex items-center justify-center gap-2 px-3 py-1 bg-white rounded-full border border-slate-200">
                                                                    <QrCode className="h-3 w-3 text-primary" />
                                                                    <span className="text-[10px] font-bold text-slate-600">Scan to Pay</span>
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="relative h-44 w-44 bg-white rounded-2xl p-2 shadow-inner border border-slate-200/50 flex items-center justify-center group-hover:scale-[1.02] transition-transform">
                                                                {/* The QR Image */}
                                                                <img 
                                                                    src="/scanner.jpeg" 
                                                                    alt="Payment QR Code" 
                                                                    className="w-full h-full object-contain"
                                                                    onError={(e) => {
                                                                        const target = e.target as HTMLImageElement;
                                                                        target.src = "https://placehold.co/400x400?text=QR+CODE+HERE";
                                                                    }}
                                                                />
                                                            </div>

                                                            <div className="mt-6 w-full space-y-3">
                                                                <div className="p-3 bg-white rounded-xl border border-dashed border-slate-300 flex items-center justify-between group/code cursor-pointer hover:border-primary transition-colors">
                                                                    <span className="text-[10px] font-mono font-bold text-slate-500 truncate max-w-[140px]">vyapar.17432781471@hdfcbank</span>
                                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-primary">
                                                                        <CheckCircle2 className="h-3 w-3" />
                                                                    </Button>
                                                                </div>
                                                                <div className="flex items-center justify-center gap-6 saturate-0 opacity-50">
                                                                    <Phone className="h-4 w-4" />
                                                                    <span className="text-xs font-bold">+91 80199 42233</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Upload Section */}
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Confirmation Proof <span className="text-primary">*</span></label>
                                                            {paymentProof && (
                                                                <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                                                                    <CheckCircle2 className="h-3 w-3" /> File Selected
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div 
                                                            className={`relative border-2 border-dashed rounded-2xl p-6 transition-all cursor-pointer group flex flex-col items-center justify-center space-y-3 ${paymentProof ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary hover:bg-slate-50'}`}
                                                            onClick={() => document.getElementById('viewer-payment-proof')?.click()}
                                                        >
                                                            <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-100 group-hover:scale-110 transition-transform">
                                                                <Upload className={`h-5 w-5 ${paymentProof ? 'text-primary' : 'text-slate-400'}`} />
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-xs font-bold text-slate-900">{paymentProof ? paymentProof.name : 'Upload Payment Screenshot'}</p>
                                                                <p className="text-[10px] text-slate-500 mt-1 font-medium">JPEG, PNG only (Max 5MB)</p>
                                                            </div>
                                                            <input 
                                                                id="viewer-payment-proof" 
                                                                type="file" 
                                                                className="hidden" 
                                                                accept="image/*"
                                                                onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* UTR Number Section */}
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Transaction ID (UTR) <span className="text-primary">*</span></label>
                                                        </div>
                                                        <div className="relative group">
                                                            <input 
                                                                placeholder="Enter 12-digit UTR Number"
                                                                value={utrNumber}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                                                                    setUtrNumber(val);
                                                                }}
                                                                className="w-full h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 px-6 font-bold text-slate-900 focus:border-primary focus:outline-none focus:bg-white transition-all shadow-sm"
                                                            />
                                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg bg-white/50 border border-slate-200 flex items-center justify-center pointer-events-none">
                                                                <Hash className="h-4 w-4 text-slate-400" />
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 font-medium px-1">
                                                            Please double-check your UTR number from your payment receipt.
                                                        </p>
                                                    </div>

                                                    {/* Action Buttons */}
                                                    <div className="grid grid-cols-2 gap-4 pt-4">
                                                        <Button
                                                            variant="ghost"
                                                            size="lg"
                                                            className="h-14 rounded-2xl border-2 border-slate-100 font-bold text-slate-600 hover:bg-slate-50 gap-3"
                                                            onClick={() => {
                                                                window.location.href = `mailto:Info@aotms.in?subject=Enrollment Inquiry: ${course.title}&body=Hello, I have a question about the course enrollment process.`;
                                                            }}
                                                        >
                                                            <Mail className="h-5 w-5 text-primary" />
                                                            Get in Touch
                                                        </Button>
                                                        <Button
                                                            size="lg"
                                                            className="h-14 rounded-2xl font-black uppercase tracking-widest text-sm shadow-[0_10px_20px_rgba(var(--primary-rgb),0.2)] active:scale-95 transition-all"
                                                            disabled={isUploading || !paymentProof || utrNumber.length !== 12}
                                                            onClick={async () => {
                                                                setIsUploading(true);
                                                                try {
                                                                    let paymentProofUrl = null;
                                                                    if (paymentProof) {
                                                                        const formData = new FormData();
                                                                        formData.append('file', paymentProof);
                                                                        const uploadRes = await fetchWithAuth<{ url: string }>('/upload', { method: 'POST', body: formData });
                                                                        paymentProofUrl = uploadRes?.url;
                                                                    }
                                                                    await enrollMutation.mutateAsync({ 
                                                                        courseId: course.id, 
                                                                        payment_proof_url: paymentProofUrl,
                                                                        utr_number: utrNumber
                                                                    });
                                                                    toast({ title: "Enrollment Requested", description: "Waiting for admin approval." });
                                                                    setShowPaymentModal(false);
                                                                    setUtrNumber('');
                                                                    setHasRequestedEnrollment(true);
                                                                } catch (err) {
                                                                    toast({ title: "Error", description: "Failed to enroll.", variant: "destructive" });
                                                                } finally {
                                                                    setIsUploading(false);
                                                                }
                                                            }}
                                                        >
                                                            {isUploading ? (
                                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                            ) : (
                                                                'Enroll Course'
                                                            )}
                                                        </Button>
                                                    </div>

                                                    <p className="text-center text-[10px] text-slate-400 font-medium">
                                                        After payment, please upload the screenshot to confirm your order details via manual verification.
                                                    </p>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        ) : renderPlayer()}
                    </div>

                    <div className="px-2">
                        <h2 className="text-3xl font-extrabold tracking-tight mb-2">{selectedVideo?.title || course.title}</h2>
                        {selectedVideo ? (
                            <div className="flex items-center gap-3 text-sm">
                                <span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-medium border border-primary/20">Now Playing</span>
                                <span className="text-muted-foreground">Module Video</span>
                            </div>
                        ) : (
                            <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl">{course.description}</p>
                        )}
                    </div>
                </div>

                {/* Right Side: Course Content Accordion/List */}
                <div className="lg:h-[800px]">
                    <Card className="h-full flex flex-col border-border/50 shadow-lg bg-card/60 backdrop-blur-xl rounded-2xl overflow-hidden">
                        <CardHeader className="bg-muted/40 border-b pb-4 pt-6">
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-primary" /> Course Modules
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
                            {modulesLoading ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">Loading modules...</div>
                            ) : modules?.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">No content uploaded yet.</div>
                            ) : (
                                <div className="divide-y">
                                    {modules?.map((mod: CourseModule) => (
                                        <ModuleVideoList
                                            key={mod.id}
                                            module={mod}
                                            selectedVideoId={selectedVideo?.id}
                                            onSelectVideo={setSelectedVideo}
                                            isEnrolled={localIsEnrolled}
                                            daysSinceEnrollment={daysSinceEnrollment}
                                            isPrivileged={isPrivilegedUser}
                                            enrolledAt={course.enrolled_at}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </motion.div>
    );
}

function DripCountdown({ unlockAt }: { unlockAt: Date }) {
    const [timeLeft, setTimeLeft] = useState<{ h: number, m: number, s: number } | null>(null);

    useEffect(() => {
        const calculateTime = () => {
            const now = new Date().getTime();
            const target = unlockAt.getTime();
            const diff = target - now;

            if (diff <= 0) {
                setTimeLeft(null);
                return true; // Finished
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft({ h, m, s });
            return false;
        };

        calculateTime();
        const timer = setInterval(() => {
            if (calculateTime()) clearInterval(timer);
        }, 1000);

        return () => clearInterval(timer);
    }, [unlockAt]);

    if (!timeLeft) return null;

    const pad = (n: number) => n.toString().padStart(2, '0');

    return (
        <span className="text-[10px] text-primary font-black tabular-nums bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10 flex items-center gap-1.5 animate-pulse w-fit">
            <Clock className="h-2.5 w-2.5" />
            Unlocks in {pad(timeLeft.h)}h : {pad(timeLeft.m)}m : {pad(timeLeft.s)}s
        </span>
    );
}

function ModuleVideoList({ module, selectedVideoId, onSelectVideo, isEnrolled, daysSinceEnrollment, isPrivileged, enrolledAt }: {
    module: CourseModule;
    selectedVideoId?: string;
    onSelectVideo: (vid: S3CourseVideo) => void;
    isEnrolled: boolean;
    daysSinceEnrollment: number;
    isPrivileged: boolean;
    enrolledAt?: string;
}) {
    const { data: videos, isLoading } = useModuleVideos(module.id, module.course_id);

    // Drip calculation: if module unlock day > days student has been enrolled
    const isLockedByDrip = !isPrivileged && (module.unlock_after_days || 1) > daysSinceEnrollment;

    const unlockAtDate = React.useMemo(() => {
        if (!enrolledAt || !module.unlock_after_days) return null;
        const base = new Date(enrolledAt);
        const target = new Date(base.getTime() + (module.unlock_after_days - 1) * 24 * 60 * 60 * 1000);
        return target;
    }, [enrolledAt, module.unlock_after_days]);

    return (
        <div className={`mb-1 transition-all duration-300 ${isLockedByDrip ? 'opacity-50 grayscale' : ''}`}>
            <div className={`px-5 py-4 font-semibold text-sm border-y border-border/50 sticky top-0 backdrop-blur-md z-10 flex items-center justify-between gap-3 ${isLockedByDrip ? 'bg-slate-100/50' : 'bg-muted/30'}`}>
                <div className="flex items-center gap-3 overflow-hidden">
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs shrink-0 ${isLockedByDrip ? 'bg-slate-200 text-slate-500' : 'bg-primary/20 text-primary'}`}>
                        {module.order_index + 1}
                    </span>
                    <span className="truncate">{module.title}</span>
                </div>
                
                {isLockedByDrip && (
                    <div className="flex items-center gap-2 shrink-0">
                        <Lock className="h-3 w-3 text-slate-400" />
                        <span className="text-[9px] font-black uppercase text-slate-500 whitespace-nowrap">Day {module.unlock_after_days}</span>
                    </div>
                )}
            </div>
            
            {isLoading ? (
                <div className="px-5 py-2 text-xs text-muted-foreground">Loading...</div>
            ) : videos?.length === 0 ? (
                <div className="px-5 py-2 text-xs text-muted-foreground">No videos</div>
            ) : (
                <div className="flex flex-col py-1">
                    {videos?.map((vid: S3CourseVideo) => {
                        const canAccess = isEnrolled && !isLockedByDrip;
                        
                        return (
                            <button
                                key={vid.id}
                                onClick={() => canAccess && onSelectVideo(vid)}
                                disabled={!canAccess}
                                className={`group flex items-start gap-4 px-6 py-4 text-left transition-all duration-200 ${!canAccess
                                    ? 'opacity-60 cursor-not-allowed hover:bg-transparent'
                                    : 'hover:bg-muted/50 cursor-pointer'
                                    } ${selectedVideoId === vid.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'}`}
                            >
                                <div className="mt-1 shrink-0">
                                    {selectedVideoId === vid.id ? (
                                        <div className="relative">
                                            <PlayCircle className="h-5 w-5 text-primary" />
                                            <span className="absolute -inset-1 rounded-full bg-primary/20 animate-ping"></span>
                                        </div>
                                    ) : !canAccess ? (
                                        <Lock className="h-5 w-5 text-muted-foreground/40" />
                                    ) : (
                                        ((!vid.video_url && vid.drive_link) || (vid.video_url && isGoogleDriveUrl(vid.video_url))) ? (
                                            <ExternalLink className="h-5 w-5 text-indigo-400 group-hover:text-indigo-500 transition-colors" />
                                        ) : (
                                            <Video className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                        )
                                    )}
                                </div>
                                <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
                                    <span className={`text-sm ${selectedVideoId === vid.id ? 'font-bold text-foreground' : 'text-muted-foreground font-medium'} leading-relaxed truncate`}>
                                        {vid.title}
                                    </span>
                                    {isLockedByDrip && unlockAtDate && (
                                        <DripCountdown unlockAt={unlockAtDate} />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
