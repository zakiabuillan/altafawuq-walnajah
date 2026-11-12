import React, { useMemo } from 'react';
import { Teacher, Session, Payment, calculateTeacherSessionPayout, isTrialSession } from '../types';
import { Award, Users, Clock, BookOpen, AlertTriangle, BadgeDollarSign, Heart, ChevronDown } from 'lucide-react';

interface TeacherProductivityDashboardProps {
  teachers: Teacher[];
  sessions: Session[];
  payments: Payment[];
  assignments?: any[];
}

export const TeacherProductivityDashboard: React.FC<TeacherProductivityDashboardProps> = ({
  teachers,
  sessions,
  payments,
  assignments = []
}) => {
  // Aggregate real-time data for each teacher
  const productivityStats = useMemo(() => {
    return teachers.map(teacher => {
      // Find all sessions registered by this specific teacher
      const teacherSessions = sessions.filter(s => s.teacherId === teacher.id);
      const sessionsCount = teacherSessions.length;

      // Calculate total teaching hours
      const totalHours = teacherSessions.reduce((sum, s) => sum + (Number(s.durationHours) || 0), 0);

      // Count subject occurrences
      const subjectCounts: Record<string, number> = {};
      teacherSessions.forEach(s => {
        const subjectName = s.subject || 'متابعة وتأسيس العامة';
        subjectCounts[subjectName] = (subjectCounts[subjectName] || 0) + 1;
      });

      // Find the most frequently taught subject
      let topSubject = 'لا توجد حصص مسجلة';
      let topSubjectCount = 0;
      Object.entries(subjectCounts).forEach(([subj, count]) => {
        if (count > topSubjectCount) {
          topSubjectCount = count;
          topSubject = subj;
        }
      });

      // Calculate live accrued wages (accrued salary) identical to TeacherDashboard
      const liveWages = teacherSessions.reduce((sum, s) => {
        if (s.approved === false) return sum; // Only approved or completed sessions
        return sum + calculateTeacherSessionPayout(s, teacher, assignments, 35);
      }, 0);

      // Aggregate payments made
      const paidAmount = payments
        .filter(p => p.teacherId === teacher.id)
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      // Outstanding accumulated due wages
      const dueWages = Math.max(0, liveWages - paidAmount);

      return {
        id: teacher.id,
        name: teacher.name,
        specialization: teacher.specialization || 'أستاذ معتمد',
        sessionsCount,
        totalHours,
        topSubject,
        topSubjectCount,
        liveWages,
        paidAmount,
        dueWages
      };
    })
    // Filter out teachers who have 0 sessions if desired, but keep for full board or sort by productivity
    .sort((a, b) => b.sessionsCount - a.sessionsCount);
  }, [teachers, sessions, payments]);

  const top3 = productivityStats.slice(0, 3);
  const trailingTeachers = productivityStats.slice(3);

  // General academy stats for teacher output
  const overallStats = useMemo(() => {
    const totalSessionsAll = sessions.length;
    const totalHoursAll = sessions.reduce((sum, s) => sum + s.durationHours, 0);
    const totalPaidAll = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    // Total live dues across all teachers
    const totalDuesAll = productivityStats.reduce((sum, t) => sum + t.dueWages, 0);

    return {
      totalSessionsAll,
      totalHoursAll,
      totalPaidAll,
      totalDuesAll
    };
  }, [sessions, payments, productivityStats]);

  return (
    <div className="bg-slate-50/50 rounded-3xl border border-slate-150 p-6 space-y-6 text-right shadow-sm" dir="rtl">
      {/* Dynamic Dashboard Header Card */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-rose-50/30 pb-4">
        <div>
          <span className="text-[10px] bg-amber-500/10 text-[#D4A33C] px-3 py-1 rounded-full font-black flex items-center gap-1 w-fit">
            <Award size={11} className="animate-spin" style={{ animationDuration: '3s' }} />
            لوحة قياس حية ومحدثة للإنتاجية والرواتب
          </span>
          <h3 className="text-xl font-black text-[#1A365D] mt-1.5 flex items-center gap-1.5">
            مؤشر كفاءة وإنتاجية الطاقم التعليمي والأجور المستحقة حيوياً
          </h3>
          <p className="text-xs text-slate-500 font-medium">المرصد التفاعلي لمدير المنصة لمراقبة وتحديد الأساتذة الأكثر عطاءً والحركة المالية لرواتبهم.</p>
        </div>

        {/* Aggregate Stats Bar */}
        <div className="flex flex-wrap gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-150 shadow-xs">
          <div className="px-3 border-l border-slate-150 text-center">
            <span className="text-[9px] text-slate-400 block font-bold">إجمالي الحصص المسجلة</span>
            <strong className="text-sm font-mono font-black text-rose-600">{overallStats.totalSessionsAll} حصة</strong>
          </div>
          <div className="px-3 border-l border-slate-150 text-center">
            <span className="text-[9px] text-slate-400 block font-bold">إجمالي الساعات</span>
            <strong className="text-sm font-mono font-black text-indigo-600">{overallStats.totalHoursAll.toFixed(1)} س</strong>
          </div>
          <div className="px-3 text-center">
            <span className="text-[9px] text-slate-400 block font-bold">إجمالي المستحقات المرصودة الحالية</span>
            <strong className="text-sm font-mono font-black text-[#D4A33C]">₪{overallStats.totalDuesAll.toFixed(0)}</strong>
          </div>
        </div>
      </div>

      {/* Leaderboard Podiums Grid */}
      <div className="space-y-3">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">🏆 الصدارة والمنصة الذهبية (المعلمون الأكثر إنتاجية):</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {top3.map((teacher, index) => {
            // Distinct visual themes for Gold, Silver, Bronze levels
            const theme = index === 0 
              ? { bg: 'from-amber-500/10 to-transparent border-amber-300', icon: 'text-amber-500 scale-110', label: 'المعلم الأول الأكثر تميزاً 👑' }
              : index === 1
                ? { bg: 'from-slate-400/10 to-transparent border-slate-300', icon: 'text-slate-400', label: 'المرتبة الثانية 🥈' }
                : { bg: 'from-amber-700/10 to-transparent border-amber-600', icon: 'text-amber-750', label: 'المرتبة الثالثة 🥉' };

            return (
              <div 
                key={teacher.id} 
                className={`bg-white rounded-2xl border p-5 relative overflow-hidden flex flex-col justify-between shadow-xs transition-transform hover:scale-101 border-b-4 ${theme.bg}`}
              >
                {/* Ranking Ribbon Header */}
                <div className="flex justify-between items-start gap-2 mb-3">
                  <span className="text-[9px] bg-slate-900 bg-opacity-5 text-slate-600 px-2 py-0.5 rounded font-black">
                    {theme.label}
                  </span>
                  <Award size={20} className={theme.icon} />
                </div>

                {/* Teacher Info */}
                <div className="space-y-1">
                  <h4 className="font-extrabold text-sm text-slate-850">{teacher.name}</h4>
                  <p className="text-[10px] text-slate-400 font-bold">{teacher.specialization}</p>
                </div>

                {/* Productivity Indicators */}
                <div className="grid grid-cols-2 gap-2 my-4 bg-slate-50/70 p-2.5 rounded-xl border border-slate-150/40 text-center">
                  <div>
                    <span className="text-[8px] text-slate-400 block font-extrabold">الدروس المسجلة</span>
                    <strong className="text-xs font-black text-rose-600 font-mono">{teacher.sessionsCount} حصص</strong>
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 block font-extrabold">إجمالي الساعات</span>
                    <strong className="text-xs font-black text-indigo-700 font-mono">{teacher.totalHours.toFixed(1)} س</strong>
                  </div>
                </div>

                {/* Subject Frequency and Live Dues */}
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  {/* Frequently taught subject */}
                  <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                    <BookOpen size={11} className="text-[#D4A33C] shrink-0" />
                    <span className="truncate">المادة المكررة: <strong className="text-slate-700 font-black">{teacher.topSubject}</strong> ({teacher.topSubjectCount} مرة)</span>
                  </div>

                  {/* Live Outstanding Due Wages */}
                  <div className="flex items-center justify-between text-[11px] bg-slate-900/5 p-2 rounded-xl border border-slate-100">
                    <span className="font-black text-slate-500">الأجور المستحقة حالياً:</span>
                    <strong className="text-xs font-black font-mono text-[#D4A33C]">₪{teacher.dueWages.toFixed(0)}</strong>
                  </div>
                </div>
              </div>
            );
          })}

          {top3.length === 0 && (
            <div className="col-span-3 py-10 text-center text-xs text-slate-400 font-black bg-white rounded-2xl border border-slate-150">
              لا توجد حصص مسجلة لأي معلم لتوليد الصدارة البرمجية حالياً.
            </div>
          )}
        </div>
      </div>

      {/* Trailing Teachers List/Table */}
      {trailingTeachers.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">📋 بقية الفريق التعليمي والإنتاجية المتراكمة:</h4>
          
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
            {trailingTeachers.map(teacher => (
              <div 
                key={teacher.id}
                className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50/50 transition-colors text-xs font-bold text-slate-700"
              >
                {/* Teacher Details */}
                <div className="flex items-center gap-2.5 text-right">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                    <Users size={14} />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-[#1A365D] text-xs">{teacher.name}</h5>
                    <p className="text-[10px] text-slate-400 font-bold">{teacher.specialization}</p>
                  </div>
                </div>

                {/* Substats */}
                <div className="flex flex-wrap gap-6 items-center">
                  {/* Sessions & Hours */}
                  <div className="text-right">
                    <span className="text-[9px] text-slate-400 block font-black">الحصص والساعات</span>
                    <span className="text-xs text-slate-800 font-black font-mono">
                      {teacher.sessionsCount} حصص <span className="text-slate-300">|</span> {teacher.totalHours.toFixed(1)} س
                    </span>
                  </div>

                  {/* Frequently taught subject */}
                  <div className="text-right max-w-44 truncate">
                    <span className="text-[9px] text-slate-400 block font-black">المادة المتكررة</span>
                    <span className="text-xs text-slate-800 font-extrabold">
                      {teacher.topSubject} <span className="text-slate-300 font-normal">({teacher.topSubjectCount} مرة)</span>
                    </span>
                  </div>

                  {/* Live Outstanding Due Wages */}
                  <div className="text-center bg-slate-50/50 px-3 py-1.5 rounded-xl border border-slate-100 min-w-32">
                    <span className="text-[8px] text-slate-400 block font-black">المستحقات غير المدفوعة</span>
                    <strong className="text-xs font-black font-mono text-emerald-600">₪{teacher.dueWages.toFixed(0)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
