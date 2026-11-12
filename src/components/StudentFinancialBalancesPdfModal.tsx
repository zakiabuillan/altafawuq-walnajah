import React, { useState, useMemo } from 'react';
import { 
  FileDown, 
  Printer, 
  X, 
  TrendingDown, 
  TrendingUp, 
  Scale, 
  Filter, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Coins,
  ShieldCheck,
  Search,
  ArrowUpDown
} from 'lucide-react';
import { Student, Session, Teacher, StudentCredit } from '../types';
import { 
  computeStudentFinancialBalancesSummary, 
  downloadStudentFinancialBalancesPDF, 
  printStudentFinancialBalancesReport,
  ComputedStudentFinancialBalancesSummary 
} from '../lib/studentFinancialBalancesPdfReport';

export interface StudentFinancialBalancesPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  sessions?: Session[];
  credits?: StudentCredit[];
  teachers?: Teacher[];
  globalSettings?: any;
  triggerToast?: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
}

export const StudentFinancialBalancesPdfModal: React.FC<StudentFinancialBalancesPdfModalProps> = ({
  isOpen,
  onClose,
  students = [],
  sessions = [],
  credits = [],
  teachers = [],
  globalSettings,
  triggerToast
}) => {
  const [filterType, setFilterType] = useState<'all' | 'debtors' | 'creditors' | 'balanced'>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'debt_desc' | 'balance_desc' | 'name_asc' | 'spent_desc'>('debt_desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Compute full summary with current parameters
  const reportSummary: ComputedStudentFinancialBalancesSummary = useMemo(() => {
    return computeStudentFinancialBalancesSummary({
      students,
      sessions,
      credits,
      teachers,
      globalSettings,
      filterType,
      stageFilter,
      sortBy
    });
  }, [students, sessions, credits, teachers, globalSettings, filterType, stageFilter, sortBy]);

  // Client-side quick search filter for preview
  const displayRows = useMemo(() => {
    if (!searchQuery.trim()) return reportSummary.rows;
    const query = searchQuery.toLowerCase().trim();
    return reportSummary.rows.filter(r => 
      r.name.toLowerCase().includes(query) || 
      r.grade.toLowerCase().includes(query) || 
      r.phone.includes(query)
    );
  }, [reportSummary.rows, searchQuery]);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      if (triggerToast) {
        triggerToast('جاري تحضير التقرير المالي', 'يتم تجهيز ملف PDF وتنسيق أرصدة ومديونيات الطلاب...', 'info');
      }

      await downloadStudentFinancialBalancesPDF(reportSummary);

      if (triggerToast) {
        triggerToast('تم تصدير التقرير بنجاح', 'تم تحميل ملف PDF المالي الموحد لجميع الطلاب.', 'success');
      }
    } catch (err) {
      console.error('Error generating PDF report:', err);
      if (triggerToast) {
        triggerToast('حدث خطأ أثناء التصدير', 'تم فتح نافذة الطباعة كبديل سريع وآمن.', 'error');
      }
      printStudentFinancialBalancesReport(reportSummary);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    if (triggerToast) {
      triggerToast('بدء الطباعة', 'جاري تجهيز معاينة الطباعة لتقرير الأرصدة والمديونيات...', 'info');
    }
    printStudentFinancialBalancesReport(reportSummary);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh] my-auto"
        dir="rtl"
      >
        {/* 🌟 Header */}
        <div className="bg-gradient-to-r from-[#0d365a] via-[#1a4a75] to-slate-900 px-6 py-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
              <Scale size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                  تصدير التقرير المالي لأرصدة ومديونيات الطلاب (PDF)
                </h2>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full shadow-xs">
                  إدارة مالية عليا
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 font-bold">
                تحويل وتوثيق بيانات الأرصدة لجميع الطلاب إلى تقرير محاسبي رسمي يحتوي على إجمالي المديونيات والمستحقات
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        {/* 📊 Executive Financial Summary Strip */}
        <div className="p-4 sm:p-6 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* Total Debts */}
            <div className="bg-rose-50/80 border border-rose-200/90 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                  <TrendingDown size={15} className="text-rose-600" />
                  <span>إجمالي المديونيات (-)</span>
                </span>
                <span className="text-[10px] font-black bg-rose-200/70 text-rose-800 px-2 py-0.5 rounded-md">
                  {reportSummary.debtorsCount} مدين
                </span>
              </div>
              <div className="mt-2 font-mono font-black text-xl sm:text-2xl text-rose-600 tracking-tight">
                -₪{reportSummary.totalDebtAmount.toLocaleString('en-US')}
              </div>
              <div className="text-[10.5px] text-rose-700/90 font-bold mt-1">
                مستحقات واجبة التحصيل للمركز ({reportSummary.debtorsPercentage}%)
              </div>
            </div>

            {/* Total Credits */}
            <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                  <TrendingUp size={15} className="text-emerald-600" />
                  <span>إجمالي المستحقات (+)</span>
                </span>
                <span className="text-[10px] font-black bg-emerald-200/70 text-emerald-800 px-2 py-0.5 rounded-md">
                  {reportSummary.creditorsCount} دائن
                </span>
              </div>
              <div className="mt-2 font-mono font-black text-xl sm:text-2xl text-emerald-600 tracking-tight">
                +₪{reportSummary.totalCreditAmount.toLocaleString('en-US')}
              </div>
              <div className="text-[10.5px] text-emerald-700/90 font-bold mt-1">
                أرصدة فائضة لصالح الطلاب ({reportSummary.creditorsPercentage}%)
              </div>
            </div>

            {/* Net Balance */}
            <div className={`border rounded-2xl p-3.5 flex flex-col justify-between shadow-xs ${
              reportSummary.netBalance >= 0 
                ? 'bg-teal-50/80 border-teal-200/90' 
                : 'bg-amber-50/80 border-amber-200/90'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <Scale size={15} className={reportSummary.netBalance >= 0 ? 'text-teal-600' : 'text-amber-600'} />
                  <span>صافي المركز المالي</span>
                </span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                  reportSummary.netBalance >= 0 ? 'bg-teal-200/70 text-teal-900' : 'bg-amber-200/70 text-amber-900'
                }`}>
                  {reportSummary.netBalance >= 0 ? 'فائض سيولة' : 'عجز مستحق'}
                </span>
              </div>
              <div className={`mt-2 font-mono font-black text-xl sm:text-2xl tracking-tight ${
                reportSummary.netBalance >= 0 ? 'text-teal-700' : 'text-amber-700'
              }`}>
                {reportSummary.netBalance >= 0 ? '+' : ''}₪{reportSummary.netBalance.toLocaleString('en-US')}
              </div>
              <div className="text-[10.5px] text-slate-600 font-bold mt-1">
                فارق الأرصدة مطروحاً منها الذمم
              </div>
            </div>

            {/* Student Accounts Breakdown */}
            <div className="bg-slate-100/90 border border-slate-200/90 rounded-2xl p-3.5 flex flex-col justify-between shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Users size={15} className="text-indigo-600" />
                  <span>إجمالي الحسابات</span>
                </span>
                <span className="text-[10px] font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
                  {reportSummary.totalStudentsOriginal} طالب
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-700 pt-1">
                <span className="text-emerald-700">دائن: {reportSummary.creditorsCount}</span>
                <span className="text-rose-700">مدين: {reportSummary.debtorsCount}</span>
                <span className="text-slate-500">متزن: {reportSummary.balancedCount}</span>
              </div>
              <div className="text-[10.5px] text-slate-500 font-bold mt-2">
                المعروض حالياً بالتقرير: {reportSummary.totalStudentsFiltered} طالب
              </div>
            </div>

          </div>
        </div>

        {/* 🎛️ Filter Controls Bar */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="text-slate-500 text-xs flex items-center gap-1 font-black">
              <Filter size={14} />
              <span>تصفية الحسابات:</span>
            </span>

            {/* Status Filter */}
            <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-[#0d365a] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                جميع الطلاب ({students.length})
              </button>

              <button
                type="button"
                onClick={() => setFilterType('debtors')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                  filterType === 'debtors'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <span>المدينون فقط</span>
                <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[10px]">
                  {reportSummary.debtorsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterType('creditors')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                  filterType === 'creditors'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <span>الدائنون فقط</span>
                <span className="bg-white/20 px-1.5 py-0.2 rounded-full text-[10px]">
                  {reportSummary.creditorsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterType('balanced')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  filterType === 'balanced'
                    ? 'bg-slate-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                المتزنون (0 ₪)
              </button>
            </div>

            {/* Stage Filter */}
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="bg-slate-100 border border-slate-200 text-slate-800 text-xs font-black rounded-xl px-3 py-2 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#0d365a]/30"
            >
              <option value="all">جميع المراحل الدراسية</option>
              <option value="secondary">المرحلة الثانوية (10-12)</option>
              <option value="middle">المرحلة الإعدادية (7-9)</option>
              <option value="primary">المرحلة الأساسية (1-6)</option>
            </select>

            {/* Sort Filter */}
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl">
              <ArrowUpDown size={13} className="text-slate-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-800 text-xs font-black cursor-pointer focus:outline-hidden"
              >
                <option value="debt_desc">الأعلى مديونية أولاً (أكبر دين)</option>
                <option value="balance_desc">الأعلى رصيداً موجباً أولاً</option>
                <option value="spent_desc">الأعلى استهلاكاً للحصص</option>
                <option value="name_asc">أبجدياً حسب اسم الطالب</option>
              </select>
            </div>
          </div>

          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث باسم الطالب أو الصف..."
              className="w-full pr-8 pl-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#0d365a]/20"
            />
          </div>
        </div>

        {/* 📑 Live Table Preview */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex items-center justify-between text-xs font-black text-slate-700 mb-1">
            <span>معاينة جدول كشف الأرصدة المصدر ({displayRows.length} طالب):</span>
            <span className="text-slate-400 font-normal">
              سيتم إدراج الجداول والإحصائيات والأختام الرسمية في ملف PDF النهائي
            </span>
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <table className="w-full text-right text-xs border-collapse">
              <thead>
                <tr className="bg-[#0d365a] text-white font-black text-[11px]">
                  <th className="py-3 px-3 text-center w-12">#</th>
                  <th className="py-3 px-4">اسم الطالب</th>
                  <th className="py-3 px-3 text-center">الصف / المرحلة</th>
                  <th className="py-3 px-3 text-center">رقم الهاتف</th>
                  <th className="py-3 px-3 text-center">إجمالي الشحن</th>
                  <th className="py-3 px-3 text-center">إجمالي المستهلك</th>
                  <th className="py-3 px-4 text-center">الرصيد الحالي</th>
                  <th className="py-3 px-3 text-center">حالة الحساب</th>
                  <th className="py-3 px-3 text-center">الحصص</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-bold">
                {displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 font-bold">
                      لا توجد حسابات مطابقة لمعايير البحث والتصفية المحددة.
                    </td>
                  </tr>
                ) : (
                  displayRows.map((row, idx) => (
                    <tr 
                      key={row.studentId} 
                      className={`hover:bg-slate-50/80 transition-colors ${row.balance < 0 ? 'bg-rose-50/30' : ''}`}
                    >
                      <td className="py-2.5 px-3 text-center text-slate-400 text-xs font-mono">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-black text-slate-900">
                        <div>{row.name}</div>
                        {row.notes && <div className="text-[10px] text-slate-500 font-normal">📝 {row.notes}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-bold">
                          {row.grade}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600" dir="ltr">
                        {row.phone}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-700">
                        ₪{row.totalToppedUp.toLocaleString('en-US')}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                        ₪{row.totalSpent.toLocaleString('en-US')}
                      </td>
                      <td className="py-2.5 px-4 text-center font-mono font-black">
                        {row.balance < 0 ? (
                          <span className="px-2.5 py-1 bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs">
                            -₪{Math.abs(row.balance).toLocaleString('en-US')}
                          </span>
                        ) : row.balance > 0 ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs">
                            +₪{row.balance.toLocaleString('en-US')}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs">
                            0 ₪
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center text-[11px]">
                        {row.balance < 0 ? (
                          <span className="text-rose-600 font-black">مدين (مستحق)</span>
                        ) : row.balance > 0 ? (
                          <span className="text-emerald-600 font-black">دائن (رصيد)</span>
                        ) : (
                          <span className="text-slate-500">متزن</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center text-[11px] text-slate-600 font-mono">
                        {row.sessionsCount} ({row.totalHours} س)
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {displayRows.length > 0 && (
                <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-black text-xs text-slate-900">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-right">
                      مجموع الساعات الكلي لجميع الحصص المسجلة ({displayRows.length} طالب):
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-800">
                      ₪{displayRows.reduce((sum, r) => sum + r.totalToppedUp, 0).toLocaleString('en-US')}
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-800">
                      ₪{displayRows.reduce((sum, r) => sum + r.totalSpent, 0).toLocaleString('en-US')}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-indigo-700">
                      ₪{displayRows.reduce((sum, r) => sum + r.balance, 0).toLocaleString('en-US')}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600">
                      الصافي الكلي
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-indigo-800 bg-indigo-50/70">
                      {displayRows.reduce((sum, r) => sum + (r.totalHours || 0), 0).toFixed(1)} س ({displayRows.reduce((sum, r) => sum + (r.sessionsCount || 0), 0)} حصة)
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* 🏁 Footer Actions */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-bold text-slate-600 flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#0d365a]" />
            <span>
              يتضمن التقرير ترويسة أكاديمية رسمية وتوقيعات الاعتماد لـ: أ. زكي أبو علان (المدير العام).
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all cursor-pointer flex-1 sm:flex-initial"
            >
              إلغاء
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={isGeneratingPdf || reportSummary.rows.length === 0}
              className="px-4 py-2.5 rounded-xl border border-[#0d365a]/30 bg-white hover:bg-slate-50 text-[#0d365a] font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs flex-1 sm:flex-initial disabled:opacity-50"
            >
              <Printer size={15} />
              <span>طباعة مباشرة</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || reportSummary.rows.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0d365a] via-[#1a4a75] to-slate-900 hover:from-[#09253e] hover:to-[#133758] text-white font-black text-xs transition-all shadow-md shadow-[#0d365a]/25 flex items-center justify-center gap-2 cursor-pointer flex-1 sm:flex-initial disabled:opacity-50 active:scale-95"
            >
              <FileDown size={16} className="text-amber-300" />
              <span>{isGeneratingPdf ? 'جاري تصدير PDF...' : 'تصدير وتحميل تقرير مالي (PDF)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentFinancialBalancesPdfModal;
