import { useEffect, useState, useRef, useCallback } from 'react';
import { useCourses, Course } from '@/hooks/useCourses';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Star, Clock, BookOpen, ArrowRight, ArrowLeft, User, ChevronDown, CheckCircle2, Upload, Mail, X, Phone, QrCode } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { fetchWithAuth } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function CoursesPage() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [enrolling, setEnrolling] = useState<string | null>(null);
  
  // Payment Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentCourse, setPaymentCourse] = useState<Course | null>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  interface Batch {
    id: string;
    _id?: string;
    batch_name?: string;
    batch_type: string;
    start_time?: string;
    end_time?: string;
    batches?: Batch[];
    parent_id?: string;
  }

  // Batch states
  const [availableBatches, setAvailableBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [loadingBatches, setLoadingBatches] = useState(false);

  
  // Check if user is logged in via token
  const isLoggedIn = !!localStorage.getItem('access_token');
  
  const {
    courses,
    loading,
    error,
    hasMore,
    categories,
    fetchCourses,
    fetchCategories,
    enrollCourse,
    chooseCourse
  } = useCourses();

  const observerRef = useRef<HTMLDivElement>(null);
  const initialLoadDone = useRef(false);

  // Initial load
  useEffect(() => {
    if (!initialLoadDone.current) {
      fetchCategories();
      fetchCourses(1, selectedCategory, true);
      initialLoadDone.current = true;
    }
  }, [fetchCategories, fetchCourses, selectedCategory]);

  // Load more when category changes
  useEffect(() => {
    fetchCourses(1, selectedCategory, true);
  }, [fetchCourses, selectedCategory]);

  // Infinite scroll observer
  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const target = entries[0];
    if (target.isIntersecting && hasMore && !loading) {
      fetchCourses(courses.length > 0 ? Math.floor(courses.length / 9) + 1 : 2, selectedCategory);
    }
  }, [hasMore, loading, courses.length, selectedCategory, fetchCourses]);

  useEffect(() => {
    const element = observerRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      threshold: 0.1,
      rootMargin: '100px'
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, [handleObserver]);

  const fetchAvailableBatches = async (courseId: string) => {
    setLoadingBatches(true);
    try {
      const data = await fetchWithAuth(`/batches?course_id=${courseId}`) as Batch[];
      // Flatten batches if they are nested ("all" type container)
      const flatBatches: Batch[] = [];
      data.forEach(b => {
        if (b.batch_type === 'all' && b.batches) {
           b.batches.forEach((sub: Batch) => flatBatches.push({...sub, id: sub.id || sub._id || '', parent_id: b.id}));
        } else {
           flatBatches.push({...b, id: b.id || b._id || ''});
        }
      });
      setAvailableBatches(flatBatches);
      if (flatBatches.length > 0) setSelectedBatch(flatBatches[0].id);
    } catch (err) {
      console.error("Failed to fetch batches:", err);
    } finally {
      setLoadingBatches(false);
    }
  };

  const handleEnroll = async (course: Course) => {

    if (!isLoggedIn) {
      navigate('/auth');
      toast({
        title: 'Login Required',
        description: 'Please login to enroll in courses',
        variant: 'destructive'
      });
      return;
    }

    if (user?.role === 'instructor') {
      setEnrolling(course.id);
      try {
        await chooseCourse(course.id);
        toast({
          title: 'Course Claimed',
          description: 'You have successfully requested to teach this course. An admin will review your request.',
          className: 'bg-green-50 border-green-200'
        });
      } catch (err) {
        toast({
          title: 'Claim Failed',
          description: err instanceof Error ? err.message : 'Please try again',
          variant: 'destructive'
        });
      } finally {
        setEnrolling(null);
      }
    } else {
      // For students, show the payment modal
      setPaymentCourse(course);
      fetchAvailableBatches(course.id);
      setShowPaymentModal(true);
    }

  };

  const handleEnrollmentSubmit = async () => {
    if (!paymentCourse) return;
    
    setIsUploading(true);
    try {
      let paymentProofUrl = null;
      
      // 1. Upload payment proof if provided
      if (paymentProof) {
        const formData = new FormData();
        formData.append('file', paymentProof);
        
        const uploadRes = await fetchWithAuth<{ url: string }>('/upload', {
          method: 'POST',
          body: formData,
          headers: {} // File transfers shouldn't have content-type set manually generally, fetch handles it
        });
        
        paymentProofUrl = uploadRes?.url;
      }

      // 2. Submit Enrollment Request
      setEnrolling(paymentCourse.id);
      const batchData = availableBatches.find(b => b.id === selectedBatch);
      const timeSlot = batchData ? `${batchData.start_time || ''} - ${batchData.end_time || ''}` : null;
      
      await enrollCourse(
        paymentCourse.id, 
        paymentCourse.title, 
        paymentCourse.price, 
        paymentProofUrl,
        selectedBatch || undefined,
        timeSlot || undefined
      );

      
      toast({
        title: 'Enrollment Pending Approval',
        description: 'Payment proof submitted. Admin will approve your access shortly.',
        className: 'bg-green-50 border-green-200'
      });
      
      setShowPaymentModal(false);
      setPaymentProof(null);
    } catch (err) {
      toast({
        title: 'Enrollment Failed',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
      setEnrolling(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section - Taller */}
      <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 py-20 md:py-32">
        {/* Back to Home Button */}
        <div className="container mx-auto px-4 absolute top-8 left-0 right-0 z-20">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/')}
            className="group gap-2 text-slate-600 hover:text-primary hover:bg-primary/5 transition-all rounded-full px-4"
          >
            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            <span className="font-bold text-xs uppercase tracking-widest">Back to Home</span>
          </Button>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight">
              Explore Our <span className="text-primary">Courses</span>
            </h1>
            <p className="text-lg text-slate-600">
              Master in-demand skills with our expert-led training programs
            </p>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-accent/10 rounded-full blur-3xl" />
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden border-0 rounded-3xl shadow-2xl bg-white">
          <div className="flex flex-col md:flex-row h-full">
            {/* Left Column: Course Summary */}
            <div className="md:w-[400px] bg-gradient-to-br from-[#0075CF] to-[#005CAD] p-8 text-white flex flex-col justify-between selection:bg-white/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#FD5A1A]/20 rounded-full blur-3xl -ml-24 -mb-24" />
              
              <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                    <BookOpen className="h-5 w-5 text-white" />
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

                <DialogHeader className="space-y-4">
                  <DialogTitle className="text-3xl font-black tracking-tight leading-tight">
                    Review Your <span className="text-white italic">Enrollment</span>
                  </DialogTitle>
                  <DialogDescription className="text-slate-200 text-sm leading-relaxed">
                    You're one step away from mastering new skills. Complete your free enrollment below to unlock full course access.
                  </DialogDescription>
                </DialogHeader>

                {paymentCourse && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 backdrop-blur-md">
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden border border-white/20">
                        <img src={paymentCourse.image} alt="" className="h-full w-full object-cover" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FD5A1A]">Target Course</div>
                        <h3 className="font-bold text-sm leading-snug line-clamp-2">{paymentCourse.title}</h3>
                        <div className="flex items-center gap-2 text-[10px] text-slate-300">
                          <Clock className="h-3 w-3" />
                          <span>Lifetime Access</span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-white/20 flex items-center justify-between">
                      <span className="text-sm font-medium text-white/60">Investment Fee</span>
                      <span className="text-2xl font-black text-white">
                        Free of Cost
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-12 space-y-6">
                <div className="flex items-center gap-4 group">
                  <div className="h-12 w-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center transition-all group-hover:scale-110 shadow-lg">
                    <CheckCircle2 className="h-6 w-6 text-[#FD5A1A]" />
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase tracking-widest text-white/40 mb-0.5">Enrollment Status</div>
                    <div className="text-sm font-bold text-white">Direct Free Access</div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed font-medium uppercase tracking-[0.1em]">
                  Education is the key to opportunity. Get started with no financial barrier.
                </p>
              </div>
            </div>

            {/* Right Column: Payment Details */}
            <div className="flex-1 p-8 md:p-12 space-y-8 bg-white selection:bg-slate-100">
              <div className="flex justify-between items-start">
                <div className="space-y-1 flex-1">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Confirm Enrollment</h3>
                  <p className="text-slate-500 text-sm font-medium">Select your preferred batch schedule to proceed.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        size="sm"
                        className="rounded-full px-6 font-bold h-10 hidden md:flex shadow-lg shadow-primary/20"
                        disabled={isUploading}
                        onClick={handleEnrollmentSubmit}
                    >
                         {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enroll Course'}
                    </Button>
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

              {/* Batch Selection */}
              <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">Select Batch/Time Slot</label>
                    {loadingBatches && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                 </div>
                 
                 {availableBatches.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                      {availableBatches.map(batch => (
                        <div 
                          key={batch.id}
                          onClick={() => setSelectedBatch(batch.id)}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer group",
                            selectedBatch === batch.id 
                              ? "border-primary bg-primary/5 shadow-md" 
                              : "border-slate-100 bg-slate-50 hover:border-slate-200"
                          )}
                        >
                          <div className="flex items-center gap-3">
                             <div className={cn(
                               "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                               selectedBatch === batch.id ? "bg-primary text-white" : "bg-white text-slate-400 border border-slate-100"
                             )}>
                                <Clock className="h-4 w-4" />
                             </div>
                             <div>
                                <p className="text-xs font-black text-slate-900 uppercase">
                                  {batch.batch_name || batch.batch_type}
                                </p>
                                <p className="text-[10px] font-bold text-slate-500">
                                  {batch.start_time} — {batch.end_time}
                                </p>
                             </div>
                          </div>
                          {selectedBatch === batch.id && (
                             <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      ))}
                    </div>
                 ) : !loadingBatches ? (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3">
                       <div className="h-8 w-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                          <X className="h-4 w-4" />
                       </div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">No active batches available. Admin will assign you manually.</p>
                    </div>
                 ) : null}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4 pt-4">
                <Button
                    variant="ghost"
                    size="lg"
                    className="h-14 rounded-2xl border-2 border-slate-100 font-bold text-slate-600 hover:bg-slate-50 gap-3"
                    onClick={() => {
                        window.location.href = `mailto:Info@aotms.in?subject=Enrollment Inquiry: ${paymentCourse?.title}&body=Hello, I have a question about the course enrollment process.`;
                    }}
                >
                    <Mail className="h-5 w-5 text-primary" />
                    Get in Touch
                </Button>
                <Button
                    size="lg"
                    className="h-14 rounded-2xl bg-gradient-to-r from-[#0075CF] to-[#3391D9] font-black uppercase tracking-widest text-sm shadow-xl shadow-[#0075CF]/20 active:scale-95 transition-all"
                    disabled={isUploading}
                    onClick={handleEnrollmentSubmit}
                >
                    {isUploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        'Enroll Now'
                    )}
                </Button>
              </div>

              <p className="text-center text-[10px] text-slate-400 font-medium">
                Once confirmed, the administration will review your free registration and grant you access shortly.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hero Section - Taller */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="rounded-full whitespace-nowrap"
            >
              All Courses
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat.toLowerCase() ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.toLowerCase())}
                className="rounded-full whitespace-nowrap"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="text-center py-12">
            <p className="text-red-500">{error}</p>
            <Button onClick={() => fetchCourses(1, selectedCategory, true)} className="mt-4">
              Try Again
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onEnroll={() => handleEnroll(course)}
              isEnrolling={enrolling === course.id}
              isLoggedIn={isLoggedIn}
              userRole={userRole || undefined}
            />
          ))}
        </div>

        {/* Loading / Infinite Scroll Trigger */}
        <div ref={observerRef} className="py-8">
          {loading && (
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          
          {!loading && !hasMore && courses.length > 0 && (
            <p className="text-center text-slate-500">
              You've reached the end! Browse more categories above.
            </p>
          )}

          {!loading && courses.length === 0 && !error && (
            <div className="text-center py-12">
              <p className="text-xl text-slate-600 font-medium">No courses found in this category.</p>
              <p className="text-slate-500 mt-2">Try selecting a different category or check back later.</p>
              <Button variant="outline" onClick={() => setSelectedCategory('all')} className="mt-6">
                View All Courses
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Course Card Component
function CourseCard({ 
  course, 
  onEnroll, 
  isEnrolling,
  isLoggedIn,
  userRole
}: { 
  course: Course;
  onEnroll: () => void;
  isEnrolling: boolean;
  isLoggedIn: boolean;
  userRole?: string;
}) {
  return (
    <Card className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 rounded-2xl h-full">
      {/* Image - Taller */}
      <div className="relative h-64 overflow-hidden">
        <img
          src={course.image}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        
        {/* Category Badge */}
        <Badge 
          className="absolute top-4 left-4 text-xs font-semibold px-3 py-1"
          style={{ backgroundColor: course.theme_color }}
        >
          {course.category}
        </Badge>
      </div>

      {/* Content - More padding */}
      <CardContent className="p-6 space-y-5 flex-1 flex flex-col">
        <div>
          <h3 className="font-bold text-xl text-slate-900 group-hover:text-primary transition-colors line-clamp-2">
            {course.title}
          </h3>
          <p className="text-sm text-slate-500 mt-2 line-clamp-3">{course.level}</p>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-6 text-sm text-slate-500">
          {course.duration !== "4 Months" && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-medium">{course.duration}</span>
            </div>
          )}
          {course.trainer && (
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="truncate max-w-[100px]">{course.trainer}</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline justify-between pt-2">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#0075CF] to-[#FD5A1A]">
              Free of Cost
            </span>
          </div>
        </div>

        {/* Enroll Button */}
        <Button
          onClick={onEnroll}
          disabled={isEnrolling}
          className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs bg-gradient-to-r from-[#0075CF] to-[#005CAD] hover:from-[#005CAD] hover:to-[#004280] text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
        >
          {isEnrolling ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <>
              {userRole === 'instructor' ? 'Teach this Course' : 'Enroll Now'}
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// Helper to parse price
function parsePrice(price: string | number | undefined | null): number {
  if (price === undefined || price === null) return 0;
  if (typeof price === 'number') return price;
  return parseInt(price.replace(/[^0-9]/g, '')) || 0;
}
