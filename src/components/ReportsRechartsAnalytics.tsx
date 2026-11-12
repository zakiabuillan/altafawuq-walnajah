import React, { useState, useMemo } from 'react';
import { Student, Session, Teacher, GlobalSettings, calculateTeacherSessionPayout, isTrialSession } from '../types';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  PieChart as PieIcon,
  TrendingUp,
  GraduationCap,
  DollarSign,
  Users,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Info
} from 'lucide-react';
import { motion } from 'motion/react';

interface ReportsRechartsAnalyticsProps {
  students: Student[];
  sessions: Session[];
  teachers?: Teacher[];
  assignments?: any[];
  globalSettings?: GlobalSettings;
}

// Harmonious palette tailored for academic analytics
const GRADE_COLORS = [
  '#0D365A', // Navy (Academy brand)
  '#D4A33C', // Gold (Academy brand)
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F59E0B', // Amber
  '#14B8A6', // Teal
  '#6366F1', // Indigo
  '#F43F5E', // Rose
  '#84CC16', // Lime
];

const ARABIC_MONTH_NAMES = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const ReportsRechartsAnalytics: React.FC<ReportsRechartsAnalyticsProps> = ({
  students = [],
  sessions = [],
  teachers = [],
  assignments = [],
  globalSettings
}) => {
  // Filters
  const [includeArchivedStudents, setIncludeArchivedStudents] = useState<boolean>(false);
  const [timeHorizon, setTimeHorizon] = useState<'6m' | '12m' | 'all'>('12m');
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);
  const [showProfitComparison, setShowProfitComparison] = useState<boolean>(true);

  // 1. Compute Student Distribution by Academic Grade / Level (توزيع الطلاب حسب الصف الدراسي)
  const { gradeData, totalStudentsCount, mostPopulatedGrade } = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;

    students.forEach(st => {
      // Filter out archived students if disabled
      if (!includeArchivedStudents && (st.archived || (st.status as any) === 'archived')) {
        return;
      }

      // Normalization of grade / academic level
      let rawGrade = (st.grade || st.academicLevel || '').trim();
      if (!rawGrade) {
        rawGrade = 'غير محدد';
      }

      // Normalization of common names for clean grouping
      const normalized = rawGrade
        .replace(/^(صف|الصف)\s*/, 'الصف ')
        .trim();

      counts[normalized] = (counts[normalized] || 0) + 1;
      total += 1;
    });

    const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    const formatted = sortedEntries.map(([name, value], index) => {
      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
      return {
        name,
        value,
        percentage: Number(percentage),
        color: GRADE_COLORS[index % GRADE_COLORS.length]
      };
    });

    const top = formatted.length > 0 ? formatted[0] : null;

    return {
      gradeData: formatted,
      totalStudentsCount: total,
      mostPopulatedGrade: top
    };
  }, [students, includeArchivedStudents]);

  // 2. Compute Monthly Revenue Progression (تطور الإيرادات عبر الأشهر)
  const { monthlyRevenueData, totalRevenueCalculated, avgMonthlyRevenue, peakMonth, recentMonthGrowth } = useMemo(() => {
    const approvedSessions = sessions.filter(s => s.approved !== false && s.date);
    const monthStatsMap: Record<string, { revenue: number; payout: number; sessionsCount: number; hours: number }> = {};

    approvedSessions.forEach(s => {
      const dateStr = s.date;
      if (!dateStr) return;
      const parts = dateStr.split('-');
      if (parts.length < 2) return;
      const y = parts[0];
      const m = parts[1];
      const monthKey = `${y}-${m}`;

      if (!monthStatsMap[monthKey]) {
        monthStatsMap[monthKey] = { revenue: 0, payout: 0, sessionsCount: 0, hours: 0 };
      }

      // Calculate revenue
      let rev = 0;
      if (isTrialSession(s)) {
        rev = 0;
      } else if (s.customFee !== undefined && s.customFee !== null) {
        rev = Number(s.customFee);
      } else {
        const student = students.find(st => st.id === s.studentId);
        const rate = (student && (student.hourlyRate || student.sessionRate)) || 50;
        rev = (Number(s.durationHours) || 0) * rate;
      }

      // Calculate teacher payout identical to TeacherDashboard
      const teacher = teachers.find(t => t.id === s.teacherId);
      const defaultRate = globalSettings?.defaultTeacherHourlyRate || 35;
      const payout = calculateTeacherSessionPayout(s, teacher, assignments, defaultRate);

      monthStatsMap[monthKey].revenue += rev;
      monthStatsMap[monthKey].payout += payout;
      monthStatsMap[monthKey].sessionsCount += 1;
      monthStatsMap[monthKey].hours += Number(s.durationHours) || 0;
    });

    // Determine target months timeline based on timeHorizon
    const allKeys = Object.keys(monthStatsMap).sort();
    let selectedKeys = allKeys;

    if (timeHorizon === '6m') {
      selectedKeys = allKeys.slice(-6);
    } else if (timeHorizon === '12m') {
      selectedKeys = allKeys.slice(-12);
    }

    // If no sessions exist yet, generate a safe demonstration series
    if (selectedKeys.length === 0) {
      const now = new Date();
      selectedKeys = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        selectedKeys.push(`${y}-${m}`);
      }
    }

    let totalRev = 0;
    let maxRev = -1;
    let maxMonthName = '';

    const list = selectedKeys.map(key => {
      const [yearStr, monthStr] = key.split('-');
      const mIdx = parseInt(monthStr, 10) - 1;
      const monthLabel = `${ARABIC_MONTH_NAMES[mIdx] || monthStr} ${yearStr}`;
      const entry = monthStatsMap[key] || { revenue: 0, payout: 0, sessionsCount: 0, hours: 0 };
      const rev = Math.round(entry.revenue);
      const profit = Math.round(entry.revenue - entry.payout);

      totalRev += rev;
      if (rev > maxRev) {
        maxRev = rev;
        maxMonthName = monthLabel;
      }

      return {
        key,
        name: monthLabel,
        revenue: rev,
        profit: profit,
        payout: Math.round(entry.payout),
        hours: Number(entry.hours.toFixed(1)),
        sessionsCount: entry.sessionsCount
      };
    });

    const avg = list.length > 0 ? Math.round(totalRev / list.length) : 0;

    // Calculate growth of the last recorded month compared to the preceding month
    let growth = 0;
    if (list.length >= 2) {
      const current = list[list.length - 1].revenue;
      const previous = list[list.length - 2].revenue;
      if (previous > 0) {
        growth = Number((((current - previous) / previous) * 100).toFixed(1));
      } else if (current > 0) {
        growth = 100;
      }
    }

    return {
      monthlyRevenueData: list,
      totalRevenueCalculated: totalRev,
      avgMonthlyRevenue: avg,
      peakMonth: { name: maxMonthName, revenue: Math.max(0, maxRev) },
      recentMonthGrowth: growth
    };
  }, [sessions, students, teachers, assignments, globalSettings, timeHorizon]);

  // Custom Tooltip for Pie Chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl border border-slate-700 text-right font-sans text-xs min-w-[170px]" dir="rtl">
          <div className="flex items-center gap-2 mb-1.5 pb-1 border-b border-slate-800">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: data.color }} />
            <span className="font-black text-white">{data.name}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-slate-300 py-0.5">
            <span>عدد الطلاب:</span>
            <span className="font-mono font-bold text-amber-300">{data.value} طالب</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-slate-300 py-0.5">
            <span>النسبة المئوية:</span>
            <span className="font-mono font-bold text-emerald-400">{data.percentage}%</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Line Chart
  const CustomLineTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 text-right font-sans text-xs min-w-[210px]" dir="rtl">
          <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-slate-800">
            <Calendar size={13} className="text-[#D4A33C]" />
            <span className="font-black text-white">{label}</span>
          </div>
          {payload.map((item: any, idx: number) => {
            const isRev = item.dataKey === 'revenue';
            const isProf = item.dataKey === 'profit';
            return (
              <div key={idx} className="flex items-center justify-between gap-4 py-1 border-b border-slate-800/40 last:border-0">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span>{item.name}:</span>
                </span>
                <span className={`font-mono font-black ${isRev ? 'text-emerald-400 text-sm' : isProf ? 'text-cyan-300' : 'text-slate-200'}`}>
                  ₪{Number(item.value).toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6" dir="rtl" id="reports-recharts-analytics-section">
      {/* Section Header with Academy Branding */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0D365A] to-slate-950 text-white rounded-3xl p-6 md:p-7 shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-gradient-to-br from-amber-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 bg-[#D4A33C]/20 text-[#f6d78d] font-black text-[11px] rounded-full border border-[#D4A33C]/40 flex items-center gap-1.5">
                <Sparkles size={12} className="text-[#D4A33C]" />
                <span>التحليلات البيانية الذكية (Recharts)</span>
              </span>
              <span className="text-slate-500 text-xs">•</span>
              <span className="text-slate-300 text-xs font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                رصد فوري متصل بقاعدة البيانات
              </span>
            </div>

            <h3 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              <span>توزيع الطلاب حسب الصف الدراسي وتطور الإيرادات الشهرية</span>
            </h3>

            <p className="text-xs md:text-sm text-slate-300 font-medium max-w-3xl leading-relaxed">
              تحليل إحصائي مرئي دقيق لتوزع الطلبة على المراحل والصفوف الدراسية المختلفة عبر مخطط دائري تفاعلي، ومتابعة منحنى تطور الإيرادات المالية وصافي الأرباح شهرياً عبر مخطط خطي زمني.
            </p>
          </div>

          {/* Quick Metrics Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto shrink-0">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-right">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                <Users size={12} className="text-blue-400" />
                <span>إجمالي الطلاب</span>
              </div>
              <div className="text-lg font-black text-white mt-0.5 font-mono">
                {totalStudentsCount} <span className="text-[10px] text-slate-400 font-bold">طالب</span>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 text-right">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                <GraduationCap size={12} className="text-amber-400" />
                <span>الصف الأكثر كثافة</span>
              </div>
              <div className="text-sm font-black text-[#D4A33C] mt-0.5 truncate max-w-[130px]" title={mostPopulatedGrade?.name || '—'}>
                {mostPopulatedGrade?.name || 'لا يوجد'}
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-3 text-right">
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                <TrendingUp size={12} className="text-emerald-400" />
                <span>نمو آخر شهر</span>
              </div>
              <div className={`text-base font-black mt-0.5 font-mono flex items-center gap-1 ${recentMonthGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {recentMonthGrowth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                <span>{recentMonthGrowth > 0 ? `+${recentMonthGrowth}` : recentMonthGrowth}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid with Both Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* =========================================================================
            CARD 1: PIE CHART - توزيع الطلاب حسب الصف الدراسي (5 cols on lg)
            ========================================================================= */}
        <section className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="space-y-4">
            
            {/* Header & Controls */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <PieIcon size={19} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span>توزيع الطلاب حسب الصف الدراسي</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/50">Pie Chart</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                    النسبة المئوية وتعداد الطلاب لكل مرحلة وصف دراسي
                  </p>
                </div>
              </div>

              {/* Archived Toggle */}
              <button
                type="button"
                onClick={() => setIncludeArchivedStudents(!includeArchivedStudents)}
                className={`text-[10px] font-black px-2.5 py-1 rounded-xl transition-all border cursor-pointer ${
                  includeArchivedStudents
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
                title="التبديل بين تضمين أو استثناء الطلاب المؤرشفين"
              >
                {includeArchivedStudents ? 'شامل المؤرشفين 📁' : 'النشطون فقط 🟢'}
              </button>
            </div>

            {/* Recharts Pie Chart Container */}
            {gradeData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Users size={32} className="text-slate-350 mb-2" />
                <p className="text-xs font-black text-slate-600">لا توجد بيانات طلاب مسجلة حالياً</p>
                <p className="text-[10px] text-slate-400 mt-1">قم بإضافة الطلاب وتحديد صفوفهم لعرض المخطط الدائري</p>
              </div>
            ) : (
              <div className="relative">
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={gradeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        onMouseEnter={(_, index) => setActivePieIndex(index)}
                        onMouseLeave={() => setActivePieIndex(null)}
                      >
                        {gradeData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            stroke={activePieIndex === index ? '#0D365A' : '#ffffff'}
                            strokeWidth={activePieIndex === index ? 3 : 1.5}
                            style={{
                              filter: activePieIndex === index ? 'drop-shadow(0px 4px 8px rgba(0,0,0,0.2))' : 'none',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease-in-out'
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Center Badge inside the donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] text-slate-400 font-bold">إجمالي الطلبة</span>
                  <span className="text-xl font-black text-slate-900 font-mono leading-tight">{totalStudentsCount}</span>
                  <span className="text-[9px] text-slate-400 font-bold">{gradeData.length} صفوف</span>
                </div>
              </div>
            )}

            {/* Breakdown Legend Pills / List */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 pl-1 scrollbar-thin">
              {gradeData.map((item, index) => (
                <div
                  key={item.name}
                  onMouseEnter={() => setActivePieIndex(index)}
                  onMouseLeave={() => setActivePieIndex(null)}
                  className={`flex items-center justify-between p-2 rounded-xl text-xs transition-all cursor-pointer ${
                    activePieIndex === index
                      ? 'bg-slate-100 shadow-xs scale-[1.01]'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-md shrink-0 shadow-2xs"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-bold text-slate-800 text-xs truncate">
                      {item.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                      />
                    </div>
                    <span className="text-[11px] font-black text-slate-900 font-mono">
                      {item.value} <span className="text-[9px] text-slate-400 font-normal">طالب</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 font-mono min-w-[38px] text-left">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Footer note */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Info size={12} className="text-indigo-500" />
              <span>انقر أو مرّر على أي قطاع للاطلاع على تفاصيل الصف</span>
            </span>
            <span className="font-mono font-bold text-slate-600">{gradeData.length} فئات</span>
          </div>
        </section>

        {/* =========================================================================
            CARD 2: LINE CHART - تطور الإيرادات عبر الأشهر (7 cols on lg)
            ========================================================================= */}
        <section className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between relative overflow-hidden group">
          <div className="space-y-4">
            
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                  <TrendingUp size={19} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <span>تطور الإيرادات عبر الأشهر</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200/50">Line Chart</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 font-bold mt-0.5">
                    المنحنى الزمني لحصاد الإيرادات المالية وصافي أرباح الأكاديمية
                  </p>
                </div>
              </div>

              {/* Horizon & Profit Toggles */}
              <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-auto">
                {/* Profit Line Toggle */}
                <button
                  type="button"
                  onClick={() => setShowProfitComparison(!showProfitComparison)}
                  className={`text-[10px] font-black px-2.5 py-1 rounded-xl transition-all border cursor-pointer ${
                    showProfitComparison
                      ? 'bg-cyan-50 text-cyan-800 border-cyan-200 shadow-2xs'
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                  title="إظهار أو إخفاء خط صافي الأرباح"
                >
                  {showProfitComparison ? 'خط الأرباح 🟢' : 'إيراد فقط ⚪'}
                </button>

                {/* Horizon Selector */}
                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => setTimeHorizon('6m')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                      timeHorizon === '6m' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    6 أشهر
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeHorizon('12m')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                      timeHorizon === '12m' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    12 شهراً
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeHorizon('all')}
                    className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                      timeHorizon === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    الكل
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-150">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">إجمالي إيراد الفترة</span>
                <span className="text-sm font-black text-emerald-600 font-mono">
                  ₪{totalRevenueCalculated.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">متوسط الإيراد الشهري</span>
                <span className="text-sm font-black text-slate-800 font-mono">
                  ₪{avgMonthlyRevenue.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">أعلى شهر مسجل</span>
                <span className="text-xs font-black text-[#D4A33C] truncate block" title={peakMonth.name}>
                  {peakMonth.name ? `${peakMonth.name} (₪${peakMonth.revenue.toLocaleString()})` : '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold block">معدل التغير الشهري</span>
                <span className={`text-xs font-black font-mono flex items-center gap-0.5 ${recentMonthGrowth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {recentMonthGrowth >= 0 ? '▲ +' : '▼ '}{recentMonthGrowth}%
                </span>
              </div>
            </div>

            {/* Recharts Line Chart Container */}
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={monthlyRevenueData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `₪${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    orientation="right"
                  />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 800 }}
                  />
                  
                  {/* Revenue Line (Primary) */}
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="إجمالي الإيرادات (₪)"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                    activeDot={{ r: 7, fill: '#059669', stroke: '#ffffff', strokeWidth: 3 }}
                  />

                  {/* Profit Line (Secondary optional) */}
                  {showProfitComparison && (
                    <Line
                      type="monotone"
                      dataKey="profit"
                      name="صافي الربح التقديري (₪)"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      strokeDasharray="4 4"
                      dot={{ r: 3.5, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 1.5 }}
                      activeDot={{ r: 6, fill: '#0891b2', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

          </div>

          {/* Footer note */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-medium">
              <Calendar size={12} className="text-emerald-500" />
              <span>مخطط خطي تفاعلي مستخرج من سجلات الحصص المعتمدة والرسوم الفعلية</span>
            </span>
            <span className="font-mono font-bold text-slate-600">{monthlyRevenueData.length} شهراً معروضة</span>
          </div>
        </section>

      </div>
    </div>
  );
};
