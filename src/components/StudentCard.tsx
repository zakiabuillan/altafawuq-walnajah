import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, Phone, Mail, Calendar, Trash2, 
  UserMinus, UserCheck, Coins, AlertCircle, 
  X, Check, ShieldAlert, BookOpen, AlertTriangle, MessageSquare, RefreshCw
} from 'lucide-react';
import { Student, StudentStatus, GroupCourse, formatCustomDate } from '../types';
import { openWhatsAppChat, getBestParentOrStudentPhone, generateParentBalanceMessage, generatePackageRenewalWhatsAppMessage } from '../lib/phoneUtils';

interface StudentCardProps {
  student: Student;
  courses: GroupCourse[];
  onDeleteStudent: (id: string) => void;
  onAssignCourse: (studentId: string, courseId: string | undefined) => void;
  onUpdateFinancials: (studentId: string, balance: number, isOpenBalance: boolean) => void;
  onBookLesson: (studentId: string, courseTitle: string, cost: number) => void;
  onCancelLesson: (studentId: string, bookingId: string) => void;
  lowBalanceThreshold?: number;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  student,
  courses,
  onDeleteStudent,
  onAssignCourse,
  onUpdateFinancials,
  onBookLesson,
  onCancelLesson,
  lowBalanceThreshold = -100
}) => {
  const isAssigned = student.status === StudentStatus.Assigned;
  const assignedCourse = courses.find(c => c.id === student.assignedCourseId);

  const thresholdLimit = typeof student.lowBalanceThreshold === 'number'
    ? student.lowBalanceThreshold
    : lowBalanceThreshold;

  // Compatible courses lookup
  const compatibleCourses = courses.filter(c => {
    const courseLvl = (c.level || '').toLowerCase();
    const studLvl = (student.academicLevel || '').toLowerCase();
    const courseLvlWord = courseLvl.split(' ')[0] || '';
    const studLvlWord = studLvl.split(' ')[0] || '';
    return c.status !== 'Finished' && (
      (courseLvlWord && studLvlWord && courseLvlWord === studLvlWord) ||
      (studLvl.length >= 3 && courseLvl.includes(studLvl.substring(0, 3)))
    );
  });

  // Card UI states
  const [showBookForm, setShowBookForm] = useState(false);
  const [bookTitle, setBookTitle] = useState('');
  const [bookCost, setBookCost] = useState(student.hourlyRate ? String(student.hourlyRate) : '15');
  const [bookError, setBookError] = useState('');

  useEffect(() => {
    if (student.hourlyRate) {
      setBookCost(String(student.hourlyRate));
    }
  }, [student.hourlyRate]);

  // Balance Override inputs
  const [editingBalance, setEditingBalance] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);

  // Dynamic calculations
  const parsedCost = Number(bookCost) || 0;
  const wouldBeBalance = student.balance - parsedCost;
  const hasInsufficientBalance = student.balance < parsedCost;
  const canBook = student.isOpenBalance || !hasInsufficientBalance;

  // Handle manual financial override
  const handleBalanceSave = () => {
    const val = Number(editingBalance);
    if (isNaN(val)) return;
    onUpdateFinancials(student.id, val, student.isOpenBalance);
    setIsEditing(false);
  };

  // Handle lesson booking by teacher
  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setBookError('');

    if (!bookTitle.trim()) {
      setBookError('يرجى تحديد أو كتابة عنوان الحصة');
      return;
    }
    if (parsedCost <= 0) {
      setBookError('يرجى كتابة تكلفة صحيحة أكبر من صفر');
      return;
    }

    if (!canBook) {
      setBookError('لا يمكن حجز الحصة! لعدم تفعيل خيار الرصيد المفتوح للطالب وعجز الرصيد المسبق.');
      return;
    }

    onBookLesson(student.id, bookTitle, parsedCost);
    setBookTitle('');
    setBookError('');
    setShowBookForm(false);
  };

  return (
    <motion.div
      layout
      id={`student-card-${student.id}`}
      className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg flex flex-col justify-between ${
        isAssigned ? 'border-emerald-200 ring-1 ring-emerald-50 hover:border-emerald-300' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div>
        {/* Header background ribbon */}
        <div className={`h-1.5 w-full ${
          isAssigned ? 'bg-emerald-500' : 'bg-amber-400'
        }`} />

        <div className="p-4 space-y-4">
          {/* Name & gender badge */}
          <div className="flex justify-between items-start gap-2">
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5 leading-tight">
                {student.name}
                {student.gender === 'Female' ? (
                  <span className="text-[9px] bg-pink-50 text-pink-700 px-1.5 py-0.5 rounded font-black">أنثى</span>
                ) : (
                  <span className="text-[9px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded font-black">ذكر</span>
                )}
                {student.balance < thresholdLimit && (
                  <span title={`تنبيه: الرصيد المالي منخفض (أقل من ${thresholdLimit} شيكل)`}>
                    <AlertTriangle 
                      size={14} 
                      className="text-amber-500 fill-amber-50 animate-pulse flex-shrink-0" 
                    />
                  </span>
                )}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] bg-slate-100 rounded text-slate-600 px-2 py-0.5 font-bold flex items-center gap-1" title="صف الطالب">
                  <GraduationCap size={10} className="text-slate-400" />
                  الصف: {student.academicLevel || student.grade}
                </span>
              </div>
            </div>

            {/* Status indicators */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                isAssigned 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-100'
              }`}>
                {isAssigned ? (
                  <>
                    <UserCheck size={9} className="text-emerald-600" />
                    <span>تم التنسيب</span>
                  </>
                ) : (
                  <>
                    <UserMinus size={9} className="text-amber-600" />
                    <span>قيد الانتظار</span>
                  </>
                )}
              </span>
              {student.balance < thresholdLimit && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 animate-pulse" title={`رصيد منخفض أقل من ${thresholdLimit} شيكل`}>
                  <AlertTriangle size={10} className="text-amber-500 fill-amber-50" />
                  رصيد منخفض
                </span>
              )}
            </div>
          </div>

          {/* Contact Details Layout */}
          <div className="bg-slate-50/50 p-2.5 rounded-lg space-y-1.5 text-[11px] border border-slate-100/50">
            <div className="flex items-center justify-between text-slate-500">
              <span className="flex items-center gap-1 font-semibold">
                <Phone size={11} className="text-slate-400" />
                رقم الاتصال:
              </span>
              <span className="font-mono text-slate-700 font-bold">{student.phone}</span>
            </div>
            {student.email !== 'No Email' && (
              <div className="flex items-center justify-between text-slate-500">
                <span className="flex items-center gap-1 font-semibold">
                  <Mail size={11} className="text-slate-400" />
                  البريد:
                </span>
                <span className="font-mono text-slate-700 truncate max-w-[130px]" title={student.email}>{student.email}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-slate-500">
              <span className="flex items-center gap-1 font-semibold">
                <Calendar size={11} className="text-slate-400" />
                تاريخ التسجيل:
              </span>
              <span className="text-slate-700 font-bold">{formatCustomDate(student.registrationDate)}</span>
            </div>
          </div>

          {/* Financial File Frame (الرصيد وإدارته يدوياً) */}
          <div className="border border-slate-150 rounded-xl p-3 bg-teal-50/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Coins size={13} className="text-teal-600" />
                <span className="text-[11px] font-bold text-slate-700">الرصيد المالي للملف:</span>
              </div>
              <div className="flex items-center gap-1.5">
                {student.isOpenBalance ? (
                  <span className="text-[9px] bg-amber-500 text-slate-900 px-1.5 py-0.5 rounded font-black border border-amber-400 flex items-center gap-0.5" title="الرصيد مفتوح (الدفع لاحقاً، يسمح بالرصيد السالب)">
                    رصيد مفتوح ✨
                  </span>
                ) : (
                  <span className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded font-bold">
                    مسبق الدفع
                  </span>
                )}
                <span className={`text-xs font-black font-mono px-1.5 py-0.5 rounded ${
                  student.balance < 0 
                    ? 'bg-rose-50 text-rose-700 border border-rose-200 font-extrabold' 
                    : student.balance < thresholdLimit 
                      ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse' 
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {student.balance} ₪
                </span>
              </div>
            </div>

            {/* Visual progress bar of balance */}
            {(() => {
              const limit = thresholdLimit;
              let percentageRemaining = 100;
              
              if (limit < 0) {
                const totalDebtLimit = Math.abs(limit);
                const remainingBuffer = Math.max(0, student.balance - limit);
                percentageRemaining = (remainingBuffer / totalDebtLimit) * 100;
              } else if (limit > 0) {
                percentageRemaining = (student.balance / limit) * 100;
              } else {
                percentageRemaining = student.balance > 0 ? 100 : 0;
              }
              
              const pct = Math.min(100, Math.max(0, percentageRemaining));
              
              let barColor = 'from-emerald-500 to-teal-400';
              let textColor = 'text-emerald-600';
              if (pct > 75) {
                barColor = 'from-emerald-500 to-teal-400';
                textColor = 'text-emerald-600';
              } else if (pct > 50) {
                barColor = 'from-emerald-400 to-lime-400';
                textColor = 'text-emerald-500';
              } else if (pct > 25) {
                barColor = 'from-amber-500 to-yellow-400';
                textColor = 'text-amber-600';
              } else if (pct > 10) {
                barColor = 'from-orange-500 to-amber-400';
                textColor = 'text-orange-600';
              } else {
                barColor = 'from-rose-600 to-red-500 animate-pulse';
                textColor = 'text-rose-600 font-extrabold';
              }

              return (
                <div className="space-y-1 w-full text-right" dir="rtl">
                  <div className="h-2 bg-slate-100 border border-slate-200/50 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full rounded-full bg-gradient-to-l ${barColor} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-black text-slate-400">
                    <span>العتبة المالية: {limit} ₪</span>
                    <span className={`${textColor}`}>{pct.toFixed(0)}% متبقي</span>
                  </div>
                </div>
              );
            })()}

            {student.balance < thresholdLimit && (
              <div className="flex items-center gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] text-amber-850 font-bold leading-tight">
                <AlertTriangle size={13} className="text-amber-500 fill-amber-50 flex-shrink-0 animate-bounce" />
                <span>تنبيه: الرصيد المالي أوشك على النفاد (أقل من {thresholdLimit} شيكل)</span>
              </div>
            )}

            {/* Quick manual editing panel of balance by manager */}
            <div className="p-2 bg-white rounded-lg border border-slate-150 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-bold">إدارة رصيد الطالب (يدوياً):</span>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateFinancials(student.id, student.balance, !student.isOpenBalance);
                  }}
                  className={`text-[9px] px-2 py-1 rounded font-black border transition-all ${
                    student.isOpenBalance
                      ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                      : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                  }`}
                >
                  {student.isOpenBalance ? 'تعطيل الرصيد المفتوح' : 'تفعيل رصيد مفتوح'}
                </button>
              </div>

              <div className="flex gap-2 items-center">
                {isEditing ? (
                  <div className="flex gap-1 items-center w-full">
                    <input
                      type="number"
                      placeholder="أدخل المبلغ يدوياً"
                      value={editingBalance}
                      onChange={(e) => setEditingBalance(e.target.value)}
                      className="w-full text-xs font-mono p-1 border border-teal-500 rounded focus:outline-none text-left"
                    />
                    <button
                      onClick={handleBalanceSave}
                      className="p-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded text-[10px] font-bold"
                      title="حفظ"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded text-[10px]"
                      title="إلغاء"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="flex justify-between items-center w-full bg-slate-50 p-1.5 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-600">القيمة المسجلة بالكامل: <strong className="font-mono text-slate-800">{student.balance} ₪</strong></span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBalance(student.balance.toString());
                        setIsEditing(true);
                      }}
                      className="text-[9px] text-teal-600 hover:text-teal-700 font-extrabold"
                    >
                      تعديل يدوياً ✎
                    </button>
                  </div>
                )}
              </div>

              {/* Quick WhatsApp balance notification to parent */}
              <button
                type="button"
                onClick={() => {
                  const phone = getBestParentOrStudentPhone(student);
                  if (!phone) {
                    alert('لا يوجد رقم هاتف مسجل للطالب أو ولي الأمر.');
                    return;
                  }
                  const msg = generateParentBalanceMessage({
                    studentName: student.name,
                    balance: student.balance,
                    hourlyRate: student.hourlyRate
                  });
                  openWhatsAppChat(phone, msg);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                title="إرسال إشعار الرصيد المالي الحالي لولي الأمر عبر WhatsApp"
              >
                <MessageSquare size={12} className="text-emerald-600" />
                <span>إرسال الرصيد لولي الأمر عبر WhatsApp 📱</span>
              </button>

              {/* Package Renewal Alert Button */}
              <button
                type="button"
                onClick={() => {
                  const phone = getBestParentOrStudentPhone(student);
                  if (!phone) {
                    alert('لا يوجد رقم هاتف مسجل للطالب أو ولي الأمر.');
                    return;
                  }
                  const msg = generatePackageRenewalWhatsAppMessage({
                    studentName: student.name,
                    balance: student.balance,
                    hourlyRate: student.hourlyRate
                  });
                  openWhatsAppChat(phone, msg);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                title="تنبيه تجديد الرزمة التعليمية: إرسال رسالة واتساب مخصصة تحث ولي الأمر على المبادرة بالتجديد قبل نفاد الرصيد ⚡"
              >
                <RefreshCw size={12} className="text-amber-600 stroke-[2.5]" />
                <span>تنبيه تجديد الرزمة التعليمية عبر WhatsApp ⚡</span>
              </button>
            </div>
          </div>

          {/* Teacher's section for booking classes/lessons */}
          <div className="border border-slate-150 rounded-xl p-3 bg-amber-50/5/30 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <BookOpen size={13} className="text-amber-500" />
                بوابة المعلم (حجز الحصص المقضية):
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowBookForm(!showBookForm);
                  setBookError('');
                }}
                className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded font-bold border border-slate-350 transition-colors"
              >
                {showBookForm ? 'إغلاق' : 'حجز حصة +'}
              </button>
            </div>

            {/* Quick list of booked lessons */}
            {student.bookings && student.bookings.length > 0 ? (
              <div className="max-h-24 overflow-y-auto space-y-1 pr-1 border-t border-slate-100 pt-1.5">
                {student.bookings.map(booking => (
                  <div key={booking.id} className="text-[10px] flex justify-between items-center bg-slate-50 p-1 px-2 rounded border border-slate-100">
                    <div className="truncate max-w-[150px]">
                      <span className="font-semibold block text-slate-700 text-[10px] leading-tight truncate">{booking.courseTitle}</span>
                      <span className="text-[8px] text-slate-400 font-mono">{formatCustomDate(booking.date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-rose-600">-{booking.cost} ₪</span>
                      <button
                        onClick={() => onCancelLesson(student.id, booking.id)}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                        title="إلغاء لحصة واسترجاع المبلغ"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[9px] text-slate-400 text-center italic">لا يوجد حصص محجوزة حالياً لهذا الملف</p>
            )}

            {/* Interactive check warnings */}
            <AnimatePresence>
              {showBookForm && (
                <motion.form
                  onSubmit={handleBookingSubmit}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 border-t border-slate-100 pt-2 text-xs"
                >
                  {bookError && (
                    <div className="p-1 px-2 bg-rose-50 text-rose-700 text-[9px] rounded flex items-center gap-1 border border-rose-100">
                      <AlertCircle size={10} className="flex-shrink-0" />
                      <span>{bookError}</span>
                    </div>
                  )}

                  {/* Title of session */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5">تحديد الدورة / عنوان الدرس:</label>
                    <div className="flex gap-1">
                      <select
                        value={bookTitle}
                        onChange={(e) => setBookTitle(e.target.value)}
                        className="w-full text-[10px] p-1.5 border border-slate-200 rounded font-medium bg-white text-slate-700 focus:outline-none focus:border-amber-500"
                      >
                        <option value="">-- اختر مسمى الحصة --</option>
                        {assignedCourse && (
                          <option value={`حصة بمكان دورته: ${assignedCourse.title}`}>{assignedCourse.code} • درس مخصص</option>
                        )}
                        {courses.map(c => (
                          <option key={c.id} value={`حصة دورة ${c.code}`}>{c.code} - {c.title}</option>
                        ))}
                        <option value="تمارين محادثة خاصة">جلسة محادثة واختبار خاصة</option>
                        <option value="تحضير مسبق للبجروت">تحضير مسبق للبجروت</option>
                      </select>
                      <input
                        type="text"
                        placeholder="أو اكتب عنواناً يدوياً..."
                        value={bookTitle}
                        onChange={(e) => setBookTitle(e.target.value)}
                        className="w-full text-[10px] p-1 px-2 border border-slate-200 rounded text-right focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Pricing / Manual Input */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 block mb-0.5">تكلفة الحصة (₪):</label>
                      <input
                        type="number"
                        min="1"
                        value={bookCost}
                        onChange={(e) => setBookCost(e.target.value)}
                        className="w-full text-[11px] p-1 pr-1 border border-slate-200 rounded font-mono text-left"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      {/* Estimated balance projection */}
                      <span className="text-[8px] text-slate-400 block mb-0.5 font-bold">الرصيد التقديري الناتج:</span>
                      <span className={`text-[11px] font-mono font-black text-left block p-1 bg-slate-50 border border-slate-100 rounded ${
                        wouldBeBalance < 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}>
                        {wouldBeBalance} ₪
                      </span>
                    </div>
                  </div>

                  {/* Financial warnings on current rule */}
                  {hasInsufficientBalance && (
                    <div className={`p-2 rounded text-[10px] font-bold leading-relaxed ${
                      student.isOpenBalance
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {student.isOpenBalance ? (
                        <div className="flex gap-1 items-start">
                          <AlertTriangle size={12} className="text-amber-600 mt-0.5 flex-shrink-0" />
                          <span>تنبيه: الرصيد سالباً. يسمح بالحجز لأن الرصيد مفتوح (مدفوع لاحقاً بعد تجميع الحصص).</span>
                        </div>
                      ) : (
                        <div className="flex gap-1 items-start">
                          <ShieldAlert size={12} className="text-rose-600 mt-0.5 flex-shrink-0" />
                          <span>ممنوع: الرصيد غير كافٍ ونظام الدفع مسبق ومغلق! شحن الرصيد يدوياً أو تفعيل الرصيد المفتوح للمتابعة.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Booking confirmation action button */}
                  <button
                    type="submit"
                    disabled={!canBook}
                    className={`w-full py-1.5 rounded font-black text-xs transition-all ${
                      canBook
                        ? 'bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 focus:ring-1 focus:ring-amber-500 hover:shadow-xs active:scale-98'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    {!canBook ? 'الحجز مغلق - رصيد سلبي غير مسموح' : 'تأكيد وحجز الحصة وسحب تكلفتها'}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {student.notes && (
            <p className="text-[10px] text-slate-500 bg-amber-50/20 p-2 rounded border border-amber-50/40 leading-relaxed font-semibold">
              <strong className="text-amber-800 text-[9px] block">ملاحظات إستراتيجية:</strong>
              {student.notes}
            </p>
          )}
        </div>
      </div>

      {/* Allocation actions board (تنسيب الطالب) */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex flex-col gap-2">
        {isAssigned && assignedCourse ? (
          <div className="space-y-1">
            <div className="bg-emerald-50/80 border border-emerald-100 rounded-lg p-2 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">منسّب حالياً إلى:</span>
                <h5 className="text-[11px] font-bold text-slate-800 truncate max-w-[130px]">{assignedCourse.title}</h5>
                <p className="text-[9px] text-slate-500">{assignedCourse.code} • م. {assignedCourse.instructor}</p>
              </div>
              
              <button
                id={`unassign-btn-${student.id}`}
                onClick={() => onAssignCourse(student.id, undefined)}
                title="إلغاء التنسيب وإعادة الطالب لقائمة الانتظار"
                className="p-1 text-rose-500 hover:text-white hover:bg-rose-500 border border-rose-100 hover:border-transparent rounded transition-all"
              >
                <UserMinus size={12} />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <span className="text-[9px] font-bold text-slate-400 block pb-0.5">قم بتنسيب الطالب لدورة جماعية:</span>
            
            {compatibleCourses.length === 0 ? (
              <div className="p-1.5 border border-slate-100 bg-slate-50 text-[9px] rounded text-slate-400 text-center">
                لا توجد دورات مناسبة تماماً. حدد دورة نشطة من الأسفل.
              </div>
            ) : null}

            <div className="flex gap-1 flex-wrap">
              {courses.filter(c => c.status !== 'Finished').map(course => {
                const studLvlWord = ((student.academicLevel || '').split(' ')[0] || '').toLowerCase().trim();
                const isExactLevel = studLvlWord ? (course.level || '').toLowerCase().includes(studLvlWord) : false;
                return (
                  <button
                    key={course.id}
                    id={`assign-${student.id}-to-${course.id}-btn`}
                    onClick={() => onAssignCourse(student.id, course.id)}
                    className={`text-[9px] px-2 py-1 font-bold rounded-md border flex items-center gap-0.5 transition-all ${
                      isExactLevel
                        ? 'bg-amber-500 hover:bg-amber-600 border-amber-600 text-white'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <UserCheck size={9} />
                    <span>{course.code}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Delete action button */}
        <div className="flex justify-end pt-1 border-t border-slate-100 text-xs mt-1">
          <button
            onClick={() => onDeleteStudent(student.id)}
            className="text-slate-400 hover:text-rose-600 flex items-center gap-1 font-bold text-[10px] transition-colors"
          >
            <Trash2 size={11} />
            حذف السجل
          </button>
        </div>
      </div>
    </motion.div>
  );
};
