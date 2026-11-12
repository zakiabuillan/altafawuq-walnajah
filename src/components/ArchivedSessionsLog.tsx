// @ts-nocheck
import { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Teacher, Student, Session, formatCustomDate } from '../types';
import { 
  Archive, Search, Calendar, User, Clock, Coins, Download, RefreshCw, 
  FileText, X, ChevronDown, ChevronUp, Filter, CheckCircle2, AlertCircle, 
  HelpCircle, Check, Loader2, BookOpen, Undo, FileSpreadsheet, Printer, Phone,
  SlidersHorizontal, ArrowUpDown, GraduationCap, CalendarDays, Sparkles, Layers,
  ChevronLeft, ChevronRight, Tag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { logActivity } from '../lib/activityLogger';
import * as XLSX from 'xlsx';

export default function ArchivedSessionsLog() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Advanced Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState(true);
  const [activeSearchTab, setActiveSearchTab] = useState<'all' | 'date' | 'student' | 'teacher'>('all');

  // Student Filter
  const [selectedStudentId, setSelectedStudentId] = useState('all');
  const [studentSearchInput, setStudentSearchInput] = useState('');
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false);

  // Teacher Filter
  const [selectedTeacherId, setSelectedTeacherId] = useState('all');
  const [teacherSearchInput, setTeacherSearchInput] = useState('');
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);

  // Date Filters (Exact date or Range)
  const [dateMode, setDateMode] = useState<'all' | 'exact' | 'range' | 'today' | 'this_week' | 'this_month' | 'last_month' | 'last_3_months' | 'this_year'>('all');
  const [exactDate, setExactDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Additional Filters & Sort
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [minHoursFilter, setMinHoursFilter] = useState<'all' | '1' | '1.5' | '2' | '3'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest_fee' | 'lowest_fee' | 'highest_hours' | 'student_name' | 'teacher_name'>('newest');

  // Detail Modal & Unarchive Confirm states
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [unarchiveConfirmSession, setUnarchiveConfirmSession] = useState<Session | null>(null);
  const [actionNotification, setActionNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Print Preview states
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printPreviewHtml, setPrintPreviewHtml] = useState('');
  const [printPreviewTitle, setPrintPreviewTitle] = useState('');

  // Load data via real-time listeners
  useEffect(() => {
    setLoading(true);
    
    // Subscribe to sessions
    const unsubSessions = onSnapshot(collection(db, 'sessions'), (snapshot) => {
      const sessList: Session[] = [];
      snapshot.forEach(docSnap => {
        sessList.push({ id: docSnap.id, ...docSnap.data() } as Session);
      });
      // Sort: newest first
      sessList.sort((a, b) => new Date(b.date || '').getTime() - new Date(a.date || '').getTime());
      setSessions(sessList);
      setLoading(false);
    }, (error) => {
      console.error("Error loading sessions in Archive Log:", error);
      setLoading(false);
    });

    // Subscribe to students
    const unsubStudents = onSnapshot(collection(db, 'students'), (snapshot) => {
      const studList: Student[] = [];
      snapshot.forEach(docSnap => {
        studList.push({ id: docSnap.id, ...docSnap.data() } as Student);
      });
      setStudents(studList);
    });

    // Subscribe to teachers
    const unsubTeachers = onSnapshot(collection(db, 'teachers'), (snapshot) => {
      const teachList: Teacher[] = [];
      snapshot.forEach(docSnap => {
        teachList.push({ id: docSnap.id, ...docSnap.data() } as Teacher);
      });
      setTeachers(teachList);
    });

    return () => {
      unsubSessions();
      unsubStudents();
      unsubTeachers();
    };
  }, []);

  // Filtered archived sessions
  const archivedSessions = useMemo(() => {
    return sessions.filter(s => s.archived === true);
  }, [sessions]);

  // Unique subjects for filter
  const availableSubjects = useMemo(() => {
    const subjects = new Set<string>();
    archivedSessions.forEach(s => {
      if (s.subject) {
        subjects.add(s.subject.trim());
      }
    });
    return Array.from(subjects);
  }, [archivedSessions]);

  // Helper for date presets
  const handleApplyDatePreset = (preset: typeof dateMode) => {
    setDateMode(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setExactDate(todayStr);
      setStartDate('');
      setEndDate('');
    } else if (preset === 'this_week') {
      const d = new Date(today);
      const day = d.getDay(); // Sunday is 0
      d.setDate(d.getDate() - day);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
      setExactDate('');
    } else if (preset === 'this_month') {
      const start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
      setExactDate('');
    } else if (preset === 'last_month') {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
      const end = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(end);
      setExactDate('');
    } else if (preset === 'last_3_months') {
      const start = new Date(today.getFullYear(), today.getMonth() - 3, 1).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(todayStr);
      setExactDate('');
    } else if (preset === 'this_year') {
      const start = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
      setStartDate(start);
      setEndDate(todayStr);
      setExactDate('');
    } else if (preset === 'exact') {
      if (!exactDate) setExactDate(todayStr);
      setStartDate('');
      setEndDate('');
    } else if (preset === 'range') {
      setExactDate('');
    } else {
      setExactDate('');
      setStartDate('');
      setEndDate('');
    }
  };

  // Autocomplete matching students
  const matchingStudents = useMemo(() => {
    if (!studentSearchInput.trim()) return students.slice(0, 10);
    const q = studentSearchInput.trim().toLowerCase();
    const cleanDigits = q.replace(/[\s\-\+\(\)]/g, '');
    return students.filter(s => {
      const name = (s.name || '').toLowerCase();
      const phone = (s.phone || '');
      const cleanPhone = phone.replace(/[\s\-\+\(\)]/g, '');
      return name.includes(q) || (cleanDigits.length >= 2 && cleanPhone.includes(cleanDigits)) || phone.includes(q);
    }).slice(0, 12);
  }, [students, studentSearchInput]);

  // Autocomplete matching teachers
  const matchingTeachers = useMemo(() => {
    if (!teacherSearchInput.trim()) return teachers;
    const q = teacherSearchInput.trim().toLowerCase();
    const cleanDigits = q.replace(/[\s\-\+\(\)]/g, '');
    return teachers.filter(t => {
      const name = (t.name || '').toLowerCase();
      const phone = (t.phone || '');
      const cleanPhone = phone.replace(/[\s\-\+\(\)]/g, '');
      const subject = (t.subject || '').toLowerCase();
      return name.includes(q) || subject.includes(q) || (cleanDigits.length >= 2 && cleanPhone.includes(cleanDigits)) || phone.includes(q);
    });
  }, [teachers, teacherSearchInput]);

  // Selected entities info
  const activeStudentObj = useMemo(() => {
    if (selectedStudentId === 'all') return null;
    return students.find(s => s.id === selectedStudentId) || null;
  }, [selectedStudentId, students]);

  const activeTeacherObj = useMemo(() => {
    if (selectedTeacherId === 'all') return null;
    return teachers.find(t => t.id === selectedTeacherId) || null;
  }, [selectedTeacherId, teachers]);

  // Active filter flag
  const hasActiveFilters = useMemo(() => {
    return Boolean(
      searchTerm ||
      selectedTeacherId !== 'all' ||
      teacherSearchInput ||
      selectedStudentId !== 'all' ||
      studentSearchInput ||
      selectedSubject !== 'all' ||
      dateMode !== 'all' ||
      exactDate ||
      startDate ||
      endDate ||
      minHoursFilter !== 'all' ||
      sortBy !== 'newest'
    );
  }, [
    searchTerm,
    selectedTeacherId,
    teacherSearchInput,
    selectedStudentId,
    studentSearchInput,
    selectedSubject,
    dateMode,
    exactDate,
    startDate,
    endDate,
    minHoursFilter,
    sortBy
  ]);

  const handleResetAllFilters = () => {
    setSearchTerm('');
    setSelectedTeacherId('all');
    setTeacherSearchInput('');
    setSelectedStudentId('all');
    setStudentSearchInput('');
    setSelectedSubject('all');
    setDateMode('all');
    setExactDate('');
    setStartDate('');
    setEndDate('');
    setMinHoursFilter('all');
    setSortBy('newest');
  };

  // Apply filters
  const filteredSessions = useMemo(() => {
    const list = archivedSessions.filter(session => {
      // 1. Teacher Filter
      if (selectedTeacherId !== 'all') {
        if (session.teacherId !== selectedTeacherId) return false;
      } else if (teacherSearchInput.trim() !== '') {
        const teacher = teachers.find(t => t.id === session.teacherId);
        const tName = (teacher?.name || '').toLowerCase();
        const tPhone = (teacher?.phone || '').toLowerCase();
        const tQuery = teacherSearchInput.trim().toLowerCase();
        const cleanTQuery = tQuery.replace(/[\s\-\+\(\)]/g, '');
        const cleanPhone = (teacher?.phone || '').replace(/[\s\-\+\(\)]/g, '');
        if (!tName.includes(tQuery) && !tPhone.includes(tQuery) && !(cleanTQuery.length >= 2 && cleanPhone.includes(cleanTQuery))) {
          return false;
        }
      }

      // 2. Student Filter
      if (selectedStudentId !== 'all') {
        if (session.studentId !== selectedStudentId) return false;
      } else if (studentSearchInput.trim() !== '') {
        const student = students.find(s => s.id === session.studentId);
        const sName = (student?.name || '').toLowerCase();
        const sPhone = (student?.phone || '').toLowerCase();
        const sQuery = studentSearchInput.trim().toLowerCase();
        const cleanSQuery = sQuery.replace(/[\s\-\+\(\)]/g, '');
        const cleanPhone = (student?.phone || '').replace(/[\s\-\+\(\)]/g, '');
        if (!sName.includes(sQuery) && !sPhone.includes(sQuery) && !(cleanSQuery.length >= 2 && cleanPhone.includes(cleanSQuery))) {
          return false;
        }
      }

      // 3. Subject Filter
      if (selectedSubject !== 'all' && session.subject !== selectedSubject) return false;

      // 4. Date Filters (Exact date or Range)
      const sessionDateStr = session.date ? session.date.slice(0, 10) : '';
      if (dateMode === 'exact' && exactDate) {
        if (sessionDateStr !== exactDate) return false;
      } else {
        if (startDate && sessionDateStr) {
          if (sessionDateStr < startDate) return false;
        }
        if (endDate && sessionDateStr) {
          if (sessionDateStr > endDate) return false;
        }
      }

      // 5. Min Hours Filter
      if (minHoursFilter !== 'all') {
        const minH = parseFloat(minHoursFilter);
        if ((session.durationHours || 0) < minH) return false;
      }

      // 6. Search term (Student phone, Student name, Teacher name, Subject, Topic, Notes, Date)
      if (searchTerm.trim() !== '') {
        const query = searchTerm.trim().toLowerCase();
        const cleanQueryDigits = query.replace(/[\s\-\+\(\)]/g, '');
        const teacher = teachers.find(t => t.id === session.teacherId);
        const student = students.find(s => s.id === session.studentId);
        
        const teacherName = teacher?.name?.toLowerCase() || '';
        const teacherPhone = teacher?.phone?.toLowerCase() || '';
        const teacherCleanPhone = (teacher?.phone || '').replace(/[\s\-\+\(\)]/g, '');

        const studentName = student?.name?.toLowerCase() || '';
        const studentPhone = student?.phone?.toLowerCase() || '';
        const studentCleanPhone = (student?.phone || '').replace(/[\s\-\+\(\)]/g, '');

        const topic = session.topic?.toLowerCase() || '';
        const notes = session.notes?.toLowerCase() || '';
        const subjectName = session.subject?.toLowerCase() || '';
        const dateStr = session.date || '';

        const matches = 
          studentName.includes(query) ||
          (cleanQueryDigits.length >= 2 && studentCleanPhone.includes(cleanQueryDigits)) ||
          studentPhone.includes(query) ||
          teacherName.includes(query) ||
          (cleanQueryDigits.length >= 2 && teacherCleanPhone.includes(cleanQueryDigits)) ||
          teacherPhone.includes(query) ||
          topic.includes(query) ||
          notes.includes(query) ||
          subjectName.includes(query) ||
          dateStr.includes(query);

        if (!matches) return false;
      }

      return true;
    });

    // Sort list according to sortBy
    return [...list].sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      }
      if (sortBy === 'oldest') {
        return new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime();
      }
      if (sortBy === 'highest_hours') {
        return (b.durationHours || 0) - (a.durationHours || 0);
      }
      if (sortBy === 'highest_fee') {
        const studentA = students.find(stud => stud.id === a.studentId);
        const teacherA = teachers.find(t => t.id === a.teacherId);
        const rateA = studentA?.customRates?.[a.teacherId] !== undefined ? studentA.customRates[a.teacherId] : (studentA?.hourlyRate || teacherA?.billingRate || 50);
        const feeA = a.customFee !== undefined ? a.customFee : (a.durationHours || 0) * rateA;

        const studentB = students.find(stud => stud.id === b.studentId);
        const teacherB = teachers.find(t => t.id === b.teacherId);
        const rateB = studentB?.customRates?.[b.teacherId] !== undefined ? studentB.customRates[b.teacherId] : (studentB?.hourlyRate || teacherB?.billingRate || 50);
        const feeB = b.customFee !== undefined ? b.customFee : (b.durationHours || 0) * rateB;

        return feeB - feeA;
      }
      if (sortBy === 'lowest_fee') {
        const studentA = students.find(stud => stud.id === a.studentId);
        const teacherA = teachers.find(t => t.id === a.teacherId);
        const rateA = studentA?.customRates?.[a.teacherId] !== undefined ? studentA.customRates[a.teacherId] : (studentA?.hourlyRate || teacherA?.billingRate || 50);
        const feeA = a.customFee !== undefined ? a.customFee : (a.durationHours || 0) * rateA;

        const studentB = students.find(stud => stud.id === b.studentId);
        const teacherB = teachers.find(t => t.id === b.teacherId);
        const rateB = studentB?.customRates?.[b.teacherId] !== undefined ? studentB.customRates[b.teacherId] : (studentB?.hourlyRate || teacherB?.billingRate || 50);
        const feeB = b.customFee !== undefined ? b.customFee : (b.durationHours || 0) * rateB;

        return feeA - feeB;
      }
      if (sortBy === 'student_name') {
        const nameA = students.find(s => s.id === a.studentId)?.name || '';
        const nameB = students.find(s => s.id === b.studentId)?.name || '';
        return nameA.localeCompare(nameB, 'ar');
      }
      if (sortBy === 'teacher_name') {
        const nameA = teachers.find(t => t.id === a.teacherId)?.name || '';
        const nameB = teachers.find(t => t.id === b.teacherId)?.name || '';
        return nameA.localeCompare(nameB, 'ar');
      }
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
    });
  }, [
    archivedSessions, 
    selectedTeacherId, 
    teacherSearchInput, 
    selectedStudentId, 
    studentSearchInput, 
    selectedSubject, 
    dateMode, 
    exactDate, 
    startDate, 
    endDate, 
    minHoursFilter, 
    searchTerm, 
    sortBy, 
    teachers, 
    students
  ]);

  // Statistics
  const stats = useMemo(() => {
    const totalCount = filteredSessions.length;
    const totalHours = filteredSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
    const totalFee = filteredSessions.reduce((sum, s) => {
      if (s.customFee !== undefined) return sum + s.customFee;
      // Calculate rate based on student settings
      const student = students.find(stud => stud.id === s.studentId);
      const teacher = teachers.find(t => t.id === s.teacherId);
      const rate = student?.customRates?.[s.teacherId] !== undefined
        ? student.customRates[s.teacherId]
        : (student?.hourlyRate || teacher?.billingRate || 50);
      return sum + ((s.durationHours || 0) * rate);
    }, 0);
    const totalPayout = filteredSessions.reduce((sum, s) => {
      if (s.customPayout !== undefined) return sum + s.customPayout;
      const teacher = teachers.find(t => t.id === s.teacherId);
      const rate = teacher?.payoutRate || teacher?.hourlyRate || 35;
      return sum + ((s.durationHours || 0) * rate);
    }, 0);

    return {
      totalCount,
      totalHours,
      totalFee,
      totalPayout
    };
  }, [filteredSessions, students, teachers]);

  // Trigger restore/unarchive
  const handleRestoreSession = async (sessionId: string) => {
    try {
      await updateDoc(doc(db, 'sessions', sessionId), { archived: false });
      
      // Activity Log
      try {
        await logActivity({
          actionType: 'SESSION_UNARCHIVE',
          actionName: 'استعادة حصة تعليمية من الأرشيف',
          details: `تم إلغاء أرشفة الحصة التعليمية (رقم: ${sessionId}) بنجاح وإعادتها لسجلات العمل النشطة.`
        });
      } catch (e) {
        console.error("Activity log failed", e);
      }

      showNotification('تم استعادة الحصة التعليمية بنجاح وإعادتها لسجلات الحصص النشطة 🟢', 'success');
    } catch (error) {
      console.error("Error unarchiving session:", error);
      showNotification('حدث خطأ أثناء محاولة استعادة الحصة، يرجى التحقق من اتصالك بالشبكة.', 'error');
    }
  };

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setActionNotification({ message, type });
    setTimeout(() => {
      setActionNotification(null);
    }, 4000);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (filteredSessions.length === 0) {
      showNotification('لا توجد بيانات لتصديرها!', 'error');
      return;
    }

    const data = filteredSessions.map((s, index) => {
      const teacher = teachers.find(t => t.id === s.teacherId);
      const student = students.find(stud => stud.id === s.studentId);
      
      const studentRate = student?.customRates?.[s.teacherId] !== undefined
        ? student.customRates[s.teacherId]
        : (student?.hourlyRate || teacher?.billingRate || 50);
      const calculatedFee = s.customFee !== undefined ? s.customFee : (s.durationHours * studentRate);
      
      const teacherRate = teacher?.payoutRate || teacher?.hourlyRate || 35;
      const calculatedPayout = s.customPayout !== undefined ? s.customPayout : (s.durationHours * teacherRate);

      return {
        'الرقم المتسلسل': index + 1,
        'تاريخ الحصة': s.date ? formatCustomDate(s.date) : 'غير محدد',
        'اسم المعلم': teacher?.name || 'غير معروف',
        'اسم الطالب': student?.name || 'غير معروف',
        'المادة': s.subject || 'غير محدد',
        'الموضوع / التقييم': s.topic || 'لا يوجد',
        'عدد الساعات': s.durationHours || 0,
        'تكلفة الحصة (شيكل)': calculatedFee,
        'مستحق المعلم (شيكل)': calculatedPayout,
        'حالة الحصة الأصلية': s.status === 'completed' ? 'منجزة' : s.status === 'cancelled' ? 'ملغاة' : 'أخرى',
        'ملاحظات إضافية': s.notes || 'لا يوجد'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "الأرشيف");
    
    // Auto-fit columns
    const max_author = data.reduce((w, r) => Math.max(w, r['اسم المعلم'].length), 10);
    worksheet["!cols"] = [
      { wch: 15 }, // الرقم المتسلسل
      { wch: 15 }, // تاريخ الحصة
      { wch: 22 }, // اسم المعلم
      { wch: 22 }, // اسم الطالب
      { wch: 18 }, // المادة
      { wch: 30 }, // الموضوع / التقييم
      { wch: 12 }, // عدد الساعات
      { wch: 18 }, // تكلفة الحصة
      { wch: 18 }, // مستحق المعلم
      { wch: 18 }, // حالة الحصة
      { wch: 30 }  // ملاحظات إضافية
    ];

    XLSX.writeFile(workbook, `سجل_أرشيف_الحصص_التعليمية_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showNotification('تم تصدير سجل الأرشيف إلى ملف Excel بنجاح 📊', 'success');
  };

  // Export to formatted PDF / Print Preview
  const handleExportPDF = () => {
    if (filteredSessions.length === 0) {
      showNotification('لا توجد بيانات لتصديرها كـ PDF!', 'error');
      return;
    }

    const formattedPrintDate = formatCustomDate(new Date().toISOString().split('T')[0]);
    const teacherFilterName = selectedTeacherId === 'all' 
      ? (teacherSearchInput.trim() ? `المعلم: "${teacherSearchInput.trim()}"` : 'جميع المعلمين') 
      : (teachers.find(t => t.id === selectedTeacherId)?.name || 'غير معروف');
    const studentFilterName = selectedStudentId === 'all' 
      ? (studentSearchInput.trim() ? `الطالب: "${studentSearchInput.trim()}"` : 'جميع الطلاب') 
      : (students.find(s => s.id === selectedStudentId)?.name || 'غير معروف');
    const subjectFilterName = selectedSubject === 'all' ? 'جميع المواد' : selectedSubject;
    const dateRangeStr = dateMode === 'exact' && exactDate
      ? `بتاريخ: ${exactDate}`
      : (startDate || endDate) 
        ? `الفترة: من ${startDate || 'البداية'} إلى ${endDate || 'الآن'}`
        : 'الفترة الزمنية: كامل السجل التاريخي للأرشيف';

    const sessionRowsHtml = filteredSessions.map((s, index) => {
      const teacher = teachers.find(t => t.id === s.teacherId);
      const student = students.find(stud => stud.id === s.studentId);
      
      const studentRate = student?.hourlyRate || student?.customRates?.[s.teacherId] || teacher?.billingRate || 50;
      const calculatedFee = s.customFee !== undefined ? s.customFee : (s.durationHours * studentRate);
      
      const teacherRate = teacher?.payoutRate || teacher?.hourlyRate || 35;
      const calculatedPayout = s.customPayout !== undefined ? s.customPayout : (s.durationHours * teacherRate);
      const margin = calculatedFee - calculatedPayout;

      return `
        <tr style="page-break-inside: avoid;">
          <td style="text-align: center; font-weight: bold; font-family: 'JetBrains Mono', monospace;">${index + 1}</td>
          <td style="text-align: center; font-family: 'JetBrains Mono', monospace;">${s.date ? formatCustomDate(s.date) : 'غير حدد'}</td>
          <td>${teacher?.name || 'غير معروف'}</td>
          <td>${student?.name || 'غير معروف'}</td>
          <td>
            <div style="font-weight: bold; color: #1e293b;">${s.subject || 'غير محدد'}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${s.topic || 'لا يوجد'}</div>
          </td>
          <td style="text-align: center; font-weight: bold; font-family: 'JetBrains Mono', monospace;">${s.durationHours || 0} س</td>
          <td style="text-align: left; font-weight: bold; font-family: 'JetBrains Mono', monospace; color: #0f766e;">₪${calculatedFee.toFixed(1)}</td>
          <td style="text-align: left; font-weight: bold; font-family: 'JetBrains Mono', monospace; color: #b45309;">₪${calculatedPayout.toFixed(1)}</td>
          <td style="text-align: left; font-weight: bold; font-family: 'JetBrains Mono', monospace; color: ${margin >= 0 ? '#15803d' : '#b91c1c'}">₪${margin.toFixed(1)}</td>
        </tr>
      `;
    }).join('');

    const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>كشف الحصص المؤرشفة - الأبعاد والمقاييس</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Cairo', sans-serif;
      margin: 0;
      padding: 30px;
      direction: rtl;
      background: #ffffff;
      color: #1e293b;
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
    }
    .btn {
      padding: 8px 18px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: bold;
      border: 1px solid #cbd5e1;
      background: white;
      color: #334155;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn:hover {
      background: #f1f5f9;
    }
    .btn-gold {
      background: #D4A33C;
      color: #0f172a;
      border-color: #fbe0a3;
    }
    .btn-gold:hover {
      background: #c29331;
    }
    .statement-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
    }
    .brand-sub {
      font-size: 11px;
      color: #64748b;
      margin-top: 4px;
      font-weight: bold;
    }
    .doc-title {
      font-size: 15px;
      font-weight: 900;
      background: #f8fafc;
      border-right: 4px solid #D4A33C;
      padding: 10px 15px;
      margin: 15px 0;
      color: #0f172a;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .meta-item {
      background: #f8fafc;
      padding: 10px 15px;
      border-radius: 10px;
      border: 1px solid #f1f5f9;
      font-size: 12px;
    }
    .meta-label {
      font-size: 10px;
      color: #64748b;
      font-weight: bold;
    }
    .meta-val {
      font-weight: 700;
      color: #0f172a;
      margin-top: 3px;
    }
    .summary-boxes {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 25px;
    }
    .summary-box {
      background: #fafaf9;
      border: 1px solid #f5f5f4;
      padding: 12px;
      border-radius: 12px;
      text-align: center;
    }
    .summary-box.payout {
      background: #fffbeb;
      border-color: #fef3c7;
    }
    .summary-box.fee {
      background: #f0fdf4;
      border-color: #dcfce7;
    }
    .summary-box.profit {
      background: #f0fdfa;
      border-color: #ccfbf1;
    }
    .summary-box-label {
      font-size: 10px;
      color: #64748b;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .summary-box-value {
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 11px;
    }
    .data-table th {
      background: #f8fafc;
      color: #475569;
      font-weight: 700;
      border-bottom: 2px solid #e2e8f0;
      padding: 8px 10px;
      font-size: 11px;
    }
    .data-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #f1f5f9;
      color: #334155;
    }
    .data-table tr:nth-child(even) {
      background: #fafafa;
    }
    .signatures-row {
      margin-top: 35px;
      display: flex;
      justify-content: space-between;
      border-top: 1px dotted #94a3b8;
      padding-top: 20px;
    }
    .signature-box {
      width: 200px;
      text-align: center;
    }
    .signature-title {
      font-size: 11px;
      font-weight: bold;
      color: #64748b;
    }
    .signature-line {
      margin-top: 35px;
      border-top: 1px dashed #cbd5e1;
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
      .meta-grid {
        gap: 8px !important;
        margin-bottom: 15px !important;
      }
      .meta-item {
        padding: 6px 10px !important;
        border-radius: 6px !important;
      }
      .summary-boxes {
        gap: 8px !important;
        margin-bottom: 15px !important;
      }
      .summary-box {
        padding: 8px !important;
        border-radius: 8px !important;
      }
      .summary-box-value {
        font-size: 13px !important;
      }
      .data-table {
        font-size: 8.5pt !important;
      }
      .data-table th, .data-table td {
        padding: 4px 6px !important;
      }
      .signatures-row {
        margin-top: 25px !important;
        padding-top: 12px !important;
      }
      .signature-line {
        margin-top: 25px !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div style="font-weight: bold; font-size: 14px; color: #1e293b; font-family: 'Cairo', sans-serif;">
      📄 كشف الحصص المؤرشفة جاهز للطباعة والتحويل بـ PDF
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="btn btn-gold" onclick="window.print()">🖨️ طباعة أو حفظ كـ PDF</button>
      <button class="btn" onclick="window.close()">إغلاق الصفحة</button>
    </div>
  </div>

  <div class="statement-card">
    <table class="header-table">
      <tr>
        <td style="text-align: right;">
          <div class="brand-title">أكاديمية الأبعاد والمقاييس للتعليم والتدريب 🏛️</div>
          <div class="brand-sub">سجل الأرشفة والتدقيق المرجعي للحصص التعليمية</div>
        </td>
        <td style="text-align: left; vertical-align: top; font-size: 11px; color: #64748b; font-weight: bold;">
          تاريخ استخراج التقرير: ${formattedPrintDate}<br>
          حالة التقرير: مؤرشف ومدقق محاسبياً
        </td>
      </tr>
    </table>

    <div class="doc-title">تقرير كشف الحصص التعليمية المؤرشفة المستخرجة</div>

    <div class="meta-grid">
      <div class="meta-item">
        <div class="meta-label">محددات المعلم والطلاب المفلترة</div>
        <div class="meta-val">المعلم: ${teacherFilterName} | الطالب: ${studentFilterName}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">نطاق المادة والفترة الزمنية</div>
        <div class="meta-val">المادة: ${subjectFilterName} | ${dateRangeStr}</div>
      </div>
    </div>

    <div class="summary-boxes">
      <div class="summary-box">
        <div class="summary-box-label">عدد الحصص المؤرشفة</div>
        <div class="summary-box-value">${stats.totalCount} حصة</div>
      </div>
      <div class="summary-box">
        <div class="summary-box-label">مجموع الساعات المنجزة</div>
        <div class="summary-box-value">${stats.totalHours} ساعة</div>
      </div>
      <div class="summary-box fee">
        <div class="summary-box-label">إجمالي تكلفة الطلاب (إيراد)</div>
        <div class="summary-box-value">₪${stats.totalFee.toFixed(1)}</div>
      </div>
      <div class="summary-box payout">
        <div class="summary-box-label">مجموع مستحقات المعلمين (رواتب)</div>
        <div class="summary-box-value">₪${stats.totalPayout.toFixed(1)}</div>
      </div>
    </div>

    <div class="summary-box profit" style="margin-bottom: 25px; padding: 12px; display: flex; justify-content: space-between; align-items: center; border-radius: 12px;">
      <div style="font-size: 11px; font-weight: bold; color: #0d9488;">صافي هامش الربح التشغيلي المحقق من الحصص المؤرشفة:</div>
      <div style="font-size: 18px; font-weight: 900; color: #0d9488;">₪${(stats.totalFee - stats.totalPayout).toFixed(1)}</div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 5%; text-align: center;">#</th>
          <th style="width: 12%; text-align: center;">تاريخ الحصة</th>
          <th style="width: 18%; text-align: right;">المعلم الأستاذ</th>
          <th style="width: 18%; text-align: right;">الطالب المستفيد</th>
          <th style="width: 23%; text-align: right;">المادة / الموضوع</th>
          <th style="width: 8%; text-align: center;">الساعات</th>
          <th style="width: 8%; text-align: left;">الإيراد</th>
          <th style="width: 8%; text-align: left;">الراتب</th>
          <th style="width: 10%; text-align: left;">الصافي</th>
        </tr>
      </thead>
      <tbody>
        ${sessionRowsHtml || `<tr><td colSpan="9" style="text-align: center; color: #64748b; padding: 20px;">لا توجد حصص مطابقة للفلاتر النشطة في الأرشيف</td></tr>`}
      </tbody>
    </table>

    <div class="signatures-row">
      <div class="signature-box">
        <div class="signature-title">المحاسب والمدقق المالي</div>
        <div class="signature-line"></div>
      </div>
      <div class="signature-box">
        <div class="signature-title">مدير المنصة أ.زكي أبو علان</div>
        <div class="signature-line"></div>
      </div>
    </div>
  </div>
</body>
</html>
    `;

    setPrintPreviewHtml(htmlContent);
    setPrintPreviewTitle(`سجل_الحصص_المؤرشفة_${new Date().toISOString().slice(0, 10)}`);
    setShowPrintPreview(true);
  };

  return (
    <div className="w-full flex flex-col gap-6" dir="rtl">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5">
            <Archive className="text-amber-500 w-6 h-6 shrink-0" />
            <span>مركز الأرشيف والتدقيق المرجعي للحصص 🗄️</span>
          </h2>
          <p className="text-xs font-bold text-slate-400 mt-1">
            سجل مرجعي متكامل ومحفوظ للمدير لمراجعة واسترجاع كافة الدروس والحصص المؤرشفة (أقدم من شهرين أو المؤرشفة يدويًا).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportExcel}
            disabled={filteredSessions.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <FileSpreadsheet size={15} />
            <span>تصدير للأرشيف المالي (Excel)</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={filteredSessions.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-[#D4A33C] hover:text-amber-300 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer"
          >
            <Printer size={15} />
            <span>تصدير كشف PDF 🖨️</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {actionNotification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl text-xs font-black flex items-center gap-2 border shadow-sm ${
              actionNotification.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : 'bg-red-50 text-red-800 border-red-200'
            }`}
          >
            {actionNotification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{actionNotification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overview Stats Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-200/50 flex items-center justify-center text-slate-600">
            <Archive size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400">عدد الحصص المؤرشفة</div>
            <div className="text-base font-black text-slate-800 mt-0.5">{stats.totalCount} حصة</div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Clock size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400">إجمالي الساعات المنجزة</div>
            <div className="text-base font-black text-blue-900 mt-0.5">{stats.totalHours.toFixed(1)} ساعة</div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
            <Coins size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400">إجمالي عوائد الطلبة</div>
            <div className="text-base font-black text-teal-900 mt-0.5">{stats.totalFee.toLocaleString()} ₪</div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Coins size={18} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400">أجور المعلمين المؤرشفة</div>
            <div className="text-base font-black text-[#D4A33C] mt-0.5">{stats.totalPayout.toLocaleString()} ₪</div>
          </div>
        </div>
      </div>

      {/* Advanced Search & Filtering Suite (البحث المتقدم في الأرشيف) */}
      <div className="bg-white border-2 border-slate-200/90 rounded-[2rem] p-5 sm:p-6 shadow-sm flex flex-col gap-4 relative">
        {/* Header with Title, Active Filters Badge & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-[#D4A33C] text-slate-950 flex items-center justify-center font-black shadow-xs">
              <SlidersHorizontal size={17} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black text-slate-900 font-sans">
                  البحث المتقدم وتصفية الحصص المؤرشفة 🔍
                </h3>
                {hasActiveFilters && (
                  <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-amber-500 text-slate-950 flex items-center gap-1 shadow-xs">
                    <Sparkles size={10} />
                    <span>فلاتر نشطة</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                تصفية فورية دقيقة حسب التاريخ، أو اسم الطالب، أو المعلم مع إحصائيات متزامنة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="text-[10.5px] font-black text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl px-3 py-1.5 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                title="تفريغ وإلغاء كافة فلاتر البحث النشطة"
              >
                <RefreshCw size={12} className="shrink-0" />
                <span>إعادة ضبط الفلاتر</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsAdvancedFiltersOpen(prev => !prev)}
              className="text-[10.5px] font-black text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl px-3 py-1.5 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>{isAdvancedFiltersOpen ? 'طي الأدوات' : 'عرض الأدوات'}</span>
              {isAdvancedFiltersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* Search Mode Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSearchTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeSearchTab === 'all'
                ? 'bg-slate-900 text-amber-400 shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Search size={13} />
            <span>بحث شامل</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSearchTab('date')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeSearchTab === 'date'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CalendarDays size={13} />
            <span>تصفية بالتاريخ 📅</span>
            {(dateMode !== 'all' || exactDate || startDate || endDate) && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSearchTab('student')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeSearchTab === 'student'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <GraduationCap size={13} />
            <span>تصفية باسم الطالب 👨‍🎓</span>
            {(selectedStudentId !== 'all' || studentSearchInput) && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSearchTab('teacher')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeSearchTab === 'teacher'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <User size={13} />
            <span>تصفية بالمعلم 👨‍🏫</span>
            {(selectedTeacherId !== 'all' || teacherSearchInput) && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            )}
          </button>
        </div>

        {/* Collapsible Filters Content */}
        {isAdvancedFiltersOpen && (
          <div className="flex flex-col gap-4 pt-1">
            {/* Quick Date Presets Strip (Always accessible for rapid one-click selection) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50/90 border border-slate-200/80 rounded-2xl">
              <span className="text-[10px] font-black text-slate-500 flex items-center gap-1 shrink-0">
                <Clock size={12} className="text-amber-600" />
                <span>فترات التاريخ الجاهزة بنقرة واحدة:</span>
              </span>

              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'all', label: 'كامل الأرشيف' },
                  { id: 'today', label: 'حصة اليوم' },
                  { id: 'this_week', label: 'هذا الأسبوع' },
                  { id: 'this_month', label: 'هذا الشهر' },
                  { id: 'last_month', label: 'الشهر الماضي' },
                  { id: 'last_3_months', label: 'آخر 3 أشهر' },
                  { id: 'this_year', label: 'هذا العام' },
                  { id: 'exact', label: 'تاريخ محدد 📅' },
                  { id: 'range', label: 'نطاق (من-إلى) 🗓️' }
                ].map(preset => {
                  const isActive = dateMode === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyDatePreset(preset.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-600/30'
                          : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-250'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* 1. Student Name Filter (Searchable with live auto-complete) */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[10px] font-black text-slate-600 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <GraduationCap size={13} className="text-emerald-600" />
                    <span>اسم الطالب المستفيد:</span>
                  </span>
                  {selectedStudentId !== 'all' && (
                    <span className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-black border border-emerald-200">
                      محدد
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="اكتب اسم الطالب أو رقم الهاتف..."
                    value={activeStudentObj ? activeStudentObj.name : studentSearchInput}
                    onFocus={() => setIsStudentDropdownOpen(true)}
                    onChange={e => {
                      setSelectedStudentId('all');
                      setStudentSearchInput(e.target.value);
                      setIsStudentDropdownOpen(true);
                    }}
                    className={`w-full text-xs font-bold bg-slate-50 border rounded-xl py-2.5 pr-3 pl-8 outline-hidden transition-all ${
                      selectedStudentId !== 'all'
                        ? 'border-emerald-500 bg-emerald-50/40 text-emerald-950 font-black'
                        : 'border-slate-250 focus:border-emerald-500 focus:bg-white text-slate-800'
                    }`}
                  />
                  {(studentSearchInput || selectedStudentId !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStudentId('all');
                        setStudentSearchInput('');
                        setIsStudentDropdownOpen(false);
                      }}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Auto-complete Dropdown for Students */}
                {isStudentDropdownOpen && (
                  <div className="absolute top-[64px] right-0 left-0 bg-white border-2 border-emerald-500/40 rounded-xl shadow-2xl z-40 max-h-56 overflow-y-auto p-1 divide-y divide-slate-100 animate-in fade-in zoom-in-95">
                    <div className="px-2 py-1 text-[9px] font-black text-slate-400 bg-slate-50 rounded flex items-center justify-between">
                      <span>الطلاب المطابقون ({matchingStudents.length})</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudentId('all');
                          setStudentSearchInput('');
                          setIsStudentDropdownOpen(false);
                        }}
                        className="text-emerald-700 hover:underline cursor-pointer"
                      >
                        عرض كل الطلاب
                      </button>
                    </div>
                    {matchingStudents.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400 font-bold">
                        لم يتم العثور على طالب يطابق هذا الاسم
                      </div>
                    ) : (
                      matchingStudents.map(stud => (
                        <button
                          key={stud.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudentId(stud.id);
                            setStudentSearchInput('');
                            setIsStudentDropdownOpen(false);
                          }}
                          className={`w-full text-right p-2 hover:bg-emerald-50 transition-colors flex items-center justify-between rounded-lg cursor-pointer ${
                            selectedStudentId === stud.id ? 'bg-emerald-100/60 font-black' : ''
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-800">{stud.name}</div>
                            {stud.phone && (
                              <div className="text-[9.5px] font-mono text-slate-400" dir="ltr">{stud.phone}</div>
                            )}
                          </div>
                          {stud.academicLevel && (
                            <span className="text-[9px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded font-bold border border-emerald-200">
                              {stud.academicLevel}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 2. Teacher Name Filter (Searchable with live auto-complete) */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[10px] font-black text-slate-600 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <User size={13} className="text-purple-600" />
                    <span>اسم المعلم الأستاذ:</span>
                  </span>
                  {selectedTeacherId !== 'all' && (
                    <span className="text-[9px] text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded font-black border border-purple-200">
                      محدد
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="اكتب اسم المعلم أو تخصصه..."
                    value={activeTeacherObj ? activeTeacherObj.name : teacherSearchInput}
                    onFocus={() => setIsTeacherDropdownOpen(true)}
                    onChange={e => {
                      setSelectedTeacherId('all');
                      setTeacherSearchInput(e.target.value);
                      setIsTeacherDropdownOpen(true);
                    }}
                    className={`w-full text-xs font-bold bg-slate-50 border rounded-xl py-2.5 pr-3 pl-8 outline-hidden transition-all ${
                      selectedTeacherId !== 'all'
                        ? 'border-purple-500 bg-purple-50/40 text-purple-950 font-black'
                        : 'border-slate-250 focus:border-purple-500 focus:bg-white text-slate-800'
                    }`}
                  />
                  {(teacherSearchInput || selectedTeacherId !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTeacherId('all');
                        setTeacherSearchInput('');
                        setIsTeacherDropdownOpen(false);
                      }}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Auto-complete Dropdown for Teachers */}
                {isTeacherDropdownOpen && (
                  <div className="absolute top-[64px] right-0 left-0 bg-white border-2 border-purple-500/40 rounded-xl shadow-2xl z-40 max-h-56 overflow-y-auto p-1 divide-y divide-slate-100 animate-in fade-in zoom-in-95">
                    <div className="px-2 py-1 text-[9px] font-black text-slate-400 bg-slate-50 rounded flex items-center justify-between">
                      <span>المعلمون المطابقون ({matchingTeachers.length})</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTeacherId('all');
                          setTeacherSearchInput('');
                          setIsTeacherDropdownOpen(false);
                        }}
                        className="text-purple-700 hover:underline cursor-pointer"
                      >
                        عرض كل المعلمين
                      </button>
                    </div>
                    {matchingTeachers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400 font-bold">
                        لم يتم العثور على معلم بهذا الاسم
                      </div>
                    ) : (
                      matchingTeachers.map(teach => (
                        <button
                          key={teach.id}
                          type="button"
                          onClick={() => {
                            setSelectedTeacherId(teach.id);
                            setTeacherSearchInput('');
                            setIsTeacherDropdownOpen(false);
                          }}
                          className={`w-full text-right p-2 hover:bg-purple-50 transition-colors flex items-center justify-between rounded-lg cursor-pointer ${
                            selectedTeacherId === teach.id ? 'bg-purple-100/60 font-black' : ''
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-800">{teach.name}</div>
                            {teach.subject && (
                              <div className="text-[9.5px] text-slate-400">{teach.subject}</div>
                            )}
                          </div>
                          {teach.phone && (
                            <span className="text-[9px] font-mono text-slate-400" dir="ltr">
                              {teach.phone}
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* 3. Date Filter Section (Exact Date or Range) */}
              {dateMode === 'exact' ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-600 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} className="text-blue-600" />
                      <span>تاريخ الحصة المحدد:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setDateMode('range')}
                      className="text-[9px] text-blue-700 hover:underline cursor-pointer"
                    >
                      التبديل لنطاق (من-إلى)
                    </button>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                    <input
                      type="date"
                      value={exactDate}
                      onChange={e => {
                        setExactDate(e.target.value);
                        setStartDate('');
                        setEndDate('');
                      }}
                      className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-250 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 pr-10 pl-3 outline-hidden transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-600 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calendar size={13} className="text-blue-600" />
                      <span>تاريخ البداية (من):</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setDateMode('exact')}
                      className="text-[9px] text-blue-700 hover:underline cursor-pointer"
                    >
                      تاريخ يوم محدد
                    </button>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={e => {
                        setStartDate(e.target.value);
                        setExactDate('');
                      }}
                      className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-250 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 pr-10 pl-3 outline-hidden transition-all"
                    />
                  </div>
                </div>
              )}

              {/* 4. End Date (if in range mode) OR Subject */}
              {dateMode !== 'exact' ? (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-600 flex items-center gap-1">
                    <Calendar size={13} className="text-blue-600" />
                    <span>تاريخ النهاية (إلى):</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={e => {
                        setEndDate(e.target.value);
                        setExactDate('');
                      }}
                      className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-250 focus:border-blue-500 focus:bg-white rounded-xl py-2.5 pr-10 pl-3 outline-hidden transition-all"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-600 flex items-center gap-1">
                    <BookOpen size={13} className="text-amber-600" />
                    <span>المادة الدراسية:</span>
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={e => setSelectedSubject(e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-250 focus:border-amber-500 rounded-xl py-2.5 px-3 outline-hidden transition-all cursor-pointer"
                  >
                    <option value="all">كل المواد التعليمية</option>
                    {availableSubjects.map((sub, idx) => (
                      <option key={idx} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Extra Controls: Search query, Subject (if range mode), Min duration & Sorting */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1 border-t border-slate-100">
              {/* Quick Text Search within results */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500">
                  بحث عام بالنص (الموضوع، الملاحظات، أو أرقام الهواتف)
                </label>
                <div className="relative">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="ابحث بموضوع الحصة، ملاحظات الدرس..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl py-2 pr-10 pl-8 outline-hidden transition-all"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Subject Dropdown (shown here if in range mode) */}
              {dateMode !== 'exact' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-slate-500">
                    المادة الدراسية
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={e => setSelectedSubject(e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl py-2 px-3 outline-hidden transition-all cursor-pointer"
                  >
                    <option value="all">كل المواد التعليمية ({availableSubjects.length})</option>
                    {availableSubjects.map((sub, idx) => (
                      <option key={idx} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Min Duration Filter */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500">
                  الحد الأدنى لعدد الساعات
                </label>
                <select
                  value={minHoursFilter}
                  onChange={e => setMinHoursFilter(e.target.value as any)}
                  className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl py-2 px-3 outline-hidden transition-all cursor-pointer"
                >
                  <option value="all">جميع الحصص (أي مدة)</option>
                  <option value="1">ساعة فأكثر (≥ 1.0 س)</option>
                  <option value="1.5">ساعة ونصف فأكثر (≥ 1.5 س)</option>
                  <option value="2">ساعتان فأكثر (≥ 2.0 س)</option>
                  <option value="3">3 ساعات فأكثر (≥ 3.0 س)</option>
                </select>
              </div>

              {/* Sorting Mode */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                  <ArrowUpDown size={11} className="text-amber-600" />
                  <span>ترتيب وفرز النتائج</span>
                </label>
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as any)}
                  className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 focus:border-amber-500 rounded-xl py-2 px-3 outline-hidden transition-all cursor-pointer font-sans"
                >
                  <option value="newest">📅 الأحدث تاريخاً أولاً</option>
                  <option value="oldest">📅 الأقدم تاريخاً أولاً</option>
                  <option value="highest_fee">💰 الأعلى تكلفة (إيراد الطلبة)</option>
                  <option value="lowest_fee">💰 الأقل تكلفة</option>
                  <option value="highest_hours">⏱️ الأكثر ساعات</option>
                  <option value="student_name">🔤 اسم الطالب (أبجدياً)</option>
                  <option value="teacher_name">🔤 اسم المعلم (أبجدياً)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Active Filter Chips Bar */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-100">
            <span className="text-[10px] font-black text-slate-400">الفلاتر المطبقة حالياً:</span>

            {/* Student Filter Chip */}
            {(selectedStudentId !== 'all' || studentSearchInput) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                <GraduationCap size={12} />
                <span>طالب: {activeStudentObj ? activeStudentObj.name : studentSearchInput}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudentId('all');
                    setStudentSearchInput('');
                  }}
                  className="hover:text-emerald-950 p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Teacher Filter Chip */}
            {(selectedTeacherId !== 'all' || teacherSearchInput) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 text-[11px] font-bold border border-purple-200">
                <User size={12} />
                <span>معلم: {activeTeacherObj ? activeTeacherObj.name : teacherSearchInput}</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeacherId('all');
                    setTeacherSearchInput('');
                  }}
                  className="hover:text-purple-950 p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Date Filter Chip */}
            {dateMode === 'exact' && exactDate && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200">
                <Calendar size={12} />
                <span>تاريخ محدد: {formatCustomDate(exactDate)}</span>
                <button
                  type="button"
                  onClick={() => {
                    setExactDate('');
                    setDateMode('all');
                  }}
                  className="hover:text-blue-950 p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {dateMode !== 'exact' && (startDate || endDate) && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-[11px] font-bold border border-blue-200">
                <Calendar size={12} />
                <span>فترة: {startDate ? formatCustomDate(startDate) : 'البداية'} ⬅️ {endDate ? formatCustomDate(endDate) : 'الآن'}</span>
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setDateMode('all');
                  }}
                  className="hover:text-blue-950 p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Subject Filter Chip */}
            {selectedSubject !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 text-[11px] font-bold border border-amber-200">
                <BookOpen size={12} />
                <span>المادة: {selectedSubject}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSubject('all')}
                  className="hover:text-amber-950 p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Min Hours Filter Chip */}
            {minHoursFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-bold border border-slate-300">
                <Clock size={12} />
                <span>المدة: ≥ {minHoursFilter} س</span>
                <button
                  type="button"
                  onClick={() => setMinHoursFilter('all')}
                  className="hover:text-slate-950 p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Search Term Chip */}
            {searchTerm && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-bold border border-slate-300">
                <Search size={12} />
                <span>نص: "{searchTerm}"</span>
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="hover:text-slate-950 p-0.5 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            )}

            {/* Clear All Trigger */}
            <button
              type="button"
              onClick={handleResetAllFilters}
              className="text-[10px] font-black text-rose-600 hover:text-rose-700 hover:underline mr-auto cursor-pointer"
            >
              مسح الكل ✕
            </button>
          </div>
        )}
      </div>

      {/* Real-time Results Counter & Live Metrics Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-3.5 sm:p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0">
            <Archive size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black">
                عُثر على <span className="text-amber-400 font-mono font-bold text-sm sm:text-base">{filteredSessions.length}</span> حصة مؤرشفة
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                (من أصل {archivedSessions.length} حصة في الأرشيف)
              </span>
            </div>
            <div className="text-[10px] text-slate-300 font-bold mt-0.5 hidden sm:block">
              مطابقة بدقة لمحددات التاريخ، اسم الطالب، والمعلم المحددة أعلاه
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs">
          <div className="bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700 flex items-center gap-1.5">
            <Clock size={12} className="text-blue-400" />
            <span className="text-[10px] text-slate-400">الساعات:</span>
            <span className="font-mono font-bold text-blue-300">{stats.totalHours.toFixed(1)} س</span>
          </div>

          <div className="bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700 flex items-center gap-1.5">
            <Coins size={12} className="text-teal-400" />
            <span className="text-[10px] text-slate-400">إيراد الطلبة:</span>
            <span className="font-mono font-bold text-teal-300">₪{stats.totalFee.toLocaleString()}</span>
          </div>

          <div className="bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-700 flex items-center gap-1.5">
            <Coins size={12} className="text-amber-400" />
            <span className="text-[10px] text-slate-400">رواتب المعلمين:</span>
            <span className="font-mono font-bold text-amber-300">₪{stats.totalPayout.toLocaleString()}</span>
          </div>

          <div className="bg-emerald-950/70 px-2.5 py-1 rounded-xl border border-emerald-500/40 flex items-center gap-1.5">
            <span className="text-[10px] text-emerald-300">الصافي:</span>
            <span className="font-mono font-black text-emerald-400">₪{(stats.totalFee - stats.totalPayout).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Main Table Layout */}
      <div className="bg-white border border-slate-150 rounded-[2rem] shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-amber-500 w-8 h-8" />
            <p className="text-xs font-bold text-slate-400">جاري تحميل ومزامنة سجل الأرشيف المرجعي...</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="py-24 text-center">
            <Archive size={48} className="text-slate-200 mx-auto mb-4" />
            <h4 className="text-sm font-black text-slate-700">لا تتوفر أي حصص في الأرشيف مطابقة للفلاتر</h4>
            <p className="text-xs font-bold text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
              تأكد من اختيار فلاتر صحيحة، أو أن هناك حصصاً تم أرشفتها مسبقاً من خلال واجهة رصد الحصص.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-right" dir="rtl">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-150">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">#</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">التاريخ والوقت</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase min-w-[240px] w-[26%]">اسم الطالب</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase min-w-[200px] w-[22%]">اسم المعلم</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">المادة والموضوع</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">المدة</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-left">التكلفة والراتب</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase text-center">التحكم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSessions.map((session, index) => {
                  const teacher = teachers.find(t => t.id === session.teacherId);
                  const student = students.find(stud => stud.id === session.studentId);
                  
                  const studentRate = student?.customRates?.[session.teacherId] !== undefined
                    ? student.customRates[session.teacherId]
                    : (student?.hourlyRate || teacher?.billingRate || 50);
                  const calculatedFee = session.customFee !== undefined ? session.customFee : (session.durationHours * studentRate);
                  
                  const teacherRate = teacher?.payoutRate || teacher?.hourlyRate || 35;
                  const calculatedPayout = session.customPayout !== undefined ? session.customPayout : (session.durationHours * teacherRate);

                  return (
                    <tr 
                      key={session.id} 
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      {/* Index */}
                      <td className="px-6 py-4 text-[10px] font-black text-slate-400">
                        {index + 1}
                      </td>

                      {/* Date & Time */}
                      <td className="px-6 py-4">
                        <div className="text-xs font-black text-slate-800">
                          {session.date ? formatCustomDate(session.date) : 'غير محدد'}
                        </div>
                        {session.startTime && (
                          <div className="text-[10px] text-slate-400 font-bold mt-0.5 flex items-center gap-1">
                            <Clock size={10} />
                            <span>{session.startTime}</span>
                          </div>
                        )}
                      </td>

                      {/* Student Name */}
                      <td className="px-6 py-4 min-w-[240px]">
                        <div className="text-xs font-black text-slate-900 leading-snug whitespace-normal break-words">
                          {student?.name || <span className="text-red-500">طالب غير موجود</span>}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {student?.phone && (
                            <span className="inline-flex items-center gap-1 text-[9.5px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-mono font-bold border border-slate-200/60" dir="ltr">
                              <Phone size={8.5} className="text-slate-400" />
                              <span>{student.phone}</span>
                            </span>
                          )}
                          {student?.academicLevel && (
                            <span className="text-[9px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-black border border-indigo-100">
                              {student.academicLevel}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Teacher Name */}
                      <td className="px-6 py-4 min-w-[200px]">
                        <div className="text-xs font-black text-slate-800 leading-snug whitespace-normal break-words">
                          {teacher?.name || <span className="text-red-500">معلم غير موجود</span>}
                        </div>
                        {teacher?.contact && (
                          <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                            {teacher.contact}
                          </div>
                        )}
                      </td>

                      {/* Subject and Topic */}
                      <td className="px-6 py-4 max-w-xs">
                        <div className="text-xs font-black text-slate-800 truncate">
                          {session.subject || 'غير محدد'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold mt-0.5 truncate max-w-xs" title={session.topic}>
                          {session.topic || 'بدون موضوع مدون'}
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-black">
                          {session.durationHours} {session.durationHours === 1 ? 'ساعة' : 'ساعات'}
                        </span>
                      </td>

                      {/* Financial values */}
                      <td className="px-6 py-4 text-left font-mono">
                        <div className="text-xs font-black text-teal-600">
                          +{calculatedFee} ₪ <span className="text-[9px] font-sans text-slate-400 font-normal">(وارد)</span>
                        </div>
                        <div className="text-[11px] font-black text-amber-600 mt-0.5">
                          -{calculatedPayout} ₪ <span className="text-[9px] font-sans text-slate-400 font-normal">(راتب)</span>
                        </div>
                      </td>

                      {/* Controls */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedSession(session)}
                            title="عرض التفاصيل الكاملة"
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <FileText size={15} />
                          </button>
                          
                          <button
                            onClick={() => setUnarchiveConfirmSession(session)}
                            title="إلغاء الأرشفة واستعادة الحصة"
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Undo size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail View Modal */}
      <AnimatePresence>
        {selectedSession && (() => {
          const teacher = teachers.find(t => t.id === selectedSession.teacherId);
          const student = students.find(stud => stud.id === selectedSession.studentId);
          
          const studentRate = student?.customRates?.[selectedSession.teacherId] !== undefined
            ? student.customRates[selectedSession.teacherId]
            : (student?.hourlyRate || teacher?.billingRate || 50);
          const calculatedFee = selectedSession.customFee !== undefined ? selectedSession.customFee : (selectedSession.durationHours * studentRate);
          
          const teacherRate = teacher?.payoutRate || teacher?.hourlyRate || 35;
          const calculatedPayout = selectedSession.customPayout !== undefined ? selectedSession.customPayout : (selectedSession.durationHours * teacherRate);

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[250] p-4 text-right no-print" dir="rtl">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-[2rem] max-w-lg w-full p-8 border border-slate-100 shadow-2xl flex flex-col gap-6 max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                      <Archive size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">تفاصيل الحصة المؤرشفة</h3>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">الرقم المرجعي: {selectedSession.id}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedSession(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block">اسم الطالب</span>
                    <strong className="text-xs font-black text-slate-800 mt-1 block">{student?.name || 'غير متوفر'}</strong>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block">اسم المعلم</span>
                    <strong className="text-xs font-black text-slate-800 mt-1 block">{teacher?.name || 'غير متوفر'}</strong>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block">المادة الدراسية</span>
                    <strong className="text-xs font-black text-slate-800 mt-1 block">{selectedSession.subject || 'غير محدد'}</strong>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block">تاريخ ووقت اللقاء</span>
                    <strong className="text-xs font-black text-slate-800 mt-1 block">
                      {selectedSession.date ? formatCustomDate(selectedSession.date) : 'غير محدد'} 
                      {selectedSession.startTime ? ` (${selectedSession.startTime})` : ''}
                    </strong>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block">مدة الحصة</span>
                    <strong className="text-xs font-black text-blue-700 mt-1 block">{selectedSession.durationHours} ساعة منجزة</strong>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 block">الحالة عند الأرشفة</span>
                    <strong className="text-xs font-black text-slate-800 mt-1 block">
                      {selectedSession.status === 'completed' ? 'منجزة ✅' : selectedSession.status === 'cancelled' ? 'ملغاة ❌' : 'أخرى'}
                    </strong>
                  </div>
                </div>

                {/* Topics / Feedback */}
                <div className="flex flex-col gap-3">
                  <div className="border border-slate-100 p-4 rounded-xl bg-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 block">موضوع الدرس</span>
                    <p className="text-xs font-bold text-slate-700 mt-1 whitespace-pre-line leading-relaxed">
                      {selectedSession.topic || 'لا توجد تفاصيل مدونة لموضوع الدرس.'}
                    </p>
                  </div>

                  <div className="border border-slate-100 p-4 rounded-xl bg-slate-50">
                    <span className="text-[10px] font-bold text-slate-400 block">تقييم الأداء والواجب المالي</span>
                    <p className="text-xs font-bold text-slate-700 mt-1 whitespace-pre-line leading-relaxed">
                      {selectedSession.feedback || 'لم يتم كتابة تعليقات تقييمية للأداء.'}
                    </p>
                  </div>

                  {selectedSession.notes && (
                    <div className="border border-slate-100 p-4 rounded-xl bg-slate-50">
                      <span className="text-[10px] font-bold text-slate-400 block">ملاحظات المدير</span>
                      <p className="text-xs font-bold text-slate-700 mt-1 whitespace-pre-line leading-relaxed">
                        {selectedSession.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Financial detail card */}
                <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl flex items-center justify-between font-mono text-xs font-black">
                  <div className="text-teal-700">
                    <span>التكلفة (إيراد): </span>
                    <span>{calculatedFee} ₪</span>
                  </div>
                  <div className="text-amber-700">
                    <span>مستحق المعلم (راتب): </span>
                    <span>{calculatedPayout} ₪</span>
                  </div>
                  <div className="text-slate-600">
                    <span>صافي الفائدة: </span>
                    <span className={(calculatedFee - calculatedPayout) >= 0 ? "text-emerald-600" : "text-red-500"}>
                      {(calculatedFee - calculatedPayout)} ₪
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-end border-t border-slate-150 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setUnarchiveConfirmSession(selectedSession);
                      setSelectedSession(null);
                    }}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Undo size={14} />
                    <span>استعادة للنشط</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSession(null)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors cursor-pointer"
                  >
                    إغلاق النافذة
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Unarchive Confirmation Modal */}
      <AnimatePresence>
        {unarchiveConfirmSession && (() => {
          const student = students.find(stud => stud.id === unarchiveConfirmSession.studentId);
          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[250] p-4 text-right no-print" dir="rtl">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-[2rem] max-w-md w-full p-8 border border-slate-100 shadow-2xl flex flex-col gap-6"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                    <Undo size={22} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">إلغاء أرشفة الحصة</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">إعادة الحصة إلى قائمة الرصد النشطة</p>
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-650 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  هل أنت متأكد من رغبتك في إلغاء أرشفة الحصة بتاريخ <strong className="text-slate-900">{unarchiveConfirmSession.date ? formatCustomDate(unarchiveConfirmSession.date) : 'غير محدد'}</strong> للطالب <strong className="text-slate-900">"{student?.name || 'غير معروف'}"</strong>؟
                  <div className="mt-2 text-[10px] text-amber-600">
                    ⚠️ سيتم مراجعة احتساب حصص الطالب والتقارير المالية بناء على استعادة هذه الحصة لتظهر في لوحة رصد الحصص والتحصيلات النشطة.
                  </div>
                </div>

                <div className="flex items-center gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      handleRestoreSession(unarchiveConfirmSession.id);
                      setUnarchiveConfirmSession(null);
                    }}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer"
                  >
                    نعم، استعادة الحصة 🟢
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnarchiveConfirmSession(null)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
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
                
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer"
                >
                  <X size={13} />
                  <span>إغلاق ❌</span>
                </button>
              </div>
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
