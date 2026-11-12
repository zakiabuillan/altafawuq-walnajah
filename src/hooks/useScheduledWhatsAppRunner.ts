import { useState, useEffect, useRef } from 'react';
import { ScheduledWhatsAppReminder, Student, Settings } from '../types';
import { 
  subscribeToScheduledReminders, 
  saveScheduledReminder, 
  computeNextOccurrence, 
  formatScheduledWhatsAppMessage 
} from '../lib/scheduledWhatsAppUtils';
import { logActivity } from '../lib/activityLogger';

interface UseScheduledWhatsAppRunnerProps {
  students: Student[];
  settings: Settings;
  calculateStudentBalance: (student: Student) => number;
  userRole: 'manager' | 'teacher' | 'student';
}

export function useScheduledWhatsAppRunner({
  students,
  settings,
  calculateStudentBalance,
  userRole
}: UseScheduledWhatsAppRunnerProps) {
  const [scheduledReminders, setScheduledReminders] = useState<ScheduledWhatsAppReminder[]>([]);
  const [dueReminder, setDueReminder] = useState<ScheduledWhatsAppReminder | null>(null);
  const [isExecutingDue, setIsExecutingDue] = useState(false);
  const processedRemindersRef = useRef<Set<string>>(new Set());

  // Subscribe to reminders from Firestore
  useEffect(() => {
    if (userRole !== 'manager') return;
    const unsubscribe = subscribeToScheduledReminders((list) => {
      setScheduledReminders(list);
    });
    return () => unsubscribe();
  }, [userRole]);

  // Periodic check ticker every 30 seconds
  useEffect(() => {
    if (userRole !== 'manager') return;

    const checkDueReminders = () => {
      const now = new Date();
      const pendingReminders = scheduledReminders.filter(r => r.status === 'pending');

      for (const reminder of pendingReminders) {
        if (!reminder.scheduledAt) continue;
        const scheduledTime = new Date(reminder.scheduledAt);
        
        // If scheduled time has arrived or passed (within last 48 hours to avoid stale)
        const diffMs = now.getTime() - scheduledTime.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffMs >= 0 && diffHours <= 48) {
          // If not already alerted in this session
          if (!processedRemindersRef.current.has(reminder.id)) {
            setDueReminder(reminder);
            break;
          }
        }
      }
    };

    checkDueReminders();
    const interval = setInterval(checkDueReminders, 30000); // every 30s
    return () => clearInterval(interval);
  }, [scheduledReminders, userRole]);

  // Execute due reminder directly
  const executeDueReminder = async (reminder: ScheduledWhatsAppReminder) => {
    setIsExecutingDue(true);
    processedRemindersRef.current.add(reminder.id);

    try {
      const lowBalanceThreshold = settings.lowBalanceThreshold ?? -100;
      const academyName = settings.academyName || 'أكاديمية التفوق أون لاين';

      // 1. Resolve current eligible students
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

      let sentCount = 0;
      let skippedCount = 0;
      const sentNames: string[] = [];

      for (let i = 0; i < targetList.length; i++) {
        const student = targetList[i];
        const bal = calculateStudentBalance(student);
        const th = typeof student.lowBalanceThreshold === 'number' ? student.lowBalanceThreshold : lowBalanceThreshold;
        const cleanPhone = (student.phone || student.phoneNumber || student.contact || '').replace(/[\s\-\+]/g, '');

        if (cleanPhone) {
          const msg = formatScheduledWhatsAppMessage(student, reminder.messageTemplate, bal, th, academyName);
          const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
          window.open(waUrl, '_blank');
          sentCount++;
          sentNames.push(student.name);

          await logActivity({
            actionType: 'AUTO_DISPATCH_SCHEDULED_WHATSAPP',
            actionName: 'إرسال آلي لتذكير WhatsApp مجدول',
            details: `تم إرسال تذكير مالي مجدول في موعده المحدد للطالب ${student.name} (الرصيد: ${bal} ₪)`,
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

      // Update in Firestore
      const nowIso = new Date().toISOString();
      const isRecurring = reminder.repeatInterval && reminder.repeatInterval !== 'once';

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
            studentNames: sentNames.slice(0, 5)
          }
        });
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
            studentNames: sentNames.slice(0, 5)
          }
        });
      }

      setDueReminder(null);
    } catch (err) {
      console.error('Failed to execute due reminder:', err);
    } finally {
      setIsExecutingDue(false);
    }
  };

  const dismissDueReminder = (reminder: ScheduledWhatsAppReminder) => {
    processedRemindersRef.current.add(reminder.id);
    setDueReminder(null);
  };

  return {
    scheduledReminders,
    dueReminder,
    isExecutingDue,
    executeDueReminder,
    dismissDueReminder
  };
}
