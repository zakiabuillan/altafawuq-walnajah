import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, AlertTriangle, Clock, Calendar, MessageCircle, 
  ChevronDown, ChevronUp, Search, CheckCircle2, Sparkles,
  BookOpen, ArrowLeft, Phone, UserCheck, AlertCircle,
  ExternalLink, Layers, GraduationCap, X, BellOff,
  RotateCcw, CheckCheck, EyeOff, CalendarClock, Check
} from 'lucide-react';
import { GroupCourse, Student, Teacher, Session } from '../types';

export interface GroupStudentLowSessionAlert {
  student: Student;
  course: GroupCourse;
  totalCourseHours: number;
  completedHours: number;
  studentAllocatedHours: number;
  remainingSessions: number; // Integer remaining sessions (e.g. 2)
  progressPercentage: number;
  isExactTwo: boolean;
  alertKey: string;
}

interface SnoozeInfo {
  snoozedAt: number;
  untilTimestamp: number | null; // null means permanent until manual restore or next session
  durationLabel: string;
}

interface TeacherQuickDashboardProps {
  loggedInTeacher: Teacher;
  groupCourses: GroupCourse[];
  students: Student[];
  sessions?: Session[];
  onNavigateToGroupLog?: (courseId: string) => void;
  onNavigateToTab?: (tabName: string) => void;
  onSelectStudent?: (studentId: string) => void;
  className?: string;
}

export const TeacherQuickDashboard: React.FC<TeacherQuickDashboardProps> = ({
  loggedInTeacher,
  groupCourses = [],
  students = [],
  sessions = [],
  onNavigateToGroupLog,
  onNavigateToTab,
  onSelectStudent,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<'exact2' | 'allLow' | 'snoozed'>('exact2');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeSnoozeMenuKey, setActiveSnoozeMenuKey] = useState<string | null>(null);
  const [notificationToast, setNotificationToast] = useState<string | null>(null);

  // Local storage key for persistent snooze state per teacher
  const storageKey = useMemo(() => `teacher_snoozed_alerts_${loggedInTeacher?.id || 'default'}`, [loggedInTeacher?.id]);

  // Load snoozed alerts from local state / localStorage
  const [snoozedAlerts, setSnoozedAlerts] = useState<Record<string, SnoozeInfo>>(() => {
    try {
      const stored = localStorage.getItem(`teacher_snoozed_alerts_${loggedInTeacher?.id || 'default'}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        // Filter out expired snoozes
        const valid: Record<string, SnoozeInfo> = {};
        Object.entries(parsed).forEach(([k, v]: [string, any]) => {
          if (!v.untilTimestamp || v.untilTimestamp > now) {
            valid[k] = v;
          }
        });
        return valid;
      }
    } catch (e) {
      console.warn('Failed to load snoozed alerts from localStorage', e);
    }
    return {};
  });

  // Save snoozed alerts to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(snoozedAlerts));
    } catch (e) {
      console.warn('Failed to save snoozed alerts to localStorage', e);
    }
  }, [snoozedAlerts, storageKey]);

  // Auto-dismiss toast notification after 4 seconds
  useEffect(() => {
    if (notificationToast) {
      const timer = setTimeout(() => {
        setNotificationToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notificationToast]);

  // 1. Identify teacher's active group courses
  const teacherGroupCourses = useMemo(() => {
    return groupCourses.filter(course => {
      const isTeacher = course.teacherId === loggedInTeacher.id || 
        (course.instructor && loggedInTeacher.name && course.instructor.trim() === loggedInTeacher.name.trim());
      const isActive = course.status?.toLowerCase() === 'active';
      return isTeacher && isActive;
    });
  }, [groupCourses, loggedInTeacher]);

  // 2. Compute group students who have remaining sessions (specifically targeting 2 sessions remaining)
  const groupStudentAlerts = useMemo<GroupStudentLowSessionAlert[]>(() => {
    const alerts: GroupStudentLowSessionAlert[] = [];

    teacherGroupCourses.forEach(course => {
      const totalHours = Number(course.totalHours) || 0;
      const completedHours = Number(course.completedHours) || Number(course.loggedHours) || 0;
      const enrolledStudentIds = course.studentIds || [];
      const allocatedMap = course.studentHoursAllocated || {};

      enrolledStudentIds.forEach(studentId => {
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        // Determine student's allocated total hours in this course (default to course total hours)
        const studentAllocated = allocatedMap[studentId] !== undefined ? Number(allocatedMap[studentId]) : totalHours;
        
        // Remaining hours / sessions for student in this course
        const remaining = Math.max(0, studentAllocated - completedHours);
        const remainingSessions = Math.floor(remaining);

        // Progress percentage
        const progress = studentAllocated > 0 ? Math.min(100, Math.round((completedHours / studentAllocated) * 100)) : 100;

        // Check if student has 2 sessions remaining (or <= 2)
        const isExactTwo = remainingSessions === 2;
        const isLow = remainingSessions <= 2 && remainingSessions >= 0;
        const alertKey = `${course.id}-${student.id}`;

        if (isLow) {
          alerts.push({
            student,
            course,
            totalCourseHours: totalHours,
            completedHours,
            studentAllocatedHours: studentAllocated,
            remainingSessions,
            progressPercentage: progress,
            isExactTwo,
            alertKey
          });
        }
      });
    });

    // Sort: exact 2 sessions first, then by remaining sessions ascending, then by student name
    return alerts.sort((a, b) => {
      if (a.isExactTwo && !b.isExactTwo) return -1;
      if (!a.isExactTwo && b.isExactTwo) return 1;
      if (a.remainingSessions !== b.remainingSessions) return a.remainingSessions - b.remainingSessions;
      return (a.student.name || '').localeCompare(b.student.name || '');
    });
  }, [teacherGroupCourses, students]);

  // Handle Snooze / Dismiss alert action
  const handleSnoozeAlert = (alertKey: string, studentName: string, durationHours: number | null, label: string) => {
    const now = Date.now();
    const untilTimestamp = durationHours ? now + durationHours * 60 * 60 * 1000 : null;

    setSnoozedAlerts(prev => ({
      ...prev,
      [alertKey]: {
        snoozedAt: now,
        untilTimestamp,
        durationLabel: label
      }
    }));
    setActiveSnoozeMenuKey(null);
    setNotificationToast(`تم تأجيل تنبيه الطالب "${studentName}" (${label}) بنجاح ✔️`);
  };

  // Handle Un-snooze / Restore alert action
  const handleRestoreAlert = (alertKey: string, studentName: string) => {
    setSnoozedAlerts(prev => {
      const next = { ...prev };
      delete next[alertKey];
      return next;
    });
    setNotificationToast(`تمت إعادة تفعيل تنبيه الطالب "${studentName}" بنجاح 🔔`);
  };

  // Handle Restore All Snoozed alerts
  const handleRestoreAllSnoozed = () => {
    setSnoozedAlerts({});
    setNotificationToast('تمت إعادة إظهار جميع التنبيهات المؤجلة بنجاح 🔄');
  };

  // Filtered alerts based on search, selected filter mode, and snooze status
  const filteredAlerts = useMemo(() => {
    const now = Date.now();

    return groupStudentAlerts.filter(item => {
      const snoozeInfo = snoozedAlerts[item.alertKey];
      const isSnoozed = !!snoozeInfo && (!snoozeInfo.untilTimestamp || snoozeInfo.untilTimestamp > now);

      // If viewing snoozed tab
      if (filterMode === 'snoozed') {
        if (!isSnoozed) return false;
      } else {
        // If viewing active alerts, hide snoozed ones
        if (isSnoozed) return false;

        // Filter by mode
        if (filterMode === 'exact2' && item.remainingSessions !== 2) {
          return false;
        }
      }

      // Filter by course
      if (selectedCourseFilter !== 'ALL' && item.course.id !== selectedCourseFilter) {
        return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const studentMatch = (item.student.name || '').toLowerCase().includes(query) ||
                             (item.student.phone || '').includes(query);
        const courseMatch = (item.course.title || '').toLowerCase().includes(query) ||
                            (item.course.code || '').toLowerCase().includes(query);
        return studentMatch || courseMatch;
      }

      return true;
    });
  }, [groupStudentAlerts, filterMode, selectedCourseFilter, searchQuery, snoozedAlerts]);

  // Statistics counters
  const now = Date.now();
  const snoozedCount = useMemo(() => {
    return groupStudentAlerts.filter(item => {
      const info = snoozedAlerts[item.alertKey];
      return !!info && (!info.untilTimestamp || info.untilTimestamp > now);
    }).length;
  }, [groupStudentAlerts, snoozedAlerts, now]);

  const activeAlerts = useMemo(() => {
    return groupStudentAlerts.filter(item => {
      const info = snoozedAlerts[item.alertKey];
      return !info || (info.untilTimestamp && info.untilTimestamp <= now);
    });
  }, [groupStudentAlerts, snoozedAlerts, now]);

  const exactTwoCount = useMemo(() => {
    return activeAlerts.filter(a => a.remainingSessions === 2).length;
  }, [activeAlerts]);

  const totalActiveLowCount = activeAlerts.length;

  const affectedCoursesCount = useMemo(() => {
    const uniqueCourseIds = new Set(filteredAlerts.map(a => a.course.id));
    return uniqueCourseIds.size;
  }, [filteredAlerts]);

  // Helper to construct pre-filled WhatsApp reminder message
  const getWhatsAppReminderUrl = (student: Student, course: GroupCourse, remainingSessions: number) => {
    const rawPhone = (student.phone || '').replace(/[^0-9+]/g, '');
    if (!rawPhone) return '#';

    let formattedPhone = rawPhone;
    if (formattedPhone.startsWith('05')) {
      formattedPhone = '972' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('00')) {
      formattedPhone = formattedPhone.substring(2);
    } else if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }

    const messageText = `السلام عليكم ورحمة الله،
تحية طيبة من أستاذ ${loggedInTeacher.name || 'المادة'} - أكاديمية التفوق 🌟

نود إعلامكم بأن الطالب/ة العزيز/ة: *${student.name}*
متبقي له في الدورة الجماعية (*${course.title}*) عدد:
⏳ *${remainingSessions === 2 ? 'حصتان فقط (2 حصص متبقية)' : remainingSessions === 1 ? 'حصة واحدة فقط (1 حصة متبقية)' : '0 حصص متبقية (اكتملت الباقة)'}*

نرجو التنسيق مع إدارة الأكاديمية لتجديد الاشتراك واستكمال المسار التعليمي لضمان استمرار الحصص دون انقطاع.

شاكرين لكم حسن تعاونكم واهتمامكم ✨`;

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      id="teacher-quick-dashboard-widget"
      className={`bg-white rounded-3xl border-2 border-amber-300 shadow-xl shadow-amber-500/5 overflow-hidden text-right relative ${className}`}
      dir="rtl"
    >
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {notificationToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md text-white text-xs font-black px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700 pointer-events-none"
          >
            <Check className="text-emerald-400 shrink-0" size={15} />
            <span>{notificationToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 p-5 text-white relative overflow-hidden">
        {/* Subtle decorative elements */}
        <div className="absolute -top-10 -left-10 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-black/10 rounded-full blur-lg pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start md:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white text-amber-700 flex items-center justify-center shrink-0 shadow-lg shadow-black/10">
              <AlertTriangle size={24} className="animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-black bg-white/20 backdrop-blur-md px-2.5 py-0.5 rounded-full uppercase tracking-wider text-white border border-white/20">
                  لوحة المتابعة السريعة للمعلم ⚡
                </span>
                {exactTwoCount > 0 && (
                  <span className="text-[10px] font-black bg-rose-500 text-white px-2.5 py-0.5 rounded-full animate-bounce shadow-sm">
                    {exactTwoCount} طلاب متبقي حصتان فقط
                  </span>
                )}
                {snoozedCount > 0 && (
                  <span className="text-[10px] font-black bg-slate-800/80 text-amber-200 px-2.5 py-0.5 rounded-full border border-amber-300/30 flex items-center gap-1">
                    <BellOff size={10} />
                    {snoozedCount} مؤجل (تم التواصل)
                  </span>
                )}
              </div>
              <h2 className="text-base md:text-lg font-black text-white mt-1 flex items-center gap-2">
                <span>تنبيهات الدورات الجماعية: حصتان متبقيتان للطلبة</span>
                <span className="text-xs bg-amber-700/80 px-2 py-0.5 rounded-lg border border-amber-400/40 font-mono">
                  {filteredAlerts.length} طالب
                </span>
              </h2>
              <p className="text-[11px] text-amber-100 font-bold mt-0.5 leading-relaxed">
                رصد استباقي للطلبة في دوراتك الجماعية الذين وصلوا للحصتين الأخيرتين لتنسيق التجديد مع أولياء الأمور قبل اكتمال الساعات.
              </p>
            </div>
          </div>

          {/* Quick Header Controls */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            {snoozedCount > 0 && (
              <button
                type="button"
                onClick={handleRestoreAllSnoozed}
                className="px-3 py-1.5 bg-amber-900/60 hover:bg-amber-900/80 active:scale-95 text-amber-100 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border border-amber-400/30"
                title="إلغاء تأجيل جميع التنبيهات وإعادتها للقائمة"
              >
                <RotateCcw size={13} />
                <span>إعادة إظهار الكل ({snoozedCount})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="px-3 py-1.5 bg-white/15 hover:bg-white/25 active:scale-95 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border border-white/20"
              title={isCollapsed ? 'توسيع اللوحة' : 'طي اللوحة'}
            >
              {isCollapsed ? (
                <>
                  <span>عرض التفاصيل</span>
                  <ChevronDown size={15} />
                </>
              ) : (
                <>
                  <span>طي اللوحة</span>
                  <ChevronUp size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="p-5 space-y-5"
          >
            {/* 2. Top Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
              {/* Card 1: Exactly 2 sessions remaining */}
              <div 
                onClick={() => setFilterMode('exact2')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  filterMode === 'exact2'
                    ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/30 shadow-sm'
                    : 'bg-slate-50/70 hover:bg-slate-100/70 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-[11px] font-black text-slate-700">متبقي حصتان بالضبط (2)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">تنبيه عاجل للتجديد الفوري</p>
                </div>
                <div className="text-left">
                  <span className="text-xl font-black text-amber-800 font-mono">{exactTwoCount}</span>
                  <span className="text-[10px] text-slate-400 font-bold block">طالب</span>
                </div>
              </div>

              {/* Card 2: All low sessions (<= 2 sessions) */}
              <div 
                onClick={() => setFilterMode('allLow')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  filterMode === 'allLow'
                    ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-400/30 shadow-sm'
                    : 'bg-slate-50/70 hover:bg-slate-100/70 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <Layers size={14} className="text-orange-600" />
                    <span className="text-[11px] font-black text-slate-700">كافة النشطة (≤ 2)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">شاملة الحصة الأخيرة والنافذة</p>
                </div>
                <div className="text-left">
                  <span className="text-xl font-black text-orange-800 font-mono">{totalActiveLowCount}</span>
                  <span className="text-[10px] text-slate-400 font-bold block">طالب</span>
                </div>
              </div>

              {/* Card 3: Snoozed / Contacted Alerts */}
              <div 
                onClick={() => setFilterMode('snoozed')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  filterMode === 'snoozed'
                    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/30 shadow-sm'
                    : 'bg-slate-50/70 hover:bg-slate-100/70 border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <UserCheck size={14} className="text-emerald-600" />
                    <span className="text-[11px] font-black text-slate-700">المؤجلة (تم التواصل)</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">مخفية مؤقتاً بعد المتابعة</p>
                </div>
                <div className="text-left">
                  <span className={`text-xl font-black font-mono ${snoozedCount > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {snoozedCount}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold block">طالب</span>
                </div>
              </div>

              {/* Card 4: Active Group Courses count */}
              <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <BookOpen size={14} className="text-blue-600" />
                    <span className="text-[11px] font-black text-slate-700">الدورات المتأثرة</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">من إجمالي {teacherGroupCourses.length} دورات نشطة</p>
                </div>
                <div className="text-left">
                  <span className="text-xl font-black text-blue-900 font-mono">{affectedCoursesCount}</span>
                  <span className="text-[10px] text-slate-400 font-bold block">دورة</span>
                </div>
              </div>
            </div>

            {/* 3. Search and Course Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث باسم الطالب أو اسم الدورة الجماعية..."
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Course Filter Dropdown */}
              {teacherGroupCourses.length > 1 && (
                <div className="w-full sm:w-64 shrink-0">
                  <select
                    value={selectedCourseFilter}
                    onChange={(e) => setSelectedCourseFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-amber-500 outline-none cursor-pointer"
                  >
                    <option value="ALL">جميع الدورات الجماعية ({teacherGroupCourses.length})</option>
                    {teacherGroupCourses.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.title || course.code}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* 4. Student Alert Cards Grid */}
            {filteredAlerts.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-xs font-black text-slate-800">
                  {filterMode === 'snoozed' 
                    ? 'لا توجد تنبيهات مؤجلة حالياً' 
                    : searchQuery 
                    ? 'لا توجد نتائج مطابقة لبحثك' 
                    : 'ممتاز! لا يوجد طلاب بحصتين متبقيتين بحاجة لمتابعة حالياً'}
                </h3>
                <p className="text-[11px] text-slate-400 font-bold max-w-md mx-auto">
                  {filterMode === 'snoozed'
                    ? 'عند تأجيل أي تنبيه لطالب تم التواصل معه، سيظهر هنا مع خيار إعادة التفعيل بأي وقت.'
                    : searchQuery 
                    ? 'جرّب تعديل كلمات البحث أو اختيار دورة مختلفة من القائمة.' 
                    : 'جميع الطلاب في دوراتك الجماعية لديهم رصيد ساعات كافٍ يفوق الحصتين أو تم تأجيل تنبيهاتهم بعد التواصل معهم.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAlerts.map(alert => {
                  const { student, course, remainingSessions, isExactTwo, completedHours, studentAllocatedHours, progressPercentage, alertKey } = alert;
                  const hasPhone = !!student.phone;
                  const isMenuOpen = activeSnoozeMenuKey === alertKey;
                  const snoozeInfo = snoozedAlerts[alertKey];
                  const isSnoozed = !!snoozeInfo && (!snoozeInfo.untilTimestamp || snoozeInfo.untilTimestamp > now);

                  return (
                    <motion.div
                      key={alertKey}
                      layout
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3.5 bg-white relative group ${
                        isSnoozed
                          ? 'border-emerald-300 bg-emerald-50/20'
                          : isExactTwo
                          ? 'border-amber-300 ring-2 ring-amber-300/40 hover:border-amber-400 hover:shadow-md'
                          : remainingSessions === 1
                          ? 'border-orange-300 ring-1 ring-orange-300/40 hover:border-orange-400'
                          : 'border-rose-300 ring-1 ring-rose-300/40 hover:border-rose-400'
                      }`}
                    >
                      {/* Top Accent Line */}
                      <div 
                        className={`absolute top-0 left-0 right-0 h-1.5 ${
                          isSnoozed ? 'bg-emerald-500' : isExactTwo ? 'bg-amber-500' : remainingSessions === 1 ? 'bg-orange-500' : 'bg-rose-500'
                        }`} 
                      />

                      {/* Header: Student Name + Badges + Snooze Menu Toggle */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <GraduationCap size={15} className="text-amber-600 shrink-0" />
                              <h3 
                                onClick={() => onSelectStudent && onSelectStudent(student.id)}
                                className="text-xs font-black text-slate-900 break-words leading-snug hover:text-amber-700 cursor-pointer"
                                title={student.name}
                              >
                                {student.name}
                              </h3>
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                              {student.academicLevel || student.grade || 'طالب بالدورة'}
                            </span>
                          </div>

                          {/* Badges & Snooze Action */}
                          <div className="shrink-0 flex items-center gap-1.5">
                            {isSnoozed ? (
                              <span className="text-[10px] font-black text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                                <UserCheck size={11} className="text-emerald-600" />
                                <span>تم التواصل ({snoozeInfo.durationLabel})</span>
                              </span>
                            ) : isExactTwo ? (
                              <span className="text-[10px] font-black text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                                <AlertTriangle size={11} className="text-amber-600" />
                                <span>متبقي حصتان (2) ⏳</span>
                              </span>
                            ) : remainingSessions === 1 ? (
                              <span className="text-[10px] font-black text-orange-900 bg-orange-100 border border-orange-300 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                                <AlertCircle size={11} className="text-orange-600" />
                                <span>متبقي حصة (1) ⚠️</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-black text-rose-900 bg-rose-100 border border-rose-300 px-2.5 py-1 rounded-full flex items-center gap-1 shadow-xs">
                                <AlertCircle size={11} className="text-rose-600" />
                                <span>0 حصص متبقية 🚨</span>
                              </span>
                            )}

                            {/* Snooze Dropdown Trigger Button */}
                            <div className="relative">
                              {isSnoozed ? (
                                <button
                                  type="button"
                                  onClick={() => handleRestoreAlert(alertKey, student.name)}
                                  className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl transition-all border border-emerald-300/60 cursor-pointer"
                                  title="إلغاء التأجيل وإعادة التنبيه للرئيسية"
                                >
                                  <RotateCcw size={12} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setActiveSnoozeMenuKey(isMenuOpen ? null : alertKey)}
                                  className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-800 rounded-xl transition-all border border-slate-200 cursor-pointer"
                                  title="تأجيل التنبيه / تم التواصل مع الطالب"
                                >
                                  <BellOff size={12} />
                                </button>
                              )}

                              {/* Snooze Context Menu */}
                              <AnimatePresence>
                                {isMenuOpen && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                    className="absolute left-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 space-y-1 text-right"
                                  >
                                    <div className="px-2 py-1 border-b border-slate-100 text-[10px] font-black text-slate-700 flex items-center justify-between">
                                      <span>تأجيل تنبيه الطالب 💤</span>
                                      <button 
                                        type="button" 
                                        onClick={() => setActiveSnoozeMenuKey(null)}
                                        className="text-slate-400 hover:text-slate-600 p-0.5"
                                      >
                                        <X size={11} />
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleSnoozeAlert(alertKey, student.name, 24, '24 ساعة')}
                                      className="w-full text-right px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-900 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <Clock size={12} className="text-amber-600 shrink-0" />
                                      <span>تأجيل لمدة 24 ساعة</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSnoozeAlert(alertKey, student.name, 72, '3 أيام')}
                                      className="w-full text-right px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-900 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <CalendarClock size={12} className="text-indigo-600 shrink-0" />
                                      <span>تأجيل لمدة 3 أيام</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSnoozeAlert(alertKey, student.name, 168, 'أسبوع')}
                                      className="w-full text-right px-2.5 py-1.5 text-[10px] font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-900 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <Calendar size={12} className="text-blue-600 shrink-0" />
                                      <span>تأجيل لمدة أسبوع كامل</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSnoozeAlert(alertKey, student.name, null, 'تم التواصل')}
                                      className="w-full text-right px-2.5 py-1.5 text-[10px] font-black text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all flex items-center gap-1.5 border-t border-slate-100 cursor-pointer pt-1.5"
                                    >
                                      <CheckCheck size={12} className="text-emerald-600 shrink-0" />
                                      <span>تم التواصل (إخفاء التنبيه) ✔️</span>
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>

                        {/* Course Card Detail */}
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-extrabold text-[#1A365D] truncate flex items-center gap-1">
                              <BookOpen size={12} className="text-indigo-600 shrink-0" />
                              <span>{course.title || course.code}</span>
                            </span>
                            <span className="text-slate-400 font-mono font-bold shrink-0">
                              {course.level || 'دورة جماعية'}
                            </span>
                          </div>

                          {/* Hours Progress Bar */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[9px] font-bold text-slate-500">
                              <span>إنجاز الساعات:</span>
                              <span className="font-mono">{completedHours} من {studentAllocatedHours} ساعة ({progressPercentage}%)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  isSnoozed ? 'bg-emerald-500' : progressPercentage >= 90 ? 'bg-amber-500' : 'bg-indigo-600'
                                }`}
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                          </div>

                          {course.classTime && (
                            <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold pt-0.5">
                              <Clock size={11} className="text-slate-400" />
                              <span className="truncate">{course.classTime}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-1 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-2">
                          {/* 1. WhatsApp Reminder */}
                          {hasPhone ? (
                            <a
                              href={getWhatsAppReminderUrl(student, course, remainingSessions)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                // Auto snooze prompt / option after clicking WhatsApp
                                if (!isSnoozed) {
                                  setTimeout(() => {
                                    handleSnoozeAlert(alertKey, student.name, 72, 'تم إرسال واتساب');
                                  }, 500);
                                }
                              }}
                              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1.5 shadow-xs shadow-emerald-600/20"
                            >
                              <MessageCircle size={13} />
                              <span>تذكير واتساب 💬</span>
                            </a>
                          ) : (
                            <span className="px-3 py-2 bg-slate-100 text-slate-400 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 cursor-not-allowed">
                              <Phone size={12} />
                              <span>لا يوجد هاتف</span>
                            </span>
                          )}

                          {/* 2. Direct Log Group Session */}
                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigateToGroupLog) {
                                onNavigateToGroupLog(course.id);
                              }
                            }}
                            className="px-3 py-2 bg-[#1A365D] hover:bg-slate-900 active:scale-95 text-white rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <Calendar size={13} />
                            <span>تسجيل حصة 📝</span>
                          </button>
                        </div>

                        {/* Direct Snooze / Restore text button below */}
                        <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono px-1">
                          {isSnoozed ? (
                            <button
                              type="button"
                              onClick={() => handleRestoreAlert(alertKey, student.name)}
                              className="text-emerald-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <RotateCcw size={10} />
                              <span>إلغاء التأجيل وإعادة التفعيل</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSnoozeAlert(alertKey, student.name, 72, '3 أيام')}
                              className="text-slate-500 hover:text-amber-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <BellOff size={10} />
                              <span>تأجيل التنبيه (تم التواصل)</span>
                            </button>
                          )}
                          {student.phone && (
                            <span className="font-bold text-slate-600 truncate max-w-[120px]">{student.phone}</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
