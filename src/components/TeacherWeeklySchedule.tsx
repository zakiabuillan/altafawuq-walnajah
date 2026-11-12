import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Clock, Users, User, Phone, MessageSquare,
  ChevronRight, ChevronLeft, CalendarDays, BookOpen,
  CheckCircle2, AlertCircle, Sparkles, Filter, Search,
  GraduationCap, ExternalLink, X, MapPin, DollarSign,
  AlertTriangle, Eye, ArrowRight, ShieldCheck, Mail,
  ListFilter, LayoutGrid, CalendarRange
} from 'lucide-react';
import { Session, Student, Teacher, GroupCourse } from '../types';

interface TeacherWeeklyScheduleProps {
  loggedInTeacher: Teacher;
  sessions: Session[];
  students: Student[];
  groupCourses?: GroupCourse[];
  onSelectStudent?: (studentId: string) => void;
  onLogSessionForDate?: (dateStr: string, studentId?: string) => void;
  onEditSession?: (session: Session) => void;
  className?: string;
}

// Arabic Day Names
const ARABIC_DAYS = [
  { key: 0, name: 'الأحد', shortName: 'أحد' },
  { key: 1, name: 'الإثنين', shortName: 'إثنين' },
  { key: 2, name: 'الثلاثاء', shortName: 'ثلاثاء' },
  { key: 3, name: 'الأربعاء', shortName: 'أربعاء' },
  { key: 4, name: 'الخميس', shortName: 'خميس' },
  { key: 5, name: 'الجمعة', shortName: 'جمعة' },
  { key: 6, name: 'السبت', shortName: 'سبت' },
];

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const TeacherWeeklySchedule: React.FC<TeacherWeeklyScheduleProps> = ({
  loggedInTeacher,
  sessions = [],
  students = [],
  groupCourses = [],
  onSelectStudent,
  onLogSessionForDate,
  onEditSession,
  className = ''
}) => {
  // Current anchor date for week calculation (default: today)
  const [currentWeekDate, setCurrentWeekDate] = useState<Date>(() => new Date());
  
  // Selected session for student details modal
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  
  // View mode: 'grid' (weekly columns) or 'list' (sequential agenda)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Filter by subject
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('ALL');
  
  // Filter by session type
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'ALL' | 'individual' | 'group' | 'trial'>('ALL');
  
  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to format Date object into YYYY-MM-DD local string
  const formatLocalDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = useMemo(() => formatLocalDate(new Date()), []);

  // Compute the 7 days of the current week (Sunday to Saturday)
  const weekDays = useMemo(() => {
    const baseDate = new Date(currentWeekDate);
    const dayOfWeek = baseDate.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Start of the week (Sunday)
    const sunday = new Date(baseDate);
    sunday.setDate(baseDate.getDate() - dayOfWeek);
    sunday.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const dateStr = formatLocalDate(d);
      const dayIndex = d.getDay();
      const arabicInfo = ARABIC_DAYS[dayIndex];
      const isToday = dateStr === todayStr;

      days.push({
        date: d,
        dateStr,
        dayName: arabicInfo.name,
        dayShortName: arabicInfo.shortName,
        dayNum: d.getDate(),
        monthNum: d.getMonth() + 1,
        monthName: ARABIC_MONTHS[d.getMonth()],
        year: d.getFullYear(),
        isToday
      });
    }
    return days;
  }, [currentWeekDate, todayStr]);

  // Week range label (e.g. "17 أغسطس - 23 أغسطس 2026")
  const weekRangeLabel = useMemo(() => {
    if (weekDays.length < 7) return '';
    const start = weekDays[0];
    const end = weekDays[6];
    if (start.monthNum === end.monthNum) {
      return `${start.dayNum} - ${end.dayNum} ${start.monthName} ${start.year}`;
    }
    return `${start.dayNum} ${start.monthName} - ${end.dayNum} ${end.monthName} ${end.year}`;
  }, [weekDays]);

  // Week navigation handlers
  const handlePrevWeek = () => {
    const prev = new Date(currentWeekDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentWeekDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentWeekDate);
    next.setDate(next.getDate() + 7);
    setCurrentWeekDate(next);
  };

  const handleToday = () => {
    setCurrentWeekDate(new Date());
  };

  // Helper to determine session type
  const getSessionType = (session: Session): 'group' | 'trial' | 'individual' => {
    if (session.isGroupSession || session.groupId) return 'group';
    const sub = (session.subject || '').toLowerCase();
    const topic = (session.topic || '').toLowerCase();
    const notes = (session.notes || '').toLowerCase();
    if (sub.includes('تجريب') || topic.includes('تجريب') || notes.includes('تجريب') || (session as any).isTrial) {
      return 'trial';
    }
    return 'individual';
  };

  // Filter teacher's sessions for this entire week
  const teacherWeekSessions = useMemo(() => {
    const weekDateStrings = new Set(weekDays.map(d => d.dateStr));
    
    return sessions.filter(s => {
      const isTeacher = s.teacherId === loggedInTeacher.id;
      if (!isTeacher) return false;
      if (!s.date || !weekDateStrings.has(s.date)) return false;
      return true;
    });
  }, [sessions, loggedInTeacher.id, weekDays]);

  // Extract distinct subjects available this week for filtering
  const availableSubjects = useMemo(() => {
    const subs = new Set<string>();
    teacherWeekSessions.forEach(s => {
      if (s.subject && s.subject.trim()) {
        subs.add(s.subject.trim());
      }
    });
    return Array.from(subs);
  }, [teacherWeekSessions]);

  // Apply active filters and search
  const filteredWeekSessions = useMemo(() => {
    return teacherWeekSessions.filter(s => {
      // Filter by subject
      if (selectedSubjectFilter !== 'ALL' && s.subject !== selectedSubjectFilter) {
        return false;
      }

      // Filter by type
      if (selectedTypeFilter !== 'ALL') {
        const type = getSessionType(s);
        if (type !== selectedTypeFilter) return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const student = students.find(std => std.id === s.studentId);
        const studentName = (student?.name || '').toLowerCase();
        const subjectName = (s.subject || '').toLowerCase();
        const topicName = (s.topic || '').toLowerCase();
        const notesName = (s.notes || '').toLowerCase();
        return studentName.includes(q) || subjectName.includes(q) || topicName.includes(q) || notesName.includes(q);
      }

      return true;
    });
  }, [teacherWeekSessions, selectedSubjectFilter, selectedTypeFilter, searchQuery, students]);

  // Group sessions by day string (YYYY-MM-DD)
  const sessionsByDay = useMemo(() => {
    const map: Record<string, Session[]> = {};
    weekDays.forEach(d => {
      map[d.dateStr] = [];
    });

    filteredWeekSessions.forEach(s => {
      if (s.date && map[s.date]) {
        map[s.date].push(s);
      }
    });

    // Sort each day's sessions by start time
    Object.keys(map).forEach(dateStr => {
      map[dateStr].sort((a, b) => {
        const timeA = a.startTime || '00:00';
        const timeB = b.startTime || '00:00';
        return timeA.localeCompare(timeB);
      });
    });

    return map;
  }, [weekDays, filteredWeekSessions]);

  // Weekly KPIs & Summary
  const weeklyKPIs = useMemo(() => {
    const totalSessions = filteredWeekSessions.length;
    const totalHours = filteredWeekSessions.reduce((acc, s) => acc + (Number(s.durationHours) || 0), 0);
    const uniqueStudentIds = new Set(filteredWeekSessions.map(s => s.studentId).filter(Boolean));
    const approvedCount = filteredWeekSessions.filter(s => s.approved || s.status === 'completed').length;
    const pendingCount = totalSessions - approvedCount;

    return {
      totalSessions,
      totalHours: Math.round(totalHours * 10) / 10,
      studentCount: uniqueStudentIds.size,
      approvedCount,
      pendingCount
    };
  }, [filteredWeekSessions]);

  // Selected Student Object for Modal
  const selectedStudentObj = useMemo(() => {
    if (!selectedSession) return null;
    return students.find(s => s.id === selectedSession.studentId) || null;
  }, [selectedSession, students]);

  // Selected Group Course Object if applicable
  const selectedGroupCourseObj = useMemo(() => {
    if (!selectedSession || !selectedSession.groupId) return null;
    return groupCourses.find(c => c.id === selectedSession.groupId) || null;
  }, [selectedSession, groupCourses]);

  // Helper for student balance and remaining session calculation (strictly non-monetary)
  const getStudentStats = (student: Student | null) => {
    if (!student) return { remainingSessions: 0, isOpenBalance: false, pricingSystemText: 'ساعة كاملة' };
    const isOpenBalance = (student as any).paymentStatus === 'open_balance' || (student as any).allowNegativeBalance;
    const balance = Number(student.balance) || 0;
    const is40Min = student.sessionDurationPricingModel === '40min' || (student as any).pricingSystem === '40min';
    const rate = student.hourlyRate || (student.customRates?.[loggedInTeacher.id]) || loggedInTeacher.billingRate || loggedInTeacher.hourlyRate || 80;
    const effectiveRate = is40Min ? (rate * 40 / 60) : rate;
    const remainingSessions = isOpenBalance ? 99 : (effectiveRate > 0 ? Math.floor(balance / effectiveRate) : 0);
    return { 
      remainingSessions, 
      isOpenBalance, 
      pricingSystemText: is40Min ? 'نظام 40 دقيقة' : 'نظام 60 دقيقة' 
    };
  };

  // Construct WhatsApp URL with pre-filled message
  const getWhatsAppLink = (student: Student, session: Session) => {
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

    const message = `السلام عليكم ورحمة الله،
تحية طيبة من أستاذ ${loggedInTeacher.name || 'المادة'} - أكاديمية التفوق 🌟

نود تذكيركم بموعد الحصة الدراسية للطالب: *${student.name}*
📅 التاريخ: *${session.date || ''}*
⏰ التوقيت: *الساعة ${session.startTime || 'المحددة'}*
📚 المادة: *${session.subject || 'الدرس الأكاديمي'}*
⏳ المدة: *${session.durationHours || 1} ساعة*

نتمنى له كل التوفيق والتميز دائماً ✨`;

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className={`space-y-6 text-right ${className}`} dir="rtl" id="teacher-weekly-schedule-root">
      
      {/* 1. Header & Week Navigation Controls */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-[#1A365D]/10 text-blue-800 px-3 py-1 rounded-full font-black flex items-center gap-1.5">
                <CalendarDays size={14} className="text-blue-700" />
                <span>الجدول الزمني الأسبوعي للمعلم 📅</span>
              </span>
              <span className="text-xs font-black text-amber-900 bg-amber-100 px-2.5 py-1 rounded-full font-mono">
                {weeklyKPIs.totalSessions} حصص هذا الأسبوع
              </span>
            </div>
            <h2 className="text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
              <span>جدول الحصص: {weekRangeLabel}</span>
            </h2>
            <p className="text-xs text-slate-500 font-bold mt-1">
              استعرض مواعيد حصصك الأسبوعية، وتابع أوقات الطلاب المنسبين واضغط على أي حصة لاستعراض تفاصيل الطالب المجدول.
            </p>
          </div>

          {/* Navigation Buttons & Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Week Navigators */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={handlePrevWeek}
                className="p-2 hover:bg-white text-slate-700 hover:text-slate-950 rounded-xl transition-all font-black text-xs flex items-center gap-1 cursor-pointer"
                title="الأسبوع السابق"
              >
                <ChevronRight size={16} />
                <span className="hidden sm:inline">السابق</span>
              </button>

              <button
                type="button"
                onClick={handleToday}
                className="px-3 py-1.5 bg-white shadow-xs text-[#1A365D] font-black text-xs rounded-xl hover:bg-blue-50 transition-all cursor-pointer mx-1"
              >
                اليوم
              </button>

              <button
                type="button"
                onClick={handleNextWeek}
                className="p-2 hover:bg-white text-slate-700 hover:text-slate-950 rounded-xl transition-all font-black text-xs flex items-center gap-1 cursor-pointer"
                title="الأسبوع التالي"
              >
                <span className="hidden sm:inline">التالي</span>
                <ChevronLeft size={16} />
              </button>
            </div>

            {/* Date picker jump */}
            <div className="relative">
              <input
                type="date"
                value={formatLocalDate(currentWeekDate)}
                onChange={(e) => {
                  if (e.target.value) {
                    const [y, m, d] = e.target.value.split('-').map(Number);
                    setCurrentWeekDate(new Date(y, m - 1, d));
                  }
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 focus:bg-white focus:border-blue-500 outline-none cursor-pointer"
                title="الانتقال إلى أسبوع محدد"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-black ${
                  viewMode === 'grid' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="عرض الجدول الشبكي"
              >
                <LayoutGrid size={15} />
                <span className="hidden sm:inline">شبكة</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-black ${
                  viewMode === 'list' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="عرض القائمة الزمنية"
              >
                <CalendarRange size={15} />
                <span className="hidden sm:inline">قائمة</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Top Weekly KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black text-slate-600 block">إجمالي الحصص</span>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">في هذا الأسبوع</p>
            </div>
            <div className="text-left">
              <span className="text-xl font-black text-blue-900 font-mono">{weeklyKPIs.totalSessions}</span>
              <span className="text-[9px] text-slate-400 font-bold block">حصة</span>
            </div>
          </div>

          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black text-slate-600 block">ساعات التدريس</span>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">المجدولة والمنجزة</p>
            </div>
            <div className="text-left">
              <span className="text-xl font-black text-amber-900 font-mono">{weeklyKPIs.totalHours}</span>
              <span className="text-[9px] text-slate-400 font-bold block">ساعة</span>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black text-slate-600 block">الطلاب المجدولون</span>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">طلاب منفردون</p>
            </div>
            <div className="text-left">
              <span className="text-xl font-black text-emerald-900 font-mono">{weeklyKPIs.studentCount}</span>
              <span className="text-[9px] text-slate-400 font-bold block">طالب</span>
            </div>
          </div>

          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black text-slate-600 block">الحصص المعتمدة</span>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">{weeklyKPIs.pendingCount} بانتظار الاعتماد</p>
            </div>
            <div className="text-left">
              <span className="text-xl font-black text-indigo-900 font-mono">{weeklyKPIs.approvedCount}</span>
              <span className="text-[9px] text-slate-400 font-bold block">معتمدة</span>
            </div>
          </div>
        </div>

        {/* 3. Search and Quick Filters */}
        <div className="flex flex-col md:flex-row items-center gap-3 pt-1">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الطالب، المادة، أو موضوع الحصة..."
              className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Subject Filter */}
          {availableSubjects.length > 0 && (
            <div className="w-full md:w-48 shrink-0">
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none cursor-pointer"
              >
                <option value="ALL">جميع المواد ({availableSubjects.length})</option>
                {availableSubjects.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          )}

          {/* Session Type Filter */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              type="button"
              onClick={() => setSelectedTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer shrink-0 ${
                selectedTypeFilter === 'ALL' ? 'bg-[#1A365D] text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeFilter('individual')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer shrink-0 ${
                selectedTypeFilter === 'individual' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              👤 فردي
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeFilter('group')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer shrink-0 ${
                selectedTypeFilter === 'group' ? 'bg-purple-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              👥 جماعي
            </button>
            <button
              type="button"
              onClick={() => setSelectedTypeFilter('trial')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer shrink-0 ${
                selectedTypeFilter === 'trial' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              🧪 تجريبي
            </button>
          </div>
        </div>
      </div>

      {/* 4. Weekly View (Grid or List) */}
      {viewMode === 'grid' ? (
        /* Grid Column View (7 Days) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3.5">
          {weekDays.map(day => {
            const daySessions = sessionsByDay[day.dateStr] || [];
            const isToday = day.isToday;

            return (
              <div
                key={day.dateStr}
                className={`rounded-3xl border transition-all flex flex-col min-h-[320px] ${
                  isToday 
                    ? 'bg-blue-50/40 border-blue-400 shadow-md ring-2 ring-blue-400/20' 
                    : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                {/* Day Header */}
                <div className={`p-3.5 rounded-t-3xl border-b text-center transition-all ${
                  isToday 
                    ? 'bg-[#1A365D] text-white border-[#1A365D]' 
                    : 'bg-slate-50/80 text-slate-800 border-slate-150'
                }`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold">{day.dayName}</span>
                    {isToday && (
                      <span className="text-[9px] font-black bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded-md animate-pulse">
                        اليوم
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-baseline justify-center gap-1 font-mono">
                    <span className="text-lg font-black">{day.dayNum}</span>
                    <span className={`text-[10px] font-bold ${isToday ? 'text-blue-200' : 'text-slate-400'}`}>
                      {day.monthName}
                    </span>
                  </div>
                  <div className="mt-1">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full inline-block ${
                      isToday ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                    }`}>
                      {daySessions.length} حصص
                    </span>
                  </div>
                </div>

                {/* Day Sessions Content Area */}
                <div className="p-2.5 flex-1 space-y-2.5 overflow-y-auto max-h-[500px] custom-scrollbar">
                  {daySessions.length === 0 ? (
                    <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-3 text-slate-300">
                      <Clock size={20} className="mb-1 opacity-40" />
                      <span className="text-[10px] font-bold text-slate-400">لا توجد حصص</span>
                      {onLogSessionForDate && (
                        <button
                          type="button"
                          onClick={() => onLogSessionForDate(day.dateStr)}
                          className="mt-2 text-[9px] text-blue-600 hover:text-blue-800 hover:underline font-bold"
                        >
                          + إضافة حصة
                        </button>
                      )}
                    </div>
                  ) : (
                    daySessions.map(session => {
                      const studentObj = students.find(s => s.id === session.studentId);
                      const sessionType = getSessionType(session);
                      const isApproved = session.approved || session.status === 'completed';

                      return (
                        <motion.div
                          key={session.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedSession(session)}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer text-right space-y-2 shadow-xs group relative overflow-hidden ${
                            sessionType === 'group'
                              ? 'bg-purple-50/60 border-purple-200 hover:border-purple-400 hover:shadow-md'
                              : sessionType === 'trial'
                              ? 'bg-amber-50/60 border-amber-300 hover:border-amber-400 hover:shadow-md'
                              : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md'
                          }`}
                        >
                          {/* Accent Side Strip */}
                          <div 
                            className={`absolute top-0 right-0 bottom-0 w-1 ${
                              sessionType === 'group' 
                                ? 'bg-purple-500' 
                                : sessionType === 'trial' 
                                ? 'bg-amber-500' 
                                : 'bg-blue-600'
                            }`}
                          />

                          {/* Time & Duration */}
                          <div className="flex items-center justify-between text-[10px] pr-1.5 font-bold">
                            <span className="flex items-center gap-1 font-mono font-black text-slate-800">
                              <Clock size={11} className="text-slate-400" />
                              <span>{session.startTime || '16:00'}</span>
                            </span>
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                              {session.durationHours || 1} س
                            </span>
                          </div>

                          {/* Student Name */}
                          <div className="pr-1.5">
                            <div className="flex items-center gap-1 text-xs font-black text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                              <User size={12} className="text-slate-400 shrink-0" />
                              <span className="truncate">{studentObj?.name || 'طالب مجهول'}</span>
                            </div>
                          </div>

                          {/* Subject & Status */}
                          <div className="flex flex-wrap items-center justify-between gap-1 pr-1.5 pt-1 border-t border-slate-100">
                            <span className="text-[9px] font-bold text-indigo-900 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded truncate max-w-[90px]">
                              {session.subject || 'مادة تخصصية'}
                            </span>

                            {sessionType === 'group' ? (
                              <span className="text-[8px] font-black text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                                جماعية
                              </span>
                            ) : sessionType === 'trial' ? (
                              <span className="text-[8px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded animate-pulse">
                                تجريبية
                              </span>
                            ) : isApproved ? (
                              <span className="text-[8px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                معتمدة ✓
                              </span>
                            ) : (
                              <span className="text-[8px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                قيد المراجعة
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Sequential List / Agenda View */
        <div className="space-y-4">
          {weekDays.map(day => {
            const daySessions = sessionsByDay[day.dateStr] || [];
            if (daySessions.length === 0) return null;

            return (
              <div key={day.dateStr} className="bg-white rounded-3xl border border-slate-200 p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-full ${day.isToday ? 'bg-blue-600 animate-ping' : 'bg-slate-300'}`} />
                    <h3 className="text-sm font-black text-slate-900">
                      {day.dayName} - {day.dayNum} {day.monthName} {day.year}
                    </h3>
                    {day.isToday && (
                      <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        اليوم ⚡
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-400 font-mono">
                    {daySessions.length} حصص مجدولة
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {daySessions.map(session => {
                    const studentObj = students.find(s => s.id === session.studentId);
                    const sessionType = getSessionType(session);

                    return (
                      <div
                        key={session.id}
                        onClick={() => setSelectedSession(session)}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-400 hover:shadow-md transition-all cursor-pointer space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            <User size={13} className="text-blue-600" />
                            <span>{studentObj?.name || 'طالب مجهول'}</span>
                          </span>
                          <span className="text-[10px] font-mono font-black text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                            {session.startTime || '16:00'} ({session.durationHours || 1} س)
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-extrabold">
                            {session.subject || 'مادة عامة'}
                          </span>
                          {session.topic && (
                            <span className="truncate max-w-[180px] text-slate-600">
                              {session.topic}
                            </span>
                          )}
                        </div>

                        {studentObj?.phone && (
                          <div className="text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-100 flex items-center justify-between">
                            <span>هاتف الطالب:</span>
                            <span className="font-bold text-slate-700">{studentObj.phone}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredWeekSessions.length === 0 && (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-3">
              <Calendar size={32} className="mx-auto text-slate-300" />
              <h3 className="text-sm font-black text-slate-800">لا توجد أي حصص مجدولة لهذا الأسبوع</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto font-bold">
                يمكنك التنقل بين الأسابيع باستخدام الأسهم في الأعلى أو تسجيل حصة دراسية جديدة.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 5. Comprehensive Student & Session Detail Modal */}
      <AnimatePresence>
        {selectedSession && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-[250] p-4 animate-fade-in" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white border border-slate-200 rounded-[2.5rem] p-6 sm:p-7 shadow-2xl space-y-5 text-right max-w-lg w-full relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1A365D] to-blue-600 text-white flex items-center justify-center shadow-md">
                    <GraduationCap size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-black">
                      تفاصيل الطالب والحصة المجدولة 📋
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-0.5">
                      {selectedStudentObj?.name || 'بيانات الطالب'}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSession(null)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Student Profile Card */}
              {selectedStudentObj ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold border-b border-slate-200/80 pb-2">
                    <span className="text-slate-500">المرحلة الأكاديمية:</span>
                    <span className="font-black text-[#1A365D]">
                      {selectedStudentObj.academicLevel || selectedStudentObj.grade || 'طالب مسجل'}
                    </span>
                  </div>

                  {selectedStudentObj.phone && (
                    <div className="flex items-center justify-between text-xs font-bold border-b border-slate-200/80 pb-2">
                      <span className="text-slate-500">رقم الهاتف:</span>
                      <span className="font-mono font-black text-slate-800" dir="ltr">
                        {selectedStudentObj.phone}
                      </span>
                    </div>
                  )}

                  {selectedStudentObj.email && (
                    <div className="flex items-center justify-between text-xs font-bold border-b border-slate-200/80 pb-2">
                      <span className="text-slate-500">البريد الإلكتروني:</span>
                      <span className="font-mono text-slate-700 truncate max-w-[200px]" dir="ltr">
                        {selectedStudentObj.email}
                      </span>
                    </div>
                  )}

                  {/* Student Remaining Sessions Stats (Strictly NO monetary data) */}
                  {(() => {
                    const { remainingSessions, isOpenBalance, pricingSystemText } = getStudentStats(selectedStudentObj);
                    const isLow = remainingSessions <= 1 && !isOpenBalance;
                    const isDepleted = remainingSessions <= 0 && !isOpenBalance;
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-center font-bold">
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-[10px] text-slate-400 block mb-0.5">الحصص المتبقية للطالب</span>
                          {isOpenBalance ? (
                            <span className="text-xs font-black text-emerald-700">رصيد مفتوح من المدير 🔓</span>
                          ) : (
                            <span className={`text-sm font-mono font-black ${
                              isDepleted ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-700'
                            }`}>
                              {remainingSessions} حصص
                            </span>
                          )}
                        </div>

                        <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                          <span className="text-[10px] text-slate-400 block mb-0.5">حالة الرصيد</span>
                          <span className={`text-xs font-bold ${
                            isOpenBalance ? 'text-emerald-700 font-black' : isDepleted ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-700'
                          }`}>
                            {isOpenBalance ? 'رصيد مفتوح من المدير 🔓' : isDepleted ? 'نفد رصيد الحصص ⚠️' : isLow ? 'حصة واحدة متبقية ⚠️' : 'رصيد كافٍ متاح ✅'}
                          </span>
                        </div>

                        <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
                          <span className="text-[10px] text-slate-400 block mb-0.5">نظام الحصة</span>
                          <span className="text-xs font-mono font-bold text-slate-700">
                            {pricingSystemText}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-400 font-bold">
                  لم يتم العثور على سجل مخصص لهذا الطالب.
                </div>
              )}

              {/* Scheduled Session Details */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Clock size={14} className="text-[#D4A33C]" />
                  <span>تفاصيل الموعد والمادة الدراسية</span>
                </h4>

                <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-2xl space-y-2 text-xs font-bold">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">تاريخ الحصة:</span>
                    <span className="font-black text-[#1A365D] font-mono">{selectedSession.date || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">وقت البدء:</span>
                    <span className="font-black text-[#1A365D] font-mono">{selectedSession.startTime || '16:00'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">مدة الحصة:</span>
                    <span className="font-black text-slate-800">{selectedSession.durationHours || 1} ساعة</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">المادة الدراسية:</span>
                    <span className="font-black text-indigo-900 bg-indigo-100/70 px-2 py-0.5 rounded-md">
                      {selectedSession.subject || 'مادة تخصصية'}
                    </span>
                  </div>
                  {selectedSession.topic && (
                    <div className="flex items-start justify-between gap-2 pt-1 border-t border-blue-100">
                      <span className="text-slate-500 shrink-0">الموضوع:</span>
                      <span className="font-extrabold text-slate-800 text-left">{selectedSession.topic}</span>
                    </div>
                  )}
                  {selectedSession.notes && (
                    <div className="pt-2 border-t border-blue-100 text-[11px] leading-relaxed text-slate-600">
                      <strong className="text-slate-800 block mb-0.5">ملاحظات المعلم / مخرجات الدرس:</strong>
                      <p className="bg-white p-2.5 rounded-xl border border-blue-100">{selectedSession.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Direct Communication & Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedStudentObj?.phone ? (
                    <a
                      href={getWhatsAppLink(selectedStudentObj, selectedSession)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <MessageSquare size={15} />
                      <span>تواصل واتساب 💬</span>
                    </a>
                  ) : null}

                  {selectedStudentObj?.phone ? (
                    <a
                      href={`tel:${selectedStudentObj.phone.replace(/[^0-9+]/g, '')}`}
                      className="py-3 px-4 bg-[#1A365D] hover:bg-slate-900 text-white font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Phone size={15} />
                      <span>اتصال هاتفي 📞</span>
                    </a>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 justify-end pt-1">
                  {onSelectStudent && selectedStudentObj && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectStudent(selectedStudentObj.id);
                        setSelectedSession(null);
                      }}
                      className="flex-1 py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition-all cursor-pointer"
                    >
                      عرض الملف الأكاديمي للطالب 👤
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedSession(null)}
                    className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
