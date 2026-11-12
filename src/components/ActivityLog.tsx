import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  getDocs, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ActivityLog as ActivityLogType } from '../lib/activityLogger';
import { Teacher, Student } from '../types';
import { 
  History, 
  DollarSign, 
  UserMinus, 
  UserX, 
  RefreshCw, 
  Search, 
  Filter, 
  Calendar, 
  FileSpreadsheet, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  User, 
  ArrowUpDown, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  ChevronDown, 
  Settings, 
  CreditCard, 
  FileText, 
  ShieldCheck,
  Sparkles,
  ArrowRight,
  TrendingUp,
  GraduationCap,
  Zap,
  X,
  RotateCcw,
  SlidersHorizontal,
  Briefcase,
  Layers,
  UserCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface ActivityLogProps {
  onClose?: () => void;
  isModal?: boolean;
  initialFilter?: string;
  initialTeacherName?: string;
  initialStudentName?: string;
}

export type SearchScope = 'ALL' | 'TEACHER' | 'STUDENT' | 'ACTION' | 'USER';

// Helper to reliably extract affected student name from ActivityLog item
export const getAffectedStudentName = (log: ActivityLogType, studentsList?: Student[]): string | null => {
  if (log.studentName && log.studentName.trim()) {
    return log.studentName.trim();
  }
  if (log.metadata?.studentName && typeof log.metadata.studentName === 'string' && log.metadata.studentName.trim()) {
    return log.metadata.studentName.trim();
  }
  if (log.metadata?.student && typeof log.metadata.student === 'string' && log.metadata.student.trim()) {
    return log.metadata.student.trim();
  }
  if (log.studentId && studentsList && studentsList.length > 0) {
    const s = studentsList.find(x => x.id === log.studentId);
    if (s) return s.name;
  }
  // Try extracting from details string (e.g. للطالب "احمد" or الطالب "احمد" or الطالب (احمد))
  const quotedMatch = log.details?.match(/(?:الطالب(?:ة)?|للطالب(?:ة)?)\s*["“'«]([^"”'»]+)["”'»]/);
  if (quotedMatch && quotedMatch[1] && quotedMatch[1].trim()) return quotedMatch[1].trim();

  const parenMatch = log.details?.match(/(?:الطالب(?:ة)?|للطالب(?:ة)?)\s*\(([^)]+)\)/);
  if (parenMatch && parenMatch[1] && parenMatch[1].trim()) return parenMatch[1].trim();

  const colonMatch = log.details?.match(/(?:طالب|الطالب):\s*([^\s,،]+(?:\s+[^\s,،]+)?)/);
  if (colonMatch && colonMatch[1] && colonMatch[1].trim()) return colonMatch[1].trim();

  return null;
};

// Helper to reliably extract affected/involved teacher name from ActivityLog item
export const getAffectedTeacherName = (log: ActivityLogType, teachersList?: Teacher[]): string | null => {
  if (log.teacherName && log.teacherName.trim()) {
    return log.teacherName.trim();
  }
  if (log.metadata?.teacherName && typeof log.metadata.teacherName === 'string' && log.metadata.teacherName.trim()) {
    return log.metadata.teacherName.trim();
  }
  if (log.metadata?.teacher && typeof log.metadata.teacher === 'string' && log.metadata.teacher.trim()) {
    return log.metadata.teacher.trim();
  }
  if (log.metadata?.newTeacherName && typeof log.metadata.newTeacherName === 'string' && log.metadata.newTeacherName.trim()) {
    return log.metadata.newTeacherName.trim();
  }
  if (log.metadata?.oldTeacherName && typeof log.metadata.oldTeacherName === 'string' && log.metadata.oldTeacherName.trim()) {
    return log.metadata.oldTeacherName.trim();
  }
  if (log.teacherId && teachersList && teachersList.length > 0) {
    const t = teachersList.find(x => x.id === log.teacherId);
    if (t) return t.name;
  }

  // Regex patterns from details string (e.g. للمعلم "احمد" or المعلم "احمد" or الأستاذ "احمد")
  const quotedMatch = log.details?.match(/(?:المعلم(?:ة)?|للمعلم(?:ة)?|الأستاذ(?:ة)?|للأستاذ(?:ة)?)\s*["“'«]([^"”'»]+)["”'»]/);
  if (quotedMatch && quotedMatch[1] && quotedMatch[1].trim()) return quotedMatch[1].trim();

  const parenMatch = log.details?.match(/(?:المعلم(?:ة)?|للمعلم(?:ة)?|الأستاذ(?:ة)?|للأستاذ(?:ة)?)\s*\(([^)]+)\)/);
  if (parenMatch && parenMatch[1] && parenMatch[1].trim()) return parenMatch[1].trim();

  const colonMatch = log.details?.match(/(?:معلم|المعلم|الأستاذ):\s*([^\s,،]+(?:\s+[^\s,،]+)?)/);
  if (colonMatch && colonMatch[1] && colonMatch[1].trim()) return colonMatch[1].trim();

  // If the actor is a teacher from teachersList
  if (log.actor && teachersList && teachersList.length > 0) {
    const matched = teachersList.find(t => 
      log.actor.toLowerCase().includes(t.name.toLowerCase()) || 
      t.name.toLowerCase().includes(log.actor.toLowerCase())
    );
    if (matched) return matched.name;
  }

  // If actor is not admin/system, actor might be the teacher who performed the action
  if (log.actor && !log.actor.includes('مدير') && !log.actor.includes('المدير') && !log.actor.includes('نظام') && !log.actor.includes('System')) {
    return log.actor.trim();
  }

  return null;
};

// Check if log is related to a specific teacher
export const isLogMatchingTeacher = (log: ActivityLogType, teacherTarget: string, teachersList?: Teacher[]): boolean => {
  if (!teacherTarget || teacherTarget === 'ALL') return true;
  const targetLower = teacherTarget.toLowerCase().trim();

  if (log.teacherName && (log.teacherName.toLowerCase().trim() === targetLower || log.teacherName.toLowerCase().includes(targetLower))) return true;

  const extracted = getAffectedTeacherName(log, teachersList);
  if (extracted && (extracted.toLowerCase().trim() === targetLower || extracted.toLowerCase().includes(targetLower))) return true;

  if (log.actor && (log.actor.toLowerCase().trim() === targetLower || log.actor.toLowerCase().includes(targetLower))) return true;

  if (log.details && log.details.toLowerCase().includes(targetLower)) return true;
  if (log.metadata?.newTeacherName && String(log.metadata.newTeacherName).toLowerCase().includes(targetLower)) return true;
  if (log.metadata?.oldTeacherName && String(log.metadata.oldTeacherName).toLowerCase().includes(targetLower)) return true;
  if (log.metadata?.teacher && String(log.metadata.teacher).toLowerCase().includes(targetLower)) return true;

  if (teachersList) {
    const tObj = teachersList.find(t => t.name.toLowerCase().trim() === targetLower || t.id === teacherTarget);
    if (tObj) {
      if (log.teacherId === tObj.id) return true;
      if (log.metadata?.teacherId === tObj.id) return true;
      if (log.details && log.details.toLowerCase().includes(tObj.name.toLowerCase())) return true;
    }
  }

  return false;
};

// Check if log is related to a specific student
export const isLogMatchingStudent = (log: ActivityLogType, studentTarget: string, studentsList?: Student[]): boolean => {
  if (!studentTarget || studentTarget === 'ALL') return true;
  const targetLower = studentTarget.toLowerCase().trim();

  if (log.studentName && (log.studentName.toLowerCase().trim() === targetLower || log.studentName.toLowerCase().includes(targetLower))) return true;

  const extracted = getAffectedStudentName(log, studentsList);
  if (extracted && (extracted.toLowerCase().trim() === targetLower || extracted.toLowerCase().includes(targetLower))) return true;

  if (log.details && log.details.toLowerCase().includes(targetLower)) return true;
  if (log.metadata?.studentName && String(log.metadata.studentName).toLowerCase().includes(targetLower)) return true;
  if (log.metadata?.student && String(log.metadata.student).toLowerCase().includes(targetLower)) return true;

  if (studentsList) {
    const sObj = studentsList.find(s => s.name.toLowerCase().trim() === targetLower || s.id === studentTarget);
    if (sObj) {
      if (log.studentId === sObj.id) return true;
      if (log.metadata?.studentId === sObj.id) return true;
      if (log.details && log.details.toLowerCase().includes(sObj.name.toLowerCase())) return true;
    }
  }

  return false;
};

// Check if log is related to a specific action
export const isLogMatchingAction = (log: ActivityLogType, actionTarget: string): boolean => {
  if (!actionTarget || actionTarget === 'ALL') return true;
  const targetLower = actionTarget.toLowerCase().trim();

  if (log.actionName && (log.actionName.toLowerCase().trim() === targetLower || log.actionName.toLowerCase().includes(targetLower))) return true;
  if (log.actionType && (log.actionType.toLowerCase().trim() === targetLower || log.actionType.toLowerCase().includes(targetLower))) return true;
  if (log.details && log.details.toLowerCase().includes(targetLower)) return true;

  return false;
};

export const ActivityLog: React.FC<ActivityLogProps> = ({
  onClose,
  isModal = false,
  initialFilter = 'ALL',
  initialTeacherName,
  initialStudentName
}) => {
  const [logs, setLogs] = useState<ActivityLogType[]>([]);
  const [teachersList, setTeachersList] = useState<Teacher[]>([]);
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('ALL');
  const [categoryFilter, setCategoryFilter] = useState(initialFilter);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [actorFilter, setActorFilter] = useState('ALL');
  
  // Specific Manager Filters
  const [teacherFilter, setTeacherFilter] = useState<string>(initialTeacherName || 'ALL');
  const [studentFilter, setStudentFilter] = useState<string>(initialStudentName || 'ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Clear log confirmation modal
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearConfirmationText, setClearConfirmationText] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState('');
  const [clearSuccessNotice, setClearSuccessNotice] = useState(false);

  // Subscribe to activityLogs in Firestore real-time
  useEffect(() => {
    setLoading(true);
    let unsubscribeLogs: () => void;
    let unsubscribeTeachers: () => void;
    let unsubscribeStudents: () => void;

    try {
      // 1. Logs listener
      const q = query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'));
      unsubscribeLogs = onSnapshot(q, (snapshot) => {
        const fetched = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as ActivityLogType[];
        setLogs(fetched);
        setLoading(false);
      }, (error) => {
        console.warn("Real-time listener with orderBy failed, falling back to memory sort:", error);
        const fallbackQ = collection(db, 'activityLogs');
        unsubscribeLogs = onSnapshot(fallbackQ, (fallbackSnap) => {
          const fallbackList = fallbackSnap.docs.map(d => ({
            id: d.id,
            ...d.data()
          })) as ActivityLogType[];
          fallbackList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setLogs(fallbackList);
          setLoading(false);
        });
      });

      // 2. Teachers collection listener
      unsubscribeTeachers = onSnapshot(collection(db, 'teachers'), (snap) => {
        const tList = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Teacher[];
        setTeachersList(tList);
      }, (err) => {
        console.warn("Error fetching teachers for ActivityLog filter:", err);
      });

      // 3. Students collection listener
      unsubscribeStudents = onSnapshot(collection(db, 'students'), (snap) => {
        const sList = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Student[];
        setStudentsList(sList);
      }, (err) => {
        console.warn("Error fetching students for ActivityLog filter:", err);
      });
    } catch (err) {
      console.error("Error setting up activity logs listener:", err);
      fetchLogsManually();
    }

    return () => {
      if (unsubscribeLogs) unsubscribeLogs();
      if (unsubscribeTeachers) unsubscribeTeachers();
      if (unsubscribeStudents) unsubscribeStudents();
    };
  }, []);

  const fetchLogsManually = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'activityLogs'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as ActivityLogType[];
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(list);
    } catch (e) {
      console.error("Failed manual fetch of logs:", e);
    } finally {
      setLoading(false);
    }
  };

  // Distinct actors for filter
  const distinctActors = useMemo(() => {
    const actorsSet = new Set<string>();
    logs.forEach(l => {
      if (l.actor) actorsSet.add(l.actor);
    });
    return Array.from(actorsSet);
  }, [logs]);

  // All distinct teachers combined from teachers collection + logs
  const allTeachersOptions = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    
    // Seed from teachers collection
    teachersList.forEach(t => {
      if (t.name && t.name.trim()) {
        map.set(t.name.trim(), { name: t.name.trim(), count: 0 });
      }
    });

    // Also scan logs for teachers
    logs.forEach(l => {
      const tName = getAffectedTeacherName(l, teachersList);
      if (tName && tName.trim()) {
        const trimmed = tName.trim();
        const existing = map.get(trimmed) || { name: trimmed, count: 0 };
        existing.count += 1;
        map.set(trimmed, existing);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name, 'ar');
    });
  }, [teachersList, logs]);

  // All distinct students combined from students collection + logs
  const allStudentsOptions = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();

    // Seed from students collection
    studentsList.forEach(s => {
      if (s.name && s.name.trim()) {
        map.set(s.name.trim(), { name: s.name.trim(), count: 0 });
      }
    });

    // Also scan logs for affected students
    logs.forEach(l => {
      const sName = getAffectedStudentName(l, studentsList);
      if (sName && sName.trim()) {
        const trimmed = sName.trim();
        const existing = map.get(trimmed) || { name: trimmed, count: 0 };
        existing.count += 1;
        map.set(trimmed, existing);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name, 'ar');
    });
  }, [studentsList, logs]);

  // All distinct operations/actions with counts
  const allOperationsOptions = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();

    logs.forEach(l => {
      const opName = l.actionName?.trim() || l.actionType?.trim();
      if (opName) {
        const existing = map.get(opName) || { name: opName, count: 0 };
        existing.count += 1;
        map.set(opName, existing);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [logs]);

  // Filtered & Sorted Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. Teacher Filter (Specific teacher selected by Director)
      if (teacherFilter !== 'ALL') {
        if (!isLogMatchingTeacher(log, teacherFilter, teachersList)) return false;
      }

      // 2. Student Filter (Specific student selected by Director)
      if (studentFilter !== 'ALL') {
        if (!isLogMatchingStudent(log, studentFilter, studentsList)) return false;
      }

      // 3. Action Filter (Specific operation selected by Director)
      if (actionFilter !== 'ALL') {
        if (!isLogMatchingAction(log, actionFilter)) return false;
      }

      // 4. Search Query with Scope Support (Teacher / Student / Action / User / All)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const studentName = (getAffectedStudentName(log, studentsList) || '').toLowerCase();
        const teacherName = (getAffectedTeacherName(log, teachersList) || '').toLowerCase();
        const actor = (log.actor || '').toLowerCase();
        const actionName = (log.actionName || '').toLowerCase();
        const actionType = (log.actionType || '').toLowerCase();
        const details = (log.details || '').toLowerCase();

        if (searchScope === 'TEACHER') {
          // Search specifically by Teacher Name
          const matches = isLogMatchingTeacher(log, q, teachersList);
          if (!matches) return false;
        } else if (searchScope === 'STUDENT') {
          // Search specifically by Affected Student Name
          const matches = isLogMatchingStudent(log, q, studentsList);
          if (!matches) return false;
        } else if (searchScope === 'ACTION') {
          // Search specifically by Operation / Action Type
          const matchesAction = actionName.includes(q) || actionType.includes(q) || details.includes(q);
          if (!matchesAction) return false;
        } else if (searchScope === 'USER') {
          // Search specifically by User / Actor
          const matchesActor = actor.includes(q) || details.includes(q);
          if (!matchesActor) return false;
        } else {
          // ALL: Search across User, Action, Student, Teacher, Details
          const matches = 
            actor.includes(q) ||
            actionName.includes(q) ||
            actionType.includes(q) ||
            studentName.includes(q) ||
            teacherName.includes(q) ||
            details.includes(q);
          if (!matches) return false;
        }
      }

      // 5. Category Filter
      if (categoryFilter !== 'ALL') {
        if (categoryFilter === 'RATES') {
          const isRate = 
            log.actionType.includes('RATE') || 
            log.actionName.includes('سعر') || 
            log.actionName.includes('أسعار') ||
            log.details.includes('سعر') ||
            log.details.includes('أجر');
          if (!isRate) return false;
        } else if (categoryFilter === 'STUDENT_DELETE') {
          const isStudentDel = log.actionType === 'DELETE_STUDENT' || log.actionName.includes('حذف طالب');
          if (!isStudentDel) return false;
        } else if (categoryFilter === 'TEACHER_DELETE') {
          const isTeacherDel = log.actionType === 'DELETE_TEACHER' || log.actionName.includes('حذف معلّم') || log.actionName.includes('حذف معلم');
          if (!isTeacherDel) return false;
        } else if (categoryFilter === 'FINANCE') {
          const isFinance = 
            log.actionType === 'TOPUP' || 
            log.actionType === 'BALANCE_ADJUSTMENT' || 
            log.actionType.includes('CREDIT') || 
            log.actionType.includes('PAYMENT') ||
            (typeof log.amount === 'number' && log.amount !== 0);
          if (!isFinance) return false;
        } else if (categoryFilter === 'SETTINGS') {
          const isSettings = log.actionType.includes('SETTINGS') || log.actionName.includes('إعدادات');
          if (!isSettings) return false;
        } else if (categoryFilter === 'SESSIONS_TASKS') {
          const isSession = 
            log.actionType.includes('SESSION') || 
            log.actionType.includes('TASK') || 
            log.actionName.includes('حصة') || 
            log.actionName.includes('مهمة');
          if (!isSession) return false;
        }
      }

      // 6. Date Filter
      if (dateFilter !== 'all') {
        const logDate = new Date(log.timestamp);
        const now = new Date();
        if (dateFilter === 'today') {
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          if (logDate < startOfToday) return false;
        } else if (dateFilter === 'week') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (logDate < sevenDaysAgo) return false;
        } else if (dateFilter === 'month') {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          if (logDate < startOfMonth) return false;
        }
      }

      // 7. Actor Filter
      if (actorFilter !== 'ALL') {
        if (log.actor !== actorFilter) return false;
      }

      return true;
    }).sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [logs, teacherFilter, studentFilter, actionFilter, searchQuery, searchScope, categoryFilter, dateFilter, actorFilter, sortOrder, teachersList, studentsList]);

  // Metrics calculation
  const metrics = useMemo(() => {
    let rateChanges = 0;
    let studentDeletions = 0;
    let teacherDeletions = 0;
    let totalFinancialVolume = 0;

    logs.forEach(l => {
      if (l.actionType.includes('RATE') || l.actionName.includes('سعر') || l.details.includes('سعر') || l.details.includes('أجر')) {
        rateChanges++;
      }
      if (l.actionType === 'DELETE_STUDENT' || l.actionName.includes('حذف طالب')) {
        studentDeletions++;
      }
      if (l.actionType === 'DELETE_TEACHER' || l.actionName.includes('حذف معلّم') || l.actionName.includes('حذف معلم')) {
        teacherDeletions++;
      }
      if (typeof l.amount === 'number') {
        totalFinancialVolume += Math.abs(l.amount);
      }
    });

    return {
      total: logs.length,
      rateChanges,
      studentDeletions,
      teacherDeletions,
      totalFinancialVolume
    };
  }, [logs]);

  // Copy details helper
  const handleCopyDetails = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export to Excel
  const handleExportToExcel = () => {
    try {
      const rows = filteredLogs.map((log, index) => {
        const d = new Date(log.timestamp);
        return {
          'الرقم': index + 1,
          'نوع العملية': log.actionName || log.actionType,
          'التاريخ': d.toLocaleDateString('ar-EG'),
          'الوقت': d.toLocaleTimeString('ar-EG'),
          'المنفذ': log.actor,
          'المعلم المعني': getAffectedTeacherName(log, teachersList) || log.teacherName || '-',
          'الطالب المعني': getAffectedStudentName(log, studentsList) || log.studentName || '-',
          'تفاصيل التعديل': log.details,
          'الأثر المالي (₪)': log.amount || 0,
          'رمز العملية': log.actionType
        };
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      // RTL direction for excel sheet
      ws['!views'] = [{ rightToLeft: true }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'سجل النشاط والمراجعة');
      
      const fileName = `سجل_النشاط_والمراجعة_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (e) {
      console.error("Error exporting logs to Excel:", e);
      alert("حدث خطأ أثناء تصدير السجل إلى Excel.");
    }
  };

  // Export to CSV
  const handleExportToCsv = () => {
    try {
      const headers = ['رقم', 'نوع العملية', 'التاريخ والوقت', 'المنفذ', 'المعلم المعني', 'الطالب المعني', 'التفاصيل', 'الأثر المالي'];
      const csvRows = [headers.join(',')];

      filteredLogs.forEach((l, i) => {
        const dateStr = new Date(l.timestamp).toLocaleString('ar-EG');
        const cleanDetails = (l.details || '').replace(/"/g, '""');
        const teacherStr = (getAffectedTeacherName(l, teachersList) || l.teacherName || '-').replace(/"/g, '""');
        const studentStr = (getAffectedStudentName(l, studentsList) || l.studentName || '-').replace(/"/g, '""');
        csvRows.push([
          i + 1,
          `"${l.actionName || l.actionType}"`,
          `"${dateStr}"`,
          `"${l.actor}"`,
          `"${teacherStr}"`,
          `"${studentStr}"`,
          `"${cleanDetails}"`,
          l.amount || 0
        ].join(','));
      });

      const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `سجل_النشاط_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error("Error exporting to CSV:", e);
    }
  };

  // Print Audit Report
  const handlePrint = () => {
    window.print();
  };

  // Execute Clear Audit Log (Manager protected)
  const handleClearLogs = async () => {
    if (clearConfirmationText !== 'تصفير السجل نهائيا') {
      setClearError('يرجى كتابة جملة التأكيد بدقة لإتمام التصفير.');
      return;
    }

    setIsClearing(true);
    setClearError('');

    try {
      const snap = await getDocs(collection(db, 'activityLogs'));
      const deletePromises = snap.docs.map(d => deleteDoc(doc(db, 'activityLogs', d.id)));
      await Promise.all(deletePromises);

      setLogs([]);
      setIsClearModalOpen(false);
      setClearConfirmationText('');
      setClearSuccessNotice(true);
      setTimeout(() => setClearSuccessNotice(false), 4000);
    } catch (err: any) {
      console.error("Error clearing activity logs:", err);
      setClearError('فشل تصفير السجل: ' + (err.message || 'خطأ غير متوقع'));
    } finally {
      setIsClearing(false);
    }
  };

  // Format relative time in Arabic
  const formatRelativeTime = (isoString: string) => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'الآن';
      if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
      if (diffHours < 24) return `منذ ${diffHours} ساعة`;
      if (diffDays === 1) return 'أمس';
      if (diffDays < 7) return `منذ ${diffDays} أيام`;
      return new Date(isoString).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  // Get visual theme per action
  const getActionTheme = (actionType: string, actionName: string) => {
    const text = (actionType + ' ' + actionName).toLowerCase();
    
    if (text.includes('rate') || text.includes('سعر') || text.includes('أسعار') || text.includes('أجر')) {
      return {
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
        icon: <DollarSign size={14} className="text-amber-700" />,
        label: 'تعديل أسعار'
      };
    }
    if (text.includes('delete_student') || text.includes('حذف طالب')) {
      return {
        badge: 'bg-rose-50 text-rose-800 border-rose-200',
        dot: 'bg-rose-500',
        icon: <UserMinus size={14} className="text-rose-700" />,
        label: 'حذف طالب'
      };
    }
    if (text.includes('delete_teacher') || text.includes('حذف معلم') || text.includes('حذف معلّم')) {
      return {
        badge: 'bg-red-50 text-red-800 border-red-200',
        dot: 'bg-red-600',
        icon: <UserX size={14} className="text-red-700" />,
        label: 'حذف معلّم'
      };
    }
    if (text.includes('topup') || text.includes('شحن')) {
      return {
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500',
        icon: <CreditCard size={14} className="text-emerald-700" />,
        label: 'شحن رصيد'
      };
    }
    if (text.includes('balance') || text.includes('تعديل رصيد')) {
      return {
        badge: 'bg-sky-50 text-sky-800 border-sky-200',
        dot: 'bg-sky-500',
        icon: <TrendingUp size={14} className="text-sky-700" />,
        label: 'تسوية رصيد'
      };
    }
    if (text.includes('payment')) {
      return {
        badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
        dot: 'bg-indigo-500',
        icon: <DollarSign size={14} className="text-indigo-700" />,
        label: 'صرف مستحقات'
      };
    }
    if (text.includes('session') || text.includes('حصة') || text.includes('task')) {
      return {
        badge: 'bg-teal-50 text-teal-800 border-teal-200',
        dot: 'bg-teal-500',
        icon: <Calendar size={14} className="text-teal-700" />,
        label: 'حصة / مهمة'
      };
    }
    if (text.includes('settings') || text.includes('إعدادات')) {
      return {
        badge: 'bg-purple-50 text-purple-800 border-purple-200',
        dot: 'bg-purple-500',
        icon: <Settings size={14} className="text-purple-700" />,
        label: 'إعدادات النظام'
      };
    }
    return {
      badge: 'bg-slate-50 text-slate-700 border-slate-200',
      dot: 'bg-slate-400',
      icon: <History size={14} className="text-slate-600" />,
      label: actionName || 'عملية إدارية'
    };
  };

  return (
    <div className={`space-y-8 text-right font-sans ${isModal ? 'p-6 max-h-[88vh] overflow-y-auto' : ''}`} dir="rtl" id="activity-log-component">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-500 via-teal-600 to-indigo-600" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-[#D4A33C] flex items-center justify-center shadow-inner shrink-0 border border-amber-500/20">
              <History size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">سجل النشاط وتدقيق العمليات (Activity Log)</h2>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  مُحدّث سحابياً لحظياً
                </span>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-1.5 leading-relaxed max-w-2xl">
                تتبع وحفظ تلقائي لكافة التعديلات الإدارية الحساسة: تغيير أسعار الساعات، حذف الطلاب والمعلمين، تسوية الأرصدة، وصرف المستحقات مع توثيق المنفذ والوقت الدقيق.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={fetchLogsManually}
              disabled={loading}
              title="تحديث البيانات يدوياً"
              className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-teal-600' : 'text-slate-500'} />
              <span>تحديث</span>
            </button>

            <button
              onClick={handleExportToExcel}
              disabled={filteredLogs.length === 0}
              title="تصدير السجل المفلتر إلى ملف Excel"
              className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-40"
            >
              <FileSpreadsheet size={14} className="text-emerald-700" />
              <span>تصدير Excel</span>
            </button>

            <button
              onClick={handleExportToCsv}
              disabled={filteredLogs.length === 0}
              title="تصدير ملف CSV"
              className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-40"
            >
              <Download size={14} className="text-slate-500" />
              <span>CSV</span>
            </button>

            <button
              onClick={handlePrint}
              title="طباعة السجل الحالي"
              className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Printer size={14} className="text-slate-500" />
              <span>طباعة</span>
            </button>

            <button
              onClick={() => setIsClearModalOpen(true)}
              disabled={logs.length === 0}
              title="تصفير السجل بعد التحقق"
              className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-40"
            >
              <Trash2 size={14} className="text-rose-600" />
              <span>تصفير</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
              >
                إغلاق
              </button>
            )}
          </div>
        </div>

        {/* Success alert on clear */}
        {clearSuccessNotice && (
          <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs font-black animate-in fade-in duration-200">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>تم تصفير سجل النشاط والمراجعة بالكامل بنجاح.</span>
          </div>
        )}
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Events */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">إجمالي الحركات</span>
            <div className="text-2xl font-black text-slate-900 font-mono">{metrics.total}</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <History size={20} />
          </div>
        </div>

        {/* Rates Changes */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider block mb-1">تعديل أسعار الساعات</span>
            <div className="text-2xl font-black text-amber-600 font-mono">{metrics.rateChanges}</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <DollarSign size={20} />
          </div>
        </div>

        {/* Deletions Count */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider block mb-1">عمليات الحذف</span>
            <div className="text-2xl font-black text-rose-600 font-mono">
              {metrics.studentDeletions + metrics.teacherDeletions}
              <span className="text-[11px] font-normal text-slate-400 mr-1.5">
                ({metrics.studentDeletions} طالب / {metrics.teacherDeletions} معلم)
              </span>
            </div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <UserMinus size={20} />
          </div>
        </div>

        {/* Financial Flow */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block mb-1">حجم الأثر المالي المرصود</span>
            <div className="text-2xl font-black text-emerald-600 font-mono">₪{metrics.totalFinancialVolume.toLocaleString()}</div>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CreditCard size={20} />
          </div>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4" id="activity-log-search-toolbar">
        
        {/* Search Scope Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <Search size={15} className="text-[#D4A33C]" />
              <span>شريط البحث والتدقيق:</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setSearchScope('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                searchScope === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search size={13} className={searchScope === 'ALL' ? 'text-[#D4A33C]' : ''} />
              <span>الكل</span>
            </button>

            <button
              type="button"
              onClick={() => setSearchScope('TEACHER')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                searchScope === 'TEACHER'
                  ? 'bg-white text-indigo-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase size={13} className={searchScope === 'TEACHER' ? 'text-indigo-600' : ''} />
              <span>معلم محدد</span>
            </button>

            <button
              type="button"
              onClick={() => setSearchScope('STUDENT')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                searchScope === 'STUDENT'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap size={13} className={searchScope === 'STUDENT' ? 'text-emerald-600' : ''} />
              <span>طالب محدد</span>
            </button>

            <button
              type="button"
              onClick={() => setSearchScope('ACTION')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                searchScope === 'ACTION'
                  ? 'bg-white text-amber-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap size={13} className={searchScope === 'ACTION' ? 'text-amber-600' : ''} />
              <span>نوع العملية</span>
            </button>

            <button
              type="button"
              onClick={() => setSearchScope('USER')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                searchScope === 'USER'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User size={13} className={searchScope === 'USER' ? 'text-slate-800' : ''} />
              <span>المنفذ</span>
            </button>
          </div>
        </div>
        
        {/* Row 1: Search Input & Date/Actor/Sort Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="flex-1 relative">
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
              {searchScope === 'TEACHER' && <Briefcase size={16} className="text-indigo-600" />}
              {searchScope === 'STUDENT' && <GraduationCap size={16} className="text-emerald-600" />}
              {searchScope === 'ACTION' && <Zap size={16} className="text-amber-600" />}
              {searchScope === 'USER' && <User size={16} className="text-slate-700" />}
              {searchScope === 'ALL' && <Search size={16} className="text-slate-400" />}
            </div>

            <input
              type="text"
              placeholder={
                searchScope === 'TEACHER'
                  ? 'ابحث باسم المعلم المعني بالعملية أو المنفذ لها...'
                  : searchScope === 'STUDENT'
                  ? 'ابحث باسم الطالب المتأثر بالتعديل (مثل: أحمد، سارة، محمد)...'
                  : searchScope === 'ACTION'
                  ? 'ابحث بنوع العملية (مثل: تعديل أسعار، حذف طالب، شحن رصيد، صرف مالي)...'
                  : searchScope === 'USER'
                  ? 'ابحث باسم المستخدم أو المنفّذ المباشر للعملية...'
                  : 'ابحث باسم المعلم، الطالب، نوع العملية، أو اسم المنفذ...'
              }
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pr-11 pl-10 py-3 text-xs font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#D4A33C] focus:border-[#D4A33C] outline-none transition-all text-right placeholder-slate-400"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                title="مسح نص البحث"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-xs transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-3.5 py-2.5 text-xs font-black bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] outline-none text-slate-700 cursor-pointer text-right shrink-0"
            >
              <option value="all">📅 كافة التواريخ</option>
              <option value="today">اليوم فقط</option>
              <option value="week">آخر 7 أيام</option>
              <option value="month">هذا الشهر</option>
            </select>

            {distinctActors.length > 1 && (
              <select
                value={actorFilter}
                onChange={e => setActorFilter(e.target.value)}
                className="px-3.5 py-2.5 text-xs font-black bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#D4A33C] outline-none text-slate-700 cursor-pointer text-right shrink-0"
              >
                <option value="ALL">👤 كافة المنفذين</option>
                {distinctActors.map(actor => (
                  <option key={actor} value={actor}>{actor}</option>
                ))}
              </select>
            )}

            <button
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-700 flex items-center gap-1.5 shrink-0 cursor-pointer transition-all"
              title="تبديل ترتيب السجل"
            >
              <ArrowUpDown size={13} />
              <span>{sortOrder === 'desc' ? 'الأحدث أولاً' : 'الأقدم أولاً'}</span>
            </button>
          </div>
        </div>

        {/* Manager Dedicated Filter Section: Teacher, Student, and Specific Operation */}
        <div className="bg-gradient-to-r from-amber-50/50 via-indigo-50/30 to-emerald-50/30 border border-amber-200/80 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={15} className="text-[#D4A33C]" />
              <span className="text-xs font-black text-slate-800">
                فلترة دقيقة للمدير (تحديد معلم معين / طالب معين / عملية محددة):
              </span>
            </div>
            {(teacherFilter !== 'ALL' || studentFilter !== 'ALL' || actionFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setTeacherFilter('ALL');
                  setStudentFilter('ALL');
                  setActionFilter('ALL');
                }}
                className="text-[11px] font-black text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer self-start sm:self-auto bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 hover:bg-rose-100 transition-colors"
              >
                <RotateCcw size={11} />
                <span>إلغاء فلاتر التخصيص</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Teacher Filter Dropdown */}
            <div>
              <label className="block text-[11px] font-black text-slate-600 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Briefcase size={12} className="text-indigo-600" />
                  <span>معلم معين:</span>
                </span>
                {teacherFilter !== 'ALL' && (
                  <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.2 rounded-full font-bold">
                    مفلتر
                  </span>
                )}
              </label>
              <div className="relative">
                <select
                  value={teacherFilter}
                  onChange={(e) => setTeacherFilter(e.target.value)}
                  className={`w-full pr-8 pl-8 py-2.5 text-xs font-black rounded-xl border outline-none cursor-pointer transition-all appearance-none ${
                    teacherFilter !== 'ALL'
                      ? 'bg-indigo-50/90 border-indigo-400 text-indigo-950 font-black shadow-xs ring-2 ring-indigo-200'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <option value="ALL">👨‍🏫 كافة المعلمين (بدون تحديد)</option>
                  {allTeachersOptions.map(t => (
                    <option key={t.name} value={t.name}>
                      {t.name} {t.count > 0 ? `(${t.count} حركة)` : ''}
                    </option>
                  ))}
                </select>
                <Briefcase size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none" />
                {teacherFilter !== 'ALL' ? (
                  <button
                    type="button"
                    onClick={() => setTeacherFilter('ALL')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-indigo-200 hover:bg-indigo-300 text-indigo-800 flex items-center justify-center text-[10px]"
                    title="إلغاء اختيار المعلم"
                  >
                    <X size={10} />
                  </button>
                ) : (
                  <ChevronDown size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                )}
              </div>
            </div>

            {/* 2. Student Filter Dropdown */}
            <div>
              <label className="block text-[11px] font-black text-slate-600 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <GraduationCap size={13} className="text-emerald-600" />
                  <span>طالب معين:</span>
                </span>
                {studentFilter !== 'ALL' && (
                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.2 rounded-full font-bold">
                    مفلتر
                  </span>
                )}
              </label>
              <div className="relative">
                <select
                  value={studentFilter}
                  onChange={(e) => setStudentFilter(e.target.value)}
                  className={`w-full pr-8 pl-8 py-2.5 text-xs font-black rounded-xl border outline-none cursor-pointer transition-all appearance-none ${
                    studentFilter !== 'ALL'
                      ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950 font-black shadow-xs ring-2 ring-emerald-200'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <option value="ALL">🎓 كافة الطلاب (بدون تحديد)</option>
                  {allStudentsOptions.map(s => (
                    <option key={s.name} value={s.name}>
                      {s.name} {s.count > 0 ? `(${s.count} حركة)` : ''}
                    </option>
                  ))}
                </select>
                <GraduationCap size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
                {studentFilter !== 'ALL' ? (
                  <button
                    type="button"
                    onClick={() => setStudentFilter('ALL')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-200 hover:bg-emerald-300 text-emerald-800 flex items-center justify-center text-[10px]"
                    title="إلغاء اختيار الطالب"
                  >
                    <X size={10} />
                  </button>
                ) : (
                  <ChevronDown size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                )}
              </div>
            </div>

            {/* 3. Specific Action / Operation Filter Dropdown */}
            <div>
              <label className="block text-[11px] font-black text-slate-600 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Zap size={12} className="text-amber-600" />
                  <span>عملية محددة:</span>
                </span>
                {actionFilter !== 'ALL' && (
                  <span className="text-[10px] bg-amber-600 text-white px-2 py-0.2 rounded-full font-bold">
                    مفلتر
                  </span>
                )}
              </label>
              <div className="relative">
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className={`w-full pr-8 pl-8 py-2.5 text-xs font-black rounded-xl border outline-none cursor-pointer transition-all appearance-none ${
                    actionFilter !== 'ALL'
                      ? 'bg-amber-50/90 border-amber-400 text-amber-950 font-black shadow-xs ring-2 ring-amber-200'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <option value="ALL">⚡ كافة أنواع العمليات</option>
                  {allOperationsOptions.map(op => (
                    <option key={op.name} value={op.name}>
                      {op.name} {op.count > 0 ? `(${op.count} حركة)` : ''}
                    </option>
                  ))}
                </select>
                <Zap size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-500 pointer-events-none" />
                {actionFilter !== 'ALL' ? (
                  <button
                    type="button"
                    onClick={() => setActionFilter('ALL')}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-amber-200 hover:bg-amber-300 text-amber-800 flex items-center justify-center text-[10px]"
                    title="إلغاء اختيار العملية"
                  >
                    <X size={10} />
                  </button>
                ) : (
                  <ChevronDown size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-[11px] font-black text-slate-400 ml-1">اقتراحات سريعة بنقرة واحدة:</span>

          {/* Quick Teacher Chips */}
          {allTeachersOptions.slice(0, 4).map(teacher => (
            <button
              key={teacher.name}
              type="button"
              onClick={() => {
                setTeacherFilter(teacherFilter === teacher.name ? 'ALL' : teacher.name);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all cursor-pointer flex items-center gap-1 ${
                teacherFilter === teacher.name
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-200/70 hover:bg-indigo-100'
              }`}
            >
              <Briefcase size={11} />
              <span>معلم: {teacher.name}</span>
            </button>
          ))}

          {/* Quick Student Chips */}
          {allStudentsOptions.slice(0, 4).map(student => (
            <button
              key={student.name}
              type="button"
              onClick={() => {
                setStudentFilter(studentFilter === student.name ? 'ALL' : student.name);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all cursor-pointer flex items-center gap-1 ${
                studentFilter === student.name
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200/70 hover:bg-emerald-100'
              }`}
            >
              <GraduationCap size={11} />
              <span>طالب: {student.name}</span>
            </button>
          ))}

          {/* Quick Action Chips */}
          {[
            'تعديل أسعار الساعات',
            'حذف طالب',
            'ترحيل طالب',
            'شحن رصيد',
            'تسوية رصيد'
          ].map(act => (
            <button
              key={act}
              type="button"
              onClick={() => {
                setActionFilter(actionFilter === act ? 'ALL' : act);
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black border transition-all cursor-pointer flex items-center gap-1 ${
                actionFilter === act
                  ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                  : 'bg-amber-50 text-amber-800 border-amber-200/70 hover:bg-amber-100'
              }`}
            >
              <Zap size={11} />
              <span>{act}</span>
            </button>
          ))}
        </div>

        {/* Active Filters Summary Banner */}
        {(searchQuery.trim() || teacherFilter !== 'ALL' || studentFilter !== 'ALL' || actionFilter !== 'ALL' || categoryFilter !== 'ALL' || dateFilter !== 'all' || actorFilter !== 'ALL') && (
          <div className="p-3.5 bg-gradient-to-r from-amber-50/90 via-slate-50 to-indigo-50/80 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-black text-slate-800 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-600 flex items-center gap-1 text-[11px]">
                <Filter size={13} className="text-[#D4A33C]" />
                <span>الفلاتر النشطة:</span>
              </span>

              {/* Teacher Badge */}
              {teacherFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-100 border border-indigo-300 text-indigo-900 text-[11px]">
                  <Briefcase size={12} className="text-indigo-600" />
                  <span>المعلم: {teacherFilter}</span>
                  <button
                    type="button"
                    onClick={() => setTeacherFilter('ALL')}
                    className="hover:text-red-700 cursor-pointer"
                    title="إزالة فلتر المعلم"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}

              {/* Student Badge */}
              {studentFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 text-[11px]">
                  <GraduationCap size={13} className="text-emerald-600" />
                  <span>الطالب: {studentFilter}</span>
                  <button
                    type="button"
                    onClick={() => setStudentFilter('ALL')}
                    className="hover:text-red-700 cursor-pointer"
                    title="إزالة فلتر الطالب"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}

              {/* Action Badge */}
              {actionFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 text-[11px]">
                  <Zap size={12} className="text-amber-600" />
                  <span>العملية: {actionFilter}</span>
                  <button
                    type="button"
                    onClick={() => setActionFilter('ALL')}
                    className="hover:text-red-700 cursor-pointer"
                    title="إزالة فلتر العملية"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}

              {/* Text Search Badge */}
              {searchQuery.trim() && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 text-[11px]">
                  <Search size={12} className="text-amber-600" />
                  <span>بحث: «{searchQuery}»</span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="hover:text-red-700 cursor-pointer"
                    title="إزالة نص البحث"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}

              {/* Category Badge */}
              {categoryFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200 border border-slate-300 text-slate-800 text-[11px]">
                  <span>تصنيف: {categoryFilter}</span>
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('ALL')}
                    className="hover:text-red-700 cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}

              {/* Actor Badge */}
              {actorFilter !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-200 border border-slate-300 text-slate-800 text-[11px]">
                  <User size={12} />
                  <span>منفذ: {actorFilter}</span>
                  <button
                    type="button"
                    onClick={() => setActorFilter('ALL')}
                    className="hover:text-red-700 cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}

              <span className="text-slate-500 font-normal mr-1">
                (تم العثور على {filteredLogs.length} حركة مطابقة)
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setTeacherFilter('ALL');
                setStudentFilter('ALL');
                setActionFilter('ALL');
                setSearchQuery('');
                setCategoryFilter('ALL');
                setDateFilter('all');
                setActorFilter('ALL');
              }}
              className="px-3 py-1 bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 rounded-xl text-[11px] font-black text-rose-700 flex items-center gap-1 shrink-0 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <RotateCcw size={11} />
              <span>إلغاء كافة الفلاتر</span>
            </button>
          </div>
        )}

        {/* Row 2: Category Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-black text-slate-400 ml-2">التصنيف:</span>
          
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              categoryFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            الكل ({logs.length})
          </button>

          <button
            onClick={() => setCategoryFilter('RATES')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'RATES'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60'
            }`}
          >
            <DollarSign size={13} />
            <span>تعديل أسعار الساعات ({metrics.rateChanges})</span>
          </button>

          <button
            onClick={() => setCategoryFilter('STUDENT_DELETE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'STUDENT_DELETE'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/60'
            }`}
          >
            <UserMinus size={13} />
            <span>حذف الطلاب ({metrics.studentDeletions})</span>
          </button>

          <button
            onClick={() => setCategoryFilter('TEACHER_DELETE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'TEACHER_DELETE'
                ? 'bg-red-700 text-white shadow-xs'
                : 'bg-red-50 text-red-800 hover:bg-red-100 border border-red-200/60'
            }`}
          >
            <UserX size={13} />
            <span>حذف المعلمين ({metrics.teacherDeletions})</span>
          </button>

          <button
            onClick={() => setCategoryFilter('FINANCE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'FINANCE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60'
            }`}
          >
            <CreditCard size={13} />
            <span>الأرصدة والمستحقات</span>
          </button>

          <button
            onClick={() => setCategoryFilter('SESSIONS_TASKS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'SESSIONS_TASKS'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200/60'
            }`}
          >
            <Calendar size={13} />
            <span>الحصص والمهام</span>
          </button>

          <button
            onClick={() => setCategoryFilter('SETTINGS')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
              categoryFilter === 'SETTINGS'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200/60'
            }`}
          >
            <Settings size={13} />
            <span>إعدادات النظام</span>
          </button>
        </div>
      </div>

      {/* Main Timeline of Logs */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#D4A33C] rounded-full animate-spin mb-4" />
          <p className="text-xs font-black text-slate-500">جاري استرجاع سجل النشاط والتدقيق من قاعدة البيانات...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <History size={26} />
          </div>
          <h4 className="text-base font-black text-slate-800 mb-1">لا توجد حركات مطابقة لمعايير البحث</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            لم يتم العثور على أي حركات مسجلة بناءً على كلمات البحث أو التصفية الحالية. جرب تغيير خيارات التصفية.
          </p>
          {(searchQuery || categoryFilter !== 'ALL' || dateFilter !== 'all' || teacherFilter !== 'ALL' || studentFilter !== 'ALL' || actionFilter !== 'ALL' || actorFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('ALL');
                setDateFilter('all');
                setActorFilter('ALL');
                setTeacherFilter('ALL');
                setStudentFilter('ALL');
                setActionFilter('ALL');
              }}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black text-slate-700 transition-all cursor-pointer"
            >
              إعادة تعيين كافة الفلاتر
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2 text-xs text-slate-400 font-bold">
            <span>عرض {filteredLogs.length} حركة موثّقة</span>
            <span>مرتبة حسب: {sortOrder === 'desc' ? 'الأحدث أولاً' : 'الأقدم أولاً'}</span>
          </div>

          <div className="relative border-r-2 border-slate-200 mr-4 pr-6 sm:mr-6 sm:pr-8 space-y-5">
            {filteredLogs.map(log => {
              const theme = getActionTheme(log.actionType, log.actionName);
              const relativeTime = formatRelativeTime(log.timestamp);
              const fullDateStr = new Date(log.timestamp).toLocaleString('ar-EG', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline bullet dot */}
                  <div className={`absolute -right-[31px] sm:-right-[39px] top-4 w-4 h-4 rounded-full border-2 border-white ${theme.dot} shadow-sm transition-transform group-hover:scale-125`} />

                  {/* Main Event Card */}
                  <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all space-y-3.5">
                    
                    {/* Header Row: Category Badge + Actor + Affected Teacher + Affected Student + Timestamp */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Operation Type Badge (Clickable to filter) */}
                        <button
                          type="button"
                          onClick={() => {
                            setActionFilter(log.actionName || theme.label);
                          }}
                          title={`تصفية كافة حركات: ${log.actionName || theme.label}`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border transition-all cursor-pointer hover:shadow-xs active:scale-95 ${theme.badge}`}
                        >
                          {theme.icon}
                          <span>{log.actionName || theme.label}</span>
                        </button>

                        {/* Actor Badge (Clickable to filter) */}
                        <button
                          type="button"
                          onClick={() => {
                            setActorFilter(log.actor);
                          }}
                          title={`تصفية حركات المنفذ: ${log.actor}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                        >
                          <User size={12} className="text-slate-500" />
                          <span>المنفذ: {log.actor}</span>
                        </button>

                        {/* Affected Teacher Badge (Clickable to filter) */}
                        {(() => {
                          const teacher = getAffectedTeacherName(log, teachersList);
                          if (!teacher) return null;
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setTeacherFilter(teacher);
                              }}
                              title={`تصفية كافة حركات وسجلات المعلم: ${teacher}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200/80 transition-all cursor-pointer shadow-xs active:scale-95"
                            >
                              <Briefcase size={12} className="text-indigo-600" />
                              <span>المعلم: <span className="underline decoration-indigo-400 underline-offset-2">{teacher}</span></span>
                            </button>
                          );
                        })()}

                        {/* Affected Student Badge (Clickable to filter) */}
                        {(() => {
                          const student = getAffectedStudentName(log, studentsList);
                          if (!student) return null;
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                setStudentFilter(student);
                              }}
                              title={`تصفية كافة حركات وسجلات الطالب: ${student}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 transition-all cursor-pointer shadow-xs active:scale-95"
                            >
                              <GraduationCap size={13} className="text-emerald-600" />
                              <span>الطالب: <span className="underline decoration-emerald-400 underline-offset-2">{student}</span></span>
                            </button>
                          );
                        })()}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-bold shrink-0">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono text-[10px]">
                          {relativeTime}
                        </span>
                        <span className="hidden sm:inline" dir="ltr">
                          {fullDateStr}
                        </span>
                      </div>
                    </div>

                    {/* Action Details Body */}
                    <div className="text-xs sm:text-sm font-bold text-slate-800 leading-relaxed text-right font-sans">
                      {log.details}
                    </div>

                    {/* Diff Pill: Old vs New Values if available */}
                    {(log.previousValue !== undefined || log.newValue !== undefined) && (
                      <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 p-3 rounded-xl flex-wrap">
                        <span className="text-[11px] font-black text-slate-400">القيمة السابقة:</span>
                        <span className="font-mono font-bold text-rose-600 line-through">
                          {typeof log.previousValue === 'object' ? JSON.stringify(log.previousValue) : String(log.previousValue)}
                        </span>
                        <ArrowRight size={12} className="text-slate-400" />
                        <span className="text-[11px] font-black text-slate-400">القيمة الجديدة:</span>
                        <span className="font-mono font-bold text-emerald-600">
                          {typeof log.newValue === 'object' ? JSON.stringify(log.newValue) : String(log.newValue)}
                        </span>
                      </div>
                    )}

                    {/* Footer Row: Financial impact (if any) + Copy Button */}
                    <div className="flex items-center justify-between pt-2 text-xs">
                      <div className="flex items-center gap-2">
                        {typeof log.amount === 'number' && log.amount !== 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-black">الأثر المالي:</span>
                            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-mono font-black ${
                              log.amount > 0 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {log.amount > 0 ? '+' : ''}₪{log.amount}
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleCopyDetails(log.id || '', `${log.actionName} - ${log.details} - المنفذ: ${log.actor} - ${fullDateStr}`)}
                        className="text-[10px] font-black text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                        title="نسخ التفاصيل"
                      >
                        {copiedId === log.id ? (
                          <>
                            <Check size={12} className="text-emerald-600" />
                            <span className="text-emerald-600">تم النسخ!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>نسخ</span>
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confirmation Modal to Clear Logs (Restricted Admin Action) */}
      {isClearModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-rose-100 text-right space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle size={24} />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">تأكيد تصفير سجل النشاط والمراجعة</h3>
              <p className="text-xs text-slate-500 font-bold mt-1 leading-relaxed">
                تحذير: هذه العملية لا يمكن التراجع عنها. سيتم حذف كافة السجلات التوثيقية المسجلة في السحاب بشكل نهائي.
              </p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 leading-relaxed">
              لتأكيد الإجراء، يرجى كتابة العبارة التالية بدقة في الحقل أدناه:
              <span className="block font-black text-rose-600 mt-1 select-all">تصفير السجل نهائيا</span>
            </div>

            <input
              type="text"
              placeholder="اكتب العبارة هنا للتأكيد..."
              value={clearConfirmationText}
              onChange={e => setClearConfirmationText(e.target.value)}
              className="w-full px-4 py-2.5 text-xs font-black bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-right"
            />

            {clearError && (
              <p className="text-xs text-rose-600 font-black">{clearError}</p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleClearLogs}
                disabled={isClearing || clearConfirmationText !== 'تصفير السجل نهائيا'}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
              >
                {isClearing && <RefreshCw size={14} className="animate-spin" />}
                <span>نعم، تصفير السجل</span>
              </button>

              <button
                onClick={() => {
                  setIsClearModalOpen(false);
                  setClearConfirmationText('');
                  setClearError('');
                }}
                disabled={isClearing}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
