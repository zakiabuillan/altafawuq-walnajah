import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  GraduationCap, 
  School, 
  BookOpen, 
  BarChart3, 
  PieChart as PieChartIcon, 
  ChevronDown, 
  ChevronUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Scale, 
  Coins, 
  ShieldAlert, 
  Users,
  Info,
  ExternalLink,
  Filter,
  FileDown
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Session, Teacher, StudentCredit } from '../types';
import { StudentFinancialBalancesPdfModal } from './StudentFinancialBalancesPdfModal';

export interface StudentFinancialBalancesChartCardProps {
  students: Student[];
  sessions?: Session[];
  credits?: StudentCredit[];
  teachers?: Teacher[];
  onNavigateToStudents?: () => void;
  className?: string;
  defaultCollapsed?: boolean;
}

// Normalize Arabic text helper
const normalizeArabic = (text: string = ''): string => {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .trim();
};

// Categorize academic stage from level or grade string
export const detectAcademicStage = (gradeStr: string = ''): 'secondary' | 'middle' | 'primary' | 'other' => {
  const norm = normalizeArabic(gradeStr);
  if (
    norm.includes('ثانوي') ||
    norm.includes('توجيهي') || 
    norm.includes('ثانويه عامه') || 
    norm.includes('بجروت') ||
    norm.includes('12') || 
    norm.includes('ثاني عشر') || 
    norm.includes('بكالوريا') || 
    norm.includes('علمي') || 
    norm.includes('ادبي') || 
    norm.includes('صناعي') || 
    norm.includes('رياده') ||
    norm.includes('عاشر') || 
    norm.includes('اول ثانوي') || 
    norm.includes('10') || 
    norm.includes('11') || 
    norm.includes('حادي عشر')
  ) {
    return 'secondary';
  }
  if (
    norm.includes('سابع') || 
    norm.includes('ثامن') || 
    norm.includes('تاسع') || 
    norm.includes('7') || 
    norm.includes('8') || 
    norm.includes('9') || 
    norm.includes('اعدادي') || 
    norm.includes('متوسط')
  ) {
    return 'middle';
  }
  if (
    norm.includes('اول') || 
    norm.includes('ثاني') || 
    norm.includes('ثالث') || 
    norm.includes('رابع') || 
    norm.includes('خامس') || 
    norm.includes('سادس') || 
    norm.includes('1') || 
    norm.includes('2') || 
    norm.includes('3') || 
    norm.includes('4') || 
    norm.includes('5') || 
    norm.includes('6') || 
    norm.includes('ابتدائي') || 
    norm.includes('اساسي')
  ) {
    return 'primary';
  }
  return 'other';
};

// Friendly grade grouping helper
const detectGradeGroup = (gradeStr: string = ''): string => {
  const norm = normalizeArabic(gradeStr);
  if (norm.includes('12') || norm.includes('ثاني عشر') || norm.includes('توجيهي') || norm.includes('بجروت') || norm.includes('بكالوريا')) {
    return 'الثاني عشر (توجيهي/بجروت)';
  }
  if (norm.includes('11') || norm.includes('حادي عشر')) {
    return 'الصف الحادي عشر';
  }
  if (norm.includes('10') || norm.includes('عاشر')) {
    return 'الصف العاشر';
  }
  if (norm.includes('9') || norm.includes('تاسع')) {
    return 'الصف التاسع';
  }
  if (norm.includes('8') || norm.includes('ثامن')) {
    return 'الصف الثامن';
  }
  if (norm.includes('7') || norm.includes('سابع')) {
    return 'الصف السابع';
  }
  if (
    norm.includes('6') || norm.includes('سادس') ||
    norm.includes('5') || norm.includes('خامس') ||
    norm.includes('4') || norm.includes('رابع') ||
    norm.includes('3') || norm.includes('ثالث') ||
    norm.includes('2') || norm.includes('ثاني') ||
    norm.includes('1') || norm.includes('اول') ||
    norm.includes('اساسي') || norm.includes('ابتدائي')
  ) {
    return 'المرحلة الأساسية (1-6)';
  }
  return gradeStr.trim() || 'مستوى عام / غير مصنف';
};

export const StudentFinancialBalancesChartCard: React.FC<StudentFinancialBalancesChartCardProps> = ({
  students,
  sessions = [],
  credits = [],
  teachers = [],
  onNavigateToStudents,
  className = '',
  defaultCollapsed = false
}) => {
  const [isFinancialPdfModalOpen, setIsFinancialPdfModalOpen] = useState<boolean>(false);

  // Card collapse state (stored in local storage)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('academy_director_financial_card_collapsed');
      return saved !== null ? saved === 'true' : defaultCollapsed;
    } catch {
      return defaultCollapsed;
    }
  });

  const [activeViewMode, setActiveViewMode] = useState<'stages' | 'grades' | 'pie'>('stages');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string | null>(null);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem('academy_director_financial_card_collapsed', String(next));
    } catch (e) {
      console.warn("Could not save collapse state", e);
    }
  };

  // Financial aggregates calculation
  const financialSummary = useMemo(() => {
    let totalPositive = 0;
    let totalNegative = 0;
    let positiveCount = 0;
    let negativeCount = 0;
    let zeroCount = 0;
    let criticalDebtCount = 0;

    students.forEach(student => {
      const bal = typeof student.balance === 'number' ? student.balance : 0;
      if (bal > 0) {
        totalPositive += bal;
        positiveCount++;
      } else if (bal < 0) {
        totalNegative += Math.abs(bal);
        negativeCount++;
        const threshold = typeof student.lowBalanceThreshold === 'number' ? student.lowBalanceThreshold : -100;
        if (bal < threshold) {
          criticalDebtCount++;
        }
      } else {
        zeroCount++;
      }
    });

    const netBalance = totalPositive - totalNegative;
    const totalAssessed = totalPositive + totalNegative;
    const positivePercentage = totalAssessed > 0 ? Math.round((totalPositive / totalAssessed) * 100) : 50;
    const negativePercentage = totalAssessed > 0 ? 100 - positivePercentage : 50;

    return {
      totalPositive,
      totalNegative,
      netBalance,
      positiveCount,
      negativeCount,
      zeroCount,
      criticalDebtCount,
      totalStudents: students.length,
      positivePercentage,
      negativePercentage
    };
  }, [students]);

  // Stage-based breakdown data for Recharts
  const stageData = useMemo(() => {
    const groups: Record<string, {
      key: string;
      name: string;
      shortName: string;
      icon: any;
      positive: number;
      negative: number;
      net: number;
      positiveCount: number;
      negativeCount: number;
      zeroCount: number;
      totalStudents: number;
      color: string;
    }> = {
      secondary: {
        key: 'secondary',
        name: 'المرحلة الثانوية (10-12)',
        shortName: 'الثانوية 🎓',
        icon: GraduationCap,
        positive: 0,
        negative: 0,
        net: 0,
        positiveCount: 0,
        negativeCount: 0,
        zeroCount: 0,
        totalStudents: 0,
        color: '#6366F1'
      },
      middle: {
        key: 'middle',
        name: 'المرحلة الإعدادية (7-9)',
        shortName: 'الإعدادية 📐',
        icon: School,
        positive: 0,
        negative: 0,
        net: 0,
        positiveCount: 0,
        negativeCount: 0,
        zeroCount: 0,
        totalStudents: 0,
        color: '#0EA5E9'
      },
      primary: {
        key: 'primary',
        name: 'المرحلة الأساسية (1-6)',
        shortName: 'الأساسية 🎒',
        icon: BookOpen,
        positive: 0,
        negative: 0,
        net: 0,
        positiveCount: 0,
        negativeCount: 0,
        zeroCount: 0,
        totalStudents: 0,
        color: '#10B981'
      },
      other: {
        key: 'other',
        name: 'مستوى عام / غير مصنف',
        shortName: 'عام 🏫',
        icon: Users,
        positive: 0,
        negative: 0,
        net: 0,
        positiveCount: 0,
        negativeCount: 0,
        zeroCount: 0,
        totalStudents: 0,
        color: '#F59E0B'
      }
    };

    students.forEach(student => {
      const stage = detectAcademicStage(student.grade || student.academicLevel || '');
      const bal = typeof student.balance === 'number' ? student.balance : 0;
      const target = groups[stage] || groups.other;

      target.totalStudents++;
      if (bal > 0) {
        target.positive += bal;
        target.positiveCount++;
      } else if (bal < 0) {
        target.negative += Math.abs(bal);
        target.negativeCount++;
      } else {
        target.zeroCount++;
      }
    });

    // Compute net for each stage and filter out empty 'other' stage if no students
    return Object.values(groups)
      .map(item => ({
        ...item,
        net: item.positive - item.negative
      }))
      .filter(item => item.key !== 'other' || item.totalStudents > 0);
  }, [students]);

  // Grade-based breakdown data for Recharts
  const gradeData = useMemo(() => {
    const gradeMap = new Map<string, {
      name: string;
      positive: number;
      negative: number;
      net: number;
      positiveCount: number;
      negativeCount: number;
      zeroCount: number;
      totalStudents: number;
    }>();

    students.forEach(student => {
      const groupName = detectGradeGroup(student.grade || student.academicLevel || '');
      const bal = typeof student.balance === 'number' ? student.balance : 0;

      if (!gradeMap.has(groupName)) {
        gradeMap.set(groupName, {
          name: groupName,
          positive: 0,
          negative: 0,
          net: 0,
          positiveCount: 0,
          negativeCount: 0,
          zeroCount: 0,
          totalStudents: 0
        });
      }

      const entry = gradeMap.get(groupName)!;
      entry.totalStudents++;
      if (bal > 0) {
        entry.positive += bal;
        entry.positiveCount++;
      } else if (bal < 0) {
        entry.negative += Math.abs(bal);
        entry.negativeCount++;
      } else {
        entry.zeroCount++;
      }
    });

    return Array.from(gradeMap.values())
      .map(item => ({
        ...item,
        net: item.positive - item.negative
      }))
      .sort((a, b) => b.totalStudents - a.totalStudents);
  }, [students]);

  // Pie chart data for positive vs negative distribution
  const pieData = useMemo(() => {
    return [
      { 
        name: 'أرصدة فائضة (+₪)', 
        value: financialSummary.totalPositive, 
        count: financialSummary.positiveCount,
        color: '#10B981' 
      },
      { 
        name: 'ذمم ومستحقات معلقة (-₪)', 
        value: financialSummary.totalNegative, 
        count: financialSummary.negativeCount,
        color: '#F43F5E' 
      }
    ].filter(item => item.value > 0);
  }, [financialSummary]);

  // Students list filtered by selected stage if director clicks a stage
  const selectedStageStudents = useMemo(() => {
    if (!selectedStageFilter) return [];
    return students.filter(s => {
      const stg = detectAcademicStage(s.grade || s.academicLevel || '');
      return stg === selectedStageFilter;
    }).slice(0, 8); // top 8 for preview
  }, [students, selectedStageFilter]);

  return (
    <div 
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-300 ${className}`} 
      id="director-students-financial-overview-card"
      dir="rtl"
    >
      {/* 🌟 Card Header / Title Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 px-5 py-4 sm:px-6 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <Scale size={20} className="drop-shadow-xs" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5">
                <span>المؤشر المالي لأرصدة الطلاب والذمم</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black px-2 py-0.5 rounded-full">
                  نظرة سريعة للمدير
                </span>
              </h2>
            </div>
            <p className="text-[11px] text-slate-300/80 mt-0.5 font-bold">
              رصد إجمالي الأرصدة الدائنة (الموجبة) والمستحقات المعلقة (السالبة) وتوزيعها حسب المراحل الدراسية
            </p>
          </div>
        </div>

        {/* Header Actions & Controls */}
        <div className="flex items-center gap-2 mr-auto sm:mr-0">
          {/* View mode buttons when expanded */}
          {!isCollapsed && (
            <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/70 text-[11px] font-black">
              <button
                type="button"
                onClick={() => setActiveViewMode('stages')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer select-none ${
                  activeViewMode === 'stages'
                    ? 'bg-teal-500 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="عرض الرسم البياني حسب المراحل التعليمية الثلاث (أساسي، إعدادي، ثانوي)"
                id="director-financial-view-stages-btn"
              >
                <BarChart3 size={13} />
                <span>المراحل</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewMode('grades')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer select-none ${
                  activeViewMode === 'grades'
                    ? 'bg-teal-500 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="عرض الرسم البياني المفصل حسب الصفوف الدراسية"
                id="director-financial-view-grades-btn"
              >
                <GraduationCap size={13} />
                <span>الصفوف</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveViewMode('pie')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer select-none ${
                  activeViewMode === 'pie'
                    ? 'bg-teal-500 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="عرض المخطط الدائري لنسبة الأرصدة الموجبة مقابل السالبة"
                id="director-financial-view-pie-btn"
              >
                <PieChartIcon size={13} />
                <span>النسبة</span>
              </button>
            </div>
          )}

          {/* Export Financial Balances Report PDF Button */}
          <button
            type="button"
            onClick={() => setIsFinancialPdfModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-95 shrink-0"
            title="تصدير تقرير مالي لجميع الطلاب يحتوي على إجمالي المديونيات والمستحقات بصيغة PDF"
            id="director-export-financial-balances-pdf-btn"
          >
            <FileDown size={14} className="text-amber-300" />
            <span>تصدير تقرير مالي</span>
          </button>

          {/* Quick link to Student Management */}
          {onNavigateToStudents && (
            <button
              type="button"
              onClick={onNavigateToStudents}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-teal-300 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
              title="الانتقال إلى شؤون الطلاب لإدارة شحن الأرصدة وتتبع الذمم"
              id="director-financial-go-students-btn"
            >
              <span>إدارة الحسابات</span>
              <ExternalLink size={12} />
            </button>
          )}

          {/* Collapse/Expand toggle */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700/80 transition-all cursor-pointer"
            title={isCollapsed ? 'توسيع عرض المؤشر المالي' : 'تصغير عرض المؤشر المالي'}
            aria-expanded={!isCollapsed}
            id="director-financial-card-toggle-btn"
          >
            {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {/* 📊 Collapsed Summary Bar (When Minimized, shows high-level KPI badges) */}
      {isCollapsed && (
        <div className="p-4 bg-slate-50 flex flex-wrap items-center justify-between gap-3 text-xs font-bold">
          <div className="flex flex-wrap items-center gap-4">
            {/* Positive */}
            <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/80">
              <TrendingUp size={14} className="text-emerald-600" />
              <span className="text-[11px] font-bold text-slate-600">أرصدة فائضة (+):</span>
              <span className="font-mono font-black text-xs text-emerald-700">
                +₪{financialSummary.totalPositive.toLocaleString('en-US')}
              </span>
              <span className="text-[10px] text-emerald-600">({financialSummary.positiveCount} طالب)</span>
            </div>

            {/* Negative */}
            <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200/80">
              <TrendingDown size={14} className="text-rose-600" />
              <span className="text-[11px] font-bold text-slate-600">ذمم ومستحقات (-):</span>
              <span className="font-mono font-black text-xs text-rose-700">
                -₪{financialSummary.totalNegative.toLocaleString('en-US')}
              </span>
              <span className="text-[10px] text-rose-600">({financialSummary.negativeCount} طالب)</span>
            </div>

            {/* Net Balance */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-white text-slate-800 border-slate-200">
              <Scale size={14} className="text-indigo-600" />
              <span className="text-[11px] font-bold text-slate-600">صافي المركز:</span>
              <span className={`font-mono font-black text-xs ${
                financialSummary.netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {financialSummary.netBalance >= 0 ? '+' : ''}₪{financialSummary.netBalance.toLocaleString('en-US')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 mr-auto">
            <button
              type="button"
              onClick={() => setIsFinancialPdfModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0d365a] hover:bg-[#1a4a75] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
              title="تصدير تقرير مالي لجميع الطلاب يحتوي على إجمالي المديونيات والمستحقات بصيغة PDF"
            >
              <FileDown size={13} className="text-amber-300" />
              <span>تصدير تقرير مالي PDF</span>
            </button>

            <button
              type="button"
              onClick={toggleCollapse}
              className="text-indigo-600 hover:text-indigo-800 text-[11px] font-black flex items-center gap-1 cursor-pointer"
            >
              <span>عرض الرسم البياني التفصيلي</span>
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      )}

      {/* 🚀 Main Expanded Content */}
      {!isCollapsed && (
        <div className="p-5 sm:p-6 space-y-6">
          
          {/* 1️⃣ Top Row: Executive Financial KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* Card 1: Total Positive Balance (Surplus/Credit) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-emerald-50/30 to-white border border-emerald-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                  <Coins size={15} className="text-emerald-600" />
                  <span>أرصدة فائضة دائنة (+)</span>
                </span>
                <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  {financialSummary.positiveCount} طالب
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black font-mono text-emerald-700 tracking-tight">
                  +₪{financialSummary.totalPositive.toLocaleString('en-US')}
                </span>
              </div>
              <p className="text-[10px] text-emerald-800/80 font-bold mt-2">
                أموال مدفوعة ومسجلة مقدماً في محافظ الطلاب
              </p>
              <div className="w-full bg-emerald-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${financialSummary.positivePercentage}%` }}
                />
              </div>
            </div>

            {/* Card 2: Total Negative Balance (Dues / Debt) */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/80 via-rose-50/30 to-white border border-rose-200/80 shadow-xs relative overflow-hidden group hover:border-rose-300 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                  <TrendingDown size={15} className="text-rose-600" />
                  <span>ذمم ومستحقات سالبة (-)</span>
                </span>
                <span className="text-[10px] font-black bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
                  {financialSummary.negativeCount} طالب
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-2xl font-black font-mono text-rose-700 tracking-tight">
                  -₪{financialSummary.totalNegative.toLocaleString('en-US')}
                </span>
              </div>
              <p className="text-[10px] text-rose-800/80 font-bold mt-2 flex items-center justify-between">
                <span>مستحقات واجبة التحصيل للمركز</span>
                {financialSummary.criticalDebtCount > 0 && (
                  <span className="text-rose-600 font-black">({financialSummary.criticalDebtCount} حرج)</span>
                )}
              </p>
              <div className="w-full bg-rose-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div 
                  className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${financialSummary.negativePercentage}%` }}
                />
              </div>
            </div>

            {/* Card 3: Net Center Financial Position */}
            <div className={`p-4 rounded-2xl border shadow-xs relative overflow-hidden group transition-all ${
              financialSummary.netBalance >= 0
                ? 'bg-gradient-to-br from-teal-50/80 via-slate-50/40 to-white border-teal-200/80'
                : 'bg-gradient-to-br from-amber-50/80 via-slate-50/40 to-white border-amber-200/80'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Scale size={15} className={financialSummary.netBalance >= 0 ? 'text-teal-600' : 'text-amber-600'} />
                  <span>صافي السيولة / المركز المالي</span>
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  financialSummary.netBalance >= 0 
                    ? 'bg-teal-100 text-teal-800 border-teal-200' 
                    : 'bg-amber-100 text-amber-800 border-amber-200'
                }`}>
                  {financialSummary.netBalance >= 0 ? 'فائض نقدي' : 'عجز مستحق'}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={`text-2xl font-black font-mono tracking-tight ${
                  financialSummary.netBalance >= 0 ? 'text-teal-700' : 'text-amber-700'
                }`}>
                  {financialSummary.netBalance >= 0 ? '+' : ''}₪{financialSummary.netBalance.toLocaleString('en-US')}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold mt-2">
                فارق الأرصدة المحصلة مطروحاً منها الذمم المعلقة
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>فائض {financialSummary.positivePercentage}%</span>
                <span className="text-slate-300">|</span>
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                <span>ذمم {financialSummary.negativePercentage}%</span>
              </div>
            </div>

            {/* Card 4: Accounts Health & Settlement */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-50 border border-slate-200 shadow-xs relative overflow-hidden group hover:border-slate-300 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-indigo-600" />
                  <span>حالة حسابات الطلاب</span>
                </span>
                <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                  {financialSummary.totalStudents} طالب مسجل
                </span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-150">
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">دائن (فائض)</span>
                  <span className="text-sm font-black font-mono text-emerald-600">{financialSummary.positiveCount}</span>
                </div>
                <div className="h-6 w-px bg-slate-200"></div>
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">مدين (مستحق)</span>
                  <span className="text-sm font-black font-mono text-rose-600">{financialSummary.negativeCount}</span>
                </div>
                <div className="h-6 w-px bg-slate-200"></div>
                <div className="text-center">
                  <span className="text-[10px] text-slate-400 font-bold block">مُسوّى (صفر)</span>
                  <span className="text-sm font-black font-mono text-slate-600">{financialSummary.zeroCount}</span>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-bold mt-2">
                نسبة التحصيل السليم: {financialSummary.totalStudents > 0 
                  ? Math.round(((financialSummary.positiveCount + financialSummary.zeroCount) / financialSummary.totalStudents) * 100) 
                  : 100}%
              </p>
            </div>

          </div>

          {/* 2️⃣ Visual Chart Section */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                  <BarChart3 size={16} className="text-teal-600" />
                  <span>
                    {activeViewMode === 'stages' && 'مقارنة الأرصدة المالية (موجب / سالب) حسب المراحل الدراسية الثلاث'}
                    {activeViewMode === 'grades' && 'توزيع الأرصدة المالية (موجب / سالب) مفصلاً حسب الصفوف الدراسية'}
                    {activeViewMode === 'pie' && 'التوزيع النسبي لإجمالي السيولة النقدية والذمم المالية'}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 font-bold">
                  {activeViewMode === 'stages' && 'الأعمدة الخضراء توضح الأرصدة الفائضة، والأعمدة الحمراء توضح الذمم والديون المستحقة بالشيكل (₪)'}
                  {activeViewMode === 'grades' && 'تحليل مقارن لكل صف دراسي لمعرفة أي الصفوف تحتوي على أعلى التزامات أو فوائض مالية'}
                  {activeViewMode === 'pie' && 'مقارنة دائرية بين الحجم الكلي للأرصدة المشحونة مسبقاً مقابل الذمم المعلقة'}
                </p>
              </div>

              {/* Legend & Legend Indicators */}
              <div className="flex items-center gap-3 text-xs font-bold shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block shadow-xs"></span>
                  <span className="text-slate-700 text-[11px]">أرصدة فائضة (+₪)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-rose-500 inline-block shadow-xs"></span>
                  <span className="text-slate-700 text-[11px]">ذمم ومستحقات (-₪)</span>
                </div>
              </div>
            </div>

            {/* Recharts Chart Canvas */}
            <div className="w-full h-72 sm:h-80" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                {activeViewMode === 'stages' ? (
                  <BarChart
                    data={stageData}
                    margin={{ top: 20, right: 30, left: 15, bottom: 20 }}
                    barGap={6}
                    barCategoryGap="25%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis 
                      dataKey="shortName" 
                      tick={{ fill: '#334155', fontSize: 12, fontWeight: 'bold' }} 
                      axisLine={{ stroke: '#CBD5E1' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#64748B', fontSize: 11, fontWeight: 'bold' }} 
                      axisLine={{ stroke: '#CBD5E1' }}
                      tickLine={false}
                      tickFormatter={(val) => `₪${val}`}
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => {
                        const valNum = Number(value) || 0;
                        if (name === 'positive') {
                          return [`+₪${valNum.toLocaleString('en-US')}`, 'أرصدة فائضة (دائن)'];
                        }
                        if (name === 'negative') {
                          return [`-₪${valNum.toLocaleString('en-US')}`, 'ذمم ومستحقات (مدين)'];
                        }
                        return [`₪${valNum.toLocaleString('en-US')}`, name];
                      }}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.name;
                        }
                        return label;
                      }}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '16px',
                        color: '#FFFFFF',
                        fontFamily: 'system-ui, sans-serif',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textAlign: 'right',
                        direction: 'rtl',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)'
                      }}
                    />
                    <Bar 
                      dataKey="positive" 
                      name="positive" 
                      fill="#10B981" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={55}
                    />
                    <Bar 
                      dataKey="negative" 
                      name="negative" 
                      fill="#F43F5E" 
                      radius={[6, 6, 0, 0]} 
                      maxBarSize={55}
                    />
                  </BarChart>
                ) : activeViewMode === 'grades' ? (
                  <BarChart
                    data={gradeData}
                    margin={{ top: 20, right: 30, left: 15, bottom: 25 }}
                    barGap={4}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#334155', fontSize: 10.5, fontWeight: 'bold' }} 
                      axisLine={{ stroke: '#CBD5E1' }}
                      tickLine={false}
                      angle={-15}
                      textAnchor="end"
                      height={40}
                    />
                    <YAxis 
                      tick={{ fill: '#64748B', fontSize: 11, fontWeight: 'bold' }} 
                      axisLine={{ stroke: '#CBD5E1' }}
                      tickLine={false}
                      tickFormatter={(val) => `₪${val}`}
                    />
                    <Tooltip
                      formatter={(value: any, name: any) => {
                        const valNum = Number(value) || 0;
                        if (name === 'positive') {
                          return [`+₪${valNum.toLocaleString('en-US')}`, 'أرصدة فائضة'];
                        }
                        if (name === 'negative') {
                          return [`-₪${valNum.toLocaleString('en-US')}`, 'ذمم مستحقة'];
                        }
                        return [`₪${valNum.toLocaleString('en-US')}`, name];
                      }}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '16px',
                        color: '#FFFFFF',
                        fontFamily: 'system-ui, sans-serif',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textAlign: 'right',
                        direction: 'rtl',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)'
                      }}
                    />
                    <Bar 
                      dataKey="positive" 
                      name="positive" 
                      fill="#10B981" 
                      radius={[5, 5, 0, 0]} 
                      maxBarSize={40}
                    />
                    <Bar 
                      dataKey="negative" 
                      name="negative" 
                      fill="#F43F5E" 
                      radius={[5, 5, 0, 0]} 
                      maxBarSize={40}
                    />
                  </BarChart>
                ) : (
                  <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <Tooltip
                      formatter={(value: any, name: any) => [
                        `₪${Number(value).toLocaleString('en-US')}`,
                        name
                      ]}
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '16px',
                        color: '#FFFFFF',
                        fontFamily: 'system-ui, sans-serif',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        textAlign: 'right',
                        direction: 'rtl'
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      formatter={(value) => <span className="text-xs font-bold text-slate-700">{value}</span>}
                    />
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={105}
                      paddingAngle={5}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3️⃣ Stage Breakdown Mini-Cards (Detailed breakdown with percentages & counts) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
            {stageData.map((stage) => {
              const StageIcon = stage.icon;
              const isSelected = selectedStageFilter === stage.key;
              const stageNet = stage.positive - stage.negative;
              const stageTotal = stage.positive + stage.negative;
              const positiveRatio = stageTotal > 0 ? Math.round((stage.positive / stageTotal) * 100) : 50;

              return (
                <div
                  key={stage.key}
                  onClick={() => setSelectedStageFilter(isSelected ? null : stage.key)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none relative ${
                    isSelected 
                      ? 'border-indigo-500 bg-indigo-50/40 ring-2 ring-indigo-400/30 shadow-md' 
                      : 'border-slate-200/90 bg-white hover:border-slate-300 hover:shadow-xs'
                  }`}
                  id={`stage-financial-card-${stage.key}`}
                >
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                        <StageIcon size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900">{stage.name}</h4>
                        <span className="text-[10px] text-slate-500 font-bold">{stage.totalStudents} طالب مسجل</span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      stageNet >= 0 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      الصافي: {stageNet >= 0 ? '+' : ''}₪{stageNet.toLocaleString('en-US')}
                    </span>
                  </div>

                  {/* Financial Metrics in Stage */}
                  <div className="space-y-1.5 mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        <span>فائض موجب ({stage.positiveCount} طالب):</span>
                      </span>
                      <span className="font-mono font-black text-emerald-700">
                        +₪{stage.positive.toLocaleString('en-US')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        <span>ذمم معلقة ({stage.negativeCount} طالب):</span>
                      </span>
                      <span className="font-mono font-black text-rose-700">
                        -₪{stage.negative.toLocaleString('en-US')}
                      </span>
                    </div>

                    {/* Progress Bar of Health */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden flex">
                      <div 
                        className="bg-emerald-500 h-full transition-all" 
                        style={{ width: `${positiveRatio}%` }}
                        title={`فائض: ${positiveRatio}%`}
                      />
                      <div 
                        className="bg-rose-500 h-full transition-all" 
                        style={{ width: `${100 - positiveRatio}%` }}
                        title={`ذمم: ${100 - positiveRatio}%`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4️⃣ Stage Drill-down Preview (If stage is clicked) */}
          <AnimatePresence>
            {selectedStageFilter && selectedStageStudents.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-indigo-50/50 border border-indigo-200/80 rounded-2xl p-4 space-y-3 overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-indigo-600" />
                    <span className="text-xs font-black text-indigo-950">
                      عينة من طلاب {stageData.find(s => s.key === selectedStageFilter)?.name}:
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedStageFilter(null)}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-black cursor-pointer"
                  >
                    إغلاق العرض ✖
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {selectedStageStudents.map(student => {
                    const bal = typeof student.balance === 'number' ? student.balance : 0;
                    return (
                      <div 
                        key={student.id} 
                        className="p-2.5 bg-white rounded-xl border border-slate-200 text-xs shadow-2xs flex items-center justify-between"
                      >
                        <div className="truncate pl-2">
                          <span className="font-bold text-slate-800 block truncate">{student.name}</span>
                          <span className="text-[10px] text-slate-400 block truncate">{student.academicLevel || student.grade}</span>
                        </div>
                        <span className={`font-mono font-black shrink-0 text-xs ${
                          bal > 0 ? 'text-emerald-600' : bal < 0 ? 'text-rose-600' : 'text-slate-500'
                        }`}>
                          {bal > 0 ? `+₪${bal}` : bal < 0 ? `-₪${Math.abs(bal)}` : '₪0'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      )}

      {/* 📑 Director Student Financial Balances PDF Export Modal */}
      <StudentFinancialBalancesPdfModal
        isOpen={isFinancialPdfModalOpen}
        onClose={() => setIsFinancialPdfModalOpen(false)}
        students={students}
        sessions={sessions}
        credits={credits}
        teachers={teachers}
      />
    </div>
  );
};

export default StudentFinancialBalancesChartCard;
