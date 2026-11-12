// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Teacher, Settings, Student, Session, Payment, formatCustomDate, calculateTeacherSessionPayout, isTrialSession } from '../types';
import { Plus, Trash2, Mail, BookOpen, DollarSign, User, Users, X, GraduationCap, Calendar, Clock, CheckCircle2, ArrowRight, ArrowLeft, History, TrendingUp, Search, Wallet, Briefcase, UserPlus, RotateCcw, AlertTriangle, UserCircle, Lock, Pencil, Printer, FileSpreadsheet, FileText, HelpCircle, Check, ChevronDown, ChevronUp, Star, Archive, Download, BarChart3, Eye, EyeOff, KeyRound, AlertCircle, Loader2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { logActivity } from '../lib/activityLogger';
import * as XLSX from 'xlsx';
import UnifiedPaymentsManagerModal from './UnifiedPaymentsManagerModal';
import { getAcademicStage, getDefaultPricingUnitForGrade } from '../lib/sessionPricing';

const isOlderThanTwoMonths = (dateStr?: string) => {
  if (!dateStr) return false;
  try {
    const recordDate = new Date(dateStr);
    if (isNaN(recordDate.getTime())) return false;
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    return recordDate < twoMonthsAgo;
  } catch (e) {
    return false;
  }
};

interface TeacherManagementProps {
  initialSearchQuery?: string;
  initialSelectedTeacherId?: string | null;
  onOpenPaymentsManager?: () => void;
}

export default function TeacherManagement({
  initialSearchQuery = '',
  initialSelectedTeacherId = null,
  onOpenPaymentsManager
}: TeacherManagementProps = {}) {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(initialSelectedTeacherId || null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printPreviewHtml, setPrintPreviewHtml] = useState('');
  const [printPreviewTitle, setPrintPreviewTitle] = useState('');
  const [paymentArchivedView, setPaymentArchivedView] = useState<'active' | 'archived'>('active');
  const [isEditingTeacher, setIsEditingTeacher] = useState(false);
  const [editTeacherName, setEditTeacherName] = useState('');
  const [editTeacherBilling, setEditTeacherBilling] = useState<number | ''>('');
  const [editTeacherPayout, setEditTeacherPayout] = useState<number | ''>('');
  const [editTeacherSubjects, setEditTeacherSubjects] = useState<string[]>([]);
  const [editTeacherPhone, setEditTeacherPhone] = useState('');
  const [editTeacherEmail, setEditTeacherEmail] = useState('');
  const [editTeacherSpecialization, setEditTeacherSpecialization] = useState('');
  const [editTeacherContact, setEditTeacherContact] = useState('');
  const [editTeacherUsername, setEditTeacherUsername] = useState('');
  const [editTeacherPassword, setEditTeacherPassword] = useState('');
  const [editTeacherTasksEnabled, setEditTeacherTasksEnabled] = useState(false);
  const [academicRating, setAcademicRating] = useState<number | ''>(4.8);
  const [editTeacherAcademicRating, setEditTeacherAcademicRating] = useState<number | ''>(4.8);

  useEffect(() => {
    if (selectedTeacherId) {
      const teacher = teachers.find(t => t.id === selectedTeacherId);
      if (teacher) {
        setEditTeacherName(teacher.name);
        setEditTeacherBilling(teacher.billingRate || teacher.hourlyRate || 0);
        setEditTeacherPayout(teacher.payoutRate || teacher.hourlyRate || 0);
        setEditTeacherSubjects(teacher.subjects || []);
        setEditTeacherPhone(teacher.phone || '');
        setEditTeacherEmail(teacher.email || '');
        setEditTeacherSpecialization(teacher.specialization || '');
        setEditTeacherContact(teacher.contact || '');
        setEditTeacherUsername(teacher.username || '');
        setEditTeacherPassword(teacher.password || '');
        setEditTeacherTasksEnabled(teacher.tasksEnabled || false);
        setEditTeacherAcademicRating(teacher.academicRating || 4.8);

        // Automatically set the date range filter from start of current month to today's date
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        setTeacherStartDate(`${year}-${month}-01`);
        setTeacherEndDate(`${year}-${month}-${day}`);
      }
    } else {
      setIsEditingTeacher(false);
      setEditTeacherName('');
      setEditTeacherBilling('');
      setEditTeacherPayout('');
      setEditTeacherSubjects([]);
      setEditTeacherPhone('');
      setEditTeacherEmail('');
      setEditTeacherSpecialization('');
      setEditTeacherContact('');
      setEditTeacherUsername('');
      setEditTeacherPassword('');
      setEditTeacherTasksEnabled(false);
      setEditTeacherAcademicRating(4.8);
      setTeacherStartDate('');
      setTeacherEndDate('');
    }
  }, [selectedTeacherId, teachers]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [customSubjectInput, setCustomSubjectInput] = useState('');
  const [editCustomSubjectInput, setEditCustomSubjectInput] = useState('');
  const [contact, setContact] = useState('');
  const [billingRate, setBillingRate] = useState<number | ''>('');
  const [payoutRate, setPayoutRate] = useState<number | ''>('');
  const [hourlyRate, setHourlyRate] = useState<number | ''>('');
  const [specialization, setSpecialization] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showTeacherPassword, setShowTeacherPassword] = useState(false);
  const [showEditTeacherPassword, setShowEditTeacherPassword] = useState(false);
  const [showProfilePassword, setShowProfilePassword] = useState(false);

  // Dedicated Teacher Credentials Modal states
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [editingCredsTeacher, setEditingCredsTeacher] = useState<Teacher | null>(null);
  const [credsUsername, setCredsUsername] = useState('');
  const [credsPassword, setCredsPassword] = useState('');
  const [showCredsPassword, setShowCredsPassword] = useState(false);
  const [credsError, setCredsError] = useState('');
  const [credsSuccess, setCredsSuccess] = useState(false);
  const [credsCopied, setCredsCopied] = useState(false);
  const [isSavingCreds, setIsSavingCreds] = useState(false);

  const openCredentialsModal = (teacher: Teacher | null) => {
    if (!teacher) return;
    setEditingCredsTeacher(teacher);
    setCredsUsername(teacher.username || '');
    setCredsPassword(teacher.password || '123456');
    setShowCredsPassword(false);
    setCredsError('');
    setCredsSuccess(false);
    setCredsCopied(false);
    setIsCredentialsModalOpen(true);
  };

  const closeCredentialsModal = () => {
    setIsCredentialsModalOpen(false);
    setEditingCredsTeacher(null);
    setCredsError('');
    setCredsSuccess(false);
    setCredsCopied(false);
  };

  const handleSaveTeacherCredentials = async () => {
    if (!editingCredsTeacher) return;
    const cleanUser = credsUsername.trim().toLowerCase();
    const cleanPass = credsPassword.trim();

    if (!cleanUser) {
      setCredsError('يرجى إدخال اسم مستخدم صحيح للمعلم.');
      return;
    }
    if (!cleanPass || cleanPass.length < 4) {
      setCredsError('يرجى إدخال كلمة مرور مكونة من 4 خانات على الأقل.');
      return;
    }

    const conflict = teachers.find(t => t.id !== editingCredsTeacher.id && (t.username || '').toLowerCase() === cleanUser);
    if (conflict) {
      setCredsError(`اسم المستخدم "${cleanUser}" مستخدم مسبقاً للمعلم (${conflict.name}). يرجى اختيار اسم مستخدم آخر.`);
      return;
    }

    setIsSavingCreds(true);
    setCredsError('');
    try {
      const teacherRef = doc(db, 'teachers', editingCredsTeacher.id);
      await updateDoc(teacherRef, {
        username: cleanUser,
        password: cleanPass
      });

      setTeachers(prev => prev.map(t => t.id === editingCredsTeacher.id ? {
        ...t,
        username: cleanUser,
        password: cleanPass
      } : t));

      if (selectedTeacherId === editingCredsTeacher.id) {
        setEditTeacherUsername(cleanUser);
        setEditTeacherPassword(cleanPass);
      }

      await logActivity({
        actionType: 'UPDATE_TEACHER',
        actionName: 'تعديل بيانات دخول المعلم',
        teacherId: editingCredsTeacher.id,
        teacherName: editingCredsTeacher.name,
        details: `قام المدير بتعديل اسم المستخدم وكلمة المرور للمعلم "${editingCredsTeacher.name}" (اسم المستخدم الجديد: ${cleanUser})`,
      });

      setCredsSuccess(true);
    } catch (err) {
      console.error("Error updating teacher credentials in Firestore:", err);
      setCredsError('حدث خطأ أثناء حفظ التعديل في قاعدة البيانات. يرجى المحاولة ثانية.');
      handleFirestoreError(err, OperationType.WRITE, `teachers/${editingCredsTeacher.id}`);
    } finally {
      setIsSavingCreds(false);
    }
  };

  const [tasksEnabled, setTasksEnabled] = useState(false);
  const [regStatus, setRegStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'teacher' | 'session' | 'unlink-student' | 'payment'; additionalId?: string } | null>(null);

  // Manager-only session editing states with Price Recalculation Choice
  const [adminEditSession, setAdminEditSession] = useState<Session | null>(null);
  const [adminEditDate, setAdminEditDate] = useState<string>('');
  const [adminEditStartTime, setAdminEditStartTime] = useState<string>('16:00');
  const [adminEditDurationHours, setAdminEditDurationHours] = useState<number>(1);
  const [adminEditSubject, setAdminEditSubject] = useState<string>('');
  const [adminEditTopic, setAdminEditTopic] = useState<string>('');
  const [adminEditTeacherHourlyRate, setAdminEditTeacherHourlyRate] = useState<number>(35);
  const [adminEditTeacherPayout, setAdminEditTeacherPayout] = useState<number>(35);
  const [adminEditStudentHourlyRate, setAdminEditStudentHourlyRate] = useState<number>(50);
  const [adminEditStudentFee, setAdminEditStudentFee] = useState<number>(50);
  const [adminEditInitialValues, setAdminEditInitialValues] = useState<{
    teacherPayout: number;
    studentFee: number;
    durationHours: number;
    teacherHourlyRate: number;
    studentHourlyRate: number;
  } | null>(null);
  const [adminEditRecalculateChoice, setAdminEditRecalculateChoice] = useState<'recalculate' | 'keep_previous'>('recalculate');
  const [showRecalculateConfirmPrompt, setShowRecalculateConfirmPrompt] = useState<boolean>(false);
  const [isAdminSavingSession, setIsAdminSavingSession] = useState<boolean>(false);

  const handleOpenAdminEditSession = (session: Session) => {
    const student = students.find(s => s.id === session.studentId);
    const teacher = teachers.find(t => t.id === session.teacherId) || teachers.find(t => t.id === selectedTeacherId);
    const ass = assignments.find(a => a.studentId === session.studentId && a.teacherId === session.teacherId);
    const durationHours = Math.max(0.1, Number(session.durationHours) || 1);

    const defaultTeacherRate = (ass && ass.teacherPayoutRate !== undefined && ass.teacherPayoutRate !== 0)
      ? ass.teacherPayoutRate
      : (teacher?.payoutRate || teacher?.hourlyRate || 35);

    const initialTeacherPayout = session.customTeacherFee !== undefined && session.customTeacherFee !== null
      ? Number(session.customTeacherFee)
      : (session.customPayout !== undefined && session.customPayout !== null
        ? Number(session.customPayout)
        : durationHours * defaultTeacherRate);

    const initialTeacherRate = session.teacherPayoutRate || (durationHours > 0 ? (initialTeacherPayout / durationHours) : defaultTeacherRate);

    const defaultStudentRate = (ass && ass.studentBillingRate !== undefined && ass.studentBillingRate !== 0)
      ? ass.studentBillingRate
      : (student?.customRates?.[session.teacherId] !== undefined
        ? student.customRates[session.teacherId]
        : (student?.hourlyRate || teacher?.billingRate || 50));

    const initialStudentFee = session.customFee !== undefined && session.customFee !== null
      ? Number(session.customFee)
      : (durationHours * defaultStudentRate);

    const initialStudentRate = durationHours > 0 ? (initialStudentFee / durationHours) : defaultStudentRate;

    setAdminEditSession(session);
    setAdminEditDate(session.date || '');
    setAdminEditStartTime(session.startTime || (session as any).time || '16:00');
    setAdminEditDurationHours(durationHours);
    setAdminEditSubject(session.subject || '');
    setAdminEditTopic(session.topic || session.notes || '');

    const roundedTeacherRate = Number(initialTeacherRate.toFixed(2));
    const roundedTeacherPayout = Number(initialTeacherPayout.toFixed(2));
    const roundedStudentRate = Number(initialStudentRate.toFixed(2));
    const roundedStudentFee = Number(initialStudentFee.toFixed(2));

    setAdminEditTeacherHourlyRate(roundedTeacherRate);
    setAdminEditTeacherPayout(roundedTeacherPayout);
    setAdminEditStudentHourlyRate(roundedStudentRate);
    setAdminEditStudentFee(roundedStudentFee);

    setAdminEditInitialValues({
      teacherPayout: roundedTeacherPayout,
      studentFee: roundedStudentFee,
      durationHours: durationHours,
      teacherHourlyRate: roundedTeacherRate,
      studentHourlyRate: roundedStudentRate
    });

    setAdminEditRecalculateChoice('recalculate');
    setShowRecalculateConfirmPrompt(false);
  };

  const handleAdminDurationChange = (newHours: number) => {
    const h = Math.max(0.1, newHours);
    setAdminEditDurationHours(h);
    setAdminEditTeacherPayout(Number((h * adminEditTeacherHourlyRate).toFixed(2)));
    setAdminEditStudentFee(Number((h * adminEditStudentHourlyRate).toFixed(2)));
  };

  const handleAdminTeacherRateChange = (newRate: number) => {
    setAdminEditTeacherHourlyRate(newRate);
    setAdminEditTeacherPayout(Number((adminEditDurationHours * newRate).toFixed(2)));
  };

  const handleAdminTeacherPayoutChange = (newPayout: number) => {
    setAdminEditTeacherPayout(newPayout);
    if (adminEditDurationHours > 0) {
      setAdminEditTeacherHourlyRate(Number((newPayout / adminEditDurationHours).toFixed(2)));
    }
  };

  const handleAdminStudentRateChange = (newRate: number) => {
    setAdminEditStudentHourlyRate(newRate);
    setAdminEditStudentFee(Number((adminEditDurationHours * newRate).toFixed(2)));
  };

  const handleAdminStudentFeeChange = (newFee: number) => {
    setAdminEditStudentFee(newFee);
    if (adminEditDurationHours > 0) {
      setAdminEditStudentHourlyRate(Number((newFee / adminEditDurationHours).toFixed(2)));
    }
  };

  const isPriceOrDurationChanged = useMemo(() => {
    if (!adminEditInitialValues || !adminEditSession) return false;
    const teacherPayoutDiff = Math.abs(adminEditTeacherPayout - adminEditInitialValues.teacherPayout);
    const studentFeeDiff = Math.abs(adminEditStudentFee - adminEditInitialValues.studentFee);
    const durationDiff = Math.abs(adminEditDurationHours - adminEditInitialValues.durationHours);
    const teacherRateDiff = Math.abs(adminEditTeacherHourlyRate - adminEditInitialValues.teacherHourlyRate);
    const studentRateDiff = Math.abs(adminEditStudentHourlyRate - adminEditInitialValues.studentHourlyRate);

    return teacherPayoutDiff > 0.05 || studentFeeDiff > 0.05 || durationDiff > 0.005 || teacherRateDiff > 0.05 || studentRateDiff > 0.05;
  }, [adminEditInitialValues, adminEditTeacherPayout, adminEditStudentFee, adminEditDurationHours, adminEditTeacherHourlyRate, adminEditStudentHourlyRate]);

  const handleSaveAdminSessionEdit = async () => {
    if (!adminEditSession) return;
    // If price or duration changed, prompt the manager for recalculation confirmation
    if (isPriceOrDurationChanged) {
      setShowRecalculateConfirmPrompt(true);
      return;
    }
    // If no price changed, execute direct save
    await executeSaveAdminSessionEdit(false);
  };

  const executeSaveAdminSessionEdit = async (shouldRecalculate: boolean) => {
    if (!adminEditSession) return;
    setIsAdminSavingSession(true);
    try {
      const sessionRef = doc(db, 'sessions', adminEditSession.id);
      const newHours = Number(adminEditDurationHours) || 1;
      const studentObj = students.find(s => s.id === adminEditSession.studentId);
      const teacherObj = teachers.find(t => t.id === adminEditSession.teacherId) || teachers.find(t => t.id === selectedTeacherId);

      let finalTeacherPayout: number;
      let finalStudentFee: number;
      let finalTeacherRate: number;
      let finalStudentRate: number;

      if (shouldRecalculate) {
        finalTeacherPayout = Number(adminEditTeacherPayout);
        finalStudentFee = Number(adminEditStudentFee);
        finalTeacherRate = Number(adminEditTeacherHourlyRate);
        finalStudentRate = Number(adminEditStudentHourlyRate);
      } else {
        finalTeacherPayout = adminEditInitialValues ? adminEditInitialValues.teacherPayout : (Number(adminEditSession.customPayout) || (newHours * 35));
        finalStudentFee = adminEditInitialValues ? adminEditInitialValues.studentFee : (Number(adminEditSession.customFee) || (newHours * 50));
        finalTeacherRate = adminEditInitialValues ? adminEditInitialValues.teacherHourlyRate : 35;
        finalStudentRate = adminEditInitialValues ? adminEditInitialValues.studentHourlyRate : 50;
      }

      await updateDoc(sessionRef, {
        date: adminEditDate,
        startTime: adminEditStartTime || '16:00',
        time: adminEditStartTime || '16:00',
        durationHours: newHours,
        subject: adminEditSubject || 'عام',
        topic: adminEditTopic || '',
        notes: adminEditTopic || '',
        customPayout: finalTeacherPayout,
        customTeacherFee: finalTeacherPayout,
        customFee: finalStudentFee,
        teacherPayoutRate: finalTeacherRate,
        studentBillingRate: finalStudentRate,
        pricingUnit: 'hourly',
        sessionDurationMinutes: Math.round(newHours * 60),
        sessionCount: newHours,
        lastManualEditAt: new Date().toISOString(),
        lastManualEditBy: 'مدير المنصة',
        manualPriceRecalculated: shouldRecalculate
      });

      await logActivity({
        actionType: 'UPDATE_TASK',
        actionName: shouldRecalculate ? 'تعديل يدوي لحصة مع إعادة الحساب المالي' : 'تعديل يدوي لحصة دون إعادة الحساب المالي',
        details: shouldRecalculate
          ? `قام المدير بتعديل يدوي للحصة وإعادة احتساب الأرصدة (تاريخ: ${adminEditDate}، توقيت: ${adminEditStartTime}، ساعات: ${newHours}، أجر المعلم: ₪${finalTeacherPayout}، فاتورة الطالب: ₪${finalStudentFee}، الطالب: ${studentObj?.name || 'مجهول'}، المعلم: ${teacherObj?.name || 'مجهول'}).`
          : `قام المدير بتعديل بيانات الحصة يدوياً مع الإبقاء على الأجر والفاتورة السابقة دون إعادة حساب (تاريخ: ${adminEditDate}، ساعات: ${newHours}، أجر المعلم: ₪${finalTeacherPayout}، فاتورة الطالب: ₪${finalStudentFee}).`
      });

      setAdminEditSession(null);
      setShowRecalculateConfirmPrompt(false);
      await fetchData();
    } catch (error) {
      console.error("Error saving admin session edit:", error);
      handleFirestoreError(error, OperationType.WRITE, `sessions/${adminEditSession.id}`);
    } finally {
      setIsAdminSavingSession(false);
    }
  };
  
  // Custom rate management per student
  const [selectedStudentForRates, setSelectedStudentForRates] = useState<Student | null>(null);
  const [customPayoutInput, setCustomPayoutInput] = useState<string>('');
  const [customBillingInput, setCustomBillingInput] = useState<string>('');
  const [isEditingCustomRates, setIsEditingCustomRates] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLinkingStudent, setIsLinkingStudent] = useState(false);
  const [studentSearchForLink, setStudentSearchForLink] = useState('');
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [studentLinkSearch, setStudentLinkSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Rate trigger and approval notifications
  const [payoutAlertThreshold, setPayoutAlertThreshold] = useState<number>(100);
  const [bookingApproved, setBookingApproved] = useState<boolean>(true);

  // Payment logging modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isConfirmPaymentOpen, setIsConfirmPaymentOpen] = useState(false);
  const [selectedPayTeacher, setSelectedPayTeacher] = useState<Teacher | null>(null);
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payNote, setPayNote] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Payment editing states
  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editPayAmount, setEditPayAmount] = useState<number | ''>('');
  const [editPayDate, setEditPayDate] = useState('');
  const [editPayNote, setEditPayNote] = useState('');
  const [editPayTeacherId, setEditPayTeacherId] = useState('');
  const [isSubmittingEditPayment, setIsSubmittingEditPayment] = useState(false);
  const [editPaymentSuccess, setEditPaymentSuccess] = useState(false);
  const [isPaymentsManagerModalOpen, setIsPaymentsManagerModalOpen] = useState(false);

  // Settle previous months dues states
  const [isSettleDuesModalOpen, setIsSettleDuesModalOpen] = useState(false);
  const [isSubmittingSettleDues, setIsSubmittingSettleDues] = useState(false);
  const [settleDuesSuccess, setSettleDuesSuccess] = useState(false);
  const [selectedTeachersToSettle, setSelectedTeachersToSettle] = useState<Record<string, boolean>>({});

  // Quick edit rate states
  const [quickEditRateTeacher, setQuickEditRateTeacher] = useState<Teacher | null>(null);
  const [quickEditPayoutRate, setQuickEditPayoutRate] = useState<string>('');
  const [quickEditBillingRate, setQuickEditBillingRate] = useState<string>('');
  const [quickEditSession40PayoutRate, setQuickEditSession40PayoutRate] = useState<string>('');
  const [quickEditSession40BillingRate, setQuickEditSession40BillingRate] = useState<string>('');
  const [quickEditApplyToPrimary, setQuickEditApplyToPrimary] = useState<boolean>(true);
  const [isSubmittingQuickRate, setIsSubmittingQuickRate] = useState(false);
  const [quickRateError, setQuickRateError] = useState('');

  // Profile Search
  const [historySearch, setHistorySearch] = useState('');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || '');

  useEffect(() => {
    if (initialSearchQuery !== undefined && initialSearchQuery !== '') {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  useEffect(() => {
    if (initialSelectedTeacherId !== undefined && initialSelectedTeacherId !== null) {
      setSelectedTeacherId(initialSelectedTeacherId);
    }
  }, [initialSelectedTeacherId]);
  const [filterSpecialization, setFilterSpecialization] = useState('');
  const [filterMinRate, setFilterMinRate] = useState<number | ''>('');
  const [filterMaxRate, setFilterMaxRate] = useState<number | ''>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Dynamically compute the top specializations / subjects registered in existing teachers for smart suggestions
  const topSpecializations = useMemo(() => {
    const counts: Record<string, number> = {};
    teachers.forEach(t => {
      if (t.specialization) {
        // split by common arabic or english separators
        t.specialization.split(/[،,]/).forEach(s => {
          const cleaned = s.trim();
          if (cleaned && cleaned.length > 1) {
            counts[cleaned] = (counts[cleaned] || 0) + 1;
          }
        });
      }
      if (t.subjects) {
        t.subjects.forEach(sub => {
          const cleaned = sub.trim();
          if (cleaned && cleaned.length > 1) {
            counts[cleaned] = (counts[cleaned] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name]) => name);
  }, [teachers]);

  // Date range filters for teacher's financial history & statement
  const [teacherStartDate, setTeacherStartDate] = useState('');
  const [teacherEndDate, setTeacherEndDate] = useState('');

  // Date range filters for global teachers' salaries and payout Excel export report
  const [globalReportStartDate, setGlobalReportStartDate] = useState('');
  const [globalReportEndDate, setGlobalReportEndDate] = useState('');

  // Pre-calculate teacher metrics for maximum efficiency in list views
  const teacherMetrics = useMemo(() => {
    const assignedCounts: Record<string, number> = {};
    const approvedHours: Record<string, number> = {};

    teachers.forEach(t => {
      assignedCounts[t.id] = 0;
      approvedHours[t.id] = 0;
    });

    students.forEach(s => {
      if (s.teachers && Array.isArray(s.teachers)) {
        s.teachers.forEach(tId => {
          if (assignedCounts[tId] !== undefined) {
            assignedCounts[tId]++;
          }
        });
      }
    });

    sessions.forEach(s => {
      if (s.approved !== false && s.status !== 'pending' && s.status !== 'booked') {
        if (approvedHours[s.teacherId] !== undefined) {
          approvedHours[s.teacherId] += s.durationHours;
        }
      }
    });

    return { assignedCounts, approvedHours };
  }, [teachers, students, sessions]);
  
  // Booking Modal State
  const [bookingTeacher, setBookingTeacher] = useState<Teacher | null>(null);
  const [bookingStudent, setBookingStudent] = useState<Student | null>(null);
  const [bookingSubject, setBookingSubject] = useState('');
  const [bookingDuration, setBookingDuration] = useState(1);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    fetchData();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'settings', 'global'));
      let subjects = ['رياضيات', 'لغة عربية', 'لغة إنجليزية', 'دين', 'مدنيات', 'حاسوب', 'علوم', 'فيزياء', 'كيمياء', 'أحياء (بيولوجيا)', 'تاريخ', 'جغرافيا'];
      if (docSnap.exists()) {
        const settings = docSnap.data() as Settings;
        if (settings.subjects && settings.subjects.length > 0) {
          subjects = Array.from(new Set([...settings.subjects, 'دين', 'مدنيات', 'كيمياء', 'أحياء (بيولوجيا)', 'فيزياء', 'تاريخ']));
        }
        const defaultTeacher = settings.defaultTeacherHourlyRate ?? 35;
        const defaultStudent = settings.defaultStudentHourlyRate ?? settings.defaultHourlyRate ?? 60;
        setPayoutRate(defaultTeacher);
        setHourlyRate(defaultTeacher);
        setBillingRate(defaultStudent);
      } else {
        setPayoutRate(35);
        setHourlyRate(35);
        setBillingRate(60);
      }
      setAvailableSubjects(subjects);
    } catch (error) {
      console.error("Error fetching settings:", error);
      setAvailableSubjects(['رياضيات', 'لغة عربية', 'لغة إنجليزية', 'دين', 'مدنيات', 'علوم', 'فيزياء', 'كيمياء', 'أحياء (بيولوجيا)', 'تاريخ']);
      setPayoutRate(35);
      setHourlyRate(35);
      setBillingRate(60);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const tSnap = await getDocs(collection(db, 'teachers'));
      const sSnap = await getDocs(collection(db, 'students'));
      const sessSnap = await getDocs(collection(db, 'sessions'));
      const paySnap = await getDocs(collection(db, 'payments'));
      const assSnap = await getDocs(collection(db, 'assignments'));

      const allSessions = sessSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
      setSessions(allSessions);

      const allTeachers = tSnap.docs.map(doc => {
        const t = { id: doc.id, ...doc.data() } as Teacher;
        if (t.id === 'zaki_teacher' || t.username === 'zakiabuillan' || t.name?.includes('زكي')) {
          const uniqueSubjects = Array.from(new Set(
            allSessions
              .filter(s => s.teacherId === t.id)
              .map(s => s.subject)
              .filter(Boolean)
          ));
          t.subjects = uniqueSubjects;
        }
        return t;
      });
      setTeachers(allTeachers);

      setStudents(sSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
      setPayments(paySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
      setAssignments(assSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'teachers/students/sessions/payments/assignments');
    } finally {
      setIsLoading(false);
    }
  };

  const addTeacher = async () => {
    // 1. Validation check
    if (!name.trim()) {
      setRegStatus({ type: 'error', message: 'يرجى إدخال الاسم الرباعي للمعلم.' });
      return;
    }
    
    // Validate rates
    const pRate = Number(payoutRate) || Number(hourlyRate);
    const bRate = Number(billingRate) || pRate;

    if (!pRate || pRate <= 0) {
      setRegStatus({ type: 'error', message: 'يرجى تحديد أجر المعلم بالساعة بشكل صحيح.' });
      return;
    }

    if (!bRate || bRate <= 0) {
      setRegStatus({ type: 'error', message: 'يرجى تحديد سعر فوترة الطالب بالساعة بشكل صحيح.' });
      return;
    }

    if (!username.trim()) {
      setRegStatus({ type: 'error', message: 'يرجى تحديد اسم المستخدم للمعلم لتمكينه من تسجيل الدخول المباشر.' });
      return;
    }

    if (!password || password.length < 4) {
      setRegStatus({ type: 'error', message: 'يرجى إدخال كلمة مرور صالحة (4 رموز على الأكثر/الأقل) لتأمين حساب المعلم وتفعيل دخوله.' });
      return;
    }

    const path = 'teachers';
    try {
      // Create contact string
      let contactDetail = contact;
      if (phone && email) {
        contactDetail = `${phone} - ${email}`;
      } else if (phone) {
        contactDetail = phone;
      } else if (email) {
        contactDetail = email;
      }

      // Determine subjects
      let teacherSubjects = [...selectedSubjects];
      if (specialization.trim()) {
        const specs = specialization.split(',').map(s => s.trim()).filter(Boolean);
        specs.forEach(s => {
          if (!teacherSubjects.includes(s)) {
            teacherSubjects.push(s);
          }
        });
      }
      if (teacherSubjects.length === 0) {
        teacherSubjects = ['عام']; // Fallback so we NEVER fail because of subjects
      }

      await addDoc(collection(db, path), { 
        name: name.trim(), 
        subjects: teacherSubjects, 
        contact: contactDetail, 
        billingRate: bRate,
        payoutRate: pRate,
        hourlyRate: pRate, // Support legacy code
        specialization: specialization.trim(),
        email: email.trim(),
        phone: phone.trim(),
        username: username.trim(),
        password: password,
        tasksEnabled: tasksEnabled,
        academicRating: academicRating ? Number(academicRating) : 4.8
      });

      // Show success
      setRegStatus({ type: 'success', message: 'تم تسجيل المعلم الجديد بنجاح وحفظ البيانات المالية والوظيفية بالنظام!' });
      
      // Clear inputs
      setName(''); 
      setSelectedSubjects([]); 
      setContact(''); 
      setBillingRate('');
      setPayoutRate('');
      setHourlyRate('');
      setSpecialization('');
      setPhone('');
      setEmail('');
      setUsername('');
      setPassword('');
      setTasksEnabled(false);
      setAcademicRating(4.8);

      fetchData();

      // Automatically clear alert after 5s
      setTimeout(() => {
        setRegStatus(null);
      }, 5000);

    } catch (error) {
      console.error("Error storing teacher in firestore:", error);
      setRegStatus({ type: 'error', message: 'حدث خطأ غير متوقع أثناء الاتصال بقاعدة البيانات. الرجاء المحاولة مجدداً.' });
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const handleUpdateTeacher = async () => {
    if (!selectedTeacherId || !editTeacherName.trim()) return;
    try {
      const teacherRef = doc(db, 'teachers', selectedTeacherId);
      const bRate = Number(editTeacherBilling) || 0;
      const pRate = Number(editTeacherPayout) || 0;
      const oldTeacher = teachers.find(t => t.id === selectedTeacherId);

      const finalUsername = (editTeacherUsername.trim() || oldTeacher?.username || '').toLowerCase();
      const finalPassword = editTeacherPassword || oldTeacher?.password || '123456';

      // Check conflict if username changed
      if (finalUsername && finalUsername !== (oldTeacher?.username || '').toLowerCase()) {
        const conflict = teachers.find(t => t.id !== selectedTeacherId && (t.username || '').toLowerCase() === finalUsername);
        if (conflict) {
          alert(`اسم المستخدم "${finalUsername}" مستخدم بالفعل لمعلم آخر (${conflict.name}). يرجى اختيار اسم مستخدم مختلف.`);
          return;
        }
      }
      
      const updateData = {
        name: editTeacherName.trim(),
        billingRate: bRate,
        payoutRate: pRate,
        hourlyRate: pRate, // legacy support 
        subjects: editTeacherSubjects,
        phone: editTeacherPhone.trim(),
        email: editTeacherEmail.trim(),
        specialization: editTeacherSpecialization.trim(),
        contact: editTeacherPhone.trim() || editTeacherContact.trim(), // contact is often mapped with phone
        username: finalUsername,
        password: finalPassword,
        tasksEnabled: editTeacherTasksEnabled,
        academicRating: editTeacherAcademicRating ? Number(editTeacherAcademicRating) : 4.8
      };

      await updateDoc(teacherRef, updateData);

      const oldPayout = oldTeacher?.payoutRate || oldTeacher?.hourlyRate || 0;
      const oldBilling = oldTeacher?.billingRate || 0;
      const rateChanged = oldPayout !== pRate || oldBilling !== bRate;

      await logActivity({
        actionType: rateChanged ? 'UPDATE_TEACHER_RATE' : 'UPDATE_TEACHER',
        actionName: rateChanged ? 'تعديل أسعار ساعات المعلم' : 'تعديل بيانات المعلم',
        teacherId: selectedTeacherId,
        teacherName: editTeacherName.trim(),
        details: rateChanged 
          ? `تم تحديث أسعار ساعات المعلم "${editTeacherName.trim()}" (أجر المعلم: من ₪${oldPayout} إلى ₪${pRate} | سعر الطالب: من ₪${oldBilling} إلى ₪${bRate})`
          : `تم تحديث بيانات المعلم "${editTeacherName.trim()}" (المادة: ${editTeacherSpecialization || 'عام'}، الهاتف: ${editTeacherPhone || 'لا يوجد'})`,
        previousValue: { payout: oldPayout, billing: oldBilling },
        newValue: { payout: pRate, billing: bRate }
      });

      setTeachers(prev => prev.map(t => t.id === selectedTeacherId ? {
        ...t,
        ...updateData
      } : t));
      setIsEditingTeacher(false);
    } catch (error) {
      console.error("Error updating teacher in Firestore:", error);
      handleFirestoreError(error, OperationType.WRITE, `teachers/${selectedTeacherId}`);
    }
  };

  const handleQuickUpdateRate = async () => {
    if (!quickEditRateTeacher) return;
    const payout = Number(quickEditPayoutRate);
    const billing = Number(quickEditBillingRate);
    const session40Payout = Number(quickEditSession40PayoutRate);
    const session40Billing = Number(quickEditSession40BillingRate);

    if (isNaN(payout) || payout < 0) {
      setQuickRateError('يرجى إدخال أجر معلم صحيح بالساعة (أكبر من أو يساوي صفر).');
      return;
    }
    if (isNaN(billing) || billing < 0) {
      setQuickRateError('يرجى إدخال سعر فوترة صحيح للطلاب بالساعة (أكبر من أو يساوي صفر).');
      return;
    }
    if (isNaN(session40Payout) || session40Payout < 0) {
      setQuickRateError('يرجى إدخال أجر صحيح للمعلم لحصة 40 دقيقة (الابتدائي).');
      return;
    }
    if (isNaN(session40Billing) || session40Billing < 0) {
      setQuickRateError('يرجى إدخال سعر فوترة صحيح للطلاب لحصة 40 دقيقة (الابتدائي).');
      return;
    }

    setIsSubmittingQuickRate(true);
    setQuickRateError('');

    try {
      const teacherRef = doc(db, 'teachers', quickEditRateTeacher.id);
      const updateData: any = {
        payoutRate: payout,
        hourlyRate: payout, // Legacy support
        billingRate: billing,
        primarySchoolSessionPayout: session40Payout,
        primarySchoolSessionRate: session40Billing,
        sessionPayoutRate: session40Payout,
        sessionRate: session40Billing,
      };

      await updateDoc(teacherRef, updateData);

      // If quickEditApplyToPrimary is checked, sync all linked elementary students & their assignments
      if (quickEditApplyToPrimary) {
        const linkedStudents = students.filter(s => 
          s.teachers?.includes(quickEditRateTeacher.id) ||
          assignments.some(a => a.studentId === s.id && a.teacherId === quickEditRateTeacher.id)
        );

        for (const s of linkedStudents) {
          const isElementary = 
            s.preferredPricingUnit === 'session_40' ||
            s.sessionSystem === 'session_40' ||
            (s.grade ? getDefaultPricingUnitForGrade(s.grade) === 'session_40' : false);

          if (isElementary) {
            // Update student doc
            const studentRef = doc(db, 'students', s.id);
            const studentUpdate = {
              preferredPricingUnit: 'session_40',
              sessionSystem: 'session_40',
              defaultSessionDurationMinutes: 40,
              sessionRate: session40Billing,
              sessionPayoutTeacher: session40Payout,
              primarySchoolSessionRate: session40Billing,
              primarySchoolSessionPayout: session40Payout,
              customRates: {
                ...(s.customRates || {}),
                [quickEditRateTeacher.id]: session40Billing
              },
              customPayoutRates: {
                ...(s.customPayoutRates || {}),
                [quickEditRateTeacher.id]: session40Payout
              }
            };
            await updateDoc(studentRef, studentUpdate);

            // Update assignment doc if exists
            const assDoc = assignments.find(a => a.studentId === s.id && a.teacherId === quickEditRateTeacher.id);
            if (assDoc) {
              const assRef = doc(db, 'assignments', assDoc.id);
              await updateDoc(assRef, {
                pricingUnit: 'session_40',
                sessionDurationMinutes: 40,
                studentBillingRate: session40Billing,
                teacherPayoutRate: session40Payout,
                updatedAt: new Date().toISOString()
              });
            }
          }
        }
      }

      setTeachers(prev => prev.map(t => t.id === quickEditRateTeacher.id ? {
        ...t,
        ...updateData
      } : t));

      await logActivity({
        actionType: 'UPDATE_TEACHER_RATE_QUICK',
        actionName: 'تحديث سريع لأسعار المعلم',
        details: `تم تحديث أسعار المعلم ${quickEditRateTeacher.name} سريعاً (الساعة: أجر ₪${payout} / فوترة ₪${billing} | حصة 40د: أجر ₪${session40Payout} / فوترة ₪${session40Billing})`
      });

      if (quickEditApplyToPrimary) {
        await fetchData();
      }

      setQuickEditRateTeacher(null);
    } catch (error) {
      console.error("Error updating teacher rate quick:", error);
      setQuickRateError('حدث خطأ أثناء تحديث الأسعار. الرجاء المحاولة مجدداً.');
    } finally {
      setIsSubmittingQuickRate(false);
    }
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subject) 
        ? prev.filter(s => s !== subject) 
        : [...prev, subject]
    );
  };

  const deleteTeacher = (id: string) => {
    setDeleteConfirm({ id, type: 'teacher' });
  };

  const executeDeleteTeacher = async (id: string) => {
    const path = `teachers/${id}`;
    try {
      const teacherToDelete = teachers.find(t => t.id === id);
      const teacherName = teacherToDelete?.name || 'معلم';
      const spec = teacherToDelete?.specialization || 'غير محدد';
      const phone = teacherToDelete?.phone || teacherToDelete?.contact || 'لا يوجد';

      await deleteDoc(doc(db, 'teachers', id));

      await logActivity({
        actionType: 'DELETE_TEACHER',
        actionName: 'حذف معلّم نهائياً',
        teacherId: id,
        teacherName: teacherName,
        details: `قام مدير المنصة بحذف المعلم "${teacherName}" (التخصص: ${spec}، الهاتف: ${phone}) بشكل نهائي من قاعدة بيانات النظام وكافة سجلاته.`
      });

      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleDeletePayment = (id: string) => {
    setDeleteConfirm({ id, type: 'payment' });
  };

  const executeDeletePayment = async (id: string) => {
    const path = `payments/${id}`;
    try {
      const originalPayment = payments.find(p => p.id === id);
      const teacherObj = originalPayment ? teachers.find(t => t.id === originalPayment.teacherId) : null;
      const teacherName = teacherObj ? teacherObj.name : 'معلم مجهول';
      const amount = originalPayment ? originalPayment.amount : 0;

      await deleteDoc(doc(db, 'payments', id));
      
      await logActivity({
        actionType: 'PAYMENT_DELETE',
        actionName: 'حذف دفعة معلم',
        details: `حذف الدفعة المالية للمدرس "${teacherName}" بقيمة: ₪${amount} (رقم الدفعة: ${id})`
      });

      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleArchivePayment = async (paymentId: string) => {
    try {
      const paymentRef = doc(db, 'payments', paymentId);
      await updateDoc(paymentRef, { archived: true });
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, archived: true } : p));
      await logActivity({
        actionType: 'PAYMENT_ARCHIVE',
        actionName: 'أرشفة دفعة مالية',
        details: `تم أرشفة الدفعة المالية للمعلم (رقم الدفعة: ${paymentId}) لتنظيف الواجهة وحفظ السجلات.`
      });
      fetchData();
    } catch (error) {
       console.error("Error archiving payment:", error);
    }
  };

  const handleUnarchivePayment = async (paymentId: string) => {
    try {
      const paymentRef = doc(db, 'payments', paymentId);
      await updateDoc(paymentRef, { archived: false });
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, archived: false } : p));
      await logActivity({
        actionType: 'PAYMENT_UNARCHIVE',
        actionName: 'استعادة دفعة مالية',
        details: `تم استعادة الدفعة المالية للمعلم من الأرشيف (رقم الدفعة: ${paymentId}).`
      });
      fetchData();
    } catch (error) {
       console.error("Error unarchiving payment:", error);
    }
  };

  const handleOpenConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayTeacher || !payAmount || Number(payAmount) <= 0) return;
    setIsConfirmPaymentOpen(true);
  };

  const handleCreatePayment = async () => {
    if (!selectedPayTeacher || !payAmount || Number(payAmount) <= 0) return;

    setIsConfirmPaymentOpen(false);
    setIsSubmittingPayment(true);
    const path = 'payments';
    try {
      const pNote = payNote.trim() || 'صرف مستحقات المعلم';
      await addDoc(collection(db, path), {
        teacherId: selectedPayTeacher.id,
        amount: Number(payAmount),
        date: payDate,
        note: pNote
      });

      await logActivity({
        actionType: 'PAYMENT_CREATE',
        actionName: 'صرف مالي لمعلم',
        details: `صرف مالي للمعلم: "${selectedPayTeacher.name}" بمبلغ: ₪${payAmount} بتاريخ: ${payDate} بملاحظة: "${pNote}"`,
        amount: Number(payAmount)
      });

      setPaymentSuccess(true);
      await fetchData();

      setTimeout(() => {
        setPaymentSuccess(false);
        setIsPaymentModalOpen(false);
        setSelectedPayTeacher(null);
        setPayAmount('');
        setPayNote('');
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleOpenEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setEditPayAmount(payment.amount !== undefined ? payment.amount : '');
    setEditPayDate(payment.date || '');
    setEditPayNote(payment.note || '');
    setEditPayTeacherId(payment.teacherId || selectedTeacherId || '');
    setIsEditPaymentModalOpen(true);
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment || !editPayAmount || Number(editPayAmount) <= 0 || !editPayDate) return;

    setIsSubmittingEditPayment(true);
    const path = 'payments';
    try {
      const pNote = editPayNote.trim() || 'صرف مستحقات المعلم';
      const paymentRef = doc(db, path, editingPayment.id);
      const targetTeacherId = editPayTeacherId || editingPayment.teacherId || selectedTeacherId;
      const teacherObj = teachers.find(t => t.id === targetTeacherId);
      const teacherName = teacherObj?.name || 'معلم مجهول';
      
      await updateDoc(paymentRef, {
        amount: Number(editPayAmount),
        date: editPayDate,
        note: pNote,
        teacherId: targetTeacherId
      });

      await logActivity({
        actionType: 'PAYMENT_UPDATE',
        actionName: 'تعديل دفعة معلم',
        details: `تعديل الدفعة المالية للمدرس "${teacherName}" (رقم الدفعة: ${editingPayment.id}) من قيمة: ₪${editingPayment.amount} إلى قيمة: ₪${editPayAmount}، وتغيير الملاحظة لـ: "${pNote}" والتاريخ لـ: ${editPayDate}`
      });

      setPayments(prev => prev.map(p => p.id === editingPayment.id ? {
        ...p,
        amount: Number(editPayAmount),
        date: editPayDate,
        note: pNote,
        teacherId: targetTeacherId
      } : p));

      setEditPaymentSuccess(true);
      await fetchData();

      setTimeout(() => {
        setEditPaymentSuccess(false);
        setIsEditPaymentModalOpen(false);
        setEditingPayment(null);
        setEditPayAmount('');
        setEditPayNote('');
        setEditPayDate('');
        setEditPayTeacherId('');
      }, 1500);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setIsSubmittingEditPayment(false);
    }
  };

  const handleBookSession = async () => {
    if (!bookingTeacher || !bookingStudent || !bookingSubject) return;
    setIsSubmitting(true);
    const path = 'sessions';
    try {
      await addDoc(collection(db, path), {
        teacherId: bookingTeacher.id,
        studentId: bookingStudent.id,
        subject: bookingSubject || 'عام',
        durationHours: bookingDuration,
        date: bookingDate,
        createdAt: new Date().toISOString(),
        approved: bookingApproved
      });
      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setBookingTeacher(null);
        setBookingStudent(null);
        setBookingApproved(true);
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  const linkStudentToTeacher = async (studentId: string) => {
    if (!selectedTeacherId) return;
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const updatedTeachers = [...(student.teachers || []), selectedTeacherId];
    const path = `students/${studentId}`;
    
    try {
      const { updateDoc, doc, addDoc, collection } = await import('firebase/firestore');
      await updateDoc(doc(db, 'students', studentId), {
        teachers: updatedTeachers,
        status: StudentStatus.Assigned,
        updatedAt: new Date().toISOString()
      });

      // Ensure assignments collection document exists for bidirectional reliability
      const existingAssignment = assignments.find(a => a.studentId === studentId && a.teacherId === selectedTeacherId);
      if (!existingAssignment) {
        await addDoc(collection(db, 'assignments'), {
          studentId: studentId,
          teacherId: selectedTeacherId,
          createdAt: new Date().toISOString(),
          priority: 'medium',
          source: 'teacher_management'
        });
      }

      setIsLinkingStudent(false);
      setStudentSearchForLink('');
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const unlinkStudentFromTeacher = (studentId: string) => {
    setDeleteConfirm({ id: studentId, type: 'unlink-student' });
  };

  const executeUnlinkStudent = async (studentId: string) => {
    if (!selectedTeacherId) return;
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    const updatedTeachers = (student.teachers || []).filter(id => id !== selectedTeacherId);
    const path = `students/${studentId}`;

    try {
      const { updateDoc, doc, deleteDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'students', studentId), {
        teachers: updatedTeachers,
        status: updatedTeachers.length > 0 ? StudentStatus.Assigned : StudentStatus.Unassigned,
        updatedAt: new Date().toISOString()
      });

      // Also clean up assignment record
      const existingAssignment = assignments.find(a => a.studentId === studentId && a.teacherId === selectedTeacherId);
      if (existingAssignment && existingAssignment.id) {
        await deleteDoc(doc(db, 'assignments', existingAssignment.id));
      }

      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const saveCustomStudentRates = async () => {
    if (!selectedStudentForRates || !selectedTeacherId) return;
    try {
      // Find if assignment exists
      const studentAssignment = assignments.find(a => a.studentId === selectedStudentForRates.id && a.teacherId === selectedTeacherId);
      const payRate = Number(customPayoutInput) || 0;
      const billRate = Number(customBillingInput) || 0;

      if (studentAssignment) {
        // Update assignment doc
        const assRef = doc(db, 'assignments', studentAssignment.id);
        await updateDoc(assRef, {
          teacherPayoutRate: payRate,
          studentBillingRate: billRate,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Create a new assignment doc
        await addDoc(collection(db, 'assignments'), {
          studentId: selectedStudentForRates.id,
          teacherId: selectedTeacherId,
          teacherPayoutRate: payRate,
          studentBillingRate: billRate,
          createdAt: new Date().toISOString()
        });
      }

      // Also update student.customRates for billing consistency
      const studentRef = doc(db, 'students', selectedStudentForRates.id);
      const currentCustomRates = selectedStudentForRates.customRates || {};
      const updatedCustomRates = {
        ...currentCustomRates,
        [selectedTeacherId]: billRate
      };
      await updateDoc(studentRef, {
        customRates: updatedCustomRates
      });

      // Log activity
      await logActivity({
        actionType: 'UPDATE_ASSIGNMENT_RATES',
        actionName: 'تحديث تسعير خاص لطالب',
        details: `تم تحديث تسعير خاص للطالب (${selectedStudentForRates.name}) مع المعلم (${teachers.find(t => t.id === selectedTeacherId)?.name}) - أجر المعلم: ₪${payRate}، سعر الفوترة: ₪${billRate}`
      });

      alert('تم حفظ التسعير المخصص بنجاح! 🎉');
      setIsEditingCustomRates(false);
      setSelectedStudentForRates(null);
      fetchData(); // Refresh assignments
    } catch (error) {
      console.error("Error saving custom student rates:", error);
      alert('حدث خطأ أثناء حفظ التعديل.');
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    setDeleteConfirm({ id: sessionId, type: 'session' });
  };

  const executeDeleteSession = async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    const student = students.find(s => s.id === session.studentId);
    
    try {
      await deleteDoc(doc(db, 'sessions', sessionId));
      await logActivity({
        actionType: 'DELETE_TASK',
        actionName: 'حذف حصة دراسية',
        details: `قام المدير بحذف حصة دراسية مسجلة للطالب ${student?.name || 'مجهول'} بمادة ${session.subject || 'مجهول'} ومدتها ${session.durationHours} ساعة.`
      });
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sessions/${sessionId}`);
    }
  };

  const getAssignedStudents = (teacherId: string) => {
    return students.filter(s => 
      (s.teachers && s.teachers.includes(teacherId)) ||
      assignments.some(a => a.studentId === s.id && a.teacherId === teacherId)
    );
  };

  const getTeacherPreviousMonthsBalance = (teacherId: string) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;

    const prevSessions = sessions.filter(s => {
      if (s.teacherId !== teacherId || s.approved === false || s.status === 'pending' || s.status === 'booked' || !s.date) return false;
      return s.date < currentMonthStr;
    });

    const teacher = teachers.find(t => t.id === teacherId);
    const actualPayoutRate = teacher?.payoutRate || teacher?.hourlyRate || 0;

    const totalPrevEarned = prevSessions.reduce((sum, s) => {
      if (s.customTeacherFee !== undefined) return sum + s.customTeacherFee;
      if (s.customPayout !== undefined) return sum + s.customPayout;
      const ass = assignments.find(a => a.studentId === s.studentId && a.teacherId === teacherId);
      const rate = (ass && ass.teacherPayoutRate !== undefined && ass.teacherPayoutRate !== 0) ? ass.teacherPayoutRate : actualPayoutRate;
      return sum + (s.durationHours * rate);
    }, 0);

    const prevPayments = payments.filter(p => {
      if (p.teacherId !== teacherId || !p.date) return false;
      return p.date < currentMonthStr;
    });

    const totalPrevPaid = prevPayments.reduce((sum, p) => sum + p.amount, 0);

    return totalPrevEarned - totalPrevPaid;
  };

  const handleBulkSettlePreviousMonthsDues = async () => {
    setIsSubmittingSettleDues(true);
    try {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      const firstDayCurrentMonth = new Date(currentYear, currentMonth - 1, 1);
      const lastDayPrevMonth = new Date(firstDayCurrentMonth.getTime() - 24 * 60 * 60 * 1000);
      const lastDayPrevMonthStr = lastDayPrevMonth.toISOString().split('T')[0];

      const promises: Promise<any>[] = [];
      let totalAmountSettled = 0;
      let teachersSettledCount = 0;

      for (const t of teachers) {
        if (selectedTeachersToSettle[t.id]) {
          const bal = getTeacherPreviousMonthsBalance(t.id);
          if (bal > 0) {
            totalAmountSettled += bal;
            teachersSettledCount++;
            
            // Add payment record
            promises.push(
              addDoc(collection(db, 'payments'), {
                teacherId: t.id,
                amount: Number(bal.toFixed(2)),
                date: lastDayPrevMonthStr,
                note: `تصفير تلقائي لمستحقات نهاية الشهر السابق (${lastDayPrevMonthStr}) - تم الدفع`
              })
            );

            // Log activity
            promises.push(
              logActivity({
                actionType: 'PAYMENT_CREATE',
                actionName: 'صرف مستحقات الأشهر السابقة تلقائياً',
                details: `تصفير تلقائي وتسوية مستحقات المعلم "${t.name}" للأشهر السابقة بمبلغ: ₪${bal.toFixed(2)} بتاريخ نهاية الشهر الماضي: ${lastDayPrevMonthStr}`,
                amount: Number(bal.toFixed(2))
              })
            );
          }
        }
      }

      if (promises.length > 0) {
        await Promise.all(promises);
        await fetchData();
      }

      setSettleDuesSuccess(true);
      setTimeout(() => {
        setSettleDuesSuccess(false);
        setIsSettleDuesModalOpen(false);
      }, 2500);

    } catch (error) {
      console.error("Error settling previous dues:", error);
      alert("حدث خطأ أثناء عملية تسوية المستحقات. يرجى المحاولة لاحقاً.");
    } finally {
      setIsSubmittingSettleDues(false);
    }
  };

  const getTeacherStats = (teacherId: string, startDate?: string, endDate?: string) => {
    let teacherSessions = sessions.filter(s => s.teacherId === teacherId && s.approved !== false && s.status !== 'pending' && s.status !== 'booked');
    let teacherPayments = payments.filter(p => p.teacherId === teacherId);
    
    // Apply date range filters if present
    if (startDate) {
      teacherSessions = teacherSessions.filter(s => s.date >= startDate);
      teacherPayments = teacherPayments.filter(p => p.date >= startDate);
    }
    if (endDate) {
      teacherSessions = teacherSessions.filter(s => s.date <= endDate);
      teacherPayments = teacherPayments.filter(p => p.date <= endDate);
    }
    
    const totalHours = teacherSessions.reduce((sum, s) => sum + (Number(s.durationHours) || 0), 0);
    
    const teacher = teachers.find(t => t.id === teacherId);
    const actualPayoutRate = teacher?.payoutRate || teacher?.hourlyRate || 35;
    
    const totalEarnings = teacherSessions.reduce((sum, s) => {
      const studentObj = students.find(st => st.id === s.studentId);
      const stage = getAcademicStage(studentObj?.grade || studentObj?.academicLevel || (studentObj as any)?.academicStage || '');
      const isHourly = s.pricingUnit === 'hourly' || stage === 'secondary' || stage === 'middle' || studentObj?.sessionSystem === 'hours';
      if (isHourly) {
        const ass = assignments.find(a => a.studentId === s.studentId && a.teacherId === teacherId);
        const rate = (ass && ass.teacherPayoutRate !== undefined && ass.teacherPayoutRate !== 0) ? ass.teacherPayoutRate : actualPayoutRate;
        return sum + ((Number(s.durationHours) || 1) * rate);
      }
      return sum + calculateTeacherSessionPayout(s, teacher, assignments, actualPayoutRate);
    }, 0);

    const totalRevenue = teacherSessions.reduce((sum, s) => {
      const studentObj = students.find(st => st.id === s.studentId);
      const teacherObj = teachers.find(t => t.id === s.teacherId);
      const ass = assignments.find(a => a.studentId === s.studentId && a.teacherId === teacherId);
      
      const rate = (ass && ass.studentBillingRate !== undefined && ass.studentBillingRate !== 0)
        ? ass.studentBillingRate
        : (studentObj?.customRates?.[s.teacherId] !== undefined
          ? studentObj.customRates[s.teacherId]
          : (studentObj?.hourlyRate
            ? studentObj.hourlyRate
            : (teacherObj?.billingRate || teacherObj?.hourlyRate || billingRate || 60)));

      const stage = getAcademicStage(studentObj?.grade || studentObj?.academicLevel || (studentObj as any)?.academicStage || '');
      const isHourly = s.pricingUnit === 'hourly' || stage === 'secondary' || stage === 'middle' || studentObj?.sessionSystem === 'hours';
      if (isHourly) {
        return sum + ((Number(s.durationHours) || 1) * rate);
      }
      if (s.customFee !== undefined) return sum + s.customFee;
      return sum + ((Number(s.durationHours) || 1) * rate);
    }, 0);

    const totalReceived = teacherPayments.reduce((sum, p) => sum + p.amount, 0);
    const balance = totalEarnings - totalReceived;

    return {
      totalHours,
      totalEarnings,
      totalRevenue,
      totalReceived,
      balance,
      sessions: teacherSessions.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        const dateComp = dateB.localeCompare(dateA);
        if (dateComp !== 0) return dateComp;
        const createA = a.createdAt || '';
        const createB = b.createdAt || '';
        return createB.localeCompare(createA);
      }),
      payments: teacherPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  };

  const exportTeacherToExcel = (teacherId: string, startDate?: string, endDate?: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;

    // Get stats for chosen period
    const stats = getTeacherStats(teacherId, startDate, endDate);

    const actualPayoutRate = teacher.payoutRate || teacher.hourlyRate || 0;

    // Gather and map sessions for periods
    const sessionTx = stats.sessions.map(s => {
      const student = students.find(sd => sd.id === s.studentId);
      const ass = assignments.find(a => a.studentId === s.studentId && a.teacherId === teacherId);
      const rate = (ass && ass.teacherPayoutRate !== undefined && ass.teacherPayoutRate !== 0) ? ass.teacherPayoutRate : actualPayoutRate;
      const stage = getAcademicStage(student?.grade || student?.academicLevel || (student as any)?.academicStage || '');
      const isHourly = s.pricingUnit === 'hourly' || stage === 'secondary' || stage === 'middle' || student?.sessionSystem === 'hours';
      const compensation = isHourly 
        ? ((Number(s.durationHours) || 1) * rate)
        : (s.customTeacherFee !== undefined ? s.customTeacherFee : (s.customPayout !== undefined ? s.customPayout : (s.durationHours * rate)));
      return {
        date: s.date || '',
        createdAt: s.createdAt || '',
        type: 'مستحقات حصّة تعليمية',
        details: `مادة: ${s.subject} - الطالب: ${student?.name || 'غير معروف'}`,
        hours: s.durationHours,
        durationMins: s.durationHours * 60,
        amount: compensation,
        isPayment: false
      };
    });

    // Gather and map payments for periods
    const paymentTx = stats.payments.map(p => {
      return {
        date: p.date || '',
        createdAt: p.createdAt || '',
        type: 'دفعة مستلمة (صرف مالي)',
        details: p.notes || 'صرف مستحقات المعلم',
        hours: 0,
        durationMins: 0,
        amount: p.amount,
        isPayment: true
      };
    });

    // Sort chronologically ascending
    const allTx = [...sessionTx, ...paymentTx].sort((a, b) => {
      const dateComp = (a.date || '').localeCompare(b.date || '');
      if (dateComp !== 0) return dateComp;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    // Calculate opening balance before startDate
    let openingBalance = 0;
    if (startDate) {
      const totalCompensationBefore = sessions
        .filter(s => s.teacherId === teacherId && s.approved !== false && s.status !== 'pending' && s.status !== 'booked' && s.date < startDate)
        .reduce((sum, s) => {
          if (s.customTeacherFee !== undefined) return sum + s.customTeacherFee;
          if (s.customPayout !== undefined) return sum + s.customPayout;
          const ass = assignments.find(a => a.studentId === s.studentId && a.teacherId === teacherId);
          const rate = (ass && ass.teacherPayoutRate !== undefined && ass.teacherPayoutRate !== 0) ? ass.teacherPayoutRate : actualPayoutRate;
          return sum + (s.durationHours * rate);
        }, 0);

      const totalPaymentsBefore = payments
        .filter(p => p.teacherId === teacherId && p.date < startDate)
        .reduce((sum, p) => sum + p.amount, 0);

      openingBalance = totalCompensationBefore - totalPaymentsBefore;
    }

    const dataRows = [];
    let cumulativeDues = openingBalance;

    if (startDate) {
      dataRows.push([
        formatCustomDate(startDate),
        'رصيد مستحقات افتتاحي (مرحل)',
        `مستحقات المعلم السابقة قبل تاريخ ${formatCustomDate(startDate)}`,
        '',
        '',
        openingBalance >= 0 ? `₪${openingBalance.toFixed(1)}` : '',
        openingBalance < 0 ? `₪${Math.abs(openingBalance).toFixed(1)}` : '',
        `₪${cumulativeDues.toFixed(1)}`
      ]);
    }

    allTx.forEach(tx => {
      if (tx.isPayment) {
        cumulativeDues -= tx.amount;
      } else {
        cumulativeDues += tx.amount;
      }
      
      dataRows.push([
        formatCustomDate(tx.date),
        tx.type,
        tx.details,
        tx.hours > 0 ? `${tx.hours.toFixed(1)} س` : '',
        tx.durationMins > 0 ? `${tx.durationMins} د` : '',
        !tx.isPayment ? `₪${tx.amount.toFixed(1)}` : '',
        tx.isPayment ? `₪${tx.amount.toFixed(1)}` : '',
        `₪${cumulativeDues.toFixed(1)}`
      ]);
    });

    const sheetData = [
      [`تقرير كشف الحساب والعمليات المالية للأستاذ: ${teacher.name}`],
      [`تاريخ الإصدار: ${formatCustomDate(new Date().toISOString().split('T')[0])} | سعر ساعة التدريس المعتمد للمعلم: ₪${actualPayoutRate}/ساعة`],
      [
        startDate && endDate 
          ? `الفترة المحددة: من ${formatCustomDate(startDate)} إلى ${formatCustomDate(endDate)}`
          : startDate 
            ? `الفترة المحددة: ابتداءً من ${formatCustomDate(startDate)}`
            : endDate 
              ? `الفترة المحددة: حتى تاريخ ${formatCustomDate(endDate)}`
              : 'الفترة المحددة: كافة الفترات (سجل كلي)'
      ],
      [], // Spacing Row
      [
        "تاريخ الحركة",
        "نوع الحركة",
        "التفاصيل والبيان",
        "عدد الساعات",
        "مدة الحصة بالدقيقة",
        "المستحقات المضافة (+)",
        "المدفوعات المصروفة (-)",
        "الرصيد المتبقي المستحق للمعلم"
      ],
      ...dataRows,
      [],
      [
        "إجمالي مستحقات الفترة:",
        `₪${allTx.filter(tx => !tx.isPayment).reduce((sum, tx) => sum + tx.amount, 0).toFixed(1)}`,
        "إجمالي المدفوعات المستلمة الفترة:",
        `₪${allTx.filter(tx => tx.isPayment).reduce((sum, tx) => sum + tx.amount, 0).toFixed(1)}`,
        "إجمالي ساعات التدريس (الفترة):",
        `${allTx.filter(tx => !tx.isPayment).reduce((sum, tx) => sum + tx.hours, 0).toFixed(1)} س`,
        "رصيد المعلم المستحق الكلي:",
        `₪${cumulativeDues.toFixed(1)}`
      ]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    worksheet['!cols'] = [
      { wch: 15 }, // Date
      { wch: 22 }, // Type
      { wch: 45 }, // Details
      { wch: 15 }, // Hours
      { wch: 15 }, // Duration mins
      { wch: 18 }, // Added dues
      { wch: 18 }, // Payments paid
      { wch: 22 }  // Remaining balance
    ];

    // Configure fit to 1 page settings
    worksheet['!pageSetup'] = { fitToPage: true, fitToWidth: 1, fitToHeight: 1 };
    worksheet['!views'] = [{ showGridLines: true }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "كشف حساب المعلم");
    XLSX.writeFile(workbook, `كشف_حساب_المعلم_${teacher.name.replace(/\s+/g, '_')}.xlsx`);
  };

  const exportFilteredTeachersToExcel = () => {
    // Generate data for XLSX
    const data = filteredTeachers.map((t, index) => {
      const stats = getTeacherStats(t.id);
      const assignedStudents = getAssignedStudents(t.id);
      const studentNames = assignedStudents.map(s => s.name).join(', ') || 'لا يوجد طلاب منسوبين حالياً';

      return {
        'الرقم م/أ': index + 1,
        'اسم المعلم': t.name,
        'التنسيق / الاتصال': t.contact || 'غير متوفر',
        'البريد الإلكتروني': t.email || 'غير متوفر',
        'المواد التعليمية': t.subjects && t.subjects.length > 0 ? t.subjects.join(', ') : 'غير محدد',
        'الطلاب المنسوبين': studentNames,
        'سعر الساعة للفوترة (₪)': t.billingRate || t.hourlyRate || 0,
        'سعر الساعة للصرف للمعلم (₪)': t.payoutRate || t.hourlyRate || 0,
        'رصيد المستحقات الحالي (₪)': stats.balance,
        'إجمالي مستحقات الحصص (₪)': stats.totalEarnings,
        'إجمالي المدفوع المالي (₪)': stats.totalReceived,
        'مجموع ساعات العمل': stats.totalHours,
        'تاريخ التسجيل بالمنصة': t.createdAt ? new Date(t.createdAt).toLocaleDateString('ar-EG') : 'غير متوفر'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data, { header: [
      'الرقم م/أ', 'اسم المعلم', 'التنسيق / الاتصال', 'البريد الإلكتروني', 'المواد التعليمية',
      'الطلاب المنسوبين', 'سعر الساعة للفوترة (₪)', 'سعر الساعة للصرف للمعلم (₪)',
      'رصيد المستحقات الحالي (₪)', 'إجمالي مستحقات الحصص (₪)', 'إجمالي المدفوع المالي (₪)',
      'مجموع ساعات العمل', 'تاريخ التسجيل بالمنصة'
    ] });
    
    // Set column widths for beautiful layout
    worksheet['!cols'] = [
      { wch: 10 }, // No
      { wch: 25 }, // Name
      { wch: 18 }, // Contact
      { wch: 22 }, // Email
      { wch: 25 }, // Subjects
      { wch: 35 }, // Students
      { wch: 18 }, // Billing Rate
      { wch: 18 }, // Payout Rate
      { wch: 20 }, // Balance
      { wch: 20 }, // Total earnings
      { wch: 20 }, // Total received
      { wch: 15 }, // Total hours
      { wch: 18 }  // Reg Date
    ];

    // Configure fit to 1 page wide settings
    worksheet['!pageSetup'] = { fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
    worksheet['!views'] = [{ showGridLines: true }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "بيانات المعلمين المفلترة");
    
    // Write file
    XLSX.writeFile(workbook, `سجل_المعلمين_المطابقين_للبحث_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportAllTeachersSalaryReport = async () => {
    if (teachers.length === 0) {
      alert("لا يوجد معلمون مسجلون لتصدير تقريرهم.");
      return;
    }

    try {
      // 1. Sheet 1: ملخص الرواتب والمستحقات
      const summaryRows = teachers.map((t, idx) => {
        // Calculate period stats
        const periodStats = getTeacherStats(t.id, globalReportStartDate, globalReportEndDate);
        
        // Calculate lifetime stats for current absolute balance
        const lifetimeStats = getTeacherStats(t.id);
        
        const actualPayoutRate = t.payoutRate || t.hourlyRate || 0;

        // Custom detailed payout calculation for sessions during period to handle custom compensations
        const periodEarnings = periodStats.sessions.reduce((sum, s) => {
          if (s.customTeacherFee !== undefined) return sum + s.customTeacherFee;
          if (s.customPayout !== undefined) return sum + s.customPayout;
          const ass = assignments.find(a => a.studentId === s.studentId && a.teacherId === t.id);
          const rate = (ass && ass.teacherPayoutRate !== undefined && ass.teacherPayoutRate !== 0) ? ass.teacherPayoutRate : actualPayoutRate;
          return sum + (s.durationHours * rate);
        }, 0);

        const periodPayments = periodStats.payments.reduce((sum, p) => sum + p.amount, 0);

        return {
          'ت': idx + 1,
          'اسم المعلم': t.name,
          'التخصص': t.specialization || 'عام',
          'اسم المستخدم': t.username || 'غير محدد',
          'سعر الساعة المقررة (₪)': actualPayoutRate,
          'عدد الحصص المنجزة للفترة': periodStats.sessions.length,
          'إجمالي ساعات العمل للفترة': parseFloat(periodStats.totalHours.toFixed(1)),
          'مستحقات الفترة المحتسبة (₪)': parseFloat(periodEarnings.toFixed(1)),
          'المدفوعات المصروفة للفترة (₪)': parseFloat(periodPayments.toFixed(1)),
          'الرصيد الإجمالي المستحق حالياً (₪)': parseFloat(lifetimeStats.balance.toFixed(1))
        };
      });

      // 2. Sheet 2: تفاصيل الحصص المفصلة لفترة
      const detailedSessions: any[] = [];
      teachers.forEach(t => {
        const actualPayoutRate = t.payoutRate || t.hourlyRate || 0;
        let teacherSessions = sessions.filter(s => s.teacherId === t.id && s.approved !== false && s.status !== 'pending' && s.status !== 'booked');
        if (globalReportStartDate) {
          teacherSessions = teacherSessions.filter(s => s.date >= globalReportStartDate);
        }
        if (globalReportEndDate) {
          teacherSessions = teacherSessions.filter(s => s.date <= globalReportEndDate);
        }

        teacherSessions.forEach(s => {
          const student = students.find(sd => sd.id === s.studentId);
          const ass = assignments.find(a => a.studentId === s.studentId && a.teacherId === t.id);
          const rate = (ass && ass.teacherPayoutRate !== undefined && ass.teacherPayoutRate !== 0) ? ass.teacherPayoutRate : actualPayoutRate;
          const payout = s.customTeacherFee !== undefined ? s.customTeacherFee : (s.customPayout !== undefined ? s.customPayout : (s.durationHours * rate));
          detailedSessions.push({
            'اسم المعلم': t.name,
            'تاريخ الحصة': s.date || 'غير محدد',
            'وقت البدء': s.startTime || '',
            'اسم الطالب': student?.name || 'غير معروف',
            'الصف / المستوى': student ? (student.grade || student.academicLevel || 'غير محدد') : 'غير محدد',
            'المادة / الموضوع': s.subject || 'غير محدد',
            'عدد الساعات': s.durationHours,
            'أجر الساعة المقررة (₪)': rate,
            'أجر المعلم المحتسب للحصة (₪)': payout,
            'ملاحظات الحصة': s.notes || ''
          });
        });
      });

      // 3. Sheet 3: تفاصيل الدفعات المصروفة لفترة
      const detailedPayments: any[] = [];
      teachers.forEach(t => {
        let teacherPayments = payments.filter(p => p.teacherId === t.id);
        if (globalReportStartDate) {
          teacherPayments = teacherPayments.filter(p => p.date >= globalReportStartDate);
        }
        if (globalReportEndDate) {
          teacherPayments = teacherPayments.filter(p => p.date <= globalReportEndDate);
        }

        teacherPayments.forEach(p => {
          detailedPayments.push({
            'اسم المعلم': t.name,
            'تاريخ الدفعة': p.date || 'غير محدد',
            'قيمة الدفعة المصروفة (₪)': p.amount,
            'بيان / ملاحظات الصرف': p.notes || 'صرف مستحقات المعلم'
          });
        });
      });

      const workbook = XLSX.utils.book_new();

      const formattedStartDate = globalReportStartDate ? formatCustomDate(globalReportStartDate) : 'البداية';
      const formattedEndDate = globalReportEndDate ? formatCustomDate(globalReportEndDate) : 'الآن';
      const periodRangeText = `الفترة الزمنية: من ${formattedStartDate} إلى ${formattedEndDate}`;

      const titleRow = [`تقرير مستحقات ورواتب المعلمين الموحد`];
      const descRow = [`تاريخ إصدار التقرير: ${formatCustomDate(new Date().toISOString().split('T')[0])} | ${periodRangeText}`];
      
      const summaryHeader = [
        'ت',
        'اسم المعلم',
        'التخصص',
        'اسم المستخدم',
        'سعر الساعة المقررة (₪)',
        'الحصص المنجزة للفترة',
        'ساعات التدريس للفترة',
        'مستحقات الفترة (₪)',
        'الدفعات المصروفة للفترة (₪)',
        'الرصيد الكلي حالياً (₪)'
      ];

      const sheet1AoA = [
        titleRow,
        descRow,
        [], // spacing
        summaryHeader,
        ...summaryRows.map(row => [
          row['ت'],
          row['اسم المعلم'],
          row['التخصص'],
          row['اسم المستخدم'],
          row['سعر الساعة المقررة (₪)'],
          row['عدد الحصص المنجزة للفترة'],
          row['إجمالي ساعات العمل للفترة'],
          row['مستحقات الفترة المحتسبة (₪)'],
          row['المدفوعات خلال الفترة (₪)'],
          row['الرصيد الإجمالي المستحق حالياً (₪)']
        ]),
        [], // spacing
        [
          'الإجمالي',
          'مجموع كافة المعلمين',
          '',
          '',
          '',
          summaryRows.reduce((sum, r) => sum + r['عدد الحصص المنجزة للفترة'], 0),
          parseFloat(summaryRows.reduce((sum, r) => sum + r['إجمالي ساعات العمل للفترة'], 0).toFixed(1)),
          parseFloat(summaryRows.reduce((sum, r) => sum + r['مستحقات الفترة المحتسبة (₪)'], 0).toFixed(1)),
          parseFloat(summaryRows.reduce((sum, r) => sum + r['المدفوعات خلال الفترة (₪)'], 0).toFixed(1)),
          parseFloat(summaryRows.reduce((sum, r) => sum + r['الرصيد الإجمالي المستحق حالياً (₪)'], 0).toFixed(1))
        ]
      ];

      const summaryWorksheet = XLSX.utils.aoa_to_sheet(sheet1AoA);
      
      summaryWorksheet['!cols'] = [
        { wch: 6 },  // 'ت'
        { wch: 25 }, // Name
        { wch: 22 }, // Spcl
        { wch: 18 }, // Username
        { wch: 22 }, // rate
        { wch: 24 }, // sessions
        { wch: 24 }, // hours
        { wch: 24 }, // dues period
        { wch: 26 }, // paid period
        { wch: 26 }  // total balance
      ];

      // Configure fit to 1 page settings
      summaryWorksheet['!pageSetup'] = { fitToPage: true, fitToWidth: 1, fitToHeight: 1 };
      summaryWorksheet['!views'] = [{ showGridLines: true }];

      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "ملخص المستحقات والرواتب");

      if (detailedSessions.length > 0) {
        const sessionsWorksheet = XLSX.utils.json_to_sheet(detailedSessions);
        sessionsWorksheet['!cols'] = [
          { wch: 25 }, // Teacher Name
          { wch: 15 }, // Date
          { wch: 12 }, // Time
          { wch: 22 }, // Student Name
          { wch: 15 }, // Grade
          { wch: 20 }, // Subject
          { wch: 12 }, // Hours
          { wch: 20 }, // Hourly rate
          { wch: 25 }, // Session compensation
          { wch: 35 }  // Notes
        ];
        // Configure fit to 1 page wide settings
        sessionsWorksheet['!pageSetup'] = { fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
        sessionsWorksheet['!views'] = [{ showGridLines: true }];

        XLSX.utils.book_append_sheet(workbook, sessionsWorksheet, "الحصص المنجزة بالتفصيل");
      }

      if (detailedPayments.length > 0) {
        const paymentsWorksheet = XLSX.utils.json_to_sheet(detailedPayments);
        paymentsWorksheet['!cols'] = [
          { wch: 25 }, // Teacher Name
          { wch: 15 }, // Payment Date
          { wch: 24 }, // Paid Amount
          { wch: 45 }  // Notes
        ];
        // Configure fit to 1 page wide settings
        paymentsWorksheet['!pageSetup'] = { fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
        paymentsWorksheet['!views'] = [{ showGridLines: true }];

        XLSX.utils.book_append_sheet(workbook, paymentsWorksheet, "الدفعات المصروفة بالتفصيل");
      }

      const fileNameStr = `تقرير_رواتب_ومستحقات_المعلمين_${globalReportStartDate || 'البداية'}_إلى_${globalReportEndDate || 'الآن'}.xlsx`.replace(/\s+/g, '_');
      XLSX.writeFile(workbook, fileNameStr);

      logActivity({
        actionType: 'EXPORT_SALARIES_EXCEL',
        actionName: 'تصدير رواتب المعلمين الموحد',
        details: `تصدير ملف رواتب وساعات ودفعات المعلمين الموحد للفترة من ${formattedStartDate} إلى ${formattedEndDate}`
      }).catch(err => console.error(err));

    } catch (excelError) {
      console.error("Error exporting all teachers excel report:", excelError);
      alert("فشل في إنشاء ملف التصدير. يرجى مراجعة نظام الدعم التقني.");
    }
  };

  const downloadPayrollTextReport = () => {
    if (teachers.length === 0) {
      alert("لا يوجد معلمون مسجلون لتوليد كشف الرواتب.");
      return;
    }

    const formattedStartDate = globalReportStartDate ? formatCustomDate(globalReportStartDate) : 'البداية';
    const formattedEndDate = globalReportEndDate ? formatCustomDate(globalReportEndDate) : 'الآن';
    const periodRangeText = `من ${formattedStartDate} إلى ${formattedEndDate}`;

    let txt = `================================================================================\n`;
    txt += `                    أكاديمية التفوق التعليمية - كشف الرواتب والمستحقات الموحد\n`;
    txt += `================================================================================\n`;
    txt += `تاريخ إصدار التقرير: ${new Date().toLocaleDateString('ar-EG')} | ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}\n`;
    txt += `نطاق الفرز المستهدف: ${periodRangeText}\n`;
    txt += `================================================================================\n\n`;

    txt += `[1] الملخص المالي العام لكافة المعلمين:\n`;
    txt += `--------------------------------------------------------------------------------\n`;
    
    let totalAllHours = 0;
    let totalAllPeriodEarnings = 0;
    let totalAllPeriodPayments = 0;
    let totalAllCurrentBalance = 0;

    const summaryData = teachers.map((t, idx) => {
      const periodStats = getTeacherStats(t.id, globalReportStartDate, globalReportEndDate);
      const lifetimeStats = getTeacherStats(t.id);
      const actualPayoutRate = t.payoutRate || t.hourlyRate || 0;
      
      const periodEarnings = periodStats.sessions.reduce((sum, s) => {
        if (s.customTeacherFee !== undefined) return sum + s.customTeacherFee;
        return sum + (s.durationHours * actualPayoutRate);
      }, 0);

      const periodPayments = periodStats.payments.reduce((sum, p) => sum + p.amount, 0);
      const currentBalance = lifetimeStats.balance;

      totalAllHours += periodStats.totalHours;
      totalAllPeriodEarnings += periodEarnings;
      totalAllPeriodPayments += periodPayments;
      totalAllCurrentBalance += currentBalance;

      return {
        idx: idx + 1,
        name: t.name,
        specialization: t.specialization || 'عام',
        rate: actualPayoutRate,
        sessionsCount: periodStats.sessions.length,
        hours: periodStats.totalHours,
        earnings: periodEarnings,
        payments: periodPayments,
        balance: currentBalance
      };
    });

    summaryData.forEach(item => {
      txt += `${item.idx}. المعلم: ${item.name}\n`;
      txt += `   - التخصص: ${item.specialization}\n`;
      txt += `   - سعر الساعة المقررة: ${item.rate} ₪\n`;
      txt += `   - الساعات المنجزة (للفترة): ${item.hours.toFixed(1)} ساعة (${item.sessionsCount} حصص)\n`;
      txt += `   - أجور الفترة المستحقة: ${item.earnings.toFixed(1)} ₪\n`;
      txt += `   - الدفعات المسددة (للفترة): ${item.payments.toFixed(1)} ₪\n`;
      txt += `   - الرصيد الإجمالي المعلق حالياً: ${item.balance.toFixed(1)} ₪\n`;
      txt += `--------------------------------------------------------------------------------\n`;
    });

    txt += `\n[2] مجاميع المؤشرات الكلية للمؤسسة:\n`;
    txt += `--------------------------------------------------------------------------------\n`;
    txt += `- إجمالي ساعات التدريس الكلية المنفذة: ${totalAllHours.toFixed(1)} ساعة\n`;
    txt += `- إجمالي الأجور المستحقة للفترة المحددة: ${totalAllPeriodEarnings.toFixed(1)} ₪\n`;
    txt += `- إجمالي المبالغ المدفوعة والمصروفة للفترة: ${totalAllPeriodPayments.toFixed(1)} ₪\n`;
    txt += `- إجمالي رصيد رواتب المعلمين المتراكم المستحق حالياً: ${totalAllCurrentBalance.toFixed(1)} ₪\n`;
    txt += `--------------------------------------------------------------------------------\n\n`;

    txt += `[3] كشف تفصيلي باللقاءات والحصص المرصودة (لكل معلم):\n`;
    txt += `================================================================================\n`;

    teachers.forEach(t => {
      const actualPayoutRate = t.payoutRate || t.hourlyRate || 0;
      let teacherSessions = sessions.filter(s => s.teacherId === t.id && s.approved !== false && s.status !== 'pending' && s.status !== 'booked');
      if (globalReportStartDate) {
        teacherSessions = teacherSessions.filter(s => s.date >= globalReportStartDate);
      }
      if (globalReportEndDate) {
        teacherSessions = teacherSessions.filter(s => s.date <= globalReportEndDate);
      }

      txt += `\n>> المعلم: ${t.name} (إجمالي اللقاءات: ${teacherSessions.length})\n`;
      txt += `--------------------------------------------------------------------------------\n`;
      if (teacherSessions.length === 0) {
        txt += `   * لا يوجد لقاءات مسجلة ومكتملة لهذا المعلم خلال الفترة المحددة.\n`;
      } else {
        teacherSessions.forEach((s, sIdx) => {
          const student = students.find(sd => sd.id === s.studentId);
          const payout = s.customTeacherFee !== undefined ? s.customTeacherFee : (s.durationHours * actualPayoutRate);
          txt += `   ${sIdx + 1}) التاريخ: ${s.date || 'غير محدد'} | الطالب: ${student?.name || 'غير معروف'} | المادة: ${s.subject || 'مادة عامة'} | الساعات: ${s.durationHours} ساعة | المستحق: ${payout} ₪\n`;
          if (s.notes) {
            txt += `      ملاحظات: ${s.notes}\n`;
          }
        });
      }
      txt += `--------------------------------------------------------------------------------\n`;
    });

    txt += `\n\n================================================================================\n`;
    txt += `                       نهاية تقرير كشف الرواتب - نظام التفوق التعليمي\n`;
    txt += `================================================================================\n`;

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `كشف_الرواتب_والمستحقات_الموحد_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    logActivity({
      actionType: 'EXPORT_SALARIES_TXT',
      actionName: 'تحميل كشف الرواتب الموحد TXT',
      details: `تم تحميل كشف الرواتب والمستحقات الموحد بصيغة نصية لـ ${teachers.length} معلمين عن الفترة من ${formattedStartDate} إلى ${formattedEndDate}`
    }).catch(err => console.error(err));
  };

  const exportTeacherStatement = (teacherId: string, startDate?: string, endDate?: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return;

    // Get stats for chosen period
    const periodStats = getTeacherStats(teacherId, startDate, endDate);
    // Get absolute lifetime stats to show total balance context as well
    const lifetimeStats = getTeacherStats(teacherId);

    const formattedPrintDate = formatCustomDate(new Date().toISOString().split('T')[0]);
    const periodString = (startDate && endDate) 
      ? `للفترة من ${formatCustomDate(startDate)} إلى ${formatCustomDate(endDate)}`
      : startDate 
        ? `للفترة المبتدئة من ${formatCustomDate(startDate)}`
        : endDate 
          ? `للفترة المنتهية في ${formatCustomDate(endDate)}`
          : 'كافة الفترات (سجل كلي)';

    const actualPayoutRate = teacher.payoutRate || teacher.hourlyRate || 0;

    const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>كشف حساب مالي - الأستاذ ${teacher.name}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    body {
      font-family: 'Cairo', 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1a202c;
      margin: 0;
      padding: 30px;
      direction: rtl;
      background: #ffffff;
    }
    .no-print-bar {
      background: #f8fafc;
      padding: 15px 25px;
      border-radius: 16px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .btn {
      background: #1a365d;
      color: white;
      border: none;
      padding: 10px 20px;
      font-size: 13px;
      font-weight: bold;
      border-radius: 10px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
      font-family: 'Cairo', sans-serif;
    }
    .btn:hover {
      background: #2b4c7e;
    }
    .btn-gold {
      background: #b45309;
      color: white;
    }
    .btn-gold:hover {
      background: #9a3412;
    }
    .statement-card {
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 24px;
      background: #fff;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    .header-logo-text {
      font-size: 20px;
      font-weight: 900;
      color: #1a365d;
      line-height: 1.2;
    }
    .header-sub {
      font-size: 11px;
      color: #64748b;
      font-weight: bold;
    }
    .statement-title {
      font-size: 18px;
      font-weight: 800;
      color: #b45309;
      text-align: center;
      margin: 15px 0 5px 0;
    }
    .statement-period {
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      text-align: center;
      margin-bottom: 25px;
    }
    .profile-info {
      background: #f8fafc;
      border: 1px solid #edf2f7;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 25px;
    }
    .info-grid {
      display: grid;
      grid-template-cols: repeat(3, 1fr);
      gap: 15px;
    }
    .info-label {
      font-size: 11px;
      color: #64748b;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .info-value {
      font-size: 13.5px;
      font-weight: 800;
      color: #1e293b;
    }
    .summary-boxes {
      display: grid;
      grid-template-cols: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 30px;
    }
    .summary-box {
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 16px;
      text-align: center;
    }
    .summary-box.highlight {
      background: #faf5ff;
      border-color: #e9d5ff;
    }
    .summary-box.highlight-gold {
      background: #fffbeb;
      border-color: #fde68a;
    }
    .summary-box-label {
      font-size: 10px;
      color: #64748b;
      font-weight: bold;
      margin-bottom: 6px;
    }
    .summary-box-value {
      font-size: 20px;
      font-weight: 900;
    }
    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: #1a365d;
      margin: 25px 0 12px 0;
      border-bottom: 2px solid #edf2f7;
      padding-bottom: 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
      font-size: 12px;
    }
    .data-table th {
      background: #f1f5f9;
      color: #475569;
      font-weight: 800;
      text-align: right;
      padding: 10px 14px;
      border-bottom: 2px solid #e2e8f0;
    }
    .data-table td {
      padding: 10px 14px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .data-table tr:hover td {
      background: #f8fafc;
    }
    .signatures-row {
      display: flex;
      justify-content: space-between;
      margin-top: 60px;
      border-top: 1px dashed #e2e8f0;
      padding-top: 30px;
    }
    .signature-box {
      width: 200px;
      text-align: center;
    }
    .signature-line {
      margin-top: 40px;
      border-top: 1px dotted #94a3b8;
    }
    @media print {
      .no-print-bar {
        display: none !important;
      }
      body {
        padding: 5px !important;
        margin: 0 !important;
        font-size: 8.5pt !important;
        line-height: 1.3 !important;
      }
      @page {
        size: A4 portrait;
        margin: 8mm !important;
      }
      .statement-card {
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
      }
      .profile-info {
        padding: 10px 15px !important;
        margin-bottom: 12px !important;
        border-radius: 10px !important;
      }
      .info-grid {
        gap: 10px !important;
      }
      .info-value {
        font-size: 11px !important;
      }
      .summary-boxes {
        gap: 8px !important;
        margin-bottom: 15px !important;
      }
      .summary-box {
        padding: 8px !important;
        border-radius: 10px !important;
      }
      .summary-box-value {
        font-size: 14px !important;
      }
      .section-title {
        margin: 10px 0 5px 0 !important;
        font-size: 11px !important;
        padding-bottom: 3px !important;
      }
      .data-table {
        margin-bottom: 12px !important;
        font-size: 9px !important;
      }
      .data-table th, .data-table td {
        padding: 5px 8px !important;
      }
      .signatures-row {
        margin-top: 20px !important;
        padding-top: 10px !important;
      }
      .signature-box {
        width: 150px !important;
      }
      .signature-line {
        margin-top: 20px !important;
      }
    }
  </style>
</head>
<body>

  <div class="no-print-bar">
    <div style="font-weight: bold; font-size: 14px; color: #1e293b; font-family: 'Cairo', sans-serif;">
      📄 كشف الحساب المالي جاهز للطباعة والتحويل بـ PDF
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="btn btn-gold" onclick="window.print()">🖨️ طباعة أو حفظ كـ PDF</button>
      <button class="btn" onclick="window.close()">إغلاق الصفحة</button>
    </div>
  </div>

  <div class="statement-card">
    <table class="header-table font-sans">
      <tr>
        <td style="text-align: right; vertical-align: top;">
          <div class="header-logo-text">أكاديمية التفوق للتمكين الدراسي</div>
          <div class="header-sub">بناء الركائز وتأمين المستقبل العلمي والتربوي</div>
        </td>
        <td style="text-align: left; vertical-align: top; font-size: 11px; color: #64748b; font-weight: bold; line-height: 1.4;">
          تاريخ الطباعة: ${formattedPrintDate}<br>
          كشف حساب ذمم الموظفين والأساتذة
        </td>
      </tr>
    </table>

    <div class="statement-title">كشف حساب مالي للمعلم</div>
    <div class="statement-period">${periodString}</div>

    <div class="profile-info">
      <div class="info-grid">
        <div>
          <div class="info-label">اسم الأستاذ / المعلم</div>
          <div class="info-value">${teacher.name}</div>
        </div>
        <div>
          <div class="info-label">رقم الهاتف والتواصل</div>
          <div class="info-value" style="font-family: sans-serif;">${teacher.phone || teacher.contact || 'غير مسجل'}</div>
        </div>
        <div>
          <div class="info-label">البريد الإلكتروني / التخصص</div>
          <div class="info-value">${teacher.specialization || teacher.email || 'عام'}</div>
        </div>
      </div>
      <div class="info-grid" style="margin-top: 15px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
        <div>
          <div class="info-label">البرنامج / المبادئ المقررة للتدريس</div>
          <div class="info-value" style="font-size: 11px; color: #4b5563;">
            ${(teacher.subjects || []).join(' • ') || 'لا يوجد'}
          </div>
        </div>
        <div>
          <div class="info-label">أجر المعلم المعتمد بالساعة</div>
          <div class="info-value" style="font-family: sans-serif;">₪${actualPayoutRate} / ساعة</div>
        </div>
        <div>
          <div class="info-label">حالة الحساب الجاري</div>
          <div class="info-value" style="color: ${lifetimeStats.balance > 0 ? '#dc2626' : '#16a34a'}">
            ${lifetimeStats.balance > 0 ? `مستحق له ₪${lifetimeStats.balance.toFixed(1)}` : 'تمت تصفية كامل المستحقات ✓'}
          </div>
        </div>
      </div>
    </div>

    <!-- Period Metrics -->
    <div class="section-title">📊 ملخص الحساب للفترة المحددة</div>
    <div class="summary-boxes font-sans">
      <div class="summary-box">
        <div class="summary-box-label">ساعات العمل بالفترة</div>
        <div class="summary-box-value" style="color: #2563eb;">${periodStats.totalHours.toFixed(1)} س</div>
      </div>
      <div class="summary-box highlight">
        <div class="summary-box-label">مستحقات لقاءات الفترة</div>
        <div class="summary-box-value" style="color: #7c3aed;">₪${periodStats.totalEarnings.toFixed(1)}</div>
      </div>
      <div class="summary-box highlight-gold">
        <div class="summary-box-label">إجمالي المدفوع للمعلم بالفترة</div>
        <div class="summary-box-value" style="color: #b45309;">₪${periodStats.totalReceived.toFixed(1)}</div>
      </div>
      <div class="summary-box" style="background: #f8fafc;">
        <div class="summary-box-label">صافي رصيد ذمة الفترة</div>
        <div class="summary-box-value" style="color: ${periodStats.balance > 0 ? '#b91c1c' : '#15803d'}">
          ₪${periodStats.balance.toFixed(1)}
        </div>
      </div>
    </div>

    <!-- Sessions list -->
    <div class="section-title">📅 تفصيل الحصص والنشاطات المغطاة (${periodStats.sessions.length} حصة)</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>تاريخ الحصة</th>
          <th>اسم الطالب</th>
          <th>المادة المعطاة</th>
          <th>سعر الساعة</th>
          <th>الساعات الفعلية</th>
          <th style="text-align: left;">مستحقات المعلم (₪)</th>
        </tr>
      </thead>
      <tbody>
        ${periodStats.sessions.length === 0 ? `
          <tr>
            <td colSpan="6" style="text-align: center; padding: 30px; color: #94a3b8; font-weight: bold;">
              لا توجد حصص مسجلة خلال الفترة المحددة
            </td>
          </tr>
        ` : periodStats.sessions.map(s => {
          const student = students.find(st => st.id === s.studentId);
          const ass = assignments.find(a => a.studentId === s.studentId && a.teacherId === teacherId);
          const rate = (ass && ass.teacherPayoutRate !== undefined && ass.teacherPayoutRate !== 0) ? ass.teacherPayoutRate : actualPayoutRate;
          const stage = getAcademicStage(student?.grade || student?.academicLevel || (student as any)?.academicStage || '');
          const isHourly = s.pricingUnit === 'hourly' || stage === 'secondary' || stage === 'middle' || student?.sessionSystem === 'hours';
          const compensation = isHourly 
            ? ((Number(s.durationHours) || 1) * rate)
            : (s.customTeacherFee !== undefined ? s.customTeacherFee : (s.customPayout !== undefined ? s.customPayout : (s.durationHours * rate)));
          return `
            <tr>
              <td>${formatCustomDate(s.date)}</td>
              <td style="font-weight: bold;">${student?.name || 'طالب مجهول'}</td>
              <td><span style="background: #eff6ff; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">${s.subject}</span></td>
              <td style="font-family: sans-serif;">₪${rate}</td>
              <td style="font-weight: bold; font-family: sans-serif;">${s.durationHours} س</td>
              <td style="text-align: left; font-weight: bold; color: #7c3aed; font-family: sans-serif;">₪${compensation.toFixed(1)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
      ${periodStats.sessions.length > 0 ? `
      <tfoot>
        <tr style="background: #f1f5f9; border-top: 2px solid #cbd5e1; font-weight: 900;">
          <td colspan="4" style="text-align: right; padding: 12px 14px; font-size: 13px; color: #0f172a;">
            مجموع الساعات الكلي لجميع الحصص المسجلة (${periodStats.sessions.length} حصة):
          </td>
          <td style="padding: 12px 14px; color: #1d4ed8; font-family: sans-serif; font-size: 15px; font-weight: 900; background: #e0f2fe;">
            ${periodStats.totalHours.toFixed(1)} س
          </td>
          <td style="text-align: left; padding: 12px 14px; color: #7c3aed; font-family: sans-serif; font-size: 15px; font-weight: 900; background: #ede9fe;">
            ₪${periodStats.totalEarnings.toFixed(1)}
          </td>
        </tr>
      </tfoot>
      ` : ''}
    </table>

    <!-- Payments list -->
    <div class="section-title">💸 التحويلات والدفعات المالية المسجلة للفترة (${periodStats.payments.length} حركة)</div>
    <table class="data-table">
      <thead>
        <tr>
          <th>تاريخ الدفعة</th>
          <th>الملاحظات والبيان</th>
          <th>الحركة</th>
          <th style="text-align: left;">المبلغ المصروف (₪)</th>
        </tr>
      </thead>
      <tbody>
        ${periodStats.payments.length === 0 ? `
          <tr>
            <td colSpan="4" style="text-align: center; padding: 30px; color: #94a3b8; font-weight: bold;">
              لا توجد دفعات نقدية مسجلة في هذه الفترة
            </td>
          </tr>
        ` : periodStats.payments.map(p => `
          <tr>
            <td>${formatCustomDate(p.date)}</td>
            <td style="font-weight: bold;">${p.note || 'تصفية وصرف مستحقات المعلم'}</td>
            <td style="color: #475569; font-size: 10px; font-family: monospace;">${p.id}</td>
            <td style="text-align: left; font-weight: 900; color: #16a34a; font-size: 13px; font-family: sans-serif;">₪${p.amount.toFixed(1)}</td>
          </tr>
        `).join('')}
      </tbody>
      ${periodStats.payments.length > 0 ? `
      <tfoot>
        <tr style="background: #f1f5f9; border-top: 2px solid #cbd5e1; font-weight: 900;">
          <td colspan="3" style="text-align: right; padding: 12px 14px; font-size: 13px; color: #0f172a;">
            إجمالي الدفعات المسددة للمعلم (${periodStats.payments.length} حركة):
          </td>
          <td style="text-align: left; padding: 12px 14px; color: #16a34a; font-family: sans-serif; font-size: 15px; font-weight: 900; background: #dcfce7;">
            ₪${periodStats.totalReceived.toFixed(1)}
          </td>
        </tr>
      </tfoot>
      ` : ''}
    </table>

    <!-- Final Grand Totals Bar at the End of the Statement (مجموع ساعات نهاية الكشف) -->
    <div style="margin-top: 28px; margin-bottom: 25px; padding: 18px 24px; background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 14px; page-break-inside: avoid;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 14px; margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 48px; height: 48px; border-radius: 12px; background: #dbeafe; color: #1e40af; display: flex; align-items: center; justify-content: center; font-size: 24px;">⏱️</div>
          <div>
            <div style="font-size: 12px; color: #64748b; font-weight: bold;">مجموع الساعات الكلي لجميع الحصص المسجلة (نهاية الكشف)</div>
            <div style="font-size: 22px; font-weight: 900; color: #1d4ed8; font-family: sans-serif; margin-top: 2px;">
              ${periodStats.totalHours.toFixed(1)} ساعة تدريسية
              <span style="font-size: 13px; font-weight: 700; color: #64748b; margin-right: 6px;">(${periodStats.sessions.length} حصة منفذة)</span>
            </div>
          </div>
        </div>

        <div style="text-align: left;">
          <div style="font-size: 12px; color: #64748b; font-weight: bold;">صافي الرصيد المستحق النهائي للمعلم</div>
          <div style="font-size: 22px; font-weight: 900; color: ${periodStats.balance > 0 ? '#dc2626' : '#15803d'}; font-family: sans-serif; margin-top: 2px;">
            ₪${periodStats.balance.toFixed(1)}
            <span style="font-size: 12px; font-weight: 800; margin-right: 4px;">
              ${periodStats.balance > 0 ? '(مستحق للمعلم ⚠️)' : '(تمت التصفية بالكامل ✓)'}
            </span>
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; font-size: 12px;">
        <div style="color: #475569;">
          <strong>إجمالي مستحقات الحصص:</strong> 
          <span style="color: #7c3aed; font-weight: 900; font-family: sans-serif; font-size: 14px; margin-right: 4px;">₪${periodStats.totalEarnings.toFixed(1)}</span>
        </div>
        <div style="color: #475569;">
          <strong>إجمالي المبالغ والرواتب المسددة:</strong> 
          <span style="color: #16a34a; font-weight: 900; font-family: sans-serif; font-size: 14px; margin-right: 4px;">₪${periodStats.totalReceived.toFixed(1)}</span>
        </div>
        <div style="color: #475569;">
          <strong>متوسط سعر الساعة المعتمد:</strong> 
          <span style="color: #0f172a; font-weight: 800; font-family: sans-serif; margin-right: 4px;">₪${actualPayoutRate} / س</span>
        </div>
      </div>
    </div>

    <!-- Signatures -->
    <div class="signatures-row">
      <div class="signature-box">
        <div style="font-weight: bold; font-size: 12px;">المستلم (المدرس)</div>
        <div style="font-size: 10px; color: #94a3b8; margin-top: 5px;">أقر باستلام كافة مستحقات كشف الحاضر</div>
        <div class="signature-line"></div>
      </div>
      <div class="signature-box" style="margin-left: 0; margin-right: auto;">
        <div style="font-weight: bold; font-size: 12px;">مدير المنصة أ.زكي أبو علان</div>
        <div style="font-size: 10px; color: #94a3b8; margin-top: 5px;">توقيع واعتماد الشؤون المالية بالمنصة</div>
        <div class="signature-line"></div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

    setPrintPreviewHtml(htmlContent);
    setPrintPreviewTitle(`كشف حساب المعلم - ${teacher.name}`);
    setShowPrintPreview(true);
  };

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  // Filters teachers by search query & advanced criteria
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      // 1. Core text search (name, contact, email)
      const q = (searchQuery || '').trim().toLowerCase();
      const matchesSearch = !q || 
        (t.name || '').toLowerCase().includes(q) ||
        (t.contact && t.contact.toLowerCase().includes(q)) ||
        (t.email && t.email.toLowerCase().includes(q));

      // 2. Specialization/Subjects
      let matchesSpecialization = true;
      if (filterSpecialization) {
        const specQuery = filterSpecialization.toLowerCase().trim();
        const specs = t.specialization ? t.specialization.toLowerCase() : '';
        const subs = t.subjects ? t.subjects.map(sub => (sub || '').toLowerCase()) : [];
        const isSpecMatch = specs.includes(specQuery);
        const isSubMatch = subs.some(sub => sub.includes(specQuery));
        matchesSpecialization = isSpecMatch || isSubMatch;
      }

      // 3. Hourly pay rate / payout rate
      let matchesRate = true;
      const rate = t.payoutRate || t.hourlyRate || 0;
      if (filterMinRate !== '' && filterMinRate !== null) {
        matchesRate = matchesRate && (rate >= Number(filterMinRate));
      }
      if (filterMaxRate !== '' && filterMaxRate !== null) {
        matchesRate = matchesRate && (rate <= Number(filterMaxRate));
      }

      return matchesSearch && matchesSpecialization && matchesRate;
    });
  }, [teachers, searchQuery, filterSpecialization, filterMinRate, filterMaxRate]);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 text-right" dir="rtl">
      <AnimatePresence mode="wait">
        {!selectedTeacherId ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            {/* Top Stat Overview Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-400">إجمالي المعلمين</p>
                  <h4 className="text-3xl font-black text-slate-900 mt-2">{teachers.length}</h4>
                </div>
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Users size={22} />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-400">إجمالي الحصص المنسوبة</p>
                  <h4 className="text-3xl font-black text-slate-900 mt-2">
                    {students.reduce((acc, current) => acc + (current.teachers?.length || 0), 0)}
                  </h4>
                </div>
                <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
                  <GraduationCap size={22} />
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-400">مجموع ساعات العمل</p>
                  <h4 className="text-3xl font-black text-[#D4A33C] mt-2">
                    {sessions.reduce((sum, s) => sum + s.durationHours, 0).toFixed(1)} <span className="text-xs text-slate-400">ساعة</span>
                  </h4>
                </div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Clock size={22} />
                </div>
              </div>
            </div>

            {/* لوحة إحصائيات مصغرة لتقييم وراصد أداء المعلمين للشهر الحالي */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl border border-slate-700/50 p-6 md:p-8 text-right text-white shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-700/50">
                <div>
                  <h3 className="text-base font-black text-amber-400 flex items-center gap-2 justify-end">
                    <span>لوحة مراقبة وتقييم أداء المعلمين الدراسي 📊⚡</span>
                  </h3>
                  <p className="text-[10px] text-slate-300 font-bold mt-1.5 leading-relaxed">
                    مؤشرات الإنتاجية والأداء المالي والتعليمي لشهر <span className="text-[#D4A33C]">{new Date().toLocaleString('ar-EG', { month: 'long' })} {new Date().getFullYear()}</span>.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start md:self-auto bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-1.5 text-[10px] text-amber-300/90 font-black">
                  <TrendingUp size={12} className="animate-pulse text-amber-400" />
                  <span>تحديث حي وتلقائي ⚡</span>
                </div>
              </div>

              {teachers.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">بانتظار إضافة معلمي الأكاديمية لرصد مستويات الأداء...</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {teachers.slice(0, 8).map(t => {
                    // Calculation of current month stats
                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const currentMonthPrefix = `${year}-${month}`; // "YYYY-MM"
                    
                    const monthSessions = sessions.filter(s => 
                      s.teacherId === t.id && 
                      s.date && 
                      s.date.startsWith(currentMonthPrefix) && 
                      s.approved !== false && 
                      s.status !== 'pending' && 
                      s.status !== 'booked'
                    );

                    const totalMonthSessions = monthSessions.length;
                    const totalMonthHours = monthSessions.reduce((sum, s) => sum + (Number(s.durationHours) || 0), 0);
                    
                    // Financial payout matching TeacherDashboard exactly
                    const pRate = t.payoutRate || t.hourlyRate || 35;
                    const totalMonthPayout = monthSessions.reduce((sum, s) => {
                      return sum + calculateTeacherSessionPayout(s, t, assignments, pRate);
                    }, 0);

                    // Academic Rating score (fallback value between 4.5 and 5.0 matches name length)
                    const rawRating = t.academicRating !== undefined ? t.academicRating : (4.5 + (t.name.length % 6) * 0.1);
                    const roundedRating = Math.max(1, Math.min(5, Number(rawRating)));

                    // Rating description
                    let ratingDesc = "جيد";
                    if (roundedRating >= 4.8) ratingDesc = "ممتاز جداً 🏆";
                    else if (roundedRating >= 4.5) ratingDesc = "ممتاز ✨";
                    else if (roundedRating >= 4.0) ratingDesc = "جيد جداً";
                    else if (roundedRating >= 3.5) ratingDesc = "جيد مرتفع";

                    return (
                      <div 
                        key={t.id}
                        className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/40 hover:border-amber-500/30 rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between gap-4 group/card shadow-inner"
                      >
                        {/* Teacher Name and Rating */}
                        <div className="flex justify-between items-start gap-2">
                          <span className="w-8 h-8 rounded-xl bg-slate-700 text-amber-400 font-black text-xs flex items-center justify-center group-hover/card:bg-amber-400 group-hover/card:text-slate-900 transition-all shrink-0">
                            {t.name.charAt(0)}
                          </span>
                          <div className="text-right flex-1 min-w-0">
                            <h4 className="text-xs font-black text-white group-hover/card:text-amber-400 transition-colors truncate">{t.name}</h4>
                            <p className="text-[10px] text-slate-400 font-bold mt-1 truncate">{t.specialization || 'معلم معتمد'}</p>
                          </div>
                        </div>

                        {/* Month Progress metrics */}
                        <div className="space-y-2.5">
                          {/* Sessions Count progress line */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-slate-300">
                                <strong className="text-amber-400 font-black text-xs">{totalMonthSessions}</strong> حصص مرصودة
                              </span>
                              <span className="text-slate-400">الحصص هذا الشهر</span>
                            </div>
                            <div className="w-full bg-slate-700 h-1 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-amber-400 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, (totalMonthSessions / 20) * 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Hours status & financial estimation */}
                          <div className="flex items-center justify-between bg-slate-700/30 rounded-xl p-2.5 border border-slate-700/20">
                            <div className="text-right">
                              <span className="text-[9px] text-slate-400 font-bold block">ساعات العمل</span>
                              <span className="text-xs font-black text-white leading-tight">
                                {totalMonthHours.toFixed(1)} <span className="text-[9px] text-slate-400 font-bold">ساعة</span>
                              </span>
                            </div>
                            <div className="text-left">
                              <span className="text-[9px] text-slate-400 font-bold block">المستحقات المقدرة</span>
                              <span className="text-xs font-black text-emerald-400 leading-tight">
                                ₪{totalMonthPayout.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Star Rating Badge Component */}
                        <div className="pt-2 border-t border-slate-700/40 flex items-center justify-between text-right">
                          <span className="text-[9px] text-amber-300 font-black px-2 py-0.5 bg-amber-950/40 rounded-lg border border-amber-900/30">
                            {ratingDesc}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-black text-white">{roundedRating.toFixed(1)}</span>
                            <div className="flex items-center text-amber-400">
                              <Star size={10} fill="currentColor" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Record Addition Trigger Button */}
            <div className="flex justify-start">
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3.5 bg-[#1A365D] hover:bg-slate-800 text-white hover:text-amber-400 rounded-2xl text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center gap-2.5 cursor-pointer border-none outline-none"
              >
                <UserPlus size={16} className="text-amber-400 animate-pulse" />
                <span>إضافة معلم جديد للأكاديمية 👤✨</span>
              </button>
            </div>

            {/* Quick Record Addition Form in a clean Modal overlay */}
            <AnimatePresence>
              {showAddForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 backdrop-blur-md bg-slate-950/40" dir="rtl">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-y-auto max-h-[92vh] relative text-right p-8 md:p-10"
                    onClick={e => e.stopPropagation()}
                  >
                    
                    {/* Modal Close Button */}
                    <button 
                      onClick={() => setShowAddForm(false)}
                      className="absolute top-6 left-6 p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all cursor-pointer border-none bg-transparent outline-none"
                      type="button"
                    >
                      <X size={18} />
                    </button>

                    <div className="flex items-center gap-4 mb-8 text-right">
                      <div className="w-14 h-14 rounded-2xl bg-[#1A365D] text-white flex items-center justify-center shadow-lg">
                        <UserPlus size={28} className="text-amber-400 animate-bounce" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight font-sans">تسجيل معلم جديد بالنظام</h3>
                        <p className="text-xs text-slate-500 font-bold mt-1">يرجى تعبئة التفاصيل والنسب بدقة متناهية لضمان صحة الفواتير والرواتب الملقاة.</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                
                {/* Status/Notification Messages */}
                <AnimatePresence>
                  {regStatus && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`p-4 rounded-xl flex items-center gap-3 border ${
                        regStatus.type === 'success'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      {regStatus.type === 'success' ? (
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0 animate-bounce" />
                      ) : (
                        <AlertTriangle size={18} className="text-rose-600 shrink-0 animate-pulse" />
                      )}
                      <span className="text-xs font-black leading-relaxed">{regStatus.message}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* الاسم الرباعي */}
                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-black text-slate-500 flex items-center gap-1.5 justify-start">
                      <span>الاسم الرباعي</span>
                      <User size={13} className="text-slate-400" />
                    </label>
                    <input 
                      placeholder="e.g. محمد أحمد علي" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all font-bold text-xs text-right" 
                    />
                  </div>

                  {/* التخصص */}
                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-black text-slate-500 flex items-center gap-1.5 justify-start">
                      <span>التخصص والتعليم</span>
                      <BookOpen size={13} className="text-slate-400" />
                    </label>
                    <input 
                      placeholder="e.g. رياضيات، لغة عربية" 
                      value={specialization} 
                      onChange={e => setSpecialization(e.target.value)} 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#D4A33C]/5 focus:border-[#D4A33C] outline-none transition-all font-bold text-xs text-right" 
                    />
                  </div>

                  {/* رقم الهاتف (اختياري) */}
                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-black text-slate-500 flex items-center gap-1.5 justify-start">
                      <span>رقم الهاتف (اختياري)</span>
                      <Mail size={13} className="text-slate-400" />
                    </label>
                    <input 
                      placeholder="059xxxxxxx" 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#D4A33C]/5 focus:border-[#D4A33C] outline-none transition-all font-bold text-xs text-right" 
                    />
                  </div>

                  {/* البريد الإلكتروني (اختياري) */}
                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-black text-slate-500 flex items-center gap-1.5 justify-start">
                      <span>البريد الإلكتروني (اختياري)</span>
                      <Mail size={13} className="text-slate-400" />
                    </label>
                    <input 
                      type="email"
                      placeholder="teacher@example.com" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#D4A33C]/5 focus:border-[#D4A33C] outline-none transition-all font-bold text-xs text-right" 
                    />
                  </div>

                  {/* اسم المستخدم (EN) */}
                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-black text-slate-500 flex items-center gap-1.5 justify-start">
                      <span>اسم المستخدم (EN)</span>
                      <UserCircle size={13} className="text-slate-400" />
                    </label>
                    <input 
                      placeholder="e.g. ahmed_math" 
                      value={username} 
                      onChange={e => setUsername(e.target.value)} 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#D4A33C]/5 focus:border-[#D4A33C] outline-none transition-all font-bold text-xs text-right" 
                    />
                  </div>

                  {/* كلمة المرور */}
                  <div className="space-y-1.5 text-right">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-500 flex items-center gap-1.5 justify-start">
                        <span>كلمة المرور</span>
                        <Lock size={13} className="text-slate-400" />
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowTeacherPassword(!showTeacherPassword)}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
                      >
                        {showTeacherPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                        <span>{showTeacherPassword ? "إخفاء" : "إظهار"}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input 
                        type={showTeacherPassword ? "text" : "password"}
                        placeholder="••••••••" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        className="w-full px-4 py-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#D4A33C]/5 focus:border-[#D4A33C] outline-none transition-all font-bold text-xs text-right" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowTeacherPassword(!showTeacherPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        title={showTeacherPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                      >
                        {showTeacherPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {/* أجر المعلم من المركز */}
                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-black text-slate-500 flex items-center gap-1.5 justify-start">
                      <span>مقطوعية المعلم الثابتة (تكلفة الحصة الكلية للمعلم) *</span>
                      <DollarSign size={13} className="text-slate-400" />
                    </label>
                    <input 
                      type="number" 
                      placeholder="مثال: 35" 
                      value={payoutRate || ''} 
                      onChange={e => {
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setPayoutRate(val);
                        setHourlyRate(val);
                      }} 
                      className="w-full px-4 py-3 bg-slate-50 border border-[#D4A33C]/20 focus:border-[#D4A33C] rounded-xl focus:ring-4 focus:ring-[#D4A33C]/5 outline-none transition-all font-bold text-xs text-right" 
                    />
                  </div>

                  {/* سعر ساعة الفوترة للطالب */}
                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-black text-slate-500 flex items-center gap-1.5 justify-start">
                      <span>سعر ساعة الفوترة للطالب (₪) *</span>
                      <DollarSign size={13} className="text-slate-400" />
                    </label>
                    <input 
                      type="number" 
                      placeholder="مثال: 50" 
                      value={billingRate || ''} 
                      onChange={e => {
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setBillingRate(val);
                      }} 
                      className="w-full px-4 py-3 bg-slate-50 border border-[#D4A33C]/20 focus:border-[#D4A33C] rounded-xl focus:ring-4 focus:ring-[#D4A33C]/5 outline-none transition-all font-bold text-xs text-right" 
                    />
                  </div>

                  {/* التقييم الأكاديمي للمعلم */}
                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-black text-slate-500 flex items-center gap-1.5 justify-start">
                      <span>التقييم الأكاديمي للمعلم (1.0 - 5.0)</span>
                      <GraduationCap size={13} className="text-slate-400" />
                    </label>
                    <select
                      value={academicRating || ''}
                      onChange={e => setAcademicRating(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-4 py-3 bg-slate-50 border border-[#D4A33C]/20 focus:border-[#D4A33C] rounded-xl focus:ring-4 focus:ring-[#D4A33C]/5 outline-none transition-all font-bold text-xs text-right cursor-pointer"
                    >
                      <option value="5">⭐⭐⭐⭐⭐ (5.0 / ممتاز جداً)</option>
                      <option value="4.8">⭐⭐⭐⭐⭐ (4.8 / ممتاز)</option>
                      <option value="4.5">⭐⭐⭐⭐★ (4.5 / جيد جداً مرتفع)</option>
                      <option value="4.0">⭐⭐⭐⭐ (4.0 / جيد جداً)</option>
                      <option value="3.5">⭐⭐⭐★ (3.5 / جيد مرتفع)</option>
                      <option value="3.0">⭐⭐⭐ (3.0 / جيد)</option>
                    </select>
                  </div>

                  {/* تفعيل ميزة الواجبات */}
                  <div className="md:col-span-3 mt-2 flex items-center justify-between gap-3 p-4.5 bg-amber-50/40 border border-amber-100 rounded-2xl text-right">
                    <div className="flex flex-col gap-0.5 text-right flex-1">
                      <p className="text-xs font-black text-slate-700">تفعيل وإضافة ميزة الواجبات الدراسية (الحقائب والمهام)</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">بشكل افتراضي، يُحظر المعلم من إدارة الواجبات حتى يُفَعِّل مدير المنصة هذه الميزة له يدويًا.</p>
                    </div>
                    <input
                      type="checkbox"
                      id="checkbox-reg-tasks"
                      checked={tasksEnabled}
                      onChange={(e) => setTasksEnabled(e.target.checked)}
                      className="w-5 h-5 rounded border-amber-300 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>

                {/* المواد الدراسية المسندة: dynamic input and multi-select */}
                {availableSubjects.length > 0 && (
                  <div className="mt-4 flex flex-col gap-3 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-right">
                    <p className="text-[11px] font-black text-[#D4A33C]">المواد الدراسية المسندة (اختر من القائمة المتاحة أو اكتب مادة مخصصة جديدة لتضاف تلقائياً):</p>
                    
                    <div className="flex flex-wrap gap-2 mt-1 justify-end" dir="rtl">
                      {availableSubjects.map(sub => {
                        const isSelected = selectedSubjects.includes(sub);
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => toggleSubject(sub)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                              isSelected
                                ? 'bg-[#D4A33C]/20 text-[#1A365D] border-[#D4A33C] font-black'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-[#D4A33C] hover:text-[#D4A33C]'
                            }`}
                          >
                            {sub}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 items-center mt-2 max-w-md w-full" dir="rtl">
                      <input
                        type="text"
                        placeholder="كتابة مادة دراسية مخصصة جديدة..."
                        value={customSubjectInput}
                        onChange={e => setCustomSubjectInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (customSubjectInput.trim()) {
                              const newSub = customSubjectInput.trim();
                              if (!availableSubjects.includes(newSub)) {
                                setAvailableSubjects(prev => [...prev, newSub]);
                              }
                              if (!selectedSubjects.includes(newSub)) {
                                setSelectedSubjects(prev => [...prev, newSub]);
                              }
                              setCustomSubjectInput('');
                            }
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs focus:ring-2 focus:ring-[#D4A33C] focus:border-[#D4A33C]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customSubjectInput.trim()) {
                            const newSub = customSubjectInput.trim();
                            if (!availableSubjects.includes(newSub)) {
                              setAvailableSubjects(prev => [...prev, newSub]);
                            }
                            if (!selectedSubjects.includes(newSub)) {
                              setSelectedSubjects(prev => [...prev, newSub]);
                            }
                            setCustomSubjectInput('');
                          }
                        }}
                        className="px-3.5 py-2 bg-[#D4A33C] text-slate-950 font-black rounded-xl text-xs hover:bg-yellow-500 transition-all cursor-pointer whitespace-nowrap"
                      >
                        إسناد مادة
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit and Cancel Buttons */}
                <div className="flex flex-row-reverse items-center justify-between gap-4 pt-4">
                  <button 
                    onClick={addTeacher} 
                    className="flex-1 py-3.5 bg-[#1A365D] text-white font-black rounded-2xl hover:bg-slate-800 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95 border-none outline-none select-none"
                  >
                    <UserPlus size={15} />
                    <span>حفظ البيانات</span>
                  </button>

                  <button 
                    onClick={() => {
                      setName('');
                      setSpecialization('');
                      setEmail('');
                      setPhone('');
                      setUsername('');
                      setPassword('');
                      setPayoutRate('');
                      setBillingRate('');
                      setSelectedSubjects([]);
                      setRegStatus(null);
                      setShowAddForm(false);
                    }}
                    type="button"
                    className="px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black rounded-2xl transition-all text-xs cursor-pointer shadow-sm active:scale-95 border border-slate-200 select-none"
                  >
                    <span>إلغاء</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

            {/* Teacher Search & Listing Table */}
            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-5 text-right" dir="rtl">
                {/* Row 1: Title and Search Box */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-none">سجل وبيانات معلمي الأكاديمية</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1.5">عرض قائمة المعلمين المسجلين والتحكم ببياناتهم المالية والأكاديمية.</p>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                    {/* Settle Previous Months Dues */}
                    <button
                      type="button"
                      onClick={() => {
                        const initialSelections: Record<string, boolean> = {};
                        teachers.forEach(t => {
                          const bal = getTeacherPreviousMonthsBalance(t.id);
                          if (bal > 0) {
                            initialSelections[t.id] = true;
                          }
                        });
                        setSelectedTeachersToSettle(initialSelections);
                        setIsSettleDuesModalOpen(true);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-rose-600/10 active:scale-[0.98] select-none text-center whitespace-nowrap"
                      dir="rtl"
                    >
                      <DollarSign size={14} />
                      <span>تصفير مستحقات الأشهر السابقة 💸</span>
                    </button>

                    {/* Unified Payments Management Modal Trigger */}
                    <button
                      type="button"
                      id="open-teacher-unified-payments-manager-btn"
                      onClick={() => {
                        if (onOpenPaymentsManager) {
                          onOpenPaymentsManager();
                        } else {
                          setIsPaymentsManagerModalOpen(true);
                        }
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-[0.98] select-none text-center whitespace-nowrap border border-amber-300"
                      dir="rtl"
                      title="إدارة وتعديل وحذف دفعات المعلمين والطلاب"
                    >
                      <Wallet size={14} />
                      <span>إدارة وتعديل الدفعات 💳</span>
                    </button>

                    {/* Export Filtered Data to Excel */}
                    <button
                      type="button"
                      onClick={exportFilteredTeachersToExcel}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-emerald-600/10 active:scale-[0.98] select-none text-center whitespace-nowrap"
                      dir="rtl"
                    >
                      <FileSpreadsheet size={14} />
                      <span>تصدير المفلتر للاكسل (Excel)</span>
                    </button>

                    {/* Search query box */}
                    <div className="relative group w-full sm:w-72">
                      <Search size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#D4A33C]" />
                      <input
                        type="text"
                        placeholder="البحث عن معلم بالاسم أو التخصص..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all shadow-sm"
                      />
                    </div>

                    {/* Advanced filter toggle button */}
                    <button
                      type="button"
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className={`flex items-center justify-center gap-1.5 px-4 py-2 border rounded-xl text-xs font-black transition-all cursor-pointer select-none whitespace-nowrap active:scale-[0.98] ${
                        showAdvancedFilters 
                          ? 'bg-[#1A365D] text-white border-[#1A365D]' 
                          : 'bg-amber-500/10 hover:bg-amber-500/20 text-[#D4A33C] border-amber-500/25'
                      }`}
                    >
                      <Search size={13} />
                      <span>تصفية متطورة</span>
                      {showAdvancedFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                </div>

                {/* Advanced Search & Filtering Panel */}
                <AnimatePresence>
                  {showAdvancedFilters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginTop: 0 }}
                      animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                      exit={{ opacity: 0, height: 0, marginTop: 0 }}
                      className="overflow-hidden bg-slate-100/70 border border-slate-200/50 rounded-2xl p-4 space-y-4 shadow-inner"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        {/* 1. Specialization & Subjects Search & Tags */}
                        <div className="space-y-2.5">
                          <label className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                            <BookOpen size={13} className="text-[#D4A33C]" />
                            <span>تصفية التخصصات والمواد الأكاديمية:</span>
                          </label>
                          <input
                            type="text"
                            placeholder="اكتب التخصص أو المادة للفلترة تلقائياً (مثال: رياضيات، فيزياء)..."
                            value={filterSpecialization}
                            onChange={e => setFilterSpecialization(e.target.value)}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-amber-500/10 focus:border-[#D4A33C] outline-none transition-all text-right"
                            dir="rtl"
                          />
                          {topSpecializations.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              <span className="text-[10px] text-slate-400 font-extrabold ml-1">تخصصات شائعة:</span>
                              {topSpecializations.map((spec, idx) => {
                                const isCurrent = (filterSpecialization || '').toLowerCase().trim() === (spec || '').toLowerCase().trim();
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setFilterSpecialization(isCurrent ? '' : spec)}
                                    className={`px-2 py-1 rounded text-[9.5px] font-black border transition-all cursor-pointer select-none ${
                                      isCurrent 
                                        ? 'bg-[#1A365D] text-white border-[#1A365D] shadow-xs' 
                                        : 'bg-white text-slate-650 hover:bg-slate-50 border-slate-200 hover:border-slate-350'
                                    }`}
                                  >
                                    {spec}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* 2. Hourly pay rate / payout rate */}
                        <div className="space-y-2.5">
                          <label className="flex items-center gap-1.5 text-xs font-black text-slate-700">
                            <DollarSign size={13} className="text-[#D4A33C]" />
                            <span>تصفية بمعدل الأجل لكل ساعة (شيكل/ساعة ₪):</span>
                          </label>
                          <div className="grid grid-cols-2 gap-3" dir="rtl">
                            <div className="space-y-1 text-right">
                              <span className="text-[10px] font-extrabold text-slate-400 block">الحد الأدنى للأجر:</span>
                              <div className="relative">
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">₪</span>
                                <input
                                  type="number"
                                  value={filterMinRate || ''}
                                  onChange={e => setFilterMinRate(e.target.value === '' ? '' : Number(e.target.value))}
                                  placeholder="0"
                                  className="w-full pr-6 pl-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center focus:ring-2 focus:ring-amber-500/10 focus:border-[#D4A33C] outline-none transition-all"
                                />
                              </div>
                            </div>
                            <div className="space-y-1 text-right">
                              <span className="text-[10px] font-extrabold text-slate-400 block">الحد الأقصى للأجر:</span>
                              <div className="relative">
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">₪</span>
                                <input
                                  type="number"
                                  value={filterMaxRate || ''}
                                  onChange={e => setFilterMaxRate(e.target.value === '' ? '' : Number(e.target.value))}
                                  placeholder="150"
                                  className="w-full pr-6 pl-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center focus:ring-2 focus:ring-amber-500/10 focus:border-[#D4A33C] outline-none transition-all"
                                />
                              </div>
                            </div>
                          </div>
                          
                          {/* Quick hourly rate filter ranges */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <span className="text-[10px] text-slate-400 font-extrabold ml-1">تسهيل بحدود الأجر:</span>
                            {[
                              { label: 'أقل من 35 ₪', min: 0, max: 34 },
                              { label: '35 ₪ إلى 50 ₪', min: 35, max: 50 },
                              { label: '50 ₪ فما فوق', min: 51, max: 250 }
                            ].map((preset, idx) => {
                              const isCurrent = filterMinRate === preset.min && filterMaxRate === preset.max;
                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    if (isCurrent) {
                                      setFilterMinRate('');
                                      setFilterMaxRate('');
                                    } else {
                                      setFilterMinRate(preset.min);
                                      setFilterMaxRate(preset.max);
                                    }
                                  }}
                                  className={`px-2 py-1 rounded text-[9.5px] font-black border transition-all cursor-pointer select-none ${
                                    isCurrent
                                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                                      : 'bg-white text-slate-650 hover:bg-slate-50 border-slate-200 hover:border-slate-350'
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Filter stats & Reset button */}
                      <div className="pt-3 border-t border-slate-200/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="text-[10px] font-extrabold text-[#1A365D] bg-indigo-50/60 border border-indigo-100 rounded-xl px-3 py-1.5 text-center sm:text-right">
                          💡 يعرض الجدول حالياً <span className="text-amber-600 font-extrabold text-xs mx-0.5">{filteredTeachers.length}</span> من أصل <span className="text-slate-650 font-black text-xs mx-0.5">{teachers.length}</span> معلمين مسجلين.
                        </div>
                        {(filterSpecialization || filterMinRate !== '' || filterMaxRate !== '') && (
                          <button
                            type="button"
                            onClick={() => {
                              setFilterSpecialization('');
                              setFilterMinRate('');
                              setFilterMaxRate('');
                            }}
                            className="text-rose-600 hover:text-rose-700 font-black text-[10px] bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer border border-rose-100 flex items-center gap-1.5 shadow-xs"
                          >
                            <span>إعادة حط وضبط المعايير المخصصة ✕</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Unified Salaries & Reports Notice (Replacing duplicate exports for cleaner UX) */}
                <div className="p-5 bg-gradient-to-r from-amber-500/10 to-indigo-550/5 rounded-2xl border border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#D4A33C]/20 flex items-center justify-center shrink-0 mt-0.5">
                      <BarChart3 size={18} className="text-[#D4A33C]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800 leading-tight">مركزية إدارة الرواتب والتقارير المالية 📊</h4>
                      <p className="text-xs font-bold text-slate-500 mt-1">تجنباً لازدواجية المهام، تم توحيد كشوف رواتب المعلمين والرواتب الموحدة ومقاصة الدفعات بالكامل تحت <strong>التقارير والمخططات (دفتر الأستاذ والرواتب)</strong>.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-right">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">المعلم والبيانات</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">بيانات الاتصال</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">المواد والتخصص</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">سعر الساعة</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">الطلاب المنتسبين</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ساعات معتمدة</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">الطلاب والعمليات</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">التحكم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="p-20 text-center">
                          <div className="w-8 h-8 border-2 border-amber-500/10 border-t-[#D4A33C] rounded-full animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : filteredTeachers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-20 text-center">
                          <User size={40} className="text-slate-100 mx-auto mb-4" />
                          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">لا يوجد معلمون مطابقون للبحث الحالي</p>
                        </td>
                      </tr>
                    ) : (
                      filteredTeachers.map((teacher) => (
                        <tr 
                          key={teacher.id} 
                          onClick={() => setSelectedTeacherId(teacher.id)}
                          className="hover:bg-amber-500/5 transition-all group cursor-pointer"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs group-hover:bg-[#D4A33C] group-hover:text-slate-950 transition-all">
                                {teacher.name.charAt(0)}
                              </div>
                              <span className="text-sm font-bold text-slate-900 tracking-tight">{teacher.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-slate-400">{teacher.contact}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1">
                              {teacher.specialization && (
                                <span className="text-[10.5px] font-extrabold text-[#1a365d] block">
                                  {teacher.specialization}
                                </span>
                              )}
                              <div className="flex flex-wrap gap-1">
                                {teacher.subjects?.slice(0, 3).map((sub, idx) => (
                                  <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-black rounded uppercase">
                                    {sub}
                                  </span>
                                ))}
                                {teacher.subjects?.length > 3 && <span className="text-[9px] font-black text-slate-300">+{teacher.subjects.length - 3}</span>}
                              </div>
                            </div>
                          </td>
                          <td 
                            className="px-6 py-4 cursor-pointer hover:bg-slate-50 rounded-lg group/rate transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickEditRateTeacher(teacher);
                              setQuickEditPayoutRate(String(teacher.payoutRate || teacher.hourlyRate || 0));
                              setQuickEditBillingRate(String(teacher.billingRate || teacher.hourlyRate || 0));
                              setQuickEditSession40PayoutRate(String(teacher.primarySchoolSessionPayout ?? teacher.sessionPayoutRate ?? 20));
                              setQuickEditSession40BillingRate(String(teacher.primarySchoolSessionRate ?? teacher.sessionRate ?? 35));
                              setQuickEditApplyToPrimary(true);
                              setQuickRateError('');
                            }}
                            title="انقر هنا للتعديل المالي السريع لأسعار المعلم (الساعة والحصة 40 دقيقة) 📊"
                          >
                            <div className="flex flex-col gap-1 text-right">
                              <div className="flex items-center gap-2 text-xs font-bold">
                                <span className="text-emerald-600 flex items-center gap-0.5">
                                  ₪{teacher.billingRate || teacher.hourlyRate} 
                                  <span className="text-[9px] text-slate-400 font-normal">طالب</span>
                                </span>
                                <span className="text-slate-200">/</span>
                                <span className="text-rose-500 flex items-center gap-1 font-black">
                                  ₪{teacher.payoutRate || teacher.hourlyRate} 
                                  <span className="text-[9px] text-slate-400 font-normal">أجر</span>
                                  <Pencil size={10} className="opacity-0 group-hover/rate:opacity-100 text-slate-400 hover:text-[#D4A33C] transition-opacity shrink-0 ml-1" />
                                </span>
                              </div>
                              {(teacher.primarySchoolSessionPayout !== undefined || teacher.sessionPayoutRate !== undefined) && (
                                <div className="flex items-center gap-1 text-[9px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 w-fit">
                                  <span>🎓 40د:</span>
                                  <span className="text-emerald-700">₪{teacher.primarySchoolSessionRate ?? teacher.sessionRate ?? 35}</span>
                                  <span>/</span>
                                  <span className="text-rose-600">₪{teacher.primarySchoolSessionPayout ?? teacher.sessionPayoutRate ?? 20}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-black bg-indigo-50 border border-indigo-100 text-indigo-750 text-indigo-700">
                                <Users size={12} />
                                <span>{teacherMetrics.assignedCounts[teacher.id] || 0} طلاب</span>
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-black bg-amber-50 border border-amber-100 text-amber-750 text-[#D4A33C]">
                                <Clock size={12} />
                                <span>{teacherMetrics.approvedHours[teacher.id]?.toFixed(1) || '0.0'} ساعة</span>
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-left">
                            <div className="flex flex-wrap justify-end gap-1" onClick={e => e.stopPropagation()}>
                              {getAssignedStudents(teacher.id).map(student => (
                                <button 
                                  key={student.id}
                                  onClick={() => {
                                    setBookingTeacher(teacher);
                                    setBookingStudent(student);
                                    setBookingSubject(teacher.subjects[0] || '');
                                  }}
                                  className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-[9px] font-black hover:bg-[#D4A33C] hover:text-slate-950 transition-all uppercase"
                                >
                                  حجز: {student.name}
                                </button>
                              ))}
                              {getAssignedStudents(teacher.id).length === 0 && (
                                <span className="text-[9px] font-black text-slate-300 italic">غير منسّب لأي طالب</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-left">
                            <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => openCredentialsModal(teacher)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[10px] font-black bg-indigo-50 border border-indigo-150 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all cursor-pointer shadow-xs active:scale-95"
                                title="تعديل اسم المستخدم وكلمة المرور لدخول المعلم"
                              >
                                <KeyRound size={11} />
                                <span>بيانات الدخول 🔑</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPayTeacher(teacher);
                                  setPayAmount('');
                                  setPayDate(new Date().toISOString().split('T')[0]);
                                  setPayNote('');
                                  setIsPaymentModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black bg-emerald-50 border border-emerald-150 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all cursor-pointer"
                              >
                                <DollarSign size={11} />
                                <span>دفع المستحقات</span>
                              </button>
                              <button 
                                onClick={() => deleteTeacher(teacher.id)} 
                                className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                                title="حذف المعلم"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredTeachers.length > 0 && (
                    <tfoot className="border-t-2 border-slate-200 bg-slate-50/80 font-black">
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-xs font-black text-slate-800">
                          مجموع الساعات الكلي لجميع الحصص المسجلة ({filteredTeachers.length} معلماً):
                        </td>
                        <td className="px-6 py-4 text-xs font-mono font-black text-[#D4A33C]">
                          {filteredTeachers.reduce((sum, t) => sum + (teacherMetrics.approvedHours[t.id] || 0), 0).toFixed(1)} ساعة
                        </td>
                        <td colSpan={2} className="px-6 py-4 text-xs text-slate-400">
                          إجمالي الساعات المعتمدة
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div 
            key={`teacher-profile-${selectedTeacherId}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-10"
          >
            {isEditingTeacher ? (
              <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6 text-right animate-in fade-in duration-300 w-full" dir="rtl">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900">تعديل ملف المعلم: {selectedTeacher?.name}</h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleUpdateTeacher}
                      type="button"
                      className="px-4 py-2 bg-[#D4A33C] hover:bg-amber-500 text-slate-950 text-xs font-black rounded-xl transition-all cursor-pointer"
                    >
                      حفظ التغييرات
                    </button>
                    <button 
                      onClick={() => setIsEditingTeacher(false)}
                      type="button"
                      className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-black rounded-xl transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1 text-right">اسم المعلم</label>
                    <input 
                      value={editTeacherName}
                      onChange={e => setEditTeacherName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-right focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1 text-right">سعر الفوترة للطلاب (₪)</label>
                    <input 
                      type="number"
                      value={editTeacherBilling}
                      onChange={e => setEditTeacherBilling(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-right focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1 text-right">مقطوعية المعلم الثابتة (تكلفة الحصة الكلية للمعلم)</label>
                    <input 
                      type="number"
                      value={editTeacherPayout}
                      onChange={e => setEditTeacherPayout(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-right focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1 text-right">رقم الهاتف</label>
                    <input 
                      value={editTeacherPhone}
                      onChange={e => setEditTeacherPhone(e.target.value)}
                      placeholder="مثال: 0501234567"
                      dir="ltr"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-right focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1 text-right">البريد الإلكتروني</label>
                    <input 
                      value={editTeacherEmail}
                      onChange={e => setEditTeacherEmail(e.target.value)}
                      placeholder="teacher@example.com"
                      dir="ltr"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-right focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1 text-right">التخصص العلمي</label>
                    <input 
                      value={editTeacherSpecialization}
                      onChange={e => setEditTeacherSpecialization(e.target.value)}
                      placeholder="مثال: لقب ثانٍ في الرياضيات الكرمل"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-right focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1 text-right flex items-center justify-between">
                      <span>اسم المستخدم للدخول بالمنصة (Username)</span>
                      <span className="text-[9px] text-indigo-600 font-normal">اسم فريد للدخول</span>
                    </label>
                    <div className="relative">
                      <input 
                        value={editTeacherUsername}
                        onChange={e => setEditTeacherUsername(e.target.value)}
                        dir="ltr"
                        placeholder="اسم مستخدم فريد"
                        className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs text-left focus:ring-2 focus:ring-[#D4A33C] focus:bg-white transition-all outline-none"
                      />
                      <User size={13} className="absolute right-2.5 top-3 text-slate-400" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-black text-slate-500 text-right">كلمة المرور بالمنصة (Password)</label>
                      <button
                        type="button"
                        onClick={() => {
                          const rand = Math.floor(100000 + Math.random() * 900000).toString();
                          setEditTeacherPassword(rand);
                        }}
                        className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        توليد كلمة مرور 🎲
                      </button>
                    </div>
                    <div className="relative">
                      <input 
                        type={showEditTeacherPassword ? "text" : "password"}
                        value={editTeacherPassword}
                        onChange={e => setEditTeacherPassword(e.target.value)}
                        dir="ltr"
                        placeholder="أدخل كلمة المرور الخاصة به"
                        className="w-full pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-xs text-left focus:ring-2 focus:ring-[#D4A33C] focus:bg-white transition-all outline-none"
                      />
                      <Lock size={13} className="absolute right-2.5 top-3 text-slate-400" />
                      <button
                        type="button"
                        onClick={() => setShowEditTeacherPassword(!showEditTeacherPassword)}
                        className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                        title={showEditTeacherPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                      >
                        {showEditTeacherPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1 text-right">التقييم الأكاديمي للمعلم (1.0 - 5.0)</label>
                    <select
                      value={editTeacherAcademicRating || ''}
                      onChange={e => setEditTeacherAcademicRating(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-right focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none cursor-pointer"
                    >
                      <option value="5">⭐⭐⭐⭐⭐ (5.0 / ممتاز جداً)</option>
                      <option value="4.8">⭐⭐⭐⭐⭐ (4.8 / ممتاز)</option>
                      <option value="4.5">⭐⭐⭐⭐★ (4.5 / جيد جداً مرتفع)</option>
                      <option value="4.0">⭐⭐⭐⭐ (4.0 / جيد جداً)</option>
                      <option value="3.5">⭐⭐⭐★ (3.5 / جيد مرتفع)</option>
                      <option value="3.0">⭐⭐⭐ (3.0 / جيد)</option>
                    </select>
                  </div>

                  {/* تفعيل / إضافة ميزة الواجبات للمعلم */}
                  <div className="md:col-span-3 mt-1.5 flex items-center justify-between gap-3 p-4 bg-amber-50/50 border border-amber-100 rounded-2xl text-right">
                    <div className="flex flex-col gap-0.5 text-right flex-1">
                      <p className="text-xs font-black text-[#1A365D]">إضافة وتفعيل ميزة الواجبات الدراسية للمعلم</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">بمجرد الحفظ، تظهر أيقونات (المهام الدراسية وتنزيل الواجبات والتقييمات) فوراً في صفحة المعلم المعني لرفع التكليفات للطلاب.</p>
                    </div>
                    <input
                      type="checkbox"
                      id="checkbox-edit-tasks"
                      checked={editTeacherTasksEnabled}
                      onChange={(e) => setEditTeacherTasksEnabled(e.target.checked)}
                      className="w-5 h-5 rounded border-amber-300 text-amber-500 focus:ring-amber-500 cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-[11px] font-black text-slate-500 mb-1 text-right">المواد الدراسية المسندة (اختر من القائمة المتاحة أو اكتب مادة مخصصة جديدة لتضاف تلقائياً):</label>
                  <div className="flex flex-wrap gap-2 justify-start md:justify-end" dir="rtl">
                    {availableSubjects.map(sub => {
                      const active = editTeacherSubjects.includes(sub);
                      return (
                        <button 
                          key={sub}
                          type="button"
                          onClick={() => {
                            if (active) {
                              setEditTeacherSubjects(prev => prev.filter(s => s !== sub));
                            } else {
                              setEditTeacherSubjects(prev => [...prev, sub]);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${active ? 'bg-indigo-650 border-[#1A365D] bg-[#1A365D] text-white font-black' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                  
                  <div className="flex gap-2 items-center mt-2 max-w-md w-full justify-start md:justify-end" dir="rtl">
                    <input
                      type="text"
                      placeholder="كتابة مادة دراسية مخصصة جديدة للملف..."
                      value={editCustomSubjectInput}
                      onChange={e => setEditCustomSubjectInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (editCustomSubjectInput.trim()) {
                            const newSub = editCustomSubjectInput.trim();
                            if (!availableSubjects.includes(newSub)) {
                              setAvailableSubjects(prev => [...prev, newSub]);
                            }
                            if (!editTeacherSubjects.includes(newSub)) {
                              setEditTeacherSubjects(prev => [...prev, newSub]);
                            }
                            setEditCustomSubjectInput('');
                          }
                        }
                      }}
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs focus:ring-2 focus:ring-[#1A365D] focus:border-[#1A365D]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (editCustomSubjectInput.trim()) {
                          const newSub = editCustomSubjectInput.trim();
                          if (!availableSubjects.includes(newSub)) {
                            setAvailableSubjects(prev => [...prev, newSub]);
                          }
                          if (!editTeacherSubjects.includes(newSub)) {
                            setEditTeacherSubjects(prev => [...prev, newSub]);
                          }
                          setEditCustomSubjectInput('');
                        }
                      }}
                      className="px-3.5 py-2 bg-[#1A365D] text-white font-black rounded-xl text-xs hover:bg-[#D4A33C]/90 hover:text-slate-950 transition-all cursor-pointer whitespace-nowrap"
                    >
                      إسناد مادة
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => setSelectedTeacherId(null)}
                    className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-[#D4A33C] hover:border-[#D4A33C] transition-all shadow-sm cursor-pointer"
                  >
                    <ArrowLeft size={24} />
                  </button>
                  <div className="text-right">
                    <div className="flex items-center gap-3 mb-1 justify-end">
                      <span className="px-3 py-1 bg-[#D4A33C] text-slate-950 text-[10px] font-black rounded-full uppercase tracking-widest">الملف الشخصي للمعلم</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-2 justify-end mb-2">
                      <button 
                        onClick={() => openCredentialsModal(selectedTeacher)}
                        type="button"
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all bg-indigo-50 cursor-pointer shadow-xs active:scale-95"
                        title="تعديل اسم المستخدم وكلمة المرور لدخول المعلم"
                      >
                        <KeyRound size={12} className="shrink-0" />
                        <span>بيانات الدخول 🔑</span>
                      </button>
                      <button 
                        onClick={() => {
                          setEditTeacherName(selectedTeacher?.name || '');
                          setEditTeacherBilling(selectedTeacher?.billingRate || selectedTeacher?.hourlyRate || 0);
                          setEditTeacherPayout(selectedTeacher?.payoutRate || selectedTeacher?.hourlyRate || 0);
                          setEditTeacherSubjects(selectedTeacher?.subjects || []);
                          setEditTeacherPhone(selectedTeacher?.phone || selectedTeacher?.contact || '');
                          setEditTeacherEmail(selectedTeacher?.email || '');
                          setEditTeacherSpecialization(selectedTeacher?.specialization || '');
                          setEditTeacherContact(selectedTeacher?.contact || selectedTeacher?.phone || '');
                          setEditTeacherUsername(selectedTeacher?.username || '');
                          setEditTeacherPassword(selectedTeacher?.password || '123456');
                          setEditTeacherAcademicRating(selectedTeacher?.academicRating || 4.8);
                          setEditTeacherTasksEnabled(selectedTeacher?.tasksEnabled || false);
                          setIsEditingTeacher(true);
                        }}
                        type="button"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black rounded-lg border border-slate-200 text-slate-400 hover:text-[#D4A33C] hover:border-[#D4A33C] transition-all bg-white cursor-pointer"
                      >
                        <Pencil size={11} className="shrink-0" />
                        <span>تعديل البيانات</span>
                      </button>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight">{selectedTeacher?.name}</h2>
                    </div>

                    {/* Credentials Preview Pill */}
                    <div className="flex items-center gap-2 mt-2 justify-end">
                      <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-xl px-3 py-1.5 flex items-center gap-3 text-xs shadow-2xs">
                        <div className="flex items-center gap-1.5">
                          <User size={13} className="text-indigo-600" />
                          <span className="text-[10px] font-bold text-slate-500 font-sans">اسم المستخدم:</span>
                          <span className="font-black text-indigo-950 font-mono text-xs">{selectedTeacher?.username || 'غير محدد'}</span>
                        </div>
                        <span className="text-indigo-200">|</span>
                        <div className="flex items-center gap-1.5">
                          <Lock size={13} className="text-indigo-600" />
                          <span className="text-[10px] font-bold text-slate-500 font-sans">كلمة المرور:</span>
                          <span className="font-black text-slate-800 font-mono text-xs">
                            {showProfilePassword ? (selectedTeacher?.password || '123456') : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowProfilePassword(!showProfilePassword)}
                            className="text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
                            title={showProfilePassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                          >
                            {showProfilePassword ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-2 justify-end">
                      {selectedTeacher?.subjects?.map(s => (
                        <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-md border border-indigo-100">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                   <div 
                      className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-5 shadow-sm cursor-pointer hover:border-[#D4A33C] transition-all group/profile-rate"
                      onClick={() => {
                        if (selectedTeacher) {
                          setQuickEditRateTeacher(selectedTeacher);
                          setQuickEditPayoutRate(String(selectedTeacher.payoutRate || selectedTeacher.hourlyRate || 0));
                          setQuickEditBillingRate(String(selectedTeacher.billingRate || selectedTeacher.hourlyRate || 0));
                          setQuickEditSession40PayoutRate(String(selectedTeacher.primarySchoolSessionPayout ?? selectedTeacher.sessionPayoutRate ?? 20));
                          setQuickEditSession40BillingRate(String(selectedTeacher.primarySchoolSessionRate ?? selectedTeacher.sessionRate ?? 35));
                          setQuickEditApplyToPrimary(true);
                          setQuickRateError('');
                        }
                      }}
                      title="انقر للتعديل السريع لأسعار المعلم بالساعة والحصة 40 دقيقة 📊"
                   >
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#D4A33C] flex items-center justify-center text-lg font-black shrink-0 group-hover/profile-rate:bg-[#D4A33C] group-hover/profile-rate:text-slate-950 transition-colors">
                         <Pencil size={14} className="group-hover/profile-rate:scale-110 transition-transform" />
                      </div>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                         <div>
                            <p className="text-[8px] font-black text-[#D4A33C] uppercase tracking-widest leading-none mb-1">سعر الفوترة (الطلاب)</p>
                            <p className="text-xs font-black text-slate-900">₪{selectedTeacher?.billingRate}</p>
                         </div>
                         <div className="w-px h-5 bg-slate-200 self-center hidden sm:block" />
                         <div>
                            <p className="text-[8px] font-black text-[#D4A33C] uppercase tracking-widest leading-none mb-1">أجر المعلم (المركز)</p>
                            <p className="text-xs font-black text-slate-900">₪{selectedTeacher?.payoutRate}</p>
                         </div>
                         {(selectedTeacher?.primarySchoolSessionPayout !== undefined || selectedTeacher?.sessionPayoutRate !== undefined) && (
                           <>
                             <div className="w-px h-5 bg-slate-200 self-center hidden sm:block" />
                             <div>
                                <p className="text-[8px] font-black text-amber-700 uppercase tracking-widest leading-none mb-1">حصة 40د (الابتدائي)</p>
                                <p className="text-xs font-black text-amber-800">
                                  طالب: ₪{selectedTeacher?.primarySchoolSessionRate ?? selectedTeacher?.sessionRate ?? 35} | أجر: ₪{selectedTeacher?.primarySchoolSessionPayout ?? selectedTeacher?.sessionPayoutRate ?? 20}
                                </p>
                             </div>
                           </>
                         )}
                         <div className="w-px h-5 bg-slate-200 self-center hidden sm:block" />
                         <div>
                            <p className="text-[8px] font-black text-[#D4A33C] uppercase tracking-widest leading-none mb-1">أجر الساعة الإجمالي</p>
                            <p className="text-xs font-black text-indigo-600">₪{selectedTeacher?.hourlyRate || selectedTeacher?.payoutRate || 0}</p>
                         </div>
                      </div>
                   </div>
                </div>
              </header>
            )}

            {/* Date range filter and export row */}
            <div className="bg-white p-5 rounded-3xl border border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm text-right mt-6">
              <div className="flex flex-wrap items-center gap-3.5 w-full sm:w-auto">
                <div className="text-xs font-black text-slate-500">تصفية كشف الحساب والتقارير بمجال تاريخ محدد:</div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">من</span>
                  <input
                    type="date"
                    value={teacherStartDate}
                    onChange={(e) => setTeacherStartDate(e.target.value)}
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#D4A33C] focus:ring-2 focus:ring-amber-500/5 outline-none transition-all cursor-pointer font-sans"
                    dir="rtl"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">إلى</span>
                  <input
                    type="date"
                    value={teacherEndDate}
                    onChange={(e) => setTeacherEndDate(e.target.value)}
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:border-[#D4A33C] focus:ring-2 focus:ring-amber-500/5 outline-none transition-all cursor-pointer font-sans"
                    dir="rtl"
                  />
                </div>
                {(teacherStartDate || teacherEndDate) && (
                  <button
                    onClick={() => {
                      setTeacherStartDate('');
                      setTeacherEndDate('');
                    }}
                    className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <RotateCcw size={11} />
                    <span>إعادة ضبط</span>
                  </button>
                )}
              </div>

              <div className="self-end sm:self-auto shrink-0 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => exportTeacherToExcel(selectedTeacherId!, teacherStartDate, teacherEndDate)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-[#D4A33C] hover:text-amber-300 font-extrabold text-xs rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer"
                  title="تصدير كشف الحساب والعمليات المالية لملف Excel"
                >
                  <FileSpreadsheet size={14} />
                  <span>تصدير كشف حساب المعلم (Excel) 📊</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportTeacherStatement(selectedTeacherId!, teacherStartDate, teacherEndDate)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-extrabold text-xs rounded-2xl shadow-sm transition-all active:scale-95 cursor-pointer"
                  title="عرض كشف حساب مالي للأستاذ بصيغة PDF قابلة للطباعة"
                >
                  <Printer size={14} className="text-slate-500" />
                  <span>طباعة الكشف 🖨️</span>
                </button>
              </div>
            </div>

            {/* Quick Stats Block */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(() => {
                const stats = getTeacherStats(selectedTeacherId, teacherStartDate, teacherEndDate);
                return [
                  { label: 'إجمالي الساعات', val: `${stats.totalHours.toFixed(1)} س`, icon: Clock, color: 'text-indigo-600', sub: 'الحمل التعليمي' },
                  { label: 'المستحقات الإجمالية', val: `₪${stats.totalEarnings}`, icon: TrendingUp, color: 'text-emerald-600', sub: 'المبلغ المستحق للمعلم' },
                  { label: 'إيراد الأكاديمية (الطلاب)', val: `₪${stats.totalRevenue}`, icon: Briefcase, color: 'text-slate-900', sub: 'قيمة فواتير الطلاب' },
                  { label: 'الرصيد غير المدفوع', val: `₪${stats.balance}`, icon: Wallet, color: stats.balance > 0 ? 'text-rose-600' : 'text-emerald-600', sub: 'المستحقات المعلقة حالياً' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                     <stat.icon size={48} className="absolute -left-4 -bottom-4 text-slate-50 group-hover:scale-110 transition-transform" />
                     <p className="text-[10px] font-black text-slate-400 uppercase mb-3">{stat.label}</p>
                     <h4 className={`text-3xl font-black ${stat.color} tracking-tight leading-none`}>{stat.val}</h4>
                     <p className="text-[10px] font-bold text-slate-300 mt-2">{stat.sub}</p>
                  </div>
                ));
              })()}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Linked Roster of Students */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">الطلاب المنتسبين</h3>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-slate-105 rounded-lg text-[10px] font-black text-slate-500">
                      {getAssignedStudents(selectedTeacherId!).length} نشطين
                    </span>
                    <button 
                      onClick={() => setIsLinkModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 rounded-xl text-[10px] font-black transition-all shadow-sm"
                      title="ربط طالب جديد بالتنسيق المباشر"
                    >
                      <UserPlus size={12} />
                      <span>ربط طالب جديد</span>
                    </button>
                    <button 
                      onClick={() => setIsLinkingStudent(!isLinkingStudent)}
                      className="p-1 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      {isLinkingStudent ? <X size={16} /> : <Plus size={16} />}
                    </button>
                  </div>
                </div>
                
                <AnimatePresence>
                  {isLinkingStudent && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-slate-900 rounded-[2rem] p-6 space-y-4 shadow-xl mb-6 border border-white/5 text-right"
                    >
                      <div className="relative group">
                        <Search size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-white transition-colors" />
                        <input 
                          placeholder="ابحث عن اسم طالب للربط..."
                          value={studentSearchForLink}
                          onChange={e => setStudentSearchForLink(e.target.value)}
                          className="w-full pr-10 pl-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-4 focus:ring-amber-500/20 outline-none transition-all font-bold text-xs text-white"
                        />
                      </div>
                      
                      <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {students
                          .filter(s => {
                            const isNotLinked = !s.teachers?.includes(selectedTeacherId!);
                            const q = (studentSearchForLink || '').trim().toLowerCase();
                            const matchesSearch = !q || (s.name || '').toLowerCase().includes(q);
                            return isNotLinked && matchesSearch;
                          })
                          .map(student => (
                            <button
                              key={student.id}
                              onClick={() => linkStudentToTeacher(student.id)}
                              className="w-full p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between hover:bg-[#D4A33C] hover:text-slate-950 transition-all group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[10px] font-black text-white">
                                  {(student.name || '').charAt(0)}
                                </div>
                                <span className="text-xs font-bold text-white">{student.name}</span>
                              </div>
                              <Plus size={14} className="text-white/20 group-hover:text-slate-950" />
                            </button>
                          ))
                        }
                        {students.filter(s => !s.teachers?.includes(selectedTeacherId!) && (!studentSearchForLink || (s.name || '').toLowerCase().includes((studentSearchForLink || '').toLowerCase()))).length === 0 && (
                          <p className="text-center py-4 text-[10px] font-black text-slate-650 uppercase">لا يوجد طلاب إضافيين متاحين</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-3">
                  {getAssignedStudents(selectedTeacherId!).map(student => {
                    const studentAssignment = assignments.find(a => a.studentId === student.id && a.teacherId === selectedTeacherId);
                    const specificPayoutRate = studentAssignment?.teacherPayoutRate !== undefined ? studentAssignment.teacherPayoutRate : (selectedTeacher?.payoutRate || selectedTeacher?.hourlyRate || 35);
                    const specificBillingRate = studentAssignment?.studentBillingRate !== undefined ? studentAssignment.studentBillingRate : (student.customRates?.[selectedTeacherId!] !== undefined ? student.customRates[selectedTeacherId!] : (student.hourlyRate || selectedTeacher?.billingRate || selectedTeacher?.hourlyRate || billingRate || 60));

                    return (
                      <div key={student.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-[#D4A33C] transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#D4A33C] group-hover:text-slate-950 transition-all font-black">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 leading-tight">{student.name}</p>
                            {(() => {
                              const isStudent40 = 
                                student.preferredPricingUnit === 'session_40' ||
                                student.sessionSystem === 'session_40' ||
                                (student.grade ? getDefaultPricingUnitForGrade(student.grade) === 'session_40' : false);
                              return (
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <span className="text-[10px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg border border-amber-100 font-bold">
                                    أجر المعلم: ₪{specificPayoutRate} {isStudent40 ? '(حصة 40د)' : '(ساعة)'}
                                  </span>
                                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg border border-indigo-100 font-bold">
                                    الفوترة: ₪{specificBillingRate} {isStudent40 ? '(حصة 40د)' : '(ساعة)'}
                                  </span>
                                  {isStudent40 && (
                                    <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded-md font-extrabold border border-amber-300">
                                      🎓 40 دقيقة
                                    </span>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setSelectedStudentForRates(student);
                              setCustomPayoutInput(String(specificPayoutRate));
                              setCustomBillingInput(String(specificBillingRate));
                              setIsEditingCustomRates(true);
                            }}
                            className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-amber-500/10 hover:text-[#D4A33C] transition-all"
                            title="تعديل التسعير الخاص للطالب"
                          >
                            <Pencil size={15} />
                          </button>
                          <button 
                            onClick={() => {
                              setBookingTeacher(selectedTeacher!);
                              setBookingStudent(student);
                              setBookingSubject(selectedTeacher!.subjects[0] || '');
                            }}
                            className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-amber-500/10 hover:text-[#D4A33C] transition-all"
                          >
                            <Calendar size={18} />
                          </button>
                          <button 
                            onClick={() => unlinkStudentFromTeacher(student.id)}
                            className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-200 hover:bg-rose-50 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {getAssignedStudents(selectedTeacherId!).length === 0 && !isLinkingStudent && (
                    <div className="p-20 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                       <p className="text-[10px] font-black text-slate-300 uppercase">لا يوجد طلاب منتسبين حالياً</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Class History Ledger */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                   <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">سجل الحصص التدريسية والتدقيق</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">تفاصيل ومواعيد الحصص المنجزة</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative group">
                           <Search size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#D4A33C] transition-colors" />
                           <input 
                              type="text"
                              placeholder="البحث في السجل..."
                              value={historySearch}
                              onChange={e => setHistorySearch(e.target.value)}
                              className="pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all w-[240px]"
                           />
                        </div>
                      </div>
                   </div>

                   <div className="overflow-x-auto text-right">
                      <table className="w-full">
                        <thead className="bg-slate-50/30 border-b border-slate-100">
                          <tr>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">طالب الحصة</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">المادة</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">مدة الحصة</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 text-left">تاريخ التسجيل</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            const stats = getTeacherStats(selectedTeacherId!, teacherStartDate, teacherEndDate);
                            const q = (historySearch || '').trim().toLowerCase();
                            const filtered = stats.sessions.filter(s => {
                              const student = students.find(st => st.id === s.studentId);
                              const matchSearch = !q ||
                                (student?.name || '').toLowerCase().includes(q) || 
                                (s.subject || '').toLowerCase().includes(q);
                              return matchSearch;
                            });

                            if (filtered.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={4} className="py-32 text-center opacity-30">
                                     <History size={48} className="mx-auto mb-4" />
                                     <p className="text-xs font-bold uppercase">لا يوجد أي حصص دراسية مسجلة بعد</p>
                                  </td>
                                </tr>
                              );
                            }

                            return filtered.map(session => (
                              <tr key={session.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-8 py-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                                      {students.find(s => s.id === session.studentId)?.name.charAt(0)}
                                    </div>
                                    <span className="text-sm font-bold text-slate-900">{students.find(s => s.id === session.studentId)?.name}</span>
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                  <span className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-550 uppercase">
                                    {session.subject}
                                  </span>
                                </td>
                                <td className="px-8 py-6">
                                  <div className="flex items-center gap-2">
                                    <Clock size={12} className="text-indigo-600" />
                                    <span className="text-sm font-bold text-slate-900">{session.durationHours} ساعة</span>
                                  </div>
                                </td>
                                <td className="px-8 py-6 text-left">
                                  <div className="flex items-center justify-end gap-2">
                                    <span className="text-xs font-bold text-slate-400">{formatCustomDate(session.date)}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenAdminEditSession(session)}
                                      className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 hover:text-amber-800 transition-colors flex items-center justify-center cursor-pointer shrink-0 border border-amber-200/50 shadow-xs"
                                      title="تعديل الحصة يدوياً وتحديد الأسعار (صلاحية المدير) ✏️"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSession(session.id)}
                                      className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                                      title="حذف الحصة نهائياً"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                        {(() => {
                          const stats = getTeacherStats(selectedTeacherId!, teacherStartDate, teacherEndDate);
                          const q = (historySearch || '').trim().toLowerCase();
                          const filtered = stats.sessions.filter(s => {
                            const student = students.find(st => st.id === s.studentId);
                            const matchSearch = !q ||
                              (student && student.name.toLowerCase().includes(q)) ||
                              (s.subject && s.subject.toLowerCase().includes(q));
                            return matchSearch;
                          });
                          if (filtered.length === 0) return null;
                          const totalH = filtered.reduce((acc, s) => acc + (s.durationHours || 0), 0);
                          return (
                            <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-black">
                              <tr>
                                <td colSpan={2} className="px-8 py-4 text-xs font-black text-slate-800">
                                  مجموع الساعات الكلي لجميع الحصص المسجلة ({filtered.length} حصة):
                                </td>
                                <td className="px-8 py-4 text-xs font-black font-mono text-[#D4A33C] bg-amber-500/10">
                                  {totalH.toFixed(1)} ساعة
                                </td>
                                <td className="px-8 py-4 text-xs text-slate-400 text-left">
                                  إجمالي ساعات الكشف
                                </td>
                              </tr>
                            </tfoot>
                          );
                        })()}
                      </table>
                   </div>
                </div>

                {/* Payment History Ledger */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col mt-6">
                   <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">سجل المدفوعات وتصفية المستحقات</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">كشف الدفعات النقدية والتحويلات المسجلة للمعلم (عرض فقط)</p>
                      </div>

                      <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-[10px] font-extrabold text-slate-700 flex items-center gap-2 max-w-md">
                        <BarChart3 size={14} className="text-[#D4A33C] shrink-0" />
                        <span>لتسجيل دفعات مالية جديدة، تعديل الدفعات السابقة أو طباعة كشف الرواتب، يرجى استخدام <strong>تبويب التقارير والمخططات 📊 (دفتر الأستاذ والرواتب)</strong> لتجنب تكرار المهام.</span>
                      </div>
                   </div>

                   {/* Sub-Tabs: Active vs Archived Payments */}
                   <div className="flex border-b border-slate-200 px-8 bg-slate-50/30">
                     <button
                       type="button"
                       onClick={() => setPaymentArchivedView('active')}
                       className={`px-4 py-2.5 text-center text-[10px] font-black transition-all border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
                         paymentArchivedView === 'active'
                           ? 'border-[#D4A33C] text-[#1A365D]'
                           : 'border-transparent text-slate-400 hover:text-slate-650'
                       }`}
                     >
                       💸 الدفعات النشطة ({(() => {
                         const statsForPeriod = getTeacherStats(selectedTeacherId!, teacherStartDate, teacherEndDate);
                         return statsForPeriod.payments.filter(p => !p.archived).length;
                       })()})
                     </button>
                     <button
                       type="button"
                       onClick={() => setPaymentArchivedView('archived')}
                       className={`px-4 py-2.5 text-center text-[10px] font-black transition-all border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
                         paymentArchivedView === 'archived'
                           ? 'border-[#D4A33C] text-[#1A365D]'
                           : 'border-transparent text-slate-400 hover:text-slate-650'
                       }`}
                     >
                       📦 أرشيف الدفعات القديمة (&gt; شهرين) ({(() => {
                         const statsForPeriod = getTeacherStats(selectedTeacherId!, teacherStartDate, teacherEndDate);
                         return statsForPeriod.payments.filter(p => p.archived).length;
                       })()})
                     </button>
                   </div>

                   <div className="overflow-x-auto text-right">
                      <table className="w-full">
                        <thead className="bg-slate-50/30 border-b border-slate-100">
                          <tr>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-right">المبلغ المدفوع</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-right">التاريخ</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-right">الملاحظات والبيان</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 text-left">رمز الحركة</th>
                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 text-center">الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            const statsForPeriod = getTeacherStats(selectedTeacherId!, teacherStartDate, teacherEndDate);
                            const teacherPayments = statsForPeriod.payments.filter(p => {
                              if (paymentArchivedView === 'active' && p.archived) return false;
                              if (paymentArchivedView === 'archived' && !p.archived) return false;
                              return true;
                            });

                            if (teacherPayments.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={5} className="py-16 text-center opacity-30">
                                     <Wallet size={40} className="mx-auto mb-4" />
                                     <p className="text-xs font-bold uppercase">
                                       {paymentArchivedView === 'active' 
                                         ? "لا يوجد أي دفعات مالية نشطة مسجلة بعد لهذا المعلم" 
                                         : "لا يوجد أي دفعات مؤرشفة للمعلم"}
                                     </p>
                                  </td>
                                </tr>
                              );
                            }

                            return teacherPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(pay => (
                              <tr key={pay.id} className="hover:bg-slate-55/40 transition-colors">
                                <td className="px-8 py-4 font-bold text-emerald-600 font-mono">
                                  ₪{pay.amount.toFixed(1)}
                                </td>
                                <td className="px-8 py-4 text-xs font-bold text-slate-500">
                                  {formatCustomDate(pay.date)}
                                </td>
                                <td className="px-8 py-4 text-xs font-semibold text-slate-600">
                                  {pay.note || <span className="text-slate-300 italic">بدون بيان</span>}
                                  {pay.archived && (
                                    <span className="mr-2 px-1.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[8px] font-black">مؤرشفة</span>
                                  )}
                                </td>
                                <td className="px-8 py-4 text-[10px] text-left font-mono text-slate-400">
                                  {pay.id}
                                </td>
                                <td className="px-8 py-4 text-center">
                                  <div className="flex items-center gap-1.5 justify-center">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditPayment(pay)}
                                      className="h-8 px-2.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-[#D4A33C] hover:text-slate-950 transition-all flex items-center gap-1 justify-center cursor-pointer font-black text-xs border border-amber-200/60 shadow-xs"
                                      title="تعديل الدفعة المالية للمعلم"
                                    >
                                      <Pencil size={12} />
                                      <span>تعديل</span>
                                    </button>
                                    {!pay.archived && isOlderThanTwoMonths(pay.date) && (
                                      <button
                                        type="button"
                                        onClick={() => handleArchivePayment(pay.id)}
                                        className="h-8 px-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all cursor-pointer flex items-center gap-1 font-black text-[10px] border border-emerald-200/60"
                                        title="أرشفة الدفعة (أقدم من شهرين)"
                                      >
                                        <Archive size={12} />
                                        <span>أرشفة</span>
                                      </button>
                                    )}
                                    {pay.archived && (
                                      <button
                                        type="button"
                                        onClick={() => handleUnarchivePayment(pay.id)}
                                        className="h-8 px-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-all cursor-pointer flex items-center gap-1 font-black text-[10px] border border-indigo-200/60"
                                        title="إلغاء الأرشفة"
                                      >
                                        <RotateCcw size={12} />
                                        <span>استعادة</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleDeletePayment(pay.id)}
                                      className="h-8 px-2.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-all flex items-center gap-1 justify-center cursor-pointer font-black text-xs border border-rose-200/60 shadow-xs"
                                      title="حذف الدفعة المالية"
                                    >
                                      <Trash2 size={12} />
                                      <span>حذف</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                   </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Confirm Modals */}
      <AnimatePresence>
        {bookingTeacher && bookingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/40" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden relative text-right"
            >
              <button 
                onClick={() => { setBookingTeacher(null); setBookingStudent(null); }}
                className="absolute top-8 left-8 p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
              >
                <X size={20} />
              </button>

              <div className="p-10">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-14 h-14 rounded-2xl bg-[#D4A33C] flex items-center justify-center text-slate-950 shadow-xl">
                    <Calendar size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">تأكيد حجز وتسجيل حصة</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase mt-1">تنسيق مالي وأكاديمي فوري</p>
                  </div>
                </div>

                <div className="space-y-8 text-slate-855">
                  <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 block mb-1">المعلم والمدرب</span>
                      <p className="text-base font-black text-slate-900">{bookingTeacher.name}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 block mb-1">الطالب المستهدف</span>
                      <p className="text-base font-black text-slate-900">{bookingStudent.name}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 mr-1">المادة الدراسية للحصة</label>
                      <select 
                        value={bookingSubject}
                        onChange={e => setBookingSubject(e.target.value)}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-[#D4A33C] outline-none transition-all font-bold appearance-none cursor-pointer text-xs"
                      >
                        {bookingTeacher.subjects.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 mr-1">المدة الزمنية (ساعة)</label>
                        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                          <input 
                            type="range" min="0.5" max="8" step="0.25" 
                            value={bookingDuration}
                            onChange={e => setBookingDuration(Number(e.target.value))}
                            className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#D4A33C]"
                          />
                          <div className="flex items-center gap-1.5 shrink-0">
                            <input 
                              type="number"
                              min="0.1"
                              max="24"
                              step="0.1"
                              value={bookingDuration === 0 ? '' : bookingDuration}
                              onChange={e => {
                                const val = e.target.value;
                                setBookingDuration(val === '' ? 0 : parseFloat(val));
                              }}
                              className="w-16 h-10 px-2 text-center font-black bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-[#D4A33C]"
                              placeholder="ساعات"
                            />
                            <span className="text-[10px] font-bold text-slate-400">ساعة</span>
                          </div>
                        </div>
                        {/* Quick choices for booking duration */}
                        <div className="flex flex-wrap gap-1 mt-1 justify-start">
                          {[
                            { label: '30 د (0.5 س)', val: 0.5 },
                            { label: '45 د (0.75 س)', val: 0.75 },
                            { label: 'ساعة (1 س)', val: 1 },
                            { label: 'ساعة ونصف (1.5 س)', val: 1.5 },
                            { label: 'ساعتان (2 س)', val: 2 },
                            { label: '3 ساعات (3 س)', val: 3 }
                          ].map((item) => (
                            <button
                              key={item.val}
                              type="button"
                              onClick={() => setBookingDuration(item.val)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer border ${
                                bookingDuration === item.val
                                  ? 'bg-[#D4A33C] border-[#D4A33C] text-slate-950 shadow-xs'
                                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700 mr-1">تاريخ الحصة</label>
                        <input 
                          type="date" 
                          value={bookingDate}
                          onChange={e => setBookingDate(e.target.value)}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-5 outline-none font-bold text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    {bookingSuccess ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-emerald-600 text-white p-6 rounded-3xl flex items-center gap-4 shadow-xl"
                      >
                        <CheckCircle2 size={32} />
                        <div>
                          <p className="font-black text-lg">تم تسجيل الحصة بنجاح</p>
                          <p className="text-emerald-100 text-xs font-bold mt-1">تمت مجانستها وخصم رصيد الطالب وإضافة مستحقات المعلم</p>
                        </div>
                      </motion.div>
                    ) : (
                      <button 
                        onClick={handleBookSession}
                        disabled={isSubmitting || !bookingSubject}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-2xl hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
                      >
                        {isSubmitting ? (
                          <Clock className="animate-spin" />
                        ) : (
                          <>
                            تسجيل وتأكيد الحصة التدريسية
                            <ArrowRight size={16} className="group-hover:-translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

       {/* Teacher Quick Edit Rate Modal */}
      <AnimatePresence>
        {quickEditRateTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/40" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden relative text-right"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setQuickEditRateTeacher(null)}
                className="absolute top-6 left-6 p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all z-10"
                type="button"
              >
                <X size={20} />
              </button>

              <div className="p-8 md:p-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-[#D4A33C]/10 text-[#D4A33C] flex items-center justify-center shadow-xl shrink-0">
                    <DollarSign size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight font-sans">تعديل سريع لأسعار المعلم</h3>
                    <p className="text-xs text-slate-500 font-bold mt-1">
                      تحديث أسعار المعلم: <span className="text-[#D4A33C] font-black">{quickEditRateTeacher.name}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {quickRateError && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold leading-relaxed">
                      {quickRateError}
                    </div>
                  )}

                  {/* Section 1: 40-Minute Session System (Elementary) */}
                  <div className="p-5 bg-amber-50/70 border border-amber-200/80 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-black">🎓</span>
                        <div>
                          <h4 className="text-xs font-black text-amber-950">نظام الحصة (40 دقيقة) - مخصص لطلاب الابتدائي</h4>
                          <p className="text-[10px] text-amber-800 font-bold mt-0.5">الصفوف 1-4 الأساسية والمراحل الابتدائية</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-amber-200/70 text-amber-900 font-black px-2 py-0.5 rounded-full">40 دقيقة</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-700 mb-1 text-right">أجر المعلم للحصة 40د (₪)</label>
                        <div className="relative">
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₪</span>
                          <input 
                            type="number"
                            value={quickEditSession40PayoutRate}
                            onChange={e => setQuickEditSession40PayoutRate(e.target.value)}
                            className="w-full pr-9 pl-3 py-2.5 bg-white border border-amber-300/80 rounded-xl font-black text-xs text-right focus:ring-4 focus:ring-amber-500/10 focus:border-amber-600 outline-none transition-all"
                            placeholder="20"
                          />
                        </div>
                        <p className="text-[9px] text-slate-500 mt-1">الأجر الفعلي للمعلم عن كل حصة 40 دقيقة.</p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-700 mb-1 text-right">سعر الفوترة للطالب للحصة 40د (₪)</label>
                        <div className="relative">
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₪</span>
                          <input 
                            type="number"
                            value={quickEditSession40BillingRate}
                            onChange={e => setQuickEditSession40BillingRate(e.target.value)}
                            className="w-full pr-9 pl-3 py-2.5 bg-white border border-amber-300/80 rounded-xl font-black text-xs text-right focus:ring-4 focus:ring-amber-500/10 focus:border-amber-600 outline-none transition-all"
                            placeholder="35"
                          />
                        </div>
                        <p className="text-[9px] text-slate-500 mt-1">سعر اقتطاع رصيد الطالب لكل حصة 40 دقيقة.</p>
                      </div>
                    </div>

                    <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={quickEditApplyToPrimary}
                        onChange={e => setQuickEditApplyToPrimary(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300"
                      />
                      <span className="text-[11px] font-bold text-amber-950">
                        تطبيق نظام 40 دقيقة وتحديث كافة تنسيبات وأسعار طلاب الابتدائي تلقائياً
                      </span>
                    </label>
                  </div>

                  {/* Section 2: Hourly System (60 Minutes) */}
                  <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-3xl space-y-4">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center text-xs font-black">⏱️</span>
                        <div>
                          <h4 className="text-xs font-black text-slate-900">نظام الساعات (60 دقيقة) - للمراحل الإعدادية والثانوية</h4>
                          <p className="text-[10px] text-slate-500 font-bold mt-0.5">للصفوف من الخامس حتى الثاني عشر والبجروت</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-slate-200 text-slate-800 font-black px-2 py-0.5 rounded-full">ساعة (60د)</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-700 mb-1 text-right">أجر المعلم بالساعة (₪)</label>
                        <div className="relative">
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₪</span>
                          <input 
                            type="number"
                            value={quickEditPayoutRate}
                            onChange={e => setQuickEditPayoutRate(e.target.value)}
                            className="w-full pr-9 pl-3 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-xs text-right focus:ring-4 focus:ring-slate-400/10 focus:border-slate-500 outline-none transition-all"
                            placeholder="20"
                          />
                        </div>
                        <p className="text-[9px] text-slate-500 mt-1">أجر الساعة الكلي الفعلي المستحق للمعلم.</p>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-700 mb-1 text-right">سعر فوترة الطالب بالساعة (₪)</label>
                        <div className="relative">
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₪</span>
                          <input 
                            type="number"
                            value={quickEditBillingRate}
                            onChange={e => setQuickEditBillingRate(e.target.value)}
                            className="w-full pr-9 pl-3 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-xs text-right focus:ring-4 focus:ring-slate-400/10 focus:border-slate-500 outline-none transition-all"
                            placeholder="35"
                          />
                        </div>
                        <p className="text-[9px] text-slate-500 mt-1">المبلغ الذي يُفوتر به الطالب لكل ساعة تدريسية.</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={handleQuickUpdateRate}
                      disabled={isSubmittingQuickRate}
                      type="button"
                      className="flex-1 py-3.5 bg-[#D4A33C] hover:bg-amber-500 text-slate-950 text-xs font-black rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingQuickRate ? 'جاري الحفظ والتحديث...' : 'حفظ التغييرات وتحديث السجلات'}
                    </button>
                    <button 
                      onClick={() => setQuickEditRateTeacher(null)}
                      disabled={isSubmittingQuickRate}
                      type="button"
                      className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-2xl transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settle Previous Months Dues Modal */}
      <AnimatePresence>
        {isSettleDuesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 backdrop-blur-md bg-slate-950/40" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden relative text-right"
              onClick={e => e.stopPropagation()}
            >
              
              {/* Modal Close Button */}
              <button 
                onClick={() => setIsSettleDuesModalOpen(false)}
                className="absolute top-6 left-6 p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all cursor-pointer border-none bg-transparent outline-none"
                type="button"
                disabled={isSubmittingSettleDues}
              >
                <X size={18} />
              </button>

              <div className="p-8 md:p-10 max-h-[85vh] overflow-y-auto">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-md">
                    <DollarSign size={28} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">تصفير مستحقات المعلمين للأشهر السابقة 💸</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                      تسوية تلقائية لتصفير وصرف كافة مستحقات المعلمين المتراكمة والمعلقة في النظام حتى نهاية الشهر الماضي.
                    </p>
                  </div>
                </div>

                {settleDuesSuccess ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                      <Check size={36} className="stroke-[3]" />
                    </div>
                    <h4 className="text-lg font-black text-slate-900">تمت التسوية بنجاح! 🎉</h4>
                    <p className="text-xs text-slate-500 font-bold mt-1.5 leading-relaxed">
                      تم رصد وتصنيف حركات دفع تسوية لتصفير مستحقات المعلمين المحددين للأشهر السابقة وتحديث البيانات المالية على الفور.
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-6">
                    {/* Alert Info box */}
                    <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-4 flex gap-3 text-right">
                      <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={16} />
                      <p className="text-[10px] text-amber-800 font-bold leading-relaxed">
                        تقوم هذه الميزة بالتحقق من مستحقات المعلمين الكلية (ساعات الحصص المنجزة والمعتمدة مطروحاً منها الدفعات المسددة) التي تمت جدولتها <strong>قبل بداية الشهر الجاري</strong>.
                        عند التأكيد، سيقوم النظام تلقائياً بإنشاء قيد مالي (دفعة) بقيمة هذا الرصيد مؤرخة بآخر يوم من الشهر الماضي كـ "دفعة تسوية" لتصبح مستحقات المعلم القديمة مساوية للصفر تماماً.
                      </p>
                    </div>

                    {/* Teacher Dues List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs font-black text-slate-500 px-2">
                        <span>قائمة المعلمين المستحقين للأشهر السابقة</span>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              const all: Record<string, boolean> = {};
                              teachers.forEach(t => {
                                if (getTeacherPreviousMonthsBalance(t.id) > 0) {
                                  all[t.id] = true;
                                }
                              });
                              setSelectedTeachersToSettle(all);
                            }}
                            className="text-[10.5px] text-indigo-600 hover:text-indigo-800 font-black bg-transparent border-none outline-none cursor-pointer"
                          >
                            تحديد الكل ☑️
                          </button>
                          <span className="text-slate-300">|</span>
                          <button
                            type="button"
                            onClick={() => setSelectedTeachersToSettle({})}
                            className="text-[10.5px] text-slate-500 hover:text-slate-700 font-black bg-transparent border-none outline-none cursor-pointer"
                          >
                            إلغاء التحديد ❌
                          </button>
                        </div>
                      </div>

                      <div className="border border-slate-150 rounded-2xl overflow-hidden max-h-[35vh] overflow-y-auto bg-slate-50/30">
                        {teachers.filter(t => getTeacherPreviousMonthsBalance(t.id) > 0).length === 0 ? (
                          <div className="py-12 text-center text-slate-400 font-bold text-xs">
                            لا يوجد أي مستحقات معلقة للأشهر السابقة بانتظار الصرف أو التسوية لجميع المعلمين. الجميع مصفرون! ✓✨
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {teachers
                              .filter(t => getTeacherPreviousMonthsBalance(t.id) > 0)
                              .map(t => {
                                const bal = getTeacherPreviousMonthsBalance(t.id);
                                const isChecked = !!selectedTeachersToSettle[t.id];
                                return (
                                  <div 
                                    key={t.id} 
                                    onClick={() => {
                                      setSelectedTeachersToSettle(prev => ({
                                        ...prev,
                                        [t.id]: !prev[t.id]
                                      }));
                                    }}
                                    className={`p-4 flex items-center justify-between hover:bg-slate-100/50 transition-colors cursor-pointer select-none ${isChecked ? 'bg-indigo-50/20' : ''}`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <input 
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => {}} // handled by div click
                                        className="rounded text-rose-600 focus:ring-rose-500 h-4 w-4 border-slate-300 cursor-pointer"
                                      />
                                      <div>
                                        <span className="text-xs font-black text-slate-800 block">{t.name}</span>
                                        <span className="text-[9px] text-slate-400 font-bold">{t.specialization || 'مدرس الأكاديمية'}</span>
                                      </div>
                                    </div>
                                    <div className="text-left font-mono">
                                      <span className="text-xs font-black text-rose-600">₪{bal.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</span>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Summary metrics bar */}
                    {(() => {
                      const list = teachers.filter(t => getTeacherPreviousMonthsBalance(t.id) > 0 && !!selectedTeachersToSettle[t.id]);
                      const totalSelected = list.reduce((sum, t) => sum + getTeacherPreviousMonthsBalance(t.id), 0);
                      
                      return (
                        <div className="bg-slate-900 text-white rounded-2xl p-4 flex items-center justify-between text-right">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block">إجمالي المعلمين المحددين للتسوية:</span>
                            <span className="text-sm font-black text-white mt-0.5 block">{list.length} معلماً</span>
                          </div>
                          <div className="text-left">
                            <span className="text-[10px] text-slate-400 font-bold block">مجموع المبالغ المُراد تصفيرها:</span>
                            <span className="text-lg font-black text-amber-300 font-mono mt-0.5 block">
                              ₪{totalSelected.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Submit Actions */}
                    <div className="flex gap-3 pt-2">
                      <button 
                        onClick={handleBulkSettlePreviousMonthsDues}
                        disabled={isSubmittingSettleDues || teachers.filter(t => getTeacherPreviousMonthsBalance(t.id) > 0 && !!selectedTeachersToSettle[t.id]).length === 0}
                        type="button"
                        className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:hover:bg-rose-600"
                      >
                        {isSubmittingSettleDues ? 'جاري تصفير المستحقات وإنشاء الدفعات...' : 'تأكيد تصفير وصرف كافة المستحقات المحددة ⚡'}
                      </button>
                      <button 
                        onClick={() => setIsSettleDuesModalOpen(false)}
                        disabled={isSubmittingSettleDues}
                        type="button"
                        className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-2xl transition-all cursor-pointer border-none outline-none select-none"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Student Link Override Modal */}
      <AnimatePresence>
        {isLinkModalOpen && selectedTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/40" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden relative text-right"
            >
              <button 
                onClick={() => { setIsLinkModalOpen(false); setStudentLinkSearch(''); }}
                className="absolute top-8 left-8 p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
              >
                <X size={20} />
              </button>

              <div className="p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xl">
                    <UserPlus size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">ربط وتنسيب طالب جديد</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase mt-1">المعلم الحالي: {selectedTeacher.name}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Search box inside modal */}
                  <div className="relative group">
                    <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-605 transition-colors" />
                    <input 
                      type="text"
                      placeholder="ابحث عن اسم طالب لربطه بالمعلم..."
                      value={studentLinkSearch}
                      onChange={e => setStudentLinkSearch(e.target.value)}
                      className="w-full pr-11 pl-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all font-bold text-xs text-right text-slate-900"
                      autoFocus
                    />
                  </div>

                  {/* List of unassigned matches */}
                  <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {(() => {
                      const unlinkedStudents = students.filter(s => {
                        const isNotLinked = !s.teachers?.includes(selectedTeacher.id);
                        const q = (studentLinkSearch || '').trim().toLowerCase();
                        const matchesSearch = !q || (s.name || '').toLowerCase().includes(q);
                        return isNotLinked && matchesSearch;
                      });

                      if (unlinkedStudents.length === 0) {
                        return (
                          <div className="py-10 text-center text-slate-405 border border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                            <p className="text-xs font-bold text-slate-400">لا يوجد طلاب مطابقين للبحث أو أن جميعهم منسّبين بالفعل للأستاذ.</p>
                          </div>
                        );
                      }

                      return unlinkedStudents.map(student => (
                        <button
                          key={student.id}
                          onClick={async () => {
                            await linkStudentToTeacher(student.id);
                            setIsLinkModalOpen(false);
                            setStudentLinkSearch('');
                          }}
                          className="w-full p-4 bg-slate-50 border border-slate-100/70 hover:border-indigo-500/40 rounded-2xl flex items-center justify-between hover:bg-indigo-50/40 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700 flex items-center justify-center text-xs font-black transition-all">
                              {student.name.charAt(0)}
                            </div>
                            <span className="text-xs font-black text-slate-800">{student.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200/60 rounded-xl text-[10px] font-black text-slate-600 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-transparent transition-all shadow-sm">
                            <Plus size={10} />
                            <span>ربط الآن</span>
                          </div>
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Teacher Payment / Cash payout Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && selectedPayTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/40" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden relative text-right"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => { setIsPaymentModalOpen(false); setSelectedPayTeacher(null); }}
                className="absolute top-8 left-8 p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
                type="button"
              >
                <X size={20} />
              </button>

              <div className="p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-xl">
                    <Wallet size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">تسجيل دفعة مالية للمعلم</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase mt-1">تصفية وصرف مستحقات المعلم: {selectedPayTeacher.name}</p>
                  </div>
                </div>

                {(() => {
                  const stats = getTeacherStats(selectedPayTeacher.id);
                  const parsedAmount = Number(payAmount) || 0;
                  const balanceAfterPayment = stats.balance - parsedAmount;

                  return (
                    <form onSubmit={handleOpenConfirmPayment} className="space-y-6">
                      <div className="grid grid-cols-3 gap-4 bg-slate-50 p-5 rounded-3xl border border-slate-100 text-center">
                        <div>
                          <span className="text-[9px] font-black text-slate-400 block mb-1">المستحقات الإجمالية</span>
                          <p className="text-sm font-black text-[#1A365D]">₪{stats.totalEarnings.toFixed(1)}</p>
                        </div>
                        <div className="border-r border-slate-200">
                          <span className="text-[9px] font-black text-slate-400 block mb-1">المدفوع سابقاً</span>
                          <p className="text-sm font-black text-slate-700">₪{stats.totalReceived.toFixed(1)}</p>
                        </div>
                        <div className="border-r border-slate-200">
                          <span className="text-[9px] font-black text-slate-400 block mb-1">الرصيد المتاح المستحق</span>
                          <p className="text-sm font-black text-rose-600">₪{stats.balance.toFixed(1)}</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-emerald-500" />
                            المبلغ المراد صرفه ونقده (₪)
                          </label>
                          <input 
                            type="number" 
                            required
                            min="1"
                            placeholder="مثال: 200"
                            value={payAmount === 0 ? '' : payAmount}
                            onChange={e => {
                              const val = e.target.value;
                              setPayAmount(val === '' ? '' : parseFloat(val));
                            }}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-sm text-right"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2 col-span-2">
                            <label className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-emerald-500" />
                              تاريخ الدفعة
                            </label>
                            <input 
                              type="date" 
                              required
                              value={payDate}
                              onChange={e => setPayDate(e.target.value)}
                              className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none font-bold text-xs"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-emerald-500" />
                            ملاحظة / بيان الصرف (اختياري)
                          </label>
                          <textarea 
                            value={payNote}
                            onChange={e => setPayNote(e.target.value)}
                            placeholder="مثال: دفعة رصيد الحصص لشهر مايو نقداً..."
                            rows={2}
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-xs resize-none"
                          />
                        </div>
                      </div>

                      {/* Live balance calculation */}
                      {parsedAmount > 0 && (
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs font-bold flex items-center justify-between text-slate-600">
                          <span>الرصيد بعد صرف هذه الدفعة:</span>
                          <span className={`font-black font-mono text-sm ${balanceAfterPayment > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            ₪{balanceAfterPayment.toFixed(1)}
                          </span>
                        </div>
                      )}

                      <div className="pt-4">
                        {paymentSuccess ? (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-emerald-600 text-white p-5 rounded-2xl flex items-center gap-4 shadow-xl"
                          >
                            <CheckCircle2 size={24} className="shrink-0" />
                            <div>
                              <p className="font-black text-sm">تم تسجيل الدفعة وصرفها بنجاح!</p>
                              <p className="text-emerald-100 text-[10px] font-bold mt-0.5">تم تحديث كشف الحساب والذمم المستحقة للمعلم فوراً.</p>
                            </div>
                          </motion.div>
                        ) : (
                          <button 
                            type="submit"
                            disabled={isSubmittingPayment || parsedAmount <= 0}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
                          >
                            {isSubmittingPayment ? (
                              <Clock className="animate-spin" />
                            ) : (
                              <>
                                تسجيل وصرف الدفعة الماليّة
                                <ArrowRight size={16} />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </form>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Teacher Payment Edit Modal */}
      <AnimatePresence>
        {isEditPaymentModalOpen && editingPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/40" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden relative text-right"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => { setIsEditPaymentModalOpen(false); setEditingPayment(null); }}
                className="absolute top-8 left-8 p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
                type="button"
              >
                <X size={20} />
              </button>

              <div className="p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl">
                    <Pencil size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">تعديل الدفعة المالية للمعلم</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase mt-1">تعديل قيمة وتاريخ وسند الصرف والمدفوعات</p>
                  </div>
                </div>

                <form onSubmit={handleUpdatePayment} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-indigo-500" />
                        المعلم المستفيد من الصرف
                      </label>
                      <select
                        value={editPayTeacherId}
                        onChange={e => setEditPayTeacherId(e.target.value)}
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-xs text-right"
                        required
                      >
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.name} ({t.subject || 'معلم'})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-indigo-500" />
                        المبلغ المعدل (₪)
                      </label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        placeholder="مثال: 200"
                        value={editPayAmount}
                        onChange={e => {
                          const val = e.target.value;
                          setEditPayAmount(val === '' ? '' : parseFloat(val));
                        }}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-sm text-right"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <label className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-indigo-500" />
                          التاريخ المعدل
                        </label>
                        <input 
                          type="date" 
                          required
                          value={editPayDate}
                          onChange={e => setEditPayDate(e.target.value)}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-indigo-500" />
                        ملاحظة / بيان الصرف المعدّل
                      </label>
                      <textarea 
                        value={editPayNote}
                        onChange={e => setEditPayNote(e.target.value)}
                        placeholder="مثال: دفعة رصيد الحصص لشهر مايو..."
                        rows={2}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-xs resize-none"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    {editPaymentSuccess ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-emerald-600 text-white p-5 rounded-2xl flex items-center gap-4 shadow-xl"
                      >
                        <CheckCircle2 size={24} className="shrink-0" />
                        <div>
                          <p className="font-black text-sm">تم تعديل الدفعة بنجاح!</p>
                          <p className="text-emerald-100 text-[10px] font-bold mt-0.5">تم تحديث الحسابات والذمم وإعادة حساب الميزانية فوراً.</p>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex gap-4">
                        <button 
                          type="submit"
                          disabled={isSubmittingEditPayment || !editPayAmount || Number(editPayAmount) <= 0}
                          className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
                        >
                          {isSubmittingEditPayment ? (
                            <Clock className="animate-spin" />
                          ) : (
                            <>
                              حفظ التعديلات الماليّة
                              <ArrowRight size={16} />
                            </>
                          )}
                        </button>
                        <button 
                          type="button"
                          onClick={() => { setIsEditPaymentModalOpen(false); setEditingPayment(null); }}
                          className="px-6 py-4 bg-slate-150 text-slate-700 rounded-2xl font-black text-sm transition-all"
                        >
                          إلغاء
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Financial Payout Confirmation Pop-up */}
      {isConfirmPaymentOpen && selectedPayTeacher && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[150] p-4 text-right" dir="rtl">
          <div className="bg-white rounded-[2.5rem] max-w-lg w-full p-8 border border-slate-100 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <HelpCircle size={22} className="stroke-[2.5]" />
              </div>
              <div className="text-right">
                <h3 className="text-lg font-black text-slate-900 leading-none">تأكيد تسجيل حركة صرف ماليّة 💸</h3>
                <p className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase">مراجعة البيانات لتفادي أخطاء الإدخال البشري</p>
              </div>
            </div>

            <div className="bg-slate-50/70 rounded-2xl p-5 border border-slate-100 space-y-3.5 text-xs text-right">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-bold">اسم المعلم المستفيد:</span>
                <span className="font-extrabold text-[#1A365D] bg-[#1A365D]/5 px-3 py-1 rounded-lg">{selectedPayTeacher.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-slate-100">
                <span className="text-slate-500 font-bold">المبلغ المصروف:</span>
                <span className="font-mono font-black text-emerald-600 text-sm bg-emerald-50 px-3 py-1 rounded-lg">₪{Number(payAmount).toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-t border-slate-100">
                <span className="text-slate-500 font-bold">تاريخ الحركة المالية:</span>
                <span className="font-mono font-extrabold text-slate-700">{payDate}</span>
              </div>
              <div className="flex flex-col gap-1.5 py-2.5 border-t border-slate-100 text-right">
                <span className="text-slate-500 font-bold text-right self-start">البيان / ملاحظة الصرف:</span>
                <p className="font-bold text-slate-800 bg-white p-3 rounded-xl border border-slate-200/60 leading-relaxed text-[11px] font-mono text-right">
                  {payNote.trim() || 'صرف وتصفية مستحقات المعلم'}
                </p>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-2.5 text-[10px] text-amber-800 font-bold leading-relaxed text-right">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600" />
              <p>تنبيه الحوكمة المالية: يرجى التأكد التام من تطابق المبلغ والبيانات المالية. عند الحفظ، سيتم ترحيل الحركة نهائياً إلى مستندات الأستاذ، ولا يمكن التراجع أو الحذف العشوائي بدون مراجعة الأنظمة المركزية.</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCreatePayment}
                className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[11px] font-black transition-all cursor-pointer shadow-lg shadow-emerald-600/10 text-center flex items-center justify-center gap-1.5"
              >
                <Check size={14} className="stroke-[3]" />
                <span>نعم، تأكيد وتسجيل الحركة</span>
              </button>
              <button
                onClick={() => setIsConfirmPaymentOpen(false)}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[11px] font-black transition-all cursor-pointer text-center"
              >
                تراجع وإلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secure Delete Governance Confirmation Pop-up */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[150] p-4 text-right" dir="rtl">
          <div className="bg-white rounded-[2rem] max-w-sm w-full p-6 border border-slate-100 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-black text-rose-600 leading-none">
                {deleteConfirm.type === 'teacher' && 'تأكيد حذف المعلم نهائياً ⚠️'}
                {deleteConfirm.type === 'session' && 'حذف الحصة التعليمية ⚠️'}
                {deleteConfirm.type === 'unlink-student' && 'إلغاء تنسيق الطالب ⚠️'}
                {deleteConfirm.type === 'payment' && 'حذف الدفعة المالية للمعلم ⚠️'}
              </h3>
              <p className="text-xs font-bold text-slate-600 leading-relaxed">
                {deleteConfirm.type === 'teacher' && 'هل أنت متأكد تمامًا من رغبتك في حذف هذا المعلم؟ تنبيه: هذا الإجراء نهائي ولا يمكن التراجع عنه وسيعطل تنسيقات الطلاب الحالية.'}
                {deleteConfirm.type === 'session' && (() => {
                  const sess = sessions.find(s => s.id === deleteConfirm.id);
                  if (!sess) return 'هل أنت متأكد من رغبتك في حذف هذه الحصة التعليمية؟';
                  const stud = students.find(s => s.id === sess.studentId);
                  return `تنبيه عملياتي حرج: هل أنت متأكد من رغبتك في حذف الحصة التعليمية المسجلة للطالب (${stud?.name || 'مجهول'}) بتاريخ (${sess.date || ''})؟ يؤدي هذا الإجراء إلى إلغاء احتساب الحصة نهائياً وتعديل السجلات المالية والإدارية بأثر رجعي.`;
                })()}
                {deleteConfirm.type === 'unlink-student' && (() => {
                  const stud = students.find(s => s.id === deleteConfirm.id);
                  return `هل أنت متأكد من رغبتك في إلغاء تنسيق الطالب (${stud?.name || 'مجهول'}) من هذا المعلم؟`;
                })()}
                {deleteConfirm.type === 'payment' && (() => {
                  const pay = payments.find(p => p.id === deleteConfirm.id);
                  if (!pay) return 'هل أنت متأكد من رغبتك في حذف هذه الدفعة المالية؟';
                  const teach = teachers.find(t => t.id === pay.teacherId);
                  return `تنبيه مالي حرج: هل أنت متأكد من رغبتك في حذف الدفعة المالية المصروفة للمعلم (${teach?.name || 'مجهول'}) بقيمة (₪${pay.amount}) وتاريخ (${pay.date})؟ يؤدي هذا الإجراء إلى إلغاء إثبات صرف الدفعة في سجلات المحاسبة والتقارير.`;
                })()}
              </p>
            </div>
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={async () => {
                  const { id, type } = deleteConfirm;
                  setDeleteConfirm(null);
                  if (type === 'teacher') {
                    await executeDeleteTeacher(id);
                  } else if (type === 'session') {
                    await executeDeleteSession(id);
                  } else if (type === 'unlink-student') {
                    await executeUnlinkStudent(id);
                  } else if (type === 'payment') {
                    await executeDeletePayment(id);
                  }
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-black transition-all cursor-pointer shadow-md shadow-rose-650/10 text-center"
              >
                تأكيد العملية
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-black transition-all cursor-pointer text-center"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unified Payments Manager Modal */}
      {isPaymentsManagerModalOpen && (
        <UnifiedPaymentsManagerModal
          isOpen={isPaymentsManagerModalOpen}
          onClose={() => setIsPaymentsManagerModalOpen(false)}
          initialTab="teachers"
          students={students}
          teachers={teachers}
          sessions={sessions}
          credits={[]}
          payments={payments}
          setPayments={setPayments}
          onRefreshData={fetchData}
        />
      )}

      {/* Robust Print Preview Overlay Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[250] p-4 text-right no-print" dir="rtl">
          <div className="bg-white rounded-[2rem] max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-150 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header / Actions toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{printPreviewTitle || 'معاينة التقرير قبل الطباعة والتصدير'}</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">يمكنك مراجعة التنسيق، طباعته وحفظه كملف PDF رسمي، أو تنزيله كملف مستقل</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    // Temporarily inject print helper stylesheet
                    const styleId = 'temp-print-styles';
                    let styleEl = document.getElementById(styleId);
                    if (!styleEl) {
                      styleEl = document.createElement('style');
                      styleEl.id = styleId;
                      styleEl.innerHTML = `
                        @media print {
                          body > * {
                            display: none !important;
                          }
                          #temp-print-root {
                            display: block !important;
                            width: 100% !important;
                            direction: rtl !important;
                          }
                        }
                      `;
                      document.head.appendChild(styleEl);
                    }
                    
                    // Create printing container
                    const printRoot = document.createElement('div');
                    printRoot.id = 'temp-print-root';
                    printRoot.innerHTML = printPreviewHtml;
                    document.body.appendChild(printRoot);
                    
                    window.print();
                    
                    // Cleanup
                    setTimeout(() => {
                      printRoot.remove();
                      styleEl?.remove();
                    }, 1200);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm transition-all duration-200 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>طباعة وحفظ كـ PDF 🖨️</span>
                </button>
                
                <button
                  onClick={() => {
                    // Package as standalone file with onload print triggers
                    const downloadContent = `
                      <!DOCTYPE html>
                      <html lang="ar" dir="rtl">
                      <head>
                        <meta charset="utf-8">
                        <title>${printPreviewTitle || 'تقرير'}</title>
                        <script>
                          window.onload = function() {
                            setTimeout(function() {
                              window.print();
                            }, 500);
                          }
                        </script>
                      </head>
                      <body style="margin:0; padding:0; background:white;">
                        ${printPreviewHtml}
                      </body>
                      </html>
                    `;
                    const blob = new Blob([downloadContent], { type: 'text/html;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${printPreviewTitle || 'report'}.html`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all duration-200 cursor-pointer"
                  title="تنزيل كملف HTML مستقل لفتحه وحفظه بصيغة PDF مباشرة"
                >
                  <Download size={13} />
                  <span>تنزيل كملف مستقل 📥</span>
                </button>
                
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer"
                >
                  <X size={13} />
                  <span>إغلاق ❌</span>
                </button>
              </div>
            </div>

            {/* Hint alert strip */}
            <div className="bg-amber-500/10 border-b border-amber-500/10 text-amber-900 p-3 text-[10px] font-black text-center">
              💡 <strong>ملاحظة هامة:</strong> في حال لم يتم استدعاء واجهة طباعة المتصفح تلقائياً بسبب حماية المتصفح، يرجى الضغط على زر <strong>"تنزيل كملف مستقل 📥"</strong> وحفظه، ثم فتحه من جهازك لطباعته وحفظه كـ PDF بنقرة واحدة.
            </div>

            {/* Scrollable sheet container styled like elegant paper review */}
            <div className="flex-1 overflow-y-auto bg-slate-100/40 p-6 md:p-8 flex justify-center">
              <div 
                className="bg-white p-8 md:p-12 w-full max-w-[210mm] shadow-lg border border-slate-200/60 rounded-xl text-right font-sans relative"
                dangerouslySetInnerHTML={{ __html: printPreviewHtml }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Custom rates modal for assigned students */}
      <AnimatePresence>
        {isEditingCustomRates && selectedStudentForRates && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[200] p-4 text-right" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] max-w-md w-full p-8 border border-slate-100 shadow-2xl space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Pencil size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-none">تعديل تسعير مخصص للطالب</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">
                      {(selectedStudentForRates?.preferredPricingUnit === 'session_40' || selectedStudentForRates?.sessionSystem === 'session_40' || (selectedStudentForRates?.grade ? getDefaultPricingUnitForGrade(selectedStudentForRates.grade) === 'session_40' : false))
                        ? 'تعديل أجر وسعر الحصة (40 دقيقة) للمعلم والطالب بشكل خاص'
                        : 'تعديل سعر الساعة للمعلم وسعر الطالب بشكل خاص'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setIsEditingCustomRates(false);
                    setSelectedStudentForRates(null);
                  }}
                  className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1A365D]/10 flex items-center justify-center text-[#1A365D] font-black text-sm">
                  {selectedStudentForRates.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-xs leading-none">{selectedStudentForRates.name}</h4>
                  <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">
                    البرنامج الخاص مع المعلم: {selectedTeacher?.name}
                    {(selectedStudentForRates?.preferredPricingUnit === 'session_40' || selectedStudentForRates?.sessionSystem === 'session_40' || (selectedStudentForRates?.grade ? getDefaultPricingUnitForGrade(selectedStudentForRates.grade) === 'session_40' : false)) && (
                      <span className="text-amber-700 font-bold mr-1">(نظام 40 دقيقة 🎓)</span>
                    )}
                  </p>
                </div>
              </div>

              {(() => {
                const isStudent40 = 
                  selectedStudentForRates?.preferredPricingUnit === 'session_40' || 
                  selectedStudentForRates?.sessionSystem === 'session_40' || 
                  (selectedStudentForRates?.grade ? getDefaultPricingUnitForGrade(selectedStudentForRates.grade) === 'session_40' : false);

                return (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block text-right">
                        {isStudent40 ? 'أجر المعلم بالحصة (40 دقيقة) لهذا الطالب (₪)' : 'أجر المعلم بالساعة لهذا الطالب (₪)'}
                      </label>
                      <input 
                        type="number"
                        value={customPayoutInput}
                        onChange={e => setCustomPayoutInput(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all text-right"
                        placeholder={isStudent40 ? "أدخل أجر الحصة (40 دقيقة) للمعلم..." : "أدخل أجر المعلم بالساعة..."}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block text-right">
                        {isStudent40 ? 'سعر الفوترة للطالب بالحصة (40 دقيقة) (₪)' : 'سعر الفوترة للطالب بالساعة (₪)'}
                      </label>
                      <input 
                        type="number"
                        value={customBillingInput}
                        onChange={e => setCustomBillingInput(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all text-right"
                        placeholder={isStudent40 ? "أدخل سعر الحصة (40 دقيقة) للطالب..." : "أدخل سعر ساعة الطالب..."}
                      />
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={saveCustomStudentRates}
                  className="flex-1 py-3.5 bg-[#D4A33C] hover:bg-amber-500 text-slate-950 font-black rounded-2xl text-[11px] transition-all cursor-pointer text-center"
                >
                  حفظ التعديل المخصص
                </button>
                <button
                  onClick={() => {
                    setIsEditingCustomRates(false);
                    setSelectedStudentForRates(null);
                  }}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[11px] font-black transition-all cursor-pointer text-center"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manager Manual Session Edit Modal with Comprehensive Pricing & Recalculate Choice */}
      {adminEditSession && (() => {
        const student = students.find(s => s.id === adminEditSession.studentId);
        const teacher = teachers.find(t => t.id === adminEditSession.teacherId) || teachers.find(t => t.id === selectedTeacherId);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[160] p-4 text-right overflow-y-auto" dir="rtl">
            <div className="bg-white rounded-[2.5rem] max-w-lg w-full p-6 sm:p-7 border border-slate-100 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 my-8">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <Pencil size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-none">تعديل بيانات الحصة والتسعير يدوياً ✏️</h3>
                    <p className="text-[10px] text-amber-700 font-bold mt-1">صلاحية حصرية لمدير المنصة - تعديل التوقيت والأسعار وإعادة الحساب</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setAdminEditSession(null);
                    setShowRecalculateConfirmPrompt(false);
                  }}
                  className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Participants summary */}
              <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold block">الطالب:</span>
                  <span className="font-extrabold text-slate-900 truncate block">{student?.name || 'طالب مجهول'}</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold block">المعلم:</span>
                  <span className="font-extrabold text-[#1A365D] truncate block">{teacher?.name || 'معلم مجهول'}</span>
                </div>
              </div>

              {/* Form fields */}
              <div className="space-y-4">
                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block text-right flex items-center gap-1">
                      <Calendar size={12} className="text-[#D4A33C]" />
                      <span>تاريخ الحصة:</span>
                    </label>
                    <input 
                      type="date"
                      value={adminEditDate}
                      onChange={e => setAdminEditDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all text-right"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block text-right flex items-center gap-1">
                      <Clock size={12} className="text-[#D4A33C]" />
                      <span>وقت / توقيت الحصة:</span>
                    </label>
                    <input 
                      type="time"
                      value={adminEditStartTime}
                      onChange={e => setAdminEditStartTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all text-right"
                    />
                  </div>
                </div>

                {/* Duration & Subject */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block text-right">مدة الحصة (بالساعات):</label>
                      <span className="text-[10px] font-mono font-bold text-amber-700">
                        {Math.round(adminEditDurationHours * 60)} دقيقة
                      </span>
                    </div>
                    <input 
                      type="number"
                      step="0.25"
                      min="0.1"
                      max="12"
                      value={adminEditDurationHours}
                      onChange={e => handleAdminDurationChange(parseFloat(e.target.value) || 0)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all text-right font-mono"
                    />
                    {/* Quick Duration Buttons */}
                    <div className="flex items-center gap-1 pt-0.5">
                      {[0.5, 1, 1.5, 2].map(hrs => (
                        <button
                          key={hrs}
                          type="button"
                          onClick={() => handleAdminDurationChange(hrs)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black font-mono transition-all cursor-pointer ${
                            adminEditDurationHours === hrs
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {hrs}س
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block text-right">المادة الدراسية:</label>
                    <input 
                      type="text"
                      value={adminEditSubject}
                      onChange={e => setAdminEditSubject(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all text-right"
                      placeholder="المادة الدراسية"
                    />
                  </div>
                </div>

                {/* Topic / Notes */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block text-right">موضوع الحصة / ملاحظات إضافية:</label>
                  <input 
                    type="text"
                    value={adminEditTopic}
                    onChange={e => setAdminEditTopic(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all text-right"
                    placeholder="موضوع الدرس أو تفاصيل الحصة (اختياري)"
                  />
                </div>

                {/* Comprehensive Manual Pricing Section */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <div className="flex items-center gap-1.5">
                      <DollarSign size={14} className="text-emerald-600" />
                      <span className="text-xs font-black text-slate-800">التسعير المالي للحصة وأجور المعلم والفوترة</span>
                    </div>
                    <span className="text-[9.5px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      تعديل يدوي مباشر ✍️
                    </span>
                  </div>

                  {/* Teacher Rates */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/70 space-y-2">
                    <span className="text-[10px] font-black text-emerald-800 block">أجر واستحقاق المعلم:</span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">سعر الساعة للمعلم (₪/س):</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={adminEditTeacherHourlyRate}
                          onChange={e => handleAdminTeacherRateChange(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-emerald-700 outline-none text-right font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">إجمالي أجر الحصة (₪):</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={adminEditTeacherPayout}
                          onChange={e => handleAdminTeacherPayoutChange(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-emerald-700 outline-none text-right font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Student Rates */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/70 space-y-2">
                    <span className="text-[10px] font-black text-slate-800 block">فاتورة وتكلفة الطالب:</span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">سعر الساعة للطالب (₪/س):</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={adminEditStudentHourlyRate}
                          onChange={e => handleAdminStudentRateChange(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-900 outline-none text-right font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block mb-1">إجمالي كلفة الحصة (₪):</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={adminEditStudentFee}
                          onChange={e => handleAdminStudentFeeChange(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-black text-slate-900 outline-none text-right font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Financial Delta & Net Margin Summary */}
                  <div className="flex items-center justify-between text-[11px] pt-1 px-1">
                    <span className="font-bold text-slate-500">هامش ربح الأكاديمية الصافي:</span>
                    <span className={`font-mono font-black ${
                      (adminEditStudentFee - adminEditTeacherPayout) >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      ₪{(adminEditStudentFee - adminEditTeacherPayout).toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Price Change Detection & In-Modal Recalculate Choice */}
                {isPriceOrDurationChanged && (
                  <div className="bg-amber-50 border border-amber-200/90 rounded-2xl p-4 space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-black text-amber-900">تم تعديل سعر الحصة أو مدتها (تأثير مالي) ⚠️</h4>
                        <p className="text-[10px] text-amber-800 font-bold mt-0.5">
                          حدد خيار المعالجة المحاسبية والمالية المطلوب تطبيقه:
                        </p>
                      </div>
                    </div>

                    {/* Quick Comparison */}
                    <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200/60 text-[10px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">كلفة الطالب:</span>
                        <span className="font-mono font-bold">
                          السابق: ₪{adminEditInitialValues?.studentFee} ⬅ المعدل: <strong className="text-slate-900">₪{adminEditStudentFee}</strong>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">أجر المعلم:</span>
                        <span className="font-mono font-bold">
                          السابق: ₪{adminEditInitialValues?.teacherPayout} ⬅ المعدل: <strong className="text-emerald-700">₪{adminEditTeacherPayout}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Radio Choice Options */}
                    <div className="space-y-2 pt-1">
                      <label 
                        onClick={() => setAdminEditRecalculateChoice('recalculate')}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          adminEditRecalculateChoice === 'recalculate'
                            ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-500/20'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="recalcChoice" 
                          checked={adminEditRecalculateChoice === 'recalculate'}
                          onChange={() => setAdminEditRecalculateChoice('recalculate')}
                          className="mt-1 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="space-y-0.5">
                          <span className="text-xs font-black text-slate-900 block">
                            🔄 نعم، إعادة الحساب المالي الشامل (تحديث رصيد الطالب ومستحقات المعلم)
                          </span>
                          <span className="text-[10px] text-slate-500 block leading-relaxed font-bold">
                            يتم تطبيق الأسعار الجديدة مباشرة على كشوفات حساب الطالب وخصم تكلفة الحصة وتحديث رصيد المعلم المستحق.
                          </span>
                        </div>
                      </label>

                      <label 
                        onClick={() => setAdminEditRecalculateChoice('keep_previous')}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          adminEditRecalculateChoice === 'keep_previous'
                            ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input 
                          type="radio" 
                          name="recalcChoice" 
                          checked={adminEditRecalculateChoice === 'keep_previous'}
                          onChange={() => setAdminEditRecalculateChoice('keep_previous')}
                          className="mt-1 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="space-y-0.5">
                          <span className="text-xs font-black text-slate-900 block">
                            💾 لا، حفظ التعديل دون إعادة الحساب (الاحتفاظ بالحسابات السابقة)
                          </span>
                          <span className="text-[10px] text-slate-500 block leading-relaxed font-bold">
                            تحديث بيانات الحصة الإدارية (الموعد، المادة، الملاحظات) مع الإبقاء على الأجر والمبالغ المخصومة السابقة كما هي دون المساس بالأرصدة.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isAdminSavingSession}
                  onClick={handleSaveAdminSessionEdit}
                  className="flex-1 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black rounded-2xl text-xs transition-all cursor-pointer text-center flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 disabled:opacity-50 active:scale-[0.98]"
                  id="admin-save-session-btn"
                >
                  {isAdminSavingSession ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Save size={15} />
                  )}
                  <span>{isAdminSavingSession ? 'جاري حفظ التعديل...' : 'حفظ التعديلات على الحصة 💾'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAdminEditSession(null);
                    setShowRecalculateConfirmPrompt(false);
                  }}
                  className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black transition-all cursor-pointer text-center"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Explicit Manager Confirmation Prompt: Recalculate or Keep Previous Calculations */}
      {showRecalculateConfirmPrompt && adminEditSession && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-[170] p-4 text-right animate-in fade-in duration-150" dir="rtl">
          <div className="bg-white rounded-[2.5rem] max-w-md w-full p-7 border border-amber-200 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle size={24} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">تأكيد خيار المعالجة المالية للحصة</h3>
                <p className="text-[10px] text-slate-500 font-bold mt-1">تم تعديل سعر أو مدة الحصة المسجلة</p>
              </div>
            </div>

            <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/80 space-y-2 text-xs">
              <p className="font-black text-slate-800 leading-relaxed">
                هل ترغب في إعادة حساب الرصيد ومستحقات الحصة بناءً على السعر الجديد؟
              </p>
              <div className="bg-white p-3 rounded-xl border border-amber-200/60 text-[10.5px] space-y-1.5 font-sans">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">كلفة الطالب على الحصة:</span>
                  <span className="font-mono font-bold text-slate-800">
                    السابق: ₪{adminEditInitialValues?.studentFee} ⬅ الجديد: <strong>₪{adminEditStudentFee}</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">أجر المعلم في الحصة:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    السابق: ₪{adminEditInitialValues?.teacherPayout} ⬅ الجديد: <strong>₪{adminEditTeacherPayout}</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">مدة الحصة بالساعات:</span>
                  <span className="font-mono font-bold text-indigo-700">
                    {adminEditInitialValues?.durationHours} س ⬅ {adminEditDurationHours} س
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                disabled={isAdminSavingSession}
                onClick={() => executeSaveAdminSessionEdit(true)}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white font-black rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/15"
                id="confirm-recalculate-yes-btn"
              >
                <CheckCircle2 size={16} />
                <span>🔄 نعم، إعادة الحساب وتحديث الأرصدة فوراً</span>
              </button>

              <button
                type="button"
                disabled={isAdminSavingSession}
                onClick={() => executeSaveAdminSessionEdit(false)}
                className="w-full py-3.5 bg-gradient-to-r from-slate-800 to-indigo-900 hover:from-slate-900 hover:to-indigo-950 text-white font-black rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
                id="confirm-recalculate-no-btn"
              >
                <Save size={16} />
                <span>💾 لا، حفظ التعديل دون إعادة الحساب</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRecalculateConfirmPrompt(false)}
                className="w-full py-2.5 text-slate-500 hover:text-slate-700 text-xs font-bold transition-all cursor-pointer text-center"
              >
                الرجوع لنافذة التعديل
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Teacher Credentials Edit Modal (Username & Password) */}
      <AnimatePresence>
        {isCredentialsModalOpen && editingCredsTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/60" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl max-w-md w-full border border-slate-100 p-6 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden text-right"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b border-slate-150 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 shadow-inner">
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">تعديل بيانات دخول المعلم</h3>
                    <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                      الأستاذ: <span className="text-indigo-700 font-black">{editingCredsTeacher.name}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeCredentialsModal}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form Content */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5 text-right">
                    اسم المستخدم للدخول (Username):
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={credsUsername}
                      onChange={e => setCredsUsername(e.target.value)}
                      placeholder="مثال: ahmad_math أو zakiabuillan"
                      dir="ltr"
                      className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 pl-3 pr-9 py-3 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-600/10 transition-all text-left"
                    />
                    <User size={15} className="absolute right-3 top-3.5 text-slate-400" />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium text-right">
                    اسم فريد يُستخدم لتسجيل دخول المعلم إلى لوحة تحكمه وتحديث الحصص.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-black text-slate-700 text-right">
                      كلمة المرور (Password):
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const randomPass = Math.floor(100000 + Math.random() * 900000).toString();
                        setCredsPassword(randomPass);
                      }}
                      className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
                    >
                      توليد كلمة مرور 🎲
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showCredsPassword ? "text" : "password"}
                      value={credsPassword}
                      onChange={e => setCredsPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور (4 خانات على الأقل)"
                      dir="ltr"
                      className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 pl-10 pr-9 py-3 rounded-xl focus:outline-none focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-600/10 transition-all text-left"
                    />
                    <Lock size={15} className="absolute right-3 top-3.5 text-slate-400" />
                    <button
                      type="button"
                      onClick={() => setShowCredsPassword(!showCredsPassword)}
                      className="absolute left-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                      title={showCredsPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                      {showCredsPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Status messages */}
                {credsError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2 text-right">
                    <AlertCircle size={15} className="shrink-0 text-rose-600" />
                    <span>{credsError}</span>
                  </div>
                )}

                {credsSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-between gap-2 text-right">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                      <span>تم حفظ بيانات الدخول وتحديثها في قاعدة البيانات!</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const copyText = `بيانات حساب المعلم في المنصة:\nالاسم: ${editingCredsTeacher.name}\nاسم المستخدم: ${credsUsername.trim().toLowerCase()}\nكلمة المرور: ${credsPassword}\nرابط الدخول: ${window.location.origin}`;
                        navigator.clipboard.writeText(copyText);
                        setCredsCopied(true);
                        setTimeout(() => setCredsCopied(false), 2500);
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black transition-all cursor-pointer shrink-0 shadow-xs"
                    >
                      {credsCopied ? 'تم النسخ ✅' : 'نسخ للمعلم 📋'}
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeCredentialsModal}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all cursor-pointer"
                >
                  {credsSuccess ? 'إغلاق' : 'إلغاء'}
                </button>
                <button
                  type="button"
                  disabled={isSavingCreds}
                  onClick={handleSaveTeacherCredentials}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                >
                  {isSavingCreds ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>حفظ بيانات الدخول</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
