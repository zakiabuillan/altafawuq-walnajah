// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { Teacher, Student, Session, formatCustomDate, isTrialSession } from '../types';
import { Calendar, User, Users, BookOpen, Clock, CheckCircle2, AlertCircle, AlertTriangle, ArrowRight, Trash2, Pencil, Check, X, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, Filter, Copy, Search, Target, Award, FileText, Archive, Printer, Download, Phone, PhoneCall, Sparkles, MessageSquare, ShieldCheck, Lock, Crown, Tags } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { notifyTeacherOnSessionChange, notifyTeacherOnSessionCreate } from '../lib/notificationUtils';
import { logActivity } from '../lib/activityLogger';
import { getAcademicStage, calculateSessionPricing, getAcademicStageBadge, DEFAULT_STAGE_PRICING } from '../lib/sessionPricing';
import { normalizeArabicName } from '../lib/studentValidation';
import { FinancialCategory, DEFAULT_FINANCIAL_CATEGORIES } from '../types/financialCategories';

const stripTeacherTitles = (name: string = ''): string => {
  if (!name || typeof name !== 'string') return '';
  return name
    .replace(/\(.*?\)/g, '')
    .replace(/^(أ\.?|أستاذ|أستاذة|المعلم|المعلمة|د\.?|دكتور|دكتورة)\s+/i, '')
    .trim();
};

const getLocalDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

const parseTimeToMinutes = (timeStr?: string): number => {
  if (!timeStr) return 16 * 60; // 16:00 default = 960 minutes
  const parts = timeStr.split(':').map(Number);
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  return 16 * 60;
};

const formatMinutesToTime = (totalMinutes: number): string => {
  const norm = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

interface SessionLoggerProps {
  isManager?: boolean;
}

export default function SessionLogger({ isManager }: SessionLoggerProps = {}) {
  // Check if user has manager privileges (via prop or stored role)
  const isManagerUser = isManager !== undefined
    ? isManager
    : (typeof window !== 'undefined'
        ? (localStorage.getItem('academy_user_role') === 'manager' || (!localStorage.getItem('academy_logged_in_teacher') && localStorage.getItem('academy_user_role') !== 'teacher'))
        : true);

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  const sortedStudents = useMemo(() => {
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

    return [...students].sort((a, b) => {
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
  }, [students, sessions]);
  const [credits, setCredits] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isGroupSession, setIsGroupSession] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [studentId, setStudentId] = useState('');

  // Computed assigned students for currently selected teacher
  const assignedStudentsForSelectedTeacher = useMemo(() => {
    if (!teacherId) return [];
    const selectedTeacher = teachers.find(t => t.id === teacherId);
    const teacherName = selectedTeacher?.name || '';
    const teacherNorm = normalizeArabicName(stripTeacherTitles(teacherName));

    return sortedStudents.filter(s => {
      if (s.archived) return false;

      // 1. Direct teachers array
      const direct = Array.isArray(s.teachers)
        ? s.teachers.map(t => (typeof t === 'string' ? t.trim() : (t as any)?.id || (t as any)?.name || ''))
        : [];
      if (direct.some(t => t === teacherId || (teacherName && t === teacherName) || (teacherNorm && normalizeArabicName(stripTeacherTitles(t)) === teacherNorm))) return true;

      // 2. Custom rates map
      if (s.customRates && typeof s.customRates === 'object') {
        const rateKeys = Object.keys(s.customRates);
        if (rateKeys.some(k => k === teacherId || (teacherName && k === teacherName) || (teacherNorm && normalizeArabicName(stripTeacherTitles(k)) === teacherNorm))) return true;
      }

      // 3. Direct properties on student document
      const sTid = s.teacherId || (s as any).assignedTeacherId;
      if (sTid === teacherId) return true;
      const sTName = (s as any).teacherName || (s as any).teacher;
      if (sTName && (sTName === teacherName || (teacherNorm && normalizeArabicName(stripTeacherTitles(sTName)) === teacherNorm))) return true;

      // 4. Assignments collection
      if (assignments.some(a => a.studentId === s.id && (a.teacherId === teacherId || (teacherName && a.teacherName === teacherName)))) return true;

      // 5. Sessions history
      if (sessions.some(sess => sess.studentId === s.id && (sess.teacherId === teacherId || (teacherName && sess.teacherName === teacherName)))) return true;

      return false;
    });
  }, [teacherId, sortedStudents, teachers, assignments, sessions]);

  const otherStudentsForSelectedTeacher = useMemo(() => {
    const assignedIds = new Set(assignedStudentsForSelectedTeacher.map(s => s.id));
    return sortedStudents.filter(s => !assignedIds.has(s.id));
  }, [sortedStudents, assignedStudentsForSelectedTeacher]);
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(1);
  const [pricingUnit, setPricingUnit] = useState<'hourly' | 'session_40'>('hourly');
  const [sessionCount, setSessionCount] = useState<number>(1);
  const [date, setDate] = useState(getLocalDateString());
  const [startTime, setStartTime] = useState<string>('16:00');
  const [bypassTimeConflict, setBypassTimeConflict] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [editTargetInput, setEditTargetInput] = useState('');
  const [isSavingTarget, setIsSavingTarget] = useState(false);

  useEffect(() => {
    if (studentId) {
      const student = students.find(s => s.id === studentId);
      setEditTargetInput(student?.targetSessions ? String(student.targetSessions) : '10');
    } else {
      setEditTargetInput('');
    }
  }, [studentId, students]);

  const handleSaveStudentTarget = async () => {
    if (!studentId) return;
    const targetVal = parseInt(editTargetInput, 10);
    if (isNaN(targetVal) || targetVal <= 0) {
      alert('الرجاء إدخال عدد جلسات صحيح أكبر من الصفر.');
      return;
    }
    setIsSavingTarget(true);
    try {
      const studentRef = doc(db, 'students', studentId);
      await updateDoc(studentRef, {
        targetSessions: targetVal
      });
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, targetSessions: targetVal } : s));
    } catch (e) {
      console.error("Error updating student target sessions:", e);
      handleFirestoreError(e, OperationType.UPDATE, `students/${studentId}`);
    } finally {
      setIsSavingTarget(false);
    }
  };

  const [globalSettings, setGlobalSettings] = useState({
    defaultHourlyRate: 60,
    defaultStudentHourlyRate: 60,
    defaultTeacherHourlyRate: 35,
    sessionPricingSystemEnabled: true,
    defaultPricingProgram: 'hourly',
    programSelectionManagerOnly: true,
    middleSchoolStudentSessionRate: 40,
    middleSchoolTeacherSessionRate: 25,
    secondarySchoolStudentSessionRate: 50,
    secondarySchoolTeacherSessionRate: 35,
    sessionDurationMinutes: 40,
    financialRules: [],
    financialCategories: DEFAULT_FINANCIAL_CATEGORIES,
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGlobalSettings({
          defaultHourlyRate: data.defaultHourlyRate ?? 60,
          defaultStudentHourlyRate: data.defaultStudentHourlyRate ?? data.defaultHourlyRate ?? 60,
          defaultTeacherHourlyRate: data.defaultTeacherHourlyRate ?? 35,
          sessionPricingSystemEnabled: data.sessionPricingSystemEnabled !== false,
          defaultPricingProgram: data.defaultPricingProgram || 'hourly',
          programSelectionManagerOnly: data.programSelectionManagerOnly !== false,
          middleSchoolStudentSessionRate: data.middleSchoolStudentSessionRate ?? 40,
          middleSchoolTeacherSessionRate: data.middleSchoolTeacherSessionRate ?? 25,
          secondarySchoolStudentSessionRate: data.secondarySchoolStudentSessionRate ?? 50,
          secondarySchoolTeacherSessionRate: data.secondarySchoolTeacherSessionRate ?? 35,
          sessionDurationMinutes: data.sessionDurationMinutes ?? 40,
          financialRules: data.financialRules || [],
          financialCategories: (data.financialCategories && Array.isArray(data.financialCategories) && data.financialCategories.length > 0)
            ? data.financialCategories
            : DEFAULT_FINANCIAL_CATEGORIES,
        });
        if (data.defaultPricingProgram) {
          setPricingUnit(data.defaultPricingProgram);
        }
      }
    });
    return () => unsub();
  }, []);

  const [customFee, setCustomFee] = useState<string>('');
  const [selectedFinancialCategory, setSelectedFinancialCategory] = useState<string>('');

  // Warning bypass state
  const [bypassWarning, setBypassWarning] = useState(false);

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editDurationValue, setEditDurationValue] = useState<number>(1);
  const [editDateValue, setEditDateValue] = useState<string>('');
  const [editSubjectValue, setEditSubjectValue] = useState<string>('');
  const [editTopicValue, setEditTopicValue] = useState<string>('');
  const [editCustomFeeValue, setEditCustomFeeValue] = useState<string>('');

  // States for the popup edit modal
  const [modalEditSession, setModalEditSession] = useState<Session | null>(null);
  const [modalEditDuration, setModalEditDuration] = useState<number>(1);
  const [modalEditPricingUnit, setModalEditPricingUnit] = useState<'hourly' | 'session_40'>('hourly');
  const [modalEditSessionCount, setModalEditSessionCount] = useState<number>(1);
  const [modalEditDate, setModalEditDate] = useState<string>('');
  const [modalEditStartTime, setModalEditStartTime] = useState<string>('16:00');
  const [modalEditSubject, setModalEditSubject] = useState<string>('');
  const [modalEditTopic, setModalEditTopic] = useState<string>('');
  const [modalEditCustomFee, setModalEditCustomFee] = useState<string>('');
  const [modalEditFinancialCategory, setModalEditFinancialCategory] = useState<string>('');
  const [isSubmittingModalEdit, setIsSubmittingModalEdit] = useState<boolean>(false);

  const handleSaveModalEditSession = async () => {
    if (!modalEditSession) return;
    if (!isManagerUser) {
      alert("عذراً، تعديل الحصص محصور بمدير المنصة فقط.");
      return;
    }
    setIsSubmittingModalEdit(true);
    try {
      const { deleteField } = await import('firebase/firestore');
      const sessionRef = doc(db, 'sessions', modalEditSession.id);
      const updateData: any = {
        durationHours: Number(modalEditDuration),
        date: modalEditDate,
        startTime: modalEditStartTime || '16:00',
        time: modalEditStartTime || '16:00',
        subject: modalEditSubject || 'عام',
        topic: modalEditTopic || '',
        pricingUnit: modalEditPricingUnit,
        sessionDurationMinutes: modalEditPricingUnit === 'session_40' ? 40 : 60,
        ...(modalEditPricingUnit === 'session_40' ? { sessionCount: Number(modalEditSessionCount) || 1 } : {}),
        financialCategory: modalEditFinancialCategory || deleteField()
      };
      
      if (modalEditCustomFee !== '') {
        updateData.customFee = Number(modalEditCustomFee);
      } else {
        updateData.customFee = deleteField();
      }

      await updateDoc(sessionRef, updateData);
      
      try {
        await notifyTeacherOnSessionChange(modalEditSession.id, modalEditSession, updateData);
      } catch (notifyErr) {
        console.error("Error creating notification on modal edit:", notifyErr);
      }

      await fetchData();
      setModalEditSession(null);
    } catch (error) {
      console.error("Error updating session via modal:", error);
      handleFirestoreError(error, OperationType.WRITE, `sessions/${modalEditSession.id}`);
    } finally {
      setIsSubmittingModalEdit(false);
    }
  };

  const [approvingSessionId, setApprovingSessionId] = useState<string | null>(null);

  // Reset bypass toggle when inputs change to make sure they actively override if anything changes
  useEffect(() => {
    setBypassWarning(false);
    setBypassTimeConflict(false);
  }, [studentId, teacherId, duration, customFee, date, startTime, sessionCount, pricingUnit]);

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string } | null>(null);
  const [activeArchiveTab, setActiveArchiveTab] = useState<'active' | 'archived'>('active');
  const [duplicateConfirm, setDuplicateConfirm] = useState<Session | null>(null);
  const [duplicateDate, setDuplicateDate] = useState<string>('');

  const handleApproveSession = async (id: string) => {
    setApprovingSessionId(id);
    try {
      const sessionRef = doc(db, 'sessions', id);
      await updateDoc(sessionRef, {
        approved: true,
        status: 'completed'
      });
      await fetchData();
    } catch (error) {
      console.error("Error approving session:", error);
    } finally {
      setApprovingSessionId(null);
    }
  };

  // Overdue sessions manager states & handlers
  const [editingOverdueSessionId, setEditingOverdueSessionId] = useState<string | null>(null);
  const [overdueEditSubject, setOverdueEditSubject] = useState<string>('');
  const [overdueEditDuration, setOverdueEditDuration] = useState<number>(1);
  const [overdueEditDate, setOverdueEditDate] = useState<string>('');
  const [overdueEditStartTime, setOverdueEditStartTime] = useState<string>('16:00');
  const [isConfirmingOverdueSession, setIsConfirmingOverdueSession] = useState<string | null>(null);

  const handleConfirmOverdueSessionConduct = async (id: string) => {
    setIsConfirmingOverdueSession(id);
    try {
      const sessionRef = doc(db, 'sessions', id);
      await updateDoc(sessionRef, {
        teacherConfirmed: true,
        approved: true,
        status: 'completed'
      });
      await fetchData();
    } catch (err) {
      console.error("Error confirming overdue session:", err);
    } finally {
      setIsConfirmingOverdueSession(null);
    }
  };

  const handleSaveAndConfirmOverdueSessionConduct = async (id: string) => {
    setIsConfirmingOverdueSession(id);
    try {
      const sessionRef = doc(db, 'sessions', id);
      await updateDoc(sessionRef, {
        durationHours: Number(overdueEditDuration),
        subject: overdueEditSubject,
        date: overdueEditDate,
        startTime: overdueEditStartTime,
        teacherConfirmed: true,
        approved: true,
        status: 'completed'
      });
      setEditingOverdueSessionId(null);
      await fetchData();
    } catch (err) {
      console.error("Error updating and confirming overdue session:", err);
    } finally {
      setIsConfirmingOverdueSession(null);
    }
  };

  // State variables for robust print and PDF preview
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printPreviewHtml, setPrintPreviewHtml] = useState('');
  const [printPreviewTitle, setPrintPreviewTitle] = useState('');

  // Advanced filters state
  const [filterStudentId, setFilterStudentId] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTeacherId, setFilterTeacherId] = useState('');
  const [studentInputSearch, setStudentInputSearch] = useState('');
  const [teacherInputSearch, setTeacherInputSearch] = useState('');
  const [subjectInputSearch, setSubjectInputSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [filterApprovalStatus, setFilterApprovalStatus] = useState<'all' | 'approved' | 'pending'>('all');
  const [searchText, setSearchText] = useState('');
  const [teacherSearchText, setTeacherSearchText] = useState('');
  const [subjectSearchText, setSubjectSearchText] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });
  const [endDate, setEndDate] = useState(getLocalDateString());
  const [quickDate, setQuickDate] = useState('thisMonth'); // 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'last7' | 'thisMonth' | 'lastMonth' | 'specificDay' | 'custom' | 'all' | 'weekNav'
  const [selectedSingleDate, setSelectedSingleDate] = useState<string>(getLocalDateString());
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Advanced sorting state
  const [sortBy, setSortBy] = useState<'date' | 'teacher' | 'student' | 'hours' | 'cost' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Arabic Date & Period Helpers
  const formatArabicDateLong = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      return `${days[dt.getDay()]}، ${d} ${months[m - 1]} ${y}`;
    } catch {
      return dateStr;
    }
  };

  const formatArabicShortDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      return `${days[dt.getDay()]} ${d}/${m}/${y}`;
    } catch {
      return dateStr;
    }
  };

  // Calculate Saturday-to-Friday week range for a given base date and week offset
  const getWeekRange = (offsetWeeks = 0, baseDate = new Date()) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + (offsetWeeks * 7));
    const day = d.getDay(); // 0 is Sun, 6 is Sat
    const diffToSat = (day + 1) % 7;
    const sat = new Date(d);
    sat.setDate(d.getDate() - diffToSat);
    
    const fri = new Date(sat);
    fri.setDate(sat.getDate() + 6);

    const fmt = (dt: Date) => {
      const year = dt.getFullYear();
      const month = String(dt.getMonth() + 1).padStart(2, '0');
      const dayStr = String(dt.getDate()).padStart(2, '0');
      return `${year}-${month}-${dayStr}`;
    };

    return {
      start: fmt(sat),
      end: fmt(fri),
      satDate: sat,
      friDate: fri
    };
  };

  // Handle quick date selection
  const handleQuickDateChange = (type: string) => {
    setQuickDate(type);
    const todayStr = getLocalDateString();

    if (!type || type === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }

    if (type === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
      setSelectedSingleDate(todayStr);
    } else if (type === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yYear = yesterday.getFullYear();
      const yMonth = String(yesterday.getMonth() + 1).padStart(2, '0');
      const yDay = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayStr = `${yYear}-${yMonth}-${yDay}`;
      setStartDate(yesterdayStr);
      setEndDate(yesterdayStr);
      setSelectedSingleDate(yesterdayStr);
    } else if (type === 'specificDay') {
      const targetDate = selectedSingleDate || todayStr;
      setStartDate(targetDate);
      setEndDate(targetDate);
    } else if (type === 'thisWeek') {
      setWeekOffset(0);
      const range = getWeekRange(0);
      setStartDate(range.start);
      setEndDate(range.end);
    } else if (type === 'lastWeek') {
      setWeekOffset(-1);
      const range = getWeekRange(-1);
      setStartDate(range.start);
      setEndDate(range.end);
    } else if (type === 'last7') {
      const last7 = new Date();
      last7.setDate(last7.getDate() - 7);
      const lYear = last7.getFullYear();
      const lMonth = String(last7.getMonth() + 1).padStart(2, '0');
      const lDay = String(last7.getDate()).padStart(2, '0');
      const last7Str = `${lYear}-${lMonth}-${lDay}`;
      setStartDate(last7Str);
      setEndDate(todayStr);
    } else if (type === 'thisMonth') {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const fYear = firstDay.getFullYear();
      const fMonth = String(firstDay.getMonth() + 1).padStart(2, '0');
      const fDay = String(firstDay.getDate()).padStart(2, '0');
      
      const laYear = lastDay.getFullYear();
      const laMonth = String(lastDay.getMonth() + 1).padStart(2, '0');
      const laDay = String(lastDay.getDate()).padStart(2, '0');

      setStartDate(`${fYear}-${fMonth}-${fDay}`);
      setEndDate(`${laYear}-${laMonth}-${laDay}`);
    } else if (type === 'lastMonth') {
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
      
      const fYear = firstDay.getFullYear();
      const fMonth = String(firstDay.getMonth() + 1).padStart(2, '0');
      const fDay = String(firstDay.getDate()).padStart(2, '0');
      
      const laYear = lastDay.getFullYear();
      const laMonth = String(lastDay.getMonth() + 1).padStart(2, '0');
      const laDay = String(lastDay.getDate()).padStart(2, '0');

      setStartDate(`${fYear}-${fMonth}-${fDay}`);
      setEndDate(`${laYear}-${laMonth}-${laDay}`);
    }
  };

  // Stepping single date by +1 or -1 days
  const handleStepDay = (daysDelta: number) => {
    const base = selectedSingleDate ? new Date(selectedSingleDate) : new Date();
    base.setDate(base.getDate() + daysDelta);
    const year = base.getFullYear();
    const month = String(base.getMonth() + 1).padStart(2, '0');
    const day = String(base.getDate()).padStart(2, '0');
    const newDateStr = `${year}-${month}-${day}`;
    setSelectedSingleDate(newDateStr);
    setStartDate(newDateStr);
    setEndDate(newDateStr);
    setQuickDate('specificDay');
  };

  // Stepping week by +1 or -1 weeks
  const handleStepWeek = (weeksDelta: number) => {
    const newOffset = weekOffset + weeksDelta;
    setWeekOffset(newOffset);
    const range = getWeekRange(newOffset);
    setStartDate(range.start);
    setEndDate(range.end);
    if (newOffset === 0) {
      setQuickDate('thisWeek');
    } else if (newOffset === -1) {
      setQuickDate('lastWeek');
    } else {
      setQuickDate('weekNav');
    }
  };

  const handleClearFilters = () => {
    setFilterStudentId('');
    setFilterSubject('');
    setFilterTeacherId('');
    setFilterApprovalStatus('all');
    setSearchText('');
    setTeacherSearchText('');
    setSubjectSearchText('');
    setStartDate('');
    setEndDate('');
    setQuickDate('');
    setWeekOffset(0);
    setSortBy('date');
    setSortOrder('desc');
  };

  const handleExportMonthlyPDF = () => {
    const d = new Date();
    const currentYear = d.getFullYear();
    const currentMonth = d.getMonth(); // 0-indexed
    
    const monthsArabic = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    const currentMonthName = monthsArabic[currentMonth];
    const docTitle = `تقرير الحصص الشهري المجمع - ${currentMonthName} ${currentYear}`;
    const exportDateStr = new Date().toLocaleString('ar-EG', { timeZone: 'Asia/Gaza' }) || getLocalDateString();

    // Filter sessions belonging to the current month
    const currentMonthSessions = sessions.filter(s => {
      if (!s.date) return false;
      const parts = s.date.split('-');
      if (parts.length >= 2) {
        const pYear = parseInt(parts[0], 10);
        const pMonth = parseInt(parts[1], 10);
        return pYear === currentYear && pMonth === (currentMonth + 1);
      }
      const sessDate = new Date(s.date);
      return sessDate.getFullYear() === currentYear && sessDate.getMonth() === currentMonth;
    });

    if (currentMonthSessions.length === 0) {
      alert(`لا توجد حصص مسجلة لشهر ${currentMonthName} ${currentYear} حتى الآن.`);
      return;
    }

    // Group currentMonthSessions by teacherId
    const sessionsByTeacher: Record<string, Session[]> = {};
    currentMonthSessions.forEach(s => {
      if (!sessionsByTeacher[s.teacherId]) {
        sessionsByTeacher[s.teacherId] = [];
      }
      sessionsByTeacher[s.teacherId].push(s);
    });

    // Calculate overall stats
    const totalSessionsCount = currentMonthSessions.length;
    const totalHoursCount = currentMonthSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
    
    // Calculate total costs
    const calculateSessionCost = (session: Session) => {
      const student = students.find(s => s.id === session.studentId);
      const teacher = teachers.find(t => t.id === session.teacherId);
      return session.customFee !== undefined ? session.customFee : ((session.durationHours || 0) * (student?.customRates?.[session.teacherId] !== undefined ? student.customRates[session.teacherId] : (student?.hourlyRate ? student.hourlyRate : (teacher?.billingRate || teacher?.hourlyRate || 0))));
    };

    const totalCostCount = currentMonthSessions.reduce((sum, s) => sum + calculateSessionCost(s), 0);
    const activeTeachersCount = Object.keys(sessionsByTeacher).length;

    // Render HTML for each teacher
    const teachersSectionHtml = Object.keys(sessionsByTeacher).map(teacherId => {
      const teacher = teachers.find(t => t.id === teacherId);
      const teacherName = teacher?.name || "معلم غير معروف";
      const teacherSpecialty = teacher?.subject || "تخصص غير محدد";
      const teacherSessions = sessionsByTeacher[teacherId];

      const sortedTeacherSessions = [...teacherSessions].sort((a, b) => {
        return (a.date || '').localeCompare(b.date || '');
      });

      const teacherTotalHours = sortedTeacherSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
      const teacherTotalCost = sortedTeacherSessions.reduce((sum, s) => sum + calculateSessionCost(s), 0);

      const rowsHtml = sortedTeacherSessions.map((session, idx) => {
        const student = students.find(s => s.id === session.studentId);
        const cost = calculateSessionCost(session);

        return `
          <tr>
            <td style="text-align: center; font-weight: bold; width: 40px;">${idx + 1}</td>
            <td>
              <div style="font-weight: 800; color: #1e293b;">${student?.name || 'طالب غير معروف'}</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${student?.grade || ''}</div>
            </td>
            <td>
              <div style="font-weight: 800; color: #1A365D;">${session.subject}</div>
              ${session.topic ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px;">العنوان: ${session.topic}</div>` : ''}
            </td>
            <td style="text-align: center; font-weight: 800;">${session.durationHours} س</td>
            <td style="text-align: center; font-weight: 800; color: #0f766e;">₪${cost}</td>
            <td style="text-align: center; font-size: 11px;">${session.date || ''}</td>
            <td style="text-align: center;">
              ${session.approved !== false
                ? '<span class="badge approved-badge">✅ معتمدة</span>'
                : '<span class="badge pending-badge">⏳ معلقة</span>'
              }
            </td>
          </tr>
        `;
      }).join('');

      return `
        <div class="teacher-block" style="page-break-inside: avoid; margin-bottom: 40px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background-color: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1a365d; padding-bottom: 10px; margin-bottom: 15px;">
            <div>
              <h3 style="margin: 0; font-size: 15px; font-weight: 900; color: #1a365d;">👨‍🏫 المعلم: ${teacherName}</h3>
              <span style="font-size: 10px; color: #d4a33c; font-weight: bold;">المادة / التخصص: ${teacherSpecialty}</span>
            </div>
            <div style="text-align: left;">
              <span style="font-size: 11px; font-weight: 800; background-color: #f1f5f9; padding: 4px 10px; border-radius: 8px; color: #475569;">
                عدد الحصص: ${teacherSessions.length} حركة
              </span>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
            <thead>
              <tr>
                <th style="width: 40px; text-align: center; background-color: #1a365d; color: white; border: 1px solid #1e3a8a; padding: 8px; font-size: 11px;">M</th>
                <th style="background-color: #1a365d; color: white; border: 1px solid #1e3a8a; padding: 8px; font-size: 11px;">الطالب والمرحلة</th>
                <th style="background-color: #1a365d; color: white; border: 1px solid #1e3a8a; padding: 8px; font-size: 11px;">المادة والموضوع</th>
                <th style="text-align: center; width: 80px; background-color: #1a365d; color: white; border: 1px solid #1e3a8a; padding: 8px; font-size: 11px;">المدة</th>
                <th style="text-align: center; width: 90px; background-color: #1a365d; color: white; border: 1px solid #1e3a8a; padding: 8px; font-size: 11px;">التكلفة</th>
                <th style="text-align: center; width: 100px; background-color: #1a365d; color: white; border: 1px solid #1e3a8a; padding: 8px; font-size: 11px;">التاريخ</th>
                <th style="text-align: center; width: 110px; background-color: #1a365d; color: white; border: 1px solid #1e3a8a; padding: 8px; font-size: 11px;">الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr style="background-color: #f8fafc; font-weight: bold; border-top: 2px solid #cbd5e1;">
                <td colspan="3" style="text-align: right; padding: 10px; color: #1a365d; font-weight: 900; font-size: 11px;">إجمالي ملخص المعلم:</td>
                <td style="text-align: center; padding: 10px; font-size: 11.5px; font-weight: 900; color: #1a365d;">${teacherTotalHours.toFixed(1)} س</td>
                <td style="text-align: center; padding: 10px; font-size: 11.5px; font-weight: 900; color: #0f766e;">₪${teacherTotalCost.toLocaleString()}</td>
                <td colspan="2"></td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    // Logo SVG
    const logoSvg = `
      <svg width="60" height="60" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M125 45 C125 52 128 55 135 55 C128 55 125 58 125 65 C125 58 122 55 115 55 C122 55 125 52 125 45 Z" fill="#D4A33C" />
        <path d="M142 68 C142 71 143 72 146 72 C143 72 142 73 142 76 C142 73 141 72 138 72 C141 72 142 71 142 68 Z" fill="#38BDF8" />
        <path d="M82 62 C82 64 83 65 85 65 C83 65 82 66 82 68 C82 66 81 65 79 65 C81 65 82 64 82 62 Z" fill="#38BDF8" />
        <path d="M109 42 C109 44 110 45 112 45 C110 45 109 46 109 48 C109 46 108 45 106 45 C108 45 109 44 109 42 Z" fill="#38BDF8" />
        <path d="M100 132 C75 120 42 124 24 138 C18 142 21 148 28 148 C44 148 76 142 100 148 Z" fill="#1A365D" />
        <path d="M100 132 C125 120 158 124 176 138 C182 142 179 148 172 148 C156 148 124 142 100 148 Z" fill="#1A365D" />
        <path d="M26 144 C42 134 74 128 100 135 C126 128 158 134 174 144 L170 148 C154 138 124 133 100 141 C76 133 46 138 30 148 Z" fill="#D4A33C" />
        <path d="M100 125 C75 112 45 116 28 128 C23 131 24 136 30 136 C46 136 76 131 100 137 Z" fill="#0284C7" />
        <path d="M100 125 C125 112 155 116 172 128 C177 131 176 136 170 136 C154 136 124 131 100 137 Z" fill="#0284C7" />
        <circle cx="100" cy="98" r="8" fill="#D4A33C" />
        <path d="M100 132 C90 128 86 114 78 103 C72 95 81 92 84 96 C90 102 96 112 100 116 C104 112 110 102 116 96 C119 92 128 95 122 103 C114 114 110 128 100 132 Z" fill="#D4A33C" />
        <path d="M109 104 C112 100 119 88 125 80 C128 76 133 78 130 83 C122 93 115 104 111 107 Z" fill="#D4A33C" />
        <path d="M100 84 L114 78 L100 72 L86 78 Z" fill="#0D365A" />
        <path d="M93 79.5 Q100 83.5 107 79.5 Q100 85 93 79.5 Z" fill="#F59E0B" />
      </svg>
    `;

    const printHtml = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>${docTitle}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
          
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 30px;
            direction: rtl;
            -webkit-print-color-adjust: exact;
          }
          
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3.5px double #d4a33c;
            padding-bottom: 18px;
            margin-bottom: 25px;
          }
          
          .school-info {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          
          .school-titles {
            display: flex;
            flex-direction: column;
          }
          
          .school-title-main {
            font-size: 19px;
            font-weight: 900;
            color: #1a365d;
            margin: 0;
            line-height: 1.2;
          }
          
          .school-title-sub {
            font-size: 10px;
            font-weight: 700;
            color: #d4a33c;
            margin: 2px 0 0 0;
            letter-spacing: 0.5px;
          }
          
          .document-meta-title {
            text-align: left;
          }
          
          .doc-type-badge {
            background-color: #1a365d;
            color: #ffffff;
            padding: 6px 14px;
            font-weight: 900;
            font-size: 11px;
            border-radius: 8px;
            display: inline-block;
            margin-bottom: 5px;
          }
          
          .date-stamp {
            font-size: 9.5px;
            color: #64748b;
            font-weight: 700;
          }

          .report-summary-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 25px;
          }
          
          .report-title {
            font-size: 13px;
            font-weight: 900;
            color: #1a365d;
            margin-top: 0;
            margin-bottom: 12px;
            border-bottom: 1px dashed #cbd5e1;
            padding-bottom: 6px;
          }

          .stats-grid {
            display: grid;
            grid-template-cols: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 25px;
          }
          
          .stat-card {
            background-color: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 12px;
            text-align: center;
          }
          
          .stat-card.primary {
            border-top: 4px solid #1a365d;
          }
          
          .stat-card.accent {
            border-top: 4px solid #d4a33c;
          }
          
          .stat-card.indicator {
            border-top: 4px solid #0f766e;
          }
          
          .stat-card.info {
            border-top: 4px solid #0284c7;
          }
          
          .stat-label {
            font-size: 9.5px;
            font-weight: 800;
            color: #64748b;
          }
          
          .stat-value {
            font-size: 18px;
            font-weight: 900;
            color: #1a365d;
            margin-top: 4px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          th {
            background-color: #1a365d;
            color: #ffffff;
            font-weight: 800;
            font-size: 11px;
            padding: 10px;
            border: 1px solid #1e3a8a;
            text-align: right;
          }
          
          td {
            padding: 10px;
            font-size: 11px;
            border: 1px solid #cbd5e1;
            vertical-align: middle;
          }
          
          tr:nth-child(even) {
            background-color: #f8fafc;
          }

          .badge {
            font-size: 8.5px;
            font-weight: 800;
            padding: 4px 8px;
            border-radius: 6px;
            display: inline-block;
            white-space: nowrap;
          }
          
          .approved-badge {
            background-color: #d1fae5;
            color: #065f46;
          }
          
          .pending-badge {
            background-color: #fef3c7;
            color: #92400e;
          }

          .footer-signature-container {
            margin-top: 45px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            page-break-inside: avoid;
          }
          
          .signature-box {
            width: 230px;
            text-align: center;
          }
          
          .signature-title {
            font-weight: 800;
            font-size: 11.5px;
            color: #1a365d;
            margin-bottom: 40px;
          }
          
          .signature-line {
            border-bottom: 1.5px dashed #64748b;
            margin-bottom: 5px;
          }
          
          .stamp-box {
            width: 100px;
            height: 100px;
            border: 2px dashed #cbd5e1;
            border-radius: 50%;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #cbd5e1;
            font-size: 9.5px;
            font-weight: bold;
          }
          
          .stamp-title-box {
            font-weight: 800;
            font-size: 11.5px;
            color: #1a365d;
            margin-bottom: 15px;
          }

          .document-official-seal {
            font-size: 8.5px;
            color: #94a3b8;
            text-align: center;
            margin-top: 35px;
            border-top: 1px solid #f1f5f9;
            padding-top: 12px;
            font-weight: bold;
          }

          @media print {
            body {
              padding: 0;
              margin: 0;
            }
            .teacher-block {
              page-break-inside: avoid !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="school-info">
            ${logoSvg}
            <div class="school-titles">
              <h1 class="school-title-main">أكاديمية المعلم المعتمد</h1>
              <p class="school-title-sub">CERTIFIED TEACHER ACADEMY</p>
            </div>
          </div>
          <div class="document-meta-title">
            <span class="doc-type-badge">التقرير المجمع للحصص الفردية</span>
            <div class="date-stamp">تاريخ الطباعة والاستخراج: ${exportDateStr}</div>
          </div>
        </div>

        <div class="report-summary-card">
          <h4 class="report-title">تقرير النشاط التعليمي والمالي لشهر ${currentMonthName} ${currentYear} 📅</h4>
          <div style="font-size: 11px; font-weight: bold; color: #475569; margin-bottom: 15px; line-height: 1.6;">
            يحتوي هذا المستند المجمع على تفاصيل وبيانات كافة الحصص الفردية المسجلة لكل معلم على حدة خلال الشهر الحالي للتدقيق والتسوية المالية للمستحقات والأجور.
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card primary">
            <span class="stat-label">المعلمون النشطون هذا الشهر</span>
            <div class="stat-value">${activeTeachersCount} معلم</div>
          </div>
          <div class="stat-card accent">
            <span class="stat-label">إجمالي الساعات المسجلة</span>
            <div class="stat-value">${totalHoursCount.toFixed(1)} س</div>
          </div>
          <div class="stat-card indicator">
            <span class="stat-label">إجمالي التكلفة والقيمة المالية</span>
            <div class="stat-value">₪${totalCostCount.toLocaleString()}</div>
          </div>
          <div class="stat-card info">
            <span class="stat-label">عدد الحركات الإجمالي</span>
            <div class="stat-value">${totalSessionsCount} حركة</div>
          </div>
        </div>

        <div class="teachers-sessions-list">
          ${teachersSectionHtml}
        </div>

        <div class="footer-signature-container">
          <div class="signature-box">
            <div class="signature-title">الشؤون الإدارية والمالية</div>
            <div class="signature-line"></div>
            <div style="font-size: 9.5px; color: #64748b; font-weight: bold; margin-top: 5px;">قسم التدقيق والحسابات</div>
          </div>
          
          <div class="signature-box" style="width: 140px;">
            <div class="stamp-title-box">الختم والمصادقة للوكالة</div>
            <div class="stamp-box">ختم الأكاديمية</div>
          </div>

          <div class="signature-box">
            <div class="signature-title">مدير المنصة</div>
            <div class="signature-line"></div>
            <div style="font-size: 9.5px; color: #64748b; font-weight: bold; margin-top: 5px;">أ. زكي أبو علان</div>
          </div>
        </div>

        <div class="document-official-seal">
          تم كتابة واستخراج هذا السند المجمع رسمياً بمستندات مشفرة إلكترونياً عن طريق المنصة الإدارية بموافقة الأستاذ زكي أبو علان.
        </div>
      </body>
      </html>
    `;

    setPrintPreviewHtml(printHtml);
    setPrintPreviewTitle(docTitle);
    setShowPrintPreview(true);
  };

  const handleExportPDF = () => {
    const docTitle = "تقرير الحصص الفردية - أكاديمية المعلم المعتمد";
    const exportDateStr = new Date().toLocaleString('ar-EG', { timeZone: 'Asia/Gaza' }) || getLocalDateString();
    
    // Get current filter labels for report header
    const studentFilterName = filterStudentId ? (students.find(s => s.id === filterStudentId)?.name || "طالب محدد") : "كافة الطلاب";
    const teacherFilterName = filterTeacherId ? (teachers.find(t => t.id === filterTeacherId)?.name || "معلم محدد") : "كافة المعلمين";
    const subjectFilterName = filterSubject || "كافة المواد";
    const statusFilterName = filterApprovalStatus === 'approved' 
      ? 'منجزة ومعتمدة' 
      : filterApprovalStatus === 'pending' 
        ? 'معلقة بانتظار الاعتماد' 
        : 'كافة المعاملات';

    // SVG Logo from AcademyLogo
    const logoSvg = `
      <svg width="60" height="60" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M125 45 C125 52 128 55 135 55 C128 55 125 58 125 65 C125 58 122 55 115 55 C122 55 125 52 125 45 Z" fill="#D4A33C" />
        <path d="M142 68 C142 71 143 72 146 72 C143 72 142 73 142 76 C142 73 141 72 138 72 C141 72 142 71 142 68 Z" fill="#38BDF8" />
        <path d="M82 62 C82 64 83 65 85 65 C83 65 82 66 82 68 C82 66 81 65 79 65 C81 65 82 64 82 62 Z" fill="#38BDF8" />
        <path d="M109 42 C109 44 110 45 112 45 C110 45 109 46 109 48 C109 46 108 45 106 45 C108 45 109 44 109 42 Z" fill="#38BDF8" />
        <path d="M100 132 C75 120 42 124 24 138 C18 142 21 148 28 148 C44 148 76 142 100 148 Z" fill="#1A365D" />
        <path d="M100 132 C125 120 158 124 176 138 C182 142 179 148 172 148 C156 148 124 142 100 148 Z" fill="#1A365D" />
        <path d="M26 144 C42 134 74 128 100 135 C126 128 158 134 174 144 L170 148 C154 138 124 133 100 141 C76 133 46 138 30 148 Z" fill="#D4A33C" />
        <path d="M100 125 C75 112 45 116 28 128 C23 131 24 136 30 136 C46 136 76 131 100 137 Z" fill="#0284C7" />
        <path d="M100 125 C125 112 155 116 172 128 C177 131 176 136 170 136 C154 136 124 131 100 137 Z" fill="#0284C7" />
        <circle cx="100" cy="98" r="8" fill="#D4A33C" />
        <path d="M100 132 C90 128 86 114 78 103 C72 95 81 92 84 96 C90 102 96 112 100 116 C104 112 110 102 116 96 C119 92 128 95 122 103 C114 114 110 128 100 132 Z" fill="#D4A33C" />
        <path d="M109 104 C112 100 119 88 125 80 C128 76 133 78 130 83 C122 93 115 104 111 107 Z" fill="#D4A33C" />
        <path d="M100 84 L114 78 L100 72 L86 78 Z" fill="#0D365A" />
        <path d="M93 79.5 Q100 83.5 107 79.5 Q100 85 93 79.5 Z" fill="#F59E0B" />
      </svg>
    `;

    const rowsHtml = filteredSessions.map((session, index) => {
      const student = students.find(s => s.id === session.studentId);
      const teacher = teachers.find(t => t.id === session.teacherId);
      const cost = session.customFee !== undefined ? session.customFee : ((session.durationHours || 0) * (student?.customRates?.[session.teacherId] !== undefined ? student.customRates[session.teacherId] : (student?.hourlyRate ? student.hourlyRate : (teacher?.billingRate || teacher?.hourlyRate || 0))));
      
      const isPendingOver48 = (() => {
        if (session.approved !== false) return false;
        const timeBasis = session.createdAt || (session.date ? `${session.date}T00:00:00` : null);
        if (!timeBasis) return false;
        const createdTime = new Date(timeBasis).getTime();
        if (isNaN(createdTime)) return false;
        return (Date.now() - createdTime) > (48 * 60 * 60 * 1000);
      })();

      return `
        <tr class="${isPendingOver48 ? 'pending-overdue' : ''}">
          <td style="text-align: center; font-weight: bold; width: 40px;">${index + 1}</td>
          <td>
            <div style="font-weight: 800; color: #1e293b;">${student?.name || 'طالب غير معروف'}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${student?.grade || ''}</div>
          </td>
          <td>
            <div style="font-weight: bold; color: #1e293b;">${teacher?.name || 'معلم غير معروف'}</div>
          </td>
          <td>
            <div style="font-weight: 800; color: #1A365D;">${session.subject}</div>
            ${session.topic ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">العنوان: ${session.topic}</div>` : ''}
          </td>
          <td style="text-align: center; font-weight: 800;">${session.durationHours} س</td>
          <td style="text-align: center; font-weight: 800; color: #0f766e;">₪${cost}</td>
          <td style="text-align: center; font-size: 11px;">${session.date || ''}</td>
          <td style="text-align: center;">
            ${session.approved !== false
              ? '<span class="badge approved-badge">✅ معتمدة</span>'
              : isPendingOver48
                ? '<span class="badge pending-overdue-badge">⚠️ متأخرة (&gt; 48 ساعة)</span>'
                : '<span class="badge pending-badge">⏳ معلقة</span>'
            }
          </td>
        </tr>
      `;
    }).join('');

    const printHtml = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>${docTitle}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
          
          body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 30px;
            direction: rtl;
            -webkit-print-color-adjust: exact;
          }
          
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3.5px double #d4a33c;
            padding-bottom: 18px;
            margin-bottom: 25px;
          }
          
          .school-info {
            display: flex;
            align-items: center;
            gap: 15px;
          }
          
          .school-titles {
            display: flex;
            flex-direction: column;
          }
          
          .school-title-main {
            font-size: 19px;
            font-weight: 900;
            color: #1a365d;
            margin: 0;
            line-height: 1.2;
          }
          
          .school-title-sub {
            font-size: 10px;
            font-weight: 700;
            color: #d4a33c;
            margin: 2px 0 0 0;
            letter-spacing: 0.5px;
          }
          
          .document-meta-title {
            text-align: left;
          }
          
          .doc-type-badge {
            background-color: #1a365d;
            color: #ffffff;
            padding: 6px 14px;
            font-weight: 900;
            font-size: 11px;
            border-radius: 8px;
            display: inline-block;
            margin-bottom: 5px;
          }
          
          .date-stamp {
            font-size: 9.5px;
            color: #64748b;
            font-weight: 700;
          }

          .filter-summary-card {
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 25px;
          }
          
          .filter-title {
            font-size: 12px;
            font-weight: 850;
            color: #1a365d;
            margin-top: 0;
            margin-bottom: 10px;
            border-bottom: 1px dashed #cbd5e1;
            padding-bottom: 5px;
          }
          
          .filter-items-grid {
            display: grid;
            grid-template-cols: repeat(4, 1fr);
            gap: 12px;
          }
          
          .filter-item {
            display: flex;
            flex-direction: column;
          }
          
          .filter-item-label {
            font-size: 10px;
            font-weight: bold;
            color: #64748b;
          }
          
          .filter-item-value {
            font-size: 10.5px;
            font-weight: 800;
            color: #1e293b;
            margin-top: 2px;
          }

          .stats-grid {
            display: grid;
            grid-template-cols: repeat(3, 1fr);
            gap: 15px;
            margin-bottom: 25px;
          }
          
          .stat-card {
            background-color: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 12px;
            text-align: center;
          }
          
          .stat-card.primary {
            border-top: 4px solid #1a365d;
          }
          
          .stat-card.accent {
            border-top: 4px solid #d4a33c;
          }
          
          .stat-card.indicator {
            border-top: 4px solid #0f766e;
          }
          
          .stat-label {
            font-size: 9.5px;
            font-weight: 800;
            color: #64748b;
          }
          
          .stat-value {
            font-size: 18px;
            font-weight: 900;
            color: #1a365d;
            margin-top: 4px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          th {
            background-color: #1a365d;
            color: #ffffff;
            font-weight: 800;
            font-size: 11px;
            padding: 10px;
            border: 1px solid #1e3a8a;
            text-align: right;
          }
          
          td {
            padding: 10px;
            font-size: 11px;
            border: 1px solid #cbd5e1;
            vertical-align: middle;
          }
          
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          
          tr.pending-overdue {
            background-color: #fef2f2 !important;
            border-right: 4px solid #ef4444;
          }

          .badge {
            font-size: 8.5px;
            font-weight: 800;
            padding: 4px 8px;
            border-radius: 6px;
            display: inline-block;
            white-space: nowrap;
          }
          
          .approved-badge {
            background-color: #d1fae5;
            color: #065f46;
          }
          
          .pending-badge {
            background-color: #fef3c7;
            color: #92400e;
          }
          
          .pending-overdue-badge {
            background-color: #fee2e2;
            color: #991b1b;
            border: 1px dashed #ef4444;
          }

          .footer-signature-container {
            margin-top: 45px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            page-break-inside: avoid;
          }
          
          .signature-box {
            width: 230px;
            text-align: center;
          }
          
          .signature-title {
            font-weight: 800;
            font-size: 11.5px;
            color: #1a365d;
            margin-bottom: 40px;
          }
          
          .signature-line {
            border-bottom: 1.5px dashed #64748b;
            margin-bottom: 5px;
          }
          
          .stamp-box {
            width: 100px;
            height: 100px;
            border: 2px dashed #cbd5e1;
            border-radius: 50%;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #cbd5e1;
            font-size: 9.5px;
            font-weight: bold;
          }
          
          .stamp-title-box {
            font-weight: 800;
            font-size: 11.5px;
            color: #1a365d;
            margin-bottom: 15px;
          }

          .document-official-seal {
            font-size: 8.5px;
            color: #94a3b8;
            text-align: center;
            margin-top: 35px;
            border-top: 1px solid #f1f5f9;
            padding-top: 12px;
            font-weight: bold;
          }

          @media print {
            body {
              padding: 0;
              margin: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="school-info">
            ${logoSvg}
            <div class="school-titles">
              <h1 class="school-title-main">أكاديمية المعلم المعتمد</h1>
              <p class="school-title-sub">CERTIFIED TEACHER ACADEMY</p>
            </div>
          </div>
          <div class="document-meta-title">
            <span class="doc-type-badge">نسخة رسمية للتدقيق والمتابعة</span>
            <div class="date-stamp">توقيت الاستخراج والطباعة: ${exportDateStr}</div>
          </div>
        </div>

        <div class="filter-summary-card">
          <h4 class="filter-title">معايير التصفية والفرز המיושמים 🔍</h4>
          <div class="filter-items-grid">
            <div class="filter-item">
              <span class="filter-item-label">الفترة والنطاق الزمني</span>
              <span class="filter-item-value">${activePeriodLabel}</span>
            </div>
            <div class="filter-item">
              <span class="filter-item-label">الطالب المختار</span>
              <span class="filter-item-value">${studentFilterName}</span>
            </div>
            <div class="filter-item">
              <span class="filter-item-label">المعلم المدرب</span>
              <span class="filter-item-value">${teacherFilterName}</span>
            </div>
            <div class="filter-item">
              <span class="filter-item-label">المادة التعليمية</span>
              <span class="filter-item-value">${subjectFilterName}</span>
            </div>
            <div class="filter-item">
              <span class="filter-item-label">حالة الاعتماد</span>
              <span class="filter-item-value">${statusFilterName}</span>
            </div>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card primary">
            <span class="stat-label">مجموع الساعات للمفوترين بموجب التصفية</span>
            <div class="stat-value">${totalFilteredHours.toFixed(1)} س</div>
          </div>
          <div class="stat-card accent">
            <span class="stat-label">إجمالي تكاليف الحصة والفواتير</span>
            <div class="stat-value">₪${totalFilteredCost.toFixed(0)}</div>
          </div>
          <div class="stat-card indicator">
            <span class="stat-label">سجلات التدريس الفردية المفوترة</span>
            <div class="stat-value">${filteredSessions.length} حركة</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">M</th>
              <th>بيانات الطالب والمرحلة</th>
              <th>اسم المعلم</th>
              <th>المادة والموضوع المشروح</th>
              <th style="text-align: center; width: 80px;">مدة الدرس</th>
              <th style="text-align: center; width: 90px;">التكلفة النهائية</th>
              <th style="text-align: center; width: 100px;">تاريخ الدرس</th>
              <th style="text-align: center; width: 120px;">حالة المعاملة</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="8" style="text-align: center; padding: 25px; color: #64748b; font-weight: bold;">لا تتوفر أي حركات مسجلة تطابق محددات التصفية والفرز الحالية.</td></tr>`}
          </tbody>
        </table>

        <div class="footer-signature-container">
          <div class="signature-box">
            <div class="signature-title">الشؤون الإدارية والمالية</div>
            <div class="signature-line"></div>
            <div style="font-size: 9.5px; color: #64748b; font-weight: bold; margin-top: 5px;">توقيع واعتماد قسم التدقيق</div>
          </div>
          
          <div class="signature-box" style="width: 140px;">
            <div class="stamp-title-box">الختم والمصادقة للوكالة</div>
            <div class="stamp-box">ختم الأكاديمية</div>
          </div>

          <div class="signature-box">
            <div class="signature-title">مدير المنصة</div>
            <div class="signature-line"></div>
            <div style="font-size: 9.5px; color: #64748b; font-weight: bold; margin-top: 5px;">أ. زكي أبو علان</div>
          </div>
        </div>

        <div class="document-official-seal">
          تم كتابة واستخراج هذا السند رسمياً بمستندات مشفرة إلكترونياً عن طريق المنصة الإدارية بموافقة الأستاذ زكي أبو علان.
        </div>
      </body>
      </html>
    `;

    setPrintPreviewHtml(printHtml);
    setPrintPreviewTitle(docTitle);
    setShowPrintPreview(true);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleShortcutNew = () => {
      setTeacherId('');
      setStudentId('');
      setSubject('');
      setTopic('');
      setCustomFee('');
      setTimeout(() => {
        const el = document.getElementById('session-teacher-select');
        if (el) (el as HTMLSelectElement).focus();
      }, 100);
    };

    const handleShortcutSearch = () => {
      const el = document.getElementById('session-search-input');
      if (el) {
        (el as HTMLInputElement).focus();
        (el as HTMLInputElement).select();
      }
    };

    const handleShortcutEscape = () => {
      setShowPrintPreview(false);
      setModalEditSession(null);
      setEditingOverdueSessionId(null);
      setEditingSessionId(null);
    };

    const handleShortcutSave = () => {
      if (modalEditSession) {
        handleSaveModalEditSession();
      } else if (teacherId && studentId && subject) {
        addSession();
      }
    };

    window.addEventListener('app:shortcut:new', handleShortcutNew);
    window.addEventListener('app:shortcut:search', handleShortcutSearch);
    window.addEventListener('app:shortcut:escape', handleShortcutEscape);
    window.addEventListener('app:shortcut:save', handleShortcutSave);

    return () => {
      window.removeEventListener('app:shortcut:new', handleShortcutNew);
      window.removeEventListener('app:shortcut:search', handleShortcutSearch);
      window.removeEventListener('app:shortcut:escape', handleShortcutEscape);
      window.removeEventListener('app:shortcut:save', handleShortcutSave);
    };
  }, [modalEditSession, teacherId, studentId, subject, topic, duration, date, customFee, isGroupSession, bypassWarning]);

  const fetchData = async () => {
    try {
      const tSnap = await getDocs(collection(db, 'teachers'));
      setTeachers(tSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher)));
      const sSnap = await getDocs(collection(db, 'students'));
      setStudents(sSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
      const sessSnap = await getDocs(collection(db, 'sessions'));
      const sessionsList = sessSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session));
      // Sort sessions by date descending
      sessionsList.sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
      setSessions(sessionsList);
      
      const credSnap = await getDocs(collection(db, 'studentCredits'));
      setCredits(credSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const coursesSnap = await getDocs(collection(db, 'groupCourses'));
      setCourses(coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const assSnap = await getDocs(collection(db, 'assignments')).catch(() => ({ docs: [] } as any));
      setAssignments(assSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'teachers/students/sessions');
    }
  };

  // Helper: Calculate real-time student balance
  const getStudentBalance = (sId: string) => {
    if (!sId) return 0;
    const student = students.find(s => s.id === sId);
    if (!student) return 0;

    const studentSessions = sessions.filter(s => s.studentId === sId && s.approved !== false);
    const studentCredits = credits.filter(c => c.studentId === sId);

    const totalSpent = studentSessions.reduce((sum, s) => {
      if (isTrialSession(s)) return sum; // Trial sessions do NOT deduct from student balance!
      if (s.isGroupSession) {
        if (s.customFee !== undefined && s.customFee > 0) {
          return sum + s.customFee;
        }
        return sum; // Group sessions consume group hours, not money
      }
      if (s.customFee !== undefined) return sum + s.customFee;
      const t = teachers.find(teacher => teacher.id === s.teacherId);
      const rate = student.customRates?.[s.teacherId] !== undefined
        ? student.customRates[s.teacherId]
        : (student.hourlyRate ? student.hourlyRate : (t?.billingRate || t?.hourlyRate || globalSettings.defaultStudentHourlyRate || 60));
      return sum + (s.durationHours * rate);
    }, 0);

    const totalToppedUp = studentCredits.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    return totalToppedUp - totalSpent;
  };

  const currentStudent = students.find(s => s.id === studentId);
  const currentTeacher = teachers.find(t => t.id === teacherId);

  const activePricingCalc = useMemo(() => {
    return calculateSessionPricing({
      student: currentStudent,
      teacher: currentTeacher,
      settings: globalSettings,
      pricingUnit: pricingUnit,
      sessionCount: sessionCount,
      durationHours: duration,
      customFee: customFee !== '' ? Number(customFee) : undefined,
    });
  }, [currentStudent, currentTeacher, globalSettings, pricingUnit, sessionCount, duration, customFee]);

  // Programmatic verification: Check if there is an overlapping session for the same student on the same date
  const conflictingSession = useMemo(() => {
    if (!studentId || !date) return null;

    const newDurationMin = pricingUnit === 'session_40'
      ? (sessionCount * 40)
      : Math.max(15, Math.round(duration * 60));
    const newStart = parseTimeToMinutes(startTime);
    const newEnd = newStart + newDurationMin;

    const conflict = sessions.find(s => {
      if (s.status === 'cancelled') return false;
      if (s.date !== date) return false;

      const isStudentMatch = 
        s.studentId === studentId ||
        (Array.isArray(s.studentIds) && s.studentIds.includes(studentId)) ||
        (Array.isArray(s.students) && s.students.some((st: any) => (typeof st === 'string' ? st : st?.id) === studentId));
      if (!isStudentMatch) return false;

      const existingStart = parseTimeToMinutes(s.startTime || '16:00');
      const existingDurationMin = s.pricingUnit === 'session_40'
        ? ((s.sessionCount || 1) * 40)
        : Math.max(15, Math.round((Number(s.durationHours) || 1) * 60));
      const existingEnd = existingStart + existingDurationMin;

      // Intervals overlap if newStart < existingEnd AND existingStart < newEnd
      return newStart < existingEnd && existingStart < newEnd;
    });

    if (!conflict) return null;

    const conflictTeacher = teachers.find(t => t.id === conflict.teacherId);
    const conflictStart = parseTimeToMinutes(conflict.startTime || '16:00');
    const conflictDurationMin = conflict.pricingUnit === 'session_40'
      ? ((conflict.sessionCount || 1) * 40)
      : Math.max(15, Math.round((Number(conflict.durationHours) || 1) * 60));
    const conflictEnd = conflictStart + conflictDurationMin;

    return {
      session: conflict,
      teacherName: conflictTeacher?.name || 'معلم آخر',
      subject: conflict.subject || 'مادة دراسية',
      topic: conflict.topic || '',
      startTime: formatMinutesToTime(conflictStart),
      endTime: formatMinutesToTime(conflictEnd),
      timeRange: `${formatMinutesToTime(conflictStart)} - ${formatMinutesToTime(conflictEnd)}`
    };
  }, [studentId, date, startTime, duration, pricingUnit, sessionCount, sessions, teachers]);

  const addSession = async () => {
    if (!teacherId || !studentId || !subject) return;

    // Real-time timing conflict check for the student
    if (conflictingSession && !bypassTimeConflict) {
      const confirmProceed = window.confirm(
        `⚠️ تنبيه تعارض المواعيد:\n\nالطالب (${currentStudent?.name || 'المحدد'}) لديه حصة أخرى مسجلة بالفعل في نفس التوقيت بتاريخ ${date}:\n` +
        `• المعلم: ${conflictingSession.teacherName}\n` +
        `• المادة: ${conflictingSession.subject}\n` +
        `• التوقيت: من ${conflictingSession.startTime} إلى ${conflictingSession.endTime}\n\n` +
        `هل تريد بالتأكيد المتابعة وتأكيد تسجيل هذه الحصة بالرغم من التعارض؟`
      );
      if (!confirmProceed) {
        return;
      }
    }

    // Real-time balance check before submitting (only for individual sessions, group sessions consume hours instead)
    if (!isGroupSession) {
      const currentBalance = getStudentBalance(studentId);
      const sessionCost = activePricingCalc.studentCost;

      if (currentBalance < sessionCost && !bypassWarning) {
        // Show warning on UI but double safeguard here
        return;
      }
    }

    setIsSubmitting(true);
    const path = 'sessions';
    try {
      const computedDuration = pricingUnit === 'session_40'
        ? Number(((sessionCount * 40) / 60).toFixed(2))
        : duration;

      const sessionPayload: any = { 
        teacherId, 
        studentId, 
        subject: subject || 'عام', 
        topic: topic || '',
        durationHours: computedDuration, 
        date,
        createdAt: new Date().toISOString(),
        approved: true,
        teacherConfirmed: true,
        status: 'completed',
        startTime: startTime || '16:00',
        time: startTime || '16:00',
        isGroupSession: !!isGroupSession,
        pricingUnit: pricingUnit,
        sessionDurationMinutes: pricingUnit === 'session_40' ? 40 : 60,
        ...(pricingUnit === 'session_40' ? {
          sessionCount: sessionCount,
          academicStage: activePricingCalc.academicStage,
          customFee: activePricingCalc.studentCost,
          customPayout: activePricingCalc.teacherPayout,
          customTeacherFee: activePricingCalc.teacherPayout,
          teacherPayoutRate: activePricingCalc.teacherRatePerUnit,
        } : {}),
      };

      if (isGroupSession && selectedGroupId) {
        sessionPayload.groupId = selectedGroupId;
        const matchedCourse = courses.find(c => c.id === selectedGroupId);
        if (matchedCourse) {
          sessionPayload.courseCode = matchedCourse.code;
        }
      } else if (customFee !== '') {
        sessionPayload.customFee = Number(customFee);
      }

      if (selectedFinancialCategory) {
        sessionPayload.financialCategory = selectedFinancialCategory;
      }

      const docRef = await addDoc(collection(db, path), sessionPayload);

      try {
        await notifyTeacherOnSessionCreate(docRef.id, sessionPayload);
      } catch (notifyErr) {
        console.error("Error creating notification on session add:", notifyErr);
      }

      // Log activity
      try {
        const studentObj = students.find(s => s.id === studentId);
        const teacherObj = teachers.find(t => t.id === teacherId);
        const studentName = studentObj ? studentObj.name : 'طالب مجهول';
        const teacherName = teacherObj ? teacherObj.name : 'معلم مجهول';
        await logActivity({
          actionType: 'ADD_SESSION',
          actionName: 'إضافة حصة دراسية جديدة',
          actor: 'المدير العام (زكي أبو علان)',
          details: `تم إضافة حصة جديدة للطالب "${studentName}" مع المعلم "${teacherName}" بموضوع: "${subject || 'عام'}" ومدتها: ${duration} ساعة بتاريخ: ${date} والتوقيت: ${startTime || '16:00'}`
        });
      } catch (err) {
        console.error("Error logging activity in addSession:", err);
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setTeacherId('');
      setStudentId('');
      setSubject('');
      setTopic('');
      setCustomFee('');
      setSelectedFinancialCategory('');
      setIsGroupSession(false);
      setSelectedGroupId('');
      setBypassWarning(false);
      setBypassTimeConflict(false);
      
      // Refresh list
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSession = async (id: string) => {
    try {
      const sessionRef = doc(db, 'sessions', id);
      const updateData: any = {
        durationHours: Number(editDurationValue),
        date: editDateValue,
        subject: editSubjectValue || 'عام',
        topic: editTopicValue || ''
      };
      
      if (editCustomFeeValue !== '') {
        updateData.customFee = Number(editCustomFeeValue);
      } else {
        const { deleteField } = await import('firebase/firestore');
        updateData.customFee = deleteField();
      }

      const oldSession = sessions.find(s => s.id === id);
      await updateDoc(sessionRef, updateData);
      
      try {
        await notifyTeacherOnSessionChange(id, oldSession || null, updateData);
      } catch (notifyErr) {
        console.error("Error creating notification on inline edit:", notifyErr);
      }

      await fetchData();
      setEditingSessionId(null);
    } catch (error) {
      console.error("Error updating session:", error);
      handleFirestoreError(error, OperationType.WRITE, `sessions/${id}`);
    }
  };

  const deleteSession = (sessionId: string) => {
    setDeleteConfirm({ id: sessionId });
  };

  const executeDeleteSession = async (sessionId: string) => {
    try {
      const sessionToDelete = sessions.find(s => s.id === sessionId);
      const student = students.find(s => s.id === sessionToDelete?.studentId);
      const teacher = teachers.find(t => t.id === sessionToDelete?.teacherId);

      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'sessions', sessionId));
      setSessions(prev => prev.filter(s => s.id !== sessionId));

      try {
        const { logActivity } = await import('../lib/activityLogger');
        await logActivity({
          actionType: 'DELETE_SESSION',
          actionName: 'حذف حصة دراسية',
          actor: 'زكي أبو علان (المدير)',
          teacherId: teacher?.id,
          teacherName: teacher?.name,
          studentId: student?.id,
          studentName: student?.name,
          details: `قام مدير المنصة بحذف حصة دراسية للطالب "${student?.name || 'غير محدد'}" مع المعلم "${teacher?.name || 'غير محدد'}" (مادة: ${sessionToDelete?.subject || 'عام'}، المدة: ${sessionToDelete?.durationHours || 1} ساعة، التاريخ: ${sessionToDelete?.date || 'غير محدد'}). تم استرداد الرصيد تلقائياً.`
        });
      } catch (logErr) {
        console.error("Error logging activity for deleted session:", logErr);
      }
    } catch (error) {
       console.error("Error deleting session:", error);
    }
  };

  const handleArchiveSession = async (sessionId: string) => {
    try {
      await updateDoc(doc(db, 'sessions', sessionId), { archived: true });
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, archived: true } : s));
      try {
        const { logActivity } = await import('../lib/activityLogger');
        await logActivity({
          actionType: 'SESSION_ARCHIVE',
          actionName: 'أرشفة حصة تعليمية',
          details: `تم نقل الحصة التعليمية (رقم: ${sessionId}) إلى الأرشيف لحفظ البيانات وتنظيف واجهة العمل.`
        });
      } catch (e) {
        console.error("Activity logging failed", e);
      }
    } catch (error) {
      console.error("Error archiving session:", error);
    }
  };

  const handleUnarchiveSession = async (sessionId: string) => {
    try {
      await updateDoc(doc(db, 'sessions', sessionId), { archived: false });
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, archived: false } : s));
      try {
        const { logActivity } = await import('../lib/activityLogger');
        await logActivity({
          actionType: 'SESSION_UNARCHIVE',
          actionName: 'استعادة حصة تعليمية',
          details: `تم إلغاء أرشفة الحصة التعليمية (رقم: ${sessionId}) وإعادتها للنشط.`
        });
      } catch (e) {
        console.error("Activity logging failed", e);
      }
    } catch (error) {
      console.error("Error unarchiving session:", error);
    }
  };

  const executeDuplicateSession = async (originalSession: Session, targetDate: string) => {
    setIsSubmitting(true);
    try {
      const payload = {
        teacherId: originalSession.teacherId,
        studentId: originalSession.studentId,
        subject: originalSession.subject || 'عام',
        topic: originalSession.topic || '',
        durationHours: originalSession.durationHours,
        date: targetDate || originalSession.date || getLocalDateString(),
        createdAt: new Date().toISOString(),
        approved: true,
        teacherConfirmed: true,
        status: 'completed',
        startTime: originalSession.startTime || '16:00',
        ...(originalSession.customFee !== undefined ? { customFee: originalSession.customFee } : {})
      };
      const docRef = await addDoc(collection(db, 'sessions'), payload);
      try {
        await notifyTeacherOnSessionCreate(docRef.id, payload);
      } catch (notifyErr) {
        console.error("Error creating notification on duplicate session:", notifyErr);
      }
      await fetchData();
      setDuplicateConfirm(null);
    } catch (error) {
       console.error("Error duplicating session:", error);
       handleFirestoreError(error, OperationType.CREATE, 'sessions');
    } finally {
       setIsSubmitting(false);
    }
  };

  // Extract unique subjects from actual sessions & teachers
  const uniqueSubjects = Array.from(new Set([
    ...sessions.map(s => s.subject).filter(Boolean),
    ...teachers.flatMap(t => t.subjects || []).filter(Boolean)
  ]));

  // Count sessions per subject for quick filtering
  const subjectSessionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach(s => {
      if (s.subject) {
        if (activeArchiveTab === 'all' || (activeArchiveTab === 'active' ? !s.archived : s.archived)) {
          counts[s.subject] = (counts[s.subject] || 0) + 1;
        }
      }
    });
    return counts;
  }, [sessions, activeArchiveTab]);

  // Unique subjects sorted by popularity/session count
  const sortedUniqueSubjects = useMemo(() => {
    return [...uniqueSubjects].sort((a, b) => (subjectSessionCounts[b] || 0) - (subjectSessionCounts[a] || 0));
  }, [uniqueSubjects, subjectSessionCounts]);

  // Pending approvals requested by teachers after conducting classes
  const sessionsPendingApproval = sessions.filter(s => s.approved === false && s.teacherConfirmed === true);

  // Overdue booked sessions that need manager action/governance
  const overdueSessions = useMemo(() => {
    const booked = sessions.filter(s => 
      s.approved === false && 
      s.teacherConfirmed === false
    );

    const now = new Date();
    const localYear = now.getFullYear();
    const localMonth = String(now.getMonth() + 1).padStart(2, '0');
    const localDate = String(now.getDate()).padStart(2, '0');
    const todayStr = `${localYear}-${localMonth}-${localDate}`;
    
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return booked.filter(s => {
      if (!s.date) return false;
      if (s.date < todayStr) return true;
      if (s.date === todayStr) {
        const sTime = s.startTime || "16:00"; 
        const [h, m] = sTime.split(':').map(Number);
        if (isNaN(h) || isNaN(m)) return false;
        
        const startMinutes = h * 60 + m;
        const durationMin = Math.round((s.durationHours || 1) * 60);
        const endMinutes = startMinutes + durationMin;
        
        return currentMinutes >= endMinutes;
      }
      return false;
    });
  }, [sessions]);

  // Filter sessions based on selections and sort them
  const filteredAndSortedSessions = useMemo(() => {
    let result = sessions.filter(session => {
      // Archive Tab filter
      if (activeArchiveTab === 'active' && session.archived) return false;
      if (activeArchiveTab === 'archived' && !session.archived) return false;

      // Filter Student by exact ID
      if (filterStudentId && session.studentId !== filterStudentId) return false;
      
      // Filter Subject
      if (filterSubject && session.subject !== filterSubject) return false;

      // Filter by Subject Search Text
      if (subjectSearchText && subjectSearchText.trim()) {
        const subQuery = subjectSearchText.trim().toLowerCase();
        const sSubject = (session.subject || '').toLowerCase();
        const sTopic = (session.topic || '').toLowerCase();
        if (!sSubject.includes(subQuery) && !sTopic.includes(subQuery)) {
          return false;
        }
      }
      
      // Filter Teacher by exact ID
      if (filterTeacherId && session.teacherId !== filterTeacherId) return false;

      // Filter by Teacher Search Text (Name or Phone)
      if (teacherSearchText && teacherSearchText.trim()) {
        const teacher = teachers.find(t => t.id === session.teacherId);
        const tQuery = teacherSearchText.trim().toLowerCase();
        const tCleanDigits = tQuery.replace(/[\s\-\+\(\)]/g, '');
        const tName = (teacher?.name || '').toLowerCase();
        const tPhone = (teacher?.phone || '').replace(/[\s\-\+\(\)]/g, '');
        
        const matchesTeacher = tName.includes(tQuery) || (tCleanDigits.length >= 2 && tPhone.includes(tCleanDigits));
        if (!matchesTeacher) return false;
      }

      // Filter Approval Status
      if (filterApprovalStatus === 'approved' && !session.approved) return false;
      if (filterApprovalStatus === 'pending' && session.approved) return false;

      // Real-time Quick Search by student phone number, student name, teacher name, subject, topic, or notes
      if (searchText && searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        const cleanQueryDigits = q.replace(/[\s\-\+\(\)]/g, '');

        // Primary Student
        const primaryStudent = students.find(st => st.id === session.studentId);
        
        // Multi-students for group sessions
        const sessionStudentIds: string[] = [];
        if (session.studentId) sessionStudentIds.push(session.studentId);
        if (Array.isArray(session.studentIds)) {
          session.studentIds.forEach((id: string) => { if (id && !sessionStudentIds.includes(id)) sessionStudentIds.push(id); });
        }
        if (Array.isArray(session.students)) {
          session.students.forEach((st: any) => {
            const id = typeof st === 'string' ? st : st?.id;
            if (id && !sessionStudentIds.includes(id)) sessionStudentIds.push(id);
          });
        }
        
        const matchedStudents = sessionStudentIds.map(id => students.find(s => s.id === id)).filter(Boolean) as Student[];
        if (matchedStudents.length === 0 && primaryStudent) {
          matchedStudents.push(primaryStudent);
        }

        const studentNames = matchedStudents.map(s => (s.name || '').toLowerCase()).join(' ');
        const studentPhones = matchedStudents.map(s => (s.phone || '').toLowerCase()).join(' ');
        const studentCleanPhones = matchedStudents.map(s => (s.phone || '').replace(/[\s\-\+\(\)]/g, '')).join(' ');

        const teacher = teachers.find(t => t.id === session.teacherId);
        const teacherName = (teacher?.name || '').toLowerCase();
        const teacherPhone = (teacher?.phone || '').toLowerCase();
        const teacherCleanPhone = (teacher?.phone || '').replace(/[\s\-\+\(\)]/g, '');

        const subjectName = (session.subject || '').toLowerCase();
        const topicName = (session.topic || '').toLowerCase();
        const notesText = (session.notes || '').toLowerCase();

        const matches =
          studentNames.includes(q) ||
          (cleanQueryDigits.length >= 2 && studentCleanPhones.includes(cleanQueryDigits)) ||
          studentPhones.includes(q) ||
          teacherName.includes(q) ||
          (cleanQueryDigits.length >= 2 && teacherCleanPhone.includes(cleanQueryDigits)) ||
          teacherPhone.includes(q) ||
          subjectName.includes(q) ||
          topicName.includes(q) ||
          notesText.includes(q);

        if (!matches) return false;
      }
      
      // Advanced Date filters
      if (session.date) {
        if (startDate && session.date < startDate) return false;
        if (endDate && session.date > endDate) return false;
      } else {
        if (startDate || endDate) return false;
      }
      return true;
    });

    // Helper to calculate exact cost for sorting
    const getSessionCost = (s: Session) => {
      if (s.customFee !== undefined) return s.customFee;
      const student = students.find(st => st.id === s.studentId);
      const teacher = teachers.find(t => t.id === s.teacherId);
      const rate = student?.customRates?.[s.teacherId] !== undefined
        ? student.customRates[s.teacherId]
        : (student?.hourlyRate ? student.hourlyRate : (teacher?.billingRate || teacher?.hourlyRate || 0));
      return (s.durationHours || 0) * rate;
    };

    // Sort
    result.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'date') {
        const dateA = a.date || '';
        const dateB = b.date || '';
        comparison = dateA.localeCompare(dateB);
        if (comparison === 0) {
          const createA = a.createdAt || '';
          const createB = b.createdAt || '';
          comparison = createA.localeCompare(createB);
        }
      } else if (sortBy === 'teacher') {
        const teacherA = teachers.find(t => t.id === a.teacherId)?.name || '';
        const teacherB = teachers.find(t => t.id === b.teacherId)?.name || '';
        comparison = teacherA.localeCompare(teacherB, 'ar');
      } else if (sortBy === 'student') {
        const studentA = students.find(s => s.id === a.studentId)?.name || '';
        const studentB = students.find(s => s.id === b.studentId)?.name || '';
        comparison = studentA.localeCompare(studentB, 'ar');
      } else if (sortBy === 'hours') {
        const valA = a.durationHours || 0;
        const valB = b.durationHours || 0;
        comparison = valA - valB;
      } else if (sortBy === 'cost') {
        comparison = getSessionCost(a) - getSessionCost(b);
      } else if (sortBy === 'status') {
        const statusA = a.approved ? 1 : 0;
        const statusB = b.approved ? 1 : 0;
        comparison = statusA - statusB;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [sessions, teachers, students, filterStudentId, filterSubject, filterTeacherId, filterApprovalStatus, searchText, teacherSearchText, subjectSearchText, startDate, endDate, sortBy, sortOrder, activeArchiveTab]);

  const filteredSessions = filteredAndSortedSessions;

  // Calculate statistics for filtered list
  const totalFilteredHours = filteredAndSortedSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
  const totalFilteredCost = filteredAndSortedSessions.reduce((sum, s) => {
    if (isTrialSession(s)) return sum;
    if (s.customFee !== undefined) return sum + s.customFee;
    const student = students.find(st => st.id === s.studentId);
    const teacher = teachers.find(t => t.id === s.teacherId);
    const rate = student?.customRates?.[s.teacherId] !== undefined
      ? student.customRates[s.teacherId]
      : (student?.hourlyRate ? student.hourlyRate : (teacher?.billingRate || teacher?.hourlyRate || globalSettings.defaultStudentHourlyRate || 60));
    return sum + (s.durationHours * rate);
  }, 0);

  // Distinct teachers count in filtered list
  const filteredTeachersCount = useMemo(() => {
    const set = new Set<string>();
    filteredAndSortedSessions.forEach(s => {
      if (s.teacherId) set.add(s.teacherId);
    });
    return set.size;
  }, [filteredAndSortedSessions]);

  // Dynamic session counts for quick date filter tabs
  const dateCounts = useMemo(() => {
    const todayStr = getLocalDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    
    const weekRange = getWeekRange(0);
    const lastWeekRange = getWeekRange(-1);

    const d = new Date();
    const monthStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDayOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const monthEnd = `${lastDayOfMonth.getFullYear()}-${String(lastDayOfMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDayOfMonth.getDate()).padStart(2, '0')}`;

    const prevMonthDate = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    const prevMonthStart = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
    const prevMonthLastDay = new Date(d.getFullYear(), d.getMonth(), 0);
    const prevMonthEnd = `${prevMonthLastDay.getFullYear()}-${String(prevMonthLastDay.getMonth() + 1).padStart(2, '0')}-${String(prevMonthLastDay.getDate()).padStart(2, '0')}`;

    let today = 0;
    let yesterdayCount = 0;
    let thisWeek = 0;
    let lastWeek = 0;
    let thisMonth = 0;
    let lastMonth = 0;

    sessions.forEach(s => {
      if (activeArchiveTab === 'active' && s.archived) return;
      if (activeArchiveTab === 'archived' && !s.archived) return;
      if (!s.date) return;

      if (s.date === todayStr) today++;
      if (s.date === yStr) yesterdayCount++;
      if (s.date >= weekRange.start && s.date <= weekRange.end) thisWeek++;
      if (s.date >= lastWeekRange.start && s.date <= lastWeekRange.end) lastWeek++;
      if (s.date >= monthStart && s.date <= monthEnd) thisMonth++;
      if (s.date >= prevMonthStart && s.date <= prevMonthEnd) lastMonth++;
    });

    return {
      today,
      yesterday: yesterdayCount,
      thisWeek,
      lastWeek,
      thisMonth,
      lastMonth
    };
  }, [sessions, activeArchiveTab]);

  // Compute readable active period label for headers and export
  const activePeriodLabel = useMemo(() => {
    const todayStr = getLocalDateString();
    if (quickDate === 'today') {
      return `حصص اليوم (${formatArabicDateLong(todayStr)})`;
    }
    if (quickDate === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
      return `حصص الأمس (${formatArabicDateLong(yStr)})`;
    }
    if (quickDate === 'specificDay' && startDate) {
      return `حصص يوم (${formatArabicDateLong(startDate)})`;
    }
    if (quickDate === 'thisWeek') {
      const range = getWeekRange(0);
      return `الأسبوع الحالي (من ${formatArabicShortDate(range.start)} إلى ${formatArabicShortDate(range.end)})`;
    }
    if (quickDate === 'lastWeek') {
      const range = getWeekRange(-1);
      return `الأسبوع الماضي (من ${formatArabicShortDate(range.start)} إلى ${formatArabicShortDate(range.end)})`;
    }
    if (quickDate === 'weekNav' && startDate && endDate) {
      return `مراجعة أسبوعية (من ${formatArabicShortDate(startDate)} إلى ${formatArabicShortDate(endDate)})`;
    }
    if (quickDate === 'last7') {
      return `آخر 7 أيام (من ${startDate} إلى ${endDate})`;
    }
    if (quickDate === 'thisMonth') {
      return `هذا الشهر (${new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })})`;
    }
    if (quickDate === 'lastMonth') {
      const prevM = new Date();
      prevM.setMonth(prevM.getMonth() - 1);
      return `الشهر السابق (${prevM.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })})`;
    }
    if (startDate && endDate) {
      if (startDate === endDate) {
        return `يوم (${formatArabicDateLong(startDate)})`;
      }
      return `نطاق زمني (من ${formatArabicShortDate(startDate)} إلى ${formatArabicShortDate(endDate)})`;
    }
    if (startDate) {
      return `من تاريخ ${formatArabicShortDate(startDate)}`;
    }
    if (endDate) {
      return `حتى تاريخ ${formatArabicShortDate(endDate)}`;
    }
    return 'كافة الحصص (جميع الأوقات)';
  }, [quickDate, startDate, endDate]);

  const formatRemainingSessionsText = (balance: number, sessionCost: number): string => {
    if (sessionCost <= 0) {
      if (balance <= 0) return '0 حصة متبقية';
      return 'رصيد كافٍ';
    }
    const sessions = Math.floor(balance / sessionCost);
    if (sessions <= 0) {
      if (balance <= 0) return 'لا توجد حصص متبقية (0 حصة)';
      return 'أقل من حصة واحدة (0 حصة متبقية)';
    }
    if (sessions === 1) return 'تبقى حصة واحدة (1)';
    if (sessions === 2) return 'تبقى حصتان (2)';
    if (sessions >= 3 && sessions <= 10) return `تبقى ${sessions} حصص`;
    return `تبقى ${sessions} حصة`;
  };

  // Form helper variables for real-time balance calculations
  const activeRate = activePricingCalc.studentRatePerUnit;
  const currentSessionCost = activePricingCalc.studentCost;
  const currentStudentBalance = studentId ? getStudentBalance(studentId) : 0;
  const hasInsufficientBalance = studentId && teacherId && currentStudentBalance < currentSessionCost;

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 text-right space-y-10" dir="rtl">
      {/* Upper header summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">سجل حركات الساعات والتعليم</h2>
          <p className="text-xs text-slate-500 font-bold mt-1">تتبع، إضافة، مطابقة وتدقيق كافة ساعات التدريس للأكاديمية</p>
        </div>
      </div>

      {/* Pending Session Approvals Banner Queue */}
      {sessionsPendingApproval.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/20 text-slate-800 p-6 rounded-[2rem] space-y-4 shadow-sm text-right"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-950">طلبات اعتماد الساعات المعلقة من المعلمين 🔔</h3>
                <p className="text-xs text-amber-700 font-bold mt-0.5">يرجى مراجعة الساعات المؤكدة من المدرسين أدناه واعتمادها بضغطة زر لرصدها مالياً وتلقائياً بمحفظة الطالب وملف المعلم.</p>
              </div>
            </div>
            <span className="text-xs bg-amber-505 bg-amber-500/25 text-amber-900 font-extrabold px-3 py-1.5 rounded-full shrink-0 self-start sm:self-auto animate-pulse">
              بانتظار موافقتك ({sessionsPendingApproval.reduce((sum, s) => sum + (s.durationHours || 0), 0).toFixed(1)} س)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-1">
            {sessionsPendingApproval.map(session => {
              const student = students.find(s => s.id === session.studentId);
              const teacher = teachers.find(t => t.id === session.teacherId);
              const cost = session.customFee !== undefined ? session.customFee : ((session.durationHours || 0) * (student?.customRates?.[session.teacherId] !== undefined ? student.customRates[session.teacherId] : (student?.hourlyRate ? student.hourlyRate : (teacher?.billingRate || teacher?.hourlyRate || globalSettings.defaultStudentHourlyRate || 60))));
              
              return (
                <div key={session.id} className="p-4 bg-white border border-slate-150 rounded-2xl flex flex-col justify-between gap-4 shadow-xs hover:border-[#D4A33C]/45 transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-slate-900">الطالب: <strong className="text-[#1A365D]">{student?.name || 'مجهول'}</strong></span>
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[9px] font-black">{session.subject}</span>
                    </div>
                    <div className="space-y-1 text-[10px] text-slate-500 font-bold">
                      <p>المعلم: <strong className="text-slate-800">{teacher?.name || 'مجهول'}</strong></p>
                      <p>التاريخ: {formatCustomDate(session.date)} | البدء: {session.startTime || "16:00"}</p>
                      <p>المدة: {session.durationHours} س | التكلفة المتوقعة: ₪{cost}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      disabled={approvingSessionId === session.id}
                      onClick={() => handleApproveSession(session.id)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 hover:shadow-xs"
                    >
                      {approvingSessionId === session.id ? (
                        <Check className="animate-spin" size={12} />
                      ) : (
                        <>
                          <Check size={12} />
                          <span>اعتماد وتثبيت الحصة</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="p-2 px-2.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-xl transition-all duration-200 cursor-pointer border border-rose-150 hover:border-rose-600 shadow-xs hover:shadow-md hover:scale-105 active:scale-95 flex items-center justify-center group/btn"
                      title="حذف/رفض طلب الحصة"
                    >
                      <Trash2 size={13} className="transition-transform group-hover/btn:scale-110" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Overdue Booked Sessions Alert Panel */}
      {overdueSessions.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-500/10 border border-amber-500/20 text-slate-800 p-6 rounded-[2rem] text-right space-y-4 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-500/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-950">تنبيه حوكمة الساعات المتجاوزة للموعد بانتظار الاعتماد المالي ⏰</h3>
                <p className="text-xs text-amber-700 font-bold mt-0.5">لقد انقضى الوقت المقرر مسبقاً لهذه الساعات دون اتخاذ إجراء. بصفتك مديراً للمنصة، يرجى اعتمادها مباشرة لخصم الرصيد من الطالب وإضافته للمعلم، أو تعديل تفاصيل الساعات أولاً ثم اعتمادها وحفظها.</p>
              </div>
            </div>
            <span className="text-xs bg-amber-500/25 text-amber-900 font-extrabold px-3 py-1.5 rounded-full shrink-0 animate-pulse">
              بانتظار إجراء حوكمة ({overdueSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0).toFixed(1)} س متجاوزة)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-1">
            {overdueSessions.map(session => {
              const studentUser = students.find(s => s.id === session.studentId);
              const teacherUser = teachers.find(t => t.id === session.teacherId);
              const isEditing = editingOverdueSessionId === session.id;

              if (isEditing) {
                return (
                  <div key={session.id} className="p-4 bg-white border border-[#D4A33C]/40 rounded-2xl flex flex-col gap-3 shadow-md text-right">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-black text-slate-800">تعديل حصة الطالب: <strong className="text-[#1A365D]">{studentUser?.name || 'مجهول'}</strong></span>
                      <span className="text-[9px] bg-amber-500/15 text-amber-900 font-extrabold px-2 py-0.5 rounded">نمط التعديل ✏️</span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 flex justify-start">المادة الدراسية</label>
                        <select
                          value={overdueEditSubject}
                          onChange={e => setOverdueEditSubject(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-[11px]"
                        >
                          {teacherUser?.subjects?.map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                          )) || <option value="متابعة وتقويم">متابعة وتقويم</option>}
                          <option value="متابعة وتقويم">متابعة وتقويم</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 flex justify-start">أجر الحصة (ساعة)</label>
                          <select
                            value={overdueEditDuration}
                            onChange={e => setOverdueEditDuration(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-[11px]"
                          >
                            {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3].map((p) => (
                              <option key={p} value={p}>{p} ساعة</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-500 flex justify-start">توقيت البدء</label>
                          <input
                            type="time"
                            value={overdueEditStartTime}
                            onChange={e => setOverdueEditStartTime(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-[11px]"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-500 flex justify-start">تاريخ الحصة</label>
                        <input
                          type="date"
                          value={overdueEditDate}
                          onChange={e => setOverdueEditDate(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl outline-none font-bold text-[11px]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end pt-2 border-t border-slate-50">
                      <button
                        onClick={() => setEditingOverdueSessionId(null)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black rounded-lg transition-all cursor-pointer"
                      >
                        إلغاء
                      </button>
                      
                      <button
                        disabled={isConfirmingOverdueSession === session.id}
                        onClick={() => handleSaveAndConfirmOverdueSessionConduct(session.id)}
                        className="px-4 py-2 bg-[#D4A33C] hover:bg-[#b0852d] text-slate-950 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50 shrink-0"
                      >
                        {isConfirmingOverdueSession === session.id ? (
                          <span className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>حفظ وتأكيد للاعتماد</span>
                            <CheckCircle2 size={12} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={session.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex flex-col justify-between gap-4 shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between border-b border-slate-50 pb-1">
                      <span className="text-xs font-black text-slate-800">الطالب: <strong className="text-indigo-950">{studentUser?.name || 'مجهول'}</strong></span>
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[9px] font-black">{session.subject}</span>
                    </div>
                    <div className="space-y-0.5 text-[10px] text-slate-500 font-bold pt-1">
                      <p>المعلم: <strong className="text-slate-800">{teacherUser?.name || 'مجهول'}</strong></p>
                      <p>التاريخ المجدول: {formatCustomDate(session.date)}</p>
                      <p>ساعة البدء: {session.startTime || "16:00"} | المدة: {session.durationHours} س</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setEditingOverdueSessionId(session.id);
                        setOverdueEditDuration(session.durationHours || 1);
                        setOverdueEditSubject(session.subject || (teacherUser?.subjects?.[0] || 'متابعة وتقويم'));
                        setOverdueEditDate(session.date || '');
                        setOverdueEditStartTime(session.startTime || '16:00');
                      }}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black shrink-0 transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Pencil size={11} />
                      <span>تعديل</span>
                    </button>

                    <button
                      disabled={isConfirmingOverdueSession === session.id}
                      onClick={() => handleConfirmOverdueSessionConduct(session.id)}
                      className="flex-1 py-2 bg-[#D4A33C]/20 hover:bg-[#D4A33C]/35 text-slate-900 border border-[#D4A33C]/30 rounded-xl text-[10px] font-black shrink-0 transition-all cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {isConfirmingOverdueSession === session.id ? (
                        <span className="w-3 h-3 border-2 border-amber-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check size={11} />
                          <span>الاعتماد كما هي ✅</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => deleteSession(session.id)}
                      className="p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-150 hover:border-rose-600 rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center shrink-0 shadow-xs hover:shadow-md hover:scale-105 active:scale-95 group/del"
                      title="حذف وإلغاء الحصة المتجاوزة"
                    >
                      <Trash2 size={13} className="transition-transform group-hover/del:scale-110" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* RIGHT (or Left depending on dir) Column - Form to log a new session (4 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-200 relative overflow-hidden">
            {/* Decorative background element */}
            <div className="absolute top-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl -ml-24 -mt-24" />
            
            <div className="relative">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-[#D4A33C]/10 text-[#D4A33C] flex items-center justify-center shadow-sm">
                  <Calendar size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">إضافة حركة حضور جديدة</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">تسجيل الدخول وخصم رصيد الطالب فوراً</p>
                </div>
              </div>

              <div className="space-y-6 text-slate-800">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mr-1">
                    <User size={13} className="text-[#D4A33C]" />
                    أستاذ الحصة الشريك
                  </label>
                  <select 
                    id="session-teacher-select"
                    value={teacherId} 
                    onChange={e => {
                      const selectedId = e.target.value;
                      setTeacherId(selectedId);
                      const targetTeacher = teachers.find(t => t.id === selectedId);
                      const teacherSubjects = targetTeacher?.subjects || [];
                      if (teacherSubjects.length === 1) {
                        setSubject(teacherSubjects[0]);
                      } else {
                        setSubject(''); // Reset subject when teacher changes
                      }
                    }} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all font-bold cursor-pointer text-xs"
                  >
                    <option value="">-- اختر المعلم من القائمة --</option>
                    {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mr-1">
                    <Users size={13} className="text-[#D4A33C]" />
                    الطالب المستهدف بالحضور
                  </label>
                  <select 
                    id="session-student-select"
                    value={studentId} 
                    onChange={e => setStudentId(e.target.value)} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all font-bold cursor-pointer text-xs"
                  >
                    <option value="">-- اختر الطالب من القائمة --</option>
                    {teacherId && assignedStudentsForSelectedTeacher.length > 0 ? (
                      <>
                        <optgroup label={`⭐ الطلاب المنسوبون لهذا المعلم (${assignedStudentsForSelectedTeacher.length})`}>
                          {assignedStudentsForSelectedTeacher.map(s => (
                            <option key={s.id} value={s.id}>
                              ⭐ {s.name} {s.grade ? `(${s.grade})` : ''} - منسّب
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label={`باقي طلاب الأكاديمية (${otherStudentsForSelectedTeacher.length})`}>
                          {otherStudentsForSelectedTeacher.map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name} {s.grade ? `(${s.grade})` : ''}
                            </option>
                          ))}
                        </optgroup>
                      </>
                    ) : (
                      sortedStudents.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.grade ? `(${s.grade})` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Session Type Switch: Individual vs Group Course */}
                <div className="grid grid-cols-2 gap-4 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsGroupSession(false);
                      setSelectedGroupId('');
                    }}
                    className={`py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer select-none text-center ${
                      !isGroupSession 
                        ? 'bg-white text-slate-900 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    درس فردي / خاص (خصم مالي)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsGroupSession(true);
                    }}
                    className={`py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer select-none text-center ${
                      isGroupSession 
                        ? 'bg-white text-[#1A365D] shadow-sm ring-1 ring-slate-200' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    دورة جماعية (حسم من الساعات)
                  </button>
                </div>

                {isGroupSession && (
                  <div className="space-y-2 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                    <label className="flex items-center gap-2 text-xs font-bold text-amber-900 mr-1">
                      <Users size={13} className="text-amber-600" />
                      اختر الدورة الجماعية المستهدفة لخصم الساعات
                    </label>
                    <select
                      value={selectedGroupId}
                      onChange={e => {
                        const courseId = e.target.value;
                        setSelectedGroupId(courseId);
                        const course = courses.find(c => c.id === courseId);
                        if (course) {
                          setSubject(course.subject || 'متابعة الدورة الجماعية');
                          if (course.teacherId) {
                            setTeacherId(course.teacherId);
                          }
                        }
                      }}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/5 outline-none font-bold cursor-pointer text-xs"
                    >
                      <option value="">-- اختر الدورة الجماعية- --</option>
                      {courses
                        .filter(c => !studentId || c.studentIds?.includes(studentId))
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            {c.title} ({c.code}) - {c.level}
                          </option>
                        ))}
                    </select>

                    {studentId && (
                      <div className="text-[10px] text-amber-900 font-bold mt-1.5 space-y-1 text-right">
                        {(() => {
                          const studentObj = students.find(s => s.id === studentId);
                          const matchedCourse = courses.find(c => c.id === selectedGroupId);
                          if (studentObj && matchedCourse) {
                            const allocated = matchedCourse.studentHoursAllocated?.[studentId] ?? 10;
                            const consumed = sessions.filter(s => s.studentId === studentId && s.isGroupSession && (s.groupId === matchedCourse.id || s.courseCode === matchedCourse.code) && s.approved !== false).reduce((sum, s) => sum + s.durationHours, 0);
                            const remaining = Math.max(0, allocated - consumed);
                            return (
                              <p>
                                📊 رصيد الساعات للطالب <span className="underline">{studentObj.name}</span> في هذه الدورة:{" "}
                                <strong className="text-emerald-700">{remaining} ساعة متبقية </strong>{" "}
                                (من أصل {allocated} س مرصودة، تم استهلاك {consumed} س منها)
                              </p>
                            );
                          } else if (studentObj) {
                            return <p>💡 يرجى اختيار الدورة لعرض رصيد الساعات المتبقية للطالب.</p>;
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mr-1">
                    <BookOpen size={13} className="text-[#D4A33C]" />
                    المادة الدراسية للحصة
                  </label>
                  {(() => {
                    const selectedTeacherObj = teacherId ? teachers.find(t => t.id === teacherId) : null;
                    const teacherSubjects = selectedTeacherObj?.subjects || [];
                    if (teacherId && teacherSubjects.length === 1) {
                      return (
                        <div className="w-full px-4 py-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-bold flex items-center justify-between">
                          <span className="flex items-center gap-1.5 pb-0.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
                            المادة المسندة تلقائياً:
                          </span>
                          <span className="bg-[#D4A33C] text-slate-950 px-3 py-1 rounded-lg font-black">{teacherSubjects[0]}</span>
                        </div>
                      );
                    }
                    return (
                      <select 
                        value={subject} 
                        onChange={e => setSubject(e.target.value)} 
                        disabled={!teacherId}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all font-bold cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed text-xs"
                      >
                        <option value="">{teacherId ? '-- اختر المادة من القائمة --' : 'تنبيه: يرجى اختيار المعلم أولاً لعرض المواد التابعة له'}</option>
                        {teacherId && teacherSubjects.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    );
                  })()}
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mr-1">
                    <BookOpen size={13} className="text-[#D4A33C]" />
                    الموضوع المشروح في الحصة (اختياري)
                  </label>
                  <input 
                    type="text"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    placeholder="توضيح العناوين الرئيسية التي تناولتها الفعالية الدراسية (مثل: مراجعة الدوران في الهندسة المستوية)"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all font-semibold placeholder-slate-400 text-xs text-right"
                    dir="rtl"
                  />
                </div>

                {/* Mode Selector: Hourly vs 40-Minute Sessions */}
                <div className="space-y-3 pt-3 pb-2 border-t border-slate-200/80">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-[#0D365A]" />
                        <span>برنامج احتساب وتكلفة اللقاء:</span>
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                        👑 صلاحيات المدير فقط
                      </span>
                      {currentStudent && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 text-[11px] font-black border border-slate-200">
                          {(() => {
                            const badge = getAcademicStageBadge(currentStudent.grade || currentStudent.academicLevel || '');
                            return (
                              <>
                                <span>{badge.icon}</span>
                                <span>{badge.label}</span>
                                {currentStudent.grade && <span className="text-slate-500 font-bold">({currentStudent.grade})</span>}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Selector Buttons - Restricted to Manager */}
                    {isManagerUser ? (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 w-full sm:w-auto shadow-xs">
                          <button
                            type="button"
                            onClick={() => setPricingUnit('hourly')}
                            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              pricingUnit === 'hourly'
                                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title="اختيار نظام الساعات (60 د) - متاح للمدير فقط"
                          >
                            <Clock size={13} className={pricingUnit === 'hourly' ? 'text-[#D4A33C]' : 'text-slate-400'} />
                            <span>⏱️ نظام الساعات (60 د)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setPricingUnit('session_40')}
                            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                              pricingUnit === 'session_40'
                                ? 'bg-[#0D365A] text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                            title="اختيار نظام الحصص (40 د) - متاح للمدير فقط"
                          >
                            <span>🎓</span>
                            <span>نظام الحصص (40 دقيقة)</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${pricingUnit === 'session_40' ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-600'}`}>
                              إعدادي / ثانوي
                            </span>
                          </button>
                        </div>
                        <span className="hidden xl:inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-black bg-amber-100/70 text-amber-900 border border-amber-300">
                          <Crown size={11} className="text-amber-700" />
                          <span>تحكم المدير</span>
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-xl border border-slate-200 text-slate-700 text-xs font-black w-full sm:w-auto">
                        <Lock size={12} className="text-amber-600 ml-1.5 shrink-0" />
                        <span>البرنامج المعتمد:</span>
                        <span className={`mr-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black ${pricingUnit === 'session_40' ? 'bg-indigo-100 text-indigo-900 border border-indigo-200' : 'bg-white text-slate-900 border border-slate-200 shadow-xs'}`}>
                          {pricingUnit === 'session_40' ? '🎓 نظام الحصص (40 دقيقة)' : '⏱️ نظام الساعات (60 دقيقة)'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 mr-2 border-r border-slate-300 pr-2">
                          🔒 صلاحيات المدير فقط
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 40-Minute Sessions Active View */}
                  {pricingUnit === 'session_40' ? (
                    <div className="p-4 bg-gradient-to-br from-indigo-50/70 via-blue-50/40 to-slate-50 border border-indigo-200/80 rounded-2xl space-y-4 animate-in fade-in duration-300">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-indigo-950">
                            تسعير الحصة لـ {activePricingCalc.academicStage === 'middle' ? 'المرحلة الإعدادية' : activePricingCalc.academicStage === 'secondary' ? 'المرحلة الثانوية' : 'المرحلة المحددة'}:
                          </span>
                          <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-indigo-100/80 text-indigo-900">
                            40 دقيقة / حصة
                          </span>
                        </div>
                        <div className="text-[11px] font-black text-indigo-900 flex items-center gap-2">
                          <span>سعر الطالب: <strong className="text-emerald-700 font-black">₪{activePricingCalc.studentRatePerUnit}</strong></span>
                          <span className="text-slate-300">|</span>
                          <span>أجر المعلم: <strong className="text-indigo-700 font-black">₪{activePricingCalc.teacherRatePerUnit}</strong></span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-700 block">عدد الحصص (40 د/حصة):</label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4].map((count) => (
                              <button
                                key={count}
                                type="button"
                                onClick={() => setSessionCount(count)}
                                className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                                  sessionCount === count
                                    ? 'bg-[#0D365A] border-[#0D365A] text-white shadow-xs'
                                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                {count}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-700 block">المدة الزمنية المعادلة:</label>
                          <div className="h-[34px] px-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs font-black text-slate-800">
                            <span>{sessionCount * 40} دقيقة</span>
                            <span className="text-[10px] text-slate-400 font-bold">({((sessionCount * 40) / 60).toFixed(2)} س)</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-700 block">تكلفة الطالب المستقطعة:</label>
                          <div className="h-[34px] px-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-black text-emerald-800">
                            <span>الإجمالي:</span>
                            <span className="text-sm font-black">₪{activePricingCalc.studentCost}</span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-black text-slate-700 block">أجر المعلم عن اللقاء:</label>
                          <div className="h-[34px] px-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs font-black text-indigo-800">
                            <span>المستحق:</span>
                            <span className="text-sm font-black">₪{activePricingCalc.teacherPayout}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
                            <span className="text-emerald-600 font-extrabold text-sm">₪</span>
                            تعديل تكلفة الحصة يدوياً (اختياري):
                          </label>
                          <input 
                            type="number"
                            placeholder={`تلقائياً: ${activePricingCalc.studentCost} ₪`}
                            value={customFee}
                            onChange={e => setCustomFee(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none font-bold text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
                            <Calendar size={13} className="text-[#D4A33C]" />
                            تاريخ الحصة:
                          </label>
                          <input 
                            type="date" 
                            value={date} 
                            onChange={e => setDate(e.target.value)} 
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/5 outline-none font-bold text-xs" 
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
                            <Clock size={13} className="text-[#D4A33C]" />
                            ساعة البدء:
                          </label>
                          <input 
                            type="time" 
                            value={startTime} 
                            onChange={e => setStartTime(e.target.value)} 
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/5 outline-none font-bold text-xs" 
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Hourly Pricing Mode (Default standard 60-min hours) */
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 mr-1">
                          <Clock size={13} className="text-[#D4A33C]" />
                          المدة بالساعات ({duration} س)
                        </label>
                        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-205">
                          <input 
                            type="range"
                            min="0.5"
                            max="8"
                            step="0.25"
                            value={duration}
                            onChange={e => setDuration(Number(e.target.value))}
                            className="flex-1 h-1.5 bg-slate-250 rounded-lg appearance-none cursor-pointer accent-[#D4A33C]"
                          />
                          <input 
                            type="number"
                            min="0.1"
                            max="24"
                            step="0.1"
                            value={duration === 0 ? '' : duration}
                            onChange={e => {
                              const val = e.target.value;
                              setDuration(val === '' ? 0 : parseFloat(val));
                            }}
                            className="w-16 px-1.5 py-1 text-center font-black bg-white border border-slate-200 rounded-lg text-xs outline-none text-slate-905 focus:ring-1 focus:ring-[#D4A33C]"
                            placeholder="ساعات"
                          />
                        </div>
                        {/* Quick options for lesson duration */}
                        <div className="flex flex-wrap gap-1 mt-1.5 justify-start">
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
                              onClick={() => setDuration(item.val)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer border ${
                                duration === item.val
                                  ? 'bg-[#D4A33C] border-[#D4A33C] text-slate-950 shadow-xs'
                                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-705 mr-1">
                            <span className="text-emerald-600 font-extrabold text-sm">₪</span>
                            تكلفة الحصة يدوياً (₪)
                          </label>
                          <input 
                            type="number"
                            placeholder={studentId && teacherId ? `تلقائياً: ${duration * activeRate} ₪` : 'أدخل التكلفة يدوياً'}
                            value={customFee}
                            onChange={e => setCustomFee(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none font-bold text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
                            <Calendar size={13} className="text-[#D4A33C]" />
                            تاريخ الحصة
                          </label>
                          <input 
                            type="date" 
                            value={date} 
                            onChange={e => setDate(e.target.value)} 
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/5 outline-none font-bold text-xs" 
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
                            <Clock size={13} className="text-[#D4A33C]" />
                            ساعة البدء
                          </label>
                          <input 
                            type="time" 
                            value={startTime} 
                            onChange={e => setStartTime(e.target.value)} 
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/5 outline-none font-bold text-xs" 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Financial Category Selector for Session */}
                  <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5 text-right">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Tags size={13} className="text-[#D4A33C]" />
                        <span>التصنيف المالي للحصة أو الخدمة (اختياري):</span>
                      </label>
                      {selectedFinancialCategory && (
                        <button
                          type="button"
                          onClick={() => setSelectedFinancialCategory('')}
                          className="text-[10px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer underline"
                        >
                          إلغاء التحديد
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(globalSettings.financialCategories || DEFAULT_FINANCIAL_CATEGORIES)
                        .filter(c => c.isActive && (c.type === 'session' || c.type === 'both'))
                        .map(cat => {
                          const isSelected = selectedFinancialCategory === cat.name;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedFinancialCategory('');
                                } else {
                                  setSelectedFinancialCategory(cat.name);
                                  if (cat.defaultAmount !== undefined && cat.defaultAmount > 0) {
                                    setCustomFee(String(cat.defaultAmount));
                                  }
                                }
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-[#0D365A] text-white border-[#0D365A] shadow-xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <span>{cat.icon || '🏷️'}</span>
                              <span>{cat.name}</span>
                              {cat.defaultAmount !== undefined && cat.defaultAmount > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                                  isSelected ? 'bg-white/20 text-white font-black' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  ₪{cat.defaultAmount}
                                </span>
                              )}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-4">
                  {conflictingSession && (
                    <div className="p-4 bg-rose-50/90 border-2 border-rose-300 rounded-2xl text-right animate-in fade-in duration-300 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
                          <AlertTriangle size={18} className="animate-pulse" />
                        </div>
                        <div className="space-y-2 flex-1 text-xs">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <h4 className="font-black text-rose-950 text-xs sm:text-sm flex items-center gap-1.5">
                              <span>⚠️ تنبيه تعارض زمني: الطالب لديه حصة أخرى مسجلة في نفس التوقيت!</span>
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-200 text-rose-900 border border-rose-300">
                              تعارض توقيت ⏰
                            </span>
                          </div>
                          
                          <div className="p-3 bg-white/95 border border-rose-200 rounded-xl space-y-1.5 text-[11px] font-bold text-slate-700">
                            <p className="text-slate-800">
                              يوجد بالفعل حصة مسجلة للطالب <strong className="text-rose-900 font-black">{currentStudent?.name}</strong> بتاريخ <span className="font-mono font-bold text-slate-900">{date}</span>:
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[10px]">
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <span className="text-slate-400 block font-bold">المعلم:</span>
                                <span className="font-black text-slate-800">{conflictingSession.teacherName}</span>
                              </div>
                              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                                <span className="text-slate-400 block font-bold">المادة / الموضوع:</span>
                                <span className="font-black text-slate-800">{conflictingSession.subject} {conflictingSession.topic ? `(${conflictingSession.topic})` : ''}</span>
                              </div>
                              <div className="bg-rose-50 p-2 rounded-lg border border-rose-200">
                                <span className="text-rose-500 block font-bold">الفترة الزمنية:</span>
                                <span className="font-black text-rose-900 font-mono text-xs">{conflictingSession.timeRange}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <input 
                              type="checkbox"
                              id="bypassTimeConflictCheckbox"
                              checked={bypassTimeConflict}
                              onChange={e => setBypassTimeConflict(e.target.checked)}
                              className="rounded border-rose-300 text-rose-600 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                            />
                            <label htmlFor="bypassTimeConflictCheckbox" className="text-[11px] font-black text-rose-900 cursor-pointer select-none">
                              إقرار: أؤكد رغبتي بتسجيل الحصة بالرغم من التعارض الزمني
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {hasInsufficientBalance && (
                    <div className={`p-4 rounded-xl border text-right animate-in fade-in duration-300 ${
                      currentStudent?.isOpenBalance 
                        ? 'bg-amber-50 border-amber-200 text-slate-900' 
                        : 'bg-rose-50 border-rose-300 text-slate-900'
                    }`}>
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className={`shrink-0 mt-0.5 ${
                          currentStudent?.isOpenBalance ? 'text-amber-600' : 'text-rose-600 animate-pulse'
                        }`} size={18} />
                        <div className="text-xs font-bold leading-relaxed space-y-1.5 flex-1">
                          <p className="font-black text-[#111111]">
                            {currentStudent?.isOpenBalance 
                              ? 'تنبيه: رصيد الطالب غير كافٍ، لكن تم تفعيل "الحساب المفتوح" له من قِبَل المدير 🔓' 
                              : '⚠️ تحذير مهم للمعلم: رصيد الطالب قارب على النفاذ / غير كافٍ، والمدير لم يفعّل "الحساب المفتوح" له!'}
                          </p>
                          <p className="text-slate-600 text-[10px] font-semibold">
                            الحصص المتبقية في حساب الطالب: <span className="font-bold text-rose-700">{formatRemainingSessionsText(currentStudentBalance, currentSessionCost)}</span>
                          </p>
                          
                          <div className="flex items-center gap-2 pt-1 pb-0.5">
                            <input 
                              type="checkbox"
                              id="bypassWarningCheckbox"
                              checked={bypassWarning}
                              onChange={e => setBypassWarning(e.target.checked)}
                              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                            />
                            <label htmlFor="bypassWarningCheckbox" className="text-[10px] font-black text-rose-900 cursor-pointer select-none">
                              {currentStudent?.isOpenBalance 
                                ? 'الموافقة على تجاوز التنبيه والاستمرار بالحساب المفتوح المعتمد من المدير' 
                                : 'إقرار ورصد الحصة استثنائياً بالرغم من عدم تفعيل الحساب المفتوح من المدير'}
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {success ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.1 }}
                        className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3 text-emerald-700"
                      >
                        <CheckCircle2 size={24} className="shrink-0" />
                        <div>
                          <p className="font-extrabold text-xs">تم تسجيل وحفظ الحصة بنجاح الكلي</p>
                        </div>
                      </motion.div>
                    ) : (
                      <button 
                        onClick={addSession} 
                        disabled={isSubmitting || !teacherId || !studentId || !subject || (hasInsufficientBalance && !bypassWarning) || (conflictingSession && !bypassTimeConflict)}
                        className="w-full h-12 bg-slate-900 text-white rounded-xl font-black text-xs shadow-md hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-30 cursor-pointer"
                      >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            تأكيد وتسجيل الحصة المكتملة
                            <ArrowRight size={14} className="translate-x-0 group-hover:-translate-x-1 transition-transform" />
                          </>
                        )}
                      </button>
                    )}
                  </AnimatePresence>
                  
                  {!teacherId && !isSubmitting && !success && (
                    <div className="mt-3 p-3 bg-amber-55/40 border border-amber-100 rounded-xl text-amber-800 text-[9px] font-black leading-relaxed flex items-center gap-2">
                      <AlertCircle size={12} className="shrink-0 text-[#D4A33C]" />
                      خصم ساعات الحصة تلقائياً وفورياً من محفظة رصيد الطالب وإرسالها لمستحقات المعلم.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Teacher Monthly Stats Card */}
          {teacherId && currentTeacher && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="bg-white rounded-[2.5rem] p-8 shadow-md border border-slate-200 relative overflow-hidden text-right"
              id="teacher-monthly-stats-card"
            >
              {/* Decorative top dot */}
              <div className="absolute top-0 right-1/2 translate-x-1/2 w-20 h-1 bg-gradient-to-r from-[#D4A33C] to-emerald-600 rounded-b-full"></div>
              
              <div className="space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#D4A33C] flex items-center justify-center shrink-0">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">إحصائيات المعلم الشهرية 📊</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">معدلات الأداء وحصص المعلم المسجلة في الشهر الحالي</p>
                  </div>
                </div>

                {(() => {
                  const d = new Date();
                  const currentYear = d.getFullYear();
                  const currentMonth = d.getMonth(); // 0-indexed
                  
                  // Month names in Arabic
                  const monthsArabic = [
                    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
                    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
                  ];
                  
                  const currentMonthName = monthsArabic[currentMonth];

                  // Filter sessions for current month
                  const monthlySessions = sessions.filter(s => {
                    if (s.teacherId !== teacherId) return false;
                    if (!s.date) return false;
                    
                    const parts = s.date.split('-');
                    if (parts.length >= 2) {
                      const pYear = parseInt(parts[0], 10);
                      const pMonth = parseInt(parts[1], 10);
                      return pYear === currentYear && pMonth === (currentMonth + 1);
                    }
                    const sessDate = new Date(s.date);
                    return sessDate.getFullYear() === currentYear && sessDate.getMonth() === currentMonth;
                  });

                  const totalHoursCount = monthlySessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
                  const approvedCount = monthlySessions.filter(s => s.approved === true).length;
                  const pendingCount = monthlySessions.filter(s => s.approved === false).length;
                  
                  // Subject breakdown
                  const subjectCounts: Record<string, number> = {};
                  monthlySessions.forEach(s => {
                    const subName = s.subject || 'غير مصنف';
                    subjectCounts[subName] = (subjectCounts[subName] || 0) + 1;
                  });
                  
                  return (
                    <div className="space-y-4">
                      <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-150 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] text-[#D4A33C] font-black">الشهر المستهدف</p>
                          <p className="text-xs font-black text-[#1A365D]">{currentMonthName} {currentYear}</p>
                        </div>
                        <div className="text-left bg-[#D4A33C]/10 px-3 py-1.5 rounded-xl border border-[#D4A33C]/20">
                          <span className="text-xs font-black text-amber-700">المعلم: {currentTeacher.name}</span>
                        </div>
                      </div>

                      {/* Quick dashboard numbers */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/40 text-center">
                          <span className="text-[10px] font-black text-indigo-500 block">إجمالي عدد الحصص</span>
                          <span className="text-xl font-black text-indigo-950 font-mono mt-1 block">{monthlySessions.length}</span>
                        </div>
                        <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50 text-center">
                          <span className="text-[10px] font-black text-emerald-650 block">إجمالي الساعات</span>
                          <span className="text-xl font-black text-emerald-950 font-mono mt-1 block">{totalHoursCount} <span className="text-[10px]">س</span></span>
                        </div>
                      </div>

                      {/* Detailed metrics breakdown */}
                      <div className="bg-slate-50/60 rounded-2xl p-3.5 border border-slate-200/60 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            حركات حضور معتمدة:
                          </span>
                          <span className="font-mono text-slate-800 font-extrabold">{approvedCount} حركات</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-650">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-450" />
                            حركات بانتظار الاعتماد/المراجعة:
                          </span>
                          <span className="font-mono text-slate-800 font-extrabold">{pendingCount} حركات</span>
                        </div>
                      </div>

                      {/* Subject breakdown */}
                      {Object.keys(subjectCounts).length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] text-slate-400 font-black">تصنيف الحصص حسب المواد التعليمية لشهر {currentMonthName}:</p>
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {Object.entries(subjectCounts).map(([sub, count]) => (
                              <span 
                                key={sub}
                                className="px-2.5 py-1 bg-[#1A365D]/5 border border-[#1A365D]/10 text-[#1A365D] text-[9.5px] font-black rounded-lg flex items-center gap-1.5"
                              >
                                <span className="w-1.5 h-1.5 bg-[#D4A33C] rounded-full" />
                                <span>{sub}</span>
                                <strong className="bg-[#1A365D]/10 text-[#1A365D] px-1.5 py-0.2 rounded-md font-mono">{count}</strong>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}

          {/* Student Goal & Target Sessions Progress Card */}
          {studentId && currentStudent && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="bg-white rounded-[2.5rem] p-8 shadow-md border border-slate-200 relative overflow-hidden text-right"
              id="student-goals-target-card"
            >
              {/* Decorative top dot */}
              <div className="absolute top-0 right-1/2 translate-x-1/2 w-20 h-1 bg-gradient-to-r from-amber-400 to-indigo-600 rounded-b-full"></div>
              
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Target size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">متابعة الأهداف وإنجاز الجلسات</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">قياس حضور الطالب الحالي مقارنة بالخطة المقررة</p>
                  </div>
                </div>

                {(() => {
                  const studentSessions = sessions.filter(s => s.studentId === studentId && s.approved !== false);
                  const completedSessions = studentSessions.length;
                  const targetVal = currentStudent.targetSessions || 10;
                  const percent = Math.min(100, Math.round((completedSessions / targetVal) * 100));

                  let statusMsg = '';
                  let statusColor = '';
                  let progressColor = '';
                  let statusIcon = null;

                  if (percent < 30) {
                    statusMsg = 'بداية الرحلة! خطوة بخطوة نحو الغايات المقررة 🚀';
                    statusColor = 'bg-slate-100 text-slate-700 border-slate-200';
                    progressColor = 'bg-slate-400';
                  } else if (percent < 70) {
                    statusMsg = 'تقدم رائع! تم إنجاز المرحلة الانتقالية الأولى بنجاح 📈';
                    statusColor = 'bg-blue-50 text-blue-700 border-blue-100';
                    progressColor = 'bg-indigo-600';
                  } else if (percent < 100) {
                    statusMsg = 'مجهود متميز! اقتربنا من تغطية كامل الأهداف المقررة 🔥';
                    statusColor = 'bg-amber-50 text-amber-700 border-amber-100';
                    progressColor = 'bg-amber-500';
                  } else {
                    statusMsg = 'إنجاز طليعي ومكلل بالنجاح! تم تحقيق وانجاز الخطة بدقة 🎉';
                    statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                    progressColor = 'bg-gradient-to-r from-emerald-500 to-teal-600';
                    statusIcon = <Award size={13} className="text-emerald-600 animate-bounce" />;
                  }

                  return (
                    <div className="space-y-5">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150 flex items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-400 font-bold">حالة تقدم الطالب</p>
                          <p className="text-xs font-black text-[#1A365D]">{currentStudent.name}</p>
                        </div>
                        <div className="text-left">
                          <span className="text-2xl font-black text-slate-900 font-mono">{percent}</span>
                          <span className="text-xs text-slate-400 font-bold font-mono">%</span>
                        </div>
                      </div>

                      {/* Bar indicator */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black">
                          <span className="text-slate-500">تم إنجاز {completedSessions} من أصل {targetVal} حصص</span>
                          <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-mono">{percent}%</span>
                        </div>
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ease-out ${progressColor}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Message bubble */}
                      <div className={`p-3 rounded-xl border text-[10px] font-black flex items-center gap-2 ${statusColor}`}>
                        {statusIcon || <Clock size={12} />}
                        <span>{statusMsg}</span>
                      </div>

                      {/* Quick target adjustment section */}
                      <div className="pt-3 border-t border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold mb-2">تعديل هدف الحصص الفردي للمستقبل:</p>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            placeholder="مثال: 12"
                            value={editTargetInput}
                            onChange={e => setEditTargetInput(e.target.value)}
                            className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-xs font-mono text-center"
                          />
                          <button
                            type="button"
                            onClick={handleSaveStudentTarget}
                            disabled={isSavingTarget}
                            className="flex-1 py-1.5 bg-slate-900 text-white hover:bg-indigo-900 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            {isSavingTarget ? (
                              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              'حفظ الهدف المقرر'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </div>

        {/* LEFT (or Right depending on dir) Column - Complete List/Ledger of all academy sessions with filter options */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            {/* Header and filters section */}
            <div className="p-6 border-b border-slate-200 bg-slate-50/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-slate-900">سجل وحركات الحصص للتدقيق</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">تفصيل ومواصلة حصص الطلاب من مدير المنصة</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-black">
                  <div className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl">
                    ساعات الحصة: {totalFilteredHours.toFixed(1)} س
                  </div>
                  <div className="px-3 py-1.5 bg-[#D4A33C]/10 border border-[#D4A33C]/20 text-slate-800 rounded-xl">
                    إجمالي الفواتير: ₪{totalFilteredCost.toFixed(0)}
                  </div>
                  <button
                    onClick={handleExportMonthlyPDF}
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 border border-indigo-500 rounded-xl text-white shadow-sm transition-all duration-200 cursor-pointer text-[10.5px] font-black no-print"
                    title="توليد تقرير شهري مجمع ومصنف لكل حصص الشهر الحالي لكافة المعلمين"
                  >
                    <Calendar size={13} />
                    <span>تقرير شهري مجمع 📅</span>
                  </button>
                  <button
                    onClick={handleExportPDF}
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 border border-rose-500 rounded-xl text-white shadow-sm transition-all duration-200 cursor-pointer text-[10.5px] font-black no-print"
                    title="تصدير تقرير الحصص المفلترة الحالية بصيغة PDF معتمدة"
                  >
                    <FileText size={13} />
                    <span>تصدير تقرير PDF 📄</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    type="button"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 border border-teal-500 rounded-xl text-white shadow-sm transition-all duration-200 cursor-pointer text-[10.5px] font-black no-print"
                    title="طباعة كشف الحساب والتقرير الحالي"
                  >
                    <Printer size={13} />
                    <span>طباعة التقرير 🖨️</span>
                  </button>
                  
                  {/* Style block for advanced custom printing */}
                  <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                      /* Hide all global UI components, navigations, sidebars and headers */
                      body * {
                        visibility: hidden !important;
                      }
                      
                      /* Make only our printable section and its internal hierarchy visible */
                      .printable-section,
                      .printable-section * {
                        visibility: visible !important;
                      }
                      
                      /* Position the printable section cleanly at the top-left of the page */
                      .printable-section {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        display: block !important;
                        background: white !important;
                        color: black !important;
                        box-shadow: none !important;
                        border: none !important;
                        padding: 10px !important;
                        margin: 0 !important;
                        direction: rtl !important;
                      }
                      
                      /* Hide specific elements inside the print block */
                      .no-print,
                      .no-print * {
                        display: none !important;
                        visibility: hidden !important;
                        width: 0 !important;
                        height: 0 !important;
                        padding: 0 !important;
                        margin: 0 !important;
                      }

                      /* Beautiful clean layout for table on paper */
                      .printable-section table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        margin-top: 15px !important;
                      }

                      .printable-section th {
                        background-color: #f8fafc !important;
                        color: #0d365a !important;
                        border: 1px solid #94a3b8 !important;
                        font-weight: 900 !important;
                        font-size: 11px !important;
                        padding: 10px 8px !important;
                        text-align: right !important;
                      }

                      .printable-section td {
                        border: 1px solid #cbd5e1 !important;
                        font-size: 10px !important;
                        padding: 8px !important;
                        color: #1e293b !important;
                        text-align: right !important;
                      }

                      /* Total rows highlight */
                      .printable-section tr.bg-\\[\\#0D365A\\]\\/5 {
                        background-color: #f1f5f9 !important;
                        border-top: 2px solid #0d365a !important;
                      }
                    }
                  ` }} />
                </div>
              </div>

              {/* Tab Selector: Active vs Archived */}
              <div className="flex border-b border-slate-200 gap-1 mt-2">
                <button
                  type="button"
                  onClick={() => setActiveArchiveTab('active')}
                  className={`flex-1 py-3 text-center text-xs font-black transition-all border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeArchiveTab === 'active'
                      ? 'border-[#D4A33C] text-[#1A365D] bg-[#D4A33C]/5 font-black'
                      : 'border-transparent text-slate-400 hover:text-slate-650'
                  }`}
                >
                  <span>📝 الحصص النشطة</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-[#1A365D] text-[9px] font-mono font-black">
                    {sessions.filter(s => !s.archived).length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveArchiveTab('archived')}
                  className={`flex-1 py-3 text-center text-xs font-black transition-all border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeArchiveTab === 'archived'
                      ? 'border-[#D4A33C] text-[#1A365D] bg-[#D4A33C]/5 font-black'
                      : 'border-transparent text-slate-400 hover:text-slate-650'
                  }`}
                >
                  <span>📦 أرشيف الحصص القديمة (&gt; شهرين)</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-[#1A365D] text-[9px] font-mono font-black">
                    {sessions.filter(s => s.archived).length}
                  </span>
                </button>
              </div>

              {/* Real-time Search and Teacher & Subject Filter Suite - Designed for Large Centers */}
              <div className="p-4 sm:p-5 bg-gradient-to-b from-slate-100/90 via-slate-50 to-white rounded-3xl border border-slate-200/80 shadow-xs space-y-3.5">
                {/* Header row with Title, Live Results Badge, and Reset Button */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/70">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-[#1A365D] text-[#D4A33C] flex items-center justify-center font-black shadow-xs">
                      <Search size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-black text-[#1A365D] flex items-center gap-2">
                        <span>شريط البحث السريع وتصفية الحصص</span>
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs">
                          للمراكز التعليمية الكبيرة 🏫
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-400 font-bold">
                        تصفية مباشرة وفورية بحسب اسم المعلم أو المادة مع البحث الشامل
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Live Results Counter */}
                    <div className="px-3 py-1 rounded-xl bg-indigo-50/80 border border-indigo-100 text-[#1A365D] text-[11px] font-black flex items-center gap-1.5 shadow-2xs">
                      <Sparkles size={13} className="text-[#D4A33C]" />
                      <span>النتائج:</span>
                      <span className="font-mono text-[#1A365D] font-extrabold">{filteredAndSortedSessions.length}</span>
                      <span className="text-slate-400 text-[10px]">من {sessions.length} حصة</span>
                    </div>

                    {(searchText || filterTeacherId || teacherSearchText || filterSubject || subjectSearchText) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchText('');
                          setFilterTeacherId('');
                          setTeacherSearchText('');
                          setFilterSubject('');
                          setSubjectSearchText('');
                        }}
                        className="px-2.5 py-1 text-[10px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                      >
                        <RotateCcw size={11} />
                        <span>تفريغ الفلاتر ✕</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 3-Column Search & Filter Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* 1. General Quick Search Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-[11px] font-black text-[#1A365D]">
                        <Search size={13} className="text-[#D4A33C]" />
                        <span>البحث السريع (شامل) 🔍</span>
                      </label>
                      {searchText && (
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span>نشط</span>
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
                        <Search size={14} />
                        <Phone size={11} className="text-slate-350" />
                      </div>
                      <input
                        id="session-search-input"
                        type="text"
                        placeholder="ابحث برقم الهاتف أو الطالب أو المعلم أو المادة..."
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        className="w-full pr-14 pl-12 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#D4A33C]/10 focus:border-[#D4A33C] outline-none text-[11px] font-bold text-[#0D365A] placeholder-slate-400/80 transition-all shadow-2xs"
                      />
                      {searchText && (
                        <button
                          onClick={() => setSearchText('')}
                          type="button"
                          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-600 hover:text-rose-700 font-extrabold text-[9px] bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-md transition-all cursor-pointer border border-rose-100"
                        >
                          مسح ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2. Teacher-Specific Filter & Search */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-[11px] font-black text-[#1A365D]">
                        <User size={13} className="text-[#D4A33C]" />
                        <span>تصفية بحسب المعلم 🧑‍🏫</span>
                      </label>
                      {(filterTeacherId || teacherSearchText) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFilterTeacherId('');
                            setTeacherSearchText('');
                          }}
                          className="text-[9px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-full transition-all border border-rose-100 flex items-center gap-1 cursor-pointer"
                        >
                          <span>إلغاء ✕</span>
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {/* Teacher select dropdown */}
                      <div className="relative flex-1">
                        <User size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                          value={filterTeacherId}
                          onChange={e => {
                            setFilterTeacherId(e.target.value);
                            setTeacherSearchText('');
                          }}
                          className={`w-full pr-8 pl-3 py-2.5 bg-white border rounded-xl focus:ring-4 focus:ring-[#D4A33C]/10 focus:border-[#D4A33C] select-none text-[11px] font-bold appearance-none cursor-pointer transition-all outline-none shadow-2xs ${
                            filterTeacherId ? 'border-indigo-400 bg-indigo-50/20 text-[#1A365D]' : 'border-slate-200 text-slate-700'
                          }`}
                        >
                          <option value="">كافة المعلمين ({teachers.length})</option>
                          {teachers.map(t => {
                            const count = sessions.filter(s => s.teacherId === t.id && (activeArchiveTab === 'all' || (activeArchiveTab === 'active' ? !s.archived : s.archived))).length;
                            return (
                              <option key={t.id} value={t.id}>
                                {t.name} ({count} حصة)
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Teacher quick text search input */}
                      <div className="relative flex-1">
                        <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="ابحث باسم المعلم..."
                          value={teacherSearchText}
                          onChange={e => {
                            setTeacherSearchText(e.target.value);
                            setFilterTeacherId('');
                          }}
                          className="w-full pr-8 pl-12 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#D4A33C]/10 focus:border-[#D4A33C] outline-none text-[11px] font-bold text-[#0D365A] placeholder-slate-400/80 transition-all shadow-2xs"
                        />
                        {teacherSearchText && (
                          <button
                            onClick={() => setTeacherSearchText('')}
                            type="button"
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-600 hover:text-rose-700 font-extrabold text-[9px] bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-md transition-all cursor-pointer border border-rose-100"
                          >
                            مسح ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. Subject-Specific Filter & Search */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 text-[11px] font-black text-[#1A365D]">
                        <BookOpen size={13} className="text-[#D4A33C]" />
                        <span>تصفية بحسب المادة التعليمية 📖</span>
                      </label>
                      {(filterSubject || subjectSearchText) && (
                        <button
                          type="button"
                          onClick={() => {
                            setFilterSubject('');
                            setSubjectSearchText('');
                          }}
                          className="text-[9px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-full transition-all border border-rose-100 flex items-center gap-1 cursor-pointer"
                        >
                          <span>إلغاء ✕</span>
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {/* Subject select dropdown */}
                      <div className="relative flex-1">
                        <BookOpen size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                          value={filterSubject}
                          onChange={e => {
                            setFilterSubject(e.target.value);
                            setSubjectSearchText('');
                          }}
                          className={`w-full pr-8 pl-3 py-2.5 bg-white border rounded-xl focus:ring-4 focus:ring-[#D4A33C]/10 focus:border-[#D4A33C] select-none text-[11px] font-bold appearance-none cursor-pointer transition-all outline-none shadow-2xs ${
                            filterSubject ? 'border-amber-400 bg-amber-50/20 text-[#1A365D]' : 'border-slate-200 text-slate-700'
                          }`}
                        >
                          <option value="">كافة المواد ({uniqueSubjects.length})</option>
                          {sortedUniqueSubjects.map(sub => {
                            const count = subjectSessionCounts[sub] || 0;
                            return (
                              <option key={sub} value={sub}>
                                {sub} ({count} حصة)
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Subject quick text search input */}
                      <div className="relative flex-1">
                        <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="ابحث باسم المادة أو الدرس..."
                          value={subjectSearchText}
                          onChange={e => {
                            setSubjectSearchText(e.target.value);
                            setFilterSubject('');
                          }}
                          className="w-full pr-8 pl-12 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#D4A33C]/10 focus:border-[#D4A33C] outline-none text-[11px] font-bold text-[#0D365A] placeholder-slate-400/80 transition-all shadow-2xs"
                        />
                        {subjectSearchText && (
                          <button
                            onClick={() => setSubjectSearchText('')}
                            type="button"
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-600 hover:text-rose-700 font-extrabold text-[9px] bg-rose-50 hover:bg-rose-100 px-2 py-0.5 rounded-md transition-all cursor-pointer border border-rose-100"
                          >
                            مسح ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Filter Chips Bar */}
                {(searchText || filterTeacherId || teacherSearchText || filterSubject || subjectSearchText) && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] font-black text-slate-500 ml-1">الفلاتر النشطة:</span>
                    {searchText && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-[10px] font-extrabold">
                        <span>🔍 بحث: "{searchText}"</span>
                        <button
                          type="button"
                          onClick={() => setSearchText('')}
                          className="text-amber-700 hover:text-rose-600 font-black cursor-pointer mr-1"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    {filterTeacherId && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg text-[10px] font-extrabold">
                        <span>🧑‍🏫 المعلم: {teachers.find(t => t.id === filterTeacherId)?.name || 'محدد'}</span>
                        <button
                          type="button"
                          onClick={() => setFilterTeacherId('')}
                          className="text-indigo-700 hover:text-rose-600 font-black cursor-pointer mr-1"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    {teacherSearchText && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded-lg text-[10px] font-extrabold">
                        <span>🧑‍🏫 نص المعلم: "{teacherSearchText}"</span>
                        <button
                          type="button"
                          onClick={() => setTeacherSearchText('')}
                          className="text-indigo-700 hover:text-rose-600 font-black cursor-pointer mr-1"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    {filterSubject && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-[10px] font-extrabold">
                        <span>📖 المادة: {filterSubject}</span>
                        <button
                          type="button"
                          onClick={() => setFilterSubject('')}
                          className="text-emerald-700 hover:text-rose-600 font-black cursor-pointer mr-1"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    {subjectSearchText && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-[10px] font-extrabold">
                        <span>📖 نص المادة: "{subjectSearchText}"</span>
                        <button
                          type="button"
                          onClick={() => setSubjectSearchText('')}
                          className="text-emerald-700 hover:text-rose-600 font-black cursor-pointer mr-1"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                  </div>
                )}

                {/* Quick Filter Pills by Subject (المواد التعليمية الأكثر تسجيلاً) */}
                {sortedUniqueSubjects.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50/90 border border-slate-200/70 rounded-2xl">
                    <span className="text-[10px] text-slate-500 font-extrabold ml-1 flex items-center gap-1">
                      <BookOpen size={11} className="text-slate-400" />
                      <span>تصفية سريعة بالمادة:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterSubject('');
                        setSubjectSearchText('');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
                        !filterSubject && !subjectSearchText
                          ? 'bg-[#1A365D] text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      كافة المواد 📚
                    </button>
                    {sortedUniqueSubjects.slice(0, 10).map(sub => {
                      const isActive = filterSubject === sub;
                      const count = subjectSessionCounts[sub] || 0;
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              setFilterSubject('');
                            } else {
                              setFilterSubject(sub);
                              setSubjectSearchText('');
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all flex items-center gap-1 ${
                            isActive
                              ? 'bg-emerald-700 text-white shadow-2xs ring-2 ring-emerald-500/30'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          <span>{sub}</span>
                          <span className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                            isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                    {sortedUniqueSubjects.length > 10 && (
                      <span className="text-[9px] text-slate-400 font-bold pr-1">+{sortedUniqueSubjects.length - 10} مواد أخرى</span>
                    )}
                  </div>
                )}

                {/* Quick Filter Pills by Teacher (المعلمون الأكثر نشاطاً) */}
                {teachers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50/90 border border-slate-200/70 rounded-2xl">
                    <span className="text-[10px] text-slate-500 font-extrabold ml-1 flex items-center gap-1">
                      <User size={11} className="text-slate-400" />
                      <span>تصفية سريعة بالمعلم:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterTeacherId('');
                        setTeacherSearchText('');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all ${
                        !filterTeacherId && !teacherSearchText
                          ? 'bg-[#D4A33C] text-white shadow-2xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      كافة المعلمين 👥
                    </button>
                    {teachers.slice(0, 10).map(t => {
                      const isActive = filterTeacherId === t.id;
                      const count = sessions.filter(s => s.teacherId === t.id && (activeArchiveTab === 'all' || (activeArchiveTab === 'active' ? !s.archived : s.archived))).length;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            if (isActive) {
                              setFilterTeacherId('');
                            } else {
                              setFilterTeacherId(t.id);
                              setTeacherSearchText('');
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer transition-all flex items-center gap-1 ${
                            isActive
                              ? 'bg-[#1A365D] text-white shadow-2xs ring-2 ring-[#1A365D]/30'
                              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                          }`}
                        >
                          <span>{t.name}</span>
                          <span className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                            isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                    {teachers.length > 10 && (
                      <span className="text-[9px] text-slate-400 font-bold pr-1">+{teachers.length - 10} آخرون</span>
                    )}
                  </div>
                )}
              </div>

              {/* Dynamic Quick Filters controls */}
              <div className="bg-white/80 border border-slate-200/80 rounded-2xl p-4 mt-2 space-y-4">
                <div className="flex items-center justify-between text-xs font-black text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Filter size={13} className="text-[#D4A33C]" />
                    <span>مرشحات التصفية السريعة (بدون كتابة يدوية)</span>
                  </span>
                  {(filterStudentId || filterSubject || filterTeacherId || filterApprovalStatus !== 'all' || startDate || endDate || quickDate) && (
                    <button 
                      onClick={handleClearFilters}
                      className="text-rose-600 hover:text-rose-700 flex items-center gap-1 transition-colors font-black cursor-pointer bg-transparent border-none outline-none text-[10px]"
                    >
                      <RotateCcw size={11} />
                      <span>إعادة ضبط كافة الفلاتر</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {/* 1. Filter Student Dropdown */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-extrabold block mr-1">تصفية حسب الطالب</span>
                    <div className="relative group">
                      <Users size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-[#D4A33C] transition-colors" />
                      <select 
                        value={filterStudentId} 
                        onChange={e => setFilterStudentId(e.target.value)} 
                        className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] focus:border-[#D4A33C] select-none text-[10px] font-bold text-slate-700 appearance-none cursor-pointer transition-all outline-none"
                      >
                        <option value="">كافة الطلاب (غير مصفى)</option>
                        {sortedStudents.map(s => (
                          <option key={s.id} value={s.id}>{s.name} {s.grade ? `(${s.grade})` : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 2. Filter Subject Dropdown */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-extrabold block mr-1">تصفية حسب المادة التعليمية</span>
                    <div className="relative group">
                      <BookOpen size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-[#D4A33C] transition-colors" />
                      <select 
                        value={filterSubject} 
                        onChange={e => setFilterSubject(e.target.value)} 
                        className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] focus:border-[#D4A33C] select-none text-[10px] font-bold text-slate-700 appearance-none cursor-pointer transition-all outline-none"
                      >
                        <option value="">كافة المواد دون تصفية</option>
                        {uniqueSubjects.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 3. Filter Date/Period Dropdown */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-extrabold block mr-1">تصفية حسب موعد الحصة (التاريخ)</span>
                    <div className="relative group">
                      <Calendar size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-[#D4A33C] transition-colors" />
                      <select
                        value={quickDate || (startDate || endDate ? 'custom' : 'all')}
                        onChange={e => handleQuickDateChange(e.target.value)}
                        className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] focus:border-[#D4A33C] select-none text-[10px] font-bold text-slate-700 appearance-none cursor-pointer transition-all outline-none"
                      >
                        <option value="all">كافة التواريخ (بدون فلترة)</option>
                        <option value="today">حصص اليوم فقط 📅</option>
                        <option value="yesterday">حصص أمس 📅</option>
                        <option value="thisWeek">الأسبوع الحالي 📆</option>
                        <option value="lastWeek">الأسبوع الماضي 🗓️</option>
                        <option value="last7">خلال آخر 7 أيام 🗓️</option>
                        <option value="thisMonth">خلال هذا الشهر الحالي 📊</option>
                        <option value="lastMonth">الشهر السابق بالكامل 🗓️</option>
                        <option value="specificDay">اختيار يوم محدد 🎯</option>
                        <option value="custom">نطاق تاريخي مخصص ⚙️</option>
                      </select>
                    </div>
                  </div>

                  {/* 4. Filter Teacher Dropdown */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-extrabold block mr-1">تصفية حسب معلم الحصة</span>
                    <div className="relative group">
                      <User size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-[#D4A33C] transition-colors" />
                      <select 
                        value={filterTeacherId} 
                        onChange={e => setFilterTeacherId(e.target.value)} 
                        className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] focus:border-[#D4A33C] select-none text-[10px] font-bold text-slate-700 appearance-none cursor-pointer transition-all outline-none"
                      >
                        <option value="">كافة المعلمين الشركاء</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 5. Filter Approval Status Dropdown */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-extrabold block mr-1">تصفية حسب حالة الاعتماد</span>
                    <div className="relative group">
                      <CheckCircle2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-[#D4A33C] transition-colors" />
                      <select 
                        value={filterApprovalStatus} 
                        onChange={e => setFilterApprovalStatus(e.target.value as any)} 
                        className="w-full pr-8 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C]/60 focus:border-[#D4A33C] select-none text-[10px] font-bold text-slate-700 appearance-none cursor-pointer transition-all outline-none"
                      >
                        <option value="all">كافة الحركات (بدون فلترة)</option>
                        <option value="approved">منجزة ومعتمدة بقائمتك ✅</option>
                        <option value="pending">معلقة بانتظار الاعتماد ⏳</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comprehensive Date Filter & Daily/Weekly Review Hub for the Director */}
            <div className="mx-6 my-4 p-4.5 bg-gradient-to-br from-slate-900 via-[#0D365A] to-slate-900 text-white rounded-3xl shadow-md border border-slate-800 space-y-4">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#D4A33C]/20 border border-[#D4A33C]/40 text-[#D4A33C] flex items-center justify-center shadow-inner">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-white tracking-wide">مركز المراجعة والفلترة حسب التاريخ</h4>
                      <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#D4A33C] text-slate-950">
                        مراجعة الدروس اليومية والأسبوعية
                      </span>
                    </div>
                    <p className="text-[10.5px] font-bold text-slate-300 mt-0.5">
                      تتبع الحصص والدروس اليومية والأسبوعية للمدير بنقرة واحدة، ومتابعة إنجازات المعلمين
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                    تاريخ اليوم: {formatArabicDateLong(getLocalDateString())}
                  </span>
                  {(startDate || endDate || quickDate) && (
                    <button
                      onClick={() => handleQuickDateChange('all')}
                      type="button"
                      className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={11} />
                      <span>عرض الكل</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Period Buttons with Live Counters */}
              <div className="space-y-2">
                <div className="text-[10px] font-extrabold text-[#D4A33C] flex items-center gap-1.5">
                  <span>⚡ اختر فترة المراجعة المطلوبة:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-9 gap-2">
                  {/* Today */}
                  <button
                    type="button"
                    onClick={() => handleQuickDateChange('today')}
                    className={`p-2 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border text-center ${
                      quickDate === 'today'
                        ? 'bg-[#D4A33C] text-slate-950 border-[#D4A33C] shadow-lg font-black'
                        : 'bg-white/5 hover:bg-white/10 text-white border-white/10 font-bold'
                    }`}
                  >
                    <span className="text-xs">⚡ حصص اليوم</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                      quickDate === 'today' ? 'bg-slate-950 text-[#D4A33C]' : 'bg-white/10 text-slate-300'
                    }`}>
                      {dateCounts.today} حصة
                    </span>
                  </button>

                  {/* Yesterday */}
                  <button
                    type="button"
                    onClick={() => handleQuickDateChange('yesterday')}
                    className={`p-2 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border text-center ${
                      quickDate === 'yesterday'
                        ? 'bg-[#D4A33C] text-slate-950 border-[#D4A33C] shadow-lg font-black'
                        : 'bg-white/5 hover:bg-white/10 text-white border-white/10 font-bold'
                    }`}
                  >
                    <span className="text-xs">🗓️ حصص الأمس</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                      quickDate === 'yesterday' ? 'bg-slate-950 text-[#D4A33C]' : 'bg-white/10 text-slate-300'
                    }`}>
                      {dateCounts.yesterday} حصة
                    </span>
                  </button>

                  {/* This Week */}
                  <button
                    type="button"
                    onClick={() => handleQuickDateChange('thisWeek')}
                    className={`p-2 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border text-center ${
                      quickDate === 'thisWeek'
                        ? 'bg-[#D4A33C] text-slate-950 border-[#D4A33C] shadow-lg font-black'
                        : 'bg-white/5 hover:bg-white/10 text-white border-white/10 font-bold'
                    }`}
                  >
                    <span className="text-xs">📆 هذا الأسبوع</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                      quickDate === 'thisWeek' ? 'bg-slate-950 text-[#D4A33C]' : 'bg-white/10 text-slate-300'
                    }`}>
                      {dateCounts.thisWeek} حصة
                    </span>
                  </button>

                  {/* Last Week */}
                  <button
                    type="button"
                    onClick={() => handleQuickDateChange('lastWeek')}
                    className={`p-2 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border text-center ${
                      quickDate === 'lastWeek'
                        ? 'bg-[#D4A33C] text-slate-950 border-[#D4A33C] shadow-lg font-black'
                        : 'bg-white/5 hover:bg-white/10 text-white border-white/10 font-bold'
                    }`}
                  >
                    <span className="text-xs">🗓️ الأسبوع الماضي</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                      quickDate === 'lastWeek' ? 'bg-slate-950 text-[#D4A33C]' : 'bg-white/10 text-slate-300'
                    }`}>
                      {dateCounts.lastWeek} حصة
                    </span>
                  </button>

                  {/* Last 7 Days */}
                  <button
                    type="button"
                    onClick={() => handleQuickDateChange('last7')}
                    className={`p-2 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border text-center ${
                      quickDate === 'last7'
                        ? 'bg-[#D4A33C] text-slate-950 border-[#D4A33C] shadow-lg font-black'
                        : 'bg-white/5 hover:bg-white/10 text-white border-white/10 font-bold'
                    }`}
                  >
                    <span className="text-xs">⏳ آخر 7 أيام</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                      quickDate === 'last7' ? 'bg-slate-950 text-[#D4A33C]' : 'bg-white/10 text-slate-300'
                    }`}>
                      مراجعة متصلة
                    </span>
                  </button>

                  {/* This Month */}
                  <button
                    type="button"
                    onClick={() => handleQuickDateChange('thisMonth')}
                    className={`p-2 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border text-center ${
                      quickDate === 'thisMonth'
                        ? 'bg-[#D4A33C] text-slate-950 border-[#D4A33C] shadow-lg font-black'
                        : 'bg-white/5 hover:bg-white/10 text-white border-white/10 font-bold'
                    }`}
                  >
                    <span className="text-xs">📊 هذا الشهر</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                      quickDate === 'thisMonth' ? 'bg-slate-950 text-[#D4A33C]' : 'bg-white/10 text-slate-300'
                    }`}>
                      {dateCounts.thisMonth} حصة
                    </span>
                  </button>

                  {/* Last Month */}
                  <button
                    type="button"
                    onClick={() => handleQuickDateChange('lastMonth')}
                    className={`p-2 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border text-center ${
                      quickDate === 'lastMonth'
                        ? 'bg-[#D4A33C] text-slate-950 border-[#D4A33C] shadow-lg font-black'
                        : 'bg-white/5 hover:bg-white/10 text-white border-white/10 font-bold'
                    }`}
                  >
                    <span className="text-xs">🗓️ الشهر الماضي</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                      quickDate === 'lastMonth' ? 'bg-slate-950 text-[#D4A33C]' : 'bg-white/10 text-slate-300'
                    }`}>
                      {dateCounts.lastMonth} حصة
                    </span>
                  </button>

                  {/* Specific Day */}
                  <button
                    type="button"
                    onClick={() => handleQuickDateChange('specificDay')}
                    className={`p-2 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border text-center ${
                      quickDate === 'specificDay'
                        ? 'bg-[#D4A33C] text-slate-950 border-[#D4A33C] shadow-lg font-black'
                        : 'bg-white/5 hover:bg-white/10 text-white border-white/10 font-bold'
                    }`}
                  >
                    <span className="text-xs">🎯 يوم محدد</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                      quickDate === 'specificDay' ? 'bg-slate-950 text-[#D4A33C]' : 'bg-white/10 text-slate-300'
                    }`}>
                      تحديد يوم
                    </span>
                  </button>

                  {/* All Time */}
                  <button
                    type="button"
                    onClick={() => handleQuickDateChange('all')}
                    className={`p-2 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border text-center ${
                      quickDate === 'all' || (!startDate && !endDate && !quickDate)
                        ? 'bg-[#D4A33C] text-slate-950 border-[#D4A33C] shadow-lg font-black'
                        : 'bg-white/5 hover:bg-white/10 text-white border-white/10 font-bold'
                    }`}
                  >
                    <span className="text-xs">🌐 كافة الأوقات</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                      quickDate === 'all' || (!startDate && !endDate && !quickDate) ? 'bg-slate-950 text-[#D4A33C]' : 'bg-white/10 text-slate-300'
                    }`}>
                      الكل ({sessions.filter(s => activeArchiveTab === 'active' ? !s.archived : s.archived).length})
                    </span>
                  </button>
                </div>
              </div>

              {/* Interactive Day & Week Steppers / Navigators */}
              <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
                {/* 1. Daily Stepper Mode (Active when quickDate is today, yesterday, or specificDay) */}
                {(quickDate === 'today' || quickDate === 'yesterday' || quickDate === 'specificDay' || (startDate && endDate && startDate === endDate)) ? (
                  <div className="w-full flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStepDay(-1)}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-white/10"
                        title="اليوم السابق"
                      >
                        <span>◀</span>
                        <span>اليوم السابق</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickDateChange('today')}
                        className="px-2.5 py-1.5 bg-[#D4A33C]/20 hover:bg-[#D4A33C]/30 text-[#D4A33C] border border-[#D4A33C]/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        title="الانتقال لليوم الحالي"
                      >
                        📍 اليوم
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStepDay(1)}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-white/10"
                        title="اليوم التالي"
                      >
                        <span>اليوم التالي</span>
                        <span>▶</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-950/60 border border-white/15 px-3 py-1.5 rounded-xl">
                      <span className="text-[10px] text-slate-400 font-bold">التاريخ المحدد:</span>
                      <input
                        type="date"
                        value={selectedSingleDate || startDate || getLocalDateString()}
                        onChange={e => {
                          const val = e.target.value;
                          setSelectedSingleDate(val);
                          setStartDate(val);
                          setEndDate(val);
                          setQuickDate('specificDay');
                        }}
                        className="bg-transparent text-[#D4A33C] text-xs font-black outline-none cursor-pointer"
                      />
                      <span className="text-[11px] font-extrabold text-white border-r border-white/15 pr-2">
                        {formatArabicDateLong(startDate || selectedSingleDate || getLocalDateString())}
                      </span>
                    </div>
                  </div>
                ) : (quickDate === 'thisWeek' || quickDate === 'lastWeek' || quickDate === 'weekNav') ? (
                  /* 2. Weekly Stepper Mode */
                  <div className="w-full flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStepWeek(-1)}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-white/10"
                        title="الأسبوع السابق"
                      >
                        <span>◀</span>
                        <span>الأسبوع السابق</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickDateChange('thisWeek')}
                        className="px-2.5 py-1.5 bg-[#D4A33C]/20 hover:bg-[#D4A33C]/30 text-[#D4A33C] border border-[#D4A33C]/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        title="الانتقال للأسبوع الحالي"
                      >
                        📍 هذا الأسبوع
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStepWeek(1)}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-white/10"
                        title="الأسبوع القادم"
                      >
                        <span>الأسبوع القادم</span>
                        <span>▶</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-950/60 border border-white/15 px-3 py-1.5 rounded-xl">
                      <span className="text-[10px] text-slate-400 font-bold">نطاق الأسبوع:</span>
                      <span className="text-[11px] font-black text-[#D4A33C]">
                        من السبت {formatArabicShortDate(startDate)} إلى الجمعة {formatArabicShortDate(endDate)}
                      </span>
                      {weekOffset === 0 && (
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                          الأسبوع الحالي 📍
                        </span>
                      )}
                      {weekOffset === -1 && (
                        <span className="text-[9px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold border border-blue-500/30">
                          الأسبوع الماضي 🗓️
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  /* 3. Custom Date Range Pickers */
                  <div className="w-full flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5 bg-slate-950/60 border border-white/15 px-2.5 py-1.5 rounded-xl">
                        <span className="text-[10px] text-slate-300 font-bold">من تاريخ:</span>
                        <input
                          type="date"
                          value={startDate}
                          onChange={e => {
                            setStartDate(e.target.value);
                            setQuickDate('custom');
                          }}
                          className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-950/60 border border-white/15 px-2.5 py-1.5 rounded-xl">
                        <span className="text-[10px] text-slate-300 font-bold">إلى تاريخ:</span>
                        <input
                          type="date"
                          value={endDate}
                          onChange={e => {
                            setEndDate(e.target.value);
                            setQuickDate('custom');
                          }}
                          className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleQuickDateChange('thisMonth')}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <RotateCcw size={12} />
                      <span>إعادة ضبط للشهر الحالي</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Active Filter Metrics Ribbon */}
              <div className="bg-[#D4A33C]/10 border border-[#D4A33C]/30 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-right">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#D4A33C] animate-pulse"></span>
                  <span className="text-[11px] font-extrabold text-slate-200">الفترة المفعلة:</span>
                  <span className="text-xs font-black text-[#D4A33C]">{activePeriodLabel}</span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1 font-bold text-slate-300">
                    <span>📚 الحصص المعروضة:</span>
                    <span className="font-black text-white bg-white/10 px-2 py-0.5 rounded-lg">
                      {filteredAndSortedSessions.length} حركة
                    </span>
                  </div>

                  <div className="flex items-center gap-1 font-bold text-slate-300">
                    <span>⏱️ إجمالي الساعات:</span>
                    <span className="font-black text-[#D4A33C] bg-white/10 px-2 py-0.5 rounded-lg">
                      {totalFilteredHours.toFixed(1)} س
                    </span>
                  </div>

                  <div className="flex items-center gap-1 font-bold text-slate-300">
                    <span>💰 التكلفة / المستحقات:</span>
                    <span className="font-black text-emerald-400 bg-white/10 px-2 py-0.5 rounded-lg">
                      ₪{totalFilteredCost.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 font-bold text-slate-300">
                    <span>👨‍🏫 المعلمون المشاركون:</span>
                    <span className="font-black text-white bg-white/10 px-2 py-0.5 rounded-lg">
                      {filteredTeachersCount} معلم
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Advanced Interactive Search & Filter Bar - Requested by User */}
            <div className="mx-6 mb-4 p-4 bg-gradient-to-br from-slate-50 via-white to-[#D4A33C]/5 border border-slate-200/80 rounded-[2rem] space-y-4 shadow-sm relative z-20">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#0D365A]/5 text-[#0D365A] flex items-center justify-center font-bold">
                    🔍
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-[#0D365A] uppercase tracking-wide">لوحة البحث المتقدم والفلترة التفاعلية الذكية</h4>
                    <p className="text-[9px] font-bold text-slate-400">ابحث بذكاء عن طالب، معلم، أو مادة من خلال القوائم المنسدلة التفاعلية الفورية</p>
                  </div>
                </div>
                {(filterStudentId || filterTeacherId || filterSubject) && (
                  <button
                    onClick={() => {
                      setFilterStudentId('');
                      setFilterTeacherId('');
                      setFilterSubject('');
                      setStudentInputSearch('');
                      setTeacherInputSearch('');
                      setSubjectInputSearch('');
                    }}
                    type="button"
                    className="px-2.5 py-1 text-[9px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-150 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                  >
                    <span>تنظيف فلاتر البحث التفاعلي ✕</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Interactive Student Search */}
                <div className="relative">
                  <label className="block text-[10px] font-black text-slate-500 mb-1.5 mr-1 flex items-center justify-between">
                    <span>🧑‍🎓 اسم أو هاتف الطالب:</span>
                    {filterStudentId && (
                      <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded font-black">نشط ✅</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={
                        filterStudentId 
                          ? students.find(s => s.id === filterStudentId)?.name || 'طالب مفعّل'
                          : "اكتب اسم الطالب أو رقم الهاتف..."
                      }
                      value={studentInputSearch}
                      onChange={(e) => {
                        setStudentInputSearch(e.target.value);
                        setShowStudentDropdown(true);
                      }}
                      onFocus={() => {
                        setShowStudentDropdown(true);
                        setShowTeacherDropdown(false);
                        setShowSubjectDropdown(false);
                      }}
                      className={`w-full text-[11px] font-bold text-right pr-3 pl-8 py-2.5 bg-slate-50/50 border rounded-xl outline-none transition-all placeholder-slate-400 ${
                        filterStudentId 
                          ? 'border-emerald-500 bg-emerald-50/15 focus:ring-2 focus:ring-emerald-500/20 text-emerald-800 font-extrabold' 
                          : 'border-slate-200 focus:border-[#D4A33C] focus:ring-2 focus:ring-[#D4A33C]/20'
                      }`}
                    />
                    {filterStudentId ? (
                      <button
                        onClick={() => {
                          setFilterStudentId('');
                          setStudentInputSearch('');
                        }}
                        type="button"
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-500 hover:text-rose-600 bg-rose-50 p-1 rounded-md transition-all text-[9px] font-black"
                      >
                        إلغاء ✕
                      </button>
                    ) : (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">🔍</span>
                    )}
                  </div>

                  {showStudentDropdown && (
                    <div className="absolute top-full right-0 left-0 z-30 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-50 text-right animate-none">
                      <div className="px-3 py-1.5 bg-slate-50 text-[9px] font-black text-slate-400 flex items-center justify-between">
                        <span>الطلاب المطابقون للاسم أو الهاتف:</span>
                        <span className="text-[8px] font-mono">📱 هاتف / اسم</span>
                      </div>
                      {sortedStudents
                        .filter(s => {
                          if (!studentInputSearch) return true;
                          const q = (studentInputSearch || '').toLowerCase();
                          const cleanQ = q.replace(/[\s\-\+\(\)]/g, '');
                          const sPhone = (s.phone || '').replace(/[\s\-\+\(\)]/g, '');
                          return (
                            (s.name || '').toLowerCase().includes(q) ||
                            (s.phone && s.phone.includes(q)) ||
                            (cleanQ.length >= 2 && sPhone.includes(cleanQ))
                          );
                        })
                        .map(s => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setFilterStudentId(s.id);
                              setStudentInputSearch('');
                              setShowStudentDropdown(false);
                            }}
                            className="w-full text-right px-3 py-2 text-[10.5px] font-bold text-slate-700 hover:bg-amber-50 hover:text-[#0D365A] flex items-center justify-between transition-colors cursor-pointer"
                          >
                            <span className="font-extrabold">{s.name} {s.grade ? `(${s.grade})` : ''}</span>
                            {s.phone && (
                              <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold" dir="ltr">
                                📱 {s.phone}
                              </span>
                            )}
                          </button>
                        ))}
                      {sortedStudents.filter(s => {
                        if (!studentInputSearch) return true;
                        const q = (studentInputSearch || '').toLowerCase();
                        const cleanQ = q.replace(/[\s\-\+\(\)]/g, '');
                        const sPhone = (s.phone || '').replace(/[\s\-\+\(\)]/g, '');
                        return (
                          (s.name || '').toLowerCase().includes(q) ||
                          (s.phone && s.phone.includes(q)) ||
                          (cleanQ.length >= 2 && sPhone.includes(cleanQ))
                        );
                      }).length === 0 && (
                        <div className="px-3 py-3.5 text-center text-[10px] text-slate-400 font-bold">لا يوجد طلاب يطابقون الاسم أو رقم الهاتف</div>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowStudentDropdown(false)}
                        className="w-full text-center py-1.5 text-[9px] font-black text-slate-400 hover:text-slate-650 bg-slate-50 hover:bg-slate-100"
                      >
                        إغلاق القائمة ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Interactive Teacher Search */}
                <div className="relative">
                  <label className="block text-[10px] font-black text-slate-500 mb-1.5 mr-1 flex items-center justify-between">
                    <span>🧑‍🏫 اسم المعلم الشريك:</span>
                    {filterTeacherId && (
                      <span className="text-[9px] text-[#0D365A] bg-blue-50 px-1.5 py-0.2 rounded font-black">نشط ✅</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={
                        filterTeacherId 
                          ? teachers.find(t => t.id === filterTeacherId)?.name || 'معلم مفعّل'
                          : "اكتب للبحث واختيار المعلم..."
                      }
                      value={teacherInputSearch}
                      onChange={(e) => {
                        setTeacherInputSearch(e.target.value);
                        setShowTeacherDropdown(true);
                      }}
                      onFocus={() => {
                        setShowTeacherDropdown(true);
                        setShowStudentDropdown(false);
                        setShowSubjectDropdown(false);
                      }}
                      className={`w-full text-[11px] font-bold text-right pr-3 pl-8 py-2.5 bg-slate-50/50 border rounded-xl outline-none transition-all placeholder-slate-400 ${
                        filterTeacherId 
                          ? 'border-indigo-500 bg-indigo-50/15 focus:ring-2 focus:ring-indigo-500/20 text-indigo-800 font-extrabold' 
                          : 'border-slate-200 focus:border-[#D4A33C] focus:ring-2 focus:ring-[#D4A33C]/20'
                      }`}
                    />
                    {filterTeacherId ? (
                      <button
                        onClick={() => {
                          setFilterTeacherId('');
                          setTeacherInputSearch('');
                        }}
                        type="button"
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-500 hover:text-rose-600 bg-rose-50 p-1 rounded-md transition-all text-[9px] font-black"
                      >
                        إلغاء ✕
                      </button>
                    ) : (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">🔍</span>
                    )}
                  </div>

                  {showTeacherDropdown && (
                    <div className="absolute top-full right-0 left-0 z-30 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-50 text-right animate-none">
                      <div className="px-3 py-1.5 bg-slate-50 text-[9px] font-black text-slate-400">المعلمون المطابقون لبحثك:</div>
                      {teachers
                        .filter(t => !teacherInputSearch || (t.name || '').toLowerCase().includes((teacherInputSearch || '').toLowerCase()))
                        .map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setFilterTeacherId(t.id);
                              setTeacherInputSearch('');
                              setShowTeacherDropdown(false);
                            }}
                            className="w-full text-right px-3 py-2 text-[10.5px] font-bold text-slate-700 hover:bg-amber-50 hover:text-[#0D365A] block transition-colors cursor-pointer"
                          >
                            {t.name}
                          </button>
                        ))}
                      {teachers.filter(t => !teacherInputSearch || (t.name || '').toLowerCase().includes((teacherInputSearch || '').toLowerCase())).length === 0 && (
                        <div className="px-3 py-3.5 text-center text-[10px] text-slate-400 font-bold">لا يوجد نتائج تطابق بحثك</div>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowTeacherDropdown(false)}
                        className="w-full text-center py-1.5 text-[9px] font-black text-slate-400 hover:text-slate-650 bg-slate-50 hover:bg-slate-100"
                      >
                        إغلاق القائمة ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Interactive Subject Search */}
                <div className="relative">
                  <label className="block text-[10px] font-black text-slate-500 mb-1.5 mr-1 flex items-center justify-between">
                    <span>📖 المادة التعليمية المحددة:</span>
                    {filterSubject && (
                      <span className="text-[9px] text-[#D4A33C] bg-amber-50 px-1.5 py-0.2 rounded font-black">نشط ✅</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={
                        filterSubject 
                          ? filterSubject
                          : "اكتب للبحث واختيار المادة..."
                      }
                      value={subjectInputSearch}
                      onChange={(e) => {
                        setSubjectInputSearch(e.target.value);
                        setShowSubjectDropdown(true);
                      }}
                      onFocus={() => {
                        setShowSubjectDropdown(true);
                        setShowStudentDropdown(false);
                        setShowTeacherDropdown(false);
                      }}
                      className={`w-full text-[11px] font-bold text-right pr-3 pl-8 py-2.5 bg-slate-50/50 border rounded-xl outline-none transition-all placeholder-slate-400 ${
                        filterSubject 
                          ? 'border-amber-500 bg-amber-50/15 focus:ring-2 focus:ring-amber-500/20 text-amber-800 font-extrabold' 
                          : 'border-slate-200 focus:border-[#D4A33C] focus:ring-2 focus:ring-[#D4A33C]/20'
                      }`}
                    />
                    {filterSubject ? (
                      <button
                        onClick={() => {
                          setFilterSubject('');
                          setSubjectInputSearch('');
                        }}
                        type="button"
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-500 hover:text-rose-600 bg-rose-50 p-1 rounded-md transition-all text-[9px] font-black"
                      >
                        إلغاء ✕
                      </button>
                    ) : (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">🔍</span>
                    )}
                  </div>

                  {showSubjectDropdown && (
                    <div className="absolute top-full right-0 left-0 z-30 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-50 text-right animate-none">
                      <div className="px-3 py-1.5 bg-slate-50 text-[9px] font-black text-slate-400">المواد التعليمية المطابقة:</div>
                      {uniqueSubjects
                        .filter(sub => !subjectInputSearch || sub.toLowerCase().includes(subjectInputSearch.toLowerCase()))
                        .map(sub => (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => {
                              setFilterSubject(sub);
                              setSubjectInputSearch('');
                              setShowSubjectDropdown(false);
                            }}
                            className="w-full text-right px-3 py-2 text-[10.5px] font-bold text-slate-700 hover:bg-amber-50 hover:text-[#0D365A] block transition-colors cursor-pointer"
                          >
                            {sub}
                          </button>
                        ))}
                      {uniqueSubjects.filter(sub => !subjectInputSearch || sub.toLowerCase().includes(subjectInputSearch.toLowerCase())).length === 0 && (
                        <div className="px-3 py-3.5 text-center text-[10px] text-slate-400 font-bold">لا يوجد نتائج تطابق بحثك</div>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowSubjectDropdown(false)}
                        className="w-full text-center py-1.5 text-[9px] font-black text-slate-400 hover:text-slate-655 bg-slate-50 hover:bg-slate-100"
                      >
                        إغلاق القائمة ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Show helper tips when dropdowns are active */}
              {(showStudentDropdown || showTeacherDropdown || showSubjectDropdown) && (
                <div className="text-[9px] text-[#0D365A] bg-blue-50/50 p-2 rounded-xl font-black text-center animate-none border border-blue-100/30">
                  ⚡ يمكنك تصفح واختيار الاسم المطلوب مباشرة بالضغط عليه من القائمة المنسدلة للتصفية الفورية التفاعلية.
                </div>
              )}
            </div>

            {/* List/Table */}
            <div className="overflow-x-auto text-right flex-1 printable-section">
              {/* Print-Only Beautiful Header */}
              <div className="hidden print:block text-right mb-6 border-b-2 border-slate-300 pb-4" dir="rtl">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-xl font-black text-[#0D365A]">تقرير الحصص الفردية المفصل</h1>
                    <p className="text-xs text-[#D4A33C] font-black mt-1">أكاديمية المعلم المعتمد</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-mono text-slate-500">تاريخ الطباعة: {getLocalDateString()}</p>
                  </div>
                </div>
                
                {/* Active Filters Summary */}
                <div className="mt-4 grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl text-[10px] border border-slate-200">
                  <div>
                    <span className="font-extrabold text-slate-400">الطالب المحدد: </span>
                    <span className="font-black text-slate-800">
                      {filterStudentId ? students.find(s => s.id === filterStudentId)?.name || 'طالب مفعّل' : 'جميع الطلاب'}
                    </span>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-400">المعلم المحدد: </span>
                    <span className="font-black text-slate-800">
                      {filterTeacherId ? teachers.find(t => t.id === filterTeacherId)?.name || 'معلم مفعّل' : 'جميع المعلمين'}
                    </span>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-400">المادة الدراسية: </span>
                    <span className="font-black text-[#D4A33C]">
                      {filterSubject || 'جميع المواد'}
                    </span>
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-400">النطاق التاريخي: </span>
                    <span className="font-black text-slate-800">
                      {startDate && endDate ? `${startDate} إلى ${endDate}` : 'كافة الفترات الزمنية'}
                    </span>
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="mt-3 flex items-center gap-4 text-[11px] font-black">
                  <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg">
                    إجمالي الساعات المفلترة: {totalFilteredHours.toFixed(1)} س
                  </div>
                  <div className="bg-[#D4A33C]/10 border border-[#D4A33C]/20 text-slate-800 px-3 py-1.5 rounded-lg">
                    إجمالي القيمة المالية: ₪{totalFilteredCost.toFixed(0)}
                  </div>
                </div>
              </div>

              <table className="w-full border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-right min-w-[240px] w-[30%]">
                      <button 
                        onClick={() => {
                          if (sortBy === 'student') {
                            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy('student');
                            setSortOrder('asc');
                          }
                        }}
                        className="flex items-center gap-1.5 hover:text-slate-800 transition-colors uppercase font-black"
                      >
                        <span>الطالب الكامل</span>
                        <span className="no-print">
                          {sortBy === 'student' ? (
                            sortOrder === 'asc' ? <ArrowUp size={11} className="text-[#D4A33C]" /> : <ArrowDown size={11} className="text-[#D4A33C]" />
                          ) : (
                            <ArrowUpDown size={11} className="opacity-40" />
                          )}
                        </span>
                      </button>
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-right min-w-[200px] w-[25%]">
                      <button 
                        onClick={() => {
                          if (sortBy === 'teacher') {
                            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy('teacher');
                            setSortOrder('asc');
                          }
                        }}
                        className="flex items-center gap-1.5 hover:text-slate-800 transition-colors uppercase font-black"
                      >
                        <span>المعلم والمادة</span>
                        <span className="no-print">
                          {sortBy === 'teacher' ? (
                            sortOrder === 'asc' ? <ArrowUp size={11} className="text-[#D4A33C]" /> : <ArrowDown size={11} className="text-[#D4A33C]" />
                          ) : (
                            <ArrowUpDown size={11} className="opacity-40" />
                          )}
                        </span>
                      </button>
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-right min-w-[120px]">
                      <button 
                        onClick={() => {
                          if (sortBy === 'hours') {
                            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy('hours');
                            setSortOrder('desc');
                          }
                        }}
                        className="flex items-center gap-1.5 hover:text-slate-800 transition-colors uppercase font-black"
                      >
                        <span>ساعة التدريس</span>
                        <span className="no-print">
                          {sortBy === 'hours' ? (
                            sortOrder === 'asc' ? <ArrowUp size={11} className="text-[#D4A33C]" /> : <ArrowDown size={11} className="text-[#D4A33C]" />
                          ) : (
                            <ArrowUpDown size={11} className="opacity-40" />
                          )}
                        </span>
                      </button>
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 text-left min-w-[150px]">
                      <div className="flex items-center justify-end gap-6">
                        <button 
                          onClick={() => {
                            if (sortBy === 'status') {
                              setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortBy('status');
                              setSortOrder('asc');
                            }
                          }}
                          className="flex items-center gap-1 hover:text-slate-800 transition-colors uppercase font-black"
                        >
                          <span>الحالة</span>
                          <span className="no-print">
                            {sortBy === 'status' ? (
                              sortOrder === 'asc' ? <ArrowUp size={11} className="text-[#D4A33C]" /> : <ArrowDown size={11} className="text-[#D4A33C]" />
                            ) : (
                              <ArrowUpDown size={11} className="opacity-40" />
                            )}
                          </span>
                        </button>
                        <button 
                          onClick={() => {
                            if (sortBy === 'date') {
                              setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortBy('date');
                              setSortOrder('desc');
                            }
                          }}
                          className="flex items-center gap-1 hover:text-slate-800 transition-colors uppercase font-black"
                        >
                          <span>التاريخ <span className="no-print">والإجراء</span></span>
                          <span className="no-print">
                            {sortBy === 'date' ? (
                              sortOrder === 'asc' ? <ArrowUp size={11} className="text-[#D4A33C]" /> : <ArrowDown size={11} className="text-[#D4A33C]" />
                            ) : (
                              <ArrowUpDown size={11} className="opacity-40" />
                            )}
                          </span>
                        </button>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSessions.map(session => {
                    const student = students.find(s => s.id === session.studentId);
                    const teacher = teachers.find(t => t.id === session.teacherId);
                    const cost = session.customFee !== undefined ? session.customFee : ((session.durationHours || 0) * (student?.customRates?.[session.teacherId] !== undefined ? student.customRates[session.teacherId] : (student?.hourlyRate ? student.hourlyRate : (teacher?.billingRate || teacher?.hourlyRate || 0))));
                    
                    const isPendingOver48 = (() => {
                      if (session.approved !== false) return false;
                      const timeBasis = session.createdAt || (session.date ? `${session.date}T00:00:00` : null);
                      if (!timeBasis) return false;
                      const createdTime = new Date(timeBasis).getTime();
                      if (isNaN(createdTime)) return false;
                      const fortyEightHoursInMs = 48 * 60 * 60 * 1000;
                      return (Date.now() - createdTime) > fortyEightHoursInMs;
                    })();

                    return (
                      <tr 
                        key={session.id} 
                        className={`transition-colors duration-150 hover:bg-indigo-50/40 group ${
                          isPendingOver48 ? 'bg-rose-50/40 border-r-4 border-r-rose-500 hover:bg-rose-100/40' : ''
                        }`}
                      >
                        <td className="px-6 py-4 min-w-[240px]">
                          <div className="flex flex-col text-right">
                            <span className="font-black text-slate-900 text-[13px] leading-snug whitespace-normal break-words">{student?.name || 'طالب غير معروف'}</span>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              {student?.phone && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100/90 text-slate-700 text-[9.5px] font-mono font-bold border border-slate-200/60" dir="ltr" title={`رقم هاتف الطالب: ${student.phone}`}>
                                  <Phone size={9} className="text-slate-400" />
                                  <span>{student.phone}</span>
                                </span>
                              )}
                              {student?.grade && (
                                <span className="inline-flex px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-black border border-indigo-100">
                                  {student.grade}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 min-w-[200px]">
                          <div className="flex flex-col text-right">
                            <span className="font-extrabold text-slate-800 text-[12px] leading-snug whitespace-normal break-words">{teacher?.name || 'معلم غير معروف'}</span>
                            {editingSessionId === session.id ? (
                              <div className="flex flex-col gap-1 mt-1">
                                <input 
                                  type="text"
                                  value={editSubjectValue}
                                  onChange={e => setEditSubjectValue(e.target.value)}
                                  className="w-28 px-2 py-1 font-bold bg-slate-50 border border-slate-300 rounded text-[10px] text-slate-950 focus:ring-1 focus:ring-[#D4A33C] outline-none"
                                  placeholder="المادة الدراسية"
                                />
                                <input 
                                  type="text"
                                  value={editTopicValue}
                                  onChange={e => setEditTopicValue(e.target.value)}
                                  className="w-28 px-2 py-1 font-semibold bg-slate-50 border border-slate-300 rounded text-[10px] text-slate-950 focus:ring-1 focus:ring-[#D4A33C] outline-none"
                                  placeholder="الموضوع المشروح"
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col mt-0.5 text-right">
                                <div className="flex flex-wrap items-center gap-1.5 justify-start">
                                  <span className="text-[10px] font-bold text-[#D4A33C]">{session.subject}</span>
                                  {session.approved === false ? (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-750 text-[8px] font-black">
                                      {session.teacherConfirmed ? 'بانتظار اعتماد الإداري' : 'محجوزة مجدولة'}
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[8px] font-black">
                                      منجزة ومعتمدة
                                    </span>
                                  )}
                                  {isPendingOver48 && (
                                    <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[8px] font-black animate-pulse flex items-center gap-1 border border-rose-350">
                                      <span>⚠️ متأخرة (&gt; 48 ساعة)</span>
                                    </span>
                                  )}
                                  {session.financialCategory && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[8px] font-black border border-amber-200">
                                      <span>🏷️</span>
                                      <span>{session.financialCategory}</span>
                                    </span>
                                  )}
                                </div>
                                {session.topic && (
                                  <span className="text-[9px] font-black text-slate-500 mt-1 block max-w-[200px] truncate" title={session.topic}>
                                    الموضوع: {session.topic}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {editingSessionId === session.id ? (
                            <div className="flex flex-col gap-1.5 justify-start">
                              <div className="flex items-center gap-1.5">
                                <input 
                                  type="number" 
                                  step="0.25"
                                  min="0.1"
                                  max="24"
                                  value={editDurationValue}
                                  onChange={e => setEditDurationValue(parseFloat(e.target.value) || 0)}
                                  className="w-16 px-2 py-1 text-center font-black bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-950 focus:ring-1 focus:ring-[#D4A33C] outline-none"
                                />
                                <span className="text-[10px] font-bold text-slate-400">ساعة</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-405 font-bold">₪</span>
                                <input 
                                  type="number" 
                                  placeholder={String(cost)}
                                  value={editCustomFeeValue}
                                  onChange={e => setEditCustomFeeValue(e.target.value)}
                                  className="w-16 px-2 py-1 text-center font-bold bg-slate-50 border border-slate-300 rounded-lg text-[10px] text-slate-950 focus:ring-1 focus:ring-[#D4A33C] outline-none"
                                />
                                <span className="text-[8px] font-bold text-slate-400 shrink-0">فواتير</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-black text-slate-900 text-[12px]">{session.durationHours} س</span>
                                {session.pricingUnit === 'session_40' && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200" title="نظام الحصص (40 دقيقة لكل حصة)">
                                    🎓 {session.sessionCount || 1} حصة (40د)
                                  </span>
                                )}
                              </div>
                              <span className="text-[9px] text-slate-400">تكلفة: ₪{cost}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-left">
                          {editingSessionId === session.id ? (
                            <div className="flex items-center justify-end gap-2 text-left">
                              <input 
                                type="date"
                                value={editDateValue}
                                onChange={e => setEditDateValue(e.target.value)}
                                className="px-2 py-1 font-bold bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-950 focus:ring-1 focus:ring-[#D4A33C] outline-none"
                              />
                              <button 
                                onClick={() => handleUpdateSession(session.id)}
                                type="button"
                                className="p-1.5 bg-[#D4A33C] text-slate-950 rounded-lg hover:bg-[#b88c30] transition-colors"
                                title="حفظ"
                              >
                                <Check size={12} />
                              </button>
                              <button 
                                onClick={() => setEditingSessionId(null)}
                                type="button"
                                className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                                title="إلغاء"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-3">
                              <span className="text-[10px] text-slate-400 font-bold">{formatCustomDate(session.date)}</span>
                              <div className="no-print flex items-center gap-1">
                                <button 
                                  onClick={() => {
                                    setDuplicateConfirm(session);
                                    setDuplicateDate(session.date || getLocalDateString());
                                  }}
                                  type="button"
                                  className="p-1 px-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer flex items-center gap-1"
                                  title="تكرار الحصة"
                                >
                                  <Copy size={11} />
                                  <span className="text-[9px] font-black">تكرار</span>
                                </button>
                                {isManagerUser ? (
                                  <button 
                                    onClick={() => {
                                      setModalEditSession(session);
                                      setModalEditDuration(session.durationHours || 1);
                                      setModalEditPricingUnit(session.pricingUnit || 'hourly');
                                      setModalEditSessionCount(session.sessionCount || 1);
                                      setModalEditDate(session.date || '');
                                      setModalEditStartTime(session.startTime || (session as any).time || '16:00');
                                      setModalEditSubject(session.subject || '');
                                      setModalEditTopic(session.topic || '');
                                      setModalEditCustomFee(session.customFee !== undefined ? String(session.customFee) : '');
                                      setModalEditFinancialCategory(session.financialCategory || '');
                                    }}
                                    type="button"
                                    className="p-1 px-2.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-900 border border-amber-200/60 transition-all cursor-pointer flex items-center gap-1 font-black shadow-xs hover:scale-105 active:scale-95"
                                    title="تعديل وقت وتاريخ الحصة (خاص بمدير المنصة ✏️)"
                                  >
                                    <Pencil size={11} className="text-amber-600" />
                                    <span className="text-[9.5px]">تعديل</span>
                                  </button>
                                ) : (
                                  <span 
                                    className="p-1 px-2 rounded-lg bg-slate-50 text-slate-400 border border-slate-200 text-[9px] font-bold flex items-center gap-1 cursor-not-allowed" 
                                    title="تعديل وقت وتاريخ الحصص محصور بمدير المنصة فقط 🔒"
                                  >
                                    <Lock size={10} />
                                    <span>التعديل للمدير</span>
                                  </span>
                                )}
                                {isManagerUser && (
                                  <button 
                                    onClick={() => {
                                      setEditingSessionId(session.id);
                                      setEditDurationValue(session.durationHours || 1);
                                      setEditDateValue(session.date || '');
                                      setEditSubjectValue(session.subject || '');
                                      setEditTopicValue(session.topic || '');
                                      setEditCustomFeeValue(session.customFee !== undefined ? String(session.customFee) : '');
                                    }}
                                    type="button"
                                    className="p-1 px-2 rounded-lg text-slate-400 hover:text-[#D4A33C] hover:bg-amber-50/50 transition-all cursor-pointer"
                                    title="تعديل سريع بالسطر"
                                  >
                                    <span className="text-[9px] font-bold text-amber-600">سريع</span>
                                  </button>
                                )}
                                {!session.archived && isOlderThanTwoMonths(session.date) && (
                                  <button 
                                    onClick={() => handleArchiveSession(session.id)}
                                    type="button"
                                    className="p-1 px-2 bg-emerald-50 text-emerald-705 hover:bg-emerald-100 hover:text-emerald-800 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-black"
                                    title="أرشفة الحصة (أقدم من شهرين)"
                                  >
                                    <Archive size={11} />
                                    <span className="text-[9px]">أرشفة</span>
                                  </button>
                                )}
                                {session.archived && (
                                  <button 
                                    onClick={() => handleUnarchiveSession(session.id)}
                                    type="button"
                                    className="p-1 px-2 bg-indigo-50 text-indigo-705 hover:bg-indigo-100 hover:text-indigo-800 rounded-lg transition-all cursor-pointer flex items-center gap-1 font-black"
                                    title="إلغاء أرشفة الحصة"
                                  >
                                    <RotateCcw size={11} />
                                    <span className="text-[9px]">استعادة</span>
                                  </button>
                                )}
                                <button 
                                  onClick={() => deleteSession(session.id)}
                                  type="button"
                                  className="p-1 px-2.5 rounded-lg bg-rose-50/70 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-150 hover:border-rose-600 transition-all duration-200 cursor-pointer flex items-center gap-1 font-black shadow-xs hover:shadow-md hover:scale-105 active:scale-95 group/del"
                                  title="حذف الحصة المنجزة نهائياً واسترداد الرصيد"
                                >
                                  <Trash2 size={12} className="transition-transform group-hover/del:scale-110" />
                                  <span className="text-[9.5px]">حذف</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  
                  {filteredSessions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-24 text-center opacity-30">
                        <Calendar size={44} className="mx-auto mb-3" />
                        <p className="text-xs font-black">لا توجد حركات حضور مطابقة لتصفية البحث المحددة</p>
                      </td>
                    </tr>
                  )}

                  {filteredSessions.length > 0 && (
                    <tr className="bg-[#0D365A]/5 font-black border-t-2 border-[#0D365A]/10">
                      <td className="px-6 py-4 text-[12px] text-[#0D365A] font-black" colSpan={2}>
                        <div className="flex items-center gap-2">
                          <span className="text-base">📊</span>
                          <span>إجمالي الإحصائيات للتصفية الحالية:</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-[14px] font-black text-[#0D365A] font-mono">
                            {filteredSessions.reduce((acc, s) => acc + (s.durationHours || 0), 0)} س
                          </span>
                          <span className="text-[9px] text-slate-500 font-extrabold">إجمالي الساعات المسجلة</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-left">
                        <div className="flex flex-col items-end">
                          <span className="text-[13px] font-black text-[#D4A33C] font-mono">
                            ₪{filteredSessions.reduce((acc, s) => {
                              const student = students.find(stud => stud.id === s.studentId);
                              const teacher = teachers.find(t => t.id === s.teacherId);
                              const cost = s.customFee !== undefined ? s.customFee : ((s.durationHours || 0) * (student?.customRates?.[s.teacherId] !== undefined ? student.customRates[s.teacherId] : (student?.hourlyRate ? student.hourlyRate : (teacher?.billingRate || teacher?.hourlyRate || 0))));
                              return acc + cost;
                            }, 0).toLocaleString()}
                          </span>
                          <span className="text-[9px] text-slate-500 font-extrabold">إجمالي التكلفة المالية</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Secure Delete Governance Confirmation Pop-up */}
      {deleteConfirm && (() => {
        const sessionToDelete = sessions.find(s => s.id === deleteConfirm.id);
        const student = students.find(s => s.id === sessionToDelete?.studentId);
        const teacher = teachers.find(t => t.id === sessionToDelete?.teacherId);
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[150] p-4 text-right" dir="rtl">
            <div className="bg-white rounded-[2rem] max-w-md w-full p-6 border border-slate-100 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-rose-600 leading-none">تأكيد حذف الحصة نهائياً ⚠️</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">صلاحية مدير المنصة - إلغاء تسجيل الحصة واسترداد الرصيد</p>
                </div>
              </div>

              {sessionToDelete && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60 space-y-2 text-xs font-bold text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-400">الطالب:</span>
                    <span className="text-slate-900 font-black">{student?.name || 'غير محدد'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">معلم المادة:</span>
                    <span className="text-blue-900 font-black">{teacher?.name || 'غير محدد'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">المادة والمدة:</span>
                    <span>{sessionToDelete.subject || 'عام'} ({sessionToDelete.durationHours} ساعة)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">التاريخ:</span>
                    <span>{sessionToDelete.date}</span>
                  </div>
                </div>
              )}

              <p className="text-xs font-bold text-slate-600 leading-relaxed bg-amber-50 p-2.5 rounded-xl border border-amber-200/60 text-amber-900">
                ⚠️ سيؤدي حذف الحصة إلى إلغاء خصمها من رصيد الطالب تلقائياً وإلغاء استحقاقها المالي.
              </p>

              <div className="flex gap-2.5 justify-end">
                <button
                  onClick={async () => {
                    const { id } = deleteConfirm;
                    setDeleteConfirm(null);
                    await executeDeleteSession(id);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-rose-650/10 text-center"
                >
                  تأكيد حذف الحصة
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
        );
      })()}

      {/* Duplicate Session Confirmation Pop-up */}
      {duplicateConfirm && (() => {
        const student = students.find(s => s.id === duplicateConfirm.studentId);
        const teacher = teachers.find(t => t.id === duplicateConfirm.teacherId);
        const rate = student?.customRates?.[duplicateConfirm.teacherId] !== undefined
          ? student.customRates[duplicateConfirm.teacherId]
          : (student?.hourlyRate ? student.hourlyRate : (teacher?.billingRate || teacher?.hourlyRate || 0));
        const cost = duplicateConfirm.customFee !== undefined ? duplicateConfirm.customFee : (duplicateConfirm.durationHours || 1) * rate;
        const balance = getStudentBalance(duplicateConfirm.studentId);

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[150] p-4 text-right" dir="rtl">
            <div className="bg-white rounded-[2rem] max-w-md w-full p-6 border border-slate-100 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Copy size={20} />
              </div>
              <div className="space-y-3">
                <h3 className="text-base font-black text-indigo-900 leading-none">تكرار تسجيل الحصة 🔁</h3>
                <p className="text-xs font-bold text-slate-600 leading-relaxed">
                  سيتم إنشاء وتكرار حصة جديدة معتمدة ومنجزة فورًا بناءً على البيانات التالية:
                </p>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">الطالب:</span>
                    <strong className="text-slate-800">{student?.name || 'غير معروف'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">المعلم:</span>
                    <strong className="text-slate-800">{teacher?.name || 'غير معروف'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">المادة:</span>
                    <strong className="text-[#D4A33C] font-black">{duplicateConfirm.subject}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">المدة والتكلفة:</span>
                    <strong className="text-slate-800">{duplicateConfirm.durationHours} ساعة (₪{cost})</strong>
                  </div>
                  <div className="flex justify-between border-t border-slate-200/60 pt-1.5 mt-1">
                    <span className="text-slate-400">الحصص المتبقية للطالب:</span>
                    <strong className={balance < cost ? 'text-rose-600 font-extrabold' : 'text-emerald-600 font-extrabold'}>{formatRemainingSessionsText(balance, cost)}</strong>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1">تحديد تاريخ الحصة المكررة:</label>
                  <input 
                    type="date" 
                    value={duplicateDate} 
                    onChange={e => setDuplicateDate(e.target.value)} 
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs focus:ring-1 focus:ring-[#D4A33C]" 
                  />
                </div>
              </div>
              <div className="flex gap-2.5 justify-end pt-1">
                <button
                  onClick={async () => {
                    await executeDuplicateSession(duplicateConfirm, duplicateDate);
                  }}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black transition-all cursor-pointer shadow-md text-center flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Copy size={11} />
                      <span>تأكيد التكرار الفوري</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setDuplicateConfirm(null)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-black transition-all cursor-pointer text-center disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit Session Popup Modal */}
      {modalEditSession && (() => {
        const student = students.find(s => s.id === modalEditSession.studentId);
        const teacher = teachers.find(t => t.id === modalEditSession.teacherId);
        
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[150] p-4 text-right" dir="rtl">
            <div className="bg-white rounded-[2rem] max-w-md w-full p-6 border border-slate-100 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-[#D4A33C]">
                <Pencil size={20} />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-base font-black text-slate-900 leading-none">تعديل معلومات الحصة ✏️</h3>
                <p className="text-xs font-bold text-slate-500 leading-relaxed">
                  تعديل تفاصيل الحصة الخاصة بالطالب <strong className="text-slate-800">{student?.name || 'غير معروف'}</strong> مع المعلم <strong className="text-slate-800">{teacher?.name || 'غير معروف'}</strong>.
                </p>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
                        <Clock size={13} className="text-slate-500" />
                        <span>برنامج احتساب الحصة:</span>
                      </label>
                      <span className="text-[10px] font-black text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                        👑 صلاحية المدير فقط
                      </span>
                    </div>

                    {isManagerUser ? (
                      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setModalEditPricingUnit('hourly')}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            modalEditPricingUnit === 'hourly'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          ⏱️ نظام الساعات (60 د)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setModalEditPricingUnit('session_40');
                            setModalEditDuration(Number(((modalEditSessionCount * 40) / 60).toFixed(2)));
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            modalEditPricingUnit === 'session_40'
                              ? 'bg-[#0D365A] text-white shadow-xs'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          🎓 حصص (40 دقيقة)
                        </button>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-700 flex items-center justify-between">
                        <span>{modalEditPricingUnit === 'session_40' ? '🎓 نظام الحصص (40 دقيقة)' : '⏱️ نظام الساعات (60 دقيقة)'}</span>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Lock size={11} className="text-amber-600" /> صلاحية المدير فقط
                        </span>
                      </div>
                    )}
                  </div>

                  {modalEditPricingUnit === 'session_40' && (
                    <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between">
                      <span className="text-xs font-black text-indigo-950">عدد الحصص (40 د):</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4].map(cnt => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => {
                              setModalEditSessionCount(cnt);
                              setModalEditDuration(Number(((cnt * 40) / 60).toFixed(2)));
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                              modalEditSessionCount === cnt
                                ? 'bg-[#0D365A] text-white border-[#0D365A]'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {cnt}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1">المادة الدراسية:</label>
                      <input 
                        type="text"
                        value={modalEditSubject}
                        onChange={e => setModalEditSubject(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs focus:ring-1 focus:ring-[#D4A33C]"
                        placeholder="المادة الدراسية"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1">
                        {modalEditPricingUnit === 'session_40' ? 'المدة المعادلة (ساعات):' : 'ساعات الحصة:'}
                      </label>
                      <input 
                        type="number"
                        step="0.25"
                        min="0.1"
                        max="24"
                        value={modalEditDuration}
                        onChange={e => setModalEditDuration(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs focus:ring-1 focus:ring-[#D4A33C]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-1 flex items-center gap-1">
                        <Calendar size={12} className="text-[#D4A33C]" />
                        <span>تاريخ الحصة / الإدخال:</span>
                      </label>
                      <input 
                        type="date"
                        value={modalEditDate}
                        onChange={e => setModalEditDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs focus:ring-1 focus:ring-[#D4A33C]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-1 flex items-center gap-1">
                        <Clock size={12} className="text-[#D4A33C]" />
                        <span>وقت / توقيت الحصة:</span>
                      </label>
                      <input 
                        type="time"
                        value={modalEditStartTime}
                        onChange={e => setModalEditStartTime(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs focus:ring-1 focus:ring-[#D4A33C]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1">ملاحظات الحصة / الموضوع المشروح:</label>
                    <textarea 
                      value={modalEditTopic}
                      onChange={e => setModalEditTopic(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs focus:ring-1 focus:ring-[#D4A33C] resize-none"
                      placeholder="أدخل موضوع الحصة أو ملاحظات إضافية..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1">رسوم مخصصة (اختياري):</label>
                    <div className="relative">
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">₪</span>
                      <input 
                        type="number"
                        value={modalEditCustomFee}
                        onChange={e => setModalEditCustomFee(e.target.value)}
                        className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs focus:ring-1 focus:ring-[#D4A33C]"
                        placeholder="استخدام السعر التلقائي"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-1 flex items-center gap-1">
                        <Tags size={11} className="text-[#D4A33C]" />
                        <span>التصنيف المالي المخصص:</span>
                      </label>
                      {modalEditFinancialCategory && (
                        <button
                          type="button"
                          onClick={() => setModalEditFinancialCategory('')}
                          className="text-[9px] text-rose-500 hover:text-rose-700 cursor-pointer underline"
                        >
                          إزالة التصنيف
                        </button>
                      )}
                    </div>
                    <select
                      value={modalEditFinancialCategory}
                      onChange={e => setModalEditFinancialCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-xs focus:ring-1 focus:ring-[#D4A33C] cursor-pointer"
                    >
                      <option value="">-- بدون تصنيف مالي مخصص --</option>
                      {(globalSettings.financialCategories || DEFAULT_FINANCIAL_CATEGORIES)
                        .filter(c => c.isActive && (c.type === 'session' || c.type === 'both'))
                        .map(cat => (
                          <option key={cat.id} value={cat.name}>
                            {cat.icon || '🏷️'} {cat.name} {cat.defaultAmount ? `(₪${cat.defaultAmount})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  onClick={handleSaveModalEditSession}
                  disabled={isSubmittingModalEdit}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[11px] font-black transition-all cursor-pointer shadow-md text-center flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingModalEdit ? (
                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={11} />
                      <span>حفظ التعديلات</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setModalEditSession(null)}
                  disabled={isSubmittingModalEdit}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-black transition-all cursor-pointer text-center disabled:opacity-50"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
    </div>
  );
}
