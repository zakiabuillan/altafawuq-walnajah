import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Calendar, MessageSquare, UserCheck, ArrowLeft, X, BookOpen, Clock, Phone } from 'lucide-react';
import { Student } from '../types';
import { getWhatsAppApiNumber } from '../lib/phoneUtils';

export interface WelcomeNewStudentsCardProps {
  recentlyAssigned?: {
    student: Student;
    notification?: any;
  }[];
  recentStudents?: {
    student: Student;
    notification?: any;
  }[];
  onOpenStudentProfile?: (student: Student, notification?: any) => void;
  onOpenProfile?: (student: Student, notification?: any) => void;
  onLogSessionForStudent?: (student: Student) => void;
  teacherName?: string;
  onDismiss?: () => void;
}

export const WelcomeNewStudentsCard: React.FC<WelcomeNewStudentsCardProps> = ({
  recentlyAssigned,
  recentStudents,
  onOpenStudentProfile,
  onOpenProfile,
  onLogSessionForStudent,
  teacherName = 'معلمك',
  onDismiss
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const studentList = recentlyAssigned || recentStudents || [];

  if (isDismissed || !studentList || studentList.length === 0) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleOpen = (student: Student, notification?: any) => {
    if (onOpenStudentProfile) {
      onOpenStudentProfile(student, notification);
    } else if (onOpenProfile) {
      onOpenProfile(student, notification);
    }
  };

  const handleWhatsApp = (student: Student) => {
    const rawPhone = student.phone || student.email || '';
    const apiPhone = getWhatsAppApiNumber(rawPhone);
    if (!apiPhone) {
      alert('لا يتوفر رقم هاتف مسجل لهذا الطالب.');
      return;
    }

    const greeting = encodeURIComponent(
      `مرحباً يا ${student.name || 'طالبي العزيز'}، أنا أستاذك ${teacherName} في منصة التفوق أون لاين 🎓\nتم إسنادك إلى صفي التعليمي، وأنا سعيد جداً ببدء رحلتنا الدراسية معاً! يمكنك التواصل معي هنا لترتيب مواعيد الحصص القادمة.`
    );
    window.open(`https://wa.me/${apiPhone}?text=${greeting}`, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-indigo-950/20 border border-indigo-700/40 relative overflow-hidden text-right"
      dir="rtl"
      id="teacher-welcome-new-students-banner"
    >
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* Header */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-indigo-800/60 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shadow-amber-500/30 shrink-0">
            <Sparkles size={22} className="stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black border border-amber-400/30">
                إسناد جديد ⚡
              </span>
              <span className="text-xs text-indigo-200 font-bold">
                {studentList.length} {studentList.length === 1 ? 'طالب جديد' : 'طلاب جدد'}
              </span>
            </div>
            <h2 className="text-lg font-black text-white mt-1">
              طلاب جدد تم إسنادهم إليك مؤخراً 🎉
            </h2>
            <p className="text-xs text-indigo-200/90 font-medium mt-0.5">
              أهلاً بطلابك الجدد في مسيرتك التدريسية! يمكنك الاطلاع على ملفاتهم الأكاديمية والتواصل معهم فوراً.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handleDismiss}
            className="p-2 text-indigo-300 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
            title="إخفاء البطاقة مؤقتاً"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Grid of Recently Assigned Students */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 mt-5">
        {studentList.map(({ student, notification }) => {
          if (!student) return null;
          const subject = notification?.subject || 'عام';
          const grade = student.grade || student.academicLevel || notification?.studentGrade || 'غير محدد';
          const assignedAt = notification?.assignedAt || notification?.date || student.registrationDate || 'مؤخراً';
          const isTransfer = notification?.type === 'student_transfer_in' || !!notification?.previousTeacherName;
          const prevTeacher = notification?.previousTeacherName;

          return (
            <div
              key={student.id}
              className="bg-white/10 hover:bg-white/15 border border-white/10 hover:border-amber-400/40 rounded-2xl p-4 transition-all flex flex-col justify-between gap-3 group backdrop-blur-sm shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-md">
                      {student.name?.charAt(0) || 'ط'}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                        {student.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[10px] text-indigo-200 mt-0.5">
                        <span className="font-bold">{grade}</span>
                        <span>•</span>
                        <span className="text-amber-300 font-bold">{subject}</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[9px] text-indigo-300 font-medium px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                    {assignedAt}
                  </span>
                </div>

                {isTransfer && (
                  <div className="mb-2 px-2.5 py-1 bg-amber-500/20 border border-amber-400/30 rounded-lg text-[10px] text-amber-200 font-bold flex items-center gap-1.5">
                    <span>🔄</span>
                    <span>منقول من المعلم: {prevTeacher || 'معلم سابق'}</span>
                  </div>
                )}

                {student.notes && (
                  <p className="text-[10px] text-indigo-200/80 line-clamp-2 bg-black/20 p-2 rounded-xl mb-2">
                    {student.notes}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => handleOpen(student, notification)}
                  className="px-2 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer"
                  title="عرض الملف الأكاديمي الشامل للطالب"
                >
                  <UserCheck size={12} className="text-amber-300" />
                  <span>الملف</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleWhatsApp(student)}
                  className="px-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                  title="إرسال رسالة ترحيبية عبر واتساب"
                >
                  <MessageSquare size={12} />
                  <span>واتساب 💬</span>
                </button>

                <button
                  type="button"
                  onClick={() => onLogSessionForStudent?.(student)}
                  className="px-2 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                  title="تسجيل أول حصة فوراً لهذا الطالب"
                >
                  <Calendar size={12} />
                  <span>تسجيل ⚡</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

