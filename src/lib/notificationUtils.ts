import { doc, getDoc, addDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from './firebase';
import { getWhatsAppApiNumber } from './phoneUtils';
import { logActivity } from './activityLogger';

export interface TeacherNotification {
  id?: string;
  teacherId: string;
  teacherName?: string;
  sessionId?: string;
  studentId?: string;
  studentName: string;
  studentGrade?: string;
  studentPhone?: string;
  courseId?: string;
  courseTitle?: string;
  courseCode?: string;
  allocatedHours?: number;
  consumedHours?: number;
  remainingHours?: number;
  parentPhone?: string;
  date?: string;
  type?: 'create' | 'edit' | 'student_placement' | 'student_transfer_in' | 'student_transfer_out' | 'trial_migration' | 'trial_booking' | 'group_course_hours_depleted';
  source?: 'placement' | 'transfer' | 'trial_migration' | 'trial_booking' | 'quick_add' | 'bulk_import' | 'smart_assignment' | 'course_assignment' | 'group_course_depletion';
  title?: string;
  notes?: string;
  subject?: string;
  topic?: string;
  details?: string;
  message?: string;
  assignedAt?: string; // Formatted date and time (e.g. 2026-09-19 14:30)
  assignedBy?: string;
  previousTeacherId?: string;
  previousTeacherName?: string;
  newTeacherId?: string;
  newTeacherName?: string;
  oldDuration?: number;
  newDuration?: number;
  oldNotes?: string;
  newNotes?: string;
  notesChanged?: boolean;
  durationChanged?: boolean;
  oldDate?: string;
  newDate?: string;
  dateChanged?: boolean;
  oldSubject?: string;
  newSubject?: string;
  subjectChanged?: boolean;
  updatedAt: string; // ISO string
  createdAt?: string; // ISO string
  seen: boolean;
}

/**
 * Format standard assignment notification text exactly according to requirements:
 * "تم إسناد طالب جديد إليك"
 * اسم الطالب: [اسم الطالب]
 * المادة: [المادة]
 * الصف: [الصف]
 * تاريخ ووقت الإسناد: [تاريخ ووقت الإسناد]
 * يمكنك الآن متابعة الطالب والاطلاع على ملفه.
 */
export function formatAssignmentNotificationBody(params: {
  studentName: string;
  subject?: string;
  studentGrade?: string;
  assignedAt?: string;
  previousTeacherName?: string;
  isTransfer?: boolean;
}): string {
  const { studentName, subject = 'عام', studentGrade = 'غير محدد', assignedAt, previousTeacherName, isTransfer } = params;
  
  if (isTransfer && previousTeacherName) {
    return `تم إسناد طالب جديد إليك (ترحيل من معلم سابق)
اسم الطالب: ${studentName}
المادة: ${subject}
الصف: ${studentGrade}
المعلم السابق: ${previousTeacherName}
تاريخ ووقت الإسناد: ${assignedAt || new Date().toLocaleString('ar-EG')}
يمكنك الآن متابعة الطالب والاطلاع على ملفه.`;
  }

  return `تم إسناد طالب جديد إليك
اسم الطالب: ${studentName}
المادة: ${subject}
الصف: ${studentGrade}
تاريخ ووقت الإسناد: ${assignedAt || new Date().toLocaleString('ar-EG')}
يمكنك الآن متابعة الطالب والاطلاع على ملفه.`;
}

/**
 * Format student removal / transfer notification text for the previous teacher:
 */
export function formatTransferOutNotificationBody(params: {
  studentName: string;
  subject?: string;
  studentGrade?: string;
  newTeacherName?: string;
  transferredAt?: string;
}): string {
  const { studentName, subject = 'عام', studentGrade = 'غير محدد', newTeacherName = 'معلم آخر', transferredAt } = params;
  return `تم نقل طالب من قائمتك التعليمية
اسم الطالب: ${studentName}
المادة: ${subject}
الصف: ${studentGrade}
تم نقل متابعة الطالب إلى المعلم: ${newTeacherName}
تاريخ ووقت العملية: ${transferredAt || new Date().toLocaleString('ar-EG')}.`;
}

/**
 * Main assignment notification function: Notifies a teacher when a student is assigned or migrated
 */
export async function notifyTeacherOnStudentAssignment(params: {
  teacherId: string;
  teacherName?: string;
  studentId?: string;
  studentName: string;
  studentGrade?: string;
  studentPhone?: string;
  subject?: string;
  topic?: string;
  notes?: string;
  source?: 'placement' | 'transfer' | 'trial_migration' | 'trial_booking' | 'quick_add' | 'bulk_import' | 'smart_assignment' | 'course_assignment';
  title?: string;
  details?: string;
  assignedBy?: string;
  previousTeacherId?: string;
  previousTeacherName?: string;
  logAudit?: boolean;
}) {
  try {
    const { 
      teacherId, 
      teacherName: explicitTeacherName,
      studentId = '', 
      studentName, 
      studentGrade = '', 
      studentPhone = '', 
      subject = 'عام', 
      topic = '', 
      notes = '', 
      source = 'placement', 
      title, 
      details = '',
      assignedBy = 'إدارة الأكاديمية (المدير)',
      previousTeacherId,
      previousTeacherName,
      logAudit = true
    } = params;

    if (!teacherId) return;

    // Resolve teacher name if missing
    let resolvedTeacherName = explicitTeacherName || '';
    if (!resolvedTeacherName) {
      try {
        const tSnap = await getDoc(doc(db, 'teachers', teacherId));
        if (tSnap.exists()) {
          resolvedTeacherName = tSnap.data().name || '';
        }
      } catch (err) {
        console.warn('Could not load teacher name for notification:', err);
      }
    }

    const now = new Date();
    const formattedAssignedAt = `${now.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })} ${now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;

    let computedType: 'student_placement' | 'student_transfer_in' | 'trial_migration' | 'trial_booking' = 'student_placement';
    if (source === 'transfer') {
      computedType = 'student_transfer_in';
    } else if (source === 'trial_migration') {
      computedType = 'trial_migration';
    } else if (source === 'trial_booking') {
      computedType = 'trial_booking';
    }

    const defaultTitle = computedType === 'student_transfer_in' 
      ? 'تم إسناد طالب جديد إليك (ترحيل)' 
      : (source === 'trial_migration' ? 'تم ترحيل طالب من الحصة التجريبية وتنسيبه لحسابك' : 'تم إسناد طالب جديد إليك');

    const formattedBody = formatAssignmentNotificationBody({
      studentName: studentName || 'طالب جديد',
      subject,
      studentGrade,
      assignedAt: formattedAssignedAt,
      previousTeacherName,
      isTransfer: computedType === 'student_transfer_in'
    });

    const notification: Omit<TeacherNotification, 'id'> = {
      teacherId,
      teacherName: resolvedTeacherName,
      studentId,
      studentName: studentName || 'طالب جديد',
      studentGrade,
      studentPhone,
      subject,
      topic,
      notes,
      date: now.toISOString().split('T')[0],
      type: computedType,
      source,
      title: title || defaultTitle,
      details: details || formattedBody,
      message: formattedBody,
      assignedAt: formattedAssignedAt,
      assignedBy,
      previousTeacherId,
      previousTeacherName,
      updatedAt: now.toISOString(),
      createdAt: now.toISOString(),
      seen: false
    };

    const notifRef = await addDoc(collection(db, 'teacherNotifications'), notification);
    console.log(`[TEACHER-NOTIF] Assignment notification #${notifRef.id} sent to teacher ${resolvedTeacherName || teacherId} for student ${studentName}`);

    // Audit Logging
    if (logAudit) {
      try {
        await logActivity({
          actionType: 'STUDENT_ASSIGNMENT',
          actionName: source === 'transfer' ? 'ترحيل وإسناد طالب لمعلم جديد' : (source === 'trial_migration' ? 'ترحيل حصة تجريبية وإسناد طالب' : 'إسناد طالب لمعلم'),
          actor: assignedBy,
          studentId,
          studentName,
          teacherId,
          teacherName: resolvedTeacherName,
          details: `تم إسناد الطالب "${studentName}" (المرحلة/الصف: ${studentGrade || 'غير محدد'}، المادة: ${subject}) إلى المعلم "${resolvedTeacherName || teacherId}" بتاريخ ووقت: ${formattedAssignedAt}.${previousTeacherName ? ` (منقول من المعلم: ${previousTeacherName})` : ''}`,
          newValue: {
            teacherId,
            teacherName: resolvedTeacherName,
            studentGrade,
            subject,
            source
          },
          metadata: {
            source,
            studentGrade,
            subject,
            teacherId,
            teacherName: resolvedTeacherName,
            previousTeacherId,
            previousTeacherName,
            assignedAt: formattedAssignedAt
          }
        });
      } catch (auditErr) {
        console.warn('Audit logging warning during assignment:', auditErr);
      }
    }
  } catch (error) {
    console.error('Error creating teacher assignment notification:', error);
  }
}

/**
 * Backward-compatible wrapper for student placement
 */
export async function notifyTeacherOnStudentPlacement(params: {
  teacherId: string;
  studentId?: string;
  studentName: string;
  studentGrade?: string;
  studentPhone?: string;
  subject?: string;
  topic?: string;
  notes?: string;
  source?: 'placement' | 'trial_migration' | 'trial_booking' | 'quick_add' | 'bulk_import' | 'smart_assignment' | 'course_assignment';
  title?: string;
  details?: string;
  assignedBy?: string;
}) {
  return notifyTeacherOnStudentAssignment(params);
}

/**
 * Handles transferring a student from one teacher to another:
 * 1. Notifies the NEW teacher with the assignment notification.
 * 2. Notifies the PREVIOUS teacher that the student was transferred out of their list.
 * 3. Records an audit log (Audit Log) with actor, student, old teacher, new teacher, and timestamp.
 */
export async function notifyTeachersOnStudentTransfer(params: {
  studentId: string;
  studentName: string;
  studentGrade?: string;
  studentPhone?: string;
  subject?: string;
  oldTeacherId: string;
  oldTeacherName?: string;
  newTeacherId: string;
  newTeacherName?: string;
  notes?: string;
  transferredBy?: string;
}) {
  try {
    const {
      studentId,
      studentName,
      studentGrade = '',
      studentPhone = '',
      subject = 'عام',
      oldTeacherId,
      newTeacherId,
      notes = '',
      transferredBy = 'إدارة الأكاديمية (المدير)'
    } = params;

    if (!newTeacherId || !oldTeacherId) return;

    // Resolve teacher names if not provided
    let resolvedOldTeacherName = params.oldTeacherName || '';
    let resolvedNewTeacherName = params.newTeacherName || '';

    if (!resolvedOldTeacherName && oldTeacherId) {
      try {
        const oldSnap = await getDoc(doc(db, 'teachers', oldTeacherId));
        if (oldSnap.exists()) resolvedOldTeacherName = oldSnap.data().name || '';
      } catch (e) {
        console.warn('Could not fetch old teacher name:', e);
      }
    }

    if (!resolvedNewTeacherName && newTeacherId) {
      try {
        const newSnap = await getDoc(doc(db, 'teachers', newTeacherId));
        if (newSnap.exists()) resolvedNewTeacherName = newSnap.data().name || '';
      } catch (e) {
        console.warn('Could not fetch new teacher name:', e);
      }
    }

    const now = new Date();
    const formattedTimestamp = `${now.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })} ${now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;

    // 1. Notify NEW teacher (Assignment notification)
    await notifyTeacherOnStudentAssignment({
      teacherId: newTeacherId,
      teacherName: resolvedNewTeacherName,
      studentId,
      studentName,
      studentGrade,
      studentPhone,
      subject,
      notes,
      source: 'transfer',
      title: 'تم إسناد طالب جديد إليك (منقول)',
      assignedBy: transferredBy,
      previousTeacherId: oldTeacherId,
      previousTeacherName: resolvedOldTeacherName,
      logAudit: false // We will write a comprehensive transfer audit log below
    });

    // 2. Notify OLD teacher (Transfer-out notification)
    const transferOutBody = formatTransferOutNotificationBody({
      studentName,
      subject,
      studentGrade,
      newTeacherName: resolvedNewTeacherName,
      transferredAt: formattedTimestamp
    });

    const oldTeacherNotification: Omit<TeacherNotification, 'id'> = {
      teacherId: oldTeacherId,
      teacherName: resolvedOldTeacherName,
      studentId,
      studentName,
      studentGrade,
      studentPhone,
      subject,
      notes,
      date: now.toISOString().split('T')[0],
      type: 'student_transfer_out',
      source: 'transfer',
      title: 'تم نقل طالب من قائمتك التعليمية',
      details: transferOutBody,
      message: transferOutBody,
      assignedAt: formattedTimestamp,
      assignedBy: transferredBy,
      newTeacherId,
      newTeacherName: resolvedNewTeacherName,
      updatedAt: now.toISOString(),
      createdAt: now.toISOString(),
      seen: false
    };

    await addDoc(collection(db, 'teacherNotifications'), oldTeacherNotification);
    console.log(`[TEACHER-NOTIF] Transfer-out notification sent to previous teacher ${resolvedOldTeacherName || oldTeacherId} regarding student ${studentName}`);

    // 3. Record Audit Log for Transfer
    try {
      await logActivity({
        actionType: 'STUDENT_TRANSFER',
        actionName: 'نقل طالب بين المعلمين',
        actor: transferredBy,
        studentId,
        studentName,
        details: `تم ترحيل ونقل الطالب "${studentName}" (الصف: ${studentGrade || 'غير محدد'}، المادة: ${subject}) من المعلم "${resolvedOldTeacherName || oldTeacherId}" إلى المعلم "${resolvedNewTeacherName || newTeacherId}" بنجاح بتاريخ ووقت: ${formattedTimestamp}.`,
        previousValue: {
          teacherId: oldTeacherId,
          teacherName: resolvedOldTeacherName
        },
        newValue: {
          teacherId: newTeacherId,
          teacherName: resolvedNewTeacherName,
          studentGrade,
          subject
        },
        metadata: {
          oldTeacherId,
          oldTeacherName: resolvedOldTeacherName,
          newTeacherId,
          newTeacherName: resolvedNewTeacherName,
          studentGrade,
          subject,
          transferredAt: formattedTimestamp,
          notes
        }
      });
    } catch (auditErr) {
      console.warn('Audit logging warning during transfer:', auditErr);
    }
  } catch (error) {
    console.error('Error handling student transfer notifications:', error);
  }
}

export async function notifyTeacherOnSessionCreate(
  sessionId: string,
  sessionData: any
) {
  try {
    const { teacherId, studentId, date, durationHours, subject, topic, notes } = sessionData;
    if (!teacherId) return;

    // Get student's name
    let studentName = 'طالب';
    if (studentId) {
      const studentDoc = await getDoc(doc(db, 'students', studentId));
      if (studentDoc.exists()) {
        studentName = studentDoc.data().name || 'طالب';
      }
    }

    const notification: Omit<TeacherNotification, 'id'> = {
      teacherId,
      sessionId: sessionId || '',
      studentName,
      date: date || '',
      type: 'create',
      newDuration: Number(durationHours || 0),
      newNotes: topic || notes || '',
      newSubject: subject || 'عام',
      updatedAt: new Date().toISOString(),
      seen: false
    };

    await addDoc(collection(db, 'teacherNotifications'), notification);
    console.log('Instant teacher notification triggered for session creation:', sessionId);
  } catch (error) {
    console.error('Error creating teacher notification for session creation:', error);
  }
}

export async function notifyTeacherOnSessionChange(
  sessionId: string,
  oldSessionData: any | null,
  newValues: { durationHours?: number; notes?: string; [key: string]: any }
) {
  try {
    let oldSession = oldSessionData;
    
    // If oldSessionData is not provided, fetch it from Firestore
    if (!oldSession) {
      const sessionDoc = await getDoc(doc(db, 'sessions', sessionId));
      if (sessionDoc.exists()) {
        oldSession = { id: sessionDoc.id, ...sessionDoc.data() };
      }
    }
    
    if (!oldSession) {
      console.warn(`Could not find session ${sessionId} to generate notification.`);
      return;
    }
    
    // Support both topic and notes fields since they represent notes in different sessions
    const oldNotes = oldSession.topic || oldSession.notes || '';
    const newNotes = newValues.topic !== undefined 
      ? (newValues.topic || '') 
      : (newValues.notes !== undefined ? (newValues.notes || '') : oldNotes);
    
    const oldDuration = Number(oldSession.durationHours || 0);
    const newDuration = newValues.durationHours !== undefined ? Number(newValues.durationHours || 0) : oldDuration;
    
    const oldDate = oldSession.date || '';
    const newDate = newValues.date !== undefined ? (newValues.date || '') : oldDate;

    const oldSubject = oldSession.subject || 'عام';
    const newSubject = newValues.subject !== undefined ? (newValues.subject || 'عام') : oldSubject;

    const notesChanged = oldNotes.trim() !== newNotes.trim();
    const durationChanged = oldDuration !== newDuration;
    const dateChanged = oldDate !== newDate;
    const subjectChanged = oldSubject !== newSubject;
    
    // Only notify if notes, duration, date, or subject changed
    if (!notesChanged && !durationChanged && !dateChanged && !subjectChanged) {
      return;
    }
    
    const teacherId = oldSession.teacherId;
    if (!teacherId) return;
    
    // Get student's name
    let studentName = 'طالب';
    if (oldSession.studentId) {
      const studentDoc = await getDoc(doc(db, 'students', oldSession.studentId));
      if (studentDoc.exists()) {
        studentName = studentDoc.data().name || 'طالب';
      }
    }
    
    // Create notification
    const notification: Omit<TeacherNotification, 'id'> = {
      teacherId,
      sessionId,
      studentName,
      date: oldSession.date || '',
      type: 'edit',
      oldDuration,
      newDuration,
      oldNotes,
      newNotes,
      notesChanged,
      durationChanged,
      oldDate,
      newDate,
      dateChanged,
      oldSubject,
      newSubject,
      subjectChanged,
      updatedAt: new Date().toISOString(),
      seen: false
    };
    
    await addDoc(collection(db, 'teacherNotifications'), notification);
    console.log('Instant teacher notification triggered for session:', sessionId);
  } catch (error) {
    console.error('Error creating teacher notification:', error);
  }
}

/**
 * Generates an official courteous WhatsApp link for teachers to contact parents
 * when a student in a group course is close to consuming all allocated course hours.
 */
export function generateParentGroupCourseDepletionWhatsAppUrl(params: {
  teacherName?: string;
  studentName: string;
  courseTitle: string;
  remainingHours: number;
  allocatedHours?: number;
  consumedHours?: number;
  phone?: string;
}): string {
  const {
    teacherName = 'المعلم',
    studentName,
    courseTitle,
    remainingHours,
    allocatedHours,
    consumedHours,
    phone = ''
  } = params;

  const cleanPhone = getWhatsAppApiNumber(phone);
  if (!cleanPhone) return '';

  const hoursStatusText = remainingHours <= 0
    ? '🚨 *0 ساعات متبقية (اكتملت باقة الساعات المخصصة له بالكامل)*'
    : remainingHours === 1
    ? '⚠️ *ساعة واحدة فقط (1 س متبقية)*'
    : `⏳ *${remainingHours} ساعات فقط متبقية*`;

  const hoursBreakdownText = (allocatedHours && consumedHours !== undefined)
    ? `\n📊 *تفاصيل الاستهلاك:* تم استهلاك ${consumedHours} من أصل ${allocatedHours} ساعة معتمدة.`
    : '';

  const messageText = `السلام عليكم ورحمة الله وبركاته،
تحية طيبة مباركة من أستاذ ${teacherName} - أكاديمية التفوق أون لاين 🌟

نود إحاطتكم علماً بأن الطالب/ة العزيز/ة: *${studentName}*
في الدورة الجماعية: *${courseTitle}*
قد قارب على استهلاك كامل الساعات المخصصة له في هذه الدورة:
${hoursStatusText}${hoursBreakdownText}

حرصاً على استمرار مسيرته التعليمية وتفوقه دون أي انقطاع في حضور الحصص، نرجو التكرم بالتنسيق المبكر مع إدارة الأكاديمية لتجديد الاشتراك وتعبئة رصيد الساعات.

شاكرين ومقدرين كريم ثقتكم وحرصكم الدائم ✨`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;
}

/**
 * Triggers an instant notification in the teacher's notification center
 * when a student is close to consuming all hours in their group course.
 * Automatically checks for recent duplicates to prevent redundant notifications.
 */
export async function notifyTeacherOnGroupCourseHoursDepletion(params: {
  teacherId: string;
  studentId: string;
  studentName: string;
  studentGrade?: string;
  studentPhone?: string;
  courseId: string;
  courseTitle: string;
  courseCode?: string;
  allocatedHours: number;
  consumedHours: number;
  remainingHours: number;
}) {
  try {
    const {
      teacherId,
      studentId,
      studentName,
      studentGrade = '',
      studentPhone = '',
      courseId,
      courseTitle,
      courseCode = '',
      allocatedHours,
      consumedHours,
      remainingHours
    } = params;

    if (!teacherId || !studentId || !courseId) return;

    // Deduplication check: Check if an active unseen notification already exists for this teacher, student, course and similar remaining hours
    try {
      const q = query(
        collection(db, 'teacherNotifications'),
        where('teacherId', '==', teacherId),
        where('studentId', '==', studentId),
        where('type', '==', 'group_course_hours_depleted'),
        limit(5)
      );
      const snap = await getDocs(q);
      const duplicate = snap.docs.find(d => {
        const data = d.data();
        return data.courseId === courseId && Math.abs((data.remainingHours ?? 99) - remainingHours) < 0.5;
      });
      if (duplicate) {
        console.log(`[TEACHER-NOTIF] Notification already exists for teacher ${teacherId}, student ${studentName}, course ${courseTitle}`);
        return duplicate.id;
      }
    } catch (checkErr) {
      console.warn('Deduplication check failed, proceeding to insert:', checkErr);
    }

    const remainingText = remainingHours <= 0
      ? 'استهلك كامل الساعات المخصصة (0 ساعات متبقية)'
      : remainingHours === 1
      ? 'متبقي له ساعة واحدة فقط (1 س)'
      : `متبقي له ${remainingHours} ساعات فقط`;

    const title = remainingHours <= 0
      ? `🚨 نفاذ كامل ساعات الدورة الجماعية للطالب: ${studentName}`
      : `⏳ اقتراب استهلاك ساعات الدورة الجماعية للطالب: ${studentName}`;

    const details = `اقترب الطالب ${studentName} من استهلاك كامل ساعات دورته الجماعية [${courseTitle}]: حيث استهلك ${consumedHours} من أصل ${allocatedHours} ساعة (${remainingText}). يرجى التواصل المبكر مع ولي الأمر لضمان تجديد الساعات واستمرار الحضور.`;

    const notification: Omit<TeacherNotification, 'id'> = {
      teacherId,
      studentId,
      studentName,
      studentGrade,
      studentPhone,
      courseId,
      courseTitle,
      courseCode,
      allocatedHours,
      consumedHours,
      remainingHours,
      parentPhone: studentPhone,
      date: new Date().toISOString().split('T')[0],
      type: 'group_course_hours_depleted',
      source: 'group_course_depletion',
      title,
      details,
      subject: courseTitle,
      notes: details,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      seen: false
    };

    const docRef = await addDoc(collection(db, 'teacherNotifications'), notification);
    console.log(`[TEACHER-NOTIF] Group course depletion alert created for teacher: ${teacherId}, student: ${studentName}, notificationId: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('Error creating group course depletion notification:', error);
  }
}

