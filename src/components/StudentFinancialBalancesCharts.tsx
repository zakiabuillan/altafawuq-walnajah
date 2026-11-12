import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  PieChart as PieIcon, 
  BarChart3, 
  LineChart as LineIcon, 
  Wallet, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Users, 
  Percent, 
  Layers, 
  ShieldCheck,
  HelpCircle,
  FileSpreadsheet,
  Clock,
  BookOpen
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, Session, StudentCredit, Teacher, GroupCourse } from '../types';

interface StudentFinancialBalancesChartsProps {
  students: Student[];
  sessions: Session[];
  credits: StudentCredit[];
  teachers?: Teacher[];
  groupCourses?: GroupCourse[];
  globalSettings?: {
    defaultHourlyRate?: number;
    defaultStudentHourlyRate?: number;
    defaultTeacherHourlyRate?: number;
  };
  startDate?: string;
  endDate?: string;
  selectedSubject?: string;
  timePeriodLabel?: string;
  onOpenNotifyModal?: (student: any) => void;
}

// Accessible color palettes with high contrast and distinctive tones
const PALETTE = {
  navy: '#0D365A',
  gold: '#D4A33C',
  emerald: '#10B981',
  teal: '#0D9488',
  indigo: '#6366F1',
  rose: '#F43F5E',
  amber: '#F59E0B',
  cyan: '#06B6D4',
  purple: '#8B5CF6',
  slate: '#64748B',
  slateLight: '#F1F5F9'
};

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export const StudentFinancialBalancesCharts: React.FC<StudentFinancialBalancesChartsProps> = ({
  students = [],
  sessions = [],
  credits = [],
  teachers = [],
  globalSettings = { defaultStudentHourlyRate: 50 },
  startDate,
  endDate,
  selectedSubject,
  timePeriodLabel
}) => {
  // Navigation view modes
  const [activeChartSection, setActiveChartSection] = useState<'all' | 'bars' | 'lines' | 'pies' | 'table'>('all');
  const [timeRange, setTimeRange] = useState<'all' | '12m' | '6m'>('12m');
  const [stageFilter, setStageFilter] = useState<'all' | 'basic' | 'middle' | 'secondary'>('all');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'surplus' | 'safe' | 'low' | 'debt'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Calculate each student's financial balance and stats
  const studentFinancials = useMemo(() => {
    const approvedSessions = sessions.filter(s => s.approved !== false);

    return students.map(student => {
      // Find all sessions for this student
      const stSessions = approvedSessions.filter(s => {
        if (s.studentId === student.id) return true;
        if (Array.isArray(s.studentIds) && s.studentIds.includes(student.id)) return true;
        if (Array.isArray((s as any).students)) {
          return (s as any).students.some((st: any) => (typeof st === 'string' ? st : st?.id) === student.id);
        }
        return false;
      });

      // Calculate total spent on sessions
      const totalSpent = stSessions.reduce((sum, s) => {
        if (s.customFee !== undefined && s.customFee !== null) {
          return sum + Number(s.customFee);
        }
        const teacher = teachers.find(t => t.id === s.teacherId);
        const rate = student.hourlyRate || (student.customRates && student.customRates[s.teacherId]) || teacher?.billingRate || teacher?.hourlyRate || globalSettings.defaultStudentHourlyRate || 50;
        return sum + ((s.durationHours || 1) * rate);
      }, 0);

      // Find all credits (tuition fees paid / wallet top-ups)
      const stCredits = credits.filter(c => c.studentId === student.id);
      const totalPaid = stCredits.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

      // Net balance
      const balance = totalPaid - totalSpent;
      const threshold = student.lowBalanceThreshold ?? 100;

      // Status classification
      let status: 'surplus' | 'safe' | 'low' | 'debt';
      if (balance > 500) {
        status = 'surplus';
      } else if (balance >= threshold) {
        status = 'safe';
      } else if (balance >= 0) {
        status = 'low';
      } else {
        status = 'debt';
      }

      const totalHours = stSessions.reduce((sum, s) => sum + (s.durationHours || 1), 0);

      return {
        id: student.id,
        name: student.name || 'طالب غير مسمى',
        academicStage: student.academicStage || 'middle',
        grade: student.grade || student.academicLevel || '',
        phone: student.phone || '',
        totalPaid,
        totalSpent,
        balance,
        threshold,
        status,
        sessionCount: stSessions.length,
        totalHours,
        paymentCount: stCredits.length,
        lastPaymentDate: stCredits.length > 0 ? (stCredits[stCredits.length - 1].date || '') : ''
      };
    });
  }, [students, sessions, credits, teachers, globalSettings]);

  // Filtered students according to controls
  const filteredStudents = useMemo(() => {
    return studentFinancials.filter(st => {
      // Stage filter
      if (stageFilter !== 'all') {
        if (st.academicStage !== stageFilter) return false;
      }
      // Balance status filter
      if (balanceFilter !== 'all') {
        if (balanceFilter === 'surplus' && st.balance < 500) return false;
        if (balanceFilter === 'safe' && (st.balance < st.threshold || st.balance >= 500)) return false;
        if (balanceFilter === 'low' && (st.balance < 0 || st.balance >= st.threshold)) return false;
        if (balanceFilter === 'debt' && st.balance >= 0) return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = st.name.toLowerCase().includes(q);
        const matchPhone = st.phone.includes(q);
        const matchGrade = st.grade.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchGrade) return false;
      }
      return true;
    });
  }, [studentFinancials, stageFilter, balanceFilter, searchQuery]);

  // Overall KPIs
  const overallMetrics = useMemo(() => {
    const totalCollected = credits.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const totalAccrued = studentFinancials.reduce((sum, s) => sum + s.totalSpent, 0);
    
    const surplusStudents = studentFinancials.filter(s => s.balance >= 0);
    const debtStudents = studentFinancials.filter(s => s.balance < 0);

    const totalPositiveBalance = surplusStudents.reduce((sum, s) => sum + s.balance, 0);
    const totalNegativeDebt = debtStudents.reduce((sum, s) => sum + Math.abs(s.balance), 0);
    const netLiquidity = totalPositiveBalance - totalNegativeDebt;

    const collectionRate = totalAccrued > 0 ? Math.min(100, Math.round((totalCollected / totalAccrued) * 100)) : 100;
    const solventRatio = studentFinancials.length > 0 
      ? Math.round((surplusStudents.length / studentFinancials.length) * 100) 
      : 100;

    return {
      totalCollected,
      totalAccrued,
      totalPositiveBalance,
      totalNegativeDebt,
      netLiquidity,
      collectionRate,
      solventRatio,
      totalStudents: studentFinancials.length,
      solventCount: surplusStudents.length,
      debtCount: debtStudents.length,
      totalPaymentsCount: credits.length
    };
  }, [credits, studentFinancials]);

  // 2. Timeline Monthly Aggregation (for Line and Bar comparisons)
  const monthlyFinancialData = useMemo(() => {
    const map: Record<string, {
      monthKey: string;
      label: string;
      collected: number;
      accrued: number;
      netFlow: number;
      transactions: number;
    }> = {};

    // Group credits (collected tuition fees) by YYYY-MM
    credits.forEach(c => {
      const dStr = c.date || (c as any).createdAt;
      if (!dStr) return;
      const key = dStr.slice(0, 7); // YYYY-MM
      if (!map[key]) {
        const [y, m] = key.split('-');
        const mIdx = parseInt(m, 10) - 1;
        map[key] = {
          monthKey: key,
          label: `${ARABIC_MONTHS[mIdx] || m} ${y}`,
          collected: 0,
          accrued: 0,
          netFlow: 0,
          transactions: 0
        };
      }
      map[key].collected += Number(c.amount) || 0;
      map[key].transactions += 1;
    });

    // Group approved sessions by YYYY-MM
    const approvedSessions = sessions.filter(s => s.approved !== false);
    approvedSessions.forEach(s => {
      const dStr = s.date || (s as any).createdAt;
      if (!dStr) return;
      const key = dStr.slice(0, 7);
      if (!map[key]) {
        const [y, m] = key.split('-');
        const mIdx = parseInt(m, 10) - 1;
        map[key] = {
          monthKey: key,
          label: `${ARABIC_MONTHS[mIdx] || m} ${y}`,
          collected: 0,
          accrued: 0,
          netFlow: 0,
          transactions: 0
        };
      }

      const st = students.find(std => std.id === s.studentId);
      const teacher = teachers.find(t => t.id === s.teacherId);
      let fee = 0;
      if (s.customFee !== undefined && s.customFee !== null) {
        fee = Number(s.customFee);
      } else {
        const rate = st?.hourlyRate || (st?.customRates && st.customRates[s.teacherId]) || teacher?.billingRate || teacher?.hourlyRate || globalSettings.defaultStudentHourlyRate || 50;
        fee = (s.durationHours || 1) * rate;
      }
      map[key].accrued += fee;
    });

    // Sort chronologically
    const sortedKeys = Object.keys(map).sort();
    
    // Slice based on timeRange
    const sliceCount = timeRange === '6m' ? 6 : timeRange === '12m' ? 12 : sortedKeys.length;
    const finalKeys = sortedKeys.slice(-sliceCount);

    let runningCumulativeCollected = 0;
    let runningCumulativeAccrued = 0;

    return finalKeys.map(key => {
      const item = map[key];
      item.netFlow = item.collected - item.accrued;
      runningCumulativeCollected += item.collected;
      runningCumulativeAccrued += item.accrued;

      return {
        ...item,
        cumulativeCollected: runningCumulativeCollected,
        cumulativeAccrued: runningCumulativeAccrued
      };
    });
  }, [credits, sessions, students, teachers, globalSettings, timeRange]);

  // 3. Balance Tiers Histogram Data (Bar Chart)
  const balanceTiersData = useMemo(() => {
    const tiers = [
      { name: 'فائض كبير (>500₪)', min: 500, max: Infinity, count: 0, totalAmount: 0, color: PALETTE.emerald, fillPattern: 'solid' },
      { name: 'رصيد آمن (150-500₪)', min: 150, max: 499.99, count: 0, totalAmount: 0, color: PALETTE.teal || '#14B8A6', fillPattern: 'dense' },
      { name: 'رصيد منخفض (1-149₪)', min: 1, max: 149.99, count: 0, totalAmount: 0, color: PALETTE.amber, fillPattern: 'stripes' },
      { name: 'رصيد متعادل (0₪)', min: 0, max: 0.99, count: 0, totalAmount: 0, color: PALETTE.slate, fillPattern: 'dots' },
      { name: 'ذمة خفيفة (-1 إلى -150₪)', min: -150, max: -0.01, count: 0, totalAmount: 0, color: PALETTE.rose, fillPattern: 'cross' },
      { name: 'ذمم حرجة (<-150₪)', min: -Infinity, max: -150.01, count: 0, totalAmount: 0, color: '#BE123C', fillPattern: 'dense-cross' }
    ];

    studentFinancials.forEach(st => {
      const b = st.balance;
      for (const t of tiers) {
        if (b >= t.min && b <= t.max) {
          t.count += 1;
          t.totalAmount += b;
          break;
        }
      }
    });

    return tiers;
  }, [studentFinancials]);

  // 4. Top Students by Collected Tuition & Balance (Bar Chart)
  const topPayingStudentsData = useMemo(() => {
    return [...studentFinancials]
      .sort((a, b) => b.totalPaid - a.totalPaid)
      .slice(0, 8)
      .map(st => ({
        name: st.name.length > 14 ? st.name.slice(0, 14) + '..' : st.name,
        fullName: st.name,
        paid: Math.round(st.totalPaid),
        spent: Math.round(st.totalSpent),
        balance: Math.round(st.balance)
      }));
  }, [studentFinancials]);

  // 5. Pie Chart: Student Balance Health Distribution
  const balanceDistributionPieData = useMemo(() => {
    const surplusCount = studentFinancials.filter(s => s.balance >= 500).length;
    const safeCount = studentFinancials.filter(s => s.balance >= s.threshold && s.balance < 500).length;
    const lowCount = studentFinancials.filter(s => s.balance >= 0 && s.balance < s.threshold).length;
    const debtCount = studentFinancials.filter(s => s.balance < 0).length;

    return [
      { name: 'أرصدة فائضة وممتازة (>500₪)', value: surplusCount, color: PALETTE.emerald },
      { name: 'أرصدة آمنة (ضمن العتبة)', value: safeCount, color: PALETTE.cyan },
      { name: 'أرصدة قاربت النفاد', value: lowCount, color: PALETTE.amber },
      { name: 'حسابات مكشوفة بالسالب', value: debtCount, color: PALETTE.rose }
    ].filter(item => item.value > 0);
  }, [studentFinancials]);

  // 6. Pie Chart: Payment Methods Distribution for Collected Tuition
  const paymentMethodsPieData = useMemo(() => {
    const methodMap: Record<string, number> = {
      'نقدي (كاش)': 0,
      'تحويل بنكي': 0,
      'محفظة إلكترونية (PalPay/Jawwal)': 0,
      'بطاقة دفع / فيزا': 0,
      'أخرى / شحن مباشر': 0
    };

    credits.forEach(c => {
      const m = (c.paymentMethod || c.method || '').toLowerCase();
      const amt = Number(c.amount) || 0;

      if (m.includes('كاش') || m.includes('cash') || m.includes('نقد')) {
        methodMap['نقدي (كاش)'] += amt;
      } else if (m.includes('بنك') || m.includes('bank') || m.includes('تحويل') || m.includes('transfer')) {
        methodMap['تحويل بنكي'] += amt;
      } else if (m.includes('jawwal') || m.includes('palpay') || m.includes('محفظ') || m.includes('wallet')) {
        methodMap['محفظة إلكترونية (PalPay/Jawwal)'] += amt;
      } else if (m.includes('visa') || m.includes('card') || m.includes('بطاق')) {
        methodMap['بطاقة دفع / فيزا'] += amt;
      } else {
        methodMap['أخرى / شحن مباشر'] += amt;
      }
    });

    const colors = [PALETTE.emerald, PALETTE.navy, PALETTE.gold, PALETTE.indigo, PALETTE.slate];

    return Object.entries(methodMap)
      .map(([name, value], idx) => ({
        name,
        value: Math.round(value),
        color: colors[idx % colors.length]
      }))
      .filter(item => item.value > 0);
  }, [credits]);

  // 7. Pie Chart: Collected vs Uncollected Ratio
  const collectionSharePieData = useMemo(() => {
    const collected = Math.max(0, overallMetrics.totalCollected);
    const outstandingDebt = Math.max(0, overallMetrics.totalNegativeDebt);

    return [
      { name: 'الرسوم المحصلة في الخزينة', value: Math.round(collected), color: PALETTE.emerald },
      { name: 'الذمم المعلقة المطلوب تحصيلها', value: Math.round(outstandingDebt), color: PALETTE.rose }
    ];
  }, [overallMetrics]);

  // Export to Excel
  const handleExportExcel = () => {
    const rows = studentFinancials.map((st, idx) => ({
      'م': idx + 1,
      'اسم الطالب': st.name,
      'المرحلة الدراسية': st.academicStage === 'basic' ? 'أساسي' : st.academicStage === 'middle' ? 'إعدادي' : 'ثانوي',
      'الصف / المستوى': st.grade || '-',
      'رقم الهاتف': st.phone || '-',
      'إجمالي الرسوم المدفوعة (₪)': Math.round(st.totalPaid),
      'إجمالي رسوم الحصص المنفذة (₪)': Math.round(st.totalSpent),
      'الرصيد المالي المتبقي (₪)': Math.round(st.balance),
      'عدد الحصص': st.sessionCount,
      'ساعات التدريس': st.totalHours,
      'الحالة المالية': st.balance >= 500 ? 'فائض ممتاز' : st.balance >= st.threshold ? 'آمن' : st.balance >= 0 ? 'منخفض' : 'مدين / مكشوف بالسالب'
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'أرصدة الطلاب والتحصيل');
    XLSX.writeFile(wb, `Student_Financial_Balances_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 font-sans" dir="rtl">
      {/* Header Banner & Global Controls */}
      <section className="bg-gradient-to-br from-[#0D365A] via-[#114674] to-[#0A2540] text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-blue-900/40">
        {/* Background ambient lighting */}
        <div className="absolute -top-16 -left-16 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-black flex items-center gap-1.5">
                <BarChart3 size={13} className="animate-pulse" />
                <span>تحليلات بصرية تفاعلية (Recharts)</span>
              </span>
              <span className="px-2.5 py-0.5 bg-blue-500/20 text-cyan-200 border border-blue-400/30 rounded-full text-[11px] font-bold">
                أرصدة الطلاب والتحصيل الذكي
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <span>توزيع أرصدة الطلاب المالية والرسوم المحصلة</span>
              <span className="text-xs px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-lg font-mono">
                {studentFinancials.length} طالب
              </span>
            </h2>
            <p className="text-xs md:text-sm text-blue-100/80 font-medium mt-1.5 max-w-2xl leading-relaxed">
              لوحة تحليل بصري شاملة تعرض حركة تدفقات أقساط الطلاب، توزيع الأرصدة عبر شرائح الملاءة، الرسوم المحصلة فعلياً مقابل تكلفة الحصص، ومسار السيولة المالية عبر الأعمدة والخطوط والدوائر التفاعلية.
            </p>
            {((timePeriodLabel && timePeriodLabel !== 'نطاق مخصص') || (selectedSubject && selectedSubject !== 'all')) && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {timePeriodLabel && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 text-white border border-white/20 rounded-full text-xs font-black shadow-xs">
                    <Clock size={12} className="text-amber-300" />
                    <span>فترة التحليل: {timePeriodLabel}</span>
                  </span>
                )}
                {selectedSubject && selectedSubject !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 rounded-full text-xs font-black shadow-xs">
                    <BookOpen size={12} className="text-emerald-300" />
                    <span>المادة الدراسية: {selectedSubject}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0">
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer border border-emerald-400/40"
              title="تصدير جدول تحليلات أرصدة الطلاب إلى ملف إكسل"
            >
              <FileSpreadsheet size={15} />
              <span>تصدير لإكسل (Excel)</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all backdrop-blur-md border border-white/20 cursor-pointer active:scale-95"
              title="طباعة تقرير التحليل البصري"
            >
              <Printer size={15} />
              <span>طباعة 🖨️</span>
            </button>
          </div>
        </div>

        {/* View Mode Tabs Selector */}
        <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="bg-black/25 p-1 rounded-2xl flex items-center gap-1 backdrop-blur-md border border-white/10">
            <button
              onClick={() => setActiveChartSection('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeChartSection === 'all'
                  ? 'bg-white text-[#0D365A] shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers size={13} />
              <span>عرض شامل لجميع المخططات</span>
            </button>
            <button
              onClick={() => setActiveChartSection('bars')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeChartSection === 'bars'
                  ? 'bg-white text-[#0D365A] shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart3 size={13} className="text-indigo-600" />
              <span>رسوم الأعمدة (Bars)</span>
            </button>
            <button
              onClick={() => setActiveChartSection('lines')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeChartSection === 'lines'
                  ? 'bg-white text-[#0D365A] shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <LineIcon size={13} className="text-emerald-600" />
              <span>رسوم الخطوط (Lines)</span>
            </button>
            <button
              onClick={() => setActiveChartSection('pies')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeChartSection === 'pies'
                  ? 'bg-white text-[#0D365A] shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <PieIcon size={13} className="text-amber-500" />
              <span>رسوم الدوائر (Pies)</span>
            </button>
            <button
              onClick={() => setActiveChartSection('table')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                activeChartSection === 'table'
                  ? 'bg-white text-[#0D365A] shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users size={13} className="text-cyan-600" />
              <span>جدول تفصيل الطلاب</span>
            </button>
          </div>

          {/* Time range selector */}
          <div className="flex items-center gap-2 bg-black/25 px-3 py-1.5 rounded-2xl border border-white/10 text-xs">
            <span className="text-blue-200 font-bold text-[11px]">المدى الزمني:</span>
            <button
              onClick={() => setTimeRange('6m')}
              className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${
                timeRange === '6m' ? 'bg-amber-400 text-slate-900 shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              آخر 6 أشهر
            </button>
            <button
              onClick={() => setTimeRange('12m')}
              className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${
                timeRange === '12m' ? 'bg-amber-400 text-slate-900 shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              آخر سنة (12 شهراً)
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-2.5 py-1 rounded-lg font-black transition-all cursor-pointer ${
                timeRange === 'all' ? 'bg-amber-400 text-slate-900 shadow-sm' : 'text-white/70 hover:text-white'
              }`}
            >
              كامل السجل
            </button>
          </div>
        </div>
      </section>

      {/* 4 Essential KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Collected Tuition */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400">إجمالي الرسوم المحصلة</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 font-mono tracking-tight">
            ₪{overallMetrics.totalCollected.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-bold border-t border-slate-100 pt-2">
            <span>عدد عمليات الشحن:</span>
            <span className="text-emerald-700 font-black">{overallMetrics.totalPaymentsCount} دفعة</span>
          </div>
        </div>

        {/* Card 2: Total Accrued / Spent on Sessions */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400">تكلفة الحصص المستحقة</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform">
              <CreditCard size={20} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-900 font-mono tracking-tight">
            ₪{overallMetrics.totalAccrued.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-bold border-t border-slate-100 pt-2">
            <span>نسبة التحصيل والسداد:</span>
            <span className="text-blue-700 font-black">{overallMetrics.collectionRate}%</span>
          </div>
        </div>

        {/* Card 3: Surplus / Positive Balances */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400">ودائع وأرصدة الطلاب الدائنة</span>
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 group-hover:scale-110 transition-transform">
              <Wallet size={20} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-black text-emerald-600 font-mono tracking-tight">
            +₪{overallMetrics.totalPositiveBalance.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-bold border-t border-slate-100 pt-2">
            <span>طلاب بحسابات مسددة وآمنة:</span>
            <span className="text-emerald-700 font-black">{overallMetrics.solventCount} من {overallMetrics.totalStudents}</span>
          </div>
        </div>

        {/* Card 4: Outstanding Receivables / Debts */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400">ذمم وحسابات مكشوفة بالسالب</span>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 group-hover:scale-110 transition-transform">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="text-2xl md:text-3xl font-black text-rose-600 font-mono tracking-tight">
            -₪{overallMetrics.totalNegativeDebt.toLocaleString()}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-bold border-t border-slate-100 pt-2">
            <span>طلاب عليهم ذمم مستحقة:</span>
            <span className="text-rose-700 font-black">{overallMetrics.debtCount} طالب</span>
          </div>
        </div>
      </section>

      {/* Filter Toolbar */}
      <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="ابحث عن طالب، رقم هاتف، صف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* Academic Stage Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-400 font-bold">المرحلة:</span>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as any)}
              className="bg-transparent font-black text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">جميع المراحل</option>
              <option value="basic">أساسي</option>
              <option value="middle">إعدادي</option>
              <option value="secondary">ثانوي</option>
            </select>
          </div>

          {/* Balance Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-400 font-bold">حالة الرصيد:</span>
            <select
              value={balanceFilter}
              onChange={(e) => setBalanceFilter(e.target.value as any)}
              className="bg-transparent font-black text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">جميع الحسابات</option>
              <option value="surplus">فائض ممتاز (&gt;500₪)</option>
              <option value="safe">آمن (ضمن العتبة)</option>
              <option value="low">منخفض (يقترب من النفاد)</option>
              <option value="debt">مدين / مكشوف بالسالب (&lt;0₪)</option>
            </select>
          </div>
        </div>

        <div className="text-xs font-bold text-slate-500">
          عرض <span className="font-black text-blue-700 font-mono">{filteredStudents.length}</span> من أصل <span className="font-mono">{studentFinancials.length}</span> طالب
        </div>
      </section>

      {/* ===================== SECTION 1: BAR CHARTS (أعمدة) ===================== */}
      {(activeChartSection === 'all' || activeChartSection === 'bars') && (
        <div className="space-y-8">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
              <BarChart3 size={18} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">رسوم بيانية بالأعمدة (Bar Charts)</h3>
              <p className="text-xs font-medium text-slate-500">مقارنة الرسوم المحصلة بتكاليف الحصص وتوزيع شرائح الأرصدة المالية</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Chart 1A: Monthly Collected Tuition vs Invoiced Session Charges */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <h4 className="text-base font-black text-slate-900">الرسوم المحصلة مقابل تكلفة الحصص شهرياً</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-bold">مقارنة تدفقات شحن الأرصدة المدفوعة باستهلاك الحصص التدريسية</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-black">
                  <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                    <span className="w-3 h-3 bg-emerald-500 rounded-sm" />
                    <span>المحصل</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-[#0D365A] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                    <span className="w-3 h-3 bg-[#0D365A] rounded-sm" />
                    <span>المستحق</span>
                  </span>
                </div>
              </div>

              <div className="h-[320px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyFinancialData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} 
                      angle={-20} 
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} 
                      tickFormatter={(val) => `₪${val}`}
                    />
                    <Tooltip 
                      formatter={(val: any, name: string) => [
                        `₪${Number(val).toLocaleString()}`, 
                        name === 'collected' ? 'الرسوم المحصلة (شحن أرصدة)' : 'رسوم الحصص المنفذة'
                      ]}
                      labelFormatter={(label) => `الشهر: ${label}`}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="collected" name="collected" fill="#10B981" radius={[8, 8, 0, 0]} maxBarSize={36} />
                    <Bar dataKey="accrued" name="accrued" fill="#0D365A" radius={[8, 8, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
                <span>إجمالي المحصل في الفترة: <strong className="text-emerald-700 font-mono">₪{monthlyFinancialData.reduce((s, m) => s + m.collected, 0).toLocaleString()}</strong></span>
                <span>إجمالي الحصص: <strong className="text-blue-900 font-mono">₪{monthlyFinancialData.reduce((s, m) => s + m.accrued, 0).toLocaleString()}</strong></span>
              </div>
            </div>

            {/* Chart 1B: Student Balance Tiers Histogram */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h4 className="text-base font-black text-slate-900">توزيع شرائح أرصدة الطلاب المالية</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-bold">عدد الطلاب في كل فئة وملاءة مالية (فائض، آمن، منخفض، ومدين)</p>
                </div>
                <span className="text-xs bg-slate-100 text-slate-700 font-black px-3 py-1 rounded-xl">
                  {studentFinancials.length} طالب مسجل
                </span>
              </div>

              <div className="h-[320px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={balanceTiersData} margin={{ top: 10, right: 10, left: 0, bottom: 35 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} 
                      angle={-25} 
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} 
                      tickFormatter={(val) => `${val} ط`}
                    />
                    <Tooltip 
                      formatter={(val: any, name: string, item: any) => [
                        `${val} طالب (إجمالي المبالغ: ₪${Math.round(item.payload.totalAmount).toLocaleString()})`,
                        'عدد الطلاب'
                      ]}
                      labelFormatter={(label) => `الشريحة المالية: ${label}`}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="count" name="count" radius={[8, 8, 0, 0]} maxBarSize={45}>
                      {balanceTiersData.map((entry, index) => (
                        <Cell key={`tier-cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                <div className="bg-emerald-50 text-emerald-800 p-2 rounded-xl border border-emerald-100">
                  <span className="block text-[10px] text-emerald-600">فائض وآمن</span>
                  <span className="font-black text-sm">{balanceTiersData[0].count + balanceTiersData[1].count} طالب</span>
                </div>
                <div className="bg-amber-50 text-amber-800 p-2 rounded-xl border border-amber-100">
                  <span className="block text-[10px] text-amber-600">منخفض ومتعادل</span>
                  <span className="font-black text-sm">{balanceTiersData[2].count + balanceTiersData[3].count} طالب</span>
                </div>
                <div className="bg-rose-50 text-rose-800 p-2 rounded-xl border border-rose-100">
                  <span className="block text-[10px] text-rose-600">مدين ومكشوف</span>
                  <span className="font-black text-sm">{balanceTiersData[4].count + balanceTiersData[5].count} طالب</span>
                </div>
              </div>
            </div>

            {/* Chart 1C: Top Paying Students (Horizontal Comparison) */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <h4 className="text-base font-black text-slate-900">أعلى الطلاب تسديداً للرسوم الدراسية وحالة رصيدهم الحالي</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-bold">مقارنة حجم الرسوم المحصلة من كل طالب مقابل استهلاكه للحصص والرصيد المتبقي</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-black">
                  <span className="flex items-center gap-1.5 text-emerald-600">
                    <span className="w-3 h-3 bg-emerald-500 rounded-sm" />
                    <span>الرسوم المسددة (شحن)</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-blue-800">
                    <span className="w-3 h-3 bg-[#0D365A] rounded-sm" />
                    <span>المستهلك في الحصص</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <span className="w-3 h-3 bg-amber-500 rounded-sm" />
                    <span>الرصيد المتبقي</span>
                  </span>
                </div>
              </div>

              <div className="h-[340px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topPayingStudentsData} margin={{ top: 10, right: 20, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#475569', fontSize: 11, fontWeight: 'bold' }} 
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} 
                      tickFormatter={(val) => `₪${val}`}
                    />
                    <Tooltip 
                      formatter={(val: any, name: string) => [
                        `₪${Number(val).toLocaleString()}`, 
                        name === 'paid' ? 'الرسوم المسددة' : name === 'spent' ? 'المستهلك في الحصص' : 'الرصيد الحالي'
                      ]}
                      labelFormatter={(label, payload) => {
                        const item = payload?.[0]?.payload;
                        return item?.fullName || label;
                      }}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="paid" name="paid" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="spent" name="spent" fill="#0D365A" radius={[6, 6, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="balance" name="balance" fill="#F59E0B" radius={[6, 6, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SECTION 2: LINE CHARTS (خطوط) ===================== */}
      {(activeChartSection === 'all' || activeChartSection === 'lines') && (
        <div className="space-y-8">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
              <LineIcon size={18} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">رسوم بيانية بالخطوط (Line Charts)</h3>
              <p className="text-xs font-medium text-slate-500">مسار تحصيل الرسوم عبر الزمن، تطور صافي السيولة، والمنحنى التراكمي</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Chart 2A: Timeline Trend of Collected Tuition & Net Balance Flow */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <h4 className="text-base font-black text-slate-900">مسار تحصيل الرسوم وصافي حركة الأرصدة</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-bold">تتبع استقرار التدفق المالي الشهري وسرعة الشحن مقابل استحقاق الحصص</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                  <span className="text-emerald-700 flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>المحصل</span>
                  </span>
                  <span className="text-[#0D365A] flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0D365A]" />
                    <span>المستحق</span>
                  </span>
                  <span className="text-amber-700 flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>صافي التدفق</span>
                  </span>
                </div>
              </div>

              <div className="h-[320px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyFinancialData} margin={{ top: 10, right: 15, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} 
                      angle={-20} 
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} 
                      tickFormatter={(val) => `₪${val}`}
                    />
                    <Tooltip 
                      formatter={(val: any, name: string) => [
                        `₪${Number(val).toLocaleString()}`, 
                        name === 'collected' ? 'الرسوم المحصلة' : name === 'accrued' ? 'تكلفة الحصص' : 'صافي التدفق'
                      ]}
                      labelFormatter={(label) => `الشهر: ${label}`}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    {/* Line 1: Collected Tuition (Solid with circles) */}
                    <Line 
                      type="monotone" 
                      dataKey="collected" 
                      name="collected" 
                      stroke="#10B981" 
                      strokeWidth={3} 
                      dot={{ r: 5, fill: '#10B981', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 7 }}
                    />
                    {/* Line 2: Accrued Charges (Dashed with squares) */}
                    <Line 
                      type="monotone" 
                      dataKey="accrued" 
                      name="accrued" 
                      stroke="#0D365A" 
                      strokeWidth={2.5} 
                      strokeDasharray="5 5" 
                      dot={{ r: 4, fill: '#0D365A', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 6 }}
                    />
                    {/* Line 3: Net Balance Flow (Dotted with diamonds) */}
                    <Line 
                      type="monotone" 
                      dataKey="netFlow" 
                      name="netFlow" 
                      stroke="#F59E0B" 
                      strokeWidth={2} 
                      strokeDasharray="3 3" 
                      dot={{ r: 4, fill: '#F59E0B', strokeWidth: 2, stroke: '#fff' }} 
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Guide / Color blindness accessibility patterns */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-emerald-600 font-black">── ●</span> الرسوم المحصلة (خط متصل)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-blue-900 font-black">╌╌ ■</span> تكلفة الحصص (متقطع)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-amber-600 font-black">┈┈ ◆</span> صافي التدفق (منقط)
                </span>
              </div>
            </div>

            {/* Chart 2B: Cumulative Collection vs Accrued Velocity */}
            <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <h4 className="text-base font-black text-slate-900">المنحنى التراكمي للتحصيل المالي والاستهلاك</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-bold">تنامي مبالغ الرسوم المحصلة إجمالياً مقارنة بالقيمة الإجمالية للحصص</p>
                </div>
                <div className="text-xs font-black text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
                  تراكمي تصاعدي
                </div>
              </div>

              <div className="h-[320px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyFinancialData} margin={{ top: 10, right: 15, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} 
                      angle={-20} 
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis 
                      tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} 
                      tickFormatter={(val) => `₪${val}`}
                    />
                    <Tooltip 
                      formatter={(val: any, name: string) => [
                        `₪${Number(val).toLocaleString()}`, 
                        name === 'cumulativeCollected' ? 'إجمالي المحصل التراكمي' : 'إجمالي تكلفة الحصص التراكمية'
                      ]}
                      labelFormatter={(label) => `الشهر: ${label}`}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem', color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cumulativeCollected" 
                      name="cumulativeCollected" 
                      stroke="#059669" 
                      strokeWidth={3} 
                      dot={{ r: 4, fill: '#059669' }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cumulativeAccrued" 
                      name="cumulativeAccrued" 
                      stroke="#4F46E5" 
                      strokeWidth={3} 
                      strokeDasharray="4 4"
                      dot={{ r: 4, fill: '#4F46E5' }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
                <span>تراكمي التحصيل الحالي: <strong className="text-emerald-700 font-mono">₪{overallMetrics.totalCollected.toLocaleString()}</strong></span>
                <span>فارق التغطية: <strong className={`font-mono ${overallMetrics.totalCollected >= overallMetrics.totalAccrued ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {overallMetrics.totalCollected >= overallMetrics.totalAccrued ? '+فائض مالي' : '-عجز تحصيل'} (₪{Math.abs(overallMetrics.totalCollected - overallMetrics.totalAccrued).toLocaleString()})
                </strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SECTION 3: PIE / DONUT CHARTS (دوائر) ===================== */}
      {(activeChartSection === 'all' || activeChartSection === 'pies') && (
        <div className="space-y-8">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
              <PieIcon size={18} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">رسوم بيانية دائرية (Pie & Donut Charts)</h3>
              <p className="text-xs font-medium text-slate-500">التوزيع النسبي لملاءة الحسابات، قنوات الدفع، وحصة التحصيل مقابل الذمم</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Chart 3A: Student Balance Health Donut */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-black text-slate-400 block uppercase">ملاءة المحافظ</span>
                <h4 className="text-sm font-black text-slate-900 mt-0.5">تصنيف أرصدة الطلاب الكلية</h4>
              </div>

              <div className="h-[240px] w-full relative flex items-center justify-center my-2" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={balanceDistributionPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {balanceDistributionPieData.map((entry, index) => (
                        <Cell key={`cell-pie-health-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any, name: string) => [`${val} طالب (${Math.round((Number(val)/studentFinancials.length)*100)}%)`, name]}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-slate-900 font-mono">{overallMetrics.solventRatio}%</span>
                  <span className="text-[9px] text-slate-400 font-bold">آمن وفائض</span>
                </div>
              </div>

              {/* Legend List */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs font-bold">
                {balanceDistributionPieData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </span>
                    <span className="font-mono text-slate-900 font-black">{item.value} طالب</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 3B: Collected vs Outstanding Debt Share */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-black text-slate-400 block uppercase">كفاءة الاسترداد</span>
                <h4 className="text-sm font-black text-slate-900 mt-0.5">المحصل في الخزينة مقابل الذمم المعلقة</h4>
              </div>

              <div className="h-[240px] w-full relative flex items-center justify-center my-2" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={collectionSharePieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      stroke="none"
                    >
                      {collectionSharePieData.map((entry, index) => (
                        <Cell key={`cell-pie-share-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any, name: string) => [`₪${Number(val).toLocaleString()}`, name]}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-emerald-600 font-mono">{overallMetrics.collectionRate}%</span>
                  <span className="text-[9px] text-slate-400 font-bold">نسبة التحصيل</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs font-bold">
                {collectionSharePieData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </span>
                    <span className="font-mono text-slate-900 font-black">₪{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chart 3C: Payment Channels / Methods */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] font-black text-slate-400 block uppercase">طرق التوريد</span>
                <h4 className="text-sm font-black text-slate-900 mt-0.5">وسائل تسديد الرسوم الدراسية</h4>
              </div>

              <div className="h-[240px] w-full relative flex items-center justify-center my-2" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentMethodsPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {paymentMethodsPieData.map((entry, index) => (
                        <Cell key={`cell-pie-method-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(val: any, name: string) => [`₪${Number(val).toLocaleString()}`, name]}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem', color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-blue-900 font-mono">{credits.length}</span>
                  <span className="text-[9px] text-slate-400 font-bold">عملية دفع</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs font-bold">
                {paymentMethodsPieData.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-slate-600">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="truncate max-w-[140px]">{item.name}</span>
                    </span>
                    <span className="font-mono text-slate-900 font-black">₪{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== SECTION 4: DETAILED STUDENT FINANCIAL AUDIT TABLE ===================== */}
      {(activeChartSection === 'all' || activeChartSection === 'table') && (
        <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div>
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#0D365A]" />
                <h3 className="text-lg font-black text-slate-900">جدول التدقيق المالي ومطابقة أرصدة الطلاب</h3>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-1">كشف تفصيلي لمجموع الرسوم المحصلة، المستهلك في الحصص التدريسية، والرصيد النهائي المتبقي</p>
            </div>

            <button
              onClick={handleExportExcel}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer select-none"
            >
              <Download size={14} />
              <span>تنزيل هذا الجدول (Excel)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-black border-b border-slate-100">
                  <th className="py-4 px-6">م</th>
                  <th className="py-4 px-6">اسم الطالب</th>
                  <th className="py-4 px-6">المرحلة / الصف</th>
                  <th className="py-4 px-6 text-center">الرسوم المحصلة (شحن)</th>
                  <th className="py-4 px-6 text-center">المستهلك بالحصص</th>
                  <th className="py-4 px-6 text-center">الرصيد المالي الحالي</th>
                  <th className="py-4 px-6 text-center">حالة الملاءة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                      لا توجد نتائج تطابق خيارات التصفية الحالية
                    </td>
                  </tr>
                ) : (
                  filteredStudents.slice(0, 50).map((st, idx) => (
                    <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-6 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-6 font-black text-slate-900">
                        <div>{st.name}</div>
                        {st.phone && <div className="text-[10px] text-slate-400 font-mono">{st.phone}</div>}
                      </td>
                      <td className="py-3 px-6 text-slate-600 font-bold">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px]">
                          {st.academicStage === 'basic' ? 'أساسي' : st.academicStage === 'middle' ? 'إعدادي' : 'ثانوي'}
                        </span>
                        {st.grade && <span className="mr-1 text-[11px] text-slate-400">({st.grade})</span>}
                      </td>
                      <td className="py-3 px-6 text-center font-mono font-black text-emerald-600">
                        ₪{Math.round(st.totalPaid).toLocaleString()}
                      </td>
                      <td className="py-3 px-6 text-center font-mono font-bold text-slate-700">
                        ₪{Math.round(st.totalSpent).toLocaleString()}
                        <div className="text-[10px] text-slate-400 font-normal">({st.totalHours} س - {st.sessionCount} حصص)</div>
                      </td>
                      <td className="py-3 px-6 text-center font-mono font-black">
                        <span className={st.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                          {st.balance >= 0 ? `+₪${Math.round(st.balance).toLocaleString()}` : `-₪${Math.round(Math.abs(st.balance)).toLocaleString()}`}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-center">
                        {st.balance >= 500 ? (
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-black inline-flex items-center gap-1">
                            <ShieldCheck size={12} />
                            <span>فائض ممتاز</span>
                          </span>
                        ) : st.balance >= st.threshold ? (
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-black inline-flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            <span>آمن ومستقر</span>
                          </span>
                        ) : st.balance >= 0 ? (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black inline-flex items-center gap-1">
                            <AlertTriangle size={12} />
                            <span>منخفض / تنبيه</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-black inline-flex items-center gap-1">
                            <AlertTriangle size={12} />
                            <span>مكشوف / ذمة</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {filteredStudents.length > 0 && (
                <tfoot className="border-t-2 border-slate-300 bg-slate-100/90 font-black">
                  <tr className="hover:bg-slate-200/50 transition-colors">
                    <td colSpan={3} className="py-4 px-6 text-slate-900 border-l border-slate-200">
                      مجموع الساعات الكلي لجميع الحصص المسجلة ({filteredStudents.length} طالب):
                    </td>
                    <td className="py-4 px-6 text-center font-mono font-black text-emerald-700 border-l border-slate-200">
                      ₪{Math.round(filteredStudents.reduce((sum, st) => sum + st.totalPaid, 0)).toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-center font-mono font-black text-slate-800 border-l border-slate-200">
                      ₪{Math.round(filteredStudents.reduce((sum, st) => sum + st.totalSpent, 0)).toLocaleString()}
                      <div className="text-[10px] text-indigo-700 font-extrabold">({filteredStudents.reduce((sum, st) => sum + st.totalHours, 0).toFixed(1)} ساعة)</div>
                    </td>
                    <td className="py-4 px-6 text-center font-mono font-black border-l border-slate-200">
                      {(() => {
                        const totalBal = filteredStudents.reduce((sum, st) => sum + st.balance, 0);
                        return (
                          <span className={totalBal >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                            {totalBal >= 0 ? `+₪${Math.round(totalBal).toLocaleString()}` : `-₪${Math.round(Math.abs(totalBal)).toLocaleString()}`}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-4 px-6 text-center text-slate-500 text-[11px]">
                      إجمالي الأرصدة والساعات
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
