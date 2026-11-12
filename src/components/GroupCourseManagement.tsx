import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Users, Clock, User, 
  Hourglass, Trash2, AlertTriangle, Flame,
  Check, X, Search, Filter, Coins, Award, BookOpen,
  Bell, Sparkles, ArrowUpRight, UserX, GraduationCap,
  Zap, CheckCircle2, MessageCircle, ChevronDown, RefreshCw
} from 'lucide-react';
import { doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatWhatsAppPhone972 } from '../lib/phoneUtils';
import { GroupCourse, CourseStatus, Student, formatCustomDate } from '../types';

interface GroupCourseManagementProps {
  courses: GroupCourse[];
  students: Student[];
  teachers?: any[];
  onAddCourse: (course: Omit<GroupCourse, 'id'>) => void;
  onDeleteCourse: (id: string) => void;
  onUpdateCompletedHours: (courseId: string, hours: number) => void;
  onUpdateCourseDetails?: (courseId: string, updatedFields: Partial<GroupCourse>) => void;
  initialCourseSearch?: string;
}

export const GroupCourseManagement: React.FC<GroupCourseManagementProps> = ({
  courses,
  students,
  teachers = [],
  onAddCourse,
  onDeleteCourse,
  onUpdateCompletedHours,
  onUpdateCourseDetails,
  initialCourseSearch = ''
}) => {
  const [courseSearch, setCourseSearch] = useState(initialCourseSearch || '');

  React.useEffect(() => {
    if (initialCourseSearch !== undefined && initialCourseSearch !== '') {
      setCourseSearch(initialCourseSearch);
    }
  }, [initialCourseSearch]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [placementAlert, setPlacementAlert] = useState<{
    studentName: string;
    studentId: string;
    courseTitle: string;
    courseId: string;
    date: string;
    maxSeats: number;
    currentEnrolled: number;
  } | null>(null);
  const [recentPlacements, setRecentPlacements] = useState<Array<{
    id: string;
    studentName: string;
    courseTitle: string;
    timestamp: string;
  }>>([]);
  const [showPlacementsHistory, setShowPlacementsHistory] = useState(false);
  const [title, setTitle] = useState(''); // اسم الدورة
  const [level, setLevel] = useState(''); // اسم الصف (مثل: العاشر ج، أونلاين مسائي)
  const [instructor, setInstructor] = useState(''); // اسم المعلم
  const [selectedTeacherNames, setSelectedTeacherNames] = useState<string[]>([]);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [totalHours, setTotalHours] = useState<number | string>(40); // الرصيد الساعاتي الكلي
  const [classTime, setClassTime] = useState('');
  const [teacherRate, setTeacherRate] = useState<number | string>(150); // المبلغ المقطوع للمعلم لكل لقاء
  const [studentRate, setStudentRate] = useState<number | string>(1200);   // رسوم كل طالب على كامل الدورة الكلية
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]); // الطلاب المدرجين المقرونين بماركر الإشارة
  const [studentSearch, setStudentSearch] = useState(''); // شريط بحث الطلاب المسرع
  const [classFilter, setClassFilter] = useState('ALL'); // فلترة الطلاب بناءً على مرحلتهم الدراسية / الصف
  const [formError, setFormError] = useState('');
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');

  // Expandable student hours allocation states
  const [expandedStudentsCourseId, setExpandedStudentsCourseId] = useState<string | null>(null);
  const [editingStudentHours, setEditingStudentHours] = useState<{ courseId: string; studentId: string } | null>(null);
  const [tempHoursValue, setTempHoursValue] = useState<string>('');

  // Drag and Drop States
  const [draggedStudentId, setDraggedStudentId] = useState<string | null>(null);
  const [dragOverCourseId, setDragOverCourseId] = useState<string | null>(null);
  const [dragNotification, setDragNotification] = useState<string | null>(null);
  const [dragSearch, setDragSearch] = useState('');
  const [dragGradeFilter, setDragGradeFilter] = useState('ALL');
  const [showDragBoard, setShowDragBoard] = useState(true);

  // Archive and viewing states for finished group courses
  const [courseViewMode, setCourseViewMode] = useState<'active' | 'archived'>('active');

  // Unenrolled / Unassigned Students Hub State
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [unassignedGradeFilter, setUnassignedGradeFilter] = useState('ALL');
  const [unassignedStatusFilter, setUnassignedStatusFilter] = useState<'ALL' | 'NO_TEACHER' | 'HAS_TEACHER'>('ALL');
  const [showUnassignedSection, setShowUnassignedSection] = useState(true);
  const [selectedUnassignedIds, setSelectedUnassignedIds] = useState<string[]>([]);
  const [batchTargetCourseId, setBatchTargetCourseId] = useState('');
  const [directEnrollModalStudent, setDirectEnrollModalStudent] = useState<Student | null>(null);
  const [modalTargetCourseId, setModalTargetCourseId] = useState('');
  const [modalAllocatedHours, setModalAllocatedHours] = useState<number>(10);
  const [isProcessingEnrollment, setIsProcessingEnrollment] = useState(false);
  const [inlineSelectedCourseByStudent, setInlineSelectedCourseByStudent] = useState<Record<string, string>>({});

  // Compute unassigned students: not in any active course's studentIds and not assignedCourseId
  const unenrolledStudents = React.useMemo(() => {
    return students.filter(student => {
      if (student.archived) return false;
      const isInAnyCourse = courses.some(c => {
        const inIds = Array.isArray(c.studentIds) && c.studentIds.includes(student.id);
        const isAssigned = student.assignedCourseId === c.id;
        return inIds || isAssigned;
      });
      return !isInAnyCourse;
    });
  }, [students, courses]);

  // Filtered unassigned students based on search query & filters
  const filteredUnenrolledStudents = React.useMemo(() => {
    return unenrolledStudents.filter(student => {
      const q = unassignedSearch.trim().toLowerCase();
      if (q) {
        const nameMatch = (student.name || '').toLowerCase().includes(q);
        const phoneMatch = (student.phone || '').includes(q);
        const gradeMatch = (student.grade || student.academicLevel || '').toLowerCase().includes(q);
        const notesMatch = (student.notes || '').toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !gradeMatch && !notesMatch) return false;
      }

      if (unassignedGradeFilter !== 'ALL') {
        const grade = student.grade || student.academicLevel || 'غير محدد';
        if (grade !== unassignedGradeFilter) return false;
      }

      const hasTeacher = (student.teachers && student.teachers.length > 0);
      if (unassignedStatusFilter === 'NO_TEACHER' && hasTeacher) return false;
      if (unassignedStatusFilter === 'HAS_TEACHER' && !hasTeacher) return false;

      return true;
    });
  }, [unenrolledStudents, unassignedSearch, unassignedGradeFilter, unassignedStatusFilter]);

  // Open courses with available vacant seats
  const availableOpenCourses = React.useMemo(() => {
    return courses.filter(c => {
      const isFinished = c.status === CourseStatus.Finished || c.completedHours >= c.totalHours;
      const enrolled = c.studentIds?.length || 0;
      const max = c.maxStudents || 15;
      return !isFinished && enrolled < max;
    });
  }, [courses]);

  // Direct Student Enrollment Function (supports single, modal, and batch)
  const handleDirectEnrollStudent = async (studentId: string, courseId: string, customHours: number = 10) => {
    const s = students.find(x => x.id === studentId);
    const c = courses.find(x => x.id === courseId);
    if (!s || !c) {
      alert('تعذر العثور على بيانات الطالب أو الدورة.');
      return;
    }

    const enrolledIds = c.studentIds || [];
    if (enrolledIds.includes(studentId)) {
      setDragNotification(`الطالب ${s.name} منسب بالفعل في هذه الدورة!`);
      setTimeout(() => setDragNotification(null), 4000);
      return;
    }

    const maxSeats = c.maxStudents || 15;
    if (enrolledIds.length >= maxSeats) {
      alert(`⚠️ عذرًا، الدورة "${c.title}" مكتملة الشواغر بالكامل (${maxSeats}/${maxSeats}).`);
      return;
    }

    setIsProcessingEnrollment(true);
    try {
      const currentAllocated = c.studentHoursAllocated || {};
      const updatedAllocated = {
        ...currentAllocated,
        [studentId]: customHours
      };
      const updatedStudentIds = [...enrolledIds, studentId];

      // 1. Update Course details in Firestore & state
      if (onUpdateCourseDetails) {
        onUpdateCourseDetails(courseId, {
          studentIds: updatedStudentIds,
          studentHoursAllocated: updatedAllocated
        });
      } else {
        await setDoc(doc(db, 'groupCourses', courseId), {
          studentIds: updatedStudentIds,
          studentHoursAllocated: updatedAllocated
        }, { merge: true });
      }

      // 2. Update Student document in Firestore
      await setDoc(doc(db, 'students', studentId), {
        assignedCourseId: courseId,
        courseType: 'group'
      }, { merge: true });

      // 3. Link Course Teacher to Student (teachers array + assignments collection)
      const courseTeacher = teachers.find(t => 
        t.id === c.teacherId || 
        t.name === c.instructor || 
        (c.instructor && (t.name || '').toLowerCase().includes(c.instructor.toLowerCase()))
      );

      if (courseTeacher) {
        const currentTeachers = s.teachers || [];
        if (!currentTeachers.includes(courseTeacher.id) && !currentTeachers.includes(courseTeacher.username || '')) {
          const newTeachers = [...currentTeachers, courseTeacher.id];
          await setDoc(doc(db, 'students', studentId), {
            teachers: newTeachers
          }, { merge: true });
        }

        try {
          await addDoc(collection(db, 'assignments'), {
            studentId: s.id,
            studentName: s.name,
            teacherId: courseTeacher.id,
            teacherName: courseTeacher.name,
            courseId: c.id,
            courseTitle: c.title,
            assignedAt: new Date().toISOString(),
            assignedBy: 'manager'
          });
        } catch (err) {
          console.warn('Assignment collection sync notice:', err);
        }
      }

      // 4. Notifications & Alerts
      setPlacementAlert({
        studentName: s.name,
        studentId: s.id,
        courseTitle: c.title,
        courseId: c.id,
        date: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        maxSeats: maxSeats,
        currentEnrolled: updatedStudentIds.length
      });

      setRecentPlacements(prev => [
        {
          id: Math.random().toString(36).substring(2, 9),
          studentName: s.name,
          courseTitle: c.title,
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
        },
        ...prev
      ]);

      // Clear selection & inputs
      setSelectedUnassignedIds(prev => prev.filter(id => id !== studentId));
      setDirectEnrollModalStudent(null);
      setModalTargetCourseId('');
      setInlineSelectedCourseByStudent(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });

      setDragNotification(`🎉 تم بنجاح تنسيب الطالب (${s.name}) إلى دورة: ${c.title}`);
      setTimeout(() => setDragNotification(null), 5000);
    } catch (error) {
      console.error('Failed to enroll student:', error);
      alert('حدث خطأ أثناء حفظ التنسيب. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsProcessingEnrollment(false);
    }
  };

  // Batch Enrollment
  const handleBatchEnroll = async () => {
    if (selectedUnassignedIds.length === 0 || !batchTargetCourseId) {
      alert('يرجى تحديد طالب واحد على الأقل واختيار الدورة الهدف.');
      return;
    }

    const c = courses.find(x => x.id === batchTargetCourseId);
    if (!c) return;

    const enrolledIds = c.studentIds || [];
    const maxSeats = c.maxStudents || 15;
    const remainingSeats = maxSeats - enrolledIds.length;

    if (selectedUnassignedIds.length > remainingSeats) {
      alert(`عذراً، المقاعد الشاغرة في الدورة (${remainingSeats}) أقل من عدد الطلاب المحددين (${selectedUnassignedIds.length}).`);
      return;
    }

    if (!confirm(`هل أنت متأكد من تنسيب ${selectedUnassignedIds.length} طالب إلى دورة "${c.title}" فوراً؟`)) {
      return;
    }

    setIsProcessingEnrollment(true);
    try {
      for (const stId of selectedUnassignedIds) {
        await handleDirectEnrollStudent(stId, batchTargetCourseId, 10);
      }
      setSelectedUnassignedIds([]);
      setBatchTargetCourseId('');
      alert(`تم بنجاح تنسيب كافة الطلاب المحددين إلى دورة "${c.title}".`);
    } catch (err) {
      console.error('Batch enroll error:', err);
    } finally {
      setIsProcessingEnrollment(false);
    }
  };

  // Auto-Alert Modal for near-completion courses (exceeding 90%)
  const [showAutoAlertModal, setShowAutoAlertModal] = useState(false);
  const [hasAutoChecked, setHasAutoChecked] = useState(false);
  const [renewalHours, setRenewalHours] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!hasAutoChecked && courses.length > 0) {
      const nearCompletion = courses.filter(c => {
        const isFinished = c.status === CourseStatus.Finished || c.completedHours >= c.totalHours;
        const progress = (c.completedHours / c.totalHours) * 100;
        return !isFinished && progress >= 90;
      });
      if (nearCompletion.length > 0) {
        setShowAutoAlertModal(true);
      }
      setHasAutoChecked(true);
    }
  }, [courses, hasAutoChecked]);

  const handleRenewCourse = (courseId: string, hoursToAdd: number) => {
    if (onUpdateCourseDetails) {
      const course = courses.find(c => c.id === courseId);
      if (course) {
        const newTotal = course.totalHours + hoursToAdd;
        onUpdateCourseDetails(courseId, { totalHours: newTotal });
        setDragNotification(`🎉 تم بنجاح تجديد الدورة "${course.title}" وإضافة +${hoursToAdd} ساعة (المجموع الجديد: ${newTotal} ساعة)`);
        setTimeout(() => setDragNotification(null), 5000);
      }
    }
  };

  const handleEnrollStudent = (stId: string, coId: string) => {
    handleDirectEnrollStudent(stId, coId, 10);
  };

  // Course completion triggers
  const handleArchiveCourse = (courseId: string) => {
    if (onUpdateCourseDetails) {
      onUpdateCourseDetails(courseId, { status: CourseStatus.Finished });
      const c = courses.find(x => x.id === courseId);
      setDragNotification(`تم أرشفة الدورة (${c?.title || ''}) بنجاح ونقلها للأرشيف.`);
      setTimeout(() => setDragNotification(null), 4000);
    }
  };

  const handleUnarchiveCourse = (courseId: string) => {
    if (onUpdateCourseDetails) {
      onUpdateCourseDetails(courseId, { status: CourseStatus.Active });
      const c = courses.find(x => x.id === courseId);
      setDragNotification(`تم إلغاء الأرشفة وإعادة تنشيط الدورة (${c?.title || ''}) بنجاح.`);
      setTimeout(() => setDragNotification(null), 4000);
    }
  };

  const getEnrolledCount = (courseId: string) => {
    const course = courses.find(c => c.id === courseId);
    if (course && course.studentIds) {
      return course.studentIds.length;
    }
    return students.filter(s => s.assignedCourseId === courseId).length;
  };

  // Get unique classes / grades from students list
  const uniqueClasses = Array.from(
    new Set(students.map(s => s.grade || s.academicLevel).filter(Boolean))
  ) as string[];

  // Filter students based on search query & class dropdown
  const visibleStudents = students.filter(student => {
    const studentClass = student.grade || student.academicLevel || '';
    const matchesClass = classFilter === 'ALL' || studentClass === classFilter;
    const matchesSearch = !studentSearch.trim() || student.name.toLowerCase().includes(studentSearch.toLowerCase());
    return matchesClass && matchesSearch;
  });

  const handleToggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  // Bulk Selection Handlers
  const handleSelectAllVisible = () => {
    const visibleIds = visibleStudents.map(s => s.id);
    setSelectedStudentIds(prev => {
      const merged = new Set([...prev, ...visibleIds]);
      return Array.from(merged);
    });
  };

  const handleDeselectAllVisible = () => {
    const visibleIds = visibleStudents.map(s => s.id);
    setSelectedStudentIds(prev => prev.filter(id => !visibleIds.includes(id)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('الرجاء إدخال اسم الدورة الجماعية');
      return;
    }
    if (!level.trim()) {
      setFormError('الرجاء كتابة اسم الصف (الشعبة الدراسية/الصف المشرك)');
      return;
    }
    if (!instructor.trim()) {
      setFormError('الرجاء اختيار المعلم المشرف على هذه الدورة');
      return;
    }
    if (selectedStudentIds.length === 0) {
      setFormError('الرجاء تحديد طالب واحد على الأقل للمجموعة عبر الإشارة بجانبه بالنقرة');
      return;
    }
    if (totalHours <= 0) {
      setFormError('يرجى تحديد رصيد ساعات معتمد للدورة');
      return;
    }

    // Auto generate a lovely academic group course code
    const generatedCode = `GC-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    onAddCourse({
      code: generatedCode,
      title,
      level, // represents Class Name (اسم الصف)
      instructor,
      maxStudents: selectedStudentIds.length,
      completedHours: 0,
      totalHours: Number(totalHours) || 40,
      status: CourseStatus.Active,
      startDate: new Date().toISOString().split('T')[0],
      classTime: classTime || '04:00 PM - 06:00 PM',
      studentIds: selectedStudentIds,
      studentRate: Number(studentRate) || 0,
      teacherRate: Number(teacherRate) || 0,
      studentBillingType: 'total', // Billing total course fee instead of per meeting
      teacherPayoutType: 'total',  // Payout flat lumpsum for the entire course
      loggedHours: 0
    });

    // Capture the enrolled students and trigger the placement alert popup
    const firstStudentName = students.find(s => s.id === selectedStudentIds[0])?.name || '';
    const studentCount = selectedStudentIds.length;
    const arabicLabel = studentCount === 1 
      ? firstStudentName 
      : studentCount === 2 
        ? `${firstStudentName} وطالب آخر` 
        : `${firstStudentName} و ${studentCount - 1} طلاب آخرين`;

    setPlacementAlert({
      studentName: arabicLabel,
      studentId: selectedStudentIds[0] || '',
      courseTitle: title,
      courseId: generatedCode,
      date: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      maxSeats: studentCount,
      currentEnrolled: studentCount
    });

    setRecentPlacements(prev => [
      {
        id: Math.random().toString(36).substring(2, 9),
        studentName: arabicLabel,
        courseTitle: title,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
      },
      ...prev
    ]);

    // Reset Form
    setTitle('');
    setLevel('');
    setInstructor('');
    setSelectedTeacherNames([]);
    setTeacherSearchQuery('');
    setClassTime('');
    setTeacherRate(150);
    setStudentRate(1200);
    setSelectedStudentIds([]);
    setStudentSearch('');
    setClassFilter('ALL');
    setFormError('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Upper Information Section */}
      <div className="bg-gradient-to-l from-[#1A365D] to-slate-900 border border-slate-700/60 p-6 rounded-3xl text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] bg-[#D4A33C] text-slate-950 font-black tracking-wider uppercase px-3 py-1 rounded-full animate-pulse">
              عمليات مؤتمتة متكاملة
            </span>
            <span className="text-[10px] bg-white/10 text-slate-205 font-semibold px-2 py-0.5 rounded-md">
              بوابة الإدارة والمراقبة المالية
            </span>
          </div>
          <h2 className="text-xl font-black font-sans leading-snug">بوابة تأسيس وإدارة الدورات الجماعية الذكية</h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl font-normal">
            خصم تلقائي منظم ومحكم من الساعات المعتمدة وحسابات الطلاب. يقوم المعلم بتسجيل اللقاء جماعياً ليتم فورياً حسم رصيد اللقاء من حساب كل طالب مدرج وتوريد المستحقات المالية (المبلغ المقطوع) للمعلم.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 self-stretch md:self-auto justify-center">
          {/* Real-time placement alert hub tracker */}
          <button
            type="button"
            onClick={() => setShowPlacementsHistory(true)}
            className="px-5 py-3.5 bg-slate-800 hover:bg-slate-750 text-white border border-slate-705/60 hover:border-slate-600 rounded-2xl font-black text-xs transition-all duration-200 active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer relative"
            title="تعقب وسجل عمليات التنسيب الأخيرة"
          >
            <Bell size={16} className={`${recentPlacements.length > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
            <span>سجل التنسيبات الأكاديمية</span>
            {recentPlacements.length > 0 && (
              <span className="absolute -top-1.5 -left-1.5 bg-emerald-600 border border-emerald-400 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                {recentPlacements.length}
              </span>
            )}
          </button>

          {/* Button to view / jump to unassigned students */}
          <button
            type="button"
            onClick={() => {
              setShowUnassignedSection(true);
              const el = document.getElementById('unassigned-students-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-5 py-3.5 bg-amber-500/10 hover:bg-amber-500/20 text-[#A67C2F] border border-[#D4A33C]/40 hover:border-[#D4A33C] rounded-2xl font-black text-xs transition-all duration-200 active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer relative"
            title="فحص وتنسيب الطلاب غير المرتبطين بأي دورة"
          >
            <UserX size={16} className="text-[#D4A33C]" />
            <span>طلاب غير منسبين ({unenrolledStudents.length})</span>
            {unenrolledStudents.length > 0 && (
              <span className="absolute -top-1.5 -left-1.5 bg-rose-600 border border-rose-400 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                {unenrolledStudents.length}
              </span>
            )}
          </button>

          {/* Button to view all platform students */}
          <button
            onClick={() => setShowStudentsModal(true)}
            className="px-5 py-3.5 bg-slate-800 hover:bg-slate-750 text-white border border-slate-700/60 hover:border-slate-600 rounded-2xl font-black text-xs transition-all duration-200 active:scale-95 shadow-md flex items-center justify-center gap-2 cursor-pointer pb-[14px]"
            title="عرض كافة طلاب المنصة"
          >
            <Users size={16} className="text-[#D4A33C]" />
            <span>كافة طلاب المنصة ({students.length})</span>
          </button>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-6 py-3.5 bg-[#D4A33C] hover:bg-[#bfa232] text-slate-950 rounded-2xl font-black text-xs transition-all duration-200 active:scale-95 shadow-md shadow-[#D4A33C]/20 flex items-center gap-2 cursor-pointer self-stretch md:self-auto justify-center"
          >
            <Plus size={16} />
            <span>تأسيس دورة جماعية جديدة</span>
          </button>
        </div>
      </div>

      {/* Guide widget box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-amber-50/65 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
          <Filter className="text-[#D4A33C] shrink-0 mt-0.5" size={16} />
          <div>
            <h4 className="text-xs font-black text-slate-900">1. تصفية وتحديد الطلاب والصفوف</h4>
            <p className="text-[10px] text-slate-600 mt-1 font-semibold leading-relaxed">
              قم بفرز وتصنيف الطلاب أولاً حسب صفوفهم الدراسية الحالية، لتتمكن من إدراجهم إما فورياً (دفعة واحدة ✔) أو تحديدهم فرادى.
            </p>
          </div>
        </div>

        <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
          <BookOpen className="text-blue-600 shrink-0 mt-0.5" size={16} />
          <div>
            <h4 className="text-xs font-black text-slate-905">2. رصد البيانات والشروط المالية</h4>
            <p className="text-[10px] text-slate-600 mt-1 font-semibold leading-relaxed">
              اكتب اسم الدورة واقرنها باسم الصف المشرف، المعلم المشرف، الرصيد الكلي للساعات، مقطوعية المدرس، وتكلفة لقاء كل طالب.
            </p>
          </div>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3">
          <Coins className="text-emerald-600 shrink-0 mt-0.5" size={16} />
          <div>
            <h4 className="text-xs font-black text-slate-900">3. الصيانة والخصم المالي التلقائي</h4>
            <p className="text-[10px] text-slate-600 mt-1 font-semibold leading-relaxed">
              عندما يسجل المعلم لقاءً، تُخصم الساعات فوراً من رصيد الدورة الكلي، ويُحسب اللقاء وتكلفته من حساب كل طالب وتُرصد مقطوعية اللقاء لصالح محفظة المعلم.
            </p>
          </div>
        </div>
      </div>

      {/* Add New Course Module Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/90 shadow-lg text-right space-y-6"
          >
            <div className="border-b border-slate-100 pb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Plus size={18} className="text-[#D4A33C]" />
                إعداد وتأسيس الدورة الجماعية والنسب المالية
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">تنسيب الطلاب وعقد شروط المقطوعية الإجمالية وتخصيص ساعات المجموعة.</p>
            </div>

            {formError && (
              <div className="bg-rose-50 text-rose-700 text-xs p-4 rounded-2xl flex items-center gap-2 mb-4 border border-rose-100 font-bold">
                <AlertTriangle size={15} className="shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Course Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                    <span>اسم الدورة الجماعية *</span>
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: دورة الرياضيات التمهيدية للبجروت"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#D4A33C] focus:bg-white transition-all text-right font-bold text-slate-900 shadow-sm"
                    required
                  />
                </div>

                {/* Class Name (اسم الصف) Dropdown scale */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-[#1A365D] flex items-center gap-1">
                    <span>اختر من سلم الصفوف الدراسيَّة *</span>
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full text-xs py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#D4A33C] focus:bg-white transition-all text-right font-bold text-slate-900 shadow-sm"
                    required
                  >
                    <option value="">-- اختر الصف الدراسي --</option>
                    <optgroup label="مرحلة الطفولة المبكرة">
                      <option value="روضة (جيل 3 - 4 سنوات)">روضة (جيل 3 - 4 سنوات)</option>
                      <option value="بستان / تمهيدي (جيل 5 - 6 سنوات)">بستان / تمهيدي (جيل 5 - 6 سنوات)</option>
                    </optgroup>
                    <optgroup label="المرحلة الابتدائية">
                      <option value="الصف الأول الابتدائي">الصف الأول الابتدائي</option>
                      <option value="الصف الثاني الابتدائي">الصف الثاني الابتدائي</option>
                      <option value="الصف الثالث الابتدائي">الصف الثالث الابتدائي</option>
                      <option value="الصف الرابع الابتدائي">الصف الرابع الابتدائي</option>
                      <option value="الصف الخامس الابتدائي">الصف الخامس الابتدائي</option>
                      <option value="الصف السادس الابتدائي">الصف السادس الابتدائي</option>
                    </optgroup>
                    <optgroup label="المرحلة الإعدادية">
                      <option value="الصف السابع الإعدادي">الصف السابع الإعدادي</option>
                      <option value="الصف الثامن الإعدادي">الصف الثامن الإعدادي</option>
                      <option value="الصف التاسع الإعدادي">الصف التاسع الإعدادي</option>
                    </optgroup>
                    <optgroup label="المرحلة الثانوية والبجروت">
                      <option value="الصف العاشر">الصف العاشر</option>
                      <option value="الصف الحادي عشر - مسار البجروت">الصف الحادي عشر - مسار البجروت</option>
                      <option value="الصف الحادي عشر - تخصص علمي (4/5 وحدات)">الصف الحادي عشر - تخصص علمي (4/5 وحدات)</option>
                      <option value="الصف الحادي عشر - تخصص أدبي / إنساني">الصف الحادي عشر - تخصص أدبي / إنساني</option>
                      <option value="الصف الثاني عشر - مسار البجروت">الصف الثاني عشر - مسار البجروت</option>
                      <option value="الصف الثاني عشر - تخصص علمي (4/5 وحدات)">الصف الثاني عشر - تخصص علمي (4/5 وحدات)</option>
                      <option value="الصف الثاني عشر - تخصص أدبي / إنساني">الصف الثاني عشر - تخصص أدبي / إنساني</option>
                    </optgroup>
                    <optgroup label="مسارات تقوية وتأهيل مخصصة">
                      <option value="دورة تحضيرية للبجروت (بكافة الوحدات)">دورة تحضيرية للبجروت (بكافة الوحدات)</option>
                      <option value="دورة بسيخومتري / ياعيل">دورة بسيخومتري / ياعيل</option>
                      <option value="تعليم أكاديمي / جامعي">تعليم أكاديمي / جامعي</option>
                      <option value="تقوية لغة عبرية (محادثة وكتابة)">تقوية لغة عبرية (محادثة وكتابة)</option>
                    </optgroup>
                  </select>
                </div>

                {/* Instructor name (Multi-selection via checkboxes with search filter) */}
                <div className="flex flex-col gap-1.5 md:col-span-3">
                  <label className="text-xs font-extrabold text-[#1A365D] flex items-center gap-1.5">
                    <span>اختر المعلم (معلم واحد أو أكثر بشكل جماعي وسريع) *</span>
                    <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">تنسيب سريع بجانب الاسم ✔</span>
                  </label>
                  
                  {/* Search Filter for Teachers */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                    <div className="md:col-span-1 space-y-1.5">
                      <span className="text-[10px] font-black text-slate-500">البحث وتصفية المعلمين:</span>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="ابحث عن معلم..."
                          value={teacherSearchQuery}
                          onChange={e => setTeacherSearchQuery(e.target.value)}
                          className="w-full text-xs py-2 pr-8 pl-3 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#D4A33C] text-right font-bold"
                        />
                        <Search className="absolute right-2.5 top-2.5 text-slate-400" size={12} />
                      </div>

                      {selectedTeacherNames.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTeacherNames([]);
                            setInstructor('');
                          }}
                          className="text-[9px] font-black text-rose-600 hover:underline flex items-center gap-0.5 mt-2 cursor-pointer bg-transparent border-0"
                        >
                          <X size={10} />
                          <span>إلغاء تحديد الكل ({selectedTeacherNames.length})</span>
                        </button>
                      )}
                    </div>

                    <div className="md:col-span-3">
                      <span className="text-[11px] font-black text-slate-500 block mb-1.5">انقر لوضع علامة (✔) للتنسيب الجماعي:</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                        {(teachers.length > 0 ? teachers : [
                          { id: 't1', name: 'أ. سهام رأفت', subjects: ['رياضيات'] },
                          { id: 't2', name: 'أ. ماجد فوزي', subjects: ['فيزياء'] },
                          { id: 't3', name: 'د. أمجد صالح', subjects: ['كيمياء'] }
                        ])
                          .filter(t => {
                            const q = teacherSearchQuery.trim().toLowerCase();
                            if (!q) return true;
                            return t.name.toLowerCase().includes(q) || 
                                   (t.subjects && t.subjects.some((sub: string) => sub.toLowerCase().includes(q)));
                          })
                          .map(t => {
                            const isChecked = selectedTeacherNames.includes(t.name);
                            return (
                              <div
                                key={t.id}
                                onClick={() => {
                                  let nextNames: string[];
                                  if (isChecked) {
                                    nextNames = selectedTeacherNames.filter(n => n !== t.name);
                                  } else {
                                    nextNames = [...selectedTeacherNames, t.name];
                                  }
                                  setSelectedTeacherNames(nextNames);
                                  setInstructor(nextNames.join('، '));
                                }}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                                  isChecked
                                    ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/20'
                                    : 'bg-white border-slate-200 hover:border-slate-350 hover:bg-slate-50/50'
                                }`}
                              >
                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                                  isChecked
                                    ? 'bg-[#D4A33C] border-[#D4A33C] text-slate-950'
                                    : 'border-slate-300 bg-slate-50'
                                }`}>
                                  {isChecked && <Check size={10} className="stroke-[3]" />}
                                </div>
                                <div className="text-right min-w-0">
                                  <p className="text-[11px] font-black text-slate-800 truncate">{t.name}</p>
                                  {t.subjects && t.subjects.length > 0 && (
                                    <p className="text-[9px] text-slate-400 font-bold truncate">{t.subjects.join('، ')}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        }
                      </div>
                    </div>
                  </div>

                  {/* Selected indicator badges row */}
                  {selectedTeacherNames.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                      <span className="text-[10px] font-black text-slate-500 mt-1">المعلمون المنسوبون حالياً:</span>
                      {selectedTeacherNames.map(name => (
                        <span key={name} className="inline-flex items-center gap-1 bg-slate-900 text-white text-[10px] font-black px-2.5 py-1 rounded-lg font-sans">
                          <span>{name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const nextNames = selectedTeacherNames.filter(n => n !== name);
                              setSelectedTeacherNames(nextNames);
                              setInstructor(nextNames.join('، '));
                            }}
                            className="hover:text-rose-400 text-slate-300 font-bold text-[11px] pr-0.5 cursor-pointer bg-transparent border-0"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Total pool Hours */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-slate-700">رصيد الساعات الكلي الممنوح للدورة *</label>
                  <input
                    type="number"
                    placeholder="40"
                    value={totalHours}
                    onChange={(e) => setTotalHours(e.target.value)}
                    className="w-full text-xs py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#D4A33C] focus:bg-white text-center font-mono font-black text-slate-900 shadow-sm"
                    required
                  />
                </div>

                {/* Teacher Flat rate representation */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-[#1A365D] flex items-center gap-1.5">
                    <Coins size={14} className="text-[#D4A33C]" />
                    <span>مقطوعية المعلم الثابتة (تكلفة الحصة الكلية للمعلم) *</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute right-4 text-xs font-bold text-slate-500">₪</span>
                    <input
                      type="number"
                      placeholder="5000"
                      value={teacherRate}
                      onChange={(e) => setTeacherRate(e.target.value)}
                      className="w-full text-xs py-3 pr-9 pl-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#D4A33C] focus:bg-white font-mono text-center font-black text-slate-900 shadow-sm"
                      required
                    />
                  </div>
                </div>

                {/* Student lesson cost representation */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-extrabold text-teal-950 flex items-center gap-1.5">
                    <Coins size={14} className="text-teal-600" />
                    <span>رسوم اشتراك الطلاب (المبالغ المحسومة من رصيد الطلاب) *</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute right-4 text-xs font-bold text-slate-500">₪</span>
                    <input
                      type="number"
                      placeholder="1200"
                      value={studentRate}
                      onChange={(e) => setStudentRate(e.target.value)}
                      className="w-full text-xs py-3 pr-9 pl-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#D4A33C] focus:bg-white font-mono text-center font-black text-slate-900 shadow-sm"
                      required
                    />
                  </div>
                </div>

                {/* Timing */}
                <div className="flex flex-col gap-1.5 md:col-span-3">
                  <label className="text-xs font-extrabold text-slate-700">توقيت الحصص ومواعيد الانعقاد بالأسبوع (اختياري)</label>
                  <input
                    type="text"
                    placeholder="مثال: الأحد والثلاثاء (04:00 PM - 06:00 PM)"
                    value={classTime}
                    onChange={(e) => setClassTime(e.target.value)}
                    className="w-full text-xs py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#D4A33C] focus:bg-white transition-all text-right font-medium text-slate-800 shadow-sm"
                  />
                </div>
              </div>

              {/* Student checkmarker selector list with Class Grade filtering & Select All */}
              <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/60 space-y-4">
                
                {/* Header controls of student picker */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#D4A33C]/10 text-[#D4A33C] font-black text-[10px] px-3 py-1 rounded-full border border-[#D4A33C]/20">
                        {selectedStudentIds.length} طلاب مسجلين بالدورة
                      </span>
                      <h4 className="text-xs font-black text-slate-800">إدراج وتحديد الطلاب المدرجين للدورة الجماعية</h4>
                    </div>
                    <p className="text-[10px] text-slate-400 font-semibold">بناءً على طلبك، يمكنك فلترة الطلاب حسب صفوفهم وتحديدهم فرادى أو دفعة واحدة بنقرة.</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Class/Grade filter dropdown */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-black text-slate-500 whitespace-nowrap">فرز حسب الصف:</span>
                      <select
                        value={classFilter}
                        onChange={(e) => setClassFilter(e.target.value)}
                        className="text-xs py-1.5 px-3 bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-[#D4A33C] font-bold text-slate-700 outline-none"
                      >
                        <option value="ALL">جميع الصفوف الدراسيّة ({students.length})</option>
                        {uniqueClasses.map((cl, idx) => (
                          <option key={idx} value={cl}>
                            طلاب {cl} ({students.filter(s => (s.grade || s.academicLevel) === cl).length} طالب)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quick filter by Student Search */}
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="ابحث عن اسم طالب..."
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        className="text-xs py-1.5 pr-8 pl-3 rounded-lg border border-slate-200 outline-none focus:border-[#D4A33C] w-48 text-right font-medium bg-white"
                      />
                      <Search className="absolute right-2.5 top-2 text-slate-400" size={13} />
                    </div>
                  </div>
                </div>

                {/* Bulk Select Toggles bar */}
                <div className="flex items-center justify-between bg-slate-100 rounded-xl p-2.5 px-4 font-black text-xs text-slate-700">
                  <div className="flex items-center gap-1 text-[11px]">
                    <span>معايير إدراج طلاب تصفية الصف الحالي:</span>
                    <strong className="text-indigo-900 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-md font-mono text-[10px]">
                      {visibleStudents.length} طالب
                    </strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllVisible}
                      className="px-3 py-1.5 bg-[#D4A33C]/10 text-[#D4A33C] hover:bg-[#D4A33C] hover:text-slate-950 border border-[#D4A33C]/20 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <Check size={12} />
                      <span>تحديد الكل ✔ (لهذا الصف)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDeselectAllVisible}
                      className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-100 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <X size={12} />
                      <span>إلغاء تحديد الكل ✖</span>
                    </button>
                  </div>
                </div>

                 {/* Dynamic selected indicator of individual student items */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-56 overflow-y-auto pr-1">
                  {visibleStudents.map(student => {
                    const isChecked = selectedStudentIds.includes(student.id);
                    const matchedCount = student.assignedCourseIds?.length || 0;
                    const isOtherAssigned = matchedCount > 0;
                    return (
                      <div
                        key={student.id}
                        onClick={() => handleToggleStudentSelection(student.id)}
                        className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer select-none transition-all duration-150 ${
                          isChecked
                            ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                            : 'bg-white border-slate-200/80 hover:border-slate-350 hover:bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                            isChecked 
                              ? 'bg-[#D4A33C] border-[#D4A33C] text-slate-950' 
                              : 'border-slate-300 bg-slate-50'
                          }`}>
                            {isChecked && <Check size={12} className="stroke-[3]" />}
                          </div>
                          
                          <div className="text-right">
                            <p className="text-xs font-black text-slate-800">{student.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                              {student.grade || student.academicLevel || 'لم يحدد صف الدراسي'}
                            </p>
                          </div>
                        </div>

                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          isOtherAssigned 
                            ? 'bg-amber-50 text-amber-800 border border-amber-100' 
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                        }`}>
                          {isOtherAssigned ? `نشط بـ (${matchedCount}) دورة` : 'متاح للتسجيل'}
                        </span>
                      </div>
                    );
                  })}
                  
                  {visibleStudents.length === 0 && (
                    <div className="text-center py-10 col-span-1 md:col-span-3 text-slate-450 text-xs font-bold bg-white border border-slate-150 rounded-2xl">
                      لا يوجد طلاب ينطبق عليهم فلتر البحث لفرز الصف المذكور
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 border-t border-slate-150 pt-5">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-5 py-2.5 text-slate-500 border border-slate-200 hover:bg-slate-100 text-xs font-black rounded-xl transition-all cursor-pointer"
                >
                  إلغاء العملية
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#1A365D] border border-blue-950 text-white hover:bg-indigo-900 text-xs font-black rounded-xl transition-all shadow-md cursor-pointer"
                >
                  حفظ وتأسيس الدورة الجماعية وتفعيل الحصص
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* DEDICATED MANAGER HUB: UNASSIGNED STUDENTS (الطلاب غير المرتبطين بأي دورة) */}
      {/* ======================================================== */}
      <div 
        id="unassigned-students-section"
        className="bg-white rounded-3xl border-2 border-amber-500/30 p-6 mb-6 shadow-sm text-right relative overflow-hidden transition-all duration-300"
        dir="rtl"
      >
        {/* Accent indicator stripe */}
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-l from-amber-500 via-[#D4A33C] to-indigo-600" />

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-[#A67C2F] flex items-center justify-center font-bold">
                <UserX size={18} />
              </div>
              <h3 className="text-base font-black text-[#1A365D] flex items-center gap-2">
                <span>مركز فحص وتنسيب الطلاب غير المرتبطين بأي دورة</span>
                <span className="text-xs bg-rose-500/10 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full font-bold">
                  {unenrolledStudents.length} غير منسبين
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              واجهة مخصصة للمدير للبحث الفوري عن الطلاب غير المدرجين في أي دورة جماعية (مثل: <strong>سيف الدين الزرو</strong>) وعرض خيار مباشر لتنسيبهم في الدورات المتاحة فوراً.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              type="button"
              onClick={() => setShowUnassignedSection(!showUnassignedSection)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>{showUnassignedSection ? 'طي اللوحة' : 'عرض اللوحة'}</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${showUnassignedSection ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {showUnassignedSection && (
          <div className="space-y-5 mt-5">
            {/* Search & Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search input with dedicated placeholder mentioning Saif Al-Din */}
              <div className="relative col-span-1 sm:col-span-2">
                <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم، رقم الهاتف أو المرحلة (مثال: سيف الدين الزرو)..."
                  value={unassignedSearch}
                  onChange={e => setUnassignedSearch(e.target.value)}
                  className="w-full pr-10 pl-9 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#D4A33C] focus:bg-white transition-all shadow-inner text-right"
                />
                {unassignedSearch && (
                  <button
                    type="button"
                    onClick={() => setUnassignedSearch('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    title="مسح البحث"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Grade Filter */}
              <div>
                <select
                  value={unassignedGradeFilter}
                  onChange={e => setUnassignedGradeFilter(e.target.value)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#D4A33C] focus:bg-white text-right"
                >
                  <option value="ALL">كل المراحل والصفوف الدراسية</option>
                  {uniqueClasses.map(grade => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>

              {/* Teacher status filter */}
              <div>
                <select
                  value={unassignedStatusFilter}
                  onChange={e => setUnassignedStatusFilter(e.target.value as any)}
                  className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:outline-none focus:border-[#D4A33C] focus:bg-white text-right"
                >
                  <option value="ALL">كل الطلاب غير المنسبين لدورات ({unenrolledStudents.length})</option>
                  <option value="NO_TEACHER">بلا معلم وبلا دورة إطلاقاً ({unenrolledStudents.filter(s => !s.teachers || s.teachers.length === 0).length})</option>
                  <option value="HAS_TEACHER">لديهم معلم فردي فقط ({unenrolledStudents.filter(s => s.teachers && s.teachers.length > 0).length})</option>
                </select>
              </div>
            </div>

            {/* Quick Action Chips / Shortcuts */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
              <span className="text-[11px] font-black text-slate-400">اختصارات بحث سريعة:</span>
              
              {/* Quick shortcut for Saif Al-Din Al-Zaro */}
              <button
                type="button"
                onClick={() => setUnassignedSearch('سيف الدين الزرو')}
                className={`text-[11px] px-3 py-1 rounded-xl font-bold border transition-all cursor-pointer ${
                  unassignedSearch.includes('سيف الدين')
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                    : 'bg-amber-50 text-[#A67C2F] border-amber-200 hover:bg-amber-100'
                }`}
              >
                ⚡ سيف الدين الزرو
              </button>

              {/* Quick Grade Chips */}
              {uniqueClasses.slice(0, 5).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setUnassignedGradeFilter(unassignedGradeFilter === g ? 'ALL' : g)}
                  className={`text-[10px] px-2.5 py-1 rounded-xl font-bold border transition-all cursor-pointer ${
                    unassignedGradeFilter === g
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  {g}
                </button>
              ))}

              {(unassignedSearch || unassignedGradeFilter !== 'ALL' || unassignedStatusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setUnassignedSearch('');
                    setUnassignedGradeFilter('ALL');
                    setUnassignedStatusFilter('ALL');
                  }}
                  className="text-[10px] px-2.5 py-1 text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition-all border border-rose-200 mr-auto cursor-pointer"
                >
                  إعادة ضبط الفلاتر ↺
                </button>
              )}
            </div>

            {/* Batch Enrollment Bar (if students are selected) */}
            {selectedUnassignedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-indigo-900 text-white p-4 rounded-2xl border border-indigo-700 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-400" />
                  <span className="text-xs font-black">
                    تم تحديد <span className="text-amber-300 text-sm font-mono font-black">{selectedUnassignedIds.length}</span> طالب للتنسيب الجماعي
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    value={batchTargetCourseId}
                    onChange={e => setBatchTargetCourseId(e.target.value)}
                    className="flex-1 sm:w-64 py-2 px-3 bg-indigo-950 border border-indigo-600 text-white rounded-xl text-xs font-bold text-right"
                  >
                    <option value="">-- اختر الدورة للتنسيب الجماعي --</option>
                    {availableOpenCourses.map(c => {
                      const enrolled = c.studentIds?.length || 0;
                      const max = c.maxStudents || 15;
                      const vacant = max - enrolled;
                      return (
                        <option key={c.id} value={c.id} disabled={vacant < selectedUnassignedIds.length}>
                          {c.title} ({c.instructor || 'بدون معلم'}) - شاغر: {vacant} مقاعد {vacant < selectedUnassignedIds.length ? '(لا تكفي)' : ''}
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="button"
                    onClick={handleBatchEnroll}
                    disabled={!batchTargetCourseId || isProcessingEnrollment}
                    className="px-4 py-2 bg-[#D4A33C] hover:bg-amber-400 disabled:opacity-50 text-slate-950 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                  >
                    <Zap size={14} />
                    <span>تنسيب الكل دفعة واحدة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedUnassignedIds([])}
                    className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </motion.div>
            )}

            {/* Students List / Cards Grid */}
            <div className="space-y-3">
              {filteredUnenrolledStudents.length === 0 ? (
                <div className="py-12 px-4 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 space-y-2">
                  <UserX size={32} className="mx-auto opacity-40 text-slate-400" />
                  <p className="text-xs font-black text-slate-600">
                    لم يتم العثور على طلاب غير منسبين يطابقون معايير البحث الحالية.
                  </p>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    جرب كتابة جزء من اسم الطالب (مثل: "سيف" أو "الزرو") أو اختر "كل المراحل والصفوف".
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 max-h-[520px] overflow-y-auto p-1">
                  {filteredUnenrolledStudents.map(student => {
                    const isSelected = selectedUnassignedIds.includes(student.id);
                    const studentClass = student.grade || student.academicLevel || 'غير محدد';
                    const selectedCourseForThis = inlineSelectedCourseByStudent[student.id] || '';
                    const assignedTeacher = teachers.find(t => 
                      student.teachers && (student.teachers.includes(t.id) || student.teachers.includes(t.username))
                    );

                    return (
                      <div
                        key={student.id}
                        className={`p-4 rounded-2xl border transition-all duration-200 relative flex flex-col justify-between gap-3 bg-white shadow-xs hover:shadow-md ${
                          isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20' : 'border-slate-200 hover:border-[#D4A33C]/60'
                        }`}
                      >
                        {/* Top: Checkbox, Name, Grade */}
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedUnassignedIds(prev =>
                                  prev.includes(student.id) ? prev.filter(id => id !== student.id) : [...prev, student.id]
                                );
                              }}
                              className="mt-1 w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                              title="تحديد الطالب للتنسيب الجماعي"
                            />
                            <div>
                              <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                                <span>{student.name}</span>
                                {student.name.includes('سيف الدين') && (
                                  <span className="text-[9px] bg-amber-500/20 text-[#A67C2F] px-1.5 py-0.5 rounded font-black">
                                    طالب مطلوب
                                  </span>
                                )}
                              </h4>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] font-semibold text-slate-500">
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                                  {studentClass}
                                </span>
                                {student.gender && (
                                  <span className="text-slate-400 font-normal">
                                    ({student.gender === 'Male' ? 'ذكر' : 'أنثى'})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-left shrink-0">
                            <span className="text-[10px] bg-rose-50 text-rose-700 border border-rose-200/80 px-2 py-0.5 rounded-lg font-black inline-block">
                              غير مرتبط بدورة
                            </span>
                          </div>
                        </div>

                        {/* Middle: Phone & Teacher affiliation */}
                        <div className="text-[11px] space-y-1 bg-slate-50/80 p-2.5 rounded-xl border border-slate-150">
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="text-[10px] text-slate-400 font-bold">حالة المعلم:</span>
                            {assignedTeacher ? (
                              <span className="font-bold text-indigo-700 flex items-center gap-1">
                                <User size={12} />
                                <span>معلم فردي: {assignedTeacher.name}</span>
                              </span>
                            ) : (
                              <span className="font-bold text-amber-700">بدون معلم حالياً</span>
                            )}
                          </div>

                          {student.phone && (
                            <div className="flex items-center justify-between text-slate-600">
                              <span className="text-[10px] text-slate-400 font-bold">الهاتف:</span>
                              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                                <span>{student.phone}</span>
                                <a
                                  href={`https://wa.me/${formatWhatsAppPhone972(student.phone).replace('+', '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-600 hover:text-emerald-700"
                                  title="محادثة واتساب"
                                >
                                  <MessageCircle size={13} />
                                </a>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Bottom: Direct 1-Click Course Placement Control */}
                        <div className="space-y-2 pt-1 border-t border-slate-100">
                          <label className="text-[10px] font-black text-[#1A365D] block">
                            تنسيب فوري في دورة متاحة:
                          </label>

                          <div className="flex items-center gap-1.5">
                            <select
                              value={selectedCourseForThis}
                              onChange={e => {
                                const val = e.target.value;
                                setInlineSelectedCourseByStudent(prev => ({
                                  ...prev,
                                  [student.id]: val
                                }));
                              }}
                              className="flex-1 py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800 focus:outline-none focus:border-[#D4A33C] text-right"
                            >
                              <option value="">-- اختر دورة للتنسيب الفوري --</option>
                              {availableOpenCourses.map(c => {
                                const enrolled = c.studentIds?.length || 0;
                                const max = c.maxStudents || 15;
                                const vacant = max - enrolled;
                                return (
                                  <option key={c.id} value={c.id}>
                                    {c.title} ({c.instructor || 'بدون معلم'}) - شاغر: {vacant}
                                  </option>
                                );
                              })}
                            </select>

                            <button
                              type="button"
                              onClick={() => {
                                if (selectedCourseForThis) {
                                  handleDirectEnrollStudent(student.id, selectedCourseForThis, 10);
                                }
                              }}
                              disabled={!selectedCourseForThis || isProcessingEnrollment}
                              className="px-3 py-1.5 bg-[#D4A33C] hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 rounded-xl text-[11px] font-black transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                              title="تنسيب الطالب فوراً في هذه الدورة"
                            >
                              <Zap size={12} />
                              <span>تنسيب ⚡</span>
                            </button>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setDirectEnrollModalStudent(student);
                                setModalTargetCourseId('');
                                setModalAllocatedHours(10);
                              }}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-black flex items-center gap-1 hover:underline cursor-pointer"
                            >
                              <GraduationCap size={12} />
                              <span>تنسيب متقدم ومطابقة المقررات...</span>
                            </button>

                            <span className="text-[9px] text-slate-400 font-bold">
                              {availableOpenCourses.length} دورات شاغرة
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Drag & Drop Student Assignment Board */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 mb-6 space-y-4 text-right shadow-sm relative overflow-hidden" dir="rtl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-rose-50/15 pb-3">
          <div className="space-y-0.5">
            <h4 className="text-sm font-black text-[#1A365D] flex items-center gap-1.5">
              <Users size={16} className="text-[#D4A33C]" />
              لوحة السحب والإفلات الذكية لتنسيب الطلاب للدورات الجماعية 💡
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              اسحب بطاقة أي طالب من اللوحة بالأسفل وأفلتها فوق الدورة الجماعية الهدف لتنسيبه إليها تلقائياً!
            </p>
          </div>
          
          <button 
            type="button"
            onClick={() => setShowDragBoard(!showDragBoard)}
            className="text-xs font-black text-[#D4A33C] hover:underline"
          >
            {showDragBoard ? 'إخفاء لوحة الطلاب ▲' : 'عرض لوحة الطلاب وتنسيبهم ▼'}
          </button>
        </div>

        {/* Real-time dragging notifications to guide user */}
        <AnimatePresence>
          {dragNotification && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-slate-900 text-xs font-extrabold text-right"
            >
              {dragNotification}
            </motion.div>
          )}
        </AnimatePresence>

        {showDragBoard && (
          <div className="space-y-4 animate-fadeIn">
            {/* Board Filters */}
            <div className="flex flex-col sm:flex-row gap-2 items-center">
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="ابحث عن اسم طالب للسحب..."
                  value={dragSearch}
                  onChange={e => setDragSearch(e.target.value)}
                  className="w-full text-xs pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-[#D4A33C] focus:bg-white transition-all text-right"
                />
              </div>

              <select
                value={dragGradeFilter}
                onChange={e => setDragGradeFilter(e.target.value)}
                className="w-full sm:w-44 text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-[#D4A33C] focus:bg-white text-right"
              >
                <option value="ALL">كل المراحل الدراسية</option>
                {uniqueClasses.map(grade => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>

            {/* Draggable Chips Bank Grid */}
            <div className="flex flex-wrap gap-2.5 max-h-48 overflow-y-auto p-3 bg-slate-50/50 rounded-2xl border border-slate-150 shadow-inner">
              {students
                .filter(student => {
                  const studentClass = student.grade || student.academicLevel || '';
                  const matchesGrade = dragGradeFilter === 'ALL' || studentClass === dragGradeFilter;
                  const matchesSearch = !dragSearch.trim() || student.name.toLowerCase().includes(dragSearch.toLowerCase());
                  return matchesGrade && matchesSearch;
                })
                .map(student => (
                  <div
                    key={student.id}
                    draggable="true"
                    onDragStart={(e) => {
                      setDraggedStudentId(student.id);
                      e.dataTransfer.setData('text/plain', student.id);
                    }}
                    onDragEnd={() => {
                      setDraggedStudentId(null);
                    }}
                    className={`px-3 py-2 bg-white hover:bg-[#D4A33C]/10 border rounded-xl flex items-center gap-2 cursor-grab active:cursor-grabbing hover:scale-102 hover:border-[#D4A33C] transition-all duration-155 select-none text-[11px] font-black group shadow-sm ${
                      draggedStudentId === student.id ? 'opacity-45 border-dashed border-[#D4A33C]' : 'border-slate-200'
                    }`}
                    title="انقر مع السحب لتنسب الطالب"
                  >
                    <div className="w-1.5 h-3 flex flex-wrap gap-0.5 justify-center opacity-40 group-hover:opacity-100 transition-opacity">
                      <div className="w-0.5 h-0.5 bg-slate-500 rounded-full" />
                      <div className="w-0.5 h-0.5 bg-slate-500 rounded-full" />
                      <div className="w-0.5 h-0.5 bg-slate-500 rounded-full" />
                      <div className="w-0.5 h-0.5 bg-slate-500 rounded-full" />
                    </div>
                    
                    <span className="text-slate-800">{student.name}</span>
                    <span className="text-[9px] text-[#A67C2F] bg-amber-550/10 rounded-md px-1.5 py-0.2 font-bold select-none">{student.grade || student.academicLevel || 'غير محدد'}</span>
                  </div>
                ))}

              {students.filter(student => {
                const studentClass = student.grade || student.academicLevel || '';
                const matchesGrade = dragGradeFilter === 'ALL' || studentClass === dragGradeFilter;
                const matchesSearch = !dragSearch.trim() || student.name.toLowerCase().includes(dragSearch.toLowerCase());
                return matchesGrade && matchesSearch;
              }).length === 0 && (
                <div className="w-full text-center py-6 text-slate-400 text-xs font-bold">
                  لا يوجد طلاب متاحة للسحب والفرز بالبحث المدخل.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Global Alert for courses near completion (exceeded 90% of hours) */}
      <AnimatePresence>
        {courses.some(c => {
          const isFinished = c.status === CourseStatus.Finished || c.completedHours >= c.totalHours;
          const progress = (c.completedHours / c.totalHours) * 100;
          return !isFinished && progress >= 90;
        }) && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-gradient-to-l from-rose-50 to-amber-50 border border-rose-200/80 rounded-3xl p-5 shadow-sm text-right space-y-3.5 relative">
              <div className="absolute top-4 left-4 w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 animate-pulse hidden md:flex">
                <AlertTriangle size={24} />
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 animate-pulse shrink-0">
                  <Flame size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-rose-900 font-sans">
                    تنبيه إداري عاجل: دورات جماعية أوشكت ساعاتُها على الاستنفاد! (تجاوزت 90%)
                  </h3>
                  <p className="text-[10px] text-rose-700 font-semibold mt-0.5">
                    تلقائياً من النظام: يرجى اتخاذ الإجراءات اللازمة لجدولة أو تجديد عقود الساعات لضمان استمرارية العملية التعليمية.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {courses
                  .filter(c => {
                    const isFinished = c.status === CourseStatus.Finished || c.completedHours >= c.totalHours;
                    const progress = (c.completedHours / c.totalHours) * 100;
                    return !isFinished && progress >= 90;
                  })
                  .map(c => {
                    const progress = Math.min(100, Math.round((c.completedHours / c.totalHours) * 100));
                    return (
                      <div
                        key={c.id}
                        className="p-3 bg-white/80 border border-rose-150 rounded-2xl flex items-center justify-between gap-4 shadow-sm"
                      >
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-slate-900">{c.title}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                            <span>المعلم: {c.instructor}</span>
                            <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                            <span>الصف: {c.level}</span>
                          </div>
                        </div>
                        <div className="text-left shrink-0">
                          <span className="text-xs font-mono font-black text-rose-600 block">
                            {progress}%
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                            {c.completedHours}/{c.totalHours} ساعة
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab filter for Active / Archived/Ended courses */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-3xl border border-slate-200 mb-6 gap-3" dir="rtl">
        <div className="flex items-center gap-2 font-black text-right">
          <BookOpen className="text-[#D4A33C]" size={18} />
          <div>
            <h3 className="text-xs font-black text-[#1A365D]">
              معاينة وتصفية الدورات الدراسية العامة والمنتهية
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              قم بالتبديل بين الدورات المستمرة أو مراجعة الحصيلة الأرشيفية
            </p>
          </div>
        </div>
        <div className="flex gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200/60 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setCourseViewMode('active')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
              courseViewMode === 'active'
                ? 'bg-slate-900 text-[#D4A33C] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            الدورات النشطة والجارية ({courses.filter(course => !(course.status === CourseStatus.Finished || course.completedHours >= course.totalHours)).length})
          </button>
          <button
            type="button"
            onClick={() => setCourseViewMode('archived')}
            className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${
              courseViewMode === 'archived'
                ? 'bg-slate-900 text-[#D4A33C] shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            الأرشيف والدورات المنتهية ({courses.filter(course => (course.status === CourseStatus.Finished || course.completedHours >= course.totalHours)).length})
          </button>
        </div>

        {/* Course Search Box */}
        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={courseSearch}
            onChange={(e) => setCourseSearch(e.target.value)}
            placeholder="بحث في الدورات الجماعية..."
            className="w-full pr-9 pl-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
          />
          {courseSearch && (
            <button
              type="button"
              onClick={() => setCourseSearch('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              title="مسح البحث"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Grid of Group Courses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {courses
          .filter(course => {
            const isFinished = course.status === CourseStatus.Finished || course.completedHours >= course.totalHours;
            const matchesMode = courseViewMode === 'active' ? !isFinished : isFinished;
            if (!matchesMode) return false;

            if (courseSearch.trim()) {
              const q = courseSearch.trim().toLowerCase();
              const titleMatch = (course.title || course.name || '').toLowerCase().includes(q);
              const instructorMatch = (course.instructor || '').toLowerCase().includes(q);
              const levelMatch = (course.level || '').toLowerCase().includes(q);
              const codeMatch = (course.code || '').toLowerCase().includes(q);
              return titleMatch || instructorMatch || levelMatch || codeMatch;
            }
            return true;
          })
          .map(course => {
          const enrolled = getEnrolledCount(course.id);
          const progressPercent = Math.min(100, Math.round((course.completedHours / course.totalHours) * 100));
          const isNearCompletion = progressPercent >= 90;
          const remainingHours = Math.max(0, course.totalHours - course.completedHours);

          return (
            <div
              key={course.id}
              id={`course-card-${course.id}`}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverCourseId !== course.id) {
                  setDragOverCourseId(course.id);
                }
              }}
              onDragLeave={() => {
                if (dragOverCourseId === course.id) {
                  setDragOverCourseId(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverCourseId(null);
                const sId = e.dataTransfer.getData('text/plain') || draggedStudentId;
                if (sId) {
                  handleEnrollStudent(sId, course.id);
                }
              }}
              className={`bg-white rounded-3xl border overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 relative ${
                dragOverCourseId === course.id
                  ? 'border-[#D4A33C] ring-4 ring-[#D4A33C]/40 scale-[1.01]'
                  : isNearCompletion 
                    ? 'border-amber-300 ring-2 ring-amber-405 ring-opacity-20' 
                    : 'border-slate-200'
              }`}
            >
              {/* Header block with distinct layout */}
              <div className={`p-5 text-white flex justify-between items-start gap-4 ${
                isNearCompletion 
                  ? 'bg-gradient-to-l from-amber-600 to-rose-750' 
                  : 'bg-gradient-to-l from-teal-700 to-slate-800'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] font-mono bg-white bg-opacity-20 text-white px-2.5 py-0.5 rounded-md font-black">
                      {course.code}
                    </span>
                    <span className="text-[10px] bg-slate-900 bg-opacity-40 px-2.5 py-0.5 rounded-md font-bold">
                      {course.level}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm tracking-tight pt-1">{course.title}</h4>
                </div>
                
                {/* Status Indicator */}
                <div className="text-right shrink-0">
                  {isNearCompletion ? (
                    <span className="bg-amber-400 text-slate-950 text-[9px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
                      <Flame size={10} />
                      شارفت على الانتهاء
                    </span>
                  ) : (
                    <span className="bg-emerald-500 text-white text-[9px] font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 bg-opacity-30">
                      الدورة نشطة وقائمة
                    </span>
                  )}
                </div>
              </div>

              {/* Stats & Metadata block */}
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 text-xs border-b border-rose-50/50 pb-4">
                  <div className="flex items-center gap-2 text-slate-500">
                    <User size={14} className="text-slate-400" />
                    <span>المعلم: <strong className="text-slate-850 font-extrabold">{course.instructor}</strong></span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock size={14} className="text-slate-400" />
                    <span className="truncate">المواعيد: <strong className="text-slate-800 font-semibold">{course.classTime}</strong></span>
                  </div>

                  <div className="flex flex-col gap-1 text-slate-500 col-span-1 border border-slate-100 bg-slate-50/50 p-2.5 rounded-xl">
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-[#D4A33C] shrink-0" />
                      <span className="text-[11px] font-black text-slate-600">المقاعد والشواغر الكلية:</span>
                    </div>
                    {/* Remaining seats indicator and progress state bar */}
                    <div className="mt-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800">{enrolled}/{course.maxStudents || 15}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                          Math.max(0, (course.maxStudents || 15) - enrolled) === 0
                            ? 'bg-rose-100 text-rose-700 animate-pulse'
                            : (course.maxStudents || 15) - enrolled <= 3
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {Math.max(0, (course.maxStudents || 15) - enrolled) === 0 ? 'مكتملة ⚠️' : `شاغر: ${Math.max(0, (course.maxStudents || 15) - enrolled)}`}
                        </span>
                      </div>
                      <div className="w-full bg-slate-150 rounded-full h-1 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-300 ${
                            Math.max(0, (course.maxStudents || 15) - enrolled) === 0 
                              ? 'bg-rose-500' 
                              : (course.maxStudents || 15) - enrolled <= 3 
                                ? 'bg-amber-500' 
                                : 'bg-emerald-500'
                          }`} 
                          style={{ width: `${Math.min(100, Math.round((enrolled / (course.maxStudents || 15)) * 100))}%` }} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500">
                    <Hourglass size={14} className="text-slate-400" />
                    <span>ساعات العمل المقضية: <strong className="text-slate-900 font-black">{course.completedHours}</strong><span className="text-slate-400">/{course.totalHours} ساعات</span></span>
                  </div>
                </div>

                {/* Sub Financial and detail block as requested */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-150 grid grid-cols-3 gap-2.5 text-center">
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 block font-bold">الرصيد المتبقي (ساعات)</span>
                    <strong className="text-xs font-mono font-black text-rose-600 block">{remainingHours} ساعة متبقية</strong>
                  </div>
                  <div className="space-y-0.5 border-r border-l border-slate-200">
                    <span className="text-[9px] text-slate-400 block font-bold">مقطوعية المعلم الثابتة</span>
                    <strong className="text-xs font-mono font-black text-[#1A365D] block">₪{course.teacherRate || 0}</strong>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-slate-400 block font-bold">رسوم اشتراك الطلاب</span>
                    <strong className="text-xs font-mono font-black text-emerald-600 block">₪{course.studentRate || 0}</strong>
                  </div>
                </div>

                {/* Progress bar with requested selector and color changes */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-slate-500 text-[10px]">نسبة استهلاك الرصيد الساعاتي الكلي للدورة:</span>
                    <span className={`font-mono font-black ${
                      isNearCompletion ? 'text-rose-650 text-sm' : 'text-slate-800'
                    }`}>{progressPercent}%</span>
                  </div>

                  {/* CRITICAL PROGRESS BAR WRAPPER FOR USER ASSERTION */}
                  <div 
                    id={`progress-bar-container-${course.id}`}
                    className="group-course-progress-bar w-full bg-slate-100 rounded-[12px] h-[18px] overflow-hidden border border-slate-200/50 shadow-inner"
                  >
                    <div
                      id={`progress-bar-fill-${course.id}`}
                      style={{ width: `${progressPercent}%` }}
                      className={`h-full transition-all duration-300 rounded-[12px] ${
                        isNearCompletion
                           ? 'bg-gradient-to-r from-rose-600 to-amber-500 shadow-inner animate-pulse'
                           : 'bg-teal-600'
                      }`}
                    />
                  </div>
                </div>

                {/* VISUAL ALERT MESSAGE (رسالة تنبيه مرئية عند وصول الساعة لـ 90% لتنبيه المدير بضرورة التخطيط) */}
                <AnimatePresence>
                  {isNearCompletion && (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-rose-50 border border-rose-200/60 p-4 rounded-2xl space-y-1 text-right animate-pulse"
                    >
                      <h5 className="text-[11px] font-extrabold text-rose-800 flex items-center gap-1.5">
                        <AlertTriangle size={14} className="text-rose-600 flex-shrink-0" />
                        تنبيه استنفاد الرصيد الكلي للساعات
                      </h5>
                      <p className="text-[11px] text-rose-700 leading-relaxed font-semibold">
                        لقد تم استهلاك <strong className="font-black text-xs font-mono">{progressPercent}%</strong> من الرصيد الكلي الساعاتي المعتمد ({course.completedHours}/{course.totalHours} س). يرجى التخطيط والمطالبة الفورية لتأسيس دورة بديلة لعدم مقاطعة الدراسة.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Section for managing and monitoring each enrolled student's allocated hours */}
                <div className="pt-2 border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => setExpandedStudentsCourseId(expandedStudentsCourseId === course.id ? null : course.id)}
                    className="w-full py-2.5 px-4 bg-slate-50 hover:bg-slate-100/90 text-[11px] font-black text-[#1A365D] rounded-xl border border-slate-150 flex items-center justify-between gap-2 duration-200 select-none cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Users size={14} className="text-[#D4A33C]" />
                      <span>رصد ومتابعة ساعات الطلاب المنسوبين ({enrolled} طلاب)</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold">
                      {expandedStudentsCourseId === course.id ? 'إخفاء التفاصيل ▲' : 'عرض التفاصيل وتعيين رصيد الساعات ▼'}
                    </span>
                  </button>

                  <AnimatePresence>
                    {expandedStudentsCourseId === course.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-3 space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200"
                      >
                        <h5 className="text-[11px] font-black text-slate-900 leading-none mb-3 pb-2 border-b border-slate-250">
                          رصيد الساعات المعتمد والمستهلك لكل طالب بالدورة:
                        </h5>
                        
                        <div className="space-y-2.5">
                          {students
                            .filter(s => course.studentIds?.includes(s.id) || s.assignedCourseId === course.id)
                            .map(student => {
                              const breakdown = student.groupCourseHoursBreakdown?.find(b => b.courseId === course.id) || {
                                allocated: course.studentHoursAllocated?.[student.id] ?? 10,
                                consumed: 0,
                                remaining: course.studentHoursAllocated?.[student.id] ?? 10
                              };

                              const isEditing = editingStudentHours?.courseId === course.id && editingStudentHours?.studentId === student.id;

                              const handleSaveHours = () => {
                                if (!onUpdateCourseDetails) return;
                                const val = Number(tempHoursValue);
                                if (isNaN(val) || val < 0) return;
                                const allocated = course.studentHoursAllocated || {};
                                onUpdateCourseDetails(course.id, {
                                  studentHoursAllocated: {
                                    ...allocated,
                                    [student.id]: val
                                  }
                                });
                                setEditingStudentHours(null);
                              };

                              const handleIncrementHours = (by: number) => {
                                if (!onUpdateCourseDetails) return;
                                const currentAllocated = course.studentHoursAllocated?.[student.id] ?? 10;
                                const newVal = Math.max(0, currentAllocated + by);
                                const allocated = course.studentHoursAllocated || {};
                                onUpdateCourseDetails(course.id, {
                                  studentHoursAllocated: {
                                    ...allocated,
                                    [student.id]: newVal
                                  }
                                });
                              };

                              return (
                                <div key={student.id} className="p-3 bg-white rounded-xl border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs">
                                  <div className="space-y-0.5 text-right w-full sm:w-auto">
                                    <h6 className="text-[12px] font-black text-slate-900">{student.name}</h6>
                                    <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[9px] text-slate-500 font-bold mt-1">
                                      <span>الصف: {student.grade || student.academicLevel || 'غير محدد'}</span>
                                      <span className="text-slate-300">|</span>
                                      <span className="text-slate-750">المستهلك: <strong className="text-rose-600 font-mono font-black">{breakdown.consumed} س</strong></span>
                                      <span className="text-slate-300">|</span>
                                      <span className="text-[#34D399]">المتبقي: <strong className="text-emerald-600 font-mono font-black">{breakdown.remaining} س</strong></span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 w-full sm:w-auto self-end sm:self-center justify-end">
                                    {isEditing ? (
                                      <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.5"
                                          value={tempHoursValue}
                                          onChange={e => setTempHoursValue(e.target.value)}
                                          className="w-14 px-1 py-0.5 text-center font-black bg-white border border-slate-200 rounded text-xs outline-none"
                                        />
                                        <button
                                          type="button"
                                          onClick={handleSaveHours}
                                          className="px-2 py-0.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-[10px] font-bold cursor-pointer transition-colors"
                                        >
                                          حفظ
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingStudentHours(null)}
                                          className="px-2 py-0.5 bg-slate-300 hover:bg-slate-400 text-slate-705 rounded text-[10px] font-bold cursor-pointer transition-colors"
                                        >
                                          إلغاء
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5">
                                        <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-xl border border-slate-150">
                                          <button
                                            type="button"
                                            onClick={() => handleIncrementHours(-1)}
                                            className="w-5 h-5 bg-white hover:bg-slate-150 border border-slate-200 rounded flex items-center justify-center font-bold text-xs select-none cursor-pointer duration-150 text-slate-600"
                                            title="تقليص ساعة"
                                          >
                                            -
                                          </button>
                                          <span className="text-[11px] font-black text-slate-8 w-12 text-center font-mono">
                                            {breakdown.allocated} س
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleIncrementHours(1)}
                                            className="w-5 h-5 bg-white hover:bg-slate-150 border border-slate-200 rounded flex items-center justify-center font-bold text-xs select-none cursor-pointer duration-150 text-slate-600"
                                            title="إضافة ساعة"
                                          >
                                            +
                                          </button>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingStudentHours({ courseId: course.id, studentId: student.id });
                                            setTempHoursValue(String(breakdown.allocated));
                                          }}
                                          className="text-[9px] text-[#D4A33C] hover:underline font-black cursor-pointer px-1.5 py-1"
                                        >
                                          تخصيص يدوياً
                                        </button>

                                        {onUpdateCourseDetails && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newStudentIds = (course.studentIds || []).filter(id => id !== student.id);
                                              const newAllocated = { ...course.studentHoursAllocated };
                                              delete newAllocated[student.id];
                                              onUpdateCourseDetails(course.id, {
                                                studentIds: newStudentIds,
                                                studentHoursAllocated: newAllocated
                                              });
                                              setDragNotification(`تم إلغاء تنسيب الطالب ${student.name} من الدورة بنجاح.`);
                                              setTimeout(() => setDragNotification(null), 3500);
                                            }}
                                            className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors cursor-pointer"
                                            title="إلغاء تنسيب الطالب من الدورة"
                                          >
                                            <X size={13} />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          
                          {students.filter(s => course.studentIds?.includes(s.id) || s.assignedCourseId === course.id).length === 0 && (
                            <p className="text-[10px] text-slate-400 text-center font-medium">لا يوجد طلاب متصلين في الدورة حالياً</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Manual completed hours adjuster of Group courses */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">تعديل ساعات العمل يدويّاً من المدير:</span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                    <button
                      onClick={() => onUpdateCompletedHours(course.id, Math.max(0, course.completedHours - 1))}
                      className="w-7 h-7 flex items-center justify-center bg-white hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-650 text-sm font-extrabold transition-all active:scale-95 cursor-pointer shadow-sm"
                    >
                      -
                    </button>
                    <span className="font-mono text-xs font-black text-slate-800 w-14 text-center">
                      {course.completedHours} س
                    </span>
                    <button
                      onClick={() => onUpdateCompletedHours(course.id, Math.min(course.totalHours, course.completedHours + 1))}
                      className="w-7 h-7 flex items-center justify-center bg-white hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-650 text-sm font-extrabold transition-all active:scale-95 cursor-pointer shadow-sm"
                    >
                      +
                    </button>
                    <button
                      onClick={() => onUpdateCompletedHours(course.id, course.totalHours)}
                      className="text-[9px] px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-black transition-all cursor-pointer"
                    >
                      إنهاء كلي
                    </button>
                  </div>
                </div>

                {/* Delete and Archive / Unarchive course item */}
                <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 flex-wrap gap-2 text-right" dir="rtl">
                  {onUpdateCourseDetails && (() => {
                    const isCourseArchived = course.status === CourseStatus.Finished || course.completedHours >= course.totalHours;
                    return isCourseArchived ? (
                      <button
                        type="button"
                        onClick={() => handleUnarchiveCourse(course.id)}
                        className="text-amber-600 hover:text-amber-700 flex items-center gap-1.5 text-[11px] font-black transition-colors cursor-pointer select-none bg-amber-500/5 hover:bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-[#D4A33C]/20"
                      >
                        <Award size={13} />
                        إعادة تفعيل الدورة من الأرشيف 📂
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleArchiveCourse(course.id)}
                        className="text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 text-[11px] font-black transition-colors cursor-pointer select-none bg-emerald-500/5 hover:bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20"
                      >
                        <Award size={13} />
                        أرشفة وإنهاء الدورة الآن 📂
                      </button>
                    );
                  })()}
                  <button
                    onClick={() => onDeleteCourse(course.id)}
                    className="text-slate-450 hover:text-rose-600 flex items-center gap-1.5 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 size={11} />
                    حذف الدورة والروابط
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {courses.filter(course => {
          const isFinished = course.status === CourseStatus.Finished || course.completedHours >= course.totalHours;
          if (courseViewMode === 'active') {
            return !isFinished;
          } else {
            return isFinished;
          }
        }).length === 0 && (
          <div className="col-span-1 lg:col-span-2 py-20 text-center bg-white rounded-3xl border border-slate-200 text-slate-400">
            <Users size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-xs font-black">
              {courseViewMode === 'active' 
                ? 'لا توجد دورات جماعية نشطة حاليًا.' 
                : 'أرشيف الدورات فارغ، لم يتم أرشفة أو إغلاق دراسي لأي دورة.'}
            </p>
          </div>
        )}
      </div>

      {/* Platform Students Quick-View Modal */}
      <AnimatePresence>
        {showStudentsModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm text-right" dir="rtl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-905 to-[#1A365D] text-white">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Users size={20} className="text-[#D4A33C]" />
                    <h3 className="text-base font-black tracking-tight text-white leading-none">بوابة كافة الطلاب المسجلين بالمنصة</h3>
                  </div>
                  <p className="text-[10px] text-slate-300 font-bold">مستكشف وحصيلة الطلاب المسجلين رسمياً عبر المنصة وتفاصيلهم المالية ونسب التنسيب.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowStudentsModal(false);
                    setModalSearch('');
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Subheader Filters */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="ابحث سريعا عن اسم الطالب..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full text-xs py-2.5 pr-8 pl-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#D4A33C] font-semibold text-slate-800"
                  />
                  <Search className="absolute right-2.5 top-3 text-slate-400" size={14} />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[10px] sm:text-xs font-black text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
                    إجمالي الطلاب: <strong className="text-[#1A365D] font-mono text-sm">{students.length}</strong>
                  </span>
                  <span className="text-[10px] sm:text-xs font-black text-slate-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl shadow-sm">
                    المحفظة الإجمالية: <strong className="text-emerald-700 font-mono text-sm">₪{students.reduce((sum, s) => sum + (s.balance || 0), 0).toFixed(0)}</strong>
                  </span>
                </div>
              </div>

              {/* Student List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-slate-50/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {students
                    .filter(s => !modalSearch.trim() || s.name.toLowerCase().includes(modalSearch.toLowerCase()))
                    .map(student => {
                      const hasLowBalance = student.balance < (student.lowBalanceThreshold || 50);
                      const matchedCount = student.assignedCourseIds?.length || 0;
                      const isAssigned = matchedCount > 0;
                      return (
                        <div key={student.id} className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-350 transition-all flex flex-col justify-between gap-3 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${student.gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500'}`} />
                                {student.name}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-bold mt-1">
                                الصف: <span className="text-slate-700">{student.grade || student.academicLevel || 'غير محدد'}</span> | التظليل الجنسي: <span className="text-slate-700">{student.gender === 'Male' ? 'ذكر' : 'أنثى'}</span>
                              </p>
                              {student.phone && (
                                <p className="text-[10px] text-slate-500 font-mono mt-1">
                                  هاتف ولي الأمر: {student.phone}
                                </p>
                              )}
                            </div>
                            <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full ${
                              isAssigned
                                ? 'bg-amber-100 text-amber-800 border border-amber-250'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {isAssigned ? `مسجل ومربوط بـ (${matchedCount}) دورة` : 'متاح للتنسيب'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                            <span className="text-[9px] font-bold text-slate-400">الرصيد المالي الحالي:</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`font-mono text-xs font-black px-2.5 py-1 rounded-lg ${
                                hasLowBalance 
                                  ? 'bg-rose-50 text-rose-700 border border-rose-150' 
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-150'
                              }`}>
                                {student.isOpenBalance ? `رصيد مفتوح (₪${student.balance})` : `₪${student.balance}`}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {students.filter(s => !modalSearch.trim() || s.name.toLowerCase().includes(modalSearch.toLowerCase())).length === 0 && (
                    <div className="col-span-1 md:col-span-2 py-12 text-center text-slate-400 font-black text-xs">
                      لا يوجد نتائج مطابقة للبحث المذكور
                    </div>
                  )}
                </div>
              </div>

              {/* Close Button Footer */}
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowStudentsModal(false);
                    setModalSearch('');
                  }}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs cursor-pointer transition-all"
                >
                  إغلاق النافذة
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Instant Academic Placement Popup Notification */}
        {placementAlert && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setPlacementAlert(null)}
            />
            
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden shadow-2xl max-w-md w-full relative z-[120] text-right"
              dir="rtl"
            >
              {/* Header Visual Bar with distinct gradient */}
              <div className="p-6 bg-gradient-to-br from-[#1A365D] via-[#2A4D7D] to-slate-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4A33C]/15 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center gap-3 relative z-10">
                  <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-2xl border border-emerald-500/30">
                    <Sparkles size={24} className="text-amber-400" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      إشعار تنسيب فوري 🔔
                    </span>
                    <h3 className="text-base font-black font-sans mt-1">تنسيب أكاديمي ناجح ومؤكد!</h3>
                  </div>
                </div>

                <button 
                  onClick={() => setPlacementAlert(null)}
                  className="absolute top-5 left-5 text-slate-300 hover:text-white transition-colors cursor-pointer bg-white/10 hover:bg-white/20 p-1.5 rounded-lg"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Popup Content Block */}
              <div className="p-6 space-y-5">
                <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-155">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-[11px] font-bold text-slate-550">الطالب المنسّب:</span>
                    <span className="text-xs font-black text-[#1A365D] bg-blue-50 px-2.5 py-1 rounded-lg">
                      {placementAlert.studentName}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="text-[11px] font-bold text-slate-550">الدورة الجماعية:</span>
                    <span className="text-xs font-black text-slate-900">
                      {placementAlert.courseTitle}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-550">مؤشر المقاعد والشواغر:</span>
                    <span className="text-xs font-mono font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                      {placementAlert.currentEnrolled} / {placementAlert.maxSeats} مقاعد
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-slate-600 bg-amber-50/55 p-3.5 rounded-2xl border border-amber-200">
                  <Bell className="text-amber-600 shrink-0 mt-0.5" size={15} />
                  <p className="text-[10px] leading-relaxed font-bold text-slate-705">
                    تم رصد هذا التنسيب في <span className="font-mono text-slate-900">{placementAlert.date}</span> بنجاح وتجهيز الحصص التعليمية المتكاملة لصالحه من رصيد الساعات. يمكنك تخصيص الساعات الفردية للطالب في أي وقت.
                  </p>
                </div>
              </div>

              {/* Popup Actions Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const cId = placementAlert.courseId;
                    setPlacementAlert(null);
                    setExpandedStudentsCourseId(cId);
                    // Smooth scroll to the specific course card to show hours customization list
                    setTimeout(() => {
                      const element = document.getElementById(`course-card-${cId}`);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }, 300);
                  }}
                  className="flex-1 py-3 bg-[#D4A33C] hover:bg-[#bfa232] text-slate-950 rounded-xl font-black text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-md hover:scale-[1.01]"
                >
                  <ArrowUpRight size={13} />
                  <span>تعديل الساعات المخصصة فوراً</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setPlacementAlert(null)}
                  className="px-5 py-3 bg-slate-850 hover:bg-slate-900 text-white rounded-xl font-black text-[11px] transition-all cursor-pointer text-center"
                >
                  تم الاطلاع
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Recents Academic Placements Operations History Modal */}
        {showPlacementsHistory && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setShowPlacementsHistory(false)}
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-lg w-full relative z-[105] text-right flex flex-col max-h-[85vh]"
              dir="rtl"
            >
              <div className="p-5 bg-gradient-to-l from-slate-900 to-[#1A365D] text-white flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-slate-800 border border-slate-700 rounded-xl">
                    <Bell className="text-[#D4A33C]" size={16} />
                  </span>
                  <div>
                    <h4 className="text-sm font-black">تعقب وسجل عمليات التنسيب الفوري</h4>
                    <p className="text-[10px] text-slate-350 font-bold mt-0.5">قائمة بالتنسيبات الأخيرة لتسهيل المتابعة الأكاديمية</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowPlacementsHistory(false)}
                  className="text-slate-300 hover:text-white transition-colors cursor-pointer bg-white/10 p-1 rounded-lg"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                {recentPlacements.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto border border-slate-100">
                      <Bell className="text-slate-300 animate-bounce" size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-850">لا توجد عمليات تنسيب نشطة في هذه الجلسة</p>
                      <p className="text-[10px] text-slate-500 mt-1">سجل التنسيبات الأكاديمية يظهر تلقائياً بمجرد إدراج طالب جديد في الدورة الجماعية</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentPlacements.map((plc, idx) => (
                      <div key={plc.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100/50 transition-all flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] bg-slate-200 text-slate-750 font-black px-2 py-0.5 rounded-md">
                            تنسيب #{recentPlacements.length - idx}
                          </span>
                          <p className="text-xs font-black text-[#1A365D] mt-1">الطالب: {plc.studentName}</p>
                          <p className="text-[10px] text-slate-600 font-bold">تم الانضمام لـ: {plc.courseTitle}</p>
                        </div>
                        
                        <div className="text-left shrink-0">
                          <span className="text-[10px] font-mono font-medium text-slate-400 block">{plc.timestamp}</span>
                          <span className="inline-block mt-1 text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded-md font-black">جاهز ومفعل ✅</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setRecentPlacements([])}
                  disabled={recentPlacements.length === 0}
                  className="px-4 py-2 bg-transparent text-rose-600 hover:text-rose-700 disabled:opacity-40 rounded-lg font-black text-xs cursor-pointer transition-colors"
                >
                  مسح السجل مؤقتاً
                </button>
                <button
                  type="button"
                  onClick={() => setShowPlacementsHistory(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs cursor-pointer transition-all"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Near-completion Alert Modal for Courses over 90% */}
        {showAutoAlertModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setShowAutoAlertModal(false)}
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-2xl w-full relative z-[105] text-right flex flex-col max-h-[85vh]"
              dir="rtl"
            >
              <div className="p-5 bg-gradient-to-l from-slate-900 to-[#1A365D] text-white flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 animate-pulse">
                    <Flame size={18} />
                  </span>
                  <div>
                    <h4 className="text-sm font-black">دورات جماعية أوشكت على الاستنفاد (تجاوزت 90%)</h4>
                    <p className="text-[10px] text-rose-200 font-bold mt-0.5">تنبيه إداري فوري: يرجى اتخاذ قرار بتجديد الساعات أو أرشفة الدورة</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowAutoAlertModal(false)}
                  className="text-slate-300 hover:text-white transition-colors cursor-pointer bg-white/10 p-1 rounded-lg"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
                {courses.filter(c => {
                  const isFinished = c.status === CourseStatus.Finished || c.completedHours >= c.totalHours;
                  const progress = (c.completedHours / c.totalHours) * 100;
                  return !isFinished && progress >= 90;
                }).length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto border border-emerald-100 text-emerald-500">
                      <Check size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800">عمل رائع! تم التعامل مع جميع الدورات بنجاح</p>
                      <p className="text-[10px] text-slate-400 mt-1">لا توجد أي دورات جماعية نشطة تجاوزت نسبة 90% حالياً.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {courses
                      .filter(c => {
                        const isFinished = c.status === CourseStatus.Finished || c.completedHours >= c.totalHours;
                        const progress = (c.completedHours / c.totalHours) * 100;
                        return !isFinished && progress >= 90;
                      })
                      .map(c => {
                        const progress = Math.min(100, Math.round((c.completedHours / c.totalHours) * 100));
                        return (
                          <div key={c.id} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <span className="text-[9px] bg-amber-50 text-amber-700 border border-amber-200 font-black px-2 py-0.5 rounded-md">
                                  نسبة استهلاك الساعات: {progress}%
                                </span>
                                <h4 className="text-xs font-black text-[#1A365D] mt-1.5">{c.title}</h4>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold mt-0.5">
                                  <span>المعلم: {c.instructor}</span>
                                  <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                  <span>الصف/الشعبة: {c.level}</span>
                                </div>
                              </div>

                              <div className="text-left shrink-0 sm:self-start">
                                <span className="text-xs font-mono font-black text-rose-600 block">
                                  {c.completedHours} / {c.totalHours} ساعة مكتملة
                                </span>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="h-full rounded-full bg-gradient-to-l from-rose-500 to-amber-500" 
                                style={{ width: `${progress}%` }}
                              />
                            </div>

                            {/* Action Form / Options */}
                            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 -mx-5 -mb-5 p-4 rounded-b-2xl">
                              <div className="flex items-center gap-2">
                                <label className="text-[10px] font-black text-slate-600 shrink-0">تجديد بـ:</label>
                                <div className="flex items-center">
                                  <input
                                    type="number"
                                    min="1"
                                    placeholder="ساعات"
                                    value={renewalHours[c.id] || '20'}
                                    onChange={(e) => setRenewalHours(prev => ({ ...prev, [c.id]: e.target.value }))}
                                    className="w-16 p-1.5 bg-white border border-slate-200 rounded-r-xl text-xs font-black text-center focus:outline-none focus:ring-1 focus:ring-blue-500 shrink-0"
                                  />
                                  <span className="bg-slate-200 border-y border-l border-slate-200 text-slate-750 px-2 py-1.5 rounded-l-xl text-[10px] font-black shrink-0">ساعة</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleArchiveCourse(c.id)}
                                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-black text-[10px] rounded-xl transition-all border border-rose-200 cursor-pointer flex items-center gap-1"
                                >
                                  <span>أرشفة الدورة</span>
                                </button>
                                
                                <button
                                  type="button"
                                  onClick={() => {
                                    const hours = Number(renewalHours[c.id]) || 20;
                                    handleRenewCourse(c.id, hours);
                                  }}
                                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer flex items-center gap-1"
                                >
                                  <span>تجديد الدورة</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end items-center">
                <button
                  type="button"
                  onClick={() => setShowAutoAlertModal(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs cursor-pointer transition-all"
                >
                  إغلاق التنبيه
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Advanced Direct Course Placement Modal for Unassigned Student */}
      <AnimatePresence>
        {directEnrollModalStudent && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm text-right" dir="rtl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 to-[#1A365D] text-white">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#D4A33C]/20 border border-[#D4A33C]/40 text-[#D4A33C] flex items-center justify-center">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white leading-tight">
                      تنسيب أكاديمي مباشر للطالب: {directEnrollModalStudent.name}
                    </h3>
                    <p className="text-[11px] text-slate-300 font-semibold mt-0.5">
                      الصف: {directEnrollModalStudent.grade || directEnrollModalStudent.academicLevel || 'غير محدد'} | هاتف: {directEnrollModalStudent.phone || 'غير مسجل'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDirectEnrollModalStudent(null)}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {/* Hours Allocation Setting */}
                <div className="bg-amber-50/70 border border-amber-200/80 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <label className="text-xs font-black text-slate-900 block">
                      رصيد الساعات المخصص للطالب في هذه الدورة:
                    </label>
                    <span className="text-[10px] text-slate-500 font-semibold">
                      يمكنك تحديد الرصيد الساعاتي الافتراضي للطالب عند بدء التنسيب (الافتراضي: 10 ساعات).
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={modalAllocatedHours}
                      onChange={e => setModalAllocatedHours(Math.max(1, Number(e.target.value) || 10))}
                      className="w-20 py-1.5 px-2 bg-white border border-slate-300 rounded-xl text-center text-xs font-black text-slate-900 outline-none focus:border-[#D4A33C]"
                    />
                    <span className="text-xs font-bold text-slate-600">ساعة</span>
                  </div>
                </div>

                {/* Available Courses Selection List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-900">
                      اختر الدورة المناسبة من القائمة أدناه ({availableOpenCourses.length} دورة بها مقاعد شاغرة):
                    </h4>
                    {directEnrollModalStudent.grade && (
                      <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg font-bold">
                        صف الطالب: {directEnrollModalStudent.grade}
                      </span>
                    )}
                  </div>

                  {availableOpenCourses.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                      <p className="text-xs font-bold">لا توجد حالياً دورات جماعية نشطة بها شواغر متاحة.</p>
                      <p className="text-[11px] text-slate-400 mt-1">يمكنك تأسيس دورة جماعية جديدة من الزر العلوي.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-0.5">
                      {availableOpenCourses.map(course => {
                        const isSelected = modalTargetCourseId === course.id;
                        const enrolled = course.studentIds?.length || 0;
                        const max = course.maxStudents || 15;
                        const vacant = max - enrolled;
                        const isGradeMatch = course.level && directEnrollModalStudent.grade &&
                          (course.level.includes(directEnrollModalStudent.grade) || directEnrollModalStudent.grade.includes(course.level));

                        return (
                          <div
                            key={course.id}
                            onClick={() => setModalTargetCourseId(course.id)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                              isSelected
                                ? 'border-[#D4A33C] bg-amber-500/10 ring-2 ring-[#D4A33C]/30'
                                : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  isSelected ? 'border-[#D4A33C] bg-[#D4A33C]' : 'border-slate-300 bg-white'
                                }`}>
                                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                                </span>
                                <h5 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                                  <span>{course.title}</span>
                                  {isGradeMatch && (
                                    <span className="text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded font-black">
                                      مطابقة لمرحلة الطالب ⭐
                                    </span>
                                  )}
                                </h5>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 font-bold mr-6">
                                <span>المعلم: <strong className="text-slate-800">{course.instructor || 'غير محدد'}</strong></span>
                                <span className="text-slate-300">•</span>
                                <span>المستوى/الصف: {course.level || 'عام'}</span>
                                <span className="text-slate-300">•</span>
                                <span>إجمالي الساعات: {course.totalHours} س</span>
                              </div>
                            </div>

                            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg font-black">
                                متبقي {vacant} مقاعد شاغرة
                              </span>
                              <span className="text-[9px] text-slate-400 font-semibold font-mono">
                                ({enrolled} من {max} مسجلين)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setDirectEnrollModalStudent(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (modalTargetCourseId && directEnrollModalStudent) {
                      handleDirectEnrollStudent(directEnrollModalStudent.id, modalTargetCourseId, modalAllocatedHours);
                    }
                  }}
                  disabled={!modalTargetCourseId || isProcessingEnrollment}
                  className="px-6 py-2.5 bg-[#D4A33C] hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Zap size={14} />
                  <span>تأكيد التنسيب الفوري للطالب 🚀</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
