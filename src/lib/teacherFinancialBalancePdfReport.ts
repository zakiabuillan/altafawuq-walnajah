import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Session, Student, Teacher, GroupCourse, Payment, formatCustomDate, isTrialSession } from '../types';

export interface TeacherBalanceReportData {
  teacher: Teacher;
  mode: 'month' | 'range' | 'all';
  year?: number;
  month?: number; // 1 - 12
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  sessions: Session[];
  students: Student[];
  payments: Payment[];
  assignments?: any[];
  groupCourses?: GroupCourse[];
  studentFilter?: string; // 'all' or studentId
  statusFilter?: 'all' | 'approved' | 'pending';
  academyName?: string;
  managerName?: string;
}

export interface StudentOperationDetail {
  id: string;
  date: string;
  startTime: string;
  subject: string;
  topic: string;
  durationHours: number;
  hourlyOrSessionRate: number;
  payout: number;
  approved: boolean;
  notes: string;
}

export interface StudentBalanceSummary {
  studentId: string;
  studentName: string;
  gradeOrLevel: string;
  phone?: string;
  sessionsCount: number;
  totalHours: number;
  totalEarnings: number;
  subjects: string[];
  lastSessionDate: string;
  operations: StudentOperationDetail[];
}

export interface ComputedTeacherBalanceSummary {
  mode: 'month' | 'range' | 'all';
  periodLabelArabic: string;
  startDateStr: string;
  endDateStr: string;
  generatedAt: string;
  teacher: Teacher;
  academyName: string;
  managerName: string;

  // Opening & Prior Balances
  openingBalance: number;
  priorEarnedApproved: number;
  priorPaid: number;

  // Current Period
  totalSessions: number;
  totalHours: number;
  approvedSessionsCount: number;
  pendingSessionsCount: number;
  approvedHours: number;
  pendingHours: number;

  periodEarnedApproved: number;
  periodEarnedPending: number;
  periodEarnedTotal: number;
  periodPaid: number;

  // Net Balance at End of Period
  closingBalance: number; // openingBalance + periodEarnedApproved - periodPaid

  // Breakdowns
  uniqueStudentsCount: number;
  studentSummaries: StudentBalanceSummary[];
  sessionsList: Array<{
    id: string;
    date: string;
    startTime: string;
    studentId: string;
    studentName: string;
    isGroup: boolean;
    subject: string;
    topic: string;
    durationHours: number;
    hourlyOrSessionRate: number;
    payout: number;
    approved: boolean;
    notes: string;
  }>;
  paymentsList: Array<{
    id: string;
    date: string;
    amount: number;
    note: string;
    reference: string;
  }>;
}

export const ARABIC_MONTHS = [
  'يناير (1)', 'فبراير (2)', 'مارس (3)', 'أبريل (4)', 'مايو (5)', 'يونيو (6)',
  'يوليو (7)', 'أغسطس (8)', 'سبتمبر (9)', 'أكتوبر (10)', 'نوفمبر (11)', 'ديسمبر (12)'
];

/**
 * Computes teacher's session payout for a single session
 */
export function calculateTeacherSessionPayout(
  session: Session,
  teacher: Teacher,
  assignments: any[] = []
): { rate: number; payout: number } {
  if (isTrialSession(session)) {
    return { rate: 0, payout: 0 };
  }

  const baseTeacherRate = teacher.payoutRate || teacher.hourlyRate || 35;
  const assignment = assignments.find(
    a => a.studentId === session.studentId && a.teacherId === teacher.id
  );
  const effectiveRate =
    assignment && assignment.teacherPayoutRate !== undefined && assignment.teacherPayoutRate > 0
      ? assignment.teacherPayoutRate
      : baseTeacherRate;

  if (session.customTeacherFee !== undefined && session.customTeacherFee !== null) {
    return { rate: effectiveRate, payout: Number(session.customTeacherFee) };
  }
  if (session.customPayout !== undefined && session.customPayout !== null) {
    return { rate: effectiveRate, payout: Number(session.customPayout) };
  }

  const duration = Number(session.durationHours) || 0;
  const payout = Number((duration * effectiveRate).toFixed(2));
  return { rate: effectiveRate, payout };
}

/**
 * Computes teacher balance statement for a month, custom date range, or all-time
 */
export function computeTeacherBalanceSummary(data: TeacherBalanceReportData): ComputedTeacherBalanceSummary {
  const {
    teacher,
    mode = 'month',
    year = new Date().getFullYear(),
    month = new Date().getMonth() + 1,
    startDate,
    endDate,
    sessions = [],
    students = [],
    payments = [],
    assignments = [],
    groupCourses = [],
    studentFilter = 'all',
    statusFilter = 'all',
    academyName = 'أكاديمية التفوق أون لاين للتعليم والتدريب والاستشارات',
    managerName = 'أ. زكي أبو علان (المدير العام)'
  } = data;

  let startDateStr = '';
  let endDateStr = '';
  let periodLabelArabic = '';

  if (mode === 'month') {
    const monthStr = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    startDateStr = `${year}-${monthStr}-01`;
    endDateStr = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
    const monthName = ARABIC_MONTHS[month - 1] || `شهر ${month}`;
    periodLabelArabic = `شهر ${monthName} لسنة ${year}`;
  } else if (mode === 'range') {
    let s = startDate || '2000-01-01';
    let e = endDate || '2099-12-31';
    if (s > e) {
      const tmp = s;
      s = e;
      e = tmp;
    }
    startDateStr = s;
    endDateStr = e;
    periodLabelArabic = `الفترة من ${formatCustomDate(startDateStr)} إلى ${formatCustomDate(endDateStr)}`;
  } else {
    // all time
    startDateStr = '2000-01-01';
    endDateStr = '2099-12-31';
    periodLabelArabic = 'كشف حساب شامل لكافة العمليات والحصص حتى تاريخه';
  }

  // 1. Calculate Prior/Opening Balance before startDateStr
  const priorSessions = sessions.filter(s => {
    if (s.teacherId !== teacher.id) return false;
    const sDate = s.date || '';
    if (!sDate) return false;
    return sDate < startDateStr;
  });

  const priorEarnedApproved = priorSessions.reduce((sum, s) => {
    if (s.approved === false) return sum;
    const { payout } = calculateTeacherSessionPayout(s, teacher, assignments);
    return sum + payout;
  }, 0);

  const priorPayments = payments.filter(p => {
    if (p.teacherId !== teacher.id) return false;
    const pDate = p.date || '';
    if (!pDate) return false;
    return pDate < startDateStr;
  });

  const priorPaid = priorPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const openingBalance = Number((priorEarnedApproved - priorPaid).toFixed(2));

  // 2. Filter Period Sessions
  const periodSessions = sessions.filter(s => {
    if (s.teacherId !== teacher.id) return false;
    const sDate = s.date || '';
    if (!sDate) return false;
    if (sDate < startDateStr || sDate > endDateStr) return false;

    if (studentFilter !== 'all' && s.studentId !== studentFilter) {
      return false;
    }

    if (statusFilter === 'approved' && s.approved === false) {
      return false;
    }

    if (statusFilter === 'pending' && s.approved !== false) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    const dA = a.date || '';
    const dB = b.date || '';
    if (dA !== dB) return dA.localeCompare(dB);
    return (a.startTime || '').localeCompare(b.startTime || '');
  });

  let totalSessions = 0;
  let totalHours = 0;
  let approvedSessionsCount = 0;
  let pendingSessionsCount = 0;
  let approvedHours = 0;
  let pendingHours = 0;
  let periodEarnedApproved = 0;
  let periodEarnedPending = 0;

  const studentMap = new Map<string, {
    studentId: string;
    studentName: string;
    gradeOrLevel: string;
    phone?: string;
    sessionsCount: number;
    totalHours: number;
    totalEarnings: number;
    subjects: Set<string>;
    dates: string[];
  }>();

  const sessionsList = periodSessions.map(s => {
    const student = students.find(st => st.id === s.studentId);
    let studentName = student?.name || 'طالب مسجل';
    if (s.isGroupSession) {
      const course = groupCourses.find(c => c.id === s.groupCourseId || c.id === s.groupId);
      studentName = course ? `${course.title || course.name} (دورة جماعية)` : (s.studentName || 'دورة جماعية');
    }

    const duration = Number(s.durationHours) || 1;
    const isApproved = s.approved !== false;
    const sub = s.subject || (s.isGroupSession ? 'دورة جماعية' : 'مادة تعليمية عامة');
    const { rate, payout } = calculateTeacherSessionPayout(s, teacher, assignments);

    totalSessions += 1;
    totalHours += duration;

    if (isApproved) {
      approvedSessionsCount += 1;
      approvedHours += duration;
      periodEarnedApproved += payout;
    } else {
      pendingSessionsCount += 1;
      pendingHours += duration;
      periodEarnedPending += payout;
    }

    const key = s.studentId || `group_${s.groupCourseId || s.groupId || 'generic'}`;
    if (!studentMap.has(key)) {
      studentMap.set(key, {
        studentId: s.studentId || '',
        studentName,
        gradeOrLevel: student?.academicLevel || student?.grade || (s.isGroupSession ? 'دورة تدريبية' : 'مرحلة دراسية'),
        phone: student?.phone || '',
        sessionsCount: 0,
        totalHours: 0,
        totalEarnings: 0,
        subjects: new Set<string>(),
        dates: [],
        operations: []
      });
    }

    const stEntry = studentMap.get(key)!;
    stEntry.sessionsCount += 1;
    stEntry.totalHours += duration;
    if (isApproved) {
      stEntry.totalEarnings += payout;
    }
    stEntry.subjects.add(sub);
    if (s.date) stEntry.dates.push(s.date);

    const opDetail: StudentOperationDetail = {
      id: s.id,
      date: s.date || '',
      startTime: s.startTime || '',
      subject: sub,
      topic: s.topic || s.notes || 'شرح المادة والدروس المقررة',
      durationHours: duration,
      hourlyOrSessionRate: rate,
      payout,
      approved: isApproved,
      notes: s.notes || ''
    };
    stEntry.operations.push(opDetail);

    return {
      id: s.id,
      date: s.date || '',
      startTime: s.startTime || '',
      studentId: s.studentId || '',
      studentName,
      isGroup: Boolean(s.isGroupSession),
      subject: sub,
      topic: s.topic || s.notes || 'شرح المادة والدروس المقررة',
      durationHours: duration,
      hourlyOrSessionRate: rate,
      payout,
      approved: isApproved,
      notes: s.notes || ''
    };
  });

  const studentSummaries: StudentBalanceSummary[] = Array.from(studentMap.values()).map(entry => ({
    studentId: entry.studentId,
    studentName: entry.studentName,
    gradeOrLevel: entry.gradeOrLevel,
    phone: entry.phone,
    sessionsCount: entry.sessionsCount,
    totalHours: Number(entry.totalHours.toFixed(2)),
    totalEarnings: Number(entry.totalEarnings.toFixed(2)),
    subjects: Array.from(entry.subjects),
    lastSessionDate: entry.dates.sort().pop() || '',
    operations: entry.operations
  })).sort((a, b) => b.totalEarnings - a.totalEarnings);

  // 3. Filter Period Payments Received by Teacher
  const periodPayments = payments.filter(p => {
    if (p.teacherId !== teacher.id) return false;
    const pDate = p.date || '';
    if (!pDate) return false;
    return pDate >= startDateStr && pDate <= endDateStr;
  }).sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const periodPaid = periodPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const paymentsList = periodPayments.map(p => ({
    id: p.id,
    date: p.date || '',
    amount: Number(p.amount) || 0,
    note: p.note || 'سند صرف مستحقات المعلم',
    reference: p.reference || ''
  }));

  // Net Closing Balance at the end of this period
  // (Only approved sessions are credited to balance)
  const closingBalance = Number((openingBalance + periodEarnedApproved - periodPaid).toFixed(2));

  return {
    mode,
    periodLabelArabic,
    startDateStr,
    endDateStr,
    generatedAt: new Date().toLocaleDateString('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }) + ' - ' + new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
    teacher,
    academyName,
    managerName,
    openingBalance,
    priorEarnedApproved: Number(priorEarnedApproved.toFixed(2)),
    priorPaid: Number(priorPaid.toFixed(2)),
    totalSessions,
    totalHours: Number(totalHours.toFixed(2)),
    approvedSessionsCount,
    pendingSessionsCount,
    approvedHours: Number(approvedHours.toFixed(2)),
    pendingHours: Number(pendingHours.toFixed(2)),
    periodEarnedApproved: Number(periodEarnedApproved.toFixed(2)),
    periodEarnedPending: Number(periodEarnedPending.toFixed(2)),
    periodEarnedTotal: Number((periodEarnedApproved + periodEarnedPending).toFixed(2)),
    periodPaid: Number(periodPaid.toFixed(2)),
    closingBalance,
    uniqueStudentsCount: studentSummaries.length,
    studentSummaries,
    sessionsList,
    paymentsList
  };
}

/**
 * Generates official high-contrast, publication-grade Arabic HTML document for the statement
 */
export function generateTeacherBalanceReportHTML(summary: ComputedTeacherBalanceSummary): string {
  const {
    teacher,
    periodLabelArabic,
    startDateStr,
    endDateStr,
    generatedAt,
    academyName,
    managerName,
    openingBalance,
    totalSessions,
    totalHours,
    approvedSessionsCount,
    pendingSessionsCount,
    periodEarnedApproved,
    periodEarnedPending,
    periodPaid,
    closingBalance,
    studentSummaries,
    sessionsList,
    paymentsList
  } = summary;

  const defaultTeacherRate = teacher.payoutRate || teacher.hourlyRate || 35;

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>كشف رصيد وحساب مستحقات - الأستاذ ${teacher.name} - ${periodLabelArabic}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Cairo', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      font-size: 11.5px;
      line-height: 1.5;
      direction: rtl;
    }

    @page {
      size: A4 portrait;
      margin: 12mm 10mm 14mm 10mm;
    }

    .report-container {
      max-width: 100%;
      margin: 0 auto;
    }

    /* Header & Branding */
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #0d365a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }

    .brand-title {
      font-size: 17px;
      font-weight: 900;
      color: #0d365a;
      line-height: 1.3;
    }

    .brand-sub {
      font-size: 11px;
      font-weight: 700;
      color: #b45309;
      margin-top: 3px;
    }

    .doc-meta {
      text-align: left;
      font-size: 10.5px;
      color: #475569;
    }

    .doc-badge {
      display: inline-block;
      background: #0d365a;
      color: #ffffff;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
      margin-bottom: 4px;
    }

    /* Title banner */
    .statement-title-banner {
      background: linear-gradient(135deg, #0d365a 0%, #1e3a8a 100%);
      color: #ffffff;
      padding: 14px 20px;
      border-radius: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 6px rgba(13, 54, 90, 0.15);
    }

    .statement-title-banner h1 {
      margin: 0;
      font-size: 16px;
      font-weight: 900;
      letter-spacing: -0.3px;
    }

    .statement-title-banner p {
      margin: 4px 0 0 0;
      font-size: 11px;
      opacity: 0.9;
      font-weight: 600;
    }

    /* Profile grid */
    .teacher-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 16px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
    }

    .info-label {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 2px;
    }

    .info-val {
      font-size: 12.5px;
      font-weight: 800;
      color: #0f172a;
    }

    /* 4 Financial KPI Highlight Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 16px;
    }

    .kpi-card {
      background: #f8fafc;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 12px;
      text-align: center;
    }

    .kpi-card.opening {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    .kpi-card.earned {
      background: #eff6ff;
      border-color: #bfdbfe;
    }

    .kpi-card.paid {
      background: #fef2f2;
      border-color: #fecaca;
    }

    .kpi-card.closing {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border-color: #10b981;
      border-width: 2px;
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.15);
    }

    .kpi-title {
      font-size: 10px;
      font-weight: 800;
      color: #475569;
      margin-bottom: 4px;
    }

    .kpi-card.closing .kpi-title {
      color: #065f46;
      font-size: 11px;
    }

    .kpi-val {
      font-size: 17px;
      font-weight: 900;
      font-family: 'Cairo', monospace, sans-serif;
      color: #0f172a;
      direction: ltr;
      display: inline-block;
    }

    .kpi-card.earned .kpi-val {
      color: #1d4ed8;
    }

    .kpi-card.paid .kpi-val {
      color: #b91c1c;
    }

    .kpi-card.closing .kpi-val {
      color: #047857;
      font-size: 19px;
    }

    .kpi-sub {
      font-size: 9px;
      font-weight: 700;
      color: #64748b;
      margin-top: 2px;
    }

    /* Secondary stat row */
    .sec-stats-bar {
      background: #fafafa;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 8px 14px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-around;
      align-items: center;
      font-size: 11px;
      font-weight: 700;
      color: #334155;
    }

    .sec-stats-bar span strong {
      color: #0d365a;
      font-weight: 900;
    }

    /* Section titles */
    .section-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 18px 0 8px 0;
      padding-bottom: 4px;
      border-bottom: 2px solid #e2e8f0;
    }

    .section-head h2 {
      margin: 0;
      font-size: 13px;
      font-weight: 900;
      color: #0d365a;
    }

    .section-head span {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
    }

    /* Tables */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 10.5px;
    }

    table.data-table th {
      background: #0d365a;
      color: #ffffff;
      padding: 7px 8px;
      font-weight: 800;
      text-align: right;
      border: 1px solid #0d365a;
      font-size: 10px;
    }

    table.data-table td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }

    table.data-table tr:nth-child(even) {
      background-color: #f8fafc;
    }

    .num-cell {
      text-align: center;
      font-family: 'Cairo', monospace, sans-serif;
      font-weight: 700;
    }

    .currency-cell {
      text-align: center;
      font-weight: 800;
      color: #0f172a;
      font-family: 'Cairo', monospace, sans-serif;
    }

    .status-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 800;
      text-align: center;
    }

    .status-approved {
      background: #dcfce7;
      color: #15803d;
    }

    .status-pending {
      background: #fef3c7;
      color: #b45309;
    }

    /* Signatures block */
    .signatures-block {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1.5px dashed #cbd5e1;
      page-break-inside: avoid;
    }

    .sig-box {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 8px;
      padding: 10px 12px;
      text-align: center;
    }

    .sig-role {
      font-size: 10.5px;
      font-weight: 800;
      color: #0d365a;
      margin-bottom: 22px;
    }

    .sig-line {
      border-top: 1px dotted #94a3b8;
      padding-top: 6px;
      font-size: 10px;
      font-weight: 700;
      color: #475569;
    }

    .report-footer {
      margin-top: 16px;
      text-align: center;
      font-size: 9.5px;
      color: #94a3b8;
      border-top: 1px solid #f1f5f9;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <div class="report-container">
    
    <!-- Top Header -->
    <div class="report-header">
      <div>
        <div class="brand-title">${academyName}</div>
        <div class="brand-sub">بوابة الشؤون الأكاديمية والمالية - كشف الرصيد والمستحقات المعتمد</div>
      </div>
      <div class="doc-meta">
        <span class="doc-badge">كشف حساب مالي رسمي</span>
        <div><strong>تاريخ الاستخراج:</strong> ${generatedAt}</div>
        <div><strong>نطاق الكشف:</strong> ${periodLabelArabic}</div>
      </div>
    </div>

    <!-- Title Banner -->
    <div class="statement-title-banner">
      <div>
        <h1>كشف رصيد ومستحقات المعلم (مفصل)</h1>
        <p>بيان شامل بالحركات المالية للحصص المنفذة وسندات الصرف والدفعات المستلمة</p>
      </div>
      <div style="text-align: left; font-size: 12px; font-weight: 800; background: rgba(255,255,255,0.15); padding: 6px 12px; border-radius: 8px;">
        الرصيد النهائي: ₪${closingBalance.toFixed(2)}
      </div>
    </div>

    <!-- Teacher Info Card -->
    <div class="teacher-card">
      <div class="info-item">
        <span class="info-label">اسم المعلم:</span>
        <span class="info-val">أ. ${teacher.name}</span>
      </div>
      <div class="info-item">
        <span class="info-label">التخصص / المواد:</span>
        <span class="info-val">${teacher.specialization || teacher.subjects?.join('، ') || 'معلم معتمد'}</span>
      </div>
      <div class="info-item">
        <span class="info-label">سعر الحصة / الساعة الأساسي:</span>
        <span class="info-val">₪${defaultTeacherRate} / س</span>
      </div>
      <div class="info-item">
        <span class="info-label">رقم الهاتف والتواصل:</span>
        <span class="info-val" dir="ltr">${teacher.phone || teacher.contact || 'غير مسجل'}</span>
      </div>
    </div>

    <!-- 4 Main Financial Balance Cards -->
    <div class="kpi-grid">
      <div class="kpi-card opening">
        <div class="kpi-title">الرصيد السابق الافتتاحي</div>
        <div class="kpi-val">₪${openingBalance.toFixed(2)}</div>
        <div class="kpi-sub">المستحق قبل بداية هذه الفترة</div>
      </div>

      <div class="kpi-card earned">
        <div class="kpi-title">مستحقات الحصص المعتمدة (+)</div>
        <div class="kpi-val">+ ₪${periodEarnedApproved.toFixed(2)}</div>
        <div class="kpi-sub">${approvedSessionsCount} حصة معتمدة (${summary.approvedHours.toFixed(1)} س)</div>
      </div>

      <div class="kpi-card paid">
        <div class="kpi-title">المدفوعات والمستلمات (-)</div>
        <div class="kpi-val">- ₪${periodPaid.toFixed(2)}</div>
        <div class="kpi-sub">${paymentsList.length} سندات دفع مصرفية ونقدية</div>
      </div>

      <div class="kpi-card closing">
        <div class="kpi-title">صافي الرصيد المستحق للمعلم (=)</div>
        <div class="kpi-val">₪${closingBalance.toFixed(2)}</div>
        <div class="kpi-sub">الرصيد النهائي واجب السداد</div>
      </div>
    </div>

    <!-- Secondary Statistical Bar -->
    <div class="sec-stats-bar">
      <span>إجمالي الحصص المسجلة: <strong>${totalSessions} حصة</strong></span>
      <span>•</span>
      <span>إجمالي الساعات: <strong>${totalHours.toFixed(1)} ساعة</strong></span>
      <span>•</span>
      <span>عدد الطلاب المنسوبين: <strong>${studentSummaries.length} طلاب</strong></span>
      ${periodEarnedPending > 0 ? `
        <span>•</span>
        <span style="color: #b45309;">قيد التدقيق والاعتماد: <strong>${pendingSessionsCount} حصة (₪${periodEarnedPending.toFixed(2)})</strong></span>
      ` : ''}
    </div>

    <!-- Section 1: Detailed Sessions Ledger -->
    <div class="section-head">
      <h2>1. سجل الحصص والدروس المنفذة خلال الفترة (${sessionsList.length} حصة)</h2>
      <span>مرتبة تسلسلياً بحسب التاريخ</span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 30px; text-align: center;">#</th>
          <th style="width: 80px; text-align: center;">التاريخ</th>
          <th style="width: 50px; text-align: center;">الوقت</th>
          <th>اسم الطالب / الدورة</th>
          <th>المادة الدراسية</th>
          <th>موضوع الدرس والنشاط</th>
          <th style="width: 45px; text-align: center;">المدة</th>
          <th style="width: 55px; text-align: center;">السعر</th>
          <th style="width: 65px; text-align: center;">المستحق (₪)</th>
          <th style="width: 60px; text-align: center;">الحالة</th>
        </tr>
      </thead>
      <tbody>
        ${sessionsList.length === 0 ? `
          <tr>
            <td colspan="10" style="text-align: center; padding: 18px; color: #94a3b8;">
              لا توجد حصص مسجلة في هذا النطاق الزمني المحدد.
            </td>
          </tr>
        ` : sessionsList.map((s, idx) => `
          <tr>
            <td class="num-cell" style="color: #64748b;">${idx + 1}</td>
            <td class="num-cell" style="font-weight: 800;">${formatCustomDate(s.date)}</td>
            <td class="num-cell" style="color: #64748b; font-size: 9.5px;">${s.startTime || '-'}</td>
            <td style="font-weight: 800; color: #0f172a;">${s.studentName}</td>
            <td>${s.subject}</td>
            <td style="color: #475569; font-size: 9.5px;">${s.topic}</td>
            <td class="num-cell">${s.durationHours} س</td>
            <td class="num-cell" style="color: #64748b;">₪${s.hourlyOrSessionRate}</td>
            <td class="currency-cell" style="color: ${s.approved ? '#0f172a' : '#b45309'};">
              ₪${s.payout.toFixed(2)}
            </td>
            <td style="text-align: center;">
              <span class="status-badge ${s.approved ? 'status-approved' : 'status-pending'}">
                ${s.approved ? 'معتمد' : 'قيد المراجعة'}
              </span>
            </td>
          </tr>
        `).join('')}
      </tbody>
      ${sessionsList.length > 0 ? `
        <tfoot>
          <tr style="background: #f1f5f9; border-top: 2px solid #cbd5e1; font-weight: 900;">
            <td colspan="6" style="text-align: right; padding: 8px 10px; font-size: 11px;">
              إجمالي الحصص المنفذة (${sessionsList.length} حصة):
            </td>
            <td class="num-cell" style="color: #1d4ed8; padding: 8px 6px;">
              ${totalHours.toFixed(1)} س
            </td>
            <td></td>
            <td class="currency-cell" style="color: #047857; font-size: 12px; background: #e0f2fe;">
              ₪${summary.periodEarnedTotal.toFixed(2)}
            </td>
            <td style="text-align: center; font-size: 9.5px; color: #64748b;">
              مطابق
            </td>
          </tr>
        </tfoot>
      ` : ''}
    </table>

    <!-- Section 2: Detailed Payments Received -->
    <div class="section-head" style="margin-top: 20px;">
      <h2>2. سجل الدفعات والمبالغ المسلمة للمعلم (${paymentsList.length} دفعة)</h2>
      <span>السحوبات وسندات الصرف النقدية والمصرفية</span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 30px; text-align: center;">#</th>
          <th style="width: 90px; text-align: center;">تاريخ الدفعة</th>
          <th style="width: 100px; text-align: center;">المبلغ المصروف (₪)</th>
          <th>البيان وملاحظات السند</th>
          <th style="width: 110px; text-align: center;">رقم المرجع / السند</th>
        </tr>
      </thead>
      <tbody>
        ${paymentsList.length === 0 ? `
          <tr>
            <td colspan="5" style="text-align: center; padding: 14px; color: #94a3b8;">
              لم يتم تسجيل أي سندات صرف أو دفعات نقدية مسلّمة للمعلم خلال هذه الفترة المحددة.
            </td>
          </tr>
        ` : paymentsList.map((p, idx) => `
          <tr>
            <td class="num-cell" style="color: #64748b;">${idx + 1}</td>
            <td class="num-cell" style="font-weight: 800;">${formatCustomDate(p.date)}</td>
            <td class="currency-cell" style="color: #b91c1c; font-size: 11.5px; background: #fef2f2;">
              - ₪${p.amount.toFixed(2)}
            </td>
            <td style="color: #334155; font-weight: 700;">${p.note}</td>
            <td class="num-cell" style="color: #64748b;">${p.reference || `#PAY-${p.id.slice(0, 6)}`}</td>
          </tr>
        `).join('')}
      </tbody>
      ${paymentsList.length > 0 ? `
        <tfoot>
          <tr style="background: #f1f5f9; border-top: 2px solid #cbd5e1; font-weight: 900;">
            <td colspan="2" style="text-align: right; padding: 8px 10px; font-size: 11px;">
              إجمالي ما تم تسليمه للمعلم:
            </td>
            <td class="currency-cell" style="color: #b91c1c; font-size: 12px; background: #fee2e2;">
              - ₪${periodPaid.toFixed(2)}
            </td>
            <td colspan="2" style="font-size: 9.5px; color: #64748b;">
              تم خصمها من مستحقات المعلم بموجب سندات الصرف
            </td>
          </tr>
        </tfoot>
      ` : ''}
    </table>

    <!-- Section 3: Summary by Student -->
    ${studentSummaries.length > 0 ? `
      <div class="section-head" style="margin-top: 20px;">
        <h2>3. ملخص الحصص والمستحقات بحسب الطلاب (${studentSummaries.length} طلاب)</h2>
        <span>توزيع ساعات ومستحقات كل طالب على حدة</span>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 30px; text-align: center;">#</th>
            <th>اسم الطالب</th>
            <th>المرحلة الدراسية</th>
            <th>المواد المشروحة</th>
            <th style="width: 60px; text-align: center;">الحصص</th>
            <th style="width: 65px; text-align: center;">الساعات</th>
            <th style="width: 80px; text-align: center;">المستحق (₪)</th>
          </tr>
        </thead>
        <tbody>
          ${studentSummaries.map((st, idx) => `
            <tr>
              <td class="num-cell" style="color: #64748b;">${idx + 1}</td>
              <td style="font-weight: 800; color: #0f172a;">${st.studentName}</td>
              <td style="color: #475569;">${st.gradeOrLevel}</td>
              <td style="color: #475569; font-size: 9.5px;">${st.subjects.join('، ')}</td>
              <td class="num-cell">${st.sessionsCount}</td>
              <td class="num-cell" style="color: #1d4ed8; font-weight: 800;">${st.totalHours} س</td>
              <td class="currency-cell" style="color: #047857;">₪${st.totalEarnings.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Section 4: Detailed Operations Per Student -->
      <div class="section-head" style="margin-top: 22px;">
        <h2>4. تفاصيل العمليات والحصص لكل طالب خلال الفترة المحددة</h2>
        <span>كشف حركات تفصيلي لكل طالب مع موضوع الدرس والمدة والمستحق</span>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;">
        ${studentSummaries.map((st) => `
          <div style="border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; page-break-inside: avoid; margin-bottom: 10px;">
            <div style="background: #f1f5f9; padding: 7px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1;">
              <div>
                <strong style="color: #0d365a; font-size: 11px;">👤 ${st.studentName}</strong>
                <span style="color: #64748b; font-size: 9.5px; margin-right: 8px;">(${st.gradeOrLevel})</span>
                ${st.phone ? `<span style="color: #64748b; font-size: 9.5px; margin-right: 8px;" dir="ltr">📞 ${st.phone}</span>` : ''}
              </div>
              <div style="font-size: 10px; font-weight: 800;">
                <span style="color: #1d4ed8; margin-left: 10px;">إجمالي الساعات: ${st.totalHours} س (${st.sessionsCount} حصة)</span>
                <span style="color: #047857; background: #dcfce7; padding: 2px 8px; border-radius: 4px;">المستحق: ₪${st.totalEarnings.toFixed(2)}</span>
              </div>
            </div>

            <table class="data-table" style="margin-bottom: 0;">
              <thead>
                <tr>
                  <th style="width: 25px; text-align: center; background: #334155;">#</th>
                  <th style="width: 80px; text-align: center; background: #334155;">التاريخ</th>
                  <th style="width: 45px; text-align: center; background: #334155;">الوقت</th>
                  <th style="background: #334155;">المادة</th>
                  <th style="background: #334155;">موضوع الدرس والنشاط</th>
                  <th style="width: 45px; text-align: center; background: #334155;">المدة</th>
                  <th style="width: 50px; text-align: center; background: #334155;">السعر</th>
                  <th style="width: 65px; text-align: center; background: #334155;">المستحق (₪)</th>
                  <th style="width: 55px; text-align: center; background: #334155;">الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${st.operations.map((op, opIdx) => `
                  <tr>
                    <td class="num-cell" style="color: #64748b; font-size: 9px;">${opIdx + 1}</td>
                    <td class="num-cell" style="font-weight: 700;">${formatCustomDate(op.date)}</td>
                    <td class="num-cell" style="color: #64748b; font-size: 9px;">${op.startTime || '-'}</td>
                    <td style="font-weight: 700;">${op.subject}</td>
                    <td style="color: #475569; font-size: 9px;">${op.topic}</td>
                    <td class="num-cell">${op.durationHours} س</td>
                    <td class="num-cell" style="color: #64748b;">₪${op.hourlyOrSessionRate}</td>
                    <td class="currency-cell" style="color: ${op.approved ? '#047857' : '#b45309'};">
                      ₪${op.payout.toFixed(2)}
                    </td>
                    <td style="text-align: center;">
                      <span class="status-badge ${op.approved ? 'status-approved' : 'status-pending'}">
                        ${op.approved ? 'معتمد' : 'قيد التدقيق'}
                      </span>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <!-- Official Signatures -->
    <div class="signatures-block">
      <div class="sig-box">
        <div class="sig-role">المعلم صاحب الكشف</div>
        <div class="sig-line">أ. ${teacher.name}</div>
      </div>
      <div class="sig-box">
        <div class="sig-role">التدقيق المالي وشؤون الموظفين</div>
        <div class="sig-line">القسم المالي والحسابات</div>
      </div>
      <div class="sig-box">
        <div class="sig-role">اعتماد وختم الإدارة العامة</div>
        <div class="sig-line">${managerName}</div>
      </div>
    </div>

    <div class="report-footer">
      منصة أكاديمية التفوق أون لاين للتعليم الذكي | تم استخراج كشف الرصيد والمستحقات آلياً ومطابق للدفاتر المحاسبية الرسمية.
    </div>

  </div>
</body>
</html>
  `;
}

/**
 * Direct Print using an isolated invisible iframe
 */
export function printTeacherBalanceReport(summary: ComputedTeacherBalanceSummary): void {
  const html = generateTeacherBalanceReportHTML(summary);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Error printing teacher balance statement:', e);
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 2000);
    }
  }, 600);
}

/**
 * Downloads a high-definition PDF file containing the statement of balance
 */
export async function downloadTeacherBalancePDF(summary: ComputedTeacherBalanceSummary): Promise<void> {
  const safeTeacherName = (summary.teacher.name || 'المعلم').replace(/[/\\?%*:|"<>]/g, '_').trim();
  const periodSlug = summary.mode === 'month' 
    ? `شهر_${summary.startDateStr.substring(0, 7)}`
    : `من_${summary.startDateStr}_إلى_${summary.endDateStr}`;
  const filename = `كشف_رصيد_الأستاذ_${safeTeacherName}_${periodSlug}.pdf`;
  const htmlContent = generateTeacherBalanceReportHTML(summary);

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '840px';
  container.style.minHeight = '1188px';
  container.style.opacity = '1';
  container.style.visibility = 'visible';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '-999999';
  container.style.background = '#ffffff';
  container.style.padding = '0';
  container.style.boxSizing = 'border-box';
  container.innerHTML = htmlContent;
  document.body.appendChild(container);

  try {
    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch {
        // ignore
      }
    }
    await new Promise(r => setTimeout(r, 450));

    const actualWidth = 840;
    const actualHeight = Math.max(container.scrollHeight, container.offsetHeight, 1188);

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: 0,
      width: actualWidth,
      height: actualHeight,
      windowWidth: actualWidth,
      windowHeight: actualHeight
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // First page
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    // Additional pages if needed
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (err) {
    console.warn('html2canvas render failed, falling back to print dialog:', err);
    printTeacherBalanceReport(summary);
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

/**
 * Exports statement details to a UTF-8 BOM CSV file for Excel
 */
export function exportTeacherBalanceToCSV(summary: ComputedTeacherBalanceSummary): void {
  const safeTeacherName = (summary.teacher.name || 'المعلم').replace(/[/\\?%*:|"<>]/g, '_').trim();
  const filename = `كشف_رصيد_الأستاذ_${safeTeacherName}.csv`;

  const rows: string[][] = [
    ['كشف رصيد وحساب مستحقات المعلم - أكاديمية التفوق أون لاين'],
    ['اسم المعلم', summary.teacher.name],
    ['نطاق الكشف', summary.periodLabelArabic],
    ['تاريخ الاستخراج', summary.generatedAt],
    [''],
    ['الملخص المالي العام'],
    ['الرصيد السابق الافتتاحي (₪)', summary.openingBalance.toFixed(2)],
    ['مستحقات الحصص المعتمدة خلال الفترة (₪)', summary.periodEarnedApproved.toFixed(2)],
    ['إجمالي المدفوعات والمسحوبات المسلمة (₪)', summary.periodPaid.toFixed(2)],
    ['صافي الرصيد النهائي المستحق (₪)', summary.closingBalance.toFixed(2)],
    ['إجمالي عدد الحصص', String(summary.totalSessions)],
    ['إجمالي عدد الساعات', summary.totalHours.toFixed(1)],
    [''],
    ['تفاصيل الحصص المنفذة'],
    ['#', 'التاريخ', 'الوقت', 'اسم الطالب', 'المادة', 'موضوع الدرس', 'المدة (ساعة)', 'السعر (₪)', 'المستحق (₪)', 'الحالة']
  ];

  summary.sessionsList.forEach((s, idx) => {
    rows.push([
      String(idx + 1),
      s.date,
      s.startTime || '',
      `"${s.studentName.replace(/"/g, '""')}"`,
      `"${s.subject.replace(/"/g, '""')}"`,
      `"${s.topic.replace(/"/g, '""')}"`,
      String(s.durationHours),
      String(s.hourlyOrSessionRate),
      s.payout.toFixed(2),
      s.approved ? 'معتمد' : 'قيد المراجعة'
    ]);
  });

  rows.push(['']);
  rows.push(['سجل الدفعات والمبالغ المسلمة']);
  rows.push(['#', 'تاريخ الدفعة', 'المبلغ (₪)', 'البيان وملاحظات السند', 'رقم المرجع']);

  summary.paymentsList.forEach((p, idx) => {
    rows.push([
      String(idx + 1),
      p.date,
      p.amount.toFixed(2),
      `"${p.note.replace(/"/g, '""')}"`,
      p.reference || ''
    ]);
  });

  const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
