import React, { useState, useMemo } from 'react';
import { Teacher, Session, Student, Payment, StudentCredit, Expense, GroupCourse, calculateTeacherSessionPayout, isTrialSession } from '../types';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  Cell, PieChart, Pie, Legend, AreaChart, Area, CartesianGrid 
} from 'recharts';
import { 
  Trophy, BookOpen, Users, Clock, TrendingUp, Award, 
  Sparkles, Calendar, Filter, ChevronLeft, ChevronRight, 
  CheckCircle2, ArrowUpRight, BarChart3, PieChart as PieChartIcon, 
  GraduationCap, Layers, Star, Flame, Zap, FileText, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MonthlyFinancialReportModal } from './MonthlyFinancialReportModal';
import { getStudentDefaultHourlyRate } from '../lib/sessionPricing';

interface MonthlyPerformanceSummaryDashboardProps {
  teachers: Teacher[];
  sessions: Session[];
  students: Student[];
  assignments?: any[];
  payments?: Payment[];
  credits?: StudentCredit[];
  expenses?: Expense[];
  groupCourses?: GroupCourse[];
  globalSettings?: any;
  onOpenMonthlyFinancialReport?: (year: number, month: number) => void;
}

const SUBJECT_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#6366F1', // Indigo
];

const TEACHER_COLORS = [
  '#0D365A', // Navy
  '#D4A33C', // Gold
  '#059669', // Emerald
  '#7C3AED', // Violet
  '#DB2777', // Rose
];

export const MonthlyPerformanceSummaryDashboard: React.FC<MonthlyPerformanceSummaryDashboardProps> = ({
  teachers,
  sessions,
  students,
  assignments = [],
  payments = [],
  credits = [],
  expenses = [],
  groupCourses = [],
  globalSettings,
  onOpenMonthlyFinancialReport,
}) => {
  // Current Month / Year Default
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [subjectMetric, setSubjectMetric] = useState<'sessions' | 'hours'>('sessions');
  const [teacherMetric, setTeacherMetric] = useState<'hours' | 'sessions' | 'earnings'>('hours');
  const [chartViewType, setChartViewType] = useState<'bar' | 'pie'>('bar');
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const monthsArabic = [
    'يناير (1)', 'فبراير (2)', 'مارس (3)', 'أبريل (4)', 'مايو (5)', 'يونيو (6)',
    'يوليو (7)', 'أغسطس (8)', 'سبتمبر (9)', 'أكتوبر (10)', 'نوفمبر (11)', 'ديسمبر (12)'
  ];

  const monthFormatted = String(selectedMonth).padStart(2, '0');
  const monthPrefix = `${selectedYear}-${monthFormatted}`;

  // Filter approved sessions for the selected month
  const monthSessions = useMemo(() => {
    return sessions.filter(s => {
      if (!s.date) return false;
      if (s.approved === false) return false;
      return s.date.startsWith(monthPrefix);
    });
  }, [sessions, monthPrefix]);

  // Quick helper to resolve student rate & teacher rate
  const getSessionCost = (session: Session) => {
    if (isTrialSession(session)) return 0;
    if (session.customFee !== undefined && session.customFee !== null) return Number(session.customFee);
    const student = students.find(s => s.id === session.studentId);
    const teacher = teachers.find(t => t.id === session.teacherId);
    const rate = getStudentDefaultHourlyRate(student, globalSettings, teacher);
    const hours = Number(session.durationHours) || 0;
    return hours * rate;
  };

  const getTeacherPayout = (session: Session) => {
    const teacher = teachers.find(t => t.id === session.teacherId);
    const defaultRate = globalSettings?.defaultTeacherHourlyRate || 35;
    return calculateTeacherSessionPayout(session, teacher, assignments, defaultRate);
  };

  // 1. Top 5 Most Requested Subjects Analysis
  const topSubjectsData = useMemo(() => {
    const subjectMap: Record<string, {
      subject: string;
      sessionCount: number;
      totalHours: number;
      studentIds: Set<string>;
      teacherIds: Set<string>;
      totalRevenue: number;
    }> = {};

    let totalSessionsCount = 0;
    let totalHoursCount = 0;

    monthSessions.forEach(s => {
      // Resolve subject name cleanly
      const rawSubject = (s.subject || s.topic || s.courseCode || 'مساق دراسي عام').trim();
      const subjectName = rawSubject.length > 0 ? rawSubject : 'مساق دراسي عام';

      if (!subjectMap[subjectName]) {
        subjectMap[subjectName] = {
          subject: subjectName,
          sessionCount: 0,
          totalHours: 0,
          studentIds: new Set<string>(),
          teacherIds: new Set<string>(),
          totalRevenue: 0,
        };
      }

      const sessionHours = Number(s.durationHours) || 0;
      subjectMap[subjectName].sessionCount += 1;
      subjectMap[subjectName].totalHours += sessionHours;
      if (s.studentId) subjectMap[subjectName].studentIds.add(s.studentId);
      if (s.teacherId) subjectMap[subjectName].teacherIds.add(s.teacherId);
      subjectMap[subjectName].totalRevenue += getSessionCost(s);

      totalSessionsCount += 1;
      totalHoursCount += sessionHours;
    });

    const allSubjects = Object.values(subjectMap).map(item => ({
      name: item.subject,
      sessions: item.sessionCount,
      hours: Number(item.totalHours.toFixed(1)),
      studentsCount: item.studentIds.size,
      teachersCount: item.teacherIds.size,
      revenue: Math.round(item.totalRevenue),
      sharePercentage: totalSessionsCount > 0 
        ? Math.round((item.sessionCount / totalSessionsCount) * 100) 
        : 0,
      hoursPercentage: totalHoursCount > 0 
        ? Math.round((item.totalHours / totalHoursCount) * 100) 
        : 0,
    }));

    // Sort according to metric
    const sorted = allSubjects.sort((a, b) => {
      if (subjectMetric === 'sessions') return b.sessions - a.sessions;
      return b.hours - a.hours;
    });

    return {
      top5: sorted.slice(0, 5),
      totalSubjectsCount: sorted.length,
      totalMonthSessions: totalSessionsCount,
      totalMonthHours: Number(totalHoursCount.toFixed(1)),
      allSubjects: sorted
    };
  }, [monthSessions, subjectMetric, students, teachers, globalSettings]);

  // 2. Top 5 Most Productive Teachers Analysis
  const topTeachersData = useMemo(() => {
    const teacherMap: Record<string, {
      teacherId: string;
      name: string;
      hours: number;
      sessionsCount: number;
      uniqueStudents: Set<string>;
      subjectsTaught: Set<string>;
      totalEarned: number;
      specialization: string;
    }> = {};

    let totalHoursAllTeachers = 0;
    let totalSessionsAllTeachers = 0;

    monthSessions.forEach(s => {
      const teacherId = s.teacherId;
      if (!teacherId) return;

      const teacherObj = teachers.find(t => t.id === teacherId);
      const teacherName = teacherObj?.name || 'أستاذ غير مسجل';
      const teacherSpec = teacherObj?.specialization || (teacherObj?.subjects && teacherObj.subjects.join('، ')) || 'كادر التدريس الأكاديمي';

      if (!teacherMap[teacherId]) {
        teacherMap[teacherId] = {
          teacherId,
          name: teacherName,
          hours: 0,
          sessionsCount: 0,
          uniqueStudents: new Set<string>(),
          subjectsTaught: new Set<string>(),
          totalEarned: 0,
          specialization: teacherSpec,
        };
      }

      const duration = Number(s.durationHours) || 0;
      teacherMap[teacherId].hours += duration;
      teacherMap[teacherId].sessionsCount += 1;
      if (s.studentId) teacherMap[teacherId].uniqueStudents.add(s.studentId);
      if (s.subject || s.topic) teacherMap[teacherId].subjectsTaught.add((s.subject || s.topic)!);
      teacherMap[teacherId].totalEarned += getTeacherPayout(s);

      totalHoursAllTeachers += duration;
      totalSessionsAllTeachers += 1;
    });

    const allTeachers = Object.values(teacherMap).map(item => {
      // Calculate productivity score out of 100
      // Factors: Hours (60%), unique students (20%), session volume (20%)
      const hoursScore = Math.min(60, (item.hours / 40) * 60);
      const studentsScore = Math.min(20, (item.uniqueStudents.size / 10) * 20);
      const sessionsScore = Math.min(20, (item.sessionsCount / 30) * 20);
      const score = Math.min(100, Math.round(hoursScore + studentsScore + sessionsScore));

      return {
        id: item.teacherId,
        name: item.name,
        hours: Number(item.hours.toFixed(1)),
        sessions: item.sessionsCount,
        studentsCount: item.uniqueStudents.size,
        subjectsCount: item.subjectsTaught.size,
        subjectsList: Array.from(item.subjectsTaught).slice(0, 3).join('، '),
        earnings: Math.round(item.totalEarned),
        specialization: item.specialization,
        productivityScore: score || 75,
        hoursShare: totalHoursAllTeachers > 0 ? Math.round((item.hours / totalHoursAllTeachers) * 100) : 0,
      };
    });

    // Sort by selected metric
    const sorted = allTeachers.sort((a, b) => {
      if (teacherMetric === 'hours') return b.hours - a.hours;
      if (teacherMetric === 'sessions') return b.sessions - a.sessions;
      return b.earnings - a.earnings;
    });

    return {
      top5: sorted.slice(0, 5),
      activeTeachersCount: sorted.length,
      totalHours: Number(totalHoursAllTeachers.toFixed(1)),
      totalSessions: totalSessionsAllTeachers,
    };
  }, [monthSessions, teacherMetric, teachers, globalSettings]);

  // Set month to current or previous
  const setToCurrentMonth = () => {
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonth);
  };

  const setToPreviousMonth = () => {
    if (currentMonth === 1) {
      setSelectedYear(currentYear - 1);
      setSelectedMonth(12);
    } else {
      setSelectedYear(currentYear);
      setSelectedMonth(currentMonth - 1);
    }
  };

  const isCurrentMonthActive = selectedYear === currentYear && selectedMonth === currentMonth;

  return (
    <div className="space-y-8 text-right" dir="rtl" id="monthly-performance-dashboard">
      
      {/* 1. Header Banner & Month Navigator */}
      <div className="bg-gradient-to-l from-[#0D365A] via-slate-900 to-[#0A2540] text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#D4A33C]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#D4A33C]/20 text-[#D4A33C] text-[10px] font-black rounded-full border border-[#D4A33C]/30 flex items-center gap-1">
                <Sparkles size={12} />
                <span>لوحة الأداء والإنتاجية الشهرية</span>
              </span>
              {isCurrentMonthActive && (
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-black rounded-full border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>الشهر الحالي المباشر</span>
                </span>
              )}
            </div>

            <h3 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Award className="text-[#D4A33C]" size={26} />
              <span>أكثر 5 مواد طلباً وأكثر المعلمين إنتاجية</span>
            </h3>
            <p className="text-xs text-slate-350 font-bold max-w-2xl leading-relaxed">
              تحليل بياني وإحصائي دقيق للمساقات الدراسية الأكثر طلباً من قبل الطلاب وكفاءة تدريس الأساتذة لشهر ({monthsArabic[selectedMonth - 1]} {selectedYear}).
            </p>
          </div>

          {/* Month / Year Control Bar */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/80 p-2 rounded-2xl border border-slate-700/80 backdrop-blur-md">
            <button
              onClick={setToCurrentMonth}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                isCurrentMonthActive 
                  ? 'bg-[#D4A33C] text-slate-950 shadow-md font-black' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              هذا الشهر ⚡
            </button>

            <button
              onClick={setToPreviousMonth}
              className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                !isCurrentMonthActive && selectedMonth === (currentMonth === 1 ? 12 : currentMonth - 1)
                  ? 'bg-[#D4A33C] text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              الشهر الماضي
            </button>

            <div className="h-6 w-px bg-slate-700 mx-1" />

            {/* Custom Month Selector */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="bg-slate-800 text-white text-xs font-black px-3 py-2 rounded-xl border border-slate-700 outline-none focus:border-[#D4A33C] cursor-pointer"
            >
              {monthsArabic.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>{m}</option>
              ))}
            </select>

            {/* Custom Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-slate-800 text-white text-xs font-black px-3 py-2 rounded-xl border border-slate-700 outline-none focus:border-[#D4A33C] cursor-pointer font-mono"
            >
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            <div className="h-6 w-px bg-slate-700 mx-1 hidden sm:block" />

            {/* Quick Monthly Financial PDF Export Button */}
            <button
              onClick={() => {
                if (onOpenMonthlyFinancialReport) {
                  onOpenMonthlyFinancialReport(selectedYear, selectedMonth);
                } else {
                  setIsPdfModalOpen(true);
                }
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md cursor-pointer border border-blue-400 select-none hover:scale-[1.02] active:scale-[0.98]"
              title={`تحميل التقرير المالي لشهر ${monthsArabic[selectedMonth - 1]} ${selectedYear} بصيغة PDF يتضمن المصاريف التشغيلية والأرباح`}
              id="monthly-pdf-report-trigger-btn"
            >
              <FileText size={13} className="text-blue-200" />
              <span>تقرير مالي شهري PDF 📄</span>
            </button>
          </div>
        </div>

        {/* 4 Summary Stats Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3.5">
            <span className="text-[10px] text-slate-400 font-bold block">إجمالي حصص الشهر</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-black text-white font-mono">{topSubjectsData.totalMonthSessions}</span>
              <span className="text-[10px] text-slate-400 font-bold">حصة منفذة</span>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3.5">
            <span className="text-[10px] text-slate-400 font-bold block">ساعات التدريس المنجزة</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-black text-[#D4A33C] font-mono">{topSubjectsData.totalMonthHours}</span>
              <span className="text-[10px] text-slate-400 font-bold">ساعة</span>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3.5">
            <span className="text-[10px] text-slate-400 font-bold block">المادة الأكثر طلباً 🥇</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-sm font-black text-blue-400 truncate max-w-[130px]" title={topSubjectsData.top5[0]?.name}>
                {topSubjectsData.top5[0]?.name || '—'}
              </span>
              {topSubjectsData.top5[0] && (
                <span className="text-[10px] text-blue-300 font-bold font-mono">({topSubjectsData.top5[0].sharePercentage}%)</span>
              )}
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3.5">
            <span className="text-[10px] text-slate-400 font-bold block">المعلم الأعلى إنتاجية 🌟</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-sm font-black text-emerald-400 truncate max-w-[130px]" title={topTeachersData.top5[0]?.name}>
                {topTeachersData.top5[0]?.name || '—'}
              </span>
              {topTeachersData.top5[0] && (
                <span className="text-[10px] text-emerald-300 font-bold font-mono">({topTeachersData.top5[0].hours} س)</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main 2-Column Content Grid: Left: Top Subjects, Right: Top Teachers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* ================= SECTION A: TOP 5 SUBJECTS ================= */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6 flex flex-col justify-between">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                <BookOpen size={22} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>أكثر 5 مواد دراسية طلباً</span>
                  <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-black">
                    Top 5 Subjects
                  </span>
                </h4>
                <p className="text-xs text-slate-400 font-bold mt-0.5">
                  حجم الطلب والحصص المحجوزة للمواد خلال {monthsArabic[selectedMonth - 1]}
                </p>
              </div>
            </div>

            {/* Metric Toggle & Chart view mode */}
            <div className="flex items-center gap-2">
              <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-[11px] font-black">
                <button
                  onClick={() => setSubjectMetric('sessions')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    subjectMetric === 'sessions'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  الحصص
                </button>
                <button
                  onClick={() => setSubjectMetric('hours')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    subjectMetric === 'hours'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  الساعات
                </button>
              </div>

              <button
                onClick={() => setChartViewType(chartViewType === 'bar' ? 'pie' : 'bar')}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer"
                title={chartViewType === 'bar' ? 'التحويل إلى مخطط دائري' : 'التحويل إلى مخطط أعمدة'}
              >
                {chartViewType === 'bar' ? <PieChartIcon size={16} /> : <BarChart3 size={16} />}
              </button>
            </div>
          </div>

          {/* Visual Chart Component */}
          {topSubjectsData.top5.length > 0 ? (
            <div className="space-y-6">
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  {chartViewType === 'bar' ? (
                    <BarChart
                      data={topSubjectsData.top5}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 'bold' }} />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        tick={{ fontSize: 11, fill: '#1E293B', fontWeight: 'bold' }} 
                        width={90}
                        orientation="right"
                      />
                      <Tooltip
                        formatter={(val: any) => [
                          `${val} ${subjectMetric === 'sessions' ? 'حصة' : 'ساعة'}`,
                          subjectMetric === 'sessions' ? 'عدد الحصص' : 'ساعات التدريس'
                        ]}
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '16px',
                          color: '#FFFFFF',
                          fontFamily: 'Cairo, sans-serif',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          textAlign: 'right',
                          direction: 'rtl',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                        }}
                      />
                      <Bar 
                        dataKey={subjectMetric === 'sessions' ? 'sessions' : 'hours'} 
                        radius={[8, 0, 0, 8]}
                      >
                        {topSubjectsData.top5.map((entry, index) => (
                          <Cell key={`cell-subj-${index}`} fill={SUBJECT_COLORS[index % SUBJECT_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <PieChart>
                      <Pie
                        data={topSubjectsData.top5}
                        dataKey={subjectMetric === 'sessions' ? 'sessions' : 'hours'}
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={4}
                      >
                        {topSubjectsData.top5.map((entry, index) => (
                          <Cell key={`cell-pie-${index}`} fill={SUBJECT_COLORS[index % SUBJECT_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any, name: any) => [
                          `${val} ${subjectMetric === 'sessions' ? 'حصة' : 'ساعة'}`,
                          name
                        ]}
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '16px',
                          color: '#FFFFFF',
                          fontFamily: 'Cairo, sans-serif',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          textAlign: 'right',
                          direction: 'rtl'
                        }}
                      />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Ranked Detailed List */}
              <div className="space-y-2.5 pt-2">
                <span className="text-[11px] font-black text-slate-500 block mb-2">ترتيب المواد الأكثر طلباً وتفاصيلها:</span>
                {topSubjectsData.top5.map((subject, index) => {
                  const rankIcons = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                  const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];
                  
                  return (
                    <div 
                      key={subject.name}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-150 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-base select-none">{rankIcons[index]}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span 
                              className="w-2.5 h-2.5 rounded-full shrink-0" 
                              style={{ backgroundColor: color }} 
                            />
                            <h5 className="text-xs font-black text-slate-900">{subject.name}</h5>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-bold">
                            <span>{subject.studentsCount} طالب</span>
                            <span>•</span>
                            <span>{subject.teachersCount} معلم</span>
                            <span>•</span>
                            <span>₪{subject.revenue.toLocaleString()} إيراد</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-left">
                        <div>
                          <div className="text-xs font-black text-slate-900 font-mono">
                            {subjectMetric === 'sessions' ? `${subject.sessions} حصة` : `${subject.hours} ساعة`}
                          </div>
                          <div className="text-[10px] font-extrabold text-blue-600 font-mono">
                            {subjectMetric === 'sessions' ? `${subject.sharePercentage}% من الطلب` : `${subject.hoursPercentage}% من الساعات`}
                          </div>
                        </div>

                        {/* Progress visual bar */}
                        <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden shrink-0 hidden sm:block">
                          <div 
                            className="h-full rounded-full transition-all duration-500"
                            style={{ 
                              width: `${subject.sharePercentage}%`,
                              backgroundColor: color 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-full bg-slate-200/60 text-slate-400 flex items-center justify-center mx-auto">
                <BookOpen size={22} />
              </div>
              <p className="text-xs font-black text-slate-500">لا توجد حصص مسجلة في هذا الشهر حتى الآن.</p>
              <p className="text-[10px] font-bold text-slate-400">سوف تظهر الإحصائيات فور تسجيل الحصص وإعتمادها.</p>
            </div>
          )}
        </div>

        {/* ================= SECTION B: TOP 5 TEACHERS ================= */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm space-y-6 flex flex-col justify-between">
          
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                <Trophy size={22} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>أكثر 5 معلمين إنتاجية</span>
                  <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-black">
                    Top 5 Teachers
                  </span>
                </h4>
                <p className="text-xs text-slate-400 font-bold mt-0.5">
                  كفاءة التدريس وساعات الإنجاز للشهر الجاري ({monthsArabic[selectedMonth - 1]})
                </p>
              </div>
            </div>

            {/* Metric Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-[11px] font-black">
              <button
                onClick={() => setTeacherMetric('hours')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  teacherMetric === 'hours'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                الساعات
              </button>
              <button
                onClick={() => setTeacherMetric('sessions')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  teacherMetric === 'sessions'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                الحصص
              </button>
              <button
                onClick={() => setTeacherMetric('earnings')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  teacherMetric === 'earnings'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                المستحقات
              </button>
            </div>
          </div>

          {/* Visual Chart Component */}
          {topTeachersData.top5.length > 0 ? (
            <div className="space-y-6">
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topTeachersData.top5}
                    margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10, fill: '#1E293B', fontWeight: 'bold' }} 
                      angle={-15}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B', fontWeight: 'bold' }} />
                    <Tooltip
                      formatter={(val: any) => [
                        teacherMetric === 'hours' 
                          ? `${val} ساعة تدريس` 
                          : teacherMetric === 'sessions' 
                          ? `${val} حصة منفذة` 
                          : `₪${val} مستحقات مكتسبة`,
                        teacherMetric === 'hours' 
                          ? 'إجمالي الساعات' 
                          : teacherMetric === 'sessions' 
                          ? 'عدد الحصص' 
                          : 'المستحقات المالية'
                      ]}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '16px',
                        color: '#FFFFFF',
                        fontFamily: 'Cairo, sans-serif',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textAlign: 'right',
                        direction: 'rtl',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                      }}
                    />
                    <Bar 
                      dataKey={teacherMetric === 'hours' ? 'hours' : teacherMetric === 'sessions' ? 'sessions' : 'earnings'} 
                      radius={[8, 8, 0, 0]}
                    >
                      {topTeachersData.top5.map((entry, index) => (
                        <Cell key={`cell-teach-${index}`} fill={TEACHER_COLORS[index % TEACHER_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Ranked Detailed List of Top Teachers */}
              <div className="space-y-2.5 pt-2">
                <span className="text-[11px] font-black text-slate-500 block mb-2">لوحة الشرف وتصنيف المعلمين الأكثر عطاءً:</span>
                {topTeachersData.top5.map((teacher, index) => {
                  const rankIcons = ['👑 #1', '🥈 #2', '🥉 #3', '⭐ #4', '⭐ #5'];
                  const color = TEACHER_COLORS[index % TEACHER_COLORS.length];
                  
                  return (
                    <div 
                      key={teacher.id}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-150 transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank Badge */}
                        <div className={`px-2 py-1 rounded-xl text-[10px] font-black text-center min-w-[42px] ${
                          index === 0 
                            ? 'bg-amber-500/20 text-amber-800 border border-amber-500/30' 
                            : 'bg-slate-200/80 text-slate-700'
                        }`}>
                          {rankIcons[index]}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-black text-slate-900">{teacher.name}</h5>
                            {index === 0 && (
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-black">
                                المتصدر 🌟
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-bold">
                            <span>{teacher.studentsCount} طالب مميز</span>
                            <span>•</span>
                            <span>{teacher.sessions} حصة</span>
                            {teacher.subjectsList && (
                              <>
                                <span>•</span>
                                <span className="text-indigo-600 truncate max-w-[120px]">{teacher.subjectsList}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-left">
                        <div>
                          <div className="text-xs font-black text-slate-900 font-mono">
                            {teacherMetric === 'hours' 
                              ? `${teacher.hours} ساعة` 
                              : teacherMetric === 'sessions' 
                              ? `${teacher.sessions} حصة` 
                              : `₪${teacher.earnings.toLocaleString()}`}
                          </div>
                          <div className="text-[10px] font-extrabold text-emerald-600 font-mono">
                            {teacher.hoursShare}% من إجمالي الساعات
                          </div>
                        </div>

                        {/* Productivity Score Badge */}
                        <div className="px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-xl text-center hidden sm:block shrink-0">
                          <span className="text-[8px] text-indigo-400 block font-bold leading-none">معدل الإنجاز</span>
                          <span className="text-xs font-black text-indigo-700 font-mono leading-none">{teacher.productivityScore}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <div className="w-12 h-12 rounded-full bg-slate-200/60 text-slate-400 flex items-center justify-center mx-auto">
                <Trophy size={22} />
              </div>
              <p className="text-xs font-black text-slate-500">لا توجد سجلات إنتاجية للمعلمين في هذا الشهر.</p>
              <p className="text-[10px] font-bold text-slate-400">ستظهر لوحة الإنتاجية تلقائياً فور توثيق الحصص الدراسية.</p>
            </div>
          )}
        </div>

      </div>

      {/* Monthly Financial Report Modal */}
      <MonthlyFinancialReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        initialYear={selectedYear}
        initialMonth={selectedMonth}
        teachers={teachers}
        students={students}
        sessions={sessions}
        payments={payments}
        credits={credits}
        expenses={expenses}
        groupCourses={groupCourses}
        globalSettings={globalSettings}
      />
    </div>
  );
};
