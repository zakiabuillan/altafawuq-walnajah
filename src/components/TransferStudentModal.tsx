import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowLeftRight, UserCheck, School, BookOpen, AlertTriangle, Send, Sparkles } from 'lucide-react';
import { Student, Teacher } from '../types';

interface TransferStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  teachers: Teacher[];
  sourceTeacherId: string;
  targetTeacherId: string;
  subject: string;
  notes: string;
  isLoading: boolean;
  onSourceTeacherChange: (id: string) => void;
  onTargetTeacherChange: (id: string) => void;
  onSubjectChange: (sub: string) => void;
  onNotesChange: (notes: string) => void;
  onSubmit: () => Promise<void>;
}

export const TransferStudentModal: React.FC<TransferStudentModalProps> = ({
  isOpen,
  onClose,
  student,
  teachers,
  sourceTeacherId,
  targetTeacherId,
  subject,
  notes,
  isLoading,
  onSourceTeacherChange,
  onTargetTeacherChange,
  onSubjectChange,
  onNotesChange,
  onSubmit
}) => {
  if (!isOpen || !student) return null;

  const currentTeacherIds = student.teachers || [];
  const sourceTeacher = teachers.find(t => t.id === sourceTeacherId);
  const targetTeacher = teachers.find(t => t.id === targetTeacherId);

  // Filter available target teachers (exclude source teacher)
  const availableTargetTeachers = teachers.filter(t => t.id !== sourceTeacherId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTeacherId) {
      alert('يرجى اختيار المعلم الجديد المراد ترحيل الطالب إليه.');
      return;
    }
    await onSubmit();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md overflow-y-auto" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white w-full max-w-lg rounded-3xl sm:rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden relative text-right my-auto"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 p-6 text-slate-950 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none -ml-12 -mt-12" />
            
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shadow-black/10 shrink-0">
                  <ArrowLeftRight size={22} className="stroke-[2.5] text-amber-600" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-black/15 text-slate-950 text-[10px] font-black">
                    نظام الترحيل والإسناد الفوري ⚡
                  </span>
                  <h2 className="text-lg font-black text-slate-950 mt-1">
                    ترحيل / نقل طالب لمعلم آخر
                  </h2>
                  <p className="text-xs text-slate-900 font-medium">
                    الطالب: <strong className="font-black">{student.name}</strong> ({student.grade || student.academicLevel || 'غير محدد'})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="p-2 text-slate-900 hover:text-white hover:bg-black/10 rounded-xl transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Source Teacher */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                المعلم الحالي (المراد النقل منه):
              </label>
              {currentTeacherIds.length > 1 ? (
                <select
                  value={sourceTeacherId}
                  onChange={(e) => onSourceTeacherChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  disabled={isLoading}
                >
                  <option value="">-- اختر المعلم الحالي المراد سحب الطالب منه --</option>
                  {currentTeacherIds.map(tId => {
                    const t = teachers.find(item => item.id === tId);
                    return (
                      <option key={tId} value={tId}>
                        {t?.name || tId}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>{sourceTeacher ? `👨‍🏫 ${sourceTeacher.name}` : 'لا يوجد معلم حالي محدد (إسناد جديد)'}</span>
                  <span className="text-[10px] text-slate-400 font-medium">المعلم الأصلي</span>
                </div>
              )}
            </div>

            {/* Target Teacher */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                المعلم الجديد (المراد ترحيل الطالب إليه) <span className="text-rose-500">*</span>:
              </label>
              <select
                value={targetTeacherId}
                onChange={(e) => onTargetTeacherChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                disabled={isLoading}
                required
              >
                <option value="">-- اختر المعلم الجديد --</option>
                {availableTargetTeachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.specialization ? `(${t.specialization})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                المادة الدراسية:
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => onSubjectChange(e.target.value)}
                placeholder="مثال: الرياضيات، الفيزياء، اللغة الإنجليزية..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                disabled={isLoading}
              />
            </div>

            {/* Notes / Reason */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                ملاحظات أو سبب الترحيل (اختياري، تظهر للمعلم في الإشعار):
              </label>
              <textarea
                value={notes}
                onChange={(e) => onNotesChange(e.target.value)}
                rows={2}
                placeholder="مثال: تم الترحيل بناء على رغبة ولي الأمر لملاءمة جدول المواعيد..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                disabled={isLoading}
              />
            </div>

            {/* Information Notice */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-[11px] text-amber-900 leading-relaxed font-medium space-y-1">
              <div className="flex items-center gap-1.5 font-black text-amber-950">
                <Sparkles size={13} className="text-amber-600" />
                <span>ماذا سيحدث بعد تأكيد الترحيل؟</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-slate-700 text-[10px]">
                <li>إرسال إشعار فوري للمعلم الجديد بتنسيب الطالب إليه وتحديث عداد إشعاراته.</li>
                {sourceTeacher && <li>إرسال إشعار فوري للمعلم السابق بإلغاء التنسيب ونقل الطالب.</li>}
                <li>تحديث عداد قائمة الطلاب لكل معلم بصورة تلقائية وفورية.</li>
                <li>توثيق عملية النقل تلقائياً في سجل تدقيق النشاطات الإدارية العام.</li>
              </ul>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-150">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={isLoading || !targetTeacherId}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
              >
                {isLoading ? (
                  <span>جاري تنفيذ الترحيل وإرسال الإشعارات...</span>
                ) : (
                  <>
                    <Send size={13} />
                    <span>تأكيد الترحيل والإشعار الفوري 🚀</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
