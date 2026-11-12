import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  GraduationCap, 
  CalendarCheck2, 
  TrendingUp, 
  BarChart3, 
  Sparkles, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  ChevronLeft,
  Calendar,
  Layers,
  UserCheck,
  Zap
} from 'lucide-react';
import { Student, Teacher, Session, StudentStatus } from '../types';

interface AdminTopStatsSectionProps {
  students: Student[];
  teachers: Teacher[];
  sessions: Session[];
  onNavigateToTab?: (tab: string) => void;
  onOpenNotifications?: () => void;
}

const ARABIC_MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const AdminTopStatsSection: React.FC<AdminTopStatsSectionProps> = ({
  students,
  teachers,
  sessions,
  onNavigateToTab,
  onOpenNotifications
}) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  const monthName = ARABIC_MONTH_NAMES[currentMonth] || '';

  // 1. Total active students
  const activeStudentsCount = useMemo(() => {
    return students.filter(s => {
      if (s.archived) return false;
      const statusStr = String(s.status || '').toLowerCase();
      if (statusStr === 'archived') return false;
      if (s.academicStatus === 'Paused') return false;
      return true;
    }).length;
  }, [students]);

  // Total students overall
  const totalStudentsCount = students.length;
  const activeStudentsPercentage = totalStudentsCount > 0 
    ? Math.round((activeStudentsCount / totalStudentsCount) * 100) 
    : 100;

  // 2. Total teachers
  const totalTeachersCount = teachers.length;
  const activeTeachersCount = useMemo(() => {
    // Teachers with active status or with logged sessions
    return teachers.filter(t => !t.status || t.status.toLowerCase() !== 'inactive').length;
  }, [teachers]);

  // 3. Completed sessions this month
  const currentMonthSessions = useMemo(() => {
    return sessions.filter(s => {
      if (!s.date) return false;
      const isCompleted = s.status === 'completed' || (!s.status && s.approved);
      if (!isCompleted) return false;

      const d = new Date(s.date);
      if (isNaN(d.getTime())) return false;
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [sessions, currentYear, currentMonth]);

  const completedSessionsCount = currentMonthSessions.length;

  const totalCompletedHours = useMemo(() => {
    return currentMonthSessions.reduce((acc, s) => {
      const dur = Number(s.durationHours) || (s.pricingUnit === 'session_40' ? (40 / 60) : 1);
      return acc + dur;
    }, 0);
  }, [currentMonthSessions]);

  const averageSessionsPerWeek = completedSessionsCount > 0 
    ? (completedSessionsCount / 4).toFixed(1) 
    : '0';

  // 4. Active teachers who completed sessions this month and their performance
  const activeTeachingStaffStats = useMemo(() => {
    const teacherSessionCounts: Record<string, { count: number; hours: number }> = {};
    currentMonthSessions.forEach(s => {
      const tId = s.teacherId;
      if (!tId) return;
      if (!teacherSessionCounts[tId]) {
        teacherSessionCounts[tId] = { count: 0, hours: 0 };
      }
      teacherSessionCounts[tId].count += 1;
      const dur = Number(s.durationHours) || (s.pricingUnit === 'session_40' ? (40 / 60) : 1);
      teacherSessionCounts[tId].hours += dur;
    });

    const activeIdsWithSessions = Object.keys(teacherSessionCounts);
    const activeWithSessionsCount = activeIdsWithSessions.length;
    // Active teachers count on roster
    const activeRosterCount = teachers.filter(t => !t.status || t.status.toLowerCase() !== 'inactive').length;
    
    // Total sessions completed by active teachers this month
    const totalSessions = currentMonthSessions.length;
    
    // Average sessions per active teacher
    const avgPerActiveTeacher = activeWithSessionsCount > 0 
      ? (totalSessions / activeWithSessionsCount).toFixed(1) 
      : (activeRosterCount > 0 ? (totalSessions / activeRosterCount).toFixed(1) : '0');

    // Engagement percentage
    const engagementRate = totalTeachersCount > 0 
      ? Math.round((activeWithSessionsCount / totalTeachersCount) * 100)
      : (activeRosterCount > 0 ? Math.round((activeRosterCount / totalTeachersCount) * 100) : 100);

    return {
      activeWithSessionsCount,
      activeRosterCount,
      totalSessions,
      avgPerActiveTeacher,
      engagementRate
    };
  }, [currentMonthSessions, teachers, totalTeachersCount]);

  return (
    <div 
      className="bg-gradient-to-br from-slate-900 via-[#101b2e] to-[#0c1322] border border-slate-750 rounded-3xl p-5 md:p-6 shadow-2xl text-white relative overflow-hidden select-none"
      dir="rtl"
      id="admin-top-stats-dashboard-section"
    >
      {/* Background ambient lighting */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-blue-650/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-emerald-650/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 mb-5 border-b border-slate-800/80 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500/20 via-teal-500/20 to-indigo-500/20 border border-slate-700 flex items-center justify-center text-amber-400 shadow-inner">
            <TrendingUp size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-black text-white tracking-tight">
                المؤشرات والإحصائيات الحيوية للأكاديمية
              </h2>
              <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
                {monthName} {currentYear}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              لوحة الرصد التنفيذية للنشاط التعليمي، حركة الطلاب والمعلمين، وتوزيع الحصص المنجزة
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onOpenNotifications && (
            <button
              type="button"
              onClick={onOpenNotifications}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700/70 flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={13} className="text-amber-400" />
              <span>مركز التنبيهات</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: 5 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 relative z-10">
        
        {/* Card 1: Active Students */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ duration: 0.2 }}
          onClick={() => onNavigateToTab && onNavigateToTab('students')}
          className="group relative bg-slate-800/60 hover:bg-slate-800/90 border border-blue-500/30 hover:border-blue-400/60 rounded-2xl p-4.5 transition-all shadow-lg hover:shadow-blue-500/10 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-400 group-hover:text-blue-300 transition-colors">
                إجمالي الطلاب النشطين
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl md:text-3xl font-black font-mono text-white tracking-tight">
                  {activeStudentsCount}
                </span>
                <span className="text-xs text-slate-400 font-bold">طالباً</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <GraduationCap size={22} />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              <span>معدل النشاط:</span>
            </span>
            <span className="text-emerald-400 font-black font-mono">
              {activeStudentsPercentage}% ({totalStudentsCount} كلي)
            </span>
          </div>
        </motion.div>

        {/* Card 2: Total Teachers */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ duration: 0.2 }}
          onClick={() => onNavigateToTab && onNavigateToTab('teachers')}
          className="group relative bg-slate-800/60 hover:bg-slate-800/90 border border-purple-500/30 hover:border-purple-400/60 rounded-2xl p-4.5 transition-all shadow-lg hover:shadow-purple-500/10 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-400 group-hover:text-purple-300 transition-colors">
                إجمالي المعلمين المعتمدين
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl md:text-3xl font-black font-mono text-white tracking-tight">
                  {totalTeachersCount}
                </span>
                <span className="text-xs text-slate-400 font-bold">معلماً</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Users size={22} />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
              <span>كادر التدريس الفعال:</span>
            </span>
            <span className="text-purple-300 font-black font-mono">
              {activeTeachersCount} على رأس العمل
            </span>
          </div>
        </motion.div>

        {/* Card 3: Active Teachers & Their Completed Sessions this Month (الكرت الإحصائي الجديد) */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ duration: 0.2 }}
          onClick={() => onNavigateToTab && onNavigateToTab('teachers')}
          className="group relative bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-teal-950/40 hover:to-teal-900/50 border border-teal-500/40 hover:border-teal-400/70 rounded-2xl p-4.5 transition-all shadow-lg hover:shadow-teal-500/10 cursor-pointer flex flex-col justify-between"
          title="عرض قائمة المعلمين النشطين وحصصهم المنجزة هذا الشهر"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-300 group-hover:text-teal-300 transition-colors flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                <span>المعلمون النشطون وحصص الشهر</span>
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl md:text-3xl font-black font-mono text-white tracking-tight">
                  {activeTeachingStaffStats.activeWithSessionsCount > 0 
                    ? activeTeachingStaffStats.activeWithSessionsCount 
                    : activeTeachingStaffStats.activeRosterCount}
                </span>
                <span className="text-xs text-teal-300 font-bold">معلماً نشطاً</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-inner">
              <UserCheck size={22} />
            </div>
          </div>

          <div className="mt-3 bg-slate-900/80 border border-teal-500/20 rounded-xl p-2.5 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
              <CalendarCheck2 size={12} className="text-teal-400" />
              <span>الحصص المنجزة:</span>
            </span>
            <span className="text-xs font-black font-mono text-teal-200 bg-teal-950/90 px-2 py-0.5 rounded-lg border border-teal-700/60">
              {activeTeachingStaffStats.totalSessions} حصة منجزة
            </span>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-400 flex items-center gap-1">
              <Zap size={11} className="text-amber-400" />
              <span>معدل الإنجاز:</span>
            </span>
            <span className="text-teal-300 font-black font-mono">
              {activeTeachingStaffStats.avgPerActiveTeacher} حصة/معلم ({activeTeachingStaffStats.engagementRate}%)
            </span>
          </div>
        </motion.div>

        {/* Card 3: Completed Sessions this Month */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ duration: 0.2 }}
          onClick={() => onNavigateToTab && onNavigateToTab('sessions')}
          className="group relative bg-slate-800/60 hover:bg-slate-800/90 border border-emerald-500/30 hover:border-emerald-400/60 rounded-2xl p-4.5 transition-all shadow-lg hover:shadow-emerald-500/10 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-400 group-hover:text-emerald-300 transition-colors">
                الحصص المنجزة هذا الشهر ({monthName})
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl md:text-3xl font-black font-mono text-white tracking-tight">
                  {completedSessionsCount}
                </span>
                <span className="text-xs text-slate-400 font-bold">حصة منجزة</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <CalendarCheck2 size={22} />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-400 flex items-center gap-1">
              <Clock size={12} className="text-emerald-400" />
              <span>إجمالي الساعات:</span>
            </span>
            <span className="text-emerald-400 font-black font-mono">
              {totalCompletedHours.toFixed(1)} ساعة تدريسية
            </span>
          </div>
        </motion.div>

        {/* Card 4: Average Weekly Sessions & Direct Link to Reports Tab */}
        <motion.div
          whileHover={{ y: -3, scale: 1.01 }}
          transition={{ duration: 0.2 }}
          onClick={() => onNavigateToTab && onNavigateToTab('reports')}
          className="group relative bg-slate-850/80 hover:bg-slate-800/90 border border-amber-500/30 hover:border-amber-400/60 rounded-2xl p-4.5 transition-all shadow-lg hover:shadow-amber-500/10 cursor-pointer flex flex-col justify-between"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-400 group-hover:text-amber-300 transition-colors">
                معدل الحصص الأسبوعي
              </span>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl md:text-3xl font-black font-mono text-white tracking-tight">
                  {averageSessionsPerWeek}
                </span>
                <span className="text-xs text-slate-400 font-bold">حصة / أسبوع</span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <BarChart3 size={22} />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-400 flex items-center gap-1">
              <Clock size={12} className="text-amber-400" />
              <span>متوسط شهر {monthName}:</span>
            </span>
            <span className="text-amber-300 font-black flex items-center gap-1 group-hover:translate-x-[-2px] transition-transform">
              <span>التقارير والمخططات</span>
              <ChevronLeft size={13} />
            </span>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default AdminTopStatsSection;
