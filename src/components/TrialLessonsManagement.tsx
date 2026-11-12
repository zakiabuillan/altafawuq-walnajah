import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot, where, arrayUnion, setDoc } from 'firebase/firestore';
import { Teacher, TrialLesson, StudentStatus } from '../types';
import { 
  Calendar, CalendarPlus, User, Phone, BookOpen, Clock, CheckCircle2, AlertCircle, Trash2, Plus, 
  HelpCircle, Sparkles, Filter, Check, Play, BookOpenCheck, ListOrdered, UserPlus, Mail, DollarSign, AlertTriangle,
  Lock, Key, Copy, X, UserCheck, ExternalLink, Users, LayoutGrid, Table as TableIcon, ChevronDown, ChevronUp, Share2, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { logActivity } from '../lib/activityLogger';
import { notifyTeacherOnStudentPlacement } from '../lib/notificationUtils';
import { formatWhatsAppPhone972, cleanLocalPhoneDigits, getWhatsAppApiNumber } from '../lib/phoneUtils';
import { filterTeachersBySubject, isTeacherTeachingSubject } from '../lib/subjectTeacherMatcher';
import { findDuplicateStudent } from '../lib/studentValidation';

export default function TrialLessonsManagement() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [trialLessons, setTrialLessons] = useState<TrialLesson[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showBookModal, setShowBookModal] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [grade, setGrade] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [showAllTeachersOverride, setShowAllTeachersOverride] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [justBookedTrialInfo, setJustBookedTrialInfo] = useState<{
    studentName: string;
    grade: string;
    subject: string;
    topic: string;
    phone: string;
    teacherName: string;
    teacherPhone: string;
  } | null>(null);

  // Promotion/Migration to Student Form State
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedTrialForPromotion, setSelectedTrialForPromotion] = useState<TrialLesson | null>(null);
  const [promoteName, setPromoteName] = useState('');
  const [promoteGrade, setPromoteGrade] = useState('');
  const [promotePhone, setPromotePhone] = useState('');
  const [promoteTeacherId, setPromoteTeacherId] = useState('');
  const [promoteGender, setPromoteGender] = useState<'Male' | 'Female'>('Male');
  const [promoteEmail, setPromoteEmail] = useState('');
  const [promoteHourlyRate, setPromoteHourlyRate] = useState<string>('0');
  const [promoteInitialPayment, setPromoteInitialPayment] = useState<string>('');
  const [promoteNotes, setPromoteNotes] = useState('');
  const [promoteLowBalanceThreshold, setPromoteLowBalanceThreshold] = useState<string>('-100');
  const [promoteIsOpenBalance, setPromoteIsOpenBalance] = useState(false);
  const [isPromoting, setIsPromoting] = useState(false);
  const [promoteStatus, setPromoteStatus] = useState<StudentStatus>(StudentStatus.Assigned);
  const [promoteActivateAccount, setPromoteActivateAccount] = useState(true);
  const [createdStudentAccount, setCreatedStudentAccount] = useState<{username: string, password: string, studentName: string, studentId?: string} | null>(null);
  const [migratedSuccessInfo, setMigratedSuccessInfo] = useState<{
    studentId: string;
    studentName: string;
    teacherName: string;
    status: StudentStatus;
  } | null>(null);

  const handleNavigateToStudent = (studentId: string) => {
    localStorage.setItem('focus-student-id', studentId);
    window.dispatchEvent(new CustomEvent('switch-manager-tab', { detail: { tab: 'students' } }));
  };

  // Filters & Classification State
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [teacherFilter, setTeacherFilter] = useState<'all' | 'unassigned' | string>('all');
  const [viewMode, setViewMode] = useState<'by-teacher' | 'table'>('by-teacher');
  const [collapsedTeachers, setCollapsedTeachers] = useState<Record<string, boolean>>({});
  const [showZeroLessonsTeachers, setShowZeroLessonsTeachers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCalendarTrialId, setActiveCalendarTrialId] = useState<string | null>(null);
  const [trialScheduleDates, setTrialScheduleDates] = useState<{[key: string]: string}>({});
  const [trialScheduleTimes, setTrialScheduleTimes] = useState<{[key: string]: string}>({});
  const [isPlayingCalendarLoader, setIsPlayingCalendarLoader] = useState<string | null>(null);

  useEffect(() => {
    const checkFocusSearch = () => {
      const focusSearch = localStorage.getItem('focus-trial-lesson-search');
      if (focusSearch) {
        setSearchQuery(focusSearch);
        setStatusFilter('all');
        localStorage.removeItem('focus-trial-lesson-search');
      }
    };
    checkFocusSearch();
    window.addEventListener('focus-trial-search', checkFocusSearch);
    return () => {
      window.removeEventListener('focus-trial-search', checkFocusSearch);
    };
  }, []);

  // Fetch/watch data in real-time on mount
  useEffect(() => {
    setLoading(true);
    
    // Subscribe to Teachers
    const unsubscribeTeachers = onSnapshot(
      collection(db, 'teachers'),
      (snap) => {
        const teachersList: Teacher[] = [];
        snap.forEach((d) => {
          teachersList.push({ id: d.id, ...d.data() } as Teacher);
        });
        setTeachers(teachersList);
      },
      (error) => {
        console.error("Error watching teachers:", error);
      }
    );

    // Subscribe to Trial Lessons (try ordered first)
    const trialsQuery = query(collection(db, 'trialLessons'), orderBy('createdAt', 'desc'));
    let unsubscribeFallback: (() => void) | null = null;

    const unsubscribeTrials = onSnapshot(
      trialsQuery,
      (snap) => {
        const trialsList: TrialLesson[] = [];
        snap.forEach((d) => {
          trialsList.push({ id: d.id, ...d.data() } as TrialLesson);
        });
        setTrialLessons(trialsList);
        setLoading(false);
      },
      (error) => {
        console.error("Error watching trialLessons (ordered), attempting fallback:", error);
        // Fallback subscription if order-by is not indexed or permitted
        unsubscribeFallback = onSnapshot(
          collection(db, 'trialLessons'),
          (snap) => {
            const fallbackList: TrialLesson[] = [];
            snap.forEach((d) => {
              fallbackList.push({ id: d.id, ...d.data() } as TrialLesson);
            });
            setTrialLessons(fallbackList.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')));
            setLoading(false);
          },
          (e) => {
            console.error("Error watching trialLessons fallback:", e);
            handleFirestoreError(e, OperationType.READ, 'trialLessons');
            setLoading(false);
          }
        );
      }
    );

    return () => {
      unsubscribeTeachers();
      unsubscribeTrials();
      if (unsubscribeFallback) {
        (unsubscribeFallback as any)();
      }
    };
  }, []);

  const fetchData = async () => {
    // No-op because real-time subscription is active and automates state updates instantly
  };

  // Dynamically extract all available subjects based on teachers' specializations & listed subjects
  const availableSubjects = useMemo(() => {
    const subjectsSet = new Set<string>();
    
    // Default core subjects popular in the academy
    const defaultSubjects = ['رياضيات', 'فيزياء', 'كيمياء', 'لغة إنجليزية', 'لغة عربية', 'تاريخ (بجروت)', 'حاسوب'];
    defaultSubjects.forEach(s => subjectsSet.add(s));

    teachers.forEach(t => {
      if (t.specialization) {
        subjectsSet.add(t.specialization);
      }
      if (Array.isArray(t.subjects)) {
        t.subjects.forEach(sub => subjectsSet.add(sub));
      }
    });

    return Array.from(subjectsSet).filter(Boolean);
  }, [teachers]);

  // Dynamically filter teachers list based on selected subject to show only matching teachers
  const filteredTeachersForSubject = useMemo(() => {
    if (showAllTeachersOverride || !subject) return teachers;
    return filterTeachersBySubject(teachers, subject);
  }, [teachers, subject, showAllTeachersOverride]);

  // Automatically handle resets when subject/teachers change
  useEffect(() => {
    if (selectedTeacherId && subject && !showAllTeachersOverride) {
      const isSelectedTeaching = filteredTeachersForSubject.some(t => t.id === selectedTeacherId);
      if (!isSelectedTeaching) {
        setSelectedTeacherId('');
      }
    }
  }, [filteredTeachersForSubject, selectedTeacherId, subject, showAllTeachersOverride]);

  const closeBookModal = () => {
    setShowBookModal(false);
    setErrorMessage('');
    setSuccessMessage('');
    setJustBookedTrialInfo(null);
    setStudentName('');
    setGrade('');
    setSubject('');
    setTopic('');
    setPhone('');
    setSelectedTeacherId('');
    setShowAllTeachersOverride(false);
  };

  // Handlers
  const handleBookTrialLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanDigits = cleanLocalPhoneDigits(phone);
    if (!studentName.trim() || !grade || !subject || !cleanDigits || !selectedTeacherId) {
      setErrorMessage('يرجى ملء جميع الحقول المطلوبة واختيار المعلم المرشح.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    
    const nominatedTeacher = teachers.find(t => t.id === selectedTeacherId);
    if (!nominatedTeacher) {
      setErrorMessage('المعلم المختار غير موجود بالنظام.');
      setIsSubmitting(false);
      return;
    }

    const finalPhone = formatWhatsAppPhone972(phone);

    try {
      const newTrialDoc = {
        studentName,
        grade,
        subject,
        topic: topic || 'حصة تجريبية مخصصة',
        phone: finalPhone,
        teacherId: selectedTeacherId,
        teacherName: nominatedTeacher.name,
        status: 'pending' as const,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'trialLessons'), newTrialDoc);

      // Trigger instant placement notification for the assigned teacher
      try {
        await notifyTeacherOnStudentPlacement({
          teacherId: selectedTeacherId,
          studentName: studentName.trim(),
          studentGrade: grade.trim(),
          studentPhone: finalPhone,
          subject: subject || 'عام',
          topic: topic.trim() || 'حصة تجريبية مخصصة',
          source: 'trial_booking',
          title: `📅 تم تنسيب وحجز حصة تجريبية للطالب "${studentName.trim()}" معك`
        });
      } catch (notifErr) {
        console.warn('Failed to notify teacher on trial booking:', notifErr);
      }
      
      setJustBookedTrialInfo({
        studentName,
        grade,
        subject,
        topic: topic || 'حصة تجريبية مخصصة',
        phone,
        teacherName: nominatedTeacher.name,
        teacherPhone: nominatedTeacher.phone || ''
      });

      setSuccessMessage('🎉 تم حجز الحصة التجريبية بنجاح وتوجيهها للمعلّم!');
      
      // Do not auto-close immediately, so user can click WhatsApp share button.
      // But we can reset form inputs (not success message or justBookedTrialInfo)
      setStudentName('');
      setGrade('');
      setSubject('');
      setTopic('');
      setPhone('');
      setSelectedTeacherId('');

    } catch (err: any) {
      console.error("Error creating trial lesson:", err);
      setErrorMessage('تعذر إنشاء الحجة التجريبية: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTrialLesson = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف طلب الحصة التجريبية هذا؟')) return;
    try {
      await deleteDoc(doc(db, 'trialLessons', id));
      fetchData();
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  const handleSaveTrialToCalendar = async (trialId: string, dateValue: string, timeValue: string) => {
    if (!dateValue) {
      alert("الرجاء اختيار تاريخ مجدول لإضافة الحصة للتقويم!");
      return;
    }
    setIsPlayingCalendarLoader(trialId);
    try {
      const docRef = doc(db, 'trialLessons', trialId);
      const timeStr = timeValue ? `, في تمام الساعة: ${timeValue}` : "";
      const displayTime = `اللقاء المجدول بتاريخ: ${dateValue}${timeStr}`;
      
      await updateDoc(docRef, {
        scheduledDate: dateValue,
        scheduledTime: displayTime
      });
      
      setActiveCalendarTrialId(null);
    } catch (err) {
      console.error("Error saving trial to calendar: ", err);
    } finally {
      setIsPlayingCalendarLoader(null);
    }
  };

  const handleUpdateTrialStatus = async (trialId: string, newStatus: 'pending' | 'completed') => {
    try {
      const docRef = doc(db, 'trialLessons', trialId);
      await updateDoc(docRef, {
        status: newStatus
      });
    } catch (err: any) {
      console.error("Error updating trial status:", err);
    }
  };

  const handleAssignTeacherToTrial = async (trialId: string, newTeacherId: string) => {
    try {
      const docRef = doc(db, 'trialLessons', trialId);
      const chosenTeacher = teachers.find(t => t.id === newTeacherId);
      await updateDoc(docRef, {
        teacherId: newTeacherId || null,
        teacherName: chosenTeacher ? chosenTeacher.name : 'بانتظار تنسيب المعلم',
        teacherPhone: chosenTeacher?.phone || ''
      });
      if (chosenTeacher) {
        logActivity('تنسيب معلم للحصة التجريبية', `تم تنسيب الحصة التجريبية للمعلم: ${chosenTeacher.name}`, 'manager');
      }
    } catch (err: any) {
      console.error("Error assigning teacher to trial:", err);
    }
  };

  const handleInitiatePromote = (trial: TrialLesson) => {
    setSelectedTrialForPromotion(trial);
    setPromoteName(trial.studentName || '');
    setPromoteGrade(trial.grade || '');
    setPromotePhone(cleanLocalPhoneDigits(trial.phone || ''));

    // Intelligent teacher matching by id, username, or name
    const matchedTeacher = teachers.find(t => 
      (trial.teacherId && (t.id === trial.teacherId || t.username === trial.teacherId)) || 
      (trial.teacherName && (t.name === trial.teacherName || t.name.trim() === trial.teacherName.trim()))
    );
    setPromoteTeacherId(matchedTeacher?.id || trial.teacherId || '');
    setPromoteGender('Male');
    setPromoteEmail('');
    setPromoteHourlyRate('0');
    setPromoteInitialPayment('');
    setPromoteNotes(`تم ترحيل الطالب تلقائياً من الحصة التجريبية بموضوع الحصة: ${trial.topic || '(غير محدد)'}`);
    setPromoteLowBalanceThreshold('-100');
    setPromoteIsOpenBalance(false);
    setPromoteStatus(StudentStatus.Assigned);
    setPromoteActivateAccount(true);
    setCreatedStudentAccount(null);
    setShowPromoteModal(true);
  };

  const handleExecutePromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoteName.trim() || !promoteTeacherId) {
      alert('الرجاء إدخال اسم الطالب واختيار معلم منسّب.');
      return;
    }

    setIsPromoting(true);
    const path = 'students';
    try {
      // 1. Strict Duplicate Check: Prevent duplicate student if name AND phone match
      const allStudentsSnap = await getDocs(collection(db, path));
      const existingStudents = allStudentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const foundDuplicate = findDuplicateStudent(promoteName, promotePhone, existingStudents as any);

      const q = query(collection(db, path), where('name', '==', promoteName.trim()));
      const querySnapshot = await getDocs(q);

      const thresholdVal = promoteLowBalanceThreshold !== '' && !isNaN(Number(promoteLowBalanceThreshold))
        ? Number(promoteLowBalanceThreshold)
        : -100;

      let studentId = '';
      let generatedUsername = '';
      let generatedPassword = '';
      const finalPromotePhone = formatWhatsAppPhone972(promotePhone);

      if (promoteActivateAccount) {
        const cleanPhone = cleanLocalPhoneDigits(promotePhone);
        const suffix = cleanPhone || Math.random().toString(36).substring(2, 8);
        generatedUsername = `student_${suffix}`;
        generatedPassword = Math.floor(100000 + Math.random() * 900000).toString();
      }

      const existingDocRef = foundDuplicate 
        ? doc(db, path, foundDuplicate.id!) 
        : (!querySnapshot.empty ? querySnapshot.docs[0].ref : null);

      if (existingDocRef) {
        // Exists: merge/link the teacher and update rather than creating a duplicate
        studentId = existingDocRef.id;
        const targetDocSnap = foundDuplicate 
          ? allStudentsSnap.docs.find(d => d.id === foundDuplicate.id!)
          : querySnapshot.docs[0];
        const sData = targetDocSnap?.data();

        const updatePayload: any = {
          teacherId: promoteTeacherId,
          assignedTeacherId: promoteTeacherId
        };
        if (!sData?.teachers?.includes(promoteTeacherId)) {
          updatePayload.teachers = arrayUnion(promoteTeacherId);
        }
        if (selectedTrialForPromotion?.id) {
          updatePayload.migratedFromTrialId = selectedTrialForPromotion.id;
        }
        if (promoteGrade) {
          updatePayload.grade = promoteGrade.trim();
          updatePayload.academicLevel = promoteGrade.trim();
        }
        updatePayload.lowBalanceThreshold = thresholdVal;
        updatePayload.phone = finalPromotePhone;
        if (promoteEmail.trim()) updatePayload.email = promoteEmail.trim();
        updatePayload.gender = promoteGender;
        if (promoteNotes.trim()) {
          const prevNotes = sData?.notes ? sData.notes + '\n' : '';
          updatePayload.notes = prevNotes + promoteNotes.trim();
        }
        updatePayload.isOpenBalance = promoteIsOpenBalance;
        if (promoteHourlyRate !== '') updatePayload.hourlyRate = Number(promoteHourlyRate);
        
        // Update status as selected by the user (Assigned/Pending)
        updatePayload.status = promoteStatus;

        if (promoteActivateAccount) {
          updatePayload.username = sData?.username || generatedUsername;
          updatePayload.password = sData?.password || generatedPassword;
          generatedUsername = updatePayload.username;
          generatedPassword = updatePayload.password;
        }

        await updateDoc(docRef.ref, updatePayload);
      } else {
        // Create brand new student
        const studentPayload: any = { 
          name: promoteName.trim(), 
          teachers: [promoteTeacherId],
          teacherId: promoteTeacherId,
          assignedTeacherId: promoteTeacherId,
          migratedFromTrialId: selectedTrialForPromotion?.id || '',
          lowBalanceThreshold: thresholdVal,
          phone: finalPromotePhone,
          email: promoteEmail.trim(),
          gender: promoteGender,
          notes: promoteNotes.trim(),
          isOpenBalance: promoteIsOpenBalance,
          hourlyRate: promoteHourlyRate === '' ? 0 : Number(promoteHourlyRate),
          registrationDate: new Date().toISOString().split('T')[0],
          academicStatus: 'Active',
          status: promoteStatus,
          archived: false,
          balance: 0
        };
        if (promoteGrade) {
          studentPayload.grade = promoteGrade.trim();
          studentPayload.academicLevel = promoteGrade.trim();
        }

        if (promoteActivateAccount) {
          studentPayload.username = generatedUsername;
          studentPayload.password = generatedPassword;
        }

        const docRef = await addDoc(collection(db, path), studentPayload);
        studentId = docRef.id;
      }

      // Ensure assignment relation exists in assignments collection
      if (promoteTeacherId && studentId) {
        try {
          const qAssign = query(collection(db, 'assignments'), where('studentId', '==', studentId), where('teacherId', '==', promoteTeacherId));
          const assignSnap = await getDocs(qAssign);
          if (assignSnap.empty) {
            await addDoc(collection(db, 'assignments'), {
              studentId: studentId,
              teacherId: promoteTeacherId,
              createdAt: new Date().toISOString()
            });
          }
        } catch (assignErr) {
          console.warn('Assignment doc creation warning:', assignErr);
        }
      }

      // If account activation is requested, create/update the document in the studentAccounts collection
      if (promoteActivateAccount && studentId) {
        const accountRef = doc(db, 'studentAccounts', studentId);
        await setDoc(accountRef, {
          id: studentId,
          studentId: studentId,
          studentName: promoteName.trim(),
          username: generatedUsername,
          password: generatedPassword,
          createdAt: new Date().toISOString(),
          isActive: true
        });

        // Set to state to display credentials modal
        setCreatedStudentAccount({
          username: generatedUsername,
          password: generatedPassword,
          studentName: promoteName.trim(),
          studentId: studentId
        });
      }

      // 2. Add cash payment record if filled out
      if (promoteInitialPayment && !isNaN(Number(promoteInitialPayment)) && Number(promoteInitialPayment) > 0 && studentId) {
        const creditData = {
          studentId,
          amount: Number(promoteInitialPayment),
          date: new Date().toISOString().split('T')[0],
          note: `الرصيد الافتتاحي المالي (شحن رصيد عند ترحيل الطالب من الحصة التجريبية)`
        };
        await addDoc(collection(db, 'studentCredits'), creditData);

        // Update student's balance in Firestore
        const docRef = doc(db, 'students', studentId);
        await updateDoc(docRef, {
          balance: Number(promoteInitialPayment)
        });
      }

      // 3. Mark the trial lesson status as completed
      if (selectedTrialForPromotion) {
        const trialRef = doc(db, 'trialLessons', selectedTrialForPromotion.id);
        await updateDoc(trialRef, {
          status: 'completed',
          migratedToStudentId: studentId
        });
      }

      // 4. Log Activity
      await logActivity({
        actionType: 'TRIAL_MIGRATION',
        actionName: 'ترحيل حصة تجريبية إلى طالب جديد',
        details: `تم ترحيل الحصة التجريبية للطالب "${promoteName.trim()}" وتسجيله كطالب جديد بنجاح بنوع حالة: (${promoteStatus === StudentStatus.Assigned ? 'نشط' : 'قيد الانتظار'}).`
      });

      // 5. Trigger instant full-screen notification for the teacher
      try {
        await notifyTeacherOnStudentPlacement({
          teacherId: promoteTeacherId,
          studentId: studentId,
          studentName: promoteName.trim(),
          studentGrade: promoteGrade ? promoteGrade.trim() : '',
          studentPhone: finalPromotePhone,
          subject: selectedTrialForPromotion?.subject || 'عام',
          topic: selectedTrialForPromotion?.topic || '',
          notes: promoteNotes.trim(),
          source: 'trial_migration',
          title: `🎉 تم ترحيل الطالب "${promoteName.trim()}" من الحصة التجريبية وتنسيبه لحسابك التعليمي`
        });
      } catch (notifErr) {
        console.warn('Failed to notify teacher on trial promotion:', notifErr);
      }

      // Set success info banner
      const assignedTeacherName = teachers.find(t => t.id === promoteTeacherId)?.name || 'المعلم المنسّب';
      setMigratedSuccessInfo({
        studentId: studentId,
        studentName: promoteName.trim(),
        teacherName: assignedTeacherName,
        status: promoteStatus
      });

      setShowPromoteModal(false);
      setSelectedTrialForPromotion(null);
      fetchData();

    } catch (err: any) {
      console.error("Error migrating trial lesson:", err);
      alert('حدث خطأ أثناء ترحيل الطالب: ' + err.message);
    } finally {
      setIsPromoting(false);
    }
  };

  // Stats Counters
  const stats = useMemo(() => {
    const pending = trialLessons.filter(t => t.status === 'pending').length;
    const completed = trialLessons.filter(t => t.status === 'completed').length;
    return {
      pending,
      completed,
      total: trialLessons.length
    };
  }, [trialLessons]);

  // Helper to match a lesson with its corresponding teacher in the database
  const getLessonTeacher = (lesson: TrialLesson, teachersList: Teacher[]): Teacher | undefined => {
    return teachersList.find(t => 
      (lesson.teacherId && (t.id === lesson.teacherId || (t as any).username === lesson.teacherId)) ||
      (lesson.teacherName && t.name && t.name.trim().toLowerCase() === lesson.teacherName.trim().toLowerCase())
    );
  };

  // Derived filtered lessons list (filtered by status, search, and teacher)
  const filteredLessons = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    const cleanQ = q.replace(/\D/g, '');
    return trialLessons.filter(lesson => {
      // 1. Status Filter
      const matchesStatus = statusFilter === 'all' || lesson.status === statusFilter;
      
      // 2. Search Query
      const cleanPhone = (lesson.phone || '').replace(/\D/g, '');
      const matchesSearch = !q || 
        (lesson.studentName || '').toLowerCase().includes(q) ||
        (lesson.teacherName || '').toLowerCase().includes(q) ||
        (lesson.subject || '').toLowerCase().includes(q) ||
        (lesson.topic || '').toLowerCase().includes(q) ||
        (lesson.grade || '').toLowerCase().includes(q) ||
        (cleanQ.length >= 3 && cleanPhone.includes(cleanQ));

      // 3. Teacher Filter
      let matchesTeacher = true;
      if (teacherFilter === 'all') {
        matchesTeacher = true;
      } else if (teacherFilter === 'unassigned') {
        const matchedT = getLessonTeacher(lesson, teachers);
        matchesTeacher = !matchedT && !lesson.teacherId;
      } else {
        const matchedT = getLessonTeacher(lesson, teachers);
        matchesTeacher = lesson.teacherId === teacherFilter || matchedT?.id === teacherFilter;
      }

      return matchesStatus && matchesSearch && matchesTeacher;
    });
  }, [trialLessons, statusFilter, searchQuery, teacherFilter, teachers]);

  // Teacher Classifications List
  const teacherClassifications = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    const cleanQ = q.replace(/\D/g, '');

    // Lessons matching status and search query
    const baseLessons = trialLessons.filter(lesson => {
      const matchesStatus = statusFilter === 'all' || lesson.status === statusFilter;
      const cleanPhone = (lesson.phone || '').replace(/\D/g, '');
      const matchesSearch = !q || 
        (lesson.studentName || '').toLowerCase().includes(q) ||
        (lesson.teacherName || '').toLowerCase().includes(q) ||
        (lesson.subject || '').toLowerCase().includes(q) ||
        (lesson.topic || '').toLowerCase().includes(q) ||
        (lesson.grade || '').toLowerCase().includes(q) ||
        (cleanQ.length >= 3 && cleanPhone.includes(cleanQ));
      return matchesStatus && matchesSearch;
    });

    const teacherMap = new Map<string, {
      teacherId: string;
      teacherName: string;
      specialization: string;
      phone?: string;
      teacher?: Teacher;
      lessons: TrialLesson[];
    }>();

    // Initialize with all existing teachers in the system
    teachers.forEach(t => {
      teacherMap.set(t.id, {
        teacherId: t.id,
        teacherName: t.name,
        specialization: t.specialization || (Array.isArray(t.subjects) ? t.subjects.join('، ') : 'عام'),
        phone: t.phone,
        teacher: t,
        lessons: []
      });
    });

    const unassigned: TrialLesson[] = [];

    baseLessons.forEach(lesson => {
      const matchedTeacher = getLessonTeacher(lesson, teachers);
      if (matchedTeacher) {
        const entry = teacherMap.get(matchedTeacher.id);
        if (entry) {
          entry.lessons.push(lesson);
        } else {
          teacherMap.set(matchedTeacher.id, {
            teacherId: matchedTeacher.id,
            teacherName: matchedTeacher.name,
            specialization: matchedTeacher.specialization || 'عام',
            phone: matchedTeacher.phone,
            teacher: matchedTeacher,
            lessons: [lesson]
          });
        }
      } else if (lesson.teacherName && lesson.teacherName.trim()) {
        const customKey = `named_${lesson.teacherName.trim()}`;
        if (!teacherMap.has(customKey)) {
          teacherMap.set(customKey, {
            teacherId: customKey,
            teacherName: lesson.teacherName,
            specialization: 'معلم خارجي / غير مسجل',
            phone: undefined,
            lessons: []
          });
        }
        teacherMap.get(customKey)!.lessons.push(lesson);
      } else {
        unassigned.push(lesson);
      }
    });

    const result = Array.from(teacherMap.values()).map(item => {
      const pendingCount = item.lessons.filter(l => l.status === 'pending').length;
      const completedCount = item.lessons.filter(l => l.status === 'completed').length;
      return {
        ...item,
        totalCount: item.lessons.length,
        pendingCount,
        completedCount
      };
    });

    if (unassigned.length > 0) {
      const pendingCount = unassigned.filter(l => l.status === 'pending').length;
      const completedCount = unassigned.filter(l => l.status === 'completed').length;
      result.push({
        teacherId: 'unassigned',
        teacherName: 'حصص تجريبية غير منسّبة',
        specialization: 'بانتظار تنسيب معلم',
        phone: undefined,
        teacher: undefined,
        lessons: unassigned,
        totalCount: unassigned.length,
        pendingCount,
        completedCount
      });
    }

    // Sort: teachers who have lessons first (prioritizing pending lessons), then teachers with 0 lessons
    return result.sort((a, b) => {
      if (a.pendingCount !== b.pendingCount) return b.pendingCount - a.pendingCount;
      if (a.totalCount !== b.totalCount) return b.totalCount - a.totalCount;
      return a.teacherName.localeCompare(b.teacherName, 'ar');
    });
  }, [trialLessons, teachers, statusFilter, searchQuery]);

  const teachersWithTrialsCount = useMemo(() => {
    return teacherClassifications.filter(t => t.teacherId !== 'unassigned' && t.totalCount > 0).length;
  }, [teacherClassifications]);

  const unassignedLessonsCount = useMemo(() => {
    const un = teacherClassifications.find(t => t.teacherId === 'unassigned');
    return un ? un.totalCount : 0;
  }, [teacherClassifications]);

  // Action: Open Book Modal pre-filled with specific teacher
  const handleOpenBookForTeacher = (teacherId: string) => {
    if (teacherId && teacherId !== 'unassigned' && !teacherId.startsWith('named_')) {
      const t = teachers.find(teach => teach.id === teacherId);
      setSelectedTeacherId(teacherId);
      if (t?.specialization) {
        const firstSpec = t.specialization.split(/[,،]/)[0].trim();
        setSubject(firstSpec);
      }
    }
    setShowBookModal(true);
  };

  // Action: Share teacher's trial schedule via WhatsApp
  const handleShareTeacherTrialsWhatsApp = (teacherItem: {
    teacherName: string;
    phone?: string;
    lessons: TrialLesson[];
    totalCount: number;
    pendingCount: number;
    completedCount: number;
  }) => {
    const rawPhone = teacherItem.phone || '';
    const cleanPhone = rawPhone.replace(/[\s\-\+\(\)]/g, '');
    
    let text = `السلام عليكم ورحمة الله وبركاته، الأستاذ(ة) ${teacherItem.teacherName} 🌸\n` +
               `إليك كشف الحصص التجريبية المنسوبة لك من إدارة المنصة:\n` +
               `📊 الإجمالي: ${teacherItem.totalCount} حصة (⌛ ${teacherItem.pendingCount} معلّقة | ✅ ${teacherItem.completedCount} مكتملة)\n\n`;
    
    teacherItem.lessons.forEach((l, index) => {
      text += `━━━━━━━━━━━━━━━\n` +
              `🔹 [${index + 1}] الطالب: ${l.studentName}\n` +
              `📚 الصف: ${l.grade || 'غير محدد'} | المادة: ${l.subject}\n` +
              `🎯 الموضوع: ${l.topic || 'حصة تجريبية مخصصة'}\n` +
              `📞 هاتف الطالب: ${l.phone || 'غير مسجل'}\n` +
              `⏰ الموعد: ${l.scheduledTime || 'لم يحدد بعد'}\n` +
              `📌 الحالة: ${l.status === 'completed' ? 'تمت المعالجة بنجاح ✅' : 'قيد المتابعة والتنسيق ⏳'}\n`;
    });

    text += `━━━━━━━━━━━━━━━\nيرجى التنسيق والتأكيد بالمنظومة فور إتمام الحصص. شكراً لجهودكم! ✨`;

    const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  const toggleTeacherCollapse = (teacherId: string) => {
    setCollapsedTeachers(prev => ({
      ...prev,
      [teacherId]: !prev[teacherId]
    }));
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Top Banner & KPIs */}
      <div className="bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 left-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -translate-x-12 -translate-y-12" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#D4A33C]/10 rounded-full blur-3xl translate-x-24 translate-y-24" />
        
        <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2">
            <span className="text-[10px] bg-[#D4A33C]/15 text-[#D4A33C] px-3 py-1 rounded-full font-black flex items-center gap-1 w-fit border border-[#D4A33C]/30 uppercase">
              <Sparkles size={11} className="animate-pulse" />
              الفرز والتنسيب التلقائي الذكي
            </span>
            <h3 className="text-2xl font-black text-white tracking-tight">إدارة الحصص التجريبية التفاعلية</h3>
            <p className="text-xs text-slate-350 font-medium max-w-2xl leading-relaxed">
              قم بإنشاء وتوزيع ومتابعة الحصص التجريبية للمشتركين الجدد بحيوية دقيقة وتوجيهها رأساً لشاشة المعلم المعني وتحديث حالات الإغلاق.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowBookModal(true)}
            id="book-new-trial-btn"
            className="px-6 py-4.5 bg-[#D4A33C] hover:bg-[#c3922c] active:scale-98 text-slate-950 font-black rounded-2xl flex items-center gap-2.5 shadow-lg shadow-amber-500/10 transition-all text-sm shrink-0"
          >
            <Plus size={18} />
            <span>حجز حصة تجريبية جديدة</span>
          </button>
        </div>

        {/* Dynamic tracking metrics cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 relative">
            <span className="text-[9px] text-slate-400 font-extrabold block">حصص تجريبية قيد الانتظار ⏳</span>
            <div className="flex items-baseline gap-2 mt-1">
              <strong className="text-2xl font-black text-amber-400 font-mono">{stats.pending}</strong>
              <span className="text-[10px] text-slate-400">بانتظار المعالجة والتنسيق</span>
            </div>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500/15">
              <Clock size={40} />
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 relative">
            <span className="text-[9px] text-slate-400 font-extrabold block">الحصص التجريبية المعالجة ✅</span>
            <div className="flex items-baseline gap-2 mt-1">
              <strong className="text-2xl font-black text-emerald-400 font-mono">{stats.completed}</strong>
              <span className="text-[10px] text-[#2dd4bf]/80">تمت معالجتها من المعلم المنسب</span>
            </div>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500/15">
              <CheckCircle2 size={40} />
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 relative">
            <span className="text-[9px] text-slate-400 font-extrabold block">إجمالي طلبات الحجز 📝</span>
            <div className="flex items-baseline gap-2 mt-1">
              <strong className="text-2xl font-black text-indigo-400 font-mono">{stats.total}</strong>
              <span className="text-[10px] text-slate-400">بالنظام الكلي</span>
            </div>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500/15">
              <ListOrdered size={40} />
            </div>
          </div>
        </div>
      </div>

      {/* Migration Success Action Banner */}
      <AnimatePresence>
        {migratedSuccessInfo && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-50 border-2 border-emerald-500/40 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-md">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h4 className="text-sm font-black text-emerald-950">
                  تم ترحيل الحصة التجريبية بنجاح وتسجيل الطالب «{migratedSuccessInfo.studentName}» في المنظومة! 🎉
                </h4>
                <p className="text-xs font-bold text-emerald-800/80 mt-0.5">
                  تم ربط الطالب بالمعلم ({migratedSuccessInfo.teacherName}) وحفظ بياناته في قائمة {migratedSuccessInfo.status === StudentStatus.Assigned ? 'الطلاب النشطين 🟢' : 'الطلبات الواردة ⏳'}.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={() => handleNavigateToStudent(migratedSuccessInfo.studentId)}
                className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
              >
                <UserCheck size={14} />
                <span>فتح ملف الطالب في قائمة الطلاب 👤</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('completed');
                  setMigratedSuccessInfo(null);
                }}
                className="px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                عرض الحصص المكتملة 🧪
              </button>
              <button
                type="button"
                onClick={() => setMigratedSuccessInfo(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructional Guide Box */}
      <div className="bg-amber-500/5 rounded-2xl border border-amber-500/15 p-5 flex gap-4 items-start text-xs text-[#6b4c11] leading-relaxed">
        <HelpCircle size={18} className="text-[#D4A33C] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-black text-amber-950 text-sm block">📋 نص الدليل الإرشادي لمسار عمل "الحصة التجريبية" المؤتمت:</strong>
          <span className="block text-slate-700">
            <strong>طلب الحجز (المدير):</strong> ينشئ مدير المنصة الطلب عبر الزر، ويدخل بيانات الطالب (الاسم، الصف، المادة، الموضوع، الهاتف) ويحدد المعلم المنسب.
          </span>
          <span className="block text-slate-700">
            <strong>تحديد الموعد (المعلم):</strong> يظهر الطلب فوراً في صفحة المعلم المستهدف، حيث يقوم باطلاع على البيانات وتحديد الوقت المناسب للقاء.
          </span>
          <span className="block text-slate-700">
            <strong>التنفيذ والإغلاق:</strong> تبقى الحصة التجريبية ظاهرة وثابتة في صفحة المعلم حتى بعد انتهائها، ولا تختفي إلا عندما يغير حالتها يدوياً إلى "تم بنجاح".
          </span>
          <span className="block text-slate-700 font-semibold text-emerald-800">
            <strong>التحديث التلقائي:</strong> فور إغلاقها من المعلم، يظهر إشعار أو تحديث في لوحة تحكم المدير يؤكد أن الحصة "تمت معالجتها بنجاح من قبل المعلم المنسب".
          </span>
        </div>
      </div>

      {/* Teacher Classification & Quick Filter Strip */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-900 to-[#0D365A] text-[#D4A33C] flex items-center justify-center font-black shadow-sm shrink-0">
              <Users size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-slate-900">نظام تصنيف وتوزيع الحصص التجريبية حسب المعلم</h4>
                <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full shadow-2xs">
                  {teachersWithTrialsCount} معلمين لديهم حصص تجريبية
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                تصنيف وفهرسة الحصص التجريبية آلياً لكل معلم، متابعة نسب الإنجاز، وإرسال الجداول بضغطة زر واحدة.
              </p>
            </div>
          </div>

          {/* View mode toggle switch */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="text-[11px] text-slate-500 font-extrabold hidden sm:inline">طريقة العرض:</span>
            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('by-teacher')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'by-teacher'
                    ? 'bg-[#1A365D] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid size={13} />
                <span>تصنيف مجمّع لكل معلم</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[#1A365D] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TableIcon size={13} />
                <span>جدول موحد</span>
              </button>
            </div>
          </div>
        </div>

        {/* Horizontal Quick Teacher Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
          {/* All Teachers Pill */}
          <button
            type="button"
            onClick={() => setTeacherFilter('all')}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 shrink-0 cursor-pointer border ${
              teacherFilter === 'all'
                ? 'bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-slate-900 shadow-md scale-102 ring-2 ring-indigo-300/30'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>👥 كافة المعلمين</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
              teacherFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
            }`}>
              {stats.total}
            </span>
          </button>

          {/* Individual Teacher Pills */}
          {teacherClassifications.map((item) => {
            const isSelected = teacherFilter === item.teacherId;
            const hasPending = item.pendingCount > 0;
            return (
              <button
                key={item.teacherId}
                type="button"
                onClick={() => setTeacherFilter(isSelected ? 'all' : item.teacherId)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-2.5 shrink-0 cursor-pointer border ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-md ring-2 ring-amber-300 scale-102 font-extrabold'
                    : item.totalCount > 0
                    ? 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
                    : 'bg-slate-50/60 text-slate-400 border-slate-200/60 hover:bg-slate-100 opacity-60'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                  isSelected ? 'bg-slate-900 text-amber-300' : 'bg-indigo-50 text-indigo-700'
                }`}>
                  {item.teacherName.trim().charAt(0) || 'م'}
                </div>
                <div className="flex flex-col items-start leading-tight">
                  <span className="truncate max-w-[130px]">{item.teacherName}</span>
                  <span className={`text-[9px] font-bold truncate max-w-[110px] ${isSelected ? 'text-slate-900/80' : 'text-slate-400'}`}>
                    {item.specialization}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {hasPending && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${
                      isSelected ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}>
                      ⏳ {item.pendingCount}
                    </span>
                  )}
                  {item.completedCount > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${
                      isSelected ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}>
                      ✅ {item.completedCount}
                    </span>
                  )}
                  {item.totalCount === 0 && (
                    <span className="text-[10px] text-slate-400 font-normal">0</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main List Management Container (Grouped by Teacher or Unified Table) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Comprehensive Filter bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            {/* Status dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-500">الحالة:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  e.preventDefault();
                  setStatusFilter(e.target.value as 'all' | 'pending' | 'completed');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-black border transition-all duration-300 cursor-pointer shadow-xs text-right font-sans outline-none ${
                  statusFilter === 'completed'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : statusFilter === 'pending'
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <option value="all">🔍 كافة الحالات ({stats.total})</option>
                <option value="pending">⌛ معلقة ({stats.pending})</option>
                <option value="completed">✅ مكتملة ({stats.completed})</option>
              </select>
            </div>

            {/* Teacher classification dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-500">تصنيف المعلم:</span>
              <select
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer shadow-xs text-right font-sans outline-none ${
                  teacherFilter !== 'all'
                    ? 'bg-amber-50/80 border-amber-300 text-amber-900'
                    : 'bg-white border-slate-200 text-slate-800'
                }`}
              >
                <option value="all">👨‍🏫 كافة المعلمين ({stats.total} حصة)</option>
                {unassignedLessonsCount > 0 && (
                  <option value="unassigned">⚠️ حصص غير منسّبة ({unassignedLessonsCount})</option>
                )}
                {teacherClassifications.map(tc => (
                  <option key={tc.teacherId} value={tc.teacherId}>
                    {tc.teacherName} ({tc.totalCount} حصة: ⏳ {tc.pendingCount} | ✅ {tc.completedCount})
                  </option>
                ))}
              </select>
              {teacherFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => setTeacherFilter('all')}
                  className="text-[11px] font-black text-rose-600 hover:text-rose-800 underline cursor-pointer shrink-0"
                >
                  إلغاء التصفية ✕
                </button>
              )}
            </div>

            <div className="h-4 w-px bg-slate-200 hidden sm:block mx-1" />

            {/* Quick status button toggles */}
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                  statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                الكل ({stats.total})
              </button>
              <button 
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                  statusFilter === 'pending' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                قيد الانتظار ({stats.pending})
              </button>
              <button 
                onClick={() => setStatusFilter('completed')}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                  statusFilter === 'completed' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                تمت معالجتها ({stats.completed})
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-full lg:w-72">
            <input 
              type="text"
              placeholder="ابحث باسم الطالب، المعلم، أو المادة..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pr-4 pl-9 py-2.5 bg-white border border-slate-200 rounded-xl font-bold focus:outline-none focus:border-[#D4A33C] transition-all text-right"
            />
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>

        {/* Active Teacher Filter Notice Banner */}
        {teacherFilter !== 'all' && (
          <div className="bg-amber-50/80 border-b border-amber-200/80 px-6 py-2.5 flex items-center justify-between gap-3 text-xs font-bold text-amber-950">
            <div className="flex items-center gap-2">
              <span className="text-amber-600">🎯 يتم الآن تصنيف وعرض الحصص التجريبية الخاصة بـ:</span>
              <span className="font-black bg-white px-2 py-0.5 rounded-md border border-amber-200 text-[#0D365A]">
                {teacherClassifications.find(tc => tc.teacherId === teacherFilter)?.teacherName || teacherFilter}
              </span>
              <span>({filteredLessons.length} حصة متطابقة)</span>
            </div>
            <button
              type="button"
              onClick={() => setTeacherFilter('all')}
              className="text-[11px] font-black text-rose-600 hover:text-rose-800 underline cursor-pointer"
            >
              عرض كافة المعلمين ✕
            </button>
          </div>
        )}

        {/* Content Area: Grouped By Teacher OR Table View */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 font-black">
            <div className="animate-spin inline-block w-6 h-6 border-2 border-slate-350 border-t-transparent rounded-full mb-2" />
            <p>جاري تحميل سجل الحصص التجريبية من النظام...</p>
          </div>
        ) : filteredLessons.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-black space-y-2">
            <p>لا توجد حصص تجريبية مسجلة تتناسب مع الفلاتر وتصنيف المعلم المحدد.</p>
            {teacherFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setTeacherFilter('all')}
                className="text-xs text-indigo-600 underline font-black cursor-pointer"
              >
                إلغاء تصفية المعلم وعرض كافة الحصص
              </button>
            )}
          </div>
        ) : viewMode === 'by-teacher' ? (
          /* ============================================================== */
          /* 1. Grouped By Teacher View Mode                                */
          /* ============================================================== */
          <div className="p-5 space-y-5 bg-slate-50/40">
            {teacherClassifications
              .filter(item => {
                if (teacherFilter !== 'all') {
                  return item.teacherId === teacherFilter;
                }
                if (!showZeroLessonsTeachers) {
                  return item.totalCount > 0;
                }
                return true;
              })
              .map((teacherItem) => {
                const isCollapsed = collapsedTeachers[teacherItem.teacherId];
                const isUnassigned = teacherItem.teacherId === 'unassigned';
                return (
                  <div 
                    key={teacherItem.teacherId}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all hover:shadow-md"
                  >
                    {/* Teacher Classification Header */}
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Teacher Info & Metrics */}
                      <div className="flex items-center gap-3.5">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                          isUnassigned
                            ? 'bg-rose-100 text-rose-700 border border-rose-200'
                            : 'bg-gradient-to-br from-[#0D365A] to-indigo-900 text-[#D4A33C]'
                        }`}>
                          {isUnassigned ? '⚠️' : (teacherItem.teacherName.trim().charAt(0) || 'م')}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-slate-900">
                              {teacherItem.teacherName}
                            </h4>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              {teacherItem.specialization}
                            </span>
                            {teacherItem.phone && (
                              <span className="text-[10px] font-mono font-bold text-slate-400" dir="ltr">
                                {teacherItem.phone}
                              </span>
                            )}
                          </div>

                          {/* Classification counters */}
                          <div className="flex items-center gap-2 flex-wrap text-[10px] font-black">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                              📊 إجمالي الحصص: {teacherItem.totalCount}
                            </span>
                            <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded-md border border-amber-250">
                              ⏳ قيد الانتظار: {teacherItem.pendingCount}
                            </span>
                            <span className="bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-250">
                              ✅ تمت معالجتها: {teacherItem.completedCount}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Quick Action Controls */}
                      <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
                        {/* Share full schedule to teacher's WhatsApp */}
                        {!isUnassigned && teacherItem.totalCount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleShareTeacherTrialsWhatsApp(teacherItem)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:scale-102 active:scale-98"
                            title="إرسال كشف الحصص التجريبية كاملاً للمعلم عبر الواتساب"
                          >
                            <Share2 size={12} className="text-emerald-600" />
                            <span>مشاركة الجدول 📲</span>
                          </button>
                        )}

                        {/* Direct WhatsApp chat */}
                        {!isUnassigned && teacherItem.phone && (
                          <button
                            type="button"
                            onClick={() => {
                              const cleanPhone = teacherItem.phone ? teacherItem.phone.replace(/[\s\-\+\(\)]/g, '') : '';
                              window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}`, '_blank');
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
                            title="فتح محادثة واتساب مع المعلم"
                          >
                            <MessageSquare size={12} className="text-emerald-600" />
                            <span>واتساب 💬</span>
                          </button>
                        )}

                        {/* Book a new trial for this teacher */}
                        {!isUnassigned && (
                          <button
                            type="button"
                            onClick={() => handleOpenBookForTeacher(teacherItem.teacherId)}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer"
                            title="حجز وتنسيب حصة تجريبية جديدة لهذا المعلم مباشرة"
                          >
                            <Plus size={12} />
                            <span>حجز حصة له ➕</span>
                          </button>
                        )}

                        {/* Collapse/Expand Toggle */}
                        <button
                          type="button"
                          onClick={() => toggleTeacherCollapse(teacherItem.teacherId)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer"
                          title={isCollapsed ? 'توسيع القسم' : 'طي القسم'}
                        >
                          {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Teacher's Lessons Body (When expanded) */}
                    {!isCollapsed && (
                      <div className="p-4 sm:p-5">
                        {teacherItem.lessons.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 text-xs font-bold bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                            لا توجد حصص تجريبية مسجلة لهذا المعلم حالياً.
                            <div className="mt-2">
                              <button
                                type="button"
                                onClick={() => handleOpenBookForTeacher(teacherItem.teacherId)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                <Plus size={13} />
                                <span>جدولة أول حصة تجريبية له الآن 🚀</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                            {teacherItem.lessons.map(lesson => (
                              <div
                                key={lesson.id}
                                className={`rounded-2xl border p-4 transition-all flex flex-col justify-between gap-3 text-right ${
                                  lesson.status === 'completed'
                                    ? 'bg-emerald-50/30 border-emerald-200 hover:border-emerald-300'
                                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                                }`}
                              >
                                <div className="space-y-2">
                                  {/* Student Name & Grade */}
                                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                                    <div>
                                      <div className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                                        <User size={13} className="text-indigo-600 shrink-0" />
                                        <span>{lesson.studentName}</span>
                                      </div>
                                      <span className="text-[10px] font-bold text-slate-400 mt-0.5 block">
                                        الصف: {lesson.grade || 'غير محدد'}
                                      </span>
                                    </div>
                                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                      lesson.status === 'completed'
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                                    }`}>
                                      {lesson.status === 'completed' ? '✅ مكتملة' : '⏳ قيد الانتظار'}
                                    </span>
                                  </div>

                                  {/* Subject & Topic */}
                                  <div className="space-y-1">
                                    <div className="text-xs font-black text-indigo-900 flex items-center gap-1">
                                      <BookOpenCheck size={13} className="text-[#D4A33C] shrink-0" />
                                      <span>المادة: {lesson.subject}</span>
                                    </div>
                                    {lesson.topic && (
                                      <p className="text-[11px] font-bold text-slate-600 leading-tight">
                                        🎯 {lesson.topic}
                                      </p>
                                    )}
                                  </div>

                                  {/* Phone & WhatsApp */}
                                  <div className="flex items-center justify-between text-[11px] bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-150">
                                    <div className="flex items-center gap-1.5 font-mono text-slate-800 font-bold" dir="ltr">
                                      <Phone size={11} className="text-slate-400" />
                                      <span>{lesson.phone || 'غير مسجل'}</span>
                                    </div>
                                    {lesson.phone && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const clean = lesson.phone.replace(/[\s\-\+\(\)]/g, '');
                                          window.open(`https://api.whatsapp.com/send?phone=${clean}`, '_blank');
                                        }}
                                        className="text-[10px] text-emerald-700 hover:text-emerald-900 font-black flex items-center gap-1 cursor-pointer"
                                      >
                                        <span>واتساب 💬</span>
                                      </button>
                                    )}
                                  </div>

                                  {/* Scheduled Date/Time & Calendar */}
                                  <div className="flex items-center justify-between gap-1 text-[11px] pt-1">
                                    <span className="text-slate-500 font-bold">الموعد:</span>
                                    {lesson.scheduledTime ? (
                                      <span className="bg-indigo-50 border border-indigo-200 text-indigo-900 font-black px-2 py-0.5 rounded-md font-mono text-[10px]">
                                        ⏰ {lesson.scheduledTime}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400 italic text-[10px]">بانتظار رد المعلم</span>
                                    )}
                                  </div>
                                </div>

                                {/* Status Selector & Actions Footer */}
                                <div className="pt-2 border-t border-slate-100 space-y-2">
                                  {/* Manager Teacher Assignment */}
                                  <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/80 text-right space-y-1.5">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[11px] font-black text-amber-950 flex items-center gap-1">
                                        <GraduationCap size={13} className="text-amber-600" />
                                        <span>👨‍🏫 المعلم المطلوب للحصة التجريبية (اختياري):</span>
                                      </label>
                                      {lesson.teacherId && (
                                        <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                                          منسّب ✓
                                        </span>
                                      )}
                                    </div>
                                    <select
                                      value={lesson.teacherId || ''}
                                      onChange={(e) => handleAssignTeacherToTrial(lesson.id, e.target.value)}
                                      className="w-full text-xs bg-white border border-amber-300 text-slate-800 py-1.5 px-2.5 rounded-lg font-bold font-sans cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    >
                                      <option value="">-- اضغط لاختيار وتنسيب المعلم المستهدف --</option>
                                      {teachers.map(t => (
                                        <option key={t.id} value={t.id}>
                                          {t.name} ({t.specialization || (Array.isArray(t.subjects) ? t.subjects.join('، ') : 'عام')})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Status selector */}
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-bold text-slate-500">تحديث الحالة:</span>
                                    <select
                                      value={lesson.status}
                                      onChange={(e) => handleUpdateTrialStatus(lesson.id, e.target.value as 'pending' | 'completed')}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all cursor-pointer font-sans outline-none ${
                                        lesson.status === 'completed'
                                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                                          : 'bg-amber-50 border-amber-300 text-amber-900'
                                      }`}
                                    >
                                      <option value="pending">⌛ قيد المتابعة</option>
                                      <option value="completed">✅ تم بنجاح</option>
                                    </select>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex items-center justify-between gap-1.5 pt-1">
                                    {lesson.migratedToStudentId ? (
                                      <button
                                        type="button"
                                        onClick={() => handleNavigateToStudent(lesson.migratedToStudentId!)}
                                        className="flex-1 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                                      >
                                        <UserCheck size={11} className="text-indigo-600" />
                                        <span>عرض ملف الطالب 👤</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleInitiatePromote(lesson)}
                                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs hover:scale-102"
                                      >
                                        <UserPlus size={11} />
                                        <span>ترحيل كطالب جديد 👤</span>
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTrialLesson(lesson.id)}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                                      title="حذف طلب الحصة التجريبية"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

            {/* Bottom option to show/hide teachers with 0 trial lessons */}
            {teacherFilter === 'all' && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowZeroLessonsTeachers(!showZeroLessonsTeachers)}
                  className="text-xs font-black text-indigo-700 hover:text-indigo-900 underline cursor-pointer bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs"
                >
                  {showZeroLessonsTeachers
                    ? '▲ إخفاء المعلمين الذين ليس لديهم حصص حالياً'
                    : '▼ عرض كافة معلمي الأكاديمية (بمن فيهم من ليس لديه حصص حالياً)'}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ============================================================== */
          /* 2. Unified Table View Mode                                    */
          /* ============================================================== */
          <div className="overflow-x-auto">
            <table className="w-full text-inner-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-4 font-black text-right">معلومات الطالب التجريبي</th>
                  <th className="px-6 py-4 font-black text-right">المادة والموضوع</th>
                  <th className="px-6 py-4 font-black text-right">المعلم المرشح للتوجيه</th>
                  <th className="px-6 py-4 font-black text-right">الموعد المحدد من المعلم</th>
                  <th className="px-6 py-4 font-black text-right">حالة المعالجة والتتبع</th>
                  <th className="px-6 py-4 font-black text-right">تاريخ الإدراج</th>
                  <th className="px-6 py-4 font-black text-left">التحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLessons.map(lesson => (
                  <tr key={lesson.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{lesson.studentName}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="bg-slate-100 px-1 py-0.2 rounded font-black">{lesson.grade}</span>
                        <span>•</span>
                        <Phone size={10} />
                        <span className="font-mono">{lesson.phone}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-indigo-900 flex items-center gap-1">
                        <BookOpenCheck size={12} className="text-[#D4A33C]" />
                        <span>{lesson.subject}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-bold mt-0.5">{lesson.topic}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-750">
                      <div className="flex flex-col gap-1.5 min-w-[170px]">
                        <select
                          value={lesson.teacherId || ''}
                          onChange={(e) => handleAssignTeacherToTrial(lesson.id, e.target.value)}
                          className="text-xs bg-amber-50/70 border border-amber-300 text-slate-800 py-1.5 px-2.5 rounded-lg font-bold font-sans cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500"
                          title="👨‍🏫 المعلم المطلوب للحصة التجريبية (اختياري) - تنسيب المعلم المستهدف"
                        >
                          <option value="">-- اضغط لاختيار وتنسيب المعلم --</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.id}>
                              👨‍🏫 {t.name}
                            </option>
                          ))}
                        </select>
                        {(() => {
                          const nominatedTeacher = teachers.find(t => t.id === lesson.teacherId);
                          if (nominatedTeacher) {
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  const text = `السلام عليكم ورحمة الله وبركاته، الأستاذ(ة) ${lesson.teacherName} 🌸\n` +
                                               `تم تنسيب حصة تجريبية جديدة لك من إدارة المنصة:\n\n` +
                                               `👤 اسم الطالب: ${lesson.studentName}\n` +
                                               `📚 الصف الدراسي: ${lesson.grade || 'غير محدد'}\n` +
                                               `📖 المادة: ${lesson.subject}\n` +
                                               `🎯 موضوع الدرس: ${lesson.topic || 'حصة تجريبية مخصصة'}\n` +
                                               `📞 هاتف الطالب: ${lesson.phone || 'غير مسجل'}\n` +
                                               `⏰ موعد الحصة: ${lesson.scheduledTime || 'لم يتم الجدولة بعد'}\n\n` +
                                               `يرجى التنسيق والمتابعة مع الطالب، وتأكيد خوض الحصة بالمنظومة فور انتهائها. بالتوفيق! ✨`;
                                  const cleanPhone = nominatedTeacher.phone ? nominatedTeacher.phone.replace(/[\s\-\+\(\)]/g, '') : '';
                                  const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
                                  window.open(waUrl, '_blank');
                                }}
                                className="inline-flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-750 bg-emerald-50 hover:bg-emerald-100/70 px-2 py-0.5 rounded-lg border border-emerald-100 font-extrabold w-fit cursor-pointer transition-all active:scale-95"
                                title="إرسال تفاصيل الحصة والمستندات للمعلم عبر الواتساب"
                              >
                                <span>واتساب 💬</span>
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold col-calendar-schedule">
                      {lesson.scheduledTime ? (
                        <span className="bg-indigo-50 border border-indigo-100 text-indigo-800 px-2.5 py-1 rounded-xl font-mono text-[11px] block w-fit">
                          ⏳ {lesson.scheduledTime}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">بانتظار رد المعلم</span>
                      )}

                      {/* Schedule/Add to Calendar widget inline */}
                      <div className="mt-2.5 max-w-[200px] text-right">
                        <button
                          type="button"
                          onClick={() => setActiveCalendarTrialId(activeCalendarTrialId === lesson.id ? null : lesson.id)}
                          className={`px-3 py-1.5 bg-indigo-50/60 hover:bg-indigo-150 text-indigo-900 text-[10px] font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 border border-indigo-100/50 shadow-xs w-full ${
                            activeCalendarTrialId === lesson.id ? 'bg-indigo-100 ring-2 ring-indigo-300' : ''
                          }`}
                        >
                          <CalendarPlus size={10} className="text-indigo-600 animate-pulse" />
                          <span>إضافة للتقويم 📅</span>
                        </button>

                        {activeCalendarTrialId === lesson.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-indigo-50/40 border border-indigo-100/40 p-2.5 rounded-xl space-y-2 mt-1.5 text-right font-sans font-bold"
                          >
                            <div className="space-y-1">
                              <span className="text-[9px] font-extrabold text-[#1A365D] block">جدولة الحصة وتثبيتها:</span>
                              <div className="flex flex-col gap-1">
                                <input 
                                  type="date"
                                  value={trialScheduleDates[lesson.id] || lesson.scheduledDate || ""}
                                  onChange={(e) => setTrialScheduleDates(prev => ({ ...prev, [lesson.id]: e.target.value }))}
                                  className="px-2 py-1 bg-white border border-slate-200 rounded-md outline-none font-bold text-[9px] focus:border-indigo-500 transition-all text-right h-7"
                                />
                                <input 
                                  type="time"
                                  value={trialScheduleTimes[lesson.id] || "16:00"}
                                  onChange={(e) => setTrialScheduleTimes(prev => ({ ...prev, [lesson.id]: e.target.value }))}
                                  className="px-2 py-1 bg-white border border-slate-200 rounded-md outline-none font-bold text-[9px] focus:border-indigo-500 transition-all text-center h-7"
                                />
                              </div>
                            </div>

                            <div className="space-y-1 pt-1 border-t border-indigo-100/40">
                              <button
                                disabled={isPlayingCalendarLoader === lesson.id}
                                onClick={() => {
                                  const d = trialScheduleDates[lesson.id] || lesson.scheduledDate || "";
                                  const tStr = trialScheduleTimes[lesson.id] || "16:00";
                                  handleSaveTrialToCalendar(lesson.id, d, tStr);
                                }}
                                className="w-full py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[9px] font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                              >
                                {isPlayingCalendarLoader === lesson.id ? 'جاري الحفظ...' : '✓ حفظ بالتقويم'}
                              </button>

                              <div className="grid grid-cols-2 gap-1.5">
                                <a
                                  href={(() => {
                                    const d = trialScheduleDates[lesson.id] || lesson.scheduledDate || new Date().toISOString().split('T')[0];
                                    const tStr = trialScheduleTimes[lesson.id] || "16:00";
                                    const cleanD = d.replace(/-/g, '');
                                    const [hh, mm] = tStr.split(':');
                                    const hStart = hh || "16";
                                    const mStart = mm || "00";
                                    const hEnd = String(Number(hStart) + 1).padStart(2, '0');
                                    const datesPart = `${cleanD}T${hStart}${mStart}00/${cleanD}T${hEnd}${mStart}00`;
                                    const title = encodeURIComponent(`حصة تجريبية - ${lesson.studentName}`);
                                    const desc = encodeURIComponent(`حصة تجريبية في مادة ${lesson.subject} مع الطالب ${lesson.studentName} (${lesson.grade}). هاتف: ${lesson.phone || 'غير مسجل'}`);
                                    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${desc}&dates=${datesPart}&ctz=Asia/Jerusalem`;
                                  })()}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[9px] font-black rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 text-center"
                                >
                                  <span>Google 🌐</span>
                                </a>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const d = trialScheduleDates[lesson.id] || lesson.scheduledDate || new Date().toISOString().split('T')[0];
                                    const tStr = trialScheduleTimes[lesson.id] || "16:00";
                                    const cleanD = d.replace(/-/g, '');
                                    const [hh, mm] = tStr.split(':');
                                    const hStart = hh || "16";
                                    const mStart = mm || "00";
                                    const hEnd = String(Number(hStart) + 1).padStart(2, '0');
                                    
                                    const title = `حصة تجريبية - ${lesson.studentName}`;
                                    const description = `حصة تجريبية في مادة ${lesson.subject} مع الطالب ${lesson.studentName} (${lesson.grade}). هاتف: ${lesson.phone || 'غير مسجل'}`;
                                    
                                    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Academy//Placement Manager//EN\nBEGIN:VEVENT\nUID:${lesson.id}@placement.academy\nDTSTAMP:${cleanD}T000000Z\nDTSTART:${cleanD}T${hStart}${mStart}00\nDTEND:${cleanD}T${hEnd}${mStart}00\nSUMMARY:${title}\nDESCRIPTION:${description}\nSTATUS:CONFIRMED\nEND:VEVENT\nEND:VCALENDAR`;
                                    
                                    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.setAttribute('download', `trial_lesson_${lesson.id}.ics`);
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }}
                                  className="py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[9px] font-black rounded-md transition-all cursor-pointer flex items-center justify-center gap-1"
                                >
                                  <span>ملف .ics 📦</span>
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={lesson.status}
                        onChange={(e) => handleUpdateTrialStatus(lesson.id, e.target.value as 'pending' | 'completed')}
                        className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black border transition-all duration-200 cursor-pointer shadow-xs font-sans outline-none focus:ring-4 ${
                          lesson.status === 'completed'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/60 focus:ring-emerald-500/10'
                            : 'bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100/60 focus:ring-amber-500/10'
                        }`}
                      >
                        <option value="pending" className="bg-white text-amber-900">⌛ قيد الانتظار والمتابعة</option>
                        <option value="completed" className="bg-white text-emerald-800">✅ تمت معالجتها بنجاح</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-[10px] text-slate-450 font-mono">
                      {new Date(lesson.createdAt).toLocaleDateString('he-IL')}
                    </td>
                    <td className="px-6 py-4 text-left">
                      <div className="flex items-center justify-end gap-2">
                        {lesson.migratedToStudentId ? (
                          <button
                            type="button"
                            onClick={() => handleNavigateToStudent(lesson.migratedToStudentId!)}
                            className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs hover:scale-103"
                            title="الانتقال المباشر لبطاقة الطالب في إدارة الطلاب"
                          >
                            <UserCheck size={12} className="text-indigo-600" />
                            <span>عرض ملف الطالب 👤</span>
                          </button>
                        ) : lesson.status === 'completed' ? (
                          <button
                            type="button"
                            onClick={() => handleInitiatePromote(lesson)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-md hover:scale-103"
                            title="ترحيل طلب الحصة التجريبية وتسجيله كطالب جديد ومستقل في النظام"
                          >
                            <UserPlus size={12} />
                            <span>ترحيل كطالب جديد 👤</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 text-amber-800 rounded-xl text-[9px] font-extrabold border border-amber-500/20 shadow-xs" title="يجب أن يقوم المعلم بمتابعة وإغلاق الحصة التجريبية بنجاح أولاً قبل ترحيلها">
                              ⌛ قيد المتابعة
                            </span>
                            <button
                              type="button"
                              onClick={() => handleInitiatePromote(lesson)}
                              className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-[9px] font-black transition-all cursor-pointer flex items-center gap-1 shrink-0"
                              title="ترحيل وتسجيل الطالب فوراً دون انتظار"
                            >
                              <UserPlus size={11} />
                              <span>ترحيل مباشر 👤</span>
                            </button>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteTrialLesson(lesson.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-xl transition-colors cursor-pointer hover:bg-slate-100"
                          title="حذف طلب الحصة التجريبية"
                        >
                          <Trash2 size={13} />
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

      {/* Booking Form Modal Overlay */}
      <AnimatePresence>
        {showBookModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[110] p-4 text-right">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-100 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-rose-50/15 pb-3">
                <h4 className="text-lg font-black text-[#1A365D] flex items-center gap-1.5">
                  <Sparkles size={16} className="text-[#D4A33C] animate-pulse" />
                  حجز طلب حصة تجريبية جديدة 💫
                </h4>
                <button 
                  type="button"
                  onClick={closeBookModal}
                  className="text-slate-400 hover:text-slate-900 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-150 text-rose-700 text-xs rounded-xl font-bold">
                  ⚠️ {errorMessage}
                </div>
              )}

              {successMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-150 text-emerald-850 rounded-2xl font-bold space-y-3.5">
                  <div className="flex items-center gap-2 text-emerald-900">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span>{successMessage}</span>
                  </div>

                  {justBookedTrialInfo && (
                    <div className="bg-white border border-emerald-200 rounded-xl p-3.5 space-y-3 text-right">
                      <div className="text-[10px] text-slate-500 font-extrabold">مشاركة تفاصيل الحصة فوراً مع المعلم المنسّب 💬</div>
                      <div className="text-xs text-slate-800 font-black">👨‍🏫 {justBookedTrialInfo.teacherName}</div>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const text = `السلام عليكم ورحمة الله وبركاته، الأستاذ(ة) ${justBookedTrialInfo.teacherName} 🌸\n` +
                                         `تم تنسيب حصة تجريبية جديدة لك من إدارة المنصة:\n\n` +
                                         `👤 اسم الطالب: ${justBookedTrialInfo.studentName}\n` +
                                         `📚 الصف الدراسي: ${justBookedTrialInfo.grade || 'غير محدد'}\n` +
                                         `📖 المادة: ${justBookedTrialInfo.subject}\n` +
                                         `🎯 موضوع الدرس: ${justBookedTrialInfo.topic || 'حصة تجريبية مخصصة'}\n` +
                                         `📞 هاتف الطالب: ${justBookedTrialInfo.phone || 'غير مسجل'}\n\n` +
                                         `يرجى التنسيق والمتابعة مع الطالب، وتأكيد خوض الحصة بالمنظومة فور انتهائها. بالتوفيق! ✨`;
                            const cleanPhone = justBookedTrialInfo.teacherPhone ? justBookedTrialInfo.teacherPhone.replace(/[\s\-\+\(\)]/g, '') : '';
                            const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
                            window.open(waUrl, '_blank');
                          }}
                          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                        >
                          <span>واتساب المعلم 💬</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={closeBookModal}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black transition-all cursor-pointer"
                        >
                          إغلاق النافذة
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleBookTrialLesson} className="space-y-4 text-xs font-bold text-slate-705">
                {/* Student Name */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-extrabold block">اسم الطالب (تجريبي) *</label>
                  <input 
                    type="text"
                    required
                    placeholder="مثال: يوسف كبها (طالب تجريبي)"
                    value={studentName}
                    onChange={e => setStudentName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#D4A33C]/10 focus:border-[#D4A33C] outline-none transition-all font-semibold"
                  />
                </div>

                {/* Grid for Grade & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-500 font-extrabold block">الصف الدراسي *</label>
                    <select
                      required
                      value={grade}
                      onChange={e => setGrade(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#D4A33C] font-semibold"
                    >
                      <option value="">-- اختر صف الطالب --</option>
                      <option value="الأول">الأول الابتدائي</option>
                      <option value="الثاني">الثاني الابتدائي</option>
                      <option value="الثالث">الثالث الابتدائي</option>
                      <option value="الرابع">الرابع الابتدائي</option>
                      <option value="الخامس">الخامس الابتدائي</option>
                      <option value="السادس">السادس الابتدائي</option>
                      <option value="السابع">السابع</option>
                      <option value="الثامن">الثامن</option>
                      <option value="تاسع">تاسع</option>
                      <option value="عاشر">عاشر</option>
                      <option value="حادي عشر">حادي عشر</option>
                      <option value="ثاني عشر (بجروت)">ثاني عشر (بجروت)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-500 font-extrabold block">رقم هاتف الطالب (واتساب) *</label>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                        المقدمة 972+ تلقائية 💬
                      </span>
                    </div>
                    <div className="relative flex items-center" dir="ltr">
                      <div className="bg-emerald-50 border border-r-0 border-slate-200 text-emerald-800 font-mono font-black text-xs px-3 py-3 rounded-l-xl flex items-center gap-1.5 shrink-0 select-none shadow-inner">
                        <Phone size={13} className="text-emerald-600" />
                        <span>+972</span>
                      </div>
                      <input 
                        type="text"
                        required
                        placeholder="50 123 4567"
                        value={phone}
                        onChange={e => setPhone(cleanLocalPhoneDigits(e.target.value))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-r-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-mono font-bold text-left text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Select Subject */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-extrabold block">المادة المطلوبة *</label>
                  <select
                    required
                    value={subject}
                    onChange={e => {
                      const newSubject = e.target.value;
                      setSubject(newSubject);
                      setShowAllTeachersOverride(false);
                      if (selectedTeacherId) {
                        const currentTeacher = teachers.find(t => t.id === selectedTeacherId);
                        if (currentTeacher && !isTeacherTeachingSubject(currentTeacher, newSubject)) {
                          setSelectedTeacherId('');
                        }
                      }
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#D4A33C] font-semibold"
                  >
                    <option value="">-- اختر المادة التعليمية --</option>
                    {availableSubjects.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 font-medium">تظهر المواد التخصصية تكميلياً حسب المؤهلات المدخلة للطاقم.</p>
                </div>

                {/* Lesson topic / Subject Details */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-extrabold block">موضوع الحصة/الدرس (اختياري)</label>
                  <input 
                    type="text"
                    placeholder="مثال: مراجعة الدالة التربيعية للبجروت / تأسيس قواعد الأساسية"
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-[#D4A33C]/10 focus:border-[#D4A33C] outline-none transition-all font-semibold"
                  />
                </div>

                {/* Candidate Teacher Selector - Filtered exclusively by selected subject */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-500 font-extrabold block text-indigo-900">
                      المعلم المرشح (لتوجيه الحصة إلى صفحته) *
                    </label>
                    {subject && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-900 border border-amber-300/80 shadow-2xs">
                        {showAllTeachersOverride 
                          ? `عرض كافة المعلمين (${teachers.length})`
                          : `معلمو ${subject} فقط (${filteredTeachersForSubject.length})`}
                      </span>
                    )}
                  </div>
                  <select
                    required
                    value={selectedTeacherId}
                    onChange={e => setSelectedTeacherId(e.target.value)}
                    className="w-full px-4 py-3 bg-amber-500/5 border border-amber-300 rounded-xl outline-none focus:border-[#D4A33C] font-semibold text-indigo-950"
                  >
                    <option value="">
                      {!subject 
                        ? '-- اختر المادة أولاً لحصر المعلمين المتخصصين --' 
                        : filteredTeachersForSubject.length === 0
                          ? `-- لا يوجد معلم مسجل لمادة (${subject}) --`
                          : !showAllTeachersOverride
                            ? `-- اختر من معلمي مادة ${subject} (${filteredTeachersForSubject.length} متاحين) --`
                            : `-- اختر المعلم من القائمة المنسدلة (${teachers.length} معلم) --`}
                    </option>
                    {filteredTeachersForSubject.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} (التخصص: {t.specialization || (Array.isArray(t.subjects) ? t.subjects.join('، ') : 'عام')})
                      </option>
                    ))}
                  </select>

                  {/* Contextual filter helper info / override toggle */}
                  {subject && (
                    <div className="pt-0.5">
                      {filteredTeachersForSubject.length === 0 && !showAllTeachersOverride ? (
                        <div className="text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center justify-between gap-2 text-[11px]">
                          <span>⚠️ لم يتم العثور على معلم مسجل بتخصص "{subject}" حالياً.</span>
                          <button
                            type="button"
                            onClick={() => setShowAllTeachersOverride(true)}
                            className="text-indigo-700 font-black underline hover:text-indigo-900 cursor-pointer shrink-0"
                          >
                            عرض جميع المعلمين
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 font-bold">
                            {!showAllTeachersOverride
                              ? `🎯 تم فلترة القائمة لإظهار معلمي "${subject}" فقط لضمان دقة التنسيب الأكاديمي.`
                              : 'يتم الآن عرض جميع معلمي الأكاديمية.'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowAllTeachersOverride(!showAllTeachersOverride)}
                            className="text-indigo-600 hover:text-indigo-800 underline font-black cursor-pointer shrink-0 mr-1"
                          >
                            {showAllTeachersOverride ? `حصر بمعلمي "${subject}" فقط` : 'عرض جميع المعلمين'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Buttons controls */}
                <div className="flex gap-2.5 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-[#D4A33C] hover:text-[#e4b34c] disabled:opacity-50 text-xs font-black rounded-xl transition-all cursor-pointer shadow-md text-center"
                  >
                    {isSubmitting ? 'جاري الحفظ والتوجيه...' : 'تأكيد الحجز وتثبيته'}
                  </button>
                  <button
                    type="button"
                    onClick={closeBookModal}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-xl transition-all cursor-pointer text-center"
                  >
                    إلغاء الإجراء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Promotion to Student Form Modal Overlay */}
      <AnimatePresence>
        {showPromoteModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[110] p-4 text-right">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-xl w-full p-6 border border-slate-100 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-rose-50/15 pb-3">
                <h4 className="text-lg font-black text-[#1A365D] flex items-center gap-1.5">
                  <UserPlus size={18} className="text-emerald-600 animate-pulse" />
                  ترحيل الحصة التجريبية وتسجيل طالب جديد 👤
                </h4>
                <button 
                  type="button"
                  onClick={() => {
                    setShowPromoteModal(false);
                    setSelectedTrialForPromotion(null);
                  }}
                  className="text-slate-400 hover:text-slate-900 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 text-indigo-950 text-[11px] rounded-xl font-bold flex gap-2 leading-relaxed">
                <AlertCircle size={15} className="text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-extrabold text-[#1A365D]">تنبيه توجيهي مالي وإداري:</p>
                  <p className="font-medium text-slate-600 mt-1">
                    هذا الخيار يسمح لك بترقية الحصة التجريبية لإنشاء ملف طالب مستقل. إذا كان اسم الطالب مسجلاً مسبقاً، سيتم دمج المعلم المنسّب وتحديث البيانات المكتملة دون تكرار الطالب.
                  </p>
                </div>
              </div>

              <form onSubmit={handleExecutePromotion} className="space-y-4 text-xs font-bold text-slate-705">
                {/* Student Name */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-extrabold block">اسم الطالب الثنائي/الكامل *</label>
                  <input 
                    type="text"
                    required
                    placeholder="مثال: يوسف كبها"
                    value={promoteName}
                    onChange={e => setPromoteName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-semibold text-right"
                  />
                </div>

                {/* Grid for Grade & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-500 font-extrabold block">الصف الدراسي *</label>
                    <select
                      required
                      value={promoteGrade}
                      onChange={e => setPromoteGrade(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-semibold"
                    >
                      <option value="">-- اختر صف الطالب --</option>
                      <option value="الأول">الأول الابتدائي</option>
                      <option value="الثاني">الثاني الابتدائي</option>
                      <option value="الثالث">الثالث الابتدائي</option>
                      <option value="الرابع">الرابع الابتدائي</option>
                      <option value="الخامس">الخامس الابتدائي</option>
                      <option value="السادس">السادس الابتدائي</option>
                      <option value="السابع">السابع</option>
                      <option value="الثامن">الثامن</option>
                      <option value="تاسع">تاسع</option>
                      <option value="عاشر">عاشر</option>
                      <option value="حادي عشر">حادي عشر</option>
                      <option value="ثاني عشر (بجروت)">ثاني عشر (بجروت)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-500 font-extrabold block">رقم هاتف الطالب (واتساب) *</label>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                        المقدمة 972+ تلقائية 💬
                      </span>
                    </div>
                    <div className="relative flex items-center" dir="ltr">
                      <div className="bg-emerald-50 border border-r-0 border-slate-200 text-emerald-800 font-mono font-black text-xs px-3 py-3 rounded-l-xl flex items-center gap-1.5 shrink-0 select-none shadow-inner">
                        <Phone size={13} className="text-emerald-600" />
                        <span>+972</span>
                      </div>
                      <input 
                        type="text"
                        required
                        placeholder="50 123 4567"
                        value={promotePhone}
                        onChange={e => setPromotePhone(cleanLocalPhoneDigits(e.target.value))}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-r-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-mono font-bold text-left text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Gender & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-500 font-extrabold block">جنس الطالب *</label>
                    <div className="flex gap-4 pt-1.5">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="radio" 
                          name="promoteGender" 
                          value="Male" 
                          checked={promoteGender === 'Male'} 
                          onChange={() => setPromoteGender('Male')} 
                          className="accent-emerald-600 h-4 w-4"
                        />
                        <span className="text-slate-700">ذكر 👦</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input 
                          type="radio" 
                          name="promoteGender" 
                          value="Female" 
                          checked={promoteGender === 'Female'} 
                          onChange={() => setPromoteGender('Female')} 
                          className="accent-emerald-600 h-4 w-4"
                        />
                        <span className="text-slate-700">أنثى 👧</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-500 font-extrabold block">البريد الإلكتروني (اختياري)</label>
                    <input 
                      type="email"
                      placeholder="example@gmail.com"
                      value={promoteEmail}
                      onChange={e => setPromoteEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-mono font-semibold text-right"
                    />
                  </div>
                </div>

                {/* Teacher & Rate */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-500 font-extrabold block text-indigo-900">المعلم المنسّب *</label>
                    <select
                      required
                      value={promoteTeacherId}
                      onChange={e => setPromoteTeacherId(e.target.value)}
                      className="w-full px-4 py-3 bg-emerald-50/30 border border-emerald-200 rounded-xl outline-none focus:border-emerald-500 font-semibold"
                    >
                      <option value="">-- اختر المعلم --</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name} (التخصص: {t.specialization || 'عام'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-500 font-extrabold block">سعر الساعة للطالب (₪ شيكل)</label>
                    <input 
                      type="number"
                      placeholder="0"
                      value={promoteHourlyRate}
                      onChange={e => setPromoteHourlyRate(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-semibold text-right"
                    />
                  </div>
                </div>

                {/* Low Balance & Open Balance option */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-500 font-extrabold block">الحد الأدنى لرصيد التنبيه (₪)</label>
                    <input 
                      type="number"
                      placeholder="-100"
                      value={promoteLowBalanceThreshold}
                      onChange={e => setPromoteLowBalanceThreshold(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-semibold text-right"
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer py-3.5 bg-slate-50 px-3.5 border border-slate-200 rounded-xl">
                      <input 
                        type="checkbox"
                        checked={promoteIsOpenBalance}
                        onChange={e => setPromoteIsOpenBalance(e.target.checked)}
                        className="accent-emerald-600 rounded h-4 w-4"
                      />
                      <span className="text-slate-700 text-[11px]">تفعيل خيار الدفع اللاحق (رصيد مفتوح)</span>
                    </label>
                  </div>
                </div>

                {/* Financial Initial Payment */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-extrabold block text-emerald-800">الدفعة المالية الافتتاحية الأولى (اختياري - ₪ شيكل)</label>
                  <input 
                    type="number"
                    placeholder="مثال: 300 (إذا تم الدفع نقداً الآن لتبدأ بمثابة شحن رصيد)"
                    value={promoteInitialPayment}
                    onChange={e => setPromoteInitialPayment(e.target.value)}
                    className="w-full px-4 py-3 bg-emerald-500/5 border border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-semibold text-right text-emerald-950 font-mono"
                  />
                </div>

                {/* Account Status & Credentials Activation Section */}
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4.5 space-y-3.5">
                  <div className="flex items-center gap-2 text-indigo-950">
                    <Lock size={15} className="text-indigo-600 shrink-0" />
                    <span className="font-extrabold text-xs">إعدادات حالة الطالب وتفعيل الدخول للمنصة 🔑</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-slate-650 font-black block">حالة الطالب بعد الترحيل</label>
                      <select
                        value={promoteStatus}
                        onChange={e => {
                          const newStatus = e.target.value as StudentStatus;
                          setPromoteStatus(newStatus);
                          if (newStatus === StudentStatus.Pending) {
                            setPromoteActivateAccount(false);
                          } else {
                            setPromoteActivateAccount(true);
                          }
                        }}
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-semibold text-right"
                      >
                        <option value={StudentStatus.Assigned}>نشط / معتمد (Assigned) 🟢</option>
                        <option value={StudentStatus.Pending}>قيد الانتظار (Pending) ⏳</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 flex flex-col justify-end">
                      <label className="flex items-center gap-2 cursor-pointer py-3.5 bg-white px-3.5 border border-slate-200 rounded-xl h-10.5">
                        <input 
                          type="checkbox"
                          checked={promoteActivateAccount}
                          onChange={e => setPromoteActivateAccount(e.target.checked)}
                          className="accent-indigo-600 rounded h-4 w-4"
                        />
                        <span className="text-slate-700 text-[10px] font-bold">توليد وتفعيل حساب دخول الطالب تلقائياً 🔑</span>
                      </label>
                    </div>
                  </div>
                  
                  {promoteActivateAccount && (
                    <div className="text-[10px] text-indigo-700 font-bold bg-indigo-100/40 p-2.5 rounded-xl border border-indigo-100/30 flex items-center gap-1.5 leading-relaxed">
                      <Sparkles size={12} className="animate-pulse text-indigo-500 shrink-0" />
                      <span>سيقوم النظام بتوليد اسم مستخدم عشوائي وكلمة مرور آمنة تلقائياً وعرضها فور إتمام الحفظ لمشاركتها.</span>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-extrabold block">ملاحظات وسجل التسجيل</label>
                  <textarea 
                    rows={2}
                    placeholder="ملاحظات التسجيل..."
                    value={promoteNotes}
                    onChange={e => setPromoteNotes(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-semibold text-right leading-relaxed"
                  />
                </div>

                {/* Buttons controls */}
                <div className="flex gap-2.5 pt-4">
                  <button
                    type="submit"
                    disabled={isPromoting}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-md text-center flex items-center justify-center gap-1.5"
                  >
                    {isPromoting ? 'جاري الترحيل وحفظ البيانات...' : '✓ إكمال الترحيل وتسجيل الطالب'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPromoteModal(false);
                      setSelectedTrialForPromotion(null);
                    }}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black rounded-xl transition-all cursor-pointer text-center"
                  >
                    إلغاء الإجراء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Student Account Generated Modal */}
      <AnimatePresence>
        {createdStudentAccount && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto no-print" dir="rtl">
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
                  ⚠️ يرجى نسخ وممارسة بيانات الدخول مع الطالب أو ولي أمره فوراً لتسهيل الدخول للمنصة وأداء الاختبارات والواجبات.
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (createdStudentAccount?.studentId) {
                        handleNavigateToStudent(createdStudentAccount.studentId);
                      }
                      setCreatedStudentAccount(null);
                    }}
                    className="flex-1 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <UserCheck size={14} />
                    <span>الانتقال لملف الطالب بقائمة الطلاب 👤</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const shareText = `أهلاً بك في الأكاديمية! 🎉\nتم تفعيل حسابك بنجاح.\n\nاسم الطالب: ${createdStudentAccount.studentName}\nاسم المستخدم: ${createdStudentAccount.username}\nكلمة المرور: ${createdStudentAccount.password}\n\nنتمنى لك رحلة تعليمية متميزة! ✨`;
                      navigator.clipboard.writeText(shareText);
                      alert('تم نسخ نص الترحيب والبيانات بالكامل لمشاركتها عبر الواتساب!');
                    }}
                    className="py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-extrabold text-xs shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Copy size={14} />
                    <span>نسخ للواتساب 📋</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatedStudentAccount(null)}
                    className="px-4 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-extrabold text-xs transition-colors cursor-pointer"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
