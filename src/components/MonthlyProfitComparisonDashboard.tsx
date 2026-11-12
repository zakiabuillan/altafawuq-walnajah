import React, { useState, useMemo, useEffect } from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  Legend, AreaChart, Area, CartesianGrid, LineChart, Line, Cell
} from 'recharts';
import { 
  TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, 
  ArrowUpRight, ArrowDownRight, Sparkles, Layers, FileText, 
  CheckCircle2, AlertCircle, Clock, Users, Wallet, Percent, 
  RefreshCw, ChevronLeft, ChevronRight, Eye, Printer, Award,
  ArrowLeftRight, SlidersHorizontal, CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Expense, Session, Student, Teacher, Payment, StudentCredit, GroupCourse, calculateTeacherSessionPayout, isTrialSession } from '../types';
import { 
  computeMonthlyFinancialReport, 
  ARABIC_MONTH_NAMES, 
  ComputedMonthlyFinancialSummary 
} from '../lib/monthlyFinancialPdfReport';

export interface MonthlyProfitComparisonDashboardProps {
  sessions: Session[];
  expenses: Expense[];
  teachers: Teacher[];
  students: Student[];
  assignments?: any[];
  payments: Payment[];
  credits: StudentCredit[];
  groupCourses?: GroupCourse[];
  globalSettings?: any;
  onOpenMonthlyFinancialReport?: (year: number, month: number) => void;
  selectedPrimaryYear?: number;
  selectedPrimaryMonth?: number;
  selectedSecondaryYear?: number;
  selectedSecondaryMonth?: number;
  onSelectMonths?: (pYear: number, pMonth: number, sYear: number, sMonth: number) => void;
}

const AVAILABLE_YEARS = [2023, 2024, 2025, 2026, 2027, 2028];

export const MonthlyProfitComparisonDashboard: React.FC<MonthlyProfitComparisonDashboardProps> = ({
  sessions,
  expenses,
  teachers,
  students,
  assignments = [],
  payments,
  credits,
  groupCourses = [],
  globalSettings = {},
  onOpenMonthlyFinancialReport,
  selectedPrimaryYear,
  selectedPrimaryMonth,
  selectedSecondaryYear,
  selectedSecondaryMonth,
  onSelectMonths
}) => {
  // Current date reference
  const now = new Date();
  const currentCalendarYear = now.getFullYear();
  const currentCalendarMonth = now.getMonth() + 1; // 1-12

  // Previous month calculation
  const defaultPrevMonth = currentCalendarMonth === 1 ? 12 : currentCalendarMonth - 1;
  const defaultPrevYear = currentCalendarMonth === 1 ? currentCalendarYear - 1 : currentCalendarYear;

  // Selected Months state
  const [currentYear, setCurrentYear] = useState<number>(selectedPrimaryYear || currentCalendarYear);
  const [currentMonth, setCurrentMonth] = useState<number>(selectedPrimaryMonth || currentCalendarMonth);
  const [prevYear, setPrevYear] = useState<number>(selectedSecondaryYear || defaultPrevYear);
  const [prevMonth, setPrevMonth] = useState<number>(selectedSecondaryMonth || defaultPrevMonth);

  // Sync if controlled props change
  useEffect(() => {
    if (selectedPrimaryYear && selectedPrimaryYear !== currentYear) setCurrentYear(selectedPrimaryYear);
    if (selectedPrimaryMonth && selectedPrimaryMonth !== currentMonth) setCurrentMonth(selectedPrimaryMonth);
    if (selectedSecondaryYear && selectedSecondaryYear !== prevYear) setPrevYear(selectedSecondaryYear);
    if (selectedSecondaryMonth && selectedSecondaryMonth !== prevMonth) setPrevMonth(selectedSecondaryMonth);
  }, [selectedPrimaryYear, selectedPrimaryMonth, selectedSecondaryYear, selectedSecondaryMonth]);

  const updateMonths = (pYear: number, pMonth: number, sYear: number, sMonth: number) => {
    setCurrentYear(pYear);
    setCurrentMonth(pMonth);
    setPrevYear(sYear);
    setPrevMonth(sMonth);
    onSelectMonths?.(pYear, pMonth, sYear, sMonth);
  };

  // Preset Comparison Handlers
  const applyPresetCurrentVsPrev = () => {
    updateMonths(currentCalendarYear, currentCalendarMonth, defaultPrevYear, defaultPrevMonth);
  };

  const applyPresetYearOverYear = () => {
    updateMonths(currentCalendarYear, currentCalendarMonth, currentCalendarYear - 1, currentCalendarMonth);
  };

  const applyPresetQuarterOverQuarter = () => {
    const qMonth = currentCalendarMonth - 3 <= 0 ? currentCalendarMonth - 3 + 12 : currentCalendarMonth - 3;
    const qYear = currentCalendarMonth - 3 <= 0 ? currentCalendarYear - 1 : currentCalendarYear;
    updateMonths(currentCalendarYear, currentCalendarMonth, qYear, qMonth);
  };

  const applyPresetCompletedMonths = () => {
    const compPMonth = defaultPrevMonth;
    const compPYear = defaultPrevYear;
    const compSMonth = compPMonth === 1 ? 12 : compPMonth - 1;
    const compSYear = compPMonth === 1 ? compPYear - 1 : compPYear;
    updateMonths(compPYear, compPMonth, compSYear, compSMonth);
  };

  const applyPresetYearToDate = () => {
    updateMonths(currentCalendarYear, currentCalendarMonth, currentCalendarYear, 1);
  };

  const handleSwapMonths = () => {
    updateMonths(prevYear, prevMonth, currentYear, currentMonth);
  };

  const handleStepPrimary = (delta: number) => {
    let nextMonth = currentMonth + delta;
    let nextYear = currentYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    updateMonths(nextYear, nextMonth, prevYear, prevMonth);
  };

  const handleStepSecondary = (delta: number) => {
    let nextMonth = prevMonth + delta;
    let nextYear = prevYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    updateMonths(currentYear, currentMonth, nextYear, nextMonth);
  };

  // Active Preset Detection
  const activePreset = useMemo(() => {
    if (currentYear === currentCalendarYear && currentMonth === currentCalendarMonth && prevYear === defaultPrevYear && prevMonth === defaultPrevMonth) {
      return 'current_vs_prev';
    }
    if (currentYear === currentCalendarYear && currentMonth === currentCalendarMonth && prevYear === currentCalendarYear - 1 && prevMonth === currentCalendarMonth) {
      return 'yoy';
    }
    const qMonth = currentCalendarMonth - 3 <= 0 ? currentCalendarMonth - 3 + 12 : currentCalendarMonth - 3;
    const qYear = currentCalendarMonth - 3 <= 0 ? currentCalendarYear - 1 : currentCalendarYear;
    if (currentYear === currentCalendarYear && currentMonth === currentCalendarMonth && prevYear === qYear && prevMonth === qMonth) {
      return 'qoq';
    }
    const compPMonth = defaultPrevMonth;
    const compPYear = defaultPrevYear;
    const compSMonth = compPMonth === 1 ? 12 : compPMonth - 1;
    const compSYear = compPMonth === 1 ? compPYear - 1 : compPYear;
    if (currentYear === compPYear && currentMonth === compPMonth && prevYear === compSYear && prevMonth === compSMonth) {
      return 'completed_months';
    }
    if (currentYear === currentCalendarYear && currentMonth === currentCalendarMonth && prevYear === currentCalendarYear && prevMonth === 1) {
      return 'ytd';
    }
    return 'custom';
  }, [currentYear, currentMonth, prevYear, prevMonth, currentCalendarYear, currentCalendarMonth, defaultPrevYear, defaultPrevMonth]);

  // Visualization mode
  const [chartMode, setChartMode] = useState<'overview' | 'daily_trajectory' | 'subjects'>('overview');
  const [dailyViewType, setDailyViewType] = useState<'cumulative' | 'daily'>('cumulative');

  // Compute reports for both months using the audited helper
  const currentSummary: ComputedMonthlyFinancialSummary = useMemo(() => {
    return computeMonthlyFinancialReport({
      year: currentYear,
      month: currentMonth,
      sessions,
      expenses,
      teachers,
      students,
      assignments,
      payments,
      credits,
      groupCourses,
      globalSettings
    });
  }, [currentYear, currentMonth, sessions, expenses, teachers, students, assignments, payments, credits, groupCourses, globalSettings]);

  const prevSummary: ComputedMonthlyFinancialSummary = useMemo(() => {
    return computeMonthlyFinancialReport({
      year: prevYear,
      month: prevMonth,
      sessions,
      expenses,
      teachers,
      students,
      assignments,
      payments,
      credits,
      groupCourses,
      globalSettings
    });
  }, [prevYear, prevMonth, sessions, expenses, teachers, students, assignments, payments, credits, groupCourses, globalSettings]);

  // Financial Deltas and Growth Percentages
  const profitDelta = currentSummary.netRealizedProfit - prevSummary.netRealizedProfit;
  const profitGrowthPercent = prevSummary.netRealizedProfit !== 0 
    ? ((profitDelta / Math.abs(prevSummary.netRealizedProfit)) * 100) 
    : (currentSummary.netRealizedProfit > 0 ? 100 : 0);

  const revenueDelta = currentSummary.totalTeachingRevenue - prevSummary.totalTeachingRevenue;
  const revenueGrowthPercent = prevSummary.totalTeachingRevenue > 0 
    ? ((revenueDelta / prevSummary.totalTeachingRevenue) * 100) 
    : (currentSummary.totalTeachingRevenue > 0 ? 100 : 0);

  const payoutsDelta = currentSummary.totalTeacherPayouts - prevSummary.totalTeacherPayouts;
  const payoutsGrowthPercent = prevSummary.totalTeacherPayouts > 0 
    ? ((payoutsDelta / prevSummary.totalTeacherPayouts) * 100) 
    : 0;

  const expensesDelta = currentSummary.totalOperatingExpenses - prevSummary.totalOperatingExpenses;
  const expensesGrowthPercent = prevSummary.totalOperatingExpenses > 0 
    ? ((expensesDelta / prevSummary.totalOperatingExpenses) * 100) 
    : 0;

  const hoursDelta = currentSummary.totalHoursTaught - prevSummary.totalHoursTaught;
  const sessionsDelta = currentSummary.totalSessionsCount - prevSummary.totalSessionsCount;

  // Day-by-Day Daily & Cumulative Profit Trajectory (Days 1 to 31)
  const dailyComparisonData = useMemo(() => {
    const currentPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    const prevPrefix = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

    // Get max days in each month
    const maxDaysCurrent = new Date(currentYear, currentMonth, 0).getDate();
    const maxDaysPrev = new Date(prevYear, prevMonth, 0).getDate();
    const maxDays = Math.max(maxDaysCurrent, maxDaysPrev);

    // Helpers to resolve session rate
    const getStudentRate = (studentId: string, teacherId: string) => {
      const student = students.find(st => st.id === studentId);
      const teacher = teachers.find(t => t.id === teacherId);
      if (student?.customRates?.[teacherId] !== undefined) return student.customRates[teacherId];
      if (student?.hourlyRate !== undefined && student?.hourlyRate !== 0) return student.hourlyRate;
      return teacher?.billingRate || teacher?.hourlyRate || globalSettings?.defaultStudentHourlyRate || 60;
    };

    const defaultTeacherRate = globalSettings?.defaultTeacherHourlyRate || 35;

    // Calculate daily amounts
    const currentDailyProfits: number[] = new Array(32).fill(0);
    const prevDailyProfits: number[] = new Array(32).fill(0);
    const currentDailyRevenues: number[] = new Array(32).fill(0);
    const prevDailyRevenues: number[] = new Array(32).fill(0);

    sessions.forEach(s => {
      if (!s.date || s.approved === false) return;
      const hours = Number(s.durationHours) || 0;
      const isTrial = isTrialSession(s);
      const sFee = isTrial ? 0 : (s.customFee !== undefined && s.customFee !== null ? Number(s.customFee) : hours * getStudentRate(s.studentId, s.teacherId));
      const teacher = teachers.find(t => t.id === s.teacherId);
      const tPayout = calculateTeacherSessionPayout(s, teacher, assignments, defaultTeacherRate);
      const sessionProfit = sFee - tPayout;

      if (s.date.startsWith(currentPrefix)) {
        const day = parseInt(s.date.split('-')[2], 10);
        if (day >= 1 && day <= 31) {
          currentDailyProfits[day] += sessionProfit;
          currentDailyRevenues[day] += sFee;
        }
      } else if (s.date.startsWith(prevPrefix)) {
        const day = parseInt(s.date.split('-')[2], 10);
        if (day >= 1 && day <= 31) {
          prevDailyProfits[day] += sessionProfit;
          prevDailyRevenues[day] += sFee;
        }
      }
    });

    // Subtract daily expenses
    expenses.forEach(e => {
      if (!e.date) return;
      const amt = Number(e.amount) || 0;
      if (e.date.startsWith(currentPrefix)) {
        const day = parseInt(e.date.split('-')[2], 10);
        if (day >= 1 && day <= 31) {
          currentDailyProfits[day] -= amt;
        }
      } else if (e.date.startsWith(prevPrefix)) {
        const day = parseInt(e.date.split('-')[2], 10);
        if (day >= 1 && day <= 31) {
          prevDailyProfits[day] -= amt;
        }
      }
    });

    let currentCumulative = 0;
    let prevCumulative = 0;

    const data = [];
    for (let day = 1; day <= maxDays; day++) {
      currentCumulative += currentDailyProfits[day];
      prevCumulative += prevDailyProfits[day];

      const isFutureDayInCurrent = currentYear === currentCalendarYear && 
        currentMonth === currentCalendarMonth && 
        day > now.getDate();

      data.push({
        day: `يوم ${day}`,
        dayNum: day,
        currentCumulative: isFutureDayInCurrent ? null : Math.round(currentCumulative),
        prevCumulative: day <= maxDaysPrev ? Math.round(prevCumulative) : null,
        currentDaily: isFutureDayInCurrent ? null : Math.round(currentDailyProfits[day]),
        prevDaily: day <= maxDaysPrev ? Math.round(prevDailyProfits[day]) : null,
        currentRevenue: isFutureDayInCurrent ? null : Math.round(currentDailyRevenues[day]),
        prevRevenue: day <= maxDaysPrev ? Math.round(prevDailyRevenues[day]) : null,
      });
    }

    return data;
  }, [currentYear, currentMonth, prevYear, prevMonth, sessions, expenses, students, teachers, globalSettings, currentCalendarYear, currentCalendarMonth, now]);

  // Comparative metrics for grouped bar chart
  const financialBarsData = useMemo(() => {
    return [
      {
        metric: 'إجمالي الإيرادات',
        [prevSummary.monthNameArabic]: Math.round(prevSummary.totalTeachingRevenue),
        [currentSummary.monthNameArabic]: Math.round(currentSummary.totalTeachingRevenue),
        delta: revenueDelta,
        unit: '₪',
        isGrowth: revenueDelta >= 0,
        currentColor: revenueDelta >= 0 ? '#10B981' : '#EF4444'
      },
      {
        metric: 'أجور المعلمين',
        [prevSummary.monthNameArabic]: Math.round(prevSummary.totalTeacherPayouts),
        [currentSummary.monthNameArabic]: Math.round(currentSummary.totalTeacherPayouts),
        delta: payoutsDelta,
        unit: '₪',
        isGrowth: payoutsDelta <= 0,
        currentColor: payoutsDelta <= 0 ? '#10B981' : '#F59E0B'
      },
      {
        metric: 'المصاريف التشغيلية',
        [prevSummary.monthNameArabic]: Math.round(prevSummary.totalOperatingExpenses),
        [currentSummary.monthNameArabic]: Math.round(currentSummary.totalOperatingExpenses),
        delta: expensesDelta,
        unit: '₪',
        isGrowth: expensesDelta <= 0,
        currentColor: expensesDelta <= 0 ? '#10B981' : '#F59E0B'
      },
      {
        metric: 'صافي أرباح المركز',
        [prevSummary.monthNameArabic]: Math.round(prevSummary.netRealizedProfit),
        [currentSummary.monthNameArabic]: Math.round(currentSummary.netRealizedProfit),
        delta: profitDelta,
        unit: '₪',
        isGrowth: profitDelta >= 0,
        currentColor: profitDelta >= 0 ? '#10B981' : '#EF4444'
      }
    ];
  }, [currentSummary, prevSummary, revenueDelta, payoutsDelta, expensesDelta, profitDelta]);

  // Subject Contribution Comparison Data
  const subjectsComparisonData = useMemo(() => {
    const subjectMap: Record<string, { currentProfit: number; prevProfit: number; currentHours: number; prevHours: number }> = {};

    currentSummary.subjectBreakdown.forEach(sub => {
      if (!subjectMap[sub.name]) {
        subjectMap[sub.name] = { currentProfit: 0, prevProfit: 0, currentHours: 0, prevHours: 0 };
      }
      subjectMap[sub.name].currentProfit += sub.netProfit;
      subjectMap[sub.name].currentHours += sub.hours;
    });

    prevSummary.subjectBreakdown.forEach(sub => {
      if (!subjectMap[sub.name]) {
        subjectMap[sub.name] = { currentProfit: 0, prevProfit: 0, currentHours: 0, prevHours: 0 };
      }
      subjectMap[sub.name].prevProfit += sub.netProfit;
      subjectMap[sub.name].prevHours += sub.hours;
    });

    return Object.entries(subjectMap)
      .map(([name, val]) => ({
        name,
        currentProfit: Math.round(val.currentProfit),
        prevProfit: Math.round(val.prevProfit),
        delta: Math.round(val.currentProfit - val.prevProfit),
        currentHours: Math.round(val.currentHours * 10) / 10,
        prevHours: Math.round(val.prevHours * 10) / 10,
      }))
      .sort((a, b) => b.currentProfit - a.currentProfit)
      .slice(0, 6);
  }, [currentSummary, prevSummary]);

  // Reset to current vs previous month
  const handleResetToDefaultMonths = () => {
    setCurrentYear(currentCalendarYear);
    setCurrentMonth(currentCalendarMonth);
    setPrevYear(defaultPrevYear);
    setPrevMonth(defaultPrevMonth);
  };

  const isProfitGrowing = profitDelta >= 0;

  return (
    <div 
      id="monthly-profit-comparison-dashboard"
      className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden text-right p-6 sm:p-8 space-y-8"
      dir="rtl"
    >
      {/* 1. Header & Quick Overview */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-750 border border-indigo-200/80 rounded-full text-xs font-black flex items-center gap-1.5 shadow-sm">
              <Sparkles size={13} className="text-indigo-600" />
              <span>لوحة التحليل والمقارنة البيانية للأرباح</span>
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-sm ${
              isProfitGrowing 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80' 
                : 'bg-rose-50 text-rose-800 border border-rose-200/80'
            }`}>
              {isProfitGrowing ? (
                <>
                  <TrendingUp size={14} className="text-emerald-600" />
                  <span>نمو الأرباح: {profitGrowthPercent >= 0 ? `+${profitGrowthPercent.toFixed(1)}%` : `${profitGrowthPercent.toFixed(1)}%`} ({profitDelta >= 0 ? `+₪${profitDelta.toLocaleString()}` : `₪${profitDelta.toLocaleString()}`})</span>
                </>
              ) : (
                <>
                  <TrendingDown size={14} className="text-rose-600" />
                  <span>تراجع الأرباح: {profitGrowthPercent.toFixed(1)}% (₪{profitDelta.toLocaleString()})</span>
                </>
              )}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
            <span>مقارنة أرباح المركز: {currentSummary.monthNameArabic} {currentYear}</span>
            <span className="text-slate-400 text-lg font-bold">مقابل</span>
            <span className="text-slate-700">{prevSummary.monthNameArabic} {prevYear}</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium max-w-3xl leading-relaxed">
            رصد بياني دقيق ومقارن للأرباح التشغيلية، هوامش الربحية، الإيرادات التدريسية، وتكاليف الكادر والمصروفات بين أي شهرين وسنتين يختارهما المدير.
          </p>
        </div>

        {/* Quick Month Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {onOpenMonthlyFinancialReport && (
            <button
              type="button"
              onClick={() => onOpenMonthlyFinancialReport(currentYear, currentMonth)}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Eye size={14} />
              <span>كشف {currentSummary.monthNameArabic.split(' ')[0]} {currentYear} ↗</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Interactive Comparison Period Controller Box */}
      <div className="bg-slate-50/95 p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/70 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={17} className="text-indigo-600" />
            <h3 className="text-xs sm:text-sm font-black text-slate-900">
              تحديد وتخصيص شهري وسنتي المقارنة المالية
            </h3>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
              خيارات ممتدة
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 flex-wrap">
            <span className="text-slate-400 text-[11px]">الفترة المقارنة:</span>
            <span className="bg-white border-2 border-indigo-300 px-2.5 py-1 rounded-lg text-indigo-900 font-black shadow-xs">
              {currentSummary.monthNameArabic} {currentYear}
            </span>
            <span className="text-slate-400 font-black">مقابل</span>
            <span className="bg-white border border-slate-300 px-2.5 py-1 rounded-lg text-slate-800 font-black shadow-xs">
              {prevSummary.monthNameArabic} {prevYear}
            </span>
          </div>
        </div>

        {/* Quick Comparison Presets Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-black text-slate-500 shrink-0">قوالب المقارنة الجاهزة:</span>
            
            <button
              id="preset-current-vs-prev"
              type="button"
              onClick={applyPresetCurrentVsPrev}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activePreset === 'current_vs_prev'
                  ? 'bg-[#0D365A] text-white shadow-sm ring-2 ring-[#0D365A]/20'
                  : 'bg-white border border-slate-250 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>⚡ الشهر الحالي vs السابق</span>
            </button>

            <button
              id="preset-yoy"
              type="button"
              onClick={applyPresetYearOverYear}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activePreset === 'yoy'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/20'
                  : 'bg-white border border-slate-250 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <CalendarDays size={13} />
              <span>مقارنة سنوية (نفس الشهر العام الماضي YoY)</span>
            </button>

            <button
              id="preset-qoq"
              type="button"
              onClick={applyPresetQuarterOverQuarter}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activePreset === 'qoq'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/20'
                  : 'bg-white border border-slate-250 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>📊 ربع سنوي (قبل 3 أشهر QoQ)</span>
            </button>

            <button
              id="preset-completed-months"
              type="button"
              onClick={applyPresetCompletedMonths}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activePreset === 'completed_months'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/20'
                  : 'bg-white border border-slate-250 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>⏱️ الشهران السابقان المكتملان</span>
            </button>

            <button
              id="preset-ytd"
              type="button"
              onClick={applyPresetYearToDate}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activePreset === 'ytd'
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-600/20'
                  : 'bg-white border border-slate-250 text-slate-700 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span>🚩 بداية العام (يناير vs الحالي)</span>
            </button>
          </div>
        </div>

        {/* Detailed Month & Year Pickers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center pt-2">
          {/* Secondary Month Selector (شهر الأساس) */}
          <div className="md:col-span-5 bg-white p-3.5 rounded-xl border border-slate-250 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" />
                <span>شهر الأساس المرجعي (الشهر الثاني)</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleStepSecondary(-1)}
                  title="الشهر السابق"
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleStepSecondary(1)}
                  title="الشهر اللاحق"
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                >
                  <ChevronLeft size={15} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <select
                  id="select-prev-month"
                  value={prevMonth}
                  onChange={(e) => updateMonths(currentYear, currentMonth, prevYear, Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-500 cursor-pointer"
                >
                  {ARABIC_MONTH_NAMES.map((name, idx) => (
                    <option key={`prev-m-${idx + 1}`} value={idx + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  id="select-prev-year"
                  value={prevYear}
                  onChange={(e) => updateMonths(currentYear, currentMonth, Number(e.target.value), prevMonth)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-500 cursor-pointer text-center"
                >
                  {AVAILABLE_YEARS.map((yr) => (
                    <option key={`prev-yr-${yr}`} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Center Swap Button (⇄) */}
          <div className="md:col-span-1 flex flex-col items-center justify-center">
            <button
              id="btn-swap-comparison-months"
              type="button"
              onClick={handleSwapMonths}
              title="عكس اتجاه المقارنة (تبديل الشهرين)"
              className="p-3 bg-white hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-300 hover:border-indigo-300 rounded-2xl transition-all shadow-xs cursor-pointer hover:scale-105 active:scale-95"
            >
              <ArrowLeftRight size={18} />
            </button>
            <span className="text-[9px] font-bold text-slate-400 mt-1 hidden md:block">تبديل ⇄</span>
          </div>

          {/* Primary Month Selector (شهر المقارنة المستهدف) */}
          <div className="md:col-span-5 bg-white p-3.5 rounded-xl border-2 border-indigo-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                <span>شهر المقارنة المستهدف (الشهر الأول)</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleStepPrimary(-1)}
                  title="الشهر السابق"
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                >
                  <ChevronRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => handleStepPrimary(1)}
                  title="الشهر اللاحق"
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                >
                  <ChevronLeft size={15} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <select
                  id="select-current-month"
                  value={currentMonth}
                  onChange={(e) => updateMonths(currentYear, Number(e.target.value), prevYear, prevMonth)}
                  className="w-full bg-indigo-50/50 border border-indigo-300 rounded-xl px-3 py-2 text-xs font-black text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-600 cursor-pointer"
                >
                  {ARABIC_MONTH_NAMES.map((name, idx) => (
                    <option key={`cur-m-${idx + 1}`} value={idx + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  id="select-current-year"
                  value={currentYear}
                  onChange={(e) => updateMonths(Number(e.target.value), currentMonth, prevYear, prevMonth)}
                  className="w-full bg-indigo-50/50 border border-indigo-300 rounded-xl px-3 py-2 text-xs font-black text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-600 cursor-pointer text-center"
                >
                  {AVAILABLE_YEARS.map((yr) => (
                    <option key={`cur-yr-${yr}`} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Key Metric Comparison Cards (Bento Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: Net Realized Profit (Primary Metric) */}
        <div className={`p-5 rounded-2xl border transition-all ${
          isProfitGrowing 
            ? 'bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border-emerald-200 shadow-sm' 
            : 'bg-gradient-to-br from-rose-50/80 to-amber-50/30 border-rose-200 shadow-sm'
        }`}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black text-slate-600 uppercase">صافي أرباح المركز (Net Profit)</span>
            <div className={`p-2 rounded-xl text-xs font-black flex items-center gap-1 ${
              isProfitGrowing ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-700'
            }`}>
              {isProfitGrowing ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>{profitGrowthPercent >= 0 ? `+${profitGrowthPercent.toFixed(1)}%` : `${profitGrowthPercent.toFixed(1)}%`}</span>
            </div>
          </div>

          <div className="mt-3 space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-sans tracking-tight">
                ₪{Math.round(currentSummary.netRealizedProfit).toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-500">
                الشهر الحالي ({currentSummary.monthNameArabic.split(' ')[0]})
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/60 text-slate-500">
              <span>الشهر السابق:</span>
              <span className="font-mono font-bold text-slate-700">₪{Math.round(prevSummary.netRealizedProfit).toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>الفارق المالي:</span>
              <span className={`font-mono font-black ${profitDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {profitDelta >= 0 ? `+₪${Math.round(profitDelta).toLocaleString()}` : `₪${Math.round(profitDelta).toLocaleString()}`}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Revenue */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black text-slate-500 uppercase">إجمالي إيرادات الحصص</span>
            <div className={`p-2 rounded-xl text-xs font-black flex items-center gap-1 ${
              revenueDelta >= 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-600'
            }`}>
              {revenueDelta >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              <span>{revenueGrowthPercent >= 0 ? `+${revenueGrowthPercent.toFixed(1)}%` : `${revenueGrowthPercent.toFixed(1)}%`}</span>
            </div>
          </div>

          <div className="mt-3 space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl sm:text-3xl font-black text-indigo-950 font-sans tracking-tight">
                ₪{Math.round(currentSummary.totalTeachingRevenue).toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-400">
                الحالي
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
              <span>الشهر السابق:</span>
              <span className="font-mono font-bold text-slate-700">₪{Math.round(prevSummary.totalTeachingRevenue).toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>الفارق المالي:</span>
              <span className={`font-mono font-black ${revenueDelta >= 0 ? 'text-indigo-700' : 'text-slate-700'}`}>
                {revenueDelta >= 0 ? `+₪${Math.round(revenueDelta).toLocaleString()}` : `₪${Math.round(revenueDelta).toLocaleString()}`}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Teacher Payouts */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black text-slate-500 uppercase">أجور ورواتب المعلمين</span>
            <div className="p-2 bg-amber-500/10 text-amber-800 rounded-xl text-xs font-black flex items-center gap-1">
              <span>{payoutsGrowthPercent >= 0 ? `+${payoutsGrowthPercent.toFixed(1)}%` : `${payoutsGrowthPercent.toFixed(1)}%`}</span>
            </div>
          </div>

          <div className="mt-3 space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-sans tracking-tight">
                ₪{Math.round(currentSummary.totalTeacherPayouts).toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-400">
                الحالي
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
              <span>الشهر السابق:</span>
              <span className="font-mono font-bold text-slate-700">₪{Math.round(prevSummary.totalTeacherPayouts).toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>الفارق المالي:</span>
              <span className="font-mono font-bold text-slate-700">
                {payoutsDelta >= 0 ? `+₪${Math.round(payoutsDelta).toLocaleString()}` : `₪${Math.round(payoutsDelta).toLocaleString()}`}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Operating Expenses & Margin */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-black text-slate-500 uppercase">المصاريف وهامش الربح</span>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
              currentSummary.netProfitMarginPercentage >= prevSummary.netProfitMarginPercentage 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-amber-100 text-amber-800'
            }`}>
              هامش: {currentSummary.netProfitMarginPercentage.toFixed(1)}%
            </span>
          </div>

          <div className="mt-3 space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-sans tracking-tight">
                ₪{Math.round(currentSummary.totalOperatingExpenses).toLocaleString()}
              </span>
              <span className="text-xs font-bold text-slate-400">
                مصاريف الحالي
              </span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
              <span>مصاريف السابق:</span>
              <span className="font-mono font-bold text-slate-700">₪{Math.round(prevSummary.totalOperatingExpenses).toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>هامش الشهر السابق:</span>
              <span className="font-mono font-bold text-slate-700">{prevSummary.netProfitMarginPercentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>

      </div>

      {/* 3. Visual Charts Section with Mode Tabs */}
      <div className="bg-slate-50/60 p-6 sm:p-7 rounded-3xl border border-slate-200/80 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-0.5">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <BarChart3 size={18} className="text-indigo-600" />
              <span>الرسوم البيانية التفاعلية للمقارنة المالية</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              اختر نوع التمثيل البياني لعرض مقارنة الأرباح المباشرة وتطورها التراكمي
            </p>
          </div>

          {/* Visualization Mode Selector */}
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm shrink-0 self-start sm:self-auto">
            <button
              id="chart-mode-overview"
              type="button"
              onClick={() => setChartMode('overview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                chartMode === 'overview' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              الأعمدة المقارنة الشاملة 📊
            </button>
            <button
              id="chart-mode-daily"
              type="button"
              onClick={() => setChartMode('daily_trajectory')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                chartMode === 'daily_trajectory' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              مسار الأرباح اليومي 📈
            </button>
            <button
              id="chart-mode-subjects"
              type="button"
              onClick={() => setChartMode('subjects')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                chartMode === 'subjects' 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              أرباح المواد الدراسية 📚
            </button>
          </div>
        </div>

        {/* Dynamic Profit Status & Visual Color Indicator Guide */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500">حالة صافي أرباح المقارنة:</span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border ${
              isProfitGrowing 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${isProfitGrowing ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span>{isProfitGrowing ? `نمو صاعد بالأرباح (+${profitGrowthPercent.toFixed(1)}%) 🟢` : `انخفاض وتراجع في الأرباح (${profitGrowthPercent.toFixed(1)}%) 🔴`}</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
            <span className="text-slate-400">دلالات الألوان والأنماط الرسومية (Accessible Patterns):</span>
            <span className="inline-flex items-center gap-1.5 text-slate-700 bg-slate-100/90 px-2.5 py-1 rounded-lg border border-slate-200 font-bold">
              <span className="font-mono text-slate-500 font-black">╌╌╌ ○</span>
              <span>شهر الأساس (متقطع/مجوف)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-lg border border-emerald-200/60 font-black">
              <span className="font-mono text-emerald-600 font-black">─── ●</span>
              <span>نمو متفوق 🟢 (متصل/مصمت)</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-rose-700 bg-rose-50/80 px-2.5 py-1 rounded-lg border border-rose-200/60 font-black">
              <span className="font-mono text-rose-600 font-black">─── ●</span>
              <span>تراجع 🔴 (متصل/مصمت)</span>
            </span>
          </div>
        </div>

        {/* View 1: Overview Grouped Bar Chart */}
        {chartMode === 'overview' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-[#0D365A] inline-block" />
                <span>{prevSummary.monthNameArabic} (شهر الأساس المرجعي)</span>
                <span className={`w-3 h-3 rounded-md inline-block mr-3 ${isProfitGrowing ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`} />
                <span>{currentSummary.monthNameArabic} (شهر المقارنة المستهدف)</span>
              </span>
              <span className="text-[11px] text-slate-400">القيم مقاسة بالشيكل (₪)</span>
            </div>

            <div className="h-[320px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={financialBarsData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="metric" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fontWeight: 800, fill: '#475569' }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }}
                    tickFormatter={(val) => `₪${val.toLocaleString()}`}
                    width={70}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF', 
                      borderRadius: 16, 
                      border: '1px solid #E2E8F0', 
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      direction: 'rtl',
                      textAlign: 'right',
                      fontSize: 11,
                      fontWeight: 'bold'
                    }}
                    formatter={(value: any, name: string, item: any) => {
                      const isCurrent = name === currentSummary.monthNameArabic;
                      const delta = item?.payload?.delta;
                      const isGrowth = item?.payload?.isGrowth;
                      const deltaText = isCurrent && delta !== undefined 
                        ? (delta >= 0 ? ` (فارق: +₪${delta.toLocaleString()} 🟢)` : ` (فارق: ₪${delta.toLocaleString()} 🔴)`)
                        : '';
                      return [`₪${Number(value).toLocaleString()}${deltaText}`, name];
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="left" 
                    wrapperStyle={{ paddingBottom: 15, fontSize: 11, fontWeight: 'bold' }} 
                  />
                  <Bar 
                    dataKey={prevSummary.monthNameArabic} 
                    fill="#0D365A" 
                    stroke="#0F172A"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    radius={[8, 8, 0, 0]} 
                    barSize={32}
                  />
                  <Bar 
                    dataKey={currentSummary.monthNameArabic} 
                    stroke="#0F172A"
                    strokeWidth={1}
                    radius={[8, 8, 0, 0]} 
                    barSize={32}
                  >
                    {financialBarsData.map((entry, index) => (
                      <Cell 
                        key={`cell-bar-${index}`} 
                        fill={entry.currentColor} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* View 2: Day-by-Day Daily / Cumulative Profit Trajectory */}
        {chartMode === 'daily_trajectory' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2 font-bold text-slate-600">
                <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-black">
                  <span className="font-mono text-slate-500 font-black">╌╌╌ ○</span>
                  <span>{prevSummary.monthNameArabic} (متقطع / مجوف)</span>
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-black ${
                  isProfitGrowing ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  <span className="font-mono font-black">─── ●</span>
                  <span>{currentSummary.monthNameArabic} ({isProfitGrowing ? 'متصل 🟢' : 'متصل 🔴'})</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm shrink-0">
                <button
                  type="button"
                  onClick={() => setDailyViewType('cumulative')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    dailyViewType === 'cumulative' 
                      ? (isProfitGrowing ? 'bg-emerald-600 text-white shadow-sm' : 'bg-rose-600 text-white shadow-sm') 
                      : 'text-slate-600'
                  }`}
                >
                  التراكمي (Cumulative)
                </button>
                <button
                  type="button"
                  onClick={() => setDailyViewType('daily')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    dailyViewType === 'daily' 
                      ? (isProfitGrowing ? 'bg-emerald-600 text-white shadow-sm' : 'bg-rose-600 text-white shadow-sm') 
                      : 'text-slate-600'
                  }`}
                >
                  اليومي المنفرد (Daily)
                </button>
              </div>
            </div>

            <div className="h-[320px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                {dailyViewType === 'cumulative' ? (
                  <AreaChart data={dailyComparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                    <defs>
                      <linearGradient id="currentProfitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isProfitGrowing ? "#10B981" : "#EF4444"} stopOpacity={0.35}/>
                        <stop offset="95%" stopColor={isProfitGrowing ? "#10B981" : "#EF4444"} stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="prevProfitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }} 
                      interval={2}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }}
                      tickFormatter={(val) => `₪${val.toLocaleString()}`}
                      width={70}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#FFFFFF', 
                        borderRadius: 16, 
                        border: '1px solid #E2E8F0', 
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        direction: 'rtl',
                        textAlign: 'right',
                        fontSize: 11,
                        fontWeight: 'bold'
                      }} 
                      formatter={(value: any, name: string) => [
                        `₪${Number(value).toLocaleString()}`, 
                        name.includes('current') || name.includes(currentSummary.monthNameArabic) 
                          ? `${currentSummary.monthNameArabic} (${isProfitGrowing ? 'نمو 🟢' : 'انخفاض 🔴'})` 
                          : prevSummary.monthNameArabic
                      ]}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      iconType="plainline" 
                      wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontWeight: 'bold' }} 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="prevCumulative" 
                      name={`${prevSummary.monthNameArabic} (متقطع ╌╌ ○)`} 
                      stroke="#64748B" 
                      strokeWidth={2.5}
                      strokeDasharray="6 4"
                      dot={{ r: 3.5, fill: '#FFFFFF', stroke: '#64748B', strokeWidth: 2 }}
                      activeDot={{ r: 6.5, fill: '#64748B', stroke: '#FFFFFF', strokeWidth: 2 }}
                      fillOpacity={1} 
                      fill="url(#prevProfitGrad)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="currentCumulative" 
                      name={`${currentSummary.monthNameArabic} (متصل ── ● ${isProfitGrowing ? 'نمو 🟢' : 'تراجع 🔴'})`} 
                      stroke={isProfitGrowing ? "#10B981" : "#EF4444"} 
                      strokeWidth={3.5}
                      strokeDasharray="0"
                      dot={{ r: 4, fill: isProfitGrowing ? '#10B981' : '#EF4444', stroke: '#FFFFFF', strokeWidth: 2 }}
                      activeDot={{ r: 7.5, fill: isProfitGrowing ? '#10B981' : '#EF4444', stroke: '#FFFFFF', strokeWidth: 2 }}
                      fillOpacity={1} 
                      fill="url(#currentProfitGrad)" 
                    />
                  </AreaChart>
                ) : (
                  <BarChart data={dailyComparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis 
                      dataKey="day" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 9, fontWeight: 700, fill: '#64748B' }} 
                      interval={2}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }}
                      tickFormatter={(val) => `₪${val.toLocaleString()}`}
                      width={70}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#FFFFFF', 
                        borderRadius: 16, 
                        border: '1px solid #E2E8F0', 
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        direction: 'rtl',
                        textAlign: 'right',
                        fontSize: 11,
                        fontWeight: 'bold'
                      }} 
                      formatter={(value: any, name: string, item: any) => {
                        const isCurrent = name === currentSummary.monthNameArabic || name === 'currentDaily' || name.includes('الحالي') || name.includes(currentSummary.monthNameArabic);
                        const dayData = item?.payload;
                        const dayDelta = dayData ? (dayData.currentDaily - dayData.prevDaily) : 0;
                        const deltaBadge = isCurrent 
                          ? (dayDelta >= 0 ? ` (نمو اليوم: +₪${dayDelta.toLocaleString()} 🟢)` : ` (تراجع اليوم: ₪${dayDelta.toLocaleString()} 🔴)`)
                          : '';
                        return [`₪${Number(value).toLocaleString()}${deltaBadge}`, isCurrent ? currentSummary.monthNameArabic : prevSummary.monthNameArabic];
                      }}
                    />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontWeight: 'bold' }} />
                    <Bar 
                      dataKey="prevDaily" 
                      name={`${prevSummary.monthNameArabic} (شهر الأساس المرجعي)`} 
                      fill="#64748B" 
                      stroke="#1E293B"
                      strokeWidth={1}
                      strokeDasharray="2 2"
                      radius={[4, 4, 0, 0]} 
                      barSize={8} 
                    />
                    <Bar 
                      dataKey="currentDaily" 
                      name={`${currentSummary.monthNameArabic} (شهر المقارنة المستهدف)`} 
                      stroke="#0F172A"
                      strokeWidth={1}
                      radius={[4, 4, 0, 0]} 
                      barSize={8}
                    >
                      {dailyComparisonData.map((entry, index) => {
                        const isDayAhead = entry.currentDaily >= entry.prevDaily;
                        return (
                          <Cell 
                            key={`daily-cell-${index}`} 
                            fill={isDayAhead ? '#10B981' : '#EF4444'} 
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* View 3: Subject Profit Contribution Comparison */}
        {chartMode === 'subjects' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-600">
              <span>أعلى 6 مواد مساهمة في صافي أرباح المركز (مقارنة الشهرين مع دلالات الألوان)</span>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-black">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  أخضر: نمو في أرباح المادة
                </span>
                <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md font-black">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  أحمر: انخفاض في أرباح المادة
                </span>
              </div>
            </div>

            <div className="h-[320px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectsComparisonData} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis 
                    type="number" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }}
                    tickFormatter={(val) => `₪${val.toLocaleString()}`}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 11, fontWeight: 800, fill: '#334155' }}
                    width={110}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF', 
                      borderRadius: 16, 
                      border: '1px solid #E2E8F0', 
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      direction: 'rtl',
                      textAlign: 'right',
                      fontSize: 11,
                      fontWeight: 'bold'
                    }}
                    formatter={(value: any, name: string, item: any) => {
                      const isCurrent = name === 'currentProfit' || name.includes('الحالي');
                      const sub = item?.payload;
                      const deltaText = isCurrent && sub
                        ? (sub.delta >= 0 ? ` (نمو: +₪${sub.delta.toLocaleString()} 🟢)` : ` (تراجع: ₪${sub.delta.toLocaleString()} 🔴)`)
                        : '';
                      return [
                        `₪${Number(value).toLocaleString()}${deltaText}`, 
                        isCurrent ? `ربح ${currentSummary.monthNameArabic}` : `ربح ${prevSummary.monthNameArabic}`
                      ];
                    }}
                  />
                  <Legend verticalAlign="top" align="left" wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontWeight: 'bold' }} />
                  <Bar 
                    dataKey="prevProfit" 
                    name={`السابق (${prevSummary.monthNameArabic.split(' ')[0]}) [متقطع]`} 
                    fill="#0D365A" 
                    stroke="#0F172A"
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    radius={[0, 6, 6, 0]} 
                    barSize={12} 
                  />
                  <Bar 
                    dataKey="currentProfit" 
                    name={`الحالي (${currentSummary.monthNameArabic.split(' ')[0]}) [مصمت]`} 
                    stroke="#0F172A"
                    strokeWidth={1}
                    radius={[0, 6, 6, 0]} 
                    barSize={12}
                  >
                    {subjectsComparisonData.map((sub, idx) => (
                      <Cell 
                        key={`sub-bar-${idx}`} 
                        fill={sub.delta >= 0 ? '#10B981' : '#EF4444'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* 4. Detailed P&L Financial Comparison Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileText size={17} className="text-indigo-600" />
              <span>جدول المقارنة المالية التفصيلية (P&L Reconciliation)</span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              كشف رقمي دقيق لجميع البنود المالية وتتبع نسب النمو والانحرافات
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onOpenMonthlyFinancialReport && (
              <button
                type="button"
                onClick={() => onOpenMonthlyFinancialReport(currentYear, currentMonth)}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Eye size={14} />
                <span>عرض تقرير الشهر الحالي الشامل ↗</span>
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 text-xs font-black border-b border-slate-200">
                <th className="p-3.5">البند المالي / المؤشر</th>
                <th className="p-3.5 text-slate-600">{prevSummary.monthNameArabic} (السابق)</th>
                <th className="p-3.5 text-indigo-900">{currentSummary.monthNameArabic} (الحالي)</th>
                <th className="p-3.5">الفارق المالي (₪)</th>
                <th className="p-3.5">نسبة النمو (%)</th>
                <th className="p-3.5 text-center">تقييم الأداء</th>
              </tr>
            </thead>
            <tbody className="text-xs font-medium divide-y divide-slate-100 text-slate-700">
              {/* Row 1: Total Revenue */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="p-3.5 font-bold flex items-center gap-2 text-slate-900">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>إجمالي إيرادات الحصص والتعليم</span>
                </td>
                <td className="p-3.5 font-mono font-bold">₪{Math.round(prevSummary.totalTeachingRevenue).toLocaleString()}</td>
                <td className="p-3.5 font-mono font-black text-indigo-900">₪{Math.round(currentSummary.totalTeachingRevenue).toLocaleString()}</td>
                <td className={`p-3.5 font-mono font-black ${revenueDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {revenueDelta >= 0 ? `+₪${Math.round(revenueDelta).toLocaleString()}` : `₪${Math.round(revenueDelta).toLocaleString()}`}
                </td>
                <td className="p-3.5 font-mono font-black">
                  {revenueGrowthPercent >= 0 ? `+${revenueGrowthPercent.toFixed(1)}%` : `${revenueGrowthPercent.toFixed(1)}%`}
                </td>
                <td className="p-3.5 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${revenueDelta >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {revenueDelta >= 0 ? 'نمو إيجابي ↗' : 'انخفاض ↘'}
                  </span>
                </td>
              </tr>

              {/* Row 2: Teacher Payouts */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="p-3.5 font-bold flex items-center gap-2 text-slate-900">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>أجور ورواتب المعلمين المكتسبة</span>
                </td>
                <td className="p-3.5 font-mono font-bold">₪{Math.round(prevSummary.totalTeacherPayouts).toLocaleString()}</td>
                <td className="p-3.5 font-mono font-black text-amber-900">₪{Math.round(currentSummary.totalTeacherPayouts).toLocaleString()}</td>
                <td className="p-3.5 font-mono font-bold text-slate-700">
                  {payoutsDelta >= 0 ? `+₪${Math.round(payoutsDelta).toLocaleString()}` : `₪${Math.round(payoutsDelta).toLocaleString()}`}
                </td>
                <td className="p-3.5 font-mono font-bold">
                  {payoutsGrowthPercent >= 0 ? `+${payoutsGrowthPercent.toFixed(1)}%` : `${payoutsGrowthPercent.toFixed(1)}%`}
                </td>
                <td className="p-3.5 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                    تكلفة تدريس
                  </span>
                </td>
              </tr>

              {/* Row 3: Operating Expenses */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="p-3.5 font-bold flex items-center gap-2 text-slate-900">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <span>المصاريف التشغيلية والإدارية</span>
                </td>
                <td className="p-3.5 font-mono font-bold">₪{Math.round(prevSummary.totalOperatingExpenses).toLocaleString()}</td>
                <td className="p-3.5 font-mono font-black text-rose-900">₪{Math.round(currentSummary.totalOperatingExpenses).toLocaleString()}</td>
                <td className={`p-3.5 font-mono font-black ${expensesDelta <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {expensesDelta >= 0 ? `+₪${Math.round(expensesDelta).toLocaleString()}` : `₪${Math.round(expensesDelta).toLocaleString()}`}
                </td>
                <td className="p-3.5 font-mono font-bold">
                  {expensesGrowthPercent >= 0 ? `+${expensesGrowthPercent.toFixed(1)}%` : `${expensesGrowthPercent.toFixed(1)}%`}
                </td>
                <td className="p-3.5 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${expensesDelta <= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {expensesDelta <= 0 ? 'ترشيد تكاليف ✓' : 'زيادة مصاريف'}
                  </span>
                </td>
              </tr>

              {/* Row 4: Net Realized Profit (Highlighted) */}
              <tr className={`font-black text-sm ${isProfitGrowing ? 'bg-emerald-50/70' : 'bg-rose-50/60'}`}>
                <td className="p-4 font-black flex items-center gap-2 text-slate-900">
                  <Award size={16} className={isProfitGrowing ? 'text-emerald-600' : 'text-rose-600'} />
                  <span>(=) صافي أرباح المركز المحققة (Net Realized Profit)</span>
                </td>
                <td className="p-4 font-mono font-black text-slate-800">₪{Math.round(prevSummary.netRealizedProfit).toLocaleString()}</td>
                <td className={`p-4 font-mono font-black text-base ${isProfitGrowing ? 'text-emerald-800' : 'text-rose-800'}`}>
                  ₪{Math.round(currentSummary.netRealizedProfit).toLocaleString()}
                </td>
                <td className={`p-4 font-mono font-black ${profitDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {profitDelta >= 0 ? `+₪${Math.round(profitDelta).toLocaleString()}` : `₪${Math.round(profitDelta).toLocaleString()}`}
                </td>
                <td className={`p-4 font-mono font-black ${profitDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {profitGrowthPercent >= 0 ? `+${profitGrowthPercent.toFixed(1)}%` : `${profitGrowthPercent.toFixed(1)}%`}
                </td>
                <td className="p-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-black shadow-sm ${
                    isProfitGrowing ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}>
                    {isProfitGrowing ? 'أرباح متزايدة 🏆' : 'تراجع بالأرباح ⚠️'}
                  </span>
                </td>
              </tr>

              {/* Row 5: Net Profit Margin % */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="p-3.5 font-bold flex items-center gap-2 text-slate-900">
                  <Percent size={14} className="text-indigo-600" />
                  <span>نسبة هامش الربح الصافي (Profit Margin %)</span>
                </td>
                <td className="p-3.5 font-mono font-bold">{prevSummary.netProfitMarginPercentage.toFixed(1)}%</td>
                <td className="p-3.5 font-mono font-black text-indigo-900">{currentSummary.netProfitMarginPercentage.toFixed(1)}%</td>
                <td className="p-3.5 font-mono font-bold">
                  {(currentSummary.netProfitMarginPercentage - prevSummary.netProfitMarginPercentage) >= 0 ? '+' : ''}
                  {(currentSummary.netProfitMarginPercentage - prevSummary.netProfitMarginPercentage).toFixed(1)}%
                </td>
                <td className="p-3.5 font-mono font-bold">-</td>
                <td className="p-3.5 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    currentSummary.netProfitMarginPercentage >= prevSummary.netProfitMarginPercentage 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {currentSummary.netProfitMarginPercentage >= prevSummary.netProfitMarginPercentage ? 'كفاءة أفضل ↗' : 'انخفاض هامش ↘'}
                  </span>
                </td>
              </tr>

              {/* Row 6: Teaching Hours */}
              <tr className="hover:bg-slate-50/80 transition-colors">
                <td className="p-3.5 font-bold flex items-center gap-2 text-slate-900">
                  <Clock size={14} className="text-slate-500" />
                  <span>ساعات التدريس المنجزة</span>
                </td>
                <td className="p-3.5 font-mono font-bold">{prevSummary.totalHoursTaught.toFixed(1)} ساعة</td>
                <td className="p-3.5 font-mono font-black text-slate-900">{currentSummary.totalHoursTaught.toFixed(1)} ساعة</td>
                <td className="p-3.5 font-mono font-bold text-slate-700">
                  {hoursDelta >= 0 ? `+${hoursDelta.toFixed(1)}` : hoursDelta.toFixed(1)} ساعة
                </td>
                <td className="p-3.5 font-mono font-bold">
                  {prevSummary.totalHoursTaught > 0 ? `${((hoursDelta / prevSummary.totalHoursTaught) * 100).toFixed(1)}%` : '0%'}
                </td>
                <td className="p-3.5 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                    نشاط تدريسي
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Executive Insights & Strategic Recommendations */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-6 sm:p-7 rounded-3xl border border-slate-800 space-y-3 shadow-md">
        <div className="flex items-center gap-2 text-amber-300">
          <Sparkles size={17} />
          <span className="text-xs font-black uppercase tracking-wider">تحليل الأداء المالي الذكي للمركز (Executive Insights)</span>
        </div>

        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
          {isProfitGrowing ? (
            <>
              سجل المركز في شهر <strong className="text-white font-black">{currentSummary.monthNameArabic}</strong> نمواً ملحوظاً في صافي الأرباح التشغيلية المحققة بلغ <strong className="text-emerald-400 font-black">+{profitGrowthPercent.toFixed(1)}%</strong> بواقع <strong className="text-emerald-400 font-black">+₪{Math.round(profitDelta).toLocaleString()}</strong> مقارنة بشهر <strong className="text-white">{prevSummary.monthNameArabic}</strong>. يعود هذا التحسن إلى {revenueDelta > 0 ? `ارتفاع حجم إيرادات الحصص الدراسية بمقدار ₪${Math.round(revenueDelta).toLocaleString()}` : 'التحكم الفعال في النفقات التشغيلية'}، مع وصول هامش الربح الصافي إلى <strong className="text-amber-300 font-black">{currentSummary.netProfitMarginPercentage.toFixed(1)}%</strong>.
            </>
          ) : (
            <>
              أظهرت مقارنة شهر <strong className="text-white font-black">{currentSummary.monthNameArabic}</strong> مع شهر <strong className="text-white">{prevSummary.monthNameArabic}</strong> انخفاضاً في صافي الأرباح بقيمة <strong className="text-rose-400 font-black">₪{Math.round(Math.abs(profitDelta)).toLocaleString()} ({profitGrowthPercent.toFixed(1)}%)</strong>. يرجع ذلك إلى {revenueDelta < 0 ? `تراجع الإيرادات بمقدار ₪${Math.round(Math.abs(revenueDelta)).toLocaleString()}` : ''} {expensesDelta > 0 ? `وارتفاع المصاريف التشغيلية بمقدار ₪${Math.round(expensesDelta).toLocaleString()}` : ''}. يوصى بمراجعة بنود المصروفات وتحفيز ساعات التدريس في المواد الأعلى ربحية.
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2 text-xs font-bold text-slate-300">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>متوسط ربح ساعة التدريس في الشهر الحالي: <strong className="text-white font-mono">₪{currentSummary.totalHoursTaught > 0 ? (currentSummary.grossTeachingProfit / currentSummary.totalHoursTaught).toFixed(1) : 0}</strong></span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" />
            <span>متوسط ربح ساعة التدريس في الشهر السابق: <strong className="text-white font-mono">₪{prevSummary.totalHoursTaught > 0 ? (prevSummary.grossTeachingProfit / prevSummary.totalHoursTaught).toFixed(1) : 0}</strong></span>
          </span>
        </div>
      </div>

    </div>
  );
};
