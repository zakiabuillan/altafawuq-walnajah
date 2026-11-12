import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  Cell 
} from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  Calendar, 
  Users, 
  Wallet, 
  CheckCircle2, 
  AlertCircle, 
  ArrowUpRight, 
  ArrowDownRight, 
  BarChart3, 
  Activity, 
  SlidersHorizontal,
  ChevronDown,
  Download,
  Percent
} from 'lucide-react';
import { Teacher, Session, Payment, Student, Assignment, GlobalSettings, calculateTeacherSessionPayout, isTrialSession } from '../types';
import { getStudentDefaultHourlyRate } from '../lib/sessionPricing';

interface TeacherSalariesFlowChartProps {
  teachers: Teacher[];
  sessions: Session[];
  payments: Payment[];
  students?: Student[];
  assignments?: Assignment[];
  globalSettings?: GlobalSettings;
}

export const TeacherSalariesFlowChart: React.FC<TeacherSalariesFlowChartProps> = ({
  teachers,
  sessions,
  payments,
  students = [],
  assignments = [],
  globalSettings
}) => {
  // State for filter and display controls
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<'6m' | '12m' | 'all'>('12m');
  const [viewMode, setViewMode] = useState<'flows' | 'comparison' | 'teacher_breakdown' | 'table'>('flows');
  const [chartType, setChartType] = useState<'composed' | 'area' | 'bar'>('composed');

  // Arabic Months Names
  const monthsAr = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  // Helper to calculate teacher payout rate
  const getTeacherPayoutRate = (studentId?: string, teacherId?: string) => {
    if (!teacherId) return globalSettings?.defaultTeacherHourlyRate || 35;
    const teacher = teachers.find(t => t.id === teacherId);
    if (studentId) {
      const ass = assignments.find(a => a.studentId === studentId && a.teacherId === teacherId);
      if (ass && ass.teacherPayoutRate && ass.teacherPayoutRate > 0) {
        return ass.teacherPayoutRate;
      }
    }
    return teacher?.payoutRate || teacher?.hourlyRate || globalSettings?.defaultTeacherHourlyRate || 35;
  };

  // Helper to calculate student billing rate
  const getStudentBillingRate = (studentId?: string, teacherId?: string) => {
    if (!studentId || !teacherId) return globalSettings?.defaultStudentHourlyRate || 60;
    const teacher = teachers.find(t => t.id === teacherId);
    const ass = assignments.find(a => a.studentId === studentId && a.teacherId === teacherId);
    if (ass && ass.hourlyRate && ass.hourlyRate > 0) return ass.hourlyRate;
    const student = students.find(s => s.id === studentId);
    return getStudentDefaultHourlyRate(student, globalSettings, teacher);
  };

  // Process and aggregate all monthly data
  const { monthlyData, overallStats, teacherStatsList } = useMemo(() => {
    const monthMap: Record<string, {
      monthKey: string;
      monthLabel: string;
      year: string;
      monthNum: number;
      earnedSalary: number;    // مستحقات الرواتب المكتسبة من الحصص
      paidSalary: number;      // الرواتب والدفعات المصروفة فعلياً
      revenue: number;         // إيرادات الحصص
      teachingHours: number;   // إجمالي الساعات
      sessionsCount: number;   // عدد الحصص
      teachersMap: Record<string, {
        earned: number;
        paid: number;
        hours: number;
      }>;
    }> = {};

    const approvedSessions = sessions.filter(s => s.approved !== false && s.date && s.status !== 'cancelled');

    // 1. Accumulate Sessions (Earned Salaries & Revenues)
    approvedSessions.forEach(s => {
      if (selectedTeacherId !== 'all' && s.teacherId !== selectedTeacherId) return;

      const dateStr = s.date!;
      const parts = dateStr.split('-');
      if (parts.length < 2) return;

      const monthKey = `${parts[0]}-${parts[1]}`;
      const year = parts[0];
      const monthNum = parseInt(parts[1], 10);
      const monthLabel = `${monthsAr[monthNum - 1]} ${year}`;

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          monthKey,
          monthLabel,
          year,
          monthNum,
          earnedSalary: 0,
          paidSalary: 0,
          revenue: 0,
          teachingHours: 0,
          sessionsCount: 0,
          teachersMap: {}
        };
      }

      const teacherObj = teachers.find(t => t.id === s.teacherId);
      const defaultRate = globalSettings?.defaultTeacherHourlyRate || 35;
      const payout = calculateTeacherSessionPayout(s, teacherObj, assignments, defaultRate);

      let rev = 0;
      if (s.customFee !== undefined && s.customFee !== null) {
        rev = Number(s.customFee);
      } else {
        const bRate = getStudentBillingRate(s.studentId, s.teacherId);
        rev = (s.durationHours || 0) * bRate;
      }

      monthMap[monthKey].earnedSalary += payout;
      monthMap[monthKey].revenue += rev;
      monthMap[monthKey].teachingHours += (s.durationHours || 0);
      monthMap[monthKey].sessionsCount += 1;

      // Track by teacher
      if (s.teacherId) {
        if (!monthMap[monthKey].teachersMap[s.teacherId]) {
          monthMap[monthKey].teachersMap[s.teacherId] = { earned: 0, paid: 0, hours: 0 };
        }
        monthMap[monthKey].teachersMap[s.teacherId].earned += payout;
        monthMap[monthKey].teachersMap[s.teacherId].hours += (s.durationHours || 0);
      }
    });

    // 2. Accumulate Payments (Actual Paid Salaries)
    payments.forEach(p => {
      if (p.archived) return; // Optional or keep
      if (selectedTeacherId !== 'all' && p.teacherId !== selectedTeacherId) return;

      const dateStr = p.date || p.createdAt;
      if (!dateStr) return;

      const parts = dateStr.split('-');
      if (parts.length < 2) return;

      const monthKey = `${parts[0]}-${parts[1]}`;
      const year = parts[0];
      const monthNum = parseInt(parts[1], 10);
      const monthLabel = `${monthsAr[monthNum - 1]} ${year}`;

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          monthKey,
          monthLabel,
          year,
          monthNum,
          earnedSalary: 0,
          paidSalary: 0,
          revenue: 0,
          teachingHours: 0,
          sessionsCount: 0,
          teachersMap: {}
        };
      }

      const amount = Number(p.amount || 0);
      monthMap[monthKey].paidSalary += amount;

      if (p.teacherId) {
        if (!monthMap[monthKey].teachersMap[p.teacherId]) {
          monthMap[monthKey].teachersMap[p.teacherId] = { earned: 0, paid: 0, hours: 0 };
        }
        monthMap[monthKey].teachersMap[p.teacherId].paid += amount;
      }
    });

    // Sort months chronologically
    let sortedKeys = Object.keys(monthMap).sort();

    // Filter by timeRange
    if (timeRange === '6m') {
      sortedKeys = sortedKeys.slice(-6);
    } else if (timeRange === '12m') {
      sortedKeys = sortedKeys.slice(-12);
    }

    const formattedMonthly = sortedKeys.map(key => {
      const item = monthMap[key];
      const netMonthlyFlow = item.earnedSalary - item.paidSalary; // موجب = مستحقات لم تصرف، سالب = دفعات أكثر
      const profitMargin = item.revenue - item.earnedSalary;
      const payoutRatio = item.revenue > 0 ? (item.earnedSalary / item.revenue) * 100 : 0;

      return {
        key: item.monthKey,
        name: item.monthLabel,
        earnedSalary: Math.round(item.earnedSalary),
        paidSalary: Math.round(item.paidSalary),
        revenue: Math.round(item.revenue),
        netFlow: Math.round(netMonthlyFlow),
        profitMargin: Math.round(profitMargin),
        payoutRatio: parseFloat(payoutRatio.toFixed(1)),
        hours: parseFloat(item.teachingHours.toFixed(1)),
        sessionsCount: item.sessionsCount,
        teachersMap: item.teachersMap
      };
    });

    // Compute Overall Stats for the selected time range & teacher
    let totalEarned = 0;
    let totalPaid = 0;
    let totalRevenue = 0;
    let totalHours = 0;
    let totalSessions = 0;

    formattedMonthly.forEach(m => {
      totalEarned += m.earnedSalary;
      totalPaid += m.paidSalary;
      totalRevenue += m.revenue;
      totalHours += m.hours;
      totalSessions += m.sessionsCount;
    });

    const netOutstanding = totalEarned - totalPaid;
    const avgMonthlyEarned = formattedMonthly.length > 0 ? totalEarned / formattedMonthly.length : 0;
    const avgMonthlyPaid = formattedMonthly.length > 0 ? totalPaid / formattedMonthly.length : 0;
    const overallPayoutRatio = totalRevenue > 0 ? (totalEarned / totalRevenue) * 100 : 0;

    // Per Teacher Overall Breakdown in the selected range
    const teacherBreakdownMap: Record<string, { id: string; name: string; earned: number; paid: number; balance: number; hours: number }> = {};

    teachers.forEach(t => {
      teacherBreakdownMap[t.id] = {
        id: t.id,
        name: t.name,
        earned: 0,
        paid: 0,
        balance: 0,
        hours: 0
      };
    });

    formattedMonthly.forEach(m => {
      Object.entries(m.teachersMap).forEach(([tId, val]) => {
        if (!teacherBreakdownMap[tId]) {
          const tObj = teachers.find(t => t.id === tId);
          teacherBreakdownMap[tId] = {
            id: tId,
            name: tObj?.name || 'معلم غير معروف',
            earned: 0,
            paid: 0,
            balance: 0,
            hours: 0
          };
        }
        teacherBreakdownMap[tId].earned += val.earned;
        teacherBreakdownMap[tId].paid += val.paid;
        teacherBreakdownMap[tId].hours += val.hours;
      });
    });

    const teacherStatsList = Object.values(teacherBreakdownMap)
      .map(t => ({
        ...t,
        earned: Math.round(t.earned),
        paid: Math.round(t.paid),
        balance: Math.round(t.earned - t.paid),
        hours: parseFloat(t.hours.toFixed(1))
      }))
      .filter(t => t.earned > 0 || t.paid > 0 || t.hours > 0)
      .sort((a, b) => b.earned - a.earned);

    return {
      monthlyData: formattedMonthly,
      overallStats: {
        totalEarned,
        totalPaid,
        totalRevenue,
        totalHours,
        totalSessions,
        netOutstanding,
        avgMonthlyEarned,
        avgMonthlyPaid,
        overallPayoutRatio
      },
      teacherStatsList
    };
  }, [sessions, payments, teachers, students, assignments, globalSettings, selectedTeacherId, timeRange]);

  // Color Palette for charts
  const colors = {
    earned: '#D4A33C',      // المستحقات المكتسبة (Amber/Gold)
    paid: '#10B981',        // المدفوعات المصروفة (Emerald)
    revenue: '#6366F1',     // إيرادات الحصص (Indigo)
    netFlow: '#F43F5E',     // الفارق / الذمم (Rose)
    profit: '#0D365A'       // الأرباح (Navy)
  };

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-xl text-right font-sans min-w-[210px]" dir="rtl">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2.5">
            <span className="font-black text-slate-900 text-xs">{label}</span>
            <Calendar size={13} className="text-[#D4A33C]" />
          </div>
          <div className="space-y-2 text-[11px]">
            {payload.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between gap-4 font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color || item.fill || item.stroke }} />
                  <span className="text-slate-600">{item.name}:</span>
                </div>
                <span className="text-slate-950 font-black" dir="ltr">
                  {typeof item.value === 'number' ? `₪${item.value.toLocaleString()}` : item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-right" dir="rtl">
      {/* 🌟 Header Section */}
      <div className="p-6 md:p-8 border-b border-slate-100 bg-gradient-to-r from-slate-50/80 via-white to-amber-50/20 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex items-center justify-center text-[#D4A33C] shadow-xs shrink-0">
              <BarChart3 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                  التحليل البياني للرواتب والتدفقات المالية الشهرية للمعلمين
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-[#D4A33C] text-[11px] font-black border border-amber-400/20">
                  كشف التدفق الشهري (Recharts)
                </span>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-1">
                متابعة دقيقة لمقارنة مستحقات الرواتب المكتسبة شهرياً مع المدفوعات المسددة فعلياً وإيرادات الحصص
              </p>
            </div>
          </div>
        </div>

        {/* 🎛️ Filter & Control Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 justify-start lg:justify-end">
          {/* Teacher Selector */}
          <div className="relative">
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="pr-8 pl-3 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-[#D4A33C] transition-all shadow-xs cursor-pointer appearance-none"
            >
              <option value="all">👥 جميع المعلمين (إجمالي الكادر)</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>👤 {t.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Time Range Selector */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-0.5">
            <button
              onClick={() => setTimeRange('6m')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                timeRange === '6m' ? 'bg-white text-[#0D365A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              آخر 6 أشهر
            </button>
            <button
              onClick={() => setTimeRange('12m')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                timeRange === '12m' ? 'bg-white text-[#0D365A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              آخر 12 شهر
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                timeRange === 'all' ? 'bg-white text-[#0D365A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              كل السجلات
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-0.5">
            <button
              onClick={() => setViewMode('flows')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                viewMode === 'flows' ? 'bg-white text-[#0D365A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="التدفقات المالية والرواتب"
            >
              📈 التدفق الشهري
            </button>
            <button
              onClick={() => setViewMode('comparison')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                viewMode === 'comparison' ? 'bg-white text-[#0D365A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="مقارنة المكتسب بالمسدد"
            >
              ⚖️ المقارنة المباشرة
            </button>
            <button
              onClick={() => setViewMode('teacher_breakdown')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                viewMode === 'teacher_breakdown' ? 'bg-white text-[#0D365A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="توزيع الرواتب حسب المعلم"
            >
              👥 حسب المعلم
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-[#0D365A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="جدول الأرقام التفصيلية"
            >
              📋 جدول شهري
            </button>
          </div>
        </div>
      </div>

      {/* 📊 KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 md:p-8 bg-slate-50/40 border-b border-slate-100">
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-150 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase">إجمالي الرواتب المكتسبة</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-[#D4A33C] flex items-center justify-center">
              <DollarSign size={16} />
            </div>
          </div>
          <h4 className="text-lg md:text-xl font-black text-amber-600 mt-2" dir="ltr">
            ₪{overallStats.totalEarned.toLocaleString()}
          </h4>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-bold">
            <span>معدل شهري:</span>
            <span className="text-slate-700 font-black">₪{Math.round(overallStats.avgMonthlyEarned).toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-150 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase">إجمالي الرواتب المسددة</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <h4 className="text-lg md:text-xl font-black text-emerald-600 mt-2" dir="ltr">
            ₪{overallStats.totalPaid.toLocaleString()}
          </h4>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-bold">
            <span>معدل الصرف:</span>
            <span className="text-slate-700 font-black">₪{Math.round(overallStats.avgMonthlyPaid).toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-150 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase">صافي المستحقات المعلقة</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              overallStats.netOutstanding > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <Wallet size={16} />
            </div>
          </div>
          <h4 className={`text-lg md:text-xl font-black mt-2 ${
            overallStats.netOutstanding > 0 ? 'text-rose-600' : 'text-emerald-600'
          }`} dir="ltr">
            ₪{overallStats.netOutstanding.toLocaleString()}
          </h4>
          <div className="flex items-center gap-1 mt-1 text-[10px] font-bold">
            {overallStats.netOutstanding > 0 ? (
              <span className="text-rose-500">ذمم ورواتب مستحقة غير مصروفة</span>
            ) : (
              <span className="text-emerald-600">تمت تسوية جميع الرواتب بنجاح</span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-150 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase">نسبة الرواتب من الدخل</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Percent size={16} />
            </div>
          </div>
          <h4 className="text-lg md:text-xl font-black text-indigo-600 mt-2" dir="ltr">
            {overallStats.overallPayoutRatio.toFixed(1)}%
          </h4>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-400 font-bold">
            <span>ساعات التدريس:</span>
            <span className="text-slate-700 font-black">{overallStats.totalHours} ساعة</span>
          </div>
        </div>
      </div>

      {/* 📈 Main Interactive Chart Area */}
      <div className="p-6 md:p-8">
        {monthlyData.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-center gap-2 text-slate-400">
            <BarChart3 size={36} className="text-slate-300 animate-pulse" />
            <p className="text-xs font-black">لا توجد بيانات رواتب أو حصص مسجلة خلال الفترة المحددة</p>
            <p className="text-[10px] text-slate-400">تأكد من تسجيل الحصص والمدفوعات لتوليد الرسم البياني</p>
          </div>
        ) : (
          <div>
            {/* View Mode: Flows Chart */}
            {viewMode === 'flows' && (
              <div>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      التدفق المالي الشهري للرواتب والإيرادات
                    </h4>
                    <p className="text-[11px] text-slate-400 font-bold">
                      مقارنة رواتب المعلمين المكتسبة والمدفوعة مقابل إيرادات الحصص
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold">نمط الرسم:</span>
                    <button
                      onClick={() => setChartType('composed')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        chartType === 'composed' ? 'bg-[#0D365A] text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      أعمدة + خط
                    </button>
                    <button
                      onClick={() => setChartType('area')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        chartType === 'area' ? 'bg-[#0D365A] text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      مساحي انسيابي
                    </button>
                  </div>
                </div>

                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'composed' ? (
                      <ComposedChart data={monthlyData} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#94a3b8' }} 
                          tickFormatter={(v) => `₪${v}`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                          verticalAlign="top" 
                          align="right" 
                          wrapperStyle={{ paddingBottom: 20, fontSize: 12, fontWeight: 800 }} 
                        />
                        <Bar 
                          dataKey="revenue" 
                          name="إيرادات الحصص" 
                          fill={colors.revenue} 
                          radius={[6, 6, 0, 0]} 
                          maxBarSize={32}
                        />
                        <Bar 
                          dataKey="earnedSalary" 
                          name="الرواتب المكتسبة" 
                          fill={colors.earned} 
                          radius={[6, 6, 0, 0]} 
                          maxBarSize={32}
                        />
                        <Bar 
                          dataKey="paidSalary" 
                          name="الرواتب المسددة فعلياً" 
                          fill={colors.paid} 
                          radius={[6, 6, 0, 0]} 
                          maxBarSize={32}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="profitMargin" 
                          name="صافي هامش المركز" 
                          stroke={colors.profit} 
                          strokeWidth={2.5} 
                          dot={{ r: 4, fill: colors.profit }}
                        />
                      </ComposedChart>
                    ) : (
                      <AreaChart data={monthlyData} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="gradEarned" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.earned} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={colors.earned} stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="gradPaid" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.paid} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={colors.paid} stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.revenue} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={colors.revenue} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: '#94a3b8' }} 
                          tickFormatter={(v) => `₪${v}`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 20, fontSize: 12, fontWeight: 800 }} />
                        <Area 
                          type="monotone" 
                          dataKey="revenue" 
                          name="إيرادات الحصص" 
                          stroke={colors.revenue} 
                          fill="url(#gradRev)" 
                          strokeWidth={2} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="earnedSalary" 
                          name="الرواتب المكتسبة" 
                          stroke={colors.earned} 
                          fill="url(#gradEarned)" 
                          strokeWidth={2.5} 
                        />
                        <Area 
                          type="monotone" 
                          dataKey="paidSalary" 
                          name="الرواتب المسددة فعلياً" 
                          stroke={colors.paid} 
                          fill="url(#gradPaid)" 
                          strokeWidth={2} 
                        />
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* View Mode: Comparison (Earned vs Paid vs Net Flow) */}
            {viewMode === 'comparison' && (
              <div>
                <div className="mb-4">
                  <h4 className="text-sm font-black text-slate-900">
                    مقارنة الرواتب المكتسبة vs الرواتب المسددة والفارق الشهري
                  </h4>
                  <p className="text-[11px] text-slate-400 font-bold">
                    تتبع حجم الذمم والمستحقات المتبقية مقابل ما تم صرفه لكل شهر
                  </p>
                </div>

                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 15, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#94a3b8' }} 
                        tickFormatter={(v) => `₪${v}`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 20, fontSize: 12, fontWeight: 800 }} />
                      <Bar 
                        dataKey="earnedSalary" 
                        name="الرواتب المستحقة (المكتسبة)" 
                        fill={colors.earned} 
                        radius={[6, 6, 0, 0]} 
                      />
                      <Bar 
                        dataKey="paidSalary" 
                        name="الرواتب المصروفة (المسددة)" 
                        fill={colors.paid} 
                        radius={[6, 6, 0, 0]} 
                      />
                      <Bar 
                        dataKey="netFlow" 
                        name="الفارق الشهري (المعلق)" 
                        fill={colors.netFlow} 
                        radius={[6, 6, 0, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* View Mode: Teacher Breakdown */}
            {viewMode === 'teacher_breakdown' && (
              <div>
                <div className="mb-4">
                  <h4 className="text-sm font-black text-slate-900">
                    توزيع الرواتب والمستحقات حسب كل معلم للفترة المحددة
                  </h4>
                  <p className="text-[11px] text-slate-400 font-bold">
                    إجمالي ما استحقه وما استلمه كل معلم مع الرصيد المتبقي
                  </p>
                </div>

                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={teacherStatsList} 
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis 
                        type="number" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fill: '#94a3b8' }} 
                        tickFormatter={(v) => `₪${v}`}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 11, fontWeight: 800, fill: '#334155' }} 
                        width={110}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 20, fontSize: 12, fontWeight: 800 }} />
                      <Bar 
                        dataKey="earned" 
                        name="المستحقات المكتسبة" 
                        fill={colors.earned} 
                        radius={[0, 6, 6, 0]} 
                      />
                      <Bar 
                        dataKey="paid" 
                        name="الرواتب المصروفة" 
                        fill={colors.paid} 
                        radius={[0, 6, 6, 0]} 
                      />
                      <Bar 
                        dataKey="balance" 
                        name="الرصيد المعلق" 
                        fill={colors.netFlow} 
                        radius={[0, 6, 6, 0]} 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* View Mode: Detailed Monthly Table */}
            {viewMode === 'table' && (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500">
                      <th className="py-3 px-4">الشهر</th>
                      <th className="py-3 px-4">ساعات التدريس</th>
                      <th className="py-3 px-4">إيرادات الحصص</th>
                      <th className="py-3 px-4 text-amber-700">الرواتب المكتسبة</th>
                      <th className="py-3 px-4 text-emerald-700">الرواتب المسددة</th>
                      <th className="py-3 px-4">الفارق (الذمة)</th>
                      <th className="py-3 px-4">نسبة الرواتب</th>
                      <th className="py-3 px-4">هامش المركز</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-800">
                    {monthlyData.map((row) => (
                      <tr key={row.key} className="hover:bg-amber-50/20 transition-colors">
                        <td className="py-3 px-4 font-black text-slate-900">{row.name}</td>
                        <td className="py-3 px-4 text-slate-600">{row.hours} ساعة ({row.sessionsCount} حصة)</td>
                        <td className="py-3 px-4 text-indigo-600 font-black">₪{row.revenue.toLocaleString()}</td>
                        <td className="py-3 px-4 text-amber-600 font-black">₪{row.earnedSalary.toLocaleString()}</td>
                        <td className="py-3 px-4 text-emerald-600 font-black">₪{row.paidSalary.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            row.netFlow > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            ₪{row.netFlow.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-bold">{row.payoutRatio}%</td>
                        <td className="py-3 px-4 text-slate-900 font-black">₪{row.profitMargin.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/80 border-t-2 border-slate-300 font-black text-xs text-slate-900">
                      <td className="py-3 px-4">الإجمالي التراكمي:</td>
                      <td className="py-3 px-4">{overallStats.totalHours} ساعة</td>
                      <td className="py-3 px-4 text-indigo-700">₪{overallStats.totalRevenue.toLocaleString()}</td>
                      <td className="py-3 px-4 text-amber-700">₪{overallStats.totalEarned.toLocaleString()}</td>
                      <td className="py-3 px-4 text-emerald-700">₪{overallStats.totalPaid.toLocaleString()}</td>
                      <td className="py-3 px-4 text-rose-700">₪{overallStats.netOutstanding.toLocaleString()}</td>
                      <td className="py-3 px-4">{overallStats.overallPayoutRatio.toFixed(1)}%</td>
                      <td className="py-3 px-4">₪{(overallStats.totalRevenue - overallStats.totalEarned).toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
