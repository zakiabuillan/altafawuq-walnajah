import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Clock, 
  MessageSquare, 
  Send, 
  Check, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Edit3, 
  Plus, 
  Sparkles, 
  Users, 
  Bell, 
  Play, 
  X, 
  Copy, 
  Timer, 
  Repeat, 
  ShieldAlert, 
  CheckSquare, 
  Square,
  Search,
  History,
  AlertTriangle,
  Flame,
  ArrowRight
} from 'lucide-react';
import { Student, ScheduledWhatsAppReminder, Settings } from '../types';
import { 
  DEFAULT_SCHEDULED_WHATSAPP_TEMPLATE,
  SCHEDULED_TEMPLATE_PRESETS,
  formatScheduledWhatsAppMessage,
  getScheduleShortcut,
  formatArabicRemainingTime,
  saveScheduledReminder,
  cancelScheduledReminder,
  deleteScheduledReminder,
  computeNextOccurrence
} from '../lib/scheduledWhatsAppUtils';
import { logActivity } from '../lib/activityLogger';

interface ScheduledWhatsAppReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  settings: Settings;
  calculateStudentBalance: (student: Student) => number;
  scheduledReminders: ScheduledWhatsAppReminder[];
  initialMode?: 'list' | 'create';
  initialSelectedStudentIds?: string[];
  initialTargetMode?: 'over_debt_limit' | 'negative' | 'critical' | 'all_debtors' | 'custom';
  initialTemplate?: string;
  onTriggerDirectSend?: (studentsToSend: { student: Student; balance: number; message: string; phone: string }[]) => void;
}

export const ScheduledWhatsAppReminderModal: React.FC<ScheduledWhatsAppReminderModalProps> = ({
  isOpen,
  onClose,
  students,
  settings,
  calculateStudentBalance,
  scheduledReminders,
  initialMode = 'list',
  initialSelectedStudentIds = [],
  initialTargetMode = 'negative',
  initialTemplate,
  onTriggerDirectSend
}) => {
  // Navigation tabs: 'list' (View scheduled reminders) | 'create' (Schedule new / edit)
  const [activeTab, setActiveTab] = useState<'list' | 'create'>(initialMode);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);

  // Form states for creating/editing a scheduled reminder
  const [reminderTitle, setReminderTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('10:00');
  const [targetMode, setTargetMode] = useState<'over_debt_limit' | 'negative' | 'critical' | 'all_debtors' | 'custom'>('negative');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [messageTemplate, setMessageTemplate] = useState(DEFAULT_SCHEDULED_WHATSAPP_TEMPLATE);
  const [repeatInterval, setRepeatInterval] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [autoSend, setAutoSend] = useState(true);
  const [searchStudentTerm, setSearchStudentTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackToast, setFeedbackToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filter for list tab
  const [listStatusFilter, setListStatusFilter] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

  // Preview & Interactive dispatch execution states
  const [executingReminder, setExecutingReminder] = useState<ScheduledWhatsAppReminder | null>(null);
  const [executionProgress, setExecutionProgress] = useState<{ current: number; total: number; isRunning: boolean } | null>(null);
  const [previewStudentIndex, setPreviewStudentIndex] = useState(0);

  const lowBalanceThreshold = settings.lowBalanceThreshold ?? -100;
  const academyName = settings.academyName || 'أكاديمية التفوق أون لاين';

  // Compute student groups
  const overDebtLimitStudents = useMemo(() => {
    return students.filter(s => {
      if (s.archived) return false;
      const bal = calculateStudentBalance(s);
      if (bal >= 0) return false;
      const debt = Math.abs(bal);
      const limit = typeof s.maxDebtLimit === 'number' 
        ? s.maxDebtLimit 
        : (typeof s.lowBalanceThreshold === 'number' && s.lowBalanceThreshold < 0 ? Math.abs(s.lowBalanceThreshold) : 0);
      return debt > limit;
    });
  }, [students, calculateStudentBalance]);

  const negativeStudents = useMemo(() => {
    return students.filter(s => !s.archived && calculateStudentBalance(s) < 0);
  }, [students, calculateStudentBalance]);

  const criticalStudents = useMemo(() => {
    return students.filter(s => {
      if (s.archived) return false;
      const bal = calculateStudentBalance(s);
      const th = typeof s.lowBalanceThreshold === 'number' ? s.lowBalanceThreshold : lowBalanceThreshold;
      return bal <= th;
    });
  }, [students, calculateStudentBalance, lowBalanceThreshold]);

  const allDebtorsStudents = useMemo(() => {
    return students.filter(s => {
      if (s.archived) return false;
      const bal = calculateStudentBalance(s);
      const th = typeof s.lowBalanceThreshold === 'number' ? s.lowBalanceThreshold : lowBalanceThreshold;
      return bal < 0 || bal <= th;
    });
  }, [students, calculateStudentBalance, lowBalanceThreshold]);

  // Reset or initialize form on open or when initial props change
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      if (initialMode === 'create') {
        const defShortcut = getScheduleShortcut('tomorrow_morning');
        setScheduledDate(defShortcut.date);
        setScheduledTime(defShortcut.time);
        setTargetMode(initialTargetMode);
        setMessageTemplate(initialTemplate || DEFAULT_SCHEDULED_WHATSAPP_TEMPLATE);
        setReminderTitle(`تذكير الأرصدة والذمم - ${defShortcut.date}`);
        if (initialSelectedStudentIds.length > 0) {
          setSelectedStudentIds(initialSelectedStudentIds);
        } else {
          setSelectedStudentIds(negativeStudents.map(s => s.id));
        }
      }
    }
  }, [isOpen, initialMode, initialTargetMode, initialTemplate, initialSelectedStudentIds, negativeStudents]);

  // Set default form values when creating new
  const handleStartCreate = () => {
    setEditingReminderId(null);
    const shortcut = getScheduleShortcut('tomorrow_morning');
    setReminderTitle(`تذكير مالي مجدول - ${shortcut.date}`);
    setScheduledDate(shortcut.date);
    setScheduledTime(shortcut.time);
    setTargetMode('negative');
    setSelectedStudentIds(negativeStudents.map(s => s.id));
    setMessageTemplate(initialTemplate || settings.defaultWhatsAppReminderTemplate || settings.autoWhatsAppTemplate || DEFAULT_SCHEDULED_WHATSAPP_TEMPLATE);
    setRepeatInterval('once');
    setAutoSend(true);
    setActiveTab('create');
  };

  // Pre-fill form for editing an existing reminder
  const handleStartEdit = (reminder: ScheduledWhatsAppReminder) => {
    setEditingReminderId(reminder.id);
    setReminderTitle(reminder.title);
    setScheduledDate(reminder.scheduledDate);
    setScheduledTime(reminder.scheduledTime);
    setTargetMode(reminder.targetMode);
    setSelectedStudentIds(reminder.selectedStudentIds || []);
    setMessageTemplate(reminder.messageTemplate);
    setRepeatInterval(reminder.repeatInterval);
    setAutoSend(reminder.autoSend);
    setActiveTab('create');
  };

  // Shortcut setter
  const applyShortcut = (type: 'in_1_hour' | 'in_2_hours' | 'tomorrow_morning' | 'tomorrow_evening' | 'in_3_days' | 'next_week') => {
    const sc = getScheduleShortcut(type);
    setScheduledDate(sc.date);
    setScheduledTime(sc.time);
  };

  // Get targeted students based on current targetMode
  const currentTargetStudents = useMemo(() => {
    if (targetMode === 'over_debt_limit') return overDebtLimitStudents;
    if (targetMode === 'negative') return negativeStudents;
    if (targetMode === 'critical') return criticalStudents;
    if (targetMode === 'all_debtors') return allDebtorsStudents;
    return students.filter(s => selectedStudentIds.includes(s.id));
  }, [targetMode, overDebtLimitStudents, negativeStudents, criticalStudents, allDebtorsStudents, students, selectedStudentIds]);

  // Filter students in custom picker
  const filteredStudentsForCustomPicker = useMemo(() => {
    const term = searchStudentTerm.toLowerCase().trim();
    return students.filter(s => {
      if (s.archived) return false;
      if (!term) return true;
      const phone = s.phone || s.phoneNumber || '';
      return s.name.toLowerCase().includes(term) || phone.includes(term);
    });
  }, [students, searchStudentTerm]);

  // Save Scheduled Reminder
  const handleSaveReminder = async () => {
    if (!reminderTitle.trim()) {
      showToast('يرجى كتابة عنوان للتذكير المجدول (مثل: تذكير الأرصدة السالبة)', 'error');
      return;
    }
    if (!scheduledDate) {
      showToast('يرجى تحديد تاريخ موعد الإرسال', 'error');
      return;
    }
    if (!scheduledTime) {
      showToast('يرجى تحديد وقت الإرسال', 'error');
      return;
    }

    const scheduledAt = `${scheduledDate}T${scheduledTime}:00`;
    const scheduledDateTime = new Date(scheduledAt);
    if (isNaN(scheduledDateTime.getTime())) {
      showToast('تاريخ أو وقت الموعد غير صحيح', 'error');
      return;
    }

    if (targetMode === 'custom' && selectedStudentIds.length === 0) {
      showToast('يرجى تحديد طالب واحد على الأقل في القائمة المخصصة', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await saveScheduledReminder({
        id: editingReminderId || undefined,
        title: reminderTitle,
        scheduledDate,
        scheduledTime,
        scheduledAt,
        targetMode,
        selectedStudentIds: targetMode === 'custom' ? selectedStudentIds : currentTargetStudents.map(s => s.id),
        messageTemplate,
        repeatInterval,
        autoSend,
        status: 'pending',
        recipientsCount: currentTargetStudents.length
      });

      showToast(
        editingReminderId ? 'تم تعديل موعد التذكير بنجاح! ⏰' : 'تمت جدولة موعد إرسال تذكير WhatsApp بنجاح! 🚀', 
        'success'
      );
      setEditingReminderId(null);
      setActiveTab('list');
    } catch (err: any) {
      showToast('حدث خطأ أثناء حفظ الجدولة، يرجى المحاولة ثانية', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel / delete action
  const handleCancelReminder = async (reminder: ScheduledWhatsAppReminder) => {
    if (!window.confirm(`هل أنت متأكد من إلغاء جدولة "${reminder.title}"؟`)) return;
    try {
      await cancelScheduledReminder(reminder.id, reminder.title);
      showToast('تم إلغاء التذكير المجدول بنجاح', 'success');
    } catch (e) {
      showToast('تعذر إلغاء التذكير', 'error');
    }
  };

  const handleDeleteReminder = async (reminder: ScheduledWhatsAppReminder) => {
    if (!window.confirm(`هل أنت متأكد من حذف سجل التذكير "${reminder.title}" نهائياً؟`)) return;
    try {
      await deleteScheduledReminder(reminder.id, reminder.title);
      showToast('تم حذف التذكير بنجاح', 'success');
    } catch (e) {
      showToast('تعذر حذف التذكير', 'error');
    }
  };

  // Immediate manual dispatch of a scheduled reminder
  const handleExecuteNow = async (reminder: ScheduledWhatsAppReminder) => {
    // 1. Resolve eligible target students at current execution time
    let targetList: Student[] = [];
    if (reminder.targetMode === 'over_debt_limit') {
      targetList = students.filter(s => {
        if (s.archived) return false;
        const bal = calculateStudentBalance(s);
        if (bal >= 0) return false;
        const debt = Math.abs(bal);
        const limit = typeof s.maxDebtLimit === 'number' 
          ? s.maxDebtLimit 
          : (typeof s.lowBalanceThreshold === 'number' && s.lowBalanceThreshold < 0 ? Math.abs(s.lowBalanceThreshold) : 0);
        return debt > limit;
      });
    } else if (reminder.targetMode === 'negative') {
      targetList = students.filter(s => !s.archived && calculateStudentBalance(s) < 0);
    } else if (reminder.targetMode === 'critical') {
      targetList = students.filter(s => {
        if (s.archived) return false;
        const bal = calculateStudentBalance(s);
        const th = typeof s.lowBalanceThreshold === 'number' ? s.lowBalanceThreshold : lowBalanceThreshold;
        return bal <= th;
      });
    } else if (reminder.targetMode === 'all_debtors') {
      targetList = students.filter(s => {
        if (s.archived) return false;
        const bal = calculateStudentBalance(s);
        const th = typeof s.lowBalanceThreshold === 'number' ? s.lowBalanceThreshold : lowBalanceThreshold;
        return bal < 0 || bal <= th;
      });
    } else {
      const allowedIds = reminder.selectedStudentIds || [];
      targetList = students.filter(s => allowedIds.includes(s.id));
    }

    if (targetList.length === 0) {
      alert('لا يوجد أي طالب مطابق لمعايير الرصيد المنخفض حالياً في هذا التذكير. كافة الأرصدة مسددة! 🎉');
      return;
    }

    setExecutingReminder(reminder);
    setExecutionProgress({ current: 0, total: targetList.length, isRunning: true });

    let sentCount = 0;
    let skippedCount = 0;
    const sentStudentNames: string[] = [];

    for (let i = 0; i < targetList.length; i++) {
      const student = targetList[i];
      const bal = calculateStudentBalance(student);
      const th = typeof student.lowBalanceThreshold === 'number' ? student.lowBalanceThreshold : lowBalanceThreshold;
      const cleanPhone = (student.phone || student.phoneNumber || student.contact || '').replace(/[\s\-\+]/g, '');

      setExecutionProgress({ current: i + 1, total: targetList.length, isRunning: true });

      if (cleanPhone) {
        const msg = formatScheduledWhatsAppMessage(student, reminder.messageTemplate, bal, th, academyName);
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');
        sentCount++;
        sentStudentNames.push(student.name);

        await logActivity({
          actionType: 'DISPATCH_SCHEDULED_WHATSAPP_REMINDER',
          actionName: 'إرسال تذكير WhatsApp مجدول',
          details: `تم إرسال تذكير مالي مجدول لولي أمر الطالب ${student.name} (الرصيد: ${bal} ₪) ضمن تذكير: "${reminder.title}"`,
          amount: bal,
          studentId: student.id,
          studentName: student.name
        });
      } else {
        skippedCount++;
      }

      if (i < targetList.length - 1) {
        await new Promise(res => setTimeout(res, 400));
      }
    }

    setExecutionProgress(null);

    // Update reminder status in Firestore
    const isRecurring = reminder.repeatInterval && reminder.repeatInterval !== 'once';
    const nowIso = new Date().toISOString();

    if (isRecurring) {
      const nextScheduledAt = computeNextOccurrence(reminder.scheduledAt, reminder.repeatInterval);
      await saveScheduledReminder({
        ...reminder,
        scheduledAt: nextScheduledAt,
        scheduledDate: nextScheduledAt.split('T')[0],
        scheduledTime: nextScheduledAt.split('T')[1].substring(0, 5),
        status: 'pending',
        executedAt: nowIso,
        lastRunDetails: {
          totalTargeted: targetList.length,
          sentCount,
          skippedCount,
          executedAt: nowIso,
          studentNames: sentStudentNames.slice(0, 5)
        }
      });
      showToast(`تم إرسال التذكيرات بنجاح لـ (${sentCount}) طالب! وتمت جدولة الموعد القادم تلقائياً 🔄`, 'success');
    } else {
      await saveScheduledReminder({
        ...reminder,
        status: 'completed',
        executedAt: nowIso,
        lastRunDetails: {
          totalTargeted: targetList.length,
          sentCount,
          skippedCount,
          executedAt: nowIso,
          studentNames: sentStudentNames.slice(0, 5)
        }
      });
      showToast(`تم إرسال التذكيرات المجدولة لـ (${sentCount}) طالب بنجاح! ✅`, 'success');
    }

    setExecutingReminder(null);
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setFeedbackToast({ message, type });
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  // Filtered scheduled reminders for list tab
  const filteredRemindersList = useMemo(() => {
    if (listStatusFilter === 'all') return scheduledReminders;
    return scheduledReminders.filter(r => r.status === listStatusFilter);
  }, [scheduledReminders, listStatusFilter]);

  const pendingCount = useMemo(() => {
    return scheduledReminders.filter(r => r.status === 'pending').length;
  }, [scheduledReminders]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto" dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl border border-slate-200/80 overflow-hidden my-4 max-h-[92vh] flex flex-col text-right"
      >
        {/* Top Header Banner */}
        <div className="p-6 sm:p-7 bg-gradient-to-l from-slate-900 via-slate-850 to-emerald-950 text-white border-b border-slate-800 flex items-start justify-between gap-4 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />

          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-13 h-13 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shrink-0">
              <Calendar size={26} className="animate-pulse text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] bg-emerald-600/90 text-white px-2.5 py-0.5 rounded-full font-black flex items-center gap-1 shadow-xs">
                  <Clock size={11} />
                  <span>جدولة WhatsApp الآلية الذكية</span>
                </span>
                <span className="text-slate-500 text-xs">•</span>
                <span className="text-emerald-300 text-xs font-bold font-mono">
                  {pendingCount} مواعيد قيد الانتظار ⏳
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1 flex items-center gap-2">
                <span>جدولة رسائل WhatsApp التذكيرية للأرصدة المنخفضة</span>
              </h3>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                تحديد موعد وتوقيت مستقبلي لإرسال تذكيرات سداد الذمم والأرصدة الحرجة لأولياء الأمور تلقائياً
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer shrink-0 relative z-10"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher (Schedule New vs. Reminders List) */}
        <div className="flex items-center justify-between gap-2 px-6 sm:px-8 py-3 bg-slate-100/90 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('list');
                setEditingReminderId(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <History size={14} />
              <span>جدول ومواعيد التذكيرات ({scheduledReminders.length})</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 bg-emerald-500 text-white text-[9px] rounded-full font-mono">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={handleStartCreate}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Plus size={14} />
              <span>{editingReminderId ? 'تعديل الموعد المحدد' : 'جدولة موعد تذكير جديد ➕'}</span>
            </button>
          </div>

          {/* Quick Info */}
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-500 font-bold">
            <ShieldAlert size={13} className="text-rose-500" />
            <span>الطلاب ذوو الأرصدة السالبة حالياً: <strong className="text-rose-600 font-mono font-black">{negativeStudents.length}</strong></span>
          </div>
        </div>

        {/* Toast Alert */}
        {feedbackToast && (
          <div className={`mx-6 sm:mx-8 mt-4 p-3.5 rounded-2xl text-xs font-black flex items-center gap-2 border ${
            feedbackToast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            {feedbackToast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600" /> : <AlertCircle size={16} className="text-rose-600" />}
            <span>{feedbackToast.message}</span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
          
          {/* VIEW: SCHEDULE REMINDER FORM */}
          {activeTab === 'create' && (
            <div className="space-y-6">
              
              {/* Title and Scope Settings */}
              <div className="bg-slate-50/80 p-5 rounded-3xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <Sparkles size={14} className="text-emerald-600" />
                    <span>عنوان وتفاصيل التذكير المجدول:</span>
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">اسم وصفي لتسهيل متابعة التذكير</span>
                </div>
                
                <input
                  type="text"
                  value={reminderTitle}
                  onChange={e => setReminderTitle(e.target.value)}
                  placeholder="مثال: تذكير سداد ذمم نهاية الأسبوع، أو تذكير شحن الرصيد لمنتصف الشهر..."
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-2xl text-xs font-black text-slate-900 outline-none focus:ring-4 focus:ring-emerald-500/15 focus:border-emerald-500 transition-all"
                />

                {/* Target Mode Selector */}
                <div className="space-y-2 pt-2">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Users size={14} className="text-emerald-600" />
                    <span>الفئة المستهدفة بالتذكير المجدول:</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                    {[
                      { 
                        mode: 'over_debt_limit', 
                        label: '🚨 متجاوزو سقف الدين', 
                        count: overDebtLimitStudents.length, 
                        desc: 'تجاوزوا الحد المسموح للأكاديمية' 
                      },
                      { 
                        mode: 'negative', 
                        label: '🔴 ذوو الأرصدة السالبة', 
                        count: negativeStudents.length, 
                        desc: 'الطلاب الذين عليهم ديون مستحقة' 
                      },
                      { 
                        mode: 'critical', 
                        label: '⚠️ دون حد الأمان', 
                        count: criticalStudents.length, 
                        desc: 'الأرصدة المقاربة للنفاذ' 
                      },
                      { 
                        mode: 'all_debtors', 
                        label: '👥 كافة المستحقين للشحن', 
                        count: allDebtorsStudents.length, 
                        desc: 'الرصيد السالب أو المقارب للسقف' 
                      },
                      { 
                        mode: 'custom', 
                        label: '🎯 تحديد يدوي', 
                        count: selectedStudentIds.length, 
                        desc: 'اختيار يدوي من القائمة' 
                      }
                    ].map(opt => (
                      <button
                        key={opt.mode}
                        type="button"
                        onClick={() => {
                          setTargetMode(opt.mode as any);
                          if (opt.mode === 'custom' && selectedStudentIds.length === 0) {
                            setSelectedStudentIds(negativeStudents.map(s => s.id));
                          }
                        }}
                        className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                          targetMode === opt.mode
                            ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black">{opt.label}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                            targetMode === opt.mode ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {opt.count}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Student Selection Picker if mode is custom */}
                {targetMode === 'custom' && (
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-800">
                        اختر الطلاب المراد تضمينهم في هذا الموعد المجدول ({selectedStudentIds.length} محدد):
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedStudentIds.length === filteredStudentsForCustomPicker.length) {
                              setSelectedStudentIds([]);
                            } else {
                              setSelectedStudentIds(filteredStudentsForCustomPicker.map(s => s.id));
                            }
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black cursor-pointer"
                        >
                          {selectedStudentIds.length === filteredStudentsForCustomPicker.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                        </button>
                        <div className="relative">
                          <input
                            type="text"
                            value={searchStudentTerm}
                            onChange={e => setSearchStudentTerm(e.target.value)}
                            placeholder="بحث باسم الطالب أو الهاتف..."
                            className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none w-48 text-right"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
                      {filteredStudentsForCustomPicker.map(student => {
                        const bal = calculateStudentBalance(student);
                        const isChecked = selectedStudentIds.includes(student.id);
                        return (
                          <div
                            key={student.id}
                            onClick={() => {
                              setSelectedStudentIds(prev => 
                                isChecked ? prev.filter(id => id !== student.id) : [...prev, student.id]
                              );
                            }}
                            className={`p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                              isChecked ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="w-4 h-4 rounded text-emerald-600 accent-emerald-600 cursor-pointer"
                              />
                              <span className="text-xs font-black text-slate-900">{student.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-mono">
                              <span className={bal < 0 ? 'text-rose-600 font-black' : 'text-slate-600'}>
                                {bal} ₪
                              </span>
                              {student.phone && <span className="text-slate-400 font-sans">📱 {student.phone}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Date & Time Scheduling Configuration */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <Calendar size={15} className="text-emerald-600" />
                    <span>تحديد موعد وتوقيت الإرسال الآلي:</span>
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">اختر الموعد بدقة أو استخدم الاختصارات السريعة</span>
                </div>

                {/* Quick Schedule Shortcuts */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-400">اختصارات زمنية سريعة ومقترحة:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-1.5">
                    {[
                      { key: 'in_1_hour', label: 'بعد ساعة ⏱️' },
                      { key: 'in_2_hours', label: 'بعد ساعتين ⏳' },
                      { key: 'tomorrow_morning', label: 'غداً 10:00 ص 🌅' },
                      { key: 'tomorrow_evening', label: 'غداً 05:00 م 🌇' },
                      { key: 'in_3_days', label: 'بعد 3 أيام 📅' },
                      { key: 'next_week', label: 'بعد أسبوع 🗓️' }
                    ].map(item => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => applyShortcut(item.key as any)}
                        className="py-2 px-1.5 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-900 border border-slate-200 rounded-xl text-[10px] font-black transition-all text-center cursor-pointer active:scale-95"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Exact Date & Time Pickers */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 flex items-center gap-1">
                      <Calendar size={13} className="text-emerald-600" />
                      <span>تاريخ الإرسال (اليوم / الشهر / السنة):</span>
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setScheduledDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 focus:border-emerald-500 rounded-2xl font-bold text-xs text-slate-800 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 flex items-center gap-1">
                      <Clock size={13} className="text-emerald-600" />
                      <span>وقت وساعة الإرسال:</span>
                    </label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={e => setScheduledTime(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-300 focus:border-emerald-500 rounded-2xl font-bold text-xs text-slate-800 outline-none"
                    />
                  </div>
                </div>

                {/* Recurrence & Auto-Send Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 flex items-center gap-1">
                      <Repeat size={13} className="text-emerald-600" />
                      <span>التكرار الدوري للتذكير:</span>
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { val: 'once', label: 'مرة واحدة' },
                        { val: 'daily', label: 'يومياً' },
                        { val: 'weekly', label: 'أسبوعياً' },
                        { val: 'monthly', label: 'شهرياً' }
                      ].map(rep => (
                        <button
                          key={rep.val}
                          type="button"
                          onClick={() => setRepeatInterval(rep.val as any)}
                          className={`py-2 px-1 text-[10px] font-black rounded-xl border transition-all cursor-pointer text-center ${
                            repeatInterval === rep.val
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {rep.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 flex items-center gap-1">
                      <Bell size={13} className="text-emerald-600" />
                      <span>نمط التشغيل عند حلول الموعد:</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAutoSend(true)}
                        className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                          autoSend 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500' 
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="text-[11px] font-black block">⚡ إرسال مباشر وتنبيه</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">فتح معالج الإرسال فوراً</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setAutoSend(false)}
                        className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                          !autoSend 
                            ? 'bg-amber-50 border-amber-500 text-amber-950 ring-1 ring-amber-500' 
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="text-[11px] font-black block">🔔 تنبيه المنسق فقط</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">طلب اعتماد المدير أولاً</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Template Presets & Custom Message Editor */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 flex items-center gap-2">
                    <MessageSquare size={15} className="text-emerald-600" />
                    <span>صيغة وقالب رسالة التذكير المجدولة:</span>
                  </label>
                  <span className="text-[10px] font-bold text-slate-400">انقر على أي نموذج للاعتماد والتعديل</span>
                </div>

                {/* Preset Chips */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {SCHEDULED_TEMPLATE_PRESETS.map(preset => {
                    const isActive = messageTemplate === preset.template;
                    return (
                      <div
                        key={preset.id}
                        onClick={() => setMessageTemplate(preset.template)}
                        className={`p-3 rounded-2xl border text-right cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                          isActive
                            ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                            : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900">{preset.title}</span>
                          <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full ${
                            isActive ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {preset.badge}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-500 font-bold leading-relaxed">{preset.desc}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Token Inserts */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-[10px] font-black text-slate-400">إدراج وسوم ديناميكية:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { tag: '{studentName}', label: 'اسم الطالب' },
                        { tag: '{balance}', label: 'الرصيد ₪' },
                        { tag: '{debtAmount}', label: 'مبلغ الذمة' },
                        { tag: '{threshold}', label: 'حد الأمان' },
                        { tag: '{academyName}', label: 'اسم الأكاديمية' },
                        { tag: '{date}', label: 'التاريخ' }
                      ].map(item => (
                        <button
                          key={item.tag}
                          type="button"
                          onClick={() => setMessageTemplate(prev => prev + ' ' + item.tag)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-100 hover:text-emerald-900 text-slate-700 rounded-lg font-mono text-[9px] font-bold transition-colors cursor-pointer border border-slate-200"
                        >
                          {item.tag} <span className="font-sans text-[8px] text-slate-500">({item.label})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <textarea
                    rows={3}
                    value={messageTemplate}
                    onChange={e => setMessageTemplate(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-xs text-right text-slate-800 leading-relaxed"
                    placeholder="نص رسالة التذكير..."
                  />
                </div>

                {/* Live Realistic WhatsApp Bubble Preview */}
                {currentTargetStudents.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                        <span>معاينة حية لشكل رسالة WhatsApp عند الإرسال:</span>
                      </span>
                      {currentTargetStudents.length > 1 && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500">
                          <span>طالب تجريبي: <strong>{currentTargetStudents[previewStudentIndex]?.name}</strong></span>
                          <button
                            type="button"
                            onClick={() => setPreviewStudentIndex((previewStudentIndex + 1) % currentTargetStudents.length)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[9px] font-black cursor-pointer mr-1"
                          >
                            التالي ↻
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="bg-[#ECE5DD] p-4 rounded-2xl border border-slate-300 max-w-xl shadow-inner">
                      <div className="bg-white rounded-2xl p-3.5 shadow-sm text-right space-y-2 border border-emerald-100">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[9px] font-black flex items-center justify-center">
                              💬
                            </span>
                            <span className="text-[11px] font-black text-emerald-900">
                              {currentTargetStudents[previewStudentIndex]?.name || 'محمد أحمد'}
                            </span>
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 font-mono">
                            {scheduledTime || '10:00'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-line">
                          {formatScheduledWhatsAppMessage(
                            currentTargetStudents[previewStudentIndex] || students[0] || ({ id: 'demo', name: 'أحمد محمود' } as any),
                            messageTemplate,
                            calculateStudentBalance(currentTargetStudents[previewStudentIndex] || students[0] || ({} as any)),
                            lowBalanceThreshold,
                            academyName
                          )}
                        </p>
                        <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-50">
                          <span className="text-[9px] text-slate-400 font-mono">{scheduledTime || '10:00'}</span>
                          <span className="text-emerald-500 text-[10px] font-bold">✓✓</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Action Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200">
                <div className="text-xs text-slate-600 font-bold">
                  إجمالي الطلاب المشمولين في هذا التذكير: <strong className="text-emerald-700 font-black font-mono">{currentTargetStudents.length}</strong> طلاب
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setActiveTab('list')}
                    className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveReminder}
                    className="flex-1 sm:flex-none px-7 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-950/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer border border-emerald-500"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Calendar size={15} />
                    )}
                    <span>{editingReminderId ? 'حفظ تعديلات الموعد ⏰' : 'تأكيد وحفظ موعد الجدولة ⏰✅'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: SCHEDULED REMINDERS LIST */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              
              {/* Filter Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { key: 'all', label: 'كافة المواعيد', count: scheduledReminders.length },
                    { key: 'pending', label: 'قيد الانتظار ⏳', count: scheduledReminders.filter(r => r.status === 'pending').length },
                    { key: 'completed', label: 'تم التنفيذ ✅', count: scheduledReminders.filter(r => r.status === 'completed').length },
                    { key: 'cancelled', label: 'ملغاة ❌', count: scheduledReminders.filter(r => r.status === 'cancelled').length }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setListStatusFilter(tab.key as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        listStatusFilter === tab.key
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                        listStatusFilter === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                >
                  <Plus size={13} />
                  <span>جدولة تذكير جديد ⏰</span>
                </button>
              </div>

              {/* Progress alert if actively running execution */}
              {executionProgress && (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-2 text-right">
                  <div className="flex items-center justify-between text-xs font-black text-emerald-800">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      <span>جاري إرسال تذكيرات WhatsApp للمستحقين في الموعد...</span>
                    </span>
                    <span className="font-mono">{executionProgress.current} من {executionProgress.total}</span>
                  </div>
                  <div className="w-full bg-emerald-200/60 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${(executionProgress.current / executionProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Reminders List */}
              {filteredRemindersList.length === 0 ? (
                <div className="py-14 text-center space-y-3 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                    <Calendar size={28} />
                  </div>
                  <h4 className="text-sm font-black text-slate-800">لا توجد مواعيد تذكير مجدولة في هذا التصنيف</h4>
                  <p className="text-xs text-slate-400 font-bold max-w-sm mx-auto">
                    يمكنك تحديد موعد جديد لإرسال رسائل WhatsApp التذكيرية للطلاب ذوي الرصيد المنخفض تلقائياً بضغطة زر.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>جدولة أول تذكير الآن</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRemindersList.map(reminder => {
                    const remaining = formatArabicRemainingTime(reminder.scheduledAt);
                    const isPending = reminder.status === 'pending';
                    const isCompleted = reminder.status === 'completed';
                    const isCancelled = reminder.status === 'cancelled';

                    return (
                      <div
                        key={reminder.id}
                        className={`p-5 rounded-3xl border transition-all text-right space-y-3 ${
                          isPending 
                            ? remaining.isDueNow
                              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30'
                              : 'bg-white border-slate-200/90 hover:border-emerald-300 shadow-xs'
                            : isCompleted
                              ? 'bg-slate-50/70 border-slate-200/70 opacity-80'
                              : 'bg-rose-50/40 border-rose-200/60 opacity-60'
                        }`}
                      >
                        {/* Header: Title, Status, Recurrence */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                              isPending
                                ? remaining.isDueNow ? 'bg-amber-500 text-white animate-bounce' : 'bg-emerald-100 text-emerald-700'
                                : isCompleted ? 'bg-slate-200 text-slate-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {isPending ? '⏰' : isCompleted ? '✓' : '✕'}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-xs sm:text-sm font-black text-slate-900">{reminder.title}</h4>
                                {reminder.repeatInterval && reminder.repeatInterval !== 'once' && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                    <Repeat size={10} />
                                    <span>
                                      {reminder.repeatInterval === 'daily' ? 'يومي' : reminder.repeatInterval === 'weekly' ? 'أسبوعي' : 'شهري'}
                                    </span>
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-bold flex-wrap">
                                <span>الموعد: <strong className="text-slate-700 font-mono">{reminder.scheduledDate}</strong> الساعة <strong className="text-slate-700 font-mono">{reminder.scheduledTime}</strong></span>
                                <span>•</span>
                                <span>الاستهداف: <strong className="text-slate-700">
                                  {reminder.targetMode === 'over_debt_limit' ? 'متجاوزو سقف الدين 🚨' : reminder.targetMode === 'negative' ? 'الأرصدة السالبة' : reminder.targetMode === 'critical' ? 'دون حد الأمان' : reminder.targetMode === 'all_debtors' ? 'كافة المستحقين' : 'مخصص'}
                                </strong></span>
                              </div>
                            </div>
                          </div>

                          {/* Status and Remaining Timer Badge */}
                          <div className="flex items-center gap-2 shrink-0">
                            {isPending && (
                              <span className={`px-3 py-1 rounded-xl text-[10px] font-black flex items-center gap-1.5 ${
                                remaining.isDueNow
                                  ? 'bg-amber-500 text-white animate-pulse shadow-xs'
                                  : remaining.isPast
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}>
                                <Timer size={12} />
                                <span>{remaining.text}</span>
                              </span>
                            )}

                            {isCompleted && (
                              <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-slate-100 text-slate-700 flex items-center gap-1">
                                <Check size={12} />
                                <span>تم الإرسال بنجاح</span>
                              </span>
                            )}

                            {isCancelled && (
                              <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-rose-100 text-rose-700">
                                ملغي
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle: Preview of Message and Stats */}
                        <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/70 text-[11px] text-slate-600 font-medium leading-relaxed">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
                            <span>نص الرسالة المعتمدة:</span>
                            {reminder.recipientsCount ? (
                              <span>الطلاب المستهدفون: <strong className="text-slate-700 font-mono">{reminder.recipientsCount}</strong> طالب</span>
                            ) : null}
                          </div>
                          <p className="line-clamp-2 italic text-slate-700">
                            "{reminder.messageTemplate}"
                          </p>
                        </div>

                        {/* Last Run details if completed */}
                        {reminder.lastRunDetails && (
                          <div className="text-[10px] text-slate-500 font-bold flex items-center gap-2 flex-wrap">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span>
                              تم الإرسال لـ <strong className="text-emerald-700 font-mono">{reminder.lastRunDetails.sentCount}</strong> طالب في {new Date(reminder.lastRunDetails.executedAt).toLocaleDateString('ar-EG')}
                            </span>
                            {reminder.lastRunDetails.skippedCount > 0 && (
                              <span>• تم تخطي {reminder.lastRunDetails.skippedCount} لعدم توفر رقم هاتف</span>
                            )}
                          </div>
                        )}

                        {/* Actions Row */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
                          <div className="text-[9px] text-slate-400 font-bold">
                            أنشئ بواسطة: {reminder.createdBy || 'المدير المنسق'} • {new Date(reminder.createdAt).toLocaleDateString('ar-EG')}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleExecuteNow(reminder)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                                  title="إرسال فوري الآن دون انتظار الموعد"
                                >
                                  <Send size={12} />
                                  <span>إرسال فوري الآن 🚀</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(reminder)}
                                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors flex items-center gap-1 cursor-pointer"
                                  title="تعديل وقت أو تاريخ التذكير"
                                >
                                  <Edit3 size={12} />
                                  <span>تعديل الموعد</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleCancelReminder(reminder)}
                                  className="px-2.5 py-1.5 bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                  title="إلغاء التذكير"
                                >
                                  إلغاء
                                </button>
                              </>
                            )}

                            {!isPending && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(reminder)}
                                className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Repeat size={12} />
                                <span>إعادة الجدولة</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeleteReminder(reminder)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="حذف السجل نهائياً"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-500 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>نظام الجدولة متصل بقاعدة بيانات الأكاديمية ويفحص الاستحقاقات تلقائياً 🟢</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-black text-xs transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </motion.div>
    </div>
  );
};
