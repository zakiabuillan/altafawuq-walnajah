import { jsPDF } from 'jspdf';
import { Expense, Session, Student, Teacher, Payment, StudentCredit, GroupCourse, calculateTeacherSessionPayout, isTrialSession } from '../types';
import { getCategoryMeta, PAYMENT_METHODS } from '../components/OperatingExpensesManager';
import { getStudentDefaultHourlyRate } from './sessionPricing';

export interface MonthlyFinancialReportData {
  year: number;
  month: number;
  managerName?: string;
  academyName?: string;
  sessions: Session[];
  expenses: Expense[];
  teachers: Teacher[];
  students: Student[];
  assignments?: any[];
  payments: Payment[];
  credits: StudentCredit[];
  groupCourses?: GroupCourse[];
  globalSettings?: any;
}

export interface ComputedMonthlyFinancialSummary {
  year: number;
  month: number;
  monthNameArabic: string;
  startDateStr: string;
  endDateStr: string;
  
  // Teaching Revenues & Costs
  totalTeachingRevenue: number;
  totalTeacherPayouts: number;
  grossTeachingProfit: number;
  grossMarginPercentage: number;
  
  // Operating Expenses
  totalOperatingExpenses: number;
  expensesByCategory: Array<{
    category: string;
    categoryName: string;
    amount: number;
    count: number;
    percentage: number;
    color: string;
  }>;
  expensesList: Array<{
    id: string;
    date: string;
    title: string;
    category: string;
    categoryName: string;
    amount: number;
    paymentMethod: string;
    paymentMethodName: string;
    paidTo: string;
    invoiceRef: string;
    note: string;
  }>;

  // Realized Net Profit
  netRealizedProfit: number;
  netProfitMarginPercentage: number;

  // Cash Flow & Liquidity
  totalStudentDeposits: number;
  totalTeacherPaymentsPaid: number;
  netCashFlow: number;

  // Volumes
  totalHoursTaught: number;
  totalSessionsCount: number;
  activeStudentsCount: number;
  activeTeachersCount: number;

  // Teacher Breakdown
  teacherBreakdown: Array<{
    id: string;
    name: string;
    hours: number;
    sessionsCount: number;
    revenue: number;
    payout: number;
    netProfit: number;
    paid: number;
  }>;

  // Subject / Course Breakdown
  subjectBreakdown: Array<{
    name: string;
    type: 'فردية' | 'جماعية';
    hours: number;
    sessionsCount: number;
    studentsCount: number;
    revenue: number;
    payout: number;
    netProfit: number;
  }>;
}

export const ARABIC_MONTH_NAMES = [
  'يناير (1)', 'فبراير (2)', 'مارس (3)', 'أبريل (4)', 'مايو (5)', 'يونيو (6)',
  'يوليو (7)', 'أغسطس (8)', 'سبتمبر (9)', 'أكتوبر (10)', 'نوفمبر (11)', 'ديسمبر (12)'
];

/**
 * Calculates comprehensive monthly financial performance data
 */
export function computeMonthlyFinancialReport(data: MonthlyFinancialReportData): ComputedMonthlyFinancialSummary {
  const {
    year,
    month,
    sessions = [],
    expenses = [],
    teachers = [],
    students = [],
    assignments = [],
    payments = [],
    credits = [],
    groupCourses = [],
    globalSettings = {}
  } = data;

  const monthStr = String(month).padStart(2, '0');
  const monthPrefix = `${year}-${monthStr}`;
  const lastDay = new Date(year, month, 0).getDate();
  const startDateStr = `${year}-${monthStr}-01`;
  const endDateStr = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
  const monthNameArabic = ARABIC_MONTH_NAMES[month - 1] || `شهر ${month}`;

  // 1. Filter approved sessions for the month
  const monthSessions = sessions.filter(s => {
    if (!s.date || s.approved === false) return false;
    return s.date.startsWith(monthPrefix);
  });

  // Rate helpers
  const getStudentRate = (studentId: string, teacherId: string) => {
    const student = students.find(st => st.id === studentId);
    const teacher = teachers.find(t => t.id === teacherId);
    return getStudentDefaultHourlyRate(student, globalSettings, teacher);
  };

  const defaultTeacherRate = globalSettings?.defaultTeacherHourlyRate || 35;

  // Compute teaching revenues & teacher payouts
  let totalTeachingRevenue = 0;
  let totalTeacherPayouts = 0;
  let totalHoursTaught = 0;

  const teacherMap: Record<string, {
    hours: number;
    sessionsCount: number;
    revenue: number;
    payout: number;
  }> = {};

  const subjectMap: Record<string, {
    hours: number;
    sessionsCount: number;
    studentIds: Set<string>;
    revenue: number;
    payout: number;
    type: 'فردية' | 'جماعية';
  }> = {};

  const activeStudentIds = new Set<string>();
  const activeTeacherIds = new Set<string>();

  monthSessions.forEach(s => {
    const hours = Number(s.durationHours) || 0;
    totalHoursTaught += hours;
    
    if (s.studentId) activeStudentIds.add(s.studentId);
    if (s.teacherId) activeTeacherIds.add(s.teacherId);

    const isTrial = isTrialSession(s);
    const sFee = isTrial ? 0 : (s.customFee !== undefined && s.customFee !== null ? Number(s.customFee) : hours * getStudentRate(s.studentId, s.teacherId));
    const teacherObj = teachers.find(t => t.id === s.teacherId);
    const tPayout = calculateTeacherSessionPayout(s, teacherObj, assignments, defaultTeacherRate);

    totalTeachingRevenue += sFee;
    totalTeacherPayouts += tPayout;

    // By teacher
    if (s.teacherId) {
      if (!teacherMap[s.teacherId]) {
        teacherMap[s.teacherId] = { hours: 0, sessionsCount: 0, revenue: 0, payout: 0 };
      }
      teacherMap[s.teacherId].hours += hours;
      teacherMap[s.teacherId].sessionsCount += 1;
      teacherMap[s.teacherId].revenue += sFee;
      teacherMap[s.teacherId].payout += tPayout;
    }

    // By subject
    const subName = s.subject || (s.isGroupSession ? 'دورة جماعية' : 'مادة تعليمية عامة');
    if (!subjectMap[subName]) {
      subjectMap[subName] = {
        hours: 0,
        sessionsCount: 0,
        studentIds: new Set<string>(),
        revenue: 0,
        payout: 0,
        type: s.isGroupSession ? 'جماعية' : 'فردية'
      };
    }
    subjectMap[subName].hours += hours;
    subjectMap[subName].sessionsCount += 1;
    if (s.studentId) subjectMap[subName].studentIds.add(s.studentId);
    subjectMap[subName].revenue += sFee;
    subjectMap[subName].payout += tPayout;
  });

  const grossTeachingProfit = totalTeachingRevenue - totalTeacherPayouts;
  const grossMarginPercentage = totalTeachingRevenue > 0 
    ? (grossTeachingProfit / totalTeachingRevenue) * 100 
    : 0;

  // 2. Filter Operating Expenses for the month
  const monthExpenses = expenses.filter(e => {
    if (!e.date) return false;
    return e.date.startsWith(monthPrefix);
  }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  let totalOperatingExpenses = 0;
  const catTotalMap: Record<string, { amount: number; count: number }> = {};

  const expensesList = monthExpenses.map(e => {
    const amt = Number(e.amount) || 0;
    totalOperatingExpenses += amt;

    const catKey = e.category || 'funding';
    if (!catTotalMap[catKey]) {
      catTotalMap[catKey] = { amount: 0, count: 0 };
    }
    catTotalMap[catKey].amount += amt;
    catTotalMap[catKey].count += 1;

    const catMeta = getCategoryMeta(catKey);
    const payMeta = PAYMENT_METHODS.find(p => p.id === e.paymentMethod);

    return {
      id: e.id,
      date: e.date,
      title: e.title || e.note || catMeta.defaultTitle,
      category: catKey,
      categoryName: catMeta.name,
      amount: amt,
      paymentMethod: e.paymentMethod || 'cash',
      paymentMethodName: payMeta?.name || 'نقدي',
      paidTo: e.paidTo || '-',
      invoiceRef: e.invoiceRef || '-',
      note: e.note || ''
    };
  });

  const expensesByCategory = Object.entries(catTotalMap).map(([catId, item]) => {
    const meta = getCategoryMeta(catId);
    const percentage = totalOperatingExpenses > 0 ? (item.amount / totalOperatingExpenses) * 100 : 0;
    return {
      category: catId,
      categoryName: meta.name,
      amount: item.amount,
      count: item.count,
      percentage,
      color: meta.color
    };
  }).sort((a, b) => b.amount - a.amount);

  // 3. Realized Net Profit (الربح التشغيلي الصافي الفعلي بعد خصم كافة المصاريف وأجور المعلمين)
  const netRealizedProfit = grossTeachingProfit - totalOperatingExpenses;
  const netProfitMarginPercentage = totalTeachingRevenue > 0
    ? (netRealizedProfit / totalTeachingRevenue) * 100
    : 0;

  // 4. Cash deposits and payouts
  const totalStudentDeposits = credits.filter(c => {
    if (!c.date) return false;
    return c.date.startsWith(monthPrefix);
  }).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const monthTeacherPayments = payments.filter(p => {
    const pDate = p.date || ((p as any).createdAt ? (p as any).createdAt.split('T')[0] : '');
    return pDate && pDate.startsWith(monthPrefix);
  });

  const totalTeacherPaymentsPaid = monthTeacherPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const netCashFlow = totalStudentDeposits - totalTeacherPaymentsPaid - totalOperatingExpenses;

  // Teacher breakdown list
  const teacherBreakdown = Object.entries(teacherMap).map(([tId, tData]) => {
    const tObj = teachers.find(t => t.id === tId);
    const paid = monthTeacherPayments.filter(p => p.teacherId === tId).reduce((s, p) => s + (Number(p.amount) || 0), 0);
    return {
      id: tId,
      name: tObj?.name || 'معلم غير مسجل',
      hours: tData.hours,
      sessionsCount: tData.sessionsCount,
      revenue: tData.revenue,
      payout: tData.payout,
      netProfit: tData.revenue - tData.payout,
      paid
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // Subject breakdown list
  const subjectBreakdown = Object.entries(subjectMap).map(([subName, subData]) => {
    return {
      name: subName,
      type: subData.type,
      hours: subData.hours,
      sessionsCount: subData.sessionsCount,
      studentsCount: subData.studentIds.size,
      revenue: subData.revenue,
      payout: subData.payout,
      netProfit: subData.revenue - subData.payout
    };
  }).sort((a, b) => b.revenue - a.revenue);

  return {
    year,
    month,
    monthNameArabic,
    startDateStr,
    endDateStr,
    totalTeachingRevenue,
    totalTeacherPayouts,
    grossTeachingProfit,
    grossMarginPercentage,
    totalOperatingExpenses,
    expensesByCategory,
    expensesList,
    netRealizedProfit,
    netProfitMarginPercentage,
    totalStudentDeposits,
    totalTeacherPaymentsPaid,
    netCashFlow,
    totalHoursTaught,
    totalSessionsCount: monthSessions.length,
    activeStudentsCount: activeStudentIds.size,
    activeTeachersCount: activeTeacherIds.size,
    teacherBreakdown,
    subjectBreakdown
  };
}

/**
 * Builds HTML template for high-res PDF generation & print view
 */
export function generateMonthlyFinancialReportHTML(
  summary: ComputedMonthlyFinancialSummary,
  options: {
    academyName?: string;
    managerName?: string;
    generatedAt?: string;
  } = {}
): string {
  const {
    academyName = 'أكاديمية التفوق للتعليم والتدريب والاستشارات',
    managerName = 'أ. زكي أبو علان (المدير العام)',
    generatedAt = new Date().toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' })
  } = options;

  const isProfitPositive = summary.netRealizedProfit >= 0;
  const netProfitFormatted = Math.abs(summary.netRealizedProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const netSign = isProfitPositive ? '+' : '-';

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>التقرير المالي الشهري الشامل - ${summary.monthNameArabic} ${summary.year}</title>
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
      font-size: 12px;
      line-height: 1.5;
      direction: rtl;
    }

    @page {
      size: A4 portrait;
      margin: 12mm 10mm 15mm 10mm;
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
      padding-bottom: 14px;
      margin-bottom: 18px;
    }

    .brand-title {
      font-size: 22px;
      font-weight: 900;
      color: #0d365a;
      margin: 0 0 4px 0;
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
      padding: 8px 14px;
      border-radius: 8px;
    }

    .header-badge-title {
      font-size: 13px;
      font-weight: 800;
      color: #0d365a;
      margin: 0 0 3px 0;
    }

    .header-badge-meta {
      font-size: 10px;
      color: #64748b;
      margin: 0;
    }

    /* Main Title Banner */
    .title-banner {
      background: linear-gradient(135deg, #0d365a 0%, #1e40af 100%);
      color: #ffffff;
      padding: 14px 18px;
      border-radius: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 18px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }

    .title-banner h1 {
      font-size: 18px;
      font-weight: 900;
      margin: 0 0 4px 0;
    }

    .title-banner p {
      font-size: 11px;
      color: #cbd5e1;
      margin: 0;
    }

    .period-badge {
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.3);
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 800;
      text-align: center;
    }

    /* KPI Summary Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }

    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      background: #f8fafc;
    }

    .kpi-card.highlight-profit {
      background: ${isProfitPositive ? '#f0fdf4' : '#fef2f2'};
      border: 2px solid ${isProfitPositive ? '#16a34a' : '#dc2626'};
    }

    .kpi-card.highlight-revenue {
      background: #eff6ff;
      border: 1px solid #93c5fd;
    }

    .kpi-card.highlight-expenses {
      background: #fffbeb;
      border: 1px solid #fde68a;
    }

    .kpi-label {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 4px;
    }

    .kpi-value {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
    }

    .kpi-value.positive {
      color: #15803d;
    }

    .kpi-value.negative {
      color: #b91c1c;
    }

    .kpi-sub {
      font-size: 9px;
      color: #64748b;
      margin-top: 3px;
      font-weight: 600;
    }

    /* Section Styling */
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #0d365a;
      padding-bottom: 5px;
      margin: 18px 0 10px 0;
    }

    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #0d365a;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .section-meta {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 11px;
    }

    th {
      background: #0d365a;
      color: #ffffff;
      font-weight: 800;
      text-align: right;
      padding: 7px 9px;
      border: 1px solid #0d365a;
    }

    td {
      padding: 6px 9px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    .num-cell {
      font-weight: 700;
      direction: ltr;
      text-align: right;
      font-family: monospace, sans-serif;
    }

    .total-row td {
      background: #f1f5f9 !important;
      font-weight: 900;
      border-top: 2px solid #0d365a;
      color: #0d365a;
    }

    /* Income Statement Box */
    .income-statement {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 18px;
    }

    .income-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 14px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 11px;
    }

    .income-row.highlight-subtotal {
      background: #f8fafc;
      font-weight: 800;
      color: #0d365a;
      border-top: 1px solid #cbd5e1;
      border-bottom: 1px solid #cbd5e1;
    }

    .income-row.highlight-grand {
      background: ${isProfitPositive ? '#f0fdf4' : '#fef2f2'};
      font-size: 13px;
      font-weight: 900;
      color: ${isProfitPositive ? '#166534' : '#991b1b'};
      border-top: 2px solid ${isProfitPositive ? '#16a34a' : '#dc2626'};
    }

    /* Category Badges & Distributions */
    .category-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
    }

    .cat-pill {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 5px 10px;
      font-size: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .cat-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    /* Signatures Footer */
    .signatures-block {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 25px;
      padding-top: 15px;
      border-top: 2px dashed #cbd5e1;
      page-break-inside: avoid;
    }

    .sig-box {
      text-align: center;
      padding: 8px;
    }

    .sig-role {
      font-size: 11px;
      font-weight: 800;
      color: #0d365a;
      margin-bottom: 25px;
    }

    .sig-line {
      border-top: 1px solid #94a3b8;
      padding-top: 6px;
      font-size: 10px;
      font-weight: 700;
      color: #475569;
    }

    .page-break {
      page-break-before: always;
    }

    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 800;
    }
    .badge-cash { background: #dcfce7; color: #166534; }
    .badge-bank { background: #dbeafe; color: #1e40af; }
    .badge-card { background: #f3e8ff; color: #6b21a8; }
    .badge-check { background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header -->
    <div class="report-header">
      <div>
        <h2 class="brand-title">${academyName}</h2>
        <p class="brand-subtitle">نظام الإدارة والتدقيق المحاسبي والمالي المعتمد</p>
      </div>
      <div class="header-badge">
        <div class="header-badge-title">وثيقة مالية معتمدة</div>
        <div class="header-badge-meta">تاريخ الاستخراج: ${generatedAt}</div>
        <div class="header-badge-meta">المسؤول: ${managerName}</div>
      </div>
    </div>

    <!-- Title Banner -->
    <div class="title-banner">
      <div>
        <h1>التقرير المالي الشهري الشامل وتحليل الأرباح والمصاريف</h1>
        <p>ملخص الإيرادات المحققة، أتعاب المعلمين، والمصاريف التشغيلية للمركز</p>
      </div>
      <div class="period-badge">
        ${summary.monthNameArabic} ${summary.year} <br/>
        <span style="font-size: 10px; font-weight: 600; opacity: 0.9;">(${summary.startDateStr} إلى ${summary.endDateStr})</span>
      </div>
    </div>

    <!-- KPI Summary Cards -->
    <div class="kpi-grid">
      <div class="kpi-card highlight-revenue">
        <div class="kpi-label">إجمالي إيرادات التعليم والدروس</div>
        <div class="kpi-value">₪${summary.totalTeachingRevenue.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>
        <div class="kpi-sub">${summary.totalHoursTaught.toFixed(1)} ساعة تدريسية (${summary.totalSessionsCount} حصة)</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-label">إجمالي أجور ومستحقات المعلمين</div>
        <div class="kpi-value">₪${summary.totalTeacherPayouts.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>
        <div class="kpi-sub">تغطي ${summary.activeTeachersCount} معلماً نشطاً بالشهر</div>
      </div>

      <div class="kpi-card highlight-expenses">
        <div class="kpi-label">إجمالي المصاريف التشغيلية للمركز</div>
        <div class="kpi-value">₪${summary.totalOperatingExpenses.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</div>
        <div class="kpi-sub">${summary.expensesList.length} سند صرف وفاتورة تشغيلية</div>
      </div>

      <div class="kpi-card highlight-profit">
        <div class="kpi-label">صافي الأرباح المحققة الفعلية</div>
        <div class="kpi-value ${isProfitPositive ? 'positive' : 'negative'}">${netSign} ₪${netProfitFormatted}</div>
        <div class="kpi-sub">هامش الربح الصافي: ${summary.netProfitMarginPercentage.toFixed(1)}%</div>
      </div>
    </div>

    <!-- Income Statement & Realized Profit Summary -->
    <div class="section-header">
      <div class="section-title">📊 قائمة الدخل والأرباح التشغيلية لشهر ${summary.monthNameArabic} ${summary.year}</div>
      <div class="section-meta">قائمة الأرباح والخسائر الرسمية (P&L)</div>
    </div>

    <div class="income-statement">
      <div class="income-row">
        <span>(+) إجمالي الإيرادات المكتسبة من الحصص والدورات التعليمية</span>
        <span class="num-cell">₪${summary.totalTeachingRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>
      <div class="income-row">
        <span>(-) إجمالي تكلفة التدريس المباشرة (أجور ومستحقات المدرسين المعتمدة)</span>
        <span class="num-cell" style="color: #b91c1c;">( ₪${summary.totalTeacherPayouts.toLocaleString('en-US', { minimumFractionDigits: 2 })} )</span>
      </div>
      <div class="income-row highlight-subtotal">
        <span>(=) مجمل الربح التشغيلي التدريسي (Gross Teaching Profit)</span>
        <span class="num-cell">₪${summary.grossTeachingProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })} (هامش: ${summary.grossMarginPercentage.toFixed(1)}%)</span>
      </div>
      <div class="income-row">
        <span>(-) إجمالي المصاريف التشغيلية للمركز (الإيجار، الفواتير، التسويق، الصيانة، القرطاسية...)</span>
        <span class="num-cell" style="color: #b91c1c;">( ₪${summary.totalOperatingExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })} )</span>
      </div>
      <div class="income-row highlight-grand">
        <span>(=) صافي الأرباح التشغيلية المحققة للمركز (Net Realized Operating Profit)</span>
        <span class="num-cell">${netSign} ₪${netProfitFormatted}</span>
      </div>
    </div>

    <!-- Operating Expenses Summary by Category -->
    <div class="section-header">
      <div class="section-title">🏢 تحليل وتوزيع المصاريف التشغيلية حسب الفئات</div>
      <div class="section-meta">إجمالي: ₪${summary.totalOperatingExpenses.toLocaleString('en-US', { minimumFractionDigits: 1 })}</div>
    </div>

    <div class="category-pills">
      ${summary.expensesByCategory.length === 0 ? '<div style="color: #64748b; padding: 6px;">لا توجد أي مصاريف تشغيلية مقيدة خلال هذا الشهر.</div>' : summary.expensesByCategory.map(cat => `
        <div class="cat-pill">
          <span class="cat-dot" style="background: ${cat.color};"></span>
          <strong>${cat.categoryName}:</strong>
          <span>₪${cat.amount.toLocaleString('en-US', { minimumFractionDigits: 1 })}</span>
          <span style="color: #64748b;">(${cat.percentage.toFixed(1)}%)</span>
        </div>
      `).join('')}
    </div>

    <!-- Detailed Operating Expenses Table -->
    <div class="section-header">
      <div class="section-title">📋 كشف فواتير وسندات المصاريف التشغيلية المقيدة بالشهر</div>
      <div class="section-meta">${summary.expensesList.length} سند صرف</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 35px; text-align: center;">م</th>
          <th style="width: 80px;">التاريخ</th>
          <th>بيان / عنوان المصروف</th>
          <th style="width: 140px;">فئة المصروف</th>
          <th style="width: 110px;">الجهة المستلمة / الفاتورة</th>
          <th style="width: 90px; text-align: center;">طريقة الدفع</th>
          <th style="width: 95px; text-align: right;">المبلغ (₪)</th>
        </tr>
      </thead>
      <tbody>
        ${summary.expensesList.length === 0 ? `
          <tr>
            <td colspan="7" style="text-align: center; color: #94a3b8; padding: 14px;">لا توجد مصاريف تشغيلية مسجلة لهذا الشهر.</td>
          </tr>
        ` : summary.expensesList.map((exp, idx) => `
          <tr>
            <td style="text-align: center; color: #64748b;">${idx + 1}</td>
            <td class="num-cell" style="font-size: 10px;">${exp.date}</td>
            <td><strong>${exp.title}</strong>${exp.note ? `<div style="font-size: 9px; color: #64748b;">${exp.note}</div>` : ''}</td>
            <td><span style="color: #0d365a; font-weight: 700;">${exp.categoryName}</span></td>
            <td style="font-size: 10px;">${exp.paidTo !== '-' ? exp.paidTo : ''} ${exp.invoiceRef !== '-' ? `(فاتورة: ${exp.invoiceRef})` : ''}</td>
            <td style="text-align: center;"><span class="badge ${exp.paymentMethod === 'cash' ? 'badge-cash' : exp.paymentMethod === 'bank_transfer' ? 'badge-bank' : 'badge-card'}">${exp.paymentMethodName}</span></td>
            <td class="num-cell" style="font-weight: 800; color: #b91c1c;">₪${exp.amount.toLocaleString('en-US', { minimumFractionDigits: 1 })}</td>
          </tr>
        `).join('')}
      </tbody>
      ${summary.expensesList.length > 0 ? `
        <tfoot>
          <tr class="total-row">
            <td colspan="6" style="text-align: left; font-weight: 800;">مجموع المصاريف التشغيلية المسجلة:</td>
            <td class="num-cell" style="font-size: 12px; color: #b91c1c;">₪${summary.totalOperatingExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          </tr>
        </tfoot>
      ` : ''}
    </table>

    <!-- Teachers Performance and Salaries Summary -->
    <div class="section-header" style="margin-top: 20px;">
      <div class="section-title">👨‍🏫 ملخص أجور وأداء المعلمين والأرباح الناتجة عن الحصص</div>
      <div class="section-meta">${summary.teacherBreakdown.length} معلم</div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 35px; text-align: center;">م</th>
          <th>اسم المعلم</th>
          <th style="width: 75px; text-align: center;">الساعات</th>
          <th style="width: 65px; text-align: center;">الحصص</th>
          <th style="width: 100px; text-align: right;">إيرادات الحصص (₪)</th>
          <th style="width: 100px; text-align: right;">مستحقات المعلم (₪)</th>
          <th style="width: 100px; text-align: right;">صافي الربح للمركز (₪)</th>
        </tr>
      </thead>
      <tbody>
        ${summary.teacherBreakdown.length === 0 ? `
          <tr>
            <td colspan="7" style="text-align: center; color: #94a3b8; padding: 14px;">لا توجد حصص منجزة للمعلمين في هذا الشهر.</td>
          </tr>
        ` : summary.teacherBreakdown.map((t, idx) => `
          <tr>
            <td style="text-align: center; color: #64748b;">${idx + 1}</td>
            <td><strong>${t.name}</strong></td>
            <td class="num-cell" style="text-align: center;">${t.hours.toFixed(1)} س</td>
            <td class="num-cell" style="text-align: center;">${t.sessionsCount}</td>
            <td class="num-cell" style="color: #1e40af;">₪${t.revenue.toLocaleString('en-US', { minimumFractionDigits: 1 })}</td>
            <td class="num-cell" style="color: #b91c1c;">₪${t.payout.toLocaleString('en-US', { minimumFractionDigits: 1 })}</td>
            <td class="num-cell" style="color: #15803d; font-weight: 800;">₪${t.netProfit.toLocaleString('en-US', { minimumFractionDigits: 1 })}</td>
          </tr>
        `).join('')}
      </tbody>
      ${summary.teacherBreakdown.length > 0 ? `
        <tfoot>
          <tr class="total-row">
            <td colspan="2" style="text-align: right; font-weight: 800;">مجموع الساعات الكلي لجميع الحصص المسجلة:</td>
            <td class="num-cell" style="text-align: center; font-weight: 900; color: #1d4ed8; background: #e0f2fe;">${(summary.totalHoursTaught || 0).toFixed(1)} س</td>
            <td class="num-cell" style="text-align: center; font-weight: 800;">${summary.totalSessionsCount || 0}</td>
            <td class="num-cell">₪${summary.totalTeachingRevenue.toLocaleString('en-US', { minimumFractionDigits: 1 })}</td>
            <td class="num-cell" style="color: #b91c1c;">₪${summary.totalTeacherPayouts.toLocaleString('en-US', { minimumFractionDigits: 1 })}</td>
            <td class="num-cell" style="color: #15803d;">₪${summary.grossTeachingProfit.toLocaleString('en-US', { minimumFractionDigits: 1 })}</td>
          </tr>
        </tfoot>
      ` : ''}
    </table>

    <!-- Signatures and Approval -->
    <div class="signatures-block">
      <div class="sig-box">
        <div class="sig-role">إعداد القسم المالي والمحاسبي</div>
        <div class="sig-line">التوقيع والتاريخ</div>
      </div>
      <div class="sig-box">
        <div class="sig-role">مراجعة وتدقيق الحسابات</div>
        <div class="sig-line">التوقيع والتاريخ</div>
      </div>
      <div class="sig-box">
        <div class="sig-role">اعتماد وختم المدير العام</div>
        <div class="sig-line">${managerName}</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Direct Print / Preview using an isolated invisible iframe
 */
export function printMonthlyFinancialReport(
  summary: ComputedMonthlyFinancialSummary,
  options: { academyName?: string; managerName?: string } = {}
): void {
  const html = generateMonthlyFinancialReportHTML(summary, options);
  
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
      console.error('Error printing report:', e);
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
 * High-definition PDF generation and download
 */
export async function downloadMonthlyFinancialReportPDF(
  summary: ComputedMonthlyFinancialSummary,
  options: { academyName?: string; managerName?: string } = {}
): Promise<void> {
  try {
    const filename = `التقرير_المالي_الشهري_أكاديمية_التفوق_${summary.year}_شهر_${summary.month}.pdf`;
    const htmlContent = generateMonthlyFinancialReportHTML(summary, options);

    // Create an offscreen rendering container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px'; // standard A4 width in px at 96 DPI
    container.style.background = '#ffffff';
    container.style.padding = '0';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    // Wait a brief tick for fonts & styles to settle
    await new Promise(r => setTimeout(r, 400));

    // Convert to PDF using jsPDF html method or offscreen canvas
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    await pdf.html(container, {
      callback: (doc) => {
        doc.save(filename);
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      },
      margin: [20, 20, 20, 20],
      autoPaging: 'text',
      x: 0,
      y: 0,
      width: 555, // A4 printable width in pt
      windowWidth: 794
    });
  } catch (err) {
    console.warn('jsPDF HTML render fallback to print dialog:', err);
    printMonthlyFinancialReport(summary, options);
  }
}
