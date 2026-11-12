import { collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreUtils';

export interface ActivityLog {
  id?: string;
  timestamp: string; // ISO String
  actionType: string; // e.g. 'UPDATE_RATE', 'DELETE_STUDENT', 'DELETE_TEACHER', 'TOPUP', etc.
  actionName: string; // "تعديل أسعار الساعات" / "حذف طالب نهائياً" / "شحن رصيد" ...
  actor: string; // "زكي أبو علان (المدير)" or teacher/user name
  details: string; // Details in Arabic
  amount?: number; // Optional financial amount
  metadata?: Record<string, any>;
  studentId?: string;
  studentName?: string;
  teacherId?: string;
  teacherName?: string;
  previousValue?: any;
  newValue?: any;
}

export async function logActivity(log: {
  actionType: string;
  actionName?: string;
  details: string;
  actor?: string;
  amount?: number;
  metadata?: Record<string, any>;
  studentId?: string;
  studentName?: string;
  teacherId?: string;
  teacherName?: string;
  previousValue?: any;
  newValue?: any;
}) {
  try {
    const fullLog: ActivityLog = {
      actionType: log.actionType,
      actionName: log.actionName || mapActionTypeToName(log.actionType),
      details: log.details,
      amount: typeof log.amount === 'number' ? log.amount : 0,
      timestamp: new Date().toISOString(),
      actor: log.actor || 'زكي أبو علان (المدير)',
      metadata: log.metadata || {},
      studentId: log.studentId,
      studentName: log.studentName,
      teacherId: log.teacherId,
      teacherName: log.teacherName,
      previousValue: log.previousValue,
      newValue: log.newValue,
    };
    await addDoc(collection(db, 'activityLogs'), fullLog);
    console.log('Activity logged successfully:', log.actionType);
  } catch (error: any) {
    console.error('Error logging activity:', error);
    handleFirestoreError(error, OperationType.CREATE, 'activityLogs');
  }
}

function mapActionTypeToName(type: string): string {
  switch (type) {
    case 'UPDATE_RATE':
    case 'UPDATE_ALL_RATES':
    case 'UPDATE_ALL_RATES_AUTO':
    case 'UPDATE_STUDENT_RATE':
    case 'UPDATE_TEACHER_RATE':
    case 'UPDATE_TEACHER_RATE_QUICK':
    case 'UPDATE_STUDENT_CUSTOM_RATE':
      return 'تعديل أسعار الساعات';
    case 'DELETE_STUDENT':
      return 'حذف طالب نهائياً';
    case 'DELETE_TEACHER':
      return 'حذف معلّم نهائياً';
    case 'TOPUP':
      return 'شحن رصيد';
    case 'BALANCE_ADJUSTMENT':
      return 'تعديل رصيد يدوي';
    case 'UPDATE_CREDIT':
      return 'تعديل دفعة رصيد';
    case 'DELETE_CREDIT':
      return 'حذف دفعة رصيد';
    case 'DELETE_TASK':
      return 'حذف مهمة / حصة';
    case 'UPDATE_TASK':
      return 'تعديل مهمة';
    case 'PAYMENT_CREATE':
      return 'صرف مالي لمعلّم';
    case 'PAYMENT_DELETE':
      return 'حذف دفعة معلم';
    case 'PAYMENT_ARCHIVE':
      return 'أرشفة دفعة مالية';
    case 'UPDATE_SETTINGS':
      return 'تعديل إعدادات النظام';
    case 'ADD_SESSION':
      return 'إضافة حصة دراسية';
    default:
      return type;
  }
}
