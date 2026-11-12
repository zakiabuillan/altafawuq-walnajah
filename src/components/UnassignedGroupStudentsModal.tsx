import React, { useState, useMemo } from 'react';
import { Student, GroupCourse, CourseStatus } from '../types';
import { 
  X, Users, Search, MessageSquare, Phone, Send, Copy, Check, 
  ExternalLink, Download, Filter, GraduationCap, CheckCircle2, 
  Sparkles, BookOpen, AlertCircle, UserPlus, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  formatWhatsAppPhone972, 
  buildWhatsAppUrl, 
  openWhatsAppChat, 
  getBestParentOrStudentPhone,
  isValid972Phone
} from '../lib/phoneUtils';
import * as XLSX from 'xlsx';

export interface UnassignedGroupStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  courses: GroupCourse[];
  onSelectStudent?: (studentId: string) => void;
  onAssignToCourse?: (studentId: string, courseId: string) => Promise<void> | void;
  managerName?: string;
}

export type WhatsAppTemplateType = 'invitation' | 'inquiry' | 'packages' | 'custom';

export const UnassignedGroupStudentsModal: React.FC<UnassignedGroupStudentsModalProps> = ({
  isOpen,
  onClose,
  students,
  courses,
  onSelectStudent,
  onAssignToCourse,
  managerName = 'أكاديمية التفوق'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<'ALL' | 'primary' | 'middle' | 'secondary'>('ALL');
  const [phoneOnlyFilter, setPhoneOnlyFilter] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplateType>('invitation');
  const [customMessage, setCustomMessage] = useState('');
  const [copiedStudentId, setCopiedStudentId] = useState<string | null>(null);
  const [selectedCourseByStudent, setSelectedCourseByStudent] = useState<Record<string, string>>({});
  const [assigningStudentId, setAssigningStudentId] = useState<string | null>(null);
  const [assignSuccessMessage, setAssignSuccessMessage] = useState<string | null>(null);

  // Compute active unassigned students (not enrolled in any group course)
  const unassignedStudents = useMemo(() => {
    return students.filter(student => {
      if (student.archived) return false;
      const isInAnyCourse = courses.some(c => {
        const inIds = Array.isArray(c.studentIds) && c.studentIds.includes(student.id);
        const isAssigned = student.assignedCourseId === c.id;
        return inIds || isAssigned;
      });
      return !isInAnyCourse;
    });
  }, [students, courses]);

  // Stage classification helper
  const getStageOfGrade = (gradeStr: string = ''): 'primary' | 'middle' | 'secondary' => {
    const g = gradeStr.toLowerCase();
    if (
      g.includes('ثانوي') || g.includes('عاشر') || g.includes('حادي') || 
      g.includes('توجيهي') || g.includes('10') || g.includes('11') || g.includes('12')
    ) {
      return 'secondary';
    }
    if (
      g.includes('خامس') || g.includes('سادس') || g.includes('سابع') || 
      g.includes('ثامن') || g.includes('تاسع') || g.includes('اعدادي') || 
      g.includes('متوسط') || g.includes('5') || g.includes('6') || 
      g.includes('7') || g.includes('8') || g.includes('9')
    ) {
      return 'middle';
    }
    return 'primary';
  };

  // Summary counts
  const summary = useMemo(() => {
    const total = unassignedStudents.length;
    let primary = 0;
    let middle = 0;
    let secondary = 0;
    let withPhone = 0;

    unassignedStudents.forEach(s => {
      const stage = getStageOfGrade(s.grade || s.academicLevel || '');
      if (stage === 'primary') primary++;
      else if (stage === 'middle') middle++;
      else secondary++;

      const phone = getBestParentOrStudentPhone(s);
      if (phone && isValid972Phone(phone)) withPhone++;
    });

    const activeTotalStudents = students.filter(s => !s.archived).length;
    const percentage = activeTotalStudents > 0 ? Math.round((total / activeTotalStudents) * 100) : 0;

    return { total, primary, middle, secondary, withPhone, percentage };
  }, [unassignedStudents, students]);

  // Filtered students list
  const filteredStudents = useMemo(() => {
    return unassignedStudents.filter(student => {
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const nameMatch = (student.name || '').toLowerCase().includes(q);
        const phoneMatch = (student.phone || '').includes(q) || (student.parentPhone || '').includes(q);
        const gradeMatch = (student.grade || student.academicLevel || '').toLowerCase().includes(q);
        if (!nameMatch && !phoneMatch && !gradeMatch) return false;
      }

      if (stageFilter !== 'ALL') {
        const stage = getStageOfGrade(student.grade || student.academicLevel || '');
        if (stage !== stageFilter) return false;
      }

      if (phoneOnlyFilter) {
        const phone = getBestParentOrStudentPhone(student);
        if (!phone || !isValid972Phone(phone)) return false;
      }

      return true;
    });
  }, [unassignedStudents, searchQuery, stageFilter, phoneOnlyFilter]);

  // Default templates text
  const defaultTemplates: Record<Exclude<WhatsAppTemplateType, 'custom'>, string> = {
    invitation: `السلام عليكم ورحمة الله وبركاته 🌸
تحية طيبة من إدارة أكاديمية التفوق،
نود إعلامكم ببدء فتح باب التسجيل وتنسيب الطلبة في دورات التقوية الجماعية المتميزة للصف ({grade}) للعام الدراسي الحالي مع نخبة من أكفأ المعلمين وبمجموعات دراسية صغيرة تضمن التركيز والفائدة الكاملة للطالب ({student_name}).
يسعدنا تواصلكم للاطلاع على المواعيد المتاحة وتأكيد الانضمام. 📚`,
    
    inquiry: `مرحباً بكم، نتواصل معكم من أكاديمية التفوق بشأن الطالب/ة ({student_name}) في ({grade}). 
حرصاً على تقديم أفضل مساندة أكاديمية، نود الاستفسار عن رغبتكم في انضمامه لإحدى دورات التقوية والمراجعة الجماعية المعتمدة لدينا لهذا الفصل. 
يرجى إفادتنا بالمواد المرغوبة لترتيب مقعده الدراسي في أقرب مجموعة مناسبة. 🌟`,
    
    packages: `أهلاً بكم في أكاديمية التفوق ✨
يسعدنا إحاطتكم بتوفر باقات دورات جماعية ميسرة وبرامج مكثفة مخصصة لطلبة ({grade}) لمراجعة المناهج وحل بنوك الأسئلة الامتحانية.
للحجز والاستفسار عن جدول الحصص الخاص بالطالب ({student_name})، يمكنكم الرد مباشرة على هذه الرسالة. 🎓`
  };

  // Build message for specific student
  const getMessageForStudent = (student: Student): string => {
    const rawTemplate = selectedTemplate === 'custom' 
      ? (customMessage || defaultTemplates.invitation)
      : defaultTemplates[selectedTemplate];

    const studentName = student.name || 'عزيزنا الطالب';
    const grade = student.grade || student.academicLevel || 'المرحلة الدراسية';

    return rawTemplate
      .replace(/{student_name}/g, studentName)
      .replace(/{grade}/g, grade)
      .replace(/{manager_name}/g, managerName);
  };

  // Handle WhatsApp messaging
  const handleOpenWhatsApp = (student: Student) => {
    const phone = getBestParentOrStudentPhone(student);
    if (!phone) {
      alert(`لا يوجد رقم هاتف مسجل للطالب (${student.name}).`);
      return;
    }
    const message = getMessageForStudent(student);
    const url = buildWhatsAppUrl(phone, message);
    if (url) {
      window.open(url, '_blank');
    }
  };

  // Handle Copy Message
  const handleCopyMessage = async (student: Student) => {
    const message = getMessageForStudent(student);
    try {
      await navigator.clipboard.writeText(message);
      setCopiedStudentId(student.id);
      setTimeout(() => setCopiedStudentId(null), 2500);
    } catch {
      // fallback
    }
  };

  // Handle Export to Excel
  const handleExportExcel = () => {
    if (filteredStudents.length === 0) {
      alert('لا توجد بيانات طلاب للتصدير.');
      return;
    }

    const data = filteredStudents.map((s, idx) => ({
      'الرقم': idx + 1,
      'اسم الطالب': s.name,
      'الصف الدراسي': s.grade || s.academicLevel || 'غير محدد',
      'المرحلة': getStageOfGrade(s.grade || s.academicLevel || '') === 'secondary' ? 'ثانوي' : getStageOfGrade(s.grade || s.academicLevel || '') === 'middle' ? 'إعدادي' : 'أساسي',
      'رقم هاتف الطالب': s.phone || '',
      'رقم هاتف ولي الأمر': s.parentPhone || '',
      'الرقم المستخدم للواتساب': formatWhatsAppPhone972(getBestParentOrStudentPhone(s)),
      'الرصيد المالي': `${s.balance || 0} ₪`,
      'تاريخ التسجيل': s.registrationDate || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'الطلاب غير المنسبين');
    XLSX.writeFile(workbook, `الطلاب_غير_المنسبين_لدورات_جماعية_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Available open group courses with vacant seats
  const availableCourses = useMemo(() => {
    return courses.filter(c => {
      const isFinished = c.status === CourseStatus.Finished || (c.completedHours >= c.totalHours && c.totalHours > 0);
      return !isFinished;
    });
  }, [courses]);

  // Handle direct assignment if onAssignToCourse is available
  const handleDirectAssign = async (student: Student) => {
    const courseId = selectedCourseByStudent[student.id];
    if (!courseId) {
      alert('يرجى اختيار الدورة المراد تنسيب الطالب إليها أولاً.');
      return;
    }
    if (!onAssignToCourse) return;

    const targetCourse = courses.find(c => c.id === courseId);
    if (!targetCourse) return;

    if (!confirm(`هل أنت متأكد من تنسيب الطالب (${student.name}) إلى دورة "${targetCourse.title}" فوراً؟`)) {
      return;
    }

    try {
      setAssigningStudentId(student.id);
      await onAssignToCourse(student.id, courseId);
      setAssignSuccessMessage(`تم تنسيب الطالب (${student.name}) إلى الدورة بنجاح.`);
      setTimeout(() => setAssignSuccessMessage(null), 3500);
    } catch (err: any) {
      alert(`حدث خطأ أثناء التنسيب: ${err?.message || err}`);
    } finally {
      setAssigningStudentId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 text-right overflow-y-auto" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="bg-white rounded-[2.5rem] max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 shadow-2xl relative my-auto font-sans"
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-amber-500 via-[#D4A33C] to-indigo-700 p-5 text-white flex items-center justify-between shrink-0 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
              <Users size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight">ملخص الطلاب غير المنسبين لأي دورة جماعية</h3>
                <span className="bg-white/20 text-white border border-white/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {unassignedStudents.length} طالب
                </span>
              </div>
              <p className="text-[11px] text-white/90 font-semibold mt-0.5">
                متابعة الطلاب المسجلين بالمنصة ولم يُنسبوا لدورات جماعية بعد، مع إمكانية مراسلتهم فوراً عبر واتساب
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 border border-white/20 relative z-10"
            title="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Success Banner */}
          {assignSuccessMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-black flex items-center gap-2 shadow-sm animate-in fade-in">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{assignSuccessMessage}</span>
            </div>
          )}

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/80 p-3.5 rounded-2xl">
              <div className="text-[10px] text-amber-800 font-bold">إجمالي غير المنسبين</div>
              <div className="text-xl sm:text-2xl font-black text-amber-950 mt-1 font-mono">
                {summary.total}
                <span className="text-xs font-normal text-amber-700 mr-1.5 font-sans">({summary.percentage}% من الطلاب)</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
              <div className="text-[10px] text-slate-500 font-bold">المرحلة الثانوية (10 - 12)</div>
              <div className="text-xl sm:text-2xl font-black text-slate-800 mt-1 font-mono">
                {summary.secondary}
                <span className="text-xs font-normal text-slate-500 mr-1.5 font-sans">طالب</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
              <div className="text-[10px] text-slate-500 font-bold">المرحلة الإعدادية (5 - 9)</div>
              <div className="text-xl sm:text-2xl font-black text-slate-800 mt-1 font-mono">
                {summary.middle}
                <span className="text-xs font-normal text-slate-500 mr-1.5 font-sans">طالب</span>
              </div>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-2xl">
              <div className="text-[10px] text-emerald-800 font-bold">جاهزون للمراسلة (واتساب)</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-950 mt-1 font-mono">
                {summary.withPhone}
                <span className="text-xs font-normal text-emerald-700 mr-1.5 font-sans">برقم صحيح</span>
              </div>
            </div>
          </div>

          {/* WhatsApp Template Customizer Card */}
          <div className="bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-indigo-500/5 border border-emerald-500/20 p-4 sm:p-5 rounded-3xl space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  💬
                </span>
                <h4 className="text-xs font-black text-slate-900">قالب رسالة الواتساب الموجهة للطلاب / أولياء الأمور</h4>
              </div>

              {/* Template selector chips */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate('invitation')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    selectedTemplate === 'invitation'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  دعوة لدورات التقوية 📢
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTemplate('inquiry')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    selectedTemplate === 'inquiry'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  استفسار عن الرغبة ❓
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTemplate('packages')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    selectedTemplate === 'packages'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  باقات وعروض التفوق 🌟
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTemplate('custom');
                    if (!customMessage) setCustomMessage(defaultTemplates.invitation);
                  }}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    selectedTemplate === 'custom'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  تعديل نص مخصص ✏️
                </button>
              </div>
            </div>

            {selectedTemplate === 'custom' ? (
              <div className="space-y-1.5">
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={3}
                  className="w-full text-xs p-3 border border-emerald-300 rounded-2xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
                  placeholder="اكتب نص الرسالة هنا... استخدم {student_name} لاسم الطالب، و {grade} للصف الدراسي"
                />
                <div className="text-[10px] text-slate-500 font-bold flex gap-3">
                  <span>المتغيرات المتاحة:</span>
                  <code className="text-emerald-700 bg-emerald-50 px-1 rounded">{'{student_name}'}</code>
                  <code className="text-emerald-700 bg-emerald-50 px-1 rounded">{'{grade}'}</code>
                  <code className="text-emerald-700 bg-emerald-50 px-1 rounded">{'{manager_name}'}</code>
                </div>
              </div>
            ) : (
              <div className="bg-white/90 border border-emerald-200/80 p-3 rounded-2xl text-[11px] text-slate-700 leading-relaxed font-sans shadow-2xs whitespace-pre-line">
                {defaultTemplates[selectedTemplate]}
              </div>
            )}
          </div>

          {/* Search, Filters, and Export Toolbar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex-1 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث بالاسم، رقم الهاتف، أو الصف..."
                  className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-amber-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    مسح
                  </button>
                )}
              </div>

              {/* Stage Filter */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setStageFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    stageFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  الكل ({unassignedStudents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStageFilter('secondary')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    stageFilter === 'secondary' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ثانوي
                </button>
                <button
                  type="button"
                  onClick={() => setStageFilter('middle')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    stageFilter === 'middle' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  إعدادي
                </button>
                <button
                  type="button"
                  onClick={() => setStageFilter('primary')}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    stageFilter === 'primary' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  أساسي
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-auto">
              {/* Phone only toggle */}
              <button
                type="button"
                onClick={() => setPhoneOnlyFilter(!phoneOnlyFilter)}
                className={`px-3 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  phoneOnlyFilter
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Phone size={13} />
                <span>برقم هاتف فقط</span>
              </button>

              {/* Export to Excel Button */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="تصدير قائمة الطلاب غير المنسبين إلى ملف إكسل"
              >
                <Download size={14} />
                <span>تصدير Excel</span>
              </button>
            </div>
          </div>

          {/* Students List Table / Cards */}
          <div className="space-y-2.5">
            {filteredStudents.length === 0 ? (
              <div className="p-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl space-y-2">
                <Users size={36} className="mx-auto text-slate-300" />
                <p className="text-sm font-black text-slate-600">لا يوجد طلاب غير منسبين يطابقون خيارات البحث</p>
                <p className="text-xs text-slate-400 font-bold">جرب تغيير شروط التصفية أو إلغاء البحث</p>
              </div>
            ) : (
              filteredStudents.map((student) => {
                const phone = getBestParentOrStudentPhone(student);
                const hasValidPhone = phone && isValid972Phone(phone);
                const formattedPhone = formatWhatsAppPhone972(phone);
                const stage = getStageOfGrade(student.grade || student.academicLevel || '');
                const isCopied = copiedStudentId === student.id;
                const isAssigning = assigningStudentId === student.id;

                return (
                  <div 
                    key={student.id}
                    className="p-4 bg-white hover:bg-slate-50/80 border border-slate-200/90 rounded-2xl transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs hover:shadow-xs"
                  >
                    {/* Student Info */}
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 border border-amber-500/20 flex items-center justify-center font-black text-sm shrink-0">
                        {student.name ? student.name.charAt(0) : 'ط'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-xs sm:text-sm font-black text-slate-900">{student.name}</h5>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            stage === 'secondary'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : stage === 'middle'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {student.grade || student.academicLevel || 'غير محدد'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-bold mt-1">
                          <span className="flex items-center gap-1 font-mono text-slate-600">
                            <Phone size={11} className="text-slate-400" />
                            {phone ? formattedPhone || phone : 'لا يوجد هاتف'}
                          </span>

                          {student.balance !== undefined && (
                            <span className="text-[10px] text-slate-400">
                              الرصيد: <strong className="text-slate-700 font-mono">{student.balance} ₪</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions: Direct WhatsApp & Course Assignment */}
                    <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
                      {/* Course Quick Assignment dropdown if available */}
                      {onAssignToCourse && availableCourses.length > 0 && (
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                          <select
                            value={selectedCourseByStudent[student.id] || ''}
                            onChange={(e) => setSelectedCourseByStudent(prev => ({
                              ...prev,
                              [student.id]: e.target.value
                            }))}
                            className="bg-white border border-slate-200 rounded-lg text-[10px] font-bold py-1 px-2 text-slate-700 focus:outline-none focus:border-amber-500 max-w-[130px] truncate"
                          >
                            <option value="">اختر دورة للتنسيب...</option>
                            {availableCourses.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.title} ({c.instructor || 'بدون معلم'})
                              </option>
                            ))}
                          </select>

                          {selectedCourseByStudent[student.id] && (
                            <button
                              type="button"
                              onClick={() => handleDirectAssign(student)}
                              disabled={isAssigning}
                              className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
                              title="تنسيب الطالب في هذه الدورة الآن"
                            >
                              {isAssigning ? <RefreshCw size={11} className="animate-spin" /> : <UserPlus size={11} />}
                              <span>تنسيب</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Copy WhatsApp Message Button */}
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(student)}
                        className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                          isCopied
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                        title="نسخ نص الرسالة المخصصة للحافظة"
                      >
                        {isCopied ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
                      </button>

                      {/* Direct WhatsApp Messaging Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenWhatsApp(student)}
                        disabled={!hasValidPhone}
                        className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer select-none ${
                          hasValidPhone
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                        }`}
                        title={hasValidPhone ? 'فتح محادثة واتساب وإرسال الرسالة فوراً' : 'لا يتوفر رقم هاتف صالح'}
                      >
                        <MessageSquare size={14} />
                        <span>مراسلة واتساب</span>
                      </button>

                      {/* View Student Profile Button */}
                      {onSelectStudent && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onSelectStudent(student.id);
                          }}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                          title="عرض ملف الطالب الكامل"
                        >
                          <ExternalLink size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-bold shrink-0">
          <div>
            يتم احتساب الطلاب غير المنسبين تلقائياً بمطابقة سجلات الدورات الجماعية النشطة بالأكاديمية.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold transition-all cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default UnassignedGroupStudentsModal;
