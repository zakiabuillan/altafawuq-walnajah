import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Download, Printer, X, Calendar, DollarSign, 
  TrendingUp, TrendingDown, Building2, Users, CheckCircle2, 
  Sparkles, Layers, ArrowUpRight, ArrowDownRight, ShieldCheck,
  AlertCircle, RefreshCw
} from 'lucide-react';
import { Expense, Session, Student, Teacher, Payment, StudentCredit, GroupCourse } from '../types';
import { 
  computeMonthlyFinancialReport, 
  downloadMonthlyFinancialReportPDF, 
  printMonthlyFinancialReport, 
  ARABIC_MONTH_NAMES,
  ComputedMonthlyFinancialSummary
} from '../lib/monthlyFinancialPdfReport';

interface MonthlyFinancialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
  expenses: Expense[];
  teachers: Teacher[];
  students: Student[];
  payments: Payment[];
  credits: StudentCredit[];
  groupCourses?: GroupCourse[];
  globalSettings?: any;
  defaultYear?: number;
  defaultMonth?: number;
}

export const MonthlyFinancialReportModal: React.FC<MonthlyFinancialReportModalProps> = ({
  isOpen,
  onClose,
  sessions,
  expenses,
  teachers,
  students,
  payments,
  credits,
  groupCourses = [],
  globalSettings = {},
  defaultYear = new Date().getFullYear(),
  defaultMonth = new Date().getMonth() + 1
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonth);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<'overview' | 'expenses' | 'teachers'>('overview');

  const managerName = useMemo(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('academy_user_name') || 'أ. زكي أبو علان (المدير العام)';
    }
    return 'أ. زكي أبو علان (المدير العام)';
  }, []);

  // Compute live summary for the selected period
  const reportSummary: ComputedMonthlyFinancialSummary = useMemo(() => {
    return computeMonthlyFinancialReport({
      year: selectedYear,
      month: selectedMonth,
      sessions,
      expenses,
      teachers,
      students,
      payments,
      credits,
      groupCourses,
      globalSettings
    });
  }, [selectedYear, selectedMonth, sessions, expenses, teachers, students, payments, credits, groupCourses, globalSettings]);

  const isProfitPositive = reportSummary.netRealizedProfit >= 0;

  // Handle PDF Export
  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      await downloadMonthlyFinancialReportPDF(reportSummary, {
        managerName,
        academyName: globalSettings?.academyName || 'أكاديمية التفوق للتعليم والتدريب'
      });
    } catch (err) {
      console.error('Error exporting PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handle Print
  const handlePrint = () => {
    printMonthlyFinancialReport(reportSummary, {
      managerName,
      academyName: globalSettings?.academyName || 'أكاديمية التفوق للتعليم والتدريب'
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-auto flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 border-b border-blue-900/40">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shadow-inner">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black tracking-tight">التقرير المالي الشهري الشامل</h2>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    معتمد PDF
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  كشف تدقيقي متكامل بالإيرادات، المصاريف التشغيلية، وصافي الأرباح المحققة
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white transition-colors"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Month & Year Selector Bar */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center flex-wrap gap-2 text-sm">
              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                الشهر المستهدف:
              </span>

              {/* Month Selector */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-1.5 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {ARABIC_MONTH_NAMES.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Year Selector */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl px-3 py-1.5 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {[2024, 2025, 2026, 2027, 2028].map(y => (
                  <option key={y} value={y}>
                    سنة {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Actions (PDF / Print) */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                طباعة / معاينة
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-md hover:shadow-blue-500/25 disabled:opacity-50"
              >
                {isExportingPdf ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {isExportingPdf ? 'جاري التوليد...' : 'تحميل التقرير (PDF)'}
              </button>
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="px-4 sm:px-6 pt-3 pb-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveViewTab('overview')}
              className={`pb-2.5 px-3 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeViewTab === 'overview'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>نظرة عامة شاملة</span>
            </button>

            <button
              onClick={() => setActiveViewTab('teachers')}
              className={`pb-2.5 px-3 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeViewTab === 'teachers'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>كشف ساعات وأجور المعلمين ({reportSummary.teacherBreakdown.length})</span>
            </button>

            <button
              onClick={() => setActiveViewTab('expenses')}
              className={`pb-2.5 px-3 text-xs font-black border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeViewTab === 'expenses'
                  ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>المصاريف التشغيلية ({reportSummary.expensesList.length})</span>
            </button>
          </div>

          {/* Modal Body with Live Report Overview */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
            
            {/* Live Financial Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Teaching Revenue */}
              <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl p-3.5 shadow-sm">
                <div className="flex items-center justify-between text-blue-700 dark:text-blue-300 text-xs font-bold mb-1">
                  <span>إجمالي إيرادات التعليم</span>
                  <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  ₪{reportSummary.totalTeachingRevenue.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  {reportSummary.totalHoursTaught.toFixed(1)} ساعة تدريسية
                </div>
              </div>

              {/* Teacher Payouts */}
              <div className="bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 rounded-xl p-3.5 shadow-sm">
                <div className="flex items-center justify-between text-purple-700 dark:text-purple-300 text-xs font-bold mb-1">
                  <span>أجور ومستحقات المعلمين</span>
                  <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  ₪{reportSummary.totalTeacherPayouts.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  {reportSummary.activeTeachersCount} معلم نشط بالشهر
                </div>
              </div>

              {/* Operating Expenses */}
              <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3.5 shadow-sm">
                <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 text-xs font-bold mb-1">
                  <span>المصاريف التشغيلية للمركز</span>
                  <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  ₪{reportSummary.totalOperatingExpenses.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                  {reportSummary.expensesList.length} سند صرف وفاتورة
                </div>
              </div>

              {/* Realized Net Profit */}
              <div className={`border rounded-xl p-3.5 shadow-sm ${
                isProfitPositive 
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' 
                  : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800'
              }`}>
                <div className={`flex items-center justify-between text-xs font-bold mb-1 ${
                  isProfitPositive ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                }`}>
                  <span>صافي الأرباح المحققة</span>
                  {isProfitPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                </div>
                <div className={`text-xl font-black ${
                  isProfitPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                }`}>
                  {isProfitPositive ? '+' : '-'} ₪{Math.abs(reportSummary.netRealizedProfit).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-bold">
                  هامش الربح: {reportSummary.netProfitMarginPercentage.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Income Statement Table Box */}
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200 dark:border-slate-700/60">
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                <span>📊 قائمة الدخل والأرباح التشغيلية</span>
                <span className="text-xs font-normal text-slate-500">({reportSummary.monthNameArabic} {reportSummary.year})</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">(+) إيرادات التدريس والدروس المكتسبة:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    ₪{reportSummary.totalTeachingRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">(-) تكلفة التدريس المباشرة (أجور ومستحقات المدرسين):</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    ( ₪{reportSummary.totalTeacherPayouts.toLocaleString('en-US', { minimumFractionDigits: 2 })} )
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 bg-blue-50/50 dark:bg-blue-900/20 px-2 rounded-lg font-bold text-blue-900 dark:text-blue-300">
                  <span>(=) مجمل الربح التشغيلي التدريسي:</span>
                  <span className="font-mono">
                    ₪{reportSummary.grossTeachingProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({reportSummary.grossMarginPercentage.toFixed(1)}%)
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5 border-b border-slate-200 dark:border-slate-700">
                  <span className="text-slate-600 dark:text-slate-400 font-medium">(-) إجمالي المصاريف التشغيلية للمركز:</span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                    ( ₪{reportSummary.totalOperatingExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })} )
                  </span>
                </div>

                <div className={`flex justify-between items-center py-2.5 px-3 rounded-lg font-black text-sm ${
                  isProfitPositive 
                    ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800' 
                    : 'bg-rose-100 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800'
                }`}>
                  <span>(=) صافي الأرباح التشغيلية المحققة للمركز:</span>
                  <span className="font-mono text-base">
                    {isProfitPositive ? '+' : '-'} ₪{Math.abs(reportSummary.netRealizedProfit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Operating Expenses Breakdown preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-500" />
                  <span>المصاريف التشغيلية المقيدة بالشهر ({reportSummary.expensesList.length} سند)</span>
                </h3>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                  المجموع: ₪{reportSummary.totalOperatingExpenses.toLocaleString('en-US', { minimumFractionDigits: 1 })}
                </span>
              </div>

              {reportSummary.expensesByCategory.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {reportSummary.expensesByCategory.map(cat => (
                    <div
                      key={cat.category}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold shadow-xs"
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }}></span>
                      <span className="text-slate-700 dark:text-slate-300">{cat.categoryName}:</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">₪{cat.amount.toLocaleString('en-US')}</span>
                      <span className="text-[10px] text-slate-400">({cat.percentage.toFixed(0)}%)</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Scrollable table */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2 w-20">التاريخ</th>
                      <th className="p-2">البيان</th>
                      <th className="p-2 w-28">الفئة</th>
                      <th className="p-2 w-24 text-left">المبلغ (₪)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {reportSummary.expensesList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-400">
                          لا توجد مصاريف تشغيلية مقيدة لهذا الشهر.
                        </td>
                      </tr>
                    ) : (
                      reportSummary.expensesList.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="p-2 font-mono text-[11px] text-slate-500">{e.date}</td>
                          <td className="p-2 font-medium text-slate-800 dark:text-slate-200">
                            {e.title}
                            {e.paidTo && e.paidTo !== '-' && <span className="text-[10px] text-slate-400 mr-2">({e.paidTo})</span>}
                          </td>
                          <td className="p-2 text-slate-600 dark:text-slate-400 font-medium">{e.categoryName}</td>
                          <td className="p-2 font-mono font-bold text-rose-600 dark:text-rose-400 text-left">
                            ₪{e.amount.toLocaleString('en-US', { minimumFractionDigits: 1 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {reportSummary.expensesList.length > 0 && (
                    <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                      <tr>
                        <td colSpan={3} className="p-2.5 font-black text-slate-900 dark:text-white">
                          إجمالي المصاريف التشغيلية المقيدة بالشهر:
                        </td>
                        <td className="p-2.5 text-left font-mono font-black text-rose-600 dark:text-rose-400">
                          ₪{reportSummary.totalOperatingExpenses.toLocaleString('en-US', { minimumFractionDigits: 1 })}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            {/* Teachers Hours and Earnings Breakdown Table */}
            {(activeViewTab === 'overview' || activeViewTab === 'teachers') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span>كشف ساعات وأجور المعلمين المسجلة ({reportSummary.teacherBreakdown.length} معلم)</span>
                  </h3>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
                    إجمالي الساعات: {reportSummary.totalHoursTaught.toFixed(1)} س
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0 font-bold border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="p-2 w-8 text-center">#</th>
                        <th className="p-2">اسم المعلم</th>
                        <th className="p-2 w-24 text-center">ساعات الحصص</th>
                        <th className="p-2 w-20 text-center">عدد الحصص</th>
                        <th className="p-2 w-24 text-left">الإيرادات (₪)</th>
                        <th className="p-2 w-24 text-left">المستحقات (₪)</th>
                        <th className="p-2 w-24 text-left">صافي الربح (₪)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {reportSummary.teacherBreakdown.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-4 text-center text-slate-400">
                            لا توجد حصص مسجلة للمعلمين في هذا الشهر.
                          </td>
                        </tr>
                      ) : (
                        reportSummary.teacherBreakdown.map((t, idx) => (
                          <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-2 text-center text-slate-400">{idx + 1}</td>
                            <td className="p-2 font-bold text-slate-800 dark:text-slate-200">{t.name}</td>
                            <td className="p-2 text-center font-mono font-bold text-blue-700 dark:text-blue-400">{t.hours.toFixed(1)} س</td>
                            <td className="p-2 text-center font-mono">{t.sessionsCount}</td>
                            <td className="p-2 text-left font-mono font-bold text-slate-700 dark:text-slate-300">₪{t.revenue.toLocaleString('en-US', { minimumFractionDigits: 1 })}</td>
                            <td className="p-2 text-left font-mono font-bold text-rose-600 dark:text-rose-400">₪{t.payout.toLocaleString('en-US', { minimumFractionDigits: 1 })}</td>
                            <td className="p-2 text-left font-mono font-bold text-emerald-600 dark:text-emerald-400">₪{t.netProfit.toLocaleString('en-US', { minimumFractionDigits: 1 })}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {reportSummary.teacherBreakdown.length > 0 && (
                      <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                        <tr>
                          <td colSpan={2} className="p-2.5 font-black text-slate-900 dark:text-white">
                            مجموع الساعات الكلي لجميع الحصص المسجلة:
                          </td>
                          <td className="p-2.5 text-center font-mono font-black text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30">
                            {reportSummary.totalHoursTaught.toFixed(1)} س
                          </td>
                          <td className="p-2.5 text-center font-mono font-black text-slate-800 dark:text-slate-200">
                            {reportSummary.totalSessionsCount}
                          </td>
                          <td className="p-2.5 text-left font-mono font-black text-slate-900 dark:text-white">
                            ₪{reportSummary.totalTeachingRevenue.toLocaleString('en-US', { minimumFractionDigits: 1 })}
                          </td>
                          <td className="p-2.5 text-left font-mono font-black text-rose-600 dark:text-rose-400">
                            ₪{reportSummary.totalTeacherPayouts.toLocaleString('en-US', { minimumFractionDigits: 1 })}
                          </td>
                          <td className="p-2.5 text-left font-mono font-black text-emerald-600 dark:text-emerald-400">
                            ₪{reportSummary.grossTeachingProfit.toLocaleString('en-US', { minimumFractionDigits: 1 })}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

          </div>

          {/* Modal Footer */}
          <div className="bg-slate-100 dark:bg-slate-800/80 p-4 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>يتم التوليد بجودة عالية مع كافة التفاصيل والاعتمادات الرسمية.</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
              >
                إغلاق
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all shadow-md hover:shadow-blue-500/25 disabled:opacity-50"
              >
                {isExportingPdf ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {isExportingPdf ? 'جاري تجهيز وتحميل الـ PDF...' : 'تحميل التقرير المالي الشهري (PDF)'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
