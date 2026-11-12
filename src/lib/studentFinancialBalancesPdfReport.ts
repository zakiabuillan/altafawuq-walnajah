import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Student, Session, Teacher, StudentCredit } from '../types';
import { getStudentDefaultHourlyRate } from './sessionPricing';

export interface StudentFinancialBalancesReportParams {
  students: Student[];
  sessions?: Session[];
  credits?: StudentCredit[];
  teachers?: Teacher[];
  globalSettings?: any;
  managerName?: string;
  academyName?: string;
  filterType?: 'all' | 'debtors' | 'creditors' | 'balanced';
  stageFilter?: string; // 'all' | 'secondary' | 'middle' | 'primary'
  sortBy?: 'debt_desc' | 'balance_desc' | 'name_asc' | 'spent_desc';
}

export interface StudentFinancialRow {
  studentId: string;
  name: string;
  grade: string;
  stageKey: 'secondary' | 'middle' | 'primary' | 'other';
  stageName: string;
  phone: string;
  totalToppedUp: number;
  totalSpent: number;
  balance: number;
  statusText: string;
  statusClass: 'debt' | 'credit' | 'balanced';
  sessionsCount: number;
  totalHours: number;
  archived: boolean;
  notes: string;
}

export interface StageStatSummary {
  stageKey: string;
  stageName: string;
  count: number;
  totalDebt: number;
  totalCredit: number;
  net: number;
}

export interface ComputedStudentFinancialBalancesSummary {
  generatedDate: string;
  generatedTime: string;
  managerName: string;
  academyName: string;
  totalStudentsOriginal: number;
  totalStudentsFiltered: number;
  
  // High-level aggregates
  totalDebtAmount: number;     // Sum of all negative balances (absolute value)
  totalCreditAmount: number;   // Sum of all positive balances
  netBalance: number;          // totalCreditAmount - totalDebtAmount
  totalToppedUpAll: number;    // Cumulative deposits
  totalSpentAll: number;       // Cumulative session expenses

  // Counts
  debtorsCount: number;
  creditorsCount: number;
  balancedCount: number;
  debtorsPercentage: number;
  creditorsPercentage: number;

  // Highlights
  highestDebtStudent?: { name: string; amount: number; grade: string };
  highestCreditStudent?: { name: string; amount: number; grade: string };

  // Stages
  stages: StageStatSummary[];

  // Rows for table
  rows: StudentFinancialRow[];

  // Filters info
  filterType: 'all' | 'debtors' | 'creditors' | 'balanced';
  stageFilter: string;
  sortBy: string;
}

// Arabic normalization helper
const normalizeArabic = (text: string = ''): string => {
  return text
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .trim();
};

export const detectStudentAcademicStage = (gradeStr: string = ''): 'secondary' | 'middle' | 'primary' | 'other' => {
  const norm = normalizeArabic(gradeStr);
  if (
    norm.includes('ثانوي') ||
    norm.includes('توجيهي') || 
    norm.includes('ثانويه عامه') || 
    norm.includes('بجروت') ||
    norm.includes('12') || 
    norm.includes('ثاني عشر') || 
    norm.includes('بكالوريا') || 
    norm.includes('علمي') || 
    norm.includes('ادبي') || 
    norm.includes('صناعي') || 
    norm.includes('رياده') ||
    norm.includes('عاشر') || 
    norm.includes('اول ثانوي') || 
    norm.includes('10') || 
    norm.includes('11') || 
    norm.includes('حادي عشر')
  ) {
    return 'secondary';
  }
  if (
    norm.includes('سابع') || 
    norm.includes('ثامن') || 
    norm.includes('تاسع') || 
    norm.includes('7') || 
    norm.includes('8') || 
    norm.includes('9') || 
    norm.includes('اعدادي') || 
    norm.includes('متوسط')
  ) {
    return 'middle';
  }
  if (
    norm.includes('اول') || 
    norm.includes('ثاني') || 
    norm.includes('ثالث') || 
    norm.includes('رابع') || 
    norm.includes('خامس') || 
    norm.includes('سادس') || 
    norm.includes('1') || 
    norm.includes('2') || 
    norm.includes('3') || 
    norm.includes('4') || 
    norm.includes('5') || 
    norm.includes('6') || 
    norm.includes('ابتدائي') || 
    norm.includes('اساسي')
  ) {
    return 'primary';
  }
  return 'other';
};

const getStageDisplayName = (key: string): string => {
  switch (key) {
    case 'secondary': return 'المرحلة الثانوية (10-12)';
    case 'middle': return 'المرحلة الإعدادية (7-9)';
    case 'primary': return 'المرحلة الأساسية (1-6)';
    default: return 'مراحل ومستويات أخرى';
  }
};

/**
 * Computes all financial aggregations and balances for the Director's report
 */
export function computeStudentFinancialBalancesSummary(
  params: StudentFinancialBalancesReportParams
): ComputedStudentFinancialBalancesSummary {
  const {
    students = [],
    sessions = [],
    credits = [],
    teachers = [],
    globalSettings,
    managerName = 'أ. زكي أبو علان (المدير العام)',
    academyName = 'أكاديمية التفوق أون لاين للتعليم والتدريب والاستشارات',
    filterType = 'all',
    stageFilter = 'all',
    sortBy = 'debt_desc'
  } = params;

  const now = new Date();
  const generatedDate = now.toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const generatedTime = now.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  // Calculate detailed financial row for each student
  const allRows: StudentFinancialRow[] = students.map(student => {
    let balance = typeof student.balance === 'number' ? student.balance : 0;
    let totalSpent = typeof (student as any).totalSpent === 'number' ? (student as any).totalSpent : 0;
    let totalToppedUp = typeof (student as any).totalToppedUp === 'number' ? (student as any).totalToppedUp : 0;
    let sessionsCount = typeof (student as any).sessionCount === 'number' ? (student as any).sessionCount : 0;
    let totalHours = typeof (student as any).totalHours === 'number' ? (student as any).totalHours : 0;

    // If sessions and credits arrays are provided and we need accurate recalculation:
    if (sessions.length > 0 || credits.length > 0) {
      const studentSessions = sessions.filter(s => s.studentId === student.id);
      const approvedSessions = studentSessions.filter(s => s.approved !== false && s.status !== 'pending' && s.status !== 'booked');
      const studentCredits = credits.filter(c => c.studentId === student.id);

      totalSpent = approvedSessions.reduce((sum, s) => {
        if (s.isGroupSession || s.isGroup) {
          if (s.customFee !== undefined && s.customFee > 0) return sum + s.customFee;
          return sum;
        }
        if (s.customFee !== undefined) return sum + s.customFee;
        const teacher = teachers.find(t => t.id === s.teacherId);
        const rate = getStudentDefaultHourlyRate(student, globalSettings, teacher);
        return sum + (s.durationHours * rate);
      }, 0);

      totalToppedUp = studentCredits.reduce((sum, c) => sum + c.amount, 0);
      balance = totalToppedUp - totalSpent;
      sessionsCount = approvedSessions.length;
      totalHours = approvedSessions.reduce((sum, s) => sum + s.durationHours, 0);
    }

    const stageKey = detectStudentAcademicStage(student.grade || student.academicLevel || '');
    const stageName = getStageDisplayName(stageKey);

    let statusText = 'متزن (0 ₪)';
    let statusClass: 'debt' | 'credit' | 'balanced' = 'balanced';

    if (balance < 0) {
      statusText = `مدين (مستحق ₪${Math.abs(balance).toLocaleString('en-US')})`;
      statusClass = 'debt';
    } else if (balance > 0) {
      statusText = `دائن (رصيد +₪${balance.toLocaleString('en-US')})`;
      statusClass = 'credit';
    }

    return {
      studentId: student.id,
      name: student.name || 'طالب غير معرّف',
      grade: student.grade || student.academicLevel || 'غير محدد',
      stageKey,
      stageName,
      phone: student.phone || student.phoneNumber || '-',
      totalToppedUp,
      totalSpent,
      balance,
      statusText,
      statusClass,
      sessionsCount,
      totalHours,
      archived: student.archived === true,
      notes: student.notes || ''
    };
  });

  // Calculate global summary across ALL students
  let totalDebtAmount = 0;
  let totalCreditAmount = 0;
  let totalToppedUpAll = 0;
  let totalSpentAll = 0;
  let debtorsCount = 0;
  let creditorsCount = 0;
  let balancedCount = 0;

  let highestDebtStudent: { name: string; amount: number; grade: string } | undefined;
  let highestCreditStudent: { name: string; amount: number; grade: string } | undefined;

  const stageAggregates: Record<string, { count: number; totalDebt: number; totalCredit: number }> = {
    secondary: { count: 0, totalDebt: 0, totalCredit: 0 },
    middle: { count: 0, totalDebt: 0, totalCredit: 0 },
    primary: { count: 0, totalDebt: 0, totalCredit: 0 },
    other: { count: 0, totalDebt: 0, totalCredit: 0 }
  };

  allRows.forEach(row => {
    totalToppedUpAll += row.totalToppedUp;
    totalSpentAll += row.totalSpent;

    const stg = stageAggregates[row.stageKey] || stageAggregates.other;
    stg.count++;

    if (row.balance < 0) {
      const debtVal = Math.abs(row.balance);
      totalDebtAmount += debtVal;
      debtorsCount++;
      stg.totalDebt += debtVal;

      if (!highestDebtStudent || debtVal > highestDebtStudent.amount) {
        highestDebtStudent = { name: row.name, amount: debtVal, grade: row.grade };
      }
    } else if (row.balance > 0) {
      totalCreditAmount += row.balance;
      creditorsCount++;
      stg.totalCredit += row.balance;

      if (!highestCreditStudent || row.balance > highestCreditStudent.amount) {
        highestCreditStudent = { name: row.name, amount: row.balance, grade: row.grade };
      }
    } else {
      balancedCount++;
    }
  });

  const netBalance = totalCreditAmount - totalDebtAmount;
  const totalStudentsOriginal = allRows.length;
  const debtorsPercentage = totalStudentsOriginal > 0 ? Math.round((debtorsCount / totalStudentsOriginal) * 100) : 0;
  const creditorsPercentage = totalStudentsOriginal > 0 ? Math.round((creditorsCount / totalStudentsOriginal) * 100) : 0;

  // Stages summary array
  const stages: StageStatSummary[] = ['secondary', 'middle', 'primary', 'other']
    .map(key => {
      const agg = stageAggregates[key];
      return {
        stageKey: key,
        stageName: getStageDisplayName(key),
        count: agg.count,
        totalDebt: agg.totalDebt,
        totalCredit: agg.totalCredit,
        net: agg.totalCredit - agg.totalDebt
      };
    })
    .filter(s => s.count > 0);

  // Apply filters
  let filteredRows = [...allRows];

  if (filterType === 'debtors') {
    filteredRows = filteredRows.filter(r => r.balance < 0);
  } else if (filterType === 'creditors') {
    filteredRows = filteredRows.filter(r => r.balance > 0);
  } else if (filterType === 'balanced') {
    filteredRows = filteredRows.filter(r => r.balance === 0);
  }

  if (stageFilter && stageFilter !== 'all') {
    filteredRows = filteredRows.filter(r => r.stageKey === stageFilter);
  }

  // Sorting
  filteredRows.sort((a, b) => {
    if (sortBy === 'debt_desc') {
      return a.balance - b.balance; // Most negative first
    }
    if (sortBy === 'balance_desc') {
      return b.balance - a.balance; // Most positive first
    }
    if (sortBy === 'spent_desc') {
      return b.totalSpent - a.totalSpent;
    }
    if (sortBy === 'name_asc') {
      return a.name.localeCompare(b.name, 'ar');
    }
    return 0;
  });

  return {
    generatedDate,
    generatedTime,
    managerName,
    academyName,
    totalStudentsOriginal,
    totalStudentsFiltered: filteredRows.length,
    totalDebtAmount,
    totalCreditAmount,
    netBalance,
    totalToppedUpAll,
    totalSpentAll,
    debtorsCount,
    creditorsCount,
    balancedCount,
    debtorsPercentage,
    creditorsPercentage,
    highestDebtStudent,
    highestCreditStudent,
    stages,
    rows: filteredRows,
    filterType,
    stageFilter,
    sortBy
  };
}

/**
 * Generates clean, publication-grade HTML document for printing and PDF rendering
 */
export function generateStudentFinancialBalancesReportHTML(summary: ComputedStudentFinancialBalancesSummary): string {
  const {
    generatedDate,
    generatedTime,
    managerName,
    academyName,
    totalStudentsOriginal,
    totalStudentsFiltered,
    totalDebtAmount,
    totalCreditAmount,
    netBalance,
    totalToppedUpAll,
    totalSpentAll,
    debtorsCount,
    creditorsCount,
    balancedCount,
    debtorsPercentage,
    creditorsPercentage,
    highestDebtStudent,
    highestCreditStudent,
    stages,
    rows,
    filterType
  } = summary;

  // Filter text description
  let filterDescription = 'كافة الطلاب المسجلين بالمنصة';
  if (filterType === 'debtors') filterDescription = 'الطلاب المدينون فقط (ذمم ومستحقات سالبة مطلوبة)';
  if (filterType === 'creditors') filterDescription = 'الطلاب الدائنون فقط (أرصدة فائضة موجبة)';
  if (filterType === 'balanced') filterDescription = 'الطلاب ذوو الأرصدة المتزنة (0 ₪)';

  // Calculate totals of currently rendered rows
  const visibleDebt = rows.reduce((sum, r) => sum + (r.balance < 0 ? Math.abs(r.balance) : 0), 0);
  const visibleCredit = rows.reduce((sum, r) => sum + (r.balance > 0 ? r.balance : 0), 0);
  const visibleSpent = rows.reduce((sum, r) => sum + r.totalSpent, 0);
  const visibleToppedUp = rows.reduce((sum, r) => sum + r.totalToppedUp, 0);
  const visibleNet = visibleCredit - visibleDebt;

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>التقرير المالي العام لأرصدة ومديونيات الطلاب - ${academyName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      font-family: 'Cairo', 'Tajawal', 'Almarai', 'Segoe UI Arabic', Tahoma, sans-serif;
    }
    body {
      background-color: #ffffff;
      color: #0f172a;
      direction: rtl;
      text-align: right;
      font-size: 11px;
      line-height: 1.5;
      padding: 0;
      margin: 0;
    }
    .report-container {
      width: 100%;
      max-width: 1000px;
      margin: 0 auto;
      padding: 24px 30px;
    }
    
    /* Header Styles */
    .header-banner {
      border-bottom: 2.5px solid #0d365a;
      padding-bottom: 16px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .academy-info {
      flex: 1;
    }
    .academy-name {
      font-size: 19px;
      font-weight: 900;
      color: #0d365a;
      letter-spacing: -0.3px;
    }
    .report-title {
      font-size: 15px;
      font-weight: 800;
      color: #d4a33c;
      margin-top: 3px;
      display: inline-block;
      background: #0d365a;
      color: #f8fafc;
      padding: 4px 12px;
      border-radius: 6px;
    }
    .report-subtitle {
      font-size: 10.5px;
      color: #475569;
      font-weight: 600;
      margin-top: 6px;
    }
    .header-meta {
      text-align: left;
      font-size: 9.5px;
      color: #334155;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 10px 14px;
      border-radius: 10px;
      min-width: 220px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-weight: 700;
    }
    .meta-row:last-child {
      margin-bottom: 0;
    }
    .meta-label {
      color: #64748b;
    }
    .meta-val {
      font-weight: 800;
      color: #0f172a;
    }

    /* Executive KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-card {
      border-radius: 12px;
      padding: 12px 14px;
      border: 1.5px solid #e2e8f0;
      position: relative;
    }
    .kpi-card.debt {
      background: #fff1f2;
      border-color: #fecdd3;
    }
    .kpi-card.credit {
      background: #ecfdf5;
      border-color: #a7f3d0;
    }
    .kpi-card.net {
      background: #f0fdfa;
      border-color: #99f6e4;
    }
    .kpi-card.volume {
      background: #f8fafc;
      border-color: #cbd5e1;
    }
    .kpi-title {
      font-size: 10.5px;
      font-weight: 800;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .kpi-card.debt .kpi-title { color: #9f1239; }
    .kpi-card.credit .kpi-title { color: #065f46; }
    .kpi-card.net .kpi-title { color: #115e59; }
    .kpi-card.volume .kpi-title { color: #1e293b; }

    .kpi-value {
      font-size: 20px;
      font-weight: 900;
      font-family: 'Almarai', 'Cairo', monospace, sans-serif;
      letter-spacing: -0.5px;
      margin: 3px 0;
    }
    .kpi-card.debt .kpi-value { color: #e11d48; }
    .kpi-card.credit .kpi-value { color: #059669; }
    .kpi-card.net .kpi-value { color: ${netBalance >= 0 ? '#0d9488' : '#e11d48'}; }
    .kpi-card.volume .kpi-value { color: #0f172a; }

    .kpi-foot {
      font-size: 9px;
      font-weight: 700;
      margin-top: 4px;
    }
    .kpi-card.debt .kpi-foot { color: #be123c; }
    .kpi-card.credit .kpi-foot { color: #047857; }
    .kpi-card.net .kpi-foot { color: #0f766e; }
    .kpi-card.volume .kpi-foot { color: #64748b; }

    /* Section Title */
    .section-title {
      font-size: 12.5px;
      font-weight: 900;
      color: #0d365a;
      border-right: 4px solid #d4a33c;
      padding-right: 8px;
      margin: 16px 0 10px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    /* Stages Summary Table */
    .stages-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 10px;
    }
    .stages-table th {
      background: #0d365a;
      color: #ffffff;
      padding: 7px 10px;
      font-weight: 800;
      text-align: right;
    }
    .stages-table td {
      padding: 7px 10px;
      border-bottom: 1px solid #e2e8f0;
      font-weight: 700;
    }
    .stages-table tr:nth-child(even) {
      background-color: #f8fafc;
    }

    /* Detailed Student Balances Table */
    .students-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 9.5px;
    }
    .students-table th {
      background: #1e293b;
      color: #ffffff;
      padding: 7px 8px;
      font-weight: 800;
      text-align: right;
      border-left: 1px solid #334155;
    }
    .students-table th:last-child {
      border-left: none;
    }
    .students-table td {
      padding: 6.5px 8px;
      border-bottom: 1px solid #e2e8f0;
      border-left: 1px solid #f1f5f9;
      vertical-align: middle;
    }
    .students-table td:last-child {
      border-left: none;
    }
    .students-table tr:nth-child(even) {
      background-color: #fafafa;
    }
    .students-table tr.highlight-debt {
      background-color: #fff5f5;
    }

    /* Table Badges & Cells */
    .num-cell {
      text-align: center;
      font-weight: 700;
      color: #64748b;
      width: 35px;
    }
    .student-name {
      font-weight: 800;
      color: #0f172a;
      font-size: 10px;
    }
    .grade-badge {
      display: inline-block;
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 5px;
      font-size: 8.5px;
    }
    .phone-cell {
      font-family: monospace;
      direction: ltr;
      text-align: center;
      font-weight: 700;
      color: #475569;
      font-size: 9px;
    }
    .money-cell {
      text-align: center;
      font-family: 'Almarai', monospace, sans-serif;
      font-weight: 800;
      font-size: 10px;
    }
    .badge-debt {
      display: inline-block;
      background: #fee2e2;
      color: #b91c1c;
      font-weight: 900;
      padding: 2px 7px;
      border-radius: 6px;
      border: 1px solid #fca5a5;
    }
    .badge-credit {
      display: inline-block;
      background: #dcfce7;
      color: #15803d;
      font-weight: 900;
      padding: 2px 7px;
      border-radius: 6px;
      border: 1px solid #86efac;
    }
    .badge-balanced {
      display: inline-block;
      background: #f1f5f9;
      color: #64748b;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 6px;
    }

    /* Table Footer Totals */
    .totals-row td {
      background: #0d365a !important;
      color: #ffffff !important;
      font-weight: 900 !important;
      font-size: 10.5px !important;
      border-top: 2px solid #d4a33c !important;
      padding: 10px 8px !important;
    }
    .totals-row .money-cell {
      color: #fef08a !important;
      font-size: 11px !important;
    }

    /* Signatures Block */
    .signatures-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 28px;
      padding-top: 16px;
      border-top: 1.5px dashed #cbd5e1;
    }
    .sig-card {
      text-align: center;
      padding: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
    }
    .sig-title {
      font-size: 10.5px;
      font-weight: 800;
      color: #0d365a;
      margin-bottom: 25px;
    }
    .sig-person {
      font-size: 10px;
      font-weight: 900;
      color: #1e293b;
      border-top: 1px solid #cbd5e1;
      padding-top: 8px;
      display: inline-block;
      min-width: 140px;
    }

    /* Footer Notice */
    .report-footer-note {
      margin-top: 22px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 8.5px;
      color: #64748b;
      font-weight: 700;
    }

    @media print {
      @page {
        size: A4 portrait;
        margin: 8mm 10mm;
      }
      body {
        background: transparent;
        padding: 0;
      }
      .report-container {
        padding: 0;
        max-width: 100%;
      }
      .no-print {
        display: none !important;
      }
      tr {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="report-container">
    
    <!-- 🏛️ Official Academy Header -->
    <div class="header-banner">
      <div class="academy-info">
        <h1 class="academy-name">${academyName}</h1>
        <div class="report-title">التقرير المالي العام لأرصدة ومديونيات الطلاب الموحد</div>
        <p class="report-subtitle">
          كشف رسمي محاسبي موثق يوضح إجمالي المستحقات والمديونيات وصافي المركز المالي لجميع حسابات الطلاب
        </p>
      </div>
      <div class="header-meta">
        <div class="meta-row">
          <span class="meta-label">تاريخ الاستخراج:</span>
          <span class="meta-val">${generatedDate}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">وقت التقرير:</span>
          <span class="meta-val">${generatedTime}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">اعتماد المدير:</span>
          <span class="meta-val">${managerName}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">نطاق الطلاب:</span>
          <span class="meta-val">${totalStudentsFiltered} من ${totalStudentsOriginal} طالب</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">نوع التصفية:</span>
          <span class="meta-val" style="color: #0d365a;">${filterDescription}</span>
        </div>
      </div>
    </div>

    <!-- 📊 Executive KPI Grid -->
    <div class="kpi-grid">
      <!-- 1. Total Debts -->
      <div class="kpi-card debt">
        <div class="kpi-title">
          <span>إجمالي المديونيات المستحقة (-)</span>
          <span style="font-size: 8.5px; background: #ffe4e6; padding: 1px 5px; border-radius: 4px;">ذمم سالبة</span>
        </div>
        <div class="kpi-value">-₪${totalDebtAmount.toLocaleString('en-US')}</div>
        <div class="kpi-foot">
          مستحقة على ${debtorsCount} طالب (${debtorsPercentage}% من الطلاب)
        </div>
      </div>

      <!-- 2. Total Credits -->
      <div class="kpi-card credit">
        <div class="kpi-title">
          <span>إجمالي المستحقات والأرصدة (+)</span>
          <span style="font-size: 8.5px; background: #d1fae5; padding: 1px 5px; border-radius: 4px;">أرصدة فائضة</span>
        </div>
        <div class="kpi-value">+₪${totalCreditAmount.toLocaleString('en-US')}</div>
        <div class="kpi-foot">
          لصالح ${creditorsCount} طالب (${creditorsPercentage}% من الطلاب)
        </div>
      </div>

      <!-- 3. Net Center Position -->
      <div class="kpi-card net">
        <div class="kpi-title">
          <span>صافي المركز المالي للطلاب</span>
          <span style="font-size: 8.5px; background: #ccfbf1; padding: 1px 5px; border-radius: 4px;">
            ${netBalance >= 0 ? 'فائض سيولة' : 'عجز مديونيات'}
          </span>
        </div>
        <div class="kpi-value">
          ${netBalance >= 0 ? '+' : ''}₪${netBalance.toLocaleString('en-US')}
        </div>
        <div class="kpi-foot">
          الفارق الصافي (الأرصدة الفائضة - الذمم المستحقة)
        </div>
      </div>

      <!-- 4. Deposits & Consumption -->
      <div class="kpi-card volume">
        <div class="kpi-title">
          <span>حركة الحسابات التراكمية</span>
          <span style="font-size: 8.5px; background: #e2e8f0; padding: 1px 5px; border-radius: 4px;">شحن واستهلاك</span>
        </div>
        <div class="kpi-value" style="font-size: 16px; margin-top: 5px;">
          ₪${totalSpentAll.toLocaleString('en-US')} <span style="font-size: 10px; font-weight: normal; color: #64748b;">مستهلك</span>
        </div>
        <div class="kpi-foot" style="color: #475569;">
          إجمالي الإيداعات: ₪${totalToppedUpAll.toLocaleString('en-US')} (${balancedCount} حساب متزن)
        </div>
      </div>
    </div>

    <!-- 🏫 Academic Stage Breakdown Summary Table -->
    ${stages.length > 0 ? `
    <div class="section-title">
      <span>توزيع الذمم والمديونيات والمستحقات حسب المرحلة الدراسية</span>
      <span style="font-size: 9.5px; color: #64748b; font-weight: normal;">مؤشرات مجمعة للمراحل</span>
    </div>
    <table class="stages-table">
      <thead>
        <tr>
          <th>المرحلة الدراسية</th>
          <th style="text-align: center;">عدد الطلاب</th>
          <th style="text-align: center; color: #fecdd3;">إجمالي المديونيات المطلوبة (-)</th>
          <th style="text-align: center; color: #a7f3d0;">إجمالي الأرصدة الدائنة (+)</th>
          <th style="text-align: center;">صافي المرحلة</th>
          <th style="text-align: center;">الحالة الغالبة</th>
        </tr>
      </thead>
      <tbody>
        ${stages.map(stg => `
          <tr>
            <td style="font-weight: 800; color: #0d365a;">${stg.stageName}</td>
            <td style="text-align: center;">${stg.count} طالب</td>
            <td style="text-align: center; color: #e11d48; font-weight: 800; font-family: 'Almarai', monospace;">-₪${stg.totalDebt.toLocaleString('en-US')}</td>
            <td style="text-align: center; color: #059669; font-weight: 800; font-family: 'Almarai', monospace;">+₪${stg.totalCredit.toLocaleString('en-US')}</td>
            <td style="text-align: center; font-weight: 900; font-family: 'Almarai', monospace; color: ${stg.net >= 0 ? '#0d9488' : '#e11d48'};">
              ${stg.net >= 0 ? '+' : ''}₪${stg.net.toLocaleString('en-US')}
            </td>
            <td style="text-align: center;">
              <span style="font-size: 8.5px; padding: 2px 6px; border-radius: 4px; font-weight: 800; ${
                stg.net >= 0 ? 'background: #dcfce7; color: #166534;' : 'background: #fee2e2; color: #991b1b;'
              }">
                ${stg.net >= 0 ? 'فائض مالي مريح' : 'تتطلب متابعة تحصيل'}
              </span>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    <!-- 📋 Detailed Students Balances Table -->
    <div class="section-title">
      <span>الكشف التفصيلي لأرصدة ومديونيات الطلاب (${rows.length} طالب)</span>
      <span style="font-size: 9.5px; color: #64748b; font-weight: normal;">العملة الرسمية: الشيكل الفلسطيني (₪)</span>
    </div>

    <table class="students-table">
      <thead>
        <tr>
          <th style="width: 28px; text-align: center;">#</th>
          <th>اسم الطالب</th>
          <th style="text-align: center;">الصف / المرحلة</th>
          <th style="text-align: center;">رقم الهاتف</th>
          <th style="text-align: center;">إجمالي الشحن</th>
          <th style="text-align: center;">إجمالي المستهلك</th>
          <th style="text-align: center; min-width: 95px;">الرصيد المالي الحالي</th>
          <th style="text-align: center;">تصنيف الحساب</th>
          <th style="text-align: center;">الحصص</th>
          <th style="text-align: center;">حالة القيد</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row, idx) => `
          <tr class="${row.balance < 0 ? 'highlight-debt' : ''}">
            <td class="num-cell">${idx + 1}</td>
            <td>
              <div class="student-name">${row.name}</div>
              ${row.notes ? `<div style="font-size: 7.5px; color: #64748b; margin-top: 1px;">📝 ${row.notes}</div>` : ''}
            </td>
            <td style="text-align: center;">
              <span class="grade-badge">${row.grade}</span>
            </td>
            <td class="phone-cell">${row.phone}</td>
            <td class="money-cell" style="color: #0d365a;">₪${row.totalToppedUp.toLocaleString('en-US')}</td>
            <td class="money-cell" style="color: #475569;">₪${row.totalSpent.toLocaleString('en-US')}</td>
            <td class="money-cell">
              ${row.balance < 0 ? `
                <span class="badge-debt">-₪${Math.abs(row.balance).toLocaleString('en-US')}</span>
              ` : row.balance > 0 ? `
                <span class="badge-credit">+₪${row.balance.toLocaleString('en-US')}</span>
              ` : `
                <span class="badge-balanced">0 ₪</span>
              `}
            </td>
            <td style="text-align: center; font-size: 8.5px; font-weight: 800;">
              ${row.balance < 0 ? '<span style="color: #b91c1c;">مدين (مستحق)</span>' : row.balance > 0 ? '<span style="color: #15803d;">دائن (رصيد)</span>' : '<span style="color: #64748b;">متزن</span>'}
            </td>
            <td style="text-align: center; font-size: 8.5px; color: #475569; font-weight: 700;">
              ${row.sessionsCount} حصة (${row.totalHours} س)
            </td>
            <td style="text-align: center; font-size: 8px; font-weight: 800;">
              ${row.archived ? '<span style="color: #94a3b8;">مؤرشف</span>' : '<span style="color: #059669;">نشط 🟢</span>'}
            </td>
          </tr>
        `).join('')}
      </tbody>
      <tfoot>
        <tr class="totals-row">
          <td colspan="4" style="text-align: right; padding-right: 12px !important;">
            المجموع الإجمالي للحسابات المعروضة (${rows.length} طالب):
          </td>
          <td class="money-cell">₪${visibleToppedUp.toLocaleString('en-US')}</td>
          <td class="money-cell">₪${visibleSpent.toLocaleString('en-US')}</td>
          <td class="money-cell">
            <div style="font-size: 10px;">
              <span style="color: #fca5a5;">-₪${visibleDebt.toLocaleString('en-US')} ديون</span>
              <br/>
              <span style="color: #86efac;">+₪${visibleCredit.toLocaleString('en-US')} أرصدة</span>
            </div>
          </td>
          <td style="text-align: center; font-size: 11px !important;">
            الصافي: <span style="color: #fef08a; font-family: 'Almarai', monospace;">${visibleNet >= 0 ? '+' : ''}₪${visibleNet.toLocaleString('en-US')}</span>
          </td>
          <td style="text-align: center; font-weight: 800; font-size: 10.5px !important; color: #fef08a;">
            ${rows.reduce((s, r) => s + (r.totalHours || 0), 0).toFixed(1)} س (${rows.reduce((s, r) => s + (r.sessionsCount || 0), 0)} ح)
          </td>
          <td style="text-align: center; font-size: 10px !important; color: #94a3b8;">
            مطابق
          </td>
        </tr>
      </tfoot>
    </table>

    <!-- ✍️ Signatures & Official Approvals Block -->
    <div class="signatures-grid">
      <div class="sig-card">
        <div class="sig-title">إعداد ومطابقة الحسابات المالية</div>
        <div class="sig-person">القسم المالي والمحاسبي</div>
      </div>
      <div class="sig-card">
        <div class="sig-title">تدقيق السجلات والتحصيل الميداني</div>
        <div class="sig-person">قسم شؤون الطلاب والرقابة</div>
      </div>
      <div class="sig-card">
        <div class="sig-title">اعتماد وختم الإدارة العامة</div>
        <div class="sig-person">${managerName}</div>
      </div>
    </div>

    <!-- 📄 Footer Note -->
    <div class="report-footer-note">
      <span>أكاديمية التفوق أون لاين للتعليم الذكي والاستشارات التعليمية | وثيقة مالية وإدارية رسمية معتمدة</span>
      <span>صفحة رسمية موثقة مستخرجة آلياً من لوحة تحكم الإدارة العامة في ${generatedDate}</span>
    </div>

  </div>
</body>
</html>
  `;
}

/**
 * Directly prints the generated HTML report via an offscreen iframe
 */
export function printStudentFinancialBalancesReport(summary: ComputedStudentFinancialBalancesSummary): void {
  const html = generateStudentFinancialBalancesReportHTML(summary);

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
      console.error('Error printing financial balances report:', e);
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
 * Downloads a high-definition, beautifully formatted PDF report
 */
export async function downloadStudentFinancialBalancesPDF(
  summary: ComputedStudentFinancialBalancesSummary
): Promise<void> {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `التقرير_المالي_لأرصدة_ومديونيات_الطلاب_${dateStr}.pdf`;
  const htmlContent = generateStudentFinancialBalancesReportHTML(summary);

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
    // Settle fonts and css
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

    // Additional pages if table is long
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (err) {
    console.warn('html2canvas render failed, falling back to print dialog:', err);
    printStudentFinancialBalancesReport(summary);
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}
