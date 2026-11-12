import React, { useState, useMemo } from 'react';
import { 
  FileDown, 
  Printer, 
  X, 
  Calendar, 
  CalendarRange,
  ArrowLeftRight,
  User, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Loader2, 
  Filter, 
  Sparkles,
  FileText,
  AlertCircle,
  Wallet,
  ArrowRight,
  ArrowLeft,
  Share2,
  FileSpreadsheet,
  CheckCheck,
  TrendingUp,
  Receipt,
  HelpCircle,
  RefreshCw,
  Info
} from 'lucide-react';
import { Session, Student, Teacher, GroupCourse, Payment, formatCustomDate } from '../types';
import { 
  computeTeacherBalanceSummary, 
  downloadTeacherBalancePDF, 
  printTeacherBalanceReport,
  exportTeacherBalanceToCSV,
  ARABIC_MONTHS 
} from '../lib/teacherFinancialBalancePdfReport';

interface TeacherBalanceStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  loggedInTeacher: Teacher;
  sessions: Session[];
  students: Student[];
  payments: Payment[];
  assignments?: any[];
  groupCourses?: GroupCourse[];
  triggerToast?: (msg: string) => void;
}

export const TeacherBalanceStatementModal: React.FC<TeacherBalanceStatementModalProps> = ({
  isOpen,
  onClose,
  loggedInTeacher,
  sessions,
  students,
  payments,
  assignments = [],
  groupCourses = [],
  triggerToast
}) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  // Format today as YYYY-MM-DD
  const todayStr = currentDate.toISOString().split('T')[0];
  const firstDayOfMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;

  // Filter modes: 'range' (default) | 'month' | 'all'
  const [filterMode, setFilterMode] = useState<'range' | 'month' | 'all'>('range');
  
  // Month mode states
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);

  // Range mode states (From Date - To Date)
  const [startDate, setStartDate] = useState<string>(firstDayOfMonthStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Student and status filters
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'approved' | 'pending'>('approved');

  // Preview tab: 'sessions' | 'payments' | 'students'
  const [previewTab, setPreviewTab] = useState<'sessions' | 'payments' | 'students'>('sessions');

  // Generating PDF state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Arabic Date Formatting helper
  const formatArabicDateLong = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      }
    } catch (e) {
      // fallback
    }
    return dateStr;
  };

  // Calculate day difference between two dates
  const daysDifference = useMemo(() => {
    if (!startDate || !endDate) return 0;
    try {
      const d1 = new Date(startDate);
      const d2 = new Date(endDate);
      const diff = d2.getTime() - d1.getTime();
      if (isNaN(diff)) return 0;
      return Math.round(diff / (1000 * 60 * 60 * 24)) + 1;
    } catch (e) {
      return 0;
    }
  }, [startDate, endDate]);

  // Sync month dropdown with startDate and endDate
  const handleSelectMonth = (m: number) => {
    setSelectedMonth(m);
    const mStr = String(m).padStart(2, '0');
    const lastDay = new Date(selectedYear, m, 0).getDate();
    setStartDate(`${selectedYear}-${mStr}-01`);
    setEndDate(`${selectedYear}-${mStr}-${String(lastDay).padStart(2, '0')}`);
  };

  const handleSelectYear = (y: number) => {
    setSelectedYear(y);
    const mStr = String(selectedMonth).padStart(2, '0');
    const lastDay = new Date(y, selectedMonth, 0).getDate();
    setStartDate(`${y}-${mStr}-01`);
    setEndDate(`${y}-${mStr}-${String(lastDay).padStart(2, '0')}`);
  };

  // Quick range presets
  const applyPreset = (preset: 'today' | 'yesterday' | 'last_7_days' | 'this_week' | 'this_month' | 'last_month' | 'last_30_days' | 'last_60_days' | 'last_90_days' | 'current_quarter' | 'last_quarter' | 'ytd' | 'all_time') => {
    const now = new Date();
    const nowStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      setFilterMode('range');
      setStartDate(nowStr);
      setEndDate(nowStr);
    } else if (preset === 'yesterday') {
      setFilterMode('range');
      const yDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const yStr = yDate.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'last_7_days') {
      setFilterMode('range');
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(nowStr);
    } else if (preset === 'this_week') {
      setFilterMode('range');
      const dayOfWeek = now.getDay(); // 0 is Sun
      const startOfWeek = new Date(now);
      // Start week on Saturday (day 6) or Sunday (0)
      startOfWeek.setDate(now.getDate() - ((dayOfWeek + 1) % 7));
      setStartDate(startOfWeek.toISOString().split('T')[0]);
      setEndDate(nowStr);
    } else if (preset === 'this_month') {
      setFilterMode('range');
      setSelectedYear(now.getFullYear());
      setSelectedMonth(now.getMonth() + 1);
      const mStr = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      setStartDate(`${now.getFullYear()}-${mStr}-01`);
      setEndDate(`${now.getFullYear()}-${mStr}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'last_month') {
      setFilterMode('range');
      let m = now.getMonth(); // 0 is Jan
      let y = now.getFullYear();
      if (m === 0) {
        m = 12;
        y -= 1;
      }
      setSelectedYear(y);
      setSelectedMonth(m);
      const mStr = String(m).padStart(2, '0');
      const lastDay = new Date(y, m, 0).getDate();
      setStartDate(`${y}-${mStr}-01`);
      setEndDate(`${y}-${mStr}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'last_30_days') {
      setFilterMode('range');
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(nowStr);
    } else if (preset === 'last_60_days') {
      setFilterMode('range');
      const past = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(nowStr);
    } else if (preset === 'last_90_days') {
      setFilterMode('range');
      const past = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(nowStr);
    } else if (preset === 'current_quarter') {
      setFilterMode('range');
      const q = Math.floor(now.getMonth() / 3);
      const startM = q * 3 + 1;
      const endM = startM + 2;
      const lastDay = new Date(now.getFullYear(), endM, 0).getDate();
      setStartDate(`${now.getFullYear()}-${String(startM).padStart(2, '0')}-01`);
      setEndDate(`${now.getFullYear()}-${String(endM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'last_quarter') {
      setFilterMode('range');
      let q = Math.floor(now.getMonth() / 3) - 1;
      let y = now.getFullYear();
      if (q < 0) {
        q = 3;
        y -= 1;
      }
      const startM = q * 3 + 1;
      const endM = startM + 2;
      const lastDay = new Date(y, endM, 0).getDate();
      setStartDate(`${y}-${String(startM).padStart(2, '0')}-01`);
      setEndDate(`${y}-${String(endM).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'ytd') {
      setFilterMode('range');
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(nowStr);
    } else if (preset === 'all_time') {
      setFilterMode('all');
    }
  };

  // Distinct students associated with this teacher's sessions
  const teacherStudentsList = useMemo(() => {
    const studentIds = new Set(
      sessions
        .filter(s => s.teacherId === loggedInTeacher.id && s.studentId)
        .map(s => s.studentId)
    );
    return students.filter(st => studentIds.has(st.id));
  }, [sessions, loggedInTeacher.id, students]);

  // Compute live summary for the currently selected parameters
  const computedSummary = useMemo(() => {
    return computeTeacherBalanceSummary({
      teacher: loggedInTeacher,
      mode: filterMode,
      year: selectedYear,
      month: selectedMonth,
      startDate,
      endDate,
      sessions,
      students,
      payments,
      assignments,
      groupCourses,
      studentFilter: selectedStudentFilter,
      statusFilter: selectedStatusFilter
    });
  }, [
    loggedInTeacher,
    filterMode,
    selectedYear,
    selectedMonth,
    startDate,
    endDate,
    sessions,
    students,
    payments,
    assignments,
    groupCourses,
    selectedStudentFilter,
    selectedStatusFilter
  ]);

  if (!isOpen) return null;

  // Handle PDF Download
  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      await downloadTeacherBalancePDF(computedSummary);
      if (triggerToast) {
        triggerToast('تم تحميل كشف الرصيد والمستحقات بصيغة PDF بنجاح 📄');
      }
    } catch (err) {
      console.error('Failed to download balance statement PDF:', err);
      if (triggerToast) {
        triggerToast('حدث خطأ أثناء إنشاء ملف PDF، يرجى المحاولة عبر زر الطباعة.');
      }
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handle Direct Print
  const handlePrint = () => {
    printTeacherBalanceReport(computedSummary);
    if (triggerToast) {
      triggerToast('تم فتح نافذة طباعة كشف الرصيد 🖨️');
    }
  };

  // Handle CSV/Excel Export
  const handleExportCSV = () => {
    exportTeacherBalanceToCSV(computedSummary);
    if (triggerToast) {
      triggerToast('تم تصدير كشف الحساب لملف Excel / CSV بنجاح 📊');
    }
  };

  // Handle WhatsApp Share
  const handleShareWhatsApp = () => {
    const msg = `السلام عليكم ورحمة الله وبركاته،
*كشف رصيد ومستحقات المعلم - أكاديمية التفوق أون لاين*

👤 *اسم المعلم:* أ. ${loggedInTeacher.name}
🗓️ *نطاق الكشف:* ${computedSummary.periodLabelArabic}

📊 *الملخص المالي:*
- الرصيد السابق الافتتاحي: ₪${computedSummary.openingBalance.toFixed(2)}
- إجمالي مستحقات الحصص المعتمدة: + ₪${computedSummary.periodEarnedApproved.toFixed(2)} (${computedSummary.approvedSessionsCount} حصة / ${computedSummary.approvedHours.toFixed(1)} س)
- إجمالي المدفوعات والمسحوبات المسلمة: - ₪${computedSummary.periodPaid.toFixed(2)} (${computedSummary.paymentsList.length} سندات)
- *صافي الرصيد المستحق للمعلم:* ₪${computedSummary.closingBalance.toFixed(2)}

📅 *تاريخ الاستخراج:* ${computedSummary.generatedAt}
منصة أكاديمية التفوق أون لاين للتعليم الذكي ✨`;

    const encoded = encodeURIComponent(msg);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in"
      dir="rtl"
    >
      <div 
        className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-right"
        role="dialog"
        aria-modal="true"
      >
        {/* Header with High-Contrast Action Icons */}
        <div className="bg-gradient-to-r from-[#0d365a] via-[#1a4a75] to-slate-900 text-white p-3.5 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-amber-400/10 rounded-full blur-2xl -ml-24 -mt-24 pointer-events-none" />
          
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
              <Wallet size={22} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black bg-amber-400/30 text-amber-200 px-2 py-0.5 rounded-full border border-amber-400/30">
                  التقرير المالي والأكاديمي الرسمي
                </span>
                <span className="text-xs font-bold text-slate-200">
                  أ. {loggedInTeacher.name}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-0.5 flex items-center gap-1.5">
                <span>كشف رصيد وحساب مستحقات المعلم</span>
                <span>💰</span>
              </h2>
            </div>
          </div>

          {/* Quick Action Icons in Header: Immediate Visibility, Page Adaptation & High Contrast */}
          <div className="flex flex-wrap items-center gap-2 relative z-10 justify-end">
            {/* Share WhatsApp */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-2.5 py-1.5 rounded-xl border border-emerald-400/50 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              title="مشاركة ملخص الكشف عبر واتساب"
            >
              <Share2 size={14} className="text-emerald-200" />
              <span className="hidden sm:inline">واتساب</span>
            </button>

            {/* Export Excel */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 rounded-xl border border-white/30 bg-white/15 hover:bg-white/25 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              title="تصدير كشف الرصيد لملف Excel / CSV"
            >
              <FileSpreadsheet size={14} className="text-emerald-300" />
              <span className="hidden sm:inline">Excel</span>
            </button>

            {/* Print Direct */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-2.5 py-1.5 rounded-xl border border-white/30 bg-white/15 hover:bg-white/25 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              title="طباعة كشف الرصيد مباشرة"
            >
              <Printer size={14} className="text-amber-300" />
              <span className="hidden sm:inline">طباعة</span>
            </button>

            {/* PDF Export Header Button */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-60 border border-emerald-300/40"
              title="تصدير كشف الرصيد PDF"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 size={14} className="animate-spin text-amber-300" />
                  <span>PDF...</span>
                </>
              ) : (
                <>
                  <FileDown size={14} className="text-amber-300" />
                  <span>تصدير PDF 📥</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button 
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 mr-1"
              title="إغلاق النافذة"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Controls Panel - Compact, Responsive & High-Contrast */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b-2 border-slate-200 space-y-2.5 shrink-0">
          
          {/* Row 1: Mode Switch Tabs & Active Period Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Mode Switch Tabs */}
            <div className="flex items-center bg-white p-0.5 rounded-xl border-2 border-slate-300 shadow-2xs">
              <button
                type="button"
                onClick={() => setFilterMode('range')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterMode === 'range'
                    ? 'bg-[#0d365a] text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <CalendarRange size={14} className={filterMode === 'range' ? 'text-amber-300' : 'text-slate-500'} />
                <span>نطاق مخصص (من - إلى)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilterMode('month');
                  const mStr = String(selectedMonth).padStart(2, '0');
                  const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
                  setStartDate(`${selectedYear}-${mStr}-01`);
                  setEndDate(`${selectedYear}-${mStr}-${String(lastDay).padStart(2, '0')}`);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterMode === 'month'
                    ? 'bg-[#0d365a] text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Calendar size={14} className={filterMode === 'month' ? 'text-amber-300' : 'text-slate-500'} />
                <span>كشف شهري</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterMode === 'all'
                    ? 'bg-[#0d365a] text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Receipt size={14} className={filterMode === 'all' ? 'text-amber-300' : 'text-slate-500'} />
                <span>كشف شامل (الكل)</span>
              </button>
            </div>

            {/* Active Range Preview Badge with Key Metrics */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-800">
              <div className="flex items-center gap-1.5 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg text-emerald-950 font-black text-[11px]">
                <Clock size={13} className="text-emerald-700 shrink-0" />
                <span>
                  {filterMode === 'all' 
                    ? 'كامل السجلات حتى اليوم' 
                    : `الفترة: ${daysDifference > 0 ? `${daysDifference} يوماً` : 'يوم'} (${formatCustomDate(startDate)} إلى ${formatCustomDate(endDate)})`}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-black text-slate-800 bg-white border border-slate-300 px-2.5 py-1 rounded-lg">
                <span>الحصص: <strong className="text-emerald-700 font-mono font-black">{computedSummary.totalSessions}</strong></span>
                <span>•</span>
                <span>السندات: <strong className="text-indigo-700 font-mono font-black">{computedSummary.paymentsList.length}</strong></span>
              </div>
            </div>
          </div>

          {/* Row 2: Quick Presets Bar (Horizontally scrollable, crisp high contrast) */}
          <div className="flex items-center gap-1.5 text-xs bg-white p-1.5 rounded-xl border border-slate-300 shadow-2xs overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-black text-slate-800 ml-1 flex items-center gap-1 shrink-0">
              <Sparkles size={13} className="text-amber-500" />
              <span>نطاقات سريعة:</span>
            </span>
            <button
              type="button"
              onClick={() => applyPreset('today')}
              className={`px-2 py-0.5 rounded-md text-[11px] font-black border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                startDate === todayStr && endDate === todayStr && filterMode === 'range'
                  ? 'bg-amber-400 text-slate-950 border-amber-500'
                  : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
              }`}
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => applyPreset('yesterday')}
              className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              أمس
            </button>
            <button
              type="button"
              onClick={() => applyPreset('last_7_days')}
              className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              آخر 7 أيام
            </button>
            <button
              type="button"
              onClick={() => applyPreset('this_week')}
              className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              هذا الأسبوع
            </button>
            <button
              type="button"
              onClick={() => applyPreset('this_month')}
              className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              هذا الشهر
            </button>
            <button
              type="button"
              onClick={() => applyPreset('last_month')}
              className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              الشهر الماضي
            </button>
            <button
              type="button"
              onClick={() => applyPreset('last_30_days')}
              className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              آخر 30 يوماً
            </button>
            <button
              type="button"
              onClick={() => applyPreset('last_60_days')}
              className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              آخر 60 يوماً
            </button>
            <button
              type="button"
              onClick={() => applyPreset('last_90_days')}
              className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              آخر 90 يوماً
            </button>
            <button
              type="button"
              onClick={() => applyPreset('current_quarter')}
              className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              الربع الحالي
            </button>
            <button
              type="button"
              onClick={() => applyPreset('ytd')}
              className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              منذ بداية العام ({currentYear})
            </button>
            <button
              type="button"
              onClick={() => applyPreset('all_time')}
              className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300 hover:bg-blue-200 transition-all cursor-pointer whitespace-nowrap shrink-0"
            >
              كامل السجلات
            </button>
          </div>

          {/* Row 3: Compact Inputs Grid (4 columns, h-9 high-contrast inputs) */}
          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-300 shadow-2xs">
            {filterMode === 'range' ? (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {/* From Date */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>من تاريخ:</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setStartDate(firstDayOfMonthStr)}
                        className="text-[10px] text-blue-700 hover:underline font-bold cursor-pointer"
                      >
                        أول الشهر
                      </button>
                    </div>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border-2 border-slate-300 text-xs font-black text-slate-900 bg-white focus:outline-none focus:border-[#0d365a] font-mono shadow-2xs"
                    />
                  </div>

                  {/* To Date */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span>إلى تاريخ:</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setEndDate(todayStr)}
                        className="text-[10px] text-blue-700 hover:underline font-bold cursor-pointer"
                      >
                        اليوم
                      </button>
                    </div>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border-2 border-slate-300 text-xs font-black text-slate-900 bg-white focus:outline-none focus:border-[#0d365a] font-mono shadow-2xs"
                    />
                  </div>

                  {/* Student Filter */}
                  <div>
                    <label className="block text-[11px] font-black text-slate-800 mb-1">
                      تصفية الطالب:
                    </label>
                    <select
                      value={selectedStudentFilter}
                      onChange={(e) => setSelectedStudentFilter(e.target.value)}
                      className="w-full h-9 px-2.5 rounded-lg border-2 border-slate-300 text-xs font-black text-slate-900 bg-white focus:outline-none focus:border-[#0d365a] cursor-pointer shadow-2xs"
                    >
                      <option value="all">جميع الطلاب ({teacherStudentsList.length})</option>
                      {teacherStudentsList.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} ({st.academicLevel || st.grade || 'طالب'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div>
                    <label className="block text-[11px] font-black text-slate-800 mb-1">
                      اعتماد الحصص:
                    </label>
                    <select
                      value={selectedStatusFilter}
                      onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                      className="w-full h-9 px-2.5 rounded-lg border-2 border-slate-300 text-xs font-black text-slate-900 bg-white focus:outline-none focus:border-[#0d365a] cursor-pointer shadow-2xs"
                    >
                      <option value="approved">الحصص المعتمدة فقط (موصى به)</option>
                      <option value="all">جميع الحصص (معتمدة + قيد التدقيق)</option>
                      <option value="pending">قيد التدقيق فقط</option>
                    </select>
                  </div>
                </div>

                {/* Inverted dates warning */}
                {startDate > endDate && (
                  <div className="bg-rose-100 border border-rose-300 text-rose-900 p-2 rounded-lg text-xs font-bold flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <AlertCircle size={15} className="text-rose-700 shrink-0" />
                      <span>تنبيه: تاريخ البداية يقع بعد تاريخ النهاية!</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const tmp = startDate;
                        setStartDate(endDate);
                        setEndDate(tmp);
                      }}
                      className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-md text-[11px] font-black cursor-pointer transition-all flex items-center gap-1 shrink-0"
                    >
                      <ArrowLeftRight size={12} />
                      <span>عكس وتصحيح التواريخ</span>
                    </button>
                  </div>
                )}
              </div>
            ) : filterMode === 'month' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-black text-slate-800 mb-1">
                    الشهر المحدد:
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => handleSelectMonth(Number(e.target.value))}
                    className="w-full h-9 px-2.5 rounded-lg border-2 border-slate-300 text-xs font-black text-slate-900 bg-white focus:outline-none focus:border-[#0d365a] cursor-pointer shadow-2xs"
                  >
                    {ARABIC_MONTHS.map((name, index) => (
                      <option key={index + 1} value={index + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-800 mb-1">
                    السنة:
                  </label>
                  <select
                    value={selectedYear}
                    onChange={(e) => handleSelectYear(Number(e.target.value))}
                    className="w-full h-9 px-2.5 rounded-lg border-2 border-slate-300 text-xs font-black text-slate-900 bg-white focus:outline-none focus:border-[#0d365a] cursor-pointer shadow-2xs"
                  >
                    {[currentYear + 1, currentYear, currentYear - 1, currentYear - 2].map((yr) => (
                      <option key={yr} value={yr}>
                        {yr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-800 mb-1">
                    تصفية الطالب:
                  </label>
                  <select
                    value={selectedStudentFilter}
                    onChange={(e) => setSelectedStudentFilter(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border-2 border-slate-300 text-xs font-black text-slate-900 bg-white focus:outline-none focus:border-[#0d365a] cursor-pointer shadow-2xs"
                  >
                    <option value="all">جميع الطلاب ({teacherStudentsList.length})</option>
                    {teacherStudentsList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.academicLevel || st.grade || 'طالب'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-800 mb-1">
                    اعتماد الحصص:
                  </label>
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                    className="w-full h-9 px-2.5 rounded-lg border-2 border-slate-300 text-xs font-black text-slate-900 bg-white focus:outline-none focus:border-[#0d365a] cursor-pointer shadow-2xs"
                  >
                    <option value="approved">الحصص المعتمدة فقط (موصى به)</option>
                    <option value="all">جميع الحصص (معتمدة + قيد التدقيق)</option>
                    <option value="pending">قيد التدقيق فقط</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-center">
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Sparkles size={15} className="text-amber-500 shrink-0" />
                  <span>احتساب شامل لكافة السجلات والعمليات المالية منذ البداية.</span>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-800 mb-1">
                    تصفية الطالب:
                  </label>
                  <select
                    value={selectedStudentFilter}
                    onChange={(e) => setSelectedStudentFilter(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg border-2 border-slate-300 text-xs font-black text-slate-900 bg-white focus:outline-none focus:border-[#0d365a] cursor-pointer shadow-2xs"
                  >
                    <option value="all">جميع الطلاب ({teacherStudentsList.length})</option>
                    {teacherStudentsList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.academicLevel || st.grade || 'طالب'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black text-slate-800 mb-1">
                    اعتماد الحصص:
                  </label>
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                    className="w-full h-9 px-2.5 rounded-lg border-2 border-slate-300 text-xs font-black text-slate-900 bg-white focus:outline-none focus:border-[#0d365a] cursor-pointer shadow-2xs"
                  >
                    <option value="approved">الحصص المعتمدة فقط</option>
                    <option value="all">جميع الحصص</option>
                    <option value="pending">قيد التدقيق فقط</option>
                  </select>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">

          {/* 4 Main KPI Cards - High Contrast */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            
            {/* Opening Prior Balance */}
            <div className="bg-slate-100 border-2 border-slate-300 rounded-2xl p-4 text-center shadow-xs">
              <div className="text-xs font-black text-slate-800 mb-1 flex items-center justify-center gap-1">
                <span>الرصيد السابق الافتتاحي</span>
                <HelpCircle size={13} className="text-slate-500" />
              </div>
              <div className="text-2xl font-black font-mono text-slate-950 tracking-tight" dir="ltr">
                ₪{computedSummary.openingBalance.toFixed(2)}
              </div>
              <div className="text-[11px] font-bold text-slate-600 mt-1">
                المستحق قبل بداية هذه الفترة
              </div>
            </div>

            {/* Approved Period Earnings */}
            <div className="bg-blue-50/90 border-2 border-blue-300 rounded-2xl p-4 text-center shadow-xs">
              <div className="text-xs font-black text-blue-950 mb-1 flex items-center justify-center gap-1">
                <span>مستحقات الحصص المنفذة (+)</span>
              </div>
              <div className="text-2xl font-black font-mono text-blue-900 tracking-tight" dir="ltr">
                + ₪{computedSummary.periodEarnedApproved.toFixed(2)}
              </div>
              <div className="text-[11px] font-bold text-blue-800 mt-1">
                {computedSummary.approvedSessionsCount} حصة معتمدة ({computedSummary.approvedHours.toFixed(1)} س)
              </div>
            </div>

            {/* Period Payments Received */}
            <div className="bg-rose-50/90 border-2 border-rose-300 rounded-2xl p-4 text-center shadow-xs">
              <div className="text-xs font-black text-rose-950 mb-1 flex items-center justify-center gap-1">
                <span>المدفوعات والمستلمات (-)</span>
              </div>
              <div className="text-2xl font-black font-mono text-rose-900 tracking-tight" dir="ltr">
                - ₪{computedSummary.periodPaid.toFixed(2)}
              </div>
              <div className="text-[11px] font-bold text-rose-800 mt-1">
                {computedSummary.paymentsList.length} سندات صرف مسلمة
              </div>
            </div>

            {/* Closing Net Balance */}
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100 border-2 border-emerald-600 rounded-2xl p-4 text-center shadow-sm">
              <div className="text-xs font-black text-emerald-950 mb-1 flex items-center justify-center gap-1">
                <span>صافي الرصيد المستحق للمعلم (=)</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-950 tracking-tight" dir="ltr">
                ₪{computedSummary.closingBalance.toFixed(2)}
              </div>
              <div className="text-[11px] font-black text-emerald-800 mt-1">
                الرصيد المتبقي النهائي واجب السداد
              </div>
            </div>

          </div>

          {/* Secondary stats bar */}
          <div className="bg-slate-100 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-800 border-2 border-slate-300 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0d365a]" />
              <span className="font-bold text-slate-700">نطاق الكشف المعتمد:</span>
              <span className="font-black text-[#0d365a]">{computedSummary.periodLabelArabic}</span>
            </div>

            <div className="flex items-center gap-4 text-slate-600">
              <span>إجمالي الحصص: <strong className="text-slate-900">{computedSummary.totalSessions}</strong></span>
              <span>•</span>
              <span>إجمالي الساعات: <strong className="text-blue-700">{computedSummary.totalHours.toFixed(1)} س</strong></span>
              <span>•</span>
              <span>الطلاب المستفيدون: <strong className="text-slate-900">{computedSummary.studentSummaries.length}</strong></span>
              {computedSummary.periodEarnedPending > 0 && (
                <>
                  <span>•</span>
                  <span className="text-amber-700 font-black">
                    قيد التدقيق: {computedSummary.pendingSessionsCount} حصة (₪{computedSummary.periodEarnedPending.toFixed(2)})
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Interactive Preview Section with Subtabs */}
          <div className="bg-white rounded-2xl border-2 border-slate-300 overflow-hidden shadow-xs">
            
            {/* Subtab Switcher */}
            <div className="flex items-center border-b-2 border-slate-300 bg-slate-100 px-3 pt-2 gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setPreviewTab('sessions')}
                className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition-all cursor-pointer border-t-2 border-x-2 shrink-0 ${
                  previewTab === 'sessions'
                    ? 'bg-white text-[#0d365a] border-slate-300 -mb-px shadow-xs'
                    : 'text-slate-700 hover:text-slate-950 border-transparent bg-slate-200/70 hover:bg-slate-200'
                }`}
              >
                <span>سجل الحصص المنفذة ({computedSummary.sessionsList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab('payments')}
                className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition-all cursor-pointer border-t-2 border-x-2 shrink-0 ${
                  previewTab === 'payments'
                    ? 'bg-white text-rose-800 border-slate-300 -mb-px shadow-xs'
                    : 'text-slate-700 hover:text-slate-950 border-transparent bg-slate-200/70 hover:bg-slate-200'
                }`}
              >
                <span>سجل الدفعات والمسحوبات ({computedSummary.paymentsList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewTab('students')}
                className={`px-4 py-2.5 text-xs font-black rounded-t-xl transition-all cursor-pointer border-t-2 border-x-2 shrink-0 ${
                  previewTab === 'students'
                    ? 'bg-white text-blue-900 border-slate-300 -mb-px shadow-xs'
                    : 'text-slate-700 hover:text-slate-950 border-transparent bg-slate-200/70 hover:bg-slate-200'
                }`}
              >
                <span>تفاصيل العمليات لكل طالب ({computedSummary.studentSummaries.length})</span>
              </button>
            </div>

            {/* Tab 1: Detailed Sessions */}
            {previewTab === 'sessions' && (
              <div className="p-4 overflow-x-auto">
                {computedSummary.sessionsList.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <BookOpen size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-xs font-bold">لا توجد حصص مسجلة في هذا النطاق الزمني.</p>
                    <p className="text-[11px] mt-1 text-slate-400">يرجى تعديل خيارات التصفية أو اختيار شهر آخر.</p>
                  </div>
                ) : (
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600 bg-slate-50/70">
                        <th className="p-2.5 text-center w-10">#</th>
                        <th className="p-2.5">التاريخ والوقت</th>
                        <th className="p-2.5">الطالب / الدورة</th>
                        <th className="p-2.5">المادة والموضوع</th>
                        <th className="p-2.5 text-center">المدة</th>
                        <th className="p-2.5 text-center">السعر</th>
                        <th className="p-2.5 text-center">المستحق</th>
                        <th className="p-2.5 text-center">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {computedSummary.sessionsList.map((s, idx) => (
                        <tr key={s.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-bold text-slate-800 whitespace-nowrap">
                            <div>{formatCustomDate(s.date)}</div>
                            {s.startTime && <div className="text-[10px] text-slate-400 font-mono">{s.startTime}</div>}
                          </td>
                          <td className="p-2.5 font-black text-slate-900">{s.studentName}</td>
                          <td className="p-2.5">
                            <span className="font-bold text-slate-800">{s.subject}</span>
                            <span className="text-[11px] text-slate-500 block truncate max-w-xs">{s.topic}</span>
                          </td>
                          <td className="p-2.5 text-center font-bold text-slate-700 whitespace-nowrap">
                            {s.durationHours} س
                          </td>
                          <td className="p-2.5 text-center font-mono text-slate-600">
                            ₪{s.hourlyOrSessionRate}
                          </td>
                          <td className="p-2.5 text-center font-black font-mono text-blue-700 whitespace-nowrap">
                            ₪{s.payout.toFixed(2)}
                          </td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              s.approved
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {s.approved ? 'معتمد' : 'قيد التدقيق'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tab 2: Detailed Payments */}
            {previewTab === 'payments' && (
              <div className="p-4 overflow-x-auto">
                {computedSummary.paymentsList.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <Receipt size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-xs font-bold">لم تسجل أي سندات دفع أو سحوبات مسلمة للمعلم في هذه الفترة.</p>
                    <p className="text-[11px] mt-1 text-slate-400">ستظهر الدفعات فور تسجيلها من الإدارة المالية.</p>
                  </div>
                ) : (
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600 bg-slate-50/70">
                        <th className="p-2.5 text-center w-10">#</th>
                        <th className="p-2.5">تاريخ الدفعة</th>
                        <th className="p-2.5 text-center">المبلغ المسلم</th>
                        <th className="p-2.5">البيان وملاحظات السند</th>
                        <th className="p-2.5 text-center">المرجع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {computedSummary.paymentsList.map((p, idx) => (
                        <tr key={p.id || idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-2.5 font-black text-slate-800 whitespace-nowrap">
                            {formatCustomDate(p.date)}
                          </td>
                          <td className="p-2.5 text-center font-black font-mono text-rose-700 bg-rose-50/50 rounded-lg">
                            - ₪{p.amount.toFixed(2)}
                          </td>
                          <td className="p-2.5 font-bold text-slate-700">{p.note}</td>
                          <td className="p-2.5 text-center font-mono text-[11px] text-slate-500">
                            {p.reference || `#PAY-${p.id.slice(0, 6)}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tab 3: Detailed Operations per Student */}
            {previewTab === 'students' && (
              <div className="p-4 space-y-4">
                {computedSummary.studentSummaries.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <User size={36} className="mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="text-xs font-bold">لا يوجد طلاب منفذ لهم حصص في هذه الفترة.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary overview table */}
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-right text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-600 bg-slate-50/70">
                            <th className="p-2.5 text-center w-10">#</th>
                            <th className="p-2.5">اسم الطالب</th>
                            <th className="p-2.5">المرحلة الدراسية</th>
                            <th className="p-2.5">المواد المنفذة</th>
                            <th className="p-2.5 text-center">عدد الحصص</th>
                            <th className="p-2.5 text-center">مجموع الساعات</th>
                            <th className="p-2.5 text-center">إجمالي المستحق</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {computedSummary.studentSummaries.map((st, idx) => (
                            <tr key={st.studentId || idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>
                              <td className="p-2.5 font-black text-slate-900">{st.studentName}</td>
                              <td className="p-2.5 text-slate-600">{st.gradeOrLevel}</td>
                              <td className="p-2.5 text-slate-700">{st.subjects.join('، ')}</td>
                              <td className="p-2.5 text-center font-bold">{st.sessionsCount}</td>
                              <td className="p-2.5 text-center font-bold text-blue-700">{st.totalHours} س</td>
                              <td className="p-2.5 text-center font-black font-mono text-emerald-700">
                                ₪{st.totalEarnings.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Detailed Operations Per Student Cards */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between text-xs font-black text-slate-800 pb-1 border-b border-slate-200">
                        <span>سجل حركات وعمليات الحصص مفصلة لكل طالب:</span>
                        <span className="text-[11px] text-slate-500 font-bold">({computedSummary.studentSummaries.length} طلاب مسجلين)</span>
                      </div>

                      {computedSummary.studentSummaries.map((st, sIdx) => (
                        <div key={st.studentId || sIdx} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/40">
                          <div className="bg-slate-100/90 p-3 px-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-[#0d365a] text-white flex items-center justify-center text-[10px] font-black">
                                {sIdx + 1}
                              </span>
                              <span className="font-black text-slate-900 text-xs">أ. الطالب: {st.studentName}</span>
                              <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 font-bold">
                                {st.gradeOrLevel}
                              </span>
                              {st.phone && (
                                <span className="text-[10px] text-slate-500 font-mono" dir="ltr">
                                  📞 {st.phone}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs font-bold">
                              <span className="text-blue-700 font-mono">{st.totalHours} س ({st.sessionsCount} حصص)</span>
                              <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-lg font-black font-mono">
                                ₪{st.totalEarnings.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="p-2 overflow-x-auto bg-white">
                            <table className="w-full text-right text-xs">
                              <thead>
                                <tr className="text-slate-500 text-[10.5px] border-b border-slate-100">
                                  <th className="p-1.5 text-center w-8">#</th>
                                  <th className="p-1.5">التاريخ والوقت</th>
                                  <th className="p-1.5">المادة والموضوع</th>
                                  <th className="p-1.5 text-center">المدة</th>
                                  <th className="p-1.5 text-center">السعر</th>
                                  <th className="p-1.5 text-center">المستحق</th>
                                  <th className="p-1.5 text-center">الحالة</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {st.operations.map((op, oIdx) => (
                                  <tr key={op.id || oIdx} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="p-1.5 text-center font-bold text-slate-400 text-[10px]">{oIdx + 1}</td>
                                    <td className="p-1.5 font-bold text-slate-800 whitespace-nowrap">
                                      <div>{formatCustomDate(op.date)}</div>
                                      {op.startTime && <div className="text-[9px] text-slate-400 font-mono">{op.startTime}</div>}
                                    </td>
                                    <td className="p-1.5">
                                      <span className="font-bold text-slate-800">{op.subject}</span>
                                      <span className="text-[10.5px] text-slate-500 block truncate max-w-xs">{op.topic}</span>
                                    </td>
                                    <td className="p-1.5 text-center font-bold text-slate-700 whitespace-nowrap">
                                      {op.durationHours} س
                                    </td>
                                    <td className="p-1.5 text-center font-mono text-slate-600">
                                      ₪{op.hourlyOrSessionRate}
                                    </td>
                                    <td className="p-1.5 text-center font-black font-mono text-emerald-700 whitespace-nowrap">
                                      ₪{op.payout.toFixed(2)}
                                    </td>
                                    <td className="p-1.5 text-center whitespace-nowrap">
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                        op.approved
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {op.approved ? 'معتمد' : 'قيد التدقيق'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

        {/* Modal Action Footer - High Contrast & Always Visible */}
        <div className="p-3 sm:p-4 bg-white border-t-2 border-slate-300 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 shadow-lg">
          
          <div className="flex items-center gap-2 text-xs text-slate-800 font-black">
            <CheckCheck size={18} className="text-emerald-600 shrink-0" />
            <span>كشف الرصيد موثق ومطابق للسجلات المحاسبية والدروس المسجلة.</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            
            {/* Share WhatsApp */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3 py-2 rounded-xl border border-emerald-500 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              title="مشاركة ملخص الكشف المالي عبر تطبيق واتساب"
            >
              <Share2 size={15} />
              <span>مشاركة واتساب</span>
            </button>

            {/* Export CSV / Excel */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              title="تصدير كشف الرصيد والحصص لملف Excel / CSV"
            >
              <FileSpreadsheet size={15} className="text-emerald-400" />
              <span>تصدير Excel</span>
            </button>

            {/* Print Direct */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl border border-[#0d365a] bg-[#0d365a] hover:bg-[#1a4a75] text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              title="طباعة كشف الرصيد مباشرة"
            >
              <Printer size={15} className="text-amber-300" />
              <span>طباعة</span>
            </button>

            {/* Download PDF Primary */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-black flex items-center gap-2 transition-all shadow-md shadow-emerald-700/25 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-60 ring-2 ring-emerald-500/40"
              title="تصدير كشف حساب الرصيد كملف PDF منظم مع تفاصيل العمليات لكل طالب"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 size={16} className="animate-spin text-amber-300" />
                  <span>جاري إنشاء PDF...</span>
                </>
              ) : (
                <>
                  <FileDown size={16} className="text-amber-300" />
                  <span className="flex items-center gap-1.5">
                    <span>تصدير كشف الرصيد (PDF)</span>
                    <span className="text-[10px] bg-black/20 text-white px-2 py-0.5 rounded-full font-mono font-bold">
                      {filterMode === 'all' ? 'كامل المدة' : `${startDate} إلى ${endDate}`}
                    </span>
                    <span>📥</span>
                  </span>
                </>
              )}
            </button>

          </div>

        </div>

      </div>
    </div>
  );
};
