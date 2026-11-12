import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import {
  Bell,
  X,
  ShieldAlert,
  AlertTriangle,
  Info,
  DollarSign,
  GraduationCap,
  Settings,
  BookOpen,
  Users,
  CheckCheck,
  CheckCircle2,
  Search,
  ExternalLink,
  MessageCircle,
  Clock,
  Sparkles,
  Calendar,
  Layers,
  ArrowLeftRight,
  Database,
  Filter,
  Eye,
  EyeOff,
  RefreshCw,
  Archive,
  Award,
  SlidersHorizontal,
  Flame,
  Zap,
  ArrowUpDown,
  TrendingDown,
  AlertOctagon
} from 'lucide-react';
import { Student, Teacher, Session, GroupCourse, TrialLesson, Settings as SettingsType, StudentStatus } from '../types';
import { generateParentBalanceMessage } from '../lib/phoneUtils';

export type NotificationCategory = 'all' | 'financial' | 'academic' | 'administrative';
export type NotificationSeverity = 'all' | 'critical' | 'warning' | 'info';
export type NotificationPrioritySort =
  | 'financial_critical_first'
  | 'severity_first'
  | 'academic_urgent_first'
  | 'unread_first'
  | 'chronological'
  | 'hours_depletion_first';

export interface AppNotification {
  id: string;
  category: 'financial' | 'academic' | 'administrative';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp?: string | number;
  timeLabel?: string;
  isRead: boolean;
  metadata?: {
    studentId?: string;
    studentName?: string;
    studentPhone?: string;
    balance?: number;
    threshold?: number;
    percentageRemaining?: number;
    courseId?: string;
    courseName?: string;
    examId?: string;
    examTitle?: string;
    score?: number;
    correctCount?: number;
    answersCount?: number;
    submittedAt?: string;
    trialId?: string;
    teacherId?: string;
    teacherName?: string;
    actionTab?: string;
    actionSubTab?: string;
    actionFocusId?: string;
    actionLabel?: string;
    whatsappMessage?: string;
    hoursConsumed?: number;
    hoursAllocated?: number;
    hoursRemaining?: number;
    consumptionPercentage?: number;
    isOver90PercentHours?: boolean;
    subject?: string;
    grade?: string;
  };
}

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  studentThresholdAlerts?: any[];
  examResults?: any[];
  readResultIds?: string[];
  onMarkResultAsRead?: (id: string) => void;
  onMarkAllResultsAsRead?: () => void;
  unassignedStudents?: Student[];
  trialLessons?: TrialLesson[];
  pendingApprovalsCount?: number;
  globalSettings?: SettingsType;
  teachers?: Teacher[];
  sessions?: Session[];
  courses?: GroupCourse[];
  students?: Student[];
  initialCategory?: NotificationCategory;
  onNavigateTab: (tab: string, subTab?: string, focusId?: string) => void;
}

export default function NotificationDrawer({
  isOpen,
  onClose,
  studentThresholdAlerts = [],
  examResults = [],
  readResultIds = [],
  onMarkResultAsRead,
  onMarkAllResultsAsRead,
  unassignedStudents = [],
  trialLessons = [],
  pendingApprovalsCount = 0,
  globalSettings,
  teachers = [],
  sessions = [],
  courses = [],
  students = [],
  initialCategory,
  onNavigateTab
}: NotificationDrawerProps) {
  // Active Filter Category
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('all');

  useEffect(() => {
    if (initialCategory && isOpen) {
      setSelectedCategory(initialCategory);
    }
  }, [initialCategory, isOpen]);
  // Severity filter
  const [selectedSeverity, setSelectedSeverity] = useState<NotificationSeverity>('all');
  // Priority sort mode: Defaults to financial_critical_first as requested by user
  const [prioritySort, setPrioritySort] = useState<NotificationPrioritySort>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('academy_notifications_priority_sort');
        if (saved) return saved as NotificationPrioritySort;
      } catch (e) {}
    }
    return 'financial_critical_first';
  });
  // Active quick preset identifier for highlighted styling
  const [activePreset, setActivePreset] = useState<string | null>('financial_critical');
  // Only unread filter
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  // Filter for students who consumed over 90% of their hours
  const [filterOver90PercentHours, setFilterOver90PercentHours] = useState(false);
  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Persist prioritySort choice in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('academy_notifications_priority_sort', prioritySort);
    } catch (e) {
      console.warn('Failed to save priority sort setting to localStorage', e);
    }
  }, [prioritySort]);

  // Local state for manually dismissed / read notifications (stored in localStorage)
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('academy_read_notifications_v2');
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Keep localStorage updated
  useEffect(() => {
    try {
      localStorage.setItem('academy_read_notifications_v2', JSON.stringify(readNotificationIds));
    } catch (e) {
      console.warn('Failed to save read notifications to localStorage', e);
    }
  }, [readNotificationIds]);

  // Handle escape key to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Toggle single notification read status
  const toggleNotificationRead = (id: string, examResultId?: string) => {
    if (examResultId && onMarkResultAsRead) {
      onMarkResultAsRead(examResultId);
    }
    setReadNotificationIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(x => x !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // Synthesize all live application notifications
  const allNotifications = useMemo<AppNotification[]>(() => {
    const list: AppNotification[] = [];

    // ==========================================
    // 1. FINANCIAL NOTIFICATIONS (مالية)
    // ==========================================
    studentThresholdAlerts.forEach(student => {
      const isCritical = student.isCritical || student.balance < student.threshold;
      const id = `fin_alert_${student.id}`;
      const isRead = readNotificationIds.includes(id);

      const phone = student.phone || '';
      const cleanPhone = phone.replace(/[\s\-\+]/g, '');
      const hourlyRate = student.hourlyRate || 60;
      const waMsg = generateParentBalanceMessage({
        studentName: student.name,
        balance: student.balance,
        hourlyRate,
        urgentRenewal: true
      });

      // Calculate consumption percentage of package/hours buffer
      const pctRemaining = typeof student.percentageRemaining === 'number' ? student.percentageRemaining : (student.balance > 0 ? 10 : 0);
      const consumedPercentage = Math.min(100, Math.max(0, Math.round(100 - pctRemaining)));
      const isLowSessionsRemaining = student.balance > 0 && student.balance <= hourlyRate * 1.5;
      const isOver90Hours = consumedPercentage >= 90 || pctRemaining <= 10 || isLowSessionsRemaining || student.balance <= 0;

      list.push({
        id,
        category: 'financial',
        severity: isCritical ? 'critical' : 'warning',
        title: isCritical
          ? `رصيد حرج: تجاوز حد المديونية (${student.name}) 🚨`
          : (isOver90Hours ? `تنبيه رصيد وشيك النفاد (استهلاك > 90%): ${student.name} ⚠️` : `تنبيه رصيد مقترب من النفاد (${student.name}) ⚠️`),
        description: isCritical
          ? `الرصيد الحالي: ₪${student.balance} (الحد الأقصى المسموح: ₪${student.threshold}). يرجى المتابعة والتحصيل الفوري.`
          : `الرصيد الحالي: ₪${student.balance} (المتبقي: تقريباً ${Math.max(1, Math.round(student.balance / hourlyRate))} حصة | استهلاك ${Math.max(90, consumedPercentage)}% من الرصيد). نحث على تجديد الحزمة.`,
        timeLabel: 'تحديث تلقائي مستمر',
        isRead,
        metadata: {
          studentId: student.id,
          studentName: student.name,
          studentPhone: student.phone,
          balance: student.balance,
          threshold: student.threshold,
          percentageRemaining: student.percentageRemaining,
          consumptionPercentage: isOver90Hours ? Math.max(90, consumedPercentage) : consumedPercentage,
          isOver90PercentHours: isOver90Hours,
          actionTab: 'students',
          actionFocusId: student.id,
          actionLabel: 'عرض وإيداع 💰',
          whatsappMessage: waMsg
        }
      });
    });

    // 1.2 High-Value Sessions Auditing Alerts (الحصص ذات القيمة المرتفعة لضمان الرقابة المالية)
    const highValueSessionThreshold = (globalSettings as any)?.highSessionAuditThreshold || 150;
    sessions.forEach(sess => {
      if (sess.status === 'cancelled') return;
      const student = students.find(s => s.id === sess.studentId);
      const teacher = teachers.find(t => t.id === sess.teacherId);
      
      let sessionCost = 0;
      if (sess.customFee !== undefined && sess.customFee !== null && Number(sess.customFee) > 0) {
        sessionCost = Number(sess.customFee);
      } else {
        const rate = student?.customRates?.[sess.teacherId] !== undefined
          ? student.customRates[sess.teacherId]
          : (student?.hourlyRate ? student.hourlyRate : (teacher?.billingRate || teacher?.hourlyRate || (globalSettings?.defaultStudentHourlyRate ?? 60)));
        sessionCost = Math.round((Number(sess.durationHours) || 1) * rate);
      }

      if (sessionCost >= highValueSessionThreshold) {
        const id = `fin_high_session_${sess.id}`;
        const isRead = readNotificationIds.includes(id);
        const isVeryHigh = sessionCost >= highValueSessionThreshold * 2;
        const studentName = student?.name || 'طالب غير محدد';
        const teacherName = teacher?.name || 'معلم غير محدد';

        list.push({
          id,
          category: 'financial',
          severity: isVeryHigh ? 'critical' : 'warning',
          title: `💰 رقابة مالية: حصة بقيمة مرتفعة (₪${sessionCost}) - ${studentName}`,
          description: `حصة مادة "${sess.subject || 'عام'}" مع المعلم "${teacherName}" بقيمة ₪${sessionCost} (المدة: ${sess.durationHours || 1} س) بتاريخ ${sess.date || 'غير محدد'}. يرجى التدقيق المالي لضمان مطابقة التسعير.`,
          timestamp: sess.createdAt || sess.date,
          timeLabel: sess.date ? `حصة ${sess.date}` : 'حصة مرتفعة القيمة',
          isRead,
          metadata: {
            studentId: sess.studentId,
            studentName,
            teacherId: sess.teacherId,
            teacherName,
            balance: sessionCost,
            actionTab: 'sessions',
            actionFocusId: sess.id,
            actionLabel: 'تدقيق الحصة بالسجل 🔍'
          }
        });
      }
    });

    // 1.3 Large Student Balances & Debt Oversight (أرصدة الطلاب الكبيرة والمديونيات العالية)
    const largeBalanceThreshold = (globalSettings as any)?.largeBalanceThreshold || 500;
    const largeDebtThreshold = (globalSettings as any)?.largeDebtThreshold || 300;

    students.forEach(st => {
      const bal = Number(st.balance) || 0;
      // Large credit balance (>= 500 ₪)
      if (bal >= largeBalanceThreshold) {
        const id = `fin_large_bal_${st.id}`;
        const isRead = readNotificationIds.includes(id);
        list.push({
          id,
          category: 'financial',
          severity: 'info',
          title: `💎 رقابة مالية: رصيد كبير في المحفظة (₪${bal}) - ${st.name}`,
          description: `يمتلك الطالب رصيداً كبيراً في حسابه يبلغ ₪${bal}. يرجى تدقيق السندات ومطابقة استهلاك الحصص المتبقية.`,
          timeLabel: 'رصيد كبير',
          isRead,
          metadata: {
            studentId: st.id,
            studentName: st.name,
            balance: bal,
            actionTab: 'students',
            actionFocusId: st.id,
            actionLabel: 'كشف حساب الطالب 💳'
          }
        });
      }
      // Large negative balance / debt (<= -300 ₪)
      else if (bal <= -largeDebtThreshold) {
        const id = `fin_large_debt_${st.id}`;
        const isRead = readNotificationIds.includes(id);
        const debtLimit = st.maxDebtLimit || largeDebtThreshold;

        list.push({
          id,
          category: 'financial',
          severity: 'critical',
          title: `🚨 رقابة مالية: مديونية مرتفعة تتطلب التحصيل (-₪${Math.abs(bal)}) - ${st.name}`,
          description: `تجاوز رصيد الطالب سقف المديونية ووصل إلى ₪${bal} (الحد المسموح به: -₪${debtLimit}). يتطلب الأمر تحصيلاً عاجلاً وتسوية مالية.`,
          timeLabel: 'مديونية مرتفعة',
          isRead,
          metadata: {
            studentId: st.id,
            studentName: st.name,
            studentPhone: st.phone,
            balance: bal,
            actionTab: 'students',
            actionFocusId: st.id,
            actionLabel: 'متابعة التحصيل 💰',
            whatsappMessage: generateParentBalanceMessage({
              studentName: st.name,
              balance: bal,
              hourlyRate: st.hourlyRate || 60,
              urgentRenewal: true
            })
          }
        });
      }
    });

    // ==========================================
    // 2. ACADEMIC NOTIFICATIONS (أكاديمية)
    // ==========================================
    // 2.1 Exam submissions
    examResults.forEach(res => {
      const id = `acad_exam_${res.id}`;
      const isRead = readResultIds.includes(res.id) || readNotificationIds.includes(id);
      const isLowScore = res.score < 50;

      const waMsg = `مرحباً ${res.studentName}، نبارك لك تسليم اختبار (${res.examTitle}). نتيجتك المحققة هي ${res.score}% (${res.correctCount} إجابات صحيحة). استمر في التميز والاجتهاد!`;

      list.push({
        id,
        category: 'academic',
        severity: isLowScore ? 'warning' : 'info',
        title: `تسليم اختبار إلكتروني: ${res.studentName} 📝`,
        description: `قدّم الطالب اختبار "${res.examTitle}" وحقق نتيجة ${res.score}% (${res.correctCount || 0} من ${
          res.answersCount || res.answers?.length || '–'
        }).`,
        timestamp: res.submittedAt,
        timeLabel: res.submittedAt ? new Date(res.submittedAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'مؤخراً',
        isRead,
        metadata: {
          examId: res.id,
          examTitle: res.examTitle,
          studentName: res.studentName,
          studentPhone: res.studentPhone,
          score: res.score,
          correctCount: res.correctCount,
          answersCount: res.answersCount || res.answers?.length,
          submittedAt: res.submittedAt,
          actionTab: 'exams',
          actionLabel: 'مراجعة الاختبار 📝',
          whatsappMessage: waMsg
        }
      });
    });

    // 2.2 Unassigned students
    unassignedStudents.forEach(st => {
      const id = `acad_unassigned_${st.id}`;
      const isRead = readNotificationIds.includes(id);

      list.push({
        id,
        category: 'academic',
        severity: 'warning',
        title: `طالب بانتظار التنسيب: ${st.name} 👥`,
        description: `الطالب مسجل في المرحلة (${st.academicLevel || 'غير محدد'}) ولم يتم تنسيبه لأي شعبة أو معلم حتى الآن.`,
        timeLabel: 'بانتظار الإسناد',
        isRead,
        metadata: {
          studentId: st.id,
          studentName: st.name,
          studentPhone: st.phone,
          actionTab: 'placement',
          actionSubTab: 'placement',
          actionFocusId: st.id,
          actionLabel: 'تنسيب الطالب الآن 👥'
        }
      });
    });

    // 2.3 Pending & Overdue Trial Lessons
    trialLessons.forEach(trial => {
      if (trial.status === 'pending') {
        const id = `acad_trial_${trial.id}`;
        const isRead = readNotificationIds.includes(id);
        const createdAtTime = trial.createdAt ? new Date(trial.createdAt).getTime() : 0;
        const isOverdue = createdAtTime > 0 && (Date.now() - createdAtTime > 24 * 60 * 60 * 1000);
        const assignedTeacherName = trial.teacherName && trial.teacherName !== 'بانتظار تنسيب المعلم من الإدارة 👨‍💼' && trial.teacherName !== 'غير منسّب'
          ? trial.teacherName
          : null;

        list.push({
          id,
          category: 'academic',
          severity: isOverdue ? 'critical' : 'warning',
          title: isOverdue
            ? `تنبيه عاجل (24h): حصة تجريبية معلّقة (${trial.studentName || 'طالب جديد'}) 🧪`
            : `حصة تجريبية جديدة بانتظار تنسيب المعلم (${trial.studentName || 'طالب جديد'}) 💫`,
          description: assignedTeacherName 
            ? `المادة: ${trial.subject || 'غير محدد'} | المعلم المنسّب: ${assignedTeacherName}.` 
            : `المادة: ${trial.subject || 'غير محدد'} | بانتظار اختيار وتنسيب المعلم المطلوب من مدير المنصة.`,
          timeLabel: trial.createdAt ? new Date(trial.createdAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'معلقة',
          isRead,
          metadata: {
            trialId: trial.id,
            studentName: trial.studentName,
            studentPhone: trial.phone || (trial as any).studentPhone,
            teacherId: trial.teacherId,
            teacherName: trial.teacherName,
            subject: trial.subject,
            grade: trial.grade,
            actionTab: 'trials',
            actionLabel: 'معالجة وتنسيب الحصة 🧪'
          }
        });
      }
    });

    // 2.4 Courses nearing completion (>= 90%)
    courses.forEach(course => {
      if (course.totalHours > 0) {
        const ratio = (course.completedHours || 0) / course.totalHours;
        if (ratio >= 0.9 && ratio < 1) {
          const id = `acad_course_near_${course.id}`;
          const isRead = readNotificationIds.includes(id);
          const pct = Math.round(ratio * 100);
          const remaining = Math.max(0, course.totalHours - (course.completedHours || 0));

          list.push({
            id,
            category: 'academic',
            severity: 'warning',
            title: `شارفت ساعات الدورة على الانتهاء: ${course.name || course.title} (${pct}%) 📚`,
            description: `تم إنجاز ${course.completedHours} ساعة من إجمالي ${course.totalHours} ساعة (${pct}%). يرجى التخطيط لتجديد الدورة أو إتمامها.`,
            timeLabel: 'دورة جماعية',
            isRead,
            metadata: {
              courseId: course.id,
              courseName: course.name || course.title,
              hoursConsumed: course.completedHours,
              hoursAllocated: course.totalHours,
              hoursRemaining: remaining,
              consumptionPercentage: pct,
              isOver90PercentHours: true,
              actionTab: 'placement',
              actionSubTab: 'courses',
              actionLabel: 'تفاصيل الكورس 📚'
            }
          });
        }
      }
    });

    // 2.5 Group courses student hours near depletion (>= 90% consumed OR <= 2 hours remaining)
    courses.forEach(course => {
      if (course.studentIds && course.studentIds.length > 0) {
        const totalHours = Number(course.totalHours) || 0;
        course.studentIds.forEach(sid => {
          const student = students.find(s => s.id === sid);
          const allocated = course.studentHoursAllocated?.[sid] !== undefined 
            ? Number(course.studentHoursAllocated[sid]) 
            : (totalHours > 0 ? totalHours : 10);
          const prevSessions = sessions.filter(s =>
            s.studentId === sid &&
            (s.isGroupSession || s.isGroup) &&
            (s.groupId === course.id || s.groupCourseId === course.id || s.courseCode === course.code) &&
            s.approved !== false
          );
          const consumed = prevSessions.reduce((sum, s) => sum + (Number(s.durationHours) || 0), 0);
          const remaining = Math.max(0, allocated - consumed);
          const ratio = allocated > 0 ? (consumed / allocated) : 0;
          const consumptionPercentage = Math.round(ratio * 100);
          const isOver90Percent = ratio >= 0.9 || remaining <= 2;

          if (isOver90Percent && allocated > 0) {
            const id = `acad_group_depleted_${course.id}_${sid}`;
            const isRead = readNotificationIds.includes(id);
            const isDepleted = remaining <= 0;
            const studentName = student ? student.name : 'طالب';
            const courseTitle = course.title || course.name || 'الدورة الجماعية';

            list.push({
              id,
              category: 'academic',
              severity: isDepleted ? 'critical' : (consumptionPercentage >= 95 ? 'critical' : 'warning'),
              title: isDepleted
                ? `نفاد رصيد دورة جماعية: ${studentName} (${courseTitle}) ⏳`
                : `استهلاك ${consumptionPercentage}% من ساعات الدورة: ${studentName} (متبقي ${remaining} س) 🔥`,
              description: `الدورة: ${courseTitle} | استهلك الطالب ${consumed} س من أصل ${allocated} س المخصصة له (${consumptionPercentage}%). يرجى التنسيق لتجديد الساعات لضمان استمراره.`,
              timeLabel: 'دورة جماعية',
              timestamp: Date.now() - 1800000,
              isRead,
              metadata: {
                studentId: sid,
                studentName,
                studentPhone: student?.phone,
                courseId: course.id,
                courseName: courseTitle,
                hoursConsumed: consumed,
                hoursAllocated: allocated,
                hoursRemaining: remaining,
                consumptionPercentage,
                isOver90PercentHours: true,
                actionTab: 'placement',
                actionSubTab: 'courses',
                actionFocusId: course.id,
                actionLabel: 'إدارة الدورة الجماعية 📚',
                whatsappMessage: student?.phone
                  ? `مرحباً حضرة الأهل الكرام، تحية طيبة من أكاديمية التفوق.\nنود إعلامكم بأن رصيد ساعات الطالب (${studentName}) في الدورة الجماعية (${courseTitle}) ${
                      isDepleted ? 'قد نفد تماماً' : `قد استهلك ${consumptionPercentage}% ومتبقي ${remaining} ساعة فقط`
                    }. يرجى التكرم بالتنسيق معنا لتجديد الساعات لضمان عدم توقف الطالب عن حضور اللقاءات. شكراً لتعاونكم.`
                  : undefined
              }
            });
          }
        });
      }
    });

    // 2.6 Individual students hours nearing completion (>= 90% consumed OR <= 1 session remaining)
    students.forEach(student => {
      const targetSessions = student.targetSessions ? Number(student.targetSessions) : 0;
      const hourlyRate = student.hourlyRate && student.hourlyRate > 0 ? student.hourlyRate : 60;

      const studentIndivSessions = sessions.filter(s =>
        s.studentId === student.id &&
        !s.isGroupSession &&
        !s.isGroup &&
        s.approved !== false
      );
      const consumedHours = studentIndivSessions.reduce((sum, s) => sum + (Number(s.durationHours) || (s.sessionCount ? Number(s.sessionCount) : 1)), 0);
      const consumedCount = studentIndivSessions.length;

      let isOver90Percent = false;
      let consumptionPercentage = 0;
      let remaining = 0;
      let planTotalHours = 0;

      if (targetSessions > 0) {
        planTotalHours = targetSessions;
        const ratio = consumedHours / targetSessions;
        consumptionPercentage = Math.round(ratio * 100);
        remaining = Math.max(0, targetSessions - consumedHours);
        isOver90Percent = ratio >= 0.9 || remaining <= 1;
      } else if (student.balance !== undefined && (student.totalToppedUp || student.totalSpent || consumedHours > 0)) {
        const estRemainingSessions = Math.max(0, Math.floor((student.balance || 0) / hourlyRate));
        const totalEstSessions = consumedCount + estRemainingSessions;
        if (totalEstSessions >= 2) {
          const ratio = consumedCount / totalEstSessions;
          consumptionPercentage = Math.round(ratio * 100);
          remaining = estRemainingSessions;
          planTotalHours = totalEstSessions;
          isOver90Percent = ratio >= 0.9 || estRemainingSessions <= 1 || (student.balance <= hourlyRate && student.balance > 0);
        }
      }

      if (isOver90Percent) {
        const id = `acad_indiv_depleted_${student.id}`;
        // Prevent duplicate if already created under this ID
        if (!list.some(item => item.id === id)) {
          const isRead = readNotificationIds.includes(id);
          const isDepleted = remaining <= 0;
          const studentName = student.name || 'طالب';

          const waMsg = generateParentBalanceMessage({
            studentName,
            balance: student.balance ?? (remaining * hourlyRate),
            hourlyRate,
            remainingHours: remaining,
            urgentRenewal: true
          });

          list.push({
            id,
            category: 'academic',
            severity: isDepleted ? 'critical' : (consumptionPercentage >= 95 ? 'critical' : 'warning'),
            title: isDepleted
              ? `استكمال خطة الساعات الفردية: ${studentName} (${consumptionPercentage}%) 🎯`
              : `استهلاك ${consumptionPercentage}% من ساعات الخطة: ${studentName} (متبقي ${remaining.toFixed(1)} س) 🔥`,
            description: `أنجز الطالب ${consumedCount} لقاءات (${consumedHours.toFixed(1)} س) من أصل ${planTotalHours || (consumedHours + remaining).toFixed(1)} س المقررة (${consumptionPercentage}%). يرجى التنسيق لتجديد الخطة ومتابعة الدروس قبل نفاد الرصيد.`,
            timeLabel: 'خطة فردية',
            timestamp: Date.now() - 1700000,
            isRead,
            metadata: {
              studentId: student.id,
              studentName,
              studentPhone: student.phone,
              hoursConsumed: consumedHours,
              hoursAllocated: planTotalHours || (consumedHours + remaining),
              hoursRemaining: remaining,
              consumptionPercentage,
              isOver90PercentHours: true,
              actionTab: 'students',
              actionFocusId: student.id,
              actionLabel: 'ملف الطالب 👤',
              whatsappMessage: waMsg
            }
          });
        }
      }
    });

    // ==========================================
    // 3. ADMINISTRATIVE NOTIFICATIONS (إدارية)
    // ==========================================
    // 3.1 Pending Session approvals
    if (pendingApprovalsCount > 0) {
      const id = 'admin_pending_sessions_approval';
      const isRead = readNotificationIds.includes(id);

      list.push({
        id,
        category: 'administrative',
        severity: pendingApprovalsCount > 3 ? 'critical' : 'warning',
        title: `حصص بانتظار مصادقة واعتماد الإدارة (${pendingApprovalsCount} حصص) ⏱️`,
        description: `قام المعلمون بتسجيل حصص جديدة مكتملة تتطلب تدقيق واعتماد المدير لإدراجها في السجلات المالية والحسابية.`,
        timeLabel: 'إداري عاجل',
        isRead,
        metadata: {
          actionTab: 'sessions',
          actionLabel: 'اعتماد الحصص الآن ⏱️'
        }
      });
    }

    // 3.2 Auto-Backup Status
    if (globalSettings) {
      if (globalSettings.autoBackupEnabled === false) {
        const id = 'admin_backup_disabled_notice';
        const isRead = readNotificationIds.includes(id);
        list.push({
          id,
          category: 'administrative',
          severity: 'warning',
          title: 'النسخ الاحتياطي التلقائي معطّل 💾',
          description: 'يوصى بتفعيل النسخ الاحتياطي السحابي التلقائي من لوحة الإعدادات لحماية سجلات المركز من أي فقدان طارئ.',
          timeLabel: 'نظام وأمان',
          isRead,
          metadata: {
            actionTab: 'settings',
            actionLabel: 'ضبط الإعدادات ⚙️'
          }
        });
      } else if (globalSettings.lastAutoBackupDate) {
        const lastBackupTime = new Date(globalSettings.lastAutoBackupDate).getTime();
        const daysSinceBackup = (Date.now() - lastBackupTime) / (1000 * 60 * 60 * 24);
        if (daysSinceBackup > 7) {
          const id = 'admin_backup_overdue_notice';
          const isRead = readNotificationIds.includes(id);
          list.push({
            id,
            category: 'administrative',
            severity: 'info',
            title: 'تذكير: مضى أكثر من أسبوع على آخر نسخة احتياطية 🗄️',
            description: `آخر نسخة احتياطية كانت بتاريخ (${globalSettings.lastAutoBackupDate}). يرجى تفقد التخزين السحابي.`,
            timeLabel: 'صيانة دورية',
            isRead,
            metadata: {
              actionTab: 'settings',
              actionLabel: 'لوحة الصيانة ⚙️'
            }
          });
        }
      }
    }

    // 3.3 Smart Whiteboard status info
    if (globalSettings && globalSettings.whiteboardEnabled) {
      const id = 'admin_whiteboard_active_status';
      const isRead = readNotificationIds.includes(id);
      list.push({
        id,
        category: 'administrative',
        severity: 'info',
        title: 'اللوح الذكي التفاعلي نشط 🎨',
        description: 'ميزة اللوح الذكي للشرح المباشر وتنسيق الدروس وملفات PDF متاحة لجميع المعلمين حالياً.',
        timeLabel: 'ميزة ذكية',
        isRead,
        metadata: {
          actionTab: 'settings',
          actionLabel: 'إدارة الميزات ⚙️'
        }
      });
    }

    // 3.4 Inactive teachers check (Teachers with 0 students or 0 sessions)
    if (teachers.length > 0 && sessions.length > 0) {
      const inactiveTeachers = teachers.filter(t => {
        const hasSessions = sessions.some(s => s.teacherId === t.id);
        const hasStudents = students.some(st => st.assignedTeacherId === t.id || st.customRates?.[t.id] !== undefined);
        return !hasSessions && !hasStudents;
      });

      if (inactiveTeachers.length > 0) {
        const id = 'admin_inactive_teachers_summary';
        const isRead = readNotificationIds.includes(id);
        list.push({
          id,
          category: 'administrative',
          severity: 'info',
          title: `يوجد ${inactiveTeachers.length} معلمين مسجلين بدون نشاط أو طلاب 👨‍🏫`,
          description: `المعلمون: ${inactiveTeachers.map(t => t.name).slice(0, 3).join('، ')}${
            inactiveTeachers.length > 3 ? ' وغيرهم' : ''
          }. يرجى مراجعة ملفاتهم أو تنسيب طلاب إليهم.`,
          timeLabel: 'إدارة الكادر',
          isRead,
          metadata: {
            actionTab: 'teachers',
            actionLabel: 'إدارة المعلمين 👨‍🏫'
          }
        });
      }
    }

    return list;
  }, [
    studentThresholdAlerts,
    examResults,
    readResultIds,
    readNotificationIds,
    unassignedStudents,
    trialLessons,
    pendingApprovalsCount,
    globalSettings,
    courses,
    teachers,
    sessions,
    students
  ]);

  // Counts by category & priority metrics
  const counts = useMemo(() => {
    const financial = allNotifications.filter(n => n.category === 'financial');
    const academic = allNotifications.filter(n => n.category === 'academic');
    const administrative = allNotifications.filter(n => n.category === 'administrative');

    const total = allNotifications.length;
    const unread = allNotifications.filter(n => !n.isRead).length;

    const financialUnread = financial.filter(n => !n.isRead).length;
    const financialCritical = financial.filter(n => n.severity === 'critical').length;
    const academicUnread = academic.filter(n => !n.isRead).length;
    const academicUrgent = academic.filter(n => n.severity === 'critical' || n.severity === 'warning').length;
    const adminUnread = administrative.filter(n => !n.isRead).length;
    const totalCritical = allNotifications.filter(n => n.severity === 'critical').length;
    const over90Hours = allNotifications.filter(n => n.metadata?.isOver90PercentHours).length;

    return {
      total,
      unread,
      financial: financial.length,
      financialUnread,
      financialCritical,
      academic: academic.length,
      academicUnread,
      academicUrgent,
      administrative: administrative.length,
      adminUnread,
      totalCritical,
      over90Hours
    };
  }, [allNotifications]);

  // Filtered and priority-sorted notifications based on director selection
  const filteredNotifications = useMemo(() => {
    const filtered = allNotifications.filter(n => {
      // Category filter
      if (selectedCategory !== 'all' && n.category !== selectedCategory) {
        return false;
      }
      // Severity filter
      if (selectedSeverity !== 'all' && n.severity !== selectedSeverity) {
        return false;
      }
      // Unread only filter
      if (showUnreadOnly && n.isRead) {
        return false;
      }
      // Over 90% Hours consumption filter
      if (filterOver90PercentHours && !n.metadata?.isOver90PercentHours) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = (searchQuery || '').toLowerCase().trim();
        const inTitle = (n.title || '').toLowerCase().includes(q);
        const inDesc = (n.description || '').toLowerCase().includes(q);
        const inStudent = n.metadata?.studentName ? (n.metadata.studentName || '').toLowerCase().includes(q) : false;
        const inExam = n.metadata?.examTitle ? (n.metadata.examTitle || '').toLowerCase().includes(q) : false;
        const inPhone = n.metadata?.studentPhone ? n.metadata.studentPhone.includes(q) : false;
        if (!inTitle && !inDesc && !inStudent && !inExam && !inPhone) {
          return false;
        }
      }
      return true;
    });

    // Priority Sort Comparator
    return filtered.sort((a, b) => {
      const timeA = typeof a.timestamp === 'number' ? a.timestamp : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
      const timeB = typeof b.timestamp === 'number' ? b.timestamp : (b.timestamp ? new Date(b.timestamp).getTime() : 0);

      const getSeverityWeight = (s: string) => (s === 'critical' ? 300 : s === 'warning' ? 150 : 50);

      // 1. تنبيهات مالية حرجة أولاً (الافتراضي المطلوب)
      if (prioritySort === 'financial_critical_first') {
        const getFinScore = (n: AppNotification) => {
          let score = 0;
          if (n.category === 'financial') {
            // المالية الحرجة تأخذ أعلى وزن مطلق (10,000)
            score += n.severity === 'critical' ? 10000 : n.severity === 'warning' ? 7000 : 4000;
          } else {
            score += n.severity === 'critical' ? 5000 : n.severity === 'warning' ? 3000 : 1000;
          }
          if (!n.isRead) score += 200;
          return score;
        };
        const scoreDiff = getFinScore(b) - getFinScore(a);
        if (scoreDiff !== 0) return scoreDiff;
        return timeB - timeA;
      }

      // 2. الأعلى خطورة وحرجاً أولاً (حسب درجة الخطورة)
      if (prioritySort === 'severity_first') {
        const sevDiff = getSeverityWeight(b.severity) - getSeverityWeight(a.severity);
        if (sevDiff !== 0) return sevDiff;
        const catWeightA = a.category === 'financial' ? 40 : a.category === 'administrative' ? 20 : 10;
        const catWeightB = b.category === 'financial' ? 40 : b.category === 'administrative' ? 20 : 10;
        const catDiff = catWeightB - catWeightA;
        if (catDiff !== 0) return catDiff;
        if (!a.isRead && b.isRead) return -1;
        if (a.isRead && !b.isRead) return 1;
        return timeB - timeA;
      }

      // 3. أكاديمية عاجلة أولاً
      if (prioritySort === 'academic_urgent_first') {
        const getAcadScore = (n: AppNotification) => {
          let score = 0;
          if (n.category === 'academic') {
            score += n.severity === 'critical' ? 10000 : n.severity === 'warning' ? 7000 : 4000;
          } else {
            score += n.severity === 'critical' ? 5000 : n.severity === 'warning' ? 3000 : 1000;
          }
          if (!n.isRead) score += 200;
          return score;
        };
        const scoreDiff = getAcadScore(b) - getAcadScore(a);
        if (scoreDiff !== 0) return scoreDiff;
        return timeB - timeA;
      }

      // 4. غير المقروء أولاً
      if (prioritySort === 'unread_first') {
        if (!a.isRead && b.isRead) return -1;
        if (a.isRead && !b.isRead) return 1;
        const sevDiff = getSeverityWeight(b.severity) - getSeverityWeight(a.severity);
        if (sevDiff !== 0) return sevDiff;
        return timeB - timeA;
      }

      // 5. التسلسل الزمني (الأحدث أولاً)
      if (prioritySort === 'chronological') {
        if (timeB !== timeA) return timeB - timeA;
        return getSeverityWeight(b.severity) - getSeverityWeight(a.severity);
      }

      // 6. نفاد الساعات أولاً (الطلاب والدورات المستهلكين > 90% من الساعات أولاً)
      if (prioritySort === 'hours_depletion_first') {
        const aOver = a.metadata?.isOver90PercentHours ? 1 : 0;
        const bOver = b.metadata?.isOver90PercentHours ? 1 : 0;
        if (bOver !== aOver) return bOver - aOver;
        const aPct = a.metadata?.consumptionPercentage || 0;
        const bPct = b.metadata?.consumptionPercentage || 0;
        if (bPct !== aPct) return bPct - aPct;
        return timeB - timeA;
      }

      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return getSeverityWeight(b.severity) - getSeverityWeight(a.severity);
    });
  }, [allNotifications, selectedCategory, selectedSeverity, showUnreadOnly, filterOver90PercentHours, searchQuery, prioritySort]);

  // Fast-Action Quick Presets Handler
  const applyQuickPreset = (preset: 'financial_critical' | 'financial_governance' | 'all_critical' | 'academic_urgent' | 'unread' | 'over_90_hours' | 'reset') => {
    if (preset === 'financial_critical') {
      setSelectedCategory('financial');
      setSelectedSeverity('critical');
      setShowUnreadOnly(false);
      setFilterOver90PercentHours(false);
      setPrioritySort('financial_critical_first');
      setActivePreset('financial_critical');
    } else if (preset === 'financial_governance') {
      setSelectedCategory('financial');
      setSelectedSeverity('all');
      setShowUnreadOnly(false);
      setFilterOver90PercentHours(false);
      setPrioritySort('financial_critical_first');
      setActivePreset('financial_governance');
    } else if (preset === 'all_critical') {
      setSelectedCategory('all');
      setSelectedSeverity('critical');
      setShowUnreadOnly(false);
      setFilterOver90PercentHours(false);
      setPrioritySort('severity_first');
      setActivePreset('all_critical');
    } else if (preset === 'academic_urgent') {
      setSelectedCategory('academic');
      setSelectedSeverity('all');
      setShowUnreadOnly(false);
      setFilterOver90PercentHours(false);
      setPrioritySort('academic_urgent_first');
      setActivePreset('academic_urgent');
    } else if (preset === 'unread') {
      setSelectedCategory('all');
      setSelectedSeverity('all');
      setShowUnreadOnly(true);
      setFilterOver90PercentHours(false);
      setPrioritySort('unread_first');
      setActivePreset('unread');
    } else if (preset === 'over_90_hours') {
      setSelectedCategory('all');
      setSelectedSeverity('all');
      setShowUnreadOnly(false);
      setFilterOver90PercentHours(true);
      setPrioritySort('hours_depletion_first');
      setActivePreset('over_90_hours');
    } else {
      // Reset
      setSelectedCategory('all');
      setSelectedSeverity('all');
      setShowUnreadOnly(false);
      setFilterOver90PercentHours(false);
      setSearchQuery('');
      setPrioritySort('financial_critical_first');
      setActivePreset('reset');
    }
  };

  // Mark all currently visible as read
  const handleMarkAllAsRead = () => {
    if (onMarkAllResultsAsRead) {
      onMarkAllResultsAsRead();
    }
    const allIds = allNotifications.map(n => n.id);
    setReadNotificationIds(Array.from(new Set([...readNotificationIds, ...allIds])));
  };

  // Clear all read status (mark all as unread)
  const handleResetReadStatus = () => {
    setReadNotificationIds([]);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[160] overflow-hidden" dir="rtl">
          {/* Backdrop blur overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity cursor-pointer"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
            {/* Drawer Container */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-screen max-w-xl bg-slate-900 border-r sm:border-l border-slate-800 shadow-2xl flex flex-col h-full text-slate-100 relative z-10"
              id="director-notification-drawer"
            >
              {/* Drawer Top Header */}
              <div className="p-5 md:p-6 bg-slate-950 border-b border-slate-800/90 relative">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 relative shrink-0">
                      <Bell className="w-5 h-5 animate-bounce" />
                      {counts.unread > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border-2 border-slate-900"></span>
                        </span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base md:text-lg font-black text-white tracking-tight">
                          لوحة الإشعارات والتنبيهات التفاعلية
                        </h2>
                        {counts.unread > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-black font-mono">
                            {counts.unread} جديد
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-bold mt-0.5">
                        مركز المتابعة والتحكم الذكي: تصنيف مالي، أكاديمي، وإداري شامل
                      </p>
                    </div>
                  </div>

                  {/* Close button */}
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700/60 hover:border-rose-500/40 transition-all cursor-pointer"
                    title="إغلاق اللوحة (Esc)"
                    id="close-notification-drawer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Primary Category Selector Tabs (مالية، أكاديمية، إدارية) */}
                <div className="grid grid-cols-4 gap-2 mt-5 p-1 bg-slate-900/90 rounded-2xl border border-slate-800">
                  {/* Tab: All */}
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer select-none ${
                      selectedCategory === 'all'
                        ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/30 font-extrabold'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                    id="drawer-tab-all"
                  >
                    <Layers size={14} className="shrink-0" />
                    <span>الكل</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                        selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {counts.total}
                    </span>
                  </button>

                  {/* Tab: Financial (مالية) */}
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('financial')}
                    className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer select-none ${
                      selectedCategory === 'financial'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 font-extrabold'
                        : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800/60'
                    }`}
                    id="drawer-tab-financial"
                  >
                    <DollarSign size={14} className="shrink-0 text-emerald-400" />
                    <span>مالية</span>
                    {counts.financial > 0 && (
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                          selectedCategory === 'financial' ? 'bg-white/20 text-white' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {counts.financial}
                      </span>
                    )}
                  </button>

                  {/* Tab: Academic (أكاديمية) */}
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('academic')}
                    className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer select-none ${
                      selectedCategory === 'academic'
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-600/30 font-extrabold'
                        : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800/60'
                    }`}
                    id="drawer-tab-academic"
                  >
                    <GraduationCap size={14} className="shrink-0 text-amber-400" />
                    <span>أكاديمية</span>
                    {counts.academic > 0 && (
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                          selectedCategory === 'academic' ? 'bg-white/20 text-white' : 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {counts.academic}
                      </span>
                    )}
                  </button>

                  {/* Tab: Administrative (إدارية) */}
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('administrative')}
                    className={`py-2.5 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer select-none ${
                      selectedCategory === 'administrative'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 font-extrabold'
                        : 'text-slate-400 hover:text-purple-300 hover:bg-slate-800/60'
                    }`}
                    id="drawer-tab-administrative"
                  >
                    <Settings size={14} className="shrink-0 text-purple-400" />
                    <span>إدارية</span>
                    {counts.administrative > 0 && (
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                          selectedCategory === 'administrative' ? 'bg-white/20 text-white' : 'bg-purple-950/60 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {counts.administrative}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Filtering & Quick Action Toolbar */}
              <div className="p-3 md:p-4 bg-slate-900/95 border-b border-slate-800 space-y-3">
                {/* Search box */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="ابحث في التنبيهات، أسماء الطلاب، أو الامتحانات..."
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                  <Search size={16} className="absolute right-3.5 top-3 text-slate-500" />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute left-3 top-3 text-slate-500 hover:text-white text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Priority Sorting & Quick Presets Section */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                  {/* Title & One-Click Quick Presets */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-200">
                      <SlidersHorizontal size={13} className="text-amber-400 shrink-0" />
                      <span>فلاتر سريعة بنقرة واحدة:</span>
                    </div>

                    {/* Quick Preset Action Chips */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => applyQuickPreset('financial_critical')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 border ${
                          activePreset === 'financial_critical' && selectedCategory === 'financial' && selectedSeverity === 'critical'
                            ? 'bg-rose-600 text-white border-rose-400 shadow-sm shadow-rose-950/50'
                            : 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border-rose-800/50'
                        }`}
                        title="حصر التنبيهات فوراً بالمديونيات وتجاوز الحدود المالية الحرجة"
                        id="filter-preset-financial-critical"
                      >
                        <AlertOctagon size={11} className="text-rose-300" />
                        <span>🚨 مالية حرجة فقط</span>
                        {counts.financialCritical > 0 && (
                          <span className="px-1 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                            {counts.financialCritical}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => applyQuickPreset('financial_governance')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 border ${
                          activePreset === 'financial_governance' && selectedCategory === 'financial'
                            ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-sm shadow-amber-950/50'
                            : 'bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 border-amber-800/50'
                        }`}
                        title="عرض إشعارات الرقابة المالية والحصص الكبرى وتغيرات الأرصدة"
                        id="filter-preset-financial-governance"
                      >
                        <ShieldAlert size={11} className="text-amber-400" />
                        <span>🛡️ رقابة مالية</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => applyQuickPreset('all_critical')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 border ${
                          activePreset === 'all_critical' && selectedSeverity === 'critical' && selectedCategory === 'all'
                            ? 'bg-rose-600 text-white border-rose-400 shadow-sm shadow-rose-950/50'
                            : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
                        }`}
                        title="عرض كافة التنبيهات ذات الخطورة القصوى (مالية، إدارية، أكاديمية)"
                        id="filter-preset-all-critical"
                      >
                        <Flame size={11} className="text-rose-400" />
                        <span>🔥 كافة الحرجة</span>
                        {counts.totalCritical > 0 && (
                          <span className="px-1 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-bold">
                            {counts.totalCritical}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => applyQuickPreset('academic_urgent')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 border ${
                          activePreset === 'academic_urgent' && selectedCategory === 'academic' && !filterOver90PercentHours
                            ? 'bg-amber-600 text-white border-amber-400 shadow-sm shadow-amber-950/50'
                            : 'bg-slate-950 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
                        }`}
                        title="عرض التنبيهات الأكاديمية العاجلة والحصص التجريبية ونفاد ساعات الدورات"
                        id="filter-preset-academic-urgent"
                      >
                        <GraduationCap size={11} className="text-amber-400" />
                        <span>📝 أكاديمية عاجلة</span>
                        {counts.academicUrgent > 0 && (
                          <span className="px-1 py-0.2 rounded-full bg-amber-500 text-white text-[9px] font-bold">
                            {counts.academicUrgent}
                          </span>
                        )}
                      </button>

                      {/* Over 90% Hours Consumption Filter Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (filterOver90PercentHours) {
                            setFilterOver90PercentHours(false);
                            setActivePreset(null);
                          } else {
                            applyQuickPreset('over_90_hours');
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 border ${
                          filterOver90PercentHours
                            ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white border-amber-300 shadow-sm shadow-amber-950/50 ring-1 ring-amber-300/40'
                            : 'bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 border-amber-800/50'
                        }`}
                        title="عرض فقط الطلاب الذين استهلكوا أكثر من 90% من الساعات لسهولة وسرعة الوصول"
                        id="filter-preset-over-90-hours"
                      >
                        <TrendingDown size={11} className={filterOver90PercentHours ? 'text-white' : 'text-amber-400'} />
                        <span>⏳ فقط الطلاب الذين استهلكوا أكثر من 90% من الساعات</span>
                        {counts.over90Hours > 0 && (
                          <span className={`px-1 py-0.2 rounded-full text-[9px] font-bold ${
                            filterOver90PercentHours ? 'bg-white/30 text-white' : 'bg-amber-500 text-white'
                          }`}>
                            {counts.over90Hours}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => applyQuickPreset('reset')}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800 transition-all cursor-pointer flex items-center gap-1"
                        title="إعادة ضبط الفلاتر إلى العرض الطبيعي"
                        id="filter-preset-reset"
                      >
                        <RefreshCw size={10} />
                        <span>إعادة ضبط</span>
                      </button>
                    </div>
                  </div>

                  {/* Priority Sort Mode Selector Tabs */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-0.5">
                      <span className="flex items-center gap-1">
                        <ArrowUpDown size={11} className="text-amber-400" />
                        <span>أولوية الفرز والعرض:</span>
                      </span>
                      <span className="text-[10px] text-slate-500">اختر معيار الأولوية في القائمة</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 p-1 bg-slate-950/90 rounded-xl border border-slate-800/80">
                      {/* 1. المالية الحرجة أولاً (المطلوب الرئيسي) */}
                      <button
                        type="button"
                        onClick={() => {
                          setPrioritySort('financial_critical_first');
                          setActivePreset('financial_critical_first');
                        }}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                          prioritySort === 'financial_critical_first'
                            ? 'bg-gradient-to-r from-rose-600 via-amber-600 to-rose-600 text-white shadow-md font-extrabold ring-1 ring-white/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                        title="ترتيب ذكي يضع التنبيهات المالية الحرجة وتجاوز سقف الديون في الصدارة"
                        id="sort-financial-critical-first"
                      >
                        <DollarSign size={13} className={prioritySort === 'financial_critical_first' ? 'text-amber-200' : 'text-emerald-400'} />
                        <span>المالية الحرجة أولاً</span>
                        {counts.financialCritical > 0 && (
                          <span className={`text-[9px] font-mono font-bold px-1 rounded-full ${
                            prioritySort === 'financial_critical_first' ? 'bg-white/30 text-white' : 'bg-rose-950 text-rose-300 border border-rose-700/50'
                          }`}>
                            {counts.financialCritical}
                          </span>
                        )}
                      </button>

                      {/* 2. الأعلى خطورة وحرجاً أولاً */}
                      <button
                        type="button"
                        onClick={() => {
                          setPrioritySort('severity_first');
                          setActivePreset('severity_first');
                        }}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                          prioritySort === 'severity_first'
                            ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md font-extrabold ring-1 ring-white/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                        title="ترتيب كافة التنبيهات بحسب مستوى الخطورة (عاجل وحرج أولاً ثم تحذير ثم إشعار)"
                        id="sort-severity-first"
                      >
                        <Flame size={13} className={prioritySort === 'severity_first' ? 'text-amber-200' : 'text-rose-400'} />
                        <span>الأعلى خطورة</span>
                        {counts.totalCritical > 0 && (
                          <span className={`text-[9px] font-mono font-bold px-1 rounded-full ${
                            prioritySort === 'severity_first' ? 'bg-white/30 text-white' : 'bg-rose-950 text-rose-300 border border-rose-700/50'
                          }`}>
                            {counts.totalCritical}
                          </span>
                        )}
                      </button>

                      {/* 3. استهلاك > 90% ساعات */}
                      <button
                        type="button"
                        onClick={() => {
                          setPrioritySort('hours_depletion_first');
                          setActivePreset('over_90_hours');
                        }}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                          prioritySort === 'hours_depletion_first'
                            ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md font-extrabold ring-1 ring-white/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                        title="ترتيب التنبيهات بتقديم الطلاب الذين استهلكوا أكثر من 90% من الساعات أولاً"
                        id="sort-hours-depletion-first"
                      >
                        <TrendingDown size={13} className={prioritySort === 'hours_depletion_first' ? 'text-white' : 'text-amber-400'} />
                        <span>استهلاك &gt; 90% ساعات</span>
                        {counts.over90Hours > 0 && (
                          <span className={`text-[9px] font-mono font-bold px-1 rounded-full ${
                            prioritySort === 'hours_depletion_first' ? 'bg-white/30 text-white' : 'bg-amber-950 text-amber-300 border border-amber-700/50'
                          }`}>
                            {counts.over90Hours}
                          </span>
                        )}
                      </button>

                      {/* 4. الأكاديمية العاجلة أولاً */}
                      <button
                        type="button"
                        onClick={() => {
                          setPrioritySort('academic_urgent_first');
                          setActivePreset('academic_urgent_first');
                        }}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                          prioritySort === 'academic_urgent_first'
                            ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md font-extrabold ring-1 ring-white/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                        title="وضع التنبيهات الأكاديمية العاجلة والحصص التجريبية والامتحانات أولاً"
                        id="sort-academic-urgent-first"
                      >
                        <Zap size={13} className={prioritySort === 'academic_urgent_first' ? 'text-amber-200' : 'text-amber-400'} />
                        <span>الأكاديمية العاجلة</span>
                        {counts.academicUrgent > 0 && (
                          <span className={`text-[9px] font-mono font-bold px-1 rounded-full ${
                            prioritySort === 'academic_urgent_first' ? 'bg-white/30 text-white' : 'bg-amber-950 text-amber-300 border border-amber-700/50'
                          }`}>
                            {counts.academicUrgent}
                          </span>
                        )}
                      </button>

                      {/* 5. غير المقروء أولاً */}
                      <button
                        type="button"
                        onClick={() => {
                          setPrioritySort('unread_first');
                          setActivePreset('unread_first');
                        }}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                          prioritySort === 'unread_first'
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md font-extrabold ring-1 ring-white/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                        title="عرض التنبيهات الجديدة وغير المقروءة أولاً"
                        id="sort-unread-first"
                      >
                        <Bell size={13} className={prioritySort === 'unread_first' ? 'text-indigo-200' : 'text-indigo-400'} />
                        <span>غير المقروء أولاً</span>
                        {counts.unread > 0 && (
                          <span className={`text-[9px] font-mono font-bold px-1 rounded-full ${
                            prioritySort === 'unread_first' ? 'bg-white/30 text-white' : 'bg-indigo-950 text-indigo-300 border border-indigo-700/50'
                          }`}>
                            {counts.unread}
                          </span>
                        )}
                      </button>

                      {/* 6. التسلسل الزمني (الأحدث أولاً) */}
                      <button
                        type="button"
                        onClick={() => {
                          setPrioritySort('chronological');
                          setActivePreset('chronological');
                        }}
                        className={`col-span-2 sm:col-span-1 px-2 py-1.5 rounded-lg text-[11px] font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                          prioritySort === 'chronological'
                            ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-md font-extrabold ring-1 ring-white/20'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                        title="العرض وفق التسلسل الزمني التقليدي (الأحدث أولاً)"
                        id="sort-chronological"
                      >
                        <Clock size={13} className={prioritySort === 'chronological' ? 'text-sky-300' : 'text-slate-400'} />
                        <span>الأحدث زمنياً</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Sub-filters & Quick Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  {/* Severity Pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                      <Filter size={12} />
                      <span>تصفية الدرجة:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSeverity('all')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        selectedSeverity === 'all'
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      الكل
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSeverity('critical')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                        selectedSeverity === 'critical'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-rose-950/30 text-rose-300 hover:bg-rose-950/60 border border-rose-800/40'
                      }`}
                    >
                      <span>🚨 عاجل ({counts.totalCritical})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSeverity('warning')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                        selectedSeverity === 'warning'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-amber-950/30 text-amber-300 hover:bg-amber-950/60 border border-amber-800/40'
                      }`}
                    >
                      <span>⚠️ تحذير</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSeverity('info')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                        selectedSeverity === 'info'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-sky-950/30 text-sky-300 hover:bg-sky-950/60 border border-sky-800/40'
                      }`}
                    >
                      <span>ℹ️ إشعار</span>
                    </button>
                  </div>

                  {/* Unread Toggle & Mark All Actions & Over 90% Hours Toggle */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setFilterOver90PercentHours(!filterOver90PercentHours)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                        filterOver90PercentHours
                          ? 'bg-amber-600/30 text-amber-300 border-amber-500/50 shadow-sm'
                          : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
                      }`}
                      title="حصر القائمة بالطلاب الذين استهلكوا أكثر من 90% من الساعات لسهولة وسرعة الوصول"
                      id="subfilter-over-90-hours"
                    >
                      <TrendingDown size={11} className={filterOver90PercentHours ? 'text-amber-300' : 'text-slate-400'} />
                      <span>{filterOver90PercentHours ? 'فقط الطلاب > 90% ساعات' : 'استهلاك > 90% ساعات'}</span>
                      {counts.over90Hours > 0 && (
                        <span className="px-1 py-0.2 rounded-full bg-amber-500/30 text-amber-200 text-[9px] font-bold">
                          {counts.over90Hours}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                        showUnreadOnly
                          ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                          : 'bg-slate-950 text-slate-400 hover:text-white border-slate-800'
                      }`}
                    >
                      {showUnreadOnly ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>{showUnreadOnly ? 'غير المقروء فقط' : 'عرض الكل'}</span>
                    </button>

                    {counts.unread > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllAsRead}
                        className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-black transition-all cursor-pointer flex items-center gap-1"
                        title="تحديد كافة التنبيهات كمقروءة ومؤكدة"
                      >
                        <CheckCheck size={12} />
                        <span>تحديد الكل كمقروء</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Active Priority & View Indicator Banner */}
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-950/70 border border-slate-800/60 rounded-xl text-[11px] font-bold text-slate-400">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-slate-400">
                      <ArrowUpDown size={12} className="text-amber-400" />
                      <span>الترتيب النشط:</span>
                    </span>
                    <span className="text-white font-black bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700 text-[10px] flex items-center gap-1">
                      {prioritySort === 'financial_critical_first' && (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                          <span>🚨 تنبيهات مالية حرجة أولاً</span>
                        </>
                      )}
                      {prioritySort === 'severity_first' && (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          <span>🔥 الأعلى خطورة وحرجاً أولاً</span>
                        </>
                      )}
                      {prioritySort === 'hours_depletion_first' && (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          <span>⏳ استهلاك الساعات (&gt; 90%) أولاً</span>
                        </>
                      )}
                      {prioritySort === 'academic_urgent_first' && (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          <span>📝 الأكاديمية العاجلة أولاً</span>
                        </>
                      )}
                      {prioritySort === 'unread_first' && (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          <span>📌 غير المقروء أولاً</span>
                        </>
                      )}
                      {prioritySort === 'chronological' && (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                          <span>⏱️ التسلسل الزمني (الأحدث أولاً)</span>
                        </>
                      )}
                    </span>

                    {filterOver90PercentHours && (
                      <span className="text-amber-200 font-black bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-700/60 text-[10px] flex items-center gap-1 animate-fadeIn">
                        <TrendingDown size={11} className="text-amber-400" />
                        <span>فلتر نشط: فقط الطلاب الذين استهلكوا أكثر من 90% من الساعات</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono font-bold">
                      عرض {filteredNotifications.length} من أصل {allNotifications.length}
                    </span>
                    {(selectedCategory !== 'all' || selectedSeverity !== 'all' || showUnreadOnly || filterOver90PercentHours || searchQuery) && (
                      <button
                        type="button"
                        onClick={() => applyQuickPreset('reset')}
                        className="text-[10px] text-amber-400 hover:text-amber-300 underline font-bold cursor-pointer"
                      >
                        إلغاء التصفية
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Notification Cards List (Scrollable) */}
              <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3.5 custom-scrollbar">
                {filteredNotifications.length === 0 ? (
                  <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-950/40">
                    <div className="w-16 h-16 rounded-3xl bg-slate-800/60 text-slate-400 flex items-center justify-center mb-4">
                      {selectedCategory === 'financial' && <DollarSign className="w-8 h-8 text-emerald-400/60" />}
                      {selectedCategory === 'academic' && <GraduationCap className="w-8 h-8 text-amber-400/60" />}
                      {selectedCategory === 'administrative' && <Settings className="w-8 h-8 text-purple-400/60" />}
                      {selectedCategory === 'all' && <CheckCircle2 className="w-8 h-8 text-indigo-400/60" />}
                    </div>
                    <h3 className="text-sm font-black text-white">لا توجد تنبيهات نشطة حالياً</h3>
                    <p className="text-xs text-slate-400 font-bold max-w-xs mt-1.5 leading-relaxed">
                      {searchQuery
                        ? 'لم يتم العثور على أي نتائج تطابق عملية البحث الحالية.'
                        : showUnreadOnly
                        ? 'لقد قمت بقراءة ومعالجة جميع التنبيهات في هذا التصنيف بنجاح!'
                        : 'كافة العمليات الحسابية والأكاديمية والإدارية تسير وفق المعايير المعتمدة دون أي إشعارات معلّقة.'}
                    </p>
                    {showUnreadOnly && (
                      <button
                        type="button"
                        onClick={() => setShowUnreadOnly(false)}
                        className="mt-4 px-4 py-2 bg-indigo-600/30 text-indigo-300 hover:bg-indigo-600/50 rounded-xl text-xs font-black transition-all cursor-pointer"
                      >
                        عرض جميع التنبيهات المقروءة
                      </button>
                    )}
                  </div>
                ) : (
                  filteredNotifications.map(notification => {
                    const isFinancial = notification.category === 'financial';
                    const isAcademic = notification.category === 'academic';
                    const isAdministrative = notification.category === 'administrative';

                    const isCritical = notification.severity === 'critical';
                    const isWarning = notification.severity === 'warning';
                    const isInfo = notification.severity === 'info';

                    return (
                      <motion.div
                        key={notification.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`p-4 rounded-2xl border transition-all relative overflow-hidden group ${
                          notification.isRead
                            ? 'bg-slate-950/40 border-slate-800/80 opacity-75 hover:opacity-100'
                            : isCritical
                            ? 'bg-gradient-to-br from-rose-950/30 via-slate-900 to-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-950/30'
                            : isWarning
                            ? 'bg-gradient-to-br from-amber-950/25 via-slate-900 to-amber-950/15 border-amber-500/40 shadow-md shadow-amber-950/20'
                            : 'bg-gradient-to-br from-slate-900 to-indigo-950/20 border-slate-700/80 shadow-md'
                        }`}
                      >
                        {/* Status bar line on top right */}
                        <div
                          className={`absolute top-0 right-0 left-0 h-1 ${
                            isCritical
                              ? 'bg-rose-500'
                              : isWarning
                              ? 'bg-amber-500'
                              : isFinancial
                              ? 'bg-emerald-500'
                              : isAcademic
                              ? 'bg-amber-400'
                              : 'bg-purple-500'
                          }`}
                        />

                        {/* Card Top: Badges and Quick toggle read */}
                        <div className="flex items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Category Badge */}
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1 ${
                                isFinancial
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : isAcademic
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              }`}
                            >
                              {isFinancial && <DollarSign size={10} />}
                              {isAcademic && <GraduationCap size={10} />}
                              {isAdministrative && <Settings size={10} />}
                              <span>
                                {isFinancial ? 'تنبيه مالي' : isAcademic ? 'تنبيه أكاديمي' : 'تنبيه إداري'}
                              </span>
                            </span>

                            {/* Severity & Priority Badges */}
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-black ${
                                isCritical
                                  ? 'bg-rose-500/30 text-rose-200 border border-rose-500/50 animate-pulse'
                                  : isWarning
                                  ? 'bg-amber-500/25 text-amber-200 border border-amber-500/40'
                                  : 'bg-sky-500/20 text-sky-200 border border-sky-500/30'
                              }`}
                            >
                              {isCritical ? '🚨 حرج وعاجل' : isWarning ? '⚠️ تحذير' : 'ℹ️ إشعار'}
                            </span>

                            {/* Distinctive Priority Tag */}
                            {isFinancial && isCritical && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-sm border border-rose-400 flex items-center gap-1">
                                <DollarSign size={10} />
                                <span>أولوية مالية قصوى</span>
                              </span>
                            )}
                            {isFinancial && isWarning && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500/20 text-amber-200 border border-amber-500/30 flex items-center gap-1">
                                <DollarSign size={10} />
                                <span>متابعة مالية</span>
                              </span>
                            )}
                            {!isFinancial && isCritical && (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                                <Flame size={10} />
                                <span>أولوية قصوى</span>
                              </span>
                            )}

                            {/* Over 90% Hours Consumption Tag */}
                            {notification.metadata?.isOver90PercentHours && (
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1 border shadow-xs ${
                                (notification.metadata.consumptionPercentage ?? 0) >= 100
                                  ? 'bg-rose-500/25 text-rose-200 border-rose-500/50'
                                  : 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                              }`}>
                                <TrendingDown size={10} className="text-amber-400" />
                                <span>استهلاك {notification.metadata.consumptionPercentage ?? 90}% من الساعات</span>
                              </span>
                            )}

                            {/* Time badge */}
                            {notification.timeLabel && (
                              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                <Clock size={10} />
                                <span>{notification.timeLabel}</span>
                              </span>
                            )}
                          </div>

                          {/* Toggle Read status button */}
                          <button
                            type="button"
                            onClick={() => toggleNotificationRead(notification.id, notification.metadata?.examId)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                              notification.isRead
                                ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                                : 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/50'
                            }`}
                            title={notification.isRead ? 'تعيين كغير مقروء' : 'تحديد كمقروء ومعتمد'}
                          >
                            <CheckCheck size={11} />
                            <span>{notification.isRead ? 'مقروء' : 'جديد'}</span>
                          </button>
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-1 text-right">
                          <h4 className="text-xs md:text-sm font-black text-white leading-snug">
                            {notification.title}
                          </h4>
                          <p className="text-[11px] text-slate-300 font-bold leading-relaxed">
                            {notification.description}
                          </p>
                        </div>

                        {/* Financial or Exam Metric Highlight Box */}
                        {notification.metadata && (
                          <div className="mt-3 p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                            {/* If balance metadata */}
                            {notification.metadata.balance !== undefined && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-bold">الرصيد الفعلي:</span>
                                <span
                                  className={`text-xs font-black font-mono ${
                                    notification.metadata.balance < 0 ? 'text-rose-400' : 'text-emerald-400'
                                  }`}
                                >
                                  ₪{notification.metadata.balance}
                                </span>
                                {notification.metadata.threshold !== undefined && (
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    (العتبة: ₪{notification.metadata.threshold})
                                  </span>
                                )}
                              </div>
                            )}

                            {/* If exam score metadata */}
                            {notification.metadata.score !== undefined && (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-bold">النتيجة:</span>
                                <span
                                  className={`text-xs font-black font-mono ${
                                    notification.metadata.score >= 50 ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {notification.metadata.score}%
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  ({notification.metadata.correctCount} / {notification.metadata.answersCount || '–'})
                                </span>
                              </div>
                            )}

                            {/* Phone number */}
                            {notification.metadata.studentPhone && (
                              <span className="text-[10px] font-mono text-slate-400 font-bold">
                                📞 {notification.metadata.studentPhone}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Manager Selection & Assignment for Trial Lesson */}
                        {notification.metadata?.trialId && (
                          <div className="mt-3 p-3 bg-slate-900/95 rounded-2xl border border-amber-500/40 text-right space-y-2 shadow-inner">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                                <GraduationCap size={14} className="text-amber-400" />
                                <span>👨‍🏫 المعلم المطلوب للحصة التجريبية (اختياري):</span>
                              </label>
                              {notification.metadata.teacherName && notification.metadata.teacherId && (
                                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                                  منسّب: {notification.metadata.teacherName} ✓
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <select
                                value={notification.metadata.teacherId || ''}
                                onChange={async (e) => {
                                  const tId = e.target.value;
                                  const chosen = teachers.find(t => t.id === tId);
                                  try {
                                    const trialDocRef = doc(db, 'trialLessons', notification.metadata!.trialId!);
                                    await updateDoc(trialDocRef, {
                                      teacherId: tId || null,
                                      teacherName: chosen ? chosen.name : 'بانتظار تنسيب المعلم',
                                      teacherPhone: chosen?.phone || ''
                                    });
                                  } catch (err) {
                                    console.error("Error updating trial teacher from notification drawer:", err);
                                  }
                                }}
                                className="w-full text-xs bg-slate-950 border border-slate-700 hover:border-amber-400 text-slate-100 py-2 px-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-400 font-sans cursor-pointer font-bold"
                              >
                                <option value="">-- اضغط لاختيار وتنسيب المعلم المستهدف لهذا الطالب --</option>
                                {teachers.map(t => (
                                  <option key={t.id} value={t.id}>
                                    👨‍🏫 {t.name} ({t.specialization || (Array.isArray(t.subjects) ? t.subjects.join('، ') : 'عام')})
                                  </option>
                                ))}
                              </select>
                            </div>
                            {notification.metadata.teacherId && (() => {
                              const assignedTeacher = teachers.find(t => t.id === notification.metadata?.teacherId);
                              if (assignedTeacher?.phone) {
                                const cleanPhone = assignedTeacher.phone.replace(/[\s\-\+\(\)]/g, '');
                                const shareMsg = `السلام عليكم ورحمة الله أستاذ(ة) ${assignedTeacher.name} 🌸\n` +
                                  `تم تنسيب حصة تجريبية جديدة لك من إدارة المنصة:\n` +
                                  `👤 الطالب: ${notification.metadata.studentName || 'طالب جديد'}\n` +
                                  `📚 الصف: ${notification.metadata.grade || 'غير محدد'}\n` +
                                  `📖 المادة: ${notification.metadata.subject || 'حصة تجريبية'}\n` +
                                  `📞 هاتف الطالب: ${notification.metadata.studentPhone || '–'}\n\n` +
                                  `يرجى التواصل والمتابعة لتنسيق موعد الحصة. بالتوفيق! ✨`;
                                return (
                                  <div className="pt-1 flex items-center justify-between text-[11px]">
                                    <span className="text-slate-400 font-bold">تم تعيين وتنسيب المعلم المستهدف بنجاح</span>
                                    <a
                                      href={`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(shareMsg)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                                    >
                                      <MessageCircle size={12} />
                                      <span>إشعار المعلم عبر واتساب 📲</span>
                                    </a>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-3.5 pt-2.5 border-t border-slate-800/70 flex flex-wrap items-center justify-end gap-2">
                          {/* WhatsApp Reminder Action */}
                          {notification.metadata?.studentPhone && notification.metadata?.whatsappMessage && (
                            <a
                              href={`https://wa.me/${notification.metadata.studentPhone.replace(/[\s\-\+]/g, '')}?text=${encodeURIComponent(
                                notification.metadata.whatsappMessage
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer"
                              title="إرسال رسالة تذكير مخصصة عبر WhatsApp"
                            >
                              <MessageCircle size={12} />
                              <span>مراسلة واتساب</span>
                            </a>
                          )}

                          {/* Primary Navigation / Deep-link Action */}
                          {notification.metadata?.actionTab && (
                            <button
                              type="button"
                              onClick={() => {
                                toggleNotificationRead(notification.id, notification.metadata?.examId);
                                onNavigateTab(
                                  notification.metadata!.actionTab!,
                                  notification.metadata?.actionSubTab,
                                  notification.metadata?.actionFocusId
                                );
                                onClose();
                              }}
                              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20"
                            >
                              <span>{notification.metadata.actionLabel || 'عرض التفاصيل 🔍'}</span>
                              <ExternalLink size={11} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* Drawer Footer summary */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="font-bold">
                    إجمالي التنبيهات: <strong className="text-white font-mono">{counts.total}</strong>
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="font-bold">
                    غير مقروء: <strong className="text-rose-400 font-mono">{counts.unread}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {readNotificationIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleResetReadStatus}
                      className="text-[10px] font-bold text-slate-500 hover:text-slate-300 underline cursor-pointer"
                    >
                      إعادة تعيين المقروء
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-xl cursor-pointer transition-all"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
