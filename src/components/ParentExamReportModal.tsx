import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Download, Printer, X, Users, Search, 
  Sparkles, CheckCircle2, AlertCircle, Award, BookOpen, 
  Send, MessageCircle, RefreshCw, Calendar, Filter, GraduationCap,
  SlidersHorizontal, Layers, Check, ListFilter
} from 'lucide-react';
import { Student, Teacher } from '../types';
import { 
  ExamResultItem, 
  computeParentReportStats, 
  downloadParentExamReportPDF, 
  printParentExamReport,
  generateParentExamReportHTML,
  getScoreGradeInfo
} from '../lib/parentExamReportPdf';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ParentExamReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  examResults: ExamResultItem[];
  students: Student[];
  teachers: Teacher[];
  initialViewMode?: 'detailed' | 'summary';
  reportViewMode?: 'detailed' | 'summary';
  onReportViewModeChange?: (mode: 'detailed' | 'summary') => void;
}

export const ParentExamReportModal: React.FC<ParentExamReportModalProps> = ({
  isOpen,
  onClose,
  examResults = [],
  students = [],
  teachers = [],
  initialViewMode = 'detailed',
  reportViewMode: controlledViewMode,
  onReportViewModeChange
}) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [searchStudentTerm, setSearchStudentTerm] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'last_30_days' | 'this_month'>('all');
  const [viewMode, setViewMode] = useState<'detailed' | 'summary'>(controlledViewMode || initialViewMode || 'detailed');
  const [customNote, setCustomNote] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [isSeedingSample, setIsSeedingSample] = useState<boolean>(false);
  const [seedSuccessMsg, setSeedSuccessMsg] = useState<string>('');

  // Sync if controlled externally
  React.useEffect(() => {
    if (controlledViewMode) {
      setViewMode(controlledViewMode);
    }
  }, [controlledViewMode]);

  const handleSelectViewMode = (mode: 'detailed' | 'summary') => {
    setViewMode(mode);
    onReportViewModeChange?.(mode);
  };

  // Extract distinct students who have exam results
  const studentsWithResults = useMemo(() => {
    const studentNamesSet = new Set<string>();
    examResults.forEach(r => {
      if (r.studentName && r.studentName.trim()) {
        studentNamesSet.add(r.studentName.trim());
      }
    });

    const list: Array<{
      id: string;
      name: string;
      phone?: string;
      grade?: string;
      examsCount: number;
      averageScore: number;
    }> = [];

    // Map existing students in database
    students.forEach(st => {
      const stResults = examResults.filter(r => 
        (r.studentName && r.studentName.trim().toLowerCase() === st.name.trim().toLowerCase()) ||
        (st.phone && r.studentPhone && r.studentPhone.replace(/\D/g, '') === st.phone.replace(/\D/g, ''))
      );

      const count = stResults.length;
      const avg = count > 0 
        ? Math.round(stResults.reduce((sum, curr) => sum + (Number(curr.score) || 0), 0) / count)
        : 0;

      list.push({
        id: st.id,
        name: st.name,
        phone: st.phone,
        grade: st.grade || 'المرحلة الثانوية والبجروت',
        examsCount: count,
        averageScore: avg
      });

      studentNamesSet.delete(st.name.trim());
    });

    // Add any student from examResults not yet in students collection
    studentNamesSet.forEach(name => {
      const stResults = examResults.filter(r => r.studentName && r.studentName.trim().toLowerCase() === name.toLowerCase());
      const count = stResults.length;
      const avg = count > 0 
        ? Math.round(stResults.reduce((sum, curr) => sum + (Number(curr.score) || 0), 0) / count)
        : 0;

      list.push({
        id: `virtual-${name}`,
        name,
        phone: stResults[0]?.studentPhone || '',
        grade: 'المرحلة الثانوية والبجروت',
        examsCount: count,
        averageScore: avg
      });
    });

    // Sort: students with exams first, descending by exam count, then alphabetically
    return list.sort((a, b) => {
      if (b.examsCount !== a.examsCount) return b.examsCount - a.examsCount;
      return a.name.localeCompare(b.name, 'ar');
    });
  }, [students, examResults]);

  // Extract distinct subjects/categories from examResults
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    examResults.forEach(r => {
      if (r.category && r.category.trim()) set.add(r.category.trim());
    });
    return Array.from(set);
  }, [examResults]);

  // Active chosen student details
  const activeStudent = useMemo(() => {
    if (selectedStudentId === 'all') return null;
    return studentsWithResults.find(s => s.id === selectedStudentId) || null;
  }, [selectedStudentId, studentsWithResults]);

  // Filter exam results for the active selection
  const filteredResults = useMemo(() => {
    let list = [...examResults];

    // Filter by student
    if (activeStudent) {
      list = list.filter(r => 
        (r.studentName && r.studentName.trim().toLowerCase() === activeStudent.name.trim().toLowerCase()) ||
        (activeStudent.phone && r.studentPhone && r.studentPhone.replace(/\D/g, '') === activeStudent.phone.replace(/\D/g, ''))
      );
    }

    // Filter by subject
    if (selectedSubject !== 'all') {
      list = list.filter(r => r.category === selectedSubject);
    }

    // Filter by time
    if (timeFilter === 'last_30_days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      list = list.filter(r => r.submittedAt && new Date(r.submittedAt) >= thirtyDaysAgo);
    } else if (timeFilter === 'this_month') {
      const now = new Date();
      list = list.filter(r => {
        if (!r.submittedAt) return false;
        const d = new Date(r.submittedAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      });
    }

    return list;
  }, [examResults, activeStudent, selectedSubject, timeFilter]);

  // Compute stats for current filter
  const currentStats = useMemo(() => {
    return computeParentReportStats(filteredResults);
  }, [filteredResults]);

  // Handle Download PDF
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const targetName = activeStudent ? activeStudent.name : 'كافة_الطلاب_تقرير_مجمع';
      const targetPhone = activeStudent ? activeStudent.phone : '';
      const targetGrade = activeStudent ? activeStudent.grade : 'المرحلة الثانوية والبجروت';

      await downloadParentExamReportPDF({
        studentName: targetName,
        studentPhone: targetPhone,
        studentGrade: targetGrade,
        examResults: filteredResults,
        teachers,
        students,
        customNote: customNote.trim(),
        subjectFilter: selectedSubject !== 'all' ? selectedSubject : 'كافة المواد المعتمدة',
        periodLabel: timeFilter === 'this_month' ? 'الشهر الحالي' : timeFilter === 'last_30_days' ? 'آخر 30 يوماً' : 'الفصل الدراسي الحالي',
        reportViewMode: viewMode
      });
    } catch (err) {
      console.error('Error downloading parent report PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle Direct Print
  const handlePrint = () => {
    setIsPrinting(true);
    try {
      const targetName = activeStudent ? activeStudent.name : 'كافة الطلاب - تقرير مجمع';
      const targetPhone = activeStudent ? activeStudent.phone : '';
      const targetGrade = activeStudent ? activeStudent.grade : 'المرحلة الثانوية والبجروت';

      printParentExamReport({
        studentName: targetName,
        studentPhone: targetPhone,
        studentGrade: targetGrade,
        examResults: filteredResults,
        teachers,
        students,
        customNote: customNote.trim(),
        subjectFilter: selectedSubject !== 'all' ? selectedSubject : 'كافة المواد المعتمدة',
        periodLabel: timeFilter === 'this_month' ? 'الشهر الحالي' : timeFilter === 'last_30_days' ? 'آخر 30 يوماً' : 'الفصل الدراسي الحالي',
        reportViewMode: viewMode
      });
    } catch (err) {
      console.error('Error printing parent report:', err);
    } finally {
      setTimeout(() => setIsPrinting(false), 800);
    }
  };

  // Send WhatsApp message to parent
  const handleShareWhatsApp = () => {
    if (!activeStudent || !activeStudent.phone) {
      alert('يرجى اختيار طالب محدد يتوفر له رقم هاتف مسجل لإرسال رسالة واتساب.');
      return;
    }

    const cleanPhone = activeStudent.phone.replace(/\D/g, '');
    let text = `السلام عليكم ورحمة الله وبركاته، حضرة ولي أمر الطالب(ة) المحترم(ة): ${activeStudent.name} 🌸\n\n`;
    text += `تحية طيبة من إدارة أكاديمية التفوق أون لاين،\n`;
    text += `يسرنا موافاتكم بالتقرير الأكاديمي الموجز لنتائج الاختبارات والتقييمات المنجزة:\n`;
    text += `📊 المعدل التراكمي للامتحانات: ${currentStats.averageScore}%\n`;
    text += `📝 عدد الاختبارات المنجزة: ${currentStats.totalExams}\n`;
    text += `🎯 التقييم العام للمستوى: ${currentStats.evaluationText}\n\n`;

    if (customNote.trim()) {
      text += `📌 ملاحظة الإدارة والمعلم:\n"${customNote.trim()}"\n\n`;
    }

    text += `يمكنكم مراجعة بنود التقرير والشهادات عبر بوابة الطالب. مع أطيب تمنياتنا للطالب بدوام التفوق والنجاح! ✨`;

    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Quick Seed Sample Exam Results (to allow testing when db is empty)
  const handleSeedSampleData = async () => {
    setIsSeedingSample(true);
    setSeedSuccessMsg('');
    try {
      const sampleStudent = students[0]?.name || 'أحمد خليل المصري';
      const samplePhone = students[0]?.phone || '0599123456';
      const sampleTeacher = teachers[0]?.id || '';
      const sampleTeacherName = teachers[0]?.name || 'أ. زكي أبو علان';

      const samples = [
        {
          examTitle: 'امتحان الكيمياء العضوية المتقدمة - بجروت',
          category: 'كيمياء',
          studentName: sampleStudent,
          studentPhone: samplePhone,
          score: 95,
          correctCount: 19,
          answersCount: 20,
          submittedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
          teacherId: sampleTeacher,
          teacherName: sampleTeacherName
        },
        {
          examTitle: 'اختبار التفاضل والتكامل والاقترانات المثلثية',
          category: 'رياضيات',
          studentName: sampleStudent,
          studentPhone: samplePhone,
          score: 88,
          correctCount: 22,
          answersCount: 25,
          submittedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
          teacherId: sampleTeacher,
          teacherName: sampleTeacherName
        },
        {
          examTitle: 'اختبار الفيزياء والميكانيكا وقوانين نيوتن',
          category: 'فيزياء',
          studentName: sampleStudent,
          studentPhone: samplePhone,
          score: 92,
          correctCount: 14,
          answersCount: 15,
          submittedAt: new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString(),
          teacherId: sampleTeacher,
          teacherName: sampleTeacherName
        },
        {
          examTitle: 'اختبار البيولوجيا والوراثة الجزيئية',
          category: 'بيولوجيا',
          studentName: sampleStudent,
          studentPhone: samplePhone,
          score: 85,
          correctCount: 17,
          answersCount: 20,
          submittedAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
          teacherId: sampleTeacher,
          teacherName: sampleTeacherName
        }
      ];

      for (const item of samples) {
        await addDoc(collection(db, 'examResults'), item);
      }

      setSeedSuccessMsg('تم إدراج نتائج اختبارات نموذجية بنجاح! يمكنك الآن تجربة التقرير.');
      setTimeout(() => setSeedSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error('Error seeding sample exam results:', err);
    } finally {
      setIsSeedingSample(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-[220] p-3 sm:p-5 text-right no-print" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 shadow-2xl"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-[#0D365A] to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
              <GraduationCap size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black">تحميل تقرير نتائج الاختبارات لأولياء الأمور (PDF)</h3>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-400/30">
                  إشعار معتمد لولي الأمر 👨‍👩‍👧
                </span>
              </div>
              <p className="text-[11px] text-slate-350 font-medium mt-0.5">
                توليد وثيقة أكاديمية رسمية منسقة ببيانات درجات الاختبارات الإلكترونية والتقييم الدوري جاهزة للطباعة والتنزيل المباشر
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {seedSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{seedSuccessMsg}</span>
            </div>
          )}

          {/* Filtering Controls Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
            
            {/* Student Picker */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                <Users size={13} className="text-indigo-600" />
                <span>الطالب المستهدف:</span>
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-right focus:outline-none focus:border-indigo-500 shadow-2xs"
              >
                <option value="all">👥 كافة الطلاب (تقرير شامل مجمع)</option>
                {studentsWithResults.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} {st.examsCount > 0 ? `(${st.examsCount} اختبار - معدل ${st.averageScore}%)` : '(لا توجد اختبارات)'}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Picker */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                <BookOpen size={13} className="text-[#D4A33C]" />
                <span>المادة / التصنيف:</span>
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-right focus:outline-none focus:border-indigo-500 shadow-2xs"
              >
                <option value="all">كافة المواد المتاحة</option>
                {availableSubjects.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>

            {/* Time Filter */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                <Calendar size={13} className="text-emerald-600" />
                <span>الفترة الزمنية:</span>
              </label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as any)}
                className="w-full text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-right focus:outline-none focus:border-indigo-500 shadow-2xs"
              >
                <option value="all">الفصل الدراسي كاملاً (الكل)</option>
                <option value="this_month">الشهر الحالي فقط</option>
                <option value="last_30_days">آخر 30 يوماً</option>
              </select>
            </div>

          </div>

          {/* Report Format Selection: Detailed View vs Summary View */}
          <div className="bg-gradient-to-r from-slate-900 to-[#0D365A] p-3.5 sm:p-4 rounded-2xl text-white shadow-sm border border-slate-700/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={15} className="text-amber-400" />
                <span className="text-xs font-black text-white">صيغة ونمط تقرير الـ PDF (Report View Format):</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-400/30">
                  {viewMode === 'detailed' ? 'مفصل وشامل 📑' : 'موجز - درجات وتواريخ ⚡'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                {viewMode === 'detailed' 
                  ? 'العرض التفصيلي: يتضمن كشفاً كاملاً لدرجات الاختبارات، والمشرفين، والإجابات الصحيحة، والتوصيات'
                  : 'العرض الموجز: يتضمن ملخصاً مركّزاً يعرض اسم الاختبار، وتاريخ التقديم، والدرجة فقط بدون تفاصيل الأسئلة'}
              </p>
            </div>

            <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => handleSelectViewMode('detailed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'detailed'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="العرض التفصيلي الشامل (Detailed View)"
              >
                <FileText size={13} />
                <span>العرض التفصيلي</span>
                {viewMode === 'detailed' && <Check size={12} className="stroke-[3]" />}
              </button>

              <button
                type="button"
                onClick={() => handleSelectViewMode('summary')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'summary'
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="العرض الموجز: الدرجة والتاريخ فقط (Summary View)"
              >
                <ListFilter size={13} />
                <span>العرض الموجز (الدرجة والتاريخ)</span>
                {viewMode === 'summary' && <Check size={12} className="stroke-[3]" />}
              </button>
            </div>
          </div>

          {/* Quick Notice if No Results Found */}
          {filteredResults.length === 0 ? (
            <div className="p-8 text-center bg-amber-50/60 border border-amber-200 rounded-3xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto font-black">
                <AlertCircle size={24} />
              </div>
              <div>
                <h4 className="text-sm font-black text-amber-950">لم يتم العثور على نتائج اختبارات مطابقة لهذا الاختيار</h4>
                <p className="text-xs text-amber-800/80 mt-1 max-w-md mx-auto leading-relaxed">
                  لم يسجل الطالب المختار أية تسليمات اختبارات إلكترونية بعد في الفترة المحددة.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSeedSampleData}
                  disabled={isSeedingSample}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl transition-all shadow-sm flex items-center gap-2 mx-auto cursor-pointer"
                >
                  <RefreshCw size={14} className={isSeedingSample ? 'animate-spin' : ''} />
                  <span>إدراج نتائج اختبارات نموذجية للتجربة السريعة</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Performance Metrics Cards Preview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-3.5 rounded-2xl">
                  <span className="text-[10px] font-black text-amber-800 block">المعدل التراكمي للامتحانات 🎯</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-amber-950 font-mono">{currentStats.averageScore}%</span>
                    <span className="text-[10px] text-amber-700 font-bold">من 100%</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 p-3.5 rounded-2xl">
                  <span className="text-[10px] font-black text-emerald-800 block">نسبة النجاح والاجتياز ✅</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-emerald-950 font-mono">{currentStats.passRate}%</span>
                    <span className="text-[10px] text-emerald-700 font-bold">({currentStats.passedCount}/{currentStats.totalExams})</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 p-3.5 rounded-2xl">
                  <span className="text-[10px] font-black text-indigo-800 block">إجمالي الاختبارات المنجزة 📝</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-indigo-950 font-mono">{currentStats.totalExams}</span>
                    <span className="text-[10px] text-indigo-700 font-bold">اختبارات</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 p-3.5 rounded-2xl">
                  <span className="text-[10px] font-black text-purple-800 block">درجة الامتياز (90%+) 🌟</span>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-2xl font-black text-purple-950 font-mono">{currentStats.excellentCount}</span>
                    <span className="text-[10px] text-purple-700 font-bold">اختبارات متميزة</span>
                  </div>
                </div>

              </div>

              {/* Evaluation Standing Strip */}
              <div className="p-3.5 rounded-2xl border flex items-center justify-between gap-3 text-xs" style={{ backgroundColor: currentStats.evaluationBg, borderColor: `${currentStats.evaluationColor}40` }}>
                <div className="flex items-center gap-2">
                  <Award size={18} style={{ color: currentStats.evaluationColor }} />
                  <div>
                    <span className="font-black" style={{ color: currentStats.evaluationColor }}>
                      التقييم الأكاديمي العام للمستوى: {currentStats.evaluationText}
                    </span>
                    <span className="text-slate-600 block text-[11px] font-medium mt-0.5">
                      أعلى نتيجة محققة: {currentStats.highestScore}% ({currentStats.highestExamTitle})
                    </span>
                  </div>
                </div>
                <div className="text-left shrink-0">
                  <span className="text-base font-black" style={{ color: currentStats.evaluationColor }}>
                    {currentStats.averageScore}%
                  </span>
                </div>
              </div>

              {/* Exam Results Table Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black text-slate-800 px-1">
                  <span>
                    سجل درجات الاختبارات التي ستظهر في وثيقة الـ PDF ({filteredResults.length} اختبار) - 
                    <span className="text-amber-700 mr-1">
                      {viewMode === 'detailed' ? ' نمط العرض التفصيلي الشامل' : ' نمط العرض الموجز (الدرجة والتاريخ فقط)'}
                    </span>:
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">مرتبة من الأحدث إلى الأقدم</span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs max-h-56 overflow-y-auto">
                  <table className="w-full text-xs text-right border-collapse">
                    <thead>
                      {viewMode === 'summary' ? (
                        <tr className="bg-slate-100/90 text-slate-700 text-[11px] border-b border-slate-200 font-black">
                          <th className="p-2.5 pr-3">اسم الاختبار</th>
                          <th className="p-2.5 text-center">تاريخ التقديم</th>
                          <th className="p-2.5 text-center">الدرجة</th>
                          <th className="p-2.5 text-center pl-3">التقدير</th>
                        </tr>
                      ) : (
                        <tr className="bg-slate-100/90 text-slate-700 text-[11px] border-b border-slate-200 font-black">
                          <th className="p-2.5 pr-3">اسم الاختبار</th>
                          <th className="p-2.5 text-center">المادة</th>
                          <th className="p-2.5 text-center">التاريخ</th>
                          <th className="p-2.5 text-center">الإجابات الصحيحة</th>
                          <th className="p-2.5 text-center">الدرجة</th>
                          <th className="p-2.5 text-center pl-3">التقدير</th>
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredResults.map((res, i) => {
                        const sc = Number(res.score) || 0;
                        const gradeInfo = getScoreGradeInfo(sc);

                        if (viewMode === 'summary') {
                          return (
                            <tr key={res.id || i} className="hover:bg-slate-50/60 transition-colors">
                              <td className="p-2.5 pr-3 font-bold text-slate-900">
                                <div>{res.examTitle}</div>
                                {res.studentName && selectedStudentId === 'all' && (
                                  <div className="text-[10px] text-indigo-600 font-bold">الطالب: {res.studentName}</div>
                                )}
                              </td>
                              <td className="p-2.5 text-center font-mono text-[10px] text-slate-500">
                                {res.submittedAt ? new Date(res.submittedAt).toLocaleDateString('ar-EG') : '-'}
                              </td>
                              <td className="p-2.5 text-center font-black text-slate-900 font-mono">
                                {sc}%
                              </td>
                              <td className="p-2.5 text-center pl-3">
                                <span 
                                  className="px-2 py-0.5 rounded-full text-[10px] font-black"
                                  style={{ backgroundColor: gradeInfo.bg, color: gradeInfo.color }}
                                >
                                  {gradeInfo.label}
                                </span>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr key={res.id || i} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-2.5 pr-3 font-bold text-slate-900">
                              <div>{res.examTitle}</div>
                              {res.studentName && selectedStudentId === 'all' && (
                                <div className="text-[10px] text-indigo-600 font-bold">الطالب: {res.studentName}</div>
                              )}
                            </td>
                            <td className="p-2.5 text-center">
                              <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-700">
                                {res.category || 'عام'}
                              </span>
                            </td>
                            <td className="p-2.5 text-center font-mono text-[10px] text-slate-500">
                              {res.submittedAt ? new Date(res.submittedAt).toLocaleDateString('ar-EG') : '-'}
                            </td>
                            <td className="p-2.5 text-center font-bold text-slate-800">
                              {res.correctCount || 0} / {res.answersCount || '-'}
                            </td>
                            <td className="p-2.5 text-center font-black text-slate-900 font-mono">
                              {sc}%
                            </td>
                            <td className="p-2.5 text-center pl-3">
                              <span 
                                className="px-2 py-0.5 rounded-full text-[10px] font-black"
                                style={{ backgroundColor: gradeInfo.bg, color: gradeInfo.color }}
                              >
                                {gradeInfo.label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Personalized Note to Parents */}
              <div className="space-y-1.5 bg-amber-50/50 p-4 rounded-2xl border border-amber-200/70">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-amber-600" />
                    <span>ملاحظة أو توصية تربوية خاصة لولي الأمر (تظهر بالوثيقة الرسمية):</span>
                  </label>
                  <span className="text-[10px] text-amber-700 font-bold">اختياري</span>
                </div>

                <textarea
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="مثال: يسر إدارة الأكاديمية إحاطتكم علماً بتفوق الطالب المستمر وحرصه على إتمام الاختبارات في مواعيدها مع تميز ملحوظ في مادة الكيمياء..."
                  rows={2}
                  className="w-full text-xs p-2.5 bg-white border border-amber-200 rounded-xl focus:outline-none focus:border-amber-400 font-medium text-slate-800 placeholder:text-slate-400"
                />

                {/* Quick Note Templates */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-bold text-amber-800">قوالب مقترحة:</span>
                  <button
                    type="button"
                    onClick={() => setCustomNote('نثمن حرصكم الدائم وتفوق الطالب الأكاديمي الملحوظ في جميع الاختبارات وندعوه للاستمرار على هذا النهج.')}
                    className="text-[10px] px-2 py-0.5 bg-white border border-amber-300 rounded-md text-amber-900 hover:bg-amber-100 font-bold transition-colors cursor-pointer"
                  >
                    🌟 إشادة بالتفوق والالتزام
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomNote('يُرجى مراجعة الأسئلة غير الموفقة مع المعلم المشرف وتكثيف المذاكرة المنزلية لتحقيق درجات أعلى.')}
                    className="text-[10px] px-2 py-0.5 bg-white border border-amber-300 rounded-md text-amber-900 hover:bg-amber-100 font-bold transition-colors cursor-pointer"
                  >
                    📈 دعوة للمتابعة والدعم
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomNote('مستوى جاهزية عالي ومطمئن لتقديم امتحانات البجروت الرسمية بتفوق واقتدار.')}
                    className="text-[10px] px-2 py-0.5 bg-white border border-amber-300 rounded-md text-amber-900 hover:bg-amber-100 font-bold transition-colors cursor-pointer"
                  >
                    🎓 جاهزية امتحانات البجروت
                  </button>
                </div>
              </div>
            </>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          
          <div className="flex items-center gap-2">
            {activeStudent && activeStudent.phone && (
              <button
                type="button"
                onClick={handleShareWhatsApp}
                disabled={filteredResults.length === 0}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                title="إرسال إشعار النتائج لولي الأمر مباشرة عبر واتساب"
              >
                <MessageCircle size={15} />
                <span>إرسال ملخص لواتساب ولي الأمر</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>

            <button
              type="button"
              onClick={handlePrint}
              disabled={filteredResults.length === 0 || isPrinting}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 active:scale-98 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Printer size={15} />
              <span>طباعة رسمية / معاينة</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={filteredResults.length === 0 || isDownloading}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-[#0D365A] hover:opacity-95 active:scale-98 disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              id="download-parent-report-pdf-btn"
            >
              <Download size={15} className={isDownloading ? 'animate-bounce' : ''} />
              <span>{isDownloading ? 'جاري تجهيز الـ PDF...' : 'تحميل التقرير كـ PDF 📄'}</span>
            </button>
          </div>

        </div>

      </motion.div>
    </div>
  );
};
