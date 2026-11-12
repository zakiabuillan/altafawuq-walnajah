import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { db } from './firebase';
import { ScheduledWhatsAppReminder, Student } from '../types';
import { logActivity } from './activityLogger';
import { handleFirestoreError, OperationType } from './firestoreUtils';

export const DEFAULT_SCHEDULED_WHATSAPP_TEMPLATE = 
  'السلام عليكم ورحمة الله وبركاته، تحية طيبة من إدارة {ACADEMY}.\n\nنود إبلاغكم بأن الرصيد المالي الحالي المتوفر في محفظة الطالب/ة ({NAME}) هو ({BALANCE} ₪) (ما يعادل {LESSONS_COUNT} حصة دراسية).\n\nارجو التواصل مع إدارة المنصة لتجديد الحزمة \n\nشاكرين ثقتكم الدائمة بأكاديميتنا ونتمنى لـ ({NAME}) دوام التفوق والنجاح 🌸';

export const SCHEDULED_TEMPLATE_PRESETS = [
  {
    id: 'standard_low_balance',
    title: 'تجديد الحزمة واقتراب نفاذ الرصيد (الرسمي المعتمد) 🌸',
    desc: 'الصيغة الرسمية المعتمدة لإشعار أولياء أمور الطلاب المنخفض رصيدهم أو مقترب على النفاذ لتجديد الحزمة.',
    badge: 'معتمد رسمي',
    template: 'السلام عليكم ورحمة الله وبركاته، تحية طيبة من إدارة {ACADEMY}.\n\nنود إبلاغكم بأن الرصيد المالي الحالي المتوفر في محفظة الطالب/ة ({NAME}) هو ({BALANCE} ₪) (ما يعادل {LESSONS_COUNT} حصة دراسية).\n\nارجو التواصل مع إدارة المنصة لتجديد الحزمة \n\nشاكرين ثقتكم الدائمة بأكاديميتنا ونتمنى لـ ({NAME}) دوام التفوق والنجاح 🌸'
  },
  {
    id: 'negative_urgent',
    title: 'سداد الذمم المستحقة (أرصدة سالبة) 🚨',
    desc: 'صيغة مهذبة ورسمية للمطالبة بسداد الرصيد المكشوف.',
    badge: 'مستعجل',
    template: 'تحية طيبة من إدارة {ACADEMY}، نود إعلامكم بأن حساب الطالب/ة ({NAME}) مسجل حالياً برصيد مكشوف قدره ({BALANCE} ₪) والمبلغ المطلوب سداده هو ({DEBT_AMOUNT} ₪).\nيرجى التكرم بتسوية وسداد الرصيد المستحق في أقرب وقت لتفادي تعليق الحصص القادمة. نقدر دوماً تعاونكم المثمر. 💳✨'
  },
  {
    id: 'month_end_settlement',
    title: 'تسوية حساب نهاية الشهر 🗓️',
    desc: 'مخصصة للمطالبات الدورية والتسويات المالية الشهرية.',
    badge: 'شهري',
    template: 'السلام عليكم ورحمة الله وبركاته، مع اقتراب نهاية الدورة المالية للشهر الحالي في {ACADEMY}، نرجو التكرم بمراجعة الحساب المالي للطالب/ة ({NAME}) حيث يبلغ الرصيد الحالي ({BALANCE} ₪).\nنأمل تسوية الحساب وشحن الرصيد لاستكمال الخطة الدراسية بنجاح. دمتم بود وتفوق. 🌟'
  },
  {
    id: 'friendly_reminder',
    title: 'تذكير ودي ولطيف 🌸',
    desc: 'أسلوب تشجيعي ومرن للأرصدة المقاربة للصفر.',
    badge: 'ودي',
    template: 'أهلاً بكم من {ACADEMY} 🌸 نتمنى للطالب/ة ({NAME}) دوام التقدم والنجاح! نود التذكير بلطف بأن رصيد الحصص قارب على الانتهاء (الرصيد: {BALANCE} ₪).\nيمكنكم الشحن في أي وقت يناسبكم لمواصلة التميز والتفوق الدراسي معنا. 🚀'
  }
];

/**
 * Replace tokens in template with student-specific values
 * Supports variables like {studentName}, {balance}, {debtAmount}, {threshold}, {academyName}, {date}, {lessonsCount}, etc.
 */
export function formatScheduledWhatsAppMessage(
  student: Student,
  templateText: string,
  balance: number,
  threshold: number = -100,
  academyName: string = 'أكاديمية التفوق أون لاين'
): string {
  const debt = balance < 0 ? Math.abs(balance) : 0;
  const cleanPhone = (student.phone || student.phoneNumber || student.contact || '').replace(/[\s\-\+]/g, '');
  const dateStr = new Date().toLocaleDateString('ar-EG');
  const hourlyRate = student.hourlyRate || 60;
  const lessonsCount = balance > 0 ? Math.max(1, Math.round(balance / hourlyRate)) : 0;

  return (templateText || DEFAULT_SCHEDULED_WHATSAPP_TEMPLATE)
    // Student Name variables
    .replace(/{(?:studentName|student_name|name|NAME|اسم_الطالب)}/gi, student.name || 'عزيزنا الطالب')
    // Balance variables
    .replace(/{(?:balance|BALANCE|الرصيد)}/gi, String(Math.round(balance)))
    // Lessons count variables
    .replace(/{(?:lessonsCount|lessons_count|LESSONS_COUNT|lessons|LESSONS|عدد_الحصص|حصص)}/gi, String(lessonsCount))
    // Safety Threshold variables
    .replace(/{(?:threshold|THRESHOLD|حد_الأمان|حد_الائتمان)}/gi, String(threshold))
    // Debt Amount variables
    .replace(/{(?:debtAmount|debt_amount|DEBT_AMOUNT|مبلغ_الذمة|المبلغ_المستحق)}/gi, String(debt))
    // Academy Name variables
    .replace(/{(?:academyName|academy_name|ACADEMY_NAME|academy|ACADEMY|اسم_الأكاديمية|الأكاديمية)}/gi, academyName)
    // Phone variables
    .replace(/{(?:phone|PHONE|رقم_الهاتف)}/gi, cleanPhone)
    // Date variables
    .replace(/{(?:date|DATE|التاريخ)}/gi, dateStr);
}

/**
 * Format helper for quick schedule time shortcuts
 */
export function getScheduleShortcut(
  type: 'in_1_hour' | 'in_2_hours' | 'tomorrow_morning' | 'tomorrow_evening' | 'in_3_days' | 'next_week'
): { date: string; time: string; iso: string; label: string } {
  const now = new Date();
  const target = new Date(now);

  if (type === 'in_1_hour') {
    target.setHours(target.getHours() + 1);
    target.setMinutes(0, 0, 0);
  } else if (type === 'in_2_hours') {
    target.setHours(target.getHours() + 2);
    target.setMinutes(0, 0, 0);
  } else if (type === 'tomorrow_morning') {
    target.setDate(target.getDate() + 1);
    target.setHours(10, 0, 0, 0);
  } else if (type === 'tomorrow_evening') {
    target.setDate(target.getDate() + 1);
    target.setHours(17, 0, 0, 0);
  } else if (type === 'in_3_days') {
    target.setDate(target.getDate() + 3);
    target.setHours(11, 0, 0, 0);
  } else if (type === 'next_week') {
    target.setDate(target.getDate() + 7);
    target.setHours(10, 0, 0, 0);
  }

  const yyyy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, '0');
  const dd = String(target.getDate()).padStart(2, '0');
  const hh = String(target.getHours()).padStart(2, '0');
  const min = String(target.getMinutes()).padStart(2, '0');

  const date = `${yyyy}-${mm}-${dd}`;
  const time = `${hh}:${min}`;
  const iso = `${date}T${time}:00`;

  let label = '';
  switch (type) {
    case 'in_1_hour': label = 'بعد ساعة واحدة ⏱️'; break;
    case 'in_2_hours': label = 'بعد ساعتين ⏳'; break;
    case 'tomorrow_morning': label = 'غداً 10:00 صباحاً 🌅'; break;
    case 'tomorrow_evening': label = 'غداً 05:00 مساءً 🌇'; break;
    case 'in_3_days': label = 'بعد 3 أيام 📅'; break;
    case 'next_week': label = 'بعد أسبوع 🗓️'; break;
  }

  return { date, time, iso, label };
}

/**
 * Format relative remaining time until scheduled execution
 */
export function formatArabicRemainingTime(scheduledAt: string): { text: string; isPast: boolean; isDueNow: boolean } {
  if (!scheduledAt) return { text: 'غير محدد', isPast: false, isDueNow: false };

  const target = new Date(scheduledAt);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  if (diffMinutes <= 0 && diffMinutes >= -15) {
    return { text: 'حان موعد الإرسال الآن 🔔', isPast: true, isDueNow: true };
  }

  if (diffMinutes < -15) {
    const pastHours = Math.floor(Math.abs(diffMinutes) / 60);
    const pastDays = Math.floor(pastHours / 24);
    if (pastDays > 0) {
      return { text: `فات الموعد منذ ${pastDays} ${pastDays === 1 ? 'يوم' : 'أيام'}`, isPast: true, isDueNow: false };
    }
    if (pastHours > 0) {
      return { text: `فات الموعد منذ ${pastHours} ساعة`, isPast: true, isDueNow: false };
    }
    return { text: `فات الموعد منذ ${Math.abs(diffMinutes)} دقيقة`, isPast: true, isDueNow: false };
  }

  // Future
  if (diffMinutes < 60) {
    return { text: `متبقي ${diffMinutes} دقيقة ⏳`, isPast: false, isDueNow: false };
  }

  const hours = Math.floor(diffMinutes / 60);
  const remainMins = diffMinutes % 60;
  if (hours < 24) {
    return { 
      text: remainMins > 0 ? `متبقي ${hours} ساعة و${remainMins} دقيقة ⏱️` : `متبقي ${hours} ساعة ⏱️`, 
      isPast: false, 
      isDueNow: false 
    };
  }

  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return { 
    text: remainHours > 0 ? `متبقي ${days} يوم و${remainHours} ساعة 📅` : `متبقي ${days} ${days === 1 ? 'يوم' : 'أيام'} 📅`, 
    isPast: false, 
    isDueNow: false 
  };
}

/**
 * Subscribe to Scheduled WhatsApp Reminders from Firestore
 */
export function subscribeToScheduledReminders(
  callback: (reminders: ScheduledWhatsAppReminder[]) => void
): () => void {
  try {
    const q = query(
      collection(db, 'scheduledWhatsAppReminders'),
      orderBy('scheduledAt', 'asc')
    );
    return onSnapshot(
      q,
      (snapshot) => {
        const list: ScheduledWhatsAppReminder[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as any) });
        });
        callback(list);
      },
      (error) => {
        console.error('Error in scheduled reminders snapshot:', error);
        handleFirestoreError(error, OperationType.LIST, 'scheduledWhatsAppReminders');
      }
    );
  } catch (err) {
    console.error('Failed to subscribe to scheduled reminders:', err);
    return () => {};
  }
}

/**
 * Save or update a scheduled reminder in Firestore
 */
export async function saveScheduledReminder(
  reminder: Partial<ScheduledWhatsAppReminder> & { title: string; scheduledAt: string }
): Promise<string> {
  try {
    const id = reminder.id || `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const docRef = doc(db, 'scheduledWhatsAppReminders', id);

    const data: ScheduledWhatsAppReminder = {
      id,
      title: reminder.title.trim(),
      scheduledDate: reminder.scheduledDate || reminder.scheduledAt.split('T')[0],
      scheduledTime: reminder.scheduledTime || reminder.scheduledAt.split('T')[1]?.substring(0, 5) || '10:00',
      scheduledAt: reminder.scheduledAt,
      targetMode: reminder.targetMode || 'negative',
      selectedStudentIds: reminder.selectedStudentIds || [],
      messageTemplate: reminder.messageTemplate || DEFAULT_SCHEDULED_WHATSAPP_TEMPLATE,
      repeatInterval: reminder.repeatInterval || 'once',
      autoSend: reminder.autoSend ?? true,
      status: reminder.status || 'pending',
      createdAt: reminder.createdAt || new Date().toISOString(),
      createdBy: reminder.createdBy || 'المدير المنسق',
      executedAt: reminder.executedAt || '',
      recipientsCount: reminder.recipientsCount || 0,
      lastRunDetails: reminder.lastRunDetails || undefined
    };

    await setDoc(docRef, data, { merge: true });

    await logActivity({
      actionType: reminder.id ? 'UPDATE_SCHEDULED_REMINDER' : 'CREATE_SCHEDULED_REMINDER',
      actionName: reminder.id ? 'تعديل موعد تذكير WhatsApp المجدول' : 'جدولة تذكير WhatsApp جديد للأرصدة',
      details: `تمت جدولة تذكير WhatsApp بعنوان "${data.title}" لموعد: ${data.scheduledDate} الساعة ${data.scheduledTime} (نوع الاستهداف: ${data.targetMode === 'negative' ? 'أرصدة سالبة' : data.targetMode === 'critical' ? 'دون حد الأمان' : 'مخصص'})`
    });

    return id;
  } catch (error: any) {
    console.error('Error saving scheduled reminder:', error);
    handleFirestoreError(error, OperationType.CREATE, 'scheduledWhatsAppReminders');
    throw error;
  }
}

/**
 * Cancel a scheduled reminder
 */
export async function cancelScheduledReminder(id: string, title?: string): Promise<void> {
  try {
    const docRef = doc(db, 'scheduledWhatsAppReminders', id);
    await updateDoc(docRef, {
      status: 'cancelled',
      updatedAt: new Date().toISOString()
    });

    await logActivity({
      actionType: 'CANCEL_SCHEDULED_REMINDER',
      actionName: 'إلغاء تذكير WhatsApp المجدول',
      details: `تم إلغاء التذكير المجدول "${title || id}" من قبل الإدارة.`
    });
  } catch (error: any) {
    console.error('Error cancelling scheduled reminder:', error);
    handleFirestoreError(error, OperationType.UPDATE, 'scheduledWhatsAppReminders');
    throw error;
  }
}

/**
 * Delete a scheduled reminder record
 */
export async function deleteScheduledReminder(id: string, title?: string): Promise<void> {
  try {
    const docRef = doc(db, 'scheduledWhatsAppReminders', id);
    await deleteDoc(docRef);

    await logActivity({
      actionType: 'DELETE_SCHEDULED_REMINDER',
      actionName: 'حذف تذكير WhatsApp المجدول',
      details: `تم حذف سجل التذكير المجدول "${title || id}".`
    });
  } catch (error: any) {
    console.error('Error deleting scheduled reminder:', error);
    handleFirestoreError(error, OperationType.DELETE, 'scheduledWhatsAppReminders');
    throw error;
  }
}

/**
 * Compute the next occurrence for recurring reminders
 */
export function computeNextOccurrence(currentScheduledAt: string, interval: 'daily' | 'weekly' | 'monthly'): string {
  const date = new Date(currentScheduledAt);
  if (interval === 'daily') {
    date.setDate(date.getDate() + 1);
  } else if (interval === 'weekly') {
    date.setDate(date.getDate() + 7);
  } else if (interval === 'monthly') {
    date.setMonth(date.getMonth() + 1);
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}T${hh}:${min}:00`;
}
