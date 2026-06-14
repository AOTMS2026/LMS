import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragStartEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { fetchWithAuth } from "@/lib/api";
import { cn } from "@/lib/utils";
import { 
  Users, 
  Plus, 
  Clock, 
  Trash2, 
  Pencil,
  Split, 
  Layers,
  Search,
  Calendar,
  X,
  UserPlus,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sun,
  CloudSun,
  Moon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Batch {
  id: string;
  _id?: string;
  batch_name: string;
  batch_type: 'morning' | 'afternoon' | 'evening';
  start_time: string;
  end_time: string;
  max_students: number;

  student_count: number;
  created_at: string;
  batches?: Batch[];
  batch_category?: string;
  original?: Batch;
  students?: RosterStudent[];
  parent_batch_id?: string;
}

interface RosterStudent {
  student_id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  roll_number?: string;
  year?: string;
  department?: string;
  enrollment_status?: 'active' | 'pending' | 'completed' | 'dropped';
  batch?: {
    id: string;
    name: string;
    type: string;
    session?: string;
  };
}

interface GroupedRoster {
  morning: RosterStudent[];
  afternoon: RosterStudent[];
  evening: RosterStudent[];
  unassigned: RosterStudent[];
  byBatch: Record<string, RosterStudent[]>;
  all?: RosterStudent[];
}

interface BatchRequest {
  id: string;
  student_id: {
    _id: string;
    full_name: string;
    email: string;
  };
  course_id: {
    _id: string;
    title: string;
  };
  batch_id: {
    _id: string;
    batch_name: string;
    batch_type: string;
  };
  type: string;
  requested_session?: string;
  requested_at: string;
}

interface BatchManagerProps {
  courseId: string;
  courseTitle: string;
  assignedSession?: 'morning' | 'afternoon' | 'evening';
}

// ─── Draggable Student Card ─────────────────────────────────────────────────
function DraggableStudentCard({ student, onRemove }: { student: RosterStudent, onRemove?: (studentId: string, batchId: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: student.student_id,
    data: student
  });

  const style = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined;

  return (
    <motion.div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      layout
      className={`bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group relative cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50 z-50 ring-2 ring-primary' : ''}`}
    >
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border-2 border-white shadow-sm pointer-events-none">
          <AvatarImage src={student.avatar_url} />
          <AvatarFallback className="bg-slate-100 text-slate-400 font-bold text-xs">
            {student.full_name ? student.full_name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase() : '?'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0 pointer-events-none">
          <p className="text-sm font-black text-slate-900 truncate">{student.full_name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0 flex-wrap">
            <p className="text-[10px] font-bold text-slate-500 truncate max-w-[120px]">{student.email}</p>
            {student.roll_number && <span className="text-[9px] font-black uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">{student.roll_number}</span>}
            {student.year && <span className="text-[9px] font-black uppercase bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded shrink-0">Y{student.year}</span>}
            {student.department && <span className="text-[9px] font-black uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded shrink-0">{student.department}</span>}
            <p className="text-[10px] font-bold text-slate-500 truncate max-w-[120px]">{student.email}</p>
            {student.enrollment_status === 'pending' && (
              <Badge className="text-[8px] font-black uppercase bg-amber-50 text-amber-600 border border-amber-100 rounded-md px-1.5 py-0.5 scale-90 shrink-0 whitespace-nowrap">
                Pending
              </Badge>
            )}
            {student.batch && (
              <Badge className="text-[8px] font-black uppercase bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-md px-1.5 py-0.5 scale-90 shrink-0 whitespace-nowrap">
                {student.batch.name}
              </Badge>
            )}
          </div>
        </div>
        {!isDragging && student.batch && (
           <Button 
             variant="ghost" 
             size="icon" 
             className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 z-10"
             onClick={(e) => {
               e.stopPropagation();
               onRemove?.(student.student_id, student.batch!.id);
             }}
           >
             <Trash2 className="h-4 w-4" />
           </Button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Droppable Roster Column ───────────────────────────────────────────────
function DroppableRosterColumn({ title, students, colorClass, type, onRemove }: { title: string, students: RosterStudent[], colorClass: string, type: string, onRemove?: (id: string, bId: string) => void }) {
  const { isOver, setNodeRef } = useDroppable({
    id: type,
  });

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col gap-4 p-5 rounded-[2.5rem] border transition-all duration-300 min-h-[500px] shadow-sm ${
        isOver 
          ? 'bg-primary/10 border-primary border-dashed scale-[1.02] shadow-2xl ring-4 ring-primary/5' 
          : 'bg-slate-50 border-slate-200/60 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between px-3 py-1">
        <div className="flex items-center gap-2.5">
           <div className={`h-2.5 w-2.5 rounded-full ${
             type === 'morning' ? 'bg-orange-400' :
             type === 'afternoon' ? 'bg-blue-400' :
             type === 'evening' ? 'bg-violet-400' :
             'bg-slate-400'
           } ${isOver ? 'animate-ping scale-125' : 'animate-none'}`} />
           <h3 className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-600">{title}</h3>
        </div>
        <Badge className={`${colorClass} border-none font-black shadow-sm`}>{students.length}</Badge>
      </div>
      
      <div className="space-y-3 flex-1">
        {students.length === 0 ? (
          <div className="h-full py-12 border-2 border-dashed border-slate-300 rounded-[2rem] flex flex-col items-center justify-center text-slate-400 bg-white/40 group-hover:bg-white/60 transition-colors">
            <Users className="h-10 w-10 mb-3 opacity-30 text-slate-500" />
            <p className="text-[10px] uppercase font-black tracking-[0.15em] text-center px-6 leading-relaxed opacity-80">
              Drag Students Here<br/>to Assign Session
            </p>
          </div>
        ) : (
          students.map(student => (
            <DraggableStudentCard 
              key={student.student_id} 
              student={student} 
              onRemove={onRemove}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function BatchManager({ courseId, courseTitle, assignedSession }: BatchManagerProps) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [roster, setRoster] = useState<GroupedRoster | null>(null);
  const [requests, setRequests] = useState<BatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'batches' | 'roster' | 'requests'>('batches');
  const [rosterFilter, setRosterFilter] = useState<'morning' | 'afternoon' | 'evening' | 'unassigned'>('morning');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [rosterSearchQuery, setRosterSearchQuery] = useState("");
  const { toast } = useToast();
  
  // Dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeStudent, setActiveStudent] = useState<RosterStudent | null>(null);


  // Create/Edit Batch State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [newBatch, setNewBatch] = useState({
    batch_name: "",
    batch_type: "morning" as 'morning' | 'afternoon' | 'evening',
    max_students: 30,
    start_time: "09:00",
    end_time: "11:00"
  });


  const handleUpdateBatch = async () => {
    if (!editingBatch) return;
    try {
      await fetchWithAuth(`/batches/${editingBatch.id}`, {
        method: 'PUT',
        body: JSON.stringify(newBatch)
      });
      toast({ title: "Success", description: "Batch updated successfully" });
      setEditingBatch(null);
      setShowCreateModal(false);
      loadBatches();
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Assign Student Modal
  const [assignmentModal, setAssignmentModal] = useState<{ student: RosterStudent | null, isOpen: boolean }>({
    student: null,
    isOpen: false
  });

  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const [batchData, rosterData, requestData] = await Promise.all([
        fetchWithAuth(`/batches?course_id=${courseId}`),
        fetchWithAuth(`/batches/course-roster/${courseId}`),
        fetchWithAuth(`/batches/requests/pending`)
      ]) as [Batch[], GroupedRoster, BatchRequest[]];
      setBatches(batchData || []);
      setRoster(rosterData);
      setRequests(requestData);
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message || "Failed to load batches", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [courseId, toast]);

  useEffect(() => {
    if (courseId) loadBatches();
  }, [courseId, loadBatches]);

  const handleCreateBatch = async () => {
    try {
      await fetchWithAuth("/batches", {
        method: "POST",
        body: JSON.stringify({
          ...newBatch,
          course_id: courseId,
        }),
      });

      toast({ title: "Success", description: "Batch initialized successfully" });
      setShowCreateModal(false);
      setNewBatch({
        batch_name: "",
        batch_type: "morning",
        max_students: 30,
        start_time: "09:00",
        end_time: "11:00"
      });

      loadBatches();
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleAssignStudent = async (batchId: string, studentId?: string, session?: string) => {
    const targetStudentId = studentId || assignmentModal.student?.student_id;
    if (!targetStudentId) return;

    try {
      await fetchWithAuth(`/batches/${batchId}/students`, {
        method: 'POST',
        body: JSON.stringify({ 
          student_id: targetStudentId,
          course_id: courseId,
          session: session // Pass the specific session slot
        })
      });
      toast({ title: "Assigned", description: `Assigned to ${session || 'batch'} successfully.` });
      setAssignmentModal({ student: null, isOpen: false });
      loadBatches();
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveStudent(event.active.data.current as RosterStudent);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveStudent(null);
    
    if (!over) return;

    const studentId = active.id as string;
    const overId = over.id as string;
    const student = active.data.current as RosterStudent;

    // 1. Handle Unassignment
    if (overId === 'unassigned') {
      if (student.batch) {
        handleRemoveStudent(studentId, student.batch.id);
      }
      return;
    }

    // 2. Check if dropped on a specific batch (Batch-wise view)
    const targetBatch = batches.find(b => b.id === overId);
    
    if (targetBatch) {
      // If student is already in this exact batch, do nothing
      if (student.batch?.id === overId) return;

      // Assign to this specific batch
      // If it's a sub-batch, we need the actual sub-batch ID if available
      handleAssignStudent(overId, studentId, targetBatch.batch_type);
      return;
    }

    // 3. Fallback: Check if dropped on a session category (for legacy support if any)
    const targetBatchType = overId as 'morning' | 'afternoon' | 'evening';
    if (['morning', 'afternoon', 'evening'].includes(targetBatchType)) {
      const currentSession = student.batch?.session || student.batch?.type;
      if (currentSession === targetBatchType) return;

      const possibleBatches = batches.filter(b => b.batch_type === targetBatchType);
      
      if (possibleBatches.length === 0) {
        toast({ 
          title: "No Batches", 
          description: `Create a ${targetBatchType} section first.`,
          variant: "destructive"
        });
        return;
      }

      if (possibleBatches.length === 1) {
        handleAssignStudent(possibleBatches[0].id, studentId, targetBatchType);
      } else {
        setAssignmentModal({ student, isOpen: true });
      }
    }
  };

  const handleProcessRequest = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      await fetchWithAuth(`/batches/requests/${requestId}/${action}`, { method: 'POST' });
      toast({ title: action === 'approve' ? "Approved" : "Rejected", description: `Batch request processed successfully.` });
      loadBatches();
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveStudent = async (studentId: string, batchId: string) => {
    try {
      await fetchWithAuth(`/batches/${batchId}/students/${studentId}`, { method: 'DELETE' });
      toast({ title: "Removed", description: "Student unassigned from batch." });
      loadBatches();
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };


  const handleDeleteBatch = async (id: string) => {
    if (!confirm("Are you sure? This will remove all student assignments for this batch.")) return;
    try {
      await fetchWithAuth(`/batches/${id}`, { method: 'DELETE' });
      toast({ title: "Deleted", description: "Batch removed" });
      loadBatches();
    } catch (e: unknown) {
      const error = e as Error;
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    // If already formatted or special string, return as is
    if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
    
    try {
      const [hours, minutes] = timeStr.split(':');
      const h = parseInt(hours);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  };

  const getSessionTime = (batch: Batch) => {
    if (batch.start_time && batch.end_time) {
      return `${formatTime(batch.start_time)} — ${formatTime(batch.end_time)}`;
    }
    return "Custom Schedule";
  };


  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-8">
      {/* Header & Stats */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
            <div className="h-12 w-12 rounded-[1.25rem] bg-primary/10 flex items-center justify-center text-primary shadow-inner">
               <Layers className="h-6 w-6" />
            </div>
            Batch Commander
          </h2>
          <p className="text-sm text-slate-500 font-medium mt-2 ml-16">Intelligence-driven student distribution for <span className="text-primary font-bold">{courseTitle}</span></p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className="flex-1 min-w-0 overflow-x-auto custom-scrollbar-hide rounded-2xl bg-slate-100/80 p-1 mr-2 no-scrollbar">
            <div className="flex items-center min-w-max">
              <Button 
                variant={viewMode === 'batches' ? 'default' : 'ghost'}
                onClick={() => setViewMode('batches')}
                className={`rounded-xl h-10 px-6 font-black text-[10px] uppercase tracking-widest transition-all ${viewMode === 'batches' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
              >
                Batch Cards
              </Button>
              <Button 
                variant={viewMode === 'roster' ? 'default' : 'ghost'}
                onClick={() => setViewMode('roster')}
                className={`rounded-xl h-10 px-6 font-black text-[10px] uppercase tracking-widest transition-all ${viewMode === 'roster' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
              >
                Full Roster
              </Button>
              <Button 
                variant={viewMode === 'requests' ? 'default' : 'ghost'}
                onClick={() => setViewMode('requests')}
                className={`rounded-xl h-10 px-6 font-black text-[10px] uppercase tracking-widest transition-all relative ${viewMode === 'requests' ? 'bg-white text-primary shadow-sm' : 'text-slate-400'}`}
              >
                Requests
                {requests.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white text-[8px] flex items-center justify-center rounded-full animate-bounce shadow-lg">
                    {requests.length}
                  </span>
                )}
              </Button>
            </div>
          </div>

          <Button 
            onClick={() => setShowCreateModal(true)}
            className="rounded-xl h-11 px-6 bg-primary text-white hover:bg-primary/90 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            Create Batch
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-[2.5rem]" />
          ))}
        </div>
      ) : viewMode === 'batches' ? (
        (() => {
          // Show all batches regardless of assigned session so newly created batches are visible
          const filteredBatches = batches;

          if (filteredBatches.length === 0) {
            return (
              <div className="flex flex-col items-center justify-center p-20 bg-slate-50 rounded-[4rem] border-4 border-dashed border-slate-200 text-center">
                <div className="h-24 w-24 bg-white rounded-full shadow-2xl flex items-center justify-center mb-8 relative">
                  <Users className="h-10 w-10 text-slate-300" />
                  <div className="absolute -top-1 -right-1 h-6 w-6 bg-primary rounded-full animate-ping opacity-20" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Zero Active Batches</h3>
                <p className="text-slate-500 max-w-sm mt-4 text-sm font-medium leading-relaxed">
                  {assignedSession 
                    ? `You don't have any dealing batches for the ${assignedSession} session yet.`
                    : "Enable strict time-gating by creating your first training batch. Students will automatically split as they enroll."
                  }
                </p>
                <Button 
                   onClick={() => {
                     setNewBatch(prev => ({ ...prev, batch_type: !assignedSession ? 'morning' : (assignedSession as 'morning' | 'afternoon' | 'evening') }));
                     setShowCreateModal(true);
                   }} 
                   variant="default" 
                   className="mt-10 rounded-2xl h-14 px-10 bg-primary text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/30"
                >
                  Initialize {assignedSession ? assignedSession : 'First'} Batch
                </Button>
              </div>
            );
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <AnimatePresence>
                {filteredBatches.map((batch: Batch, idx: number) => {
                  const displayId = batch.id || batch._id;
                  return (
                    <motion.div
                      key={`${displayId}-${batch.batch_type}-${idx}`}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className="rounded-[3rem] border-slate-100 shadow-xl hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-500 group overflow-hidden bg-white/80 backdrop-blur-sm border">
                        <CardContent className="p-0">
                          <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                              <Badge className={`rounded-xl font-black text-[10px] uppercase px-3 py-1.5 border-none ${
                                batch.batch_type === 'morning' ? 'bg-orange-100 text-orange-700' :
                                batch.batch_type === 'afternoon' ? 'bg-blue-100 text-blue-700' :
                                'bg-violet-100 text-violet-700'
                              }`}>
                                Batch
                              </Badge>
                              <div className="flex items-center gap-1">
                                 <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                   <Calendar className="h-3 w-3" />
                                   {formatDate(batch.created_at || batch.original?.created_at)}
                                 </span>
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   onClick={() => {
                                      const isSub = !!batch.parent_batch_id;
                                      setEditingBatch({
                                        ...batch,
                                        id: isSub ? batch.parent_batch_id : (batch.id || batch._id)
                                      });
                                      setNewBatch({
                                        batch_name: batch.batch_name,
                                        batch_type: batch.batch_type,
                                        max_students: batch.max_students || 0,
                                        start_time: batch.start_time || "09:00",
                                        end_time: batch.end_time || "11:00"
                                      });
                                      setShowCreateModal(true);
                                   }}
                                   className="h-9 w-9 rounded-xl hover:bg-primary/5 hover:text-primary text-slate-300 opacity-20 group-hover:opacity-100 transition-all border border-transparent mr-1"
                                 >
                                   <Pencil className="h-3.5 w-3.5" />
                                 </Button>
                                 <Button 
                                   variant="ghost" 
                                   size="icon" 
                                   onClick={() => handleDeleteBatch(batch.id)}
                                   className="h-9 w-9 rounded-xl hover:bg-rose-50 hover:text-rose-600 text-slate-300 opacity-20 group-hover:opacity-100 transition-all border border-transparent hover:border-rose-100"
                                 >
                                   <Trash2 className="h-4 w-4" />
                                 </Button>
                              </div>
                            </div>

                            <h3 className="text-xl font-black text-slate-900 leading-tight mb-2 tracking-tight">{batch.batch_name}</h3>


                            <div className="space-y-4">
                              <div className="flex items-center justify-between px-1">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Capacity</span>
                                <span className="text-sm font-black text-slate-900">{batch.student_count || 0} / {batch.max_students} <span className="text-[10px] text-slate-400 font-medium">LMS Nodes</span></span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(((batch.student_count || 0) / (batch.max_students || 1)) * 100, 100)}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className={`h-full rounded-full ${
                                    ((batch.student_count || 0) / (batch.max_students || 1)) > 0.8 ? 'bg-rose-500' : 
                                    ((batch.student_count || 0) / (batch.max_students || 1)) > 0.5 ? 'bg-amber-500' : 'bg-primary'
                                  }`}
                                />
                              </div>
                            </div>
                          </div>

                          <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                             <div className="flex -space-x-2">
                                {(batch.students || []).slice(0, 4).map((s: RosterStudent) => (
                                  <Avatar key={s.student_id} className="h-8 w-8 border-2 border-white ring-2 ring-slate-50 shadow-sm">
                                    <AvatarImage src={s.avatar_url} />
                                    <AvatarFallback className="bg-slate-200 text-[10px] font-bold text-slate-500">{s.full_name[0]}</AvatarFallback>
                                  </Avatar>
                                ))}
                                {(batch.student_count > 4) && (
                                  <div className="h-8 w-8 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 z-10">
                                    +{batch.student_count - 4}
                                  </div>
                                )}
                             </div>
                             <Button 
                               variant="ghost" 
                               onClick={() => {
                                 setRosterFilter(batch.batch_type as typeof rosterFilter);
                                 setSelectedBatchId(batch.id);
                                 setViewMode('roster');
                               }}
                               className="h-auto p-0 text-primary font-black text-[10px] uppercase tracking-[0.15em] hover:bg-transparent hover:translate-x-1 transition-all"
                             >
                                Check Unit Roster <ArrowRight className="h-3 w-3 ml-1" />
                             </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                    );
                })}
                
                {/* LOCALIZED CREATE BUTTON CARD */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: filteredBatches.length * 0.05 }}
                >
                  <Card 
                    onClick={() => {
                      setNewBatch(prev => ({ 
                        ...prev, 
                        batch_type: !assignedSession ? 'morning' : (assignedSession as 'morning' | 'afternoon' | 'evening') 
                      }));
                      setShowCreateModal(true);
                    }}
                    className="rounded-[3rem] border-4 border-dashed border-slate-100 h-full min-h-[300px] flex flex-col items-center justify-center p-8 cursor-pointer hover:border-primary/20 hover:bg-primary/5 transition-all duration-500 group bg-white/30 backdrop-blur-sm shadow-sm"
                  >
                    <div className="h-16 w-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-500 group-hover:rotate-12 shadow-inner">
                      <Plus className="h-8 w-8 text-slate-400 group-hover:text-white" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-primary transition-colors">Create New Batch</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2 italic">Add Session Node</p>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </div>
          );
        })()
      ) : viewMode === 'requests' ? (
        <div className="space-y-6 max-w-4xl">
          <div className="flex items-center gap-3 mb-2 px-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-lg text-slate-800 tracking-tight">Pending Batch Transfers</h3>
          </div>
          
          {requests.length === 0 ? (
            <div className="py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
              <CheckCircle2 className="h-12 w-12 text-slate-200 mb-4" />
              <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">No Pending Requests</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {requests.map(request => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-slate-50">
                      <AvatarFallback className="bg-primary/5 text-primary font-black">
                        {request.student_id.full_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-900 leading-tight">{request.student_id.full_name}</h4>
                        {request.requested_session && (
                          <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5",
                            request.requested_session === 'morning' ? "bg-amber-50 text-amber-600 border border-amber-100" :
                            request.requested_session === 'afternoon' ? "bg-orange-50 text-orange-600 border border-orange-100" :
                            "bg-indigo-50 text-indigo-600 border border-indigo-100"
                          )}>
                            <Clock className="h-3 w-3" />
                            {request.requested_session}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Requesting <span className="text-primary font-black">{request.batch_id.batch_name}</span> for {request.course_id.title}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="rounded-xl font-bold text-[10px] uppercase tracking-widest text-slate-400 hover:text-rose-500"
                      onClick={() => handleProcessRequest(request.id, 'reject')}
                    >
                      Reject
                    </Button>
                    <Button 
                      size="sm" 
                      className="rounded-xl font-black text-[10px] uppercase tracking-widest bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                      onClick={() => handleProcessRequest(request.id, 'approve')}
                    >
                      Approve Transfer
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Categorized Roster View */
        <div className="space-y-6">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >

            <div className="overflow-x-auto pb-6 -mx-4 px-4 custom-scrollbar">
              <div className="flex gap-6 min-w-max pb-2">
                {selectedBatchId ? (
                  // Single Batch View
                  <div className="flex gap-6 min-w-max pb-2">
                    <div className="space-y-4 w-[320px] shrink-0">
                      <div className="flex items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm h-14">
                         <div className="flex items-center gap-3">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setSelectedBatchId(null)}
                              className="h-8 w-8 p-0 rounded-full hover:bg-slate-100"
                            >
                               <X className="h-4 w-4" />
                            </Button>
                            {(() => {
                               const b = batches.find(x => x.id === selectedBatchId);
                               return (
                                 <div>
                                    <h4 className="font-black text-slate-900 text-xs truncate max-w-[180px]">{b?.batch_name}</h4>

                                 </div>
                               );
                            })()}
                         </div>
                      </div>
                      <DroppableRosterColumn 
                        title="Allocated Students" 
                        students={roster?.byBatch[selectedBatchId] || []} 
                        colorClass="bg-primary/10 text-primary" 
                        type={selectedBatchId}
                        onRemove={handleRemoveStudent}
                      />
                    </div>

                    {/* Available / Full Course Roster Column */}
                    <div className="space-y-4 w-[320px] shrink-0">
                      <div className="flex items-center justify-between bg-white px-4 py-2 rounded-3xl border border-slate-100 shadow-sm h-14 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Users className="h-4 w-4 text-indigo-500 shrink-0" />
                          <div className="min-w-0">
                            <h4 className="font-black text-slate-900 text-xs truncate">Full Course Roster</h4>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">
                              All Enrolled Students
                            </p>
                          </div>
                        </div>
                        <div className="relative w-36">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                          <Input
                            placeholder="Search..."
                            value={rosterSearchQuery}
                            onChange={(e) => setRosterSearchQuery(e.target.value)}
                            className="pl-8 h-8 text-[10px] bg-slate-50/50 border-slate-100 focus-visible:ring-primary/20 rounded-xl"
                          />
                        </div>
                      </div>
                      <DroppableRosterColumn 
                        title="Course Students" 
                        students={(() => {
                          const allStudents = roster?.all || [];
                          // Filter out students already in the selected batch
                          const available = allStudents.filter(s => s.batch?.id !== selectedBatchId);
                          if (!rosterSearchQuery) return available;
                          return available.filter(s => 
                            s.full_name.toLowerCase().includes(rosterSearchQuery.toLowerCase()) ||
                            s.email.toLowerCase().includes(rosterSearchQuery.toLowerCase())
                          );
                        })()} 
                        colorClass="bg-slate-100 text-slate-700" 
                        type="unassigned"
                        onRemove={handleRemoveStudent}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Show all batches so instructor can see all assigned students */}
                    {batches.filter(b => {
                      if (b.batch_category === 'remove' && !b.id) return false;
                      if (rosterFilter === 'unassigned') return false;
                      // Show all batches regardless of session type so all students are visible
                      return true;
                    }).map(batch => (
                      <div key={batch.id} className="w-[320px] shrink-0">
                        <DroppableRosterColumn 
                          title={batch.batch_name} 
                          students={roster?.byBatch[batch.id] || []} 
                          colorClass={
                            batch.batch_type === 'morning' ? 'bg-orange-100 text-orange-700' :
                            batch.batch_type === 'afternoon' ? 'bg-blue-100 text-blue-700' :
                            'bg-violet-100 text-violet-700'
                          } 
                          type={batch.id}
                          onRemove={handleRemoveStudent}
                        />
                      </div>
                    ))}

                  </>
                )}
              </div>
            </div>

            <DragOverlay>
              {activeStudent ? (
                <div className="bg-white p-4 rounded-2xl border-2 border-primary shadow-2xl opacity-90 scale-105 cursor-grabbing w-[300px]">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                      <AvatarImage src={activeStudent.avatar_url} />
                      <AvatarFallback className="bg-slate-100 text-slate-400 font-bold text-xs">
                        {activeStudent.full_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-800 truncate">{activeStudent.full_name}</p>
                      <p className="text-[10px] font-medium text-slate-400 truncate">{activeStudent.email}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* Create Modal */}
        <Dialog 
          open={showCreateModal} 
          onOpenChange={(open) => {
            setShowCreateModal(open);
            if(!open) setEditingBatch(null);
          }}
        >
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">
              {editingBatch ? 'Adjust Training Batch' : 'Create Training Batch'}
            </DialogTitle>
            <DialogDescription className="text-slate-500 font-medium">
              {editingBatch ? 'Update configuration for the active student cohort.' : 'Define the schedule and capacity for a new student cohort.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Batch Label</Label>
              <Input 
                placeholder="e.g. CSE-1" 
                value={newBatch.batch_name}
                onChange={(e) => setNewBatch({...newBatch, batch_name: e.target.value})}
                className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:ring-primary/20" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black text-slate-700 uppercase tracking-widest ml-1">Max Capacity</Label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 60"
                value={newBatch.max_students === 0 ? '' : newBatch.max_students}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setNewBatch({...newBatch, max_students: val === '' ? 0 : parseInt(val)});
                }}
                className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:ring-primary/20"
              />
            </div>

          </div>

          <DialogFooter className="gap-3 mt-4 border-t pt-6">
            <Button variant="ghost" className="rounded-2xl h-12 font-black uppercase text-xs tracking-widest border border-slate-100" onClick={() => { setShowCreateModal(false); setEditingBatch(null); }}>Cancel</Button>
            <Button 
              className="rounded-2xl h-12 px-8 bg-primary text-white hover:bg-primary/90 font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20" 
              onClick={editingBatch ? handleUpdateBatch : handleCreateBatch}
            >
              {editingBatch ? 'Save Changes' : 'Initialize Batch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assignment Modal */}
      <Dialog open={assignmentModal.isOpen} onOpenChange={(io) => setAssignmentModal(prev => ({...prev, isOpen: io}))}>
        <DialogContent className="rounded-[2.5rem] border-none shadow-2xl p-8 max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">Assign {assignmentModal.student?.full_name}</DialogTitle>
            <DialogDescription className="text-xs font-medium text-slate-500">Choose a session for this student.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
             {batches.map(batch => (
               <Button 
                key={batch.id} 
                variant="outline" 
                className="w-full h-14 rounded-2xl justify-between px-6 border-slate-100 hover:border-primary hover:bg-primary/5 group"
                onClick={() => handleAssignStudent(batch.id)}
               >
                  <div className="flex flex-col items-start gap-0.5">
                    <span className="font-black text-sm text-slate-800">{batch.batch_name}</span>
                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-primary/60 uppercase">Batch</span>
                  </div>
                  <Badge className="bg-slate-100 text-slate-500 group-hover:bg-primary group-hover:text-white transition-colors">{batch.student_count}/{batch.max_students}</Badge>
               </Button>
             ))}
             {batches.length === 0 && (
               <p className="text-center py-6 text-sm text-slate-400 font-medium italic">Create a batch first to assign students.</p>
             )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}