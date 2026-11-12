// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, getDocs, addDoc, deleteDoc, doc, query, where, 
  updateDoc, arrayUnion, getDoc, setDoc, onSnapshot 
} from 'firebase/firestore';
import { Student, Teacher, Session, StudentCredit, GroupCourse, formatCustomDate, StudentStatus, isTrialSession } from '../types';
import { 
  UserPlus, Search, Trash2, Users, GraduationCap, ArrowRight, 
  Wallet, Plus, History, ArrowLeft, Clock, DollarSign, 
  CheckCircle2, CreditCard, AlertCircle, AlertTriangle, X, Check, Award, Pencil,
  Upload, Download, FileText, Printer, RotateCcw, FileSpreadsheet, Archive, MessageSquare, Phone, Calendar, CalendarPlus, Lock, Key, Copy,
  SlidersHorizontal, Filter, Layers, BookOpen, Sparkles, CheckSquare, Square, RefreshCw, Zap, Receipt, Eye, EyeOff, Mail, UserCheck, ShieldCheck,
  Building2, Tag, ChevronDown, ChevronUp, ArrowLeftRight, FileDown, Info, AlertOctagon,
  BarChart3, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { logActivity } from '../lib/activityLogger';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { 
  notifyTeacherOnStudentPlacement, 
  notifyTeacherOnStudentAssignment, 
  notifyTeachersOnStudentTransfer 
} from '../lib/notificationUtils';
import { 
  generateStudentPaymentReceiptHtml, 
  generateReceiptNumber, 
  buildStudentPaymentWhatsAppText, 
  tafqeetArabic,
  StudentPaymentReceiptData 
} from '../lib/studentPaymentReceipt';
import { 
  saveStudentAccount, 
  generateSuggestedUsername, 
  generateSuggestedPassword, 
  StudentAccount 
} from '../lib/studentAccounts';
import { 
  formatWhatsAppPhone972, 
  cleanLocalPhoneDigits, 
  getWhatsAppApiNumber, 
  openWhatsAppChat, 
  buildWhatsAppUrl, 
  getBestParentOrStudentPhone, 
  generateParentBalanceMessage 
} from '../lib/phoneUtils';
import { getRegistrationLink, getPublicShareableBaseUrl } from '../lib/urlUtils';
import { getStudentDefaultHourlyRate, getStudentSessionCost, getAcademicStage, DEFAULT_STAGE_PRICING, getDefaultPricingUnitForGrade } from '../lib/sessionPricing';
import SmartAssignment from './SmartAssignment';
import { TransferStudentModal } from './TransferStudentModal';
import { StudentAdvancedSearchBar, SearchCriteriaType, AcademicStageType } from './StudentAdvancedSearchBar';
import * as XLSX from 'xlsx';
import { ScheduledWhatsAppReminderModal } from './ScheduledWhatsAppReminderModal';
import { ScheduledWhatsAppReminder } from '../types';
import { subscribeToScheduledReminders } from '../lib/scheduledWhatsAppUtils';
import { filterTeachersBySubject, isTeacherTeachingSubject } from '../lib/subjectTeacherMatcher';
import { FinancialCategory, DEFAULT_FINANCIAL_CATEGORIES } from '../types/financialCategories';
import { StudentFinancialBalancesPdfModal } from './StudentFinancialBalancesPdfModal';
import { StudentFinancialReportsModal } from './StudentFinancialReportsModal';
import { CustomWhatsAppAlertModal } from './CustomWhatsAppAlertModal';
import { UnassignedGroupStudentsModal } from './UnassignedGroupStudentsModal';
import UnifiedPaymentsManagerModal from './UnifiedPaymentsManagerModal';
import { generateStudentFinancialStatementHtml, sanitizeFinancialNote, GOOGLE_ARABIC_FONTS_COMBINED_URL } from '../lib/studentReportsExport';
import { findDuplicateStudent, detectDuplicateStudentGroups, DuplicateStudentGroup } from '../lib/studentValidation';

const normalizeArabicSearchText = (text: string = ''): string => {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .trim();
};

const normalizeSearchPhoneNumber = (phone: string = ''): string => {
  if (!phone) return '';
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let clean = phone.toString();
  for (let i = 0; i < 10; i++) {
    clean = clean.split(arabicNumerals[i]).join(i.toString());
  }
  return clean.replace(/\D/g, '').trim();
};

const getAcademicStageFromGrade = (gradeStr: string = ''): AcademicStageType => {
  const norm = normalizeArabicSearchText(gradeStr);
  if (
    norm.includes('ثانوي') ||
    norm.includes('توجيهي') || 
    norm.includes('ثانويه عامه') || 
    norm.includes('بجروت') ||
    norm.includes('12') || 
    norm.includes('ثاني عشر') || 
    norm.includes('بكالوريا') || 
    norm.includes('علمي') || 
    norm.includes('ادبي') || 
    norm.includes('صناعي') || 
    norm.includes('رياده') ||
    norm.includes('عاشر') || 
    norm.includes('اول ثانوي') || 
    norm.includes('10') || 
    norm.includes('11') || 
    norm.includes('حادي عشر')
  ) {
    return 'secondary';
  }
  if (norm.includes('سابع') || norm.includes('ثامن') || norm.includes('تاسع') || norm.includes('7') || norm.includes('8') || norm.includes('9') || norm.includes('اعدادي') || norm.includes('متوسط')) {
    return 'middle';
  }
  if (norm.includes('اول') || norm.includes('ثاني') || norm.includes('ثالث') || norm.includes('رابع') || norm.includes('خامس') || norm.includes('سادس') || norm.includes('1') || norm.includes('2') || norm.includes('3') || norm.includes('4') || norm.includes('5') || norm.includes('6') || norm.includes('ابتدائي') || norm.includes('اساسي')) {
    return 'primary';
  }
  return 'all';
};

interface StudentManagementProps {
  initialSearchTerm?: string;
  initialSelectedStudentId?: string | null;
  globalSettings?: any;
  userRole?: string;
  onOpenPaymentsManager?: () => void;
  courses?: GroupCourse[];
  stageFilter?: AcademicStageType;
  onStageFilterChange?: (stage: AcademicStageType) => void;
}

export default function StudentManagement({
  initialSearchTerm = '',
  initialSelectedStudentId = null,
  globalSettings = {},
  userRole,
  onOpenPaymentsManager,
  courses: propCourses = [],
  stageFilter: propStageFilter,
  onStageFilterChange
}: StudentManagementProps = {}) {
  const isCurrentUserManager = useMemo(() => {
    if (userRole) return userRole === 'manager';
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('academy_user_role');
      return role === 'manager' || role === 'admin' || !role;
    }
    return true;
  }, [userRole]);

  const getCurrentAcademicYearDates = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed (8 is September)
    
    let startYear, endYear;
    if (currentMonth >= 8) { // September to December
      startYear = currentYear;
      endYear = currentYear + 1;
    } else { // January to August
      startYear = currentYear - 1;
      endYear = currentYear;
    }
    
    return {
      startDate: `${startYear}-09-01`,
      endDate: `${endYear}-08-31`,
      label: `العام الدراسي ${startYear}/${endYear}`
    };
  };

  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [credits, setCredits] = useState<StudentCredit[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [trialLessons, setTrialLessons] = useState<any[]>([]);
  
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(initialSelectedStudentId || null);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGender, setEditGender] = useState<'Male' | 'Female'>('Male');
  const [editNotes, setEditNotes] = useState('');
  const [editIsOpenBalance, setEditIsOpenBalance] = useState(false);
  const [editLowBalanceThreshold, setEditLowBalanceThreshold] = useState<string>('-100');
  const [newStudentLowBalanceThreshold, setNewStudentLowBalanceThreshold] = useState<string>('-100');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [notes, setNotes] = useState('');
  const [isOpenBalance, setIsOpenBalance] = useState(false);
  const [hourlyRate, setHourlyRate] = useState<number | ''>('');
  const [editHourlyRate, setEditHourlyRate] = useState<number | ''>('');
  const [academicStatus, setAcademicStatus] = useState<'Active' | 'Paused' | 'Graduated'>('Active');
  const [editAcademicStatus, setEditAcademicStatus] = useState<'Active' | 'Paused' | 'Graduated'>('Active');
  const [editIsArchived, setEditIsArchived] = useState(false);
  const [initialPaymentAmt, setInitialPaymentAmt] = useState<string>('');
  const [isEditingStudent, setIsEditingStudent] = useState(false);
  const [preferredPricingUnit, setPreferredPricingUnit] = useState<'hourly' | 'session_40'>('hourly');
  const [editPreferredPricingUnit, setEditPreferredPricingUnit] = useState<'hourly' | 'session_40'>('hourly');
  const [sessionRate, setSessionRate] = useState<number | ''>('');
  const [teacherSessionPayout, setTeacherSessionPayout] = useState<number | ''>('');
  const [editSessionRate, setEditSessionRate] = useState<number | ''>('');
  const [editTeacherSessionPayout, setEditTeacherSessionPayout] = useState<number | ''>('');
  const [newStudentSessionDuration, setNewStudentSessionDuration] = useState<number>(60);
  const [editDefaultSessionDuration, setEditDefaultSessionDuration] = useState<number>(60);
  const [quickPreferredPricingUnit, setQuickPreferredPricingUnit] = useState<'hourly' | 'session_40'>('hourly');
  const [workflowPreferredPricingUnit, setWorkflowPreferredPricingUnit] = useState<'hourly' | 'session_40'>('hourly');

  // Student Login Account Creation States (Registration Form)
  const [createStudentAccount, setCreateStudentAccount] = useState(false);
  const [accountUsername, setAccountUsername] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [accountConfirmPassword, setAccountConfirmPassword] = useState('');
  const [autoGenUsername, setAutoGenUsername] = useState(false);
  const [autoGenPassword, setAutoGenPassword] = useState(false);
  const [forceChangePasswordOnFirstLogin, setForceChangePasswordOnFirstLogin] = useState(true);
  const [sendCredentialsEmail, setSendCredentialsEmail] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Student Login Account Editing States (Edit Modal)
  const [editCreateStudentAccount, setEditCreateStudentAccount] = useState(false);
  const [editAccountUsername, setEditAccountUsername] = useState('');
  const [editAccountPassword, setEditAccountPassword] = useState('');
  const [editAccountConfirmPassword, setEditAccountConfirmPassword] = useState('');
  const [editAutoGenUsername, setEditAutoGenUsername] = useState(false);
  const [editAutoGenPassword, setEditAutoGenPassword] = useState(false);
  const [editForceChangePasswordOnFirstLogin, setEditForceChangePasswordOnFirstLogin] = useState(true);
  const [editSendCredentialsEmail, setEditSendCredentialsEmail] = useState(false);
  const [editShowPassword, setEditShowPassword] = useState(false);
  const [editShowConfirmPassword, setEditShowConfirmPassword] = useState(false);
  const [existingStudentAccount, setExistingStudentAccount] = useState<any>(null);

  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printPreviewHtml, setPrintPreviewHtml] = useState('');
  const [printPreviewTitle, setPrintPreviewTitle] = useState('');
  const [currentReceiptData, setCurrentReceiptData] = useState<StudentPaymentReceiptData | null>(null);
  const [topUpSuccessNotice, setTopUpSuccessNotice] = useState<{ credit: any; student: Student } | null>(null);
  const [selectedTeacherForStudent, setSelectedTeacherForStudent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm || '');

  // Unassigned Group Students Hub State
  const [localCourses, setLocalCourses] = useState<GroupCourse[]>([]);
  const [isUnassignedModalOpen, setIsUnassignedModalOpen] = useState(false);

  const activeCoursesList = useMemo(() => {
    return (propCourses && propCourses.length > 0) ? propCourses : localCourses;
  }, [propCourses, localCourses]);

  const unassignedStudentsCount = useMemo(() => {
    return students.filter(student => {
      if (student.archived) return false;
      const inAnyCourse = activeCoursesList.some(c => {
        const inIds = Array.isArray(c.studentIds) && c.studentIds.includes(student.id);
        const isAssigned = student.assignedCourseId === c.id;
        return inIds || isAssigned;
      });
      return !inAnyCourse;
    }).length;
  }, [students, activeCoursesList]);

  const handleAssignStudentToCourse = async (studentId: string, courseId: string) => {
    try {
      const courseRef = doc(db, 'groupCourses', courseId);
      const studentRef = doc(db, 'students', studentId);
      await updateDoc(courseRef, {
        studentIds: arrayUnion(studentId)
      });
      await updateDoc(studentRef, {
        assignedCourseId: courseId,
        courseType: 'group'
      });
      await logActivity({
        type: 'student_enrolled_in_course',
        description: `تم تنسيب الطالب ${studentId} إلى دورة جماعية ${courseId}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error assigning student to course:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (initialSearchTerm !== undefined && initialSearchTerm !== '') {
      setSearchTerm(initialSearchTerm);
    }
  }, [initialSearchTerm]);

  useEffect(() => {
    if (initialSelectedStudentId !== undefined && initialSelectedStudentId !== null) {
      setSelectedStudentId(initialSelectedStudentId);
    }
  }, [initialSelectedStudentId]);
  const [studentStartDate, setStudentStartDate] = useState('');
  const [studentEndDate, setStudentEndDate] = useState('');
  const [studentPeriodType, setStudentPeriodType] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('all');
  const [studentSubjectFilter, setStudentSubjectFilter] = useState('all');
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);

  // Student Financial Reports Modal State
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [reportsModalInitialStudentId, setReportsModalInitialStudentId] = useState<string | null>(null);
  const [reportsModalInitialTab, setReportsModalInitialTab] = useState<'individual' | 'collective'>('individual');

  const openReportsModal = (studentId?: string | null, tab: 'individual' | 'collective' = 'individual') => {
    setReportsModalInitialStudentId(studentId || null);
    setReportsModalInitialTab(tab);
    setIsReportsModalOpen(true);
  };

  // Link Teacher Modal State
  const [isLinkTeacherModalOpen, setIsLinkTeacherModalOpen] = useState(false);
  const [teacherLinkSearch, setTeacherLinkSearch] = useState('');
  const [isCustomRatesModalOpen, setIsCustomRatesModalOpen] = useState(false);

  // Overall Financial Balances PDF Report Modal
  const [isFinancialBalancesPdfModalOpen, setIsFinancialBalancesPdfModalOpen] = useState(false);
  const [toastNotification, setToastNotification] = useState<{
    id: string;
    title: string;
    message?: string;
    type?: 'success' | 'error' | 'info';
  } | null>(null);

  const triggerToast = useCallback((title: string, message?: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setToastNotification({ id, title, message, type });
    setTimeout(() => {
      setToastNotification(prev => (prev?.id === id ? null : prev));
    }, 4500);
  }, []);

  // Transfer Student to Teacher Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferStudent, setTransferStudent] = useState<Student | null>(null);
  const [transferSourceTeacherId, setTransferSourceTeacherId] = useState('');
  const [transferTargetTeacherId, setTransferTargetTeacherId] = useState('');
  const [transferSubject, setTransferSubject] = useState('عام');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferSuccessBanner, setTransferSuccessBanner] = useState<string | null>(null);

  // Trial booking modal states
  const [isTrialBookingModalOpen, setIsTrialBookingModalOpen] = useState(false);
  const [trialBookingStudent, setTrialBookingStudent] = useState<Student | null>(null);
  const [trialSubject, setTrialSubject] = useState('الرياضيات');
  const [trialTopic, setTrialTopic] = useState('');
  const [trialTeacherId, setTrialTeacherId] = useState('');
  const [trialShowAllTeachersOverride, setTrialShowAllTeachersOverride] = useState(false);
  const [isBookingTrial, setIsBookingTrial] = useState(false);
  const [trialBookingError, setTrialBookingError] = useState('');
  const [trialBookingSuccess, setTrialBookingSuccess] = useState('');
  const [justBookedTrialWithTeacher, setJustBookedTrialWithTeacher] = useState<{
    studentName: string;
    grade: string;
    subject: string;
    topic: string;
    phone: string;
    teacherName: string;
    teacherPhone: string;
  } | null>(null);

  // Filter trial teachers strictly based on selected trialSubject
  const filteredTrialTeachers = useMemo(() => {
    if (trialShowAllTeachersOverride || !trialSubject) return teachers;
    return filterTeachersBySubject(teachers, trialSubject);
  }, [teachers, trialSubject, trialShowAllTeachersOverride]);

  // Reset selected trial teacher if they don't teach the newly selected subject
  useEffect(() => {
    if (trialTeacherId && trialSubject && !trialShowAllTeachersOverride) {
      const isSelectedTeaching = filteredTrialTeachers.some(t => t.id === trialTeacherId);
      if (!isSelectedTeaching) {
        setTrialTeacherId('');
      }
    }
  }, [filteredTrialTeachers, trialTeacherId, trialSubject, trialShowAllTeachersOverride]);

  // Pending Student Workflow States
  const [workflowTeacherId, setWorkflowTeacherId] = useState('');
  const [workflowHourlyRate, setWorkflowHourlyRate] = useState('');
  const [isActivatingStudent, setIsActivatingStudent] = useState(false);
  const [activationError, setActivationError] = useState('');
  const [activationSuccess, setActivationSuccess] = useState('');
  const [createdStudentAccount, setCreatedStudentAccount] = useState<{username: string, password: string, studentName: string} | null>(null);

  // Filter States
  const [archiveConfirmStudent, setArchiveConfirmStudent] = useState<Student | null>(null);
  const [archiveReasonSelection, setArchiveReasonSelection] = useState<string>('توقف مؤقت عن الدوام');
  const [customArchiveReason, setCustomArchiveReason] = useState<string>('');
  const [restoreConfirmStudent, setRestoreConfirmStudent] = useState<Student | null>(null);
  const [archiveNotification, setArchiveNotification] = useState<{
    type: 'archived' | 'restored';
    studentName: string;
    studentId: string;
  } | null>(null);
  const [archiveTab, setArchiveTab] = useState<'active' | 'archived' | 'pending'>('active');
  const [copiedLink, setCopiedLink] = useState(false);
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [balanceStatusFilter, setBalanceStatusFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [courseTypeFilter, setCourseTypeFilter] = useState<'all' | 'individual' | 'group'>('all');
  const [academicStatusFilter, setAcademicStatusFilter] = useState('all');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [isAdvancedFiltersVisible, setIsAdvancedFiltersVisible] = useState(false);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteriaType>('all');
  const [academicStageFilter, setAcademicStageFilter] = useState<AcademicStageType>(propStageFilter || 'all');

  useEffect(() => {
    if (propStageFilter !== undefined) {
      setAcademicStageFilter(propStageFilter);
    }
  }, [propStageFilter]);

  const handleResetAllFilters = () => {
    setSearchTerm('');
    setSearchCriteria('all');
    setAcademicStageFilter('all');
    setGradeFilter('all');
    setCourseTypeFilter('all');
    setBalanceStatusFilter('all');
    setTeacherFilter('all');
    setAssignmentStatusFilter('all');
    setAcademicStatusFilter('all');
  };
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState(-100);
  const [defaultStudentHourlyRate, setDefaultStudentHourlyRate] = useState(60);
  const [defaultSecondaryStudentHourlyRate, setDefaultSecondaryStudentHourlyRate] = useState(60);
  const [defaultMiddleStudentHourlyRate, setDefaultMiddleStudentHourlyRate] = useState(50);
  const [defaultPrimaryStudentHourlyRate, setDefaultPrimaryStudentHourlyRate] = useState(50);
  const [defaultTeacherHourlyRate, setDefaultTeacherHourlyRate] = useState(35);

  const settings = useMemo(() => ({
    ...globalSettings,
    lowBalanceThreshold: globalSettings?.lowBalanceThreshold ?? lowBalanceThreshold,
    defaultStudentHourlyRate: globalSettings?.defaultStudentHourlyRate ?? defaultStudentHourlyRate,
    defaultSecondaryStudentHourlyRate: globalSettings?.defaultSecondaryStudentHourlyRate ?? defaultSecondaryStudentHourlyRate,
    defaultMiddleStudentHourlyRate: globalSettings?.defaultMiddleStudentHourlyRate ?? defaultMiddleStudentHourlyRate,
    defaultPrimaryStudentHourlyRate: globalSettings?.defaultPrimaryStudentHourlyRate ?? defaultPrimaryStudentHourlyRate,
    defaultTeacherHourlyRate: globalSettings?.defaultTeacherHourlyRate ?? defaultTeacherHourlyRate,
    secondarySchoolStudentHourlyRate: globalSettings?.secondarySchoolStudentHourlyRate ?? defaultSecondaryStudentHourlyRate,
    middleSchoolStudentHourlyRate: globalSettings?.middleSchoolStudentHourlyRate ?? defaultMiddleStudentHourlyRate,
    primarySchoolStudentHourlyRate: globalSettings?.primarySchoolStudentHourlyRate ?? defaultPrimaryStudentHourlyRate,
  }), [
    globalSettings,
    lowBalanceThreshold,
    defaultStudentHourlyRate,
    defaultSecondaryStudentHourlyRate,
    defaultMiddleStudentHourlyRate,
    defaultPrimaryStudentHourlyRate,
    defaultTeacherHourlyRate
  ]);

  // Auto-Archive for Inactive Students (>6 Months)
  const [isAutoArchiveModalOpen, setIsAutoArchiveModalOpen] = useState(false);
  const [selectedInactiveIds, setSelectedInactiveIds] = useState<string[]>([]);
  const [isAutoArchivingLoading, setIsAutoArchivingLoading] = useState(false);
  const [autoArchiveSuccessMsg, setAutoArchiveSuccessMsg] = useState('');

  // Top Up Form State
  const [showTopUpForm, setShowTopUpForm] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpNote, setTopUpNote] = useState('');
  const [topUpDate, setTopUpDate] = useState(new Date().toISOString().split('T')[0]);
  const [topUpService, setTopUpService] = useState('شحن رصيد المحفظة التعليمية');
  const [topUpPaymentMethod, setTopUpPaymentMethod] = useState('نقداً (كاش)');
  const [financialCategories, setFinancialCategories] = useState<FinancialCategory[]>(DEFAULT_FINANCIAL_CATEGORIES);
  const [topUpFinancialCategory, setTopUpFinancialCategory] = useState<string>('');
  const [isReceiptLiveEditorOpen, setIsReceiptLiveEditorOpen] = useState(false);
  const [tempCustomRates, setTempCustomRates] = useState<Record<string, string>>({});
  const [tempTeacherPayoutRates, setTempTeacherPayoutRates] = useState<Record<string, string>>({});

  // Credit item editing and balance overriding
  const [editingCreditId, setEditingCreditId] = useState<string | null>(null);
  const [editCreditAmount, setEditCreditAmount] = useState<string>('');
  const [editCreditNote, setEditCreditNote] = useState<string>('');
  const [editCreditDate, setEditCreditDate] = useState<string>('');
  const [editCreditPaymentMethod, setEditCreditPaymentMethod] = useState<string>('');
  const [editCreditFinancialCategory, setEditCreditFinancialCategory] = useState<string>('');
  const [editCreditTargetStudentId, setEditCreditTargetStudentId] = useState<string>('');
  const [isEditCreditModalOpen, setIsEditCreditModalOpen] = useState<boolean>(false);
  const [editingCredit, setEditingCredit] = useState<StudentCredit | null>(null);
  const [isSubmittingEditCredit, setIsSubmittingEditCredit] = useState<boolean>(false);
  const [showDirectBalanceEdit, setShowDirectBalanceEdit] = useState(false);
  const [directBalanceValue, setDirectBalanceValue] = useState('');
  const [isPaymentsManagerModalOpen, setIsPaymentsManagerModalOpen] = useState<boolean>(false);

  // Quick Financial Adjustment Modal State
  const [quickAdjustStudent, setQuickAdjustStudent] = useState<Student | null>(null);
  const [quickAdjustMode, setQuickAdjustMode] = useState<'set_total' | 'add_subtract'>('set_total');
  const [quickAdjustNewBalance, setQuickAdjustNewBalance] = useState<string>('');
  const [quickAdjustDeltaAmount, setQuickAdjustDeltaAmount] = useState<string>('');
  const [quickAdjustComment, setQuickAdjustComment] = useState<string>('');
  const [quickAdjustError, setQuickAdjustError] = useState<string>('');
  const [quickAdjustHideInStatement, setQuickAdjustHideInStatement] = useState<boolean>(true);
  const [isSavingQuickAdjust, setIsSavingQuickAdjust] = useState<boolean>(false);

  // Secure delete state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    type: 'credit' | 'student' | 'session';
  } | null>(null);

  // CSV & JSON Import States
  const [registerMethod, setRegisterMethod] = useState<'single' | 'bulk' | 'json'>('single');
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<{ total: number, imported: number, errors: string[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [defaultTeacherForImport, setDefaultTeacherForImport] = useState('');

  // JSON Import States
  const [jsonPreviewData, setJsonPreviewData] = useState<any[]>([]);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isImportingJson, setIsImportingJson] = useState(false);
  const [jsonImportStatus, setJsonImportStatus] = useState<{ total: number, imported: number, errors: string[] } | null>(null);
  const [defaultTeacherForJsonImport, setDefaultTeacherForJsonImport] = useState('');

  // Quick Add Student Modal States
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickTeacher, setQuickTeacher] = useState('');
  const [quickGrade, setQuickGrade] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickInitialPayment, setQuickInitialPayment] = useState('');
  const [isSubmittingQuickAdd, setIsSubmittingQuickAdd] = useState(false);
  const [quickAddSuccess, setQuickAddSuccess] = useState(false);

  // Bulk WhatsApp Reminder States
  const [isBulkWhatsAppOpen, setIsBulkWhatsAppOpen] = useState(false);
  const [bulkWhatsAppTargetMode, setBulkWhatsAppTargetMode] = useState<'over_debt_limit' | 'negative' | 'critical' | 'all_debtors'>('over_debt_limit');
  const [allowedDebtLimitThreshold, setAllowedDebtLimitThreshold] = useState<number>(0);
  const [selectedBulkStudentIds, setSelectedBulkStudentIds] = useState<string[]>([]);
  const [whatsappTemplate, setWhatsappTemplate] = useState('السلام عليكم ورحمة الله وبركاته، تحية طيبة من إدارة أكاديمية التفوق أون لاين 🌸\n\nنود إحاطة عنايتكم الكريمة بأن رصيد الطالب/ة ({NAME}) مسجل حالياً بالسالب بقيمة ({BALANCE} ₪) بمبلغ مستحق قدره ({DEBT_AMOUNT} ₪)، وبذلك تجاوز رصيد حساب الطالب حد الدين المسموح به لدى الأكاديمية ({ALLOWED_DEBT_LIMIT} ₪) بمقدار ({EXCEEDED_AMOUNT} ₪).\n\nنرجو من حضرتكم التكرم بالمبادرة لتسوية وسداد المستحقات المتجاوزة وشحن المحفظة، لضمان استمرار الحصص والدروس التعليمية دون أي انقطاع.\n\nشاكرين ومقدرين حسن تعاونكم الدائم وثقتكم بنا 🌸');
  const [customMessagesByStudent, setCustomMessagesByStudent] = useState<Record<string, string>>({});
  const [expandedCustomEditorId, setExpandedCustomEditorId] = useState<string | null>(null);
  const [showAllCustomEditors, setShowAllCustomEditors] = useState(false);
  const [studentMessageModified, setStudentMessageModified] = useState<Record<string, boolean>>({});
  const [bulkSentStatus, setBulkSentStatus] = useState<Record<string, { status: 'pending' | 'sending' | 'sent' }>>({});
  const [copiedAllNotification, setCopiedAllNotification] = useState(false);
  const [bulkSendingProgress, setBulkSendingProgress] = useState<{ current: number; total: number; isSending: boolean }>({ current: 0, total: 0, isSending: false });

  // Scheduled WhatsApp Reminder States
  const [isScheduledWhatsAppModalOpen, setIsScheduledWhatsAppModalOpen] = useState(false);
  const [scheduledModalInitialMode, setScheduledModalInitialMode] = useState<'list' | 'create'>('list');
  const [scheduledModalTargetMode, setScheduledModalTargetMode] = useState<'over_debt_limit' | 'negative' | 'critical' | 'all_debtors' | 'custom'>('over_debt_limit');
  const [scheduledRemindersList, setScheduledRemindersList] = useState<ScheduledWhatsAppReminder[]>([]);

  // Duplicate Students Detection & Merge States
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isMergingDuplicates, setIsMergingDuplicates] = useState(false);
  const [duplicateMergeProgress, setDuplicateMergeProgress] = useState<string>('');

  // Memoized detection of duplicate student groups (identical normalized name AND phone)
  const duplicateGroups = useMemo(() => {
    return detectDuplicateStudentGroups(students);
  }, [students]);

  const totalDuplicateRedundantCount = useMemo(() => {
    return duplicateGroups.reduce((acc, g) => acc + g.duplicateStudents.length, 0);
  }, [duplicateGroups]);

  useEffect(() => {
    const unsub = subscribeToScheduledReminders(setScheduledRemindersList);
    return () => unsub();
  }, []);

  const pendingScheduledCount = useMemo(() => {
    return scheduledRemindersList.filter(r => r.status === 'pending').length;
  }, [scheduledRemindersList]);

  // WhatsApp Message Preset Templates
  const WHATSAPP_TEMPLATES_PRESETS: Record<string, { label: string; tag: string; iconDesc: string; text: string }> = {
    debt_limit_exceeded: {
      label: 'تنبيه تجاوز حد الدين المسموح به 🚨',
      tag: 'تجاوز حد الدين (موصى به)',
      iconDesc: '🚨',
      text: 'السلام عليكم ورحمة الله وبركاته، تحية طيبة من إدارة أكاديمية التفوق أون لاين 🌸\n\nنود إحاطة عنايتكم الكريمة بأن رصيد الطالب/ة ({NAME}) مسجل حالياً بالسالب بقيمة ({BALANCE} ₪) بمبلغ مستحق قدره ({DEBT_AMOUNT} ₪)، وبذلك تجاوز رصيد حساب الطالب حد الدين المسموح به لدى الأكاديمية ({ALLOWED_DEBT_LIMIT} ₪) بمقدار ({EXCEEDED_AMOUNT} ₪).\n\nنرجو من حضرتكم التكرم بالمبادرة لتسوية وسداد المستحقات المتجاوزة وشحن المحفظة، لضمان استمرار الحصص والدروس التعليمية دون أي انقطاع.\n\nشاكرين ومقدرين حسن تعاونكم الدائم وثقتكم بنا 🌸'
    },
    debt_limit_urgent_warning: {
      label: 'إنذار تجاوز سقف الدين لتفادي تعليق الحصص ⚠️',
      tag: 'إنذار عاجل مهلة 24 ساعة',
      iconDesc: '⚠️',
      text: 'إشعار إداري عاجل من إدارة أكاديمية التفوق أون لاين ⚠️\n\nنلفت عناية حضرة الأهل الكرام إلى أن حساب الطالب/ة ({NAME}) قد تجاوز سقف الدين المسموح به ({ALLOWED_DEBT_LIMIT} ₪)، حيث يبلغ الرصيد الحالي ({BALANCE} ₪) بمبلغ مستحق قدره ({DEBT_AMOUNT} ₪) وبقيمة تجاوز قدرها ({EXCEEDED_AMOUNT} ₪).\n\nيرجى التكرم بتسديد المبلغ المستحق وشحن المحفظة خلال موعد أقصاه 24 ساعة، لتفادي تعليق الدروس والحصص الفردية القادمة تلقائياً.\n\nللتنسيق وطلب تفاصيل التحويل يرجى التواصل معنا مباشرة. شاكرين تفهمكم 🌸'
    },
    debt_limit_friendly_statement: {
      label: 'تذكير ودي بتجاوز سقف الدين وساعات التدريس 📊',
      tag: 'كشف ساعات وتجاوز',
      iconDesc: '📊',
      text: 'تحية طيبة من إدارة أكاديمية التفوق أون لاين 🌸\n\nنحيطكم علماً بأن الطالب/ة ({NAME}) أتم بنجاح ({HOURS} ساعة) تدريسية، وسجل حسابه رصيداً قدره ({BALANCE} ₪) متجاوزاً حد الدين المتفق عليه ({ALLOWED_DEBT_LIMIT} ₪) بمبلغ ({EXCEEDED_AMOUNT} ₪).\n\nنرجو شحن الرصيد لضمان استمرار الدروس القادمة بسلاسة ومتابعة المعلمين دون انقطاع. دمتم بحفظ الله ورعايته 🌸'
    },
    package_renewal: {
      label: 'الحث على تجديد الرزمة التعليمية ⚡',
      tag: 'حث على التجديد',
      iconDesc: '⚡',
      text: 'السلام عليكم ورحمة الله وبركاته، تحية طيبة من إدارة أكاديمية التفوق أون لاين 🌸\n\nنود إحاطة عنايتكم الكريمة بأن الرصيد المالي المتبقي في محفظة الطالب/ة ({NAME}) هو ({BALANCE} ₪).\n\nونظراً لأن رصيد الرزمة التعليمية شارف على الانتهاء، نحثكم على التكرم بالمبادرة لتجديد الرزمة التعليمية وشحن المحفظة قبل نفاد الرصيد، لضمان استمرار الحصص والدروس التعليمية ومتابعة المعلمين دون أي انقطاع.\n\nعلماً بأن حساب الطالب نشط وجميع الحصص مستمرة كالمعتاد بحمد الله.\n\nشاكرين ومقدرين ثقتكم الدائمة بأكاديميتنا، ونتمنى لـ ({NAME}) دوام التفوق والنجاح 🌸'
    },
    negative_settlement: {
      label: 'سداد الذمم المستحقة (للأرصدة السالبة) 🔴',
      tag: 'أرصدة سالبة عامة',
      iconDesc: '🔴',
      text: 'السلام عليكم ورحمة الله وبركاته، تحية طيبة من إدارة الأكاديمية.. نود إحاطتكم علماً بأن رصيد الطالب/ة ({NAME}) مسجل حالياً بالسالب بقيمة ({BALANCE} ₪) بمبلغ مستحق قدره ({DEBT_AMOUNT} ₪).\nنرجو منكم التكرم بتسوية وسداد المبلغ المستحق وشحن رصيد المحفظة لضمان استمرار الحصص والدروس دون انقطاع. شاكرين حسن تعاونكم الأكاديمي وثقتكم بنا. 🌸'
    },
    friendly_recharge: {
      label: 'تذكير لطيف وودي بشحن المحفظة 🌟',
      tag: 'تذكير ودي',
      iconDesc: '🌸',
      text: 'مرحباً حضرة الأهل الكرام، للتذكير بلطف: رصيد محفظة الطالب/ة ({NAME}) حالياً هو ({BALANCE} ₪)، وتبلغ الذمم المستحقة ({DEBT_AMOUNT} ₪).\nيرجى التكرم بتسوية الرصيد لضمان متابعة اللقاءات التعليمية بيسر وسهولة. دمتم بخير وصحة وعافية. 🌟'
    },
    detailed_statement: {
      label: 'كشف حساب تفصيلي بساعات الحصص 📋',
      tag: 'كشف مفصل',
      iconDesc: '📊',
      text: 'السلام عليكم، كشف حساب الطالب/ة ({NAME}):\n- ساعات التدريس المنجزة: ({HOURS} ساعة)\n- إجمالي الدفعات المسددة سابقاً: ({TOPPEDUP} ₪)\n- الرصيد المالي الحالي: ({BALANCE} ₪)\n- المبلغ المطلوب سداده: ({DEBT_AMOUNT} ₪)\nيرجى سداد المبلغ المستحق مع جزيل الشكر والتقدير. 📋'
    },
    urgent_suspension: {
      label: 'إشعار نهائي لتفادي إيقاف الحصص ⚠️',
      tag: 'تنبيه نهائي',
      iconDesc: '⚠️',
      text: 'تنبيه مالي عاجل: نلفت عنايتكم الكريمة إلى أن حساب الطالب/ة ({NAME}) بلغ رصيده بالسالب ({BALANCE} ₪) بمستحقات قدرها ({DEBT_AMOUNT} ₪).\nيرجى تسديد المبلغ المستحق لتفادي تعليق الدروس والحصص القادمة. شاكرين تفهمكم وتعاونكم.'
    }
  };

  // Individual WhatsApp Alert States
  const [isSingleAlertOpen, setIsSingleAlertOpen] = useState(false);
  const [singleAlertStudent, setSingleAlertStudent] = useState<any>(null);
  const [singleAlertInitialTemplate, setSingleAlertInitialTemplate] = useState<string>('low_balance_renewal');

  const openSingleAlertModal = (student: any = null, urgentRenewal: boolean = false, initialTemplate: string = 'low_balance_renewal') => {
    setSingleAlertStudent(student);
    setSingleAlertInitialTemplate(urgentRenewal ? 'low_balance_renewal' : initialTemplate);
    setIsSingleAlertOpen(true);
  };

  const handlePackageRenewalAlert = (student: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    // Open the custom WhatsApp template modal so the manager can review and edit before sending!
    openSingleAlertModal(student, true, 'low_balance_renewal');
  };

  // Helper to compute session hourly rate for a student
  const getStudentSessionRate = (student: any): number => {
    return getStudentDefaultHourlyRate(student, {
      defaultStudentHourlyRate,
      defaultSecondaryStudentHourlyRate,
      defaultMiddleStudentHourlyRate,
      defaultPrimaryStudentHourlyRate
    });
  };

  // Helper to format remaining sessions count without revealing monetary balance
  const getRemainingSessionsInfo = (student: any, balance: number) => {
    const sessionCost = getStudentSessionRate(student);
    if (sessionCost <= 0) {
      return {
        text: balance <= 0 ? '0 حصة متبقية' : 'رصيد كافٍ',
        sessions: balance <= 0 ? 0 : 99,
        sessionCost: 60,
      };
    }
    const sessions = Math.floor(balance / sessionCost);
    let text = '';
    if (sessions <= 0) {
      text = 'لا توجد حصص متبقية (0 حصة)';
    } else if (sessions === 1) {
      text = 'تبقى حصة واحدة (1)';
    } else if (sessions === 2) {
      text = 'تبقى حصتان (2)';
    } else if (sessions >= 3 && sessions <= 10) {
      text = `تبقى ${sessions} حصص`;
    } else {
      text = `تبقى ${sessions} حصة`;
    }
    return { text, sessions, sessionCost };
  };

  // Helper function to highlight live matching search keyword
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    const regex = new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) 
            ? <mark key={i} className="bg-amber-100 text-amber-950 font-black rounded-[2px] px-0.5">{part}</mark> 
            : part
        )}
      </>
    );
  };

  // Built-in RFC 4180 CSV Parser
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [""];
    let insideQuote = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (insideQuote) {
        if (char === '"') {
          if (nextChar === '"') {
            row[row.length - 1] += '"';
            i++;
          } else {
            insideQuote = false;
          }
        } else {
          row[row.length - 1] += char;
        }
      } else {
        if (char === '"') {
          insideQuote = true;
        } else if (char === ',') {
          row.push("");
        } else if (char === ';' || char === '\t') {
          row.push("");
        } else if (char === '\n' || char === '\r') {
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
          lines.push(row);
          row = [""];
        } else {
          row[row.length - 1] += char;
        }
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }
    return lines;
  };

  const downloadTemplate = () => {
    const headers = ['الاسم', 'الصف', 'الهاتف', 'البريد الالكتروني', 'الجنس', 'الملاحظات', 'الرصيد المبدئي', 'الحساب المفتوح'];
    const row1 = ['أحمد محمد', 'الصف العاشر', '0591234567', 'ahmed@example.com', 'ذكر', 'طالب جديد متميز', '150', 'لا'];
    const row2 = ['سارة علي', 'الصف الحادي عشر', '0597654321', 'sara@example.com', 'أنثى', 'بحاجة لمتابعة حثيثة', '200', 'نعم'];
    
    const csvContent = "\uFEFF" + [headers, row1, row2].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "academy_students_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseAndSetCsvData(text);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const parseAndSetCsvData = (text: string) => {
    try {
      const rows = parseCSV(text);
      if (rows.length < 2) {
        alert("ملف CSV فارغ أو غير صالح. يرجى توفير محتوى يتضمن ترويسة البيانات وبيانات الطلاب.");
        return;
      }
      
      const headers = rows[0].map(h => h.trim().replace(/^\uFEFF/, ''));
      const dataRows = rows.slice(1).filter(r => r.some(cell => cell.trim() !== ""));
      
      const parsed = dataRows.map((row, idx) => {
        const item: any = {};
        headers.forEach((header, index) => {
          item[header] = row[index]?.trim() || '';
        });
        
        const rawName = item['الاسم'] || item['Name'] || item['اسم الطالب'] || '';
        const rawGrade = item['الصف'] || item['Grade'] || item['المستوى الدراسي'] || '';
        const rawPhone = item['الهاتف'] || item['Phone'] || item['رقم الهاتف'] || '';
        const rawEmail = item['البريد'] || item['Email'] || item['البريد الالكتروني'] || item['البريد الإلكتروني'] || '';
        const rawGender = item['الجنس'] || item['Gender'] || '';
        const rawNotes = item['الملاحظات'] || item['Notes'] || item['ملاحظة'] || '';
        const rawBalance = item['الرصيد المبدئي'] || item['الرصيد'] || item['Initial Balance'] || '0';
        const rawIsOpen = item['الحساب المفتوح'] || item['Open Balance'] || 'لا';
        
        const nameClean = rawName.trim();
        const gradeClean = rawGrade.trim();
        const phoneClean = rawPhone.trim();
        const emailClean = rawEmail.trim();
        const notesClean = rawNotes.trim();
        
        const validationErrors: string[] = [];
        
        // 1. Name validation
        if (!nameClean) {
          validationErrors.push("الاسم حقل إلزامي");
        } else if (nameClean.length < 2) {
          validationErrors.push("الاسم قصير جداً (حرفين على الأقل)");
        }
        
        // 2. Email validation (if provided)
        if (emailClean) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(emailClean)) {
            validationErrors.push("صيغة البريد الإلكتروني غير صالحة");
          }
        }
        
        // 3. Phone validation (if provided)
        if (phoneClean) {
          // Allow digits, spaces, dashes, parentheses and a leading plus
          const phoneRegex = /^[+0-9\s\-()]{7,25}$/;
          if (!phoneRegex.test(phoneClean)) {
            validationErrors.push("رقم الهاتف غير صالح (٧-٢٥ رمزاً)");
          }
        }
        
        // 4. Gender mapping and check
        let genderMapped: 'Male' | 'Female' = 'Male';
        const gLow = rawGender.toLowerCase().trim();
        if (gLow.includes('أنثى') || gLow.includes('female') || gLow === 'f' || gLow.includes('بنت') || gLow.includes('انثى')) {
          genderMapped = 'Female';
        } else if (gLow.includes('ذكر') || gLow.includes('male') || gLow === 'm' || gLow.includes('ولد')) {
          genderMapped = 'Male';
        } else if (rawGender) {
          validationErrors.push("الجنس غير معروف (ذكر أو أنثى)");
        }
        
        // 5. Balance parsing & validation
        let initialBalanceNum = 0;
        if (rawBalance) {
          const parsedBalance = parseFloat(rawBalance);
          if (isNaN(parsedBalance)) {
            validationErrors.push("الرصيد المبدئي يجب أن يكون رقماً عشرياً");
          } else if (parsedBalance < -1000000 || parsedBalance > 1000000) {
            validationErrors.push("قيمة الرصيد المبدئي خارج النطاق المقبول");
          } else {
            initialBalanceNum = parsedBalance;
          }
        }
        
        const isOpenBalanceBool = rawIsOpen.includes('نعم') || rawIsOpen.toLowerCase() === 'yes' || rawIsOpen.toLowerCase() === 'true' || rawIsOpen === '1';
        
        return {
          id: `preview-${idx}`,
          name: nameClean,
          grade: gradeClean,
          academicLevel: gradeClean,
          phone: phoneClean,
          email: emailClean,
          gender: genderMapped,
          notes: notesClean,
          initialBalance: initialBalanceNum,
          isOpenBalance: isOpenBalanceBool,
          validationErrors: validationErrors,
          isValid: validationErrors.length === 0
        };
      });
      
      setCsvPreviewData(parsed);
      setImportStatus(null);
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء قراءة ملف الـ CSV. يرجى التأكد من ترميز الملف وسلامة الأعمدة.");
    }
  };

  const handleImportCsvSubmit = async () => {
    if (csvPreviewData.length === 0 || !defaultTeacherForImport) {
      alert("يرجى اختيار معلم وتحديد ملف يحتوي على بيانات صالحة للمتابعة.");
      return;
    }
    
    setIsImporting(true);
    setImportStatus(null);
    
    let importedCount = 0;
    const errors: string[] = [];
    const validStudents = csvPreviewData.filter(s => s.isValid);
    
    for (const item of validStudents) {
      try {
        const path = 'students';
        const q = query(collection(db, path), where('name', '==', item.name));
        const querySnapshot = await getDocs(q);
        
        let studentId = '';
        
        if (!querySnapshot.empty) {
          const docRef = querySnapshot.docs[0];
          studentId = docRef.id;
          const updatePayload: any = { 
            teachers: arrayUnion(defaultTeacherForImport)
          };
          if (item.grade) {
            updatePayload.grade = item.grade;
            updatePayload.academicLevel = item.grade;
          }
          if (item.phone) updatePayload.phone = item.phone;
          if (item.email) updatePayload.email = item.email;
          if (item.notes) updatePayload.notes = item.notes;
          
          await updateDoc(docRef.ref, updatePayload);
        } else {
          const studentPayload: any = {
            name: item.name,
            teachers: [defaultTeacherForImport],
            gender: item.gender,
            registrationDate: new Date().toISOString().split('T')[0],
            status: 'Assigned',
            isOpenBalance: item.isOpenBalance,
            archived: false
          };
          if (item.grade) {
            studentPayload.grade = item.grade;
            studentPayload.academicLevel = item.grade;
          }
          if (item.phone) studentPayload.phone = item.phone;
          if (item.email) studentPayload.email = item.email;
          if (item.notes) studentPayload.notes = item.notes;
          
          const docRef = await addDoc(collection(db, path), studentPayload);
          studentId = docRef.id;
        }
        
        if (item.initialBalance > 0 && studentId) {
          const creditData = {
            studentId,
            amount: item.initialBalance,
            date: new Date().toISOString().split('T')[0],
            note: 'الرصيد المالي الافتتاحي (مستورد من ملف جماعي)'
          };
          await addDoc(collection(db, 'studentCredits'), creditData);
        }
        
        importedCount++;
      } catch (err: any) {
        console.error("Error importing student:", item.name, err);
        errors.push(`خطأ في الطالب (${item.name}): ${err?.message || 'فشل الحفظ'}`);
      }
    }
    
    setImportStatus({
      total: validStudents.length,
      imported: importedCount,
      errors
    });
    
    setIsImporting(false);
    setCsvPreviewData([]);
    fetchData();
  };

  const downloadJsonTemplate = () => {
    const template = [
      {
        "name": "أحمد محمد أبو علان",
        "grade": "الصف العاشر",
        "phone": "0591234567",
        "email": "ahmed@example.com",
        "gender": "Male",
        "notes": "طالب جديد مميز جداً متفوق بالرياضيات والفيزياء",
        "initialBalance": 150,
        "isOpenBalance": false
      },
      {
        "name": "سارة علي يوسف",
        "grade": "الصف الثاني عشر - تخصص علمي (4/5 وحدات)",
        "phone": "0597654321",
        "email": "sara@example.com",
        "gender": "Female",
        "notes": "مسجلة لتقوية مهارات المحادثة باللغة عبرية",
        "initialBalance": 200,
        "isOpenBalance": true
      }
    ];
    const jsonString = JSON.stringify(template, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "academy_students_template.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processJsonData(text);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const processJsonData = (text: string) => {
    try {
      setJsonError(null);
      setJsonImportStatus(null);
      const parsedData = JSON.parse(text);

      if (!Array.isArray(parsedData)) {
        setJsonError("الملف المرفوع غير صالح. يجب أن يحتوي ملف JSON على مصفوفة طلاب (Array of Objects).");
        setJsonPreviewData([]);
        return;
      }

      if (parsedData.length === 0) {
        setJsonError("مصفوفة الطلاب فارغة. يرجى إدراج طالب واحد على الأقل.");
        setJsonPreviewData([]);
        return;
      }

      const validated = parsedData.map((item: any, idx: number) => {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check if item is an object
        if (typeof item !== 'object' || item === null) {
          return {
            id: `json-preview-${idx}`,
            name: `عنصر #${idx + 1}`,
            isValid: false,
            errors: ["تنسيق العنصر غير صالح؛ يجب أن يكون كائناً JSON Object."],
            warnings: []
          };
        }

        // Validate structure fields
        let nameClean = '';
        if (item.name && typeof item.name === 'string') {
          nameClean = item.name.trim();
        } else if (item['الاسم'] && typeof item['الاسم'] === 'string') {
          nameClean = item['الاسم'].trim();
        }

        if (!nameClean) {
          errors.push("الاسم الكامل للطالب حقل مطلوب ولا يمكن تركه فارغاً.");
        }

        let gradeClean = '';
        if (item.grade && typeof item.grade === 'string') {
          gradeClean = item.grade.trim();
        } else if (item['الصف'] && typeof item['الصف'] === 'string') {
          gradeClean = item['الصف'].trim();
        }

        let phoneClean = '';
        if (item.phone && typeof item.phone === 'string') {
          phoneClean = item.phone.trim();
        } else if (item.phone !== undefined) {
          phoneClean = String(item.phone).trim();
        } else if (item['الهاتف']) {
          phoneClean = String(item['الهاتف']).trim();
        }

        let emailClean = '';
        if (item.email && typeof item.email === 'string') {
          emailClean = item.email.trim();
        } else if (item['البريد الالكتروني'] && typeof item['البريد الالكتروني'] === 'string') {
          emailClean = item['البريد الالكتروني'].trim();
        } else if (item['البريد'] && typeof item['البريد'] === 'string') {
          emailClean = item['البريد'].trim();
        }

        if (emailClean && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
          warnings.push("تنسيق البريد الإلكتروني المكتوب قد يكون غير صحيح.");
        }

        let rawGender = item.gender || item['الجنس'] || '';
        let genderMapped: 'Male' | 'Female' = 'Male';
        if (typeof rawGender === 'string') {
          const g = rawGender.trim().toLowerCase();
          if (g.includes('أنثى') || g.includes('female') || g === 'f' || g.includes('بنت') || g === 'female') {
            genderMapped = 'Female';
          } else if (g && !g.includes('ذكر') && !g.includes('male') && g !== 'm' && !g.includes('ولد')) {
            warnings.push("قيمة الجنس مبهمة؛ تم التحديد الافتراضي كذكر (Male).");
          }
        }

        let notesClean = '';
        if (item.notes && typeof item.notes === 'string') {
          notesClean = item.notes.trim();
        } else if (item['الملاحظات'] && typeof item['الملاحظات'] === 'string') {
          notesClean = item['الملاحظات'].trim();
        }

        let initialBalanceNum = 0;
        const rawBalance = item.initialBalance !== undefined ? item.initialBalance : item['الرصيد المبدئي'];
        if (rawBalance !== undefined && rawBalance !== null && rawBalance !== '') {
          const parsedVal = parseFloat(rawBalance);
          if (isNaN(parsedVal)) {
            errors.push("الرصيد المبدئي يجب أن يكون عدداً حقيقياً (Number).");
          } else {
            initialBalanceNum = parsedVal;
          }
        }

        let isOpenBalanceBool = false;
        const rawOpen = item.isOpenBalance !== undefined ? item.isOpenBalance : item['الحساب المفتوح'];
        if (rawOpen !== undefined && rawOpen !== null) {
          if (typeof rawOpen === 'boolean') {
            isOpenBalanceBool = rawOpen;
          } else {
            const rawOpenStr = String(rawOpen).trim().toLowerCase();
            if (rawOpenStr.includes('نعم') || rawOpenStr === 'yes' || rawOpenStr === 'true' || rawOpenStr === '1') {
              isOpenBalanceBool = true;
            }
          }
        }

        return {
          id: `json-preview-${idx}`,
          name: nameClean || `طالب غير مسمى #${idx + 1}`,
          grade: gradeClean,
          academicLevel: gradeClean,
          phone: phoneClean,
          email: emailClean,
          gender: genderMapped,
          notes: notesClean,
          initialBalance: initialBalanceNum,
          isOpenBalance: isOpenBalanceBool,
          isValid: errors.length === 0,
          errors,
          warnings
        };
      });

      setJsonPreviewData(validated);
    } catch (err) {
      console.error("JSON parsing error:", err);
      setJsonError("فشل تحليل محتوى ملف الـ JSON. يرجى التحقق من سلامة البنية النحوية والأقواس المتطابقة.");
      setJsonPreviewData([]);
    }
  };

  const handleImportJsonSubmit = async () => {
    if (jsonPreviewData.length === 0 || !defaultTeacherForJsonImport) {
      alert("يرجى اختيار معلم وتحديد ملف يحتوي على بيانات صالحة للمتابعة.");
      return;
    }

    setIsImportingJson(true);
    setJsonImportStatus(null);

    let importedCount = 0;
    const errorsList: string[] = [];
    const validStudents = jsonPreviewData.filter(s => s.isValid);

    for (const item of validStudents) {
      try {
        const path = 'students';
        const q = query(collection(db, path), where('name', '==', item.name));
        const querySnapshot = await getDocs(q);

        let studentId = '';

        if (!querySnapshot.empty) {
          // If student exists, update info and associate the teacher
          const docRef = querySnapshot.docs[0];
          studentId = docRef.id;
          const updatePayload: any = {
            teachers: arrayUnion(defaultTeacherForJsonImport)
          };
          if (item.grade) {
            updatePayload.grade = item.grade;
            updatePayload.academicLevel = item.grade;
          }
          if (item.phone) updatePayload.phone = item.phone;
          if (item.email) updatePayload.email = item.email;
          if (item.notes) updatePayload.notes = item.notes;

          await updateDoc(docRef.ref, updatePayload);
        } else {
          // If student is new, write full payload
          const studentPayload: any = {
            name: item.name,
            teachers: [defaultTeacherForJsonImport],
            gender: item.gender,
            registrationDate: new Date().toISOString().split('T')[0],
            status: 'Assigned',
            isOpenBalance: item.isOpenBalance,
            archived: false
          };
          if (item.grade) {
            studentPayload.grade = item.grade;
            studentPayload.academicLevel = item.grade;
          }
          if (item.phone) studentPayload.phone = item.phone;
          if (item.email) studentPayload.email = item.email;
          if (item.notes) studentPayload.notes = item.notes;

          const docRef = await addDoc(collection(db, path), studentPayload);
          studentId = docRef.id;
        }

        // Add optional initial balance as credits
        if (item.initialBalance > 0 && studentId) {
          const creditData = {
            studentId,
            amount: item.initialBalance,
            date: new Date().toISOString().split('T')[0],
            note: 'الرصيد المالي الافتتاحي (مستورد من معالج الـ JSON)'
          };
          await addDoc(collection(db, 'studentCredits'), creditData);
        }

        importedCount++;
      } catch (err: any) {
        console.error("Error importing student from JSON:", item.name, err);
        errorsList.push(`خطأ في الطالب (${item.name}): ${err?.message || 'فشل الحفظ في قاعدة البيانات'}`);
      }
    }

    setJsonImportStatus({
      total: jsonPreviewData.length,
      imported: importedCount,
      errors: errorsList
    });

    setIsImportingJson(false);
    setJsonPreviewData([]);
    fetchData();

    try {
      await logActivity({
        actionType: 'IMPORT_STUDENTS_JSON',
        actionName: 'استيراد جماعي JSON',
        actor: 'المدير العام (زكي أبو علان)',
        details: `تم تنفيذ استيراد وتحقق من صحة ملف JSON للطلاب. العدد الكلي المرفوع: ${jsonPreviewData.length}، تم تسجيل وتنسيب: ${importedCount} طالب بنجاح.`,
        timestamp: new Date().toISOString()
      });
    } catch (logErr) {
      console.warn("Failed to write activity logs:", logErr);
    }
  };

  useEffect(() => {
    if (selectedStudentId) {
      const student = students.find(s => s.id === selectedStudentId);
      if (student) {
        setEditName(student.name);
        setEditGrade(student.grade || '');
        setEditPhone(cleanLocalPhoneDigits(student.phone || ''));
        setEditEmail(student.email || '');
        setEditGender(student.gender || 'Male');
        setEditNotes(student.notes || '');
        setEditIsOpenBalance(student.isOpenBalance || false);
        setEditLowBalanceThreshold(String(student.lowBalanceThreshold ?? -100));
        setEditHourlyRate(student.hourlyRate !== undefined ? student.hourlyRate : '');
        setEditAcademicStatus(student.academicStatus || 'Active');
        setEditIsArchived(student.archived === true);
        setEditPreferredPricingUnit(student.preferredPricingUnit || (student.sessionSystem === 'session_40' ? 'session_40' : (student.grade ? getDefaultPricingUnitForGrade(student.grade) : 'hourly')));
        setEditDefaultSessionDuration(student.defaultSessionDurationMinutes === 30 ? 30 : 60);
        const rates: Record<string, string> = {};
        const payRates: Record<string, string> = {};
        teachers.forEach(t => {
          if (student.customRates?.[t.id] !== undefined) {
            rates[t.id] = String(student.customRates[t.id]);
          } else {
            rates[t.id] = '';
          }
          const ass = assignments.find(a => a.studentId === student.id && a.teacherId === t.id);
          if (ass && ass.teacherPayoutRate !== undefined && ass.teacherPayoutRate !== 0) {
            payRates[t.id] = String(ass.teacherPayoutRate);
          } else {
            payRates[t.id] = '';
          }
        });
        setTempCustomRates(rates);
        setTempTeacherPayoutRates(payRates);

        // Automatically set the date range filter from start of current month to today's date
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        setStudentStartDate(`${year}-${month}-01`);
        setStudentEndDate(`${year}-${month}-${day}`);
      }
    } else {
      setTempCustomRates({});
      setTempTeacherPayoutRates({});
      setEditName('');
      setEditGrade('');
      setEditPhone('');
      setEditEmail('');
      setEditGender('Male');
      setEditNotes('');
      setEditIsOpenBalance(false);
      setEditLowBalanceThreshold(-100);
      setEditHourlyRate('');
      setEditAcademicStatus('Active');
      setEditIsArchived(false);
      setEditPreferredPricingUnit('hourly');
      setIsEditingStudent(false);
      setStudentStartDate('');
      setStudentEndDate('');
    }
  }, [selectedStudentId, students, teachers, assignments]);

  useEffect(() => {
    setIsLoading(true);
    
    // 1. Subscribe to students in real-time
    const unsubStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
      const loadedStudents: Student[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data() as Student;
        if (data.teachers) {
          data.teachers = Array.from(new Set(data.teachers));
        }
        loadedStudents.push({ id: docSnap.id, ...data } as Student);
      });
      setStudents(loadedStudents);
      setIsLoading(false);
    }, (error) => {
      console.error("Error subscribing to students in StudentManagement:", error);
    });

    // 2. Subscribe to teachers in real-time
    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
      setTeachers(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Teacher)));
    }, (error) => {
      console.error("Error subscribing to teachers in StudentManagement:", error);
    });

    // 3. Subscribe to sessions in real-time
    const unsubSessions = onSnapshot(collection(db, 'sessions'), (snapshot) => {
      setSessions(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Session)));
    }, (error) => {
      console.error("Error subscribing to sessions in StudentManagement:", error);
    });

    // 4. Subscribe to studentCredits in real-time
    const unsubCredits = onSnapshot(collection(db, 'studentCredits'), (snapshot) => {
      setCredits(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as StudentCredit)));
    }, (error) => {
      console.error("Error subscribing to studentCredits in StudentManagement:", error);
    });

    // 5. Subscribe to assignments (and automatically clear duplicates in real-time)
    const unsubAssignments = onSnapshot(collection(db, 'assignments'), (snapshot) => {
      const rawAssignments = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      const seen = new Set<string>();
      const uniqueAssignments: any[] = [];
      const duplicateIdsToDelete: string[] = [];

      for (const ass of rawAssignments) {
        const key = `${ass.studentId}_${ass.teacherId}`;
        if (seen.has(key)) {
          duplicateIdsToDelete.push(ass.id);
        } else {
          seen.add(key);
          uniqueAssignments.push(ass);
        }
      }

      if (duplicateIdsToDelete.length > 0) {
        Promise.all(duplicateIdsToDelete.map(id => deleteDoc(doc(db, 'assignments', id)))).catch(err => {
          console.error("Error deleting duplicates in background:", err);
        });
      }
      setAssignments(uniqueAssignments);
    }, (error) => {
      console.error("Error subscribing to assignments in StudentManagement:", error);
    });

    // 6. Subscribe to trialLessons in real-time
    const unsubTrials = onSnapshot(collection(db, 'trialLessons'), (snapshot) => {
      setTrialLessons(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })));
    }, (error) => {
      console.error("Error subscribing to trialLessons in StudentManagement:", error);
    });

    // 7. Get settings (global) with real-time updates
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (settingsSnap) => {
      if (settingsSnap.exists()) {
        const sData = settingsSnap.data();
        if (typeof sData.lowBalanceThreshold === 'number') {
          setLowBalanceThreshold(sData.lowBalanceThreshold);
        }
        if (typeof sData.defaultStudentHourlyRate === 'number') {
          setDefaultStudentHourlyRate(sData.defaultStudentHourlyRate);
        } else if (typeof sData.defaultHourlyRate === 'number') {
          setDefaultStudentHourlyRate(sData.defaultHourlyRate);
        }
        if (typeof sData.defaultSecondaryStudentHourlyRate === 'number') {
          setDefaultSecondaryStudentHourlyRate(sData.defaultSecondaryStudentHourlyRate);
        }
        if (typeof sData.defaultMiddleStudentHourlyRate === 'number') {
          setDefaultMiddleStudentHourlyRate(sData.defaultMiddleStudentHourlyRate);
        }
        if (typeof sData.defaultPrimaryStudentHourlyRate === 'number') {
          setDefaultPrimaryStudentHourlyRate(sData.defaultPrimaryStudentHourlyRate);
        }
        if (typeof sData.defaultTeacherHourlyRate === 'number') {
          setDefaultTeacherHourlyRate(sData.defaultTeacherHourlyRate);
        }
        if (sData.autoWhatsAppTemplate || sData.defaultWhatsAppReminderTemplate) {
          setWhatsappTemplate(sData.autoWhatsAppTemplate || sData.defaultWhatsAppReminderTemplate);
        }
        if (sData.financialCategories && Array.isArray(sData.financialCategories) && sData.financialCategories.length > 0) {
          setFinancialCategories(sData.financialCategories);
        }
      }
    }, (err) => {
      console.error("Error subscribing to settings/global in StudentManagement:", err);
    });

    // 8. Subscribe to groupCourses in real-time
    const unsubCourses = onSnapshot(collection(db, 'groupCourses'), (snapshot) => {
      setLocalCourses(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as GroupCourse)));
    }, (error) => {
      console.error("Error subscribing to groupCourses in StudentManagement:", error);
    });

    return () => {
      unsubStudents();
      unsubTeachers();
      unsubSessions();
      unsubCredits();
      unsubAssignments();
      unsubTrials();
      unsubSettings();
      unsubCourses();
    };
  }, []);

  useEffect(() => {
    const focusId = localStorage.getItem('focus-student-id');
    if (focusId && students.length > 0) {
      const targetStudent = students.find(s => s.id === focusId);
      if (targetStudent) {
        if (targetStudent.status === StudentStatus.Pending) {
          setArchiveTab('pending');
        } else {
          setArchiveTab('active');
        }
        // Reset filters so the targeted student is immediately visible
        setSearchTerm('');
        setTeacherFilter('all');
        setGradeFilter('all');
        setBalanceStatusFilter('all');
        setCourseTypeFilter('all');
        setAcademicStatusFilter('all');
        setAssignmentStatusFilter('all');
        setSelectedStudentId(focusId);
        localStorage.removeItem('focus-student-id');
      }
    }
  }, [students]);

  // Global Keyboard Shortcuts Event Handler
  useEffect(() => {
    const handleShortcutNew = () => {
      setIsQuickAddModalOpen(true);
      setTimeout(() => {
        const el = document.getElementById('quick-add-student-name');
        if (el) (el as HTMLInputElement).focus();
      }, 100);
    };

    const handleShortcutSearch = () => {
      const el = document.getElementById('quick-student-search') || document.getElementById('student-search-input');
      if (el) {
        (el as HTMLInputElement).focus();
        (el as HTMLInputElement).select();
      }
    };

    const handleShortcutFilter = () => {
      setIsAdvancedFiltersVisible(prev => !prev);
    };

    const handleShortcutEscape = () => {
      setIsQuickAddModalOpen(false);
      setShowAddStudentForm(false);
      setIsBulkWhatsAppOpen(false);
      setIsAutoArchiveModalOpen(false);
      setDeleteConfirm(null);
      setQuickAdjustStudent(null);
    };

    const handleShortcutSave = () => {
      if (isQuickAddModalOpen) {
        const fakeEvent = { preventDefault: () => {} } as any;
        handleQuickAddStudent(fakeEvent);
      } else if (showAddStudentForm) {
        if (name && selectedTeacherForStudent) {
          handleAddStudent();
        }
      }
    };

    window.addEventListener('app:shortcut:new', handleShortcutNew);
    window.addEventListener('app:shortcut:search', handleShortcutSearch);
    window.addEventListener('app:shortcut:filter', handleShortcutFilter);
    window.addEventListener('app:shortcut:escape', handleShortcutEscape);
    window.addEventListener('app:shortcut:save', handleShortcutSave);

    return () => {
      window.removeEventListener('app:shortcut:new', handleShortcutNew);
      window.removeEventListener('app:shortcut:search', handleShortcutSearch);
      window.removeEventListener('app:shortcut:filter', handleShortcutFilter);
      window.removeEventListener('app:shortcut:escape', handleShortcutEscape);
      window.removeEventListener('app:shortcut:save', handleShortcutSave);
    };
  }, [isQuickAddModalOpen, showAddStudentForm, quickName, quickTeacher, quickGrade, quickPhone, quickInitialPayment, name, selectedTeacherForStudent, grade, phone, email, gender, notes, isOpenBalance, hourlyRate, academicStatus, initialPaymentAmt]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [stSnap, tSnap, sSnap, cSnap, aSnap, settingsSnap, trialSnap] = await Promise.all([
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'teachers')),
        getDocs(collection(db, 'sessions')),
        getDocs(collection(db, 'studentCredits')),
        getDocs(collection(db, 'assignments')).catch(() => ({ docs: [] } as any)),
        getDoc(doc(db, 'settings', 'global')).catch(() => null),
        getDocs(collection(db, 'trialLessons')).catch(() => ({ docs: [] } as any))
      ]);

      setStudents(stSnap.docs.map(doc => {
        const data = doc.data() as Student;
        if (data.teachers) {
          data.teachers = Array.from(new Set(data.teachers));
        }
        return { id: doc.id, ...data };
      }));
      setTeachers(tSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher)));
      setSessions(sSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session)));
      setCredits(cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentCredit)));
      setTrialLessons(trialSnap.docs ? trialSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) : []);

      const rawAssignments = aSnap.docs ? aSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) : [];
      const seen = new Set<string>();
      const uniqueAssignments: any[] = [];
      const duplicateIdsToDelete: string[] = [];

      for (const ass of rawAssignments) {
        const key = `${ass.studentId}_${ass.teacherId}`;
        if (seen.has(key)) {
          duplicateIdsToDelete.push(ass.id);
        } else {
          seen.add(key);
          uniqueAssignments.push(ass);
        }
      }

      if (duplicateIdsToDelete.length > 0) {
        console.log(`Found and deleting ${duplicateIdsToDelete.length} duplicate assignments in StudentManagement...`);
        Promise.all(duplicateIdsToDelete.map(id => deleteDoc(doc(db, 'assignments', id)))).catch(err => {
          console.error("Error deleting duplicates in background:", err);
        });
      }

      setAssignments(uniqueAssignments);

      if (settingsSnap && settingsSnap.exists()) {
        const sData = settingsSnap.data();
        if (typeof sData.lowBalanceThreshold === 'number') {
          setLowBalanceThreshold(sData.lowBalanceThreshold);
        }
        if (typeof sData.defaultStudentHourlyRate === 'number') {
          setDefaultStudentHourlyRate(sData.defaultStudentHourlyRate);
        } else if (typeof sData.defaultHourlyRate === 'number') {
          setDefaultStudentHourlyRate(sData.defaultHourlyRate);
        }
        if (typeof sData.defaultSecondaryStudentHourlyRate === 'number') {
          setDefaultSecondaryStudentHourlyRate(sData.defaultSecondaryStudentHourlyRate);
        }
        if (typeof sData.defaultMiddleStudentHourlyRate === 'number') {
          setDefaultMiddleStudentHourlyRate(sData.defaultMiddleStudentHourlyRate);
        }
        if (typeof sData.defaultPrimaryStudentHourlyRate === 'number') {
          setDefaultPrimaryStudentHourlyRate(sData.defaultPrimaryStudentHourlyRate);
        }
        if (typeof sData.defaultTeacherHourlyRate === 'number') {
          setDefaultTeacherHourlyRate(sData.defaultTeacherHourlyRate);
        }
        if (sData.autoWhatsAppTemplate || sData.defaultWhatsAppReminderTemplate) {
          setWhatsappTemplate(sData.autoWhatsAppTemplate || sData.defaultWhatsAppReminderTemplate);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'students/ledger-data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim() || !quickTeacher) return;
    
    // Strict Duplicate Check: Prevent duplicate student if name AND phone match an existing student
    const existingDup = findDuplicateStudent(quickName, quickPhone, students);
    if (existingDup) {
      alert(`⚠️ لا يمكن تكرار تسجيل الطالب!\n\nيوجد طالب مسجل بالفعل بنفس الاسم ورقم الهاتف تماماً:\n- الاسم: ${existingDup.name}\n- رقم الهاتف: ${existingDup.phone || 'بدون هاتف'}\n- الصف: ${existingDup.grade || 'غير محدد'}\n\nتم حظر تكرار السجل تلقائياً لمنع ازدواجية الحسابات.`);
      return;
    }

    setIsSubmittingQuickAdd(true);
    const path = 'students';
    try {
      const q = query(collection(db, path), where('name', '==', quickName.trim()));
      const querySnapshot = await getDocs(q);
      
      let studentId = '';
      
      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0];
        studentId = docRef.id;
        const sData = docRef.data();
        if (sData?.teachers?.includes(quickTeacher)) {
          alert('هذا المعلم مرتبط بالفعل مع الطالب المذكور مسبقاً!');
          setIsSubmittingQuickAdd(false);
          return;
        }
        
        const updatePayload: any = { 
          teachers: arrayUnion(quickTeacher),
          teacherId: quickTeacher,
          assignedTeacherId: quickTeacher,
          status: 'Assigned',
          preferredPricingUnit: quickPreferredPricingUnit,
          sessionSystem: quickPreferredPricingUnit === 'session_40' ? 'session_40' : 'hours'
        };
        if (quickGrade) {
          updatePayload.grade = quickGrade.trim();
          updatePayload.academicLevel = quickGrade.trim();
        }
        if (quickPhone) {
          updatePayload.phone = quickPhone.trim();
        }
        
        await updateDoc(docRef.ref, updatePayload);
      } else {
        const studentPayload: any = {
          name: quickName.trim(),
          teachers: [quickTeacher],
          teacherId: quickTeacher,
          assignedTeacherId: quickTeacher,
          lowBalanceThreshold: -100,
          phone: quickPhone.trim(),
          email: '',
          gender: 'Male',
          notes: 'تسجيل سريع من ضغط العمل',
          isOpenBalance: false,
          hourlyRate: 0,
          preferredPricingUnit: quickPreferredPricingUnit,
          sessionSystem: quickPreferredPricingUnit === 'session_40' ? 'session_40' : 'hours',
          registrationDate: new Date().toISOString().split('T')[0],
          status: 'Assigned',
          archived: false
        };
        if (quickGrade) {
          studentPayload.grade = quickGrade.trim();
          studentPayload.academicLevel = quickGrade.trim();
        }
        const docRef = await addDoc(collection(db, path), studentPayload);
        studentId = docRef.id;
      }

      // Ensure assignment document exists in assignments collection for teacher dashboard real-time linking
      if (quickTeacher && studentId) {
        try {
          const qAssign = query(
            collection(db, 'assignments'),
            where('studentId', '==', studentId),
            where('teacherId', '==', quickTeacher)
          );
          const assignSnap = await getDocs(qAssign);
          if (assignSnap.empty) {
            await addDoc(collection(db, 'assignments'), {
              studentId: studentId,
              teacherId: quickTeacher,
              createdAt: new Date().toISOString(),
              priority: 'medium',
              source: 'quick_add'
            });
          }
        } catch (assignErr) {
          console.warn('Assignment doc creation warning in quick add:', assignErr);
        }
      }

      // If initial payment added in Quick Add
      if (quickInitialPayment && !isNaN(Number(quickInitialPayment)) && Number(quickInitialPayment) > 0) {
        const creditData = {
          studentId,
          amount: Number(quickInitialPayment),
          date: new Date().toISOString().split('T')[0],
          note: 'الرصيد الافتتاحي (شحن رصيد عند تسجيل الطالب السريع)'
        };
        await addDoc(collection(db, 'studentCredits'), creditData);
      }

      // Send instant placement notification to teacher if assigned
      if (quickTeacher && studentId) {
        try {
          await notifyTeacherOnStudentPlacement({
            teacherId: quickTeacher,
            studentId,
            studentName: quickName.trim(),
            studentGrade: quickGrade ? quickGrade.trim() : '',
            studentPhone: quickPhone.trim(),
            notes: 'تسجيل سريع من ضغط العمل',
            source: 'quick_add',
            title: `🎉 تم تنسيب الطالب "${quickName.trim()}" إلى حسابك التعليمي`
          });
        } catch (notifErr) {
          console.warn('Failed to notify teacher on quick add:', notifErr);
        }
      }

      await logActivity({
        actionType: 'QUICK_STUDENT_ADD',
        actionName: 'تسجيل طالب سريع',
        details: `تم إضافة الطالب المالي بالسجل السريع: "${quickName.trim()}" وربطه بالمعلم المختار.`
      });

      setQuickAddSuccess(true);
      await fetchData();

      setTimeout(() => {
        setQuickAddSuccess(false);
        setIsQuickAddModalOpen(false);
        setQuickName('');
        setQuickTeacher('');
        setQuickGrade('');
        setQuickPhone('');
        setQuickInitialPayment('');
        setQuickPreferredPricingUnit('hourly');
      }, 1500);

    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setIsSubmittingQuickAdd(false);
    }
  };

  const handleAddStudent = async () => {
    if (!name || !selectedTeacherForStudent) return;

    // Strict Duplicate Check: Prevent duplicate student if name AND phone match an existing student
    const existingDup = findDuplicateStudent(name, phone, students);
    if (existingDup) {
      alert(`⚠️ لا يمكن تكرار تسجيل الطالب!\n\nيوجد طالب مسجل مسبقاً بنفس الاسم ورقم الهاتف:\n- اسم الطالب: ${existingDup.name}\n- رقم الهاتف: ${existingDup.phone || 'بدون هاتف'}\n- الصف: ${existingDup.grade || 'غير محدد'}\n\nيرجى فتح ملف الطالب الحالي وتعديله أو إضافة المعلم لحسابه بدلاً من تكرار السجل.`);
      return;
    }

    const path = 'students';
    try {
      // Validate student login credentials if requested
      if (createStudentAccount) {
        if (!accountUsername.trim()) {
          alert('يرجى تحديد أو إنشاء اسم مستخدم لحساب الطالب.');
          return;
        }
        if (!accountPassword.trim()) {
          alert('يرجى إدخال كلمة المرور لحساب الطالب أو تفعيل خيار الإنشاء التلقائي.');
          return;
        }
        if (accountPassword.trim() !== accountConfirmPassword.trim()) {
          alert('عذراً، كلمة المرور وتأكيد كلمة المرور غير متطابقتين!');
          return;
        }
      }

      const thresholdVal = newStudentLowBalanceThreshold !== '' && !isNaN(Number(newStudentLowBalanceThreshold))
        ? Number(newStudentLowBalanceThreshold)
        : -100;

      let studentId = '';

      const q = query(collection(db, path), where('name', '==', name.trim()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docRef = querySnapshot.docs[0];
        studentId = docRef.id;
        const sData = docRef.data();
        if (sData?.teachers?.includes(selectedTeacherForStudent)) {
          alert('هذا المعلم مرتبط بالفعل مع الطالب المذكور مسبقاً!');
          return;
        }
        const updatePayload: any = { 
          teachers: arrayUnion(selectedTeacherForStudent),
          teacherId: selectedTeacherForStudent,
          assignedTeacherId: selectedTeacherForStudent,
          status: 'Assigned'
        };
        if (grade) {
          updatePayload.grade = grade;
          updatePayload.academicLevel = grade;
        }
        const finalPhone = formatWhatsAppPhone972(phone);
        updatePayload.lowBalanceThreshold = thresholdVal;
        updatePayload.phone = finalPhone;
        updatePayload.email = email.trim();
        updatePayload.gender = gender;
        updatePayload.notes = notes.trim();
        updatePayload.isOpenBalance = isOpenBalance;
        updatePayload.hourlyRate = hourlyRate === '' ? 0 : Number(hourlyRate);
        updatePayload.academicStatus = academicStatus;
        updatePayload.preferredPricingUnit = preferredPricingUnit;
        updatePayload.sessionSystem = preferredPricingUnit === 'session_40' ? 'session_40' : 'hours';
        updatePayload.defaultSessionDurationMinutes = preferredPricingUnit === 'session_40' ? 40 : (newStudentSessionDuration === 30 ? 30 : 60);

        const addStage = getAcademicStage(grade || '');
        if (preferredPricingUnit === 'session_40') {
          const finalSessionRate = sessionRate !== '' && !isNaN(Number(sessionRate)) && Number(sessionRate) > 0
            ? Number(sessionRate)
            : (addStage === 'secondary' ? 50 : 40);
          const finalTeacherPayout = teacherSessionPayout !== '' && !isNaN(Number(teacherSessionPayout)) && Number(teacherSessionPayout) > 0
            ? Number(teacherSessionPayout)
            : (addStage === 'secondary' ? 35 : 25);
          updatePayload.sessionRate = finalSessionRate;
          updatePayload.sessionPayoutTeacher = finalTeacherPayout;
          if (addStage === 'middle') {
            updatePayload.middleSchoolSessionRate = finalSessionRate;
            updatePayload.middleSchoolTeacherSessionPayout = finalTeacherPayout;
          } else {
            updatePayload.secondarySchoolSessionRate = finalSessionRate;
            updatePayload.secondarySchoolTeacherSessionPayout = finalTeacherPayout;
          }
        }

        if (createStudentAccount) {
          updatePayload.username = accountUsername.trim();
          updatePayload.password = accountPassword.trim();
          updatePayload.hasAccount = true;
          updatePayload.isFirstLogin = forceChangePasswordOnFirstLogin;
        }

        await updateDoc(docRef.ref, updatePayload);
      } else {
        const finalPhone = formatWhatsAppPhone972(phone);
        const addStage = getAcademicStage(grade || '');
        const finalSessionRate = sessionRate !== '' && !isNaN(Number(sessionRate)) && Number(sessionRate) > 0
          ? Number(sessionRate)
          : (addStage === 'secondary' ? 50 : 40);
        const finalTeacherPayout = teacherSessionPayout !== '' && !isNaN(Number(teacherSessionPayout)) && Number(teacherSessionPayout) > 0
          ? Number(teacherSessionPayout)
          : (addStage === 'secondary' ? 35 : 25);

        const studentPayload: any = { 
          name: name.trim(), 
          teachers: [selectedTeacherForStudent],
          teacherId: selectedTeacherForStudent,
          assignedTeacherId: selectedTeacherForStudent,
          lowBalanceThreshold: thresholdVal,
          phone: finalPhone,
          email: email.trim(),
          gender,
          notes: notes.trim(),
          isOpenBalance,
          hourlyRate: hourlyRate === '' ? 0 : Number(hourlyRate),
          academicStatus,
          preferredPricingUnit,
          sessionSystem: preferredPricingUnit === 'session_40' ? 'session_40' : 'hours',
          defaultSessionDurationMinutes: preferredPricingUnit === 'session_40' ? 40 : (newStudentSessionDuration === 30 ? 30 : 60),
          sessionRate: preferredPricingUnit === 'session_40' ? finalSessionRate : undefined,
          sessionPayoutTeacher: preferredPricingUnit === 'session_40' ? finalTeacherPayout : undefined,
          middleSchoolSessionRate: addStage === 'middle' ? finalSessionRate : (preferredPricingUnit === 'session_40' ? 40 : undefined),
          secondarySchoolSessionRate: addStage === 'secondary' ? finalSessionRate : (preferredPricingUnit === 'session_40' ? 50 : undefined),
          middleSchoolTeacherSessionPayout: addStage === 'middle' ? finalTeacherPayout : (preferredPricingUnit === 'session_40' ? 25 : undefined),
          secondarySchoolTeacherSessionPayout: addStage === 'secondary' ? finalTeacherPayout : (preferredPricingUnit === 'session_40' ? 35 : undefined),
          registrationDate: new Date().toISOString().split('T')[0],
          status: 'Assigned',
          archived: false
        };
        if (grade) {
          studentPayload.grade = grade;
          studentPayload.academicLevel = grade;
        }
        if (createStudentAccount) {
          studentPayload.username = accountUsername.trim();
          studentPayload.password = accountPassword.trim();
          studentPayload.hasAccount = true;
          studentPayload.isFirstLogin = forceChangePasswordOnFirstLogin;
        }
        const docRef = await addDoc(collection(db, path), studentPayload);
        studentId = docRef.id;
      }

      // Ensure assignment document exists in assignments collection for teacher dashboard real-time linking
      if (selectedTeacherForStudent && studentId) {
        try {
          const qAssign = query(
            collection(db, 'assignments'),
            where('studentId', '==', studentId),
            where('teacherId', '==', selectedTeacherForStudent)
          );
          const assignSnap = await getDocs(qAssign);
          if (assignSnap.empty) {
            await addDoc(collection(db, 'assignments'), {
              studentId: studentId,
              teacherId: selectedTeacherForStudent,
              createdAt: new Date().toISOString(),
              priority: 'medium',
              source: 'student_registration'
            });
          }
        } catch (assignErr) {
          console.warn('Assignment doc creation warning in handleAddStudent:', assignErr);
        }
      }

      // Add cash payment record if filled out
      if (initialPaymentAmt && !isNaN(Number(initialPaymentAmt)) && Number(initialPaymentAmt) > 0 && studentId) {
        const creditData = {
          studentId,
          amount: Number(initialPaymentAmt),
          date: new Date().toISOString().split('T')[0],
          note: 'الرصيد الافتتاحي (شحن رصيد عند تسجيل الطالب الجديد)'
        };
        await addDoc(collection(db, 'studentCredits'), creditData);
      }

      // Save student login account if requested
      if (createStudentAccount && studentId) {
        const finalPhone = formatWhatsAppPhone972(phone);
        const studentAccountData: StudentAccount = {
          id: studentId,
          studentId: studentId,
          name: name.trim(),
          username: accountUsername.trim(),
          password: accountPassword.trim(),
          email: email.trim(),
          phone: finalPhone,
          grade: grade ? grade.trim() : 'الثاني عشر (توجيهي علمي)',
          groupName: 'مجموعة التفوق للبجروت',
          registeredSubjects: ['بيولوجيا'],
          isActive: academicStatus !== 'Paused',
          isFirstLogin: forceChangePasswordOnFirstLogin,
          termsAccepted: !forceChangePasswordOnFirstLogin,
          createdAt: new Date().toISOString(),
          completedLessonsCount: 0,
          completedUnitsCount: 0,
          averageGrade: 100,
          notes: notes.trim()
        };
        await saveStudentAccount(studentAccountData);

        // Display credentials modal for instant sharing/copying
        setCreatedStudentAccount({
          username: accountUsername.trim(),
          password: accountPassword.trim(),
          studentName: name.trim()
        });

        if (sendCredentialsEmail && email.trim()) {
          await logActivity({
            actionType: 'إرسال بيانات الدخول للبريد',
            actionName: 'إرسال بيانات حساب الطالب',
            details: `تم إعداد وإرسال بيانات الدخول للطالب "${name.trim()}" إلى بريده الإلكتروني: (${email.trim()}). اسم المستخدم: ${accountUsername.trim()}`
          });
        }
      }

      // Send instant placement notification to teacher if assigned
      if (selectedTeacherForStudent && studentId) {
        try {
          const finalPhone = formatWhatsAppPhone972(phone);
          await notifyTeacherOnStudentPlacement({
            teacherId: selectedTeacherForStudent,
            studentId,
            studentName: name.trim(),
            studentGrade: grade ? grade.trim() : '',
            studentPhone: finalPhone,
            notes: notes.trim(),
            source: 'placement',
            title: `🎉 تم تنسيب الطالب "${name.trim()}" إلى حسابك التعليمي بنجاح`
          });
        } catch (notifErr) {
          console.warn('Failed to notify teacher on student add:', notifErr);
        }
      }
      
      setName('');
      setGrade('');
      setSelectedTeacherForStudent('');
      setNewStudentLowBalanceThreshold('-100');
      setPhone('');
      setEmail('');
      setGender('Male');
      setNotes('');
      setIsOpenBalance(false);
      setHourlyRate('');
      setPreferredPricingUnit('hourly');
      setSessionRate('');
      setTeacherSessionPayout('');
      setAcademicStatus('Active');
      setInitialPaymentAmt('');
      setCreateStudentAccount(false);
      setAccountUsername('');
      setAccountPassword('');
      setAccountConfirmPassword('');
      setAutoGenUsername(false);
      setAutoGenPassword(false);
      setForceChangePasswordOnFirstLogin(true);
      setSendCredentialsEmail(false);
      setShowAddStudentForm(false);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const handleBookAndAssignTrial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trialBookingStudent || !trialTeacherId) {
      setTrialBookingError('الرجاء اختيار المعلم المنسّب.');
      return;
    }

    setIsBookingTrial(true);
    setTrialBookingError('');
    setTrialBookingSuccess('');

    const teacherObj = teachers.find(t => t.id === trialTeacherId);
    if (!teacherObj) {
      setTrialBookingError('المعلم المختار غير موجود بالمنظومة.');
      setIsBookingTrial(false);
      return;
    }

    try {
      // 1. Create the trial lesson document
      const newTrialDoc = {
        studentName: trialBookingStudent.name,
        grade: trialBookingStudent.grade || '',
        subject: trialSubject,
        topic: trialTopic.trim() || 'حصة تجريبية مخصصة وتنسيب مباشر',
        phone: trialBookingStudent.phone || '',
        teacherId: trialTeacherId,
        teacherName: teacherObj.name,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'trialLessons'), newTrialDoc);

      // 2. Perform placement/assignment ("التنسيب")
      const studentRef = doc(db, 'students', trialBookingStudent.id);
      const studentTeachers = trialBookingStudent.teachers || [];
      const updatedTeachers = studentTeachers.includes(trialTeacherId)
        ? studentTeachers
        : [...studentTeachers, trialTeacherId];

      await updateDoc(studentRef, {
        teachers: updatedTeachers,
        status: 'Assigned',
        notes: `${trialBookingStudent.notes || ''}\n[تم حجز حصة تجريبية وتنسيب مباشر مع المعلم: ${teacherObj.name} لموضوع: ${trialSubject}]`
      });

      // 3. Log activity
      await logActivity({
        actionType: 'TRIAL_BOOK_AND_ASSIGN',
        actionName: 'حجز تجريبي وتنسيب طالب',
        details: `تم حجز حصة تجريبية وتنسيب الطالب "${trialBookingStudent.name}" تلقائياً للمعلم: "${teacherObj.name}" لموضوع: ${trialSubject}.`
      });

      // 4. Send instant placement notification to teacher
      try {
        await notifyTeacherOnStudentPlacement({
          teacherId: trialTeacherId,
          studentId: trialBookingStudent.id,
          studentName: trialBookingStudent.name,
          studentGrade: trialBookingStudent.grade || '',
          studentPhone: trialBookingStudent.phone || '',
          subject: trialSubject,
          topic: trialTopic.trim() || 'حصة تجريبية مخصصة وتنسيب مباشر',
          source: 'trial_booking',
          title: `📅 تم حجز حصة تجريبية وتنسيب الطالب "${trialBookingStudent.name}" لك لموضوع: ${trialSubject}`
        });
      } catch (notifErr) {
        console.warn('Failed to notify teacher on trial book and assign:', notifErr);
      }

      setJustBookedTrialWithTeacher({
        studentName: trialBookingStudent.name,
        grade: trialBookingStudent.grade || '',
        subject: trialSubject,
        topic: trialTopic.trim() || 'حصة تجريبية مخصصة وتنسيب مباشر',
        phone: trialBookingStudent.phone || '',
        teacherName: teacherObj.name,
        teacherPhone: teacherObj.phone || ''
      });

      setTrialBookingSuccess('🎉 تم حجز الحصة التجريبية بنجاح وإتمام عملية التنسيب وتعيين المعلم للطالب!');
      await fetchData();

      // Clear the input fields but keep success states
      setTrialTopic('');
      setTrialTeacherId('');

    } catch (err: any) {
      console.error("Error booking trial and assigning: ", err);
      setTrialBookingError('فشل الإجراء: ' + err.message);
    } finally {
      setIsBookingTrial(false);
    }
  };

  const handleActivateStudent = async (student: Student) => {
    if (!workflowTeacherId) {
      setActivationError('الرجاء اختيار معلم لتنسيب الطالب إليه.');
      return;
    }
    setActivationError('');
    setActivationSuccess('');
    setIsActivatingStudent(true);

    try {
      const parsedRate = workflowHourlyRate.trim() ? parseFloat(workflowHourlyRate) : null;
      const studentRef = doc(db, 'students', student.id);
      
      const teachersList = student.teachers || [];
      const updatedTeachers = teachersList.includes(workflowTeacherId)
        ? teachersList
        : [...teachersList, workflowTeacherId];

      // Auto-generate credentials for the student
      const cleanPhone = student.phone ? student.phone.replace(/[\s\-\+\(\)]/g, '') : '';
      const suffix = cleanPhone || student.id.substring(0, 6);
      const generatedUsername = `student_${suffix}`;
      const generatedPassword = Math.floor(100000 + Math.random() * 900000).toString();

      const updatePayload: any = {
        status: StudentStatus.Assigned,
        teachers: updatedTeachers,
        username: generatedUsername,
        password: generatedPassword,
        preferredPricingUnit: workflowPreferredPricingUnit,
        sessionSystem: workflowPreferredPricingUnit === 'session_40' ? 'session_40' : 'hours'
      };

      if (parsedRate !== null && !isNaN(parsedRate)) {
        updatePayload.hourlyRate = parsedRate;
      }

      // Update student document with active status and login credentials
      await updateDoc(studentRef, updatePayload);

      // Create/update student account document in dedicated studentAccounts collection
      const accountRef = doc(db, 'studentAccounts', student.id);
      await setDoc(accountRef, {
        id: student.id,
        studentId: student.id,
        studentName: student.name,
        username: generatedUsername,
        password: generatedPassword,
        createdAt: new Date().toISOString(),
        isActive: true
      });

      // Create teacher-student assignment document if it doesn't exist
      const existingAssignment = assignments.find(a => a.studentId === student.id && a.teacherId === workflowTeacherId);
      if (!existingAssignment) {
        await addDoc(collection(db, 'assignments'), {
          studentId: student.id,
          teacherId: workflowTeacherId,
          createdAt: new Date().toISOString()
        });
      }

      // Log activity
      const teacherObj = teachers.find(t => t.id === workflowTeacherId);
      await logActivity({
        actionType: 'تنسيب واعتماد طالب',
        details: `تم اعتماد تسجيل الطالب "${student.name}" وتنسيبه للمعلم: "${teacherObj ? teacherObj.name : workflowTeacherId}" بنجاح، وتوليد حساب دخول له تلقائياً: (${generatedUsername}).`,
        studentId: student.id,
        studentName: student.name
      });

      // Send instant placement notification to teacher
      try {
        await notifyTeacherOnStudentPlacement({
          teacherId: workflowTeacherId,
          studentId: student.id,
          studentName: student.name,
          studentGrade: student.grade || student.academicLevel || '',
          studentPhone: student.phone || '',
          notes: student.notes || '',
          source: 'placement',
          title: `🎉 تم تفعيل وتنسيب الطالب "${student.name}" إلى حسابك التعليمي`
        });
      } catch (notifErr) {
        console.warn('Failed to notify teacher on student activation:', notifErr);
      }

      // Save to state to display to the user in a beautiful modal
      setCreatedStudentAccount({
        username: generatedUsername,
        password: generatedPassword,
        studentName: student.name
      });

      setActivationSuccess('تم تفعيل وتنسيب الطالب بنجاح! جاري عرض بيانات الدخول الخاصة به...');
      
      // Refresh local state
      fetchData();

      setTimeout(() => {
        setArchiveTab('active');
        setSearchTerm('');
        setTeacherFilter('all');
        setGradeFilter('all');
        setBalanceStatusFilter('all');
        setCourseTypeFilter('all');
        setAcademicStatusFilter('all');
        setAssignmentStatusFilter('all');
        setSelectedStudentId(null);
        setWorkflowTeacherId('');
        setWorkflowHourlyRate('');
        setActivationSuccess('');
      }, 3000);

    } catch (error) {
      console.error("Error activating student:", error);
      setActivationError('فشل اعتماد وتفعيل الطالب. الرجاء المحاولة مرة أخرى.');
    } finally {
      setIsActivatingStudent(false);
    }
  };

  const handleCompleteTrialLesson = async (trialId: string) => {
    try {
      const trialRef = doc(db, 'trialLessons', trialId);
      await updateDoc(trialRef, { status: 'completed' });
      
      setTrialLessons(prev => prev.map(t => t.id === trialId ? { ...t, status: 'completed' } : t));
      
      await logActivity({
        actionType: 'تأكيد حصة تجريبية',
        details: `تم تأكيد خوض الحصة التجريبية بنجاح بنسبة 100%.`
      });
      
      fetchData();
    } catch (err) {
      console.error("Error completing trial lesson:", err);
    }
  };

  const handleUpdateStudent = async () => {
    if (!selectedStudentId || !editName.trim()) return;

    // Strict Duplicate Check: Prevent updating student to duplicate an existing student
    const existingDup = findDuplicateStudent(editName, editPhone, students, selectedStudentId);
    if (existingDup) {
      alert(`⚠️ لا يمكن حفظ التعديل: يوجد طالب آخر مسجل بالفعل بنفس الاسم ورقم الهاتف («${existingDup.name}» - «${existingDup.phone || 'بدون هاتف'}»).\nيرجى تصحيح الاسم أو رقم الهاتف لتجنب تكرار السجلات.`);
      return;
    }

    if (editCreateStudentAccount) {
      if (!editAccountUsername.trim()) {
        alert('يرجى تحديد أو إدخال اسم المستخدم لحساب الطالب.');
        return;
      }
      if (editAccountPassword.trim() && editAccountPassword.trim() !== editAccountConfirmPassword.trim()) {
        alert('عذراً، كلمة المرور وتأكيد كلمة المرور غير متطابقتين!');
        return;
      }
    }

    try {
      const finalEditPhone = formatWhatsAppPhone972(editPhone);
      const studentRef = doc(db, 'students', selectedStudentId);
      const updateData: any = {
        name: editName.trim(),
        grade: editGrade.trim(),
        academicLevel: editGrade.trim(),
        phone: finalEditPhone,
        email: editEmail.trim(),
        gender: editGender,
        notes: editNotes.trim(),
        isOpenBalance: editIsOpenBalance,
        lowBalanceThreshold: Number(editLowBalanceThreshold),
        hourlyRate: editHourlyRate === '' ? 0 : Number(editHourlyRate),
        academicStatus: editAcademicStatus,
        archived: editIsArchived,
        ...(editIsArchived ? { archivedAt: new Date().toISOString() } : { restoredAt: new Date().toISOString() }),
        preferredPricingUnit: editPreferredPricingUnit,
        sessionSystem: editPreferredPricingUnit === 'session_40' ? 'session_40' : 'hours',
        defaultSessionDurationMinutes: editPreferredPricingUnit === 'session_40' ? 40 : (editDefaultSessionDuration === 30 ? 30 : 60),
        sessionRate: editPreferredPricingUnit === 'session_40'
          ? (editSessionRate !== '' && !isNaN(Number(editSessionRate)) && Number(editSessionRate) > 0 ? Number(editSessionRate) : (getAcademicStage(editGrade) === 'secondary' ? 50 : 40))
          : undefined,
        sessionPayoutTeacher: editPreferredPricingUnit === 'session_40'
          ? (editTeacherSessionPayout !== '' && !isNaN(Number(editTeacherSessionPayout)) && Number(editTeacherSessionPayout) > 0 ? Number(editTeacherSessionPayout) : (getAcademicStage(editGrade) === 'secondary' ? 35 : 25))
          : undefined,
        ...(getAcademicStage(editGrade) === 'middle' ? {
          middleSchoolSessionRate: editSessionRate !== '' && !isNaN(Number(editSessionRate)) && Number(editSessionRate) > 0 ? Number(editSessionRate) : 40,
          middleSchoolTeacherSessionPayout: editTeacherSessionPayout !== '' && !isNaN(Number(editTeacherSessionPayout)) && Number(editTeacherSessionPayout) > 0 ? Number(editTeacherSessionPayout) : 25
        } : {
          secondarySchoolSessionRate: editSessionRate !== '' && !isNaN(Number(editSessionRate)) && Number(editSessionRate) > 0 ? Number(editSessionRate) : 50,
          secondarySchoolTeacherSessionPayout: editTeacherSessionPayout !== '' && !isNaN(Number(editTeacherSessionPayout)) && Number(editTeacherSessionPayout) > 0 ? Number(editTeacherSessionPayout) : 35
        })
      };

      if (editCreateStudentAccount) {
        updateData.username = editAccountUsername.trim();
        updateData.hasAccount = true;
        updateData.isFirstLogin = editForceChangePasswordOnFirstLogin;
        if (editAccountPassword.trim()) {
          updateData.password = editAccountPassword.trim();
        }

        // Save / update studentAccounts in Firestore
        const existingAccountDoc = await getDoc(doc(db, 'studentAccounts', selectedStudentId));
        const prevData = existingAccountDoc.exists() ? (existingAccountDoc.data() as StudentAccount) : ({} as Partial<StudentAccount>);
        
        const accountPayload: StudentAccount = {
          id: selectedStudentId,
          studentId: selectedStudentId,
          name: editName.trim(),
          username: editAccountUsername.trim(),
          password: editAccountPassword.trim() || prevData.password || generateSuggestedPassword(),
          email: editEmail.trim(),
          phone: finalEditPhone,
          grade: editGrade.trim() || prevData.grade || 'الثاني عشر (توجيهي علمي)',
          groupName: prevData.groupName || 'مجموعة التفوق للبجروت',
          registeredSubjects: prevData.registeredSubjects || ['بيولوجيا'],
          isActive: editAcademicStatus !== 'Paused',
          isFirstLogin: editForceChangePasswordOnFirstLogin,
          termsAccepted: prevData.termsAccepted ?? !editForceChangePasswordOnFirstLogin,
          createdAt: prevData.createdAt || new Date().toISOString(),
          completedLessonsCount: prevData.completedLessonsCount || 0,
          completedUnitsCount: prevData.completedUnitsCount || 0,
          averageGrade: prevData.averageGrade || 100,
          notes: editNotes.trim()
        };

        await saveStudentAccount(accountPayload);
        setExistingStudentAccount(accountPayload);

        // If password was updated, display credentials modal for instant sharing/copying
        if (editAccountPassword.trim()) {
          setCreatedStudentAccount({
            username: editAccountUsername.trim(),
            password: editAccountPassword.trim(),
            studentName: editName.trim()
          });
        }

        if (editSendCredentialsEmail && editEmail.trim()) {
          await logActivity({
            actionType: 'إرسال بيانات الدخول للبريد',
            actionName: 'تحديث بيانات حساب الطالب',
            details: `تم تحديث وإرسال بيانات الدخول للطالب "${editName.trim()}" إلى بريده الإلكتروني: (${editEmail.trim()}). اسم المستخدم: ${editAccountUsername.trim()}`
          });
        }
      }

      await updateDoc(studentRef, updateData);

      const oldStudent = students.find(s => s.id === selectedStudentId);
      const oldRate = oldStudent?.hourlyRate ?? 0;
      const newRate = editHourlyRate === '' ? 0 : Number(editHourlyRate);
      const rateChanged = oldRate !== newRate;

      if (rateChanged) {
        await logActivity({
          actionType: 'UPDATE_STUDENT_RATE',
          actionName: 'تعديل سعر ساعة الطالب',
          studentId: selectedStudentId,
          studentName: editName.trim(),
          details: `تم تعديل سعر ساعة الطالب "${editName.trim()}" من ₪${oldRate} إلى ₪${newRate} (الوحدة: ${editPreferredPricingUnit === 'session_40' ? 'حصة 40 دقيقة' : 'ساعة كاملة'}).`,
          previousValue: oldRate,
          newValue: newRate
        });
      }

      // Update local state
      setStudents(prev => prev.map(s => s.id === selectedStudentId ? { ...s, ...updateData } : s));
      setIsEditingStudent(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `students/${selectedStudentId}`);
    }
  };

  const updateLiveReceiptData = (fields: Partial<StudentPaymentReceiptData>) => {
    if (!currentReceiptData) return;
    const updated: StudentPaymentReceiptData = {
      ...currentReceiptData,
      ...fields
    };
    setCurrentReceiptData(updated);
    const html = generateStudentPaymentReceiptHtml(updated);
    setPrintPreviewHtml(html);
  };

  const handleGeneratePaymentReceipt = (credit: Partial<StudentCredit> & { amount: number; date?: string; note?: string; id?: string; studentId?: string; serviceName?: string; paymentMethod?: string }, studentParam?: Student) => {
    const student = studentParam || (credit.studentId ? students.find(s => s.id === credit.studentId) : null) || (selectedStudentId ? students.find(s => s.id === selectedStudentId) : null);
    if (!student) return;

    const stats = getStudentStats(student.id);
    const receiptNum = generateReceiptNumber(credit.id);
    const teacher = student.teacherId ? teachers.find(t => t.id === student.teacherId) : undefined;

    const currentBal = stats?.balance ?? 0;
    const prevBal = currentBal - credit.amount;
    const resolvedServiceName = credit.serviceName || (credit.note && credit.note.includes('خدمة') ? credit.note : 'شحن رصيد المحفظة التعليمية وسداد رسوم الحصص الدراسية');
    const resolvedPaymentMethod = credit.paymentMethod || credit.method || 'نقداً (كاش)';

    const receiptData: StudentPaymentReceiptData = {
      receiptNumber: receiptNum,
      receiptDate: credit.date || new Date().toISOString().split('T')[0],
      studentId: student.id,
      studentName: student.name,
      studentPhone: student.phone,
      studentGrade: student.grade || student.academicLevel,
      amount: credit.amount,
      serviceName: resolvedServiceName,
      paymentMethod: resolvedPaymentMethod,
      note: credit.note || resolvedServiceName,
      previousBalance: prevBal,
      newBalance: currentBal,
      managerName: 'أ. د. زكي أبو علان',
      academyName: globalSettings?.academyName || 'أكاديمية التفوق أون لاين للتمكين الأكاديمي والتعليمي',
      centerPhone: '059-8321040',
      centerEmail: 'zakiabuillan@gmail.com',
      centerAddress: 'المنصة التعليمية الرقمية المعتمدة - فلسطين',
      centerLicense: 'ترخيص واعتماد رقم: EDU-2026-98442',
      leadTeacherName: teacher?.name
    };

    const html = generateStudentPaymentReceiptHtml(receiptData);
    setPrintPreviewHtml(html);
    setPrintPreviewTitle(`سند قبض مالي معتمد - ${student.name} (₪${credit.amount})`);
    setCurrentReceiptData(receiptData);
    setShowPrintPreview(true);
  };

  const handleLivePreviewBeforeTopUp = () => {
    if (!selectedStudentId) return;
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;

    const parsedAmount = parseFloat(topUpAmount) || 0;
    const stats = getStudentStats(student.id);
    const currentBal = stats?.balance ?? 0;
    const prevBal = currentBal;
    const newBal = currentBal + parsedAmount;
    const receiptNum = generateReceiptNumber();
    const teacher = student.teacherId ? teachers.find(t => t.id === student.teacherId) : undefined;

    const receiptData: StudentPaymentReceiptData = {
      receiptNumber: receiptNum,
      receiptDate: topUpDate || new Date().toISOString().split('T')[0],
      studentId: student.id,
      studentName: student.name,
      studentPhone: student.phone,
      studentGrade: student.grade || student.academicLevel,
      amount: parsedAmount,
      serviceName: topUpService || 'شحن رصيد المحفظة التعليمية',
      paymentMethod: topUpPaymentMethod || 'نقداً (كاش)',
      note: topUpNote || topUpService || 'شحن رصيد المحفظة التعليمية وسداد رسوم الحصص الدراسية',
      previousBalance: prevBal,
      newBalance: newBal,
      managerName: 'أ. د. زكي أبو علان',
      academyName: globalSettings?.academyName || 'أكاديمية التفوق أون لاين للتمكين الأكاديمي والتعليمي',
      centerPhone: '059-8321040',
      centerEmail: 'zakiabuillan@gmail.com',
      centerAddress: 'المنصة التعليمية الرقمية المعتمدة - فلسطين',
      centerLicense: 'ترخيص واعتماد رقم: EDU-2026-98442',
      leadTeacherName: teacher?.name
    };

    const html = generateStudentPaymentReceiptHtml(receiptData);
    setPrintPreviewHtml(html);
    setPrintPreviewTitle(`معاينة حية لإيصال الدفع - ${student.name} (₪${parsedAmount})`);
    setCurrentReceiptData(receiptData);
    setShowPrintPreview(true);
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !topUpAmount) return;

    try {
      const creditData = {
        studentId: selectedStudentId,
        amount: parseFloat(topUpAmount),
        date: topUpDate || new Date().toISOString().split('T')[0],
        serviceName: topUpService || 'شحن رصيد المحفظة التعليمية',
        paymentMethod: topUpPaymentMethod || 'نقداً (كاش)',
        note: topUpNote,
        ...(topUpFinancialCategory ? { financialCategory: topUpFinancialCategory } : {})
      };
      const docRef = await addDoc(collection(db, 'studentCredits'), creditData);
      const newCreditRecord = { id: docRef.id, ...creditData };
      setCredits([...credits, newCreditRecord]);
      
      const studentObj = students.find(s => s.id === selectedStudentId);
      const studentName = studentObj ? studentObj.name : 'طالب مجهول';
      await logActivity({
        actionType: 'TOPUP',
        actionName: 'شحن رصيد طالِب',
        details: `شحن رصيد الطالب: "${studentName}" بمبلغ: ₪${parseFloat(topUpAmount)} بتاريخ: ${topUpDate}، تصنيف: "${topUpFinancialCategory || 'عام'}"، خدمة: "${topUpService}"، بملاحظة: "${topUpNote || 'لا يوجد'}"`,
        amount: parseFloat(topUpAmount)
      });

      if (studentObj) {
        setTopUpSuccessNotice({ credit: newCreditRecord, student: studentObj });
      }

      setTopUpAmount('');
      setTopUpNote('');
      setTopUpFinancialCategory('');
      setTopUpDate(new Date().toISOString().split('T')[0]);
      setShowTopUpForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'studentCredits');
    }
  };

  const handleOpenEditCredit = (credit: StudentCredit) => {
    if (!isCurrentUserManager) {
      alert("عذراً، هذه العملية المالية مخصصة لمدير المنصة فقط.");
      return;
    }
    setEditingCredit(credit);
    setEditCreditAmount(String(credit.amount));
    setEditCreditNote(credit.note || '');
    setEditCreditDate(credit.date || new Date().toISOString().split('T')[0]);
    setEditCreditPaymentMethod(credit.paymentMethod || credit.method || 'نقداً (كاش)');
    setEditCreditFinancialCategory(credit.financialCategory || '');
    setEditCreditTargetStudentId(credit.studentId);
    setIsEditCreditModalOpen(true);
  };

  const handleUpdateCredit = async (creditId: string) => {
    if (!isCurrentUserManager) {
      alert("عذراً، هذه العملية المالية مخصصة لمدير المنصة فقط.");
      return;
    }
    setIsSubmittingEditCredit(true);
    try {
      const creditRef = doc(db, 'studentCredits', creditId);
      const updatedAmount = parseFloat(editCreditAmount) || 0;
      const updatedDate = editCreditDate || new Date().toISOString().split('T')[0];
      
      const originalCredit = credits.find(c => c.id === creditId) || editingCredit;
      const oldAmount = originalCredit ? originalCredit.amount : 0;
      const oldStudentId = originalCredit ? originalCredit.studentId : selectedStudentId;
      const targetStudentId = editCreditTargetStudentId || oldStudentId;
      const originalStudentObj = students.find(s => s.id === oldStudentId);
      const targetStudentObj = students.find(s => s.id === targetStudentId);
      const studentName = targetStudentObj ? targetStudentObj.name : 'طالب مجهول';

      // تنظيف الملاحظات لضمان عدم ظهور أي لفظ تعديل في كشف الحساب
      const sanitizedNote = sanitizeFinancialNote(editCreditNote);

      const updateData: any = {
        amount: updatedAmount,
        note: sanitizedNote,
        date: updatedDate,
        ...(editCreditPaymentMethod ? { paymentMethod: editCreditPaymentMethod, method: editCreditPaymentMethod } : {}),
        ...(editCreditFinancialCategory ? { financialCategory: editCreditFinancialCategory } : {})
      };

      if (targetStudentId && targetStudentId !== oldStudentId) {
        updateData.studentId = targetStudentId;
      }

      await updateDoc(creditRef, updateData);
      setCredits(prev => prev.map(c => c.id === creditId ? { ...c, ...updateData } : c));
      
      // مزامنة رصيد الطالب في قاعدة البيانات تلقائياً
      if (targetStudentId === oldStudentId) {
        if (originalStudentObj && oldStudentId) {
          const diff = updatedAmount - oldAmount;
          const currentBal = typeof originalStudentObj.balance === 'number' ? originalStudentObj.balance : getStudentStats(oldStudentId).balance;
          const newBal = Number((currentBal + diff).toFixed(2));
          updateDoc(doc(db, 'students', oldStudentId), {
            balance: newBal,
            updatedAt: new Date().toISOString()
          }).catch(err => console.warn('Sync student balance warning:', err));
          setStudents(prev => prev.map(s => s.id === oldStudentId ? { ...s, balance: newBal } : s));
        }
      } else {
        // إذا تم تغيير الطالب: خصم من القديم وإضافة للجديد
        if (originalStudentObj && oldStudentId) {
          const oldBal = typeof originalStudentObj.balance === 'number' ? originalStudentObj.balance : getStudentStats(oldStudentId).balance;
          const newOldBal = Number((oldBal - oldAmount).toFixed(2));
          updateDoc(doc(db, 'students', oldStudentId), { balance: newOldBal, updatedAt: new Date().toISOString() }).catch(console.warn);
          setStudents(prev => prev.map(s => s.id === oldStudentId ? { ...s, balance: newOldBal } : s));
        }
        if (targetStudentObj && targetStudentId) {
          const targetBal = typeof targetStudentObj.balance === 'number' ? targetStudentObj.balance : getStudentStats(targetStudentId).balance;
          const newTargetBal = Number((targetBal + updatedAmount).toFixed(2));
          updateDoc(doc(db, 'students', targetStudentId), { balance: newTargetBal, updatedAt: new Date().toISOString() }).catch(console.warn);
          setStudents(prev => prev.map(s => s.id === targetStudentId ? { ...s, balance: newTargetBal } : s));
        }
      }

      await logActivity({
        actionType: 'UPDATE_CREDIT',
        actionName: 'تعديل دفعة رصيد طالب',
        details: `تحديث دفعة رصيد الطالب "${studentName}" بمبلغ: ₪${updatedAmount} (السابق: ₪${oldAmount})، والتاريخ: ${updatedDate}، محسوبة تلقائياً في النظام`,
        amount: updatedAmount
      });

      setEditingCreditId(null);
      setIsEditCreditModalOpen(false);
      setEditingCredit(null);
      triggerToast('تم تعديل الدفعة بنجاح', `تم حفظ مبلغ الدفعة (₪${updatedAmount}) وتحديث رصيد الطالب تلقائياً في النظام.`, 'success');
    } catch (error) {
      console.error("Error updating credit:", error);
      handleFirestoreError(error, OperationType.WRITE, `studentCredits/${creditId}`);
    } finally {
      setIsSubmittingEditCredit(false);
    }
  };

  const handleDeleteCredit = (creditId: string) => {
    if (!isCurrentUserManager) {
      alert("عذراً، هذه العملية المالية مخصصة لمدير المنصة فقط.");
      return;
    }
    setDeleteConfirm({ id: creditId, type: 'credit' });
  };

  const executeDeleteCredit = async (creditId: string) => {
    if (!isCurrentUserManager) {
      alert("عذراً، هذه العملية المالية مخصصة لمدير المنصة فقط.");
      return;
    }
    try {
      const originalCredit = credits.find(c => c.id === creditId);
      const oldAmount = originalCredit ? originalCredit.amount : 0;
      const targetStudentId = originalCredit ? originalCredit.studentId : selectedStudentId;
      const studentObj = students.find(s => s.id === targetStudentId);
      const studentName = studentObj ? studentObj.name : 'طالب مجهول';

      await deleteDoc(doc(db, 'studentCredits', creditId));
      setCredits(prev => prev.filter(c => c.id !== creditId));

      // مزامنة رصيد الطالب في قاعدة البيانات بعد حذف الدفعة
      if (studentObj && targetStudentId) {
        const currentBal = typeof studentObj.balance === 'number' ? studentObj.balance : getStudentStats(targetStudentId).balance;
        const newBal = Number((currentBal - oldAmount).toFixed(2));
        updateDoc(doc(db, 'students', targetStudentId), {
          balance: newBal,
          updatedAt: new Date().toISOString()
        }).catch(err => console.warn('Sync student balance warning on delete:', err));
        setStudents(prev => prev.map(s => s.id === targetStudentId ? { ...s, balance: newBal } : s));
      }

      await logActivity({
        actionType: 'DELETE_CREDIT',
        actionName: 'حذف دفعة رصيد طالب',
        details: `قام مدير المنصة بحذف دفعة رصيد الطالب "${studentName}" بالكامل (المبلغ المحذوف: ₪${oldAmount}، رقم الدفعة: ${creditId})`,
        amount: -oldAmount
      });
      triggerToast('تم حذف الدفعة بنجاح', `تم حذف الدفعة المالية (₪${oldAmount}) وتعديل رصيد الطالب تلقائياً.`, 'success');
    } catch (error) {
      console.error("Error deleting credit:", error);
      handleFirestoreError(error, OperationType.DELETE, `studentCredits/${creditId}`);
    }
  };

  const executeDeleteSession = async (sessionId: string) => {
    if (!isCurrentUserManager) {
      alert("عذراً، هذه العملية المالية مخصصة لمدير المنصة فقط.");
      return;
    }
    try {
      const originalSession = sessions.find(s => s.id === sessionId);
      const studentObj = students.find(s => s.id === (originalSession ? originalSession.studentId : selectedStudentId));
      const studentName = studentObj ? studentObj.name : 'طالب مجهول';
      
      let cost = 0;
      if (originalSession) {
        if (originalSession.isGroupSession || originalSession.isGroup) {
          if (originalSession.customFee !== undefined && originalSession.customFee > 0) {
            cost = originalSession.customFee;
          }
        } else if (originalSession.customFee !== undefined) {
          cost = originalSession.customFee;
        } else {
          const teacher = teachers.find(t => t.id === originalSession.teacherId);
          const rate = studentObj?.customRates?.[originalSession.teacherId] !== undefined
            ? studentObj.customRates[originalSession.teacherId]
            : (studentObj?.hourlyRate ? studentObj.hourlyRate : (teacher?.billingRate || teacher?.hourlyRate || 0));
          cost = originalSession.durationHours * rate;
        }
      }

      await deleteDoc(doc(db, 'sessions', sessionId));
      setSessions(prev => prev.filter(s => s.id !== sessionId));

      const assignedTeacher = teachers.find(t => t.id === originalSession?.teacherId);

      await logActivity({
        actionType: 'DELETE_SESSION',
        actionName: 'حذف حصة دراسية',
        actor: 'زكي أبو علان (المدير)',
        studentId: selectedStudentId,
        studentName: studentName,
        teacherId: originalSession?.teacherId,
        teacherName: assignedTeacher?.name,
        details: `قام مدير المنصة بحذف حصة دراسية للطالب "${studentName}" بالكامل (التكلفة المستردة: ₪${cost}، رقم الحصة: ${sessionId})`,
        amount: cost
      });
    } catch (error) {
      console.error("Error deleting session:", error);
      handleFirestoreError(error, OperationType.DELETE, `sessions/${sessionId}`);
    }
  };

  const handleDirectBalanceAdjustment = async (currentBalance: number) => {
    if (!selectedStudentId) return;
    const targetBalance = parseFloat(directBalanceValue);
    if (isNaN(targetBalance)) return;

    const diff = targetBalance - currentBalance;
    if (diff === 0) {
      setShowDirectBalanceEdit(false);
      return;
    }

    try {
      const creditRefObj: any = {
        studentId: selectedStudentId,
        amount: Number(diff.toFixed(2)),
        date: new Date().toISOString().split('T')[0],
        note: 'شحن رصيد المحفظة التعليمية (دفعة معتمدة)',
        isAdjustment: true,
        hideInStatement: true // لا تظهر حركة التعديل في كشف الحساب لولي الأمر بل تحسب تلقائياً في النظام
      };
      const docRef = await addDoc(collection(db, 'studentCredits'), creditRefObj);
      setCredits(prev => [...prev, { id: docRef.id, ...creditRefObj }]);

      // مزامنة رصيد الطالب في قاعدة البيانات وحسابه تلقائياً
      const studentRef = doc(db, 'students', selectedStudentId);
      await updateDoc(studentRef, {
        balance: targetBalance,
        updatedAt: new Date().toISOString()
      }).catch(err => console.warn('Sync student balance warning:', err));

      setStudents(prev => prev.map(s => s.id === selectedStudentId ? { ...s, balance: targetBalance } : s));

      const studentObj = students.find(s => s.id === selectedStudentId);
      const studentName = studentObj ? studentObj.name : 'طالب مجهول';
      await logActivity({
        actionType: 'BALANCE_ADJUSTMENT',
        actionName: 'تعديل رصيد مالي من إدارة المنصة',
        details: `تم تعديل رصيد الطالب "${studentName}" إلى ₪${targetBalance} واحتسابه تلقائياً في النظام دون إظهار التعديل في الكشف`,
        amount: diff
      });

      setShowDirectBalanceEdit(false);
      setDirectBalanceValue('');
      triggerToast('تم تعديل واحتساب الرصيد بنجاح', `تم ضبط رصيد الطالب إلى ₪${targetBalance} واحتسابه تلقائياً دون إظهار التعديل في الكشف.`, 'success');
    } catch (error) {
      console.error("Error adjusting student balance:", error);
      handleFirestoreError(error, OperationType.WRITE, 'studentCredits');
    }
  };

  const handleQuickFinancialAdjustment = async (currentBalance: number) => {
    if (!quickAdjustStudent) return;
    
    // Reset any previous errors
    setQuickAdjustError('');

    let diff = 0;
    let detailDesc = '';
    let targetNewBal = currentBalance;

    if (quickAdjustMode === 'set_total') {
      const targetBalance = parseFloat(quickAdjustNewBalance);
      if (isNaN(targetBalance)) {
        setQuickAdjustError('يرجى إدخال مبلغ صحيح للرصيد المستهدف.');
        return;
      }
      diff = targetBalance - currentBalance;
      targetNewBal = targetBalance;
      detailDesc = `تعديل رصيد كلي للطالب "${quickAdjustStudent.name}" من ₪${currentBalance} إلى ₪${targetBalance} (كما أدخله المدير)`;
    } else {
      const delta = parseFloat(quickAdjustDeltaAmount);
      if (isNaN(delta) || delta === 0) {
        setQuickAdjustError('يرجى إدخال قيمة حركة صحيحة (موجبة أو سالبة غير صفرية).');
        return;
      }
      diff = delta;
      targetNewBal = currentBalance + delta;
      detailDesc = `حركة مالية للطالب "${quickAdjustStudent.name}" بقيمة ₪${delta} (كما أدخلها المدير)`;
    }

    if (diff === 0) {
      setQuickAdjustStudent(null);
      return;
    }

    const trimmedComment = quickAdjustComment.trim();

    setIsSavingQuickAdjust(true);
    try {
      // إعداد ملاحظة نظيفة خالية من كلمة "تعديل" لكشف الحساب
      const cleanNote = trimmedComment 
        ? sanitizeFinancialNote(trimmedComment)
        : (diff >= 0 ? 'شحن رصيد المحفظة التعليمية' : 'خصم معتمد');

      const creditRefObj: any = {
        studentId: quickAdjustStudent.id,
        amount: Number(diff.toFixed(2)),
        date: new Date().toISOString().split('T')[0],
        note: cleanNote,
        isAdjustment: true,
        hideInStatement: quickAdjustHideInStatement // إخفاء حركة التعديل من كشف الحساب لولي الأمر مع حسابها تلقائياً
      };

      const docRef = await addDoc(collection(db, 'studentCredits'), creditRefObj);
      setCredits(prev => [...prev, { id: docRef.id, ...creditRefObj }]);

      // تحديث رصيد الطالب فورياً في قاعدة البيانات ليحسب تلقائياً في النظام
      const studentRef = doc(db, 'students', quickAdjustStudent.id);
      await updateDoc(studentRef, {
        balance: Number(targetNewBal.toFixed(2)),
        updatedAt: new Date().toISOString()
      }).catch(err => console.warn('Sync student balance err:', err));

      setStudents(prev => prev.map(s => s.id === quickAdjustStudent.id ? { ...s, balance: Number(targetNewBal.toFixed(2)) } : s));

      await logActivity({
        actionType: 'BALANCE_ADJUSTMENT',
        actionName: 'تعديل مالي للطالب من إدارة المنصة',
        details: `${detailDesc} | احتساب تلقائي في النظام ${quickAdjustHideInStatement ? 'مع إخفاء التعديل من الكشف' : ''}`,
        amount: diff
      });

      setQuickAdjustStudent(null);
      setQuickAdjustComment('');
      setQuickAdjustError('');
      triggerToast('تم احتساب المبلغ وتحديث الرصيد', `تم تعديل رصيد الطالب إلى ₪${targetNewBal.toFixed(2)} بنجاح ويحسب تلقائياً في النظام دون إظهار التعديل في الكشف.`, 'success');
    } catch (error) {
      console.error("Error at handleQuickFinancialAdjustment:", error);
      setQuickAdjustError('حدث خطأ أثناء حفظ التعديل المالي في قاعدة البيانات.');
      handleFirestoreError(error, OperationType.WRITE, 'studentCredits');
    } finally {
      setIsSavingQuickAdjust(false);
    }
  };

  const deleteStudent = (id: string) => {
    if (!isCurrentUserManager) {
      alert("عذراً، لا تمتلك الصلاحيات الكافية لحذف الطلاب. هذه العملية مخصصة لمدير المنصة فقط.");
      return;
    }
    setDeleteConfirm({ id, type: 'student' });
  };

  const executeDeleteStudent = async (id: string) => {
    if (!isCurrentUserManager) {
      alert("عذراً، لا تمتلك الصلاحيات الكافية لحذف الطلاب. هذه العملية مخصصة لمدير المنصة فقط.");
      return;
    }
    const path = `students/${id}`;
    try {
      const student = students.find(s => s.id === id);
      const studentName = student ? student.name : 'طالب';
      const studentGrade = student?.grade || 'غير محدد';
      const studentPhone = student?.phone || 'لا يوجد';
      const studentRate = student?.hourlyRate ?? 0;
      const studentStats = getStudentStats(id);
      const studentBalance = studentStats.balance;
      
      await deleteDoc(doc(db, 'students', id));
      
      await logActivity({
        actionType: 'DELETE_STUDENT',
        actionName: 'حذف طالب نهائياً',
        studentId: id,
        studentName: studentName,
        details: `قام مدير المنصة بحذف الطالب "${studentName}" بشكل نهائي من النظام وكافة سجلاته (الصف: ${studentGrade}، الهاتف: ${studentPhone}، سعر الساعة: ₪${studentRate}، الرصيد المتبقي عند الحذف: ₪${studentBalance.toFixed(1)}).`,
        amount: studentBalance,
        metadata: {
          grade: studentGrade,
          phone: studentPhone,
          hourlyRate: studentRate,
          remainingBalance: studentBalance
        }
      });
      
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleMergeDuplicateGroup = async (group: DuplicateStudentGroup) => {
    const studentName = group.primaryStudent.name;
    const dupCount = group.duplicateStudents.length;

    if (!window.confirm(`هل أنت متأكد من دمج ${dupCount + 1} سجلات متطابقة للطالب "${studentName}" وحذف النسخ الفائضة (${dupCount} سجل)؟\n\nسيتم توحيد كافة الحصص والمدفوعات والمعلمين في السجل الأساسي المعتمد بأمان تام.`)) {
      return;
    }

    setIsMergingDuplicates(true);
    setDuplicateMergeProgress(`جاري دمج سجلات الطالب "${studentName}"...`);

    try {
      const primaryId = group.primaryStudent.id;
      const combinedTeachers = new Set<string>(group.primaryStudent.teachers || []);

      for (const dup of group.duplicateStudents) {
        (dup.teachers || []).forEach(t => combinedTeachers.add(t));

        // 1. Reassign student credits
        const creditsSnap = await getDocs(query(collection(db, 'studentCredits'), where('studentId', '==', dup.id)));
        for (const cDoc of creditsSnap.docs) {
          await updateDoc(cDoc.ref, { studentId: primaryId });
        }

        // 2. Reassign sessions
        const sessionsSnap = await getDocs(query(collection(db, 'sessions'), where('studentId', '==', dup.id)));
        for (const sDoc of sessionsSnap.docs) {
          await updateDoc(sDoc.ref, { studentId: primaryId });
        }

        // Also check sessions where students array contains dup.id
        const groupSessionsSnap = await getDocs(query(collection(db, 'sessions'), where('students', 'array-contains', dup.id)));
        for (const gsDoc of groupSessionsSnap.docs) {
          const prevStudents = gsDoc.data().students || [];
          const updatedStudents = Array.from(new Set(prevStudents.map((id: string) => id === dup.id ? primaryId : id)));
          await updateDoc(gsDoc.ref, { students: updatedStudents });
        }

        // 3. Reassign assignments
        const assignSnap = await getDocs(query(collection(db, 'assignments'), where('studentId', '==', dup.id)));
        for (const aDoc of assignSnap.docs) {
          const aData = aDoc.data();
          const existingAssign = assignments.find(a => a.studentId === primaryId && a.teacherId === aData.teacherId);
          if (existingAssign) {
            await deleteDoc(aDoc.ref);
          } else {
            await updateDoc(aDoc.ref, { studentId: primaryId });
          }
        }

        // 4. Update any linked trial lessons
        const trialsSnap = await getDocs(query(collection(db, 'trialLessons'), where('migratedToStudentId', '==', dup.id)));
        for (const trDoc of trialsSnap.docs) {
          await updateDoc(trDoc.ref, { migratedToStudentId: primaryId });
        }

        // 5. Delete duplicate student account
        try {
          await deleteDoc(doc(db, 'studentAccounts', dup.id));
        } catch {}

        // 6. Delete duplicate student document
        await deleteDoc(doc(db, 'students', dup.id));
      }

      // Update primary student record with combined teachers
      await updateDoc(doc(db, 'students', primaryId), {
        teachers: Array.from(combinedTeachers),
        updatedAt: new Date().toISOString()
      });

      await logActivity({
        actionType: 'MERGE_DUPLICATE_STUDENTS',
        actionName: 'دمج سجلات طالب مكرر',
        details: `تم دمج ${dupCount} سجلات مكررة للطالب "${studentName}" هاتف (${group.cleanPhone}) في السجل الرئيسي (${primaryId}) وحذف النسخ الإضافية.`
      });

      alert(`✅ تم بنجاح دمج وحذف كافة السجلات المكررة للطالب "${studentName}" وتوحيد حساباته في سجل رئيسي واحد.`);
      await fetchData();
    } catch (err: any) {
      console.error('Error merging duplicate student group:', err);
      alert('حدث خطأ أثناء دمج السجلات المكررة: ' + (err?.message || 'خطأ غير متوقع'));
    } finally {
      setIsMergingDuplicates(false);
      setDuplicateMergeProgress('');
    }
  };

  const handleMergeAllDuplicates = async () => {
    if (duplicateGroups.length === 0) return;

    if (!window.confirm(`⚠️ تأكيد الدمج الشامل:\n\nهل تريد دمج جميع الحالات المكررة (${duplicateGroups.length} طالب، بإجمالي ${totalDuplicateRedundantCount} سجل زائد) دفعة واحدة؟\nسيتم الاحتفاظ بالسجل الأفضل لكل طالب ونقل كافة العمليات وحذف السجلات المكررة.`)) {
      return;
    }

    setIsMergingDuplicates(true);

    try {
      let processed = 0;
      for (const group of duplicateGroups) {
        processed++;
        setDuplicateMergeProgress(`جاري دمج (${processed} من ${duplicateGroups.length}): ${group.primaryStudent.name}...`);
        const primaryId = group.primaryStudent.id;
        const combinedTeachers = new Set<string>(group.primaryStudent.teachers || []);

        for (const dup of group.duplicateStudents) {
          (dup.teachers || []).forEach(t => combinedTeachers.add(t));

          const creditsSnap = await getDocs(query(collection(db, 'studentCredits'), where('studentId', '==', dup.id)));
          for (const cDoc of creditsSnap.docs) {
            await updateDoc(cDoc.ref, { studentId: primaryId });
          }

          const sessionsSnap = await getDocs(query(collection(db, 'sessions'), where('studentId', '==', dup.id)));
          for (const sDoc of sessionsSnap.docs) {
            await updateDoc(sDoc.ref, { studentId: primaryId });
          }

          const assignSnap = await getDocs(query(collection(db, 'assignments'), where('studentId', '==', dup.id)));
          for (const aDoc of assignSnap.docs) {
            await deleteDoc(aDoc.ref).catch(() => {});
          }

          try {
            await deleteDoc(doc(db, 'studentAccounts', dup.id));
          } catch {}

          await deleteDoc(doc(db, 'students', dup.id));
        }

        await updateDoc(doc(db, 'students', primaryId), {
          teachers: Array.from(combinedTeachers),
          updatedAt: new Date().toISOString()
        });
      }

      await logActivity({
        actionType: 'MERGE_ALL_DUPLICATE_STUDENTS',
        actionName: 'دمج شامل لكافة الطلاب المكررين',
        details: `تم دمج وتنظيف كافة الحسابات المكررة لـ ${duplicateGroups.length} طالب بإجمالي ${totalDuplicateRedundantCount} سجل زائد بنجاح تام.`
      });

      alert(`🎉 تمت عملية الدمج الشامل بنجاح!\nتم توحيد جميع الحسابات وحذف ${totalDuplicateRedundantCount} سجل مكرر.`);
      setIsDuplicateModalOpen(false);
      await fetchData();
    } catch (err: any) {
      console.error('Error during bulk merge of duplicates:', err);
      alert('حدث خطأ أثناء الدمج الشامل: ' + (err?.message || 'خطأ غير متوقع'));
    } finally {
      setIsMergingDuplicates(false);
      setDuplicateMergeProgress('');
    }
  };

  const toggleArchiveStudent = async (id: string, archiveFlag: boolean, reason?: string) => {
    const path = `students/${id}`;
    try {
      const studentRef = doc(db, 'students', id);
      const student = students.find(s => s.id === id);
      const studentName = student ? student.name : 'طالب';
      const finalReason = reason || (archiveReasonSelection === 'أخرى' && customArchiveReason.trim() ? customArchiveReason.trim() : archiveReasonSelection) || 'توقف مؤقت عن الدوام';

      const updatePayload: any = {
        archived: archiveFlag
      };

      if (archiveFlag) {
        updatePayload.archivedAt = new Date().toISOString();
        updatePayload.archiveReason = finalReason;
        updatePayload.academicStatus = 'Paused';
      } else {
        updatePayload.restoredAt = new Date().toISOString();
        updatePayload.academicStatus = 'Active';
      }

      await updateDoc(studentRef, updatePayload);
      
      await logActivity({
        actionType: archiveFlag ? 'ARCHIVE_STUDENT' : 'UNARCHIVE_STUDENT',
        actionName: archiveFlag ? 'أرشفة طالب' : 'استعادة وتنشيط طالب',
        details: archiveFlag 
          ? `تم نقل الطالب "${studentName}" للأرشيف بنجاح (السبب: ${finalReason}) مع حفظ كامل سجلاته الأكاديمية والمالية` 
          : `تمت استعادة وتنشيط حساب الطالب "${studentName}" بنجاح وإعادته لقائمة الطلاب النشطين بكامل بياناته ورصيده`,
        amount: 0
      });

      setArchiveNotification({
        type: archiveFlag ? 'archived' : 'restored',
        studentName,
        studentId: id
      });
      setTimeout(() => {
        setArchiveNotification(null);
      }, 7000);

      fetchData();
    } catch (error) {
      console.error("Error archiving student:", error);
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const linkTeacherToStudent = async (teacherId: string) => {
    if (!selectedStudentId) return;
    const path = `students/${selectedStudentId}`;
    try {
      const student = students.find(s => s.id === selectedStudentId);
      if (student?.teachers?.includes(teacherId)) {
        alert('هذا المعلم مرتبط بالفعل مع الطالب المذكور مسبقاً!');
        return;
      }
      const studentRef = doc(db, 'students', selectedStudentId);
      await updateDoc(studentRef, {
        teachers: arrayUnion(teacherId),
        status: StudentStatus.Assigned,
        updatedAt: new Date().toISOString()
      });

      // Ensure assignments collection document exists for bidirectional reliability
      const existingAssignment = assignments.find(a => a.studentId === selectedStudentId && a.teacherId === teacherId);
      if (!existingAssignment) {
        await addDoc(collection(db, 'assignments'), {
          studentId: selectedStudentId,
          teacherId: teacherId,
          createdAt: new Date().toISOString(),
          priority: 'medium',
          source: 'manual_link'
        });
      }

      if (student) {
        try {
          await notifyTeacherOnStudentPlacement({
            teacherId: teacherId,
            studentId: selectedStudentId,
            studentName: student.name,
            studentGrade: student.grade || student.academicLevel || '',
            studentPhone: student.phone || '',
            notes: student.notes || '',
            source: 'placement',
            title: `🎉 تم تنسيب الطالب "${student.name}" إلى حسابك التعليمي`
          });
        } catch (notifErr) {
          console.warn('Failed to notify teacher on link teacher:', notifErr);
        }
      }

      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const openTransferModal = (student: Student, defaultSourceTeacherId?: string) => {
    setTransferStudent(student);
    const teachersList = student.teachers || [];
    if (defaultSourceTeacherId) {
      setTransferSourceTeacherId(defaultSourceTeacherId);
    } else if (teachersList.length > 0) {
      setTransferSourceTeacherId(teachersList[0]);
    } else {
      setTransferSourceTeacherId('');
    }
    setTransferTargetTeacherId('');
    setTransferSubject('عام');
    setTransferNotes('');
    setIsTransferModalOpen(true);
  };

  const handleTransferStudent = async () => {
    if (!transferStudent || !transferTargetTeacherId) {
      alert('يرجى اختيار المعلم الجديد المراد ترحيل الطالب إليه.');
      return;
    }
    if (transferSourceTeacherId && transferSourceTeacherId === transferTargetTeacherId) {
      alert('لا يمكن نقل الطالب إلى نفس المعلم الحالي!');
      return;
    }

    setTransferLoading(true);
    try {
      const studentId = transferStudent.id;
      const studentRef = doc(db, 'students', studentId);
      
      const currentTeachers = transferStudent.teachers || [];
      const updatedTeachers = transferSourceTeacherId 
        ? currentTeachers.filter(id => id !== transferSourceTeacherId)
        : [...currentTeachers];
        
      if (!updatedTeachers.includes(transferTargetTeacherId)) {
        updatedTeachers.push(transferTargetTeacherId);
      }

      const currentCustomRates = { ...(transferStudent.customRates || {}) };
      if (transferSourceTeacherId) {
        const oldTeacherRate = currentCustomRates[transferSourceTeacherId];
        delete currentCustomRates[transferSourceTeacherId];
        if (oldTeacherRate !== undefined) {
          currentCustomRates[transferTargetTeacherId] = oldTeacherRate;
        }
      }

      await updateDoc(studentRef, {
        teachers: updatedTeachers,
        customRates: currentCustomRates,
        status: StudentStatus.Assigned,
        updatedAt: new Date().toISOString()
      });

      // Update assignments collection
      try {
        if (transferSourceTeacherId) {
          const qAssign = query(
            collection(db, 'assignments'),
            where('studentId', '==', studentId),
            where('teacherId', '==', transferSourceTeacherId)
          );
          const snap = await getDocs(qAssign);
          for (const d of snap.docs) {
            await deleteDoc(d.ref);
          }
        }

        const qNewAssign = query(
          collection(db, 'assignments'),
          where('studentId', '==', studentId),
          where('teacherId', '==', transferTargetTeacherId)
        );
        const newSnap = await getDocs(qNewAssign);
        if (newSnap.empty) {
          await addDoc(collection(db, 'assignments'), {
            studentId,
            teacherId: transferTargetTeacherId,
            createdAt: new Date().toISOString(),
            priority: 'medium',
            source: 'student_transfer',
            previousTeacherId: transferSourceTeacherId || '',
            subject: transferSubject || 'عام'
          });
        }
      } catch (assignErr) {
        console.warn('Assignment doc sync warning:', assignErr);
      }

      const oldT = teachers.find(t => t.id === transferSourceTeacherId);
      const newT = teachers.find(t => t.id === transferTargetTeacherId);

      // Send instant notifications to BOTH teachers & write audit log
      if (transferSourceTeacherId) {
        await notifyTeachersOnStudentTransfer({
          studentId,
          studentName: transferStudent.name,
          studentGrade: transferStudent.grade || transferStudent.academicLevel || '',
          studentPhone: transferStudent.phone || '',
          subject: transferSubject || 'عام',
          oldTeacherId: transferSourceTeacherId,
          oldTeacherName: oldT?.name || '',
          newTeacherId: transferTargetTeacherId,
          newTeacherName: newT?.name || '',
          notes: transferNotes.trim(),
          transferredBy: 'إدارة الأكاديمية (المدير)'
        });
      } else {
        // Direct assignment without previous teacher
        await notifyTeacherOnStudentAssignment({
          teacherId: transferTargetTeacherId,
          teacherName: newT?.name || '',
          studentId,
          studentName: transferStudent.name,
          studentGrade: transferStudent.grade || transferStudent.academicLevel || '',
          studentPhone: transferStudent.phone || '',
          subject: transferSubject || 'عام',
          notes: transferNotes.trim(),
          source: 'placement',
          title: 'تم إسناد طالب جديد إليك',
          assignedBy: 'إدارة الأكاديمية (المدير)',
          logAudit: true
        });
      }

      setTransferSuccessBanner(`تم ترحيل ونقل الطالب "${transferStudent.name}" بنجاح إلى المعلم "${newT?.name || ''}"، وتم إرسال الإشعارات الفورية للطرفين وتحديث سجل النشاطات العام 🚀`);
      setIsTransferModalOpen(false);
      setTransferStudent(null);
      setTransferSourceTeacherId('');
      setTransferTargetTeacherId('');
      setTransferSubject('عام');
      setTransferNotes('');
      await fetchData();
    } catch (error) {
      console.error('Error transferring student:', error);
      alert('حدث خطأ أثناء نقل الطالب، يرجى المحاولة لاحقاً.');
    } finally {
      setTransferLoading(false);
    }
  };

  const unlinkTeacherFromStudent = async (teacherId: string, studentIdParam?: string) => {
    const sId = studentIdParam || selectedStudentId;
    if (!sId) return;
    const student = students.find(s => s.id === sId);
    const teacher = teachers.find(t => t.id === teacherId);
    if (!confirm(`هل أنت متأكد من إلغاء تنسيب المعلم "${teacher?.name || ''}" للطالب "${student?.name || ''}"؟`)) {
      return;
    }
    try {
      const studentRef = doc(db, 'students', sId);
      const updatedTeachers = (student?.teachers || []).filter(id => id !== teacherId);
      const updatedCustomRates = { ...(student?.customRates || {}) };
      delete updatedCustomRates[teacherId];

      await updateDoc(studentRef, {
        teachers: updatedTeachers,
        customRates: updatedCustomRates,
        updatedAt: new Date().toISOString()
      });

      // Delete from assignments
      const qAssign = query(
        collection(db, 'assignments'),
        where('studentId', '==', sId),
        where('teacherId', '==', teacherId)
      );
      const snap = await getDocs(qAssign);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }

      // Notify previous teacher
      if (student) {
        const now = new Date();
        const formattedTimestamp = `${now.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })} ${now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
        const bodyText = `تم إلغاء تنسيب الطالب من قائمتك التعليمية\nاسم الطالب: ${student.name}\nالصف: ${student.grade || student.academicLevel || 'غير محدد'}\nتاريخ ووقت العملية: ${formattedTimestamp}.`;
        
        await addDoc(collection(db, 'teacherNotifications'), {
          teacherId,
          teacherName: teacher?.name || '',
          studentId: sId,
          studentName: student.name,
          studentGrade: student.grade || student.academicLevel || '',
          date: now.toISOString().split('T')[0],
          type: 'student_transfer_out',
          source: 'transfer',
          title: 'تم نقل طالب من قائمتك التعليمية',
          details: bodyText,
          message: bodyText,
          assignedAt: formattedTimestamp,
          updatedAt: now.toISOString(),
          createdAt: now.toISOString(),
          seen: false
        });

        await logActivity({
          actionType: 'STUDENT_UNASSIGN',
          actionName: 'إلغاء تنسيب طالب من معلم',
          actor: 'إدارة الأكاديمية (المدير)',
          studentId: sId,
          studentName: student.name,
          details: `تم إلغاء ربط وتنسيب الطالب "${student.name}" مع المعلم "${teacher?.name}".`
        });
      }

      await fetchData();
    } catch (err) {
      console.error('Error unlinking teacher:', err);
    }
  };

  const getStudentStats = (studentId: string, startDate?: string, endDate?: string, subject?: string) => {
    let studentSessions = sessions.filter(s => s.studentId === studentId);
    let studentCredits = credits.filter(c => c.studentId === studentId);

    // Apply date range filters if present
    if (startDate) {
      studentSessions = studentSessions.filter(s => s.date >= startDate);
      studentCredits = studentCredits.filter(c => c.date >= startDate);
    }
    if (endDate) {
      studentSessions = studentSessions.filter(s => s.date <= endDate);
      studentCredits = studentCredits.filter(c => c.date <= endDate);
    }
    if (subject && subject !== 'all') {
      studentSessions = studentSessions.filter(s => (s.subject || '').trim() === subject.trim());
    }

    studentSessions = studentSessions.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      const dateComp = dateB.localeCompare(dateA);
      if (dateComp !== 0) return dateComp;
      const createA = a.createdAt || '';
      const createB = b.createdAt || '';
      return createB.localeCompare(createA);
    });

    const approvedStudentSessions = studentSessions.filter(s => s.approved !== false && s.status !== 'pending' && s.status !== 'booked');
    const student = students.find(std => std.id === studentId);

    const totalSpent = approvedStudentSessions.reduce((sum, s) => {
      const teacher = teachers.find(t => t.id === s.teacherId);
      return sum + getStudentSessionCost(s, student, teacher, settings);
    }, 0);

    const totalToppedUp = studentCredits.reduce((sum, c) => sum + c.amount, 0);
    const balance = totalToppedUp - totalSpent;
    const totalHours = approvedStudentSessions.reduce((sum, s) => sum + (s.durationHours || 1), 0);

    return { totalSpent, totalToppedUp, balance, sessionCount: approvedStudentSessions.length, totalHours, studentSessions, studentCredits };
  };

  // 🧹 Smart Inactivity Calculator (Detects students with no activity or sessions for > 6 months / 180 days)
  const getStudentInactivityInfo = (student: Student) => {
    const studentSessions = sessions.filter(s => {
      if (s.studentId === student.id) return true;
      if (Array.isArray(s.studentIds) && s.studentIds.includes(student.id)) return true;
      if (Array.isArray(s.students) && s.students.some((st: any) => (typeof st === 'string' ? st === student.id : st?.id === student.id))) return true;
      return false;
    }).filter(s => s.status !== 'cancelled');

    const studentCredits = credits.filter(c => c.studentId === student.id);

    let latestTimestamp = 0;
    let latestDateStr = '';
    let latestActivityType = 'لا توجد حصص أو حركات مسجلة';

    // 1. Check sessions dates
    studentSessions.forEach(sess => {
      const dateVal = sess.date || sess.createdAt;
      if (dateVal) {
        const time = new Date(dateVal).getTime();
        if (!isNaN(time) && time > latestTimestamp) {
          latestTimestamp = time;
          latestDateStr = sess.date || dateVal;
          latestActivityType = `آخر حصة: ${sess.date || dateVal}`;
        }
      }
    });

    // 2. Check credits/payments dates
    studentCredits.forEach(cred => {
      const dateVal = cred.date || cred.createdAt;
      if (dateVal) {
        const time = new Date(dateVal).getTime();
        if (!isNaN(time) && time > latestTimestamp) {
          latestTimestamp = time;
          latestDateStr = cred.date || dateVal;
          latestActivityType = `آخر دفعة: ${cred.date || dateVal}`;
        }
      }
    });

    // 3. Fallback: Registration date or createdAt if no sessions/credits exist
    if (latestTimestamp === 0) {
      const regDate = student.registrationDate || student.createdAt;
      if (regDate) {
        const time = new Date(regDate).getTime();
        if (!isNaN(time)) {
          latestTimestamp = time;
          latestDateStr = regDate;
          latestActivityType = `تاريخ التسجيل: ${regDate} (لم يسجل حصص)`;
        }
      }
    }

    const now = Date.now();
    if (latestTimestamp === 0) {
      return {
        isInactiveOver6Months: false,
        daysInactive: 0,
        monthsInactive: 0,
        latestActivityText: 'غير محدد',
        sessionCount: studentSessions.length,
        latestDateStr: '',
        latestTimestamp: 0
      };
    }

    const diffMs = now - latestTimestamp;
    const daysInactive = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    const monthsInactive = parseFloat((daysInactive / 30.4375).toFixed(1));
    const isInactiveOver6Months = daysInactive >= 180; // 6 months threshold (180 days)

    return {
      isInactiveOver6Months,
      daysInactive,
      monthsInactive,
      latestActivityText: latestActivityType,
      sessionCount: studentSessions.length,
      latestDateStr,
      latestTimestamp
    };
  };

  // List of active students eligible for auto-archiving (> 6 months inactivity)
  const inactiveStudentsList = useMemo(() => {
    return students
      .filter(s => s.archived !== true && s.status !== StudentStatus.Pending)
      .map(s => ({
        student: s,
        inactivity: getStudentInactivityInfo(s),
        stats: getStudentStats(s.id)
      }))
      .filter(item => item.inactivity.isInactiveOver6Months)
      .sort((a, b) => b.inactivity.daysInactive - a.inactivity.daysInactive);
  }, [students, sessions, credits]);

  // Execute batch auto-archive
  const executeAutoArchive = async (targetIds: string[]) => {
    if (!targetIds || targetIds.length === 0) return;
    setIsAutoArchivingLoading(true);
    setAutoArchiveSuccessMsg('');

    try {
      const promises = targetIds.map(id => {
        const studentRef = doc(db, 'students', id);
        return updateDoc(studentRef, {
          archived: true,
          archivedAt: new Date().toISOString(),
          autoArchivedReason: 'تجاوز 6 أشهر بدون أي نشاط أو حصص'
        });
      });

      await Promise.all(promises);

      const archivedNames = targetIds
        .map(id => students.find(s => s.id === id)?.name)
        .filter(Boolean)
        .slice(0, 5)
        .join('، ') + (targetIds.length > 5 ? ` وآخرين (+${targetIds.length - 5})` : '');

      await logActivity({
        actionType: 'AUTO_ARCHIVE_STUDENTS',
        actionName: 'أرشفة تلقائية للطلاب الخاملين',
        details: `تمت أرشفة (${targetIds.length}) طلاب خاملين لم يسجلوا أي نشاط لأكثر من 6 أشهر بنجاح: [${archivedNames}]`,
        amount: 0
      });

      setAutoArchiveSuccessMsg(`تمت أرشفة ${targetIds.length} طالب خامل بنجاح ونقلهم إلى سجل الأرشيف لتنظيف القائمة النشطة.`);
      setSelectedInactiveIds([]);
      fetchData();

      setTimeout(() => {
        setIsAutoArchiveModalOpen(false);
        setAutoArchiveSuccessMsg('');
      }, 2000);
    } catch (error) {
      console.error('Error in batch auto-archiving:', error);
      alert('حدث خطأ أثناء تنفيذ الأرشفة التلقائية، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsAutoArchivingLoading(false);
    }
  };

  const exportStudentToExcel = (studentId: string, startDate?: string, endDate?: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    // Get calculated stats for chosen period
    const stats = getStudentStats(studentId, startDate, endDate);

    // Gather and map sessions for periods
    const sessionTx = stats.studentSessions
      .filter(s => s.approved !== false && s.status !== 'pending' && s.status !== 'booked')
      .map(s => {
        const teacher = teachers.find(t => t.id === s.teacherId);
        const cost = getStudentSessionCost(s, student, teacher, settings);
        return {
          date: s.date || '',
          createdAt: s.createdAt || '',
          type: 'خصم حصة تعليمية',
          details: `حصة مادة: ${s.subject} - الأستاذ: ${teacher?.name || 'غير معروف'}`,
          durationHours: s.durationHours,
          durationMins: s.durationHours * 60,
          deducted: cost,
          added: 0
        };
      });

    // Gather and map credits for periods (excluding hidden adjustments from statement rows)
    const isHiddenAdjustment = (c: StudentCredit) => {
      if (c.hideInStatement === true) return true;
      if (c.isAdjustment === true) return true;
      const note = (c.note || '').toLowerCase();
      if (note.includes('تسوية وتعديل رصيد يدوي') || note.includes('تعديل الرصيد الإجمالي')) return true;
      return false;
    };

    const visibleCredits = stats.studentCredits.filter(c => !isHiddenAdjustment(c));
    const hiddenCreditsSum = stats.studentCredits.filter(c => isHiddenAdjustment(c)).reduce((sum, c) => sum + c.amount, 0);

    const creditTx = visibleCredits.map(c => {
      return {
        date: c.date || '',
        createdAt: c.createdAt || '',
        type: 'شحن رصيد / دفعة مالية',
        details: sanitizeFinancialNote(c.note),
        durationHours: 0,
        durationMins: 0,
        deducted: 0,
        added: c.amount
      };
    });

    // Sort chronologically ascending for standard financial ledger
    const allTx = [...sessionTx, ...creditTx].sort((a, b) => {
      const dateComp = (a.date || '').localeCompare(b.date || '');
      if (dateComp !== 0) return dateComp;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    // Calculate opening balance before startDate
    let openingBalance = 0;
    if (startDate) {
      const totalCreditsBefore = credits
        .filter(c => c.studentId === studentId && c.date < startDate)
        .reduce((sum, c) => sum + c.amount, 0);

      const totalSessionsBefore = sessions
        .filter(s => s.studentId === studentId && s.approved !== false && s.status !== 'pending' && s.status !== 'booked' && s.date < startDate)
        .reduce((sum, s) => {
          if (isTrialSession(s)) return sum;
          const teacher = teachers.find(t => t.id === s.teacherId);
          return sum + getStudentSessionCost(s, student, teacher, settings);
        }, 0);

      openingBalance = totalCreditsBefore - totalSessionsBefore;
    }

    const dataRows = [];
    let currentBalance = openingBalance + hiddenCreditsSum;

    if (startDate || hiddenCreditsSum !== 0) {
      const displayOpening = openingBalance + hiddenCreditsSum;
      dataRows.push([
        startDate ? formatCustomDate(startDate) : '-',
        'رصيد مرحل (سابق)',
        startDate ? `رصيد المحفظة قبل تاريخ ${formatCustomDate(startDate)}` : 'رصيد سابق معتمد من العمليات السابقة',
        '',
        '',
        displayOpening >= 0 ? `₪${displayOpening.toFixed(1)}` : '',
        displayOpening < 0 ? `₪${Math.abs(displayOpening).toFixed(1)}` : '',
        `₪${currentBalance.toFixed(1)}`
      ]);
    }

    allTx.forEach(tx => {
      currentBalance = currentBalance + tx.added - tx.deducted;
      dataRows.push([
        formatCustomDate(tx.date),
        tx.type,
        tx.details,
        tx.durationHours > 0 ? `${tx.durationHours.toFixed(1)} س` : '',
        tx.durationMins > 0 ? `${tx.durationMins} د` : '',
        tx.added > 0 ? `₪${tx.added.toFixed(1)}` : '',
        tx.deducted > 0 ? `₪${tx.deducted.toFixed(1)}` : '',
        `₪${currentBalance.toFixed(1)}`
      ]);
    });

    const sheetData = [
      [`كشف حساب مالي تفصيلي للطالب: ${student.name}`],
      [`رقم الهاتف: ${student.phone || 'غير مدخل'} | المستوى الدراسي: ${student.grade || 'غير محدد'}`],
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
        "البيان / التفاصيل والملحوظات",
        "المدة (ساعة)",
        "المدة (دقيقة)",
        "المبلغ المشحون (+)",
        "المبلغ المخصوم (-)",
        "الرصيد المتبقي"
      ],
      ...dataRows,
      [],
      [
        "إجمالي المبالغ المشحونة (الفترة):",
        `₪${allTx.reduce((sum, tx) => sum + tx.added, 0).toFixed(1)}`,
        "إجمالي الخصومات (الفترة):",
        `₪${allTx.reduce((sum, tx) => sum + tx.deducted, 0).toFixed(1)}`,
        "",
        "",
        "الرصيد الحالي بالمحفظة:",
        `₪${currentBalance.toFixed(1)}`
      ]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

    worksheet['!cols'] = [
      { wch: 15 }, // Date
      { wch: 20 }, // Type
      { wch: 45 }, // Details
      { wch: 12 }, // Hours
      { wch: 12 }, // Mins
      { wch: 18 }, // Topup
      { wch: 18 }, // Deducted
      { wch: 18 }  // Balance
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "كشف حساب الطالب");
    XLSX.writeFile(workbook, `كشف_حساب_الطالب_${student.name.replace(/\s+/g, '_')}.xlsx`);
  };

  const exportFilteredStudentsToExcel = () => {
    // Generate data for XLSX
    const data = filteredStudents.map((s, index) => {
      const stats = getStudentStats(s.id);
      
      // Get the names of teachers assigned to this student
      let teacherNames = '';
      const uniqueTeacherIds = new Set<string>();
      if (s.teachers && s.teachers.length > 0) {
        s.teachers.forEach(tid => uniqueTeacherIds.add(tid));
      }
      if (assignments && assignments.length > 0) {
        assignments.filter(a => a.studentId === s.id).forEach(a => uniqueTeacherIds.add(a.teacherId));
      }

      if (uniqueTeacherIds.size > 0) {
        teacherNames = Array.from(uniqueTeacherIds).map(tid => {
          const t = teachers.find(teach => teach.id === tid);
          return t ? t.name : '';
        }).filter(Boolean).join(', ');
      }

      return {
        'الرقم م/أ': index + 1,
        'اسم الطالب': s.name,
        'الصف / المستوى الدراسي': s.grade || s.academicLevel || 'غير محدد',
        'رقم الهاتف': s.phone || s.phoneNumber || 'لا يوجد',
        'البريد الإلكتروني': s.email || 'لا يوجد',
        'الأساتذة المنسقين': teacherNames || 'غير منسّب',
        'الرصيد الحالي (₪)': stats.balance,
        'إجمالي الشحن / الدفعات (₪)': stats.totalToppedUp,
        'إجمالي المستهلك / المنصرف (₪)': stats.totalSpent,
        'ساعات الحصص المنجزة كلياً': stats.totalHours,
        'عدد الحصص الكلية': stats.sessionCount,
        'الحالة': (teacherNames || s.status === 'assigned' || s.status === StudentStatus.Assigned) ? 'منسّب' : 'غير منسّب',
        'ملاحظات': s.notes || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data, { header: [
      'الرقم م/أ', 'اسم الطالب', 'الصف / المستوى الدراسي', 'رقم الهاتف', 'البريد الإلكتروني',
      'الأساتذة المنسقين', 'الرصيد الحالي (₪)', 'إجمالي الشحن / الدفعات (₪)', 'إجمالي المستهلك / المنصرف (₪)',
      'ساعات الحصص المنجزة كلياً', 'عدد الحصص الكلية', 'الحالة', 'ملاحظات'
    ] });
    
    // Set column widths for beautiful layout
    worksheet['!cols'] = [
      { wch: 10 }, // No
      { wch: 25 }, // Name
      { wch: 18 }, // Grade
      { wch: 15 }, // Phone
      { wch: 22 }, // Email
      { wch: 25 }, // Teachers
      { wch: 15 }, // Balance
      { wch: 22 }, // Total Topped-up
      { wch: 22 }, // Total Spent
      { wch: 18 }, // Session count
      { wch: 12 }, // Status
      { wch: 30 }  // Notes
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "بيانات الطلاب المفلترة");
    
    // Write file
    XLSX.writeFile(workbook, `سجل_الطلاب_المطابقين_للبحث_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportAllStudentsBalancesToExcel = () => {
    if (students.length === 0) {
      alert("لا يوجد طلاب مسجلون لتصدير تقرير الأرصدة.");
      return;
    }

    const data = students.map((s, index) => {
      const stats = getStudentStats(s.id);
      
      // Determine balance status in Arabic
      let balanceStatus = 'متزن';
      if (stats.balance > 0) {
        balanceStatus = `دائن (يوجد رصيد: +₪${stats.balance})`;
      } else if (stats.balance < 0) {
        balanceStatus = `مدين (مستحق/دين: -₪${Math.abs(stats.balance)})`;
      }

      return {
        'الرقم التسلسلي': index + 1,
        'اسم الطالب': s.name,
        'الصف / المستوى الدراسي': s.grade || s.academicLevel || 'غير محدد',
        'رقم الهاتف': s.phone || s.phoneNumber || 'لا يوجد',
        'الرصيد الدفتري الحالي (₪)': stats.balance,
        'حالة الرصيد': balanceStatus,
        'إجمالي شحن الرصيد (₪)': stats.totalToppedUp,
        'إجمالي المستهلك / المنصرف (₪)': stats.totalSpent,
        'ساعات الحصص المنجزة': stats.totalHours,
        'عدد اللقاءات والحصص': stats.sessionCount,
        'حالة الحساب': s.archived === true ? 'مؤرشف 📁' : 'نشط 🟢',
        'ملاحظات': s.notes || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data, { header: [
      'الرقم التسلسلي', 'اسم الطالب', 'الصف / المستوى الدراسي', 'رقم الهاتف',
      'الرصيد الدفتري الحالي (₪)', 'حالة الرصيد', 'إجمالي شحن الرصيد (₪)',
      'إجمالي المستهلك / المنصرف (₪)', 'ساعات الحصص المنجزة', 'عدد اللقاءات والحصص',
      'حالة الحساب', 'ملاحظات'
    ] });

    worksheet['!cols'] = [
      { wch: 15 }, // ID
      { wch: 25 }, // Name
      { wch: 20 }, // Level
      { wch: 15 }, // Phone
      { wch: 22 }, // Current Balance
      { wch: 30 }, // Balance status text
      { wch: 20 }, // Total top-ups
      { wch: 22 }, // Total spent
      { wch: 18 }, // Total hours
      { wch: 18 }, // Session count
      { wch: 12 }, // Account status
      { wch: 35 }  // Notes
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "تقرير أرصدة وديون الطلاب");

    XLSX.writeFile(workbook, `تقرير_أرصدة_وديون_الطلاب_الموحد_${new Date().toISOString().split('T')[0]}.xlsx`);

    logActivity({
      actionType: 'EXPORT_STUDENTS_BALANCES_EXCEL',
      actionName: 'تصدير أرصدة وديون الطلاب Excel',
      details: `تم تصدير أرصدة ومستحقات جميع الطلاب (${students.length} طالب) إلى ملف Excel الموحد`
    }).catch(err => console.error(err));
  };

  const exportAllStudentsToCSV = () => {
    if (students.length === 0) {
      alert("لا يوجد طلاب مسجلون لتصدير بياناتهم.");
      return;
    }

    const headers = [
      'الرقم م/أ',
      'اسم الطالب',
      'المستوى / الصف الدراسي',
      'رقم الهاتف',
      'البريد الإلكتروني',
      'الرصيد الحالي (₪)',
      'إجمالي الدفعات / الشحن (₪)',
      'إجمالي المستهلك (₪)',
      'ساعات الحصص المنجزة كلياً',
      'عدد الحصص',
      'حالة الحساب',
      'الملاحظات'
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      str = str.replace(/"/g, '""');
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str}"`;
      }
      return str;
    };

    const rows = students.map((s, index) => {
      const stats = getStudentStats(s.id);
      return [
        index + 1,
        s.name,
        s.grade || s.academicLevel || 'غير محدد',
        s.phone || s.phoneNumber || 'لا يوجد',
        s.email || 'لا يوجد',
        stats.balance,
        stats.totalToppedUp,
        stats.totalSpent,
        stats.totalHours,
        stats.sessionCount,
        s.archived === true ? 'مؤرشف' : 'نشط',
        s.notes || ''
      ].map(escapeCSV);
    });

    const csvContent = [
      headers.map(escapeCSV).join(','),
      ...rows.map(r => r.join(','))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `نسخة_احتياطية_بيانات_الطلاب_الكاملة_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    logActivity({
      actionType: 'EXPORT_STUDENTS_CSV_BACKUP',
      actionName: 'تصدير نسخة احتياطية للطلاب CSV',
      details: `تم تصدير نسخة احتياطية كاملة لبيانات الطلاب (${students.length} طالب) بصيغة CSV`
    }).catch(err => console.error(err));
  };

  const exportStudentToPDF = (studentId: string, startDate?: string, endDate?: string) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    // Use high-craft Arabic financial statement generator
    const htmlContent = generateStudentFinancialStatementHtml({
      student,
      teachers,
      sessions,
      credits,
      startDate,
      endDate,
      managerName: globalSettings?.managerName || 'أ. د. زكي أبو علان',
      academyName: globalSettings?.academyName || 'أكاديمية التفوق أون لاين للتمكين الأكاديمي والتعليمي',
      centerPhone: globalSettings?.academyPhone || '059-8321040',
      centerEmail: globalSettings?.academyEmail || 'zakiabuillan@gmail.com',
      centerAddress: globalSettings?.academyAddress || 'المنصة التعليمية الرقمية المعتمدة - فلسطين',
      centerLicense: globalSettings?.academyLicense || 'ترخيص واعتماد رقم: EDU-2026-98442',
      includeDetailedSessions: true
    });

    setPrintPreviewHtml(htmlContent);
    setPrintPreviewTitle(`كشف حساب الطالب - ${student.name}`);
    setShowPrintPreview(true);
  };

  const exportStudentListToPDF = () => {
    if (filteredStudents.length === 0) {
      alert("لا يوجد طلاب حاليون في القائمة لتصدير بياناتهم.");
      return;
    }

    const formattedPrintDate = formatCustomDate(new Date().toISOString().split('T')[0]);
    
    let rowsHtml = '';
    let studentsWithPhoneCount = 0;
    
    filteredStudents.forEach((student, index) => {
      const stats = getStudentStats(student.id);
      const balanceColorClass = stats.balance < 0 ? 'debit-color' : 'credit-color';
      const assignedTeacherNames = (student.teachers || [])
        .map(tId => teachers.find(t => t.id === tId)?.name)
        .filter(Boolean)
        .join('، ');

      const phone = student.phone || student.phoneNumber || '-';
      if (phone !== '-') studentsWithPhoneCount++;
      const email = student.email || '-';
      const grade = student.grade || student.academicLevel || 'غير محدد';
      const statusText = student.academicStatus === 'Active' ? 'نشط' : student.academicStatus === 'Paused' ? 'موقوف مؤقتاً' : student.academicStatus === 'Graduated' ? 'متخرج' : 'مسجل';
      const statusClass = student.academicStatus === 'Paused' ? 'status-paused' : student.academicStatus === 'Graduated' ? 'status-graduated' : 'status-active';

      rowsHtml += `
        <tr>
          <td style="text-align: center; border-left: 1px solid #edf2f7; border-bottom: 1px solid #f1f5f9; padding: 10px 8px; font-weight: bold; color: #64748b;">${index + 1}</td>
          <td style="font-weight: 800; color: #0f172a; border-left: 1px solid #edf2f7; border-bottom: 1px solid #f1f5f9; padding: 10px 8px;">
            <div style="font-size: 11px; font-weight: 900; color: #1e293b;">${student.name}</div>
            ${student.notes ? `<div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">📝 ${student.notes}</div>` : ''}
          </td>
          <td style="text-align: center; border-left: 1px solid #edf2f7; border-bottom: 1px solid #f1f5f9; padding: 10px 8px; font-weight: 700; color: #334155;">
            <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 6px; font-size: 9.5px;">${grade}</span>
          </td>
          <td style="text-align: center; border-left: 1px solid #edf2f7; border-bottom: 1px solid #f1f5f9; padding: 10px 8px;">
            <div style="font-family: monospace; font-weight: 800; font-size: 10.5px; color: #0f172a; direction: ltr;">${phone}</div>
            ${email !== '-' ? `<div style="font-size: 8.5px; color: #64748b; direction: ltr; margin-top: 2px;">${email}</div>` : ''}
          </td>
          <td style="border-left: 1px solid #edf2f7; border-bottom: 1px solid #f1f5f9; padding: 10px 8px; font-size: 9.5px; color: #334155; font-weight: 700;">
            ${assignedTeacherNames ? `👨‍🏫 ${assignedTeacherNames}` : '<span style="color: #94a3b8;">غير منسّب لمعلم</span>'}
          </td>
          <td style="text-align: center; border-left: 1px solid #edf2f7; border-bottom: 1px solid #f1f5f9; padding: 10px 8px;">
            <span class="${statusClass}" style="padding: 2px 6px; border-radius: 6px; font-size: 9px; font-weight: 800;">${statusText}</span>
          </td>
          <td style="text-align: center; font-weight: 900; border-left: 1px solid #edf2f7; border-bottom: 1px solid #f1f5f9; padding: 10px 8px; font-size: 10px;" class="${balanceColorClass}">
            ₪${stats.balance}
          </td>
          <td style="text-align: center; border-bottom: 1px solid #f1f5f9; padding: 10px 8px; font-size: 9.5px; color: #475569; font-weight: 700;">
            ${stats.sessionCount} حصة (${stats.totalHours} س)
          </td>
        </tr>
      `;
    });

    const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>كشف بيانات الطلاب وتفاصيل الاتصال</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${GOOGLE_ARABIC_FONTS_COMBINED_URL}" rel="stylesheet">
  <style>
    @import url('${GOOGLE_ARABIC_FONTS_COMBINED_URL}');

    * {
      box-sizing: border-box;
      font-family: 'Cairo', 'Tajawal', 'Almarai', 'Segoe UI Arabic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      text-rendering: optimizeLegibility !important;
    }
    body {
      background: #f8fafc;
      margin: 0;
      padding: 40px 20px;
      direction: rtl;
    }
    .no-print-bar {
      max-width: 1050px;
      margin: 0 auto 20px auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);
    }
    .btn {
      padding: 10px 18px;
      font-size: 11px;
      font-weight: 800;
      border-radius: 10px;
      cursor: pointer;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #334155;
      transition: all 0.2s;
    }
    .btn:hover {
      background: #f1f5f9;
    }
    .btn-gold {
      background: #1A365D;
      color: #ffffff;
      border-color: #1A365D;
    }
    .btn-gold:hover {
      background: #0f213a;
    }
    .statement-card {
      max-width: 1050px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #edf2f7;
      border-radius: 24px;
      padding: 35px;
      box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.05);
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    .header-logo-text {
      font-size: 19px;
      font-weight: 950;
      color: #1a365d;
      line-height: 1.2;
    }
    .header-sub {
      font-size: 11px;
      color: #D4A33C;
      font-weight: 800;
      margin-top: 4px;
    }
    .header-sub-desc {
      font-size: 9.5px;
      color: #64748b;
      font-weight: bold;
    }
    .statement-title {
      font-size: 17px;
      font-weight: 900;
      color: #1A365D;
      text-align: center;
      margin: 10px 0 5px 0;
      letter-spacing: -0.5px;
    }
    .stats-summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin: 20px 0 25px 0;
    }
    .stats-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px 14px;
      text-align: center;
    }
    .stats-val {
      font-size: 14px;
      font-weight: 900;
      color: #1e293b;
    }
    .stats-lbl {
      font-size: 9px;
      font-weight: 800;
      color: #64748b;
      margin-top: 2px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
      font-size: 10px;
    }
    .data-table th {
      background: #f8fafc;
      color: #475569;
      font-weight: 900;
      text-align: right;
      padding: 10px 8px;
      border-bottom: 2px solid #e2e8f0;
      border-left: 1px solid #edf2f7;
    }
    .credit-color {
      color: #166534;
    }
    .debit-color {
      color: #991b1b;
    }
    .status-active {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .status-paused {
      background: #fef2f2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }
    .status-graduated {
      background: #f0fdf4;
      color: #166534;
      border: 1px solid #bbf7d0;
    }
    .signatures-row {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      border-top: 1px dashed #e2e8f0;
      padding-top: 20px;
    }
    .signature-box {
      width: 220px;
      text-align: center;
    }
    .signature-label {
      font-size: 10.5px;
      font-weight: 800;
      color: #1e293b;
    }
    .signature-sub {
      font-size: 8.5px;
      color: #64748b;
      margin-top: 3px;
    }
    .signature-line {
      margin-top: 40px;
      border-top: 1px dotted #94a3b8;
    }
    .footer-stamp {
      text-align: center;
      margin-top: 30px;
      font-size: 9.5px;
      font-weight: bold;
      color: #94a3b8;
    }
    @media print {
      .no-print-bar {
        display: none !important;
      }
      body {
        padding: 0 !important;
        background: #fff !important;
      }
      .statement-card {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: 100% !important;
      }
    }
  </style>
</head>
<body>

  <div class="no-print-bar">
    <div style="font-weight: 800; font-size: 12px; color: #1e293b;">
      📄 كشف بيانات الطلاب وتفاصيل الاتصال جاهز للتحميل كملف PDF أو الطباعة المباشرة
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn btn-gold" onclick="window.print()">🖨️ حفظ كـ PDF أو طباعة القائمة</button>
      <button class="btn" onclick="window.close()">إغلاق الصفحة</button>
    </div>
  </div>

  <div class="statement-card">
    <table class="header-table">
      <tr>
        <td style="text-align: right; vertical-align: top;">
          <div class="header-logo-text">أكاديمية التفوق للتمكين الدراسي</div>
          <div class="header-sub">سجل الطلاب وبيانات التواصل والمتابعة الأكاديمية</div>
          <div class="header-sub-desc">إدارة شؤون الطلاب والاتصال والإرشاد التعليمي</div>
        </td>
        <td style="text-align: left; vertical-align: top; font-size: 9.5px; color: #64748b; font-weight: 800; line-height: 1.5;">
          تاريخ الاستخراج: ${formattedPrintDate}<br>
          كشف رسمي بأسماء وبيانات الطلاب وتفاصيل الاتصال
        </td>
      </tr>
    </table>

    <div class="statement-title">قائمة بيانات الطلاب وتفاصيل الاتصال الرسمية</div>

    <div class="stats-summary-grid">
      <div class="stats-box">
        <div class="stats-val">${filteredStudents.length}</div>
        <div class="stats-lbl">إجمالي الطلاب المدرجين</div>
      </div>
      <div class="stats-box">
        <div class="stats-val">${studentsWithPhoneCount}</div>
        <div class="stats-lbl">بيانات اتصال متوفرة ومسجلة</div>
      </div>
      <div class="stats-box">
        <div class="stats-val">${filteredStudents.filter(s => (s.teachers && s.teachers.length > 0)).length}</div>
        <div class="stats-lbl">طلاب منسّبون لمعلمين</div>
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 4%; text-align: center;">م</th>
          <th style="width: 22%;">اسم الطالب والملاحظات</th>
          <th style="width: 14%; text-align: center;">المستوى / الصف</th>
          <th style="width: 18%; text-align: center;">هاتف وتفاصيل الاتصال</th>
          <th style="width: 18%;">الأساتذة المنسقين</th>
          <th style="width: 8%; text-align: center;">الحالة</th>
          <th style="width: 8%; text-align: center;">الرصيد</th>
          <th style="width: 8%; text-align: center;">الحصص</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
      </tbody>
    </table>

    <div class="signatures-row">
      <div class="signature-box">
        <div class="signature-label">الدائرة الإدارية ومسؤولي شؤون الطلاب</div>
        <div class="signature-sub">إعداد وتدقيق البيانات الإدارية وسجلات الاتصال</div>
        <div class="signature-line"></div>
      </div>
      <div class="signature-box">
        <div class="signature-label">قسم التوجيه والمتابعة الأكاديمية</div>
        <div class="signature-sub">متابعة شؤون وأولياء أمور الطلبة</div>
        <div class="signature-line"></div>
      </div>
      <div class="signature-box">
        <div class="signature-label">مدير المنصة أ.زكي أبو علان</div>
        <div class="signature-sub">مصادقة وإقرار القائمة والبيانات الرسمية</div>
        <div class="signature-line"></div>
      </div>
    </div>

    <div class="footer-stamp">
      حقوق المتابعة وإعداد السجلات محفوظة بالكامل © لأكاديمية التفوق لعام 2026
    </div>
  </div>

</body>
</html>
    `;

    setPrintPreviewHtml(htmlContent);
    setPrintPreviewTitle(`كشف بيانات الطلاب وتفاصيل الاتصال`);
    setShowPrintPreview(true);

    logActivity({
      actionType: 'EXPORT_STUDENT_LIST_PDF',
      actionName: 'تصدير قائمة بيانات الطلاب كـ PDF',
      details: `تم تصدير كشف بيانات وأرقام تواصل الطلاب لعدد (${filteredStudents.length} طالب) إلى مستند PDF معتمد`
    }).catch(err => console.error(err));
  };

  const getStudentAllowedDebtLimit = useCallback((student: Student): number => {
    if (typeof student.maxDebtLimit === 'number') return Math.max(0, student.maxDebtLimit);
    if (typeof student.lowBalanceThreshold === 'number' && student.lowBalanceThreshold < 0) {
      return Math.abs(student.lowBalanceThreshold);
    }
    return Math.max(0, allowedDebtLimitThreshold);
  }, [allowedDebtLimitThreshold]);

  const overDebtLimitStudents = useMemo(() => {
    return students.filter(s => {
      const isArchived = s.archived === true;
      const isPending = s.status === StudentStatus.Pending;
      if (archiveTab === 'active' && (isArchived || isPending)) return false;
      if (archiveTab === 'archived' && !isArchived) return false;
      if (archiveTab === 'pending' && (isArchived || !isPending)) return false;

      const stats = getStudentStats(s.id);
      if (stats.balance >= 0) return false;
      const debtAmount = Math.abs(stats.balance);
      const allowedLimit = getStudentAllowedDebtLimit(s);
      return debtAmount > allowedLimit;
    });
  }, [students, archiveTab, sessions, credits, getStudentAllowedDebtLimit]);

  const negativeStudents = useMemo(() => {
    return students.filter(s => {
      const isArchived = s.archived === true;
      const isPending = s.status === StudentStatus.Pending;
      if (archiveTab === 'active' && (isArchived || isPending)) return false;
      if (archiveTab === 'archived' && !isArchived) return false;
      if (archiveTab === 'pending' && (isArchived || !isPending)) return false;

      const stats = getStudentStats(s.id);
      return stats.balance < 0;
    });
  }, [students, archiveTab, sessions, credits]);

  const criticalStudents = useMemo(() => {
    return students.filter(s => {
      const isArchived = s.archived === true;
      const isPending = s.status === StudentStatus.Pending;
      if (archiveTab === 'active' && (isArchived || isPending)) return false;
      if (archiveTab === 'archived' && !isArchived) return false;
      if (archiveTab === 'pending' && (isArchived || !isPending)) return false;

      const stats = getStudentStats(s.id);
      const limit = typeof s.lowBalanceThreshold === 'number' ? s.lowBalanceThreshold : lowBalanceThreshold;
      return !s.isOpenBalance && stats.balance < limit;
    });
  }, [students, archiveTab, sessions, credits, lowBalanceThreshold]);

  const allDebtorsStudents = useMemo(() => {
    return students.filter(s => {
      const isArchived = s.archived === true;
      const isPending = s.status === StudentStatus.Pending;
      if (archiveTab === 'active' && (isArchived || isPending)) return false;
      if (archiveTab === 'archived' && !isArchived) return false;
      if (archiveTab === 'pending' && (isArchived || !isPending)) return false;

      const stats = getStudentStats(s.id);
      const limit = typeof s.lowBalanceThreshold === 'number' ? s.lowBalanceThreshold : lowBalanceThreshold;
      return stats.balance < 0 || stats.balance < limit;
    });
  }, [students, archiveTab, sessions, credits, lowBalanceThreshold]);

  const bulkTargetStudents = useMemo(() => {
    if (bulkWhatsAppTargetMode === 'over_debt_limit') return overDebtLimitStudents;
    if (bulkWhatsAppTargetMode === 'negative') return negativeStudents;
    if (bulkWhatsAppTargetMode === 'critical') return criticalStudents;
    return allDebtorsStudents;
  }, [bulkWhatsAppTargetMode, overDebtLimitStudents, negativeStudents, criticalStudents, allDebtorsStudents]);

  const getFormattedWhatsAppMessage = useCallback((student: Student, templateText: string = whatsappTemplate) => {
    const stats = getStudentStats(student.id);
    const threshold = typeof student.lowBalanceThreshold === 'number' ? student.lowBalanceThreshold : lowBalanceThreshold;
    const debtAmount = stats.balance < 0 ? Math.abs(stats.balance) : 0;
    const allowedLimit = getStudentAllowedDebtLimit(student);
    const exceededAmount = Math.max(0, debtAmount - allowedLimit);
    const cleanPhone = (student.phone || student.phoneNumber || '').replace(/[\s\-\+]/g, '');

    return templateText
      .replace(/{(?:studentName|student_name|name|NAME|اسم_الطالب)}/gi, student.name || 'عزيزنا الطالب')
      .replace(/{(?:balance|BALANCE|الرصيد)}/gi, String(stats.balance))
      .replace(/{(?:debtAmount|debt_amount|DEBT_AMOUNT|مبلغ_الذمة|المبلغ_المستحق|مبلغ_الدين)}/gi, String(debtAmount))
      .replace(/{(?:allowedDebtLimit|allowed_debt_limit|ALLOWED_DEBT_LIMIT|حد_الدين_المسموح|سقف_الدين)}/gi, String(allowedLimit))
      .replace(/{(?:exceededAmount|exceeded_amount|EXCEEDED_AMOUNT|المبلغ_المتجاوز|مقدار_التجاوز)}/gi, String(exceededAmount))
      .replace(/{(?:threshold|THRESHOLD|حد_الأمان|حد_الائتمان)}/gi, String(threshold))
      .replace(/{(?:hours|HOURS|ساعات_الحصص|ساعات_التدريس)}/gi, String(stats.totalHours.toFixed(1)))
      .replace(/{(?:spent|SPENT|المصروف)}/gi, String(stats.totalSpent))
      .replace(/{(?:toppedUp|TOPPEDUP|المدفوعات)}/gi, String(stats.totalToppedUp))
      .replace(/{(?:phone|PHONE|رقم_الهاتف)}/gi, cleanPhone)
      .replace(/{(?:academyName|academy_name|ACADEMY_NAME|academy|ACADEMY|الأكاديمية|اسم_الأكاديمية)}/gi, 'أكاديمية التفوق أون لاين')
      .replace(/{(?:date|DATE|التاريخ)}/gi, new Date().toLocaleDateString('ar-EG'));
  }, [getStudentAllowedDebtLimit, getStudentStats, lowBalanceThreshold, whatsappTemplate]);

  const getStudentCustomizedMessage = useCallback((student: Student, templateText: string = whatsappTemplate): string => {
    if (customMessagesByStudent[student.id]) {
      return customMessagesByStudent[student.id];
    }
    return getFormattedWhatsAppMessage(student, templateText);
  }, [customMessagesByStudent, getFormattedWhatsAppMessage, whatsappTemplate]);

  const updateStudentCustomMessage = (studentId: string, newMessage: string) => {
    setCustomMessagesByStudent(prev => ({
      ...prev,
      [studentId]: newMessage
    }));
    setStudentMessageModified(prev => ({
      ...prev,
      [studentId]: true
    }));
  };

  const resetStudentCustomMessage = (student: Student) => {
    const defaultText = getFormattedWhatsAppMessage(student, whatsappTemplate);
    setCustomMessagesByStudent(prev => ({
      ...prev,
      [student.id]: defaultText
    }));
    setStudentMessageModified(prev => ({
      ...prev,
      [student.id]: false
    }));
  };

  const regenerateAllCustomMessages = (templateText: string = whatsappTemplate) => {
    const newMap: Record<string, string> = {};
    bulkTargetStudents.forEach(s => {
      newMap[s.id] = getFormattedWhatsAppMessage(s, templateText);
    });
    setCustomMessagesByStudent(newMap);
    setStudentMessageModified({});
  };

  const openBulkWhatsAppModal = (
    mode: 'over_debt_limit' | 'negative' | 'critical' | 'all_debtors' = 'over_debt_limit',
    customDebtLimit?: number
  ) => {
    if (typeof customDebtLimit === 'number') {
      setAllowedDebtLimitThreshold(customDebtLimit);
    }
    setBulkWhatsAppTargetMode(mode);

    let activeTemplate = WHATSAPP_TEMPLATES_PRESETS.debt_limit_exceeded.text;
    if (mode === 'negative') {
      activeTemplate = WHATSAPP_TEMPLATES_PRESETS.negative_settlement.text;
    } else if (mode === 'critical') {
      activeTemplate = WHATSAPP_TEMPLATES_PRESETS.friendly_recharge.text;
    } else if (mode === 'all_debtors') {
      activeTemplate = WHATSAPP_TEMPLATES_PRESETS.detailed_statement.text;
    }
    setWhatsappTemplate(activeTemplate);

    let targetList = overDebtLimitStudents;
    if (mode === 'negative') targetList = negativeStudents;
    if (mode === 'critical') targetList = criticalStudents;
    if (mode === 'all_debtors') targetList = allDebtorsStudents;

    setSelectedBulkStudentIds(targetList.map(s => s.id));
    
    // Auto-generate customized messages per student with all their unique tags
    const initialCustom: Record<string, string> = {};
    targetList.forEach(s => {
      initialCustom[s.id] = getFormattedWhatsAppMessage(s, activeTemplate);
    });
    setCustomMessagesByStudent(initialCustom);
    setStudentMessageModified({});
    setExpandedCustomEditorId(null);
    setShowAllCustomEditors(false);
    setBulkSentStatus({});
    setBulkSendingProgress({ current: 0, total: 0, isSending: false });
    setIsBulkWhatsAppOpen(true);
  };

  const handleSendSingleWhatsApp = (student: Student) => {
    const rawPhone = getBestParentOrStudentPhone(student);
    
    if (!rawPhone) {
      openSingleAlertModal(student);
      return;
    }
    
    const messageText = getStudentCustomizedMessage(student);
    openWhatsAppChat(rawPhone, messageText);
    
    setBulkSentStatus(prev => ({
      ...prev,
      [student.id]: { status: 'sent' }
    }));
    
    logActivity({
      actionType: 'SEND_SINGLE_WHATSAPP_REMINDER',
      actionName: 'إرسال تذكير سداد واتساب فردي مخصص',
      details: `تم إرسال تذكير سداد مخصص لولي أمر الطالب (${student.name}) برصيد مالي (${getStudentStats(student.id).balance} ₪)`,
      studentId: student.id,
      studentName: student.name,
      amount: getStudentStats(student.id).balance
    }).catch(err => console.error(err));
  };

  const handleCopySingleWhatsAppMessage = (student: Student) => {
    const msg = getStudentCustomizedMessage(student);
    navigator.clipboard.writeText(msg).then(() => {
      alert(`تم نسخ نص رسالة التذكير المخصصة للطالب/ة (${student.name}) إلى الحافظة بنجاح! 📋`);
    }).catch(() => {
      alert('تعذر النسخ التلقائي.');
    });
  };

  const handleCopyAllWhatsAppMessages = () => {
    const targetStudents = bulkTargetStudents.filter(s => selectedBulkStudentIds.includes(s.id));
    if (targetStudents.length === 0) {
      alert('يرجى تحديد طالب واحد على الأقل.');
      return;
    }

    let textContent = `📋 كشف وقائمة رسائل تذكيرات السداد والذمم المخصصة عبر الواتساب (${targetStudents.length} طلاب)\n\n`;
    targetStudents.forEach((student, idx) => {
      const stats = getStudentStats(student.id);
      const phoneDisplay = getBestParentOrStudentPhone(student) || 'بدون رقم هاتف';
      const msg = getStudentCustomizedMessage(student);
      textContent += `[${idx + 1}] الطالب/ة: ${student.name} | هاتف: ${phoneDisplay} | الرصيد: ${stats.balance} ₪ (مستحق: ${Math.abs(stats.balance)} ₪)\nرسالة الواتساب المخصصة:\n${msg}\n----------------------------------------\n\n`;
    });

    navigator.clipboard.writeText(textContent).then(() => {
      setCopiedAllNotification(true);
      setTimeout(() => setCopiedAllNotification(false), 3000);
    }).catch(() => {
      alert('تم تجهيز البيانات، تعذر النسخ المباشر للحافظة.');
    });
  };

  const handleQuickWhatsAppBalance = (student: Student, e: React.MouseEvent) => {
    e.stopPropagation();
    const stats = getStudentStats(student.id);
    const rawPhone = getBestParentOrStudentPhone(student);
    
    if (!rawPhone) {
      // If phone is missing, open modal so manager can enter parent's phone
      openSingleAlertModal(student);
      return;
    }
    
    const rate = getStudentSessionRate(student);
    const hoursRemaining = rate > 0 && stats.balance > 0 ? stats.balance / rate : undefined;
    const messageText = generateParentBalanceMessage({
      studentName: student.name,
      balance: stats.balance,
      hourlyRate: rate,
      remainingHours: hoursRemaining,
      totalSpent: stats.totalSpent,
      totalToppedUp: stats.totalToppedUp
    });
    
    openWhatsAppChat(rawPhone, messageText);
    
    logActivity({
      actionType: 'SEND_QUICK_WHATSAPP_REMINDER',
      actionName: 'إرسال إشعار رصيد عبر واتساب',
      details: `تم فتح محادثة لإرسال رصيد الطالب (${student.name}) لولي الأمر بقيمة ${stats.balance} ₪`,
      studentId: student.id,
      studentName: student.name,
      amount: stats.balance
    }).catch(err => console.error(err));
  };

  const handleSendBulkWhatsApp = async () => {
    const targetStudents = bulkTargetStudents.filter(s => 
      selectedBulkStudentIds.includes(s.id) && getBestParentOrStudentPhone(s).trim()
    );

    if (targetStudents.length === 0) {
      alert('لم يتم العثور على أي طالب برقم هاتف مسجل من بين الطلاب المحددين حالياً.');
      return;
    }

    const initialOverride: Record<string, { status: 'pending' | 'sending' | 'sent' }> = {};
    targetStudents.forEach(s => {
      initialOverride[s.id] = { status: 'sending' };
    });
    setBulkSentStatus(prev => ({ ...prev, ...initialOverride }));
    setBulkSendingProgress({ current: 0, total: targetStudents.length, isSending: true });

    for (let i = 0; i < targetStudents.length; i++) {
      const student = targetStudents[i];
      const rawPhone = getBestParentOrStudentPhone(student);
      const messageText = getStudentCustomizedMessage(student);
      
      setBulkSendingProgress({ current: i + 1, total: targetStudents.length, isSending: true });
      openWhatsAppChat(rawPhone, messageText);
      
      setBulkSentStatus(prev => ({
        ...prev,
        [student.id]: { status: 'sent' }
      }));

      logActivity({
        actionType: 'SEND_BULK_WHATSAPP_REMINDER',
        actionName: 'إرسال تذكير سداد جماعي مخصص واتساب',
        details: `تم إرسال تذكير سداد مخصص لولي أمر الطالب (${student.name}) برصيد ${getStudentStats(student.id).balance} ₪`,
        studentId: student.id,
        studentName: student.name,
        amount: getStudentStats(student.id).balance
      }).catch(err => console.error(err));

      if (i < targetStudents.length - 1) {
        await new Promise(r => setTimeout(r, 600));
      }
    }
    
    setBulkSendingProgress(prev => ({ ...prev, isSending: false }));

    logActivity({
      actionType: 'SEND_BULK_WHATSAPP_REMINDERS',
      actionName: 'إرسال تذكيرات سداد مجمعة واتساب للأرصدة المتجاوزة',
      details: `تم إرسال تذكيرات سداد جماعية عبر واتساب لعدد (${targetStudents.length}) طلاب مع نصوص مخصصة لكل طالب.`
    }).catch(err => console.error(err));
  };

  // ⚡ Live search in all trial lessons across the entire platform and system
  const matchingTrialLessons = useMemo(() => {
    const rawSearch = searchTerm.trim();
    if (!rawSearch) return [];

    const normSearch = normalizeArabicSearchText(rawSearch);
    const phoneSearch = normalizeSearchPhoneNumber(rawSearch);

    return (trialLessons || []).filter(trial => {
      const normStudentName = normalizeArabicSearchText(trial.studentName || '');
      const studentNameRaw = (trial.studentName || '').toLowerCase();
      const normPhone = normalizeSearchPhoneNumber(trial.phone || '');
      const normSubject = normalizeArabicSearchText(trial.subject || '');
      const normTopic = normalizeArabicSearchText(trial.topic || '');
      const normTeacher = normalizeArabicSearchText(trial.teacherName || '');
      const normGrade = normalizeArabicSearchText(trial.grade || '');
      const normStatus = normalizeArabicSearchText(trial.status === 'pending' ? 'قيد الانتظار معلقة تجريبية' : 'مكتملة تجريبية');

      return (
        normStudentName.includes(normSearch) ||
        studentNameRaw.includes(rawSearch.toLowerCase()) ||
        (phoneSearch.length > 0 && normPhone.includes(phoneSearch)) ||
        normSubject.includes(normSearch) ||
        normTopic.includes(normSearch) ||
        normTeacher.includes(normSearch) ||
        normGrade.includes(normSearch) ||
        normStatus.includes(normSearch)
      );
    });
  }, [trialLessons, searchTerm]);

  const filteredStudents = useMemo(() => {
    const list = students.filter(s => {
      // 0. Archive/Pending state match
      const isArchived = s.archived === true;
      const isPending = s.status === StudentStatus.Pending;

      if (archiveTab === 'active') {
        if (isArchived || isPending) return false;
      } else if (archiveTab === 'archived') {
        if (!isArchived) return false;
      } else if (archiveTab === 'pending') {
        if (isArchived || !isPending) return false;
      }

      // 1. Search term match with criteria support (Name, Phone, Grade, or All)
      const searchRaw = searchTerm.trim();
      const searchNorm = normalizeArabicSearchText(searchRaw);
      const searchPhone = normalizeSearchPhoneNumber(searchRaw);

      if (searchRaw) {
        const studentNameNorm = normalizeArabicSearchText(s.name || '');
        const studentNameRaw = (s.name || '').toLowerCase();
        const studentPhoneRaw = (s.phone || s.phoneNumber || '').toLowerCase();
        const studentPhoneClean = normalizeSearchPhoneNumber(studentPhoneRaw);
        const parentPhoneRaw = ((s as any).parentPhone || (s as any).guardianPhone || (s as any).parentPhoneNumber || (s as any).contact || '').toLowerCase();
        const parentPhoneClean = normalizeSearchPhoneNumber(parentPhoneRaw);
        const studentGradeNorm = normalizeArabicSearchText(s.grade || s.academicLevel || '');
        const studentGradeRaw = (s.grade || s.academicLevel || '').toLowerCase();
        const studentNotesNorm = normalizeArabicSearchText(s.notes || '');
        const isGroup = s.courseType === 'group' || studentNotesNorm.includes('دوره جماعيه') || studentNotesNorm.includes('مجموعه');
        const courseTypeSearchTerm = isGroup ? 'دوره جماعيه مجموعه' : 'حصه فرديه خصوصي';
        
        const teacherNamesNorm = (s.teachers || [])
          .map(tId => normalizeArabicSearchText(teachers.find(t => t.id === tId)?.name || ''))
          .join(' ');

        const hasPhoneQuery = searchPhone.length >= 3;
        const matchesAnyPhone = hasPhoneQuery && (studentPhoneClean.includes(searchPhone) || parentPhoneClean.includes(searchPhone));

        let matchesSearch = false;
        if (searchCriteria === 'name') {
          matchesSearch = studentNameNorm.includes(searchNorm) || studentNameRaw.includes(searchRaw.toLowerCase());
        } else if (searchCriteria === 'phone') {
          matchesSearch = (searchPhone.length > 0 && (studentPhoneClean.includes(searchPhone) || parentPhoneClean.includes(searchPhone))) || 
                          studentPhoneRaw.includes(searchRaw.toLowerCase()) || 
                          parentPhoneRaw.includes(searchRaw.toLowerCase());
        } else if (searchCriteria === 'grade') {
          matchesSearch = studentGradeNorm.includes(searchNorm) || studentGradeRaw.includes(searchRaw.toLowerCase());
        } else {
          // 'all' search
          matchesSearch = studentNameNorm.includes(searchNorm) ||
                          studentNameRaw.includes(searchRaw.toLowerCase()) ||
                          matchesAnyPhone ||
                          studentPhoneRaw.includes(searchRaw.toLowerCase()) ||
                          parentPhoneRaw.includes(searchRaw.toLowerCase()) ||
                          studentGradeNorm.includes(searchNorm) ||
                          studentGradeRaw.includes(searchRaw.toLowerCase()) ||
                          courseTypeSearchTerm.includes(searchNorm) ||
                          teacherNamesNorm.includes(searchNorm) ||
                          studentNotesNorm.includes(searchNorm);
        }

        if (!matchesSearch) return false;
      }

      // 1.1 Academic stage match (الابتدائية، الإعدادية، الثانوية، التوجيهي، جامعي)
      if (academicStageFilter !== 'all') {
        const studentStage = getAcademicStageFromGrade(s.grade || s.academicLevel || '');
        if (studentStage !== academicStageFilter) return false;
      }

      // 2. Assigned teacher match
      if (teacherFilter !== 'all') {
        const isAssigned = (s.teachers && s.teachers.includes(teacherFilter)) || 
                           assignments.some(a => a.studentId === s.id && a.teacherId === teacherFilter);
        if (!isAssigned) return false;
      }

      // 3. Balance status match
      if (balanceStatusFilter !== 'all') {
        const stats = getStudentStats(s.id);
        if (balanceStatusFilter === 'positive' && stats.balance <= 0) return false;
        if (balanceStatusFilter === 'negative' && stats.balance >= 0) return false;
        if (balanceStatusFilter === 'zero' && stats.balance !== 0) return false;
        if (balanceStatusFilter === 'critical') {
          if (s.isOpenBalance) return false;
          const threshold = typeof s.lowBalanceThreshold === 'number' ? s.lowBalanceThreshold : lowBalanceThreshold;
          if (stats.balance >= threshold) return false;
        }
      }

      // 4. Grade / Class filter match
      if (gradeFilter !== 'all') {
        const studentClass = s.grade || s.academicLevel || '';
        if (studentClass !== gradeFilter) return false;
      }

      // 5. Course Type filter match (all / individual / group)
      if (courseTypeFilter !== 'all') {
        const isGroupStudent = s.courseType === 'group' || (s.notes && (s.notes.includes('دورة جماعية') || s.notes.includes('مجموعة')));
        if (courseTypeFilter === 'group' && !isGroupStudent) return false;
        if (courseTypeFilter === 'individual' && isGroupStudent) return false;
      }

      // 6. Academic status filter match
      if (academicStatusFilter !== 'all') {
        if (academicStatusFilter === 'inactive_6m') {
          const inact = getStudentInactivityInfo(s);
          if (!inact.isInactiveOver6Months) return false;
        } else {
          const currentStatus = s.academicStatus || 'Active';
          if (currentStatus !== academicStatusFilter) return false;
        }
      }

      // 7. Assignment status filter match (منسّب، غير منسّب)
      if (assignmentStatusFilter !== 'all') {
        const hasTeacherAssigned = (s.teachers && s.teachers.length > 0) || 
                                   assignments.some(a => a.studentId === s.id) ||
                                   s.status === StudentStatus.Assigned;
        if (assignmentStatusFilter === 'assigned' && !hasTeacherAssigned) return false;
        if (assignmentStatusFilter === 'unassigned' && hasTeacherAssigned) return false;
      }

      return true;
    });

    // Sort students: Active status first, then by newest session entry time, then registration date
    const lastSessionMap: Record<string, string> = {};
    sessions.forEach(session => {
      const timeKey = session.createdAt || session.date || '';
      if (!timeKey) return;

      const stIds: string[] = [];
      if (session.studentId) stIds.push(session.studentId);
      if (Array.isArray(session.studentIds)) {
        session.studentIds.forEach((id: string) => { if (id && !stIds.includes(id)) stIds.push(id); });
      }
      if (Array.isArray(session.students)) {
        session.students.forEach((st: any) => {
          const id = typeof st === 'string' ? st : st?.id;
          if (id && !stIds.includes(id)) stIds.push(id);
        });
      }

      stIds.forEach(id => {
        const currentLast = lastSessionMap[id];
        if (!currentLast || timeKey > currentLast) {
          lastSessionMap[id] = timeKey;
        }
      });
    });

    return [...list].sort((a, b) => {
      // 1. Active students first (Active > Paused / Graduated)
      const isActiveA = (a.academicStatus || 'Active') === 'Active' ? 1 : 0;
      const isActiveB = (b.academicStatus || 'Active') === 'Active' ? 1 : 0;
      if (isActiveA !== isActiveB) {
        return isActiveB - isActiveA;
      }

      // 2. Students with sessions come first, ordered by latest session date/entry timestamp (newest first)
      const dateA = lastSessionMap[a.id] || '';
      const dateB = lastSessionMap[b.id] || '';

      if (dateA && dateB) {
        return dateB.localeCompare(dateA);
      }
      if (dateA) return -1;
      if (dateB) return 1;
      
      // 3. Fallback: Registration date (newest first)
      const regA = a.registrationDate || a.createdAt || '';
      const regB = b.registrationDate || b.createdAt || '';
      if (regA && regB) {
        return regB.localeCompare(regA);
      }
      if (regA) return -1;
      if (regB) return 1;

      // 4. Fallback: Name
      return (a.name || '').localeCompare(b.name || '', 'ar');
    });
  }, [students, sessions, credits, searchTerm, searchCriteria, academicStageFilter, teacherFilter, assignments, balanceStatusFilter, gradeFilter, courseTypeFilter, academicStatusFilter, assignmentStatusFilter, archiveTab, teachers]);

  const courseTypeStats = useMemo(() => {
    let individualCount = 0;
    let groupCount = 0;
    students.forEach(s => {
      const isArchived = s.archived === true;
      const isPending = s.status === StudentStatus.Pending;
      if (archiveTab === 'active' && (isArchived || isPending)) return;
      if (archiveTab === 'archived' && !isArchived) return;
      if (archiveTab === 'pending' && (isArchived || !isPending)) return;

      const isGroup = s.courseType === 'group' || (s.notes && (s.notes.includes('دورة جماعية') || s.notes.includes('مجموعة')));
      if (isGroup) {
        groupCount++;
      } else {
        individualCount++;
      }
    });
    return { individualCount, groupCount, total: individualCount + groupCount };
  }, [students, archiveTab]);

  const balanceStats = useMemo(() => {
    let positiveCount = 0;
    let positiveSum = 0;
    let negativeCount = 0;
    let negativeSum = 0;
    let zeroCount = 0;
    let criticalCount = 0;

    students.forEach(s => {
      const isArchived = s.archived === true;
      const isPending = s.status === StudentStatus.Pending;

      if (archiveTab === 'active' && (isArchived || isPending)) return;
      if (archiveTab === 'archived' && !isArchived) return;
      if (archiveTab === 'pending' && (isArchived || !isPending)) return;

      const stats = getStudentStats(s.id);
      if (stats.balance > 0) {
        positiveCount++;
        positiveSum += stats.balance;
      } else if (stats.balance < 0) {
        negativeCount++;
        negativeSum += Math.abs(stats.balance);
      } else {
        zeroCount++;
      }

      const threshold = typeof s.lowBalanceThreshold === 'number' ? s.lowBalanceThreshold : lowBalanceThreshold;
      if (!s.isOpenBalance && stats.balance < threshold) {
        criticalCount++;
      }
    });

    return {
      positiveCount,
      positiveSum,
      negativeCount,
      negativeSum,
      zeroCount,
      criticalCount,
      totalCount: students.filter(s => {
        const isArchived = s.archived === true;
        const isPending = s.status === StudentStatus.Pending;
        if (archiveTab === 'active') return !isArchived && !isPending;
        if (archiveTab === 'archived') return isArchived;
        return !isArchived && isPending;
      }).length
    };
  }, [students, sessions, credits, teachers, lowBalanceThreshold, archiveTab]);

  if (isLoading) {
    return (
      <div className="py-40 flex flex-col items-center justify-center gap-6 text-center" dir="rtl">
        <div className="w-16 h-16 border-4 border-slate-100 border-t-[#D4A33C] rounded-full animate-spin" />
        <p className="text-sm font-black text-slate-400 uppercase animate-pulse">جاري سحب ومزامنة بيانات الطلاب...</p>
      </div>
    );
  }

  const uniqueGrades = Array.from(
    new Set(students.map(s => s.grade || s.academicLevel).filter(Boolean))
  ) as string[];

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-24 text-right" dir="rtl">
      <AnimatePresence mode="wait">
        {!selectedStudentId ? (
          <motion.div 
            key="students-list-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-12"
          >
            {/* Transfer Success Notification Banner */}
            {transferSuccessBanner && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex items-center justify-between gap-3 text-emerald-900 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">🚀</span>
                  <p className="text-xs font-black">{transferSuccessBanner}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTransferSuccessBanner(null)}
                  className="p-1.5 hover:bg-emerald-200 text-emerald-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </motion.div>
            )}

            {/* Elegant Header with Add Button at the top */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-slate-50 border border-slate-200/60 p-6 rounded-[2.5rem]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                  <Users size={24} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 font-sans">بوابة إدارة طلاب الأكاديمية</h2>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-bold">تابع شؤون الطلاب، التنسيب الأكاديمي، سجلات الحجز والحالة المالية للمحافظ والذمم</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setIsUnassignedModalOpen(true)}
                  className="px-5 py-3 bg-gradient-to-r from-amber-500/15 via-[#D4A33C]/20 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 text-[#784f0e] rounded-2xl text-xs font-black flex items-center gap-2.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer select-none border border-amber-300 font-sans"
                  id="toggle-unassigned-students-modal-btn"
                  type="button"
                  title="عرض ملخص الطلاب غير المسجلين بأي دورة جماعية ومراسلتهم عبر واتساب"
                >
                  <Users size={16} className="text-amber-600 shrink-0" />
                  <span>غير المنسبين لدورات جماعية</span>
                  <span className="bg-amber-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-bold shadow-xs">
                    {unassignedStudentsCount}
                  </span>
                </button>

                <button
                  onClick={() => setIsQuickAddModalOpen(true)}
                  className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 hover:text-white text-white rounded-2xl text-xs font-black flex items-center gap-2.5 shadow-md shadow-emerald-700/5 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer select-none border border-emerald-500 font-sans"
                  id="toggle-quick-add-student-btn"
                  type="button"
                >
                  <Plus size={15} />
                  <span>إضافة سريع ⚡</span>
                </button>

                <button
                  onClick={() => setShowAddStudentForm(!showAddStudentForm)}
                  className="px-5 py-3 bg-slate-900 hover:bg-[#D4A33C] hover:text-slate-950 text-white rounded-2xl text-xs font-black flex items-center gap-2.5 shadow-md shadow-slate-950/5 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer select-none border border-slate-800 font-sans"
                  id="toggle-add-student-form-btn"
                  type="button"
                >
                  {showAddStudentForm ? (
                    <>
                      <X size={15} />
                      <span>إغلاق استمارة الإضافة ✖</span>
                    </>
                  ) : (
                    <>
                      <Plus size={15} className="animate-pulse" />
                      <span>تسجيل وتنسيب طالب جديد 👥</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Permanent, highly prominent registration link card */}
            <div className="mx-0 p-6 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border-2 border-indigo-500/25 rounded-[2.5rem] text-right space-y-4 relative overflow-hidden shadow-sm" dir="rtl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -translate-y-16 translate-x-16 blur-xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full translate-y-16 -translate-x-16 blur-xl pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="space-y-1.5">
                  <h4 className="text-sm font-black text-indigo-950 flex flex-wrap items-center gap-2">
                    <span className="p-1.5 bg-indigo-500/20 rounded-xl text-indigo-700 shrink-0">🔗</span>
                    <span>رابط استمارة التسجيل الإلكتروني للطلاب الجدد</span>
                    <span className="text-[10px] bg-emerald-600 text-white py-0.5 px-2.5 rounded-full font-bold animate-pulse">مستقل بالكامل دون تسجيل دخول 🌟</span>
                  </h4>
                  <p className="text-[11px] text-indigo-950/80 font-bold leading-relaxed">
                    يعمل هذا الرابط بشكل مستقل بالكامل دون الحاجة لأي تسجيل دخول بالبريد الإلكتروني أو كلمة مرور للطلاب أو أولياء الأمور. تظهر البيانات فوراً في قسم <span className="text-indigo-700 font-black cursor-pointer underline decoration-dotted" onClick={() => { setArchiveTab('pending'); setBalanceStatusFilter('all'); }}>"الطلبـات الواردة"</span> للمراجعة، القبول، والتنسيب الفوري أو حجز الحصص التجريبية!
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      window.open(getRegistrationLink(), "_blank");
                    }}
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 text-indigo-950 border border-indigo-200/80 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                  >
                    <span>فتح رابط التسجيل لتجربته 🌐</span>
                  </button>
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-100 py-1.5 px-3 rounded-lg">رابط مباشر مفعل ⚡</span>
                </div>
              </div>

              <div className="flex items-stretch gap-2 max-w-2xl bg-white border border-indigo-200/60 rounded-2xl overflow-hidden p-1 relative z-10 shadow-sm">
                <input
                  type="text"
                  readOnly
                  value={getRegistrationLink()}
                  className="flex-1 bg-transparent px-3 text-xs font-mono font-bold text-slate-800 select-all outline-none text-left"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(getRegistrationLink());
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 3000);
                  }}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 shadow-sm ${
                    copiedLink
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-650 hover:bg-indigo-750 text-white'
                  }`}
                >
                  {copiedLink ? (
                    <>
                      <span>تم النسخ بنجاح! ✓</span>
                    </>
                  ) : (
                    <>
                      <span>نسخ الرابط 📋</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Student Registration Bar - Switcher Layout rendered conditionally with animation */}
            <AnimatePresence>
              {showAddStudentForm && (
                <motion.div
                  key="add-student-form-section"
                  initial={{ opacity: 0, height: 0, y: -20 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -20 }}
                  transition={{ duration: 0.35, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden space-y-6 text-right">
                    {/* Header Tab Selector */}
                    <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-100 pb-4 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg shadow-slate-900/10">
                          <UserPlus size={20} />
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-slate-900 tracking-tight uppercase">إضافة وتنسيب الطلاب بالأكاديمية</h3>
                          <p className="text-[9px] text-slate-400 font-bold mt-0.5">سجل طالباً جديداً الآن أو استخدم خاصية الرفع الجماعي الذكي</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-1 select-none">
                          <button 
                            onClick={() => setRegisterMethod('single')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${registerMethod === 'single' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            طالب فردي 👤
                          </button>
                          <button 
                            onClick={() => setRegisterMethod('bulk')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${registerMethod === 'bulk' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            استيراد جماعي (CSV) 📁
                          </button>
                          <button 
                            onClick={() => setRegisterMethod('json')}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${registerMethod === 'json' ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                          >
                            استيراد ذكي (JSON) ⚙️
                          </button>
                        </div>

                        {/* Top corner X close option inside the card */}
                        <button 
                          onClick={() => setShowAddStudentForm(false)}
                          className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                          title="إلغاء وإغلاق النافذة"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>

              {registerMethod === 'single' ? (
                <div className="flex flex-col gap-4 w-full bg-slate-50/80 border border-slate-200/60 p-6 rounded-[2rem] text-right">
                  <h4 className="text-xs font-black text-[#1A365D] border-b border-indigo-150 pb-2 flex items-center gap-1.5 justify-start">
                    <UserPlus size={13} className="text-[#D4A33C]" />
                    <span>تسجيل كامل بيانات الطالب الجديد</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                    {/* Name */}
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-[10px] font-black text-slate-500">الاسم الكامل للطالب *</span>
                      <div className="relative group">
                        <GraduationCap size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          placeholder="الاسم الكامل للطالب" 
                          value={name} 
                          onChange={e => setName(e.target.value)} 
                          className="w-full pr-10 pl-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none text-right"
                        />
                      </div>
                    </div>

                    {/* Grade */}
                    <div className="flex flex-col gap-1 text-right">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500">الصف الدراسي والمرحلة</span>
                        {grade && (
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                            getDefaultPricingUnitForGrade(grade) === 'session_40'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-blue-100 text-blue-900 border-blue-300'
                          }`}>
                            {getDefaultPricingUnitForGrade(grade) === 'session_40' ? 'تلقائي: نظام الحصة 40 دقيقة 🎓' : 'تلقائي: نظام الساعة 60 دقيقة ⏱️'}
                          </span>
                        )}
                      </div>
                      <div className="relative group">
                        <Award size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select 
                          value={grade} 
                          onChange={e => {
                            const newGrade = e.target.value;
                            setGrade(newGrade);
                            const autoUnit = getDefaultPricingUnitForGrade(newGrade);
                            setPreferredPricingUnit(autoUnit);
                            if (autoUnit === 'session_40') {
                              const stage = getAcademicStage(newGrade);
                              if (!sessionRate) setSessionRate(stage === 'secondary' ? 50 : 40);
                              if (!teacherSessionPayout) setTeacherSessionPayout(stage === 'secondary' ? 35 : 25);
                            }
                          }} 
                          className="w-full pr-10 pl-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none cursor-pointer appearance-none text-right"
                        >
                          <option value="">-- اختر صف الطالب ومرحلته (3 مراحل أساسية) --</option>
                          <optgroup label="1. المرحلة الأساسية (أساسي)">
                            <option value="الصف الأول الأساسي">الصف الأول الأساسي</option>
                            <option value="الصف الثاني الأساسي">الصف الثاني الأساسي</option>
                            <option value="الصف الثالث الأساسي">الصف الثالث الأساسي</option>
                            <option value="الصف الرابع الأساسي">الصف الرابع الأساسي</option>
                            <option value="الصف الخامس الأساسي">الصف الخامس الأساسي</option>
                            <option value="الصف السادس الأساسي">الصف السادس الأساسي</option>
                          </optgroup>
                          <optgroup label="2. المرحلة الإعدادية (إعدادي)">
                            <option value="الصف السابع الإعدادي">الصف السابع الإعدادي</option>
                            <option value="الصف الثامن الإعدادي">الصف الثامن الإعدادي</option>
                            <option value="الصف التاسع الإعدادي">الصف التاسع الإعدادي</option>
                          </optgroup>
                          <optgroup label="3. المرحلة الثانوية (ثانوي)">
                            <option value="الصف العاشر">الصف العاشر</option>
                            <option value="الصف الحادي عشر (أول ثانوي)">الصف الحادي عشر (أول ثانوي)</option>
                            <option value="الصف الثاني عشر (توجيهي / ثانوية عامة / بجروت)">الصف الثاني عشر (توجيهي / ثانوية عامة / بجروت)</option>
                          </optgroup>
                        </select>
                      </div>
                    </div>

                    {/* Teacher linking */}
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-[10px] font-black text-slate-500">تنسيب لمعلم بدايةً *</span>
                      <div className="relative group">
                        <Users size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <select 
                          value={selectedTeacherForStudent} 
                          onChange={e => setSelectedTeacherForStudent(e.target.value)} 
                          className="w-full pr-10 pl-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none cursor-pointer appearance-none text-right"
                        >
                          <option value="">تنسيب لمعلم بدايةً...</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Phone with Auto +972 Prefix */}
                    <div className="flex flex-col gap-1 text-right">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500">رقم الهاتف / الواتس آب</span>
                        <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                          المقدمة 972+ تلقائية 💬
                        </span>
                      </div>
                      <div className="relative flex items-center" dir="ltr">
                        <div className="bg-emerald-50 border border-r-0 border-slate-200 text-emerald-800 font-mono font-black text-xs px-2.5 py-2 rounded-l-xl flex items-center gap-1 shrink-0 select-none shadow-inner">
                          <Phone size={12} className="text-emerald-600" />
                          <span>+972</span>
                        </div>
                        <input 
                          value={phone}
                          onChange={e => setPhone(cleanLocalPhoneDigits(e.target.value))}
                          placeholder="50 123 4567"
                          dir="ltr"
                          className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-r-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all outline-none font-mono"
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-[10px] font-black text-slate-500">البريد الإلكتروني</span>
                      <input 
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="example@email.com"
                        dir="ltr"
                        className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none text-right"
                      />
                    </div>

                    {/* Gender */}
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-[10px] font-black text-slate-500">جنس الطالب</span>
                      <select 
                        value={gender}
                        onChange={e => setGender(e.target.value as 'Male' | 'Female')}
                        className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none cursor-pointer text-right"
                      >
                        <option value="Male">ذكر</option>
                        <option value="Female">أنثى</option>
                      </select>
                    </div>

                    {/* Low Balance Threshold */}
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-[10px] font-black text-slate-500">تنبيه انخفاض الرصيد عند (₪)</span>
                      <input 
                        type="text"
                        value={newStudentLowBalanceThreshold}
                        onChange={e => setNewStudentLowBalanceThreshold(e.target.value)}
                        placeholder="-100"
                        className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none text-right"
                      />
                    </div>

                    {/* Hourly Rate / 40-Minute Session Rate in Grid */}
                    {preferredPricingUnit === 'session_40' ? (
                      <div className="flex flex-col gap-1 text-right bg-gradient-to-r from-amber-50 to-orange-50/70 p-2.5 rounded-xl border border-amber-300/80 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-amber-950 flex items-center gap-1">
                            <span>نظام الحصة (40 دقيقة) 🎓</span>
                          </span>
                          <span className="text-[9px] font-extrabold text-amber-900 bg-amber-200/90 px-1.5 py-0.5 rounded">
                            بديل سعر الساعة ✓
                          </span>
                        </div>
                        <div className="flex items-center justify-between bg-white/90 px-2 py-1.5 rounded-lg border border-amber-200 mt-0.5">
                          <span className="text-[10px] font-bold text-slate-600">طالب: <strong className="text-amber-950 font-black">₪{sessionRate || (getAcademicStage(grade) === 'secondary' ? 50 : 40)}</strong></span>
                          <span className="text-[10px] font-bold text-slate-600">معلم: <strong className="text-emerald-800 font-black">₪{teacherSessionPayout || (getAcademicStage(grade) === 'secondary' ? 35 : 25)}</strong></span>
                        </div>
                        <span className="text-[8.5px] text-amber-800 font-bold">تسعير الحصة محدد بالأسفل بدقة للمعلم والطالب ⬇️</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 text-right">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-500">سعر ساعة الطالب (₪)</span>
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            {(() => {
                              const stage = getAcademicStage(grade);
                              if (stage === 'secondary') return `ثانوي: ₪${defaultSecondaryStudentHourlyRate} تلقائياً`;
                              if (stage === 'middle') return `إعدادي: ₪${defaultMiddleStudentHourlyRate} تلقائياً`;
                              return `تلقائي: ₪${defaultPrimaryStudentHourlyRate || defaultStudentHourlyRate}`;
                            })()}
                          </span>
                        </div>
                        <input 
                          type="number"
                          value={hourlyRate}
                          onChange={e => setHourlyRate(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder={(() => {
                            const stage = getAcademicStage(grade);
                            if (stage === 'secondary') return `تلقائي ثانوي: ${defaultSecondaryStudentHourlyRate} ₪ (أو أدخل رقماً للتخصيص)`;
                            if (stage === 'middle') return `تلقائي إعدادي: ${defaultMiddleStudentHourlyRate} ₪ (أو أدخل رقماً للتخصيص)`;
                            return `تلقائي عام: ${defaultStudentHourlyRate} ₪ (أو أدخل للتخصيص)`;
                          })()}
                          className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none text-right"
                        />
                        <span className="text-[9px] text-slate-400">سعر الساعة التلقائي: المرحلة الثانوية 60 ₪ والإعدادي 50 ₪ ما لم يخصصه المدير هنا.</span>
                      </div>
                    )}

                    {/* Initial Cash Payment / Top-Up */}
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1 justify-start">
                        <DollarSign size={12} className="text-emerald-500 animate-pulse" />
                        <span>الدفعة النقدية الأولى (شحن رصيد) (₪)</span>
                      </span>
                      <div className="relative group">
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-500 font-extrabold text-xs pointer-events-none">₪</span>
                        <input 
                          type="number"
                          value={initialPaymentAmt}
                          onChange={e => setInitialPaymentAmt(e.target.value)}
                          placeholder="شحن رصيد ابتدائي (اختياري)"
                          className="w-full pr-10 pl-3 py-2 text-xs font-black bg-emerald-50/40 text-emerald-800 placeholder-emerald-600/40 border border-emerald-150 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-right"
                        />
                      </div>
                    </div>

                    {/* Academic Status */}
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-[10px] font-black text-slate-500">حالة الطالب</span>
                      <select 
                        value={academicStatus}
                        onChange={e => setAcademicStatus(e.target.value as 'Active' | 'Paused' | 'Graduated')}
                        className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none cursor-pointer text-right"
                      >
                        <option value="Active">نشط (Active) 🟢</option>
                        <option value="Paused">متوقف مؤقت (Paused) ⏳</option>
                        <option value="Graduated">خريج (Graduated) 🎓</option>
                      </select>
                    </div>
                  </div>

                  {/* System Selection: Hourly vs 40-Minute Sessions (Manager Only) */}
                  <div className="bg-amber-50/70 border-2 border-amber-200/90 p-4.5 rounded-2xl space-y-3 text-right">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-amber-200/70">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
                          <Clock size={16} />
                        </div>
                        <div>
                          <h5 className="text-xs font-black text-slate-900 flex items-center gap-2">
                            <span>نظام احتساب الحصص والبرنامج المعتمد للطالب</span>
                            <span className="text-[10px] bg-amber-200/90 text-amber-950 font-extrabold px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                              <Lock size={10} />
                              صلاحيات المدير فقط
                            </span>
                          </h5>
                          <p className="text-[10px] text-slate-600 font-bold mt-0.5">
                            يحدد هذا الخيار كيفية ظهور نظام الحصة وعداد الوقت عند المعلم في شاشة تسجيل الحصص
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setPreferredPricingUnit('hourly')}
                        className={`p-3.5 rounded-xl border-2 text-right transition-all flex items-start gap-3 cursor-pointer ${
                          preferredPricingUnit === 'hourly'
                            ? 'border-[#1A365D] bg-white shadow-sm ring-2 ring-[#1A365D]/10'
                            : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                          preferredPricingUnit === 'hourly' ? 'border-[#1A365D] bg-[#1A365D] text-white' : 'border-slate-300'
                        }`}>
                          {preferredPricingUnit === 'hourly' && <Check size={12} className="stroke-[3]" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900">نظام الساعات (60 دقيقة) ⏱️</span>
                            {preferredPricingUnit === 'hourly' && (
                              <span className="text-[9px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded">محدد</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-semibold block mt-1 leading-relaxed">
                            احتساب الحصص بنظام الساعة الكاملة (60 دقيقة). يختار المعلم عند التسجيل: 1 (60 د)، 1.5 (90 د)، 2 (120 د)، 3 (180 د).
                          </span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const stage = getAcademicStage(grade);
                          setPreferredPricingUnit('session_40');
                          if (!sessionRate) setSessionRate(stage === 'secondary' ? 50 : 40);
                          if (!teacherSessionPayout) setTeacherSessionPayout(stage === 'secondary' ? 35 : 25);
                        }}
                        className={`p-3.5 rounded-xl border-2 text-right transition-all flex items-start gap-3 cursor-pointer ${
                          preferredPricingUnit === 'session_40'
                            ? 'border-amber-500 bg-white shadow-sm ring-2 ring-amber-500/20'
                            : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                          preferredPricingUnit === 'session_40' ? 'border-amber-500 bg-amber-500 text-slate-950' : 'border-slate-300'
                        }`}>
                          {preferredPricingUnit === 'session_40' && <Check size={12} className="stroke-[3]" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900">نظام الحصة (40 دقيقة) 🎓</span>
                            {preferredPricingUnit === 'session_40' && (
                              <span className="text-[9px] bg-amber-200 text-amber-950 font-extrabold px-1.5 py-0.5 rounded">محدد</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-semibold block mt-1 leading-relaxed">
                            احتساب الحصص بنظام الحصة المدرسية (40 دقيقة). يختار المعلم عند التسجيل: 1 (40 د)، 1.5 (60 د)، 2 (80 د)، 3 (120 د).
                          </span>
                        </div>
                      </button>
                    </div>

                    {/* Dedicated 40-Minute Session Pricing Panel (Student Rate + Teacher Payout) in Add Form */}
                    {preferredPricingUnit === 'session_40' && (
                      <div className="mt-3 p-4 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-amber-100/40 border-2 border-amber-300 rounded-2xl text-right animate-in fade-in space-y-3.5 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-amber-200/90">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                              🎓
                            </div>
                            <div>
                              <span className="text-xs font-black text-amber-950 block">
                                تحديد سعر الحصة (40 دقيقة) للطالب والمعلم (بديل نظام الساعات)
                              </span>
                              <span className="text-[10px] text-amber-800 font-bold block mt-0.5">
                                {(() => {
                                  const stage = getAcademicStage(grade);
                                  if (stage === 'secondary') return 'المرحلة المكتشفة: المرحلة الثانوية (تلقائي المنظومة: 50 ₪ للطالب / 35 ₪ للمعلم)';
                                  if (stage === 'middle') return 'المرحلة المكتشفة: المرحلة الإعدادية (تلقائي المنظومة: 40 ₪ للطالب / 25 ₪ للمعلم)';
                                  return 'المرحلة: عامة / أساسية (التسعير المعتمد: 40 ₪ إعدادي / 50 ₪ ثانوي)';
                                })()}
                              </span>
                            </div>
                          </div>

                          {/* Preset Stage Buttons */}
                          <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setSessionRate(40);
                                setTeacherSessionPayout(25);
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                              title="تطبيق تسعيرة المرحلة الإعدادية"
                            >
                              🌱 إعدادي (40₪ طالب / 25₪ معلم)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSessionRate(50);
                                setTeacherSessionPayout(35);
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-300 rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                              title="تطبيق تسعيرة المرحلة الثانوية"
                            >
                              🎓 ثانوي (50₪ طالب / 35₪ معلم)
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {/* 1. Student Rate per 40-Min Session */}
                          <div className="flex flex-col gap-1 text-right bg-white p-3.5 rounded-xl border border-amber-200/90 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black text-amber-950 flex items-center gap-1">
                                <DollarSign size={13} className="text-amber-600" />
                                <span>سعر الحصة 40 دقيقة للطالب (₪)</span>
                              </span>
                              <span className="text-[9px] font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                                تُخصم من رصيد الطالب 💳
                              </span>
                            </div>
                            <div className="relative mt-1">
                              <input 
                                type="number"
                                value={sessionRate}
                                onChange={e => setSessionRate(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder={(() => {
                                  const stage = getAcademicStage(grade);
                                  return stage === 'secondary' ? '50 (تلقائي ثانوي)' : '40 (تلقائي إعدادي)';
                                })()}
                                className="w-full px-3 py-2 pr-4 pl-16 text-sm font-black bg-amber-50/40 border-2 border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none text-right"
                              />
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                ₪ / حصة 40د
                              </span>
                            </div>
                            <span className="text-[9.5px] text-amber-800/80 font-bold mt-1">
                              المبلغ المالي الذي يُخصم تلقائياً من رصيد محفظة الطالب عند تسجيل ورصد حصة 40 دقيقة.
                            </span>
                          </div>

                          {/* 2. Teacher Payout per 40-Min Session */}
                          <div className="flex flex-col gap-1 text-right bg-white p-3.5 rounded-xl border border-emerald-200/90 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black text-emerald-950 flex items-center gap-1">
                                <Award size={13} className="text-emerald-600" />
                                <span>أجر/سعر الحصة 40 دقيقة للمعلم (₪)</span>
                              </span>
                              <span className="text-[9px] font-black text-emerald-850 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                                تُضاف لمستحقات المعلم 💰
                              </span>
                            </div>
                            <div className="relative mt-1">
                              <input 
                                type="number"
                                value={teacherSessionPayout}
                                onChange={e => setTeacherSessionPayout(e.target.value === '' ? '' : Number(e.target.value))}
                                placeholder={(() => {
                                  const stage = getAcademicStage(grade);
                                  return stage === 'secondary' ? '35 (تلقائي ثانوي)' : '25 (تلقائي إعدادي)';
                                })()}
                                className="w-full px-3 py-2 pr-4 pl-16 text-sm font-black bg-emerald-50/40 border-2 border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-right"
                              />
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                ₪ / حصة 40د
                              </span>
                            </div>
                            <span className="text-[9.5px] text-emerald-800/80 font-bold mt-1">
                              المبلغ المالي المستحق للمعلم الذي يُضاف تلقائياً إلى رصيد أرباحه ومستحقاته عند رصد الحصة.
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Hourly system session duration selection */}
                    {preferredPricingUnit === 'hourly' && (
                      <div className="mt-3 p-3.5 bg-blue-50/80 border border-blue-200/90 rounded-2xl text-right animate-in fade-in space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-blue-200/60">
                          <span className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                            <Clock size={14} className="text-blue-700 shrink-0" />
                            مدة الجلسة التلقائية للطالب (نظام الساعات):
                          </span>
                          <span className="text-[10px] bg-blue-200/80 text-blue-900 font-black px-2 py-0.5 rounded-lg w-fit">
                            الافتراضي: 60 دقيقة
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setNewStudentSessionDuration(60)}
                            className={`p-3 rounded-xl border-2 text-right transition-all cursor-pointer flex items-center gap-2.5 ${
                              newStudentSessionDuration === 60
                                ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-500/20'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              newStudentSessionDuration === 60 ? 'border-white bg-white text-blue-700' : 'border-slate-300'
                            }`}>
                              {newStudentSessionDuration === 60 && <Check size={12} className="stroke-[3]" />}
                            </div>
                            <div>
                              <span className="text-xs font-black block">60 دقيقة (الخيار الأول التلقائي) ⭐</span>
                              <span className={`text-[10px] block font-medium ${newStudentSessionDuration === 60 ? 'text-blue-100' : 'text-slate-500'}`}>
                                ساعة كاملة كخيار افتراضي عند تسجيل الحصص
                              </span>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setNewStudentSessionDuration(30)}
                            className={`p-3 rounded-xl border-2 text-right transition-all cursor-pointer flex items-center gap-2.5 ${
                              newStudentSessionDuration === 30
                                ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-500/20'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              newStudentSessionDuration === 30 ? 'border-white bg-white text-blue-700' : 'border-slate-300'
                            }`}>
                              {newStudentSessionDuration === 30 && <Check size={12} className="stroke-[3]" />}
                            </div>
                            <div>
                              <span className="text-xs font-black block">30 دقيقة (نصف ساعة) ⏳</span>
                              <span className={`text-[10px] block font-medium ${newStudentSessionDuration === 30 ? 'text-blue-100' : 'text-slate-500'}`}>
                                تفتح تلقائياً كـ 30 دقيقة (0.5 س) عند رصد الحصة
                              </span>
                            </div>
                          </button>
                        </div>
                        <p className="text-[10px] text-blue-900/80 font-semibold leading-relaxed pt-1">
                          ℹ️ تكون الحصة تلقائياً 60 دقيقة، إلا في حال تحديد 30 دقيقة هنا عند تسجيل الطالب فقط.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ──────────────────────────── */}
                  {/* Divider & Student Login Account Section */}
                  <div className="border-t border-slate-200/80 my-3"></div>

                  <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4.5 shadow-xs transition-all text-right">
                    {/* Section Header & Main Checkbox */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 shadow-xs border border-indigo-100">
                          <Lock size={16} />
                        </div>
                        <div>
                          <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            <span>🔐 بيانات حساب الدخول</span>
                            <span className="text-[10px] font-bold text-slate-400 font-sans">(بوابة الطالب)</span>
                          </h5>
                          <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                            إنشاء بيانات دخول الطالب لتمكينه من الدخول لبوابة المنصة ومتابعة المواد والاختبارات
                          </p>
                        </div>
                      </div>

                      <label className="flex items-center gap-2.5 cursor-pointer bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 px-3.5 py-2 rounded-xl transition-all select-none self-start sm:self-auto shadow-xs">
                        <input 
                          type="checkbox"
                          checked={createStudentAccount}
                          onChange={e => {
                            const checked = e.target.checked;
                            setCreateStudentAccount(checked);
                            if (checked) {
                              if (!accountUsername) {
                                setAccountUsername(generateSuggestedUsername(name, email));
                              }
                              if (!accountPassword) {
                                const p = generateSuggestedPassword();
                                setAccountPassword(p);
                                setAccountConfirmPassword(p);
                              }
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                        />
                        <span className="text-xs font-black text-slate-800">إنشاء حساب دخول للطالب</span>
                      </label>
                    </div>

                    {/* Collapsible Fields */}
                    <AnimatePresence>
                      {createStudentAccount && (
                        <motion.div
                          key="create-student-account-section"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden pt-4 space-y-4"
                        >
                          {/* 3 Main Inputs: Username, Password, Confirm Password */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Username */}
                            <div className="flex flex-col gap-1 text-right">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-600">اسم المستخدم: *</span>
                                {accountUsername && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(accountUsername);
                                      alert('تم نسخ اسم المستخدم!');
                                    }}
                                    className="text-[9px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    <Copy size={10} />
                                    <span>نسخ</span>
                                  </button>
                                )}
                              </div>
                              <div className="relative group">
                                <input 
                                  type="text"
                                  value={accountUsername}
                                  onChange={e => {
                                    setAccountUsername(e.target.value);
                                    if (autoGenUsername) setAutoGenUsername(false);
                                  }}
                                  placeholder="مثال: zakia123"
                                  dir="ltr"
                                  className="w-full px-3 py-2 pr-9 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-left"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const u = generateSuggestedUsername(name, email);
                                    setAccountUsername(u);
                                  }}
                                  title="توليد اسم مستخدم جديد"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 p-1 rounded-md transition-colors cursor-pointer"
                                >
                                  <RefreshCw size={13} />
                                </button>
                              </div>
                            </div>

                            {/* Password */}
                            <div className="flex flex-col gap-1 text-right">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-600">كلمة المرور: *</span>
                                {accountPassword && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(accountPassword);
                                      alert('تم نسخ كلمة المرور!');
                                    }}
                                    className="text-[9px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                                  >
                                    <Copy size={10} />
                                    <span>نسخ</span>
                                  </button>
                                )}
                              </div>
                              <div className="relative group">
                                <input 
                                  type={showPassword ? "text" : "password"}
                                  value={accountPassword}
                                  onChange={e => {
                                    setAccountPassword(e.target.value);
                                    if (autoGenPassword) setAutoGenPassword(false);
                                  }}
                                  placeholder="كلمة المرور"
                                  dir="ltr"
                                  className="w-full px-3 py-2 pr-9 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-left tracking-wider"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 transition-colors cursor-pointer"
                                  title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                                >
                                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="flex flex-col gap-1 text-right">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-600">تأكيد كلمة المرور: *</span>
                                {accountPassword && accountConfirmPassword && (
                                  <span className={`text-[9px] font-bold ${accountPassword === accountConfirmPassword ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {accountPassword === accountConfirmPassword ? 'متطابقة ✓' : 'غير متطابقة ✗'}
                                  </span>
                                )}
                              </div>
                              <div className="relative group">
                                <input 
                                  type={showConfirmPassword ? "text" : "password"}
                                  value={accountConfirmPassword}
                                  onChange={e => {
                                    setAccountConfirmPassword(e.target.value);
                                    if (autoGenPassword) setAutoGenPassword(false);
                                  }}
                                  placeholder="تأكيد كلمة المرور"
                                  dir="ltr"
                                  className={`w-full px-3 py-2 pr-9 text-xs font-mono font-bold bg-white border ${accountPassword && accountConfirmPassword && accountPassword !== accountConfirmPassword ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-left tracking-wider`}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 transition-colors cursor-pointer"
                                  title={showConfirmPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                                >
                                  {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* 4 Checkbox Controls: Auto Username, Auto Password, First Login Change, Send Email */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200/70">
                            {/* Auto-generate username */}
                            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200/60 transition-all select-none">
                              <input 
                                type="checkbox"
                                checked={autoGenUsername}
                                onChange={e => {
                                  const checked = e.target.checked;
                                  setAutoGenUsername(checked);
                                  if (checked) {
                                    const u = generateSuggestedUsername(name, email);
                                    setAccountUsername(u);
                                  }
                                }}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                              />
                              <span className="text-[11px] font-bold text-slate-700">إنشاء اسم المستخدم تلقائياً</span>
                            </label>

                            {/* Auto-generate password */}
                            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200/60 transition-all select-none">
                              <input 
                                type="checkbox"
                                checked={autoGenPassword}
                                onChange={e => {
                                  const checked = e.target.checked;
                                  setAutoGenPassword(checked);
                                  if (checked) {
                                    const p = generateSuggestedPassword();
                                    setAccountPassword(p);
                                    setAccountConfirmPassword(p);
                                  }
                                }}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                              />
                              <span className="text-[11px] font-bold text-slate-700">إنشاء كلمة مرور تلقائياً</span>
                            </label>

                            {/* Force change password on first login */}
                            <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200/60 transition-all select-none">
                              <input 
                                type="checkbox"
                                checked={forceChangePasswordOnFirstLogin}
                                onChange={e => setForceChangePasswordOnFirstLogin(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                              />
                              <span className="text-[11px] font-bold text-slate-700">تغيير كلمة المرور عند أول دخول</span>
                            </label>

                            {/* Send credentials to email */}
                            <label className={`flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200/60 transition-all select-none ${!email.trim() ? 'opacity-70' : ''}`} title={!email.trim() ? 'يرجى إدخال البريد الإلكتروني للطالب في الحقول أعلاه' : ''}>
                              <input 
                                type="checkbox"
                                checked={sendCredentialsEmail}
                                onChange={e => setSendCredentialsEmail(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                              />
                              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                <span>إرسال بيانات الدخول إلى البريد</span>
                                {email.trim() ? <Mail size={12} className="text-indigo-600" /> : <span className="text-[9px] text-slate-400 font-normal">(يتطلب بريد)</span>}
                              </span>
                            </label>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mt-1">
                    {/* Open Balance Option */}
                    <div className="md:col-span-1 bg-white border border-slate-200/85 p-3 rounded-xl flex items-center justify-between">
                      <div className="flex flex-col gap-0.5 text-right font-bold">
                        <span className="text-[11px] font-black text-slate-800">تفعيل الحساب المفتوح</span>
                        <span className="text-[9px] font-bold text-slate-400">الرصيد السالب مع الدفع لاحقاً</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={isOpenBalance}
                          onChange={e => setIsOpenBalance(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#D4A33C]"></div>
                      </label>
                    </div>

                    {/* Notes */}
                    <div className="md:col-span-2 flex flex-col gap-1 text-right">
                      <span className="text-[10px] font-black text-slate-500">ملاحظات إضافية</span>
                      <textarea 
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="أي ملاحظات إضافية خاصة بالمتابعة الأكاديمية أو المالية للطالب..."
                        rows={1}
                        className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none text-right resize-none"
                      />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center justify-end gap-2 border-t border-slate-200/50 pt-3 mt-1">
                    <button 
                      onClick={handleAddStudent}
                      disabled={!name || !selectedTeacherForStudent}
                      className="bg-slate-900 hover:bg-[#D4A33C] hover:text-slate-950 text-white px-8 py-2.5 rounded-xl font-black text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2 select-none shrink-0 cursor-pointer"
                    >
                      تسجيل الطالب بالدراسة
                    </button>
                  </div>
                </div>
              ) : registerMethod === 'bulk' ? (
                /* CSV Bulk Import Wizard Widget */
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-200">
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <FileText size={14} className="text-[#D4A33C]" />
                        <span>تحميل وزرع ملف الطلاب الجماعي</span>
                      </h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                        يسهّل عليك هذا المعالج تسجيل عشرات الطلاب دفعة واحدة وبضغطة زر لراحة تامة. استخدم نموذج ملف الـ CSV وتأكد من الالتزام بتسمية الأعمدة لاستيراد دقيق ومضمون في قاعدة البيانات.
                      </p>
                      
                      <div className="pt-2 flex flex-wrap gap-2">
                        <button 
                          onClick={downloadTemplate}
                          className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 px-4 py-2.5 rounded-xl text-[10px] font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          <Download size={12} className="text-[#D4A33C]" />
                          <span>تحميل نموذج قالب CSV الجاهز (Excel)</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 text-right">
                      <div>
                        <label className="block text-[10px] font-black text-[#0D365A] mb-1.5">
                          ١. اختر المعلم الافتراضي لتنسيب الطلاب المستوردين إليه:
                        </label>
                        <div className="relative text-right max-w-sm">
                          <Users size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <select
                            value={defaultTeacherForImport}
                            onChange={e => setDefaultTeacherForImport(e.target.value)}
                            className="w-full pr-11 pl-4 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-xs appearance-none cursor-pointer text-slate-700 focus:outline-[#0D365A]"
                          >
                            <option value="">-- اضغط لتحديد معلم للشحنة --</option>
                            {teachers.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-[#0D365A] mb-1.5">
                          ٢. ارفع ملف الـ CSV الخاص بك:
                        </label>
                        <div className="relative border-2 border-dashed border-slate-200 hover:border-[#D4A33C] rounded-2xl bg-white p-6 text-center transition cursor-pointer group">
                          <input 
                            type="file" 
                            accept=".csv" 
                            onChange={handleCsvFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Upload size={24} className="text-slate-400 group-hover:text-[#D4A33C] transition-all" />
                            <span className="text-[10px] font-black text-slate-600">اضغط أو اسحب ملف الطلاب بصيغة (.csv)</span>
                            <span className="text-[8px] text-slate-400">يدعم الملف بترميز UTF-8 لحفظ الأسماء والبيانات العربية بشكل سليم</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Importing Success / Final Report Status Bar */}
                  {importStatus && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2 text-right"
                    >
                      <h5 className="text-xs font-black flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span>تمت عملية الاستيراد الجماعي للطلاب بنجاح!</span>
                      </h5>
                      <p className="text-[10px] font-bold">
                        تمت قراءة ومعالجة <span className="font-extrabold text-sm font-mono text-emerald-600">{importStatus.total}</span> طالباً، وتم استيراد وتسجيل <span className="font-extrabold text-[#D4A33C] text-sm font-mono">{importStatus.imported}</span> بنجاح في المنظومة.
                      </p>
                      {importStatus.errors.length > 0 && (
                        <div className="mt-3 bg-rose-50 p-3 rounded-lg border border-rose-100 space-y-1">
                          <h6 className="text-[10px] font-black text-rose-700">بعض التنبيهات والأخطاء أثناء المزامنة:</h6>
                          <div className="max-h-24 overflow-y-auto text-[9px] font-mono text-rose-600 space-y-0.5 whitespace-pre-wrap leading-normal">
                            {importStatus.errors.map((err, i) => (
                              <div key={i}>• {err}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Wizard Preview Table */}
                  {csvPreviewData.length > 0 && (
                    <motion.div 
                      key="preview"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-750">
                          معاينة الطلاب المقروءين بالملف ({csvPreviewData.length} طالب)
                        </span>
                        <button 
                          onClick={() => setCsvPreviewData([])}
                          className="text-[10px] text-rose-500 hover:underline font-black cursor-pointer"
                        >
                          إلغاء المعاينة والتراجع
                        </button>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                        <table className="w-full text-right text-[10px] border-collapse bg-white">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-200 sticky top-0 font-bold text-slate-600 text-[9px]">
                              <th className="p-2.5">الاسم الكامل</th>
                              <th className="p-2.5 font-sans">الصف الدراسي</th>
                              <th className="p-2.5">الهاتف</th>
                              <th className="p-2.5 font-sans">البريد</th>
                              <th className="p-2.5">الجنس</th>
                              <th className="p-2.5 font-sans">رصيد مبدئي</th>
                              <th className="p-2.5">حساب مفتوح</th>
                              <th className="p-2.5 text-center">التحقق</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                            {csvPreviewData.map((row) => (
                              <tr key={row.id} className={row.isValid === false ? 'bg-rose-50/50' : 'hover:bg-slate-50'}>
                                <td className="p-2.5 font-bold">{row.name || <span className="text-rose-500 italic">مفقود/فارغ</span>}</td>
                                <td className="p-2.5">{row.grade || '-'}</td>
                                <td className="p-2.5">{row.phone || '-'}</td>
                                <td className="p-2.5">{row.email || '-'}</td>
                                <td className="p-2.5">{row.gender === 'Female' ? 'أنثى' : 'ذكر'}</td>
                                <td className="p-2.5 font-mono text-emerald-600">₪{row.initialBalance}</td>
                                <td className="p-2.5">{row.isOpenBalance ? 'نعم (مسموح)' : 'لا'}</td>
                                <td className="p-2.5 text-right">
                                  {row.isValid ? (
                                    <div className="flex items-center justify-center">
                                      <span className="inline-flex items-center gap-1 text-[9px] text-emerald-600 font-black px-1.5 py-0.5 rounded-full bg-emerald-50">
                                        <Check size={10} />
                                        صالح
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-start gap-1 p-1 max-w-[200px]">
                                      <span className="inline-flex items-center gap-1 text-[9px] text-rose-600 font-black px-1.5 py-0.5 rounded-full bg-rose-50 mb-1">
                                        <X size={10} />
                                        مرفوض
                                      </span>
                                      {row.validationErrors && row.validationErrors.map((err: string, i: number) => (
                                        <span key={i} className="text-[8px] text-rose-500 block font-bold text-right">• {err}</span>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                        <button 
                          onClick={handleImportCsvSubmit}
                          disabled={isImporting || !defaultTeacherForImport || csvPreviewData.every(s => !s.isValid)}
                          className="bg-slate-900 hover:bg-[#0D365A] disabled:opacity-30 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-xl text-xs font-black shadow-lg shadow-slate-200 transition-all flex items-center gap-2 cursor-pointer select-none"
                        >
                          {isImporting ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>جاري تنسيب وزرع الطلاب في السيرفر...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={14} className="text-[#D4A33C]" />
                              <span>تأكيد واستيراد {csvPreviewData.filter(s => s.isValid).length} طالباً الآن</span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              ) : (
                /* JSON Bulk Import Wizard Widget */
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-200 text-right">
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 justify-start">
                        <FileSpreadsheet size={14} className="text-[#D4A33C]" />
                        <span>تحميل وتدقيق ملف الطلاب بصيغة JSON</span>
                      </h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                        يسهّل عليك هذا المعالج تسجيل وضخ عشرات الطلاب دفعة واحدة وبضغطة زر مع إجراء تحليلات دقيقة وتدقيق مسبق لجودة وصحة البيانات لتلافي حدوث مشاكل في السجلات.
                      </p>
                      
                      <div className="pt-2 flex flex-wrap gap-2 justify-start">
                        <button 
                          type="button"
                          onClick={downloadJsonTemplate}
                          className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 px-4 py-2.5 rounded-xl text-[10px] font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          <Download size={12} className="text-[#D4A33C]" />
                          <span>تحميل نموذج قالب JSON القياسي (قالب معتمد)</span>
                        </button>
                      </div>

                      {/* Validation Constraints Guide */}
                      <div className="bg-slate-100/60 rounded-xl p-3 border border-slate-200/50 text-[10px] text-slate-500 space-y-1.5 text-right">
                        <span className="font-black text-slate-700 block mb-1">قواعد التحقق من صحة المدخلات (Data Validation):</span>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] font-bold">
                          <div>• <span className="text-slate-800">الاسم (name):</span> إلزامي ونوع نصي غير فارغ.</div>
                          <div>• <span className="text-slate-800">الجنس (gender):</span> Male أو Female.</div>
                          <div>• <span className="text-slate-800">الرصيد المبدئي (initialBalance):</span> رقمي عشري.</div>
                          <div>• <span className="text-slate-800">الحساب المفتوح (isOpenBalance):</span> boolean (true/false).</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 text-right">
                      <div>
                        <label className="block text-[10px] font-black text-[#0D365A] mb-1.5">
                          ١. اختر المعلم الافتراضي لتنسيب الطلاب المستوردين إليه:
                        </label>
                        <div className="relative text-right max-w-sm">
                          <Users size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <select
                            value={defaultTeacherForJsonImport}
                            onChange={e => setDefaultTeacherForJsonImport(e.target.value)}
                            className="w-full pr-11 pl-4 py-2.5 bg-white border border-slate-300 rounded-xl font-bold text-xs appearance-none cursor-pointer text-slate-700 focus:outline-[#0D365A]"
                          >
                            <option value="">-- اضغط لتحديد معلم للشحنة --</option>
                            {teachers.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-[#0D365A] mb-1.5">
                          ٢. ارفع ملف الـ JSON الخاص بك:
                        </label>
                        <div className="relative border-2 border-dashed border-slate-200 hover:border-[#D4A33C] rounded-2xl bg-white p-6 text-center transition cursor-pointer group">
                          <input 
                            type="file" 
                            accept=".json" 
                            onChange={handleJsonFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Upload size={24} className="text-slate-400 group-hover:text-[#D4A33C] transition-all" />
                            <span className="text-[10px] font-black text-slate-600">اضغط أو اسحب ملف الطلاب بصيغة (.json)</span>
                            <span className="text-[8px] text-slate-400">يقوم النظام تلقائياً بتطبيق الفلاتر والتحقق من جودة البنية</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* JSON Parsing Errors Display */}
                  {jsonError && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-black flex items-center gap-2 text-right">
                      <AlertCircle size={16} className="text-rose-500 shrink-0" />
                      <span>{jsonError}</span>
                    </div>
                  )}

                  {/* Importing Success / Final Report Status Bar for JSON */}
                  {jsonImportStatus && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-2 text-right"
                    >
                      <h5 className="text-xs font-black flex items-center gap-2 justify-start">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span>اكتمل تقرير معالجة ملف الـ JSON بنجاح!</span>
                      </h5>
                      <p className="text-[10px] font-bold">
                        العدد الإجمالي بالملف: <span className="font-extrabold text-sm font-mono text-emerald-600">{jsonImportStatus.total}</span>، تم تسجيل وتنسيب <span className="font-extrabold text-[#D4A33C] text-sm font-mono">{jsonImportStatus.imported}</span> طالباً بنجاح في قاعدة البيانات.
                      </p>
                      {jsonImportStatus.errors.length > 0 && (
                        <div className="mt-3 bg-rose-50 p-3 rounded-lg border border-rose-100 space-y-1 text-right">
                          <h6 className="text-[10px] font-black text-rose-700">بعض الأخطاء التي ظهرت أثناء الرفع:</h6>
                          <div className="max-h-24 overflow-y-auto text-[9px] font-mono text-rose-600 space-y-0.5 whitespace-pre-wrap leading-normal">
                            {jsonImportStatus.errors.map((err, i) => (
                              <div key={i}>• {err}</div>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* JSON Live Interactive Validation Preview Table */}
                  {jsonPreviewData.length > 0 && (
                    <motion.div 
                      key="json-preview"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-750">
                          نتائج التحقق والمعاينة ({jsonPreviewData.length} سجل مستكشف)
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg font-black">
                            مقبول وصالح: {jsonPreviewData.filter(s => s.isValid).length}
                          </span>
                          {jsonPreviewData.some(s => !s.isValid) && (
                            <span className="text-[9px] bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-lg font-black">
                              غير مقبول: {jsonPreviewData.filter(s => !s.isValid).length}
                            </span>
                          )}
                          <button 
                            type="button"
                            onClick={() => setJsonPreviewData([])}
                            className="text-[9px] text-slate-400 hover:text-slate-600 font-bold transition cursor-pointer"
                          >
                            تفريغ المعاينة 🗑️
                          </button>
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white max-h-72 overflow-y-auto w-full">
                        <table className="w-full text-right text-xs" dir="rtl">
                          <thead className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-100">
                            <tr>
                              <th className="p-3">حالة التدقيق والتحقق من البيانات</th>
                              <th className="p-3">الاسم الكامل</th>
                              <th className="p-3">الصف الدراسي</th>
                              <th className="p-3 w-1/4">الهاتف/البريد</th>
                              <th className="p-3 text-center">الجنس</th>
                              <th className="p-3 text-center">الحساب المفتوح</th>
                              <th className="p-3">الرصيد المبدئي</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {jsonPreviewData.map((row) => (
                              <tr key={row.id} className={`hover:bg-slate-50/50 transition-colors ${!row.isValid ? 'bg-rose-50/20' : ''}`}>
                                <td className="p-3 font-semibold">
                                  {row.isValid ? (
                                    <div className="flex items-center gap-1.5 text-emerald-600">
                                      <CheckCircle2 size={13} />
                                      <span className="text-[10px]">جاهز وصالح للرفع</span>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5 text-rose-600 font-black">
                                        <AlertCircle size={13} className="shrink-0" />
                                        <span className="text-[10px]">مرفوض ماليًا / هيكليًا</span>
                                      </div>
                                      {row.errors.map((err, i) => (
                                        <div key={i} className="text-[9px] font-mono text-rose-500 font-bold bg-rose-50 px-1 py-0.5 rounded leading-none">
                                          {err}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {row.warnings.length > 0 && (
                                    <div className="mt-1 space-y-1">
                                      {row.warnings.map((warn, i) => (
                                        <div key={i} className="text-[9px] text-amber-600 flex items-center gap-1">
                                          <span>💡 {warn}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 font-bold text-slate-700">{row.name}</td>
                                <td className="p-3 text-slate-500 font-medium">{row.grade || <span className="text-slate-300">-- لم يعيّن --</span>}</td>
                                <td className="p-3 space-y-0.5 text-slate-500">
                                  <div className="font-mono text-[10px]">{row.phone || <span className="text-slate-300">بلا هاتف</span>}</div>
                                  <div className="text-[10px] text-slate-400 font-medium">{row.email || <span className="text-slate-300">بلا بريد</span>}</div>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black ${row.gender === 'Female' ? 'bg-pink-50 text-pink-600 border border-pink-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                    {row.gender === 'Female' ? 'أنثى 🌸' : 'ذكر 👤'}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`inline-block w-4 h-4 rounded-full ${row.isOpenBalance ? 'bg-emerald-500 text-white flex items-center justify-center text-[10px]' : 'bg-slate-200'}`}>
                                    {row.isOpenBalance ? '✓' : ''}
                                  </span>
                                </td>
                                <td className="p-3 font-mono font-bold text-[#D4A33C]">₪ {row.initialBalance}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                        <button 
                          type="button"
                          onClick={handleImportJsonSubmit}
                          disabled={isImportingJson || !defaultTeacherForJsonImport || jsonPreviewData.every(s => !s.isValid)}
                          className="bg-slate-900 hover:bg-[#0D365A] disabled:opacity-30 disabled:cursor-not-allowed text-white px-6 py-3.5 rounded-xl text-xs font-black shadow-lg shadow-slate-200 transition-all flex items-center gap-2 cursor-pointer select-none border-none"
                        >
                          {isImportingJson ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>جاري إدراج ومعالجة كائنات الطلاب بـ Firestore...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={14} className="text-[#D4A33C]" />
                              <span>تأكيد واستيراد {jsonPreviewData.filter(s => s.isValid).length} طالباً الآن</span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
                  </section>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Automatic Critical Balance Warning Ticker Panel */}
            {criticalStudents.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-l from-rose-950 via-red-950 to-slate-900 border-2 border-rose-500/30 text-white rounded-3xl p-5 md:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 text-right relative overflow-hidden"
                dir="rtl"
              >
                <div className="absolute top-0 left-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-rose-500/20 text-rose-300 rounded-2xl border border-rose-500/30 shrink-0 mt-0.5 animate-pulse">
                    <AlertTriangle size={24} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] bg-rose-550 text-white px-2.5 py-0.5 rounded-full font-black animate-bounce">متابعة حرجة 🚨</span>
                      <span className="text-slate-400 text-xs font-bold">•</span>
                      <span className="text-slate-300 text-[10px] font-black">نظام التنبيه التلقائي للأرصدة</span>
                    </div>
                    <h4 className="text-sm font-black text-white">تنبيه ذكي: يوجد ({criticalStudents.length}) طلاب تجاوزوا عتبة الرصيد الحرجة والآمنة!</h4>
                    <p className="text-[11px] text-slate-350 font-medium leading-relaxed">
                      الطلاب المدرجون أدناه لديهم رصيد في رينج منخفض وأقل من الحد المقرر لهم. يرجى المسارعة في إرسال تذكير أو شحن الرصيد لضمان استمرار اللقاءات التعليمية دون توقف.
                    </p>
                    
                    {/* Horizontal scroll of critical student links */}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <span className="text-[10px] text-slate-400 font-bold">الطلاب المتأثرون:</span>
                      {criticalStudents.map((s, idx) => {
                        const sStats = getStudentStats(s.id);
                        return (
                          <button
                            key={`critical-${s.id}-${idx}`}
                            type="button"
                            onClick={() => {
                              setSelectedStudentId(s.id);
                              // Scroll into view
                              setTimeout(() => {
                                const el = document.getElementById(`student-detail-profile`);
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }, 305);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 hover:bg-rose-550/25 border border-rose-500/20 hover:border-rose-500/40 rounded-xl text-[10px] font-black text-rose-300 transition-all cursor-pointer"
                          >
                            <span>{s.name}</span>
                            <span className="font-mono text-white/90">({sStats.balance}₪)</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto self-stretch md:justify-center shrink-0">
                  <button
                    type="button"
                    onClick={() => openBulkWhatsAppModal('critical')}
                    className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 w-full md:w-40 shadow-lg shadow-emerald-950/25"
                  >
                    <MessageSquare size={13} className="animate-pulse" />
                    <span>تذكير جماعي واتساب 💬⚡</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduledModalInitialMode('create');
                      setScheduledModalTargetMode('critical');
                      setIsScheduledWhatsAppModalOpen(true);
                    }}
                    className="flex-1 md:flex-none px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 w-full md:w-40 shadow-sm border border-slate-700"
                    title="تحديد موعد مجدول لإرسال رسائل WhatsApp تلقائياً للطلاب الذين تجاوزوا العتبة الحرجة"
                  >
                    <Clock size={13} className="text-emerald-400" />
                    <span>جدولة موعد الإرسال ⏰</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBalanceStatusFilter('critical')}
                    className="flex-1 md:flex-none px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 w-full md:w-40"
                  >
                    <span>تصفية القائمة الآن</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Reset filters and search to show everyone, but highlight them
                      setBalanceStatusFilter('all');
                      setSearchTerm('');
                    }}
                    className="flex-1 md:flex-none px-4 py-2.5 bg-slate-850 hover:bg-slate-755 text-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer text-center w-full md:w-40"
                  >
                    عرض الكل مع التمييز
                  </button>
                </div>
              </motion.div>
            )}

            {/* Advanced Balance Triage Statistics & Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" dir="rtl" id="balance-filter-cards">
              
              {/* Card 1: All */}
              <button
                type="button"
                onClick={() => setBalanceStatusFilter('all')}
                className={`p-5 rounded-[2rem] border text-right transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-28 cursor-pointer select-none group hover:scale-[1.02] active:scale-[0.98] ${
                  balanceStatusFilter === 'all'
                    ? 'bg-slate-900 border-slate-900 text-white shadow-md shadow-slate-900/10'
                    : 'bg-white border-slate-200/80 hover:border-slate-350 text-slate-900 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${balanceStatusFilter === 'all' ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>الكل</span>
                  <Users size={16} className={balanceStatusFilter === 'all' ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-650'} />
                </div>
                <div>
                  <span className="text-xl font-black block font-mono">{balanceStats.totalCount} <span className="text-xs font-bold font-sans">طالب وطالبة</span></span>
                  <span className={`text-[9px] font-bold block ${balanceStatusFilter === 'all' ? 'text-slate-300' : 'text-slate-400'}`}>كامل الطلاب المسجلين</span>
                </div>
              </button>

              {/* Card 2: Prepaid/Dain */}
              <button
                type="button"
                onClick={() => setBalanceStatusFilter('positive')}
                className={`p-5 rounded-[2rem] border text-right transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-28 cursor-pointer select-none group hover:scale-[1.02] active:scale-[0.98] ${
                  balanceStatusFilter === 'positive'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/10'
                    : 'bg-emerald-50/15 border-emerald-100 hover:border-emerald-250 text-emerald-950 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${balanceStatusFilter === 'positive' ? 'bg-white/15 text-white' : 'bg-emerald-500/10 text-emerald-700'}`}>دائن (رصيد موجب) ✅</span>
                  <Wallet size={16} className={balanceStatusFilter === 'positive' ? 'text-white' : 'text-emerald-600'} />
                </div>
                <div>
                  <span className="text-xl font-black block font-mono">
                    {balanceStats.positiveCount} <span className="text-xs font-bold leading-none font-sans">طلاب - ₪{balanceStats.positiveSum.toFixed(0)}</span>
                  </span>
                  <span className={`text-[9px] font-bold block ${balanceStatusFilter === 'positive' ? 'text-emerald-100' : 'text-emerald-600/70'}`}>مجموع الأرصدة المدفوعة سلفاً</span>
                </div>
              </button>

              {/* Card 3: Debt/Madin */}
              <button
                type="button"
                onClick={() => setBalanceStatusFilter('negative')}
                className={`p-5 rounded-[2rem] border text-right transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-28 cursor-pointer select-none group hover:scale-[1.02] active:scale-[0.98] ${
                  balanceStatusFilter === 'negative'
                    ? 'bg-rose-600 border-rose-600 text-white shadow-md shadow-rose-600/10'
                    : 'bg-rose-50/15 border-rose-100 hover:border-rose-250 text-rose-950 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${balanceStatusFilter === 'negative' ? 'bg-white/15 text-white' : 'bg-rose-500/10 text-rose-700'}`}>مدين (ذمم سداد) 💸</span>
                  <DollarSign size={16} className={balanceStatusFilter === 'negative' ? 'text-white' : 'text-rose-600'} />
                </div>
                <div>
                  <span className="text-xl font-black block font-mono">
                    {balanceStats.negativeCount} <span className="text-xs font-bold leading-none font-sans">طلاب - ₪{balanceStats.negativeSum.toFixed(0)}</span>
                  </span>
                  <span className={`text-[9px] font-bold block ${balanceStatusFilter === 'negative' ? 'text-rose-100' : 'text-rose-600/70'}`}>مستحقات سداد مطلوبة</span>
                </div>
              </button>

              {/* Card 4: Settle/Zero */}
              <button
                type="button"
                onClick={() => setBalanceStatusFilter('zero')}
                className={`p-5 rounded-[2rem] border text-right transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-28 cursor-pointer select-none group hover:scale-[1.02] active:scale-[0.98] ${
                  balanceStatusFilter === 'zero'
                    ? 'bg-slate-700 border-slate-700 text-white shadow-md shadow-slate-750/10'
                    : 'bg-slate-50 border-slate-200/80 hover:border-slate-300 text-slate-800 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${balanceStatusFilter === 'zero' ? 'bg-white/15 text-white' : 'bg-slate-200/60 text-slate-600'}`}>رصيد صفر (مُسوّى)</span>
                  <CheckCircle2 size={16} className={balanceStatusFilter === 'zero' ? 'text-white' : 'text-slate-500'} />
                </div>
                <div>
                  <span className="text-xl font-black block font-mono">{balanceStats.zeroCount} <span className="text-xs font-bold font-sans">طالب وطالبة</span></span>
                  <span className={`text-[9px] font-bold block ${balanceStatusFilter === 'zero' ? 'text-slate-205' : 'text-slate-400'}`}>حسابات مصفّرة بالكامل</span>
                </div>
              </button>

              {/* Card 5: Critical/Alert */}
              <button
                type="button"
                onClick={() => setBalanceStatusFilter('critical')}
                className={`p-5 rounded-[2rem] border text-right transition-all duration-300 relative overflow-hidden flex flex-col justify-between h-28 cursor-pointer select-none group hover:scale-[1.02] active:scale-[0.98] ${
                  balanceStatusFilter === 'critical'
                    ? 'bg-amber-500 border-amber-500 text-slate-950 shadow-md shadow-amber-500/10 font-black'
                    : 'bg-amber-50/15 border-amber-100 hover:border-amber-250 text-amber-950 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${balanceStatusFilter === 'critical' ? 'bg-slate-950/10 text-slate-950' : 'bg-amber-500/10 text-amber-700'}`}>رصيد حرج وتحت السقف ⚠️</span>
                  <AlertTriangle size={16} className={balanceStatusFilter === 'critical' ? 'text-slate-950' : 'text-amber-600'} />
                </div>
                <div>
                  <span className="text-xl font-black block font-mono">{balanceStats.criticalCount} <span className="text-xs font-bold font-sans">طالب خطر</span></span>
                  <span className={`text-[9px] font-black block ${balanceStatusFilter === 'critical' ? 'text-slate-900/80' : 'text-amber-700/60'}`}>تجاوزوا حدود عتبة الأمان</span>
                </div>
              </button>

            </div>

            {/* Critical Debt Limit Exceeded WhatsApp Banner */}
            {overDebtLimitStudents.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-rose-950 via-red-900 to-slate-950 border-2 border-rose-500/60 text-white rounded-3xl p-5 md:p-6 shadow-2xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5 text-right relative overflow-hidden"
                dir="rtl"
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-start gap-4">
                  <div className="w-13 h-13 rounded-2xl bg-rose-500/30 text-rose-200 border border-rose-400/40 flex items-center justify-center shrink-0 shadow-lg ring-4 ring-rose-500/10">
                    <AlertOctagon size={26} className="text-amber-300 animate-bounce" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] bg-rose-600 text-white px-3 py-0.5 rounded-full font-black animate-pulse">
                        🚨 تجاوز سقف الدين المسموح به
                      </span>
                      <span className="text-rose-300 text-xs font-bold">•</span>
                      <span className="text-rose-200 text-xs font-black">
                        {overDebtLimitStudents.length} طلاب تجاوزوا حد الدين المسموح
                      </span>
                      <span className="text-rose-300 text-xs font-bold">•</span>
                      <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-lg text-slate-300 font-bold">
                        سقف الأمان العام: {allowedDebtLimitThreshold} ₪
                      </span>
                    </div>
                    <h4 className="text-base font-black text-white">
                      معالج إرسال تذكيرات مجمعة عبر WhatsApp لمتجاوزي سقف الدين مع نصوص مخصصة 📲⚡
                    </h4>
                    <p className="text-[11px] text-slate-200 font-medium leading-relaxed max-w-2xl">
                      يتيح للمدير مراجعة وتعديل نص رسالة الواتساب الموجهة لولي أمر كل طالب على حدة قبل الإرسال، مع حساب دقيق للرصيد والذمة ومقدار التجاوز وسقف الدين المعتمد.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    id="banner-over-debt-bulk-whatsapp-btn"
                    onClick={() => openBulkWhatsAppModal('over_debt_limit')}
                    className="flex-1 sm:flex-none px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white font-black text-xs rounded-2xl shadow-xl shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer border border-emerald-400"
                  >
                    <MessageSquare size={16} className="animate-pulse" />
                    <span>إرسال التذكيرات المجمعة لمتجاوزي الدين ({overDebtLimitStudents.length}) 💬🚀</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduledModalInitialMode('create');
                      setScheduledModalTargetMode('over_debt_limit');
                      setIsScheduledWhatsAppModalOpen(true);
                    }}
                    className="px-4 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700"
                    title="جدولة إرسال تذكيرات تجاوز حد الدين في وقت محدد"
                  >
                    <Clock size={15} className="text-emerald-400" />
                    <span>جدولة الموعد ⏰</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Direct WhatsApp Payment Reminders Banner for Negative Balances */}
            {balanceStats.negativeCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 border border-rose-500/30 text-white rounded-3xl p-5 md:p-6 shadow-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5 text-right relative overflow-hidden"
                dir="rtl"
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-lg">
                    <MessageSquare size={22} className="animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] bg-rose-600 text-white px-2.5 py-0.5 rounded-full font-black">
                        التحصيل والذمم المالية 💸
                      </span>
                      <span className="text-slate-400 text-xs font-bold">•</span>
                      <span className="text-rose-200 text-xs font-black">
                        {balanceStats.negativeCount} طلاب برصيد سالب (مجموع الذمم: ₪{balanceStats.negativeSum.toLocaleString()})
                      </span>
                    </div>
                    <h4 className="text-sm md:text-base font-black text-white">
                      معالج إرسال تذكيرات الدفع المجمعة عبر WhatsApp للطلاب ذوي الأرصدة السالبة 📲
                    </h4>
                    <p className="text-[11px] text-slate-300 font-medium leading-relaxed max-w-2xl">
                      أرسل رسائل تذكير فورية وودية مجهزة بكافة تفاصيل الساعات والذمم لمساعدة أولياء الأمور على تسوية الأرصدة وشحن المحفظة بضغطة زر واحدة.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={() => openBulkWhatsAppModal('negative')}
                    className="flex-1 sm:flex-none px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-950/30 flex items-center justify-center gap-2 transition-all cursor-pointer border border-emerald-500"
                  >
                    <MessageSquare size={16} className="animate-pulse" />
                    <span>إرسال تذكيرات سداد مجمعة عبر WhatsApp ({negativeStudents.length}) 💬⚡</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduledModalInitialMode('create');
                      setScheduledModalTargetMode('negative');
                      setIsScheduledWhatsAppModalOpen(true);
                    }}
                    className="px-4 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer border border-slate-700"
                    title="جدولة إرسال تذكيرات سداد WhatsApp في تاريخ ووقت محددين"
                  >
                    <Clock size={15} className="text-emerald-400" />
                    <span>جدولة موعد الإرسال ⏰</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBalanceStatusFilter('negative')}
                    className="px-4 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer"
                  >
                    عرض قائمة المدينين
                  </button>
                </div>
              </motion.div>
            )}

            {/* Roster Table of Students */}
            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full xl:w-auto">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase leading-none">
                      {archiveTab === 'active' 
                        ? 'سجل وبيانات طلاب الأكاديمية' 
                        : archiveTab === 'pending' 
                        ? 'طلبات التسجيل الإلكتروني الجديدة 📥' 
                        : 'أرشيف الطلاب غير النشطين 🗄️'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-2">
                      {archiveTab === 'active' 
                        ? 'إجمالي الطلاب النشطين: ' 
                        : archiveTab === 'pending' 
                        ? 'إجمالي الطلبات قيد الانتظار: ' 
                        : 'إجمالي الطلاب المؤرشفين: '}
                      {students.filter(s => {
                        const isArchived = s.archived === true;
                        const isPending = s.status === StudentStatus.Pending;
                        if (archiveTab === 'active') return !isArchived && !isPending;
                        if (archiveTab === 'archived') return isArchived;
                        return !isArchived && isPending;
                      }).length} | المطابق للبحث والتصفية: {filteredStudents.length}
                    </p>
                  </div>
                  
                  <div className="flex bg-slate-200/60 p-1 rounded-xl shrink-0 self-start sm:self-auto" dir="rtl">
                    <button
                      type="button"
                      onClick={() => {
                        setArchiveTab('active');
                        setBalanceStatusFilter('all');
                      }}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                        archiveTab === 'active'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-850'
                      }`}
                    >
                      <Users size={13} className="text-[#D4A33C]" />
                      <span>النشطين ({students.filter(s => s.archived !== true && s.status !== StudentStatus.Pending).length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setArchiveTab('pending');
                        setBalanceStatusFilter('all');
                      }}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                        archiveTab === 'pending'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-850'
                      }`}
                    >
                      <UserPlus size={13} className="text-indigo-600" />
                      <span>الطلبات الواردة ({students.filter(s => s.archived !== true && s.status === StudentStatus.Pending).length}) 📥</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setArchiveTab('archived');
                        setBalanceStatusFilter('all');
                      }}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                        archiveTab === 'archived'
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-500 hover:text-slate-850'
                      }`}
                    >
                      <Archive size={13} className="text-[#D4A33C]" />
                      <span>الأرشيف ({students.filter(s => s.archived === true).length})</span>
                    </button>
                  </div>
                </div>
                
                <div className="w-full xl:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  {/* Over Debt Limit Bulk WhatsApp Reminder Button */}
                  <button
                    type="button"
                    id="open-over-debt-limit-whatsapp-btn"
                    onClick={() => openBulkWhatsAppModal('over_debt_limit')}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-700 to-red-800 hover:from-rose-800 hover:to-red-900 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-rose-700/20 active:scale-[0.98] select-none text-center whitespace-nowrap border border-rose-600"
                    dir="rtl"
                    title="إرسال تذكير مجمع عبر واتس آب لجميع الطلاب الذين تجاوز رصيدهم حد الدين المسموح، مع نص مخصص لكل طالب"
                  >
                    <AlertOctagon size={14} className="text-amber-300 animate-pulse" />
                    <span>تذكير متجاوزي حد الدين ({overDebtLimitStudents.length}) 🚨</span>
                  </button>

                  {/* WhatsApp Custom Templates & Message Modal Button */}
                  <button
                    type="button"
                    id="open-whatsapp-template-sender-btn"
                    onClick={() => {
                      openSingleAlertModal(null, false, 'low_balance_renewal');
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-600/20 active:scale-[0.98] select-none text-center whitespace-nowrap border border-emerald-500"
                    dir="rtl"
                    title="نافذة إرسال قوالب رسائل واتساب المخصصة (مثل قالب انخفاض الرصيد) وتعديلها قبل الإرسال مباشرة لولي الأمر"
                  >
                    <MessageSquare size={14} className="text-white" />
                    <span>قوالب رسائل واتس آب 💬</span>
                  </button>

                  {/* Scheduled WhatsApp Reminders Manager Button */}
                  <button
                    type="button"
                    id="scheduled-whatsapp-reminders-btn"
                    onClick={() => {
                      setScheduledModalInitialMode('list');
                      setIsScheduledWhatsAppModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-slate-900/10 active:scale-[0.98] select-none text-center whitespace-nowrap border border-slate-700"
                    dir="rtl"
                    title="إدارة وجدولة رسائل WhatsApp التذكيرية للطلاب ذوي الأرصدة المنخفضة والذمم المالية"
                  >
                    <Clock size={14} className="text-emerald-400" />
                    <span>جدولة تذكيرات WhatsApp ⏰</span>
                    {pendingScheduledCount > 0 && (
                      <span className="px-2 py-0.2 rounded-full bg-emerald-500 text-white text-[10px] font-black">
                        {pendingScheduledCount}
                      </span>
                    )}
                  </button>

                  {/* Unified Payments Management Modal Trigger */}
                  <button
                    type="button"
                    id="open-unified-payments-manager-btn"
                    onClick={() => {
                      if (onOpenPaymentsManager) {
                        onOpenPaymentsManager();
                      } else {
                        setIsPaymentsManagerModalOpen(true);
                      }
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-[0.98] select-none text-center whitespace-nowrap border border-amber-300"
                    dir="rtl"
                    title="إدارة وتعديل وحذف دفعات الطلاب ومستحقات المعلمين المركزية"
                  >
                    <CreditCard size={15} />
                    <span>إدارة وتعديل الدفعات 💳</span>
                  </button>

                  {/* Export Professional Student & Financial Reports to PDF */}
                  <button
                    type="button"
                    id="open-financial-reports-pdf-modal-btn"
                    onClick={() => openReportsModal(null, 'collective')}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-[#0D365A] to-[#16436e] hover:from-[#09253f] hover:to-[#0D365A] text-[#D4A33C] hover:text-amber-200 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-[#0D365A]/20 active:scale-[0.98] select-none text-center whitespace-nowrap border border-[#D4A33C]/40"
                    dir="rtl"
                    title="تصدير تقارير الطلاب والمالية إلى PDF بتصميم احترافي معتمد يدعم العربية للطباعة والإرسال لأولياء الأمور"
                  >
                    <FileText size={15} className="text-[#D4A33C]" />
                    <span>تقارير الطلاب والمالية (PDF) 📑</span>
                  </button>

                  {/* Export Students Data to PDF */}
                  <button
                    type="button"
                    id="export-students-data-pdf-btn"
                    onClick={exportStudentListToPDF}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-rose-600/10 active:scale-[0.98] select-none text-center whitespace-nowrap"
                    dir="rtl"
                    title="تصدير قائمة بيانات الطلاب وتفاصيل الاتصال الخاصة بهم إلى ملف PDF رسمي قابل للطباعة والتنزيل"
                  >
                    <FileText size={14} />
                    <span>تصدير بيانات الطلاب (PDF) 📄</span>
                  </button>

                  {/* Export Filtered Data to Excel */}
                  <button
                    type="button"
                    onClick={exportFilteredStudentsToExcel}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-emerald-600/10 active:scale-[0.98] select-none text-center whitespace-nowrap"
                    dir="rtl"
                  >
                    <FileSpreadsheet size={14} />
                    <span>تصدير المفلتر للاكسل (Excel)</span>
                  </button>

                  {/* Export All Student Financial Balances & Debts Report to PDF */}
                  <button
                    type="button"
                    id="export-students-financial-pdf-btn"
                    onClick={() => setIsFinancialBalancesPdfModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-emerald-700/20 active:scale-[0.98] select-none text-center whitespace-nowrap"
                    dir="rtl"
                    title="تصدير تقرير مالي رسمي لجميع الطلاب يحتوي على إجمالي المديونيات والمستحقات بصيغة PDF"
                  >
                    <FileDown size={14} className="text-amber-300" />
                    <span>تصدير تقرير مالي (PDF) 📄</span>
                  </button>

                  {/* Export All Student Balances & Debts to Excel */}
                  <button
                    type="button"
                    onClick={exportAllStudentsBalancesToExcel}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-[#0D365A] hover:bg-[#09253f] text-[#D4A33C] hover:text-amber-300 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-slate-900/10 active:scale-[0.98] select-none text-center whitespace-nowrap"
                    dir="rtl"
                    title="تصدير كشف شامل بكافة أرصدة وديون الطلاب الحالية لملف Excel"
                  >
                    <FileSpreadsheet size={14} />
                    <span>تصدير أرصدة الطلاب والديون (Excel) 💰</span>
                  </button>

                  {/* Export All Students Full Data Backup to CSV */}
                  <button
                    type="button"
                    onClick={exportAllStudentsToCSV}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-indigo-600/10 active:scale-[0.98] select-none text-center whitespace-nowrap"
                    dir="rtl"
                    title="تصدير نسخة احتياطية شاملة لكافة بيانات الطلاب وملفاتهم بصيغة ملف CSV"
                  >
                    <FileText size={14} />
                    <span>تصدير نسخة احتياطية (CSV) 📥</span>
                  </button>

                  {/* Smart Auto-Archive Inactive Students Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInactiveIds(inactiveStudentsList.map(item => item.student.id));
                      setIsAutoArchiveModalOpen(true);
                    }}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-[0.98] select-none text-center whitespace-nowrap ${
                      inactiveStudentsList.length > 0
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20 ring-2 ring-amber-400/40'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                    dir="rtl"
                    title="فحص وأرشفة الطلاب الذين لم يسجلوا أي نشاط أو حصص لأكثر من 6 أشهر"
                  >
                    <Archive size={14} />
                    <span>أرشفة الخاملين (+6 أشهر) 🧹</span>
                    {inactiveStudentsList.length > 0 && (
                      <span className="px-2 py-0.2 rounded-full bg-slate-950 text-amber-400 text-[10px] font-black">
                        {inactiveStudentsList.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Dynamic Notification Banner for Archive/Restore Actions */}
              {archiveNotification && (
                <div className="mx-6 mt-4 p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300"
                  style={{
                    backgroundColor: archiveNotification.type === 'archived' ? '#FFFBEB' : '#ECFDF5',
                    borderColor: archiveNotification.type === 'archived' ? '#FDE68A' : '#A7F3D0'
                  }}
                  dir="rtl"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      archiveNotification.type === 'archived' ? 'bg-amber-500 text-slate-950' : 'bg-emerald-600 text-white'
                    }`}>
                      {archiveNotification.type === 'archived' ? <Archive size={17} /> : <RotateCcw size={17} />}
                    </div>
                    <div>
                      <p className={`text-xs font-black ${archiveNotification.type === 'archived' ? 'text-amber-950' : 'text-emerald-950'}`}>
                        {archiveNotification.type === 'archived'
                          ? `📁 تم نقل الطالب "${archiveNotification.studentName}" إلى الأرشيف بنجاح مع حفظ كامل سجلاته`
                          : `🟢 تمت استعادة وتنشيط حساب الطالب "${archiveNotification.studentName}" بنجاح وإعادته لقائمة الطلاب النشطين`}
                      </p>
                      <p className="text-[11px] text-slate-650 font-bold mt-0.5">
                        {archiveNotification.type === 'archived'
                          ? 'كافة سجلات الحصص والرصيد المالي محفوظة بأمان 100%. يمكنك استعادته في أي وقت إذا عاد للدراسة.'
                          : 'أصبح حساب الطالب نشطاً الآن وجاهزاً لتسجيل الحصص بكامل بياناته ورصيده السابقة.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {archiveNotification.type === 'archived' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setArchiveTab('archived');
                          setArchiveNotification(null);
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
                      >
                        عرض الأرشيف 📂
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setArchiveTab('active');
                          setArchiveNotification(null);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
                      >
                        عرض في النشطين 👥
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setArchiveNotification(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}

              {archiveTab === 'pending' && (
                <div className="mx-6 mt-6 p-6 bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-150 rounded-[1.5rem] text-right space-y-4" dir="rtl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-indigo-950 flex items-center gap-1.5">
                        <span>🔗 رابط استمارة التسجيل الإلكتروني للطلاب الجدد</span>
                        <span className="text-[10px] bg-indigo-650 text-white py-0.5 px-2.5 rounded-full font-bold">بوابة الالتحاق الذاتي 🌱</span>
                      </h4>
                      <p className="text-[11px] text-indigo-750 font-bold">
                        انسخ هذا الرابط وشاركه مع أولياء الأمور أو الطلاب الجدد. يقوم الطالب بتعبئة اسمه ورقم هاتفه والصف والمواد المطلوبة، لتظهر لك الاستمارة هنا فوراً كطلب معلق لمعالجته وتنسيبه.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 py-1 px-3 rounded-lg">الرابط متصل ومفعّل فوري ⚡</span>
                    </div>
                  </div>

                  <div className="flex items-stretch gap-2 max-w-2xl bg-white border border-indigo-200/60 rounded-xl overflow-hidden p-1">
                    <input
                      type="text"
                      readOnly
                      value={getRegistrationLink()}
                      className="flex-1 bg-transparent px-3 text-xs font-mono font-bold text-slate-800 select-all outline-none text-left"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(getRegistrationLink());
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 3000);
                      }}
                      className={`px-5 py-2.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95 shadow-sm ${
                        copiedLink
                          ? 'bg-emerald-600 text-white'
                          : 'bg-indigo-650 hover:bg-indigo-750 text-white'
                      }`}
                    >
                      {copiedLink ? (
                        <>
                          <span>تم النسخ بنجاح! ✓</span>
                        </>
                      ) : (
                        <>
                          <span>نسخ الرابط 📋</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* 🧹 Smart Auto-Archive Recommendation Banner for Inactive Students (>6 months) */}
              {archiveTab === 'active' && inactiveStudentsList.length > 0 && (
                <div className="mx-6 mt-6 p-5 bg-gradient-to-r from-amber-500/10 via-amber-50/80 to-orange-500/10 border border-amber-300/80 rounded-2xl text-right flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm" dir="rtl">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-800 shrink-0 shadow-xs">
                      <Archive size={22} className="animate-bounce" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
                          <span>نظام الأرشفة الذكية وتنظيف القائمة النشطة</span>
                          <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black shadow-xs">
                            {inactiveStudentsList.length} طالب خامل
                          </span>
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-650 font-bold mt-1 leading-relaxed">
                        تم رصد <strong className="text-amber-900">{inactiveStudentsList.length} طلاب</strong> في القائمة النشطة لم يسجلوا أي نشاط أو حصص في النظام منذ أكثر من <strong className="text-amber-900">6 أشهر</strong> (+180 يوم). يمكنك نقلهم للأرشيف بنقرة واحدة لتنظيف القائمة مع حفظ بياناتهم.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedInactiveIds(inactiveStudentsList.map(item => item.student.id));
                        setIsAutoArchiveModalOpen(true);
                      }}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer whitespace-nowrap"
                    >
                      <Sparkles size={14} />
                      <span>معالجة وأرشفة الطلاب ({inactiveStudentsList.length}) ⚡</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAcademicStatusFilter(academicStatusFilter === 'inactive_6m' ? 'all' : 'inactive_6m')}
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black transition-all border cursor-pointer whitespace-nowrap ${
                        academicStatusFilter === 'inactive_6m'
                          ? 'bg-[#1A365D] text-white border-[#1A365D]'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-2xs'
                      }`}
                    >
                      <Filter size={13} />
                      <span>{academicStatusFilter === 'inactive_6m' ? 'إلغاء التصفية' : 'عرضهم بالجدول 🔍'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 🗄️ Informative Banner for Archived Students Tab */}
              {archiveTab === 'archived' && (
                <div className="mx-6 mt-6 p-5 bg-gradient-to-r from-amber-500/10 via-amber-50/70 to-orange-500/10 border border-amber-300/80 rounded-2xl text-right flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-sm" dir="rtl">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-800 shrink-0 shadow-xs">
                      <Archive size={22} />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                        <span>أرشيف الطلاب غير النشطين 🗄️</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black shadow-xs">
                          {students.filter(s => s.archived === true).length} طالب محفوظ
                        </span>
                      </h4>
                      <p className="text-[11px] text-slate-650 font-bold mt-1 leading-relaxed">
                        جميع السجلات المالية والأكاديمية والحصص والمدفوعات محفوظة بالكامل بأمان وبدون أي حذف. عند عودة أي طالب للدراسة في المركز، انقر على زر <strong>"استعادة للدراسة 🔄"</strong> لتنشيط حسابه فوراً مع كامل بياناته ورصيده السابقة!
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setArchiveTab('active')}
                      className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-amber-300/70 text-slate-800 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center gap-1.5"
                    >
                      <Users size={13} className="text-[#D4A33C]" />
                      <span>العودة لقائمة النشطين</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ⚠️ Duplicate Students Detection & Merge Hub Banner */}
              {duplicateGroups.length > 0 && isCurrentUserManager && (
                <div className="mx-6 mt-4 p-4 bg-gradient-to-r from-amber-500/15 via-amber-50 to-rose-50 border-2 border-amber-400 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm" dir="rtl">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black flex-shrink-0 shadow-md">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-black text-slate-900 text-sm md:text-base">
                          تنبيه تكرار: تم رصد {duplicateGroups.length} طالب لديهم سجلات متكررة بنفس الاسم ورقم الهاتف!
                        </h4>
                        <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 text-xs font-black rounded-full shadow-2xs">
                          {totalDuplicateRedundantCount} سجل إضافي
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-bold mt-1">
                        وفقاً لتعليمات النظام، لا يُسمح بتكرار الاسم ورقم الهاتف. يمكنك توحيد بيانات الطلاب المكررين وحذف النسخ الإضافية بضغطة زر واحدة بأمان تام.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsDuplicateModalOpen(true)}
                      className="w-full md:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Sparkles size={16} />
                      <span>فحص ودمج السجلات المكررة ({totalDuplicateRedundantCount}) 🧹</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 🔍 Advanced Student Search Bar & Filter Hub */}
              <StudentAdvancedSearchBar
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                searchCriteria={searchCriteria}
                setSearchCriteria={setSearchCriteria}
                academicStageFilter={academicStageFilter}
                setAcademicStageFilter={setAcademicStageFilter}
                gradeFilter={gradeFilter}
                setGradeFilter={setGradeFilter}
                uniqueGrades={uniqueGrades}
                totalFilteredCount={filteredStudents.length}
                totalStudentsCount={students.filter(s => (s.archived === true) === (archiveTab === 'archived')).length}
                isAdvancedFiltersVisible={isAdvancedFiltersVisible}
                setIsAdvancedFiltersVisible={setIsAdvancedFiltersVisible}
                teacherFilter={teacherFilter}
                setTeacherFilter={setTeacherFilter}
                balanceStatusFilter={balanceStatusFilter}
                setBalanceStatusFilter={setBalanceStatusFilter}
                courseTypeFilter={courseTypeFilter}
                setCourseTypeFilter={setCourseTypeFilter}
                assignmentStatusFilter={assignmentStatusFilter}
                setAssignmentStatusFilter={setAssignmentStatusFilter}
                academicStatusFilter={academicStatusFilter}
                setAcademicStatusFilter={setAcademicStatusFilter}
                teachers={teachers}
                courseTypeStats={courseTypeStats}
                balanceStats={balanceStats}
                inactiveCount={inactiveStudentsList.length}
                trialMatchesCount={matchingTrialLessons.length}
                onViewTrialMatches={() => {
                  const el = document.getElementById('search-trial-matches-banner');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                onResetAllFilters={handleResetAllFilters}
              />

              {/* ⚡ Matching Trial Lessons Section (نتائج الحصص التجريبية في المنصة) */}
              {searchTerm.trim() && matchingTrialLessons.length > 0 && (
                <div id="search-trial-matches-banner" className="mx-4 sm:mx-6 my-4 p-5 sm:p-6 bg-gradient-to-r from-purple-900/90 via-indigo-950 to-slate-900 text-white rounded-3xl border-2 border-purple-400/40 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2" dir="rtl">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-purple-500/30 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-amber-300 shrink-0">
                        <Sparkles size={20} className="animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white flex items-center gap-2">
                          <span>نتائج مطابقة في الحصص التجريبية واللقاءات التمهيدية</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-black shadow-xs">
                            {matchingTrialLessons.length} لقاء تجريبي
                          </span>
                        </h4>
                        <p className="text-[11px] text-purple-200/80 font-bold mt-0.5">
                          تم العثور على طلبات أو حصص تجريبية تطابق بحثك "{searchTerm}" في قاعدة بيانات الحصص التجريبية للنظام
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem('focus-trial-lesson-search', searchTerm);
                        window.dispatchEvent(new CustomEvent('switch-manager-tab', { detail: { tab: 'trials' } }));
                      }}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm flex items-center gap-1.5 self-end sm:self-auto shrink-0"
                    >
                      <span>فتح قسم الحصص التجريبية 🚀</span>
                      <ArrowRight size={13} className="rotate-180" />
                    </button>
                  </div>

                  {/* Grid of matching trial cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {matchingTrialLessons.map((trial, tIdx) => (
                      <div
                        key={`trial-match-${trial.id || tIdx}-${tIdx}`}
                        className="bg-white/10 hover:bg-white/15 border border-purple-400/30 rounded-2xl p-4 transition-all text-right space-y-2.5 backdrop-blur-xs flex flex-col justify-between"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-black text-white">
                              {highlightText(trial.studentName, searchTerm)}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${
                              trial.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                            }`}>
                              {trial.status === 'completed' ? 'حصة مكتملة ✓' : 'حصة قيد الانتظار ⏳'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-purple-200">
                            {trial.grade && (
                              <span className="bg-purple-800/60 px-2 py-0.5 rounded-md border border-purple-600/40">
                                🎓 {trial.grade}
                              </span>
                            )}
                            {trial.subject && (
                              <span className="bg-indigo-800/60 px-2 py-0.5 rounded-md border border-indigo-600/40">
                                📚 {trial.subject}
                              </span>
                            )}
                          </div>

                          {trial.topic && (
                            <p className="text-[10px] text-slate-300 line-clamp-1 font-medium">
                              📝 الموضوع: {trial.topic}
                            </p>
                          )}

                          <div className="text-[11px] font-bold text-slate-200 pt-1 flex items-center justify-between">
                            <span>👨‍🏫 المعلم: <strong className="text-white">{trial.teacherName || 'غير محدد'}</strong></span>
                            {trial.phone && (
                              <span className="font-mono text-xs text-purple-300" dir="ltr">{trial.phone}</span>
                            )}
                          </div>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="pt-2 border-t border-purple-400/20 flex items-center justify-between gap-2">
                          {trial.phone && (
                            <button
                              type="button"
                              onClick={() => openWhatsAppChat(trial.phone, `مرحباً بك ولي أمر الطالب ${trial.studentName} بخصوص الحصة التجريبية في أكاديمية التفوق أون لاين.`)}
                              className="p-2 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-xl transition-all cursor-pointer"
                              title="محادثة واتساب لولي الأمر"
                            >
                              <MessageSquare size={14} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              // Pre-fill quick add / activation with this trial's details
                              setQuickName(trial.studentName || '');
                              setQuickGrade(trial.grade || '');
                              setQuickPhone(trial.phone || '');
                              if (trial.teacherId) setQuickTeacher(trial.teacherId);
                              setIsQuickAddModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-[11px] transition-all cursor-pointer shadow-xs flex-1 text-center"
                          >
                            تثبيت كطالب مسجل ⚡
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              localStorage.setItem('focus-trial-lesson-search', trial.studentName || trial.phone || '');
                              window.dispatchEvent(new CustomEvent('switch-manager-tab', { detail: { tab: 'trials' } }));
                            }}
                            className="px-2.5 py-1.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-xl text-[11px] transition-all cursor-pointer"
                          >
                            تفاصيل 🔎
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto text-right">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase min-w-[240px] w-[30%]">اسم الطالب الكامل</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">
                        {archiveTab === 'pending' ? 'المواد المطلوبة وملاحظات التسجيل' : 'الأساتذة المنسقين'}
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">
                        {archiveTab === 'pending' ? 'تاريخ تقديم الطلب' : 'الحصص المتبقية'}
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">
                        {archiveTab === 'pending' ? 'الحصة التجريبية' : 'ساعات الحضور المنجزة'}
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">حالة الطالب</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase">التحكم والمعالجة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-16 text-center">
                          {matchingTrialLessons.length > 0 ? (
                            <div className="space-y-3 max-w-md mx-auto">
                              <Sparkles size={40} className="text-purple-500 mx-auto animate-pulse" />
                              <h4 className="text-sm font-black text-slate-800">
                                تم العثور على ({matchingTrialLessons.length}) في الحصص التجريبية!
                              </h4>
                              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                                لا يوجد طالب مسجل نهائي يطابق "{searchTerm}"، ولكن تم العثور على الطالب في سجلات الحصص التجريبية واللقاءات التمهيدية المعروضة بالأعلى.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  const el = document.getElementById('search-trial-matches-banner');
                                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                                }}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm inline-flex items-center gap-1.5"
                              >
                                <span>معاينة نتائج الحصص التجريبية ⚡</span>
                              </button>
                            </div>
                          ) : (
                            <>
                              <GraduationCap size={40} className="text-slate-100 mx-auto mb-4" />
                              <p className="text-xs font-black text-slate-400">
                                {searchTerm ? `لا توجد نتائج مطابقة لـ "${searchTerm}" في الطلاب المسجلين أو الحصص التجريبية` : 'لا يوجد طلاب مسجلين في الوقت الحالي'}
                              </p>
                            </>
                          )}
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student, idx) => {
                        const stats = getStudentStats(student.id);
                        const isCritical = stats.balance < (typeof student.lowBalanceThreshold === 'number' ? student.lowBalanceThreshold : lowBalanceThreshold);
                        const remInfo = getRemainingSessionsInfo(student, stats.balance);
                        const isWarningSessions = remInfo.sessions === 1 || remInfo.sessions === 2;
                        return (
                          <tr 
                            key={`student-row-${student.id}-${idx}`} 
                            id="students-table-row"
                            onClick={() => setSelectedStudentId(student.id)}
                            className={`transition-all cursor-pointer group border-r-4 ${
                              isCritical 
                                ? 'bg-red-50/45 hover:bg-red-100/40 border-r-red-500 shadow-xs' 
                                : isWarningSessions
                                ? 'bg-amber-50/80 hover:bg-amber-100/70 border-r-amber-400 shadow-xs'
                                : 'hover:bg-amber-500/5 border-r-transparent'
                            }`}
                          >
                            <td className="px-6 py-4 min-w-[240px]">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-black text-xs group-hover:bg-[#D4A33C] group-hover:text-slate-950 transition-all shrink-0">
                                  {student.name.charAt(0)}
                                </div>
                                <div className="flex flex-col text-right min-w-0">
                                  <div className="flex items-center flex-wrap gap-1.5">
                                    <span className="text-sm font-black text-slate-900 leading-snug whitespace-normal break-words">{highlightText(student.name, searchTerm)}</span>
                                    {(student.phone || student.phoneNumber) && (
                                      <button
                                        type="button"
                                        onClick={(e) => handleQuickWhatsAppBalance(student, e)}
                                        className="inline-flex items-center justify-center p-1.5 rounded-full text-emerald-600 hover:text-[#25D366] hover:bg-[#25D366]/10 hover:scale-125 active:scale-90 transition-all duration-300 cursor-pointer shrink-0 shadow-3xs hover:shadow-emerald-100"
                                        title="إرسال تذكير مالي"
                                      >
                                        <MessageSquare size={13} className="stroke-[2.5] transition-transform duration-300 group-hover/btn:rotate-12" />
                                      </button>
                                    )}
                                    {(() => {
                                      const studentTrial = trialLessons.find(tl => tl.migratedToStudentId === student.id || tl.phone === student.phone || tl.studentName === student.name);
                                      if (studentTrial) {
                                        return (
                                          <span 
                                            className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black leading-none" 
                                            title="هذا الطالب مسجل في الأساس كحصة تجريبية وتم ترحيله بنجاح"
                                          >
                                            تجريبية 🧪
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}
                                    {stats.balance < (typeof student.lowBalanceThreshold === 'number' ? student.lowBalanceThreshold : lowBalanceThreshold) && (
                                      <AlertTriangle 
                                        size={14} 
                                        className="text-amber-500 shrink-0 select-none animate-pulse" 
                                        title="تحذير: رصيد هذا الطالب أقل من الحد الأدنى!"
                                      />
                                    )}
                                    {(student.grade || student.academicLevel) && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100/50 text-[9px] font-black leading-none" title="المستوى الأكاديمي / الصف">
                                        {highlightText(student.grade || student.academicLevel || '', searchTerm)}
                                      </span>
                                    )}
                                    {archiveTab === 'active' && (() => {
                                      const inact = getStudentInactivityInfo(student);
                                      if (inact.isInactiveOver6Months) {
                                        return (
                                          <span 
                                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-900 border border-amber-300 text-[9px] font-black leading-none" 
                                            title={`خامل لأكثر من 6 أشهر (${inact.daysInactive} يوماً) - ${inact.latestActivityText}`}
                                          >
                                            <span>خامل (+6 أشهر) 💤</span>
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}
                                  </div>
                                  {(() => {
                                    const bestPhone = getBestParentOrStudentPhone(student);
                                    return (
                                      <div className="flex items-center gap-1.5 mt-1 justify-end flex-wrap">
                                        {bestPhone ? (
                                          <span className="text-[10px] font-bold text-slate-400 inline-flex items-center gap-1">
                                            <span>{highlightText(bestPhone, searchTerm)}</span>
                                            <span className="text-[9px]">📱</span>
                                          </span>
                                        ) : (
                                          <span className="text-[9px] text-slate-300 font-normal">لا يوجد هاتف</span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => handleQuickWhatsAppBalance(student, e)}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black bg-emerald-50 hover:bg-emerald-500 text-emerald-700 hover:text-white border border-emerald-200 hover:border-emerald-500 transition-all cursor-pointer shadow-3xs hover:scale-105 active:scale-95"
                                          title="إرسال إشعار الرصيد الحالي الفوري لولي الأمر عبر WhatsApp 📱"
                                        >
                                          <MessageSquare size={9} className="stroke-[2.5]" />
                                          <span>إرسال الرصيد 📱</span>
                                        </button>
                                      </div>
                                    );
                                  })()}
                                  {student.customRates && Object.keys(student.customRates).filter(k => student.customRates![k] !== undefined).length > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[8px] font-black text-[#D4A33C] mt-0.5 select-none" title="تم تحديد أسعار مخصصة لهذا الطالب">
                                      <span className="w-1 h-1 rounded-full bg-[#D4A33C]" />
                                      <span>أسعار مخصصة مفعّلة</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {archiveTab === 'pending' ? (
                                <div className="flex flex-col text-right gap-1.5">
                                  {/* Course Type Badge */}
                                  <div>
                                    {student.courseType === 'group' || student.notes?.includes('دورة جماعية') ? (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2 py-0.5 rounded-lg">
                                        <span>👥 دورة جماعية</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200/80 px-2 py-0.5 rounded-lg">
                                        <span>👤 حصة فردية (خصوصي)</span>
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs font-bold text-slate-700 max-w-xs break-words">
                                    {student.notes ? student.notes.replace('التسجيل الإلكتروني - ', '') : 'تسجيل إلكتروني جديد'}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-black text-[#D4A33C] uppercase tracking-widest bg-amber-50 px-2 py-1 rounded">
                                  {student.teachers?.length || 0} أساتذة منسقين
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {archiveTab === 'pending' ? (
                                <span className="text-xs font-bold text-slate-600">
                                  {student.registrationDate || 'غير محدد'}
                                </span>
                              ) : (
                                <div className="flex flex-col gap-1.5 text-right">
                                  {(() => {
                                    const rem = getRemainingSessionsInfo(student, stats.balance);
                                    return (
                                      <>
                                        <div 
                                          className="cursor-pointer hover:bg-amber-50/40 select-none group/balance transition-colors inline-flex"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setQuickAdjustStudent(student);
                                            setQuickAdjustMode('set_total');
                                            setQuickAdjustNewBalance(String(stats.balance));
                                            setQuickAdjustDeltaAmount('');
                                            setQuickAdjustComment('');
                                            setQuickAdjustHideInStatement(true);
                                            setQuickAdjustError('');
                                          }}
                                          title="انقر هنا للتعديل المالي السريع لرصيد هذا الطالب 📊"
                                        >
                                          <div className="flex items-center gap-2">
                                            <span 
                                              title={(rem.sessions === 1 || rem.sessions === 2) ? 'هذا الطالب يحتاج لتجديد الحصص قريباً' : undefined}
                                              className={`text-xs font-black px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all ${
                                              rem.sessions <= 0 
                                                ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-2xs' 
                                                : (rem.sessions === 1 || rem.sessions === 2)
                                                ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-2xs' 
                                                : 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs'
                                            }`}>
                                              {(rem.sessions === 1 || rem.sessions === 2) && (
                                                <AlertTriangle 
                                                  size={12} 
                                                  className="text-amber-600 animate-pulse shrink-0" 
                                                  title="هذا الطالب يحتاج لتجديد الحصص قريباً" 
                                                />
                                              )}
                                              <span>{rem.text}</span>
                                              <Pencil size={11} className="opacity-0 group-hover/balance:opacity-100 text-slate-400 hover:text-[#D4A33C] transition-opacity shrink-0" />
                                            </span>
                                            {stats.balance < (typeof student.lowBalanceThreshold === 'number' ? student.lowBalanceThreshold : lowBalanceThreshold) && (
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black bg-rose-50 border border-rose-100 text-rose-600 animate-pulse">
                                                  <AlertTriangle size={10} />
                                                  <span>رصيد منخفض</span>
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openSingleAlertModal(student);
                                                  }}
                                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                                  title="تنبيه وإرسال تذكير مالي مخصص لولي الأمر عبر WhatsApp 📱"
                                                >
                                                  <MessageSquare size={9} className="stroke-[2.5]" />
                                                  <span>تذكير 📱</span>
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePackageRenewalAlert(student);
                                                  }}
                                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                                  title="تنبيه تجديد الحزمة: إنشاء رسالة واتساب تحث ولي الأمر على شحن الرصيد قبل نفاده ⚡"
                                                >
                                                  <RefreshCw size={8} className="stroke-[2.5] text-amber-600" />
                                                  <span>تجديد الحزمة ⚡</span>
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Visual Progress Bar based on low balance threshold */}
                                        {(() => {
                                          const limit = typeof student.lowBalanceThreshold === 'number' ? student.lowBalanceThreshold : lowBalanceThreshold;
                                          let percentageRemaining = 100;
                                          
                                          if (limit < 0) {
                                            const totalDebtLimit = Math.abs(limit);
                                            const remainingBuffer = Math.max(0, stats.balance - limit);
                                            percentageRemaining = (remainingBuffer / totalDebtLimit) * 100;
                                          } else if (limit > 0) {
                                            percentageRemaining = (stats.balance / limit) * 100;
                                          } else {
                                            percentageRemaining = stats.balance > 0 ? 100 : 0;
                                          }
                                          
                                          const pct = Math.min(100, Math.max(0, percentageRemaining));
                                          
                                          // Gradient color selector
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
                                            <div className="w-40 space-y-1" onClick={(e) => e.stopPropagation()}>
                                              <div className="h-1.5 bg-slate-100 border border-slate-200/50 rounded-full overflow-hidden relative">
                                                <div 
                                                  className={`h-full rounded-full bg-gradient-to-l ${barColor} transition-all duration-500`}
                                                  style={{ width: `${pct}%` }}
                                                />
                                              </div>
                                              <div className="flex justify-between items-center text-[8px] font-black text-slate-400">
                                                <span>تكلفة الحصة: ₪{rem.sessionCost}</span>
                                                <span className={`${textColor}`}>{pct.toFixed(0)}% متبقي</span>
                                              </div>
                                            </div>
                                          );
                                        })()}
                                      </>
                                    );
                                  })()}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {archiveTab === 'pending' ? (
                                (() => {
                                  const studentTrial = trialLessons.find(tl => tl.migratedToStudentId === student.id || tl.phone === student.phone || tl.studentName === student.name);
                                  const hasTrial = !!studentTrial;
                                  const isTrialCompleted = studentTrial?.status === 'completed';

                                  return (
                                    <div className="flex items-center gap-1.5">
                                      {isTrialCompleted ? (
                                        <span className="px-2 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black rounded-lg">
                                          ✓ مكتملة بنجاح 🧪
                                        </span>
                                      ) : hasTrial ? (
                                        <span className="px-2 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg animate-pulse">
                                          📅 مجدولة مع {studentTrial.teacherName}
                                        </span>
                                      ) : (
                                        <span className="px-2 py-1 bg-amber-50 border border-amber-150 text-amber-700 text-[10px] font-black rounded-lg">
                                          ⏳ بانتظار الجدولة
                                        </span>
                                      )}
                                    </div>
                                  );
                                })()
                              ) : (
                                <span className="text-sm font-bold text-slate-750">{stats.sessionCount} حصة ({stats.totalHours} س)</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {(() => {
                                const acStatus = student.academicStatus || 'Active';
                                if (acStatus === 'Active') {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black">
                                      <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                      <span>نشط</span>
                                    </span>
                                  );
                                } else if (acStatus === 'Paused') {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-amber-50 text-amber-750 border border-amber-100 text-[10px] font-black">
                                      <span className="w-1 h-1 rounded-full bg-amber-500" />
                                      <span>متوقف مؤقت</span>
                                    </span>
                                  );
                                } else if (acStatus === 'Graduated') {
                                  return (
                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-indigo-50 text-indigo-750 border border-indigo-100 text-[10px] font-black">
                                      <span className="w-1 h-1 rounded-full bg-indigo-500" />
                                      <span>خريج</span>
                                    </span>
                                  );
                                }
                                return null;
                              })()}
                              <div className="mt-1">
                                {student.preferredPricingUnit === 'session_40' || student.sessionSystem === 'session_40' ? (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[9px] font-black">
                                    <Clock size={9} className="text-amber-600" />
                                    <span>نظام 40 دقيقة</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-100 text-[9px] font-bold">
                                    <Clock size={9} className="text-blue-500" />
                                    <span>نظام بالساعات</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-left">
                              <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                <span className="text-[9px] font-black text-indigo-650 uppercase opacity-0 group-hover:opacity-100 transition-all">
                                  {archiveTab === 'active' ? 'الملف الشخصي' : archiveTab === 'pending' ? 'معالجة الطلب' : 'خيارات الأرشيف'}
                                </span>
                                {archiveTab === 'pending' ? (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedStudentId(student.id);
                                      }}
                                      className="p-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-750 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer border border-indigo-200/50 animate-pulse"
                                      title="معالجة طلب التسجيل والتنسيب"
                                    >
                                      <ArrowLeft size={11} />
                                      <span>معالجة ⚡</span>
                                    </button>

                                    {(() => {
                                      const studentTrial = trialLessons.find(tl => tl.migratedToStudentId === student.id || tl.phone === student.phone || tl.studentName === student.name);
                                      if (!studentTrial) {
                                        return (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setTrialBookingStudent(student);
                                              setTrialSubject('الرياضيات');
                                              setTrialTopic('');
                                              setTrialTeacherId(student.teachers && student.teachers.length > 0 ? student.teachers[0] : '');
                                              setTrialBookingError('');
                                              setTrialBookingSuccess('');
                                              setIsTrialBookingModalOpen(true);
                                            }}
                                            className="p-1 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer border border-amber-200/50"
                                            title="جدولة حصة تجريبية فوراً"
                                          >
                                            <CalendarPlus size={11} className="text-amber-600" />
                                            <span>تجريبية 🧪</span>
                                          </button>
                                        );
                                      }
                                      return null;
                                    })()}

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setArchiveConfirmStudent(student);
                                      }}
                                      className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer border border-slate-300/50"
                                      title="أرشفة الطلب مؤقتاً"
                                    >
                                      <Archive size={11} />
                                      <span>أرشفة 📂</span>
                                    </button>

                                    {isCurrentUserManager && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteStudent(student.id);
                                        }}
                                        className="p-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer border border-rose-100 flex items-center justify-center h-7 w-7"
                                        title="حذف نهائي"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </>
                                ) : archiveTab === 'active' ? (
                                  <>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openSingleAlertModal(student);
                                      }}
                                      className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center justify-center ${
                                        stats.balance <= (typeof student.lowBalanceThreshold === 'number' ? student.lowBalanceThreshold : lowBalanceThreshold)
                                          ? 'text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 animate-pulse'
                                          : 'text-emerald-700 hover:text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100'
                                      }`}
                                      title="إرسال الرصيد المالي وإشعار المحفظة لولي الأمر عبر WhatsApp 📱"
                                    >
                                      <MessageSquare size={13} className="stroke-[2.5]" />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePackageRenewalAlert(student);
                                      }}
                                      className="p-1.5 rounded-lg text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 transition-all cursor-pointer shrink-0 flex items-center justify-center shadow-2xs hover:scale-105 active:scale-95 group/renew"
                                      title="تنبيه تجديد الحزمة: إرسال رسالة واتساب مخصصة تحث ولي الأمر على تجديد الرصيد قبل نفاده ⚡"
                                    >
                                      <RefreshCw size={13} className="stroke-[2.5] text-amber-600 group-hover/renew:rotate-180 transition-transform duration-300" />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openTransferModal(student);
                                      }}
                                      className="p-1.5 rounded-lg text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 transition-all cursor-pointer shrink-0 flex items-center justify-center shadow-2xs hover:scale-105 active:scale-95"
                                      title="ترحيل / نقل الطالب إلى معلم آخر وإرسال إشعار فوري للطرفين 🔄"
                                    >
                                      <ArrowLeftRight size={13} className="stroke-[2.5] text-indigo-600" />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const { startDate, endDate } = getCurrentAcademicYearDates();
                                        exportStudentToPDF(student.id, startDate, endDate);
                                      }}
                                      className="p-1.5 text-slate-300 hover:text-amber-600 transition-colors cursor-pointer"
                                      title="تصدير كشف حساب الطالب للعام الدراسي الحالي كـ PDF 🗓️"
                                    >
                                      <Calendar size={13} className="text-[#D4A33C]" />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        exportStudentToPDF(student.id);
                                      }}
                                      className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors cursor-pointer"
                                      title="تصدير كشف حساب الطالب الكامل (كافة الفترات) كـ PDF 📄"
                                    >
                                      <FileText size={13} className="text-rose-400" />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedStudentId(student.id);
                                        setIsEditingStudent(true);
                                      }}
                                      className="p-1.5 text-slate-300 hover:text-[#D4A33C] transition-colors cursor-pointer"
                                      title="تعديل بيانات الطالب"
                                    >
                                      <Pencil size={13} />
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setArchiveConfirmStudent(student);
                                      }}
                                      className="p-1.5 text-slate-300 hover:text-amber-500 transition-colors cursor-pointer"
                                      title="أرشفة الطالب غير النشط (حفظ بياناته مع إمكانية الاستعادة لاحقاً) 📂"
                                    >
                                      <Archive size={14} className="text-amber-600" />
                                    </button>
                                    {isCurrentUserManager && (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteStudent(student.id);
                                        }}
                                        className="p-1.5 text-slate-300 hover:text-rose-600 transition-colors cursor-pointer"
                                        title="حذف الطالب نهائياً من النظام"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRestoreConfirmStudent(student);
                                      }}
                                      className="p-1 px-3 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                      title="استعادة وتنشيط الطالب وإعادته للدراسة في المركز 🔄"
                                    >
                                      <RotateCcw size={11} className="stroke-[3] text-emerald-700" />
                                      <span>استعادة للدراسة 🔄</span>
                                    </button>
                                    {isCurrentUserManager && (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteStudent(student.id);
                                        }}
                                        className="p-1 px-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100/80 rounded-lg text-[10px] font-black transition-colors flex items-center gap-1 cursor-pointer"
                                        title="حذف هذا الطالب نهائياً من النظام"
                                      >
                                        <Trash2 size={11} />
                                        <span>حذف نهائي</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div 
            key={`student-detail-${selectedStudentId}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-10"
          >
            {/* Return Arrow block */}
            {(() => {
              const student = students.find(s => s.id === selectedStudentId);
              const stats = getStudentStats(selectedStudentId, studentStartDate, studentEndDate, studentSubjectFilter);
              const lifetimeStats = getStudentStats(selectedStudentId);
              return (
                <>
                  <div className="flex items-center justify-between gap-6">
                    <button 
                      onClick={() => { 
                        setSelectedStudentId(null); 
                        setShowTopUpForm(false); 
                        setStudentStartDate(''); 
                        setStudentEndDate(''); 
                        setStudentPeriodType('all');
                        setStudentSubjectFilter('all');
                        setTopUpSuccessNotice(null); 
                      }}
                      className="group flex items-center gap-3 text-slate-400 hover:text-[#D4A33C] transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center transition-all">
                        <ArrowLeft size={18} />
                      </div>
                      <span className="font-black text-xs uppercase tracking-wide">العودة لقائمة الطلاب</span>
                    </button>
                  </div>

                  {/* Top Up Success Receipt Notice Banner */}
                  <AnimatePresence>
                    {topUpSuccessNotice && student && topUpSuccessNotice.student.id === student.id && (
                      <motion.div
                        key={`topup-receipt-${topUpSuccessNotice.credit?.id || 'notice'}`}
                        initial={{ opacity: 0, y: -12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -12, scale: 0.98 }}
                        className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white p-6 rounded-[2.5rem] shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5 border border-emerald-400/40 text-right"
                        dir="rtl"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
                            <Receipt size={26} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-base font-black">تم قيد الدفعة المالية بنجاح! (+₪{topUpSuccessNotice.credit.amount})</h4>
                              <span className="px-2 py-0.5 bg-emerald-500/40 rounded-md text-[10px] font-black border border-white/20">معتمد في المحفظة</span>
                            </div>
                            <p className="text-xs text-emerald-100 font-bold mt-1">
                              تم تسجيل وتحديث رصيد الطالب. يمكنك الآن إصدار وطباعة سند القبض المالي المعتمد أو حفظه كـ PDF.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => {
                              handleGeneratePaymentReceipt(topUpSuccessNotice.credit, topUpSuccessNotice.student);
                              setTopUpSuccessNotice(null);
                            }}
                            className="px-5 py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer"
                          >
                            <Printer size={16} />
                            <span>طباعة سند القبض (PDF) 🖨️</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setTopUpSuccessNotice(null)}
                            className="p-2.5 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                            title="إغلاق التنبيه"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Top Refill status Card */}
                  {(() => {
                    const limit = typeof student?.lowBalanceThreshold === 'number' ? student.lowBalanceThreshold : lowBalanceThreshold;
                    const isLowBalance = lifetimeStats.balance < limit;
                    const customRatesCount = student?.customRates ? Object.keys(student.customRates).filter(k => student.customRates![k] !== undefined).length : 0;
                    return (
                      <section className={`bg-white rounded-[3rem] p-12 border ${isLowBalance ? 'border-rose-400 ring-4 ring-rose-500/5 shadow-rose-100/40 shadow-xl' : 'border-slate-200 shadow-sm'} relative overflow-hidden transition-all`}>
                        {isLowBalance ? (
                          <div className="absolute top-0 left-0 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl -ml-48 -mt-48" />
                        ) : (
                          <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -ml-48 -mt-48" />
                        )}
                        
                        <div className="relative flex flex-col xl:flex-row xl:items-center justify-between gap-12 text-right">
                          <div className="flex items-center gap-8">
                             <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl transition-colors ${isLowBalance ? 'bg-rose-500 text-white shadow-rose-500/20' : 'bg-[#D4A33C] text-slate-950'}`}>
                                <GraduationCap size={48} />
                             </div>
                             <div>
                                {isEditingStudent ? (
                                  <div className="flex flex-col gap-4 w-full bg-slate-50/80 border border-slate-200/60 p-6 rounded-[2rem] text-right" onClick={e => e.stopPropagation()}>
                                    <h4 className="text-xs font-black text-[#1A365D] border-b border-indigo-150 pb-2 flex items-center gap-1.5 justify-start">
                                      <Pencil size={13} className="text-[#D4A33C]" />
                                      <span>تعديل كامل بيانات ملف الطالب</span>
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                                      {/* Name */}
                                      <div className="flex flex-col gap-1 text-right">
                                        <span className="text-[10px] font-black text-slate-500">اسم الطالب</span>
                                        <input 
                                          value={editName}
                                          onChange={e => setEditName(e.target.value)}
                                          placeholder="اسم الطالب"
                                          className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none text-right"
                                        />
                                      </div>

                                      {/* Grade */}
                                      <div className="flex flex-col gap-1 text-right">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-black text-slate-500">الصف الدراسي</span>
                                          {editGrade && (
                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                                              getDefaultPricingUnitForGrade(editGrade) === 'session_40'
                                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                                : 'bg-blue-100 text-blue-900 border-blue-300'
                                            }`}>
                                              {getDefaultPricingUnitForGrade(editGrade) === 'session_40' ? 'تلقائي: نظام الحصة 40 دقيقة 🎓' : 'تلقائي: نظام الساعة 60 دقيقة ⏱️'}
                                            </span>
                                          )}
                                        </div>
                                        <select 
                                          value={editGrade}
                                          onChange={e => {
                                            const newGrade = e.target.value;
                                            setEditGrade(newGrade);
                                            const autoUnit = getDefaultPricingUnitForGrade(newGrade);
                                            setEditPreferredPricingUnit(autoUnit);
                                            if (autoUnit === 'session_40') {
                                              const stage = getAcademicStage(newGrade);
                                              if (!editSessionRate) setEditSessionRate(stage === 'secondary' ? 50 : 40);
                                              if (!editTeacherSessionPayout) setEditTeacherSessionPayout(stage === 'secondary' ? 35 : 25);
                                            }
                                          }}
                                          className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none cursor-pointer"
                                        >
                                          <option value="">-- اختر الصف الدراسي (3 مراحل أساسية) --</option>
                                          <optgroup label="1. المرحلة الأساسية (أساسي)">
                                            <option value="الصف الأول الأساسي">الصف الأول الأساسي</option>
                                            <option value="الصف الثاني الأساسي">الصف الثاني الأساسي</option>
                                            <option value="الصف الثالث الأساسي">الصف الثالث الأساسي</option>
                                            <option value="الصف الرابع الأساسي">الصف الرابع الأساسي</option>
                                            <option value="الصف الخامس الأساسي">الصف الخامس الأساسي</option>
                                            <option value="الصف السادس الأساسي">الصف السادس الأساسي</option>
                                          </optgroup>
                                          <optgroup label="2. المرحلة الإعدادية (إعدادي)">
                                            <option value="الصف السابع الإعدادي">الصف السابع الإعدادي</option>
                                            <option value="الصف الثامن الإعدادي">الصف الثامن الإعدادي</option>
                                            <option value="الصف التاسع الإعدادي">الصف التاسع الإعدادي</option>
                                          </optgroup>
                                          <optgroup label="3. المرحلة الثانوية (ثانوي)">
                                            <option value="الصف العاشر">الصف العاشر</option>
                                            <option value="الصف الحادي عشر (أول ثانوي)">الصف الحادي عشر (أول ثانوي)</option>
                                            <option value="الصف الثاني عشر (توجيهي / ثانوية عامة / بجروت)">الصف الثاني عشر (توجيهي / ثانوية عامة / بجروت)</option>
                                          </optgroup>
                                        </select>
                                      </div>

                                      {/* Phone with Auto +972 Prefix */}
                                      <div className="flex flex-col gap-1 text-right">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-black text-slate-500">رقم الهاتف / الواتس آب</span>
                                          <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                                            المقدمة 972+ تلقائية 💬
                                          </span>
                                        </div>
                                        <div className="relative flex items-center" dir="ltr">
                                          <div className="bg-emerald-50 border border-r-0 border-slate-200 text-emerald-800 font-mono font-black text-xs px-2.5 py-2 rounded-l-xl flex items-center gap-1 shrink-0 select-none shadow-inner">
                                            <Phone size={12} className="text-emerald-600" />
                                            <span>+972</span>
                                          </div>
                                          <input 
                                            value={editPhone}
                                            onChange={e => setEditPhone(cleanLocalPhoneDigits(e.target.value))}
                                            placeholder="50 123 4567"
                                            dir="ltr"
                                            className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-r-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all outline-none font-mono"
                                          />
                                        </div>
                                      </div>

                                      {/* Email */}
                                      <div className="flex flex-col gap-1 text-right">
                                        <span className="text-[10px] font-black text-slate-500">البريد الإلكتروني</span>
                                        <input 
                                          value={editEmail}
                                          onChange={e => setEditEmail(e.target.value)}
                                          placeholder="example@email.com"
                                          dir="ltr"
                                          className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none text-right"
                                        />
                                      </div>

                                      {/* Gender */}
                                      <div className="flex flex-col gap-1 text-right">
                                        <span className="text-[10px] font-black text-slate-500">جنس الطالب</span>
                                        <select 
                                          value={editGender}
                                          onChange={e => setEditGender(e.target.value as 'Male' | 'Female')}
                                          className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none cursor-pointer"
                                        >
                                          <option value="Male">ذكر</option>
                                          <option value="Female">أنثى</option>
                                        </select>
                                      </div>

                                      {/* Low Balance Threshold */}
                                      <div className="flex flex-col gap-1 text-right">
                                        <span className="text-[10px] font-black text-slate-500">تنبيه انخفاض الرصيد عند (₪)</span>
                                        <input 
                                          type="text"
                                          value={editLowBalanceThreshold}
                                          onChange={e => setEditLowBalanceThreshold(e.target.value)}
                                          placeholder="-100"
                                          className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none text-right"
                                        />
                                      </div>

                                      {/* Hourly Rate / 40-Minute Session Rate in Grid */}
                                      {editPreferredPricingUnit === 'session_40' ? (
                                        <div className="flex flex-col gap-1 text-right bg-gradient-to-r from-amber-50 to-orange-50/70 p-2.5 rounded-xl border border-amber-300/80 shadow-2xs">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-amber-950 flex items-center gap-1">
                                              <span>نظام الحصة (40 دقيقة) 🎓</span>
                                            </span>
                                            <span className="text-[9px] font-extrabold text-amber-900 bg-amber-200/90 px-1.5 py-0.5 rounded">
                                              بديل سعر الساعة ✓
                                            </span>
                                          </div>
                                          <div className="flex items-center justify-between bg-white/90 px-2 py-1.5 rounded-lg border border-amber-200 mt-0.5">
                                            <span className="text-[10px] font-bold text-slate-600">طالب: <strong className="text-amber-950 font-black">₪{editSessionRate || (getAcademicStage(editGrade) === 'secondary' ? 50 : 40)}</strong></span>
                                            <span className="text-[10px] font-bold text-slate-600">معلم: <strong className="text-emerald-800 font-black">₪{editTeacherSessionPayout || (getAcademicStage(editGrade) === 'secondary' ? 35 : 25)}</strong></span>
                                          </div>
                                          <span className="text-[8.5px] text-amber-800 font-bold">تسعير الحصة محدد بالأسفل بدقة للمعلم والطالب ⬇️</span>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col gap-1 text-right">
                                          <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-500">سعر الطالب بالساعة (₪)</span>
                                            <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                              {(() => {
                                                const currentStudent = students.find(s => s.id === selectedStudentId);
                                                const stGrade = editGrade || currentStudent?.grade || '';
                                                const stage = getAcademicStage(stGrade);
                                                if (stage === 'secondary') return `ثانوي: ₪${defaultSecondaryStudentHourlyRate} تلقائياً`;
                                                if (stage === 'middle') return `إعدادي: ₪${defaultMiddleStudentHourlyRate} تلقائياً`;
                                                return `تلقائي: ₪${defaultPrimaryStudentHourlyRate || defaultStudentHourlyRate}`;
                                              })()}
                                            </span>
                                          </div>
                                          <input 
                                            type="number"
                                            value={editHourlyRate}
                                            onChange={e => setEditHourlyRate(e.target.value)}
                                            placeholder={(() => {
                                              const currentStudent = students.find(s => s.id === selectedStudentId);
                                              const stGrade = editGrade || currentStudent?.grade || '';
                                              const stage = getAcademicStage(stGrade);
                                              if (stage === 'secondary') return `تلقائي ثانوي: ${defaultSecondaryStudentHourlyRate} ₪ (أو أدخل رقماً للتخصيص)`;
                                              if (stage === 'middle') return `تلقائي إعدادي: ${defaultMiddleStudentHourlyRate} ₪ (أو أدخل رقماً للتخصيص)`;
                                              return `تلقائي عام: ${defaultStudentHourlyRate} ₪`;
                                            })()}
                                            className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none text-right"
                                          />
                                          <span className="text-[9px] text-slate-400">سعر الساعة التلقائي: المرحلة الثانوية 60 ₪ والإعدادي 50 ₪ (أو خصص للمدير).</span>
                                        </div>
                                      )}

                                      {/* Academic Status */}
                                      <div className="flex flex-col gap-1 text-right">
                                        <span className="text-[10px] font-black text-slate-500">حالة الطالب</span>
                                        <select 
                                          value={editAcademicStatus}
                                          onChange={e => setEditAcademicStatus(e.target.value as 'Active' | 'Paused' | 'Graduated')}
                                          className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none cursor-pointer text-right"
                                        >
                                          <option value="Active">نشط (Active) 🟢</option>
                                          <option value="Paused">متوقف مؤقت (Paused) ⏳</option>
                                          <option value="Graduated">خريج (Graduated) 🎓</option>
                                        </select>
                                      </div>

                                      {/* Archive Status Option */}
                                      <div className="flex flex-col gap-1 text-right">
                                        <span className="text-[10px] font-black text-slate-500">حالة الأرشفة والتواجد بالمركز</span>
                                        <select 
                                          value={editIsArchived ? 'archived' : 'active'}
                                          onChange={e => {
                                            const isArch = e.target.value === 'archived';
                                            setEditIsArchived(isArch);
                                            if (isArch) {
                                              setEditAcademicStatus('Paused');
                                            } else {
                                              setEditAcademicStatus('Active');
                                            }
                                          }}
                                          className={`w-full px-3 py-2 text-xs font-bold border rounded-xl focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none cursor-pointer text-right ${
                                            editIsArchived 
                                              ? 'bg-amber-50 border-amber-300 text-amber-950 font-black' 
                                              : 'bg-white border-slate-200 text-slate-800'
                                          }`}
                                        >
                                          <option value="active">طالب نشط بالمركز (في قائمة النشطين) 🟢</option>
                                          <option value="archived">مؤرشف (غير نشط / توقف عن الدوام) 🗄️</option>
                                        </select>
                                      </div>
                                    </div>

                                    {/* System Selection: Hourly vs 40-Minute Sessions (Manager Only) */}
                                    <div className="bg-amber-50/70 border-2 border-amber-200/90 p-4.5 rounded-2xl space-y-3 text-right">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-amber-200/70">
                                        <div className="flex items-center gap-2.5">
                                          <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs">
                                            <Clock size={16} />
                                          </div>
                                          <div>
                                            <h5 className="text-xs font-black text-slate-900 flex items-center gap-2">
                                              <span>نظام احتساب الحصص والبرنامج المعتمد للطالب</span>
                                              <span className="text-[10px] bg-amber-200/90 text-amber-950 font-extrabold px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                                                <Lock size={10} />
                                                صلاحيات المدير فقط
                                              </span>
                                            </h5>
                                            <p className="text-[10px] text-slate-600 font-bold mt-0.5">
                                              تعديل البرنامج المعتمد لاحتساب وتوثيق حصص هذا الطالب لدى معلمه
                                            </p>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        <button
                                          type="button"
                                          onClick={() => setEditPreferredPricingUnit('hourly')}
                                          className={`p-3.5 rounded-xl border-2 text-right transition-all flex items-start gap-3 cursor-pointer ${
                                            editPreferredPricingUnit === 'hourly'
                                              ? 'border-[#1A365D] bg-white shadow-sm ring-2 ring-[#1A365D]/10'
                                              : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                                          }`}
                                        >
                                          <div className={`w-5 h-5 rounded-md border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                                            editPreferredPricingUnit === 'hourly' ? 'border-[#1A365D] bg-[#1A365D] text-white' : 'border-slate-300'
                                          }`}>
                                            {editPreferredPricingUnit === 'hourly' && <Check size={12} className="stroke-[3]" />}
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-xs font-black text-slate-900">نظام الساعات (60 دقيقة) ⏱️</span>
                                              {editPreferredPricingUnit === 'hourly' && (
                                                <span className="text-[9px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded">محدد</span>
                                              )}
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-semibold block mt-1 leading-relaxed">
                                              احتساب الحصص بالساعات الكاملة (60 د). يختار المعلم عند التسجيل: 1 (60 د)، 1.5 (90 د)، 2 (120 د)، 3 (180 د).
                                            </span>
                                          </div>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            const currentStudent = students.find(s => s.id === selectedStudentId);
                                            const stGrade = editGrade || currentStudent?.grade || '';
                                            const stage = getAcademicStage(stGrade);
                                            setEditPreferredPricingUnit('session_40');
                                            if (!editSessionRate) setEditSessionRate(stage === 'secondary' ? 50 : 40);
                                            if (!editTeacherSessionPayout) setEditTeacherSessionPayout(stage === 'secondary' ? 35 : 25);
                                          }}
                                          className={`p-3.5 rounded-xl border-2 text-right transition-all flex items-start gap-3 cursor-pointer ${
                                            editPreferredPricingUnit === 'session_40'
                                              ? 'border-amber-500 bg-white shadow-sm ring-2 ring-amber-500/20'
                                              : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                                          }`}
                                        >
                                          <div className={`w-5 h-5 rounded-md border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                                            editPreferredPricingUnit === 'session_40' ? 'border-amber-500 bg-amber-500 text-slate-950' : 'border-slate-300'
                                          }`}>
                                            {editPreferredPricingUnit === 'session_40' && <Check size={12} className="stroke-[3]" />}
                                          </div>
                                          <div>
                                            <div className="flex items-center gap-1.5">
                                              <span className="text-xs font-black text-slate-900">نظام الحصة (40 دقيقة) 🎓</span>
                                              {editPreferredPricingUnit === 'session_40' && (
                                                <span className="text-[9px] bg-amber-200 text-amber-950 font-extrabold px-1.5 py-0.5 rounded">محدد</span>
                                              )}
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-semibold block mt-1 leading-relaxed">
                                              احتساب الحصص بنظام الحصة (40 د). يختار المعلم عند التسجيل: 1 (40 د)، 1.5 (60 د)، 2 (80 د)، 3 (120 د).
                                            </span>
                                          </div>
                                        </button>
                                      </div>

                                      {/* Dedicated 40-Minute Session Pricing Panel (Student Rate + Teacher Payout) */}
                                      {editPreferredPricingUnit === 'session_40' && (
                                        <div className="mt-3 p-4 bg-gradient-to-br from-amber-50 via-orange-50/40 to-amber-100/40 border-2 border-amber-300 rounded-2xl text-right animate-in fade-in space-y-3.5 shadow-sm">
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-amber-200/90">
                                            <div className="flex items-center gap-2">
                                              <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                                                🎓
                                              </div>
                                              <div>
                                                <span className="text-xs font-black text-amber-950 block">
                                                  تحديد سعر الحصة (40 دقيقة) للطالب والمعلم (بديل نظام الساعات)
                                                </span>
                                                <span className="text-[10px] text-amber-800 font-bold block mt-0.5">
                                                  {(() => {
                                                    const currentStudent = students.find(s => s.id === selectedStudentId);
                                                    const stGrade = editGrade || currentStudent?.grade || '';
                                                    const stage = getAcademicStage(stGrade);
                                                    if (stage === 'secondary') return 'المرحلة المكتشفة: المرحلة الثانوية (تلقائي المنظومة: 50 ₪ للطالب / 35 ₪ للمعلم)';
                                                    if (stage === 'middle') return 'المرحلة المكتشفة: المرحلة الإعدادية (تلقائي المنظومة: 40 ₪ للطالب / 25 ₪ للمعلم)';
                                                    return 'المرحلة: عامة / أساسية (التسعير المعتمد: 40 ₪ إعدادي / 50 ₪ ثانوي)';
                                                  })()}
                                                </span>
                                              </div>
                                            </div>

                                            {/* Preset Stage Buttons */}
                                            <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setEditSessionRate(40);
                                                  setEditTeacherSessionPayout(25);
                                                }}
                                                className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                                title="تطبيق تسعيرة المرحلة الإعدادية"
                                              >
                                                🌱 إعدادي (40₪ طالب / 25₪ معلم)
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setEditSessionRate(50);
                                                  setEditTeacherSessionPayout(35);
                                                }}
                                                className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-300 rounded-xl text-[10px] font-black transition-all cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                                                title="تطبيق تسعيرة المرحلة الثانوية"
                                              >
                                                🎓 ثانوي (50₪ طالب / 35₪ معلم)
                                              </button>
                                            </div>
                                          </div>

                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                            {/* 1. Student Rate per 40-Min Session */}
                                            <div className="flex flex-col gap-1 text-right bg-white p-3.5 rounded-xl border border-amber-200/90 shadow-2xs">
                                              <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-black text-amber-950 flex items-center gap-1">
                                                  <DollarSign size={13} className="text-amber-600" />
                                                  <span>سعر الحصة 40 دقيقة للطالب (₪)</span>
                                                </span>
                                                <span className="text-[9px] font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                                                  تُخصم من رصيد الطالب 💳
                                                </span>
                                              </div>
                                              <div className="relative mt-1">
                                                <input 
                                                  type="number"
                                                  value={editSessionRate}
                                                  onChange={e => setEditSessionRate(e.target.value === '' ? '' : Number(e.target.value))}
                                                  placeholder={(() => {
                                                    const currentStudent = students.find(s => s.id === selectedStudentId);
                                                    const stGrade = editGrade || currentStudent?.grade || '';
                                                    const stage = getAcademicStage(stGrade);
                                                    return stage === 'secondary' ? '50 (تلقائي ثانوي)' : '40 (تلقائي إعدادي)';
                                                  })()}
                                                  className="w-full px-3 py-2 pr-4 pl-16 text-sm font-black bg-amber-50/40 border-2 border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all outline-none text-right"
                                                />
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                                  ₪ / حصة 40د
                                                </span>
                                              </div>
                                              <span className="text-[9.5px] text-amber-800/80 font-bold mt-1">
                                                المبلغ المالي الذي يُخصم تلقائياً من رصيد محفظة الطالب عند قيام المعلم بتسجيل ورصد حصة 40 دقيقة.
                                              </span>
                                            </div>

                                            {/* 2. Teacher Payout per 40-Min Session */}
                                            <div className="flex flex-col gap-1 text-right bg-white p-3.5 rounded-xl border border-emerald-200/90 shadow-2xs">
                                              <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-black text-emerald-950 flex items-center gap-1">
                                                  <Award size={13} className="text-emerald-600" />
                                                  <span>أجر/سعر الحصة 40 دقيقة للمعلم (₪)</span>
                                                </span>
                                                <span className="text-[9px] font-black text-emerald-850 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                                                  تُضاف لمستحقات المعلم 💰
                                                </span>
                                              </div>
                                              <div className="relative mt-1">
                                                <input 
                                                  type="number"
                                                  value={editTeacherSessionPayout}
                                                  onChange={e => setEditTeacherSessionPayout(e.target.value === '' ? '' : Number(e.target.value))}
                                                  placeholder={(() => {
                                                    const currentStudent = students.find(s => s.id === selectedStudentId);
                                                    const stGrade = editGrade || currentStudent?.grade || '';
                                                    const stage = getAcademicStage(stGrade);
                                                    return stage === 'secondary' ? '35 (تلقائي ثانوي)' : '25 (تلقائي إعدادي)';
                                                  })()}
                                                  className="w-full px-3 py-2 pr-4 pl-16 text-sm font-black bg-emerald-50/40 border-2 border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none text-right"
                                                />
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                                  ₪ / حصة 40د
                                                </span>
                                              </div>
                                              <span className="text-[9.5px] text-emerald-800/80 font-bold mt-1">
                                                المبلغ المالي المستحق للمعلم الذي يُضاف تلقائياً إلى رصيد أرباحه ومستحقاته عند رصد الحصة.
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Edit Hourly system session duration selection */}
                                      {editPreferredPricingUnit === 'hourly' && (
                                        <div className="mt-3 p-3.5 bg-blue-50/80 border border-blue-200/90 rounded-2xl text-right animate-in fade-in space-y-2">
                                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-blue-200/60">
                                            <span className="text-xs font-black text-blue-950 flex items-center gap-1.5">
                                              <Clock size={14} className="text-blue-700 shrink-0" />
                                              مدة الجلسة التلقائية للطالب (نظام الساعات):
                                            </span>
                                            <span className="text-[10px] bg-blue-200/80 text-blue-900 font-black px-2 py-0.5 rounded-lg w-fit">
                                              الافتراضي: 60 دقيقة
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                            <button
                                              type="button"
                                              onClick={() => setEditDefaultSessionDuration(60)}
                                              className={`p-3 rounded-xl border-2 text-right transition-all cursor-pointer flex items-center gap-2.5 ${
                                                editDefaultSessionDuration === 60
                                                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-500/20'
                                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                              }`}
                                            >
                                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                editDefaultSessionDuration === 60 ? 'border-white bg-white text-blue-700' : 'border-slate-300'
                                              }`}>
                                                {editDefaultSessionDuration === 60 && <Check size={12} className="stroke-[3]" />}
                                              </div>
                                              <div>
                                                <span className="text-xs font-black block">60 دقيقة (الخيار الأول التلقائي) ⭐</span>
                                                <span className={`text-[10px] block font-medium ${editDefaultSessionDuration === 60 ? 'text-blue-100' : 'text-slate-500'}`}>
                                                  ساعة كاملة كخيار افتراضي عند تسجيل الحصص
                                                </span>
                                              </div>
                                            </button>

                                            <button
                                              type="button"
                                              onClick={() => setEditDefaultSessionDuration(30)}
                                              className={`p-3 rounded-xl border-2 text-right transition-all cursor-pointer flex items-center gap-2.5 ${
                                                editDefaultSessionDuration === 30
                                                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-500/20'
                                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                              }`}
                                            >
                                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                                editDefaultSessionDuration === 30 ? 'border-white bg-white text-blue-700' : 'border-slate-300'
                                              }`}>
                                                {editDefaultSessionDuration === 30 && <Check size={12} className="stroke-[3]" />}
                                              </div>
                                              <div>
                                                <span className="text-xs font-black block">30 دقيقة (نصف ساعة) ⏳</span>
                                                <span className={`text-[10px] block font-medium ${editDefaultSessionDuration === 30 ? 'text-blue-100' : 'text-slate-500'}`}>
                                                  تفتح تلقائياً كـ 30 دقيقة (0.5 س) عند رصد الحصة
                                                </span>
                                              </div>
                                            </button>
                                          </div>
                                          <p className="text-[10px] text-blue-900/80 font-semibold leading-relaxed pt-1">
                                            ℹ️ تكون الحصة تلقائياً 60 دقيقة، إلا في حال تحديد 30 دقيقة هنا عند تسجيل الطالب فقط.
                                          </p>
                                        </div>
                                      )}
                                    </div>

                                    {/* ──────────────────────────── */}
                                    {/* Divider & Student Login Account Section */}
                                    <div className="border-t border-slate-200/80 my-3"></div>

                                    <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-4.5 shadow-xs transition-all text-right">
                                      {/* Section Header & Main Checkbox */}
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
                                        <div className="flex items-center gap-2.5">
                                          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 shadow-xs border border-indigo-100">
                                            <Lock size={16} />
                                          </div>
                                          <div>
                                            <h5 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                              <span>🔐 بيانات حساب الدخول</span>
                                              <span className="text-[10px] font-bold text-slate-400 font-sans">(بوابة الطالب)</span>
                                              {existingStudentAccount && (
                                                <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-md font-bold">
                                                  حساب مفعل ✓
                                                </span>
                                              )}
                                            </h5>
                                            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                                              إدارة بيانات تسجيل الدخول للطالب للوصول إلى حسابه التعليمي والاختبارات
                                            </p>
                                          </div>
                                        </div>

                                        <label className="flex items-center gap-2.5 cursor-pointer bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 px-3.5 py-2 rounded-xl transition-all select-none self-start sm:self-auto shadow-xs">
                                          <input 
                                            type="checkbox"
                                            checked={editCreateStudentAccount}
                                            onChange={e => {
                                              const checked = e.target.checked;
                                              setEditCreateStudentAccount(checked);
                                              if (checked) {
                                                if (!editAccountUsername) {
                                                  setEditAccountUsername(generateSuggestedUsername(editName, editEmail));
                                                }
                                                if (!editAccountPassword) {
                                                  const p = generateSuggestedPassword();
                                                  setEditAccountPassword(p);
                                                  setEditAccountConfirmPassword(p);
                                                }
                                              }
                                            }}
                                            className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                          />
                                          <span className="text-xs font-black text-slate-800">
                                            {existingStudentAccount ? 'تعديل / تحديث حساب الدخول' : 'إنشاء حساب دخول للطالب'}
                                          </span>
                                        </label>
                                      </div>

                                      {/* Collapsible Fields */}
                                      <AnimatePresence>
                                        {editCreateStudentAccount && (
                                          <motion.div
                                            key="edit-student-account-section"
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="overflow-hidden pt-4 space-y-4"
                                          >
                                            {/* 3 Main Inputs: Username, Password, Confirm Password */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                              {/* Username */}
                                              <div className="flex flex-col gap-1 text-right">
                                                <div className="flex items-center justify-between">
                                                  <span className="text-[10px] font-black text-slate-600">اسم المستخدم: *</span>
                                                  {editAccountUsername && (
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        navigator.clipboard.writeText(editAccountUsername);
                                                        alert('تم نسخ اسم المستخدم!');
                                                      }}
                                                      className="text-[9px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                                                    >
                                                      <Copy size={10} />
                                                      <span>نسخ</span>
                                                    </button>
                                                  )}
                                                </div>
                                                <div className="relative group">
                                                  <input 
                                                    type="text"
                                                    value={editAccountUsername}
                                                    onChange={e => {
                                                      setEditAccountUsername(e.target.value);
                                                      if (editAutoGenUsername) setEditAutoGenUsername(false);
                                                    }}
                                                    placeholder="مثال: zakia123"
                                                    dir="ltr"
                                                    className="w-full px-3 py-2 pr-9 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-left"
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      const u = generateSuggestedUsername(editName, editEmail);
                                                      setEditAccountUsername(u);
                                                    }}
                                                    title="توليد اسم مستخدم جديد"
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 p-1 rounded-md transition-colors cursor-pointer"
                                                  >
                                                    <RefreshCw size={13} />
                                                  </button>
                                                </div>
                                              </div>

                                              {/* Password */}
                                              <div className="flex flex-col gap-1 text-right">
                                                <div className="flex items-center justify-between">
                                                  <span className="text-[10px] font-black text-slate-600">
                                                    كلمة المرور: {existingStudentAccount && <span className="text-slate-400 font-normal">(اتركه فارغاً للإبقاء على الحالية)</span>}
                                                  </span>
                                                  {editAccountPassword && (
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        navigator.clipboard.writeText(editAccountPassword);
                                                        alert('تم نسخ كلمة المرور!');
                                                      }}
                                                      className="text-[9px] font-bold text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                                                    >
                                                      <Copy size={10} />
                                                      <span>نسخ</span>
                                                    </button>
                                                  )}
                                                </div>
                                                <div className="relative group">
                                                  <input 
                                                    type={editShowPassword ? "text" : "password"}
                                                    value={editAccountPassword}
                                                    onChange={e => {
                                                      setEditAccountPassword(e.target.value);
                                                      if (editAutoGenPassword) setEditAutoGenPassword(false);
                                                    }}
                                                    placeholder={existingStudentAccount ? "•••••••• (أدخل كلمة جديدة للتغيير)" : "كلمة المرور"}
                                                    dir="ltr"
                                                    className="w-full px-3 py-2 pr-9 text-xs font-mono font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-left tracking-wider"
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() => setEditShowPassword(!editShowPassword)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 transition-colors cursor-pointer"
                                                    title={editShowPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                                                  >
                                                    {editShowPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                  </button>
                                                </div>
                                              </div>

                                              {/* Confirm Password */}
                                              <div className="flex flex-col gap-1 text-right">
                                                <div className="flex items-center justify-between">
                                                  <span className="text-[10px] font-black text-slate-600">تأكيد كلمة المرور:</span>
                                                  {editAccountPassword && editAccountConfirmPassword && (
                                                    <span className={`text-[9px] font-bold ${editAccountPassword === editAccountConfirmPassword ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                      {editAccountPassword === editAccountConfirmPassword ? 'متطابقة ✓' : 'غير متطابقة ✗'}
                                                    </span>
                                                  )}
                                                </div>
                                                <div className="relative group">
                                                  <input 
                                                    type={editShowConfirmPassword ? "text" : "password"}
                                                    value={editAccountConfirmPassword}
                                                    onChange={e => {
                                                      setEditAccountConfirmPassword(e.target.value);
                                                      if (editAutoGenPassword) setEditAutoGenPassword(false);
                                                    }}
                                                    placeholder="تأكيد كلمة المرور"
                                                    dir="ltr"
                                                    className={`w-full px-3 py-2 pr-9 text-xs font-mono font-bold bg-white border ${editAccountPassword && editAccountConfirmPassword && editAccountPassword !== editAccountConfirmPassword ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none text-left tracking-wider`}
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() => setEditShowConfirmPassword(!editShowConfirmPassword)}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 transition-colors cursor-pointer"
                                                    title={editShowConfirmPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                                                  >
                                                    {editShowConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                                  </button>
                                                </div>
                                              </div>
                                            </div>

                                            {/* 4 Checkbox Controls */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200/70">
                                              {/* Auto-generate username */}
                                              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200/60 transition-all select-none">
                                                <input 
                                                  type="checkbox"
                                                  checked={editAutoGenUsername}
                                                  onChange={e => {
                                                    const checked = e.target.checked;
                                                    setEditAutoGenUsername(checked);
                                                    if (checked) {
                                                      const u = generateSuggestedUsername(editName, editEmail);
                                                      setEditAccountUsername(u);
                                                    }
                                                  }}
                                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                                />
                                                <span className="text-[11px] font-bold text-slate-700">إنشاء اسم المستخدم تلقائياً</span>
                                              </label>

                                              {/* Auto-generate password */}
                                              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200/60 transition-all select-none">
                                                <input 
                                                  type="checkbox"
                                                  checked={editAutoGenPassword}
                                                  onChange={e => {
                                                    const checked = e.target.checked;
                                                    setEditAutoGenPassword(checked);
                                                    if (checked) {
                                                      const p = generateSuggestedPassword();
                                                      setEditAccountPassword(p);
                                                      setEditAccountConfirmPassword(p);
                                                    }
                                                  }}
                                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                                />
                                                <span className="text-[11px] font-bold text-slate-700">إنشاء كلمة مرور تلقائياً</span>
                                              </label>

                                              {/* Force change password on first login */}
                                              <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200/60 transition-all select-none">
                                                <input 
                                                  type="checkbox"
                                                  checked={editForceChangePasswordOnFirstLogin}
                                                  onChange={e => setEditForceChangePasswordOnFirstLogin(e.target.checked)}
                                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                                />
                                                <span className="text-[11px] font-bold text-slate-700">تغيير كلمة المرور عند أول دخول</span>
                                              </label>

                                              {/* Send credentials to email */}
                                              <label className={`flex items-center gap-2 cursor-pointer p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200/60 transition-all select-none ${!editEmail.trim() ? 'opacity-70' : ''}`} title={!editEmail.trim() ? 'يرجى إدخال البريد الإلكتروني للطالب في الحقول أعلاه' : ''}>
                                                <input 
                                                  type="checkbox"
                                                  checked={editSendCredentialsEmail}
                                                  onChange={e => setEditSendCredentialsEmail(e.target.checked)}
                                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                                                />
                                                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                                  <span>إرسال بيانات الدخول إلى البريد</span>
                                                  {editEmail.trim() ? <Mail size={12} className="text-indigo-600" /> : <span className="text-[9px] text-slate-400 font-normal">(يتطلب بريد)</span>}
                                                </span>
                                              </label>
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center mt-1">
                                      {/* Open Balance Option */}
                                      <div className="md:col-span-1 bg-white border border-slate-200/85 p-3 rounded-xl flex items-center justify-between">
                                        <div className="flex flex-col gap-0.5 text-right font-bold">
                                          <span className="text-[11px] font-black text-slate-800">تفعيل الحساب المفتوح</span>
                                          <span className="text-[9px] font-bold text-slate-400">الرصيد السالب مع الدفع لاحقاً</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer select-none">
                                          <input 
                                            type="checkbox" 
                                            checked={editIsOpenBalance}
                                            onChange={e => setEditIsOpenBalance(e.target.checked)}
                                            className="sr-only peer"
                                          />
                                          <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#D4A33C]"></div>
                                        </label>
                                      </div>

                                      {/* Notes */}
                                      <div className="md:col-span-2 flex flex-col gap-1 text-right">
                                        <span className="text-[10px] font-black text-slate-500">ملاحظات إضافية</span>
                                        <textarea 
                                          value={editNotes}
                                          onChange={e => setEditNotes(e.target.value)}
                                          placeholder="أي ملاحظات إضافية خاصة بالمتابعة الأكاديمية أو المالية للطالب..."
                                          rows={1}
                                          className="w-full px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] transition-all outline-none text-right resize-none"
                                        />
                                      </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center justify-end gap-2 border-t border-slate-200/50 pt-3 mt-1">
                                      <button 
                                        onClick={handleUpdateStudent}
                                        type="button"
                                        className="px-4 py-2 bg-[#D4A33C] hover:bg-[#b88c30] text-slate-950 rounded-xl text-[11px] font-black transition-all shadow active:scale-95 cursor-pointer"
                                      >
                                        حفظ التغيرات
                                      </button>
                                      <button 
                                        onClick={() => setIsEditingStudent(false)}
                                        type="button"
                                        className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-[11px] font-black transition-colors cursor-pointer"
                                      >
                                        إلغاء التعديل
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-3 mb-3">
                                    <h3 className="text-4xl font-black text-slate-900 tracking-tight leading-none">{student?.name}</h3>
                                    {student?.grade && (
                                      <span className="px-3 py-1 bg-[#1A365D] text-white text-[11px] font-black rounded-lg">
                                        الصف: {student.grade}
                                      </span>
                                    )}
                                    {/* Course Type Badge */}
                                    {(() => {
                                      const isGroup = student?.courseType === 'group' || student?.notes?.includes('دورة جماعية');
                                      const isIndividual = student?.courseType === 'individual' || student?.notes?.includes('حصة فردية');
                                      if (isGroup) {
                                        return (
                                          <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-black rounded-lg flex items-center gap-1">
                                            <span>👥 دورة جماعية (مجموعة)</span>
                                          </span>
                                        );
                                      }
                                      if (isIndividual) {
                                        return (
                                          <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-black rounded-lg flex items-center gap-1">
                                            <span>👤 حصة فردية (خصوصي)</span>
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}
                                    
                                    {/* Academic Status Badge */}
                                    {(() => {
                                      const acStatus = student?.academicStatus || 'Active';
                                      if (acStatus === 'Active') {
                                        return (
                                          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[11px] font-black rounded-lg flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span>حالة الطالب: نشط 🟢</span>
                                          </span>
                                        );
                                      } else if (acStatus === 'Paused') {
                                        return (
                                          <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-700 text-[11px] font-black rounded-lg flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                            <span>حالة الطالب: متوقف مؤقت ⏳</span>
                                          </span>
                                        );
                                      } else if (acStatus === 'Graduated') {
                                        return (
                                          <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-700 text-[11px] font-black rounded-lg flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                            <span>حالة الطالب: خريج 🎓</span>
                                          </span>
                                        );
                                      }
                                      return null;
                                    })()}

                                    <button 
                                      onClick={() => {
                                        const stStage = getAcademicStage(student?.grade || '');
                                        const currentUnit = student?.preferredPricingUnit || (student?.sessionSystem === 'session_40' ? 'session_40' : (student?.grade ? getDefaultPricingUnitForGrade(student.grade) : 'hourly'));
                                        setEditName(student?.name || '');
                                        setEditGrade(student?.grade || '');
                                        setEditPhone(student?.phone ? cleanLocalPhoneDigits(student.phone) : '');
                                        setEditEmail(student?.email || '');
                                        setEditGender(student?.gender || 'Male');
                                        setEditNotes(student?.notes || '');
                                        setEditIsOpenBalance(student?.isOpenBalance || false);
                                        setEditLowBalanceThreshold(student?.lowBalanceThreshold !== undefined ? String(student.lowBalanceThreshold) : '-100');
                                        setEditHourlyRate(student?.hourlyRate !== undefined && student?.hourlyRate !== null ? student.hourlyRate : '');
                                        setEditAcademicStatus(student?.academicStatus || 'Active');
                                        setEditIsArchived(student?.archived || false);
                                        setEditPreferredPricingUnit(currentUnit);
                                        setEditDefaultSessionDuration(student?.defaultSessionDurationMinutes || 60);
                                        // 40-minute session rate for student and teacher
                                        const initSessionRate = student?.sessionRate !== undefined && student?.sessionRate !== null && student?.sessionRate !== ''
                                          ? student.sessionRate
                                          : (stStage === 'secondary' ? (student?.secondarySchoolSessionRate ?? 50) : (student?.middleSchoolSessionRate ?? 40));
                                        const initTeacherPayout = student?.sessionPayoutTeacher !== undefined && student?.sessionPayoutTeacher !== null && student?.sessionPayoutTeacher !== ''
                                          ? student.sessionPayoutTeacher
                                          : (stStage === 'secondary' ? (student?.secondarySchoolTeacherSessionPayout ?? 35) : (student?.middleSchoolTeacherSessionPayout ?? 25));
                                        setEditSessionRate(initSessionRate);
                                        setEditTeacherSessionPayout(initTeacherPayout);
                                        setIsEditingStudent(true);
                                      }}
                                      type="button"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black border border-slate-200 hover:border-[#D4A33C] text-slate-400 hover:text-[#D4A33C] rounded-lg transition-colors bg-slate-50/50 cursor-pointer"
                                    >
                                      <Pencil size={11} className="shrink-0" />
                                      <span>تعديل البيانات</span>
                                    </button>

                                    <button 
                                      onClick={() => {
                                        setTrialBookingStudent(student);
                                        setTrialSubject('الرياضيات');
                                        setTrialTopic('');
                                        setTrialTeacherId(student.teachers && student.teachers.length > 0 ? student.teachers[0] : '');
                                        setTrialBookingError('');
                                        setTrialBookingSuccess('');
                                        setIsTrialBookingModalOpen(true);
                                      }}
                                      type="button"
                                      className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black border border-amber-300 hover:border-amber-500 bg-amber-50 hover:bg-amber-100 text-amber-850 rounded-lg transition-all shadow-sm cursor-pointer"
                                    >
                                      <CalendarPlus size={11} className="shrink-0 text-amber-600 animate-bounce" />
                                      <span>حجز حصة تجريبية وتنسيب 🧪</span>
                                    </button>
                                    
                                    {student?.archived === true ? (
                                      <button 
                                        onClick={() => setRestoreConfirmStudent(student)}
                                        type="button"
                                        className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black border border-emerald-200 hover:border-emerald-500 text-emerald-600 hover:text-emerald-700 rounded-lg transition-colors bg-emerald-50/40 cursor-pointer"
                                        title="إلغاء الأرشفة وإعادة تنشيط الطالب"
                                      >
                                        <RotateCcw size={11} className="shrink-0" />
                                        <span>إلغاء الأرشفة وتنشيط الطالب 🟢</span>
                                      </button>
                                    ) : (
                                      <button 
                                        onClick={() => {
                                          setArchiveConfirmStudent(student);
                                        }}
                                        type="button"
                                        className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black border border-amber-200 hover:border-amber-500 text-amber-600 hover:text-amber-700 rounded-lg transition-colors bg-amber-50/40 cursor-pointer"
                                        title="أرشفة الطالب بسبب توقفه عن الدوام"
                                      >
                                        <Archive size={11} className="shrink-0" />
                                        <span>أرشفة الطالب (توقف عن الدوام) 🗄️</span>
                                      </button>
                                    )}
                                    {customRatesCount > 0 && (
                                      <button 
                                        onClick={() => setIsCustomRatesModalOpen(true)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 rounded-full border border-indigo-200/50 text-[10px] font-black transition-all cursor-pointer shadow-sm active:scale-95 select-none"
                                        title="انقر لعرض تفاصيل الأسعار المخصصة"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                                        <span>أسعار مخصصة نشطة ({customRatesCount})</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                                <div className="flex flex-col gap-2">
                                   <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${lifetimeStats.balance < 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        حالة حساب الطالب: {lifetimeStats.balance < 0 ? 'رصيد غير كافٍ / معلق' : 'حساب نشط ومغطى مالياً'}
                                      </span>
                                   </div>
                                   {isLowBalance && (
                                      <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-50 border border-rose-200/50 rounded-xl text-[10px] text-rose-600 font-black animate-pulse self-start">
                                        <AlertTriangle size={12} />
                                        <span>تنبيه: رصيد منخفض (تحت الحد المسموح به ₪{limit})</span>
                                      </div>
                                   )}
                                </div>
                             </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-4">
                             <div className={`border px-8 py-5 rounded-[2rem] text-right transition-all duration-300 min-w-[245px] ${isLowBalance ? 'bg-rose-50/50 border-rose-100 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                                <div className="flex items-center justify-between gap-4 mb-1">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-nowrap">الرصيد المتوفر للتعليم</p>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {customRatesCount > 0 && (
                                      <button 
                                        onClick={() => setIsCustomRatesModalOpen(true)}
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-750 hover:text-indigo-850 rounded-lg text-[9px] font-black transition-all cursor-pointer border border-indigo-100/50"
                                        title="انقر لمشاهدة تفاصيل الأسعار المخصصة"
                                      >
                                        عرض
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowDirectBalanceEdit(!showDirectBalanceEdit);
                                        setDirectBalanceValue(String(lifetimeStats.balance));
                                      }}
                                      className="p-1 rounded bg-slate-200 hover:bg-[#D4A33C] hover:text-slate-950 text-slate-700 transition-colors cursor-pointer"
                                      title="تعديل الرصيد يدويًا"
                                    >
                                      <Pencil size={11} />
                                    </button>
                                  </div>
                                </div>
                                {showDirectBalanceEdit ? (
                                  <div className="flex items-center gap-1.5 mt-2 justify-end" dir="rtl">
                                    <button
                                      type="button"
                                      onClick={() => setShowDirectBalanceEdit(false)}
                                      className="p-1 px-1.5 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-350 transition-colors cursor-pointer text-[10px] font-black"
                                    >
                                      إلغاء
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDirectBalanceAdjustment(lifetimeStats.balance)}
                                      className="p-1 px-1.5 bg-[#D4A33C] text-slate-950 rounded-md hover:bg-amber-500 transition-colors cursor-pointer text-[10px] font-black"
                                    >
                                      تأكيد
                                    </button>
                                    <span className="text-xs font-black text-slate-500">₪</span>
                                    <input
                                      type="number"
                                      value={directBalanceValue}
                                      onChange={e => setDirectBalanceValue(e.target.value)}
                                      className="w-20 px-2 py-0.5 bg-white border border-slate-300 rounded-lg font-black text-slate-900 text-right text-xs outline-none focus:ring-1 focus:ring-[#D4A33C]"
                                      placeholder="0"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-3 mt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowTopUpForm(true);
                                        setTimeout(() => {
                                          const formEl = document.getElementById('top-up-form-section');
                                          if (formEl) {
                                            formEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          }
                                        }, 100);
                                      }}
                                      className="w-7 h-7 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center cursor-pointer shadow-md transition-all active:scale-90 duration-150 shrink-0"
                                      title="إضافة دفعة شحن جديدة ومراكمة الرصيد الكلي (+)"
                                    >
                                      <Plus size={16} className="stroke-[3]" />
                                    </button>
                                    <p className={`text-3xl font-black ${lifetimeStats.balance < 0 || isLowBalance ? 'text-rose-600' : 'text-emerald-500'}`}>
                                       ₪{lifetimeStats.balance}
                                    </p>
                                  </div>
                                )}
                             </div>
                             {lifetimeStats.studentCredits.length > 0 && (
                               <button 
                                 type="button"
                                 onClick={() => {
                                   const sortedCredits = [...lifetimeStats.studentCredits].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
                                   if (sortedCredits[0]) {
                                     handleGeneratePaymentReceipt(sortedCredits[0], student);
                                   }
                                 }}
                                 className="bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white border border-emerald-200/80 px-6 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-2.5 cursor-pointer"
                                 title="طباعة سند قبض مالي رسمي لأحدث دفعة مسجلة للطالب"
                               >
                                 <Receipt size={18} className="text-emerald-600 group-hover:text-white" />
                                 <span>سند قبض آخر دفعة</span>
                               </button>
                             )}
                             <button 
                               type="button"
                               onClick={() => openSingleAlertModal(student)}
                               className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2.5 cursor-pointer active:scale-95"
                               title="إرسال إشعار رصيد الطالب الحالي لولي الأمر عبر WhatsApp 📱"
                             >
                               <MessageSquare size={18} />
                               <span>إرسال الرصيد لولي الأمر 📱</span>
                             </button>
                             <button 
                               type="button"
                               onClick={() => handlePackageRenewalAlert(student)}
                               className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-6 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2.5 cursor-pointer active:scale-95 group/renewbtn"
                               title="تنبيه تجديد الحزمة: إنشاء وإرسال رسالة واتساب مخصصة تحث ولي الأمر على تجديد الرصيد قبل نفاده ⚡"
                             >
                               <RefreshCw size={18} className="stroke-[2.5] group-hover/renewbtn:rotate-180 transition-transform duration-300" />
                               <span>تنبيه تجديد الحزمة ⚡</span>
                             </button>
                             <button 
                              onClick={() => setShowTopUpForm(!showTopUpForm)}
                              className="bg-slate-900 text-white hover:bg-[#D4A33C] hover:text-slate-950 px-8 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center gap-3"
                             >
                                <Wallet size={18} />
                                شحن رصيد الطالب
                             </button>
                          </div>
                        </div>
                      </section>
                    );
                  })()}

                  {/* Top Up Balance Form */}
                  <AnimatePresence>
                    {showTopUpForm && (
                      <motion.div 
                        key="student-top-up-form"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-6"
                        id="top-up-form-section"
                      >
                        <form onSubmit={handleTopUp} className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white space-y-6 shadow-2xl text-right">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                            <div>
                              <h4 className="text-xl font-black tracking-tight leading-none text-white flex items-center gap-2">
                                <Receipt className="text-[#D4A33C]" size={22} />
                                <span>شحن رصيد محفظة الطالب وإصدار دفعة مالية</span>
                              </h4>
                              <p className="text-xs text-slate-300 font-bold mt-1.5">
                                يمكنك تحديد الخدمة المقدمة وطريقة السداد ومعاينة سند القبض المعتمد حياً قبل تأكيد العملية أو طباعته فوراً
                              </p>
                            </div>
                            <span className="px-3.5 py-1 bg-white/10 text-amber-300 border border-white/10 rounded-xl text-[11px] font-black self-start sm:self-auto">
                              معاينة حية وسند رسمي ✅
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                             <div className="space-y-2 text-right">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-70">المبلغ المقبوض (شيكل ₪) *</label>
                                <div className="relative">
                                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₪</span>
                                  <input 
                                    type="number" 
                                    required
                                    value={topUpAmount}
                                    onChange={e => setTopUpAmount(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white font-black placeholder:text-white/20 focus:bg-white/10 transition-all outline-none text-right placeholder-right text-base"
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0.01"
                                  />
                                </div>
                             </div>

                             <div className="space-y-2 text-right">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-70">تاريخ العملية / الدفعة *</label>
                                <input 
                                  type="date" 
                                  required
                                  value={topUpDate}
                                  onChange={e => setTopUpDate(e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-black focus:bg-white/10 transition-all outline-none text-right"
                                />
                             </div>

                             <div className="space-y-2 text-right">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-70">الخدمة المقدمة *</label>
                                <input 
                                  type="text" 
                                  required
                                  value={topUpService}
                                  onChange={e => setTopUpService(e.target.value)}
                                  placeholder="الخدمة المقدمة..."
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-black focus:bg-white/10 transition-all outline-none text-right placeholder:text-white/20"
                                />
                             </div>

                             <div className="space-y-2 text-right">
                                <label className="text-[10px] font-black uppercase tracking-widest opacity-70">طريقة السداد *</label>
                                <select 
                                  value={topUpPaymentMethod}
                                  onChange={e => setTopUpPaymentMethod(e.target.value)}
                                  className="w-full bg-slate-800 border border-white/10 rounded-2xl px-6 py-4 text-white font-black focus:bg-slate-700 transition-all outline-none text-right cursor-pointer"
                                >
                                  <option value="نقداً (كاش)">💵 نقداً (كاش)</option>
                                  <option value="حوالة بنكية">🏛️ حوالة بنكية</option>
                                  <option value="بطاقة ائتمان">💳 بطاقة ائتمان</option>
                                  <option value="شحن محفظة إلكترونية">📱 شحن محفظة إلكترونية</option>
                                  <option value="شيك بنكي">📝 شيك بنكي</option>
                                </select>
                             </div>
                          </div>

                          {/* Dynamic Financial Categories Selector & Quick Suggestions */}
                          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3 text-right">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black text-amber-300 flex items-center gap-1.5">
                                <span>🏷️</span>
                                <span>التصنيف المالي المخصص للدفعة (رسوم كتب، اشتراكات، خدمات إضافية...):</span>
                              </span>
                              {topUpFinancialCategory && (
                                <button
                                  type="button"
                                  onClick={() => setTopUpFinancialCategory('')}
                                  className="text-[10px] text-rose-300 hover:text-rose-200 cursor-pointer underline"
                                >
                                  إلغاء التحديد
                                </button>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {financialCategories
                                .filter(c => c.isActive && (c.type === 'deposit' || c.type === 'both'))
                                .map(cat => {
                                  const isSelected = topUpFinancialCategory === cat.name;
                                  return (
                                    <button
                                      key={cat.id}
                                      type="button"
                                      onClick={() => {
                                        setTopUpFinancialCategory(cat.name);
                                        setTopUpService(cat.name);
                                        if ((!topUpAmount || parseFloat(topUpAmount) === 0) && cat.defaultAmount && cat.defaultAmount > 0) {
                                          setTopUpAmount(String(cat.defaultAmount));
                                        }
                                      }}
                                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                        isSelected
                                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black'
                                          : 'bg-white/10 text-slate-200 border-white/10 hover:bg-white/15'
                                      }`}
                                    >
                                      <span>{cat.icon || '🏷️'}</span>
                                      <span>{cat.name}</span>
                                      {cat.defaultAmount !== undefined && cat.defaultAmount > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${isSelected ? 'bg-slate-900/20 text-slate-950 font-black' : 'bg-white/10 text-amber-300'}`}>
                                          ₪{cat.defaultAmount}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                            </div>

                            {/* Fallback Quick Service Suggestions */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
                              <span className="text-[10px] font-bold text-slate-400 ml-1">اقتراحات إضافية:</span>
                              {[
                                'شحن رصيد المحفظة التعليمية',
                                'رسوم باقة حصص فردية (خاصة)',
                                'اشتراك حصص دراسية جماعية',
                                'رسوم مادة دراسية وتقوية',
                                'رسوم اختبارات ومراجعات دورية',
                                'تسوية رصيد ومتابعة أكاديمية'
                              ].map(svc => (
                                <button
                                  key={svc}
                                  type="button"
                                  onClick={() => {
                                    setTopUpService(svc);
                                  }}
                                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                    topUpService === svc && !topUpFinancialCategory
                                      ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                                      : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                                  }`}
                                >
                                  {svc}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2 text-right">
                            <label className="text-[10px] font-black uppercase tracking-widest opacity-70">بيان وملاحظات السند (اختياري)</label>
                            <input 
                              type="text" 
                              value={topUpNote}
                              onChange={e => setTopUpNote(e.target.value)}
                              placeholder="ملاحظات تظهر داخل السند (مثل: دفعة تحت الحساب / رقم إشعار الحوالة)..."
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold placeholder:text-white/20 focus:bg-white/10 transition-all outline-none text-right"
                            />
                          </div>

                          {/* Actions toolbar */}
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
                            <div className="text-xs text-slate-400 font-medium">
                              {topUpAmount && parseFloat(topUpAmount) > 0 ? (
                                <span>سيتم قيد مبلغ <strong className="text-emerald-400">₪{parseFloat(topUpAmount).toFixed(2)}</strong> لصالح الطالب: <strong className="text-white">{student?.name}</strong></span>
                              ) : (
                                <span>يرجى إدخال المبلغ لتفعيل خيارات المعاينة والشحن</span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                              <button 
                                type="button"
                                onClick={handleLivePreviewBeforeTopUp}
                                disabled={!topUpAmount || parseFloat(topUpAmount) <= 0}
                                className="flex-1 sm:flex-none px-6 py-4 bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xs uppercase transition-all flex items-center justify-center gap-2 cursor-pointer border border-white/15"
                                title="عرض معاينة حية لسند القبض المالي قبل اعتماده"
                              >
                                <Eye size={16} className="text-amber-400" />
                                <span>معاينة حية للإيصال قبل الإيداع 👁️</span>
                              </button>

                              <button 
                                type="submit"
                                disabled={!topUpAmount || parseFloat(topUpAmount) <= 0}
                                className="flex-1 sm:flex-none bg-[#D4A33C] text-slate-950 px-8 py-4 rounded-2xl font-black text-xs uppercase hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-black shadow-lg shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-2"
                              >
                                <Wallet size={16} />
                                <span>تأكيد شحن الرصيد</span>
                              </button>
                            </div>
                          </div>
                        </form>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Financial Audit Timeline (Last 5 transactions) */}
                  {(() => {
                    const latestTransactions = (() => {
                      const list: {
                        id: string;
                        date: string;
                        amount: number;
                        type: 'deposit' | 'deduction' | 'session_fee';
                        description: string;
                        rawDate: string;
                        refId?: string;
                      }[] = [];

                      // 1. Process studentCredits
                      lifetimeStats.studentCredits.forEach((c) => {
                        list.push({
                          id: c.id || Math.random().toString(),
                          date: c.date || '',
                          amount: c.amount,
                          type: c.amount >= 0 ? 'deposit' : 'deduction',
                          description: sanitizeFinancialNote(c.note) || (c.amount >= 0 ? 'شحن رصيد / دفعة معتمدة' : 'حركة مالية معتمدة'),
                          rawDate: c.date || '',
                          refId: c.id,
                          isInternalAdjustment: c.hideInStatement === true || c.isAdjustment === true
                        } as any);
                      });

                      // 2. Process approved studentSessions
                      const approvedSessions = lifetimeStats.studentSessions.filter(
                        s => s.approved !== false && s.status !== 'pending' && s.status !== 'booked'
                      );

                      approvedSessions.forEach((s) => {
                        const teacherObj = teachers.find(t => t.id === s.teacherId);
                        const cost = getStudentSessionCost(s, student, teacherObj, settings);
                        const teacherName = teacherObj ? teacherObj.name : 'المعلم';
                        const isGroupText = s.isGroupSession || s.isGroup ? 'حصة جماعية' : 'حصة فردية';

                        list.push({
                          id: s.id || Math.random().toString(),
                          date: s.date || '',
                          amount: -cost,
                          type: 'session_fee',
                          description: `خصم كلفة حصة - ${isGroupText} مع المعلم ${teacherName} (${s.durationHours} س)`,
                          rawDate: s.date || '',
                          refId: s.id
                        });
                      });

                      // Sort descending by date, then by id
                      return list
                        .sort((a, b) => {
                          const dateComp = b.rawDate.localeCompare(a.rawDate);
                          if (dateComp !== 0) return dateComp;
                          return b.id.localeCompare(a.id);
                        })
                        .slice(0, 5);
                    })();

                    return (
                      <section className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm space-y-6 text-right" dir="rtl">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center font-black shrink-0">
                              <History size={20} className="text-[#D4A33C]" />
                            </div>
                            <div>
                              <h4 className="text-base font-black text-slate-900">سجل المعاملات والعمليات المالية الأخيرة</h4>
                              <p className="text-[10px] font-bold text-slate-400 mt-1">آخر ٥ عمليات شحن، تسوية، أو سحب تكلفة الحصص المعتمدة</p>
                            </div>
                          </div>
                          
                          <span className="px-3.5 py-1 bg-slate-50 border border-slate-150 text-slate-650 text-[10px] font-black rounded-lg self-start sm:self-auto">
                            إجمالي العمليات: {lifetimeStats.studentCredits.length + lifetimeStats.studentSessions.filter(s => s.approved !== false && s.status !== 'pending' && s.status !== 'booked').length}
                          </span>
                        </div>

                        {latestTransactions.length === 0 ? (
                          <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <Clock className="mx-auto text-slate-300 mb-2" size={28} />
                            <p className="text-xs font-black text-slate-400">لا توجد عمليات مالية مسجلة في حساب هذا الطالب حالياً.</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse min-w-[500px]">
                              <thead>
                                <tr className="border-b border-slate-100 text-[10px] font-black uppercase text-slate-405">
                                  <th className="pb-3 text-right pr-2">العملية الماليّة</th>
                                  <th className="pb-3 text-right">التاريخ</th>
                                  <th className="pb-3 text-right">البيان والتفاصيل</th>
                                  <th className="pb-3 text-left pl-2">القيمة الحركية</th>
                                  <th className="pb-3 text-center pl-2 w-20">إجراءات</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 text-xs">
                                {latestTransactions.map((tx, txIdx) => {
                                  const isPositive = tx.amount >= 0;
                                  return (
                                    <tr key={`tx-${tx.type}-${tx.id || txIdx}-${txIdx}`} className="hover:bg-indigo-50/40 transition-colors duration-150 group">
                                      <td className="py-3.5 pr-2 font-black">
                                        <div className="flex items-center gap-2">
                                          <span className={`w-2 h-2 rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                          <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                                            {tx.type === 'deposit' ? 'إيداع / شحن رصيد' : tx.type === 'deduction' ? 'حركة مالية معتمدة' : 'خصم حصة معتمدة'}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-3.5 font-mono font-bold text-slate-500">
                                        {tx.date || '---'}
                                      </td>
                                      <td className="py-3.5 font-bold text-slate-700 leading-relaxed">
                                        <span>{tx.description}</span>
                                        {(tx as any).isInternalAdjustment && (
                                          <span className="inline-block text-[9px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md font-black mr-1.5 align-middle">
                                            حركة داخلية (غير ظاهرة بالكشف 🛡️)
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-3.5 text-left pl-2 font-mono font-black" dir="ltr">
                                        <span className={isPositive ? 'text-emerald-500' : 'text-rose-500'}>
                                          {isPositive ? '+' : ''}₪{tx.amount.toFixed(2)}
                                        </span>
                                      </td>
                                      <td className="py-3.5 text-center pl-2">
                                        <div className="flex items-center justify-center gap-1">
                                          {isPositive && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const cred = lifetimeStats.studentCredits.find(c => c.id === tx.refId || c.id === tx.id) || {
                                                  id: tx.refId || tx.id,
                                                  studentId: student.id,
                                                  amount: tx.amount,
                                                  date: tx.date,
                                                  note: tx.description
                                                };
                                                handleGeneratePaymentReceipt(cred, student);
                                              }}
                                              className="text-emerald-600 hover:text-emerald-800 p-1.5 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer active:scale-95 inline-flex items-center justify-center"
                                              title="طباعة وحفظ سند قبض مالي رسمي (PDF)"
                                            >
                                              <Receipt size={14} />
                                            </button>
                                          )}
                                          {isCurrentUserManager && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setDeleteConfirm({
                                                  id: tx.refId || tx.id,
                                                  type: tx.type === 'session_fee' ? 'session' : 'credit'
                                                });
                                              }}
                                              className="text-rose-600 hover:text-white hover:bg-rose-600 bg-rose-50/70 p-1.5 px-2 rounded-lg transition-all duration-200 cursor-pointer active:scale-95 inline-flex items-center gap-1 border border-rose-150 hover:border-rose-600 shadow-xs hover:shadow-md hover:scale-105 group/del"
                                              title={tx.type === 'session_fee' ? "حذف هذه الحصة واسترداد الرصيد المخصوم للطالب" : "حذف هذه العملية المالية وتعديل رصيد الطالب"}
                                            >
                                              <Trash2 size={13} className="transition-transform group-hover/del:scale-110" />
                                              <span className="text-[9px] font-black">حذف</span>
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </section>
                    );
                  })()}

                  {/* Smart Matchmaker section inside Student profile */}
                  <section className="bg-slate-50/50 rounded-[2.5rem] p-8 border border-slate-200/80 shadow-sm space-y-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shrink-0">
                          <GraduationCap size={20} className="text-[#D4A33C]" />
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-slate-905">تنسيب معلمي الطالب والتفاصيل المالية</h4>
                          <p className="text-[10px] font-bold text-slate-405 mt-1">إضافة معلم أو إلغاء تنسيب وتحديد الأسعار المخصصة له</p>
                        </div>
                      </div>

                      {/* Teachers Assigned list & Link Teacher button */}
                      <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الأساتذة المنسقين:</span>
                          <div className="flex flex-wrap gap-1 items-center bg-white/60 border border-slate-200/50 rounded-2xl p-1.5 min-h-[36px]">
                            {(() => {
                              const linkedTeachers = teachers.filter(t => student?.teachers?.includes(t.id));
                              if (linkedTeachers.length === 0) {
                                return <span className="text-[10px] font-bold text-slate-400 px-2 select-none">لا يوجد معلمين منسقين بعد</span>;
                              }
                              return linkedTeachers.map((t, tIdx) => (
                                <span key={`linked-t-${t.id || tIdx}-${tIdx}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-slate-800 text-[10px] font-black border border-amber-200 shadow-xs">
                                  <span className="text-[#D4A33C]">👨‍🏫 {t.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => student && openTransferModal(student, t.id)}
                                    className="p-0.5 hover:bg-amber-200 text-amber-800 rounded transition-colors"
                                    title={`نقل / ترحيل الطالب من المعلم ${t.name} إلى معلم آخر وإرسال إشعار فوري`}
                                  >
                                    <RefreshCw size={10} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => unlinkTeacherFromStudent(t.id, student?.id)}
                                    className="p-0.5 hover:bg-rose-100 text-rose-600 rounded transition-colors"
                                    title={`إلغاء تنسيب المعلم ${t.name}`}
                                  >
                                    <X size={10} />
                                  </button>
                                </span>
                              ));
                            })()}
                          </div>
                        </div>

                        {student && student.teachers && student.teachers.length > 0 && (
                          <button
                            type="button"
                            onClick={() => openTransferModal(student)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl text-[10px] font-black transition-all shadow-sm active:scale-95 shrink-0"
                            title="ترحيل أو نقل الطالب إلى معلم آخر وإرسال إشعار فوري للطرفين"
                          >
                            <RefreshCw size={12} className="text-amber-600" />
                            <span>ترحيل / نقل لمعلم آخر</span>
                          </button>
                        )}

                        <button
                          onClick={() => setIsLinkTeacherModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 rounded-xl text-[10px] font-black transition-all shadow-sm active:scale-95 shrink-0"
                          title="ربط معلم جديد بالقائمة"
                        >
                          <Plus size={12} />
                          <span>ربط معلم</span>
                        </button>
                      </div>
                    </div>
                    
                    <SmartAssignment 
                      studentId={selectedStudentId} 
                      hideHeader={true} 
                      onAssignmentChange={fetchData} 
                    />

                    {/* Custom Rates Override List */}
                    {student && student.teachers && student.teachers.length > 0 && (() => {
                      const isStudentSession40 = 
                        student.preferredPricingUnit === 'session_40' ||
                        student.sessionSystem === 'session_40' ||
                        (student.grade ? getDefaultPricingUnitForGrade(student.grade) === 'session_40' : false);

                      const studentStage = getAcademicStage(student.grade || student.academicLevel || '');

                      const defaultStudentSessionRate = 
                        student.sessionRate && Number(student.sessionRate) > 0
                          ? Number(student.sessionRate)
                          : studentStage === 'secondary'
                            ? (student.secondarySchoolSessionRate ?? globalSettings?.secondarySchoolStudentSessionRate ?? DEFAULT_STAGE_PRICING.secondarySchoolStudentSessionRate ?? 50)
                            : studentStage === 'middle'
                              ? (student.middleSchoolSessionRate ?? globalSettings?.middleSchoolStudentSessionRate ?? DEFAULT_STAGE_PRICING.middleSchoolStudentSessionRate ?? 40)
                              : (student.primarySchoolSessionRate ?? globalSettings?.primarySchoolStudentSessionRate ?? 35);

                      return (
                        <div className="pt-6 border-t border-slate-200">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                            <div className="flex items-center gap-2">
                              <DollarSign size={16} className={isStudentSession40 ? "text-amber-600" : "text-indigo-600"} />
                              <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                                {isStudentSession40 ? 'تخصيص أسعار الحصص (40 دقيقة) استثنائية لهذا الطالب 🎓' : 'تخصيص أسعار ساعات استثنائية لهذا الطالب ⏱️'}
                              </h5>
                            </div>
                            <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border self-start sm:self-auto ${
                              isStudentSession40 
                                ? 'bg-amber-100 text-amber-900 border-amber-300' 
                                : 'bg-blue-100 text-blue-900 border-blue-300'
                            }`}>
                              {isStudentSession40 ? '🎓 نظام الحصة (40 دقيقة)' : '⏱️ نظام الساعات (60 دقيقة)'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {teachers.filter(t => student.teachers.includes(t.id)).map((t, tIdx) => {
                              const defaultHourlyRate = t.billingRate || t.hourlyRate || (studentStage === 'secondary' ? 60 : 50);
                              const defaultHourlyPayout = t.payoutRate || t.hourlyRate || 35;

                              const defaultTeacherSessionPayout = 
                                student.sessionPayoutTeacher && Number(student.sessionPayoutTeacher) > 0
                                  ? Number(student.sessionPayoutTeacher)
                                  : studentStage === 'secondary'
                                    ? (t.secondarySchoolSessionPayout ?? globalSettings?.secondarySchoolTeacherSessionRate ?? DEFAULT_STAGE_PRICING.secondarySchoolTeacherSessionRate ?? 35)
                                    : studentStage === 'middle'
                                      ? (t.middleSchoolSessionPayout ?? globalSettings?.middleSchoolTeacherSessionRate ?? DEFAULT_STAGE_PRICING.middleSchoolTeacherSessionRate ?? 25)
                                      : (t.primarySchoolSessionPayout ?? t.sessionPayoutRate ?? Math.round(((t.payoutRate || t.hourlyRate || 35) * 40) / 60));

                              const defaultRate = isStudentSession40 ? defaultStudentSessionRate : defaultHourlyRate;
                              const defaultPayout = isStudentSession40 ? defaultTeacherSessionPayout : defaultHourlyPayout;

                              const customRateVal = tempCustomRates[t.id] !== undefined ? tempCustomRates[t.id] : '';
                              const customPayoutVal = tempTeacherPayoutRates[t.id] !== undefined ? tempTeacherPayoutRates[t.id] : '';

                              const assDoc = assignments.find(a => a.studentId === student.id && a.teacherId === t.id);

                              const isSaved = 
                                ((student.customRates?.[t.id] === undefined && customRateVal === '') || (student.customRates?.[t.id] !== undefined && String(student.customRates[t.id]) === customRateVal)) &&
                                ((assDoc?.teacherPayoutRate === undefined && customPayoutVal === '') || (assDoc?.teacherPayoutRate !== undefined && String(assDoc.teacherPayoutRate) === customPayoutVal));

                              return (
                                <div key={`teacher-rate-${t.id || tIdx}-${tIdx}`} className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col gap-3 shadow-sm hover:border-indigo-500/30 transition-all text-right">
                                  <div className="text-right flex items-center justify-between border-b border-slate-100 pb-2">
                                    <div>
                                      <span className="text-xs font-black text-slate-800 block">{t.name}</span>
                                      <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                                        {isStudentSession40 ? (
                                          `السعر الافتراضي للحصة (40 دقيقة) للطالب: ₪${defaultStudentSessionRate}/حصة | للمعلم: ₪${defaultTeacherSessionPayout}/حصة`
                                        ) : (
                                          `السعر الافتراضي للطالب: ₪${defaultHourlyRate}/ساعة | للمعلم: ₪${defaultHourlyPayout}/ساعة`
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-end gap-3 justify-between">
                                    {/* Student Billing Rate Input */}
                                    <div className="flex-1 min-w-[120px]">
                                      <label className="text-[9px] font-black text-slate-500 block mb-1">
                                        {isStudentSession40 ? 'سعر الحصة (40 دقيقة) للطالب' : 'سعر ساعة الفوترة للطالب'}
                                      </label>
                                      <div className="relative text-right">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 pointer-events-none">
                                          {isStudentSession40 ? '₪ / 40د' : '₪ / س'}
                                        </span>
                                        <input
                                          type="number"
                                          placeholder={String(defaultRate)}
                                          value={customRateVal}
                                          onChange={(e) => {
                                            setTempCustomRates(prev => ({
                                              ...prev,
                                              [t.id]: e.target.value
                                            }));
                                          }}
                                          className="w-full pr-3 pl-12 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none text-xs font-bold text-slate-800 transition-all text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                      </div>
                                    </div>

                                    {/* Teacher Payout Rate Input */}
                                    <div className="flex-1 min-w-[120px]">
                                      <label className="text-[9px] font-black text-slate-500 block mb-1">
                                        {isStudentSession40 ? 'أجر الحصة (40 دقيقة) للمعلم' : 'أجر ساعة المعلم'}
                                      </label>
                                      <div className="relative text-right">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 pointer-events-none">
                                          {isStudentSession40 ? '₪ / 40د' : '₪ / س'}
                                        </span>
                                        <input
                                          type="number"
                                          placeholder={String(defaultPayout)}
                                          value={customPayoutVal}
                                          onChange={(e) => {
                                            setTempTeacherPayoutRates(prev => ({
                                              ...prev,
                                              [t.id]: e.target.value
                                            }));
                                          }}
                                          className="w-full pr-3 pl-12 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none text-xs font-bold text-slate-800 transition-all text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                      </div>
                                    </div>

                                    <button
                                      onClick={async () => {
                                        const billVal = customRateVal === '' ? null : Number(customRateVal);
                                        const payVal = customPayoutVal === '' ? null : Number(customPayoutVal);
                                        
                                        const updatedCustomRates = { ...(student.customRates || {}) };
                                        const updatedCustomPayoutRates = { ...((student as any).customPayoutRates || {}) };

                                        if (billVal === null) {
                                          delete updatedCustomRates[t.id];
                                        } else {
                                          updatedCustomRates[t.id] = billVal;
                                        }

                                        if (payVal === null) {
                                          delete updatedCustomPayoutRates[t.id];
                                        } else {
                                          updatedCustomPayoutRates[t.id] = payVal;
                                        }
                                        
                                        const studentRef = doc(db, 'students', student.id);
                                        await updateDoc(studentRef, {
                                          customRates: updatedCustomRates,
                                          customPayoutRates: updatedCustomPayoutRates
                                        });

                                        // Sync to assignments collection for consistency!
                                        try {
                                          const q = query(
                                            collection(db, 'assignments'),
                                            where('studentId', '==', student.id),
                                            where('teacherId', '==', t.id)
                                          );
                                          const querySnapshot = await getDocs(q);
                                          if (!querySnapshot.empty) {
                                            for (const docSnap of querySnapshot.docs) {
                                              await updateDoc(docSnap.ref, {
                                                studentBillingRate: billVal === null ? 0 : billVal,
                                                teacherPayoutRate: payVal === null ? 0 : payVal,
                                                pricingUnit: isStudentSession40 ? 'session_40' : 'hourly',
                                                updatedAt: new Date().toISOString()
                                              });
                                            }
                                          } else {
                                            // Create assignment if it doesn't exist
                                            await addDoc(collection(db, 'assignments'), {
                                              studentId: student.id,
                                              teacherId: t.id,
                                              studentBillingRate: billVal === null ? 0 : billVal,
                                              teacherPayoutRate: payVal === null ? 0 : payVal,
                                              pricingUnit: isStudentSession40 ? 'session_40' : 'hourly',
                                              createdAt: new Date().toISOString()
                                            });
                                          }
                                        } catch (err) {
                                          console.error("Error syncing custom rates to assignments:", err);
                                        }

                                        await logActivity({
                                          actionType: 'UPDATE_STUDENT_CUSTOM_RATE',
                                          actionName: isStudentSession40 ? 'تخصيص سعر حصة (40 دقيقة) استثنائي لطالب' : 'تخصيص سعر استثنائي لطالب',
                                          studentId: student.id,
                                          studentName: student.name,
                                          teacherId: t.id,
                                          teacherName: t.name,
                                          details: `تم تحديث السعر الاستثنائي للطالب "${student.name}" مع المعلم "${t.name}" بنظام (${isStudentSession40 ? 'حصة 40 دقيقة' : 'ساعة تدريسية'}) - (سعر الطالب: ₪${billVal ?? 'افتراضي'}، أجر المعلم: ₪${payVal ?? 'افتراضي'})`,
                                          newValue: { billingRate: billVal, payoutRate: payVal, pricingUnit: isStudentSession40 ? 'session_40' : 'hourly' }
                                        });

                                        fetchData();
                                      }}
                                      disabled={isSaved}
                                      className={`p-2.5 px-4 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-1.5 shrink-0 select-none ${
                                        isSaved 
                                          ? 'bg-slate-50 text-slate-400 border-slate-100/40 cursor-not-allowed'
                                          : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-850 shadow-sm active:scale-95 cursor-pointer'
                                      }`}
                                    >
                                      {isSaved ? <Check size={14} className="text-emerald-500" /> : <Plus size={14} />}
                                      <span>{isSaved ? 'محفوظ' : 'حفظ'}</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </section>

                  {/* Date range filter and export row */}
                  {student?.status === StudentStatus.Pending ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] p-10 space-y-8 text-right mt-6" dir="rtl">
                      <div className="border-b border-slate-200 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-black rounded-lg">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                            استمارة تسجيل إلكتروني جديدة قيد الانتظار
                          </span>
                          <h4 className="text-2xl font-black text-slate-900 mt-2">سير عمل فحص واعتماد الطالب</h4>
                          <p className="text-xs text-slate-400 font-bold mt-1">يرجى متابعة الخطوات التالية لتنشيب الطالب وتنشيط حسابه على المنصة.</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black text-slate-500">الحالة الحالية:</span>
                          <span className="px-3 py-1 bg-amber-500/10 text-amber-700 border border-amber-500/20 text-xs font-black rounded-lg">في انتظار المعالجة</span>
                        </div>
                      </div>

                      {/* Timeline/Steps Container */}
                      <div className="relative border-r-2 border-slate-200 pr-8 space-y-8 mr-4">
                        {/* Step 1: Initial Registration */}
                        <div className="relative">
                          {/* Circle Indicator */}
                          <div className="absolute -right-12 top-0.5 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black shadow-lg shadow-emerald-500/20">
                            ✓
                          </div>
                          <div className="space-y-2 text-right">
                            <h5 className="text-sm font-black text-slate-800">1. مرحلة التسجيل الإلكتروني المبدئي</h5>
                            <p className="text-xs text-slate-500 font-bold">تم حفظ الطلب بنجاح ومطابقة البيانات المدخلة من قبل الطالب:</p>
                            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                              <div>
                                <span className="text-[9px] font-black text-slate-400 block uppercase">الاسم الرباعي</span>
                                <span className="text-xs font-extrabold text-slate-800 block mt-1">{student.name}</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-black text-slate-400 block uppercase">الصف الدراسي</span>
                                <span className="text-xs font-extrabold text-indigo-700 block mt-1">{student.grade || student.academicLevel || 'غير محدد'}</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-black text-slate-400 block uppercase">رقم الواتس آب (WhatsApp)</span>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-xs font-extrabold text-slate-800 font-mono" dir="ltr">{student.phone || student.whatsappNumber || 'لا يوجد'}</span>
                                  {(student.phone || student.whatsappNumber) && (
                                    <a
                                      href={`https://wa.me/${(student.phone || student.whatsappNumber).replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-200 transition-colors"
                                      title="محادثة فورية عبر واتس آب"
                                    >
                                      <span>واتس آب</span>
                                      <span>💬</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                              <div>
                                <span className="text-[9px] font-black text-slate-400 block uppercase">تاريخ تقديم الطلب</span>
                                <span className="text-xs font-extrabold text-slate-800 block mt-1">{student.registrationDate || 'غير محدد'}</span>
                              </div>
                            </div>
                            {student.notes && (
                              <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 text-xs font-bold text-amber-800 mt-2">
                                💡 {student.notes}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Step 2: Trial Lesson Phase */}
                        <div className="relative">
                          {(() => {
                            const studentTrial = trialLessons.find(tl => tl.migratedToStudentId === student.id || tl.phone === student.phone || tl.studentName === student.name);
                            const hasTrial = !!studentTrial;
                            const isTrialCompleted = studentTrial?.status === 'completed';

                            return (
                              <>
                                {/* Circle Indicator */}
                                <div className={`absolute -right-12 top-0.5 w-8 h-8 rounded-full flex items-center justify-center font-black shadow-lg ${
                                  isTrialCompleted 
                                    ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
                                    : hasTrial 
                                    ? 'bg-indigo-600 text-white shadow-indigo-600/20 animate-pulse' 
                                    : 'bg-amber-500 text-white shadow-amber-500/20'
                                }`}>
                                  {isTrialCompleted ? '✓' : '2'}
                                </div>
                                <div className="space-y-3 text-right">
                                  <h5 className="text-sm font-black text-slate-800 flex items-center gap-2">
                                    <span>2. مرحلة معالجة الحصة التجريبية (Trial Phase)</span>
                                    {isTrialCompleted && (
                                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded border border-emerald-200">مكتملة</span>
                                    )}
                                    {!isTrialCompleted && hasTrial && (
                                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[9px] font-black rounded border border-indigo-200 animate-pulse">تمت الجدولة - بانتظار التأكيد</span>
                                    )}
                                    {!hasTrial && (
                                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[9px] font-black rounded border border-amber-200">بانتظار الجدولة</span>
                                    )}
                                  </h5>
                                  <p className="text-xs text-slate-500 font-bold">يتم جدولة حصة تجريبية أولى للطالب لمطابقة مستواه واختيار المعلم الأنسب له.</p>
                                  
                                  {hasTrial ? (
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-4">
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                          <span className="text-[9px] font-black text-slate-400 block uppercase">المعلم المسؤول</span>
                                          <span className="text-xs font-extrabold text-slate-800 block mt-1">{studentTrial.teacherName}</span>
                                        </div>
                                        <div>
                                          <span className="text-[9px] font-black text-slate-400 block uppercase">المادة التعليمية</span>
                                          <span className="text-xs font-extrabold text-indigo-700 block mt-1">{studentTrial.subject}</span>
                                        </div>
                                        <div>
                                          <span className="text-[9px] font-black text-slate-400 block uppercase">حالة الحصة</span>
                                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black mt-1 ${isTrialCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${isTrialCompleted ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                                            {isTrialCompleted ? 'تم خوضها بنجاح' : 'مجدولة وبانتظار التأكيد'}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      {!isTrialCompleted && (
                                        <button
                                          type="button"
                                          onClick={() => handleCompleteTrialLesson(studentTrial.id)}
                                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-emerald-600/10 active:scale-95 text-center flex items-center justify-center gap-2"
                                        >
                                          <Check size={14} className="stroke-[2.5]" />
                                          <span>تسجيل الحصة التجريبية كمكتملة وتأكيد خوض الطالب لها بنجاح 🧪</span>
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="bg-amber-50/20 p-5 rounded-2xl border border-dashed border-amber-300 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                      <p className="text-xs font-bold text-amber-800">
                                        ⚠️ لم تقم بجدولة حصة تجريبية لهذا الطالب الجديد حتى الآن. يرجى البدء بجدولة الحصة وتنسيب معلم لتحديد مستواه.
                                      </p>
                                      <button 
                                        onClick={() => {
                                          setTrialBookingStudent(student);
                                          setTrialSubject('الرياضيات');
                                          setTrialTopic('');
                                          setTrialTeacherId(student.teachers && student.teachers.length > 0 ? student.teachers[0] : '');
                                          setTrialBookingError('');
                                          setTrialBookingSuccess('');
                                          setIsTrialBookingModalOpen(true);
                                        }}
                                        type="button"
                                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-black border border-amber-300 hover:border-amber-500 bg-amber-50 hover:bg-amber-100 text-amber-850 rounded-xl transition-all shadow-sm cursor-pointer whitespace-nowrap"
                                      >
                                        <CalendarPlus size={13} className="shrink-0 text-amber-600 animate-bounce" />
                                        <span>جدولة الحصة التجريبية وحجز موعد 🧪</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        {/* Step 3: Placement & Approval */}
                        <div className="relative">
                          {/* Circle Indicator */}
                          <div className="absolute -right-12 top-0.5 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black shadow-lg shadow-indigo-600/20">
                            3
                          </div>
                          <div className="space-y-3 text-right">
                            <h5 className="text-sm font-black text-slate-800">3. مرحلة التنسيب والاعتماد المالي (Admin Review)</h5>
                            <p className="text-xs text-slate-500 font-bold">لا تمنح المنصة صلاحية الدخول الكاملة للطالب إلا بعد قيامك بتنسيب الطالب للمعلم وتحديد تسعيرة الساعة:</p>
                            
                            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Choose teacher */}
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-black text-slate-500">المعلم المعتمد والتنسيب الرئيسي <span className="text-rose-500">*</span></span>
                                  <select
                                    value={workflowTeacherId}
                                    onChange={e => setWorkflowTeacherId(e.target.value)}
                                    className="w-full px-3 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all cursor-pointer"
                                  >
                                    <option value="">-- اختر المعلم لتنسيب الطالب إليه --</option>
                                    {teachers.map(t => (
                                      <option key={t.id} value={t.id}>{t.name} ({t.specialty || 'معلم الأكاديمية'})</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Custom Hourly Rate */}
                                <div className="flex flex-col gap-1">
                                  <span className="text-[10px] font-black text-slate-500">تخصيص سعر الساعة التعليمية للطالب (₪)</span>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-300">₪/ساعة</span>
                                    <input
                                      type="number"
                                      placeholder={`الافتراضي الحالي: ${defaultStudentHourlyRate} ₪`}
                                      value={workflowHourlyRate}
                                      onChange={e => setWorkflowHourlyRate(e.target.value)}
                                      className="w-full pl-12 pr-4 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all text-right"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* System Selection: Hourly vs 40-Minute Sessions (Manager Only) */}
                              <div className="bg-amber-50/70 border border-amber-200/90 p-4 rounded-2xl space-y-2.5 text-right">
                                <div className="flex items-center justify-between pb-2 border-b border-amber-200/70">
                                  <div className="flex items-center gap-2">
                                    <Clock size={15} className="text-amber-600" />
                                    <span className="text-xs font-black text-slate-900">نظام احتساب الحصص عند المعلم</span>
                                    {(student.grade || student.academicLevel) && (
                                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                                        getDefaultPricingUnitForGrade(student.grade || student.academicLevel) === 'session_40'
                                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                                          : 'bg-blue-100 text-blue-900 border-blue-300'
                                      }`}>
                                        {getDefaultPricingUnitForGrade(student.grade || student.academicLevel) === 'session_40' ? 'تلقائي: نظام الحصة 40 د 🎓' : 'تلقائي: نظام الساعة 60 د ⏱️'}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[9px] bg-amber-200 text-amber-950 font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-300">
                                    <Lock size={9} />
                                    صلاحيات المدير فقط
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  <button
                                    type="button"
                                    onClick={() => setWorkflowPreferredPricingUnit('hourly')}
                                    className={`p-3 rounded-xl border-2 text-right transition-all flex items-start gap-2.5 cursor-pointer ${
                                      workflowPreferredPricingUnit === 'hourly'
                                        ? 'border-[#1A365D] bg-white shadow-sm ring-2 ring-[#1A365D]/10'
                                        : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                                    }`}
                                  >
                                    <div className={`w-4 h-4 rounded border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                                      workflowPreferredPricingUnit === 'hourly' ? 'border-[#1A365D] bg-[#1A365D] text-white' : 'border-slate-300'
                                    }`}>
                                      {workflowPreferredPricingUnit === 'hourly' && <Check size={10} className="stroke-[3]" />}
                                    </div>
                                    <div>
                                      <span className="text-xs font-black text-slate-900 block">نظام الساعات (60 دقيقة) ⏱️</span>
                                      <span className="text-[9px] text-slate-500 font-semibold block mt-0.5">
                                        تسجيل الحصص بالساعة الكاملة (1 س = 60 د، 1.5 س = 90 د)
                                      </span>
                                    </div>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => setWorkflowPreferredPricingUnit('session_40')}
                                    className={`p-3 rounded-xl border-2 text-right transition-all flex items-start gap-2.5 cursor-pointer ${
                                      workflowPreferredPricingUnit === 'session_40'
                                        ? 'border-amber-500 bg-white shadow-sm ring-2 ring-amber-500/20'
                                        : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                                    }`}
                                  >
                                    <div className={`w-4 h-4 rounded border-2 mt-0.5 flex items-center justify-center shrink-0 ${
                                      workflowPreferredPricingUnit === 'session_40' ? 'border-amber-500 bg-amber-500 text-slate-950' : 'border-slate-300'
                                    }`}>
                                      {workflowPreferredPricingUnit === 'session_40' && <Check size={10} className="stroke-[3]" />}
                                    </div>
                                    <div>
                                      <span className="text-xs font-black text-slate-900 block">نظام الحصة (40 دقيقة) 🎓</span>
                                      <span className="text-[9px] text-slate-500 font-semibold block mt-0.5">
                                        تسجيل الحصص بنظام 40 دقيقة (1 = 40 د، 1.5 = 60 د، 2 = 80 د، 3 = 120 د)
                                      </span>
                                    </div>
                                  </button>
                                </div>
                              </div>

                              {/* Error/Success Feedback */}
                              {activationError && (
                                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-bold">
                                  ⚠️ {activationError}
                                </div>
                              )}
                              {activationSuccess && (
                                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 text-xs font-black animate-pulse">
                                  🟢 {activationSuccess}
                                </div>
                              )}

                              {/* Activate registration button */}
                              <button
                                type="button"
                                disabled={isActivatingStudent}
                                onClick={() => handleActivateStudent(student)}
                                className={`w-full py-3.5 rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                                  isActivatingStudent
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/10 active:scale-[0.98]'
                                }`}
                              >
                                {isActivatingStudent ? (
                                  <span>جاري الاعتماد والتفعيل...</span>
                                ) : (
                                  <>
                                    <CheckCircle2 size={15} />
                                    <span>إكمال عملية التسجيل والاعتماد وتنشيط الطالب 🟢</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* 🎛️ Advanced Filtering Widget for Student Statement & Sessions (Matching image_cc5f892e.png) */}
                      {(() => {
                        const studentSessionsAll = sessions.filter(s => s.studentId === student?.id);
                        const studentSubjectsMap = new Map<string, number>();
                        studentSessionsAll.forEach(s => {
                          const subj = (s.subject || '').trim();
                          if (subj) {
                            studentSubjectsMap.set(subj, (studentSubjectsMap.get(subj) || 0) + 1);
                          }
                        });
                        const availableStudentSubjects = Array.from(studentSubjectsMap.entries()).map(([name, count]) => ({ name, count }));
                        availableStudentSubjects.sort((a, b) => b.count - a.count);

                        const getPeriodLabel = () => {
                          if (studentPeriodType === 'daily') return `يومي (${studentStartDate || 'اليوم'})`;
                          if (studentPeriodType === 'weekly') return 'أسبوعي (آخر 7 أيام)';
                          if (studentPeriodType === 'monthly') return 'شهري (الشهر الحالي)';
                          if (studentPeriodType === 'yearly') return 'سنوي (العام الدراسي)';
                          if (studentStartDate && studentEndDate) return `مخصص (${studentStartDate} إلى ${studentEndDate})`;
                          if (studentStartDate) return `ابتداءً من ${studentStartDate}`;
                          if (studentEndDate) return `حتى ${studentEndDate}`;
                          return 'كافة الفترات (شامل السجل)';
                        };

                        const resetAllPeriodFilters = () => {
                          setStudentPeriodType('all');
                          setStudentStartDate('');
                          setStudentEndDate('');
                          setStudentSubjectFilter('all');
                        };

                        return (
                          <div className="bg-white p-6 sm:p-7 rounded-[2.5rem] border border-slate-200 shadow-sm text-right mt-6 space-y-6" dir="rtl">
                            {/* Top Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                              <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#1A365D] to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                                  <Filter size={20} className="text-[#D4A33C]" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-base font-black text-slate-900 tracking-tight">خيارات التصفية المتقدمة للتقارير والمخططات البيانية</h3>
                                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-700 text-[11px] font-bold rounded-full">تحديث فوري</span>
                                  </div>
                                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                                    تصفية شاملة للمخططات والإحصائيات حسب الفترة الزمنية (يومي، أسبوعي، شهري، سنوي) أو حسب الموضوع الدراسي
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                {(studentSubjectFilter !== 'all' || studentStartDate || studentEndDate || studentPeriodType !== 'all') && (
                                  <button
                                    type="button"
                                    onClick={resetAllPeriodFilters}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                                    title="إلغاء جميع خيارات التصفية والعودة للإعدادات الافتراضية"
                                  >
                                    <RotateCcw size={13} />
                                    <span>إعادة ضبط التصفية</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Filter Controls Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                              {/* Column 1: Time Period Filter (7 cols) */}
                              <div className="lg:col-span-7 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/70 space-y-3">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                                    <Clock size={14} className="text-indigo-600" />
                                    <span>الفترة الزمنية:</span>
                                  </label>
                                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 font-mono">
                                    {getPeriodLabel()}
                                  </span>
                                </div>

                                {/* Time Period Type Buttons */}
                                <div className="grid grid-cols-5 gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                                  {[
                                    { type: 'daily', label: 'يومي', icon: Clock },
                                    { type: 'weekly', label: 'أسبوعي', icon: Calendar },
                                    { type: 'monthly', label: 'شهري', icon: BarChart3 },
                                    { type: 'yearly', label: 'سنوي', icon: TrendingUp },
                                    { type: 'custom', label: 'مخصص', icon: Filter }
                                  ].map(({ type, label, icon: Icon }) => (
                                    <button
                                      key={type}
                                      type="button"
                                      onClick={() => {
                                        const todayStr = new Date().toISOString().split('T')[0];
                                        if (type === 'daily') {
                                          setStudentPeriodType('daily');
                                          setStudentStartDate(todayStr);
                                          setStudentEndDate(todayStr);
                                        } else if (type === 'weekly') {
                                          const weekAgo = new Date();
                                          weekAgo.setDate(weekAgo.getDate() - 7);
                                          setStudentPeriodType('weekly');
                                          setStudentStartDate(weekAgo.toISOString().split('T')[0]);
                                          setStudentEndDate(todayStr);
                                        } else if (type === 'monthly') {
                                          const now = new Date();
                                          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                                          setStudentPeriodType('monthly');
                                          setStudentStartDate(monthStart.toISOString().split('T')[0]);
                                          setStudentEndDate(todayStr);
                                        } else if (type === 'yearly') {
                                          const { startDate: yStart, endDate: yEnd } = getCurrentAcademicYearDates();
                                          setStudentPeriodType('yearly');
                                          setStudentStartDate(yStart);
                                          setStudentEndDate(yEnd);
                                        } else {
                                          setStudentPeriodType('custom');
                                        }
                                      }}
                                      className={`py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                                        studentPeriodType === type
                                          ? 'bg-indigo-600 text-white shadow-xs'
                                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                      }`}
                                    >
                                      <Icon size={12} />
                                      <span>{label}</span>
                                    </button>
                                  ))}
                                </div>

                                {/* Date Pickers */}
                                <div className="flex items-center gap-2 pt-1">
                                  <div className="flex-1">
                                    <span className="text-[10px] font-bold text-slate-500 block mb-1">من تاريخ:</span>
                                    <input
                                      type="date"
                                      value={studentStartDate}
                                      onChange={(e) => {
                                        setStudentStartDate(e.target.value);
                                        setStudentPeriodType('custom');
                                      }}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-indigo-500"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <span className="text-[10px] font-bold text-slate-500 block mb-1">إلى تاريخ:</span>
                                    <input
                                      type="date"
                                      value={studentEndDate}
                                      onChange={(e) => {
                                        setStudentEndDate(e.target.value);
                                        setStudentPeriodType('custom');
                                      }}
                                      className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-indigo-500"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Column 2: Subject Filter (5 cols) */}
                              <div className="lg:col-span-5 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/70 space-y-3">
                                <div className="flex items-center justify-between">
                                  <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                                    <BookOpen size={14} className="text-emerald-600" />
                                    <span>الموضوع الدراسي:</span>
                                  </label>
                                  {studentSubjectFilter !== 'all' ? (
                                    <button
                                      type="button"
                                      onClick={() => setStudentSubjectFilter('all')}
                                      className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                                    >
                                      <X size={11} />
                                      <span>عرض الكل</span>
                                    </button>
                                  ) : (
                                    <span className="text-[11px] font-bold text-slate-400">
                                      {availableStudentSubjects.length} مادة مسجلة
                                    </span>
                                  )}
                                </div>

                                {/* Subject Select Dropdown */}
                                <div className="relative">
                                  <select
                                    value={studentSubjectFilter}
                                    onChange={(e) => setStudentSubjectFilter(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 shadow-2xs appearance-none pr-8 cursor-pointer"
                                  >
                                    <option value="all">
                                      كافة المواد والمواضيع الدراسية ({stats.sessionCount} حصة)
                                    </option>
                                    {availableStudentSubjects.map(({ name, count }) => (
                                      <option key={name} value={name}>
                                        {name} ({count} حصة)
                                      </option>
                                    ))}
                                  </select>
                                  <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronDown size={14} />
                                  </div>
                                </div>

                                {/* Quick Subject Pills */}
                                {availableStudentSubjects.length > 0 && (
                                  <div className="space-y-1.5 pt-1">
                                    <span className="text-[10px] font-bold text-slate-400 block">
                                      المواد الأكثر نشاطاً:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto custom-scrollbar">
                                      <button
                                        type="button"
                                        onClick={() => setStudentSubjectFilter('all')}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                                          studentSubjectFilter === 'all'
                                            ? 'bg-slate-900 text-white shadow-2xs'
                                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                        }`}
                                      >
                                        الكل
                                      </button>
                                      {availableStudentSubjects.slice(0, 6).map(({ name, count }) => (
                                        <button
                                          key={name}
                                          type="button"
                                          onClick={() => setStudentSubjectFilter(name)}
                                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                            studentSubjectFilter === name
                                              ? 'bg-indigo-600 text-white shadow-2xs'
                                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                                          }`}
                                        >
                                          <span>{name}</span>
                                          <span className={`text-[10px] px-1 rounded-full ${
                                            studentSubjectFilter === name ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'
                                          }`}>
                                            {count}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons for Statement Generation */}
                            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                              <div className="text-xs font-bold text-slate-600 flex items-center gap-2">
                                <FileText size={15} className="text-[#D4A33C]" />
                                <span>إصدار وتصدير كشف الحساب المالي المعتمد للفترة المحددة:</span>
                              </div>

                              <div className="flex flex-wrap items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const { startDate, endDate } = getCurrentAcademicYearDates();
                                    exportStudentToPDF(selectedStudentId!, startDate, endDate);
                                  }}
                                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-[#1A365D] border border-amber-500/30 font-black text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                                  title="تصدير كشف حساب الطالب للعام الدراسي الحالي كـ PDF"
                                >
                                  <Calendar size={14} className="text-[#D4A33C]" />
                                  <span>كشف العام الحالي (PDF) 🗓️</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => exportStudentToExcel(selectedStudentId!, studentStartDate, studentEndDate)}
                                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-[#D4A33C] hover:text-amber-300 font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                                  title="تصدير كشف الحساب التفصيلي لملف Excel"
                                >
                                  <FileSpreadsheet size={14} />
                                  <span>تصدير Excel 📊</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => openReportsModal(selectedStudentId, 'individual')}
                                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0D365A] to-[#16436e] hover:from-[#09253f] hover:to-[#0D365A] text-[#D4A33C] hover:text-amber-200 font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer border border-[#D4A33C]/40"
                                  title="فتح مركز تقارير الطلاب والمالية لطباعة وحفظ كشف الحساب بصيغة PDF وتخصيص الملاحظة لولي الأمر"
                                >
                                  <FileText size={14} className="text-[#D4A33C]" />
                                  <span>كشف حساب معتمد لولي الأمر (PDF) 📑</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => exportStudentToPDF(selectedStudentId!, studentStartDate, studentEndDate)}
                                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1A365D] hover:bg-[#11243f] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                                  title="تصدير كشف الحساب التفصيلي لملف PDF جاهز للطباعة والتحميل"
                                >
                                  <FileText size={14} className="text-[#D4A33C]" />
                                  <span>طباعة سريعة كـ PDF 🖨️</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    {/* Activity Class History Registry */}
                    <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px] text-right">
                      <div className="p-8 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                        <div>
                          <h4 className="text-xl font-black text-slate-900 tracking-tight">سجل حضور الحصص والمحاسبة</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">سجل تفصيلي بكافة الحصص والخصومات الفورية من رصيد المحفظة</p>
                        </div>
                        <History size={20} className="text-indigo-600 opacity-20" />
                      </div>
                      <div className="overflow-y-auto max-h-[500px] custom-scrollbar flex-1">
                         <table className="w-full text-right" dir="rtl">
                            <thead className="sticky top-0 bg-white/85 backdrop-blur-md z-10 border-b border-slate-100">
                              <tr>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400">الاستاذ المسئول والمادة</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400">المبلغ المخصوم</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 text-left">التاريخ</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {stats.studentSessions.filter(s => s.approved !== false && s.status !== 'pending' && s.status !== 'booked').map((session, sIdx) => {
                                const teacher = teachers.find(t => t.id === session.teacherId);
                                const cost = getStudentSessionCost(session, student, teacher, settings);
                                return (
                                  <tr key={`session-row-${session.id || sIdx}-${sIdx}`} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="px-8 py-6">
                                      <div className="flex flex-col">
                                         <span className="font-extrabold text-slate-900 text-sm tracking-tight">{teacher?.name || 'غير معروف'}</span>
                                         <span className="text-[10px] font-black text-[#D4A33C] uppercase">{session.subject}</span>
                                      </div>
                                    </td>
                                    <td className="px-8 py-6">
                                       <div className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 border border-rose-100 rounded-lg text-rose-600 font-black text-xs">
                                          -₪{cost}
                                       </div>
                                    </td>
                                    <td className="px-8 py-6 text-left">
                                       <span className="text-xs font-black text-slate-400">
                                          {formatCustomDate(session.date)}
                                       </span>
                                    </td>
                                  </tr>
                                );
                              })}
                              {stats.studentSessions.length === 0 && (
                                <tr>
                                  <td colSpan={3} className="py-20 text-center opacity-30">
                                     <Clock size={32} className="mx-auto mb-4 text-slate-400" />
                                     <p className="text-xs font-black">لم يتم حضور أي حصص دراسية بعد</p>
                                  </td>
                                </tr>
                              )}
                            </tbody>
                         </table>
                      </div>
                    </section>

                    {/* Credit refill logs */}
                    <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
                       <div className="p-8 border-b border-slate-200 bg-emerald-50/20 flex items-center justify-between">
                        <div>
                          <h4 className="text-xl font-black text-slate-900 tracking-tight">سجل عمليات شحن الرصيد</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">تتبع التدفقات النقدية الواردة لحساب الطالب</p>
                        </div>
                        <CheckCircle2 size={20} className="text-emerald-300 opacity-20" />
                      </div>
                      <div className="overflow-y-auto max-h-[500px] custom-scrollbar flex-1">
                         <div className="p-8 space-y-4">
                            {stats.studentCredits.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((credit, cIdx) => { const isEditing = editingCreditId === credit.id; return (
                              <div key={`credit-${credit.id || cIdx}-${cIdx}`} className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] group hover:border-[#D4A33C]/20 hover:bg-amber-50/10 transition-all text-right gap-4">
                                {isEditing ? (
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3" dir="rtl">
                                    <div className="space-y-1 text-right">
                                      <label className="text-[9px] font-black text-slate-400">قيمة الشحن (₪)</label>
                                      <input
                                        type="number"
                                        value={editCreditAmount}
                                        onChange={e => setEditCreditAmount(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-black focus:ring-1 focus:ring-[#D4A33C] outline-none text-right"
                                      />
                                    </div>
                                    <div className="space-y-1 text-right">
                                      <label className="text-[9px] font-black text-slate-400">تاريخ الدفعة</label>
                                      <input
                                        type="date"
                                        value={editCreditDate}
                                        onChange={e => setEditCreditDate(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-black focus:ring-1 focus:ring-[#D4A33C] outline-none text-right"
                                      />
                                    </div>
                                    <div className="space-y-1 text-right">
                                      <label className="text-[9px] font-black text-slate-400">بيان وملاحظات الشحن</label>
                                      <input
                                        type="text"
                                        value={editCreditNote}
                                        onChange={e => setEditCreditNote(e.target.value)}
                                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-1 focus:ring-[#D4A33C] outline-none text-right"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-4 text-right">
                                     <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-[#D4A33C] shadow-sm border border-slate-100 shrink-0">
                                        <Plus size={20} />
                                     </div>
                                     <div className="min-w-0 text-right">
                                        <p className="text-lg font-black text-slate-900 leading-none mb-1">
                                          {credit.amount >= 0 ? `+₪${credit.amount}` : `-₪${Math.abs(credit.amount)}`}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[200px]" title={credit.note || 'شحن رصيد المحفظة'}>
                                          {credit.note || 'شحن رصيد المحفظة'}
                                        </p>
                                        {credit.financialCategory && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black bg-amber-50 text-amber-800 border border-amber-200 mt-1">
                                            <span>🏷️</span>
                                            <span>{credit.financialCategory}</span>
                                          </span>
                                        )}
                                     </div>
                                  </div>
                                )}

                                <div className="flex items-center justify-between md:justify-end gap-3 text-left shrink-0">
                                  {isEditing ? (
                                    <div className="flex items-center gap-1.5 justify-end">
                                      <button
                                        type="button"
                                        onClick={() => setEditingCreditId(null)}
                                        className="p-1 px-2.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                                      >
                                        <X size={11} />
                                        <span>إلغاء</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateCredit(credit.id)}
                                        className="p-1 px-2.5 bg-[#D4A33C] text-slate-900 rounded-lg hover:bg-amber-500 font-black text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                                      >
                                        <Check size={11} />
                                        <span>حفظ</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3 w-full justify-between md:justify-end">
                                      <div className="text-left select-none leading-tight min-w-[70px]">
                                         <p className="text-xs font-black text-slate-400">{formatCustomDate(credit.date)}</p>
                                         <span className="text-[9px] font-black text-[#D4A33C] uppercase">محاسب</span>
                                      </div>
                                       <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleGeneratePaymentReceipt(credit, student)}
                                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                          title="طباعة وحفظ سند قبض مالي رسمي (PDF)"
                                        >
                                          <Receipt size={13} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditCredit(credit)}
                                          className="p-1.5 text-slate-400 hover:text-[#D4A33C] hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                          title="تعديل تفاصيل وقيمة الدفعة (المدير)"
                                        >
                                          <Pencil size={12} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteCredit(credit.id)}
                                          className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                          title="حذف"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                           })}
                            {stats.studentCredits.length === 0 && (
                              <div className="py-20 text-center opacity-30 grayscale">
                                 <CreditCard size={32} className="mx-auto mb-4 text-slate-400" />
                                 <p className="text-xs font-black">لم يتم شحن رصيد للطالب بعد</p>
                              </div>
                            )}
                         </div>
                      </div>
                    </section>
                  </div>
                </>
              )}
            </>
          );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Teacher Link Modal */}
      <AnimatePresence>
        {isLinkTeacherModalOpen && selectedStudentId && (
          <motion.div 
            key={`link-teacher-modal-${selectedStudentId}`} 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/40" 
            dir="rtl"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden relative text-right"
            >
              <button 
                onClick={() => { setIsLinkTeacherModalOpen(false); setTeacherLinkSearch(''); }}
                className="absolute top-8 left-8 p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
              >
                <X size={20} />
              </button>

              <div className="p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xl">
                    <Users size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight font-sans">ربط وتنسيب معلم جديد</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase mt-1">الطالب الحالي: {students.find(s => s.id === selectedStudentId)?.name}</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Search box inside modal */}
                  <div className="relative group">
                    <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-650 transition-colors" />
                    <input 
                      type="text"
                      placeholder="ابحث عن اسم معلم لربطه بالطالب..."
                      value={teacherLinkSearch}
                      onChange={e => setTeacherLinkSearch(e.target.value)}
                      className="w-full pr-11 pl-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all font-bold text-xs text-right text-slate-900"
                      autoFocus
                    />
                  </div>

                  {/* List of unassigned matches */}
                  <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {(() => {
                      const currentStudent = students.find(s => s.id === selectedStudentId);
                      const unlinkedTeachers = teachers.filter(t => {
                        const isNotLinked = !currentStudent?.teachers?.includes(t.id);
                        const nameMatches = (t.name || '').toLowerCase().includes((teacherLinkSearch || '').toLowerCase());
                        const subjectMatches = t.subjects?.some(sub => (sub || '').toLowerCase().includes((teacherLinkSearch || '').toLowerCase()));
                        return isNotLinked && (nameMatches || subjectMatches);
                      });

                      if (unlinkedTeachers.length === 0) {
                        return (
                          <div className="py-10 text-center text-slate-405 border border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                            <p className="text-xs font-bold text-slate-400">لا يوجد معلمون مطابقون للبحث أو أن جميعهم مرتبطين بالفعل بهذا الطالب.</p>
                          </div>
                        );
                      }

                      return unlinkedTeachers.map(teacher => (
                        <button
                          key={teacher.id}
                          onClick={async () => {
                            await linkTeacherToStudent(teacher.id);
                            setIsLinkTeacherModalOpen(false);
                            setTeacherLinkSearch('');
                          }}
                          className="w-full p-4 bg-slate-50 border border-slate-100/70 hover:border-indigo-500/40 rounded-2xl flex items-center justify-between hover:bg-indigo-50/40 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700 flex items-center justify-center text-xs font-black transition-all">
                              {teacher.name.charAt(0)}
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-slate-800 block">{teacher.name}</span>
                              {teacher.subjects && teacher.subjects.length > 0 && (
                                <span className="text-[9px] font-bold text-slate-400 block mt-0.5">{teacher.subjects.join('، ')}</span>
                              )}
                            </div>
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transfer Student to Teacher Modal */}
      <TransferStudentModal
        isOpen={isTransferModalOpen}
        onClose={() => {
          setIsTransferModalOpen(false);
          setTransferStudent(null);
        }}
        student={transferStudent}
        teachers={teachers}
        sourceTeacherId={transferSourceTeacherId}
        targetTeacherId={transferTargetTeacherId}
        subject={transferSubject}
        notes={transferNotes}
        isLoading={transferLoading}
        onSourceTeacherChange={setTransferSourceTeacherId}
        onTargetTeacherChange={setTransferTargetTeacherId}
        onSubjectChange={setTransferSubject}
        onNotesChange={setTransferNotes}
        onSubmit={handleTransferStudent}
      />

      {/* Export Student Financial Balances & Debts PDF Modal */}
      <StudentFinancialBalancesPdfModal
        isOpen={isFinancialBalancesPdfModalOpen}
        onClose={() => setIsFinancialBalancesPdfModalOpen(false)}
        students={students}
        sessions={sessions}
        credits={credits}
        teachers={teachers}
        globalSettings={globalSettings}
        triggerToast={triggerToast}
      />

      {/* List Custom Rates Modal */}
      <AnimatePresence>
        {isCustomRatesModalOpen && selectedStudentId && (
          <motion.div 
            key={`custom-rates-modal-${selectedStudentId}`} 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/40" 
            dir="rtl"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden relative text-right"
            >
              <button 
                onClick={() => setIsCustomRatesModalOpen(false)}
                className="absolute top-8 left-8 p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
              >
                <X size={20} />
              </button>

              <div className="p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-[#D4A33C] flex items-center justify-center shadow-xl">
                    <DollarSign size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight font-sans">جدول الأسعار المخصصة</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase mt-1">الطالب الحالي: {students.find(s => s.id === selectedStudentId)?.name}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="max-h-[300px] overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
                    {(() => {
                      const currentStudent = students.find(s => s.id === selectedStudentId);
                      const isStudentSession40 = 
                        currentStudent?.preferredPricingUnit === 'session_40' ||
                        currentStudent?.sessionSystem === 'session_40' ||
                        (currentStudent?.grade ? getDefaultPricingUnitForGrade(currentStudent.grade) === 'session_40' : false);
                      const currentStudentStage = getAcademicStage(currentStudent?.grade || currentStudent?.academicLevel || '');
                      const defaultStudentSessionRate = 
                        currentStudent?.sessionRate && Number(currentStudent.sessionRate) > 0
                          ? Number(currentStudent.sessionRate)
                          : currentStudentStage === 'secondary'
                            ? (currentStudent?.secondarySchoolSessionRate ?? globalSettings?.secondarySchoolStudentSessionRate ?? DEFAULT_STAGE_PRICING.secondarySchoolStudentSessionRate ?? 50)
                            : currentStudentStage === 'middle'
                              ? (currentStudent?.middleSchoolSessionRate ?? globalSettings?.middleSchoolStudentSessionRate ?? DEFAULT_STAGE_PRICING.middleSchoolStudentSessionRate ?? 40)
                              : (currentStudent?.primarySchoolSessionRate ?? globalSettings?.primarySchoolStudentSessionRate ?? 35);

                      const customRatesObj = currentStudent?.customRates || {};
                      const customRatesList = Object.keys(customRatesObj).map(teacherId => {
                        const teacher = teachers.find(t => t.id === teacherId);
                        const defaultHourly = teacher?.billingRate || teacher?.hourlyRate || (currentStudentStage === 'secondary' ? 60 : 50);
                        return {
                          teacherId,
                          name: teacher?.name || 'معلم غير معروف',
                          customRate: customRatesObj[teacherId],
                          defaultRate: isStudentSession40 ? defaultStudentSessionRate : defaultHourly
                        };
                      });

                      if (customRatesList.length === 0) {
                        return (
                          <div className="py-12 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                            <p className="text-xs font-bold text-slate-400">لا يوجد أسعار مخصصة مفعّلة حالياً لهذا الطالب.</p>
                          </div>
                        );
                      }

                      return customRatesList.map(item => (
                        <div
                          key={item.teacherId}
                          className="p-5 bg-slate-50 border border-slate-100/70 rounded-2xl flex items-center justify-between hover:border-indigo-500/20 transition-all text-right"
                        >
                          <div className="flex items-center gap-3 text-right">
                            <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 text-indigo-600 flex items-center justify-center text-xs font-black">
                              {item.name.charAt(0)}
                            </div>
                            <div className="text-right">
                              <span className="text-xs font-black text-slate-800 block">{item.name}</span>
                              <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                                {isStudentSession40 
                                  ? `السعر الافتراضي للحصة (40 دقيقة): ₪${item.defaultRate}/حصة`
                                  : `السعر الافتراضي للمدرسة: ₪${item.defaultRate}/ساعة`
                                }
                              </span>
                            </div>
                          </div>
                          
                          <div className="text-left bg-indigo-50/60 border border-indigo-100/40 rounded-xl px-3 py-1.5">
                            <div className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">السعر المخصص</div>
                            <span className="text-xs font-black text-indigo-750">
                              ₪{item.customRate}{isStudentSession40 ? '/حصة 40د' : '/ساعة'}
                            </span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 text-right">
                    <p className="text-[10px] font-bold text-slate-400 leading-relaxed">
                      * الأسعار المخصصة أعلاه تلغي السعر المدرسي الافتراضي المعتاد للمدرس عند حساب هذه الحصص فقط للطالب المستهدف. يمكنك تعديل هذه الأسعار في أي وقت داخل قسم "تنسيب معلمي الطالب والتفاصيل المالية" بالأسفل.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secure Delete Governance / Archive Confirmation Pop-up */}
      {deleteConfirm && deleteConfirm.type === 'student' ? (() => {
        const targetStudent = students.find(s => s.id === deleteConfirm.id);
        const targetStudentStats = targetStudent ? getStudentStats(targetStudent.id) : { balance: 0, totalPaid: 0, totalHours: 0 };
        const targetStudentSessionsCount = sessions.filter(s => s.studentId === deleteConfirm.id).length;
        const isAlreadyArchived = targetStudent?.archived === true;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[150] p-4 text-right overflow-y-auto" dir="rtl">
            <div className="bg-white rounded-[2rem] max-w-lg w-full p-6 md:p-8 border border-slate-100 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200 my-8">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
                    <Archive size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      {isAlreadyArchived ? 'إدارة الطالب المؤرشف 🗄️' : 'إدارة خروج الطالب: أرشفة أم حذف نهائي؟'}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                      {isAlreadyArchived ? 'هذا الطالب موجود في الأرشيف بالفعل' : 'حفاظاً على السجلات المالية والأكاديمية، يُوصى بالأرشفة'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Student Snapshot Card */}
              {targetStudent && (
                <div className="bg-slate-50 border border-slate-200/70 p-4 rounded-2xl flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900 text-sm">{targetStudent.name}</span>
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold">
                        {targetStudent.grade || 'غير محدد'}
                      </span>
                      {isAlreadyArchived && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-md text-[10px] font-black">
                          مؤرشف حالياً
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-bold">
                      عدد الحصص المسجلة: <strong className="text-slate-800">{targetStudentSessionsCount}</strong> حصة | الهاتف: <span dir="ltr">{targetStudent.phone || '—'}</span>
                    </p>
                  </div>
                  <div className="text-left shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold block">الرصيد المالي الحالي</span>
                    <span className={`text-sm font-black ${targetStudentStats.balance < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {targetStudentStats.balance} ₪
                    </span>
                  </div>
                </div>
              )}

              {!isAlreadyArchived ? (
                <>
                  {/* Primary Recommended Option: Archive */}
                  <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                        <Sparkles size={15} className="text-amber-600" />
                        <span>الخيار الأول (الموصى به بشدة): أرشفة الطالب 📂</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black">
                        آمن 100%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-700 font-bold leading-relaxed">
                      نقل الطالب إلى أرشيف الطلاب غير النشطين. <strong>يتم الحفاظ على كامل السجلات الأكاديمية والمالية والحصص وتاريخ الدفعات</strong>، ويتم إخفاؤه من القائمة النشطة لتجنب إرباك الجداول، مع <strong>إمكانية استعادة وتنشيط حسابه فوراً بنقرة زر واحدة إذا عاد للدراسة في المركز مستقبلاً دون فقدان أي شيكل أو حصة</strong>.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        const studentId = deleteConfirm.id;
                        setDeleteConfirm(null);
                        await toggleArchiveStudent(studentId, true, 'توقف عن الدوام / أرشفة بدل الحذف');
                      }}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-amber-500/20 active:scale-[0.99] flex items-center justify-center gap-2"
                    >
                      <Archive size={15} />
                      <span>نقل للأرشيف بدلاً من الحذف (حفظ السجلات) 📂</span>
                    </button>
                  </div>

                  {/* Secondary Permanent Delete Option */}
                  <div className="bg-rose-50/50 border border-rose-200/80 rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-rose-700 flex items-center gap-1.5">
                        <AlertTriangle size={14} className="text-rose-600" />
                        <span>الخيار الثاني: حذف نهائي من النظام ⚠️</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black">
                        إجراء دائم
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 font-bold leading-relaxed">
                      سيتم مسح سجل الطالب وبياناته نهائياً من قاعدة البيانات. تنبيه: هذا الإجراء لا يمكن التراجع عنه وسيفقد المركز كافة الحصص وسجلات الدفع المرتبطة به.
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          const studentId = deleteConfirm.id;
                          setDeleteConfirm(null);
                          await executeDeleteStudent(studentId);
                        }}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-black transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                      >
                        <Trash2 size={13} />
                        <span>تأكيد الحذف النهائي من النظام 🗑️</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Student is already in the archive */
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <RotateCcw size={16} className="text-emerald-600" />
                      <span className="text-xs font-black text-emerald-950">هل عاد الطالب للدراسة في المركز؟</span>
                    </div>
                    <p className="text-[11px] text-slate-700 font-bold leading-relaxed">
                      يمكنك استعادة الطالب وتنشيط حسابه فوراً لإعادته إلى قائمة الطلاب النشطين، واستئناف تنسيبه بالحصص وجداول المعلمين مع كافة أرصدته وسجلاته السابقة.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        const studentId = deleteConfirm.id;
                        setDeleteConfirm(null);
                        await toggleArchiveStudent(studentId, false);
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center gap-2"
                    >
                      <RotateCcw size={14} />
                      <span>استعادة وتنشيط الطالب للدراسة 🟢</span>
                    </button>
                  </div>

                  <div className="bg-rose-50/50 border border-rose-200 p-4 rounded-2xl space-y-2">
                    <span className="text-xs font-black text-rose-700 flex items-center gap-1.5">
                      <Trash2 size={14} />
                      <span>حذف نهائي من قاعدة البيانات</span>
                    </span>
                    <p className="text-[10px] text-slate-600 font-bold">
                      حذف السجل نهائياً وتفريغه من قاعدة البيانات بشكل لا يمكن استرجاعه.
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        const studentId = deleteConfirm.id;
                        setDeleteConfirm(null);
                        await executeDeleteStudent(studentId);
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-black transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
                    >
                      <Trash2 size={13} />
                      <span>حذف نهائي من النظام 🗑️</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors cursor-pointer"
                >
                  إلغاء والرجوع ✕
                </button>
              </div>
            </div>
          </div>
        );
      })() : deleteConfirm ? (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[150] p-4 text-right" dir="rtl">
          <div className="bg-white rounded-[2rem] max-w-md w-full p-6 border border-slate-100 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-600 leading-none">
                  {deleteConfirm.type === 'session' ? 'تأكيد حذف الحصة نهائياً ⚠️' : deleteConfirm.type === 'credit' ? 'تأكيد حذف الحركة المالية ⚠️' : 'تأكيد حذف الطالب ⚠️'}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-1">
                  {deleteConfirm.type === 'session' ? 'استرداد الساعات وإلغاء الخصم المالي' : 'إجراء إداري نهائي لا يمكن التراجع عنه'}
                </p>
              </div>
            </div>

            {deleteConfirm.type === 'session' && (() => {
              const targetSess = sessions.find(s => s.id === deleteConfirm.id);
              const stud = students.find(s => s.id === targetSess?.studentId);
              const teach = teachers.find(t => t.id === targetSess?.teacherId);
              return (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-2 text-xs font-bold text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">الطالب:</span>
                    <span className="text-slate-900 font-black">{stud?.name || 'غير محدد'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">المعلم:</span>
                    <span className="text-blue-900 font-black">{teach?.name || 'غير محدد'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">المادة والمدة:</span>
                    <span>{targetSess?.subject || 'عام'} ({targetSess?.durationHours || 1} ساعة)</span>
                  </div>
                  {targetSess?.date && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">التاريخ:</span>
                      <span>{targetSess.date}</span>
                    </div>
                  )}
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200/70 text-emerald-800 text-[11px] font-black">
                    ✅ سيتم إعادة الرصيد/الساعات المستحقة إلى حساب الطالب فوراً.
                  </div>
                </div>
              );
            })()}

            {deleteConfirm.type === 'credit' && (() => {
              const targetCredit = credits.find(c => c.id === deleteConfirm.id);
              const targetStudent = students.find(s => s.id === (targetCredit ? targetCredit.studentId : selectedStudentId));
              return (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-2 text-xs font-bold text-slate-700 text-right">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">اسم الطالب:</span>
                    <span className="text-slate-900 font-black">{targetStudent?.name || 'غير محدد'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">مبلغ الدفعة:</span>
                    <span className="text-rose-600 font-mono font-black text-sm">₪{targetCredit?.amount || 0}</span>
                  </div>
                  {targetCredit?.date && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">تاريخ الدفعة:</span>
                      <span className="font-mono">{formatCustomDate(targetCredit.date)}</span>
                    </div>
                  )}
                  {targetCredit?.note && (
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">البيان والملاحظات:</span>
                      <span className="text-slate-700 truncate max-w-[200px]">{targetCredit.note}</span>
                    </div>
                  )}
                  <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200/70 text-rose-800 text-[11px] font-black">
                    ⚠️ تنبيه: سيتم حذف الدفعة نهائياً وخصم المبلغ تلقائياً من رصيد محفظة الطالب.
                  </div>
                </div>
              );
            })()}

            {deleteConfirm.type === 'student' && (
              <p className="text-xs font-bold text-slate-600 leading-relaxed">
                هل أنت متأكد تمامًا من رغبتك في حذف هذا الطالب؟ تنبيه: هذا الإجراء نهائي ولا يمكن التراجع عنه.
              </p>
            )}

            <div className="flex gap-2.5 justify-end">
              <button
                onClick={async () => {
                  const { id, type } = deleteConfirm;
                  setDeleteConfirm(null);
                  if (type === 'student') {
                    await executeDeleteStudent(id);
                  } else if (type === 'credit') {
                    await executeDeleteCredit(id);
                  } else if (type === 'session') {
                    await executeDeleteSession(id);
                  }
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-rose-650/10 text-center"
              >
                تأكيد الحذف
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer text-center"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Edit Student Credit Modal */}
      <AnimatePresence>
        {isEditCreditModalOpen && editingCredit && (
          <motion.div 
            key={`edit-credit-modal-overlay-${editingCredit.id}`} 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" 
            dir="rtl"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] max-w-lg w-full p-8 border border-slate-100 shadow-2xl space-y-6 text-right"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Pencil size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">تعديل دفعة رصيد الطالب 💳</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">تعديل القيمة، التاريخ، طريقة الدفع، أو تحويلها لطالب آخر</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsEditCreditModalOpen(false); setEditingCredit(null); }}
                  className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={async (e) => { e.preventDefault(); if (editingCredit) await handleUpdateCredit(editingCredit.id); }} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">الطالب المستفيد من الدفعة:</label>
                  <select
                    value={editCreditTargetStudentId}
                    onChange={e => setEditCreditTargetStudentId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-[#D4A33C]/20 focus:border-[#D4A33C]"
                    required
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.phone || 'بدون هاتف'})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">المبلغ المشحون (₪):</label>
                    <input
                      type="number"
                      step="any"
                      min="1"
                      required
                      value={editCreditAmount}
                      onChange={e => setEditCreditAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-mono font-black text-sm text-emerald-600 outline-none focus:ring-2 focus:ring-[#D4A33C]/20 focus:border-[#D4A33C]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">تاريخ الدفعة:</label>
                    <input
                      type="date"
                      required
                      value={editCreditDate}
                      onChange={e => setEditCreditDate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-[#D4A33C]/20 focus:border-[#D4A33C]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">طريقة الدفع:</label>
                    <select
                      value={editCreditPaymentMethod}
                      onChange={e => setEditCreditPaymentMethod(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-[#D4A33C]/20 focus:border-[#D4A33C]"
                    >
                      <option value="نقداً (كاش)">نقداً (كاش)</option>
                      <option value="حوالة بنكية">حوالة بنكية</option>
                      <option value="بطاقة ائتمان (فيزا)">بطاقة ائتمان (فيزا)</option>
                      <option value="محفظة إلكترونية">محفظة إلكترونية</option>
                      <option value="شيك بنكي">شيك بنكي</option>
                      <option value="أخرى">أخرى</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">التصنيف المالي:</label>
                    <input
                      type="text"
                      value={editCreditFinancialCategory}
                      onChange={e => setEditCreditFinancialCategory(e.target.value)}
                      placeholder="رسوم دراسية، أقساط..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-[#D4A33C]/20 focus:border-[#D4A33C]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">البيان والملاحظات:</label>
                  <textarea
                    rows={2}
                    value={editCreditNote}
                    onChange={e => setEditCreditNote(e.target.value)}
                    placeholder="ملاحظات المحاسب أو سند القبض..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-[#D4A33C]/20 focus:border-[#D4A33C] resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={isSubmittingEditCredit}
                    className="flex-1 py-3.5 bg-[#D4A33C] hover:bg-amber-500 text-slate-950 rounded-xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmittingEditCredit ? <Clock className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                    <span>حفظ التعديلات وتحديث الرصيد</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsEditCreditModalOpen(false); setEditingCredit(null); }}
                    className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-all cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unified Payments Manager Modal */}
      {isPaymentsManagerModalOpen && (
        <UnifiedPaymentsManagerModal
          isOpen={isPaymentsManagerModalOpen}
          onClose={() => setIsPaymentsManagerModalOpen(false)}
          initialTab="students"
          students={students}
          teachers={teachers}
          sessions={sessions}
          credits={credits}
          payments={[]}
          setCredits={setCredits}
          setStudents={setStudents}
        />
      )}

      {/* Quick Financial Adjustment Modal */}
      <AnimatePresence>
        {quickAdjustStudent && (
          <motion.div 
            key={`quick-adjust-modal-${quickAdjustStudent.id}`} 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/40" 
            dir="rtl"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden relative text-right border border-slate-100"
            >
              <button 
                type="button"
                onClick={() => setQuickAdjustStudent(null)}
                className="absolute top-8 left-8 p-3 text-slate-400 hover:text-slate-950 hover:bg-slate-50 rounded-full transition-all cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 text-[#D4A33C] flex items-center justify-center shadow-lg">
                    <Wallet size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight font-sans">تعديل مالي يدوي سريع</h3>
                    <p className="text-xs text-[#D4A33C] font-black mt-1">الطالب: {quickAdjustStudent.name}</p>
                    <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                      الرصيد المحتسب الحالي: <span className="font-sans font-black text-indigo-600">₪{getStudentStats(quickAdjustStudent.id).balance}</span>
                    </p>
                  </div>
                </div>

                {quickAdjustError && (
                  <div className="mb-4 p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-xs font-bold text-rose-600 flex items-center gap-2">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>{quickAdjustError}</span>
                  </div>
                )}

                <div className="space-y-5">
                  {/* Select adjustment mode */}
                  <div className="bg-slate-50 p-1 rounded-2xl flex border border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setQuickAdjustMode('set_total');
                        setQuickAdjustNewBalance(String(getStudentStats(quickAdjustStudent.id).balance));
                        setQuickAdjustError('');
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition-colors cursor-pointer ${
                        quickAdjustMode === 'set_total' 
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-100/50' 
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      تعديل الرصيد الكلي
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQuickAdjustMode('add_subtract');
                        setQuickAdjustDeltaAmount('');
                        setQuickAdjustError('');
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition-colors cursor-pointer ${
                        quickAdjustMode === 'add_subtract' 
                          ? 'bg-white text-slate-900 shadow-sm border border-slate-100/50' 
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      حركة مالية (إضافة/خصم)
                    </button>
                  </div>

                  {/* Input Fields based on Mode */}
                  {quickAdjustMode === 'set_total' ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 block mr-1">
                        الرصيد الكلي المستهدف (₪)
                      </label>
                      <div className="relative group">
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">₪</span>
                        <input
                          type="number"
                          value={quickAdjustNewBalance}
                          onChange={(e) => {
                            setQuickAdjustNewBalance(e.target.value);
                            setQuickAdjustError('');
                          }}
                          placeholder="مثال: 150"
                          className="w-full pr-10 pl-4 py-3 bg-slate-5 focus:bg-white border border-slate-200 focus:border-[#D4A33C] focus:ring-4 focus:ring-amber-500/10 rounded-2xl outline-none transition-all font-black text-sm text-right text-slate-900"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold mr-1 leading-relaxed">
                        سيقوم النظام تلقائياً باحتساب الرصيد ليكون مطابقاً تماماً للمبلغ المدخل من مدير المنصة، دون إظهار أي حركة تعديل في كشف الحساب.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 block mr-1">
                        مبلغ الحركة المالية الفردية (₪)
                      </label>
                      <div className="relative group">
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">₪</span>
                        <input
                          type="number"
                          value={quickAdjustDeltaAmount}
                          onChange={(e) => {
                            setQuickAdjustDeltaAmount(e.target.value);
                            setQuickAdjustError('');
                          }}
                          placeholder="مثال: 50 للشحن أو -50 للخصم"
                          className="w-full pr-10 pl-4 py-3 bg-slate-5 focus:bg-white border border-slate-200 focus:border-[#D4A33C] focus:ring-4 focus:ring-amber-500/10 rounded-2xl outline-none transition-all font-black text-sm text-right text-slate-900"
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold mr-1 leading-relaxed">
                        أدخل قيمة موجبة لحساب دفعة واردة، أو قيمة سالبة مع إشارة ناقص (مثل: -50) لتسجيل خصم أو سحب من رصيد حساب الطالب.
                      </p>
                    </div>
                  )}

                  {/* Option to hide adjustment in parent statement */}
                  <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-3.5 space-y-1.5 text-right" dir="rtl">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={quickAdjustHideInStatement}
                        onChange={(e) => setQuickAdjustHideInStatement(e.target.checked)}
                        className="w-4 h-4 rounded text-[#D4A33C] focus:ring-amber-500 cursor-pointer"
                      />
                      <span className="text-xs font-black text-slate-800">
                        عدم إظهار حركة التعديل هذه في كشف الحساب الموجه لولي الأمر (موصى به) 🛡️
                      </span>
                    </label>
                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed pr-6">
                      يتم احتساب الرصيد تلقائياً في النظام فوراً، ولن تظهر حركة التعديل هذه في كشف الحساب المالي المطبوع أو المرسل لولي الأمر.
                    </p>
                  </div>

                  {/* Justification Comment Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 block mr-1 flex items-center justify-between">
                      <span>بيان وملاحظة الحركة المالية (اختياري)</span>
                      <span className="text-[10px] font-bold text-slate-400">تظهر في السجلات الإدارية</span>
                    </label>
                    <textarea
                      value={quickAdjustComment}
                      onChange={(e) => {
                        setQuickAdjustComment(e.target.value);
                        setQuickAdjustError('');
                      }}
                      placeholder="اكتب ملاحظة أو بياناً للعملية (اختياري للتوثيق والتدقيق)..."
                      rows={2}
                      className="w-full p-3.5 bg-slate-5 focus:bg-white border border-slate-200 focus:border-[#D4A33C] focus:ring-4 focus:ring-amber-500/10 rounded-2xl outline-none transition-all font-bold text-xs text-right text-slate-900 leading-relaxed resize-none"
                    />
                  </div>

                  {/* Submit and Cancel Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isSavingQuickAdjust}
                      onClick={() => handleQuickFinancialAdjustment(getStudentStats(quickAdjustStudent.id).balance)}
                      className="flex-1 py-3.5 bg-[#D4A33C] hover:bg-amber-500 disabled:opacity-50 text-slate-950 rounded-2xl text-xs font-black transition-all cursor-pointer text-center flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
                    >
                      {isSavingQuickAdjust ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>جاري الحفظ والاحتساب...</span>
                        </>
                      ) : (
                        <>
                          <Check size={14} />
                          <span>تأكيد واحتساب الرصيد في النظام</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isSavingQuickAdjust}
                      onClick={() => setQuickAdjustStudent(null)}
                      className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-black transition-all cursor-pointer text-center"
                    >
                      إلغاء التعديل
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Student Registration Modal */}
      <AnimatePresence>
        {isQuickAddModalOpen && (
          <motion.div 
            key="quick-add-student-modal-overlay" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[150] flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/40" 
            dir="rtl"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden relative text-right border border-slate-100"
              onClick={e => e.stopPropagation()}
            >
              <button 
                type="button"
                onClick={() => {
                  setIsQuickAddModalOpen(false);
                  setQuickName('');
                  setQuickTeacher('');
                  setQuickGrade('');
                  setQuickPhone('');
                  setQuickInitialPayment('');
                }}
                className="absolute top-8 left-8 p-3 text-slate-400 hover:text-slate-950 hover:bg-slate-50 rounded-full transition-all cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-lg">
                    <UserPlus size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight font-sans">إضافة سريع لطالب جديد ⚡</h3>
                    <p className="text-xs text-slate-500 font-bold mt-1">تسهيل عمليات التسجيل السريع وتفادي ضغط العمل ببيانات أساسية</p>
                  </div>
                </div>

                <form onSubmit={handleQuickAddStudent} className="space-y-5">
                  <div className="space-y-4">
                    {/* Student Name */}
                    <div className="space-y-1.5 text-right">
                      <label className="text-xs font-black text-slate-700 block mr-1">
                        اسم الطالب <span className="text-rose-500 font-black">*</span>
                      </label>
                      <input 
                        id="quick-add-student-name"
                        type="text" 
                        required
                        placeholder="الاسم الكامل للطالب"
                        value={quickName}
                        onChange={e => setQuickName(e.target.value)}
                        className="w-full px-5 py-3.5 bg-slate-5 border border-slate-200 focus:border-emerald-500 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-xs text-right text-slate-900"
                      />
                    </div>

                    {/* Linked Teacher */}
                    <div className="space-y-1.5 text-right">
                      <label className="text-xs font-black text-slate-700 block mr-1">
                        تعيين المعلم المعتمد الحاضن <span className="text-rose-500 font-black">*</span>
                      </label>
                      <select 
                        required
                        value={quickTeacher}
                        onChange={e => setQuickTeacher(e.target.value)}
                        className="w-full px-5 py-3.5 bg-slate-5 border border-slate-200 focus:border-emerald-500 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-xs text-right text-slate-900 cursor-pointer appearance-none"
                      >
                        <option value="">-- اختر المعلم لربطه بالطالب --</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Grade Selector */}
                      <div className="space-y-1.5 text-right">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-slate-700 block mr-1">
                            الصف الدراسي
                          </label>
                          {quickGrade && (
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                              getDefaultPricingUnitForGrade(quickGrade) === 'session_40'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-blue-100 text-blue-900 border-blue-300'
                            }`}>
                              {getDefaultPricingUnitForGrade(quickGrade) === 'session_40' ? 'تلقائي: نظام الحصة 40 د 🎓' : 'تلقائي: نظام الساعة 60 د ⏱️'}
                            </span>
                          )}
                        </div>
                        <select 
                          value={quickGrade}
                          onChange={e => {
                            const newGrade = e.target.value;
                            setQuickGrade(newGrade);
                            const autoUnit = getDefaultPricingUnitForGrade(newGrade);
                            setQuickPreferredPricingUnit(autoUnit);
                          }}
                          className="w-full px-5 py-3.5 bg-slate-5 border border-slate-200 focus:border-emerald-500 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-xs text-right text-slate-900 cursor-pointer appearance-none text-right"
                        >
                          <option value="">-- اختر الصف الدراسي --</option>
                          <optgroup label="مرحلة الطفولة المبكرة">
                            <option value="روضة (جيل 3 - 4 سنوات)">روضة (جيل 3 - 4 سنوات)</option>
                            <option value="بستان / تمهيدي (جيل 5 - 6 سنوات)">بستان / تمهيدي (جيل 5 - 6 سنوات)</option>
                          </optgroup>
                          <optgroup label="المرحلة الابتدائية">
                            <option value="الصف الأول الابتدائي">الصف الأول الابتدائي</option>
                            <option value="الصف الثاني الابتدائي">الصف الثاني الابتدائي</option>
                            <option value="الصف الثالث الابتدائي">الصف الثالث الابتدائي</option>
                            <option value="الصف الرابع الابتدائي">الصف الرابع الابتدائي</option>
                            <option value="الصف الخامس الابتدائي">الصف الخامس الابتدائي</option>
                            <option value="الصف السادس الابتدائي">الصف السادس الابتدائي</option>
                          </optgroup>
                          <optgroup label="المرحلة الإعدادية">
                            <option value="الصف السابع الإعدادي">الصف السابع الإعدادي</option>
                            <option value="الصف الثامن الإعدادي">الصف الثامن الإعدادي</option>
                            <option value="الصف التاسع الإعدادي">الصف التاسع الإعدادي</option>
                          </optgroup>
                          <optgroup label="المرحلة الثانوية والبجروت">
                            <option value="الصف العاشر">الصف العاشر</option>
                            <option value="الصف الحادي عشر - مسار البجروت">الصف الحادي عشر - مسار البجروت</option>
                            <option value="الصف الثاني عشر - مسار البجروت">الصف الثاني عشر - مسار البجروت</option>
                          </optgroup>
                        </select>
                      </div>

                      {/* Phone Number */}
                      <div className="space-y-1.5 text-right">
                        <label className="text-xs font-black text-slate-700 block mr-1">
                          رقم الهاتف / الجوال
                        </label>
                        <input 
                          type="tel" 
                          placeholder="مثال: 059xxxxxxx"
                          value={quickPhone}
                          onChange={e => setQuickPhone(e.target.value)}
                          className="w-full px-5 py-3.5 bg-slate-5 border border-slate-200 focus:border-emerald-500 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-xs text-right text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Initial Credit Deposit (Optional) */}
                    <div className="space-y-1.5 text-right">
                      <label className="text-xs font-black text-slate-700 block mr-1">
                        شحن رصيد نقدي أولي (₪) <span className="text-slate-400 font-bold text-[10px]">(اختياري)</span>
                      </label>
                      <input 
                        type="number" 
                        min="0"
                        placeholder="مثال: 100 أو اتركها فارغة"
                        value={quickInitialPayment}
                        onChange={e => setQuickInitialPayment(e.target.value)}
                        className="w-full px-5 py-3.5 bg-slate-5 border border-slate-200 focus:border-emerald-500 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-xs text-right text-slate-900"
                      />
                    </div>

                    {/* System Selection: Hourly vs 40-Minute Sessions (Manager Only) */}
                    <div className="bg-amber-50/70 border border-amber-200/90 p-4 rounded-2xl space-y-2 text-right">
                      <div className="flex items-center justify-between pb-1.5 border-b border-amber-200/70">
                        <div className="flex items-center gap-2">
                          <Clock size={15} className="text-amber-600" />
                          <span className="text-xs font-black text-slate-900">نظام احتساب الحصص عند المعلم</span>
                        </div>
                        <span className="text-[9px] bg-amber-200 text-amber-950 font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-300">
                          <Lock size={9} />
                          صلاحيات المدير فقط
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setQuickPreferredPricingUnit('hourly')}
                          className={`p-2.5 rounded-xl border text-right transition-all flex items-center gap-2 cursor-pointer ${
                            quickPreferredPricingUnit === 'hourly'
                              ? 'border-[#1A365D] bg-white shadow-xs ring-1 ring-[#1A365D]'
                              : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 ${
                            quickPreferredPricingUnit === 'hourly' ? 'border-[#1A365D] bg-[#1A365D] text-white' : 'border-slate-300'
                          }`}>
                            {quickPreferredPricingUnit === 'hourly' && <Check size={10} className="stroke-[3]" />}
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 block">نظام الساعات ⏱️</span>
                            <span className="text-[9px] text-slate-400 font-bold block">60 دقيقة / ساعة</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setQuickPreferredPricingUnit('session_40')}
                          className={`p-2.5 rounded-xl border text-right transition-all flex items-center gap-2 cursor-pointer ${
                            quickPreferredPricingUnit === 'session_40'
                              ? 'border-amber-500 bg-white shadow-xs ring-1 ring-amber-500'
                              : 'border-slate-200 bg-white/70 hover:bg-white text-slate-600'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 ${
                            quickPreferredPricingUnit === 'session_40' ? 'border-amber-500 bg-amber-500 text-slate-950' : 'border-slate-300'
                          }`}>
                            {quickPreferredPricingUnit === 'session_40' && <Check size={10} className="stroke-[3]" />}
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 block">نظام الحصة 🎓</span>
                            <span className="text-[9px] text-amber-700 font-bold block">40 دقيقة / حصة</span>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    {quickAddSuccess ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-emerald-600 text-white p-5 rounded-2xl flex items-center gap-4 shadow-xl"
                      >
                        <CheckCircle2 size={24} className="shrink-0" />
                        <div>
                          <p className="font-black text-sm">تم تسجيل وتنسيب الطالب بنجاح!</p>
                          <p className="text-emerald-100 text-[10px] font-bold mt-0.5">تم تحديث كشوف وحسابات ذمم الطلاب وتوثيق النشاط تلقائياً.</p>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex gap-4">
                        <button 
                          type="submit"
                          disabled={isSubmittingQuickAdd || !quickName.trim() || !quickTeacher}
                          className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
                        >
                          {isSubmittingQuickAdd ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              إتمام التسجيل السريع ⚡
                            </>
                          )}
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setIsQuickAddModalOpen(false);
                            setQuickName('');
                            setQuickTeacher('');
                            setQuickGrade('');
                            setQuickPhone('');
                            setQuickInitialPayment('');
                          }}
                          className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-sm transition-all cursor-pointer"
                        >
                          إلغاء
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* 💬 Custom WhatsApp Alert & Message Template Modal */}
        <CustomWhatsAppAlertModal
          isOpen={isSingleAlertOpen}
          onClose={() => {
            setIsSingleAlertOpen(false);
            setSingleAlertStudent(null);
          }}
          students={students}
          initialStudent={singleAlertStudent}
          initialTemplateKey={singleAlertInitialTemplate}
          lowBalanceThreshold={lowBalanceThreshold}
          defaultStudentHourlyRate={defaultStudentHourlyRate}
          getStudentStats={getStudentStats}
          onSentSuccess={(studentId) => {
            setBulkSentStatus(prev => ({
              ...prev,
              [studentId]: { status: 'sent' }
            }));
          }}
        />

        {/* 👥 Modal: Summary of Students Not Assigned to Group Courses with WhatsApp Messaging */}
        <UnassignedGroupStudentsModal
          isOpen={isUnassignedModalOpen}
          onClose={() => setIsUnassignedModalOpen(false)}
          students={students}
          courses={activeCoursesList}
          onSelectStudent={(studentId) => {
            setSelectedStudentId(studentId);
          }}
          onAssignToCourse={handleAssignStudentToCourse}
          managerName={globalSettings.managerName || "أكاديمية التفوق"}
        />


        {/* 🧹 Auto-Archive Inactive Students (>6 Months) Modal */}
        <AnimatePresence>
          {isAutoArchiveModalOpen && (
            <motion.div 
              key="auto-archive-inactive-students-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto" 
              dir="rtl"
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl border border-slate-150 overflow-hidden my-8"
              >
              <button 
                type="button"
                onClick={() => {
                  setIsAutoArchiveModalOpen(false);
                  setAutoArchiveSuccessMsg('');
                }}
                className="absolute top-6 left-6 p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all cursor-pointer z-10"
              >
                <X size={20} />
              </button>

              <div className="p-7 md:p-9">
                {/* Modal Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-800 flex items-center justify-center shadow-sm shrink-0">
                    <Archive size={26} className="animate-bounce" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        الأرشفة التلقائية للطلاب الخاملين (+6 أشهر)
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-black">
                        {inactiveStudentsList.length} طالب مؤهل للأرشفة
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-bold mt-1">
                      تنظيف القائمة النشطة ونقل الطلاب الذين لم يسجلوا أي نشاط أو حصص لأكثر من 180 يوماً إلى سجل الأرشيف.
                    </p>
                  </div>
                </div>

                {/* Success Notification */}
                {autoArchiveSuccessMsg && (
                  <div className="p-4 mb-5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-black flex items-center gap-2 animate-in fade-in zoom-in-95">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                    <span>{autoArchiveSuccessMsg}</span>
                  </div>
                )}

                {/* Explanation Card */}
                <div className="bg-gradient-to-r from-amber-50/90 to-orange-50/70 border border-amber-200/80 rounded-2xl p-4 mb-6 text-right">
                  <div className="flex items-center gap-2 text-amber-900 font-black text-xs mb-1">
                    <Sparkles size={14} className="text-amber-600 shrink-0" />
                    <span>كيف تعمل الأرشفة الذكية؟</span>
                  </div>
                  <p className="text-slate-650 text-[11px] font-bold leading-relaxed">
                    يقوم النظام بفحص كافة سجلات الحصص والمدفوعات لكل طالب. يتم اعتبار الطالب <strong>خاملاً</strong> إذا انقضت <strong>6 أشهر (180 يوماً فأكثر)</strong> دون أي حصة مسجلة أو حركة رصيد. الأرشفة تحافظ على كافة السجلات والبيانات وتاريخ الحصص، وتتيح استعادة الطالب في أي وقت بنقرة واحدة من تبويب "الأرشيف".
                  </p>
                </div>

                {/* Selection Toolbar */}
                <div className="flex items-center justify-between gap-3 mb-3 p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedInactiveIds.length === inactiveStudentsList.length) {
                          setSelectedInactiveIds([]);
                        } else {
                          setSelectedInactiveIds(inactiveStudentsList.map(item => item.student.id));
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-amber-400 rounded-lg text-xs font-black text-slate-700 transition-all cursor-pointer shadow-2xs"
                    >
                      {selectedInactiveIds.length === inactiveStudentsList.length ? (
                        <>
                          <CheckSquare size={14} className="text-amber-600" />
                          <span>إلغاء تحديد الكل</span>
                        </>
                      ) : (
                        <>
                          <Square size={14} className="text-slate-400" />
                          <span>تحديد الكل ({inactiveStudentsList.length})</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-xs font-black text-slate-700">
                    تم تحديد: <span className="text-amber-800 font-black">{selectedInactiveIds.length}</span> من أصل <span className="text-slate-900">{inactiveStudentsList.length}</span> طالب
                  </div>
                </div>

                {/* Students List */}
                <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 mb-6 bg-white shadow-inner">
                  {inactiveStudentsList.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 font-bold text-xs">
                      🎉 رائع! لا يوجد أي طلاب خاملين لأكثر من 6 أشهر في القائمة النشطة حالياً.
                    </div>
                  ) : (
                    inactiveStudentsList.map(({ student, inactivity, stats }) => {
                      const isSelected = selectedInactiveIds.includes(student.id);
                      return (
                        <div 
                          key={student.id}
                          onClick={() => {
                            setSelectedInactiveIds(prev => 
                              prev.includes(student.id) 
                                ? prev.filter(id => id !== student.id)
                                : [...prev, student.id]
                            );
                          }}
                          className={`p-3.5 flex items-center justify-between gap-3 transition-colors cursor-pointer hover:bg-amber-50/40 ${
                            isSelected ? 'bg-amber-50/70 border-r-4 border-amber-500' : 'border-r-4 border-transparent'
                          }`}
                        >
                          {/* Checkbox and Student Info */}
                          <div className="flex items-center gap-3 min-w-0">
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // Handled by parent div
                              className="w-4 h-4 text-amber-600 rounded border-slate-300 focus:ring-amber-500 cursor-pointer pointer-events-none"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black text-slate-900">{student.name}</span>
                                {(student.grade || student.academicLevel) && (
                                  <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[9px] font-black border border-indigo-100">
                                    {student.grade || student.academicLevel}
                                  </span>
                                )}
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[9px] font-black border border-amber-200">
                                  خامل منذ {inactivity.daysInactive} يوم (~{inactivity.monthsInactive} شهر)
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-bold mt-0.5 flex items-center gap-2">
                                <span>{inactivity.latestActivityText}</span>
                                {student.phone && <span>• 📱 {student.phone}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Balance and Stats */}
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${
                              stats.balance < 0 
                                ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                : stats.balance > 0 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              الرصيد: {stats.balance} ₪
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <button
                    type="button"
                    disabled={selectedInactiveIds.length === 0 || isAutoArchivingLoading}
                    onClick={() => executeAutoArchive(selectedInactiveIds)}
                    className="flex-1 sm:flex-none px-6 py-3.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 rounded-2xl font-black text-xs transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isAutoArchivingLoading ? (
                      <>
                        <RefreshCw size={15} className="animate-spin" />
                        <span>جاري أرشفة الطلاب...</span>
                      </>
                    ) : (
                      <>
                        <Archive size={15} />
                        <span>أرشفة الطلاب المحددين الآن ({selectedInactiveIds.length}) ⚡</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAutoArchiveModalOpen(false);
                      setAutoArchiveSuccessMsg('');
                    }}
                    className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs transition-all cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* Bulk WhatsApp Reminder Modal */}
        <AnimatePresence>
          {isBulkWhatsAppOpen && (
            <motion.div 
              key="bulk-whatsapp-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto"
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 15 }}
                className="relative w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden my-6 max-h-[92vh] flex flex-col"
                dir="rtl"
              >
              {/* Header */}
              <div className="p-6 sm:p-8 bg-gradient-to-l from-slate-900 via-slate-850 to-slate-900 text-white border-b border-slate-800 flex items-start justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-13 h-13 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shrink-0">
                    <MessageSquare size={26} className="animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-emerald-600 text-white px-2.5 py-0.5 rounded-full font-black">
                        التحصيل والسداد الآلي 📲
                      </span>
                      <span className="text-slate-400 text-xs">•</span>
                      <span className="text-slate-300 text-xs font-bold">WhatsApp Messenger Web</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1">
                      معالج تذكيرات الدفع والتحصيل المالي عبر WhatsApp 💬⚡
                    </h3>
                    <p className="text-xs text-slate-300 font-medium mt-0.5">
                      إرسال تذكيرات سداد ذمم مجمعة وفردية بضغطة زر واحدة لأولياء أمور الطلاب الذين لديهم أرصدة سالبة
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsBulkWhatsAppOpen(false);
                          setScheduledModalInitialMode('create');
                          setScheduledModalTargetMode(bulkWhatsAppTargetMode);
                          setIsScheduledWhatsAppModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Clock size={13} />
                        <span>⏰ جدولة هذا الإرسال لموعد لاحق تلقائياً</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsBulkWhatsAppOpen(false);
                          setScheduledModalInitialMode('list');
                          setIsScheduledWhatsAppModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Calendar size={13} />
                        <span>عرض جدول التذكيرات المجدولة ({scheduledRemindersList.length})</span>
                      </button>
                    </div>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    setIsBulkWhatsAppOpen(false);
                    setBulkSentStatus({});
                    setBulkSendingProgress({ current: 0, total: 0, isSending: false });
                  }}
                  className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1">
                
                {/* Mode Selector Tabs */}
                <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl flex-wrap">
                  <button
                    type="button"
                    onClick={() => {
                      setBulkWhatsAppTargetMode('over_debt_limit');
                      setSelectedBulkStudentIds(overDebtLimitStudents.map(s => s.id));
                      setWhatsappTemplate(WHATSAPP_TEMPLATES_PRESETS.debt_limit_exceeded.text);
                      regenerateAllCustomMessages(WHATSAPP_TEMPLATES_PRESETS.debt_limit_exceeded.text);
                    }}
                    className={`flex-1 min-w-[170px] py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      bulkWhatsAppTargetMode === 'over_debt_limit'
                        ? 'bg-rose-700 text-white shadow-md shadow-rose-700/25 ring-2 ring-rose-300'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <AlertOctagon size={14} className={bulkWhatsAppTargetMode === 'over_debt_limit' ? "text-amber-300 animate-pulse" : "text-rose-600"} />
                    <span>🚨 متجاوزو حد الدين المسموح</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                      bulkWhatsAppTargetMode === 'over_debt_limit' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {overDebtLimitStudents.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBulkWhatsAppTargetMode('negative');
                      setSelectedBulkStudentIds(negativeStudents.map(s => s.id));
                      setWhatsappTemplate(WHATSAPP_TEMPLATES_PRESETS.negative_settlement.text);
                      regenerateAllCustomMessages(WHATSAPP_TEMPLATES_PRESETS.negative_settlement.text);
                    }}
                    className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      bulkWhatsAppTargetMode === 'negative'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <span>🔴 ذوو الأرصدة السالبة (المدينون)</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                      bulkWhatsAppTargetMode === 'negative' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {negativeStudents.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBulkWhatsAppTargetMode('critical');
                      setSelectedBulkStudentIds(criticalStudents.map(s => s.id));
                      setWhatsappTemplate(WHATSAPP_TEMPLATES_PRESETS.friendly_recharge.text);
                      regenerateAllCustomMessages(WHATSAPP_TEMPLATES_PRESETS.friendly_recharge.text);
                    }}
                    className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      bulkWhatsAppTargetMode === 'critical'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <span>⚠️ الأرصدة المنخفضة تحت السقف</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                      bulkWhatsAppTargetMode === 'critical' ? 'bg-slate-950/15 text-slate-950' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {criticalStudents.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBulkWhatsAppTargetMode('all_debtors');
                      setSelectedBulkStudentIds(allDebtorsStudents.map(s => s.id));
                      setWhatsappTemplate(WHATSAPP_TEMPLATES_PRESETS.detailed_statement.text);
                      regenerateAllCustomMessages(WHATSAPP_TEMPLATES_PRESETS.detailed_statement.text);
                    }}
                    className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      bulkWhatsAppTargetMode === 'all_debtors'
                        ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    <span>👥 كافة الحسابات المستحقة</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                      bulkWhatsAppTargetMode === 'all_debtors' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {allDebtorsStudents.length}
                    </span>
                  </button>
                </div>

                {/* Allowed Debt Limit Configuration Strip */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-3.5 sm:p-4 rounded-2xl border border-indigo-900/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-right">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] bg-rose-600 text-white font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <AlertOctagon size={11} />
                        <span>سقف الدين المسموح به للأكاديمية ⚖️</span>
                      </span>
                      <span className="text-xs font-bold text-slate-200">
                        {bulkWhatsAppTargetMode === 'over_debt_limit' ? 'الطلاب الذين تجاوز دينهم هذا الحد مستهدفون للتذكير' : 'حدد سقف الدين العام للمقارنة والتذكيرات'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-medium">
                      إذا كان للطالب سقف دين خاص في ملفه يُعتمد أولاً، وإلا يُطبق هذا السقف العام ({allowedDebtLimitThreshold} ₪).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <div className="flex items-center gap-1 bg-white/10 p-1 rounded-xl">
                      {[0, 50, 100, 150, 200, 300, 500].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            setAllowedDebtLimitThreshold(val);
                          }}
                          className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                            allowedDebtLimitThreshold === val
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'text-slate-300 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {val === 0 ? '0 (أي دين)' : `${val} ₪`}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-xl border border-white/10">
                      <span className="text-[10px] text-slate-300 font-bold">مبلغ مخصص:</span>
                      <input
                        type="number"
                        min={0}
                        value={allowedDebtLimitThreshold}
                        onChange={e => {
                          const val = Math.max(0, Number(e.target.value) || 0);
                          setAllowedDebtLimitThreshold(val);
                        }}
                        className="w-16 bg-slate-900 border border-slate-700 text-white text-xs font-mono font-bold px-2 py-1 rounded-lg text-center outline-none focus:border-rose-500"
                      />
                      <span className="text-xs text-slate-300 font-mono">₪</span>
                    </div>
                  </div>
                </div>

                {/* Metrics Summary Strip */}
                {(() => {
                  const selectedTargetStudents = bulkTargetStudents.filter(s => selectedBulkStudentIds.includes(s.id));
                  const totalDebt = selectedTargetStudents.reduce((sum, s) => {
                    const stats = getStudentStats(s.id);
                    return sum + (stats.balance < 0 ? Math.abs(stats.balance) : 0);
                  }, 0);
                  const validPhones = selectedTargetStudents.filter(s => (s.phone || s.phoneNumber || '').trim()).length;

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl text-right">
                        <span className="text-[10px] text-slate-400 font-black block">إجمالي الطلاب المحددين للإرسال</span>
                        <div className="text-lg font-black text-slate-900 font-mono mt-0.5 flex items-baseline gap-1">
                          <span>{selectedTargetStudents.length}</span>
                          <span className="text-xs font-bold text-slate-400 font-sans">من أصل {bulkTargetStudents.length} طلاب</span>
                        </div>
                      </div>

                      <div className="bg-rose-50/60 border border-rose-200/80 p-3.5 rounded-2xl text-right">
                        <span className="text-[10px] text-rose-600 font-black block">إجمالي مبالغ الذمم والديون المطلوبة</span>
                        <div className="text-lg font-black text-rose-600 font-mono mt-0.5">
                          ₪ {totalDebt.toLocaleString()}
                        </div>
                      </div>

                      <div className="bg-emerald-50/60 border border-emerald-200/80 p-3.5 rounded-2xl text-right">
                        <span className="text-[10px] text-emerald-600 font-black block">أرقام هواتف مسجلة وجاهزة للواتساب</span>
                        <div className="text-lg font-black text-emerald-600 font-mono mt-0.5 flex items-baseline gap-1">
                          <span>{validPhones}</span>
                          <span className="text-xs font-bold text-emerald-600/70 font-sans">أرقام صالحة</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Templates Selector */}
                <div className="space-y-2 text-right">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-500" />
                      <span>اختر صيغة وقالب رسالة التذكير الجاهزة أو قم بتخصيصها:</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {Object.entries(WHATSAPP_TEMPLATES_PRESETS).map(([key, template]) => {
                      const isActive = whatsappTemplate === template.text;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => {
                            setWhatsappTemplate(template.text);
                            regenerateAllCustomMessages(template.text);
                          }}
                          className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                            isActive
                              ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                              : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="text-sm">{template.iconDesc}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                              isActive ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {template.tag}
                            </span>
                          </div>
                          <span className="text-xs font-black truncate block">{template.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Template Editor */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between flex-wrap gap-1 text-[10px] text-slate-400 font-bold">
                      <span>انقر على الوسم لإدراجه في نص الرسالة:</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { tag: '{NAME}', label: 'اسم الطالب' },
                          { tag: '{BALANCE}', label: 'الرصيد' },
                          { tag: '{DEBT_AMOUNT}', label: 'مبلغ الذمة' },
                          { tag: '{ALLOWED_DEBT_LIMIT}', label: 'حد الدين المسموح' },
                          { tag: '{EXCEEDED_AMOUNT}', label: 'مبلغ التجاوز' },
                          { tag: '{THRESHOLD}', label: 'حد الأمان' },
                          { tag: '{HOURS}', label: 'ساعات الحصص' },
                          { tag: '{TOPPEDUP}', label: 'المشحون سابقاً' },
                          { tag: '{PHONE}', label: 'رقم الهاتف' },
                          { tag: '{DATE}', label: 'التاريخ' }
                        ].map(item => (
                          <button
                            key={item.tag}
                            type="button"
                            onClick={() => setWhatsappTemplate(prev => prev + ' ' + item.tag)}
                            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-mono text-[9px] font-bold transition-colors cursor-pointer"
                          >
                            {item.tag} <span className="font-sans text-[8px] text-slate-500">({item.label})</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <textarea
                      rows={4}
                      value={whatsappTemplate}
                      onChange={e => setWhatsappTemplate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-bold text-xs text-right text-slate-800 leading-relaxed"
                      placeholder="صيغة التذكير..."
                    />

                    <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          regenerateAllCustomMessages(whatsappTemplate);
                          triggerToast('تم تطبيق القالب وتوليد النصوص بنجاح لجميع الطلاب المحددين! ⚡', '', 'success');
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <RefreshCw size={12} />
                        <span>تطبيق القالب وإعادة توليد النصوص المخصصة لكافة الطلاب ⚡</span>
                      </button>
                      <span className="text-[10px] text-slate-400 font-medium">
                        تعديل نص طالب معين في القائمة أدناه لن يتأثر إلا إذا اخترت إعادة التوليد
                      </span>
                    </div>
                  </div>
                </div>

                {/* Live Message Preview (WhatsApp Style) */}
                {bulkTargetStudents.length > 0 && (
                  <div className="space-y-1.5 text-right">
                    <span className="text-[11px] font-black text-slate-600 block">
                      معاينة حية لشكل رسالة التذكير على تطبيق WhatsApp (مثال للطالب: {bulkTargetStudents[0]?.name}):
                    </span>
                    <div className="bg-[#ECE5DD] p-4 rounded-2xl border border-slate-300/80 max-w-lg shadow-inner">
                      <div className="bg-white rounded-2xl p-3.5 shadow-sm text-right space-y-2 relative border border-emerald-100">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-[10px] font-black text-emerald-700">رسالة تذكير موجهة إلى ولي أمر: {bulkTargetStudents[0]?.name}</span>
                          <span className="text-[9px] font-bold text-slate-400 font-mono">الآن</span>
                        </div>
                        <p className="text-xs text-slate-800 font-medium leading-relaxed whitespace-pre-line">
                          {getStudentCustomizedMessage(bulkTargetStudents[0])}
                        </p>
                        <div className="flex items-center justify-end gap-1 pt-1">
                          <span className="text-[9px] text-slate-400 font-mono">10:45 AM</span>
                          <span className="text-emerald-500 text-[10px] font-bold">✓✓</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Students Selection Table */}
                <div className="space-y-3 text-right">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedBulkStudentIds.length === bulkTargetStudents.length) {
                            setSelectedBulkStudentIds([]);
                          } else {
                            setSelectedBulkStudentIds(bulkTargetStudents.map(s => s.id));
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        {selectedBulkStudentIds.length === bulkTargetStudents.length ? (
                          <>
                            <CheckSquare size={14} className="text-emerald-600" />
                            <span>إلغاء تحديد الكل</span>
                          </>
                        ) : (
                          <>
                            <Square size={14} />
                            <span>تحديد الكل ({bulkTargetStudents.length})</span>
                          </>
                        )}
                      </button>
                      <span className="text-xs font-bold text-slate-500">
                        تم تحديد ({selectedBulkStudentIds.length} من {bulkTargetStudents.length})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setShowAllCustomEditors(!showAllCustomEditors)}
                        className={`px-3 py-1.5 border rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 ${
                          showAllCustomEditors
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-800 ring-2 ring-indigo-200'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                        title="فتح أو إغلاق صندوق تحرير النص المخصص لجميع الطلاب في القائمة"
                      >
                        <Pencil size={13} className="text-indigo-600" />
                        <span>{showAllCustomEditors ? 'إخفاء كافة المحررات' : 'توسيع وتحرير نصوص كافة الطلاب ✏️'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleCopyAllWhatsAppMessages}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <Copy size={13} />
                        <span>نسخ كافة الرسائل والأرقام للحافظة 📋</span>
                      </button>
                    </div>
                  </div>

                  {/* Table Container with Per-Student Custom Message Editors */}
                  <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 shadow-xs">
                    {bulkTargetStudents.length === 0 ? (
                      <div className="text-center py-10 space-y-2">
                        <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
                        <p className="text-xs text-slate-500 font-black">لا يوجد أي طلاب مطابقين لهذا التصنيف حالياً 🎉</p>
                        <p className="text-[10px] text-slate-400 font-medium">كافة الحسابات المالية في حالة ممتازة ومسددة بالكامل</p>
                      </div>
                    ) : (
                      bulkTargetStudents.map(s => {
                        const sStats = getStudentStats(s.id);
                        const debtAmount = sStats.balance < 0 ? Math.abs(sStats.balance) : 0;
                        const allowedLimit = getStudentAllowedDebtLimit(s);
                        const exceededAmount = Math.max(0, debtAmount - allowedLimit);
                        const isOverDebt = debtAmount > allowedLimit;
                        const phoneVal = (s.phone || s.phoneNumber || '').trim();
                        const hasPhone = !!phoneVal;
                        const isSelected = selectedBulkStudentIds.includes(s.id);
                        const status = bulkSentStatus[s.id]?.status || 'pending';
                        const isNegative = sStats.balance < 0;
                        const isModified = !!studentMessageModified[s.id];
                        const isExpanded = showAllCustomEditors || expandedCustomEditorId === s.id;
                        const studentMessage = customMessagesByStudent[s.id] ?? getFormattedWhatsAppMessage(s, whatsappTemplate);

                        return (
                          <div 
                            key={s.id} 
                            className={`p-3.5 transition-colors ${
                              isSelected ? 'bg-slate-50/90' : 'bg-white opacity-70'
                            }`}
                          >
                            {/* Student Row Header */}
                            <div 
                              onClick={() => {
                                setSelectedBulkStudentIds(prev => 
                                  prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                                );
                              }}
                              className="flex items-center justify-between gap-4 cursor-pointer select-none"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <input 
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}} // Handled by parent div
                                  className="w-4 h-4 text-emerald-600 rounded-md border-slate-300 focus:ring-emerald-500 cursor-pointer"
                                />

                                <span className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-xs ${
                                  isOverDebt 
                                    ? 'bg-rose-700 text-white' 
                                    : isNegative 
                                    ? 'bg-rose-100 text-rose-700' 
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {isOverDebt ? '🚨' : s.name.charAt(0)}
                                </span>

                                <div className="text-right min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-black text-slate-900 break-words leading-snug">{s.name}</span>
                                    {isOverDebt && (
                                      <span className="bg-rose-600 text-white px-2 py-0.2 rounded-md text-[9px] font-black animate-pulse">
                                        تجاوز سقف الدين بمقدار ₪{exceededAmount}
                                      </span>
                                    )}
                                    {isNegative ? (
                                      <span className="bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.2 rounded-md text-[9px] font-black">
                                        دين كلي: ₪{debtAmount}
                                      </span>
                                    ) : (
                                      <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.2 rounded-md text-[9px] font-black">
                                        تحت الحد (₪{sStats.balance})
                                      </span>
                                    )}
                                    {isModified && (
                                      <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.2 rounded-md text-[9px] font-black">
                                        ✍️ نص مخصص ومعدل
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-2 mt-0.5 text-[9px] font-bold text-slate-400 flex-wrap">
                                    <span>الرصيد: <strong className={isNegative ? "text-rose-600 font-black" : "text-amber-600 font-black"}>₪{sStats.balance}</strong></span>
                                    <span>•</span>
                                    <span>سقف الدين المسموح: <strong className="text-slate-700 font-black">{allowedLimit} ₪</strong></span>
                                    {hasPhone ? (
                                      <>
                                        <span>•</span>
                                        <span className="text-slate-600 font-mono font-bold">{phoneVal}</span>
                                      </>
                                    ) : (
                                      <>
                                        <span>•</span>
                                        <span className="text-rose-500 font-black">رقم غير مسجل ⚠️</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setExpandedCustomEditorId(expandedCustomEditorId === s.id ? null : s.id)}
                                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                    isExpanded
                                      ? 'bg-indigo-600 text-white shadow-xs'
                                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                                  }`}
                                  title="تعديل وتخصيص نص رسالة الواتساب لهذا الطالب فقط قبل الإرسال"
                                >
                                  <Pencil size={12} />
                                  <span>{isExpanded ? 'إغلاق المحرر' : 'تخصيص النص ✏️'}</span>
                                </button>

                                {status === 'sending' && (
                                  <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
                                    <div className="w-2.5 h-2.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                                    جاري الفتح..
                                  </span>
                                )}
                                {status === 'sent' && (
                                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1">
                                    <Check size={12} className="stroke-[3]" />
                                    تم التوجيه للواتساب ✅
                                  </span>
                                )}
                                {status === 'pending' && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleCopySingleWhatsAppMessage(s)}
                                      className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs transition-all cursor-pointer"
                                      title="نسخ نص الرسالة الخاص بهذا الطالب"
                                    >
                                      <Copy size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={!hasPhone}
                                      onClick={() => handleSendSingleWhatsApp(s)}
                                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 disabled:opacity-40 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                                      title="إرسال تذكير عبر واتساب لهذا الطالب"
                                    >
                                      <MessageSquare size={12} />
                                      <span>إرسال فردي</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Expandable Per-Student Message Customizer */}
                            {isExpanded && (
                              <div 
                                onClick={e => e.stopPropagation()} 
                                className="mt-3 p-3.5 bg-white border border-indigo-200/80 rounded-2xl space-y-2 text-right shadow-sm"
                              >
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                                      <MessageSquare size={13} className="text-emerald-600" />
                                      <span>نص الرسالة المخصص لـ ({s.name}):</span>
                                    </span>
                                    {isModified ? (
                                      <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md text-[9px] font-black">
                                        ✍️ تم تعديل النص يدوياً لهذا الطالب
                                      </span>
                                    ) : (
                                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[9px] font-bold">
                                        ⚡ تم توليد النص تلقائياً من القالب
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => resetStudentCustomMessage(s)}
                                      className="text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                      title="استعادة النص الافتراضي المولّد من القالب الرئيسي"
                                    >
                                      <RefreshCw size={11} />
                                      <span>استعادة القالب</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleCopySingleWhatsAppMessage(s)}
                                      className="text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                    >
                                      <Copy size={11} />
                                      <span>نسخ النص</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Quick Insert Badges for this specific student */}
                                <div className="flex items-center gap-1 flex-wrap text-[9px] text-slate-500 font-bold">
                                  <span className="text-slate-400">إدراج بيانات سريعة:</span>
                                  {[
                                    { val: s.name, label: 'الاسم' },
                                    { val: `${sStats.balance} ₪`, label: 'الرصيد' },
                                    { val: `${debtAmount} ₪`, label: 'الذمة' },
                                    { val: `${allowedLimit} ₪`, label: 'سقف الدين' },
                                    { val: `${exceededAmount} ₪`, label: 'التجاوز' },
                                    { val: `${sStats.totalHours.toFixed(1)} ساعة`, label: 'الساعات' }
                                  ].map(item => (
                                    <button
                                      key={item.label}
                                      type="button"
                                      onClick={() => {
                                        const current = customMessagesByStudent[s.id] ?? getFormattedWhatsAppMessage(s, whatsappTemplate);
                                        updateStudentCustomMessage(s.id, current + ' ' + item.val);
                                      }}
                                      className="px-2 py-0.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-md text-[9px] font-medium transition-colors cursor-pointer"
                                    >
                                      + {item.label}: <strong className="font-mono text-emerald-700">{item.val}</strong>
                                    </button>
                                  ))}
                                </div>

                                {/* Textarea for this student */}
                                <textarea
                                  rows={4}
                                  value={studentMessage}
                                  onChange={e => updateStudentCustomMessage(s.id, e.target.value)}
                                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:border-emerald-500 rounded-xl focus:ring-3 focus:ring-emerald-500/10 outline-none transition-all font-medium text-xs text-right text-slate-800 leading-relaxed"
                                  placeholder={`اكتب رسالة مخصصة لولي أمر الطالب ${s.name}...`}
                                />

                                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                  <span>
                                    عدد الحروف: {studentMessage.length} حرف
                                  </span>
                                  <button
                                    type="button"
                                    disabled={!hasPhone}
                                    onClick={() => handleSendSingleWhatsApp(s)}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-black text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                                  >
                                    <MessageSquare size={11} />
                                    <span>إرسال هذا النص المخصص لـ ({s.name}) فوراً عبر واتساب 💬</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Progress Alert if Bulk Sending */}
                {bulkSendingProgress.isSending && (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-2 text-right">
                    <div className="flex items-center justify-between text-xs font-black text-emerald-800">
                      <span>جاري تشغيل معالج الإرسال عبر WhatsApp...</span>
                      <span className="font-mono">{bulkSendingProgress.current} من {bulkSendingProgress.total}</span>
                    </div>
                    <div className="w-full bg-emerald-200/60 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${(bulkSendingProgress.current / bulkSendingProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Copy All Toast */}
                {copiedAllNotification && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 text-white p-3 rounded-xl text-xs font-black text-center shadow-lg"
                  >
                    تم نسخ كافة رسائل وأرقام التذكير بنجاح للحافظة! جاهزة للصق في أدوات الإرسال 📋✅
                  </motion.div>
                )}

                {/* Info Note */}
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 text-right space-y-1">
                  <p className="text-amber-900 text-xs font-black">
                    💡 ملاحظة هامة للمدير المنسق:
                  </p>
                  <p className="text-amber-800 text-[10px] font-medium leading-relaxed">
                    نظراً لقيود أمان المتصفحات، يُرجى التأكد من السماح بالنوافذ المنبثقة (Pop-ups) لموقع الأكاديمية عند الضغط على الإرسال الجماعي ليتم فتح محادثات واتساب بالتتابع دون انقطاع.
                  </p>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <div className="text-xs font-bold text-slate-500 text-right w-full sm:w-auto">
                  عدد الطلاب المستهدفين المحددين: <strong className="text-slate-900 font-black">{selectedBulkStudentIds.length}</strong> طلاب
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkWhatsAppOpen(false);
                      setScheduledModalInitialMode('create');
                      setScheduledModalTargetMode(bulkWhatsAppTargetMode);
                      setIsScheduledWhatsAppModalOpen(true);
                    }}
                    className="flex-1 sm:flex-none px-4 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
                    title="جدولة هذا الإرسال ليتم في تاريخ ووقت محددين"
                  >
                    <Clock size={14} className="text-emerald-400" />
                    <span>جدولة لموعد محدد ⏰</span>
                  </button>

                  <button
                    type="button"
                    disabled={selectedBulkStudentIds.length === 0 || bulkSendingProgress.isSending}
                    onClick={handleSendBulkWhatsApp}
                    className="flex-1 sm:flex-none px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-950/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer border border-emerald-500"
                  >
                    <MessageSquare size={15} className="animate-pulse" />
                    <span>تشغيل معالج الإرسال والتذكير الجماعي ({selectedBulkStudentIds.length}) ⚡🚀</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsBulkWhatsAppOpen(false);
                      setBulkSentStatus({});
                      setBulkSendingProgress({ current: 0, total: 0, isSending: false });
                    }}
                    className="px-5 py-3.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-black text-xs transition-all cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scheduled WhatsApp Reminder Modal */}
      <ScheduledWhatsAppReminderModal
        isOpen={isScheduledWhatsAppModalOpen}
        onClose={() => setIsScheduledWhatsAppModalOpen(false)}
        students={students}
        settings={{ lowBalanceThreshold, academyName: 'أكاديمية التفوق أون لاين' }}
        calculateStudentBalance={(s) => getStudentStats(s.id).balance}
        scheduledReminders={scheduledRemindersList}
        initialMode={scheduledModalInitialMode}
        initialSelectedStudentIds={selectedBulkStudentIds}
        initialTargetMode={scheduledModalTargetMode}
        initialTemplate={whatsappTemplate}
      />

      {/* Student Financial Reports & PDF Export Modal */}
      <StudentFinancialReportsModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        students={students}
        teachers={teachers}
        sessions={sessions}
        credits={credits}
        initialStudentId={reportsModalInitialStudentId}
        initialTab={reportsModalInitialTab}
        globalSettings={globalSettings}
      />

      {/* Archive Confirmation Modal */}
      <AnimatePresence>
        {archiveConfirmStudent && (
          <motion.div 
            key={`archive-confirm-modal-${archiveConfirmStudent.id}`} 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[250] p-4 text-right no-print" 
            dir="rtl"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[2rem] max-w-md w-full p-8 border border-slate-100 shadow-2xl flex flex-col gap-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                  <Archive size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">أرشفة ملف الطالب</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">نقل الطالب إلى سجل الأرشيف غير النشط</p>
                </div>
              </div>

              <div className="text-xs font-bold text-slate-650 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                هل أنت متأكد من رغبتك في نقل الطالب <strong className="text-slate-900">"{archiveConfirmStudent.name}"</strong> إلى الأرشيف (توقف عن الدوام)؟
                <div className="mt-2 text-[10px] text-amber-600">
                  ⚠️ سيتم الاحتفاظ بكافة سجلاته المالية والدراسية وحصصه بأمان، ويمكنك استعادته وتنشيطه في أي وقت لاحق من تبويب الأرشيف.
                </div>
              </div>

              <div className="flex items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    toggleArchiveStudent(archiveConfirmStudent.id, true);
                    setArchiveConfirmStudent(null);
                  }}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  نعم، أرشفة الطالب 📂
                </button>
                <button
                  type="button"
                  onClick={() => setArchiveConfirmStudent(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                
                {currentReceiptData?.studentPhone && (
                  <button
                    onClick={() => {
                      const msg = buildStudentPaymentWhatsAppText(currentReceiptData);
                      const cleanPhone = currentReceiptData.studentPhone.replace(/[^0-9]/g, '');
                      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
                      window.open(whatsappUrl, '_blank');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black shadow-sm transition-all duration-200 cursor-pointer"
                    title="مشاركة إشعار وتفاصيل سند القبض عبر واتساب لولي أمر أو هاتف الطالب"
                  >
                    <MessageSquare size={13} />
                    <span>إرسال عبر واتساب 📱</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowPrintPreview(false);
                    setCurrentReceiptData(null);
                  }}
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

            {/* Live Receipt Preview Header: Center Details, Student Name, Amount, Operation Date, Service Provided */}
            {currentReceiptData && (
              <div className="bg-slate-900 text-white p-5 border-b border-slate-800 space-y-4 shrink-0 text-right" dir="rtl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-black tracking-wide text-emerald-300">
                      معاينة حية وتفاصيل السند المعتمد قبل الطباعة (Live Receipt Preview)
                    </span>
                    <span className="text-[10px] bg-white/10 text-slate-300 px-2.5 py-0.5 rounded-lg border border-white/10">
                      سند قبض رسمي معتمد
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsReceiptLiveEditorOpen(!isReceiptLiveEditorOpen)}
                    className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer border border-white/10 active:scale-95"
                  >
                    <Pencil size={12} className="text-amber-400" />
                    <span>{isReceiptLiveEditorOpen ? 'إخفاء لوحة التخصيص' : 'تعديل وتخصيص بيانات السند حياً ✏️'}</span>
                    {isReceiptLiveEditorOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                {/* 5 Core Information Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* 1. تفاصيل المركز (Center Details) */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1.5 hover:border-amber-400/40 transition-colors">
                    <div className="flex items-center justify-between text-amber-400">
                      <span className="text-[10px] font-black uppercase tracking-wider opacity-80">🏢 تفاصيل المركز</span>
                      <Building2 size={14} />
                    </div>
                    <div className="text-xs font-black text-white truncate" title={currentReceiptData.academyName}>
                      {currentReceiptData.academyName || 'أكاديمية التفوق أون لاين'}
                    </div>
                    <div className="text-[10px] text-slate-300 font-medium truncate">
                      الإدارة: {currentReceiptData.managerName || 'أ. د. زكي أبو علان'}
                    </div>
                    <div className="text-[9px] text-amber-300 font-mono">
                      {currentReceiptData.centerLicense || 'ترخيص: EDU-2026-98442'}
                    </div>
                    <div className="text-[9px] text-slate-400 font-mono truncate" title={currentReceiptData.centerPhone}>
                      هاتف: {currentReceiptData.centerPhone || '059-8321040'}
                    </div>
                  </div>

                  {/* 2. اسم الطالب (Student Name) */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1.5 hover:border-indigo-400/40 transition-colors">
                    <div className="flex items-center justify-between text-indigo-400">
                      <span className="text-[10px] font-black uppercase tracking-wider opacity-80">🎓 اسم الطالب</span>
                      <GraduationCap size={14} />
                    </div>
                    <div className="text-xs font-black text-white break-words leading-snug" title={currentReceiptData.studentName}>
                      {currentReceiptData.studentName}
                    </div>
                    <div className="text-[10px] text-slate-300 font-medium truncate">
                      المرحلة: {currentReceiptData.studentGrade || 'المرحلة المعتمدة'}
                    </div>
                    <div className="text-[9px] text-indigo-300 font-mono truncate">
                      هاتف: {currentReceiptData.studentPhone || 'غير مسجل'}
                    </div>
                    <div className="text-[9px] text-slate-400 truncate">
                      المعلم: {currentReceiptData.leadTeacherName || 'القسم الأكاديمي'}
                    </div>
                  </div>

                  {/* 3. المبلغ (Amount) */}
                  <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3.5 space-y-1.5 hover:border-emerald-400 transition-colors">
                    <div className="flex items-center justify-between text-emerald-400">
                      <span className="text-[10px] font-black uppercase tracking-wider opacity-80">💵 المبلغ المقبوض</span>
                      <DollarSign size={14} />
                    </div>
                    <div className="text-base font-black text-emerald-300">
                      ₪{currentReceiptData.amount.toFixed(2)}
                    </div>
                    <div className="text-[9px] text-emerald-100/90 font-bold leading-tight line-clamp-2" title={tafqeetArabic(currentReceiptData.amount)}>
                      {tafqeetArabic(currentReceiptData.amount)}
                    </div>
                    <div className="text-[9px] text-slate-300 pt-0.5">
                      الرصيد بعد السند: <strong className="text-emerald-400">₪{(currentReceiptData.newBalance ?? 0).toFixed(2)}</strong>
                    </div>
                  </div>

                  {/* 4. تاريخ العملية (Operation Date) */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1.5 hover:border-sky-400/40 transition-colors">
                    <div className="flex items-center justify-between text-sky-400">
                      <span className="text-[10px] font-black uppercase tracking-wider opacity-80">📅 تاريخ ورقم العملية</span>
                      <Calendar size={14} />
                    </div>
                    <div className="text-xs font-black text-white font-mono">
                      {currentReceiptData.receiptDate}
                    </div>
                    <div className="text-[10px] text-sky-300 font-mono truncate" title={currentReceiptData.receiptNumber}>
                      رقم: {currentReceiptData.receiptNumber}
                    </div>
                    <div className="text-[9px] text-slate-300">
                      الحالة: <span className="text-emerald-400 font-bold">سند معتمد ومسجل ✅</span>
                    </div>
                  </div>

                  {/* 5. الخدمة المقدمة (Provided Service) */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 space-y-1.5 hover:border-amber-400/40 transition-colors">
                    <div className="flex items-center justify-between text-amber-400">
                      <span className="text-[10px] font-black uppercase tracking-wider opacity-80">🎯 الخدمة المقدمة</span>
                      <Tag size={14} />
                    </div>
                    <div className="text-xs font-black text-amber-200 truncate" title={currentReceiptData.serviceName}>
                      {currentReceiptData.serviceName || 'شحن رصيد المحفظة التعليمية'}
                    </div>
                    <div className="text-[10px] text-slate-300 truncate">
                      الدفع: <span className="text-white font-bold">{currentReceiptData.paymentMethod || 'نقداً (كاش)'}</span>
                    </div>
                    <div className="text-[9px] text-slate-400 truncate" title={currentReceiptData.note}>
                      البيان: {currentReceiptData.note || 'سداد رسوم تعليمية'}
                    </div>
                  </div>
                </div>

                {/* Live Inline Editor Form (Toggled) */}
                {isReceiptLiveEditorOpen && (
                  <div className="bg-white/10 border border-white/15 rounded-2xl p-4 space-y-3 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                        <Pencil size={13} />
                        <span>تخصيص وتعديل بيانات السند الحية (تنعكس فوراً على معاينة الورقة أدناه):</span>
                      </h5>
                      <span className="text-[10px] text-slate-300">التحديث فوري ولحظي ⚡</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-300">الخدمة المقدمة:</label>
                        <input
                          type="text"
                          value={currentReceiptData.serviceName || ''}
                          onChange={e => updateLiveReceiptData({ serviceName: e.target.value })}
                          placeholder="اسم الخدمة المقدمة..."
                          className="w-full bg-slate-800 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-400 text-right"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-300">المبلغ المقبوض (₪):</label>
                        <input
                          type="number"
                          step="0.01"
                          value={currentReceiptData.amount}
                          onChange={e => {
                            const newAmt = parseFloat(e.target.value) || 0;
                            updateLiveReceiptData({ 
                              amount: newAmt,
                              newBalance: (currentReceiptData.previousBalance ?? 0) + newAmt 
                            });
                          }}
                          className="w-full bg-slate-800 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-400 text-right"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-300">تاريخ العملية:</label>
                        <input
                          type="date"
                          value={currentReceiptData.receiptDate}
                          onChange={e => updateLiveReceiptData({ receiptDate: e.target.value })}
                          className="w-full bg-slate-800 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-400 text-right"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-300">طريقة السداد:</label>
                        <select
                          value={currentReceiptData.paymentMethod || 'نقداً (كاش)'}
                          onChange={e => updateLiveReceiptData({ paymentMethod: e.target.value })}
                          className="w-full bg-slate-800 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-400 cursor-pointer text-right"
                        >
                          <option value="نقداً (كاش)">💵 نقداً (كاش)</option>
                          <option value="حوالة بنكية">🏛️ حوالة بنكية</option>
                          <option value="بطاقة ائتمان">💳 بطاقة ائتمان</option>
                          <option value="شحن محفظة إلكترونية">📱 شحن محفظة إلكترونية</option>
                          <option value="شيك بنكي">📝 شيك بنكي</option>
                        </select>
                      </div>
                    </div>

                    {/* Quick Service Suggestions */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400">تغيير سريع للخدمة:</span>
                      {[
                        'شحن رصيد المحفظة التعليمية',
                        'رسوم باقة حصص فردية (خاصة)',
                        'اشتراك حصص دراسية جماعية',
                        'رسوم مادة دراسية وتقوية',
                        'رسوم اختبارات ومراجعات دورية'
                      ].map(svc => (
                        <button
                          key={svc}
                          type="button"
                          onClick={() => updateLiveReceiptData({ serviceName: svc })}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/5 border border-white/10 text-slate-300 hover:bg-amber-400/20 hover:text-amber-300 hover:border-amber-400/40 transition-colors cursor-pointer"
                        >
                          {svc}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-300">أمين الصندوق / المستلم:</label>
                        <input
                          type="text"
                          value={currentReceiptData.cashierName || ''}
                          onChange={e => updateLiveReceiptData({ cashierName: e.target.value })}
                          placeholder="اسم أمين الصندوق أو المحاسب..."
                          className="w-full bg-slate-800 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-400 text-right"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-300">البيان والملاحظات:</label>
                        <input
                          type="text"
                          value={currentReceiptData.note || ''}
                          onChange={e => updateLiveReceiptData({ note: e.target.value })}
                          placeholder="البيان التوضيحي للسند..."
                          className="w-full bg-slate-800 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none focus:border-amber-400 text-right"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

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

      {/* Trial Booking & Placement Modal */}
      <AnimatePresence>
        {isTrialBookingModalOpen && trialBookingStudent && (
          <motion.div 
            key={`trial-booking-modal-${trialBookingStudent.id}`} 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto no-print" 
            dir="rtl"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden my-8 text-right"
            >
              {/* Close Button */}
              <button 
                type="button"
                onClick={() => {
                  setIsTrialBookingModalOpen(false);
                  setTrialBookingStudent(null);
                  setTrialBookingError('');
                  setTrialBookingSuccess('');
                  setJustBookedTrialWithTeacher(null);
                }}
                className="absolute top-8 left-8 p-2.5 text-slate-400 hover:text-slate-950 hover:bg-slate-50 rounded-full transition-all cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="p-8 md:p-10">
                <div className="flex items-center gap-3.5 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-md shrink-0">
                    <CalendarPlus size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight font-sans">حجز حصة تجريبية وتنسيب فوري 🧪</h3>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">جدولة لقاء تجريبي وتنسيب الطالب لمعلم مؤهل</p>
                  </div>
                </div>

                {/* Student Info Summary */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 mb-5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>اسم الطالب الكلي:</span>
                    <span className="font-black text-[#1A365D]">{trialBookingStudent.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>الصف الدراسي الحالي:</span>
                    <span className="font-black text-[#1A365D]">{trialBookingStudent.grade || 'غير محدد'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>رقم الهاتف المسجل:</span>
                    <span className="font-mono text-slate-900">{trialBookingStudent.phone || 'غير متوفر'}</span>
                  </div>
                </div>

                <form onSubmit={handleBookAndAssignTrial} className="space-y-4">
                  {/* Subject Selector */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-700">المادة التعليمية للحصة التجريبية <span className="text-rose-500">*</span></label>
                    <select
                      required
                      value={trialSubject}
                      onChange={e => {
                        const newSubject = e.target.value;
                        setTrialSubject(newSubject);
                        setTrialShowAllTeachersOverride(false);
                        if (trialTeacherId) {
                          const currentTeacher = teachers.find(t => t.id === trialTeacherId);
                          if (currentTeacher && !isTeacherTeachingSubject(currentTeacher, newSubject)) {
                            setTrialTeacherId('');
                          }
                        }
                      }}
                      className="w-full text-xs bg-white border border-slate-300 text-slate-900 px-3.5 py-3 rounded-xl focus:outline-none focus:border-[#0D365A] focus:ring-1 focus:ring-[#0D365A]/20 transition-all font-sans cursor-pointer"
                    >
                      <option value="الرياضيات">الرياضيات</option>
                      <option value="الفيزياء">الفيزياء</option>
                      <option value="الكيمياء">الكيمياء</option>
                      <option value="الأحياء">الأحياء</option>
                      <option value="اللغة الإنجليزية">اللغة الإنجليزية</option>
                      <option value="اللغة العربية">اللغة العربية</option>
                      <option value="اللغة العبرية">اللغة العبرية</option>
                      <option value="علوم الحاسوب والبرمجة">علوم الحاسوب والبرمجة</option>
                      <option value="التاريخ (بجروت)">التاريخ (بجروت)</option>
                      <option value="المدنيات">المدنيات</option>
                      <option value="العلوم العامة">العلوم العامة</option>
                      <option value="تأسيس عام وتقوية">تأسيس عام وتقوية</option>
                    </select>
                  </div>

                  {/* Topic / Focus Input */}
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-700">موضوع أو عنوان الحصة التجريبية (اختياري)</label>
                    <input
                      type="text"
                      placeholder="مثال: مراجعة هندسة تحليلية، أو تهيئة امتحان بجروت"
                      value={trialTopic}
                      onChange={e => setTrialTopic(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 text-slate-900 px-3.5 py-3 rounded-xl focus:outline-none focus:border-[#0D365A] focus:ring-1 focus:ring-[#0D365A]/20 transition-all font-sans"
                    />
                  </div>

                  {/* Teacher Selector for Placement - Filtered exclusively by trialSubject */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-black text-slate-700">
                        المعلم المرشح للتنسيب الفوري <span className="text-rose-500">*</span>
                      </label>
                      {trialSubject && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-900 border border-amber-300/80 shadow-2xs">
                          {trialShowAllTeachersOverride 
                            ? `عرض كافة المعلمين (${teachers.length})`
                            : `معلمو ${trialSubject} فقط (${filteredTrialTeachers.length})`}
                        </span>
                      )}
                    </div>
                    <select
                      required
                      value={trialTeacherId}
                      onChange={e => setTrialTeacherId(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 text-slate-900 px-3.5 py-3 rounded-xl focus:outline-none focus:border-[#0D365A] focus:ring-1 focus:ring-[#0D365A]/20 transition-all font-sans cursor-pointer"
                    >
                      <option value="">
                        {!trialSubject
                          ? '-- اختر المادة أولاً لحصر المعلمين المتخصصين --'
                          : filteredTrialTeachers.length === 0
                            ? `-- لا يوجد معلم مسجل لمادة (${trialSubject}) --`
                            : !trialShowAllTeachersOverride
                              ? `-- اختر من معلمي مادة ${trialSubject} (${filteredTrialTeachers.length} متاحين) --`
                              : `-- اختر المعلم لتنسيبه للطالب (${teachers.length} معلم) --`}
                      </option>
                      {filteredTrialTeachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} (التخصص: {t.specialization || (Array.isArray(t.subjects) ? t.subjects.join('، ') : 'عام')})
                        </option>
                      ))}
                    </select>

                    {/* Contextual filter helper info / override toggle */}
                    {trialSubject && (
                      <div className="pt-0.5">
                        {filteredTrialTeachers.length === 0 && !trialShowAllTeachersOverride ? (
                          <div className="text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center justify-between gap-2 text-[11px]">
                            <span>⚠️ لم يتم العثور على معلم مسجل بتخصص "{trialSubject}" حالياً.</span>
                            <button
                              type="button"
                              onClick={() => setTrialShowAllTeachersOverride(true)}
                              className="text-indigo-700 font-black underline hover:text-indigo-900 cursor-pointer shrink-0"
                            >
                              عرض جميع المعلمين
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 font-bold">
                              {!trialShowAllTeachersOverride
                                ? `🎯 تم فلترة القائمة لإظهار معلمي "${trialSubject}" فقط لضمان دقة التنسيب.`
                                : 'يتم الآن عرض جميع معلمي الأكاديمية.'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setTrialShowAllTeachersOverride(!trialShowAllTeachersOverride)}
                              className="text-indigo-600 hover:text-indigo-800 underline font-black cursor-pointer shrink-0 mr-1"
                            >
                              {trialShowAllTeachersOverride ? `حصر بمعلمي "${trialSubject}" فقط` : 'عرض جميع المعلمين'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <span className="text-[9px] text-slate-400 font-bold block mt-1">
                      💡 سيقوم النظام بربط هذا المعلم ببطاقة الطالب تلقائياً (تنسيب مباشر) مع حجز الحصة التجريبية.
                    </span>
                  </div>

                  {/* Errors and Success Messages */}
                  {trialBookingError && (
                    <div className="p-3.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-xl text-xs font-bold">
                      {trialBookingError}
                    </div>
                  )}

                  {trialBookingSuccess && (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs font-bold leading-relaxed space-y-3.5 text-right">
                      <div className="text-emerald-900 flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <span>{trialBookingSuccess}</span>
                      </div>

                      {justBookedTrialWithTeacher && (
                        <div className="bg-white border border-emerald-200 rounded-xl p-3.5 space-y-3">
                          <div className="text-[10px] text-slate-500 font-extrabold">مشاركة تفاصيل الحصة فوراً مع المعلم المنسّب 💬</div>
                          <div className="text-xs text-slate-800 font-black">👨‍🏫 {justBookedTrialWithTeacher.teacherName}</div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const text = `السلام عليكم ورحمة الله وبركاته، الأستاذ(ة) ${justBookedTrialWithTeacher.teacherName} 🌸\n` +
                                             `تم تنسيب حصة تجريبية جديدة لك من إدارة المنصة:\n\n` +
                                             `👤 اسم الطالب: ${justBookedTrialWithTeacher.studentName}\n` +
                                             `📚 الصف الدراسي: ${justBookedTrialWithTeacher.grade || 'غير محدد'}\n` +
                                             `📖 المادة: ${justBookedTrialWithTeacher.subject}\n` +
                                             `🎯 موضوع الدرس: ${justBookedTrialWithTeacher.topic || 'حصة تجريبية مخصصة'}\n` +
                                             `📞 هاتف الطالب: ${justBookedTrialWithTeacher.phone || 'غير مسجل'}\n\n` +
                                             `يرجى التنسيق والمتابعة مع الطالب، وتأكيد خوض الحصة بالمنظومة فور انتهائها. بالتوفيق! ✨`;
                                const cleanPhone = justBookedTrialWithTeacher.teacherPhone ? justBookedTrialWithTeacher.teacherPhone.replace(/[\s\-\+\(\)]/g, '') : '';
                                const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
                                window.open(waUrl, '_blank');
                              }}
                              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                            >
                              <span>واتساب المعلم 💬</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setIsTrialBookingModalOpen(false);
                                setTrialBookingStudent(null);
                                setTrialBookingError('');
                                setTrialBookingSuccess('');
                                setJustBookedTrialWithTeacher(null);
                              }}
                              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black transition-all cursor-pointer"
                            >
                              إغلاق النافذة
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isBookingTrial}
                      className="flex-1 py-3 bg-[#D4A33C] hover:bg-[#b88c30] text-slate-950 rounded-xl font-extrabold text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                    >
                      {isBookingTrial ? 'جاري الحجز والتنسيب...' : 'إتمام الحجز والتنسيب الفوري ✅'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsTrialBookingModalOpen(false);
                        setTrialBookingStudent(null);
                        setTrialBookingError('');
                        setTrialBookingSuccess('');
                        setJustBookedTrialWithTeacher(null);
                      }}
                      className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-extrabold text-xs transition-colors cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student Account Generated Modal */}
      <AnimatePresence>
        {createdStudentAccount && (
          <motion.div 
            key={`created-account-modal-${createdStudentAccount.studentName}`} 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto no-print" 
            dir="rtl"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden my-8 text-right font-sans"
            >
              {/* Close Button */}
              <button 
                type="button"
                onClick={() => setCreatedStudentAccount(null)}
                className="absolute top-8 left-8 p-2.5 text-slate-400 hover:text-slate-950 hover:bg-slate-50 rounded-full transition-all cursor-pointer"
              >
                <X size={18} />
              </button>

              <div className="p-8 md:p-10">
                <div className="flex items-center gap-3.5 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-md shrink-0">
                    <Key size={24} className="animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight">تم توليد حساب الطالب بنجاح! 🎉</h3>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">بيانات الدخول للنظام الخاصة بالطالب الجديد</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 mb-6 space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black text-slate-400">اسم الطالب:</span>
                    <span className="text-sm font-extrabold text-slate-800">{createdStudentAccount.studentName}</span>
                  </div>

                  <hr className="border-slate-100" />

                  <div className="flex flex-col gap-1.5 relative">
                    <span className="text-[10px] font-black text-slate-400">اسم المستخدم (Username):</span>
                    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-xs font-mono select-all">
                      <span>{createdStudentAccount.username}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(createdStudentAccount.username);
                          alert('تم نسخ اسم المستخدم!');
                        }}
                        className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                        title="نسخ"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 relative">
                    <span className="text-[10px] font-black text-slate-400">كلمة المرور المؤقتة (Password):</span>
                    <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-xs font-mono select-all">
                      <span className="font-bold tracking-widest">{createdStudentAccount.password}</span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(createdStudentAccount.password);
                          alert('تم نسخ كلمة المرور!');
                        }}
                        className="text-slate-400 hover:text-indigo-600 transition-colors p-1"
                        title="نسخ"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-amber-600 font-bold mb-6 text-center leading-relaxed">
                  ⚠️ يرجى نسخ ومشاركة بيانات الدخول مع الطالب أو ولي أمره فوراً لتسهيل الدخول للمنصة وأداء الاختبارات والواجبات.
                </p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const shareText = `أهلاً بك في الأكاديمية! 🎉\nتم تفعيل حسابك بنجاح.\n\nاسم الطالب: ${createdStudentAccount.studentName}\nاسم المستخدم: ${createdStudentAccount.username}\nكلمة المرور: ${createdStudentAccount.password}\n\nنتمنى لك رحلة تعليمية متميزة! ✨`;
                      navigator.clipboard.writeText(shareText);
                      alert('تم نسخ نص الترحيب والبيانات بالكامل لمشاركتها عبر الواتساب!');
                    }}
                    className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Copy size={14} />
                    <span>نسخ نص المشاركة بالكامل 📋</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatedStudentAccount(null)}
                    className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-extrabold text-xs transition-colors cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🧹 Duplicate Students Review & Merge Modal */}
      <AnimatePresence>
        {isDuplicateModalOpen && (
          <motion.div 
            key="duplicate-students-modal-overlay" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200"
              dir="rtl"
            >
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-black">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black">
                      فحص ودمج السجلات المكررة للطلاب 🧹
                    </h3>
                    <p className="text-xs text-amber-100 font-bold mt-0.5">
                      قاعدة النظام: عدم السماح بتكرار الاسم ورقم الهاتف المتطابق
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDuplicateModalOpen(false)}
                  className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Progress or Stats */}
              <div className="p-4 sm:p-6 bg-amber-50/70 border-b border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-amber-900">
                      الحالات المكتشفة: {duplicateGroups.length} طالب
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black border border-rose-200">
                      إجمالي السجلات الفائضة: {totalDuplicateRedundantCount} سجل
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-650 font-bold mt-1">
                    الدمج يقوم بنقل الحصص والمدفوعات والمعلمين إلى السجل المعتمد ثم حذف النسخ المكررة بأمان تام.
                  </p>
                </div>
                {duplicateGroups.length > 0 && (
                  <button
                    type="button"
                    disabled={isMergingDuplicates}
                    onClick={handleMergeAllDuplicates}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 active:scale-95 text-white font-black rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>دمج وحذف كافة المكررات دفعة واحدة ({totalDuplicateRedundantCount}) 🚀</span>
                  </button>
                )}
              </div>

              {duplicateMergeProgress && (
                <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 text-xs font-black text-blue-900 flex items-center gap-2 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span>{duplicateMergeProgress}</span>
                </div>
              )}

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {duplicateGroups.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="font-black text-slate-900 text-base">قاعدة بيانات الطلاب نظيفة تماماً!</h4>
                    <p className="text-xs text-slate-500 font-bold mt-1">
                      لا يوجد أي سجلات مكررة بنفس الاسم ورقم الهاتف في كامل النظام.
                    </p>
                  </div>
                ) : (
                  duplicateGroups.map((group, gIdx) => (
                    <div
                      key={`dup-group-${group.key}-${gIdx}`}
                      className="p-4 sm:p-5 bg-white rounded-2xl border-2 border-slate-200 hover:border-amber-400 transition-all shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                            #{gIdx + 1}
                          </span>
                          <div>
                            <h4 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                              <span>{group.primaryStudent.name}</span>
                              <span className="text-xs font-bold text-slate-500 font-mono" dir="ltr">
                                {group.cleanPhone ? `+972 ${group.cleanPhone}` : 'بدون هاتف'}
                              </span>
                            </h4>
                            <span className="text-[11px] text-amber-700 font-bold">
                              عدد السجلات المكتشفة: {group.allStudents.length} (١ رئيسي + {group.duplicateStudents.length} مكرر)
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={isMergingDuplicates}
                          onClick={() => handleMergeDuplicateGroup(group)}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-xl text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>دمج هذه المجموعة ({group.duplicateStudents.length}) ⚡</span>
                        </button>
                      </div>

                      {/* Records detail breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                        {/* Primary Record */}
                        <div className="p-3 bg-emerald-50/80 border-2 border-emerald-400 rounded-xl space-y-1">
                          <div className="flex items-center justify-between font-black text-emerald-900">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>السجل المعتمد (الرئيسي المحفوظ)</span>
                            </span>
                            <span className="font-mono text-[10px] bg-emerald-200/60 px-1.5 py-0.5 rounded text-emerald-950">
                              ID: {group.primaryStudent.id.slice(0, 8)}...
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-700 flex flex-wrap gap-x-3 gap-y-0.5">
                            <span>الصف: <strong>{group.primaryStudent.grade || 'غير محدد'}</strong></span>
                            <span>الرصيد: <strong>₪{group.primaryStudent.balance ?? 0}</strong></span>
                            <span>المعلمون: <strong>{(group.primaryStudent.teachers || []).length}</strong></span>
                            <span>التسجيل: <strong>{group.primaryStudent.registrationDate || 'غير محدد'}</strong></span>
                          </div>
                        </div>

                        {/* Duplicates to be removed */}
                        {group.duplicateStudents.map((dup, dIdx) => (
                          <div key={`dup-st-${dup.id}-${dIdx}`} className="p-3 bg-rose-50/70 border border-rose-300 rounded-xl space-y-1">
                            <div className="flex items-center justify-between font-black text-rose-900">
                              <span className="flex items-center gap-1">
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>نسخة مكررة #{dIdx + 1} (سيتم دمجها وحذفها)</span>
                              </span>
                              <span className="font-mono text-[10px] bg-rose-200/60 px-1.5 py-0.5 rounded text-rose-950">
                                ID: {dup.id.slice(0, 8)}...
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-700 flex flex-wrap gap-x-3 gap-y-0.5">
                              <span>الصف: <strong>{dup.grade || 'غير محدد'}</strong></span>
                              <span>الرصيد: <strong>₪{dup.balance ?? 0}</strong></span>
                              <span>المعلمون: <strong>{(dup.teachers || []).length}</strong></span>
                              <span>التسجيل: <strong>{dup.registrationDate || 'غير محدد'}</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-bold">
                  سيتم الحفاظ على السجل الرئيسي وتوحيد جميع بيانات الطالب بأمان.
                </span>
                <button
                  type="button"
                  onClick={() => setIsDuplicateModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black rounded-xl text-xs transition-colors cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastNotification && (
          <motion.div
            key={toastNotification.id}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 left-6 z-[100] max-w-md bg-slate-900/95 dark:bg-slate-800/95 text-white p-4 rounded-2xl shadow-2xl border border-slate-700/60 backdrop-blur-md flex items-start gap-3.5"
            dir="rtl"
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              toastNotification.type === 'success' 
                ? 'bg-emerald-500/20 text-emerald-400' 
                : toastNotification.type === 'error'
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-blue-500/20 text-blue-400'
            }`}>
              {toastNotification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : toastNotification.type === 'error' ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <Info className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-black text-white">{toastNotification.title}</h4>
              {toastNotification.message && (
                <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">{toastNotification.message}</p>
              )}
            </div>
            <button
              onClick={() => setToastNotification(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
