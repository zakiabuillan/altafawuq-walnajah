import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Session, Student, Teacher, GroupCourse } from '../types';

export interface TeacherMonthlyReportData {
  teacher: Teacher;
  year?: number;
  month?: number; // 1 - 12
  mode?: 'month' | 'range' | 'all';
  startDate?: string;
  endDate?: string;
  sessions: Session[];
  students: Student[];
  groupCourses?: GroupCourse[];
  studentFilter?: string; // 'all' or studentId
  statusFilter?: 'all' | 'approved' | 'pending';
  academyName?: string;
  managerName?: string;
}

export interface StudentSessionSummary {
  studentId: string;
  studentName: string;
  gradeOrLevel: string;
  phone?: string;
  sessionsCount: number;
  totalHours: number;
  subjects: string[];
  lastSessionDate: string;
}

export interface ComputedTeacherMonthlySummary {
  year: number;
  month: number;
  monthNameArabic: string;
  monthPrefix: string;
  startDateStr: string;
  endDateStr: string;
  generatedAt: string;
  teacher: Teacher;
  academyName: string;
  managerName: string;

  totalSessions: number;
  totalHours: number;
  approvedSessionsCount: number;
  pendingSessionsCount: number;
  approvedHours: number;
  pendingHours: number;
  uniqueStudentsCount: number;

  studentSummaries: StudentSessionSummary[];
  subjectBreakdown: Array<{ subject: string; hours: number; count: number }>;
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
    approved: boolean;
    notes: string;
  }>;
}

export const ARABIC_MONTHS = [
  'يناير (1)', 'فبراير (2)', 'مارس (3)', 'أبريل (4)', 'مايو (5)', 'يونيو (6)',
  'يوليو (7)', 'أغسطس (8)', 'سبتمبر (9)', 'أكتوبر (10)', 'نوفمبر (11)', 'ديسمبر (12)'
];

/**
 * Computes all statistical aggregations for the teacher's monthly sessions
 */
export function computeTeacherMonthlySummary(data: TeacherMonthlyReportData): ComputedTeacherMonthlySummary {
  const {
    teacher,
    year = new Date().getFullYear(),
    month = new Date().getMonth() + 1,
    mode = 'month',
    startDate,
    endDate,
    sessions = [],
    students = [],
    groupCourses = [],
    studentFilter = 'all',
    statusFilter = 'all',
    academyName = 'أكاديمية التفوق أون لاين للتعليم والتدريب والاستشارات',
    managerName = 'أ. زكي أبو علان (المدير العام)'
  } = data;

  let startDateStr = '';
  let endDateStr = '';
  let monthNameArabic = '';
  const monthStr = String(month).padStart(2, '0');
  const monthPrefix = `${year}-${monthStr}`;

  if (mode === 'range' && startDate && endDate) {
    let s = startDate;
    let e = endDate;
    if (s > e) {
      const tmp = s;
      s = e;
      e = tmp;
    }
    startDateStr = s;
    endDateStr = e;
    monthNameArabic = `الفترة من ${startDateStr} إلى ${endDateStr}`;
  } else {
    const lastDay = new Date(year, month, 0).getDate();
    startDateStr = `${year}-${monthStr}-01`;
    endDateStr = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
    monthNameArabic = ARABIC_MONTHS[month - 1] || `شهر ${month}`;
  }

  // Filter sessions strictly for this teacher in the requested period
  const teacherMonthSessions = sessions.filter(s => {
    if (s.teacherId !== teacher.id) return false;
    const sDate = s.date || '';
    if (!sDate) return false;

    if (mode === 'range') {
      if (sDate < startDateStr || sDate > endDateStr) return false;
    } else {
      if (!sDate.startsWith(monthPrefix)) return false;
    }

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
    if (dA !== dB) return dA.localeCompare(dB); // Chronological order for audit
    return (a.startTime || '').localeCompare(b.startTime || '');
  });

  let totalSessions = 0;
  let totalHours = 0;
  let approvedSessionsCount = 0;
  let pendingSessionsCount = 0;
  let approvedHours = 0;
  let pendingHours = 0;

  const studentMap = new Map<string, {
    studentId: string;
    studentName: string;
    gradeOrLevel: string;
    phone?: string;
    sessionsCount: number;
    totalHours: number;
    subjects: Set<string>;
    dates: string[];
  }>();

  const subjectMap = new Map<string, { hours: number; count: number }>();

  const sessionsList = teacherMonthSessions.map(s => {
    const student = students.find(st => st.id === s.studentId);
    let studentName = student?.name || 'طالب مسجل';
    if (s.isGroupSession) {
      const course = groupCourses.find(c => c.id === s.groupCourseId);
      studentName = course ? `${course.title || course.name} (دورة جماعية)` : (s.studentName || 'دورة جماعية');
    }

    const duration = Number(s.durationHours) || 1;
    const isApproved = s.approved !== false;
    const sub = s.subject || (s.isGroupSession ? 'دورة جماعية' : 'مادة تعليمية عامة');

    totalSessions += 1;
    totalHours += duration;

    if (isApproved) {
      approvedSessionsCount += 1;
      approvedHours += duration;
    } else {
      pendingSessionsCount += 1;
      pendingHours += duration;
    }

    // Student summary
    const key = s.studentId || `group_${s.groupCourseId || 'generic'}`;
    if (!studentMap.has(key)) {
      studentMap.set(key, {
        studentId: s.studentId || '',
        studentName,
        gradeOrLevel: student?.academicLevel || student?.grade || (s.isGroupSession ? 'دورة تدريبية' : 'مرحلة دراسية'),
        phone: student?.phone || student?.parentPhone || '',
        sessionsCount: 0,
        totalHours: 0,
        subjects: new Set<string>(),
        dates: []
      });
    }

    const stEntry = studentMap.get(key)!;
    stEntry.sessionsCount += 1;
    stEntry.totalHours += duration;
    stEntry.subjects.add(sub);
    if (s.date) stEntry.dates.push(s.date);

    // Subject breakdown
    if (!subjectMap.has(sub)) {
      subjectMap.set(sub, { hours: 0, count: 0 });
    }
    const subEntry = subjectMap.get(sub)!;
    subEntry.hours += duration;
    subEntry.count += 1;

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
      approved: isApproved,
      notes: s.notes || ''
    };
  });

  const studentSummaries: StudentSessionSummary[] = Array.from(studentMap.values()).map(entry => ({
    studentId: entry.studentId,
    studentName: entry.studentName,
    gradeOrLevel: entry.gradeOrLevel,
    phone: entry.phone,
    sessionsCount: entry.sessionsCount,
    totalHours: entry.totalHours,
    subjects: Array.from(entry.subjects),
    lastSessionDate: entry.dates.sort().pop() || ''
  })).sort((a, b) => b.totalHours - a.totalHours);

  const subjectBreakdown = Array.from(subjectMap.entries()).map(([subject, stats]) => ({
    subject,
    hours: stats.hours,
    count: stats.count
  })).sort((a, b) => b.hours - a.hours);

  return {
    year,
    month,
    monthNameArabic,
    monthPrefix,
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
    totalSessions,
    totalHours,
    approvedSessionsCount,
    pendingSessionsCount,
    approvedHours,
    pendingHours,
    uniqueStudentsCount: studentSummaries.length,
    studentSummaries,
    subjectBreakdown,
    sessionsList
  };
}

/**
 * Generates a clean, high-contrast, publication-grade Arabic HTML document
 */
export function generateTeacherMonthlySessionsReportHTML(summary: ComputedTeacherMonthlySummary): string {
  const {
    teacher,
    year,
    monthNameArabic,
    startDateStr,
    endDateStr,
    generatedAt,
    academyName,
    managerName,
    totalSessions,
    totalHours,
    approvedSessionsCount,
    pendingSessionsCount,
    uniqueStudentsCount,
    studentSummaries,
    sessionsList
  } = summary;

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>تقرير الحصص الشهري - الأستاذ ${teacher.name} - ${monthNameArabic} ${year}</title>
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
      font-size: 20px;
      font-weight: 900;
      color: #0d365a;
      margin: 0 0 3px 0;
      letter-spacing: -0.5px;
    }

    .brand-subtitle {
      font-size: 11px;
      font-weight: 700;
      color: #b45309;
      margin: 0;
    }

    .header-badge {
      text-align: left;
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 7px 12px;
      border-radius: 8px;
    }

    .header-badge-title {
      font-size: 12px;
      font-weight: 800;
      color: #0d365a;
      margin: 0 0 2px 0;
    }

    .header-badge-meta {
      font-size: 9.5px;
      color: #64748b;
      margin: 0;
    }

    /* Teacher details bar */
    .teacher-bar {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border: 1px solid #cbd5e1;
      border-right: 5px solid #d4a33c;
      border-radius: 10px;
      padding: 10px 16px;
      margin-bottom: 18px;
    }

    .teacher-name {
      font-size: 14px;
      font-weight: 900;
      color: #0f172a;
    }

    .teacher-meta {
      font-size: 10.5px;
      color: #475569;
      font-weight: 700;
    }

    /* Stat Cards Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }

    .stat-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      text-align: right;
    }

    .stat-card.primary {
      border-top: 3px solid #0d365a;
      background: #f8fafc;
    }

    .stat-card.gold {
      border-top: 3px solid #d4a33c;
      background: #fffdf5;
    }

    .stat-card.emerald {
      border-top: 3px solid #10b981;
      background: #f0fdf4;
    }

    .stat-card.amber {
      border-top: 3px solid #f59e0b;
      background: #fffbeb;
    }

    .stat-label {
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 3px;
    }

    .stat-value {
      font-size: 17px;
      font-weight: 900;
      color: #0f172a;
      line-height: 1.1;
    }

    .stat-sub {
      font-size: 8.5px;
      font-weight: 600;
      color: #94a3b8;
      margin-top: 2px;
    }

    /* Section Headings */
    .section-title {
      font-size: 12.5px;
      font-weight: 800;
      color: #0d365a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 5px;
      margin: 18px 0 10px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .section-counter {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      background: #f1f5f9;
      padding: 2px 8px;
      border-radius: 6px;
    }

    /* Data Tables */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 10px;
    }

    table.data-table th {
      background: #0d365a;
      color: #ffffff;
      font-weight: 800;
      padding: 6px 8px;
      text-align: right;
      border: 1px solid #0d365a;
      white-space: nowrap;
    }

    table.data-table td {
      border: 1px solid #e2e8f0;
      padding: 6px 8px;
      color: #1e293b;
      vertical-align: middle;
    }

    table.data-table tr:nth-child(even) td {
      background: #f8fafc;
    }

    .num-cell {
      text-align: center;
      font-weight: 800;
      font-family: monospace;
      font-size: 10.5px;
    }

    .badge-approved {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 8.5px;
      display: inline-block;
    }

    .badge-pending {
      background: #fffbeb;
      color: #92400e;
      border: 1px solid #fde68a;
      padding: 1px 6px;
      border-radius: 4px;
      font-weight: 800;
      font-size: 8.5px;
      display: inline-block;
    }

    /* Signatures Block */
    .signatures-block {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-top: 26px;
      padding-top: 14px;
      border-top: 1px dashed #cbd5e1;
      page-break-inside: avoid;
    }

    .sig-box {
      flex: 1;
      border: 1px solid #e2e8f0;
      background: #fcfcfc;
      border-radius: 8px;
      padding: 10px 12px;
      text-align: center;
    }

    .sig-role {
      font-size: 10px;
      font-weight: 800;
      color: #0d365a;
      margin-bottom: 26px;
    }

    .sig-line {
      border-top: 1px dotted #94a3b8;
      padding-top: 4px;
      font-size: 9px;
      color: #64748b;
      font-weight: 700;
    }

    .report-footer {
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
      margin-top: 14px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header -->
    <div class="report-header">
      <div>
        <div class="brand-title">🎓 ${academyName}</div>
        <div class="brand-subtitle">نظام الإدارة التعليمية وحوكمة شؤون المعلمين والأداء الأكاديمي</div>
      </div>
      <div class="header-badge">
        <div class="header-badge-title">تقرير الحصص الشهري الرسمي</div>
        <div class="header-badge-meta">الفترة: ${monthNameArabic} ${year}</div>
        <div class="header-badge-meta">من: ${startDateStr} إلى: ${endDateStr}</div>
      </div>
    </div>

    <!-- Teacher Info Bar -->
    <div class="teacher-bar">
      <div>
        <span class="teacher-meta">المعلم المعتمد: </span>
        <span class="teacher-name">أ. ${teacher.name}</span>
        ${teacher.specialty ? `<span class="teacher-meta"> (${teacher.specialty})</span>` : ''}
      </div>
      <div class="teacher-meta">
        ${teacher.phone ? `<span>هاتف المعلم: <strong style="color: #0f172a;">${teacher.phone}</strong> | </span>` : ''}
        <span>تاريخ الإصدار: <strong style="color: #0f172a;">${generatedAt}</strong></span>
      </div>
    </div>

    <!-- Summary KPI Cards -->
    <div class="stats-grid">
      <div class="stat-card primary">
        <div class="stat-label">إجمالي الحصص المسجلة</div>
        <div class="stat-value">${totalSessions} <span style="font-size: 11px; font-weight: normal;">حصة</span></div>
        <div class="stat-sub">طوال شهر ${monthNameArabic}</div>
      </div>
      <div class="stat-card gold">
        <div class="stat-label">إجمالي الساعات التدريسية</div>
        <div class="stat-value">${totalHours.toFixed(1)} <span style="font-size: 11px; font-weight: normal;">ساعة</span></div>
        <div class="stat-sub">ساعات فعلية منجزة</div>
      </div>
      <div class="stat-card emerald">
        <div class="stat-label">عدد الطلاب المستفيدين</div>
        <div class="stat-value">${uniqueStudentsCount} <span style="font-size: 11px; font-weight: normal;">طلاب</span></div>
        <div class="stat-sub">تلقوا حصصاً خلال الشهر</div>
      </div>
      <div class="stat-card amber">
        <div class="stat-label">حالة الاعتماد الأكاديمي</div>
        <div class="stat-value" style="font-size: 13px;">${approvedSessionsCount} معتمدة</div>
        <div class="stat-sub">${pendingSessionsCount > 0 ? `${pendingSessionsCount} حصة بانتظار الاعتماد` : 'كافة الحصص معتمدة رسمياً ✔️'}</div>
      </div>
    </div>

    <!-- Section 1: Student Summary Table -->
    <div class="section-title">
      <span>ملخص الحصص حسب الطلاب لشهر ${monthNameArabic}</span>
      <span class="section-counter">${studentSummaries.length} طالب</span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 25%;">اسم الطالب</th>
          <th style="width: 15%;">المرحلة / الصف</th>
          <th style="width: 10%;" class="num-cell">عدد الحصص</th>
          <th style="width: 12%;" class="num-cell">إجمالي الساعات</th>
          <th style="width: 20%;">المواد والموضوعات</th>
          <th style="width: 13%;">آخر حصة بالشهر</th>
        </tr>
      </thead>
      <tbody>
        ${studentSummaries.length === 0 ? `
          <tr>
            <td colspan="7" style="text-align: center; color: #94a3b8; padding: 12px;">لا توجد حصص مسجلة لأي طالب في هذا الشهر.</td>
          </tr>
        ` : studentSummaries.map((st, idx) => `
          <tr>
            <td class="num-cell">${idx + 1}</td>
            <td><strong>${st.studentName}</strong></td>
            <td>${st.gradeOrLevel}</td>
            <td class="num-cell">${st.sessionsCount}</td>
            <td class="num-cell" style="color: #0d365a;">${st.totalHours.toFixed(1)} س</td>
            <td>${st.subjects.join(', ') || 'عام'}</td>
            <td>${st.lastSessionDate || '-'}</td>
          </tr>
        `).join('')}
      </tbody>
      ${studentSummaries.length > 0 ? `
        <tfoot>
          <tr style="background: #f1f5f9; font-weight: 800; border-top: 2px solid #cbd5e1;">
            <td colspan="3" style="text-align: right; font-weight: 800;">مجموع الساعات الكلي لجميع الحصص المسجلة (${studentSummaries.length} طالب):</td>
            <td class="num-cell" style="font-weight: 900;">${totalSessions}</td>
            <td class="num-cell" style="color: #0d365a; font-weight: 900; background: #e0f2fe;">${totalHours.toFixed(1)} س</td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      ` : ''}
    </table>

    <!-- Section 2: Detailed Sessions Log -->
    <div class="section-title" style="margin-top: 24px;">
      <span>السجل التفصيلي لجميع الحصص المسجلة وتواريخ الجلسات</span>
      <span class="section-counter">${sessionsList.length} حصة</span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 4%;">#</th>
          <th style="width: 11%;">تاريخ الجلسة</th>
          <th style="width: 8%;">الوقت</th>
          <th style="width: 18%;">اسم الطالب</th>
          <th style="width: 14%;">المادة الدراسية</th>
          <th style="width: 25%;">الموضوع المشروح والدروس</th>
          <th style="width: 8%;" class="num-cell">المدة</th>
          <th style="width: 12%; text-align: center;">الاعتماد</th>
        </tr>
      </thead>
      <tbody>
        ${sessionsList.length === 0 ? `
          <tr>
            <td colspan="8" style="text-align: center; color: #94a3b8; padding: 16px;">لا توجد جلسات مسجلة في هذا الشهر مطابقة للتصفية.</td>
          </tr>
        ` : sessionsList.map((s, idx) => `
          <tr>
            <td class="num-cell">${idx + 1}</td>
            <td style="font-weight: 700;">${s.date}</td>
            <td style="color: #64748b; font-size: 9px;">${s.startTime || '-'}</td>
            <td><strong>${s.studentName}</strong></td>
            <td>${s.subject}</td>
            <td>${s.topic}</td>
            <td class="num-cell">${s.durationHours} س</td>
            <td style="text-align: center;">
              ${s.approved ? '<span class="badge-approved">معتمدة ✔️</span>' : '<span class="badge-pending">قيد المراجعة</span>'}
            </td>
          </tr>
        `).join('')}
      </tbody>
      ${sessionsList.length > 0 ? `
        <tfoot>
          <tr style="background: #f1f5f9; border-top: 2px solid #cbd5e1; font-weight: 800;">
            <td colspan="6" style="text-align: right; font-weight: 900; padding: 10px; font-size: 13px;">
              مجموع الساعات الكلي لجميع الحصص المسجلة (${sessionsList.length} حصة):
            </td>
            <td class="num-cell" style="text-align: center; font-weight: 900; color: #1d4ed8; background: #e0f2fe; padding: 10px; font-size: 13px;">
              ${totalHours.toFixed(1)} س
            </td>
            <td style="text-align: center; font-size: 11px; color: #64748b;">
              معتمد ومطابق
            </td>
          </tr>
        </tfoot>
      ` : ''}
    </table>

    <!-- Signatures -->
    <div class="signatures-block">
      <div class="sig-box">
        <div class="sig-role">إعداد وتوثيق معلم المادة</div>
        <div class="sig-line">الأستاذ: ${teacher.name}</div>
      </div>
      <div class="sig-box">
        <div class="sig-role">تدقيق شؤون المعلمين والتعليم</div>
        <div class="sig-line">القسم الأكاديمي</div>
      </div>
      <div class="sig-box">
        <div class="sig-role">اعتماد وختم الإدارة العامة</div>
        <div class="sig-line">${managerName}</div>
      </div>
    </div>

    <div class="report-footer">
      منصة أكاديمية التفوق أون لاين للتعليم الذكي | تم استخراج هذا التقرير آلياً وموثق وفق السجلات الأكاديمية الرسمية.
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Direct Print / Preview using an isolated invisible iframe
 */
export function printTeacherMonthlySessionsReport(summary: ComputedTeacherMonthlySummary): void {
  const html = generateTeacherMonthlySessionsReportHTML(summary);

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
      console.error('Error printing teacher report:', e);
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
 * Downloads a high-definition PDF file containing the monthly summary
 */
export async function downloadTeacherMonthlySessionsPDF(summary: ComputedTeacherMonthlySummary): Promise<void> {
  const safeTeacherName = (summary.teacher.name || 'المعلم').replace(/[/\\?%*:|"<>]/g, '_').trim();
  const filename = `تقرير_حصص_الأستاذ_${safeTeacherName}_${summary.year}_شهر_${summary.month}.pdf`;
  const htmlContent = generateTeacherMonthlySessionsReportHTML(summary);

  // Create an in-document container positioned behind UI to ensure html2canvas can measure geometry and render all text & tables
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
    // Brief settle time for fonts and styles
    await new Promise(r => setTimeout(r, 450));

    const actualWidth = 840;
    const actualHeight = Math.max(container.scrollHeight, container.offsetHeight, 1188);

    // Capture using html2canvas with scale 2 for crisp vector-like text
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

    // Remaining pages if long
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (err) {
    console.warn('html2canvas render failed, falling back to print dialog:', err);
    printTeacherMonthlySessionsReport(summary);
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
