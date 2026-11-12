import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Student } from '../types';
import { 
  X, MessageSquare, Copy, Check, Sparkles, RefreshCw, AlertTriangle, 
  Phone, User, DollarSign, Clock, Search, CheckCircle2, Info, ChevronDown,
  RotateCcw, Send, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  formatWhatsAppPhone972, 
  cleanLocalPhoneDigits, 
  openWhatsAppChat, 
  getBestParentOrStudentPhone,
  generatePackageRenewalWhatsAppMessage,
  generateParentBalanceMessage
} from '../lib/phoneUtils';
import { getStudentDefaultHourlyRate } from '../lib/sessionPricing';
import { logActivity } from '../lib/activityLogger';

export interface CustomWhatsAppAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  initialStudent?: Student | null;
  initialTemplateKey?: string;
  lowBalanceThreshold?: number;
  defaultStudentHourlyRate?: number;
  getStudentStats: (studentId: string) => {
    balance: number;
    totalSpent: number;
    totalToppedUp: number;
    totalHours: number;
  };
  onSentSuccess?: (studentId: string) => void;
}

export type TemplateKey = 
  | 'low_balance_renewal' 
  | 'friendly_recharge' 
  | 'debt_settlement' 
  | 'detailed_statement' 
  | 'urgent_warning' 
  | 'custom_free';

interface TemplateDefinition {
  key: TemplateKey;
  title: string;
  tag: string;
  tagColor: string;
  icon: string;
  description: string;
  generateText: (params: {
    studentName: string;
    balance: number;
    lessonsCount: number;
    hoursRemaining: number;
    totalHours: number;
    totalToppedUp: number;
    totalSpent: number;
    debtAmount: number;
    threshold: number;
  }) => string;
}

export const CustomWhatsAppAlertModal: React.FC<CustomWhatsAppAlertModalProps> = ({
  isOpen,
  onClose,
  students,
  initialStudent,
  initialTemplateKey = 'low_balance_renewal',
  lowBalanceThreshold = 150,
  defaultStudentHourlyRate = 60,
  getStudentStats,
  onSentSuccess
}) => {
  // Current Selected Student
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentFilterCategory, setStudentFilterCategory] = useState<'all' | 'low' | 'debt'>('all');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);

  // Template & Message States
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<TemplateKey>(
    (initialTemplateKey as TemplateKey) || 'low_balance_renewal'
  );
  const [messageText, setMessageText] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Find active student object
  const activeStudent = useMemo(() => {
    return students.find(s => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  // Compute stats for current active student
  const activeStats = useMemo(() => {
    if (!activeStudent) {
      return { balance: 0, totalSpent: 0, totalToppedUp: 0, totalHours: 0 };
    }
    return getStudentStats(activeStudent.id);
  }, [activeStudent, getStudentStats]);

  // Session rate & lessons calculation
  const sessionRate = useMemo(() => {
    if (!activeStudent) return defaultStudentHourlyRate;
    return getStudentDefaultHourlyRate(activeStudent, { defaultStudentHourlyRate });
  }, [activeStudent, defaultStudentHourlyRate]);

  const studentThreshold = useMemo(() => {
    if (!activeStudent) return lowBalanceThreshold;
    return typeof activeStudent.lowBalanceThreshold === 'number' 
      ? activeStudent.lowBalanceThreshold 
      : lowBalanceThreshold;
  }, [activeStudent, lowBalanceThreshold]);

  const lessonsCount = useMemo(() => {
    if (sessionRate > 0 && activeStats.balance > 0) {
      return Math.max(1, Math.round(activeStats.balance / sessionRate));
    }
    return activeStats.balance > 0 ? Math.max(1, Math.round(activeStats.balance / 60)) : 0;
  }, [activeStats.balance, sessionRate]);

  const hoursRemaining = useMemo(() => {
    return sessionRate > 0 && activeStats.balance > 0 ? activeStats.balance / sessionRate : 0;
  }, [activeStats.balance, sessionRate]);

  // Template definitions
  const TEMPLATES: TemplateDefinition[] = useMemo(() => [
    {
      key: 'low_balance_renewal',
      title: 'قالب انخفاض الرصيد واقتراب النفاذ (المعتمد الرسمي)',
      tag: 'معتمد وموصى به 🌸',
      tagColor: 'bg-amber-100 text-amber-900 border-amber-300',
      icon: '⚡',
      description: 'الرسالة الرسمية المعتمدة لحث ولي الأمر على تجديد الحزمة قبل نفاد الرصيد المتبقي',
      generateText: ({ studentName, balance, lessonsCount }) => {
        const balRound = Math.round(balance);
        const approxLessons = ` (ما يعادل ${lessonsCount} حصة دراسية)`;
        return `السلام عليكم ورحمة الله وبركاته، تحية طيبة من إدارة أكاديمية التفوق أون لاين.\n\nنود إبلاغكم بأن الرصيد المالي الحالي المتوفر في محفظة الطالب/ة (${studentName}) هو (${balRound} ₪)${approxLessons}.\n\nارجو التواصل مع إدارة المنصة لتجديد الحزمة \n\nشاكرين ثقتكم الدائمة بأكاديميتنا ونتمنى لـ (${studentName}) دوام التفوق والنجاح 🌸`;
      }
    },
    {
      key: 'friendly_recharge',
      title: 'تذكير لطيف وودي بشحن المحفظة',
      tag: 'تذكير ودي 🌟',
      tagColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      icon: '🌸',
      description: 'رسالة تذكير هادئة ولطيفة بالرصيد الحالي لمتابعة الحصص التعليمية بيسر',
      generateText: ({ studentName, balance }) => {
        const balRound = Math.round(balance);
        return `السلام عليكم ورحمة الله وبركاته، تحية طيبة من إدارة أكاديمية التفوق أون لاين 🌸\n\nللتذكير بلطف: الرصيد المالي المتوفر في محفظة الطالب/ة (${studentName}) حالياً هو (${balRound} ₪).\n\nنرجو التكرم بالمبادرة لشحن المحفظة لضمان متابعة اللقاءات والدروس التعليمية بيسر وسهولة.\n\nدمتم بخير وصحة وعافية، ونتمنى لـ (${studentName}) كل التوفيق والتميز 🌟`;
      }
    },
    {
      key: 'debt_settlement',
      title: 'سداد الذمم والمستحقات (للأرصدة المكشوفة/السالبة)',
      tag: 'عاجل للأرصدة السالبة 🚨',
      tagColor: 'bg-rose-100 text-rose-900 border-rose-300',
      icon: '🚨',
      description: 'إشعار مالي بتسوية وسداد المبالغ المستحقة للأرصدة بالسالب',
      generateText: ({ studentName, balance, debtAmount }) => {
        return `السلام عليكم ورحمة الله وبركاته، تحية طيبة من إدارة أكاديمية التفوق أون لاين 🌸\n\nنود إحاطة عنايتكم الكريمة بأن رصيد الطالب/ة (${studentName}) مسجل حالياً بالسالب بقيمة (${balance} ₪) بمبلغ مستحق قدره (${debtAmount} ₪).\n\nنرجو منكم التكرم بتسوية وسداد المبلغ المستحق وشحن رصيد المحفظة لضمان استمرار الحصص والدروس دون انقطاع.\n\nشاكرين حسن تعاونكم الأكاديمي وثقتكم الدائمة بنا 🌸`;
      }
    },
    {
      key: 'detailed_statement',
      title: 'كشف حساب تفصيلي بساعات الحضور',
      tag: 'كشف شامل 📊',
      tagColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
      icon: '📊',
      description: 'بيان موثق بساعات التدريس المنجزة وإجمالي الشحن والرصيد المتبقي',
      generateText: ({ studentName, balance, totalHours, totalToppedUp, totalSpent, debtAmount }) => {
        return `السلام عليكم ورحمة الله وبركاته، تحية طيبة من إدارة أكاديمية التفوق أون لاين 📋\n\nكشف حساب وإحصائيات الطالب/ة (${studentName}):\n- ساعات التدريس المنفذة: (${totalHours.toFixed(1)} ساعة)\n- إجمالي مبالغ الشحن السابقة: (${totalToppedUp} ₪)\n- إجمالي تكلفة اللقاءات: (${totalSpent} ₪)\n- الرصيد المالي الحالي: (${balance} ₪)${debtAmount > 0 ? `\n- المبلغ المطلوب سداده: (${debtAmount} ₪)` : ''}\n\nنرجو الاطلاع والمتابعة مع جزيل الشكر والتقدير لتعاونكم معنا 🌸`;
      }
    },
    {
      key: 'urgent_warning',
      title: 'إشعار نهائي لتفادي إيقاف وتعليق الحصص',
      tag: 'تنبيه نهائي ⚠️',
      tagColor: 'bg-red-100 text-red-900 border-red-300',
      icon: '⚠️',
      description: 'إشعار حازم للمطالبة بسداد الرصيد السالب لتفادي تعليق الدروس القادمة',
      generateText: ({ studentName, balance, debtAmount }) => {
        return `تنبيه مالي عاجل من إدارة أكاديمية التفوق أون لاين ⚠️\n\nنلفت عنايتكم الكريمة إلى أن حساب الطالب/ة (${studentName}) بلغ رصيده بالسالب (${balance} ₪) بمستحقات مالية قدرها (${debtAmount} ₪).\n\nيرجى التكرم بتسديد المبلغ وشحن المحفظة بأسرع وقت لتفادي تعليق الدروس والحصص التعليمية القادمة.\n\nشاكرين تفهمكم وحرصكم الدائم على مصلحة الطالب 🌸`;
      }
    },
    {
      key: 'custom_free',
      title: 'رسالة مخصصة (كتابة حرة)',
      tag: 'قالب حر ✍️',
      tagColor: 'bg-slate-100 text-slate-800 border-slate-300',
      icon: '✍️',
      description: 'صياغة رسالة حرة مع الحفاظ على الترويسة الأكاديمية والترحيبية',
      generateText: ({ studentName }) => {
        return `السلام عليكم ورحمة الله وبركاته، تحية طيبة من إدارة أكاديمية التفوق أون لاين 🌸\n\nنود التواصل معكم بخصوص الطالب/ة (${studentName})...\n\n\nشاكرين ومقدرين ثقتكم الدائمة بأكاديميتنا، ونتمنى لـ (${studentName}) دوام التفوق والنجاح 🌸`;
      }
    }
  ], []);

  // When modal opens or initial student/template changes, initialize values
  useEffect(() => {
    if (!isOpen) return;

    let targetStudent = initialStudent;
    if (!targetStudent && students.length > 0) {
      // Pick first student with low balance, or first in list
      targetStudent = students.find(s => {
        const stats = getStudentStats(s.id);
        const thresh = typeof s.lowBalanceThreshold === 'number' ? s.lowBalanceThreshold : lowBalanceThreshold;
        return stats.balance < thresh;
      }) || students[0];
    }

    if (targetStudent) {
      setSelectedStudentId(targetStudent.id);
      const rawPhone = getBestParentOrStudentPhone(targetStudent);
      setRecipientPhone(formatWhatsAppPhone972(rawPhone));

      const stats = getStudentStats(targetStudent.id);
      const rate = getStudentDefaultHourlyRate(targetStudent, { defaultStudentHourlyRate });
      const lessons = rate > 0 && stats.balance > 0 ? Math.max(1, Math.round(stats.balance / rate)) : 0;
      const hours = rate > 0 && stats.balance > 0 ? stats.balance / rate : 0;
      const thresh = typeof targetStudent.lowBalanceThreshold === 'number' ? targetStudent.lowBalanceThreshold : lowBalanceThreshold;
      const debt = stats.balance < 0 ? Math.abs(stats.balance) : 0;

      const templateDef = TEMPLATES.find(t => t.key === initialTemplateKey) || TEMPLATES[0];
      setSelectedTemplateKey(templateDef.key);

      const generated = templateDef.generateText({
        studentName: targetStudent.name || 'عزيزنا الطالب',
        balance: stats.balance,
        lessonsCount: lessons,
        hoursRemaining: hours,
        totalHours: stats.totalHours,
        totalToppedUp: stats.totalToppedUp,
        totalSpent: stats.totalSpent,
        debtAmount: debt,
        threshold: thresh
      });
      setMessageText(generated);
    }
  }, [isOpen, initialStudent, initialTemplateKey, students]);

  // When student selection changes from within the modal
  const handleStudentSelect = (student: Student) => {
    setSelectedStudentId(student.id);
    setIsStudentDropdownOpen(false);

    const rawPhone = getBestParentOrStudentPhone(student);
    setRecipientPhone(formatWhatsAppPhone972(rawPhone));

    const stats = getStudentStats(student.id);
    const rate = getStudentDefaultHourlyRate(student, { defaultStudentHourlyRate });
    const lessons = rate > 0 && stats.balance > 0 ? Math.max(1, Math.round(stats.balance / rate)) : 0;
    const hours = rate > 0 && stats.balance > 0 ? stats.balance / rate : 0;
    const thresh = typeof student.lowBalanceThreshold === 'number' ? student.lowBalanceThreshold : lowBalanceThreshold;
    const debt = stats.balance < 0 ? Math.abs(stats.balance) : 0;

    const templateDef = TEMPLATES.find(t => t.key === selectedTemplateKey) || TEMPLATES[0];
    const generated = templateDef.generateText({
      studentName: student.name || 'عزيزنا الطالب',
      balance: stats.balance,
      lessonsCount: lessons,
      hoursRemaining: hours,
      totalHours: stats.totalHours,
      totalToppedUp: stats.totalToppedUp,
      totalSpent: stats.totalSpent,
      debtAmount: debt,
      threshold: thresh
    });
    setMessageText(generated);
  };

  // When manager changes template
  const handleTemplateSelect = (tmpl: TemplateDefinition) => {
    setSelectedTemplateKey(tmpl.key);
    if (!activeStudent) return;

    const debt = activeStats.balance < 0 ? Math.abs(activeStats.balance) : 0;
    const generated = tmpl.generateText({
      studentName: activeStudent.name || 'عزيزنا الطالب',
      balance: activeStats.balance,
      lessonsCount,
      hoursRemaining,
      totalHours: activeStats.totalHours,
      totalToppedUp: activeStats.totalToppedUp,
      totalSpent: activeStats.totalSpent,
      debtAmount: debt,
      threshold: studentThreshold
    });
    setMessageText(generated);
  };

  // Reset to original template
  const handleResetTemplate = () => {
    const tmpl = TEMPLATES.find(t => t.key === selectedTemplateKey) || TEMPLATES[0];
    handleTemplateSelect(tmpl);
  };

  // Insert variable at cursor
  const handleInsertVariable = (val: string) => {
    if (!textareaRef.current) {
      setMessageText(prev => prev + val);
      return;
    }
    const elem = textareaRef.current;
    const start = elem.selectionStart;
    const end = elem.selectionEnd;
    const newText = messageText.substring(0, start) + val + messageText.substring(end);
    setMessageText(newText);
    setTimeout(() => {
      elem.focus();
      elem.setSelectionRange(start + val.length, start + val.length);
    }, 50);
  };

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(messageText).then(() => {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    }).catch(() => {
      alert('تعذر النسخ التلقائي.');
    });
  };

  // Send via WhatsApp
  const handleSendWhatsApp = () => {
    if (!recipientPhone.trim()) {
      alert('يرجى إدخال رقم هاتف المستلم (ولي الأمر أو الطالب) قبل الإرسال.');
      return;
    }

    openWhatsAppChat(recipientPhone, messageText);

    if (activeStudent) {
      if (onSentSuccess) {
        onSentSuccess(activeStudent.id);
      }

      logActivity({
        actionType: 'SEND_CUSTOM_WHATSAPP_TEMPLATE',
        actionName: 'إرسال قالب رسالة واتساب مخصص',
        details: `تم إرسال قالب (${selectedTemplateKey}) لولي أمر الطالب (${activeStudent.name}) برصيد (${activeStats.balance} ₪)`,
        studentId: activeStudent.id,
        studentName: activeStudent.name,
        amount: activeStats.balance
      }).catch(err => console.error(err));
    }

    onClose();
  };

  // Filtered students for dropdown
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (s.archived) return false;
      const stats = getStudentStats(s.id);
      const thresh = typeof s.lowBalanceThreshold === 'number' ? s.lowBalanceThreshold : lowBalanceThreshold;

      if (studentFilterCategory === 'low' && stats.balance >= thresh) return false;
      if (studentFilterCategory === 'debt' && stats.balance >= 0) return false;

      if (!studentSearchQuery.trim()) return true;
      const q = studentSearchQuery.toLowerCase().trim();
      const matchName = s.name?.toLowerCase().includes(q);
      const matchPhone = s.phone?.toLowerCase().includes(q) || s.parentPhone?.toLowerCase().includes(q);
      return matchName || matchPhone;
    });
  }, [students, studentFilterCategory, studentSearchQuery, getStudentStats, lowBalanceThreshold]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-4 sm:my-8 flex flex-col max-h-[92vh]"
        dir="rtl"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-inner">
              <MessageSquare size={24} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white font-sans">
                  إرسال وتعديل قوالب رسائل واتس آب 💬
                </h2>
                <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  معتمد 🌸
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                اختر القالب المخصص، عدّل النص بما يناسب الحالة، ثم أرسله مباشرة لولي الأمر عبر WhatsApp
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
            title="إغلاق النافذة"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-right">
          
          {/* Top Section: Student Selector & Info Bar */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <User size={16} className="text-indigo-600" />
                <span className="text-xs font-black text-slate-800">الطالب المستهدف:</span>
              </div>

              {/* Student Dropdown / Search Trigger */}
              <div className="relative flex-1 sm:max-w-md">
                <button
                  type="button"
                  onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                  className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white border border-slate-300 hover:border-indigo-500 rounded-xl text-xs font-black text-slate-900 transition-all shadow-2xs cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate">{activeStudent?.name || 'اختر طالباً...'}</span>
                    {activeStudent?.grade && (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {activeStudent.grade}
                      </span>
                    )}
                  </div>
                  <ChevronDown size={14} className="text-slate-400 shrink-0 mr-2" />
                </button>

                {/* Dropdown Menu */}
                {isStudentDropdownOpen && (
                  <div className="absolute top-full right-0 left-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-2.5 space-y-2">
                    {/* Search & Filter */}
                    <div className="relative">
                      <Search size={14} className="absolute right-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={studentSearchQuery}
                        onChange={e => setStudentSearchQuery(e.target.value)}
                        placeholder="ابحث باسم الطالب أو رقم الهاتف..."
                        className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        autoFocus
                      />
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-black pb-1 border-b border-slate-100">
                      <button
                        type="button"
                        onClick={() => setStudentFilterCategory('all')}
                        className={`px-2 py-1 rounded-lg transition-all ${studentFilterCategory === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        الكل ({students.filter(s => !s.archived).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentFilterCategory('low')}
                        className={`px-2 py-1 rounded-lg transition-all ${studentFilterCategory === 'low' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        رصيد منخفض ⚠️
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentFilterCategory('debt')}
                        className={`px-2 py-1 rounded-lg transition-all ${studentFilterCategory === 'debt' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        ذمم سالبة 🚨
                      </button>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {filteredStudents.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 py-3">لا توجد نتائج مطابقة</p>
                      ) : (
                        filteredStudents.map(student => {
                          const stats = getStudentStats(student.id);
                          const isLow = stats.balance < (typeof student.lowBalanceThreshold === 'number' ? student.lowBalanceThreshold : lowBalanceThreshold);
                          const isSelected = student.id === selectedStudentId;

                          return (
                            <button
                              key={student.id}
                              type="button"
                              onClick={() => handleStudentSelect(student)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all text-right cursor-pointer ${
                                isSelected ? 'bg-indigo-50 text-indigo-900 border border-indigo-200' : 'hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span>{student.name}</span>
                                {isLow && (
                                  <span className="text-[9px] font-black bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded">
                                    منخفض
                                  </span>
                                )}
                              </div>
                              <span className={`font-mono font-black shrink-0 ${stats.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                ₪{stats.balance}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Student Stats Pills */}
            {activeStudent && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/70">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 block">الرصيد المالي الحالي</span>
                  <span className={`text-sm font-black font-mono ${activeStats.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    ₪{activeStats.balance}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 block">ما يعادل حصص تقريبية</span>
                  <span className="text-sm font-black text-indigo-900">
                    {lessonsCount} {lessonsCount === 1 ? 'حصة' : 'حصص'}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 block">حد الأمان (عتبة التنبيه)</span>
                  <span className="text-sm font-black text-amber-700 font-mono">
                    ₪{studentThreshold}
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 block">ساعات الحضور المنفذة</span>
                  <span className="text-sm font-black text-slate-800">
                    {activeStats.totalHours.toFixed(1)} ساعة
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Recipient Phone with Israeli +972 Support */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Phone size={14} className="text-emerald-600" />
                <span>رقم هاتف المستلم (ولي الأمر / الطالب):</span>
              </label>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                المقدمة الدولية 972+ مدعومة تلقائياً 💬
              </span>
            </div>

            <div className="relative flex items-center" dir="ltr">
              <div className="bg-emerald-50 border border-r-0 border-slate-200 text-emerald-800 font-mono font-black text-xs px-3.5 py-3 rounded-l-2xl flex items-center gap-1.5 shrink-0 select-none shadow-inner">
                <Phone size={13} className="text-emerald-600" />
                <span>+972</span>
              </div>
              <input
                type="tel"
                value={cleanLocalPhoneDigits(recipientPhone)}
                onChange={e => setRecipientPhone(formatWhatsAppPhone972(e.target.value))}
                placeholder="50 123 4567"
                className="w-full px-4 py-3 bg-white border border-slate-200 focus:border-emerald-500 rounded-r-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-xs text-left font-mono text-slate-900"
              />
            </div>
            {!recipientPhone.trim() && (
              <span className="text-[10px] text-amber-600 font-bold block mr-1">
                ⚠️ تنبيه: لا يوجد رقم هاتف مسجل حالياً لهذا الطالب. يمكنك إدخال رقم ولي الأمر هنا للإرسال مباشرة.
              </span>
            )}
          </div>

          {/* Template Selection Tabs / Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                <span>اختر قالب الرسالة المخصص:</span>
              </span>
              <button
                type="button"
                onClick={handleResetTemplate}
                className="text-[10px] font-black text-slate-500 hover:text-indigo-600 flex items-center gap-1 cursor-pointer transition-colors"
                title="إعادة تعيين الرسالة لنص القالب الأصلي"
              >
                <RotateCcw size={11} />
                <span>استعادة نص القالب الأصلي</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {TEMPLATES.map(tmpl => {
                const isSelected = selectedTemplateKey === tmpl.key;
                return (
                  <button
                    key={tmpl.key}
                    type="button"
                    onClick={() => handleTemplateSelect(tmpl)}
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-2 relative ${
                      isSelected
                        ? 'bg-gradient-to-br from-emerald-50/70 to-teal-50/50 border-emerald-400 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{tmpl.icon}</span>
                        <span className="text-xs font-black text-slate-900 font-sans">
                          {tmpl.title}
                        </span>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-md border shrink-0 ${tmpl.tagColor}`}>
                        {tmpl.tag}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                      {tmpl.description}
                    </p>

                    {isSelected && (
                      <div className="flex items-center gap-1 text-[10px] font-black text-emerald-700 pt-1">
                        <CheckCircle2 size={12} />
                        <span>القالب المختار حالياً للتعديل والإرسال</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Data Insertion Chips */}
          {activeStudent && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3 space-y-1.5">
              <span className="text-[10px] font-black text-slate-500 block">
                ⚡ إدراج بيانات الطالب في النص بنقرة واحدة عند موضع المؤشر:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => handleInsertVariable(activeStudent.name)}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-[10px] font-black text-slate-700 hover:text-indigo-900 transition-all cursor-pointer shadow-2xs"
                >
                  + اسم الطالب ({activeStudent.name})
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertVariable(`${Math.round(activeStats.balance)} ₪`)}
                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg text-[10px] font-black text-slate-700 hover:text-emerald-900 transition-all cursor-pointer shadow-2xs"
                >
                  + الرصيد الحالي ({Math.round(activeStats.balance)} ₪)
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertVariable(`${lessonsCount} حصص`)}
                  className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 rounded-lg text-[10px] font-black text-slate-700 hover:text-amber-900 transition-all cursor-pointer shadow-2xs"
                >
                  + ما يعادل حصص ({lessonsCount} حصة)
                </button>
                {activeStats.balance < 0 && (
                  <button
                    type="button"
                    onClick={() => handleInsertVariable(`${Math.abs(Math.round(activeStats.balance))} ₪`)}
                    className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 rounded-lg text-[10px] font-black text-slate-700 hover:text-rose-900 transition-all cursor-pointer shadow-2xs"
                  >
                    + المبلغ المستحق ({Math.abs(Math.round(activeStats.balance))} ₪)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleInsertVariable(`${activeStats.totalHours.toFixed(1)} ساعة`)}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-[10px] font-black text-slate-700 hover:text-indigo-900 transition-all cursor-pointer shadow-2xs"
                >
                  + ساعات الحضور ({activeStats.totalHours.toFixed(1)} ساعة)
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertVariable('أكاديمية التفوق أون لاين')}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black text-slate-700 transition-all cursor-pointer shadow-2xs"
                >
                  + اسم الأكاديمية
                </button>
              </div>
            </div>
          )}

          {/* Message Text Editor & Live Preview Switcher */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-black text-slate-800">
                  محرر نص الرسالة (قابل للتعديل بالكامل قبل الإرسال):
                </label>
                <span className="text-[10px] text-slate-400 font-bold">
                  ({messageText.length} حرف)
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Mode Switcher */}
                <div className="bg-slate-100 p-0.5 rounded-xl flex items-center gap-0.5 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                      activeTab === 'edit' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    محرر النص ✍️
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                      activeTab === 'preview' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    معاينة واتساب 📱
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="text-[10px] font-black text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 px-2.5 py-1 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                  title="نسخ نص الرسالة إلى الحافظة"
                >
                  {copiedSuccess ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                  <span>{copiedSuccess ? 'تم النسخ! 📋' : 'نسخ النص'}</span>
                </button>
              </div>
            </div>

            {activeTab === 'edit' ? (
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  rows={7}
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-xs text-right text-slate-800 leading-relaxed font-sans shadow-inner"
                  placeholder="اكتب أو عدّل نص رسالة الواتساب هنا..."
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold px-2 pt-1">
                  <span>💡 تلميح: يمكنك استخدام *نص عريض* أو _نص مائل_ لتنسيق الكلام في واتساب.</span>
                  <span>أكاديمية التفوق أون لاين</span>
                </div>
              </div>
            ) : (
              /* WhatsApp Realistic Chat Preview */
              <div className="bg-[#EFEAE2] p-5 rounded-2xl border border-slate-300/80 shadow-inner flex flex-col justify-end min-h-[180px]">
                <div className="self-end max-w-lg bg-[#E7FFDB] text-slate-900 rounded-2xl rounded-tr-none p-3.5 shadow-md border border-[#D0ECC2] text-xs font-medium leading-relaxed whitespace-pre-wrap text-right font-sans">
                  {messageText}
                  <div className="flex items-center justify-end gap-1 mt-2 text-[9px] text-slate-400 font-mono">
                    <span>الآن</span>
                    <span className="text-emerald-600 font-bold">✓✓</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 font-bold flex items-center gap-1.5">
            <Info size={14} className="text-indigo-600 shrink-0" />
            <span>سيتم فتح المحادثة مباشرة عبر واتساب مع الرقم المحدد مع تعبئة الرسالة تلقائياً.</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className="px-4 py-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-2xs"
            >
              <Copy size={14} />
              <span>نسخ الرسالة 📋</span>
            </button>

            <button
              type="button"
              disabled={!recipientPhone.trim()}
              onClick={handleSendWhatsApp}
              className="flex-1 sm:flex-none px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer border border-emerald-500"
            >
              <MessageSquare size={16} />
              <span>فتح محادثة وإرسال عبر WhatsApp 📱</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl font-black text-xs transition-all cursor-pointer shrink-0"
            >
              إلغاء
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
