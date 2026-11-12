// src/components/StudentFinancialReportsModal.tsx
// نافذة مركز تقارير الطلاب والمالية الرسمية وتصدير الـ PDF - أكاديمية التفوق أون لاين

import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, Printer, Download, MessageSquare, X, Filter, 
  Calendar, Search, Users, AlertCircle, CheckCircle2, 
  DollarSign, ArrowRight, Share2, Sparkles, SlidersHorizontal, 
  Phone, User, ChevronDown, Check, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Teacher, Session, StudentCredit, formatCustomDate } from '../types';
import { 
  generateStudentFinancialStatementHtml, 
  generateAllStudentsFinancialReportHtml, 
  calculateStudentStatsForReport,
  buildParentStatementWhatsAppMessage,
  triggerDirectReportPrint,
  downloadReportAsFile,
  ArabicFontChoice,
  ARABIC_FONTS_CONFIG
} from '../lib/studentReportsExport';
import { getBestParentOrStudentPhone, buildWhatsAppUrl } from '../lib/phoneUtils';
import { logActivity } from '../lib/activityLogger';

interface StudentFinancialReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  teachers: Teacher[];
  sessions: Session[];
  credits: StudentCredit[];
  initialStudentId?: string | null;
  initialTab?: 'individual' | 'collective';
  globalSettings?: any;
}

export const StudentFinancialReportsModal: React.FC<StudentFinancialReportsModalProps> = ({
  isOpen,
  onClose,
  students,
  teachers,
  sessions,
  credits,
  initialStudentId,
  initialTab = 'individual',
  globalSettings
}) => {
  const [activeTab, setActiveTab] = useState<'individual' | 'collective'>(initialTab);
  
  // فردي: الطالب المختار
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || (students.length > 0 ? students[0].id : '')
  );
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  
  // خيارات الفترة
  const getCurrentAcademicYear = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    let startYear, endYear;
    if (currentMonth >= 8) {
      startYear = currentYear;
      endYear = currentYear + 1;
    } else {
      startYear = currentYear - 1;
      endYear = currentYear;
    }
    return {
      startDate: `${startYear}-09-01`,
      endDate: `${endYear}-08-31`,
      label: `العام الدراسي ${startYear}/${endYear}`
    };
  };

  const getThisMonthDates = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    return {
      startDate: `${year}-${month}-01`,
      endDate: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
      label: `شهر ${month}/${year}`
    };
  };

  const getLast30DaysDates = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      label: 'آخر 30 يوماً'
    };
  };

  const [periodPreset, setPeriodPreset] = useState<'all' | 'academic_year' | 'this_month' | 'last_30' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [noteToParent, setNoteToParent] = useState('');
  const [includeDetailedSessions, setIncludeDetailedSessions] = useState(true);
  const [hideAdjustmentsInStatement, setHideAdjustmentsInStatement] = useState(true);
  const [selectedFont, setSelectedFont] = useState<ArabicFontChoice>('cairo');

  // مجمع: خيارات التصفية
  const [collectiveFilterMode, setCollectiveFilterMode] = useState<'all' | 'debtors' | 'surplus' | 'balanced'>('all');
  const [collectiveTeacherFilter, setCollectiveTeacherFilter] = useState('');
  const [collectiveStageFilter, setCollectiveStageFilter] = useState('');

  // مزامنة الطالب الأولي إذا تغير
  useEffect(() => {
    if (initialStudentId) {
      setSelectedStudentId(initialStudentId);
    } else if (!selectedStudentId && students.length > 0) {
      setSelectedStudentId(students[0].id);
    }
  }, [initialStudentId, students]);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // حساب التواريخ الفعلية المحددة للتقرير الفردي
  const activeDateRange = useMemo(() => {
    if (periodPreset === 'academic_year') {
      const p = getCurrentAcademicYear();
      return { startDate: p.startDate, endDate: p.endDate, label: p.label };
    }
    if (periodPreset === 'this_month') {
      const p = getThisMonthDates();
      return { startDate: p.startDate, endDate: p.endDate, label: p.label };
    }
    if (periodPreset === 'last_30') {
      const p = getLast30DaysDates();
      return { startDate: p.startDate, endDate: p.endDate, label: p.label };
    }
    if (periodPreset === 'custom') {
      return {
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined,
        label: customStartDate && customEndDate
          ? `من ${formatCustomDate(customStartDate)} إلى ${formatCustomDate(customEndDate)}`
          : 'فترة مخصصة'
      };
    }
    return { startDate: undefined, endDate: undefined, label: 'كافة الفترات (السجل التراكمي الشامل)' };
  }, [periodPreset, customStartDate, customEndDate]);

  // الطالب المختار
  const currentStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || students[0] || null;
  }, [students, selectedStudentId]);

  // تصفية قائمة الطلاب في شريط البحث الفردي
  const filteredStudentOptions = useMemo(() => {
    if (!studentSearchTerm.trim()) return students.slice(0, 50);
    const term = studentSearchTerm.toLowerCase().trim();
    return students.filter(s => 
      s.name.toLowerCase().includes(term) ||
      (s.phone && s.phone.includes(term)) ||
      (s.grade && s.grade.toLowerCase().includes(term)) ||
      (s.academicLevel && s.academicLevel.toLowerCase().includes(term))
    );
  }, [students, studentSearchTerm]);

  // إحصائيات الطالب المختار
  const currentStudentStats = useMemo(() => {
    if (!currentStudent) return null;
    return calculateStudentStatsForReport(
      currentStudent,
      teachers,
      sessions,
      credits,
      activeDateRange.startDate,
      activeDateRange.endDate,
      globalSettings
    );
  }, [currentStudent, teachers, sessions, credits, activeDateRange, globalSettings]);

  // توليد HTML للتقرير الفردي
  const individualReportHtml = useMemo(() => {
    if (!currentStudent) return '';
    return generateStudentFinancialStatementHtml({
      student: currentStudent,
      teachers,
      sessions,
      credits,
      globalSettings,
      startDate: activeDateRange.startDate,
      endDate: activeDateRange.endDate,
      periodLabel: activeDateRange.label,
      noteToParent: noteToParent.trim() || undefined,
      includeDetailedSessions,
      fontChoice: selectedFont,
      hideAdjustmentsInStatement,
      managerName: globalSettings?.managerName || 'أ. د. زكي أبو علان',
      academyName: globalSettings?.academyName || 'أكاديمية التفوق أون لاين للتمكين الأكاديمي والتعليمي',
      centerPhone: globalSettings?.academyPhone || '059-8321040',
      centerEmail: globalSettings?.academyEmail || 'zakiabuillan@gmail.com',
      centerAddress: globalSettings?.academyAddress || 'المنصة التعليمية الرقمية المعتمدة - فلسطين',
      centerLicense: globalSettings?.academyLicense || 'ترخيص واعتماد رقم: EDU-2026-98442'
    });
  }, [currentStudent, teachers, sessions, credits, activeDateRange, noteToParent, includeDetailedSessions, hideAdjustmentsInStatement, selectedFont, globalSettings]);

  // توليد HTML للتقرير المالي المجمع
  const collectiveReportHtml = useMemo(() => {
    return generateAllStudentsFinancialReportHtml({
      students,
      teachers,
      sessions,
      credits,
      globalSettings,
      filterMode: collectiveFilterMode,
      teacherIdFilter: collectiveTeacherFilter || undefined,
      stageFilter: collectiveStageFilter || undefined,
      fontChoice: selectedFont,
      managerName: globalSettings?.managerName || 'أ. د. زكي أبو علان',
      academyName: globalSettings?.academyName || 'أكاديمية التفوق أون لاين للتمكين الأكاديمي والتعليمي',
      centerPhone: globalSettings?.academyPhone || '059-8321040',
      centerEmail: globalSettings?.academyEmail || 'zakiabuillan@gmail.com',
      centerAddress: globalSettings?.academyAddress || 'المنصة التعليمية الرقمية المعتمدة - فلسطين',
      centerLicense: globalSettings?.academyLicense || 'ترخيص واعتماد رقم: EDU-2026-98442'
    });
  }, [students, teachers, sessions, credits, collectiveFilterMode, collectiveTeacherFilter, collectiveStageFilter, selectedFont, globalSettings]);

  // إحصائيات سريعة للمجمع
  const collectiveMetrics = useMemo(() => {
    let debtCount = 0;
    let debtTotal = 0;
    let surplusCount = 0;
    let surplusTotal = 0;

    students.forEach(s => {
      const st = calculateStudentStatsForReport(s, teachers, sessions, credits, undefined, undefined, globalSettings);
      if (st.finalBalance < -0.01) {
        debtCount++;
        debtTotal += Math.abs(st.finalBalance);
      } else if (st.finalBalance > 0.01) {
        surplusCount++;
        surplusTotal += st.finalBalance;
      }
    });

    return {
      debtCount,
      debtTotal,
      surplusCount,
      surplusTotal,
      net: surplusTotal - debtTotal,
      totalStudents: students.length
    };
  }, [students, teachers, sessions, credits, globalSettings]);

  // معالجات الإجراءات (طباعة، تنزيل، واتساب)
  const handlePrint = () => {
    const isIndividual = activeTab === 'individual';
    const htmlToPrint = isIndividual ? individualReportHtml : collectiveReportHtml;
    const reportTitle = isIndividual 
      ? `كشف_حساب_الطالب_${currentStudent?.name || 'طالب'}` 
      : `التقرير_المالي_المجمع_للأرصدة_${collectiveFilterMode}`;

    triggerDirectReportPrint(htmlToPrint, reportTitle);

    logActivity({
      actionType: 'EXPORT_PDF_REPORT',
      actionName: isIndividual ? 'طباعة كشف حساب طالب' : 'طباعة التقرير المالي المجمع',
      details: isIndividual 
        ? `تمت طباعة/حفظ كشف حساب الطالب (${currentStudent?.name}) بصيغة PDF معتمدة`
        : `تمت طباعة التقرير المالي المجمع للطلاب (وضع التصفية: ${collectiveFilterMode})`
    }).catch(console.error);
  };

  const handleDownload = () => {
    const isIndividual = activeTab === 'individual';
    const htmlToDownload = isIndividual ? individualReportHtml : collectiveReportHtml;
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = isIndividual
      ? `كشف_حساب_${currentStudent?.name.replace(/\s+/g, '_')}_${dateStr}`
      : `التقرير_المالي_المجمع_${collectiveFilterMode}_${dateStr}`;

    downloadReportAsFile(htmlToDownload, fileName);
  };

  const handleSendWhatsAppToParent = () => {
    if (!currentStudent || !currentStudentStats) return;
    const phone = getBestParentOrStudentPhone(currentStudent);
    if (!phone) {
      alert('لا يتوفر رقم هاتف مسجل للطالب أو لولي أمره.');
      return;
    }

    const msg = buildParentStatementWhatsAppMessage(
      currentStudent,
      currentStudentStats,
      activeDateRange.label,
      globalSettings?.academyName || 'أكاديمية التفوق أون لاين'
    );

    const url = buildWhatsAppUrl(phone, msg);
    if (url) {
      window.open(url, '_blank');
      logActivity({
        actionType: 'SEND_WHATSAPP_STATEMENT',
        actionName: 'إرسال ملخص كشف الحساب لولي الأمر',
        details: `تم إرسال ملخص كشف الحساب المالي للطالب (${currentStudent.name}) إلى ولي الأمر عبر WhatsApp على الرقم (${phone})`
      }).catch(console.error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[280] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 text-right no-print select-none" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        className="bg-white rounded-3xl max-w-6xl w-full h-[92vh] max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0D365A] text-[#D4A33C] flex items-center justify-center shadow-sm">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-[#0D365A]">مركز تقارير الطلاب والمالية الرسمية (PDF)</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                  معتمد 2026
                </span>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                تصدير وطباعة كشوفات الحسابات والتقارير المالية بدقة A4 عالية التباين والمشاركة المباشرة مع أولياء الأمور
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer"
              title="إغلاق النافذة"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-100/70 border-b border-slate-200/80 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('individual')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'individual'
                  ? 'bg-[#0D365A] text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <User size={15} className={activeTab === 'individual' ? 'text-[#D4A33C]' : 'text-slate-400'} />
              <span>كشف حساب الطالب لولي الأمر (تقرير فردي)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('collective')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'collective'
                  ? 'bg-[#0D365A] text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Users size={15} className={activeTab === 'collective' ? 'text-[#D4A33C]' : 'text-slate-400'} />
              <span>التقرير المالي المجمع لأرصدة وديون الطلاب (تقرير الإدارة)</span>
            </button>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            {activeTab === 'individual' && currentStudent && (
              <button
                type="button"
                onClick={handleSendWhatsAppToParent}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer"
                title="إرسال ملخص الحساب والأرصدة لولي الأمر عبر WhatsApp"
              >
                <MessageSquare size={14} />
                <span>إرسال لولي الأمر (WhatsApp) 💬</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#0D365A] hover:bg-[#09253f] text-[#D4A33C] hover:text-amber-200 rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer"
              title="طباعة التقرير وحفظه كملف PDF عالي الجودة"
            >
              <Printer size={14} />
              <span>طباعة وحفظ كـ PDF 🖨️</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer"
              title="تنزيل نسخة مستقلة من التقرير"
            >
              <Download size={14} />
              <span>تنزيل التقرير 📥</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Controls Panel (Right Side) */}
          <div className="w-full md:w-84 lg:w-96 border-l border-slate-100 bg-slate-50/50 p-4 overflow-y-auto space-y-4 shrink-0">
            
            {activeTab === 'individual' ? (
              <>
                {/* 1. اختيار الطالب */}
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs space-y-2">
                  <label className="block text-xs font-black text-slate-800 flex items-center justify-between">
                    <span>1. تحديد الطالب المستهدف:</span>
                    <span className="text-[10px] font-bold text-slate-400">({students.length} طالب)</span>
                  </label>

                  <div className="relative">
                    <Search size={14} className="absolute right-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ابحث بالاسم أو رقم الهاتف..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      className="w-full pr-8 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#D4A33C] focus:bg-white outline-none transition-all"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                    {filteredStudentOptions.map(student => {
                      const isSelected = student.id === selectedStudentId;
                      return (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => setSelectedStudentId(student.id)}
                          className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                            isSelected 
                              ? 'bg-[#0D365A] text-white' 
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <div className="truncate">
                            <span className="block font-black truncate">{student.name}</span>
                            <span className={`text-[10px] truncate block ${isSelected ? 'text-amber-300' : 'text-slate-400'}`}>
                              {student.grade || student.academicLevel || 'مقرر دراسي'}
                            </span>
                          </div>
                          {isSelected && <Check size={14} className="text-[#D4A33C] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. اختيار الفترة الزمنية */}
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs space-y-2">
                  <label className="block text-xs font-black text-slate-800">
                    2. الفترة الزمنية للتقرير:
                  </label>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPeriodPreset('all')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                        periodPreset === 'all'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      كافة الفترات (كلي)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriodPreset('academic_year')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                        periodPreset === 'academic_year'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      العام الدراسي الحالي 🗓️
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriodPreset('this_month')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                        periodPreset === 'this_month'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      الشهر الحالي 📅
                    </button>
                    <button
                      type="button"
                      onClick={() => setPeriodPreset('custom')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                        periodPreset === 'custom'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      فترة مخصصة 📆
                    </button>
                  </div>

                  {periodPreset === 'custom' && (
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block mb-1">من تاريخ:</span>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block mb-1">إلى تاريخ:</span>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. توجيه وملاحظة لولي الأمر */}
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs space-y-2">
                  <label className="block text-xs font-black text-slate-800">
                    3. ملاحظة أو توجيه خاص لولي الأمر (اختياري):
                  </label>
                  <textarea
                    rows={3}
                    placeholder="اكتب توجيهاً أكاديمياً أو تذكيراً بالدفع ليظهر في ذيل التقرير الرسمي لولي الأمر..."
                    value={noteToParent}
                    onChange={(e) => setNoteToParent(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:border-[#D4A33C] focus:bg-white outline-none transition-all resize-none"
                  />
                </div>

                {/* 4. خيارات إضافية */}
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={includeDetailedSessions}
                      onChange={(e) => setIncludeDetailedSessions(e.target.checked)}
                      className="rounded text-[#0D365A] focus:ring-0 cursor-pointer"
                    />
                    <span>تضمين جدول الحركات المالية والحصص التفصيلي</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={hideAdjustmentsInStatement}
                      onChange={(e) => setHideAdjustmentsInStatement(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-slate-800">إخفاء حركات التعديل من الكشف (محسوبة بالرصيد تلقائياً) 🛡️</span>
                  </label>
                </div>
              </>
            ) : (
              <>
                {/* خيارات التقرير المالي المجمع */}
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs space-y-2">
                  <label className="block text-xs font-black text-slate-800">
                    1. فلترة الطلاب المشمولين في التقرير:
                  </label>

                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setCollectiveFilterMode('all')}
                      className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        collectiveFilterMode === 'all'
                          ? 'bg-[#0D365A] text-white'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span>كافة الطلاب المسجلين ({students.length})</span>
                      {collectiveFilterMode === 'all' && <Check size={14} className="text-[#D4A33C]" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setCollectiveFilterMode('debtors')}
                      className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        collectiveFilterMode === 'debtors'
                          ? 'bg-rose-700 text-white'
                          : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <AlertCircle size={14} className="text-rose-500" />
                        <span>الطلاب المدينون فقط (أرصدة سالبة)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-200/60 text-rose-900">
                        {collectiveMetrics.debtCount} طالب (₪{collectiveMetrics.debtTotal.toFixed(0)})
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCollectiveFilterMode('surplus')}
                      className={`w-full text-right px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                        collectiveFilterMode === 'surplus'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span>الطلاب الدائنون فقط (فائض مشحون)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-200/60 text-emerald-900">
                        {collectiveMetrics.surplusCount} طالب (₪{collectiveMetrics.surplusTotal.toFixed(0)})
                      </span>
                    </button>
                  </div>
                </div>

                {/* تصفية بالمعلم */}
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs space-y-2">
                  <label className="block text-xs font-black text-slate-800">
                    2. تصفية حسب المعلم المشرف (اختياري):
                  </label>
                  <select
                    value={collectiveTeacherFilter}
                    onChange={(e) => setCollectiveTeacherFilter(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#D4A33C] outline-none"
                  >
                    <option value="">كافة المعلمين</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.specialization || 'معلم'})</option>
                    ))}
                  </select>
                </div>

                {/* بطاقة المؤشرات السريعة للإدارة */}
                <div className="bg-gradient-to-br from-[#0D365A] to-[#082137] text-white rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="text-xs font-black text-[#D4A33C]">الموقف المالي العام للأكاديمية:</div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b border-white/10 pb-1.5">
                      <span className="text-slate-300">إجمالي الديون المستحقة:</span>
                      <span className="font-mono font-black text-rose-300">₪{collectiveMetrics.debtTotal.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/10 pb-1.5">
                      <span className="text-slate-300">إجمالي الأرصدة المشحونة:</span>
                      <span className="font-mono font-black text-emerald-300">₪{collectiveMetrics.surplusTotal.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between pt-1 font-black text-sm">
                      <span>صافي الأرصدة:</span>
                      <span className={`font-mono ${collectiveMetrics.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {collectiveMetrics.net >= 0 ? '+' : ''}₪{collectiveMetrics.net.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* اختيار الخط العربي المعتمد لتصدير الـ PDF */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#D4A33C]" />
                  <span>الخط العربي المعتمد للتقرير (PDF):</span>
                </label>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80">
                  {ARABIC_FONTS_CONFIG[selectedFont]?.name}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {(Object.keys(ARABIC_FONTS_CONFIG) as ArabicFontChoice[]).map((fontKey) => {
                  const fontDef = ARABIC_FONTS_CONFIG[fontKey];
                  const isSelected = selectedFont === fontKey;
                  return (
                    <button
                      key={fontKey}
                      type="button"
                      onClick={() => setSelectedFont(fontKey)}
                      className={`w-full text-right p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-50/70 border-amber-400 text-slate-900 shadow-xs ring-1 ring-amber-300/40'
                          : 'bg-slate-50/70 border-slate-200/80 text-slate-700 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-[#0D365A] bg-[#0D365A]' : 'border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check size={10} className="text-[#D4A33C] stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            <span style={{ fontFamily: fontDef.displayFont }}>{fontDef.label}</span>
                            {fontKey === 'cairo' && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 shrink-0">
                                الرسمي
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                            {fontDef.description}
                          </div>
                        </div>
                      </div>
                      <span 
                        className="text-xs font-black px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 shrink-0 shadow-2xs mr-1"
                        style={{ fontFamily: fontDef.displayFont }}
                      >
                        أ ب ت 123
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Live Preview Window (Left Side) */}
          <div className="flex-1 flex flex-col bg-slate-100/60 p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-black text-slate-700">معاينة حية للمستند النهائي (A4 PDF Preview)</span>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                يظهر أدناه الشكل الدقيق المنسق الذي سيتم تصديره أو طباعته
              </span>
            </div>

            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-inner overflow-hidden flex flex-col">
              <iframe
                title="Report Preview"
                srcDoc={activeTab === 'individual' ? individualReportHtml : collectiveReportHtml}
                className="w-full h-full border-0"
              />
            </div>
          </div>

        </div>

      </motion.div>
    </div>
  );
};
