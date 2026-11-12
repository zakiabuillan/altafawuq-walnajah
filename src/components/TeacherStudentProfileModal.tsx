import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, User, Phone, BookOpen, Clock, Calendar, CheckCircle2, 
  AlertCircle, MessageSquare, Sparkles, GraduationCap, 
  ShieldCheck, AlertTriangle
} from 'lucide-react';
import { Student, Teacher, Session, StudentCredit, isTrialSession } from '../types';
import { getWhatsAppApiNumber } from '../lib/phoneUtils';
import { getAcademicStage } from '../lib/sessionPricing';

interface TeacherStudentProfileModalProps {
  isOpen?: boolean;
  student: Student | null;
  notification?: any;
  notificationMeta?: any;
  teacherName?: string;
  loggedInTeacher?: Teacher;
  sessions?: Session[];
  credits?: StudentCredit[];
  teachers?: Teacher[];
  remainingSessions?: number;
  remainingHours?: number;
  completedSessionsCount?: number;
  onClose: () => void;
  onLogSession?: (student: Student) => void;
  onLogSessionForStudent?: (studentId: string) => void;
  onBookSession?: (student: Student) => void;
  onViewInFullList?: (student: Student) => void;
  onOpenBalanceChecker?: (studentId: string) => void;
}

export const TeacherStudentProfileModal: React.FC<TeacherStudentProfileModalProps> = ({
  isOpen = true,
  student,
  notification,
  notificationMeta,
  teacherName,
  loggedInTeacher,
  sessions = [],
  credits = [],
  teachers = [],
  remainingSessions: propRemainingSessions,
  remainingHours: propRemainingHours,
  completedSessionsCount: propCompletedSessionsCount,
  onClose,
  onLogSession,
  onLogSessionForStudent,
  onBookSession,
  onViewInFullList,
  onOpenBalanceChecker
}) => {
  if (isOpen === false || !student) return null;

  const activeNotification = notificationMeta || notification;
  const effectiveTeacherName = teacherName || loggedInTeacher?.name || 'أستاذك المعتمد';

  const grade = student.grade || student.academicLevel || activeNotification?.studentGrade || 'غير محدد';
  const stStage = getAcademicStage(grade);
  const isSession40 = (stStage !== 'secondary' && stStage !== 'middle') && (student.preferredPricingUnit === 'session_40' || student.sessionSystem === 'session_40');
  const subject = activeNotification?.subject || 'عام';
  const assignedAt = activeNotification?.assignedAt || activeNotification?.date || student.registrationDate || 'مؤخراً';
  const isTransfer = activeNotification?.type === 'student_transfer_in' || !!activeNotification?.previousTeacherName;
  const prevTeacher = activeNotification?.previousTeacherName;

  const rawPhone = student.phone || student.email || '';
  const apiPhone = getWhatsAppApiNumber(rawPhone);

  // Calculate real-time balance if not explicitly provided
  const { computedHours, computedSessions, completedCount } = useMemo(() => {
    const studentSessions = sessions.filter(s => 
      s.studentId === student.id || (Array.isArray(s.studentIds) && s.studentIds.includes(student.id))
    );

    // Completed sessions with this teacher
    const myTeacherSessions = loggedInTeacher 
      ? studentSessions.filter(s => s.teacherId === loggedInTeacher.id && s.approved !== false)
      : studentSessions.filter(s => s.approved !== false);
    const countCompleted = propCompletedSessionsCount !== undefined 
      ? propCompletedSessionsCount 
      : myTeacherSessions.length;

    if (propRemainingHours !== undefined && propRemainingSessions !== undefined) {
      return {
        computedHours: propRemainingHours,
        computedSessions: propRemainingSessions,
        completedCount: countCompleted
      };
    }

    const studentCredits = credits.filter(c => c.studentId === student.id);
    const totalSpent = studentSessions.reduce((sum, s) => {
      if (s.status === 'pending' || s.status === 'booked' || s.approved === false) return sum;
      if (isTrialSession(s)) return sum;
      if (s.isGroupSession || s.isGroup) {
        if (s.customFee !== undefined && s.customFee > 0) return sum + s.customFee;
        return sum;
      }
      if (s.customFee !== undefined) return sum + s.customFee;
      const t = teachers.find(teacher => teacher.id === s.teacherId);
      const rate = (student.hourlyRate ? student.hourlyRate : (student.customRates?.[s.teacherId] || (t?.billingRate || t?.hourlyRate || 0)));
      return sum + (s.durationHours * rate);
    }, 0);

    const totalToppedUp = studentCredits.reduce((sum, c) => sum + (c.amount || 0), 0);
    const balance = totalToppedUp - totalSpent;

    const teacherId = loggedInTeacher?.id || '';
    const rate = (student.hourlyRate ? student.hourlyRate : (student.customRates?.[teacherId] || (loggedInTeacher?.billingRate || loggedInTeacher?.hourlyRate || 0)));

    let calcHours = 0;
    let calcSessions = 0;

    if (rate > 0) {
      calcHours = Math.max(0, balance / rate);
      const sessionCost = isSession40 ? rate * (40 / 60) : rate;
      calcSessions = Math.max(0, Math.floor(balance / sessionCost));
    }

    return {
      computedHours: propRemainingHours !== undefined ? propRemainingHours : calcHours,
      computedSessions: propRemainingSessions !== undefined ? propRemainingSessions : calcSessions,
      completedCount: countCompleted
    };
  }, [student, sessions, credits, loggedInTeacher, teachers, isSession40, propRemainingHours, propRemainingSessions, propCompletedSessionsCount]);

  const hasSufficientBalance = student.isOpenBalance || (isSession40 ? computedSessions > 0 : computedHours > 0);
  const isDepleted = !student.isOpenBalance && computedHours <= 0;
  const isLow = !student.isOpenBalance && computedSessions > 0 && computedSessions <= 2;

  const handleWhatsApp = () => {
    if (!apiPhone) {
      return;
    }
    const greeting = encodeURIComponent(
      `مرحباً يا ${student.name}، أنا أستاذك ${effectiveTeacherName} في أكاديمية التفوق 🎓\nأنا بانتظارك في الحصص القادمة، ويمكنك التواصل معي هنا في أي وقت لأي استفسار أو لترتيب الحصص.`
    );
    window.open(`https://wa.me/${apiPhone}?text=${greeting}`, '_blank');
  };

  const handleTriggerLog = () => {
    if (onLogSessionForStudent) {
      onLogSessionForStudent(student.id);
    } else if (onLogSession) {
      onLogSession(student);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-md overflow-y-auto" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.25 }}
          className="bg-white w-full max-w-xl rounded-3xl sm:rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden relative text-right flex flex-col my-auto"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-60 h-60 bg-amber-400/10 rounded-full blur-2xl pointer-events-none -ml-16 -mt-16" />
            
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shadow-amber-500/30 shrink-0">
                  {student.name.charAt(0) || 'ط'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black border border-amber-400/30">
                      ملف الطالب الأكاديمي 🎓
                    </span>
                    <span className="text-xs text-indigo-200 font-bold">
                      {student.academicStatus === 'Paused' ? 'موقوف مؤقتاً' : 'نشط'}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white mt-1">
                    {student.name}
                  </h2>
                  <p className="text-xs text-indigo-200 mt-0.5 font-bold">
                    الصف / المرحلة: {grade} • المادة: {subject}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Body Info */}
          <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-200px)] custom-scrollbar">
            {/* Transfer banner if student was migrated */}
            {isTransfer && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-bold flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-black">
                  🔄
                </div>
                <div>
                  <p className="font-black text-amber-950">طالب منقول / مرحل إلى قائمتك</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    تم نقل متابعة هذا الطالب إليك من المعلم السابق: <strong className="font-black text-amber-950">{prevTeacher || 'المعلم السابق'}</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Quick Metrics Grid: Remaining Hours, Remaining Sessions, Completed */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: Remaining Hours - HIGHLIGHTED */}
              <div className={`p-4 rounded-2xl border text-right transition-all ${
                student.isOpenBalance
                  ? 'bg-emerald-50/80 border-emerald-300'
                  : isDepleted 
                  ? 'bg-rose-50/80 border-rose-300' 
                  : isLow 
                  ? 'bg-amber-50/80 border-amber-300' 
                  : 'bg-indigo-50/80 border-indigo-200'
              }`}>
                <div className="flex items-center gap-1.5 text-slate-600 text-[10px] font-black">
                  <Clock size={14} className={student.isOpenBalance ? 'text-emerald-600' : isDepleted ? 'text-rose-600' : 'text-indigo-600'} />
                  <span>الساعات المتبقية ⏱️</span>
                </div>
                <div className="mt-1.5">
                  <span className={`text-xl font-black font-sans ${
                    student.isOpenBalance ? 'text-emerald-700' : isDepleted ? 'text-rose-700' : isLow ? 'text-amber-700' : 'text-indigo-700'
                  }`}>
                    {student.isOpenBalance ? 'رصيد مفتوح من المدير 🔓' : `${computedHours.toFixed(1)} س`}
                  </span>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                    {student.isOpenBalance ? 'معتمد للرصد والتدريس دون قيود' : 'ساعة تدريسية متاحة'}
                  </p>
                </div>
              </div>

              {/* Card 2: Remaining Sessions */}
              <div className={`p-4 rounded-2xl border text-right transition-all ${
                student.isOpenBalance
                  ? 'bg-emerald-50/70 border-emerald-300'
                  : hasSufficientBalance 
                  ? 'bg-emerald-50/70 border-emerald-200' 
                  : 'bg-rose-50/70 border-rose-200'
              }`}>
                <div className="flex items-center gap-1.5 text-slate-600 text-[10px] font-black">
                  <GraduationCap size={14} className={student.isOpenBalance || hasSufficientBalance ? 'text-emerald-600' : 'text-rose-600'} />
                  <span>الحصص المتبقية 🎓</span>
                </div>
                <div className="mt-1.5">
                  <span className={`text-xl font-black font-sans ${
                    student.isOpenBalance || hasSufficientBalance ? 'text-emerald-700' : 'text-rose-700'
                  }`}>
                    {student.isOpenBalance ? 'رصيد مفتوح من المدير' : `${computedSessions} حصص`}
                  </span>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                    {student.isOpenBalance ? 'مسموح بالرصد الكامل' : isSession40 ? 'نظام حصص 40 دقيقة' : 'نظام حصص الساعات'}
                  </p>
                </div>
              </div>

              {/* Card 3: Completed Sessions */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 text-right">
                <div className="flex items-center gap-1.5 text-slate-600 text-[10px] font-black">
                  <CheckCircle2 size={13} className="text-teal-600" />
                  <span>الحصص المنجزة</span>
                </div>
                <div className="mt-1.5">
                  <span className="text-2xl font-black font-mono text-slate-900">
                    {completedCount}
                  </span>
                  <span className="text-xs font-bold text-slate-500 mr-1">حصة</span>
                  <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                    مع حسابك التعليمي
                  </p>
                </div>
              </div>
            </div>

            {/* Balance Status Banner */}
            <div className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
              student.isOpenBalance
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs'
                : isDepleted
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : isLow
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <div className="flex items-center gap-2">
                {student.isOpenBalance ? (
                  <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                ) : isDepleted ? (
                  <AlertCircle size={16} className="text-rose-600 shrink-0 animate-pulse" />
                ) : isLow ? (
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                ) : (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                )}
                <div>
                  <span className="font-black text-xs">
                    {student.isOpenBalance
                      ? 'رصيد مفتوح من المدير 🔓 (مسموح بالرصد والتسجيل دون قيود)'
                      : isDepleted
                      ? 'تنبيه: رصيد الطالب نافذ (0 ساعة متبقية)'
                      : isLow
                      ? `تنبيه: اقتراب نفاد الرصيد (${computedHours.toFixed(1)} س / ${computedSessions} حصص)`
                      : `رصيد كافٍ ومتاح (${computedHours.toFixed(1)} ساعة متبقية)`}
                  </span>
                  <p className="text-[10px] opacity-80 mt-0.5 font-bold">
                    {student.isOpenBalance
                      ? 'اختار مدير المنصة أن يكون رصيد هذا الطالب مفتوحاً، ولا يُعتبر رصيداً حرجاً.'
                      : isDepleted
                      ? 'يرجى التنسيق اللطيف مع ولي الأمر لتجديد الباقة.'
                      : 'يمكنك جدولة وتسجيل الحصص بشكل طبيعي.'}
                  </p>
                </div>
              </div>

              {onOpenBalanceChecker && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenBalanceChecker(student.id);
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-black text-[10px] text-slate-800 transition-all cursor-pointer shrink-0 shadow-2xs flex items-center gap-1"
                >
                  <Clock size={11} className="text-indigo-600" />
                  <span>فاحص الرصيد 🔍</span>
                </button>
              )}
            </div>

            {/* Contact Information */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                <Phone size={14} className="text-indigo-600" />
                <span>بيانات التواصل والمتابعة</span>
              </h4>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/80">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block">رقم الهاتف / الواتساب:</span>
                  <span className="text-xs font-black text-slate-800 font-mono" dir="ltr">
                    {rawPhone || 'غير مسجل'}
                  </span>
                </div>

                {apiPhone ? (
                  <button
                    type="button"
                    onClick={handleWhatsApp}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <MessageSquare size={14} />
                    <span>محادثة واتساب 💬</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-400 font-bold">لا يمكن الاتصال عبر واتساب</span>
                )}
              </div>
            </div>

            {/* Notes Section */}
            {student.notes && (
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/60 space-y-1.5">
                <h4 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                  <BookOpen size={13} className="text-amber-600" />
                  <span>ملاحظات الطالب وتوجيهات الإدارة:</span>
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">
                  {student.notes}
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {onViewInFullList && (
              <button
                type="button"
                onClick={() => {
                  onViewInFullList(student);
                  onClose();
                }}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>فتح في سجل الطلاب 👨‍🎓</span>
              </button>
            )}

            <div className="flex items-center gap-2 flex-1 sm:justify-end">
              {onBookSession && (
                <button
                  type="button"
                  onClick={() => {
                    onBookSession(student);
                    onClose();
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Clock size={14} />
                  <span>جدولة حصة</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  handleTriggerLog();
                  onClose();
                }}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
              >
                <Calendar size={14} />
                <span>تسجيل حصة الآن ⚡</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
