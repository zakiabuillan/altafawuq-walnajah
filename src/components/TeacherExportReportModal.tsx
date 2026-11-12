import React, { useState, useMemo } from 'react';
import { 
  FileDown, 
  Printer, 
  X, 
  Calendar, 
  User, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Loader2, 
  Filter, 
  Sparkles,
  FileText,
  AlertCircle,
  CalendarRange,
  ArrowLeftRight
} from 'lucide-react';
import { Session, Student, Teacher, GroupCourse } from '../types';
import { 
  computeTeacherMonthlySummary, 
  downloadTeacherMonthlySessionsPDF, 
  printTeacherMonthlySessionsReport,
  ARABIC_MONTHS 
} from '../lib/teacherMonthlySessionsPdfReport';

interface TeacherExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  loggedInTeacher: Teacher;
  sessions: Session[];
  students: Student[];
  groupCourses?: GroupCourse[];
  triggerToast?: (msg: string) => void;
  onSwitchToBalanceStatement?: () => void;
}

export const TeacherExportReportModal: React.FC<TeacherExportReportModalProps> = ({
  isOpen,
  onClose,
  loggedInTeacher,
  sessions,
  students,
  groupCourses = [],
  triggerToast,
  onSwitchToBalanceStatement
}) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const todayStr = currentDate.toISOString().split('T')[0];
  const firstDayOfMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;

  const [filterMode, setFilterMode] = useState<'month' | 'range'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [startDate, setStartDate] = useState<string>(firstDayOfMonthStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Quick range presets
  const applyPreset = (preset: 'today' | 'this_week' | 'this_month' | 'last_month' | 'last_30_days' | 'ytd') => {
    const now = new Date();
    const nowStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      setFilterMode('range');
      setStartDate(nowStr);
      setEndDate(nowStr);
    } else if (preset === 'this_week') {
      setFilterMode('range');
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toISOString().split('T')[0]);
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
      let m = now.getMonth();
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
    } else if (preset === 'ytd') {
      setFilterMode('range');
      setStartDate(`${now.getFullYear()}-01-01`);
      setEndDate(nowStr);
    }
  };

  // Extract all distinct months present in the teacher's sessions for quick selection
  const availableMonths = useMemo(() => {
    const teacherSessions = sessions.filter(s => s.teacherId === loggedInTeacher.id && s.date);
    const set = new Set<string>();
    
    // Always include current month
    const currentPrefix = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
    set.add(currentPrefix);

    teacherSessions.forEach(s => {
      if (s.date && s.date.length >= 7) {
        set.add(s.date.substring(0, 7));
      }
    });

    return Array.from(set).sort().reverse();
  }, [sessions, loggedInTeacher.id, currentYear, currentMonth]);

  // List of students associated with this teacher's sessions
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
    return computeTeacherMonthlySummary({
      teacher: loggedInTeacher,
      mode: filterMode,
      year: selectedYear,
      month: selectedMonth,
      startDate,
      endDate,
      sessions,
      students,
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
    groupCourses,
    selectedStudentFilter,
    selectedStatusFilter
  ]);

  if (!isOpen) return null;

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      if (triggerToast) {
        triggerToast('جاري إنشاء تقرير PDF وتجهيز التنزيل... ⏳');
      }
      await downloadTeacherMonthlySessionsPDF(computedSummary);
      if (triggerToast) {
        triggerToast('تم تحميل تقرير PDF بنجاح 📥');
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      if (triggerToast) {
        triggerToast('تعذر تنزيل الملف، سيتم فتح نافذة الطباعة كبديل 🖨️');
      }
      printTeacherMonthlySessionsReport(computedSummary);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    printTeacherMonthlySessionsReport(computedSummary);
    if (triggerToast) {
      triggerToast('تم فتح أمر الطباعة / الحفظ بصيغة PDF 🖨️');
    }
  };

  const handleQuickMonthSelect = (ym: string) => {
    const [yStr, mStr] = ym.split('-');
    if (yStr && mStr) {
      setSelectedYear(parseInt(yStr, 10));
      setSelectedMonth(parseInt(mStr, 10));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in" dir="rtl">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#0d365a] via-[#1a4a75] to-[#0d365a] text-white p-5 sm:p-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner text-amber-300">
              <FileDown size={24} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black flex items-center gap-2">
                تصدير تقرير الحصص الشهري (PDF)
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full">
                  رسمي معتمد
                </span>
              </h2>
              <p className="text-xs text-slate-200 font-medium mt-0.5">
                تحميل ملف PDF يحتوي على ملخص شهري لجميع الحصص المسجلة وأسماء الطلاب وتواريخ الجلسات.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer"
            title="إغلاق النافذة"
          >
            <X size={20} />
          </button>
        </div>

        {/* Switch to Balance Statement Banner */}
        {onSwitchToBalanceStatement && (
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-b border-emerald-200 p-3 px-5 flex items-center justify-between gap-3 text-right">
            <div className="flex items-center gap-2">
              <span className="text-base">💰</span>
              <p className="text-xs font-bold text-emerald-950">
                هل ترغب بتحميل <strong>كشف رصيد ومستحقات مالي</strong> (مبالغ مالية، مسحوبات، ورصيد نهائي لشهر أو فترة مخصصة)؟
              </p>
            </div>
            <button
              type="button"
              onClick={onSwitchToBalanceStatement}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer shadow-xs"
            >
              فتح كشف الرصيد ↗
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1 text-right">

          {/* Teacher Badge */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0d365a]/10 text-[#0d365a] flex items-center justify-center font-black text-sm">
                👨‍🏫
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-bold block">معلم التقرير:</span>
                <strong className="text-sm font-black text-slate-800">أ. {loggedInTeacher.name}</strong>
              </div>
            </div>
            <div className="text-left">
              <span className="text-[11px] text-slate-400 font-bold block">التخصص:</span>
              <span className="text-xs font-bold text-slate-700">{loggedInTeacher.specialty || 'معلم أكاديمي'}</span>
            </div>
          </div>

          {/* Period Selection: Month vs Range */}
          <div className="space-y-3.5 bg-slate-50/70 p-4 rounded-2xl border border-slate-200">
            {/* Mode Switch Tabs */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setFilterMode('month')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    filterMode === 'month'
                      ? 'bg-[#0d365a] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Calendar size={14} className={filterMode === 'month' ? 'text-amber-300' : 'text-slate-400'} />
                  <span>كشف شهري</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('range')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    filterMode === 'range'
                      ? 'bg-[#0d365a] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <CalendarRange size={14} className={filterMode === 'range' ? 'text-amber-300' : 'text-slate-400'} />
                  <span>نطاق تاريخ مخصص (من - إلى)</span>
                </button>
              </div>

              {/* Active period preview badge */}
              <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg flex items-center gap-1.5">
                <Clock size={13} className="text-emerald-600 shrink-0" />
                <span>
                  {filterMode === 'month'
                    ? `شهر ${computedSummary.monthNameArabic} ${computedSummary.year}`
                    : `الفترة: من ${startDate} إلى ${endDate}`}
                </span>
              </div>
            </div>

            {/* Presets in Range mode */}
            {filterMode === 'range' && (
              <div className="flex flex-wrap items-center gap-1.5 text-xs bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-black text-slate-500 ml-1">نطاقات سريعة:</span>
                <button
                  type="button"
                  onClick={() => applyPreset('today')}
                  className="px-2 py-0.5 rounded-md bg-slate-50 hover:bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200 cursor-pointer"
                >
                  اليوم
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('this_week')}
                  className="px-2 py-0.5 rounded-md bg-slate-50 hover:bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200 cursor-pointer"
                >
                  هذا الأسبوع
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('this_month')}
                  className="px-2 py-0.5 rounded-md bg-slate-50 hover:bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200 cursor-pointer"
                >
                  هذا الشهر
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('last_month')}
                  className="px-2 py-0.5 rounded-md bg-slate-50 hover:bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200 cursor-pointer"
                >
                  الشهر الماضي
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('last_30_days')}
                  className="px-2 py-0.5 rounded-md bg-slate-50 hover:bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200 cursor-pointer"
                >
                  آخر 30 يوماً
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('ytd')}
                  className="px-2 py-0.5 rounded-md bg-slate-50 hover:bg-slate-100 text-[10px] font-bold text-slate-700 border border-slate-200 cursor-pointer"
                >
                  بداية العام
                </button>
              </div>
            )}

            {/* Date Inputs in Range mode */}
            {filterMode === 'range' ? (
              <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* From Date */}
                  <div>
                    <label className="text-xs font-black text-slate-800 flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>من تاريخ:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setStartDate(firstDayOfMonthStr)}
                        className="text-[10px] text-blue-700 hover:underline font-bold cursor-pointer"
                      >
                        أول هذا الشهر
                      </button>
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:bg-white focus:border-[#0d365a] outline-none font-mono"
                    />
                  </div>

                  {/* To Date */}
                  <div>
                    <label className="text-xs font-black text-slate-800 flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span>إلى تاريخ:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setEndDate(todayStr)}
                        className="text-[10px] text-blue-700 hover:underline font-bold cursor-pointer"
                      >
                        تاريخ اليوم
                      </button>
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:bg-white focus:border-[#0d365a] outline-none font-mono"
                    />
                  </div>
                </div>

                {startDate > endDate && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2 rounded-lg text-xs font-bold flex items-center justify-between gap-2">
                    <span>تنبيه: تاريخ البداية يقع بعد تاريخ النهاية!</span>
                    <button
                      type="button"
                      onClick={() => {
                        const tmp = startDate;
                        setStartDate(endDate);
                        setEndDate(tmp);
                      }}
                      className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-black cursor-pointer flex items-center gap-1"
                    >
                      <ArrowLeftRight size={11} />
                      <span>عكس التواريخ</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Month & Year Selectors in Month mode */
              <div className="space-y-3">
                {/* Quick Available Months Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                  <span className="text-[11px] font-bold text-slate-400 shrink-0 ml-1">أشهر سريعة:</span>
                  {availableMonths.slice(0, 5).map(ym => {
                    const [y, m] = ym.split('-');
                    const isSelected = selectedYear === parseInt(y, 10) && selectedMonth === parseInt(m, 10);
                    const monthName = ARABIC_MONTHS[parseInt(m, 10) - 1] || `شهر ${m}`;
                    return (
                      <button
                        key={ym}
                        type="button"
                        onClick={() => handleQuickMonthSelect(ym)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-[#0d365a] text-white shadow-xs' 
                            : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {monthName} {y}
                      </button>
                    );
                  })}
                </div>

                {/* Manual Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-500 mb-1 block">الشهر:</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:bg-white focus:border-[#0d365a] outline-none transition-all cursor-pointer"
                    >
                      {ARABIC_MONTHS.map((name, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-500 mb-1 block">السنة:</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:bg-white focus:border-[#0d365a] outline-none transition-all cursor-pointer"
                    >
                      {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Optional Filtering */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Filter size={14} className="text-[#0d365a]" />
                <span>خيارات التصفية الإضافية (اختياري):</span>
              </label>
              <span className="text-[10px] text-slate-400 font-bold">يمكنك تخصيص نطاق التقرير</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 block">تصفية حسب الطالب:</label>
                <select
                  value={selectedStudentFilter}
                  onChange={(e) => setSelectedStudentFilter(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-[#0d365a] outline-none cursor-pointer"
                >
                  <option value="all">جميع الطلاب المشمولين في هذا الشهر ({teacherStudentsList.length})</option>
                  {teacherStudentsList.map(st => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.academicLevel || st.grade || 'طالب'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 block">حالة الاعتماد:</label>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-[#0d365a] outline-none cursor-pointer"
                >
                  <option value="all">جميع الحصص (معتمدة وقيد المراجعة)</option>
                  <option value="approved">الحصص المعتمدة رسمياً فقط ✔️</option>
                  <option value="pending">الحصص قيد المراجعة فقط ⏳</option>
                </select>
              </div>
            </div>
          </div>

          {/* Live Summary Stat Cards */}
          <div className="pt-2">
            <div className="text-xs font-black text-slate-700 mb-2 flex items-center justify-between">
              <span>ملخص التقرير المختار لشهر ({computedSummary.monthNameArabic} {computedSummary.year}):</span>
              <span className="text-[10px] font-bold text-[#0d365a] bg-blue-50 px-2 py-0.5 rounded-md">
                معاينة فورية
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-2xl">
                <span className="text-[10px] font-bold text-blue-700 block">إجمالي الحصص</span>
                <strong className="text-base font-black text-blue-950 block mt-0.5">
                  {computedSummary.totalSessions} <span className="text-[10px] font-medium">حصة</span>
                </strong>
              </div>

              <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl">
                <span className="text-[10px] font-bold text-amber-700 block">إجمالي الساعات</span>
                <strong className="text-base font-black text-amber-950 block mt-0.5">
                  {computedSummary.totalHours.toFixed(1)} <span className="text-[10px] font-medium">ساعة</span>
                </strong>
              </div>

              <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl">
                <span className="text-[10px] font-bold text-emerald-700 block">عدد الطلاب</span>
                <strong className="text-base font-black text-emerald-950 block mt-0.5">
                  {computedSummary.uniqueStudentsCount} <span className="text-[10px] font-medium">طلاب</span>
                </strong>
              </div>

              <div className="p-3 bg-purple-50/60 border border-purple-200/80 rounded-2xl">
                <span className="text-[10px] font-bold text-purple-700 block">الحصص المعتمدة</span>
                <strong className="text-base font-black text-purple-950 block mt-0.5">
                  {computedSummary.approvedSessionsCount} <span className="text-[10px] font-medium">حصة</span>
                </strong>
              </div>
            </div>
          </div>

          {/* Quick Sessions Preview List */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800">
                الحصص المسجلة المدرجة بالتقرير ({computedSummary.sessionsList.length}):
              </span>
              <span className="text-[10px] text-slate-400 font-bold">مرتبة تاريخياً</span>
            </div>

            {computedSummary.sessionsList.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
                <AlertCircle size={24} className="text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-black text-slate-600">لا توجد حصص مسجلة في هذا الشهر وفق خيارات التصفية.</p>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">يرجى اختيار شهر آخر أو التأكد من تسجيل الحصص.</p>
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-slate-50/50">
                {computedSummary.sessionsList.slice(0, 10).map((s, idx) => (
                  <div key={s.id || idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-white transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-black text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <strong className="text-slate-800 font-black block truncate">{s.studentName}</strong>
                        <span className="text-[10px] text-slate-400 font-bold block truncate">
                          {s.subject} • {s.topic}
                        </span>
                      </div>
                    </div>
                    <div className="text-left shrink-0 pl-1">
                      <span className="text-[10px] font-mono font-black text-[#0d365a] bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md block">
                        {s.date} ({s.durationHours} س)
                      </span>
                    </div>
                  </div>
                ))}
                {computedSummary.sessionsList.length > 10 && (
                  <div className="p-2 text-center text-[10px] font-black text-slate-500 bg-slate-100">
                    + {computedSummary.sessionsList.length - 10} حصص أخرى ستكون مدرجة بالكامل في ملف PDF المستخرج.
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 font-bold text-center sm:text-right">
            يتم استخراج ملف PDF منسق ومعتمد جاهز للطباعة والمشاركة مع الإدارة أو أولياء الأمور.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handlePrint}
              disabled={isGeneratingPdf || computedSummary.sessionsList.length === 0}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-white text-slate-700 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
              title="معاينة وطباعة مباشرة"
            >
              <Printer size={15} />
              <span>طباعة مباشرة</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf || computedSummary.sessionsList.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0d365a] to-[#1a4a75] hover:from-[#09253e] hover:to-[#133758] text-white text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-[#0d365a]/20 hover:scale-102 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
              title="تحميل ملف PDF"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 size={16} className="animate-spin text-amber-300" />
                  <span>جاري التحميل...</span>
                </>
              ) : (
                <>
                  <FileDown size={16} className="text-amber-300" />
                  <span className="flex items-center gap-1">
                    <span>تحميل تقرير PDF</span>
                    {filterMode === 'range' && (
                      <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-mono font-bold mr-1">
                        {startDate} إلى {endDate}
                      </span>
                    )}
                    <span>📄</span>
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
