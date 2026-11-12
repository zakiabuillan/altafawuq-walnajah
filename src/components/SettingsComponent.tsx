// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, orderBy, deleteDoc } from 'firebase/firestore';
import { Settings, Student, Teacher, Session, CurriculumSourceMapping, DEFAULT_CURRICULUM_SOURCE_MAPPINGS } from '../types';
import { Settings as SettingsIcon, Save, Plus, Trash2, Hash, BookMinus, Palette, CheckCircle2, Users, AlertTriangle, GraduationCap, RefreshCw, UserCheck, History, Search, FileSpreadsheet, Database, Download, ShieldAlert, Wrench, Calendar, Upload, Image as ImageIcon, Sparkles, Copy, ExternalLink, Eye, Check, RotateCcw, Link as LinkIcon, Calculator, Atom, FlaskConical, Languages, BookMarked, MessageSquare, Send, CheckSquare, Square, MessageCircle, AlertCircle, ChevronDown, ChevronUp, Bell, Clock, Sliders, Receipt, DollarSign, Tags, Globe } from 'lucide-react';
import AcademyLogo from './AcademyLogo';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import * as XLSX from 'xlsx';
import { logActivity } from '../lib/activityLogger';
import { WHITEBOARD_THEMES_LIST } from '../lib/whiteboardThemes';
import { WhiteboardTheme, WhiteboardBackgroundType } from '../types/whiteboard';
import { OperatingExpensesManager } from './OperatingExpensesManager';
import { FinancialCategoriesManager } from './FinancialCategoriesManager';
import { CurriculumSourcesManager } from './CurriculumSourcesManager';
import { FinancialCategory, DEFAULT_FINANCIAL_CATEGORIES } from '../types/financialCategories';
import { getAcademicStage, DEFAULT_STAGE_PRICING, getAcademicStageBadge } from '../lib/sessionPricing';
import { ActivityLog } from './ActivityLog';
import { ScheduledWhatsAppReminderModal } from './ScheduledWhatsAppReminderModal';
import { ScheduledWhatsAppReminder } from '../types';
import { subscribeToScheduledReminders } from '../lib/scheduledWhatsAppUtils';
import { 
  getRegistrationLink, 
  getWhiteboardLink, 
  getPublicShareableBaseUrl, 
  getSharedAppUrl, 
  getDevAppUrl, 
  isDevEnvironment, 
  getCustomPublicUrl, 
  saveCustomPublicUrl 
} from '../lib/urlUtils';

export const AUTO_WHATSAPP_TEMPLATES_PRESETS = [
  {
    id: 'package_renewal',
    title: 'الحث على تجديد الرزمة التعليمية ⚡',
    badge: 'حث على التجديد',
    desc: 'صيغة مؤدبة ومحفزة تحث ولي الأمر على المبادرة بتجديد الرزمة التعليمية وشحن المحفظة قبل نفاد الرصيد.',
    text: `السلام عليكم ورحمة الله وبركاته، تحية طيبة من إدارة {academyName} 🌸\n\nنود إحاطة عنايتكم الكريمة بأن الرصيد المالي المتبقي في محفظة الطالب/ة ({studentName}) هو ({balance} ₪).\n\nونظراً لأن رصيد الرزمة التعليمية شارف على الانتهاء، نحثكم على التكرم بالمبادرة لتجديد الرزمة التعليمية وشحن المحفظة قبل نفاد الرصيد، لضمان استمرار الحصص والدروس التعليمية ومتابعة المعلمين دون أي انقطاع.\n\nعلماً بأن حساب الطالب نشط وجميع الحصص مستمرة كالمعتاد بحمد الله.\n\nشاكرين ومقدرين ثقتكم الدائمة بأكاديميتنا، ونتمنى لـ ({studentName}) دوام التفوق والنجاح 🌸`
  },
  {
    id: 'friendly',
    title: 'تذكير لطيف وودّي 🌸',
    badge: 'ودّي ومحفز',
    desc: 'صيغة محترمة وهادئة لإشعار ولي الأمر برصيد الطالب المتبقي وتشجيعه على التجديد.',
    text: `مرحباً بحضرتكم 🌸، نود تذكيركم بأن رصيد الطالب/ة {studentName} لدى {academyName} قد وصل إلى ({balance} ₪) وهو دون حد الأمان المطلوب ({threshold} ₪). نرجو منكم التكرم بالمبادرة لشحن وتجديد الرصيد لضمان استمرار الحصص والدروس التعليمية دون انقطاع. دمتم بخير وتفوق.`
  },
  {
    id: 'official',
    title: 'إشعار مالي عاجل 🚨',
    badge: 'رسمي وحاسم',
    desc: 'صيغة رسمية واضحة لتفادي انقطاع الحصص عند استحقاق الرصيد السالب أو تجاوز العتبة.',
    text: `إشعار مالي رسمي من {academyName}: رصيد الطالب/ة {studentName} الحالي هو ({balance} ₪) بمبلغ مستحق قدره ({debtAmount} ₪). الحد الأدنى للأمان هو ({threshold} ₪). نرجو المبادرة بتسوية الرصيد وشحن المحفظة قبل موعد الحصة القادمة لتجنب تعليق الجدول. شكراً لحسن تعاونكم.`
  },
  {
    id: 'detailed',
    title: 'كشف رصيد تفصيلي 📊',
    badge: 'محاسبي دقيق',
    desc: 'تقرير محاسبي مباشر يحتوي على الذمة ومبلغ التسوية والتاريخ والحد المطلوب.',
    text: `تحية طيبة، إحاطة مالية دورية للطالب/ة {studentName}: الرصيد المتاح حالياً ({balance} ₪) بموجب عتبة الأمان ({threshold} ₪) بتاريخ {date}. مبلغ الذمة المطلوب تسويته: {debtAmount} ₪. يرجى تحويل دفعة شحن جديدة لتحديث رصيد المحفظة لدى {academyName}. شاكرين حسن ثقتكم بنا.`
  }
];

export const DEFAULT_AUTO_WHATSAPP_TEMPLATE = AUTO_WHATSAPP_TEMPLATES_PRESETS[0].text;

interface SettingsComponentProps {
  onOpenCurriculumGenerator?: () => void;
}

export default function SettingsComponent({ onOpenCurriculumGenerator }: SettingsComponentProps = {}) {
  const [settings, setSettings] = useState<Settings>({ 
    defaultHourlyRate: 60, 
    defaultStudentHourlyRate: 60, 
    defaultTeacherHourlyRate: 35, 
    defaultSecondaryStudentHourlyRate: 60,
    defaultMiddleStudentHourlyRate: 50,
    defaultPrimaryStudentHourlyRate: 50,
    sessionPricingSystemEnabled: true,
    defaultPricingProgram: 'hourly',
    programSelectionManagerOnly: true,
    middleSchoolStudentSessionRate: 40,
    middleSchoolTeacherSessionRate: 25,
    secondarySchoolStudentSessionRate: 50,
    secondarySchoolTeacherSessionRate: 35,
    sessionDurationMinutes: 40,
    subjects: [],
    financialRules: [],
    customReportPeriods: [],
    autoArchiveOldSessionsEnabled: false,
    lastAutoArchiveDate: '',
    autoWhatsAppLowBalanceReminderEnabled: false,
    autoWhatsAppTemplate: DEFAULT_AUTO_WHATSAPP_TEMPLATE,
    autoWhatsAppReminderCooldownDays: 3,
    autoWhatsAppTargetAudience: 'all',
    lastAutoWhatsAppRunDate: '',
    whiteboardEnabled: true,
    whiteboardTheme: 'classic-dark',
    registrationButtonColor: '#0D365A',
    registrationButtonTextColor: '#FFFFFF',
    registrationCustomLogo: '',
    registrationButtonText: 'إرسال بيانات التسجيل الفوري 🚀',
    registrationCardTitle: '✨ استمارة التسجيل في الأكاديمية',
    registrationSubtitle: 'أهلاً بك! يرجى تعبئة الحقول المطلوبة بالكامل بالبيانات الصحيحة لتسجيل بياناتك لدى الإدارة وحجز حصة تجريبية وتنسيق مسارك الدراسي.',
    academyName: 'أكاديمية التفوق',
    academySlogan: 'أون لاين'
  });
  const [newSubject, setNewSubject] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [localThreshold, setLocalThreshold] = useState<string>('-100');
  const [brandingPreviewToast, setBrandingPreviewToast] = useState('');

  // Custom reporting periods states
  const [periodName, setPeriodName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  // Custom financial rules state
  const [ruleName, setRuleName] = useState('');
  const [ruleType, setRuleType] = useState<'teacher_bonus_hours' | 'teacher_bonus_students' | 'student_discount_enrollment' | 'student_discount_lessons'>('teacher_bonus_hours');
  const [ruleTargetValue, setRuleTargetValue] = useState<string>('');
  const [ruleRewardValue, setRuleRewardValue] = useState<string>('');
  const [ruleRewardType, setRuleRewardType] = useState<'fixed' | 'percentage'>('fixed');
  const [ruleDescription, setRuleDescription] = useState('');

  // Custom student threshold states
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [customThreshold, setCustomThreshold] = useState<string>('');

  // Branding & Registration Form Customization States
  const [brandingLogo, setBrandingLogo] = useState<string>('');
  const [brandingLogoUrlInput, setBrandingLogoUrlInput] = useState<string>('');
  const [brandingButtonColor, setBrandingButtonColor] = useState<string>('#0D365A');
  const [brandingButtonTextColor, setBrandingButtonTextColor] = useState<string>('#FFFFFF');
  const [brandingButtonText, setBrandingButtonText] = useState<string>('إرسال بيانات التسجيل الفوري 🚀');
  const [brandingCardTitle, setBrandingCardTitle] = useState<string>('✨ استمارة التسجيل في الأكاديمية');
  const [brandingSubtitle, setBrandingSubtitle] = useState<string>('أهلاً بك! يرجى تعبئة الحقول المطلوبة بالكامل بالبيانات الصحيحة لتسجيل بياناتك لدى الإدارة وحجز حصة تجريبية وتنسيق مسارك الدراسي.');
  const [brandingAcademyName, setBrandingAcademyName] = useState<string>('أكاديمية التفوق');
  const [brandingSlogan, setBrandingSlogan] = useState<string>('أون لاين');
  const [logoUploadError, setLogoUploadError] = useState<string>('');
  const [brandingSavedNotice, setBrandingSavedNotice] = useState<boolean>(false);
  const [copiedRegistrationLink, setCopiedRegistrationLink] = useState<boolean>(false);

  // Public academy and mobile links management
  const [customPublicUrlInput, setCustomPublicUrlInput] = useState<string>(getCustomPublicUrl());
  const [savedPublicUrlNotice, setSavedPublicUrlNotice] = useState<boolean>(false);
  const [copiedPublicUrl, setCopiedPublicUrl] = useState<boolean>(false);

  const handleSaveCustomPublicUrl = () => {
    saveCustomPublicUrl(customPublicUrlInput);
    setSavedPublicUrlNotice(true);
    setTimeout(() => setSavedPublicUrlNotice(false), 3000);
  };

  // WhatsApp Reminder Message Template Customizer States
  const [whatsappTemplateInput, setWhatsappTemplateInput] = useState<string>(DEFAULT_AUTO_WHATSAPP_TEMPLATE);
  const [whatsappTemplateSavedFeedback, setWhatsappTemplateSavedFeedback] = useState<boolean>(false);
  const whatsappTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsertVariable = (variableToken: string) => {
    const textarea = whatsappTextareaRef.current;
    if (!textarea) {
      const current = whatsappTemplateInput || DEFAULT_AUTO_WHATSAPP_TEMPLATE;
      const updated = (current + ' ' + variableToken).trim();
      setWhatsappTemplateInput(updated);
      const newSettings = { 
        ...settings, 
        autoWhatsAppTemplate: updated, 
        defaultWhatsAppReminderTemplate: updated 
      };
      setSettings(newSettings);
      saveSettings(newSettings);
      return;
    }

    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    const currentText = whatsappTemplateInput;
    const updated = currentText.substring(0, start) + variableToken + currentText.substring(end);

    setWhatsappTemplateInput(updated);
    const newSettings = { 
      ...settings, 
      autoWhatsAppTemplate: updated, 
      defaultWhatsAppReminderTemplate: updated 
    };
    setSettings(newSettings);
    saveSettings(newSettings);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variableToken.length, start + variableToken.length);
    }, 50);
  };

  const handleSaveWhatsAppTemplate = async (templateToSave?: string) => {
    const textToSave = templateToSave !== undefined ? templateToSave : (whatsappTemplateInput.trim() || DEFAULT_AUTO_WHATSAPP_TEMPLATE);
    const updated = {
      ...settings,
      autoWhatsAppTemplate: textToSave,
      defaultWhatsAppReminderTemplate: textToSave
    };
    await saveSettings(updated);
    setWhatsappTemplateSavedFeedback(true);
    setTimeout(() => setWhatsappTemplateSavedFeedback(false), 2500);
  };

  // Consolidation / Transfer Utility States
  const [transferring, setTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState<{
    studentsCount: number;
    coursesCount: number;
    assignmentsCount: number;
    sessionsCount: number;
  } | null>(null);

  // Activity logs / Audit trail states
  const [activeTab, setActiveTab ] = useState<'config' | 'branding' | 'financial-categories' | 'logs' | 'maintenance' | 'expenses'>('config');

  // Curriculum source mappings for AI generator state
  const [curriculumSources, setCurriculumSources] = useState<CurriculumSourceMapping[]>(DEFAULT_CURRICULUM_SOURCE_MAPPINGS);

  const handleSaveCurriculumSources = async (updatedMappings: CurriculumSourceMapping[]) => {
    setCurriculumSources(updatedMappings);
    const updatedSettings = {
      ...settings,
      curriculumSourceMappings: updatedMappings
    };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  // Custom Financial Categories state
  const [financialCategories, setFinancialCategories] = useState<FinancialCategory[]>(DEFAULT_FINANCIAL_CATEGORIES);

  const handleSaveFinancialCategories = async (updatedCategories: FinancialCategory[]) => {
    setFinancialCategories(updatedCategories);
    const updatedSettings = {
      ...settings,
      financialCategories: updatedCategories
    };
    setSettings(updatedSettings);
    await saveSettings(updatedSettings);
  };

  // Teachers and sessions lists
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  // Export session data states
  const [exportTargetType, setExportTargetType] = useState<'all' | 'student' | 'teacher'>('all');
  const [exportSelectedStudentId, setExportSelectedStudentId] = useState('');
  const [exportSelectedTeacherId, setExportSelectedTeacherId] = useState('');

  // Data purging states
  const [purgeTargetType, setPurgeTargetType] = useState<'all_students' | 'student' | 'teacher'>('all_students');
  const [purgeSelectedStudentId, setPurgeSelectedStudentId] = useState('');
  const [purgeSelectedTeacherId, setPurgeSelectedTeacherId] = useState('');
  const [showPurgeConfirmation, setShowPurgeConfirmation] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsFilter, setLogsFilter] = useState('ALL');
  const [logsSearch, setLogsSearch] = useState('');

  // JSON Backup process states
  const [backingUp, setBackingUp] = useState(false);
  const [lastJsonBackupDate, setLastJsonBackupDate] = useState<string>(() => {
    return localStorage.getItem('last_academy_json_backup_date') || '';
  });

  // Cloud Backup and Automatic Scheduling states
  const [cloudBackups, setCloudBackups] = useState<any[]>([]);
  const [cloudBackupsLoading, setCloudBackupsLoading] = useState(false);
  const [isCloudBackingUp, setIsCloudBackingUp] = useState(false);

  // Auto/Manual Session Archiving states
  const [isArchivingInProgress, setIsArchivingInProgress] = useState(false);
  const [archivedCountResult, setArchivedCountResult] = useState<number | null>(null);

  // Automated WhatsApp Financial Reminders states
  const [credits, setCredits] = useState<any[]>([]);
  const [isBatchWhatsAppModalOpen, setIsBatchWhatsAppModalOpen] = useState(false);
  const [selectedWhatsAppStudentIds, setSelectedWhatsAppStudentIds] = useState<string[]>([]);
  const [batchWhatsAppRunning, setBatchWhatsAppRunning] = useState(false);
  const [batchWhatsAppProgress, setBatchWhatsAppProgress] = useState<{ current: number; total: number; studentName: string } | null>(null);
  const [batchWhatsAppSuccessMsg, setBatchWhatsAppSuccessMsg] = useState<string>('');
  const [showEligibleStudentsAccordion, setShowEligibleStudentsAccordion] = useState(false);
  const [copiedTemplateNotice, setCopiedTemplateNotice] = useState(false);
  const [whatsAppSearchFilter, setWhatsAppSearchFilter] = useState('');

  // Scheduled WhatsApp Reminders states
  const [isScheduledWhatsAppModalOpen, setIsScheduledWhatsAppModalOpen] = useState(false);
  const [scheduledModalInitialMode, setScheduledModalInitialMode] = useState<'list' | 'create'>('list');
  const [scheduledRemindersList, setScheduledRemindersList] = useState<ScheduledWhatsAppReminder[]>([]);

  useEffect(() => {
    const unsub = subscribeToScheduledReminders(setScheduledRemindersList);
    return () => unsub();
  }, []);

  // Calculate live student balance
  const calculateStudentLiveBalance = (student: Student): number => {
    const studentSessions = sessions.filter(s => s.studentId === student.id && !s.archived);
    const studentCreds = credits.filter(c => c.studentId === student.id);
    const totalSpent = studentSessions.reduce((sum, s) => {
      if (s.isTrialSession || s.isTrial) return sum;
      if (s.isGroupSession || s.isGroup) {
        if (s.customFee !== undefined && s.customFee > 0) return sum + s.customFee;
        return sum;
      }
      if (s.customFee !== undefined && s.customFee > 0) return sum + s.customFee;
      const teacher = teachers.find(t => t.id === s.teacherId);
      const rate = student?.customRates?.[s.teacherId] !== undefined
        ? student.customRates[s.teacherId]
        : (student?.hourlyRate ? student.hourlyRate : (teacher?.billingRate ?? teacher?.hourlyRate ?? (settings.defaultStudentHourlyRate || 60)));
      return sum + (s.durationHours * rate);
    }, 0);
    const totalToppedUp = studentCreds.reduce((sum, c) => sum + (c.amount || 0), 0);
    if (studentCreds.length === 0 && studentSessions.length === 0 && typeof student.balance === 'number') {
      return student.balance;
    }
    return totalToppedUp - totalSpent;
  };

  // Get list of students whose balance is below their effective threshold
  const getLowBalanceStudents = (): { student: Student; balance: number; threshold: number; debt: number; isCritical: boolean }[] => {
    const globalThreshold = settings.lowBalanceThreshold ?? -100;
    return students
      .filter(s => !s.archived)
      .map(student => {
        const threshold = typeof student.lowBalanceThreshold === 'number' ? student.lowBalanceThreshold : globalThreshold;
        const balance = calculateStudentLiveBalance(student);
        const debt = balance < 0 ? Math.abs(balance) : 0;
        const isCritical = balance <= threshold;
        return { student, balance, threshold, debt, isCritical };
      })
      .filter(item => item.isCritical);
  };

  // Helper to format WhatsApp message text with tokens
  const formatAutoWhatsAppText = (student: Student, templateText: string, customBalance?: number): string => {
    const bal = customBalance ?? calculateStudentLiveBalance(student);
    const th = typeof student.lowBalanceThreshold === 'number' ? student.lowBalanceThreshold : (settings.lowBalanceThreshold ?? -100);
    const debt = bal < 0 ? Math.abs(bal) : 0;
    const academy = settings.academyName || 'أكاديمية التفوق';
    const dateStr = new Date().toLocaleDateString('ar-EG');
    const cleanPhone = (student?.phone || student?.phoneNumber || '').replace(/[\s\-\+]/g, '');

    return (templateText || settings.defaultWhatsAppReminderTemplate || settings.autoWhatsAppTemplate || DEFAULT_AUTO_WHATSAPP_TEMPLATE)
      .replace(/{(?:studentName|student_name|name|NAME|اسم_الطالب)}/gi, student?.name || 'عزيزنا الطالب')
      .replace(/{(?:balance|BALANCE|الرصيد)}/gi, String(bal))
      .replace(/{(?:threshold|THRESHOLD|حد_الأمان|حد_الائتمان)}/gi, String(th))
      .replace(/{(?:debtAmount|debt_amount|DEBT_AMOUNT|مبلغ_الذمة|المبلغ_المستحق)}/gi, String(debt))
      .replace(/{(?:academyName|academy_name|ACADEMY_NAME|academy|ACADEMY|اسم_الأكاديمية|الأكاديمية)}/gi, academy)
      .replace(/{(?:phone|PHONE|رقم_الهاتف)}/gi, cleanPhone)
      .replace(/{(?:date|DATE|التاريخ)}/gi, dateStr);
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const q = query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      const fetchedLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLogs(fetchedLogs);
    } catch (e) {
      console.warn("Retrying logs fetch without orderBy (sorting in memory):", e);
      try {
        const snap = await getDocs(collection(db, 'activityLogs'));
        const fetchedLogs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        fetchedLogs.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLogs(fetchedLogs);
      } catch (innerErr) {
        console.error("Fallback logs fetch also failed:", innerErr);
      }
    } finally {
      setLogsLoading(false);
    }
  };

  const handleExportLogsToExcel = () => {
    try {
      const dataToExport = filteredLogs.map(log => ({
        'نوع العملية': log.actionName,
        'المنفذ': log.actor,
        'التفاصيل الكاملة': log.details,
        'الأثر المالي (₪)': log.amount ?? 'لا يوجد',
        'تاريخ ووقت الحركة': new Date(log.timestamp).toLocaleString('ar-AE')
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "سجل تتبع العمليات");
      
      // Auto-fit column widths
      const maxLens = {};
      dataToExport.forEach(row => {
        Object.keys(row).forEach(key => {
          const val = String(row[key]);
          maxLens[key] = Math.max(maxLens[key] || 10, val.length + 4);
        });
      });
      worksheet["!cols"] = Object.keys(maxLens).map(key => ({ wch: maxLens[key] }));

      XLSX.writeFile(workbook, `سجل_تتبع_العمليات_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("Error exporting logs:", error);
      alert("حدث خطأ أثناء تصدير ملف excel.");
    }
  };

  const handleClearAuditLogs = async () => {
    const password = window.prompt("صلاحية أمنية فائقة: يرجى إدخال الرمز السري لتصفير وحذف سجل تتبع العمليات بالكامل:");
    if (password !== '10020030') {
      window.alert("الرمز السري غير صحيح! لا يمكن تصفير السجل.");
      return;
    }

    if (!window.confirm("تحذير: هل أنت متأكد من رغبتك في حذف وتصفير سجل تتبع التدقيق المالي بالكامل؟ لا يمكن استرجاع البيانات بعد ذلك.")) {
      return;
    }

    setLogsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'activityLogs'));
      const deletePromises = snap.docs.map(d => deleteDoc(doc(db, 'activityLogs', d.id)));
      await Promise.all(deletePromises);
      setLogs([]);
      window.alert("تم تصفير سجل تتبع العمليات بنجاح وبشكل نهائي.");
    } catch (error) {
      console.error("Error clearing logs:", error);
      alert("فشل تصفير السجل.");
    } finally {
      setLogsLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = logsFilter === 'ALL' || log.actionType === logsFilter;
    const matchesSearch = !logsSearch.trim() || 
      (log.details && log.details.toLowerCase().includes(logsSearch.toLowerCase())) ||
      (log.actionName && log.actionName.toLowerCase().includes(logsSearch.toLowerCase())) ||
      (log.actor && log.actor.toLowerCase().includes(logsSearch.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const handleConsolidateToZaki = async () => {
    setTransferring(true);
    setTransferResult(null);
    try {
      // 1. Ensure the teacher record for Zaki exists in the DB
      const zakiRef = doc(db, 'teachers', 'zaki_teacher');
      const zakiSnap = await getDoc(zakiRef);
      if (!zakiSnap.exists()) {
        await setDoc(zakiRef, {
          name: 'زكي أبو علان (المدير المعلم)',
          username: 'zakiabuillan',
          email: 'zakiabuillan@gmail.com',
          password: '10020030',
          phone: '0597000000',
          hourlyRate: 100,
          payoutRate: 100,
          billingRate: 150,
          status: 'Active',
          subjects: []
        });
      }

      // 2. Fetch all students, courses, assignments, and sessions
      const [studentsSnap, coursesSnap, assignmentsSnap, sessionsSnap] = await Promise.all([
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'groupCourses')),
        getDocs(collection(db, 'assignments')),
        getDocs(collection(db, 'sessions'))
      ]);

      let sCount = 0;
      let cCount = 0;
      let aCount = 0;
      let sessCount = 0;

      // 3. For each student, update teachers to exclusively contain 'zaki_teacher' as Zaki Abu Illan
      const studentPromises = studentsSnap.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const currentTeachers = data.teachers || [];
        // Ensure they are linked only/primarily to Zaki Abu Illan
        if (currentTeachers.length !== 1 || currentTeachers[0] !== 'zaki_teacher') {
          await updateDoc(doc(db, 'students', docSnap.id), {
            teachers: ['zaki_teacher']
          });
          sCount++;
        }
      });

      // 4. For each groupCourse, update instructor and teacherId to refer to Zaki
      const coursePromises = coursesSnap.docs.map(async (docSnap) => {
        const data = docSnap.data();
        if (data.teacherId !== 'zaki_teacher') {
          await updateDoc(doc(db, 'groupCourses', docSnap.id), {
            teacherId: 'zaki_teacher',
            instructor: 'زكي أبو علان (المدير المعلم)'
          });
          cCount++;
        }
      });

      // 5. For each assignment record, ensure the teacherId is 'zaki_teacher'
      const assignmentPromises = assignmentsSnap.docs.map(async (docSnap) => {
        const data = docSnap.data();
        if (data.teacherId !== 'zaki_teacher') {
          await updateDoc(doc(db, 'assignments', docSnap.id), {
            teacherId: 'zaki_teacher'
          });
          aCount++;
        }
      });

      // 6. For each logged session, ensure the teacherId is 'zaki_teacher'
      const sessionPromises = sessionsSnap.docs.map(async (docSnap) => {
        const data = docSnap.data();
        if (data.teacherId !== 'zaki_teacher') {
          await updateDoc(doc(db, 'sessions', docSnap.id), {
            teacherId: 'zaki_teacher'
          });
          sessCount++;
        }
      });

      await Promise.all([
        ...studentPromises,
        ...coursePromises,
        ...assignmentPromises,
        ...sessionPromises
      ]);

      setTransferResult({
        studentsCount: sCount,
        coursesCount: cCount,
        assignmentsCount: aCount,
        sessionsCount: sessCount
      });

      await fetchSettings();
    } catch (err) {
       console.error("Error consolidating database to Zaki Abu Illan:", err);
    } finally {
       setTransferring(false);
    }
  };

  const runAutoArchiveSessions = async (currentSettings: any, existingSessions?: Session[]) => {
    try {
      const targetSessions = existingSessions || sessions;
      const sessToArchive = targetSessions.filter(s => {
        if (s.archived) return false;
        if (!s.date) return false;
        
        const sessionDate = new Date(s.date);
        if (isNaN(sessionDate.getTime())) return false;
        
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        return sessionDate < threeMonthsAgo;
      });

      if (sessToArchive.length > 0) {
        await Promise.all(sessToArchive.map(async (s) => {
          await updateDoc(doc(db, 'sessions', s.id), { archived: true });
        }));

        try {
          await logActivity({
            actionType: 'AUTO_ARCHIVE_SESSIONS',
            actionName: 'أرشفة تلقائية للحصص القديمة',
            details: `تم أرشفة تلقائية لعدد ${sessToArchive.length} حصة تعليمية مضى عليها أكثر من 3 أشهر لتقليل حجم البيانات في الواجهات النشطة.`
          });
        } catch (e) {
          console.error("Activity log failed", e);
        }

        const todayStr = new Date().toISOString();
        await updateDoc(doc(db, 'settings', 'global'), { lastAutoArchiveDate: todayStr });
        setSettings(prev => ({
          ...prev,
          lastAutoArchiveDate: todayStr
        }));
        
        // Refresh local sessions list
        const sessionsSnap = await getDocs(collection(db, 'sessions'));
        const sessionsList = sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
        setSessions(sessionsList);

        return sessToArchive.length;
      }
      return 0;
    } catch (error) {
      console.error("Error during auto-archiving sessions:", error);
      return 0;
    }
  };

  const handleManualArchiveNow = async () => {
    setIsArchivingInProgress(true);
    setArchivedCountResult(null);
    try {
      const count = await runAutoArchiveSessions(settings, sessions);
      setArchivedCountResult(count);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (e) {
      console.error("Manual archive failed", e);
    } finally {
      setIsArchivingInProgress(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchCloudBackups();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    const path = 'settings/global';
    try {
      const [docSnap, studentsSnap, teachersSnap, sessionsSnap, creditsSnap] = await Promise.all([
        getDoc(doc(db, 'settings', 'global')),
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'teachers')),
        getDocs(collection(db, 'sessions')),
        getDocs(collection(db, 'studentCredits'))
      ]);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const th = data.lowBalanceThreshold ?? -100;
        const autoBackupEnabled = data.autoBackupEnabled === true;
        const lastAutoBackupDate = data.lastAutoBackupDate || '';
        const autoArchiveOldSessionsEnabled = data.autoArchiveOldSessionsEnabled === true;
        const lastAutoArchiveDate = data.lastAutoArchiveDate || '';
        const regButtonColor = data.registrationButtonColor || '#0D365A';
        const regButtonTextColor = data.registrationButtonTextColor || '#FFFFFF';
        const regLogo = data.registrationCustomLogo || '';
        const regButtonText = data.registrationButtonText || 'إرسال بيانات التسجيل الفوري 🚀';
        const regCardTitle = data.registrationCardTitle || '✨ استمارة التسجيل في الأكاديمية';
        const regSubtitle = data.registrationSubtitle || 'أهلاً بك! يرجى تعبئة الحقول المطلوبة بالكامل بالبيانات الصحيحة لتسجيل بياناتك لدى الإدارة وحجز حصة تجريبية وتنسيق مسارك الدراسي.';
        const acName = data.academyName || 'أكاديمية التفوق';
        const acSlogan = data.academySlogan || 'أون لاين';
        const autoWhatsAppEnabled = data.autoWhatsAppLowBalanceReminderEnabled === true;
        const autoWhatsAppTemplate = data.defaultWhatsAppReminderTemplate || data.autoWhatsAppTemplate || DEFAULT_AUTO_WHATSAPP_TEMPLATE;
        const autoWhatsAppCooldown = data.autoWhatsAppReminderCooldownDays ?? 3;
        const autoWhatsAppAudience = data.autoWhatsAppTargetAudience || 'all';
        const lastAutoWhatsAppRun = data.lastAutoWhatsAppRunDate || '';
        const loadedFinancialCategories = (data.financialCategories && Array.isArray(data.financialCategories) && data.financialCategories.length > 0)
          ? data.financialCategories
          : DEFAULT_FINANCIAL_CATEGORIES;
        setFinancialCategories(loadedFinancialCategories);

        setSettings({
          defaultHourlyRate: data.defaultHourlyRate ?? 60,
          defaultStudentHourlyRate: data.defaultStudentHourlyRate ?? data.defaultHourlyRate ?? 60,
          defaultTeacherHourlyRate: data.defaultTeacherHourlyRate ?? 35,
          defaultSecondaryStudentHourlyRate: data.defaultSecondaryStudentHourlyRate ?? 60,
          defaultMiddleStudentHourlyRate: data.defaultMiddleStudentHourlyRate ?? 50,
          defaultPrimaryStudentHourlyRate: data.defaultPrimaryStudentHourlyRate ?? 50,
          sessionPricingSystemEnabled: data.sessionPricingSystemEnabled !== false,
          defaultPricingProgram: data.defaultPricingProgram || 'hourly',
          programSelectionManagerOnly: data.programSelectionManagerOnly !== false,
          middleSchoolStudentSessionRate: data.middleSchoolStudentSessionRate ?? 40,
          middleSchoolTeacherSessionRate: data.middleSchoolTeacherSessionRate ?? 25,
          secondarySchoolStudentSessionRate: data.secondarySchoolStudentSessionRate ?? 50,
          secondarySchoolTeacherSessionRate: data.secondarySchoolTeacherSessionRate ?? 35,
          sessionDurationMinutes: data.sessionDurationMinutes ?? 40,
          subjects: data.subjects || [],
          lowBalanceThreshold: th,
          academicAIEnabled: data.academicAIEnabled === true,
          whiteboardEnabled: data.whiteboardEnabled !== false,
          whiteboardTheme: data.whiteboardTheme || 'classic-dark',
          autoBackupEnabled: autoBackupEnabled,
          lastAutoBackupDate: lastAutoBackupDate,
          autoArchiveOldSessionsEnabled: autoArchiveOldSessionsEnabled,
          lastAutoArchiveDate: lastAutoArchiveDate,
          autoWhatsAppLowBalanceReminderEnabled: autoWhatsAppEnabled,
          autoWhatsAppTemplate: autoWhatsAppTemplate,
          defaultWhatsAppReminderTemplate: autoWhatsAppTemplate,
          autoWhatsAppReminderCooldownDays: autoWhatsAppCooldown,
          autoWhatsAppTargetAudience: autoWhatsAppAudience,
          lastAutoWhatsAppRunDate: lastAutoWhatsAppRun,
          financialRules: data.financialRules || [],
          customReportPeriods: data.customReportPeriods || [],
          registrationButtonColor: regButtonColor,
          registrationButtonTextColor: regButtonTextColor,
          registrationCustomLogo: regLogo,
          registrationButtonText: regButtonText,
          registrationCardTitle: regCardTitle,
          registrationSubtitle: regSubtitle,
          academyName: acName,
          academySlogan: acSlogan,
          curriculumSourceMappings: data.curriculumSourceMappings && data.curriculumSourceMappings.length > 0
            ? data.curriculumSourceMappings
            : DEFAULT_CURRICULUM_SOURCE_MAPPINGS,
        });
        setLocalThreshold(String(th));
        setWhatsappTemplateInput(autoWhatsAppTemplate);
        
        // Sync curriculum sources
        const loadedCurriculumSources = data.curriculumSourceMappings && data.curriculumSourceMappings.length > 0
          ? data.curriculumSourceMappings
          : DEFAULT_CURRICULUM_SOURCE_MAPPINGS;
        setCurriculumSources(loadedCurriculumSources);

        // Sync individual branding states
        setBrandingLogo(regLogo);
        setBrandingLogoUrlInput(regLogo.startsWith('data:') ? '' : regLogo);
        setBrandingButtonColor(regButtonColor);
        setBrandingButtonTextColor(regButtonTextColor);
        setBrandingButtonText(regButtonText);
        setBrandingCardTitle(regCardTitle);
        setBrandingSubtitle(regSubtitle);
        setBrandingAcademyName(acName);
        setBrandingSlogan(acSlogan);

        if (autoBackupEnabled) {
          const lastDate = lastAutoBackupDate ? new Date(lastAutoBackupDate) : null;
          const today = new Date();
          const oneWeek = 7 * 24 * 60 * 60 * 1000;
          if (!lastDate || (today.getTime() - lastDate.getTime() >= oneWeek)) {
            triggerAutoCloudBackup(data);
          }
        }
      } else {
        setSettings({
          defaultHourlyRate: 60,
          defaultStudentHourlyRate: 60,
          defaultTeacherHourlyRate: 35,
          defaultSecondaryStudentHourlyRate: 60,
          defaultMiddleStudentHourlyRate: 50,
          defaultPrimaryStudentHourlyRate: 50,
          sessionPricingSystemEnabled: true,
          defaultPricingProgram: 'hourly',
          programSelectionManagerOnly: true,
          middleSchoolStudentSessionRate: 40,
          middleSchoolTeacherSessionRate: 25,
          secondarySchoolStudentSessionRate: 50,
          secondarySchoolTeacherSessionRate: 35,
          sessionDurationMinutes: 40,
          subjects: [],
          lowBalanceThreshold: -100,
          academicAIEnabled: false,
          whiteboardEnabled: true,
          autoBackupEnabled: false,
          lastAutoBackupDate: '',
          autoArchiveOldSessionsEnabled: false,
          lastAutoArchiveDate: '',
          autoWhatsAppLowBalanceReminderEnabled: false,
          autoWhatsAppTemplate: DEFAULT_AUTO_WHATSAPP_TEMPLATE,
          autoWhatsAppReminderCooldownDays: 3,
          autoWhatsAppTargetAudience: 'all',
          lastAutoWhatsAppRunDate: '',
          financialRules: [],
          customReportPeriods: [],
          registrationButtonColor: '#0D365A',
          registrationButtonTextColor: '#FFFFFF',
          registrationCustomLogo: '',
          registrationButtonText: 'إرسال بيانات التسجيل الفوري 🚀',
          registrationCardTitle: '✨ استمارة التسجيل في الأكاديمية',
          registrationSubtitle: 'أهلاً بك! يرجى تعبئة الحقول المطلوبة بالكامل بالبيانات الصحيحة لتسجيل بياناتك لدى الإدارة وحجز حصة تجريبية وتنسيق مسارك الدراسي.',
          academyName: 'أكاديمية التفوق',
          academySlogan: 'أون لاين',
        });
        setLocalThreshold('-100');
        setBrandingLogo('');
        setBrandingLogoUrlInput('');
        setBrandingButtonColor('#0D365A');
        setBrandingButtonTextColor('#FFFFFF');
        setBrandingButtonText('إرسال بيانات التسجيل الفوري 🚀');
        setBrandingCardTitle('✨ استمارة التسجيل في الأكاديمية');
        setBrandingSubtitle('أهلاً بك! يرجى تعبئة الحقول المطلوبة بالكامل بالبيانات الصحيحة لتسجيل بياناتك لدى الإدارة وحجز حصة تجريبية وتنسيق مسارك الدراسي.');
        setBrandingAcademyName('أكاديمية التفوق');
        setBrandingSlogan('أون لاين');
      }

      const studentsList = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(studentsList);

      const teachersList = teachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher));
      setTeachers(teachersList);

      const sessionsList = sessionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
      setSessions(sessionsList);

      const creditsList = creditsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCredits(creditsList);

      // Trigger automatic archiving of sessions older than 3 months if enabled
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.autoArchiveOldSessionsEnabled === true) {
          runAutoArchiveSessions(data, sessionsList);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (targetSettings: Settings) => {
    setIsSaving(true);
    const path = 'settings/global';
    try {
      // 1. Check if student or teacher hourly rate changed compared to current state
      const studentRateChanged = targetSettings.defaultStudentHourlyRate !== settings.defaultStudentHourlyRate;
      const teacherRateChanged = targetSettings.defaultTeacherHourlyRate !== settings.defaultTeacherHourlyRate;

      // 2. Save global settings
      await setDoc(doc(db, 'settings', 'global'), targetSettings);

      if (studentRateChanged || teacherRateChanged) {
        // Fetch up-to-date collections to propagate
        const [studentsSnap, teachersSnap] = await Promise.all([
          getDocs(collection(db, 'students')),
          getDocs(collection(db, 'teachers'))
        ]);

        const promises = [];

        if (studentRateChanged) {
          const studentRate = targetSettings.defaultStudentHourlyRate;
          studentsSnap.docs.forEach(studentDoc => {
            promises.push(updateDoc(doc(db, 'students', studentDoc.id), {
              hourlyRate: studentRate
            }));
          });
        }

        if (teacherRateChanged) {
          const teacherRate = targetSettings.defaultTeacherHourlyRate;
          teachersSnap.docs.forEach(teacherDoc => {
            promises.push(updateDoc(doc(db, 'teachers', teacherDoc.id), {
              payoutRate: teacherRate,
              hourlyRate: teacherRate // legacy field support
            }));
          });
        }

        if (promises.length > 0) {
          await Promise.all(promises);
          
          // Also update local state
          if (studentRateChanged) {
            setStudents(prev => prev.map(s => ({ ...s, hourlyRate: targetSettings.defaultStudentHourlyRate })));
          }
          if (teacherRateChanged) {
            setTeachers(prev => prev.map(t => ({ ...t, payoutRate: targetSettings.defaultTeacherHourlyRate, hourlyRate: targetSettings.defaultTeacherHourlyRate })));
          }

          // Log to audit log
          await logActivity({
            actionType: 'UPDATE_ALL_RATES_AUTO',
            actionName: 'تحديث تلقائي للأسعار',
            details: `تحديث تلقائي للمستندات في قاعدة البيانات بعد تعديل الإعدادات العامة (سعر الطالب: ₪${targetSettings.defaultStudentHourlyRate}، أجر المعلم: ₪${targetSettings.defaultTeacherHourlyRate})`,
            amount: 0
          });
        }
      }

      setSettings(targetSettings);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePropagateDefaultRates = async (secRate?: number, midRate?: number, teacherRate?: number) => {
    setIsSaving(true);
    try {
      const sRate = secRate ?? settings.defaultSecondaryStudentHourlyRate ?? 60;
      const mRate = midRate ?? settings.defaultMiddleStudentHourlyRate ?? 50;
      const pRate = settings.defaultPrimaryStudentHourlyRate ?? 50;
      const tRate = teacherRate ?? settings.defaultTeacherHourlyRate ?? 35;

      // 1. Update global settings in firestore first
      const updatedSettings = {
        ...settings,
        defaultSecondaryStudentHourlyRate: sRate,
        defaultMiddleStudentHourlyRate: mRate,
        defaultPrimaryStudentHourlyRate: pRate,
        defaultStudentHourlyRate: sRate,
        defaultHourlyRate: sRate,
        defaultTeacherHourlyRate: tRate
      };
      await setDoc(doc(db, 'settings', 'global'), updatedSettings);
      setSettings(updatedSettings);

      // 2. Fetch up-to-date students and teachers snapshot
      const [studentsSnap, teachersSnap] = await Promise.all([
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'teachers'))
      ]);

      // 3. Update all student documents in Firestore according to their academic stage
      const studentPromises = studentsSnap.docs.map(studentDoc => {
        const sData = studentDoc.data();
        const stage = getAcademicStage(sData.grade || sData.academicLevel || '');
        const targetRate = stage === 'secondary' ? sRate : stage === 'middle' ? mRate : pRate;
        return updateDoc(doc(db, 'students', studentDoc.id), {
          hourlyRate: targetRate
        });
      });

      // 4. Update all teacher documents in Firestore to use the new rates
      const teacherPromises = teachersSnap.docs.map(teacherDoc => {
        return updateDoc(doc(db, 'teachers', teacherDoc.id), {
          payoutRate: tRate,
          hourlyRate: tRate // legacy field support
        });
      });

      await Promise.all([...studentPromises, ...teacherPromises]);

      // 5. Update local state
      setStudents(prev => prev.map(s => {
        const stage = getAcademicStage(s.grade || s.academicLevel || '');
        const targetRate = stage === 'secondary' ? sRate : stage === 'middle' ? mRate : pRate;
        return { ...s, hourlyRate: targetRate };
      }));
      setTeachers(prev => prev.map(t => ({ ...t, payoutRate: tRate, hourlyRate: tRate })));

      // 6. Log this major action in activityLogs
      await logActivity({
        actionType: 'UPDATE_ALL_RATES',
        actionName: 'تحديث جماعي لأسعار الساعات حسب المراحل',
        details: `تحديث وتعميم الأسعار بنجاح على كافة الحسابات (المرحلة الثانوية: ₪${sRate}/ساعة، المرحلة الإعدادية: ₪${mRate}/ساعة، أجر المعلم: ₪${tRate}/ساعة)`,
        amount: 0
      });

      alert(`تم تعديل وتعميم أسعار الساعات بنجاح على كافة حسابات الطلاب والمعلمين! 🎉\n• المرحلة الثانوية: ${sRate} ₪/ساعة\n• المرحلة الإعدادية: ${mRate} ₪/ساعة\n• أجر المعلم: ${tRate} ₪/ساعة`);
    } catch (error: any) {
      console.error("Error propagating default rates:", error);
      alert('حدث خطأ أثناء محاولة تعميم الأسعار: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePropagateSessionRates = async () => {
    setIsSaving(true);
    try {
      const midStudent = settings.middleSchoolStudentSessionRate ?? 40;
      const midTeacher = settings.middleSchoolTeacherSessionRate ?? 25;
      const secStudent = settings.secondarySchoolStudentSessionRate ?? 50;
      const secTeacher = settings.secondarySchoolTeacherSessionRate ?? 35;

      // 1. Update settings doc in Firestore
      await setDoc(doc(db, 'settings', 'global'), settings, { merge: true });

      // 2. Fetch students and teachers
      const [studentsSnap, teachersSnap] = await Promise.all([
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'teachers'))
      ]);

      // 3. Update students based on academic stage
      const studentPromises = studentsSnap.docs.map(studentDoc => {
        const data = studentDoc.data();
        const stage = getAcademicStage(data.grade || data.academicLevel || '');
        const updates: any = {};
        if (stage === 'middle') {
          updates.middleSchoolSessionRate = midStudent;
        } else if (stage === 'secondary') {
          updates.secondarySchoolSessionRate = secStudent;
        }
        if (Object.keys(updates).length > 0) {
          return updateDoc(doc(db, 'students', studentDoc.id), updates);
        }
        return Promise.resolve();
      });

      // 4. Update teachers with payout rates for both stages
      const teacherPromises = teachersSnap.docs.map(teacherDoc => {
        return updateDoc(doc(db, 'teachers', teacherDoc.id), {
          middleSchoolSessionPayout: midTeacher,
          secondarySchoolSessionPayout: secTeacher,
        });
      });

      await Promise.all([...studentPromises, ...teacherPromises]);

      // 5. Update local state
      setStudents(prev => prev.map(s => {
        const stage = getAcademicStage(s.grade || s.academicLevel || '');
        if (stage === 'middle') return { ...s, middleSchoolSessionRate: midStudent };
        if (stage === 'secondary') return { ...s, secondarySchoolSessionRate: secStudent };
        return s;
      }));
      setTeachers(prev => prev.map(t => ({
        ...t,
        middleSchoolSessionPayout: midTeacher,
        secondarySchoolSessionPayout: secTeacher,
      })));

      await logActivity({
        actionType: 'UPDATE_SESSION_RATES_ALL',
        actionName: 'تعميم أسعار حصص 40 دقيقة للمرحلتين الإعدادية والثانوية',
        details: `قام المدير بتعميم أسعار الحصص (40 دقيقة): الإعدادي (طالب: ₪${midStudent}، معلم: ₪${midTeacher}) - الثانوي (طالب: ₪${secStudent}، معلم: ₪${secTeacher}) على كافة الطلاب والمعلمين.`,
        amount: 0
      });

      alert('تم تحديث وتعميم أسعار الحصص (40 دقيقة) للمرحلتين الإعدادية والثانوية بنجاح على قاعدة البيانات! 🎓');
    } catch (error: any) {
      console.error("Error propagating session rates:", error);
      alert('حدث خطأ أثناء تعميم أسعار الحصص: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const PRESET_BUTTON_COLORS = [
    { label: 'الأزرق الملكي (الأصلي)', value: '#0D365A', bgHex: '#0D365A', textHex: '#FFFFFF' },
    { label: 'النيلي الفاخر', value: '#1E1B4B', bgHex: '#1E1B4B', textHex: '#FFFFFF' },
    { label: 'الأزرق الكوبالت', value: '#2563EB', bgHex: '#2563EB', textHex: '#FFFFFF' },
    { label: 'الأخضر الزمردي', value: '#059669', bgHex: '#059669', textHex: '#FFFFFF' },
    { label: 'الأخضر الغابوي', value: '#15803D', bgHex: '#15803D', textHex: '#FFFFFF' },
    { label: 'العنبري الذهبي', value: '#D97706', bgHex: '#D97706', textHex: '#FFFFFF' },
    { label: 'البرونزي الراقي', value: '#B45309', bgHex: '#B45309', textHex: '#FFFFFF' },
    { label: 'القرمزي الملكي', value: '#DC2626', bgHex: '#DC2626', textHex: '#FFFFFF' },
    { label: 'البنفسجي الفاخر', value: '#7C3AED', bgHex: '#7C3AED', textHex: '#FFFFFF' },
    { label: 'الأسود الكربوني', value: '#0F172A', bgHex: '#0F172A', textHex: '#FFFFFF' },
    { label: 'التركواز البحري', value: '#0891B2', bgHex: '#0891B2', textHex: '#FFFFFF' },
  ];

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLogoUploadError('يرجى اختيار ملف صورة صالح (PNG, JPG, SVG, WebP)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoUploadError('حجم الصورة كبير (أكثر من 2 ميغابايت). يرجى اختيار صورة مضغوطة أصغر.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setBrandingLogo(result);
      setBrandingLogoUrlInput('');
    };
    reader.onerror = () => {
      setLogoUploadError('حدث خطأ أثناء قراءة ملف الصورة.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBranding = async () => {
    setIsSaving(true);
    const updatedSettings = {
      ...settings,
      registrationCustomLogo: brandingLogo.trim(),
      registrationButtonColor: brandingButtonColor.trim() || '#0D365A',
      registrationButtonTextColor: brandingButtonTextColor.trim() || '#FFFFFF',
      registrationButtonText: brandingButtonText.trim() || 'إرسال بيانات التسجيل الفوري 🚀',
      registrationCardTitle: brandingCardTitle.trim() || '✨ استمارة التسجيل في الأكاديمية',
      registrationSubtitle: brandingSubtitle.trim() || 'أهلاً بك! يرجى تعبئة الحقول المطلوبة بالكامل بالبيانات الصحيحة لتسجيل بياناتك لدى الإدارة وحجز حصة تجريبية وتنسيق مسارك الدراسي.',
      academyName: brandingAcademyName.trim() || 'أكاديمية التفوق',
      academySlogan: brandingSlogan.trim() || 'أون لاين',
    };

    try {
      await setDoc(doc(db, 'settings', 'global'), updatedSettings, { merge: true });
      setSettings(updatedSettings);
      setBrandingSavedNotice(true);
      setTimeout(() => setBrandingSavedNotice(false), 3500);

      await logActivity({
        actionType: 'UPDATE_REGISTRATION_BRANDING',
        actionName: 'تعديل هوية وتصميم استمارة التسجيل',
        details: `قام المدير بتعديل هوية الاستمارة (اللون: ${brandingButtonColor}، الشعار: ${brandingLogo ? 'شعار مخصص' : 'الشعار الافتراضي'}، الاسم: ${brandingAcademyName})`
      });
    } catch (err) {
      console.error("Failed to save branding:", err);
      handleFirestoreError(err, OperationType.WRITE, 'settings/global');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetBrandingDefaults = () => {
    setBrandingLogo('');
    setBrandingLogoUrlInput('');
    setBrandingButtonColor('#0D365A');
    setBrandingButtonTextColor('#FFFFFF');
    setBrandingButtonText('إرسال بيانات التسجيل الفوري 🚀');
    setBrandingCardTitle('✨ استمارة التسجيل في الأكاديمية');
    setBrandingSubtitle('أهلاً بك! يرجى تعبئة الحقول المطلوبة بالكامل بالبيانات الصحيحة لتسجيل بياناتك لدى الإدارة وحجز حصة تجريبية وتنسيق مسارك الدراسي.');
    setBrandingAcademyName('أكاديمية التفوق');
    setBrandingSlogan('أون لاين');
  };

  const handleExportSessionsToExcel = () => {
    try {
      let filteredSessions = [...sessions];
      let titlePrefix = 'كافة_الحصص';

      if (exportTargetType === 'student') {
        if (!exportSelectedStudentId) {
          alert("يرجى اختيار طالب أولاً للتصدير.");
          return;
        }
        filteredSessions = filteredSessions.filter(s => s.studentId === exportSelectedStudentId);
        const studentName = students.find(st => st.id === exportSelectedStudentId)?.name || 'طالب_محدد';
        titlePrefix = `حصص_الطالب_${studentName.replace(/\s+/g, '_')}`;
      } else if (exportTargetType === 'teacher') {
        if (!exportSelectedTeacherId) {
          alert("يرجى اختيار معلم أولاً للتصدير.");
          return;
        }
        filteredSessions = filteredSessions.filter(s => s.teacherId === exportSelectedTeacherId);
        const teacherName = teachers.find(t => t.id === exportSelectedTeacherId)?.name || 'معلم_محدد';
        titlePrefix = `حصص_المعلم_${teacherName.replace(/\s+/g, '_')}`;
      }

      if (filteredSessions.length === 0) {
        alert("لا توجد حصص مسجلة تطابق التصفية المحددة لتصديرها.");
        return;
      }

      const dataToExport = filteredSessions.map((sess, idx) => {
        const student = students.find(s => s.id === sess.studentId);
        const teacher = teachers.find(t => t.id === sess.teacherId);
        return {
          'ت': idx + 1,
          'اسم الطالب': student ? student.name : 'طالب غير معروف',
          'الصف / المستوى': student ? (student.grade || student.academicLevel || 'غير محدد') : 'غير محدد',
          'اسم المعلم': teacher ? teacher.name : 'معلم غير معروف',
          'المادة / الموضوع': sess.subject || 'غير محدد',
          'نوع الحصة': sess.isGroupSession ? 'دورة جماعية' : 'فردية لغات/تأسيس',
          'كود الدورة': sess.courseCode || 'غير محدد',
          'التاريخ والوقت': `${sess.date || 'غير محدد'} ${sess.startTime || ''}`,
          'ساعات اللقاء': sess.durationHours || 0,
          'التكلفة على الطالب (₪)': sess.customFee || 0,
          'أجر المعلم (₪)': sess.customPayout || 0,
          'ملاحظات': sess.notes || '',
          'تقييم الحصة': sess.feedback || '',
          'حالة الموافقة والتأكيد': sess.approved ? 'معتمدة ومؤكدة ✅' : 'قيد الانتظار ⏳'
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "كشف الحصص المفصل");
      
      const maxLens = {};
      dataToExport.forEach(row => {
        Object.keys(row).forEach(key => {
          const val = String(row[key]);
          maxLens[key] = Math.max(maxLens[key] || 10, val.length + 4);
        });
      });
      worksheet["!cols"] = Object.keys(maxLens).map(key => ({ wch: maxLens[key] }));

      XLSX.writeFile(workbook, `${titlePrefix}_${new Date().toISOString().split('T')[0]}.xlsx`);

      // Log export action
      const logRef = doc(collection(db, 'activityLogs'));
      setDoc(logRef, {
        actionType: 'EXPORT_SESSIONS',
        actionName: 'تصدير الحصص',
        actor: 'إدارة الأكاديمية',
        details: `تم تصدير كشف الحصص بصيغة Excel لـ (${exportTargetType === 'all' ? 'جميع الطلاب والمعلمين' : exportTargetType === 'student' ? 'طالب معين' : 'معلم معين'})`,
        timestamp: new Date().toISOString()
      }).catch(err => console.error(err));

    } catch (error) {
      console.error("Error exporting sessions:", error);
      alert("حدث خطأ تقني، فشل تنفيذ تصدير الحصص.");
    }
  };

  const handleDownloadJSONBackup = async () => {
    setBackingUp(true);
    try {
      // Fetch latest database entries to ensure a full correct backup
      const [studentsSnap, sessionsSnap, creditsSnap, teachersSnap, paymentsSnap, coursesSnap, tasksSnap, assignmentsSnap, examResultsSnap] = await Promise.all([
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'sessions')),
        getDocs(collection(db, 'studentCredits')),
        getDocs(collection(db, 'teachers')),
        getDocs(collection(db, 'payments')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'groupCourses')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'tasks')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'assignments')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'examResults')).catch(() => ({ docs: [] }))
      ]);

      const backupObj = {
        exportedAt: new Date().toISOString(),
        backupType: "full_archive_db",
        metadata: {
          academy: "أكاديمية التفوق",
          author: "المدير العام (زكي أبو علان)",
          email: "zakiabuillan@gmail.com",
          systemVersion: "1.0.0"
        },
        counts: {
          students: studentsSnap.docs.length,
          sessions: sessionsSnap.docs.length,
          studentCredits: creditsSnap.docs.length,
          teachers: teachersSnap.docs.length,
          payments: paymentsSnap.docs.length,
          groupCourses: coursesSnap.docs.length,
          tasks: tasksSnap.docs.length,
          assignments: assignmentsSnap.docs.length,
          examResults: examResultsSnap.docs.length
        },
        data: {
          students: studentsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          sessions: sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          studentCredits: creditsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          teachers: teachersSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          payments: paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          groupCourses: coursesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          tasks: tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          assignments: assignmentsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
          examResults: examResultsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        }
      };

      const jsonString = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
      link.href = url;
      link.download = `نسخة_احتياطية_كاملة_أكاديمية_التفوق_${dateStr}_${timeStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const nowFormatted = new Date().toLocaleString('ar-EG');
      localStorage.setItem('last_academy_json_backup_date', nowFormatted);
      setLastJsonBackupDate(nowFormatted);

      // Log this activity securely to activityLogs
      try {
        const logRef = doc(collection(db, 'activityLogs'));
        await setDoc(logRef, {
          actionType: 'DATABASE_BACKUP',
          actionName: 'نسخ احتياطي للبيانات',
          actor: 'المدير العام (زكي أبو علان)',
          details: `تم تنزيل نسخة احتياطية محلية متكاملة لجميع الطلاب (${studentsSnap.docs.length}) والحصص (${sessionsSnap.docs.length}) والنتائج (${examResultsSnap.docs.length}) والمدفوعات والمدرسين بصيغة JSON بنجاح للأرشفة الذاتية.`,
          timestamp: new Date().toISOString()
        });
      } catch (logErr) {
        console.warn("Failed to log activity securely, but backup succeeded:", logErr);
      }

      alert("تمت الحيازة وصناعة النسخة الاحتياطية وتصديرها بصيغة JSON بنجاح وحفظها في جهازك المحمول/المكتبي المعتمد.");
    } catch (error) {
      console.error("Error generating backup:", error);
      alert("حدث خطأ تقني غير متوقع أثناء توليد النسخة الاحتياطية جاري الفحص والمراجعة.");
    } finally {
      setBackingUp(false);
    }
  };

  const fetchCloudBackups = async () => {
    setCloudBackupsLoading(true);
    try {
      const snap = await getDocs(collection(db, 'backups'));
      const backupsList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      backupsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setCloudBackups(backupsList);
    } catch (err) {
      console.error("Failed to fetch cloud backups:", err);
    } finally {
      setCloudBackupsLoading(false);
    }
  };

  const handleDownloadCloudBackupJson = (backup: any) => {
    try {
      const rawData = typeof backup.dataString === 'string' ? JSON.parse(backup.dataString) : backup.dataString;
      const backupObj = {
        exportedAt: backup.createdAt,
        backupType: backup.backupType,
        metadata: {
          academy: "أكاديمية التفوق",
          author: "النسخ السحابي الاحتياطي",
          backupId: backup.id
        },
        counts: backup.counts,
        data: rawData
      };

      const jsonString = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      const dateStr = new Date(backup.createdAt).toISOString().split('T')[0];
      const timeStr = new Date(backup.createdAt).toTimeString().split(' ')[0].replace(/:/g, '-');
      link.href = url;
      link.download = `نسخة_احتياطية_سحابية_أكاديمية_التفوق_${dateStr}_${timeStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error parsing/downloading cloud backup:", err);
      alert("حدث خطأ عند تحميل وتصدير ملف الـ JSON للنسخة السحابية.");
    }
  };

  const handleDeleteCloudBackup = async (backupId: string) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذه النسخة الاحتياطية من السحابة نهائياً؟")) {
      return;
    }
    try {
      await deleteDoc(doc(db, 'backups', backupId));
      fetchCloudBackups();
      
      const logRef = doc(collection(db, 'activityLogs'));
      await setDoc(logRef, {
        actionType: 'DELETE_BACKUP',
        actionName: 'حذف نسخة احتياطية',
        actor: 'المدير العام (زكي أبو علان)',
        details: `تم إزالة نسخة احتياطية سحابية من النظام (المعرف: ${backupId})`,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to delete backup:", err);
      alert("فشل حذف النسخة الاحتياطية.");
    }
  };

  const triggerAutoCloudBackup = async (currentSettings: any) => {
    try {
      const [studentsSnap, sessionsSnap, creditsSnap, teachersSnap, paymentsSnap, coursesSnap, tasksSnap, assignmentsSnap, examResultsSnap] = await Promise.all([
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'sessions')),
        getDocs(collection(db, 'studentCredits')),
        getDocs(collection(db, 'teachers')),
        getDocs(collection(db, 'payments')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'groupCourses')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'tasks')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'assignments')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'examResults')).catch(() => ({ docs: [] }))
      ]);

      const backupData = {
        students: studentsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        sessions: sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        studentCredits: creditsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        teachers: teachersSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        payments: paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        groupCourses: coursesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        tasks: tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        assignments: assignmentsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        examResults: examResultsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      };

      const counts = {
        students: studentsSnap.docs.length,
        sessions: sessionsSnap.docs.length,
        studentCredits: creditsSnap.docs.length,
        teachers: teachersSnap.docs.length,
        payments: paymentsSnap.docs.length,
        groupCourses: coursesSnap.docs.length,
        tasks: tasksSnap.docs.length,
        assignments: assignmentsSnap.docs.length,
        examResults: examResultsSnap.docs.length
      };

      const backupId = `auto_${new Date().toISOString().split('T')[0]}_${Date.now()}`;
      await setDoc(doc(db, 'backups', backupId), {
        id: backupId,
        createdAt: new Date().toISOString(),
        backupType: "auto_weekly_cloud",
        counts: counts,
        dataString: JSON.stringify(backupData)
      });

      const nowStr = new Date().toISOString();
      await updateDoc(doc(db, 'settings', 'global'), {
        lastAutoBackupDate: nowStr
      });

      setSettings(prev => ({
        ...prev,
        lastAutoBackupDate: nowStr
      }));

      const logRef = doc(collection(db, 'activityLogs'));
      await setDoc(logRef, {
        actionType: 'DATABASE_BACKUP_AUTO',
        actionName: 'نسخ احتياطي تلقائي أسبوعي',
        actor: 'النظام السحابي التلقائي',
        details: `تم إنشاء نسخة احتياطية سحابية تلقائية أسبوعية للبيانات بنجاح وتخزينها بأمان.`,
        timestamp: new Date().toISOString()
      });

      fetchCloudBackups();
    } catch (err) {
      console.error("Auto cloud backup failed:", err);
    }
  };

  const handleTriggerCloudBackupNow = async () => {
    setIsCloudBackingUp(true);
    try {
      const [studentsSnap, sessionsSnap, creditsSnap, teachersSnap, paymentsSnap, coursesSnap, tasksSnap, assignmentsSnap, examResultsSnap] = await Promise.all([
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'sessions')),
        getDocs(collection(db, 'studentCredits')),
        getDocs(collection(db, 'teachers')),
        getDocs(collection(db, 'payments')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'groupCourses')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'tasks')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'assignments')).catch(() => ({ docs: [] })),
        getDocs(collection(db, 'examResults')).catch(() => ({ docs: [] }))
      ]);

      const backupData = {
        students: studentsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        sessions: sessionsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        studentCredits: creditsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        teachers: teachersSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        payments: paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        groupCourses: coursesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        tasks: tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        assignments: assignmentsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        examResults: examResultsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      };

      const counts = {
        students: studentsSnap.docs.length,
        sessions: sessionsSnap.docs.length,
        studentCredits: creditsSnap.docs.length,
        teachers: teachersSnap.docs.length,
        payments: paymentsSnap.docs.length,
        groupCourses: coursesSnap.docs.length,
        tasks: tasksSnap.docs.length,
        assignments: assignmentsSnap.docs.length,
        examResults: examResultsSnap.docs.length
      };

      const backupId = `manual_cloud_${new Date().toISOString().split('T')[0]}_${Date.now()}`;
      await setDoc(doc(db, 'backups', backupId), {
        id: backupId,
        createdAt: new Date().toISOString(),
        backupType: "manual_cloud",
        counts: counts,
        dataString: JSON.stringify(backupData)
      });

      const logRef = doc(collection(db, 'activityLogs'));
      await setDoc(logRef, {
        actionType: 'DATABASE_BACKUP_MANUAL_CLOUD',
        actionName: 'نسخ احتياطي سحابي يدوي',
        actor: 'المدير العام (زكي أبو علان)',
        details: `تم إنشاء نسخة احتياطية سحابية يدوية للبيانات بنجاح وتخزينها بأمان في قواعد البيانات.`,
        timestamp: new Date().toISOString()
      });

      alert("تم إنشاء نسخة احتياطية سحابية يدوية وتخزينها بنجاح بأمان في وحدة التخزين السحابية قاعدة البيانات! يمكنك العثور عليها وتنزيلها بصيغة JSON بأي وقت.");
      fetchCloudBackups();
    } catch (err) {
      console.error("Manual cloud backup failed:", err);
      alert("حدث خطأ تقني أثناء محاولة حفظ النسخة السحابية.");
    } finally {
      setIsCloudBackingUp(false);
    }
  };

  const handlePurgeData = async () => {
    // Requires a security prompt and checks before executing
    const pin = window.prompt("صلاحية أمنية فائقة: يرجى إدخال الرمز السري الإداري الأمني الموحد (10020030) لتأكيد وإتمام تفريغ البيانات السحابية الحساسة:");
    if (pin !== '10020030') {
      window.alert("الرمز السري غير صحيح! لا يمكن تفريغ البيانات السحابية.");
      return;
    }

    setIsPurging(true);
    try {
      const deletePromises = [];
      let logDetails = '';

      if (purgeTargetType === 'all_students') {
        const [studentsSnap, creditsSnap, sessionsSnap] = await Promise.all([
          getDocs(collection(db, 'students')),
          getDocs(collection(db, 'studentCredits')),
          getDocs(collection(db, 'sessions'))
        ]);

        studentsSnap.docs.forEach(docSnap => {
          deletePromises.push(deleteDoc(doc(db, 'students', docSnap.id)));
        });
        creditsSnap.docs.forEach(docSnap => {
          deletePromises.push(deleteDoc(doc(db, 'studentCredits', docSnap.id)));
        });
        sessionsSnap.docs.forEach(docSnap => {
          deletePromises.push(deleteDoc(doc(db, 'sessions', docSnap.id)));
        });

        logDetails = `تفريغ كامل لبيانات جميع الطلاب من خوادم الأكاديمية (شامل مستند الطلاب الماليين، الأرصاد، المدفوعات، وسجل الحصص بالكامل).`;

      } else if (purgeTargetType === 'student') {
        if (!purgeSelectedStudentId) {
          alert("يرجى تحديد طالب أولاً لتفريغ بياناته.");
          setIsPurging(false);
          return;
        }
        const studentName = students.find(s => s.id === purgeSelectedStudentId)?.name || 'طالب مجهول';

        const [creditsSnap, sessionsSnap] = await Promise.all([
          getDocs(collection(db, 'studentCredits')),
          getDocs(collection(db, 'sessions'))
        ]);

        deletePromises.push(deleteDoc(doc(db, 'students', purgeSelectedStudentId)));

        creditsSnap.docs.forEach(docSnap => {
          if (docSnap.data().studentId === purgeSelectedStudentId) {
            deletePromises.push(deleteDoc(doc(db, 'studentCredits', docSnap.id)));
          }
        });

        sessionsSnap.docs.forEach(docSnap => {
          if (docSnap.data().studentId === purgeSelectedStudentId) {
            deletePromises.push(deleteDoc(doc(db, 'sessions', docSnap.id)));
          }
        });

        logDetails = `تفريغ كامل وحذف نهائي لبيانات الطالب (${studentName}) بما يشمل سجل دفوعات شحن رصيده المالي وكافة الحصص واللقاءات التي حضرها.`;

      } else if (purgeTargetType === 'teacher') {
        if (!purgeSelectedTeacherId) {
          alert("يرجى تحديد معلم أولاً لتفريغ بياناته.");
          setIsPurging(false);
          return;
        }
        const teacherName = teachers.find(t => t.id === purgeSelectedTeacherId)?.name || 'معلم مجهول';

        const [sessionsSnap, paymentsSnap, assignmentsSnap] = await Promise.all([
          getDocs(collection(db, 'sessions')),
          getDocs(collection(db, 'payments')),
          getDocs(collection(db, 'assignments'))
        ]);

        deletePromises.push(deleteDoc(doc(db, 'teachers', purgeSelectedTeacherId)));

        sessionsSnap.docs.forEach(docSnap => {
          if (docSnap.data().teacherId === purgeSelectedTeacherId) {
            deletePromises.push(deleteDoc(doc(db, 'sessions', docSnap.id)));
          }
        });

        paymentsSnap.docs.forEach(docSnap => {
          if (docSnap.data().teacherId === purgeSelectedTeacherId) {
            deletePromises.push(deleteDoc(doc(db, 'payments', docSnap.id)));
          }
        });

        assignmentsSnap.docs.forEach(docSnap => {
          if (docSnap.data().teacherId === purgeSelectedTeacherId) {
            deletePromises.push(deleteDoc(doc(db, 'assignments', docSnap.id)));
          }
        });

        logDetails = `تفريغ كامل وحذف نهائي للمعلم (${teacherName}) مع إزالة كافة الحصص المرتبطة به وسجل صرف مستحقاته المالية وتنسيباته الدراسية من النظام.`;
      }

      await Promise.all(deletePromises);

      // Add to activity logs
      const logRef = doc(collection(db, 'activityLogs'));
      await setDoc(logRef, {
        actionType: 'PURGE_DATA',
        actionName: 'تفريغ وتصفير بيانات',
        actor: 'إدارة الأكاديمية (Super Admin)',
        details: logDetails,
        timestamp: new Date().toISOString()
      });

      window.alert("تم تفريغ وحذف البيانات المحددة بنجاح تام وبشكل مباشر.");
      
      // Reset inputs
      setPurgeSelectedStudentId('');
      setPurgeSelectedTeacherId('');
      setShowPurgeConfirmation(false);

      // Refresh listings
      await fetchSettings();

    } catch (err) {
      console.error("Critical error purging data:", err);
      alert("حدث خطأ تقني أثناء تفريغ البيانات، يرجى تكرار المحاولة.");
    } finally {
      setIsPurging(false);
    }
  };

  const addSubject = () => {
    if (newSubject && !(settings.subjects || []).includes(newSubject)) {
      const updated = { 
        ...settings, 
        subjects: [...(settings.subjects || []), newSubject] 
      };
      saveSettings(updated);
      setNewSubject('');
    }
  };

  const removeSubject = (subject: string) => {
    const updated = { 
      ...settings, 
      subjects: (settings.subjects || []).filter(s => s !== subject) 
    };
    saveSettings(updated);
  };

  const handleAddPeriod = () => {
    if (!periodName.trim()) {
      alert("يرجى إدخال اسم الفترة الزمنية.");
      return;
    }
    if (!periodStart) {
      alert("يرجى اختيار تاريخ البدء.");
      return;
    }
    if (!periodEnd) {
      alert("يرجى اختيار تاريخ الانتهاء.");
      return;
    }
    if (periodStart > periodEnd) {
      alert("تاريخ البدء لا يمكن أن يكون بعد تاريخ الانتهاء.");
      return;
    }

    const newPeriod = {
      id: 'period_' + Date.now(),
      name: periodName.trim(),
      startDate: periodStart,
      endDate: periodEnd,
    };

    const currentPeriods = settings.customReportPeriods || [];
    const updated = {
      ...settings,
      customReportPeriods: [...currentPeriods, newPeriod]
    };

    setSettings(updated);
    saveSettings(updated);

    // Reset inputs
    setPeriodName('');
    setPeriodStart('');
    setPeriodEnd('');
  };

  const handleDeletePeriod = (id: string) => {
    const currentPeriods = settings.customReportPeriods || [];
    const updated = {
      ...settings,
      customReportPeriods: currentPeriods.filter((p: any) => p.id !== id)
    };
    setSettings(updated);
    saveSettings(updated);
  };

  const updateStudentThreshold = async (studentId: string, val: number | null) => {
    try {
      setIsSaving(true);
      const studentRef = doc(db, 'students', studentId);
      if (val === null) {
        // Clear override
        await updateDoc(studentRef, { lowBalanceThreshold: null });
      } else {
        // Save override
        await updateDoc(studentRef, { lowBalanceThreshold: val });
      }
      
      // Refresh local list of students
      const studentsSnap = await getDocs(collection(db, 'students'));
      const studentsList = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      setStudents(studentsList);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Reset inputs on successful override creation
      if (studentId === selectedStudentId) {
        setCustomThreshold('');
        setSelectedStudentId('');
      }
    } catch (error) {
      console.error("Error updating student threshold:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40 select-none" dir="rtl">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-[#D4A33C] rounded-full animate-spin mb-4" />
        <p className="text-xs font-black text-slate-400">جاري تحميل إعدادات النظام...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20 text-right" dir="rtl">
      
      {/* Activity Logs & Configs Selector Tab bar */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-[1.25rem] w-fit">
        <button
          onClick={() => setActiveTab('config')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'config'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-100'
              : 'text-slate-500 hover:text-slate-805'
          }`}
          id="config-settings-tab"
        >
          <SettingsIcon size={14} className={activeTab === 'config' ? 'text-amber-500 font-extrabold' : ''} />
          <span>إعدادات النظام والأسعار العامة</span>
        </button>

        <button
          onClick={() => setActiveTab('branding')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'branding'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-100'
              : 'text-slate-500 hover:text-slate-805'
          }`}
          id="branding-settings-tab"
        >
          <Palette size={14} className={activeTab === 'branding' ? 'text-indigo-600 font-extrabold' : ''} />
          <span>هوية واستمارة التسجيل</span>
          <span className="bg-indigo-500/10 text-indigo-600 text-[9px] font-black px-1.5 py-0.5 rounded-md">جديد 🎨</span>
        </button>

        <button
          onClick={() => setActiveTab('financial-categories')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'financial-categories'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-100'
              : 'text-slate-500 hover:text-slate-805'
          }`}
          id="financial-categories-tab"
        >
          <Tags size={14} className={activeTab === 'financial-categories' ? 'text-amber-500 font-extrabold' : ''} />
          <span>التصنيفات والبنود المالية</span>
          <span className="bg-amber-500/10 text-amber-700 text-[9px] font-black px-1.5 py-0.5 rounded-md">رسوم وخدمات 🏷️</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('logs');
            fetchLogs();
          }}
          className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-100'
              : 'text-slate-500 hover:text-slate-805'
          }`}
          id="activity-logs-tab"
        >
          <History size={14} className={activeTab === 'logs' ? 'text-teal-600 font-extrabold' : ''} />
          <span>سجل تتبع العمليات الحساسة (Audit Trail)</span>
          <span className="bg-teal-500/10 text-teal-600 text-[9px] font-black px-1.5 py-0.5 rounded-md">آمن 🔒</span>
        </button>

        <button
          onClick={() => setActiveTab('maintenance')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'maintenance'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-100'
              : 'text-slate-500 hover:text-slate-805'
          }`}
          id="maintenance-settings-tab"
        >
          <Wrench size={14} className={activeTab === 'maintenance' ? 'text-amber-600 font-extrabold' : ''} />
          <span>أدوات الصيانة وتصدير البيانات</span>
          <span className="bg-amber-500/10 text-[#D4A33C] text-[9px] font-black px-1.5 py-0.5 rounded-md">جديد ✨</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'expenses'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-100'
              : 'text-slate-500 hover:text-slate-805'
          }`}
          id="expenses-settings-tab"
        >
          <Receipt size={14} className={activeTab === 'expenses' ? 'text-amber-500 font-extrabold' : ''} />
          <span>المصاريف التشغيلية للمركز</span>
          <span className="bg-amber-500/20 text-amber-700 text-[9px] font-black px-1.5 py-0.5 rounded-md">جديد 💸</span>
        </button>
      </div>

      {activeTab === 'config' ? (
        <div className="flex flex-col gap-10">
        
        {/* Main Configuration Card */}
        <section className="bg-white rounded-[2.5rem] p-10 border border-slate-200/60 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-1.5 bg-[#D4A33C]" />
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-[#D4A33C] flex items-center justify-center shadow-lg">
                  <Hash size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">الإعدادات العامة للنظام</h3>
                  <p className="text-xs text-slate-400 font-bold mt-1">تنسيق السياسات الافتراضية للمعاملات والتدريس</p>
                </div>
              </div>
              <AnimatePresence>
                {showSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-2 text-emerald-600 font-bold text-[11px] bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100"
                  >
                    <CheckCircle2 size={14} />
                    تم الحفظ التلقائي
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="space-y-8 divide-y divide-slate-100">
              <div className="space-y-6 pb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right" dir="rtl">
                  
                  {/* Secondary Stage Rate (60 NIS default) */}
                  <div className="space-y-3 text-right p-5 bg-amber-50/40 rounded-2xl border border-amber-200/60">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-black text-amber-950 block">سعر ساعة المرحلة الثانوية والتوجيهي (شيكل ₪)</label>
                      <span className="text-[10px] font-black text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full border border-amber-300">
                        افتراضي المنصة: 60 ₪
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400">₪</span>
                        <input 
                          type="number" 
                          value={settings.defaultSecondaryStudentHourlyRate ?? 60} 
                          onChange={e => {
                            const val = Number(e.target.value);
                            setSettings({...settings, defaultSecondaryStudentHourlyRate: val});
                          }}
                          onBlur={() => {
                            const val = settings.defaultSecondaryStudentHourlyRate ?? 60;
                            const updated = { 
                              ...settings, 
                              defaultSecondaryStudentHourlyRate: val
                            };
                            saveSettings(updated);
                          }}
                          className="w-full pl-12 pr-6 py-4 bg-white border border-amber-200/80 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-black text-2xl text-slate-900 text-right"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-amber-900/80 font-bold mt-1">سعر الساعة التلقائي لطلاب المرحلة الثانوية والتوجيهي (الافتراضي 60 شيكل إلا إذا تم تغييره هنا من قِبل المدير أو تخصيص سعر لطالب معين).</p>
                  </div>

                  {/* Middle Stage Rate (50 NIS default) */}
                  <div className="space-y-3 text-right p-5 bg-blue-50/40 rounded-2xl border border-blue-200/60">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-black text-blue-950 block">سعر ساعة المرحلة الإعدادية (شيكل ₪)</label>
                      <span className="text-[10px] font-black text-blue-800 bg-blue-100/80 px-2.5 py-0.5 rounded-full border border-blue-300">
                        افتراضي المنصة: 50 ₪
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400">₪</span>
                        <input 
                          type="number" 
                          value={settings.defaultMiddleStudentHourlyRate ?? 50} 
                          onChange={e => {
                            const val = Number(e.target.value);
                            setSettings({...settings, defaultMiddleStudentHourlyRate: val});
                          }}
                          onBlur={() => {
                            const val = settings.defaultMiddleStudentHourlyRate ?? 50;
                            const updated = { 
                              ...settings, 
                              defaultMiddleStudentHourlyRate: val
                            };
                            saveSettings(updated);
                          }}
                          className="w-full pl-12 pr-6 py-4 bg-white border border-blue-200/80 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-black text-2xl text-slate-900 text-right"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-blue-900/80 font-bold mt-1">سعر الساعة التلقائي لطلاب المرحلة الإعدادية للصفوف السابع والثامن والتاسع (الافتراضي 50 شيكل إلا إذا تم تغييره هنا أو تخصيص سعر لطالب معين).</p>
                  </div>

                  {/* Default Teacher Payout */}
                  <div className="space-y-3 text-right p-5 bg-slate-50/60 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-black text-slate-700 block">أجر المعلم بالساعة الافتراضي في الحصة الفردية (شيكل ₪)</label>
                      <span className="text-[10px] font-black text-slate-600 bg-slate-200/70 px-2.5 py-0.5 rounded-full border border-slate-300">
                        افتراضي المنصة: 35 ₪
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400">₪</span>
                        <input 
                          type="number" 
                          value={settings.defaultTeacherHourlyRate} 
                          onChange={e => setSettings({...settings, defaultTeacherHourlyRate: Number(e.target.value)})}
                          onBlur={() => {
                            const updated = { 
                              ...settings, 
                              defaultTeacherHourlyRate: settings.defaultTeacherHourlyRate ?? 35 
                            };
                            saveSettings(updated);
                          }}
                          className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200/80 rounded-2xl focus:ring-4 focus:ring-[#D4A33C]/10 focus:border-[#D4A33C] outline-none transition-all font-black text-2xl text-slate-900 text-right"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 font-bold mt-1">سيتم احتساب أجر المعلم بالساعة الافتراضي في الحصص الفردية بناءً على هذه القيمة (الافتراضي: 35 شيكل).</p>
                  </div>

                  {/* Primary Stage / General Fallback Rate */}
                  <div className="space-y-3 text-right p-5 bg-slate-50/60 rounded-2xl border border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-black text-slate-700 block">سعر ساعة المرحلة الأساسية / العام الافتراضي (شيكل ₪)</label>
                      <span className="text-[10px] font-black text-slate-600 bg-slate-200/70 px-2.5 py-0.5 rounded-full border border-slate-300">
                        الافتراضي العام: 50 ₪
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400">₪</span>
                        <input 
                          type="number" 
                          value={settings.defaultPrimaryStudentHourlyRate ?? settings.defaultStudentHourlyRate ?? 50} 
                          onChange={e => {
                            const val = Number(e.target.value);
                            setSettings({...settings, defaultPrimaryStudentHourlyRate: val, defaultStudentHourlyRate: val, defaultHourlyRate: val});
                          }}
                          onBlur={() => {
                            const val = settings.defaultPrimaryStudentHourlyRate ?? settings.defaultStudentHourlyRate ?? 50;
                            const updated = { 
                              ...settings, 
                              defaultPrimaryStudentHourlyRate: val,
                              defaultStudentHourlyRate: val,
                              defaultHourlyRate: val
                            };
                            saveSettings(updated);
                          }}
                          className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200/80 rounded-2xl focus:ring-4 focus:ring-[#D4A33C]/10 focus:border-[#D4A33C] outline-none transition-all font-black text-2xl text-slate-900 text-right"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 font-bold mt-1">يُشمل هذا السعر كقيمة معيارية للمرحلة الابتدائية/الأساسية أو في حال عدم تصنيف الطالب لمرحلة معينة (الافتراضي: 50 شيكل).</p>
                  </div>

                  {/* Bulk Update / Propagation Section */}
                  <div className="col-span-1 md:col-span-2 p-6 bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-150 rounded-2xl space-y-4 text-right mt-2" dir="rtl">
                    <div className="flex items-start gap-3">
                      <span className="p-2 bg-indigo-500/10 rounded-xl text-indigo-600 font-extrabold text-lg shrink-0">⚡</span>
                      <div className="space-y-1">
                        <h4 className="text-sm font-black text-indigo-950">تعديل وتعميم الأسعار الجديدة حسب المراحل على كافة الحسابات</h4>
                        <p className="text-[11px] text-indigo-900/80 font-bold leading-relaxed">
                          عند الضغط على الزر أدناه، سيتم تعميم الأسعار الافتراضية المحددة أعلاه (المرحلة الثانوية: {settings.defaultSecondaryStudentHourlyRate ?? 60} ₪/ساعة، المرحلة الإعدادية: {settings.defaultMiddleStudentHourlyRate ?? 50} ₪/ساعة، وأجر المعلم: {settings.defaultTeacherHourlyRate ?? 35} ₪/ساعة) وتطبيقها تلقائياً على كافة حسابات الطلاب والمعلمين في قاعدة البيانات بحسب المرحلة التعليمية لكل طالب.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const secRate = settings.defaultSecondaryStudentHourlyRate ?? 60;
                          const midRate = settings.defaultMiddleStudentHourlyRate ?? 50;
                          const teachRate = settings.defaultTeacherHourlyRate ?? 35;
                          const confirmUpdate = window.confirm(`هل أنت متأكد من رغبتك في تحديث وتعميم هذه الأسعار:\n• سعر ساعة المرحلة الثانوية: ${secRate} ₪\n• سعر ساعة المرحلة الإعدادية: ${midRate} ₪\n• أجر ساعة المعلم: ${teachRate} ₪\nعلى كافة حسابات الطلاب والمعلمين في النظام؟`);
                          if (confirmUpdate) {
                            handlePropagateDefaultRates(secRate, midRate, teachRate);
                          }
                        }}
                        disabled={isSaving}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-750 disabled:bg-indigo-300 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <span className="animate-spin inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                            <span>جاري تحديث كافة الحسابات...</span>
                          </>
                        ) : (
                          <>
                            <span>تحديث وتعميم أسعار الساعات على كافة الحسابات الآن ⚡</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* NEW: 40-Minute Session System for Middle & Secondary Stages */}
              <div className="space-y-6 pb-8 pt-6">
                <div className="p-6 bg-gradient-to-br from-amber-50/70 via-slate-50 to-indigo-50/50 border border-slate-200/90 rounded-3xl space-y-6 shadow-xs" dir="rtl">
                  
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/70 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#0D365A] text-white flex items-center justify-center shadow-md shadow-blue-950/20">
                        <Clock size={24} className="text-amber-300" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-lg font-black text-slate-900">نظام الحصص (40 دقيقة) للمرحلتين الإعدادية والثانوية</h4>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            مفعل في المنصة
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-bold mt-0.5">
                          ضمن صلاحيات مدير المنصة: تحديد تسعيرة خاصة لكل حصة 40 دقيقة، مع بقاء نظام الساعات (60 دقيقة) متاحاً للاختيار
                        </p>
                      </div>
                    </div>

                    {/* Toggle Switch */}
                    <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-xs">
                      <span className="text-xs font-black text-slate-700">تفعيل نظام الحصص:</span>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = {
                            ...settings,
                            sessionPricingSystemEnabled: settings.sessionPricingSystemEnabled === false ? true : false
                          };
                          setSettings(updated);
                          saveSettings(updated);
                        }}
                        className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                          settings.sessionPricingSystemEnabled !== false ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            settings.sessionPricingSystemEnabled !== false ? 'left-1' : 'right-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Manager Privilege Banner & Default Program Control */}
                  <div className="p-4 bg-white rounded-2xl border border-amber-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0 border border-amber-300">
                        <span className="text-lg">👑</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-xs font-black text-slate-900">صلاحية اختيار البرنامج (ساعات / حصص 40 دقيقة)</h5>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                            صلاحيات المدير فقط 🔒
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-bold mt-0.5 leading-relaxed">
                          أيقونة واختيار نوع البرنامج (ساعات 60 د / حصص 40 د) محصورة بصلاحيات مدير المنصة فقط. ولا يملك المعلم إمكانية التبديل من طرفه، بل يلتزم بالنظام المعتمد من الإدارة.
                        </p>
                      </div>
                    </div>

                    {/* Default Program Selector */}
                    <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                      <span className="text-xs font-black text-slate-700 hidden sm:inline">البرنامج الافتراضي:</span>
                      <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...settings, defaultPricingProgram: 'hourly' as const };
                            setSettings(updated);
                            saveSettings(updated);
                          }}
                          className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            (settings.defaultPricingProgram || 'hourly') === 'hourly'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          ⏱️ ساعات (60 د)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = { ...settings, defaultPricingProgram: 'session_40' as const };
                            setSettings(updated);
                            saveSettings(updated);
                          }}
                          className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            settings.defaultPricingProgram === 'session_40'
                              ? 'bg-[#0D365A] text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          🎓 حصص (40 د)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Pricing Inputs Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Middle School (الصفوف 7 - 9) */}
                    <div className="bg-white rounded-2xl p-5 border border-emerald-150 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🌱</span>
                          <div>
                            <h5 className="text-sm font-black text-slate-900">المرحلة الإعدادية (الصفوف 7 - 9)</h5>
                            <span className="text-[10px] text-emerald-700 font-bold">السابع، الثامن، التاسع</span>
                          </div>
                        </div>
                        <span className="text-[11px] font-black px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200">
                          حصة 40 دقيقة
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Student Rate */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-slate-700 block">سعر حصة الطالب (شيكل ₪)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">₪</span>
                            <input
                              type="number"
                              min="0"
                              value={settings.middleSchoolStudentSessionRate ?? 40}
                              onChange={e => {
                                setSettings({ ...settings, middleSchoolStudentSessionRate: Number(e.target.value) });
                              }}
                              onBlur={() => {
                                const updated = {
                                  ...settings,
                                  middleSchoolStudentSessionRate: settings.middleSchoolStudentSessionRate ?? 40
                                };
                                saveSettings(updated);
                              }}
                              className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-black text-lg text-slate-900 text-right"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold">يقتطع من ميزانية طالب الإعدادي</p>
                        </div>

                        {/* Teacher Payout */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-slate-700 block">أجر حصة المعلم (شيكل ₪)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">₪</span>
                            <input
                              type="number"
                              min="0"
                              value={settings.middleSchoolTeacherSessionRate ?? 25}
                              onChange={e => {
                                setSettings({ ...settings, middleSchoolTeacherSessionRate: Number(e.target.value) });
                              }}
                              onBlur={() => {
                                const updated = {
                                  ...settings,
                                  middleSchoolTeacherSessionRate: settings.middleSchoolTeacherSessionRate ?? 25
                                };
                                saveSettings(updated);
                              }}
                              className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-black text-lg text-slate-900 text-right"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold">يصرف لمستحقات المعلم عن الحصة</p>
                        </div>
                      </div>

                      {/* Margin indicator */}
                      <div className="pt-2 flex items-center justify-between text-xs bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                        <span className="font-black text-emerald-900">هامش الأكاديمية الصافي لكل حصة إعدادي:</span>
                        <span className="font-black text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                          ₪{(settings.middleSchoolStudentSessionRate ?? 40) - (settings.middleSchoolTeacherSessionRate ?? 25)}
                        </span>
                      </div>
                    </div>

                    {/* Secondary School (الصفوف 10 - 12) */}
                    <div className="bg-white rounded-2xl p-5 border border-indigo-150 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🎓</span>
                          <div>
                            <h5 className="text-sm font-black text-slate-900">المرحلة الثانوية والتوجيهي (الصفوف 10 - 12)</h5>
                            <span className="text-[10px] text-indigo-700 font-bold">العاشر، الحادي عشر، الثاني عشر، بجروت/توجيهي</span>
                          </div>
                        </div>
                        <span className="text-[11px] font-black px-2.5 py-1 bg-indigo-50 text-indigo-800 rounded-lg border border-indigo-200">
                          حصة 40 دقيقة
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Student Rate */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-slate-700 block">سعر حصة الطالب (شيكل ₪)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">₪</span>
                            <input
                              type="number"
                              min="0"
                              value={settings.secondarySchoolStudentSessionRate ?? 50}
                              onChange={e => {
                                setSettings({ ...settings, secondarySchoolStudentSessionRate: Number(e.target.value) });
                              }}
                              onBlur={() => {
                                const updated = {
                                  ...settings,
                                  secondarySchoolStudentSessionRate: settings.secondarySchoolStudentSessionRate ?? 50
                                };
                                saveSettings(updated);
                              }}
                              className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-black text-lg text-slate-900 text-right"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold">يقتطع من ميزانية طالب الثانوي</p>
                        </div>

                        {/* Teacher Payout */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-slate-700 block">أجر حصة المعلم (شيكل ₪)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">₪</span>
                            <input
                              type="number"
                              min="0"
                              value={settings.secondarySchoolTeacherSessionRate ?? 35}
                              onChange={e => {
                                setSettings({ ...settings, secondarySchoolTeacherSessionRate: Number(e.target.value) });
                              }}
                              onBlur={() => {
                                const updated = {
                                  ...settings,
                                  secondarySchoolTeacherSessionRate: settings.secondarySchoolTeacherSessionRate ?? 35
                                };
                                saveSettings(updated);
                              }}
                              className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-black text-lg text-slate-900 text-right"
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold">يصرف لمستحقات المعلم عن الحصة</p>
                        </div>
                      </div>

                      {/* Margin indicator */}
                      <div className="pt-2 flex items-center justify-between text-xs bg-indigo-50/70 p-3 rounded-xl border border-indigo-100">
                        <span className="font-black text-indigo-900">هامش الأكاديمية الصافي لكل حصة ثانوي:</span>
                        <span className="font-black text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
                          ₪{(settings.secondarySchoolStudentSessionRate ?? 50) - (settings.secondarySchoolTeacherSessionRate ?? 35)}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Explanatory Banner & Propagation Button */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-slate-200 text-xs">
                    <div className="flex items-center gap-2.5 text-slate-700">
                      <span className="text-base">💡</span>
                      <span className="font-bold">
                        يمكن للمدير والمعلم عند رصد أي لقاء الاختيار بحرية بين <b>«نظام الساعات (60 دقيقة)»</b> أو <b>«نظام الحصص (40 دقيقة)»</b> مع التطبيق المالي الفوري والدقيق.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const msg = `هل أنت متأكد من تعميم أسعار الحصص (40 دقيقة) على جميع حسابات الطلاب والمعلمين في النظام؟\n\n- الإعدادي: طالب ₪${settings.middleSchoolStudentSessionRate ?? 40} / معلم ₪${settings.middleSchoolTeacherSessionRate ?? 25}\n- الثانوي: طالب ₪${settings.secondarySchoolStudentSessionRate ?? 50} / معلم ₪${settings.secondarySchoolTeacherSessionRate ?? 35}`;
                        if (window.confirm(msg)) {
                          handlePropagateSessionRates();
                        }
                      }}
                      disabled={isSaving}
                      className="shrink-0 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs transition-all shadow-sm active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? (
                        <>
                          <span className="animate-spin inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />
                          <span>جاري التعميم...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw size={13} />
                          <span>تعميم أسعار الحصص على الحسابات 🎓</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              </div>

              <div className="space-y-3 pt-8">
                <label className="text-sm font-black text-slate-700 mr-1">حد الرصيد المنخفض لتنبيه الإدارة (شيكل ₪)</label>
                <div className="flex items-center gap-4">
                  <div className="flex-1 relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-400">₪</span>
                    <input 
                      type="text" 
                      value={localThreshold} 
                      onChange={e => {
                        setLocalThreshold(e.target.value);
                        const val = Number(e.target.value);
                        if (!isNaN(val) && e.target.value.trim() !== '') {
                          setSettings({...settings, lowBalanceThreshold: val});
                        }
                      }}
                      onBlur={() => {
                        const val = localThreshold === '' || isNaN(Number(localThreshold)) ? -100 : Number(localThreshold);
                        const updated = { ...settings, lowBalanceThreshold: val };
                        setSettings(updated);
                        setLocalThreshold(String(val));
                        saveSettings(updated);
                      }}
                      className="w-full pl-12 pr-6 py-5 bg-slate-50 border border-slate-200/80 rounded-2xl focus:ring-4 focus:ring-[#D4A33C]/10 focus:border-[#D4A33C] outline-none transition-all font-black text-2xl text-slate-900 text-right"
                      placeholder="-100"
                    />
                  </div>
                  <div className="px-8 py-5 bg-rose-50 text-rose-800 border border-rose-100 rounded-2xl font-black text-xs tracking-widest uppercase mb-0.5">
                    حد الرصيد الأدنى
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold mt-2 mr-1">سيقوم النظام بإشعار مدراء الأكاديمية بمجرد هبوط رصيد الطالب لما دون هذا الرقم المالي (مثال: -100 شيكل).</p>
              </div>

              {/* WhatsApp Message Reminder Settings & Customization */}
              <div className="space-y-8 pt-8 border-t border-slate-100 text-right" dir="rtl">
                
                {/* 1. Default WhatsApp Reminder Message Template Customizer */}
                <div className="bg-gradient-to-br from-emerald-50/50 via-white to-slate-50 border border-emerald-200/80 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
                  {/* Section Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-100 pb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                        <MessageSquare size={22} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-black text-slate-900">تخصيص نص رسائل تذكير الواتس آب الافتراضية</h4>
                          <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            قالب التذكيرات المعتمد
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-bold mt-1">
                          يمكن للمدير هنا تخصيص صيغة نص الرسالة الافتراضي المعتمد لتذكيرات الرصيد والمطالبات عبر WhatsApp، مع دعم المتغيرات مثل {'{studentName}'} و {'{balance}'}.
                        </p>
                      </div>
                    </div>

                    {/* Status / Saved Indicator */}
                    <AnimatePresence>
                      {whatsappTemplateSavedFeedback && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-sm shrink-0"
                        >
                          <CheckCircle2 size={16} />
                          <span>تم حفظ القالب بنجاح!</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Preset Templates Selector */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Sliders size={14} className="text-emerald-600" />
                        <span>نماذج وقوالب التذكير الجاهزة:</span>
                      </label>
                      <span className="text-[10px] font-bold text-slate-400">انقر على النموذج لاختياره وتطبيقه على المحرر</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {AUTO_WHATSAPP_TEMPLATES_PRESETS.map((preset) => {
                        const isCurrent = (whatsappTemplateInput || settings.autoWhatsAppTemplate || DEFAULT_AUTO_WHATSAPP_TEMPLATE) === preset.text;
                        return (
                          <div
                            key={preset.id}
                            onClick={() => {
                              setWhatsappTemplateInput(preset.text);
                              handleSaveWhatsAppTemplate(preset.text);
                            }}
                            className={`p-4 rounded-2xl border transition-all cursor-pointer text-right flex flex-col justify-between gap-2.5 relative ${
                              isCurrent
                                ? 'bg-emerald-50/80 border-emerald-500 shadow-sm ring-2 ring-emerald-500/20'
                                : 'bg-white border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/30'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-xs font-black text-slate-900">{preset.title}</span>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                  isCurrent ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {preset.badge}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{preset.desc}</p>
                            </div>
                            <span className="text-[10px] font-black text-emerald-700 flex items-center gap-1 mt-1">
                              {isCurrent ? '✓ النموذج المعتمد حالياً' : 'اضغط للاعتماد والتطبيق'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Input Field (Textarea) for Default WhatsApp Reminder Template */}
                  <div className="space-y-3 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label htmlFor="default-whatsapp-template-textarea" className="text-xs font-black text-slate-800 block">
                          نص رسالة تذكير الواتس آب الافتراضية:
                        </label>
                        <span className="text-[10px] text-slate-400 font-bold">
                          يمكنك كتابة وتعديل النص بحرية أو النقر على الأزرار أدناه لإدراج المتغيرات تلقائياً في موضع المؤشر.
                        </span>
                      </div>

                      {/* Primary Save Button */}
                      <button
                        type="button"
                        onClick={() => handleSaveWhatsAppTemplate()}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
                      >
                        <Save size={14} />
                        <span>حفظ نص التذكير</span>
                      </button>
                    </div>

                    {/* Dynamic Variables Toolbelt */}
                    <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-700 flex items-center gap-1">
                          <Sparkles size={12} className="text-emerald-600" />
                          <span>المتغيرات المدعومة (انقر للإدراج التلقائي في موضع المؤشر):</span>
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold">
                          يدعم {'{studentName}'} و {'{balance}'} وكافة الصيغ
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { tag: '{studentName}', label: 'اسم الطالب', primary: true },
                          { tag: '{balance}', label: 'رصيد المحفظة ₪', primary: true },
                          { tag: '{debtAmount}', label: 'مبلغ الذمة المستحق' },
                          { tag: '{threshold}', label: 'حد الأمان المالي' },
                          { tag: '{academyName}', label: 'اسم الأكاديمية' },
                          { tag: '{date}', label: 'تاريخ اليوم' },
                          { tag: '{phone}', label: 'رقم هاتف الطالب' }
                        ].map(token => (
                          <button
                            key={token.tag}
                            type="button"
                            onClick={() => handleInsertVariable(token.tag)}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black border transition-all cursor-pointer flex items-center gap-1 ${
                              token.primary
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200 shadow-xs'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                            title={`انقر لإدراج متغير ${token.label} في نص الرسالة`}
                          >
                            <span className="font-mono">{token.tag}</span>
                            <span className="text-[9px] opacity-75 font-normal">({token.label})</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* The Textarea */}
                    <textarea
                      id="default-whatsapp-template-textarea"
                      ref={whatsappTextareaRef}
                      rows={4}
                      value={whatsappTemplateInput}
                      onChange={e => {
                        setWhatsappTemplateInput(e.target.value);
                      }}
                      onBlur={() => {
                        handleSaveWhatsAppTemplate();
                      }}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-xs text-right text-slate-800 leading-relaxed"
                      placeholder="اكتب صيغة رسالة تذكير الواتس آب الافتراضية هنا... مثال: مرحباً {studentName}، نود تذكيركم بأن رصيدكم الحالي هو {balance} ₪..."
                      dir="rtl"
                    />

                    {/* Helper notes & restore default action */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] font-bold text-slate-400 pt-1 border-t border-slate-100">
                      <span className="flex items-center gap-1 text-slate-500">
                        <span>💡</span>
                        <span>
                          سيقوم النظام تلقائياً باستبدال <strong>{'{studentName}'}</strong> باسم الطالب و <strong>{'{balance}'}</strong> برصيده المالي الفعلي عند إرسال أي تذكير.
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setWhatsappTemplateInput(DEFAULT_AUTO_WHATSAPP_TEMPLATE);
                          handleSaveWhatsAppTemplate(DEFAULT_AUTO_WHATSAPP_TEMPLATE);
                        }}
                        className="text-slate-500 hover:text-rose-600 underline cursor-pointer shrink-0 transition-colors"
                      >
                        استعادة القالب الافتراضي
                      </button>
                    </div>
                  </div>

                  {/* Live WhatsApp Simulation Preview Bubble */}
                  <div className="space-y-2 pt-1">
                    <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <MessageCircle size={14} className="text-emerald-600" />
                      <span>معاينة حية لشكل رسالة التذكير على تطبيق WhatsApp (محاكاة واقعية بالمتغيرات):</span>
                    </span>
                    <div className="bg-[#ECE5DD] p-4 sm:p-5 rounded-2xl border border-slate-300 shadow-inner max-w-xl">
                      <div className="bg-white rounded-2xl p-4 shadow-sm text-right space-y-2 relative border border-emerald-100">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-black">
                              💬
                            </div>
                            <span className="text-[11px] font-black text-emerald-850">
                              تذكير WhatsApp: {students[0]?.name || 'محمد أحمد (نموذج تجريبي)'}
                            </span>
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 font-mono">الآن</span>
                        </div>
                        <p className="text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-line">
                          {formatAutoWhatsAppText(
                            students[0] || ({ id: 'sample', name: 'محمد أحمد', lowBalanceThreshold: -100 } as any),
                            whatsappTemplateInput || settings.autoWhatsAppTemplate || DEFAULT_AUTO_WHATSAPP_TEMPLATE,
                            -150
                          )}
                        </p>
                        <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-50">
                          <span className="text-[9px] text-slate-400 font-mono">10:30 AM</span>
                          <span className="text-emerald-500 text-[11px] font-black leading-none">✓✓</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Automated WhatsApp Financial Reminders Toggle & Automated Dispatch Watchlist */}
                <div className="space-y-6 pt-4 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="text-right">
                      <label className="text-sm font-black text-slate-800 flex items-center gap-2 mr-1">
                        <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <Clock size={16} />
                        </span>
                        <span>خاصية التذكير المالي الآلي الدوري عبر WhatsApp للطلاب المنخفضة أرصدتهم 💬⚡</span>
                      </label>
                      <p className="text-[10px] text-slate-400 font-bold mt-1 mr-1">
                        عند تفعيل هذه الخاصية، يتيح النظام إرسال إشعارات وتذكيرات مالية تلقائية ومجدولة للطلاب وأولياء الأمور بمجرد هبوط الرصيد المالي دون العتبة المحددة أعلاه ({settings.lowBalanceThreshold ?? -100} ₪).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { 
                          ...settings, 
                          autoWhatsAppLowBalanceReminderEnabled: !settings.autoWhatsAppLowBalanceReminderEnabled 
                        };
                        saveSettings(updated);
                      }}
                      className={`px-5 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer select-none border shrink-0 ${
                        settings.autoWhatsAppLowBalanceReminderEnabled 
                          ? 'bg-emerald-600 border-emerald-700 text-white shadow-md shadow-emerald-500/10 ring-2 ring-emerald-500/20' 
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${settings.autoWhatsAppLowBalanceReminderEnabled ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                      <span>{settings.autoWhatsAppLowBalanceReminderEnabled ? 'التذكير الآلي عبر واتساب: مفعل 🟢' : 'التذكير الآلي عبر واتساب: معطل ⚪'}</span>
                    </button>
                  </div>

                  {/* Sub-settings if enabled */}
                  {settings.autoWhatsAppLowBalanceReminderEnabled && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-6 bg-gradient-to-br from-emerald-50/70 via-slate-50 to-emerald-50/30 border border-emerald-200/80 rounded-3xl space-y-6 text-right"
                    >
                      {/* Header bar inside box */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-4">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-sm">
                            <Sparkles size={14} />
                          </span>
                          <div>
                            <h4 className="text-xs font-black text-emerald-950">إعدادات الفواصل الزمنية ونطاق الطلاب المستهدفين</h4>
                            <span className="text-[10px] font-bold text-emerald-700/80">تحديد وتيرة الإرسال ونطاق الفحص الدوري</span>
                          </div>
                        </div>

                        {/* Quick Stat of Currently Eligible Students */}
                        {(() => {
                          const lowList = getLowBalanceStudents();
                          return (
                            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-emerald-200 shadow-xs">
                              <span className="text-[10px] font-black text-slate-600">الطلاب تحت العتبة حالياً:</span>
                              <span className={`text-xs font-black px-2 py-0.5 rounded-md ${lowList.length > 0 ? 'bg-rose-100 text-rose-700 font-mono' : 'bg-emerald-100 text-emerald-700 font-mono'}`}>
                                {lowList.length} طالب
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Configuration Row: Cooldown & Scope */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Cooldown Interval */}
                        <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs">
                          <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <Clock size={14} className="text-emerald-600" />
                            <span>الفاصل الزمني للتذكير لنفس الطالب:</span>
                          </label>
                          <p className="text-[10px] text-slate-400 font-bold">لتجنب إزعاج أولياء الأمور، يحدد النظام فترة الانتظار بين كل تذكير وآخر.</p>
                          <div className="grid grid-cols-4 gap-1.5 pt-1">
                            {[
                              { value: 1, label: 'يومياً' },
                              { value: 3, label: 'كل 3 أيام (موصى به)' },
                              { value: 7, label: 'أسبوعياً' },
                              { value: 14, label: 'كل أسبوعين' }
                            ].map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  const updated = { ...settings, autoWhatsAppReminderCooldownDays: opt.value };
                                  saveSettings(updated);
                                }}
                                className={`py-2 px-1 text-[10px] font-black rounded-xl border transition-all cursor-pointer text-center ${
                                  (settings.autoWhatsAppReminderCooldownDays ?? 3) === opt.value
                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Target Audience Scope */}
                        <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-200/70 shadow-xs">
                          <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <Users size={14} className="text-emerald-600" />
                            <span>نطاق فحص الطلاب المشمولين:</span>
                          </label>
                          <p className="text-[10px] text-slate-400 font-bold">تحديد فئات الطلاب المطبق عليهم نظام التذكيرات التلقائية.</p>
                          <div className="grid grid-cols-3 gap-1.5 pt-1">
                            {[
                              { value: 'all', label: 'كافة الطلاب النشطين' },
                              { value: 'individual_only', label: 'الدروس الفردية فقط' },
                              { value: 'open_balance_only', label: 'الرصيد المكشوف والسالب' }
                            ].map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                  const updated = { ...settings, autoWhatsAppTargetAudience: opt.value as any };
                                  saveSettings(updated);
                                }}
                                className={`py-2 px-1 text-[10px] font-black rounded-xl border transition-all cursor-pointer text-center ${
                                  (settings.autoWhatsAppTargetAudience || 'all') === opt.value
                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                    {/* Active Low-Balance Watchlist & Instant Dispatch Action */}
                    {(() => {
                      const lowStudents = getLowBalanceStudents();
                      return (
                        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                                <ShieldAlert size={14} className="text-rose-500" />
                                <span>قائمة الطلاب المستحقين للتذكير حالياً (أرصدتهم دون العتبة المحددة)</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  lowStudents.length > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                                }`}>
                                  {lowStudents.length} طالب
                                </span>
                              </h4>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                                يمكنك فحص الطلاب المستحقين أو تشغيل الإرسال الفوري لجميعهم بضغطة زر.
                              </p>
                            </div>

                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setScheduledModalInitialMode('create');
                                  setIsScheduledWhatsAppModalOpen(true);
                                }}
                                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer border border-slate-700"
                                title="جدولة رسائل WhatsApp التذكيرية في موعد وتاريخ محددين"
                              >
                                <Clock size={13} className="text-emerald-400" />
                                <span>جدولة تذكير آلي ⏰</span>
                                {scheduledRemindersList.filter(r => r.status === 'pending').length > 0 && (
                                  <span className="px-1.5 py-0.2 bg-emerald-500 text-white text-[9px] rounded-full font-black">
                                    {scheduledRemindersList.filter(r => r.status === 'pending').length}
                                  </span>
                                )}
                              </button>

                              {lowStudents.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedWhatsAppStudentIds(lowStudents.map(item => item.student.id));
                                    setIsBatchWhatsAppModalOpen(true);
                                  }}
                                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
                                >
                                  <Send size={13} />
                                  <span>إرسال التذكيرات لكافة المستحقين ({lowStudents.length}) 🚀</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setShowEligibleStudentsAccordion(!showEligibleStudentsAccordion)}
                                className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <span>{showEligibleStudentsAccordion ? 'إخفاء القائمة' : 'عرض وتفقد القائمة'}</span>
                                {showEligibleStudentsAccordion ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            </div>
                          </div>

                          {/* Expandable Low-Balance Student Table */}
                          {showEligibleStudentsAccordion && (
                            <div className="pt-2 border-t border-slate-100">
                              {lowStudents.length === 0 ? (
                                <div className="py-6 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                  🎉 ممتاز! لا يوجد أي طالب يقل رصيده عن العتبة المحددة حالياً. كافة الأرصدة آمنة.
                                </div>
                              ) : (
                                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-slate-50/50">
                                  {lowStudents.map(({ student, balance, threshold, debt }) => {
                                    const messageText = formatAutoWhatsAppText(student, settings.autoWhatsAppTemplate || DEFAULT_AUTO_WHATSAPP_TEMPLATE, balance);
                                    const cleanPhone = (student.phone || student.contact || '').replace(/[\s\-\+]/g, '');
                                    const waUrl = cleanPhone 
                                      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
                                      : '';

                                    return (
                                      <div key={student.id} className="p-3 flex items-center justify-between gap-3 hover:bg-white transition-colors">
                                        <div className="flex items-center gap-3 min-w-0">
                                          <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-black text-xs shrink-0">
                                            !
                                          </div>
                                          <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="text-xs font-black text-slate-900">{student.name}</span>
                                              {(student.grade || student.academicLevel) && (
                                                <span className="text-[9px] px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded border border-indigo-100 font-bold">
                                                  {student.grade || student.academicLevel}
                                                </span>
                                              )}
                                            </div>
                                            <div className="text-[10px] text-slate-500 font-bold flex items-center gap-2 mt-0.5">
                                              <span>الرصيد: <strong className="text-rose-600 font-mono font-black">{balance} ₪</strong></span>
                                              <span>• العتبة: <strong className="font-mono">{threshold} ₪</strong></span>
                                              {student.phone && <span>• 📱 {student.phone}</span>}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                          {cleanPhone ? (
                                            <a
                                              href={waUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={async () => {
                                                await logActivity({
                                                  actionType: 'SEND_WHATSAPP_LOW_BALANCE_REMINDER',
                                                  actionName: 'إرسال تذكير مالي عبر واتساب',
                                                  details: `تم إرسال تذكير مالي آلي عبر واتساب للطالب ${student.name} (الرصيد: ${balance} ₪، العتبة: ${threshold} ₪)`,
                                                  amount: balance
                                                });
                                              }}
                                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                                            >
                                              <MessageSquare size={12} />
                                              <span>إرسال عبر واتساب 💬</span>
                                            </a>
                                          ) : (
                                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                              لا يوجد رقم هاتف
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Scheduled Reminders List & Controls inside Watchlist Card */}
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-black">
                            <Clock size={16} />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                              <span>جدول التذكيرات الآلية المجدولة لـ WhatsApp</span>
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded-full font-black">
                                {scheduledRemindersList.length} جدول
                              </span>
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium">
                              يتم تشغيل التذكير وفتح المحادثات تلقائياً عند حلول التاريخ والوقت المحدد
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setScheduledModalInitialMode('create');
                              setIsScheduledWhatsAppModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Plus size={13} />
                            <span>جدولة موعد جديد</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setScheduledModalInitialMode('list');
                              setIsScheduledWhatsAppModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            إدارة السجلات
                          </button>
                        </div>
                      </div>

                      {scheduledRemindersList.length === 0 ? (
                        <div className="py-5 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <Clock size={24} className="mx-auto text-slate-300 mb-1.5" />
                          <p className="text-xs font-bold text-slate-500">لا توجد رسائل تذكير مجدولة حالياً</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            اضغط على زر "جدولة موعد جديد" لاختيار تاريخ وتوقيت محدد لإرسال تنبيهات الأرصدة المنخفضة
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {scheduledRemindersList.slice(0, 4).map(reminder => {
                            const isPending = reminder.status === 'pending';
                            const dateObj = new Date(reminder.scheduledAt);
                            return (
                              <div
                                key={reminder.id}
                                className={`p-3 rounded-2xl border transition-all ${
                                  isPending
                                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 opacity-80'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <span className="font-black text-xs truncate">{reminder.title}</span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 ${
                                      reminder.status === 'completed'
                                        ? 'bg-blue-100 text-blue-700'
                                        : reminder.status === 'cancelled'
                                        ? 'bg-rose-100 text-rose-700'
                                        : 'bg-emerald-600 text-white'
                                    }`}
                                  >
                                    {reminder.status === 'completed'
                                      ? 'مكتمل ✅'
                                      : reminder.status === 'cancelled'
                                      ? 'ملغي'
                                      : 'مجدول ⏳'}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center justify-between">
                                  <span>
                                    ⏰ {dateObj.toLocaleDateString('ar-EG')} - {dateObj.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  <span className="font-bold">
                                    {reminder.targetStudentIds?.length || 0} طالب
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Academic AI Toggle Section */}
              <div className="space-y-4 pt-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-right">
                    <label className="text-sm font-black text-slate-700 block mr-1">تنشيط محرك وميزات الذكاء الاصطناعي الأكاديمي ⚡</label>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 mr-1">
                      الحالة الافتراضية للميزة: تكون غير مفعلة تلقائياً لجميع الحسابات عند الإطلاق، وتتطلب تفعيلًا خاصًا أو ترقية للخدمة.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...settings, academicAIEnabled: !settings.academicAIEnabled };
                      saveSettings(updated);
                    }}
                    className={`px-5 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer select-none border shrink-0 ${
                      settings.academicAIEnabled 
                        ? 'bg-emerald-600 border-emerald-700 text-white shadow-md shadow-emerald-500/10' 
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${settings.academicAIEnabled ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                    <span>{settings.academicAIEnabled ? 'الذكاء الأكاديمي: نشط وفعال' : 'الذكاء الأكاديمي: معطل (يتطلب تنشيط)'}</span>
                  </button>
                </div>
              </div>

              {/* Smart Interactive Whiteboard Toggle Section */}
              <div className="space-y-4 pt-8 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-right">
                    <label className="text-sm font-black text-slate-700 flex items-center gap-2 mr-1">
                      <Palette size={16} className="text-amber-500" />
                      <span>تفعيل ميزة اللوح الذكي التفاعلي للمعلمين (Smart Interactive Whiteboard) 🎨</span>
                    </label>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 mr-1">
                      عند تفعيل هذا الخيار من قبل مدير المنصة، ستظهر أيقونة اللوح الذكي في لوحة تحكم كافة المعلمين. تدعم الميزة الرسم الحر بالقلم والفأرة واللمس، إدراج ملفات PDF والشروحات وحفظ المشاريع وتصديرها.
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                    <a
                      href={getWhiteboardLink({ teacherId: 'director_admin', teacherName: 'مدير المنصة', theme: settings.whiteboardTheme || 'classic-dark' })}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => {
                        const targetUrl = getWhiteboardLink({ teacherId: 'director_admin', teacherName: 'مدير المنصة', theme: settings.whiteboardTheme || 'classic-dark' });
                        window.open(targetUrl, '_blank', 'noopener,noreferrer');
                        e.preventDefault();
                      }}
                      className="px-4 py-3 rounded-xl font-bold text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300 transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
                      title="فتح صفحة اللوح الذكي التفاعلي المستقلة للشرح والتدريس في تبويب متصفح جديد ↗"
                    >
                      <Sparkles size={14} className="text-amber-600" />
                      <span>فتح اللوح الذكي في صفحة جديدة ↗</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...settings, whiteboardEnabled: !settings.whiteboardEnabled };
                        saveSettings(updated);
                      }}
                      className={`px-5 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer select-none border shrink-0 ${
                        settings.whiteboardEnabled !== false
                          ? 'bg-emerald-600 border-emerald-700 text-white shadow-md shadow-emerald-500/10' 
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                      }`}
                    >
                      <span className={`h-2.5 w-2.5 rounded-full ${settings.whiteboardEnabled !== false ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                      <span>{settings.whiteboardEnabled !== false ? 'اللوح الذكي: مفعل للمعلمين 🟢' : 'اللوح الذكي: معطل ⚪'}</span>
                    </button>
                  </div>
                </div>

                {/* Whiteboard Color Theme Customization */}
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 mt-3 space-y-3 text-right">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <Palette size={14} className="text-indigo-600" />
                        <span>سمة الألوان الافتراضية للوح الذكي (Default Whiteboard Color Theme)</span>
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        اختر السمة الافتراضية لأشرطة الأدوات والقوائم، كما يمكن لكل معلم تغيير سمته المفضلة بشكل مستقل ومباشر من داخل لوح الشرح الخاص به.
                      </p>
                    </div>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                      6 سمات احترافية
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {WHITEBOARD_THEMES_LIST.map((th) => {
                      const isSelected = (settings.whiteboardTheme || 'classic-dark') === th.id;
                      return (
                        <button
                          key={th.id}
                          type="button"
                          onClick={() => {
                            const updated = { ...settings, whiteboardTheme: th.id as WhiteboardTheme };
                            setSettings(updated);
                            saveSettings(updated);
                          }}
                          className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-2.5 relative ${
                            isSelected
                              ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-500/20'
                              : 'bg-white/70 hover:bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{th.icon}</span>
                              <div>
                                <div className="text-xs font-black text-slate-900">{th.arabicName}</div>
                                <div className="text-[9px] text-slate-400 font-medium">{th.name}</div>
                              </div>
                            </div>
                            {isSelected && (
                              <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                <Check size={10} />
                                <span>محدد</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                            <span className="text-[9px] text-slate-500 font-medium line-clamp-1">{th.description}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              {th.previewColors.map((c, i) => (
                                <span
                                  key={i}
                                  className="w-2.5 h-2.5 rounded-full border border-slate-300 shadow-2xs"
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Default Canvas Background Style Selector */}
                <div className="space-y-3 pt-6 border-t border-slate-100">
                  <div className="text-right">
                    <label className="text-sm font-black text-slate-700 block mr-1">نمط خلفية السبورة الافتراضي عند الفتح 🎨</label>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 mr-1">
                      الخلفية الافتراضية للوح الذكي هي أبيض مخطط سطور مثل هيئة الدفتر، مع إمكانية اختيار ورق مربعات أو أبيض بدون تخطيط أو غير ذلك.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {[
                      { id: 'ruled', title: 'أبيض مخطط سطور (دفتر)', desc: 'سطور أفقية مثل الدفتر (الافتراضي)', bg: '#ffffff', text: '#1e293b', border: '#cbd5e1' },
                      { id: 'grid', title: 'ورق مربعات (بياني)', desc: 'شبكة مربعات للحساب والهندسة', bg: '#ffffff', text: '#1e293b', border: '#cbd5e1' },
                      { id: 'blank', title: 'أبيض بدون تخطيط', desc: 'لوح أبيض سادة ناصع', bg: '#ffffff', text: '#0f172a', border: '#e2e8f0' },
                      { id: 'chalkboard', title: 'سبورة خضراء كلاسيكية', desc: 'جو الحصص والطبشور', bg: '#1b4332', text: '#ffffff', border: '#2d6a4f' },
                      { id: 'dark', title: 'سبورة داكنة فحمية', desc: 'مريحة للعين في الضوء الخافت', bg: '#0f172a', text: '#ffffff', border: '#334155' }
                    ].map((bgOption) => {
                      const isSelected = (settings.whiteboardDefaultBackground || 'ruled') === bgOption.id;
                      return (
                        <button
                          key={bgOption.id}
                          type="button"
                          onClick={() => setSettings(prev => ({ ...prev, whiteboardDefaultBackground: bgOption.id as WhiteboardBackgroundType }))}
                          className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between relative overflow-hidden ${
                            isSelected
                              ? 'ring-2 ring-teal-500 border-teal-500 shadow-md bg-teal-50/40'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className="w-5 h-5 rounded-md border shadow-xs flex items-center justify-center shrink-0"
                              style={{ backgroundColor: bgOption.bg, borderColor: bgOption.border }}
                            >
                              {isSelected && <Check className={`w-3 h-3 ${bgOption.id === 'blank' || bgOption.id === 'ruled' ? 'text-slate-900' : 'text-white'}`} />}
                            </span>
                            <span className="text-xs font-bold text-slate-800">{bgOption.title}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-medium leading-relaxed">{bgOption.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Automatic Archiving Toggle Section */}
              <div className="space-y-4 pt-8 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-right">
                    <label className="text-sm font-black text-slate-700 block mr-1">تفعيل الأرشفة التلقائية للحصص القديمة 📁</label>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 mr-1">
                      عند التفعيل، سيقوم النظام تلقائياً بنقل وأرشفة الحصص التعليمية التي مضى عليها أكثر من 3 أشهر لتقليل استهلاك الذاكرة وتخفيف العبء على الواجهات النشطة وسرعة تحميلها.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = { ...settings, autoArchiveOldSessionsEnabled: !settings.autoArchiveOldSessionsEnabled };
                      saveSettings(updated);
                    }}
                    className={`px-5 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer select-none border shrink-0 ${
                      settings.autoArchiveOldSessionsEnabled 
                        ? 'bg-emerald-600 border-emerald-700 text-white shadow-md shadow-emerald-500/10' 
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${settings.autoArchiveOldSessionsEnabled ? 'bg-white animate-pulse' : 'bg-slate-400'}`} />
                    <span>{settings.autoArchiveOldSessionsEnabled ? 'الأرشفة التلقائية: مفعلة' : 'الأرشفة التلقائية: معطلة'}</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-150 mt-4 text-right">
                  <div>
                    <span className="text-xs font-black text-slate-800 block">التشغيل اليدوي المباشر للأرشفة</span>
                    <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                      {settings.lastAutoArchiveDate 
                        ? `آخر تاريخ للأرشفة التلقائية/اليدوية: ${new Date(settings.lastAutoArchiveDate).toLocaleString('ar-EG')}`
                        : 'لم يتم إجراء أرشفة تلقائية/يدوية مؤخراً.'
                      }
                    </span>
                    {archivedCountResult !== null && (
                      <span className="text-[10px] font-black text-emerald-600 mt-1 block">
                        ✓ تم أرشفة {archivedCountResult} حصة بنجاح وتوفير حجم البيانات في الواجهات النشطة!
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={isArchivingInProgress}
                    onClick={handleManualArchiveNow}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-[#D4A33C] hover:text-amber-300 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
                  >
                    <RefreshCw size={12} className={isArchivingInProgress ? "animate-spin" : ""} />
                    <span>{isArchivingInProgress ? 'جاري الأرشفة...' : 'تشغيل الأرشفة الفورية الآن 📁'}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Manager-Teacher Smart Consolidation Panel */}
          <section className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden border border-indigo-950">
            <div className="absolute top-0 right-0 w-full h-1.5 bg-[#D4A33C]" />
            <div className="absolute -left-16 -top-16 w-48 h-48 bg-indigo-505/10 rounded-full blur-3xl" />
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
              <div className="flex items-center gap-4 text-right">
                <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center shadow-lg">
                  <UserCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">إسناد المسؤولية الأكاديمية الشاملة للمعلم زكي أبو علان</h3>
                  <p className="text-[11px] text-indigo-200 font-bold mt-1">
                    أداة الدمج الموحد لنقل كافة الطلاب، المنسبين، والمسجلين ليكون تدريسهم تحت إشراف زكي أبو علان
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConsolidateToZaki}
                disabled={transferring}
                className="px-6 py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-40 select-none shrink-0"
              >
                {transferring ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>جاري نقل وتحديث البيانات...</span>
                  </>
                ) : (
                  <>
                    <UserCheck size={14} />
                    <span>نقل وتنسيب الكادر الطلابي فوراً</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-900/60 rounded-[2rem] border border-slate-800 p-6 space-y-4 relative z-10">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-300 leading-relaxed font-bold">
                  تنبيه عملياتي: هذا الإجراء يقوم بنقل كافة التنسيبات الذكية الجارية والصفوف والمواد والدروس الفردية ومحفظات الطلاب المسجلة في سحابة الخوادم لتصبح باسم ومسؤولية المعلم <strong className="text-amber-400">زكي أبو علان</strong> فورا، لتسهيل إدارة محفظته كمدير ومعلم بنفس الوقت.
                </p>
              </div>

              {transferResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-950/40 border border-emerald-800/60 rounded-2xl p-5 space-y-3"
                >
                  <h4 className="text-[#34D399] font-black text-xs flex items-center gap-1.5 leading-none">
                    <CheckCircle2 size={14} />
                    تمت عملية الدمج والنقل الموحد بنجاح تام! 🎉
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1 text-center">
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-black block">الطلاب المسجلين</span>
                      <strong className="text-2xl font-black text-emerald-400 mt-1 block">{transferResult.studentsCount}</strong>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-black block">الدورات التأسيسية</span>
                      <strong className="text-2xl font-black text-emerald-400 mt-1 block">{transferResult.coursesCount}</strong>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-black block">التنسيبات الذكية</span>
                      <strong className="text-2xl font-black text-emerald-400 mt-1 block">{transferResult.assignmentsCount}</strong>
                    </div>
                    <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-black block">الحصص المسجلة</span>
                      <strong className="text-2xl font-black text-emerald-400 mt-1 block">{transferResult.sessionsCount}</strong>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </section>

          {/* Subjects Register Panel */}
          <section className="bg-white rounded-[2.5rem] p-10 border border-slate-200/60 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 w-full h-1.5 bg-slate-900" />
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-900 flex items-center justify-center shadow-lg">
                <BookMinus size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight font-sans">إدارة المواد الدراسية</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">تحديد وتسجيل التخصصات والمناهج المدعومة بالأكاديمية</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <input 
                  placeholder="اسم المادة الدراسية (مثل: رياضيات متقدمة، بجروت فيزياء)..." 
                  value={newSubject} 
                  onChange={e => setNewSubject(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && addSubject()}
                  className="flex-1 px-6 py-4 bg-slate-50 border border-[#CBD5E1] rounded-2xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all font-semibold text-slate-800 placeholder:text-slate-350 text-right text-xs"
                />
                <button 
                  onClick={addSubject}
                  disabled={!newSubject}
                  className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-[#D4A33C] hover:text-slate-950 transition-all active:scale-90 shadow-xl shadow-slate-900/10 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Plus size={24} />
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                {(settings.subjects || []).map(subject => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={subject} 
                    className="inline-flex items-center gap-3 px-5 py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm group hover:border-[#D4A33C] transition-all cursor-default"
                  >
                    <span className="text-xs font-black text-slate-800">{subject}</span>
                    <button 
                      onClick={() => removeSubject(subject)}
                      className="text-slate-300 hover:text-rose-500 transition-colors bg-slate-50 p-1.5 rounded-lg group-hover:bg-rose-50"
                    >
                      <Trash2 size={12} />
                    </button>
                  </motion.div>
                ))}
                {(settings.subjects || []).length === 0 && (
                  <div className="w-full py-16 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-loose">لم تقم بإضافة أي مواد دراسية بعد.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Custom Balance Threshold overrides for Students */}
          <section className="bg-white rounded-[2.5rem] p-10 border border-slate-200/60 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-1.5 bg-amber-500" />
            <div className="flex items-center gap-4 mb-8 text-right">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#D4A33C] flex items-center justify-center shadow-lg shrink-0">
                <Users size={24} />
              </div>
              <div className="text-right">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight font-sans">تخصيص حد الرصيد المنخفض للطلاب</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">تجاوز الحد الافتراضي العام وتعيين حدود رصيد مخصصة لطلاب محددين حسب رغبتهم</p>
              </div>
            </div>

            <div className="space-y-8 text-right">
              {/* Form to configure */}
              <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-200/60 space-y-5">
                <h4 className="text-xs font-black text-slate-900 leading-none mr-1">إضافة أو تعديل حد رصيد مخصص لطالب</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Student Select Dropdown */}
                  <div className="space-y-2 relative text-right">
                    <label className="text-[10px] font-black text-slate-500 mr-1">اختر الطالب من الأكاديمية</label>
                    <div className="relative">
                      <select
                        value={selectedStudentId}
                        onChange={e => {
                          setSelectedStudentId(e.target.value);
                          const match = students.find(s => s.id === e.target.value);
                          if (match && typeof match.lowBalanceThreshold === 'number') {
                            setCustomThreshold(match.lowBalanceThreshold.toString());
                          } else {
                            setCustomThreshold('');
                          }
                        }}
                        className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all font-bold text-xs appearance-none cursor-pointer pr-4 pl-10"
                      >
                        <option value="">-- اختر طالب من القائمة --</option>
                        {students.map(s => {
                          const hasOverride = typeof s.lowBalanceThreshold === 'number';
                          return (
                            <option key={s.id} value={s.id}>
                              {s.name} {hasOverride ? `(حالي: ₪${s.lowBalanceThreshold})` : '(يستخدم العام)'}
                            </option>
                          );
                        })}
                      </select>
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                    </div>
                  </div>

                  {/* Threshold Input Field */}
                  <div className="space-y-2 text-right">
                    <label className="text-[10px] font-black text-slate-500 mr-1">(₪) حد الرصيد المنخفض المخصص</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">₪</span>
                      <input
                        type="text"
                        placeholder="-200"
                        value={customThreshold}
                        onChange={e => setCustomThreshold(e.target.value)}
                        className="w-full pl-10 pr-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C]/10 outline-none transition-all font-black text-sm text-right text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        if (selectedStudentId && customThreshold !== '') {
                          updateStudentThreshold(selectedStudentId, Number(customThreshold));
                        }
                      }}
                      disabled={!selectedStudentId || customThreshold === ''}
                      className="w-full h-[52px] rounded-2xl bg-slate-900 text-white hover:bg-[#D4A33C] hover:text-slate-950 transition-all font-black text-xs active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-slate-950/10"
                    >
                      <Save size={14} />
                      <span>حفظ حد الرصيد للطالب</span>
                    </button>
                  </div>

                </div>
              </div>

              {/* Active overrides registry list */}
              <div className="space-y-4 text-right">
                <h4 className="text-xs font-black text-slate-900 leading-none mr-1">قائمة التعديلات النشطة الحالية</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {students.filter(s => typeof s.lowBalanceThreshold === 'number').map(student => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={student.id}
                      className="bg-white border border-slate-205 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:border-amber-400 transition-all"
                    >
                      <div className="space-y-1 text-right">
                        <span className="text-xs font-black text-slate-900 block">{student.name}</span>
                        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400">
                          <span>حد رصيد مخصص:</span>
                          <span className="text-rose-600 font-black font-mono" dir="ltr">{student.lowBalanceThreshold} ₪</span>
                        </div>
                      </div>

                      <button
                        onClick={() => updateStudentThreshold(student.id, null)}
                        className="p-2 text-slate-350 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="إلغاء التخصيص والعودة للحد العام"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))}

                  {students.filter(s => typeof s.lowBalanceThreshold === 'number').length === 0 && (
                    <div className="col-span-1 sm:col-span-2 py-10 text-center border-2 border-dashed border-slate-100 rounded-[2rem]">
                      <AlertTriangle size={24} className="text-slate-200 mx-auto mb-2 animate-pulse" />
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-loose">
                        لا يوجد أي حدود رصيد مخصصة للطلاب حالياً. كافة الطلاب يتبعون الحد العام ({settings.lowBalanceThreshold ?? -100} ₪).
                      </p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </section>

          {/* ===================== CUSTOM FINANCIAL CATEGORIES HIGHLIGHT SECTION ===================== */}
          <section className="bg-white rounded-[2.5rem] p-10 border border-slate-200/60 shadow-sm relative overflow-hidden" id="financial-categories-section">
            <div className="absolute top-0 right-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-[#D4A33C] to-indigo-600" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 text-right">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shadow-lg shrink-0 border border-amber-200">
                  <Tags size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight font-sans">التصنيفات والبنود المالية المخصصة</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                      جديد 🏷️
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    تعريف وتخصيص بنود الرسوم (رسوم كتب، اشتراكات، خدمات إضافية...) لاستخدامها عند تسجيل الحصص وإيداع الأرصدة
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('financial-categories')}
                className="px-5 py-3 bg-gradient-to-r from-[#0D365A] to-[#1a4a75] hover:from-[#11426e] hover:to-[#23588a] text-white rounded-2xl font-black text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer shrink-0 self-start md:self-auto"
              >
                <Sliders size={16} />
                <span>إدارة وتعديل التصنيفات المالية كاملة</span>
              </button>
            </div>

            {/* Quick summary cards of current categories */}
            <div className="space-y-6 text-right" dir="rtl">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                  <span className="text-[10px] font-black text-slate-400 block mb-1">إجمالي البنود المعرفة</span>
                  <span className="text-xl font-black text-slate-900 font-mono">{financialCategories.length}</span>
                </div>
                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                  <span className="text-[10px] font-black text-emerald-600 block mb-1">بنود نشطة ومتاحة</span>
                  <span className="text-xl font-black text-emerald-700 font-mono">
                    {financialCategories.filter(c => c.isActive).length}
                  </span>
                </div>
                <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                  <span className="text-[10px] font-black text-amber-700 block mb-1">متاحة لشحن الأرصدة</span>
                  <span className="text-xl font-black text-amber-800 font-mono">
                    {financialCategories.filter(c => c.isActive && (c.type === 'deposit' || c.type === 'both')).length}
                  </span>
                </div>
                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <span className="text-[10px] font-black text-blue-600 block mb-1">متاحة لتسجيل الحصص</span>
                  <span className="text-xl font-black text-blue-700 font-mono">
                    {financialCategories.filter(c => c.isActive && (c.type === 'session' || c.type === 'both')).length}
                  </span>
                </div>
              </div>

              {/* Active categories tags */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-slate-200/60">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-black text-slate-700 flex items-center gap-2">
                    <span>قائمة البنود والتصنيفات النشطة حالياً:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('financial-categories')}
                    className="text-[11px] font-bold text-[#0D365A] hover:underline"
                  >
                    تعديل أو إضافة بنود أخرى ←
                  </button>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {financialCategories.filter(c => c.isActive).map(cat => (
                    <div 
                      key={cat.id}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-white rounded-xl border border-slate-200 shadow-xs"
                    >
                      <span className="text-sm">{cat.icon || '🏷️'}</span>
                      <span className="text-xs font-black text-slate-800">{cat.name}</span>
                      {cat.defaultAmount !== undefined && cat.defaultAmount > 0 && (
                        <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-black font-mono">
                          ₪{cat.defaultAmount}
                        </span>
                      )}
                      <span className="text-[9px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 font-bold">
                        {cat.type === 'both' ? 'شحن وحصص' : cat.type === 'deposit' ? 'شحن فقط' : 'حصص فقط'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ===================== CUSTOM FINANCIAL RULES SECTION ===================== */}
          <section className="bg-white rounded-[2.5rem] p-10 border border-slate-200/60 shadow-sm relative overflow-hidden" id="financial-rules-section">
            <div className="absolute top-0 right-0 w-full h-1.5 bg-indigo-600" />
            
            <div className="flex items-center gap-4 mb-8 text-right">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-lg shrink-0">
                <Users size={24} />
              </div>
              <div className="text-right">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight font-sans">القواعد المالية والخصومات والمكافآت التلقائية</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">تحديد القواعد الذكية لاحتساب مكافآت الأساتذة وخصومات الالتزام الطويل للطلاب تلقائياً</p>
              </div>
            </div>

            <div className="space-y-8 text-right" dir="rtl">
              {/* Form to create a new rule */}
              <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-200/60 space-y-5">
                <h4 className="text-xs font-black text-slate-900 leading-none mr-1 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse inline-block" />
                  إنشاء قاعدة مالية ذكية جديدة
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Rule Name */}
                  <div className="space-y-2 text-right">
                    <label className="text-[10px] font-black text-slate-500 mr-1">اسم القاعدة المالية</label>
                    <input
                      type="text"
                      placeholder="مثال: خصم الالتزام البرونزي، بونص الساعات..."
                      value={ruleName}
                      onChange={e => setRuleName(e.target.value)}
                      className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all font-bold text-xs"
                    />
                  </div>

                  {/* Rule Type */}
                  <div className="space-y-2 text-right">
                    <label className="text-[10px] font-black text-slate-500 mr-1">نوع القاعدة وحالة التفعيل</label>
                    <div className="relative">
                      <select
                        value={ruleType}
                        onChange={e => {
                          setRuleType(e.target.value as any);
                          if (e.target.value === 'teacher_bonus_hours') {
                            setRuleDescription('مكافأة مالية للأساتذة عند تخطي حاجز ساعات معينة من التدريس شهرياً');
                          } else if (e.target.value === 'teacher_bonus_students') {
                            setRuleDescription('مكافأة إضافية للأستاذ الذي يشرف على عدد طلاب متميز من الأكاديمية');
                          } else if (e.target.value === 'student_discount_enrollment') {
                            setRuleDescription('خصم تلقائي لسعر الساعة للطلاب بناءً على مدة انتسابهم بالأيام للأكاديمية');
                          } else if (e.target.value === 'student_discount_lessons') {
                            setRuleDescription('خصم تشجيعي للطلاب بناءً على عدد الحصص واللقاءات التي أتموها بنجاح');
                          }
                        }}
                        className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all font-bold text-xs appearance-none cursor-pointer pr-4 pl-10"
                      >
                        <option value="teacher_bonus_hours">🏅 مكافأة الأستاذ: عدد ساعات شهرياً</option>
                        <option value="teacher_bonus_students">👥 مكافأة الأستاذ: عدد الطلاب النشطين</option>
                        <option value="student_discount_enrollment">⏳ خصم الطالب: طول مدة التسجيل (أيام)</option>
                        <option value="student_discount_lessons">📚 خصم الطالب: عدد الحصص المنجزة</option>
                      </select>
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                    </div>
                  </div>

                  {/* Rule Target Value */}
                  <div className="space-y-2 text-right">
                    <label className="text-[10px] font-black text-slate-500 mr-1">
                      {ruleType === 'teacher_bonus_hours' && 'الحد الأدنى للساعات المستهدفة'}
                      {ruleType === 'teacher_bonus_students' && 'الحد الأدنى للطلاب النشطين'}
                      {ruleType === 'student_discount_enrollment' && 'الحد الأدنى لأيام التسجيل (يوم)'}
                      {ruleType === 'student_discount_lessons' && 'الحد الأدنى للحصص المنجزة'}
                    </label>
                    <input
                      type="number"
                      placeholder="مثال: 30، 5، 90..."
                      value={ruleTargetValue}
                      onChange={e => setRuleTargetValue(e.target.value)}
                      className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all font-bold text-xs"
                    />
                  </div>

                  {/* Reward Value */}
                  <div className="space-y-2 text-right">
                    <label className="text-[10px] font-black text-slate-500 mr-1">قيمة المكافأة / الخصم المالي</label>
                    <input
                      type="number"
                      placeholder="مثال: 150، 10، 5..."
                      value={ruleRewardValue}
                      onChange={e => setRuleRewardValue(e.target.value)}
                      className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all font-bold text-xs text-right"
                    />
                  </div>

                  {/* Reward Type (fixed / percentage) */}
                  <div className="space-y-2 text-right">
                    <label className="text-[10px] font-black text-slate-500 mr-1">طريقة الحساب والأثر</label>
                    <div className="relative">
                      <select
                        value={ruleRewardType}
                        onChange={e => setRuleRewardType(e.target.value as any)}
                        className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all font-bold text-xs appearance-none cursor-pointer pr-4 pl-10"
                      >
                        <option value="fixed">₪ شيكل كقيمة مالية ثابتة</option>
                        <option value="percentage">% نسبة مئوية مخصومة/مضافة</option>
                      </select>
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                    </div>
                  </div>

                  {/* Save Rule Action Button */}
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        if (ruleName && ruleTargetValue && ruleRewardValue) {
                          const newRule = {
                            id: 'rule_' + Date.now(),
                            name: ruleName,
                            type: ruleType,
                            targetValue: Number(ruleTargetValue),
                            rewardValue: Number(ruleRewardValue),
                            rewardType: ruleRewardType,
                            isActive: true,
                            description: ruleDescription || 'قاعدة مالية مخصصة للأكاديمية'
                          };
                          const updatedRules = [...(settings.financialRules || []), newRule];
                          const updatedSettings = { ...settings, financialRules: updatedRules };
                          saveSettings(updatedSettings);
                          
                          setRuleName('');
                          setRuleTargetValue('');
                          setRuleRewardValue('');
                          setRuleDescription('');
                        }
                      }}
                      disabled={!ruleName || !ruleTargetValue || !ruleRewardValue}
                      className="w-full h-[52px] rounded-2xl bg-[#0D365A] text-white hover:bg-[#D4A33C] hover:text-slate-950 transition-all font-black text-xs active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>إضافة وتفعيل القاعدة الذكية 🚀</span>
                    </button>
                  </div>
                </div>

                {/* Rule Description input */}
                <div className="space-y-2 text-right">
                  <label className="text-[10px] font-black text-slate-500 mr-1">شرح موجز أو ملاحظة توضيحية للقاعدة</label>
                  <input
                    type="text"
                    placeholder="سيظهر هذا الوصف لمشرف النظام عند تطبيق وتأثير هذه القاعدة محاسبياً..."
                    value={ruleDescription}
                    onChange={e => setRuleDescription(e.target.value)}
                    className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all font-bold text-xs"
                  />
                </div>
              </div>

              {/* Recommended Preset Rules button list for fast setup */}
              <div className="space-y-3">
                <span className="text-[10px] font-black text-slate-400 block">اختصارات توليد القواعد الشائعة والموصى بها:</span>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={() => {
                      setRuleName('خصم الولاء والالتزام الطويل');
                      setRuleType('student_discount_enrollment');
                      setRuleTargetValue('90');
                      setRuleRewardValue('10');
                      setRuleRewardType('percentage');
                      setRuleDescription('خصم 10% تلقائياً لسعر ساعة الطالب في حال استمراره لأكثر من 30 يوماً / 3 أشهر من تاريخ تسجيله');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-205 text-slate-700 font-bold text-[10px] rounded-xl transition-all border border-slate-200 cursor-pointer"
                  >
                    💡 خصم الولاء للطلاب (90 يوماً)
                  </button>
                  <button
                    onClick={() => {
                      setRuleName('مكافأة الأداء المتميز للتدريس');
                      setRuleType('teacher_bonus_hours');
                      setRuleTargetValue('30');
                      setRuleRewardValue('200');
                      setRuleRewardType('fixed');
                      setRuleDescription('مكافأة 200 شيكل ثابتة تضاف لأجر الأستاذ الشهري في حال أتم أكثر من 30 ساعة تدريسية ملقاة');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-205 text-slate-700 font-bold text-[10px] rounded-xl transition-all border border-slate-200 cursor-pointer"
                  >
                    💡 بونص تميز الأساتذة (30 ساعة)
                  </button>
                  <button
                    onClick={() => {
                      setRuleName('خصم تكثيف الحصص الأكاديمية');
                      setRuleType('student_discount_lessons');
                      setRuleTargetValue('25');
                      setRuleRewardValue('15');
                      setRuleRewardType('fixed');
                      setRuleDescription('تخفيض 15 شيكل ثابتة من سعر اللقاء للطالب بعد إنجازه أكثر من 25 لقاءً تعليمياً');
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-205 text-slate-700 font-bold text-[10px] rounded-xl transition-all border border-slate-200 cursor-pointer"
                  >
                    💡 خصم كثافة الحصص (25 لقاءً)
                  </button>
                </div>
              </div>

              {/* Active rules list */}
              <div className="space-y-4 text-right">
                <h4 className="text-xs font-black text-slate-900 leading-none mr-1">قواعد الاحتساب المالي المفعلة والمدرجة حالياً ({ (settings.financialRules || []).length })</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(settings.financialRules || []).map((rule: any) => (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={rule.id}
                      className={`bg-white border rounded-[1.5rem] p-5 flex flex-col justify-between shadow-sm transition-all hover:shadow-md ${
                        rule.isActive ? 'border-indigo-200' : 'border-slate-200 opacity-60'
                      }`}
                    >
                      <div className="space-y-3 text-right">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            rule.isActive ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-150 text-slate-400'
                          }`}>
                            {rule.type === 'teacher_bonus_hours' && 'بونص ساعات معلم'}
                            {rule.type === 'teacher_bonus_students' && 'بونص طلاب معلم'}
                            {rule.type === 'student_discount_enrollment' && 'خصم تسجيل طالب'}
                            {rule.type === 'student_discount_lessons' && 'خصم حصص طالب'}
                          </span>
                          
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={async () => {
                                const updatedRules = (settings.financialRules || []).map((r: any) => {
                                  if (r.id === rule.id) {
                                    return { ...r, isActive: !r.isActive };
                                  }
                                  return r;
                                });
                                const updatedSettings = { ...settings, financialRules: updatedRules };
                                saveSettings(updatedSettings);
                              }}
                              className={`px-2 py-1 rounded text-[10px] font-bold border cursor-pointer transition-all ${
                                rule.isActive 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' 
                                  : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              {rule.isActive ? '🟢 نشطة' : '🔴 معطلة'}
                            </button>
                            
                            <button
                              onClick={async () => {
                                const updatedRules = (settings.financialRules || []).filter((r: any) => r.id !== rule.id);
                                const updatedSettings = { ...settings, financialRules: updatedRules };
                                saveSettings(updatedSettings);
                              }}
                              className="p-1 text-slate-350 hover:text-rose-500 transition-colors cursor-pointer"
                              title="حذف القاعدة المالية"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        <h5 className="text-sm font-black text-slate-900 leading-tight">{rule.name}</h5>
                        
                        <p className="text-[11px] text-slate-400 font-bold leading-relaxed">{rule.description}</p>
                        
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs font-black">
                          <span className="text-slate-450">معيار التنشيط:</span>
                          <span className="text-slate-800 font-bold">
                            {rule.type === 'teacher_bonus_hours' && `أكثر من ${rule.targetValue} ساعة تدريس شهرياً`}
                            {rule.type === 'teacher_bonus_students' && `أكثر من ${rule.targetValue} طلاب نشطين`}
                            {rule.type === 'student_discount_enrollment' && `أكثر من ${rule.targetValue} يوماً منذ الانتساب`}
                            {rule.type === 'student_discount_lessons' && `أكثر من ${rule.targetValue} لقاء منجز بالكامل`}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-black pt-1">
                          <span className="text-slate-450">الأثر المالي المترتب:</span>
                          <span className="text-indigo-600 font-extrabold bg-indigo-50/50 px-2.5 py-1 rounded-lg border border-indigo-100/50">
                            {rule.rewardType === 'fixed' ? `₪ ${rule.rewardValue} شيكل (مبلغ ثابت)` : `% ${rule.rewardValue} نسبة مئوية`}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {(settings.financialRules || []).length === 0 && (
                    <div className="col-span-1 md:col-span-2 py-12 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                      <AlertTriangle size={24} className="text-slate-200 mx-auto mb-2 animate-pulse" />
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-loose">
                        لا توجد أي قواعد مالية مخصصة أو خصومات مدرجة بعد. يمكنك استخدام الاختصارات السريعة أعلاه للبدء فوراً!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Custom Reporting Periods Section */}
          <section className="bg-white rounded-[2.5rem] p-10 border border-slate-200/60 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-1.5 bg-indigo-600" />
            
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shadow-lg">
                <Calendar size={24} />
              </div>
              <div className="text-right">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight font-sans">فترات التقارير المالية المخصصة</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">تعريف فترات زمنية محددة مسبقاً (شهرية، ربع سنوية، سنوية) لتسهيل فلترة التقارير المالية والإحصائيات بضغطة زر</p>
              </div>
            </div>

            <div className="space-y-8 text-right" dir="rtl">
              {/* Form to create a new period */}
              <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-200/60 space-y-5">
                <h4 className="text-xs font-black text-slate-900 leading-none mr-1 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse inline-block" />
                  إضافة فترة زمنية مخصصة جديدة
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Period Name */}
                  <div className="space-y-2 text-right">
                    <label className="text-[10px] font-black text-slate-500 mr-1">اسم الفترة الزمنية</label>
                    <input
                      type="text"
                      placeholder="مثال: يناير 2026، الربع الأول..."
                      value={periodName}
                      onChange={e => setPeriodName(e.target.value)}
                      className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 outline-none transition-all font-bold text-xs"
                    />
                  </div>

                  {/* Start Date */}
                  <div className="space-y-2 text-right">
                    <label className="text-[10px] font-black text-slate-500 mr-1">تاريخ البدء</label>
                    <input
                      type="date"
                      value={periodStart}
                      onChange={e => setPeriodStart(e.target.value)}
                      className="w-full px-5 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 outline-none transition-all font-bold text-xs cursor-pointer"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-2 text-right">
                    <label className="text-[10px] font-black text-slate-500 mr-1">تاريخ الانتهاء</label>
                    <input
                      type="date"
                      value={periodEnd}
                      onChange={e => setPeriodEnd(e.target.value)}
                      className="w-full px-5 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-600 outline-none transition-all font-bold text-xs cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleAddPeriod}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all active:scale-[0.98] shadow-sm cursor-pointer border-0"
                  >
                    <Plus size={14} />
                    <span>إضافة الفترة الزمنية وحفظها</span>
                  </button>
                </div>
              </div>

              {/* List of Defined Periods */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-800 mr-1 flex items-center gap-1.5">
                  <span>الفترات الزمنية المعتمدة حالياً في النظام</span>
                  <span className="bg-indigo-500/10 text-indigo-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {(settings.customReportPeriods || []).length} فترات
                  </span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(settings.customReportPeriods || []).map((period: any, index: number) => (
                    <motion.div
                      key={period.id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 bg-white border border-slate-200/60 rounded-[2rem] flex items-center justify-between shadow-sm hover:border-indigo-100 transition-all group"
                    >
                      <div className="space-y-2 text-right">
                        <div className="font-black text-slate-800 text-sm leading-tight flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                          {period.name}
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-450 mt-1">
                          <div>من: <span className="text-slate-700 font-mono font-black">{period.startDate}</span></div>
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                          <div>إلى: <span className="text-slate-700 font-mono font-black">{period.endDate}</span></div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeletePeriod(period.id)}
                        className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-all cursor-pointer border border-rose-100/50 hover:scale-105 active:scale-95"
                        title="حذف هذه الفترة الزمنية"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))}

                  {(settings.customReportPeriods || []).length === 0 && (
                    <div className="col-span-1 md:col-span-2 py-12 text-center border-2 border-dashed border-slate-100 rounded-[2.5rem]">
                      <Calendar size={24} className="text-slate-200 mx-auto mb-2 animate-pulse" />
                      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-loose">
                        لا توجد فترات زمنية مخصصة معرفة حالياً. يمكنك استخدام النموذج أعلاه لإضافة فترات مخصصة تظهر في لوحة التقارير.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

        </div>
      ) : activeTab === 'branding' ? (
        <div className="space-y-10 animate-in fade-in duration-300" dir="rtl">
          
          {/* Header & Quick Action Bar */}
          <section className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-200/60 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-1.5 bg-indigo-600" />
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shadow-lg shrink-0">
                  <Palette size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">هوية وتصميم استمارة التسجيل الإلكتروني</h3>
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-indigo-100/80">تخصيص كامل 🎨</span>
                  </div>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    تحكم في شعار الأكاديمية، ولون الزر الرئيسي، وعناوين الترحيب لاستمارة تسجيل الطلاب الجدد لتطابق علامتك التجارية
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => {
                    const url = getRegistrationLink();
                    navigator.clipboard.writeText(url);
                    setCopiedRegistrationLink(true);
                    setTimeout(() => setCopiedRegistrationLink(false), 3000);
                  }}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer"
                  title="نسخ رابط استمارة التسجيل للمشاركة"
                >
                  {copiedRegistrationLink ? <Check size={14} className="text-emerald-600 font-bold" /> : <Copy size={14} />}
                  <span>{copiedRegistrationLink ? 'تم نسخ الرابط! ✅' : 'نسخ رابط الاستمارة'}</span>
                </button>

                <a
                  href={getRegistrationLink()}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer"
                  title="فتح استمارة التسجيل في نافذة مستقلة"
                >
                  <ExternalLink size={14} />
                  <span>معاينة الرابط المباشر</span>
                </a>

                <button
                  onClick={handleResetBrandingDefaults}
                  disabled={isSaving}
                  className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
                  title="استعادة القيم والألوان الافتراضية"
                >
                  <RotateCcw size={14} />
                  <span>افتراضي</span>
                </button>

                <button
                  onClick={handleSaveBranding}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  id="save-branding-button"
                >
                  {isSaving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Save size={14} />
                  )}
                  <span>حفظ وتطبيق الهوية 💾</span>
                </button>
              </div>
            </div>

            {/* Notification alert on save */}
            <AnimatePresence>
              {brandingSavedNotice && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs font-black"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>تم حفظ هوية الأكاديمية وتصميم استمارة التسجيل بنجاح في قاعدة البيانات! ستظهر التعديلات فوراً للطلاب الجدد.</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Public Academy Mobile Access & Cloud Run Resilience Card */}
            <div className="mt-8 pt-6 border-t border-slate-100 bg-slate-50/80 p-6 rounded-2xl border border-slate-200/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-bold text-lg shrink-0">
                    🌐
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <span>رابط الوصول العام للمنصة ومشاركة الهواتف الذكية</span>
                      <span className="text-[10px] font-black px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">معتمد للهواتف والواتساب 📱</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      يضمن هذا الرابط عمل روابط التسجيل وبوابة الطلاب والاختبارات على هواتف أولياء الأمور دون أخطاء (404 Page Not Found).
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(getPublicShareableBaseUrl());
                      setCopiedPublicUrl(true);
                      setTimeout(() => setCopiedPublicUrl(false), 2500);
                    }}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    {copiedPublicUrl ? <Check size={14} className="text-emerald-600 font-bold" /> : <Copy size={14} />}
                    <span>{copiedPublicUrl ? 'تم نسخ الرابط! ✓' : 'نسخ رابط المنصة العام'}</span>
                  </button>
                  <a
                    href={getPublicShareableBaseUrl()}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-600/20"
                  >
                    <ExternalLink size={13} />
                    <span>فتح ↗</span>
                  </a>
                </div>
              </div>

              {isDevEnvironment() && (
                <div className="p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 leading-relaxed">
                  <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-black block">إشعار للمشرف - التوافق مع الهواتف الذكية وواتساب:</span>
                    <span className="font-normal text-amber-800 text-[11px] block">
                      رابط بيئة التطوير الخاصة بالبرمجة (<code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded text-[10px]" dir="ltr">ais-dev-...</code>) يتطلب جلسة عمل المطور المعتمدة، وعند فتحه على الهاتف الخارجي يُظهر خطأ <span className="font-bold">"404 Page not found"</span>. تم برمجياً تحويل كافة روابط الاستمارات والاختبارات تلقائياً إلى رابط المعاينة المستقر العام (<code className="font-mono bg-emerald-100 text-emerald-900 px-1 py-0.5 rounded text-[10px]" dir="ltr">{getPublicShareableBaseUrl()}</code>) ليعمل مع كافة الطلاب وأولياء الأمور بنقرة واحدة.
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-stretch gap-2 pt-1">
                <div className="flex-1 relative">
                  <input
                    type="url"
                    value={customPublicUrlInput}
                    onChange={(e) => setCustomPublicUrlInput(e.target.value)}
                    placeholder="رابط المنصة العام (مثال: https://my-academy.com أو اتركه فارغاً للافتراضي)"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 text-left outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    dir="ltr"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSaveCustomPublicUrl}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shrink-0"
                >
                  {savedPublicUrlNotice ? 'تم الحفظ بنجاح! ✓' : 'حفظ النطاق المخصص 💾'}
                </button>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left/Main Configuration Column (7 Cols) */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Section 1: Logo & Brand Identity */}
              <section className="bg-white rounded-[2.5rem] p-8 border border-slate-200/60 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <ImageIcon size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900">شعار الأكاديمية والاسم التجاري</h4>
                    <p className="text-[11px] text-slate-400 font-bold">يظهر الشعار في أعلى استمارة التسجيل وفي كافة ترويسات النظام</p>
                  </div>
                </div>

                {/* Academy Name & Slogan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-600 mr-1">اسم الأكاديمية الرئيسي</label>
                    <input
                      type="text"
                      value={brandingAcademyName}
                      onChange={e => setBrandingAcademyName(e.target.value)}
                      placeholder="مثال: أكاديمية التفوق"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-600 mr-1">الشعار النصي / الوصف الصغير</label>
                    <input
                      type="text"
                      value={brandingSlogan}
                      onChange={e => setBrandingSlogan(e.target.value)}
                      placeholder="مثال: أون لاين"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* Custom Logo Upload & URL Box */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <label className="text-[11px] font-black text-slate-700 flex items-center justify-between">
                    <span>تحميل شعار مخصص (Custom Logo)</span>
                    {brandingLogo && (
                      <button
                        type="button"
                        onClick={() => {
                          setBrandingLogo('');
                          setBrandingLogoUrlInput('');
                        }}
                        className="text-[10px] text-rose-500 hover:text-rose-700 font-black cursor-pointer"
                      >
                        إزالة الشعار والعودة للافتراضي ✕
                      </button>
                    )}
                  </label>

                  {/* File Upload Box */}
                  <label className="relative border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/30 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group text-center">
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/svg+xml"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                    />
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                      <Upload size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-700 group-hover:text-indigo-600 transition-colors">
                        انقر لاختيار ملف صورة الشعار أو اسحبه هنا
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                        يدعم PNG, JPG, SVG, WebP (الحجم الموصى به أقل من 2MB)
                      </p>
                    </div>
                  </label>

                  {logoUploadError && (
                    <p className="text-[10px] font-black text-rose-500 bg-rose-50 p-2 rounded-xl border border-rose-100">
                      ⚠️ {logoUploadError}
                    </p>
                  )}

                  {/* Or URL Input */}
                  <div className="flex items-center gap-2 pt-1">
                    <div className="relative flex-1">
                      <LinkIcon size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="url"
                        placeholder="أو الصق رابط صورة الشعار مباشرة (URL)..."
                        value={brandingLogoUrlInput}
                        onChange={e => {
                          setBrandingLogoUrlInput(e.target.value);
                          setBrandingLogo(e.target.value);
                        }}
                        className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-800 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Section 2: Primary Button Color & Style */}
              <section className="bg-white rounded-[2.5rem] p-8 border border-slate-200/60 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900">تخصيص لون ونمط الزر الرئيسي</h4>
                    <p className="text-[11px] text-slate-400 font-bold">تغيير لون زر الإرسال الرئيسي في استمارة التسجيل ليتطابق مع ألوان مؤسستك</p>
                  </div>
                </div>

                {/* Preset Color Swatches */}
                <div className="space-y-2.5">
                  <label className="text-[11px] font-black text-slate-600 block mr-1">لوحات ألوان جاهزة ومختارة بعناية</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {PRESET_BUTTON_COLORS.map(preset => {
                      const isSelected = (brandingButtonColor || '').toLowerCase() === (preset.value || '').toLowerCase();
                      return (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => {
                            setBrandingButtonColor(preset.value);
                            setBrandingButtonTextColor(preset.textHex);
                          }}
                          className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all text-right cursor-pointer ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20'
                              : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                          }`}
                        >
                          <span
                            className="w-5 h-5 rounded-lg shadow-sm shrink-0 border border-white/20 flex items-center justify-center text-white text-[10px]"
                            style={{ backgroundColor: preset.bgHex }}
                          >
                            {isSelected && <Check size={12} className="stroke-[3]" />}
                          </span>
                          <span className="text-[11px] font-black text-slate-800 truncate">{preset.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Color Picker & Hex Input */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-600 mr-1">اختر لون مخصص دقيق (HEX / Picker)</label>
                    <div className="flex items-center gap-2">
                      <div className="relative w-12 h-11 rounded-xl border border-slate-200 overflow-hidden shrink-0 shadow-sm">
                        <input
                          type="color"
                          value={brandingButtonColor.startsWith('#') && brandingButtonColor.length === 7 ? brandingButtonColor : '#0D365A'}
                          onChange={e => setBrandingButtonColor(e.target.value)}
                          className="absolute inset-0 w-full h-full cursor-pointer opacity-100 scale-150"
                        />
                      </div>
                      <input
                        type="text"
                        value={brandingButtonColor}
                        onChange={e => setBrandingButtonColor(e.target.value)}
                        placeholder="#0D365A"
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono font-bold text-slate-800 uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-600 mr-1">لون خط نص الزر</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBrandingButtonTextColor('#FFFFFF')}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          brandingButtonTextColor.toUpperCase() === '#FFFFFF'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full bg-white border border-slate-300" />
                        <span>أبيض (فاتح)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBrandingButtonTextColor('#0F172A')}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                          brandingButtonTextColor.toUpperCase() === '#0F172A'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span className="w-3 h-3 rounded-full bg-slate-900" />
                        <span>داكن (كحلي)</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Button Text Label */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="text-[11px] font-black text-slate-600 mr-1">النص المكتوب داخل الزر الرئيسي</label>
                  <input
                    type="text"
                    value={brandingButtonText}
                    onChange={e => setBrandingButtonText(e.target.value)}
                    placeholder="مثال: إرسال بيانات التسجيل الفوري 🚀"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-800"
                  />
                </div>
              </section>

              {/* Section 3: Header Titles & Welcome Text */}
              <section className="bg-white rounded-[2.5rem] p-8 border border-slate-200/60 shadow-sm space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900">عناوين ونصوص الترحيب بالاستمارة</h4>
                    <p className="text-[11px] text-slate-400 font-bold">تعديل الترويسة الرئيسية والرسالة الترحيبية المعروضة لزوار الاستمارة</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-600 mr-1">عنوان بطاقة الاستمارة الرئيسي</label>
                    <input
                      type="text"
                      value={brandingCardTitle}
                      onChange={e => setBrandingCardTitle(e.target.value)}
                      placeholder="✨ استمارة التسجيل في الأكاديمية"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-600 mr-1">النص الترحيبي والتعليمات الفرعية</label>
                    <textarea
                      rows={3}
                      value={brandingSubtitle}
                      onChange={e => setBrandingSubtitle(e.target.value)}
                      placeholder="أهلاً بك! يرجى تعبئة الحقول المطلوبة بالكامل..."
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none text-xs font-bold text-slate-800 leading-relaxed resize-none"
                    />
                  </div>
                </div>
              </section>

            </div>

            {/* Right Interactive Live Preview Column (5 Cols) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Sticky Preview Container */}
              <div className="sticky top-6 space-y-4">
                
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Eye size={16} className="text-indigo-600" />
                    <h4 className="text-xs font-black text-slate-800">معاينة حية ومباشرة للاستمارة</h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                    تحديث فوري ⚡
                  </span>
                </div>

                {/* Mockup Card */}
                <div className="bg-slate-900 rounded-[2.5rem] p-6 shadow-2xl border border-slate-800 text-right overflow-hidden relative">
                  
                  {/* Decorative background glow */}
                  <div 
                    className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-500"
                    style={{ backgroundColor: brandingButtonColor }}
                  />

                  {/* Header Logo Mock */}
                  <div className="flex items-center justify-between pb-5 border-b border-slate-800 mb-6">
                    <div className="flex items-center gap-3">
                      <AcademyLogo
                        className="h-10 w-auto"
                        customLogoUrl={brandingLogo}
                        customAcademyName={brandingAcademyName}
                        customSlogan={brandingSlogan}
                      />
                    </div>
                    <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      مستقل 🌟
                    </span>
                  </div>

                  {/* Inner Form Card Mockup */}
                  <div className="bg-white rounded-3xl p-6 shadow-lg border border-slate-100 space-y-4 text-slate-800">
                    
                    <div className="space-y-1">
                      <h5 className="text-sm font-black text-slate-900 leading-tight">
                        {brandingCardTitle || '✨ استمارة التسجيل في الأكاديمية'}
                      </h5>
                      <p className="text-[10px] text-slate-500 font-bold leading-relaxed line-clamp-2">
                        {brandingSubtitle || 'يرجى تعبئة بيانات الطالب لحجز موعد الحصة التجريبية.'}
                      </p>
                    </div>

                    {/* Dummy Form Inputs */}
                    <div className="space-y-2.5 text-right pt-1">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400">اسم الطالب الرباعي *</span>
                        <div className="h-8 bg-slate-100 rounded-lg border border-slate-200/80 flex items-center px-3 text-[10px] text-slate-400 font-bold">
                          محمد أحمد خليل
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400">رقم الواتساب (WhatsApp) *</span>
                        <div className="h-8 bg-slate-100 rounded-lg border border-slate-200/80 flex items-center justify-between px-3 text-[10px] text-slate-500 font-mono font-bold" dir="ltr">
                          <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded text-[9px] font-black">+972</span>
                          <span className="text-slate-400">59-123-4567</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-8 bg-slate-100 rounded-lg border border-slate-200/80 flex items-center px-2 text-[9px] text-slate-500 font-bold truncate">
                          📚 المرحلة الثانوية (11)
                        </div>
                        <div className="h-8 bg-indigo-50/70 border border-indigo-200 rounded-lg flex items-center justify-center text-[9px] text-indigo-700 font-black">
                          👤 درس فردي (خاص)
                        </div>
                      </div>

                      {/* Mini Subject Chips with Icons */}
                      <div className="space-y-1 pt-0.5">
                        <div className="flex items-center justify-between text-[9px] font-black text-slate-400">
                          <span>المواد المطلوبة للمتابعة *</span>
                          <span className="text-indigo-600 font-bold">3 مواد محددة</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <div className="bg-blue-50/90 border border-blue-200 text-blue-800 rounded-lg p-1.5 flex items-center gap-1 text-[8.5px] font-black shadow-2xs">
                            <Calculator size={11} className="text-blue-600 shrink-0" />
                            <span className="truncate">الرياضيات</span>
                          </div>
                          <div className="bg-purple-50/90 border border-purple-200 text-purple-800 rounded-lg p-1.5 flex items-center gap-1 text-[8.5px] font-black shadow-2xs">
                            <Atom size={11} className="text-purple-600 shrink-0" />
                            <span className="truncate">الفيزياء</span>
                          </div>
                          <div className="bg-sky-50/90 border border-sky-200 text-sky-800 rounded-lg p-1.5 flex items-center gap-1 text-[8.5px] font-black shadow-2xs">
                            <Languages size={11} className="text-sky-600 shrink-0" />
                            <span className="truncate">الإنجليزية</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* The Customized Action Button */}
                    <div className="pt-3 space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setBrandingPreviewToast('✨ معاينة تفاعلية: تم اختبار نقر الزر بنجاح! هذا هو المظهر الفعلي لزر التسجيل المعتمد.');
                          setTimeout(() => setBrandingPreviewToast(''), 4000);
                        }}
                        className="w-full py-3.5 px-4 rounded-xl text-xs font-black shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                        style={{
                          backgroundColor: brandingButtonColor,
                          color: brandingButtonTextColor,
                          boxShadow: `0 8px 20px -4px ${brandingButtonColor}50`
                        }}
                      >
                        <Sparkles size={14} />
                        <span>{brandingButtonText || 'إرسال بيانات التسجيل الفوري 🚀'}</span>
                      </button>
                      {brandingPreviewToast && (
                        <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold text-center animate-in fade-in duration-200">
                          {brandingPreviewToast}
                        </div>
                      )}
                    </div>

                    <div className="text-center pt-1">
                      <p className="text-[8px] font-bold text-slate-400">
                        🔒 نموذج تسجيل إلكتروني رسمي ومباشر للأكاديمية
                      </p>
                    </div>
                  </div>

                  {/* Footer note in dark preview container */}
                  <div className="mt-4 text-center">
                    <p className="text-[10px] font-bold text-slate-400">
                      هكذا ستظهر الاستمارة للطلاب وأولياء الأمور عبر الرابط المستقل
                    </p>
                  </div>
                </div>

                {/* Save Reminder Card */}
                <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl flex items-center gap-3 text-right">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Save size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-black text-indigo-950">لا تنسَ حفظ التغييرات</p>
                    <p className="text-[10px] font-bold text-indigo-700/80">لحفظ اللون والشعار في قاعدة البيانات وتطبيقهما فوراً</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveBranding}
                    disabled={isSaving}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black rounded-lg cursor-pointer transition-all"
                  >
                    حفظ الآن
                  </button>
                </div>

              </div>

            </div>

          </div>

        </div>
      ) : activeTab === 'financial-categories' ? (
        <div className="animate-in fade-in duration-300 pb-10" dir="rtl">
          <FinancialCategoriesManager 
            categories={financialCategories}
            onSaveCategories={handleSaveFinancialCategories}
            isSaving={isSaving}
          />
        </div>
      ) : activeTab === 'logs' ? (
        <div className="animate-in fade-in duration-300 pb-10" dir="rtl">
          <ActivityLog />
        </div>
      ) : activeTab === 'expenses' ? (
        <div className="animate-in fade-in duration-300 pb-10" dir="rtl">
          <OperatingExpensesManager compactView={true} />
        </div>
      ) : (
        <div className="space-y-10 animate-in fade-in duration-300 pb-10" dir="rtl">
          
          {/* Main header banner for the tools */}
          <div className="bg-gradient-to-l from-amber-500/10 via-[#D4A33C]/5 to-transparent rounded-[2.5rem] p-8 border border-[#D4A33C]/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-2 h-full bg-[#D4A33C]" />
            <div className="flex items-center gap-4 mb-3">
              <div className="p-3 bg-amber-500/15 text-[#D4A33C] rounded-2xl border border-amber-500/20">
                <Wrench size={22} className="animate-spin duration-3000" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">بوابة إدارة وتصدير وتفريغ البيانات ⚙️</h3>
                <p className="text-[11px] text-slate-400 font-bold mt-0.5">لوحة التحكم الكاملة وإجراءات الصيانة والحفظ الحيوية بقواعد البيانات</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed font-bold">
              تمنحك لوحة الصيانة هذه صلاحيات إدارية فائقة للتحكم الشامل في البيانات المخزنة سحابياً. يرجى التمهل والحيطة والحذر الشديد عند تفعيل أدوات التفريغ، بينما تتيح لك أدوات التصدير توليد تقارير حية ومفصلة لجميع الحصص قابلة للتحميل الفوري بصيغة Excel/CSV.
            </p>
          </div>

          {/* SECURE JSON BACKUP AND ARCHIVING CENTER */}
          <section className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-200/60 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-full h-1.5 bg-[#D4A33C]" />
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-[#D4A33C] flex items-center justify-center shadow-md shrink-0">
                  <Database size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900 leading-snug">مركز النسخ الاحتياطي والأرشفة الذاتية (JSON Backup)</h4>
                  <p className="text-xs text-slate-400 font-bold mt-1">
                    أمن وحماية متكامل لأخذ وقاية وحفظ نسخة متكاملة لبيانات الطلاب وقوائم الحصص التعليمية في السحاب المباشر وقاعدة البيانات
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[10px] text-slate-400 font-bold">حالة آخر عملية أرشفة:</span>
                <span className="text-xs text-[#D4A33C] font-black mt-1 bg-amber-500/5 px-3.5 py-1.5 rounded-xl border border-amber-500/10">
                  {lastJsonBackupDate ? lastJsonBackupDate : 'لم يتم تنفيذ أي نسخ احتياطي في هذه الجلسة بعد ⏳'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
              {/* Box 1: Why backup */}
              <div className="lg:col-span-2 space-y-4">
                <p className="text-xs font-bold text-slate-600 leading-relaxed">
                  تتيح لك هذه الأداة توليد ملف أرشيف آمن بصيغة <span className="font-mono font-black text-amber-600">JSON</span> يحتوي على تفاصيل الطلاب، وسجل اللقاءات والحصص والحسابات الائتمانية بالكامل. يمكنك تخزين هذا الملف على جهازك المحلي، أو تفعيل الجدولة التلقائية لحفظ نسخة سحابية آمنة أسبوعياً يتم تأمينها في خادمنا السحابي لحمايتها ضد الفقدان أو عطل الأجهزة المحمولة.
                </p>
                
                <div className="flex flex-wrap gap-4 text-[10px] text-slate-400 font-bold">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <span>تصدير كامل بيانات الطلاب المستفيدين</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <span>تضمين سجل الحصص واللقاءات التفصيلي</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <span>حفظ قيود المدفوعات والرواتب المصروفة</span>
                  </div>
                </div>

                {/* Cloud & Auto Backup Scheduling configuration */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-150 gap-4">
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-800 block">جدولة نسخ احتياطي تلقائي أسبوعي للسحاب ☁️</span>
                      <span className="text-[10px] font-bold text-slate-400 mt-1 block">عند التنشيط، سيقوم النظام تلقائياً بإنشاء نسخة احتياطية مشفرة في السحاب مرة كل أسبوع.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...settings, autoBackupEnabled: !settings.autoBackupEnabled };
                        saveSettings(updated);
                      }}
                      className={`px-4 py-2.5 rounded-xl font-bold text-[10px] transition-all flex items-center justify-center gap-2 cursor-pointer select-none border shrink-0 ${
                        settings.autoBackupEnabled 
                          ? 'bg-emerald-600 border-emerald-700 text-white shadow-md shadow-emerald-500/10' 
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <span>{settings.autoBackupEnabled ? 'الجدولة: مفعلة ومحفوظة ✓' : 'الجدولة: معطلة ❌'}</span>
                    </button>
                  </div>

                  {settings.autoBackupEnabled && (
                    <div className="text-[10px] font-black text-[#D4A33C] bg-amber-500/5 px-4 py-2.5 rounded-xl border border-amber-500/10 flex items-center justify-between">
                      <span>تاريخ آخر نسخة سحابية تلقائية:</span>
                      <span className="font-mono">
                        {settings.lastAutoBackupDate ? new Date(settings.lastAutoBackupDate).toLocaleString('ar-EG') : 'قيد الانتظار (سيتم توليدها تلقائياً عند أول مرور زمني)'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Box 2: Actions */}
              <div className="flex flex-col justify-center gap-3">
                <button
                  type="button"
                  disabled={backingUp}
                  onClick={handleDownloadJSONBackup}
                  className="w-full py-4 px-6 bg-[#0D365A] hover:bg-[#154673] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10 cursor-pointer select-none border-none animate-in fade-in zoom-in"
                >
                  <Download size={16} className={backingUp ? "animate-bounce" : ""} />
                  <span>{backingUp ? 'جاري تصدير وتجهيز النسخة...' : 'تحميل وتصدير النسخة الاحتياطية (JSON) 📥'}</span>
                </button>

                <button
                  type="button"
                  disabled={isCloudBackingUp}
                  onClick={handleTriggerCloudBackupNow}
                  className="w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-[#D4A33C] hover:from-amber-600 hover:to-amber-550 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 rounded-2xl font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer select-none border-none animate-in fade-in zoom-in"
                >
                  <RefreshCw size={16} className={isCloudBackingUp ? "animate-spin" : ""} />
                  <span>{isCloudBackingUp ? 'جاري الرفع للحفظ...' : 'نسخ احتياطي سحابي يدوي فوري ☁️'}</span>
                </button>
                
                <span className="text-[9px] text-center text-slate-400 font-bold mt-1 leading-relaxed">
                  النسخ السحابية اليدوية والتلقائية تمنحك أمان في الخادم المباشر بمأمن تام عن جهازك المكتبي.
                </span>
              </div>
            </div>

            {/* Cloud backups historical registry library */}
            <div className="pt-8 mt-8 border-t border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-black text-slate-800 flex items-center gap-2">
                  <Database size={14} className="text-[#D4A33C]" />
                  <span>النسخ الاحتياطية السحابية المحفوظة في خادم الأكاديمية</span>
                </h5>
                <button 
                  type="button"
                  onClick={fetchCloudBackups}
                  disabled={cloudBackupsLoading}
                  className="p-1 text-slate-450 hover:text-slate-705 transition-colors bg-transparent border-none cursor-pointer"
                  title="تحديث قائمة الأرشيف السحابي"
                >
                  <RefreshCw size={12} className={cloudBackupsLoading ? "animate-spin" : ""} />
                </button>
              </div>

              {cloudBackupsLoading ? (
                <div className="py-6 text-center text-xs text-slate-400">جاري تحميل كشوف النسخ الاحتياطية السحابية...</div>
              ) : cloudBackups.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100/60">
                   لا توجد أي نسخ احتياطية سحابية محفوظة حالياً (التلقائية الأسبوعية تتطلب تمكين الجدولة).
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-2xl bg-slate-50/50">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-200">
                        <th className="p-3 font-black text-slate-600">تاريخ ومستند النسخة</th>
                        <th className="p-3 font-black text-slate-600">نوع التخديم</th>
                        <th className="p-3 font-black text-slate-600">الملخص الحجمي</th>
                        <th className="p-3 font-black text-slate-600 text-center">التحكم الفوري</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cloudBackups.map(backup => (
                        <tr key={backup.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-semibold text-slate-800">
                            <span className="font-mono block">{new Date(backup.createdAt).toLocaleString('ar-EG')}</span>
                            <span className="text-[10px] text-slate-400 font-mono italic block mt-0.5">{backup.id}</span>
                          </td>
                          <td className="p-3">
                            {backup.backupType === 'auto_weekly_cloud' ? (
                              <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-black text-[10px] border border-emerald-100">تلقائي أسبوعي ⚙️</span>
                            ) : (
                              <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg font-black text-[10px] border border-amber-100">يدوي سحابي ☁️</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-500 font-bold space-y-0.5">
                            <div className="text-[10px]">الطلاب: <span className="font-black text-slate-800">{backup.counts?.students ?? 0}</span></div>
                            <div className="text-[10px]">الحصص: <span className="font-black text-slate-800">{backup.counts?.sessions ?? 0}</span></div>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDownloadCloudBackupJson(backup)}
                                className="px-3 py-1.5 bg-[#0D365A] text-white hover:bg-[#154673] rounded-lg font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                                title="تحميل ملف JSON"
                              >
                                <Download size={11} />
                                <span>تحميل JSON</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCloudBackup(backup.id)}
                                className="p-1 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-colors border-none bg-transparent cursor-pointer"
                                title="حذف النسخة من الخادم"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* 1. EXPORT HIERARCHY */}
            <section className="bg-white rounded-[2.5rem] p-8 border border-slate-200/60 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-1.5 bg-emerald-600" />
              <div className="space-y-6">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-md shrink-0">
                    <FileSpreadsheet size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900">تصدير بيانات الحصص واللقاءات</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">توليد ملفات Excel تفصيلية للحصص والدروس</p>
                  </div>
                </div>

                {/* Export Choice */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 block mr-1">نطاق التصدير المستهدف:</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setExportTargetType('all');
                          setExportSelectedStudentId('');
                          setExportSelectedTeacherId('');
                        }}
                        className={`py-3 rounded-xl font-bold text-[10px] transition-colors border cursor-pointer select-none text-center ${
                          exportTargetType === 'all'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-black'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        الكل (جميع السجلات)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExportTargetType('student');
                          setExportSelectedTeacherId('');
                        }}
                        className={`py-3 rounded-xl font-bold text-[10px] transition-colors border cursor-pointer select-none text-center ${
                          exportTargetType === 'student'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-black'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        طالب معين
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExportTargetType('teacher');
                          setExportSelectedStudentId('');
                        }}
                        className={`py-3 rounded-xl font-bold text-[10px] transition-colors border cursor-pointer select-none text-center ${
                          exportTargetType === 'teacher'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-black'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        معلم معين
                      </button>
                    </div>
                  </div>

                  {/* Student select condition */}
                  {exportTargetType === 'student' && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 block mr-1">اختر الطالب المستهدف:</label>
                      <div className="relative">
                        <select
                          value={exportSelectedStudentId}
                          onChange={e => setExportSelectedStudentId(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-bold appearance-none cursor-pointer pr-4 pl-10"
                        >
                          <option value="">-- اختر من قائمة الطلاب --</option>
                          {students.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                      </div>
                    </motion.div>
                  )}

                  {exportTargetType === 'teacher' && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 block mr-1">اختر المعلم المستهدف:</label>
                      <div className="relative">
                        <select
                          value={exportSelectedTeacherId}
                          onChange={e => setExportSelectedTeacherId(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-bold appearance-none cursor-pointer pr-4 pl-10"
                        >
                          <option value="">-- اختر من قائمة المعلمين --</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleExportSessionsToExcel}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 cursor-pointer select-none"
                >
                  <Download size={14} />
                  <span>تصدير البيانات الآن (صيغة Excel)</span>
                </button>
              </div>
            </section>

            {/* 2. DATA PURGE DIALOG */}
            <section className="bg-white rounded-[2.5rem] p-8 border border-slate-200/60 shadow-sm flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-full h-1.5 bg-rose-600" />
              <div className="space-y-6">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                  <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-md shrink-0">
                    <Trash2 size={20} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-900">تفريغ وحذف بيانات النظام</h4>
                    <p className="text-[10px] text-rose-600 font-extrabold mt-1">حذف السجلات المالية وسجلات وجداول اللقاءات</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 block mr-1">تحديد الكيان المراد تفريغه:</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPurgeTargetType('all_students');
                          setPurgeSelectedStudentId('');
                          setPurgeSelectedTeacherId('');
                        }}
                        className={`py-3 rounded-xl font-bold text-[10px] transition-colors border cursor-pointer select-none text-center ${
                          purgeTargetType === 'all_students'
                            ? 'bg-rose-50 border-rose-300 text-rose-805 font-black'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        جميع الطلاب
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPurgeTargetType('student');
                          setPurgeSelectedTeacherId('');
                        }}
                        className={`py-3 rounded-xl font-bold text-[10px] transition-colors border cursor-pointer select-none text-center ${
                          purgeTargetType === 'student'
                            ? 'bg-rose-50 border-rose-300 text-rose-805 font-black'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        طالب محدد
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPurgeTargetType('teacher');
                          setPurgeSelectedStudentId('');
                        }}
                        className={`py-3 rounded-xl font-bold text-[10px] transition-colors border cursor-pointer select-none text-center ${
                          purgeTargetType === 'teacher'
                            ? 'bg-rose-50 border-rose-300 text-rose-805 font-black'
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        معلم محدد
                      </button>
                    </div>
                  </div>

                  {/* Student select condition */}
                  {purgeTargetType === 'student' && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 block mr-1">اختر الطالب للتفريغ:</label>
                      <div className="relative">
                        <select
                          value={purgeSelectedStudentId}
                          onChange={e => setPurgeSelectedStudentId(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-xs font-bold appearance-none cursor-pointer pr-4 pl-10"
                        >
                          <option value="">-- اختر من قائمة الطلاب --</option>
                          {students.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                      </div>
                    </motion.div>
                  )}

                  {purgeTargetType === 'teacher' && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 block mr-1">اختر المعلم للتفريغ:</label>
                      <div className="relative">
                        <select
                          value={purgeSelectedTeacherId}
                          onChange={e => setPurgeSelectedTeacherId(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-xs font-bold appearance-none cursor-pointer pr-4 pl-10"
                        >
                          <option value="">-- اختر من قائمة المعلمين --</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                      </div>
                    </motion.div>
                  )}

                  {/* Warning Box */}
                  <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-4 flex items-start gap-3 mt-4">
                    <ShieldAlert size={16} className="text-rose-500 shrink-0 mt-0.5 animate-pulse" />
                    <p className="text-[10px] text-rose-800 font-extrabold leading-relaxed">
                      تنبيه عملياتي حرج: يؤدي تفريغ السجلات المحددة إلى حذف المستند السحابي وإلغاء الحساب المالي المرتبط به تماماً مع تصفير وحذف وسجل الحصص والدفعات بصورة نهائية!
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPurgeConfirmation(true)}
                  disabled={
                    (purgeTargetType === 'student' && !purgeSelectedStudentId) ||
                    (purgeTargetType === 'teacher' && !purgeSelectedTeacherId) ||
                    isPurging
                  }
                  className="w-full py-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-rose-600/10 cursor-pointer select-none"
                >
                  <Trash2 size={14} />
                  <span>{isPurging ? 'جاري تصفير وتفريغ السجلات...' : 'تفريغ وتصفير وحذف البيانات المحددة ⚠️'}</span>
                </button>
              </div>
            </section>
          </div>

          {/* WARNING CONFIRMATION DIALOG MODAL TYPE */}
          <AnimatePresence>
            {showPurgeConfirmation && (
              <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-2xl p-8 max-w-md w-full text-right overflow-hidden relative"
                  dir="rtl"
                >
                  <div className="absolute top-0 right-0 w-full h-2 bg-rose-600 animate-pulse" />
                  
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-slate-900 leading-tight">طلب الموافقة لتفريغ البيانات</h4>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">تأكيد حاسم قبل القيام بإجراء مسح البيانات المحددة</p>
                    </div>
                  </div>

                  <div className="space-y-4 text-xs text-slate-700 leading-relaxed font-bold bg-slate-50 p-5 rounded-2xl border border-slate-200/50">
                    <p className="text-rose-600 font-black">
                      ⚠️ يرجى معاينة التغييرات التالية وتدقيقها بدقة:
                    </p>
                    <ul className="list-disc leading-loose list-inside pr-2 space-y-1">
                      <li>سيتم محو ومسح الكيان المحدد من قاعدة البيانات تماماً.</li>
                      <li>إلغاء وإزالة الأرصدة والمدفوعات شحن الرصيد والقيود.</li>
                      <li>مسح وحذف سجل جداول الحصص والتقييمات سحابياً بالكامل.</li>
                      <li>هذه الحركة نهائية وقاطعة ولا تتيح التراجع بعدها إطلاقاً.</li>
                    </ul>
                  </div>

                  <div className="flex gap-4 mt-8">
                    <button
                      type="button"
                      onClick={handlePurgeData}
                      className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-500/10"
                    >
                      <span>نعم، متأكد وأرغب بالتفريغ الفوري</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPurgeConfirmation(false)}
                      className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-205 text-slate-700 rounded-xl text-xs font-black transition-colors text-center cursor-pointer"
                    >
                      إلغاء وتراجع
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Batch WhatsApp Dispatch Modal */}
      <AnimatePresence>
        {isBatchWhatsAppModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-2xl p-6 sm:p-8 max-w-2xl w-full text-right overflow-hidden relative"
              dir="rtl"
            >
              <div className="absolute top-0 right-0 w-full h-2 bg-emerald-600" />
              
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <MessageSquare size={24} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-slate-900 leading-tight">إرسال تذكيرات مالية مجمعة عبر WhatsApp</h4>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">
                      حدد الطلاب المستحقين للبدء بإرسال رسائل التذكير التلقائية المخصصة لكل طالب
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsBatchWhatsAppModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-sm font-black transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Status or Progress */}
              {batchWhatsAppSuccessMsg ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-black flex items-center gap-2 mb-4">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <span>{batchWhatsAppSuccessMsg}</span>
                </div>
              ) : null}

              {/* Action bar inside modal */}
              {(() => {
                const lowStudents = getLowBalanceStudents();
                const filtered = lowStudents.filter(item => 
                  !whatsAppSearchFilter || 
                  item.student.name?.toLowerCase().includes(whatsAppSearchFilter.toLowerCase()) ||
                  item.student.phone?.includes(whatsAppSearchFilter)
                );
                const allSelected = filtered.length > 0 && filtered.every(item => selectedWhatsAppStudentIds.includes(item.student.id));

                return (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (allSelected) {
                              setSelectedWhatsAppStudentIds([]);
                            } else {
                              setSelectedWhatsAppStudentIds(filtered.map(f => f.student.id));
                            }
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          {allSelected ? <CheckSquare size={14} className="text-emerald-600" /> : <Square size={14} />}
                          <span>{allSelected ? 'إلغاء تحديد الكل' : 'تحديد الكل'}</span>
                        </button>
                        <span className="text-xs font-bold text-slate-500">
                          (المحدد: <strong className="text-emerald-700 font-mono">{selectedWhatsAppStudentIds.length}</strong> من أصل {filtered.length})
                        </span>
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          value={whatsAppSearchFilter}
                          onChange={e => setWhatsAppSearchFilter(e.target.value)}
                          placeholder="بحث بالاسم أو الهاتف..."
                          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 w-44"
                        />
                      </div>
                    </div>

                    {/* Students list */}
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-slate-50/50">
                      {filtered.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs font-bold">
                          لا توجد نتائج مطابقة للبحث
                        </div>
                      ) : (
                        filtered.map(({ student, balance, threshold, debt }) => {
                          const isChecked = selectedWhatsAppStudentIds.includes(student.id);
                          const messageText = formatAutoWhatsAppText(student, settings.autoWhatsAppTemplate || DEFAULT_AUTO_WHATSAPP_TEMPLATE, balance);
                          const cleanPhone = (student.phone || student.contact || '').replace(/[\s\-\+]/g, '');
                          const waUrl = cleanPhone 
                            ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`
                            : '';

                          return (
                            <div 
                              key={student.id} 
                              onClick={() => {
                                if (isChecked) {
                                  setSelectedWhatsAppStudentIds(selectedWhatsAppStudentIds.filter(id => id !== student.id));
                                } else {
                                  setSelectedWhatsAppStudentIds([...selectedWhatsAppStudentIds, student.id]);
                                }
                              }}
                              className={`p-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer select-none ${
                                isChecked ? 'bg-emerald-50/60' : 'hover:bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}}
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer shrink-0"
                                />
                                <div className="min-w-0">
                                  <span className="text-xs font-black text-slate-900 block break-words leading-snug">{student.name}</span>
                                  <div className="text-[10px] text-slate-500 font-bold flex items-center gap-2 mt-0.5">
                                    <span>الرصيد: <strong className="text-rose-600 font-mono">{balance} ₪</strong></span>
                                    <span>• العتبة: <strong className="font-mono">{threshold} ₪</strong></span>
                                    {student.phone && <span>• 📱 {student.phone}</span>}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                {cleanPhone ? (
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={async () => {
                                      await logActivity({
                                        actionType: 'SEND_WHATSAPP_LOW_BALANCE_REMINDER',
                                        actionName: 'إرسال تذكير مالي عبر واتساب',
                                        details: `تم إرسال تذكير مالي آلي عبر واتساب للطالب ${student.name} (الرصيد: ${balance} ₪، العتبة: ${threshold} ₪)`,
                                        amount: balance
                                      });
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 transition-all"
                                  >
                                    <Send size={11} />
                                    <span>فتح WhatsApp</span>
                                  </a>
                                ) : (
                                  <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                    لا يوجد هاتف
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-[10px] text-slate-400 font-bold">
                        💡 يمكنك فتح محادثة WhatsApp لكل طالب على حدة أو إرسال الروابط تباعاً.
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          type="button"
                          onClick={() => setIsBatchWhatsAppModalOpen(false)}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors cursor-pointer"
                        >
                          إغلاق
                        </button>
                        <button
                          type="button"
                          disabled={selectedWhatsAppStudentIds.length === 0}
                          onClick={async () => {
                            const selectedStudents = lowStudents.filter(item => selectedWhatsAppStudentIds.includes(item.student.id));
                            if (selectedStudents.length === 0) return;

                            // Open the first one and log activities
                            for (const item of selectedStudents) {
                              const cleanPhone = (item.student.phone || item.student.contact || '').replace(/[\s\-\+]/g, '');
                              if (cleanPhone) {
                                const msg = formatAutoWhatsAppText(item.student, settings.autoWhatsAppTemplate || DEFAULT_AUTO_WHATSAPP_TEMPLATE, item.balance);
                                const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
                                window.open(url, '_blank');
                              }
                              await logActivity({
                                actionType: 'SEND_WHATSAPP_LOW_BALANCE_REMINDER',
                                actionName: 'إرسال تذكير مالي مجمع عبر واتساب',
                                details: `تم فتح رابط تذكير مالي عبر واتساب للطالب ${item.student.name} (الرصيد: ${item.balance} ₪)`,
                                amount: item.balance
                              });
                            }

                            // Update last run date in settings
                            const updated = { ...settings, lastAutoWhatsAppRunDate: new Date().toISOString() };
                            await saveSettings(updated);

                            setBatchWhatsAppSuccessMsg(`تم تجهيز وفتح محادثات التذكير بنجاح لـ (${selectedStudents.length}) طالب! 🎉`);
                            setTimeout(() => {
                              setBatchWhatsAppSuccessMsg('');
                            }, 5000);
                          }}
                          className="flex-1 sm:flex-none px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                        >
                          <Send size={13} />
                          <span>فتح تذكيرات الطلاب المحددين ({selectedWhatsAppStudentIds.length}) 💬</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Scheduled WhatsApp Reminder Modal */}
      <ScheduledWhatsAppReminderModal
        isOpen={isScheduledWhatsAppModalOpen}
        onClose={() => setIsScheduledWhatsAppModalOpen(false)}
        students={students}
        settings={settings}
        calculateStudentBalance={calculateStudentLiveBalance}
        scheduledReminders={scheduledRemindersList}
        initialMode={scheduledModalInitialMode}
        initialSelectedStudentIds={selectedWhatsAppStudentIds}
        initialTargetMode="critical"
        initialTemplate={settings.defaultWhatsAppReminderTemplate || settings.autoWhatsAppTemplate || DEFAULT_AUTO_WHATSAPP_TEMPLATE}
      />
    </div>
  );
}
