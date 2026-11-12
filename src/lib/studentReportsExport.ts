// src/lib/studentReportsExport.ts
// نظام توليد وتصدير تقارير الطلاب والمالية إلى PDF وطباعتها ومشاركتها مع أولياء الأمور
// مصمم خصيصاً لأكاديمية التفوق أون لاين للتمكين الأكاديمي والتعليمي

import { Student, Teacher, Session, StudentCredit, formatCustomDate, isTrialSession } from '../types';
import { tafqeetArabic } from './studentPaymentReceipt';
import { getBestParentOrStudentPhone, buildWhatsAppUrl } from './phoneUtils';
import { getStudentDefaultHourlyRate, getStudentSessionCost } from './sessionPricing';

export type ArabicFontChoice = 'cairo' | 'tajawal' | 'almarai' | 'ibm_plex' | 'amiri';

export interface ArabicFontDefinition {
  id: ArabicFontChoice;
  name: string;
  label: string;
  description: string;
  fontFamily: string;
  displayFont: string;
  googleFontsSnippet: string;
}

export const GOOGLE_ARABIC_FONTS_COMBINED_URL = 
  "https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&family=Amiri:wght@400;700&family=Cairo:wght@400;500;600;700;800;900&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Tajawal:wght@400;500;700;800;900&display=swap";

export const ARABIC_FONTS_CONFIG: Record<ArabicFontChoice, ArabicFontDefinition> = {
  cairo: {
    id: 'cairo',
    name: 'Cairo',
    label: 'خط القاهرة (Cairo)',
    description: 'الخط الأيقوني الرسمي المعتمد، يتميز بالفخامة والوضوح الشديد للأرقام والعناوين',
    fontFamily: "'Cairo', 'Tajawal', 'Almarai', 'Segoe UI Arabic', 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Noto Sans Arabic', Tahoma, Arial, sans-serif",
    displayFont: "'Cairo', sans-serif",
    googleFontsSnippet: 'Cairo:wght@400;500;600;700;800;900'
  },
  tajawal: {
    id: 'tajawal',
    name: 'Tajawal',
    label: 'خط تجوال (Tajawal)',
    description: 'خط هندسي ناعم وانسيابي مريح جداً لقراءة الملاحظات والتقارير الأكاديمية',
    fontFamily: "'Tajawal', 'Cairo', 'Almarai', 'Segoe UI Arabic', 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Noto Sans Arabic', Tahoma, Arial, sans-serif",
    displayFont: "'Tajawal', 'Cairo', sans-serif",
    googleFontsSnippet: 'Tajawal:wght@400;500;700;800;900'
  },
  almarai: {
    id: 'almarai',
    name: 'Almarai',
    label: 'خط المراعي (Almarai)',
    description: 'خط معاصر فائق الدقة مصمم خصيصاً للجداول المالية والحسابية والبيانات الرقمية',
    fontFamily: "'Almarai', 'Cairo', 'Tajawal', 'Segoe UI Arabic', 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Noto Sans Arabic', Tahoma, Arial, sans-serif",
    displayFont: "'Almarai', 'Cairo', sans-serif",
    googleFontsSnippet: 'Almarai:wght@400;700;800'
  },
  ibm_plex: {
    id: 'ibm_plex',
    name: 'IBM Plex Sans Arabic',
    label: 'خط آي بي إم بليكس (IBM Plex Arabic)',
    description: 'طابع مؤسسي رصين يجمع بين الدقة الإدارية والوضوح العالي في المستندات الرسمية',
    fontFamily: "'IBM Plex Sans Arabic', 'Cairo', 'Tajawal', 'Segoe UI Arabic', 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Noto Sans Arabic', Tahoma, Arial, sans-serif",
    displayFont: "'IBM Plex Sans Arabic', 'Cairo', sans-serif",
    googleFontsSnippet: 'IBM+Plex+Sans+Arabic:wght@400;500;600;700'
  },
  amiri: {
    id: 'amiri',
    name: 'Amiri',
    label: 'خط أميري (Amiri)',
    description: 'خط عربي كلاسيكي أصيل مستوحى من المطابع الملكية الأميرية لإضفاء طابع تراثي موثق',
    fontFamily: "'Amiri', 'Cairo', 'Tajawal', 'Traditional Arabic', 'Times New Roman', serif",
    displayFont: "'Amiri', 'Cairo', serif",
    googleFontsSnippet: 'Amiri:wght@400;700'
  }
};

export interface StudentReportConfig {
  student: Student;
  teachers: Teacher[];
  sessions: Session[];
  credits: StudentCredit[];
  globalSettings?: any;
  startDate?: string;
  endDate?: string;
  periodLabel?: string;
  noteToParent?: string;
  managerName?: string;
  academyName?: string;
  centerPhone?: string;
  centerEmail?: string;
  centerAddress?: string;
  centerLicense?: string;
  includeDetailedSessions?: boolean;
  fontChoice?: ArabicFontChoice;
  hideAdjustmentsInStatement?: boolean; // إخفاء حركات التعديل من كشف الحساب لولي الأمر مع حسابها تلقائياً بالرصيد
}

/**
 * تنظيف نصوص وملاحظات العمليات المالية الموجهة لولي الأمر في كشف الحساب
 * لضمان عدم ظهور أي عبارات تشير إلى تعديل يدوي أو تسوية رصيد،
 * بل تظهر كدفعة مالية معتمدة ورسمية كما تم إدخالها من مدير المنصة
 */
export function sanitizeFinancialNote(rawNote?: string): string {
  if (!rawNote || !rawNote.trim()) {
    return 'سداد ودفع رصيد المحفظة التعليمية';
  }
  let cleaned = rawNote.trim();
  // تنظيف عبارات التسوية والتعديل اليدوي من الكشف
  cleaned = cleaned.replace(/تسوية وتعديل رصيد يدوي من الإدارة.*?(تعديل الرصيد الإجمالي)?/g, 'شحن رصيد المحفظة التعليمية');
  cleaned = cleaned.replace(/تسوية رصيد(\s*يدوي)?(\s*\(خصم\))?:\s*/g, 'دفعة معتمدة: ');
  cleaned = cleaned.replace(/تسوية رصيد(\s*يدوي)?(\s*\(خصم\))?/g, 'دفعة مالية معتمدة');
  cleaned = cleaned.replace(/تعديل رصيد(\s*يدوي)?(\s*إجمالي)?/g, 'شحن رصيد معتمد');
  cleaned = cleaned.replace(/تعديل مالي يدوي/g, 'دفعة مالية');
  cleaned = cleaned.replace(/تعديل رصيد/g, 'شحن رصيد');
  cleaned = cleaned.replace(/شحن رصيد يدوي مخصص:\s*/g, 'شحن رصيد معتمد: ');
  cleaned = cleaned.replace(/خصم رصيد يدوي مخصص:\s*/g, 'خصم معتمد: ');
  cleaned = cleaned.replace(/يدوياً|يدوي/g, 'معتمد');
  cleaned = cleaned.replace(/تسوية/g, 'سداد');
  return cleaned.trim() || 'سداد ودفع رصيد المحفظة التعليمية';
}

export interface AllStudentsReportConfig {
  students: Student[];
  teachers: Teacher[];
  sessions: Session[];
  credits: StudentCredit[];
  globalSettings?: any;
  filterMode?: 'all' | 'debtors' | 'surplus' | 'balanced';
  stageFilter?: string;
  teacherIdFilter?: string;
  managerName?: string;
  academyName?: string;
  centerPhone?: string;
  centerEmail?: string;
  centerAddress?: string;
  centerLicense?: string;
  reportTitle?: string;
  fontChoice?: ArabicFontChoice;
}

/**
 * دالة استخراج إحصائيات الطالب المالية والأكاديمية للفترة المحددة
 */
export function calculateStudentStatsForReport(
  student: Student,
  teachers: Teacher[],
  sessions: Session[],
  credits: StudentCredit[],
  startDate?: string,
  endDate?: string,
  defaultHourlyRateOrSettings: number | any = 60
) {
  const globalSettings = typeof defaultHourlyRateOrSettings === 'object' && defaultHourlyRateOrSettings !== null
    ? defaultHourlyRateOrSettings
    : { defaultStudentHourlyRate: typeof defaultHourlyRateOrSettings === 'number' ? defaultHourlyRateOrSettings : 60 };

  let studentSessions = sessions.filter(s => s.studentId === student.id);
  let studentCredits = credits.filter(c => c.studentId === student.id);

  // تصفية التاريخ
  if (startDate) {
    studentSessions = studentSessions.filter(s => (s.date || '') >= startDate);
    studentCredits = studentCredits.filter(c => (c.date || '') >= startDate);
  }
  if (endDate) {
    studentSessions = studentSessions.filter(s => (s.date || '') <= endDate);
    studentCredits = studentCredits.filter(c => (c.date || '') <= endDate);
  }

  // الحصص المعتمدة
  const approvedSessions = studentSessions.filter(
    s => s.approved !== false && s.status !== 'pending' && s.status !== 'booked' && s.status !== 'cancelled'
  );

  // إجمالي رسوم الحصص للفترة
  const totalSpent = approvedSessions.reduce((sum, s) => {
    if (isTrialSession(s)) return sum;
    const teacher = teachers.find(t => t.id === s.teacherId);
    return sum + getStudentSessionCost(s, student, teacher, globalSettings);
  }, 0);

  // إجمالي الدفعات والشحن للفترة
  const totalCredits = studentCredits.reduce((sum, c) => sum + c.amount, 0);

  // الرصيد الافتتاحي قبل تاريخ البداية
  let openingBalance = 0;
  if (startDate) {
    const creditsBefore = credits
      .filter(c => c.studentId === student.id && (c.date || '') < startDate)
      .reduce((sum, c) => sum + c.amount, 0);

    const sessionsBefore = sessions
      .filter(s => s.studentId === student.id && s.approved !== false && s.status !== 'pending' && s.status !== 'booked' && s.status !== 'cancelled' && (s.date || '') < startDate)
      .reduce((sum, s) => {
        if (isTrialSession(s)) return sum;
        const teacher = teachers.find(t => t.id === s.teacherId);
        return sum + getStudentSessionCost(s, student, teacher, globalSettings);
      }, 0);

    openingBalance = creditsBefore - sessionsBefore;
  }

  const finalBalance = openingBalance + totalCredits - totalSpent;
  const totalHours = approvedSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);

  return {
    totalSpent,
    totalCredits,
    openingBalance,
    finalBalance,
    sessionCount: approvedSessions.length,
    totalHours,
    approvedSessions,
    studentCredits
  };
}

/**
 * 1. توليد كشف حساب الطالب المالي المعتمد لولي الأمر (PDF Ready HTML)
 */
export function generateStudentFinancialStatementHtml(config: StudentReportConfig): string {
  const {
    student,
    teachers,
    sessions,
    credits,
    startDate,
    endDate,
    periodLabel,
    noteToParent,
    managerName = 'أ. د. زكي أبو علان',
    academyName = 'أكاديمية التفوق أون لاين للتمكين الأكاديمي والتعليمي',
    centerPhone = '059-8321040',
    centerEmail = 'zakiabuillan@gmail.com',
    centerAddress = 'المنصة التعليمية الرقمية المعتمدة - فلسطين',
    centerLicense = 'ترخيص واعتماد رقم: EDU-2026-98442',
    includeDetailedSessions = true,
    fontChoice = 'cairo',
    globalSettings,
    hideAdjustmentsInStatement = true
  } = config;

  const chosenFont = ARABIC_FONTS_CONFIG[fontChoice] || ARABIC_FONTS_CONFIG.cairo;

  const stats = calculateStudentStatsForReport(student, teachers, sessions, credits, startDate, endDate, globalSettings);
  const formattedToday = formatCustomDate(new Date().toISOString().split('T')[0]);
  const reportCode = `STMT-${student.id.substring(0, 5).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // الفترة الزمنية المحددة
  const periodText = periodLabel || (startDate && endDate
    ? `الفترة: من ${formatCustomDate(startDate)} إلى ${formatCustomDate(endDate)}`
    : startDate
      ? `ابتداءً من تاريخ: ${formatCustomDate(startDate)}`
      : endDate
        ? `حتى تاريخ: ${formatCustomDate(endDate)}`
        : 'كافة الفترات (السجل المالي التراكمي الشامل)');

  // هواتف التواصل
  const studentPhone = student.phone || student.phoneNumber || 'غير مسجل';
  const parentPhone = (student as any).parentPhone || (student as any).guardianPhone || (student as any).parentPhoneNumber || 'غير مسجل';

  // المعلمون المرتبطون
  const assignedTeacherNames = (student.teachers || [])
    .map(tId => teachers.find(t => t.id === tId)?.name)
    .filter(Boolean)
    .join('، ') || 'المعلمون المعتمدون بالمنصة';

  // تجميع الحركات المالية
  const sessionRows = stats.approvedSessions.map(s => {
    const teacher = teachers.find(t => t.id === s.teacherId);
    const cost = getStudentSessionCost(s, student, teacher, globalSettings);

    return {
      date: s.date || '',
      createdAt: s.createdAt || '',
      type: 'حصة تعليمية',
      typeBadgeClass: 'badge-session',
      subject: s.subject || 'درس تعليمي',
      teacherName: teacher?.name || 'كادر المنصة',
      description: s.topic || s.title || `حصة مادة: ${s.subject || 'مقرر دراسي'}`,
      duration: `${s.durationHours || 1} س (${Math.round((s.durationHours || 1) * 60)} د)`,
      creditAmount: 0,
      debitAmount: cost
    };
  });

  // تصفية حركات التعديل المستبعدة من الكشف، واحتساب قيمتها تلقائياً في الرصيد
  const isAdjustmentHidden = (c: StudentCredit) => {
    if (c.hideInStatement === true) return true;
    if (hideAdjustmentsInStatement && c.isAdjustment === true) return true;
    const note = (c.note || '').toLowerCase();
    if (hideAdjustmentsInStatement && (
      note.includes('تسوية وتعديل رصيد يدوي') || 
      note.includes('تعديل الرصيد الإجمالي')
    )) {
      return true;
    }
    return false;
  };

  const visibleCredits = stats.studentCredits.filter(c => !isAdjustmentHidden(c));
  const hiddenCredits = stats.studentCredits.filter(c => isAdjustmentHidden(c));
  const hiddenCreditsAmount = hiddenCredits.reduce((sum, c) => sum + c.amount, 0);

  const creditRows = visibleCredits.map(c => {
    return {
      date: c.date || '',
      createdAt: c.createdAt || '',
      type: 'إيداع / دفعة مالية',
      typeBadgeClass: 'badge-credit',
      subject: c.serviceCategory || c.serviceName || 'شحن رصيد',
      teacherName: '-',
      description: sanitizeFinancialNote(c.note),
      duration: '-',
      creditAmount: c.amount,
      debitAmount: 0
    };
  });

  // فرز تصاعدي زمني لحساب الرصيد التراكمي خطوة بخطوة
  const allLedger = [...sessionRows, ...creditRows].sort((a, b) => {
    const dComp = (a.date || '').localeCompare(b.date || '');
    if (dComp !== 0) return dComp;
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });

  // الرصيد التراكمي يبدأ بالرصيد الافتتاحي مضافاً إليه أي تعديل رصيد داخلي غير ظاهر في الكشف
  // ليحسب في النظام تلقائياً دون إظهار بند التعديل لولي الأمر، مع تطابق الرصيد النهائي 100%
  let runningBalance = stats.openingBalance + hiddenCreditsAmount;
  let ledgerRowsHtml = '';

  if (startDate || hiddenCreditsAmount !== 0) {
    const openingLabel = startDate 
      ? 'رصيد افتتاحي سابق لتاريخ بدء الفترة' 
      : 'رصيد سابق معتمد من العمليات السابقة';
    const displayOpening = stats.openingBalance + hiddenCreditsAmount;
    if (startDate || displayOpening !== 0) {
      ledgerRowsHtml += `
        <tr class="row-opening">
          <td style="text-align: center; font-weight: bold;">${startDate ? formatCustomDate(startDate) : '-'}</td>
          <td style="text-align: center;"><span class="badge badge-neutral">رصيد مرحل</span></td>
          <td colspan="2">${openingLabel}</td>
          <td style="text-align: center;">-</td>
          <td style="text-align: center; color: #166534; font-weight: bold;">-</td>
          <td style="text-align: center; color: #991b1b; font-weight: bold;">-</td>
          <td style="text-align: center; font-weight: 900;" class="font-mono">₪${displayOpening.toFixed(2)}</td>
        </tr>
      `;
    }
  }

  allLedger.forEach((item, idx) => {
    runningBalance = runningBalance + item.creditAmount - item.debitAmount;
    const creditStr = item.creditAmount > 0 ? `+₪${item.creditAmount.toFixed(2)}` : '-';
    const debitStr = item.debitAmount > 0 ? `-₪${item.debitAmount.toFixed(2)}` : '-';
    const balanceColor = runningBalance < 0 ? '#b91c1c' : '#15803d';

    ledgerRowsHtml += `
      <tr>
        <td style="text-align: center; font-family: monospace; font-size: 11px;">${formatCustomDate(item.date)}</td>
        <td style="text-align: center;"><span class="badge ${item.typeBadgeClass}">${item.type}</span></td>
        <td>
          <div style="font-weight: 800; color: #0f172a; font-size: 11.5px;">${item.subject}</div>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${item.description}</div>
        </td>
        <td style="text-align: center; font-size: 11px; color: #334155;">${item.teacherName}</td>
        <td style="text-align: center; font-size: 10.5px; font-weight: 700; color: #475569;">${item.duration}</td>
        <td style="text-align: center; color: #15803d; font-weight: 800;" class="font-mono">${creditStr}</td>
        <td style="text-align: center; color: #b91c1c; font-weight: 800;" class="font-mono">${debitStr}</td>
        <td style="text-align: center; font-weight: 900; color: ${balanceColor};" class="font-mono">₪${runningBalance.toFixed(2)}</td>
      </tr>
    `;
  });

  if (allLedger.length === 0 && !startDate) {
    ledgerRowsHtml = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 24px; color: #94a3b8; font-weight: bold;">
          لا توجد حركات مالية أو حصص مسجلة في هذا النطاق الزمني
        </td>
      </tr>
    `;
  }

  // حالة الرصيد النهائي والتفقيط
  const isDebt = stats.finalBalance < 0;
  const isZero = Math.abs(stats.finalBalance) < 0.01;
  const absBalance = Math.abs(stats.finalBalance);
  const tafqeetText = isZero 
    ? 'الحساب متوازن تماماً ولا توجد أية مستحقات' 
    : tafqeetArabic(absBalance, 'شيكل جديد');

  const balanceStatusBadge = isDebt
    ? '<span class="status-pill status-debt">ذمة مالية مستحقة للسداد ⚠️</span>'
    : isZero
      ? '<span class="status-pill status-balanced">حساب متوازن تماماً ✅</span>'
      : '<span class="status-pill status-surplus">رصيد دائن متوفر في المحفظة 💰</span>';

  const balanceBoxClass = isDebt ? 'card-debt' : isZero ? 'card-balanced' : 'card-surplus';

  // رسالة وتوجيه الإدارة لولي الأمر
  const defaultParentAdvice = isDebt
    ? `السادة أولياء الأمور الكرام، نرجو التكرم بالاطلاع على كشف الحساب أعلاه والمبادرة لتسوية الذمة المستحقة والبالغة (₪${absBalance.toFixed(2)}) لضمان استمرارية جدولة الحصص التعليمية لابنكم/ابنتكم دون انقطاع. نشكر لكم كريم ثقتكم وحرصكم الدائم.`
    : `السادة أولياء الأمور الكرام، نضع بين أيديكم كشف الحساب المالي والأكاديمي الدوري، شاكرين لكم طيب تعاونكم والتزامكم الداعم لمسيرة التفوق الأكاديمي لابنكم/ابنتكم.`;

  const finalParentNote = noteToParent ? `${noteToParent}<br><br>${defaultParentAdvice}` : defaultParentAdvice;

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>كشف حساب الطالب المالي - ${student.name}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${GOOGLE_ARABIC_FONTS_COMBINED_URL}" rel="stylesheet">
  <style>
    @import url('${GOOGLE_ARABIC_FONTS_COMBINED_URL}');

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      text-rendering: optimizeLegibility !important;
      font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
    }
    body {
      font-family: ${chosenFont.fontFamily};
      color: #0f172a;
      background: #f8fafc;
      margin: 0;
      padding: 24px;
      direction: rtl;
      font-size: 12px;
      line-height: 1.55;
    }
    .display-title, h1, h2, h3, .academy-brand-name, .student-name-hero, .stamp-title {
      font-family: ${chosenFont.displayFont};
      font-feature-settings: "kern" 1, "liga" 1;
    }
    .numeral-value, .stat-value, .amount-highlight {
      font-variant-numeric: tabular-nums;
    }
    @page {
      size: A4 portrait;
      margin: 8mm 10mm 8mm 10mm;
    }
    .report-container {
      max-width: 860px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 30px;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
      position: relative;
    }
    /* Action Bar (Only on screen, hidden on print) */
    .screen-action-bar {
      max-width: 860px;
      margin: 0 auto 16px auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    }
    .btn-action {
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 800;
      border-radius: 10px;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-print {
      background: #0d365a;
      color: #ffffff;
    }
    .btn-print:hover {
      background: #082137;
    }
    .btn-whatsapp {
      background: #16a34a;
      color: #ffffff;
    }
    .btn-whatsapp:hover {
      background: #15803d;
    }
    .btn-close {
      background: #f1f5f9;
      color: #475569;
    }
    .btn-close:hover {
      background: #e2e8f0;
    }

    /* Official Header */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #0d365a;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .academy-brand-name {
      font-size: 19px;
      font-weight: 900;
      color: #0d365a;
      letter-spacing: -0.3px;
    }
    .academy-brand-sub {
      font-size: 11px;
      color: #d97706;
      font-weight: 800;
      margin-top: 2px;
    }
    .academy-brand-desc {
      font-size: 9.5px;
      color: #64748b;
      font-weight: 600;
      margin-top: 1px;
    }
    .report-meta-box {
      text-align: left;
      font-size: 10px;
      color: #475569;
      font-weight: 700;
      line-height: 1.6;
    }
    .report-meta-box strong {
      color: #0d365a;
    }

    /* Title banner */
    .title-banner {
      text-align: center;
      margin: 12px 0 20px 0;
    }
    .title-main {
      font-size: 16px;
      font-weight: 900;
      color: #0d365a;
      margin-bottom: 4px;
    }
    .period-badge {
      display: inline-block;
      padding: 3px 14px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 800;
      color: #334155;
    }

    /* Student Info Card */
    .student-info-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #edf2f7;
      border-radius: 14px;
      padding: 14px 18px;
      margin-bottom: 20px;
    }
    .info-label {
      font-size: 9.5px;
      color: #64748b;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .info-value {
      font-size: 11.5px;
      color: #0f172a;
      font-weight: 800;
    }

    /* KPI Summary Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 12px;
      text-align: center;
      background: #ffffff;
    }
    .kpi-title {
      font-size: 9.5px;
      font-weight: 800;
      color: #64748b;
      margin-bottom: 4px;
    }
    .kpi-num {
      font-size: 17px;
      font-weight: 900;
      font-family: monospace;
    }
    .card-debt {
      background: #fef2f2;
      border-color: #fecaca;
      color: #991b1b;
    }
    .card-surplus {
      background: #f0fdf4;
      border-color: #bbf7d0;
      color: #166534;
    }
    .card-balanced {
      background: #f8fafc;
      border-color: #cbd5e1;
      color: #0f172a;
    }

    /* Tafqeet & Status Strip */
    .tafqeet-strip {
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px 16px;
      margin-bottom: 22px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }
    .tafqeet-text {
      font-size: 11px;
      font-weight: 800;
      color: #1e293b;
    }
    .status-pill {
      font-size: 10px;
      font-weight: 800;
      padding: 3px 10px;
      border-radius: 20px;
      white-space: nowrap;
    }
    .status-debt {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }
    .status-surplus {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
    }
    .status-balanced {
      background: #e2e8f0;
      color: #334155;
      border: 1px solid #cbd5e1;
    }

    /* Ledger Table */
    .section-heading {
      font-size: 12.5px;
      font-weight: 900;
      color: #0d365a;
      margin: 0 0 8px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .ledger-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10.5px;
      margin-bottom: 22px;
    }
    .ledger-table th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 800;
      padding: 8px 10px;
      border-top: 1px solid #cbd5e1;
      border-bottom: 2px solid #94a3b8;
      text-align: right;
    }
    .ledger-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    .ledger-table tr:nth-child(even) td {
      background: #fafafa;
    }
    .badge {
      display: inline-block;
      padding: 2px 7px;
      font-size: 8.5px;
      font-weight: 800;
      border-radius: 6px;
    }
    .badge-session {
      background: #fee2e2;
      color: #b91c1c;
    }
    .badge-credit {
      background: #dcfce7;
      color: #15803d;
    }
    .badge-neutral {
      background: #e2e8f0;
      color: #475569;
    }

    /* Parent Message Box */
    .parent-message-box {
      border: 1px dashed #cbd5e1;
      background: #fcfdfe;
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 25px;
      page-break-inside: avoid;
    }
    .parent-message-title {
      font-size: 10.5px;
      font-weight: 900;
      color: #0d365a;
      margin-bottom: 4px;
    }
    .parent-message-body {
      font-size: 10px;
      color: #475569;
      line-height: 1.6;
    }

    /* Signatures & Stamp */
    .signatures-container {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-top: 25px;
      padding-top: 15px;
      border-top: 1px solid #e2e8f0;
      page-break-inside: avoid;
    }
    .signature-item {
      text-align: center;
    }
    .signature-title {
      font-size: 10.5px;
      font-weight: 800;
      color: #0d365a;
    }
    .signature-sub {
      font-size: 8.5px;
      color: #64748b;
      margin-top: 2px;
    }
    .signature-space {
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 6px 0;
    }
    .seal-box {
      border: 2px dashed #0d365a;
      border-radius: 50%;
      width: 54px;
      height: 54px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      color: #0d365a;
      font-size: 7.5px;
      font-weight: 900;
      transform: rotate(-10deg);
      opacity: 0.85;
    }
    .signature-line {
      border-bottom: 1px dotted #94a3b8;
      width: 80%;
      margin: 0 auto;
    }

    /* Footer */
    .report-footer {
      text-align: center;
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #f1f5f9;
      font-size: 9px;
      color: #94a3b8;
      font-weight: 700;
    }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
        margin: 0;
      }
      .screen-action-bar {
        display: none !important;
      }
      .report-container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>

  <!-- Screen Control Bar -->
  <div class="screen-action-bar">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 16px;">📄</span>
      <div>
        <div style="font-weight: 900; font-size: 12px; color: #0d365a;">كشف حساب الطالب المالي المعتمد</div>
        <div style="font-size: 10px; color: #64748b;">جاهز للحفظ بصيغة PDF عالية الدقة، الطباعة المباشرة، أو الإرسال لولي الأمر</div>
      </div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn-action btn-print" onclick="window.print()">
        <span>🖨️ طباعة وحفظ كـ PDF</span>
      </button>
      ${parentPhone !== 'غير مسجل' ? `
        <button class="btn-action btn-whatsapp" onclick="window.open('${buildWhatsAppUrl(parentPhone, `السلام عليكم ورحمة الله، مرفق لسيادتكم كشف الحساب المالي المعتمد لـ (${student.name}) من أكاديمية التفوق أون لاين. الرصيد الحالي: ${stats.finalBalance >= 0 ? '+' : ''}${stats.finalBalance.toFixed(2)} ₪. تحياتنا لكم.`)}')">
          <span>💬 إرسال لولي الأمر</span>
        </button>
      ` : ''}
      <button class="btn-action btn-close" onclick="window.close()">إغلاق</button>
    </div>
  </div>

  <!-- Printable Official Report -->
  <div class="report-container">
    
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="text-align: right; vertical-align: top; width: 60%;">
          <div class="academy-brand-name">${academyName}</div>
          <div class="academy-brand-sub">رعاية الموهبة وتأمين المسار الأكاديمي والتعليمي المتقدم</div>
          <div class="academy-brand-desc">${centerAddress} | هاتف: ${centerPhone} | ${centerLicense}</div>
        </td>
        <td style="text-align: left; vertical-align: top; width: 40%;">
          <div class="report-meta-box">
            <div><strong>رقم المستند:</strong> <span style="font-family: monospace;">${reportCode}</span></div>
            <div><strong>تاريخ الإصدار:</strong> ${formattedToday}</div>
            <div><strong>الإدارة العامة:</strong> ${managerName}</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Title Banner -->
    <div class="title-banner">
      <div class="title-main">كشف الحركة المالية والمحاسبية لملف الطالب</div>
      <div class="period-badge">${periodText}</div>
    </div>

    <!-- Student Metadata -->
    <div class="student-info-grid">
      <div>
        <div class="info-label">اسم الطالب</div>
        <div class="info-value">${student.name}</div>
      </div>
      <div>
        <div class="info-label">الصف / المرحلة الدراسية</div>
        <div class="info-value">${student.grade || student.academicLevel || 'غير محدد'}</div>
      </div>
      <div>
        <div class="info-label">هاتف الطالب</div>
        <div class="info-value" style="font-family: monospace;">${studentPhone}</div>
      </div>
      <div>
        <div class="info-label">هاتف ولي الأمر</div>
        <div class="info-value" style="font-family: monospace; color: #0d365a;">${parentPhone}</div>
      </div>
      <div>
        <div class="info-label">المعلمون المشرفون</div>
        <div class="info-value" style="font-size: 10.5px;">${assignedTeacherNames}</div>
      </div>
      <div>
        <div class="info-label">نظام المحاسبة</div>
        <div class="info-value">${student.isOpenBalance ? 'رصيد مفتوح (ذمم مؤجلة)' : 'مسبق الدفع (شحن المحفظة)'}</div>
      </div>
      <div>
        <div class="info-label">الحصص المنفذة للفترة</div>
        <div class="info-value">${stats.sessionCount} حصة (${stats.totalHours} س)</div>
      </div>
      <div>
        <div class="info-label">حالة الحساب الأكاديمي</div>
        <div class="info-value" style="color: #166534;">${student.academicStatus === 'Paused' ? 'موقوف مؤقتاً' : student.academicStatus === 'Graduated' ? 'متخرج' : 'نشط ومنتظم'}</div>
      </div>
    </div>

    <!-- 4 Financial KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-title">الرصيد الافتتاحي المرحل</div>
        <div class="kpi-num" style="color: #475569;">₪${stats.openingBalance.toFixed(2)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">إجمالي الشحن والمدفوعات (+)</div>
        <div class="kpi-num" style="color: #166534;">+₪${stats.totalCredits.toFixed(2)}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">إجمالي رسوم الحصص (-)</div>
        <div class="kpi-num" style="color: #0d365a;">-₪${stats.totalSpent.toFixed(2)}</div>
      </div>
      <div class="kpi-card ${balanceBoxClass}">
        <div class="kpi-title" style="font-weight: 900;">الرصيد النهائي المتبقي</div>
        <div class="kpi-num" style="font-size: 18px;">₪${stats.finalBalance.toFixed(2)}</div>
      </div>
    </div>

    <!-- Tafqeet and Status Strip -->
    <div class="tafqeet-strip">
      <div>
        <span style="font-size: 9.5px; color: #64748b; font-weight: 700; display: block;">المبلغ كتابة بالحروف:</span>
        <span class="tafqeet-text">${tafqeetText}</span>
      </div>
      <div>
        ${balanceStatusBadge}
      </div>
    </div>

    ${includeDetailedSessions ? `
      <!-- Ledger Table -->
      <div class="section-heading">
        <span>سجل الحركات المالية والحصص بالتفصيل</span>
        <span style="font-size: 10px; color: #64748b; font-weight: 600;">عدد السجلات: (${allLedger.length})</span>
      </div>
      <table class="ledger-table">
        <thead>
          <tr>
            <th style="width: 11%; text-align: center;">التاريخ</th>
            <th style="width: 14%; text-align: center;">نوع العملية</th>
            <th style="width: 32%;">البيان والتفاصيل الأكاديمية</th>
            <th style="width: 13%; text-align: center;">المعلم</th>
            <th style="width: 9%; text-align: center;">المدة</th>
            <th style="width: 10%; text-align: center;">دائن (+)</th>
            <th style="width: 10%; text-align: center;">مدين (-)</th>
            <th style="width: 11%; text-align: center;">الرصيد</th>
          </tr>
        </thead>
        <tbody>
          ${ledgerRowsHtml}
        </tbody>
        <tfoot>
          <tr style="background: #f1f5f9; border-top: 2px solid #cbd5e1; font-weight: 900;">
            <td colspan="4" style="text-align: right; padding: 10px 12px; font-size: 11.5px; color: #0f172a;">
              مجموع الساعات الكلي لجميع الحصص المسجلة (${stats.sessionCount} حصة):
            </td>
            <td style="text-align: center; padding: 10px 6px; font-size: 12px; color: #1d4ed8; font-family: sans-serif; background: #e0f2fe;">
              ${stats.totalHours.toFixed(1)} س
            </td>
            <td style="text-align: center; padding: 10px 6px; font-size: 11px; color: #15803d; font-family: monospace; background: #dcfce7;">
              +₪${stats.totalCredits.toFixed(2)}
            </td>
            <td style="text-align: center; padding: 10px 6px; font-size: 11px; color: #b91c1c; font-family: monospace; background: #fee2e2;">
              -₪${stats.totalSpent.toFixed(2)}
            </td>
            <td style="text-align: center; padding: 10px 6px; font-size: 12px; color: ${stats.finalBalance < 0 ? '#b91c1c' : '#15803d'}; font-family: monospace; font-weight: 900;">
              ₪${stats.finalBalance.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    ` : ''}

    <!-- Parent Message Box -->
    <div class="parent-message-box">
      <div class="parent-message-title">📌 تنويه وإشعار إدارة المنصة لأولياء الأمور:</div>
      <div class="parent-message-body">${finalParentNote}</div>
    </div>

    <!-- Official Signatures -->
    <div class="signatures-container">
      <div class="signature-item">
        <div class="signature-title">توقيع ولي الأمر</div>
        <div class="signature-sub">للاطلاع والمصادقة الأكاديمية والمالية</div>
        <div class="signature-space">
          <div class="signature-line"></div>
        </div>
      </div>

      <div class="signature-item">
        <div class="signature-title">ختم المنصة الرسمي</div>
        <div class="signature-sub">${centerLicense}</div>
        <div class="signature-space">
          <div class="seal-box">
            <span>أكاديمية</span>
            <span>التفوق</span>
            <span>معتمد 2026</span>
          </div>
        </div>
      </div>

      <div class="signature-item">
        <div class="signature-title">مدير المنصة: ${managerName}</div>
        <div class="signature-sub">الاعتماد الإداري والمالي العام</div>
        <div class="signature-space">
          <div style="font-family: cursive; font-size: 13px; color: #0d365a; font-weight: bold;">أ. د. زكي أبو علان</div>
        </div>
      </div>
    </div>

    <!-- Footer Stamp -->
    <div class="report-footer">
      حقوق إعداد ومطابقة السجلات محفوظة بالكامل © لـ ${academyName} لعام 2026 - صادر عن النظام السحابي الموحد
    </div>

  </div>

</body>
</html>
  `;
}

/**
 * 2. توليد التقرير المالي المجمع لأرصدة وديون كافة الطلاب (PDF Ready HTML للإدارة)
 */
export function generateAllStudentsFinancialReportHtml(config: AllStudentsReportConfig): string {
  const {
    students,
    teachers,
    sessions,
    credits,
    filterMode = 'all',
    stageFilter,
    teacherIdFilter,
    managerName = 'أ. د. زكي أبو علان',
    academyName = 'أكاديمية التفوق أون لاين للتمكين الأكاديمي والتعليمي',
    centerPhone = '059-8321040',
    centerEmail = 'zakiabuillan@gmail.com',
    centerAddress = 'المنصة التعليمية الرقمية المعتمدة - فلسطين',
    centerLicense = 'ترخيص واعتماد رقم: EDU-2026-98442',
    reportTitle = 'التقرير المالي والإداري الشامل - كشف أرصدة وديون الطلاب',
    fontChoice = 'cairo'
  } = config;

  const chosenFont = ARABIC_FONTS_CONFIG[fontChoice] || ARABIC_FONTS_CONFIG.cairo;

  const formattedToday = formatCustomDate(new Date().toISOString().split('T')[0]);
  const reportCode = `FIN-LEDGER-${new Date().toISOString().split('T')[0].replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

  // تصفية الطلاب
  let targetStudents = students.filter(s => s.archived !== true);

  if (teacherIdFilter) {
    targetStudents = targetStudents.filter(s => (s.teachers || []).includes(teacherIdFilter));
  }

  // حساب إحصائية كل طالب
  const calculatedList = targetStudents.map(student => {
    const stats = calculateStudentStatsForReport(student, teachers, sessions, credits);
    return {
      student,
      stats
    };
  });

  // تصفية حسب وضع الرصيد
  let filteredList = calculatedList;
  let filterSubtitle = 'كافة الطلاب المسجلين بالمنصة';

  if (filterMode === 'debtors') {
    filteredList = calculatedList.filter(item => item.stats.finalBalance < -0.01);
    filterSubtitle = 'الطلاب ذوو الأرصدة السالبة والذمم المالية المستحقة فقط (المدينون)';
  } else if (filterMode === 'surplus') {
    filteredList = calculatedList.filter(item => item.stats.finalBalance > 0.01);
    filterSubtitle = 'الطلاب ذوو الأرصدة الإيجابية المشحونة مسبقاً فقط (الدائنون)';
  } else if (filterMode === 'balanced') {
    filteredList = calculatedList.filter(item => Math.abs(item.stats.finalBalance) <= 0.01);
    filterSubtitle = 'الطلاب ذوو الأرصدة المتوازنة (صفر شيكل)';
  }

  // الحسابات الإجمالية للتقرير المالي
  let totalDebts = 0;
  let totalSurplus = 0;
  let totalCreditsAll = 0;
  let totalSpentAll = 0;
  let totalSessionsAll = 0;
  let totalHoursAll = 0;

  filteredList.forEach(item => {
    totalCreditsAll += item.stats.totalCredits;
    totalSpentAll += item.stats.totalSpent;
    totalSessionsAll += item.stats.sessionCount;
    totalHoursAll += item.stats.totalHours;

    if (item.stats.finalBalance < 0) {
      totalDebts += Math.abs(item.stats.finalBalance);
    } else {
      totalSurplus += item.stats.finalBalance;
    }
  });

  const netAcademyBalance = totalSurplus - totalDebts;

  // بناء أسطر الجدول
  let tableRowsHtml = '';
  filteredList.forEach((item, index) => {
    const { student, stats } = item;
    const isDebt = stats.finalBalance < -0.01;
    const isZero = Math.abs(stats.finalBalance) <= 0.01;
    const balanceColor = isDebt ? '#991b1b' : isZero ? '#475569' : '#15803d';
    const balanceBadge = isDebt 
      ? '<span class="badge badge-debt">ذمة مستحقة</span>' 
      : isZero 
        ? '<span class="badge badge-neutral">متوازن</span>' 
        : '<span class="badge badge-surplus">فائض مشحون</span>';

    const phone = student.phone || student.phoneNumber || '-';
    const parentPhone = (student as any).parentPhone || (student as any).guardianPhone || (student as any).parentPhoneNumber || '-';
    const grade = student.grade || student.academicLevel || 'غير محدد';

    const teacherNames = (student.teachers || [])
      .map(tId => teachers.find(t => t.id === tId)?.name)
      .filter(Boolean)
      .join('، ') || 'كادر المنصة';

    tableRowsHtml += `
      <tr>
        <td style="text-align: center; font-weight: bold; color: #64748b; font-size: 10px;">${index + 1}</td>
        <td>
          <div style="font-weight: 800; color: #0f172a; font-size: 11px;">${student.name}</div>
          <div style="font-size: 9px; color: #64748b; font-family: monospace;">ID: ${student.id.substring(0, 6)}</div>
        </td>
        <td style="text-align: center; font-size: 10px; color: #334155;">
          <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 6px; font-weight: 700;">${grade}</span>
        </td>
        <td style="text-align: center; font-family: monospace; font-size: 10px; direction: ltr;">
          <div>${phone}</div>
          ${parentPhone !== '-' ? `<div style="font-size: 8.5px; color: #0d365a; font-weight: bold;">(ولي الأمر: ${parentPhone})</div>` : ''}
        </td>
        <td style="font-size: 9.5px; color: #334155; font-weight: 600;">${teacherNames}</td>
        <td style="text-align: center; font-size: 10px; color: #475569; font-weight: 700;">${stats.sessionCount} (${stats.totalHours} س)</td>
        <td style="text-align: center; color: #166534; font-weight: 800; font-family: monospace; font-size: 10.5px;">+₪${stats.totalCredits.toFixed(1)}</td>
        <td style="text-align: center; color: #0d365a; font-weight: 800; font-family: monospace; font-size: 10.5px;">-₪${stats.totalSpent.toFixed(1)}</td>
        <td style="text-align: center; font-weight: 900; color: ${balanceColor}; font-family: monospace; font-size: 11px;">
          ₪${stats.finalBalance.toFixed(1)}
        </td>
        <td style="text-align: center;">${balanceBadge}</td>
      </tr>
    `;
  });

  if (filteredList.length === 0) {
    tableRowsHtml = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 30px; color: #94a3b8; font-weight: bold;">
          لا يوجد طلاب مطابقين لمعايير التقرير المالي المحددة
        </td>
      </tr>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>${reportTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${GOOGLE_ARABIC_FONTS_COMBINED_URL}" rel="stylesheet">
  <style>
    @import url('${GOOGLE_ARABIC_FONTS_COMBINED_URL}');

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      -webkit-font-smoothing: antialiased !important;
      -moz-osx-font-smoothing: grayscale !important;
      text-rendering: optimizeLegibility !important;
      font-feature-settings: "kern" 1, "liga" 1, "calt" 1;
    }
    body {
      font-family: ${chosenFont.fontFamily};
      color: #0f172a;
      background: #f8fafc;
      margin: 0;
      padding: 24px;
      direction: rtl;
      font-size: 11px;
      line-height: 1.55;
    }
    .display-title, h1, h2, h3, .academy-brand-name, .stamp-title {
      font-family: ${chosenFont.displayFont};
      font-feature-settings: "kern" 1, "liga" 1;
    }
    .numeral-value, .stat-value, .amount-highlight {
      font-variant-numeric: tabular-nums;
    }
    @page {
      size: A4 landscape;
      margin: 8mm 10mm 8mm 10mm;
    }
    .report-container {
      max-width: 1050px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      padding: 26px;
      box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
    }
    .screen-action-bar {
      max-width: 1050px;
      margin: 0 auto 16px auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 12px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn-action {
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 800;
      border-radius: 10px;
      cursor: pointer;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-print {
      background: #0d365a;
      color: #ffffff;
    }
    .btn-close {
      background: #f1f5f9;
      color: #475569;
    }

    .header-table {
      width: 100%;
      border-collapse: collapse;
      border-bottom: 2px solid #0d365a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .academy-brand-name {
      font-size: 18px;
      font-weight: 900;
      color: #0d365a;
    }
    .academy-brand-sub {
      font-size: 11px;
      color: #d97706;
      font-weight: 800;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 10px;
      margin: 16px 0 20px 0;
    }
    .kpi-card {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px;
      text-align: center;
      background: #ffffff;
    }
    .kpi-title {
      font-size: 9px;
      font-weight: 800;
      color: #64748b;
      margin-bottom: 3px;
    }
    .kpi-num {
      font-size: 16px;
      font-weight: 900;
      font-family: monospace;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 20px;
    }
    .data-table th {
      background: #0d365a;
      color: #ffffff;
      font-weight: 800;
      padding: 8px 8px;
      text-align: right;
    }
    .data-table td {
      padding: 7px 8px;
      border-bottom: 1px solid #f1f5f9;
      color: #1e293b;
    }
    .data-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .data-table tfoot td {
      background: #f1f5f9;
      font-weight: 900;
      border-top: 2px solid #0d365a;
      padding: 8px;
    }

    .badge {
      display: inline-block;
      padding: 2px 6px;
      font-size: 8px;
      font-weight: 800;
      border-radius: 5px;
    }
    .badge-debt {
      background: #fee2e2;
      color: #991b1b;
    }
    .badge-surplus {
      background: #dcfce7;
      color: #15803d;
    }
    .badge-neutral {
      background: #e2e8f0;
      color: #475569;
    }

    .signatures-row {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      page-break-inside: avoid;
    }
    .signature-box {
      width: 250px;
      text-align: center;
    }
    .signature-label {
      font-size: 10px;
      font-weight: 800;
      color: #0d365a;
    }
    .signature-sub {
      font-size: 8.5px;
      color: #64748b;
      margin-top: 2px;
    }
    .signature-line {
      margin-top: 35px;
      border-top: 1px dotted #94a3b8;
    }

    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .screen-action-bar {
        display: none !important;
      }
      .report-container {
        border: none;
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>

  <div class="screen-action-bar">
    <div>
      <div style="font-weight: 900; font-size: 13px; color: #0d365a;">📊 التقرير المالي المجمع لأرصدة وديون الطلاب</div>
      <div style="font-size: 10px; color: #64748b;">معتمد للطباعة الأفقية (Landscape) أو الحفظ كملف PDF عالي الوضوح</div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn-action btn-print" onclick="window.print()">🖨️ طباعة وحفظ كـ PDF</button>
      <button class="btn-action btn-close" onclick="window.close()">إغلاق</button>
    </div>
  </div>

  <div class="report-container">
    
    <table class="header-table">
      <tr>
        <td style="text-align: right; vertical-align: top; width: 65%;">
          <div class="academy-brand-name">${academyName}</div>
          <div class="academy-brand-sub">${reportTitle}</div>
          <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">نطاق التقرير: ${filterSubtitle} | تاريخ الإصدار: ${formattedToday}</div>
        </td>
        <td style="text-align: left; vertical-align: top; width: 35%; font-size: 10px; color: #475569;">
          <div><strong>كود التقرير:</strong> <span style="font-family: monospace;">${reportCode}</span></div>
          <div><strong>المدير المسؤول:</strong> ${managerName}</div>
          <div><strong>هاتف المنصة:</strong> ${centerPhone}</div>
        </td>
      </tr>
    </table>

    <!-- Executive KPIs -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-title">عدد الطلاب المشمولين</div>
        <div class="kpi-num" style="color: #0d365a;">${filteredList.length} طالب</div>
      </div>
      <div class="kpi-card" style="background: #fef2f2; border-color: #fca5a5;">
        <div class="kpi-title" style="color: #991b1b;">إجمالي الديون والذمم المستحقة</div>
        <div class="kpi-num" style="color: #991b1b;">₪${totalDebts.toFixed(1)}</div>
      </div>
      <div class="kpi-card" style="background: #f0fdf4; border-color: #86efac;">
        <div class="kpi-title" style="color: #166534;">إجمالي الأرصدة المشحونة (الفائض)</div>
        <div class="kpi-num" style="color: #166534;">₪${totalSurplus.toFixed(1)}</div>
      </div>
      <div class="kpi-card" style="background: #f8fafc;">
        <div class="kpi-title">صافي المركز المالي للأكاديمية</div>
        <div class="kpi-num" style="color: ${netAcademyBalance >= 0 ? '#166534' : '#991b1b'};">
          ${netAcademyBalance >= 0 ? '+' : ''}₪${netAcademyBalance.toFixed(1)}
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-title">إجمالي الحصص المنجزة</div>
        <div class="kpi-num" style="color: #475569;">${totalSessionsAll} حصة (${totalHoursAll} س)</div>
      </div>
    </div>

    <!-- Main Data Table -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 4%; text-align: center;">م</th>
          <th style="width: 17%;">اسم الطالب</th>
          <th style="width: 10%; text-align: center;">المرحلة / الصف</th>
          <th style="width: 14%; text-align: center;">هاتف الطالب / ولي الأمر</th>
          <th style="width: 14%;">المعلم المشرف</th>
          <th style="width: 9%; text-align: center;">الحصص</th>
          <th style="width: 9%; text-align: center;">إجمالي المدفوع (+)</th>
          <th style="width: 9%; text-align: center;">إجمالي المستهلك (-)</th>
          <th style="width: 8%; text-align: center;">الرصيد المتبقي</th>
          <th style="width: 6%; text-align: center;">الحالة</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
      <tfoot>
        <tr style="background: #f1f5f9; font-weight: 900; border-top: 2px solid #cbd5e1;">
          <td colspan="5" style="text-align: right; font-weight: 800; padding: 10px;">مجموع الساعات الكلي لجميع الحصص المسجلة (${filteredList.length} طالب):</td>
          <td style="text-align: center; font-weight: 900; color: #1d4ed8; background: #e0f2fe; padding: 10px;">${totalHoursAll.toFixed(1)} س (${totalSessionsAll} حصة)</td>
          <td style="text-align: center; color: #166534; font-weight: 800; padding: 10px;">+₪${totalCreditsAll.toFixed(1)}</td>
          <td style="text-align: center; color: #0d365a; font-weight: 800; padding: 10px;">-₪${totalSpentAll.toFixed(1)}</td>
          <td style="text-align: center; color: ${netAcademyBalance >= 0 ? '#166534' : '#991b1b'}; font-weight: 900; padding: 10px;">
            ₪${netAcademyBalance.toFixed(1)}
          </td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <!-- Signatures -->
    <div class="signatures-row">
      <div class="signature-box">
        <div class="signature-label">إعداد الدائرة المالية والمحاسبية</div>
        <div class="signature-sub">مطابقة الأرصدة والذمم المحسوبة</div>
        <div class="signature-line"></div>
      </div>
      <div class="signature-box">
        <div class="signature-label">ختم المنصة المعتمد</div>
        <div class="signature-sub">${centerLicense}</div>
        <div class="signature-line"></div>
      </div>
      <div class="signature-box">
        <div class="signature-label">مدير المنصة: ${managerName}</div>
        <div class="signature-sub">مصادقة واعتماد التقرير المالي العام</div>
        <div class="signature-line"></div>
      </div>
    </div>

  </div>

</body>
</html>
  `;
}

/**
 * 3. توليد رسالة WhatsApp رسمية واضحة ومحترمة لولي الأمر بخصوص كشف الحساب والرصيد
 */
export function buildParentStatementWhatsAppMessage(
  student: Student,
  stats: { finalBalance: number; sessionCount: number; totalHours: number; totalCredits: number; totalSpent: number },
  periodText: string = 'الفترة الحالية',
  academyName: string = 'أكاديمية التفوق أون لاين'
): string {
  const isDebt = stats.finalBalance < -0.01;
  const isZero = Math.abs(stats.finalBalance) <= 0.01;
  const absAmount = Math.abs(stats.finalBalance).toFixed(2);

  let statusMsg = '';
  if (isDebt) {
    statusMsg = `⚠️ يرجى التكرم بالعلم أن هناك ذمة مالية مستحقة للسداد بقيمة: *(${absAmount} ₪)* لتغطية رسوم الحصص المنفذة.`;
  } else if (isZero) {
    statusMsg = `✅ نفيدكم بأن الحساب المالي متوازن تماماً ولا توجد أية مستحقات مسجلة.`;
  } else {
    statusMsg = `💰 يتوفر رصيد دائن متاح في محفظة الطالب بقيمة: *(${absAmount} ₪)*.`;
  }

  return `السلام عليكم ورحمة الله وبركاته،
حضرة ولي أمر الطالب/ـة: *${student.name}* المحترم،

تحية طيبة وبعد من إدارة *${academyName}* 🎓

نرفق لحضرتكم ملخص كشف الحساب والمتابعة الدورية:
📌 *المرحلة الدراسية:* ${student.grade || student.academicLevel || 'مقرر المنصة'}
📌 *الفترة:* ${periodText}
📌 *الحصص التعليمية المنفذة:* ${stats.sessionCount} حصة (${stats.totalHours} ساعة)
📌 *إجمالي الشحن والمدفوعات:* ${stats.totalCredits.toFixed(2)} ₪
📌 *إجمالي رسوم الحصص:* ${stats.totalSpent.toFixed(2)} ₪
📌 *صافي الرصيد الحالي:* ${stats.finalBalance >= 0 ? '+' : ''}${stats.finalBalance.toFixed(2)} ₪

${statusMsg}

يمكنكم طلب كشف الحساب التفصيلي كملف PDF رسمي في أي وقت عبر التواصل مع إدارة المنصة.
شاكرين لكم كريم تعاونكم ومتابعتكم المستمرة لابنكم/ابنتكم.

مع خالص التحيات والتقدير،
إدارة أكاديمية التفوق أون لاين
هاتف: 059-8321040 | أ. د. زكي أبو علان`;
}

/**
 * أداة مساعدة لفتح نافذة الطباعة المتجهة بجودة كاملة للمتصفح
 */
export function triggerDirectReportPrint(htmlContent: string, title: string = 'تقرير'): void {
  const printWindow = window.open('', '_blank', 'width=1100,height=800');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();

    const doPrint = () => {
      try {
        printWindow.focus();
        printWindow.print();
      } catch (err) {
        console.error('Print trigger error:', err);
      }
    };

    if (printWindow.document.fonts && printWindow.document.fonts.ready) {
      printWindow.document.fonts.ready.then(() => {
        setTimeout(doPrint, 250);
      }).catch(() => {
        setTimeout(doPrint, 600);
      });
    } else {
      setTimeout(doPrint, 600);
    }
  } else {
    // Fallback if popup blocked
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();

      const doIframePrint = () => {
        const win = iframe.contentWindow;
        if (!win) return;
        if (win.document.fonts && win.document.fonts.ready) {
          win.document.fonts.ready.then(() => {
            setTimeout(() => {
              win.focus();
              win.print();
              setTimeout(() => iframe.remove(), 2000);
            }, 250);
          }).catch(() => {
            setTimeout(() => {
              win.focus();
              win.print();
              setTimeout(() => iframe.remove(), 2000);
            }, 700);
          });
        } else {
          setTimeout(() => {
            win.focus();
            win.print();
            setTimeout(() => iframe.remove(), 2000);
          }, 700);
        }
      };

      if (iframe.contentWindow?.document.readyState === 'complete') {
        doIframePrint();
      } else {
        iframe.onload = doIframePrint;
      }
    }
  }
}

/**
 * أداة مساعدة لتنزيل التقرير كملف مستقل (HTML أو مجهز للطباعة الفورية)
 */
export function downloadReportAsFile(htmlContent: string, filename: string): void {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
