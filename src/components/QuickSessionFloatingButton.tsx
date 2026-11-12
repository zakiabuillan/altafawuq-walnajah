import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, Settings, Check, Clock, User, BookOpen, 
  AlertCircle, X, Sparkles, Loader2, Users, CheckCircle2, ChevronUp
} from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logActivity } from '../lib/activityLogger';
import { notifyTeacherOnSessionCreate } from '../lib/notificationUtils';
import { Student, Teacher } from '../types';
import { getAcademicStage } from '../lib/sessionPricing';

interface QuickSessionFloatingButtonProps {
  loggedInTeacher: Teacher;
  students: Student[];
  linkedStudents: Student[];
  selectedStudentIds: string[];
  currentSubject?: string;
  onSessionLogged: () => void;
  calculateStudentBalance: (studentId: string) => number;
  globalThreshold?: number;
  formatRemainingSessionsText?: (balance: number, cost: number) => string;
}

interface QuickSessionConfig {
  defaultStudentId: string;
  defaultSubject: string;
  defaultDurationMinutes: number;
  defaultTopic: string;
}

export const QuickSessionFloatingButton: React.FC<QuickSessionFloatingButtonProps> = ({
  loggedInTeacher,
  students,
  linkedStudents,
  selectedStudentIds,
  currentSubject,
  onSessionLogged,
  calculateStudentBalance,
  globalThreshold = 50,
  formatRemainingSessionsText
}) => {
  // Storage key per teacher
  const storageKey = useMemo(() => 
    `teacher_quick_session_config_${loggedInTeacher?.id || 'default'}`,
    [loggedInTeacher?.id]
  );

  // Quick config state
  const [config, setConfig] = useState<QuickSessionConfig>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (_) {}

    return {
      defaultStudentId: linkedStudents[0]?.id || '',
      defaultSubject: loggedInTeacher?.subjects?.[0] || currentSubject || 'عام',
      defaultDurationMinutes: 60,
      defaultTopic: 'حصة سريعة ومتابعة'
    };
  });

  // UI States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<{
    message: string;
    studentName: string;
    subject: string;
    duration: number;
  } | null>(null);

  // Sync default student if empty and linkedStudents become available
  useEffect(() => {
    if (!config.defaultStudentId && linkedStudents.length > 0) {
      const updated = { ...config, defaultStudentId: linkedStudents[0].id };
      setConfig(updated);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (_) {}
    }
  }, [linkedStudents, config, storageKey]);

  // Sync default subject if empty and teacher subjects become available
  useEffect(() => {
    if (!config.defaultSubject && loggedInTeacher?.subjects && loggedInTeacher.subjects.length > 0) {
      const updated = { ...config, defaultSubject: loggedInTeacher.subjects[0] };
      setConfig(updated);
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (_) {}
    }
  }, [loggedInTeacher?.subjects, config, storageKey]);

  // Save config helper
  const updateConfig = (newVals: Partial<QuickSessionConfig>) => {
    const updated = { ...config, ...newVals };
    setConfig(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (_) {}
  };

  // Resolve target students for quick session
  // Priority: 1) Checked students in current view, 2) Configured default student, 3) First linked student
  const resolvedTargetStudents = useMemo(() => {
    if (selectedStudentIds && selectedStudentIds.length > 0) {
      return linkedStudents.filter(s => selectedStudentIds.includes(s.id));
    }
    const defaultStudent = linkedStudents.find(s => s.id === config.defaultStudentId);
    if (defaultStudent) return [defaultStudent];
    if (linkedStudents.length > 0) return [linkedStudents[0]];
    return [];
  }, [selectedStudentIds, linkedStudents, config.defaultStudentId]);

  // Helper to get local date (YYYY-MM-DD)
  const getLocalDateString = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Perform quick logging for given student(s)
  // User Rule: طلاب الثانوي والإعدادي نظام ساعة تلقائي
  const isStudentSession40Mode = (student: Student) => {
    const stage = getAcademicStage(student.grade || student.academicLevel || '');
    if (stage === 'secondary' || stage === 'middle') return false;
    return student.preferredPricingUnit === 'session_40' || student.sessionSystem === 'session_40';
  };

  const executeQuickLog = async (targetStudentsToLog: Student[], customDuration?: number) => {
    if (targetStudentsToLog.length === 0) {
      setIsMenuOpen(true);
      return;
    }

    const effectiveSubject = config.defaultSubject || loggedInTeacher?.subjects?.[0] || currentSubject || 'عام';
    
    // Check balance for all target students
    const issues: { student: Student; balance: number; cost: number }[] = [];
    for (const student of targetStudentsToLog) {
      const isSess40 = isStudentSession40Mode(student);
      const durationMin = customDuration || (isSess40 ? 40 : config.defaultDurationMinutes || 60);
      const durationHours = durationMin / 60;
      const rate = student.hourlyRate || student.customRates?.[loggedInTeacher.id] || loggedInTeacher?.billingRate || loggedInTeacher?.hourlyRate || 0;
      const cost = durationHours * rate;
      const balance = calculateStudentBalance(student.id);
      const threshold = typeof student.lowBalanceThreshold === 'number' ? student.lowBalanceThreshold : globalThreshold;

      if (!student.isOpenBalance && (balance < cost || (balance - cost <= threshold))) {
        issues.push({ student, balance, cost });
      }
    }

    if (issues.length > 0) {
      const names = issues.map(i => {
        const remainingTxt = formatRemainingSessionsText 
          ? formatRemainingSessionsText(i.balance, i.cost) 
          : 'رصيد منخفض';
        return `${i.student.name} (${remainingTxt})`;
      }).join('، ');

      const confirmBypass = window.confirm(
        `⚠️ تنبيه رصيد منخفض للطالب (${names}):\n` +
        `رصيد الطالب منخفض أو قارب على النفاذ والحساب غير مفتوح.\n` +
        `هل ترغب بالاستمرار وتأكيد الحصة السريعة استثنائياً؟`
      );
      if (!confirmBypass) return;
    }

    setIsSubmitting(true);
    try {
      const todayStr = getLocalDateString();
      const promises = targetStudentsToLog.map(async student => {
        const isSess40 = isStudentSession40Mode(student);
        const durationMin = customDuration || (isSess40 ? 40 : config.defaultDurationMinutes || 60);
        const durationHours = durationMin / 60;

        const sessionPayload = {
          teacherId: loggedInTeacher.id,
          studentId: student.id,
          subject: effectiveSubject,
          topic: config.defaultTopic || 'حصة سريعة',
          notes: '⚡ تم التسجيل بنقرة واحدة عبر زر الحصة السريعة (Quick Session)',
          durationHours: durationHours,
          date: todayStr,
          createdAt: new Date().toISOString(),
          approved: true // Approved for payroll automatically
        };

        const docRef = await addDoc(collection(db, 'sessions'), sessionPayload);

        try {
          await notifyTeacherOnSessionCreate(docRef.id, sessionPayload);
        } catch (notifErr) {
          console.error("Error creating quick session teacher notification:", notifErr);
        }

        return docRef;
      });

      await Promise.all(promises);

      // Log activity
      try {
        const studentsNames = targetStudentsToLog.map(s => s.name).join('، ');
        const durationMin = targetStudentsToLog.some(s => isStudentSession40Mode(s)) ? 40 : (config.defaultDurationMinutes || 60);
        await logActivity({
          actionType: 'ADD_SESSION',
          actionName: 'تسجيل حصة سريعة بنقرة واحدة',
          actor: loggedInTeacher.name,
          details: `قام المعلم (${loggedInTeacher.name}) بتسجيل حصة سريعة بنقرة واحدة لـ (${studentsNames}) بمادة: "${effectiveSubject}" ومدتها: ${durationMin} دقيقة بتاريخ اليوم: ${todayStr}`
        });
      } catch (logErr) {
        console.warn("Activity log error:", logErr);
      }

      // Success notification
      const firstStudent = targetStudentsToLog[0];
      const durationVal = isStudentSession40Mode(firstStudent) ? 40 : (config.defaultDurationMinutes || 60);
      setSuccessToast({
        message: targetStudentsToLog.length > 1 
          ? `تم رصد الحصة السريعة لـ ${targetStudentsToLog.length} طلاب بنجاح!` 
          : `تم رصد الحصة السريعة للطالب (${firstStudent.name}) بنجاح!`,
        studentName: targetStudentsToLog.length > 1 ? `${targetStudentsToLog.length} طلاب` : firstStudent.name,
        subject: effectiveSubject,
        duration: durationVal
      });

      // Auto dismiss success toast after 4.5s
      setTimeout(() => setSuccessToast(null), 4500);

      // Refresh parent dashboard data
      onSessionLogged();
      setIsMenuOpen(false);
    } catch (err: any) {
      console.error("Error logging quick session:", err);
      alert(`حدث خطأ أثناء رصد الحصة: ${err?.message || 'يرجى المحاولة مجدداً'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Main Floating Button Click handler
  const handleMainButtonClick = () => {
    // If multiple students selected in main form, log for all of them immediately in 1 click
    if (selectedStudentIds.length > 0) {
      executeQuickLog(resolvedTargetStudents);
      return;
    }

    // If default student is valid, log for them in 1 click
    if (resolvedTargetStudents.length > 0 && config.defaultStudentId) {
      executeQuickLog(resolvedTargetStudents);
      return;
    }

    // Otherwise open the quick-pick menu so the teacher can choose in 1 tap
    setIsMenuOpen(true);
  };

  const defaultStudentObj = linkedStudents.find(s => s.id === config.defaultStudentId);
  const isMultipleSelected = selectedStudentIds.length > 1;
  const isSingleSelected = selectedStudentIds.length === 1;

  return (
    <>
      {/* Toast Notification for Quick Session Result */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            key="quick-session-success-toast"
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-6 z-[90] max-w-md bg-slate-900/95 text-white p-4 rounded-2xl shadow-2xl border border-amber-500/40 backdrop-blur-md flex items-center gap-3.5 text-right"
            dir="rtl"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
              <Zap size={22} className="fill-slate-950" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-400">حصة سريعة مسجلة ⚡</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  تم التوثيق والرصد ✅
                </span>
              </div>
              <p className="text-xs font-bold text-slate-200 mt-1 truncate">{successToast.message}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                المادة: <span className="text-amber-300 font-bold">{successToast.subject}</span> • المدة: <span className="text-emerald-300 font-bold">{successToast.duration} دقيقة</span>
              </p>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Container */}
      <div className="fixed bottom-6 left-6 z-40 flex flex-col items-start gap-2 select-none" dir="rtl">
        
        {/* Quick Student Selection Popover / Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              key="quick-session-menu-popover"
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="mb-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 p-4 text-right backdrop-blur-lg"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Zap size={16} className="fill-amber-600 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">تسجيل حصة سريعة بنقرة واحدة</h4>
                    <p className="text-[10px] text-slate-500 font-medium">اختر الطالب لتسجيل الحصة فورياً بالبيانات الافتراضية</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Summary of Default Teacher Data */}
              <div className="my-3 p-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-[11px] font-bold text-slate-700">
                <div className="flex items-center gap-1.5">
                  <BookOpen size={13} className="text-amber-600 shrink-0" />
                  <span>المادة: <strong className="text-slate-900">{config.defaultSubject || 'عام'}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-blue-600 shrink-0" />
                  <span>المدة: <strong className="text-slate-900">{config.defaultDurationMinutes} د</strong></span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsSettingsOpen(true);
                  }}
                  className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-extrabold"
                >
                  <Settings size={11} />
                  <span>تعديل</span>
                </button>
              </div>

              {/* Linked Students Quick-Click List */}
              <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                {linkedStudents.length === 0 ? (
                  <p className="text-center py-5 text-xs text-slate-400 font-bold">لا يوجد طلاب منسوبين لك حالياً.</p>
                ) : (
                  linkedStudents.map(student => {
                    const isDefault = student.id === config.defaultStudentId;
                    const isSess40 = isStudentSession40Mode(student);

                    return (
                      <button
                        key={student.id}
                        type="button"
                        onClick={() => {
                          // Update default student in config and execute immediately
                          updateConfig({ defaultStudentId: student.id });
                          executeQuickLog([student]);
                        }}
                        disabled={isSubmitting}
                        className={`w-full p-2.5 rounded-xl border text-right transition-all flex items-center justify-between group cursor-pointer ${
                          isDefault
                            ? 'bg-amber-50/80 border-amber-300 text-amber-950 hover:bg-amber-100/70 shadow-2xs'
                            : 'bg-white border-slate-200 text-slate-800 hover:bg-blue-50/40 hover:border-blue-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                            isDefault ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <User size={13} />
                          </div>
                          <div className="truncate">
                            <span className="text-xs font-black block truncate">{student.name}</span>
                            <span className="text-[9px] text-slate-400 font-bold">
                              {isSess40 ? 'نظام 40 دقيقة' : 'نظام الساعات (60 د)'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isDefault && (
                            <span className="text-[9px] bg-amber-200/80 text-amber-900 font-black px-2 py-0.5 rounded-md">
                              افتراضي
                            </span>
                          )}
                          <span className="text-[10px] bg-[#1A365D] text-white font-black px-2.5 py-1 rounded-lg opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all shadow-xs flex items-center gap-1">
                            <span>رصد فوري</span>
                            <Zap size={10} className="fill-amber-400 text-amber-400" />
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-bold">
                <span>⚡ نقرة واحدة لتسجيل الحصة وخصم الرصيد تلقائياً</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Settings Modal */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div
              key="quick-session-settings-modal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mb-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 text-right"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Settings size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">إعدادات الحصة السريعة الافتراضية</h4>
                    <p className="text-[10px] text-slate-500 font-medium">خصص البيانات التي ستستخدم عند النقر بضغطة واحدة</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-3.5 my-4">
                {/* Default Student */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">الطالب الافتراضي:</label>
                  <select
                    value={config.defaultStudentId}
                    onChange={e => updateConfig({ defaultStudentId: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">-- اختر الطالب الافتراضي --</option>
                    {linkedStudents.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Default Subject */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">المادة الدراسية الافتراضية:</label>
                  <select
                    value={config.defaultSubject}
                    onChange={e => updateConfig({ defaultSubject: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {loggedInTeacher.subjects && loggedInTeacher.subjects.length > 0 ? (
                      loggedInTeacher.subjects.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))
                    ) : (
                      <option value="عام">عام</option>
                    )}
                  </select>
                </div>

                {/* Default Duration */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">المدة الافتراضية للحصة:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[30, 40, 60].map(duration => (
                      <button
                        key={duration}
                        type="button"
                        onClick={() => updateConfig({ defaultDurationMinutes: duration })}
                        className={`py-1.5 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                          config.defaultDurationMinutes === duration
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {duration} دقيقة
                      </button>
                    ))}
                  </div>
                </div>

                {/* Default Topic */}
                <div>
                  <label className="block text-[11px] font-black text-slate-700 mb-1">الموضوع الافتراضي (اختياري):</label>
                  <input
                    type="text"
                    value={config.defaultTopic}
                    onChange={e => updateConfig({ defaultTopic: e.target.value })}
                    placeholder="مثال: متابعة وإنجاز درس"
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 bg-[#1A365D] text-white text-xs font-black rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
                >
                  حفظ والإغلاق
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The Main Floating Pill / Button */}
        <div className="flex items-center gap-1.5 bg-slate-950/90 p-1.5 rounded-full shadow-2xl border-2 border-amber-400/40 backdrop-blur-md hover:border-amber-400 transition-all group">
          
          {/* Main Clickable Quick Session Action */}
          <button
            type="button"
            onClick={handleMainButtonClick}
            disabled={isSubmitting}
            title={
              isMultipleSelected
                ? `تسجيل حصة سريعة لـ ${selectedStudentIds.length} طلاب محددين بنقرة واحدة`
                : isSingleSelected
                ? `تسجيل حصة سريعة للطالب المحدد بنقرة واحدة`
                : defaultStudentObj
                ? `تسجيل حصة سريعة لـ (${defaultStudentObj.name}) بنقرة واحدة`
                : `تسجيل حصة سريعة بنقرة واحدة`
            }
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full font-black text-xs transition-all active:scale-95 cursor-pointer select-none ${
              isSubmitting
                ? 'bg-slate-700 text-slate-300 opacity-80 cursor-wait'
                : 'bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 text-slate-950 hover:brightness-110 shadow-lg shadow-amber-500/20'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span className="text-white font-extrabold text-[11px]">جارِ التسجيل...</span>
              </>
            ) : (
              <>
                {/* Animated lightning bolt with pulse glow */}
                <div className="w-5 h-5 rounded-full bg-slate-950/20 flex items-center justify-center shrink-0">
                  <Zap size={13} className="fill-slate-950 text-slate-950 group-hover:scale-110 transition-transform" />
                </div>

                <div className="flex flex-col text-right">
                  <span className="leading-tight text-slate-950 tracking-tight text-xs font-black flex items-center gap-1">
                    <span>حصة سريعة</span>
                    <span className="text-[10px] bg-slate-950/20 px-1.5 py-0.2 rounded-full">1-Click</span>
                  </span>
                  <span className="text-[9px] text-slate-950/80 font-bold leading-none mt-0.5 truncate max-w-[130px] sm:max-w-[170px]">
                    {isMultipleSelected ? (
                      `رصد لـ ${selectedStudentIds.length} طلاب محددين`
                    ) : isSingleSelected ? (
                      `رصد للطالب المحدد`
                    ) : defaultStudentObj ? (
                      defaultStudentObj.name
                    ) : (
                      `اختر طالباً للبدء`
                    )}
                  </span>
                </div>
              </>
            )}
          </button>

          {/* Quick Menu Popover Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsSettingsOpen(false);
              setIsMenuOpen(prev => !prev);
            }}
            title="عرض قائمة الطلاب للرصد السريع"
            className={`w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ${
              isMenuOpen ? 'bg-white/20 text-amber-300' : ''
            }`}
          >
            <ChevronUp size={16} className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Settings Trigger */}
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              setIsSettingsOpen(prev => !prev);
            }}
            title="تخصيص البيانات الافتراضية للحصة السريعة (المادة، المدة، الطالب الافتراضي)"
            className={`w-9 h-9 rounded-full flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ${
              isSettingsOpen ? 'bg-white/20 text-amber-300 rotate-90' : ''
            }`}
          >
            <Settings size={15} />
          </button>
        </div>

      </div>
    </>
  );
};
