import { useState, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api';

export interface Course {
  id: string; // Changed to string to support MongoDB ObjectIds
  slug: string;
  title: string;
  category: string;
  image: string;
  duration: string;
  level: string;
  price: string;
  original_price: string;
  rating: number;
  theme_color: string;
  trainer: string;
  is_active: boolean;
  instructor_id?: string;
  status?: string;
}

interface DatabaseCourse {
  id: string;
  slug: string;
  title: string;
  category: string;
  thumbnail_url: string; // Updated to match backend
  image?: string; // Fallback
  duration: string;
  level: string;
  price: string;
  original_price: string;
  rating: number;
  theme_color: string;
  trainer: string;
  is_active: boolean;
  status?: string;
  instructor_id?: string;
}

export interface CourseEnrollment {
  id: string;
  user_id: string;
  course_id: string; // Changed to string
  course_name: string;
  price: string;
  source: string;
  status: 'pending' | 'active' | 'rejected' | 'deactivate';
  enrollment_date: string;
  created_at: string;
  final_price?: number;
  applied_coupon?: string;
  user_name?: string;
  user_email?: string;
  progress_percentage?: number;
  payment_proof_url?: string;
  utr_number?: string;
  user_phone?: string;
  payment_term?: 'full' | 'term1' | 'term2';
  remaining_balance?: number;
  user_avatar?: string;
  enrolled_at?: string;
  profile?: {
    full_name?: string;
    email?: string;
    avatar_url?: string;
    mobile_number?: string;
    photo_url?: string;
  };
  course?: {
    title?: string;
    price?: number | string;
  };
}

interface DatabaseEnrollment extends CourseEnrollment {
  profile?: {
    full_name?: string;
    email?: string;
    avatar_url?: string;
    mobile_number?: string;
    photo_url?: string;
  };
  course?: {
    title?: string;
    price?: number | string;
  };
}

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);

  const fetchCourses = useCallback(async (pageNum: number = 1, category: string = 'all', reset: boolean = false, pageSize: number = 9) => {
    // Prevent fetching if we already have data and are just re-rendering, 
    // BUT allow if we are resetting (e.g. category change) or explicitly loading more
    if (loading) return;
    
    setLoading(true);
    setError(null);

    try {
      // Use public endpoint for courses listing
      const endpoint = `/public/courses?${category && category !== 'all' ? `category=${encodeURIComponent(category)}` : ''}`;
      const data = await fetchWithAuth(endpoint) as DatabaseCourse[];
      
      const coursesData: Course[] = (data || []).map((c) => ({
        id: c.id,
        slug: c.slug || '',
        title: c.title || '',
        category: c.category || '',
        image: c.thumbnail_url || c.image || '', // Map thumbnail_url to image
        duration: c.duration || '',
        level: c.level || '',
        price: c.price !== undefined && c.price !== null ? String(c.price) : '',
        original_price: c.original_price !== undefined && c.original_price !== null ? String(c.original_price) : '',
        rating: Number(c.rating || 0),
        theme_color: c.theme_color || '',
        trainer: c.trainer || '',
        is_active: c.is_active,
        status: c.status,
        instructor_id: c.instructor_id
      })).sort((a, b) => (a.title || '').localeCompare(b.title || ''));

      // Client-side pagination since we fetch all active courses at once
      const ITEMS_PER_PAGE = pageSize;
      const startIndex = (pageNum - 1) * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const paginatedCourses = coursesData.slice(startIndex, endIndex);

      if (reset) {
        setCourses(paginatedCourses);
      } else {
        // Only append if it's a new page
        setCourses(prev => {
             // Basic check to avoid duplicates if strict mode is on
             const existingIds = new Set(prev.map(c => c.id));
             const uniqueNew = paginatedCourses.filter(c => !existingIds.has(c.id));
             return [...prev, ...uniqueNew];
        });
      }
      
      setHasMore(endIndex < coursesData.length);
      setPage(pageNum);

      // Set categories only if empty (prevent re-renders loop)
      if (categories.length === 0) {
          const cats = [...new Set(coursesData.map((c: Course) => c.category))];
          setCategories(cats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [loading, categories.length]); // Added dependency to prevent infinite loops if logic relies on it

  const fetchCategories = useCallback(async () => {
    if (categories.length > 0) return; // Cache: Don't fetch if we already have them

    try {
      const data = await fetchWithAuth('/public/courses') as DatabaseCourse[];
      if (data) {
        const cats = Array.from(new Set(data.map((c) => c.category))).filter(Boolean);
        setCategories(cats as string[]);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, [categories.length]);

  const enrollCourse = useCallback(async (courseId: string, courseName: string, price: string, payment_proof_url?: string, batchId?: string, timeSlot?: string) => {
    // Backend now handles Firebase/Firestore enrollment
    const insertRes = await fetchWithAuth(
      `/courses/enroll`,
      {
        method: 'POST',
        body: JSON.stringify({
          course_id: courseId,
          course_name: courseName,
          price,
          payment_proof_url,
          requested_batch_id: batchId,
          requested_time_slot: timeSlot
        })
      }
    );

    if (!insertRes) {
      throw new Error('Enrollment failed or returned no data');
    }

    return { message: 'Successfully enrolled!' };
  }, []);

  const fetchEnrollments = useCallback(async (): Promise<CourseEnrollment[]> => {
    const userRole = localStorage.getItem('user_role');
    let enrollmentsData: CourseEnrollment[];
    
    if (userRole === 'admin' || userRole === 'manager') {
      try {
        const rawData = await fetchWithAuth('/courses/enrollments') as DatabaseEnrollment[];
        enrollmentsData = (rawData || []).map((item) => ({
          ...item,
          user_name: item.profile?.full_name || 'Unknown',
          user_email: item.profile?.email || 'No Email',
          user_phone: item.profile?.mobile_number || 'N/A',
          course_name: item.course?.title || 'Unknown Course',
          price: item.course?.price !== undefined ? String(item.course.price) : (item.price !== undefined ? String(item.price) : 'Free'),
          payment_term: item.payment_term,
          remaining_balance: item.remaining_balance,
          user_avatar: item.profile?.avatar_url || item.profile?.photo_url
        }));
      } catch (err) {
        console.error('[fetchEnrollments] Error:', err);
        enrollmentsData = [];
      }
    } else {
      // Use the generic data API which we've migrated to Firestore
      enrollmentsData = (await fetchWithAuth('/data/course_enrollments?order=enrollment_date.desc')) as CourseEnrollment[];
    }

    return enrollmentsData || [];
  }, []);

  const fetchMyEnrollments = useCallback(async (): Promise<CourseEnrollment[]> => {
    // Backend handles filtering by current user based on token
    const enrollments = (await fetchWithAuth('/data/course_enrollments?order=enrollment_date.desc')) as CourseEnrollment[];
    return enrollments || [];
  }, []);

  const checkEnrollment = useCallback(async (courseId: string): Promise<boolean> => {
    try {
      const data = (await fetchWithAuth(`/courses/enrollment/${courseId}`)) as { enrolled: boolean };
      return !!data?.enrolled;
    } catch (err) {
      return false;
    }
  }, []);

  const chooseCourse = useCallback(async (courseId: string, session?: string, startTime?: string, endTime?: string) => {
    const res = await fetchWithAuth(
      `/instructor/choose-course`,
      {
        method: 'POST',
        body: JSON.stringify({
          courseId: courseId,
          dealing_session: session,
          start_time: startTime,
          end_time: endTime
        })
      }
    );

    if (!res) {
      throw new Error('Failed to choose course');
    }

    return { message: 'Course requested successfully!' };
  }, []);

  const deleteEnrollment = useCallback(async (id: string) => {
    const res = await fetchWithAuth(`/courses/enrollment/${id}`, {
      method: 'DELETE'
    });
    if (!res) throw new Error('Delete failed');
    return res;
  }, []);

  return {
    courses,
    loading,
    error,
    hasMore,
    page,
    categories,
    fetchCourses,
    fetchCategories,
    enrollCourse,
    fetchEnrollments,
    fetchMyEnrollments,
    checkEnrollment,
    chooseCourse,
    deleteEnrollment
  };
}