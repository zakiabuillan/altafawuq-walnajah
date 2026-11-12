import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Teacher, Student } from '../types';

export interface ExamResultItem {
  id: string;
  examId?: string;
  examTitle: string;
  category?: string;
  studentName: string;
  studentPhone?: string;
  score: number;
  correctCount?: number;
  answersCount?: number;
  answers?: any[];
  submittedAt: string;
  teacherId?: string;
  teacherName?: string;
}

export interface ParentReportOptions {
  studentName: string;
  studentPhone?: string;
  studentGrade?: string;
  academyName?: string;
  managerName?: string;
  periodLabel?: string;
  subjectFilter?: string;
  customNote?: string;
  examResults: ExamResultItem[];
  teachers?: Teacher[];
  students?: Student[];
  reportViewMode?: 'detailed' | 'summary';
}

export interface ComputedParentReportStats {
  totalExams: number;
  averageScore: number;
  passedCount: number;
  passRate: number;
  excellentCount: number;
  highestScore: number;
  highestExamTitle: string;
  lowestScore: number;
  lowestExamTitle: string;
  evaluationText: string;
  evaluationColor: string;
  evaluationBg: string;
}

/**
 * Calculates academic statistics for parent report
 */
export function computeParentReportStats(results: ExamResultItem[]): ComputedParentReportStats {
  if (!results || results.length === 0) {
    return {
      totalExams: 0,
      averageScore: 0,
      passedCount: 0,
      passRate: 0,
      excellentCount: 0,
      highestScore: 0,
      highestExamTitle: '-',
      lowestScore: 0,
      lowestExamTitle: '-',
      evaluationText: 'لا توجد بيانات كافية',
      evaluationColor: '#64748b',
      evaluationBg: '#f1f5f9'
    };
  }

  const totalExams = results.length;
  const totalScoreSum = results.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0);
  const averageScore = Math.round((totalScoreSum / totalExams) * 10) / 10;
  const passedCount = results.filter(r => (Number(r.score) || 0) >= 60).length;
  const passRate = Math.round((passedCount / totalExams) * 100);
  const excellentCount = results.filter(r => (Number(r.score) || 0) >= 90).length;

  let highestScore = -1;
  let highestExamTitle = '-';
  let lowestScore = 101;
  let lowestExamTitle = '-';

  results.forEach(r => {
    const sc = Number(r.score) || 0;
    if (sc > highestScore) {
      highestScore = sc;
      highestExamTitle = r.examTitle || 'اختبار';
    }
    if (sc < lowestScore) {
      lowestScore = sc;
      lowestExamTitle = r.examTitle || 'اختبار';
    }
  });

  if (highestScore === -1) highestScore = 0;
  if (lowestScore === 101) lowestScore = 0;

  let evaluationText = '';
  let evaluationColor = '#10b981';
  let evaluationBg = '#ecfdf5';

  if (averageScore >= 90) {
    evaluationText = 'أداء استثنائي وتفوق أكاديمي باهر 🌟';
    evaluationColor = '#047857';
    evaluationBg = '#d1fae5';
  } else if (averageScore >= 80) {
    evaluationText = 'مستوى متقدم ومتميز جداً 🟢';
    evaluationColor = '#0d9488';
    evaluationBg = '#ccfbf1';
  } else if (averageScore >= 70) {
    evaluationText = 'مستوى جيد مع التزام إيجابي 🟡';
    evaluationColor = '#b45309';
    evaluationBg = '#fef3c7';
  } else if (averageScore >= 60) {
    evaluationText = 'مستوى مقبول مع إمكانية تحسن واعدة 🟠';
    evaluationColor = '#c2410c';
    evaluationBg = '#ffedd5';
  } else {
    evaluationText = 'بحاجة إلى تكثيف المتابعة ودعم المهارات الأساسية 🔴';
    evaluationColor = '#b91c1c';
    evaluationBg = '#fee2e2';
  }

  return {
    totalExams,
    averageScore,
    passedCount,
    passRate,
    excellentCount,
    highestScore,
    highestExamTitle,
    lowestScore,
    lowestExamTitle,
    evaluationText,
    evaluationColor,
    evaluationBg
  };
}

/**
 * Returns Arabic grade label and color based on percentage score
 */
export function getScoreGradeInfo(score: number): { label: string; color: string; bg: string } {
  if (score >= 90) return { label: 'ممتاز', color: '#047857', bg: '#d1fae5' };
  if (score >= 80) return { label: 'جيد جداً', color: '#0d9488', bg: '#ccfbf1' };
  if (score >= 70) return { label: 'جيد', color: '#b45309', bg: '#fef3c7' };
  if (score >= 60) return { label: 'مقبول', color: '#c2410c', bg: '#ffedd5' };
  return { label: 'بحاجة لتعزيز', color: '#b91c1c', bg: '#fee2e2' };
}

/**
 * Generates an executive, beautifully formatted HTML report tailored for parents
 */
export function generateParentExamReportHTML(options: ParentReportOptions): string {
  const {
    studentName,
    studentPhone = '',
    studentGrade = 'المرحلة الثانوية والبجروت',
    academyName = 'أكاديمية التفوق أون لاين (أبو علان سنتر)',
    managerName = 'أ. زكي أبو علان (المدير العام)',
    periodLabel = 'الفصل الدراسي الحالي',
    subjectFilter = 'كافة المواد المعتمدة',
    customNote = '',
    examResults = [],
    teachers = [],
    reportViewMode = 'detailed'
  } = options;

  const isSummaryView = reportViewMode === 'summary';
  const stats = computeParentReportStats(examResults);
  const now = new Date();
  const issueDate = now.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  const issueTime = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const auditRef = `REP-PRNT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Find teacher name helper
  const getTeacherName = (tId?: string, fallbackName?: string) => {
    if (fallbackName && fallbackName.trim()) return fallbackName;
    if (!tId) return 'معلم المادة المعتمد';
    const found = teachers.find(t => t.id === tId || (t as any).username === tId);
    return found ? found.name : 'معلم المادة المعتمد';
  };

  // Build exam rows
  const sortedResults = [...examResults].sort((a, b) => {
    return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
  });

  const tableRowsHtml = sortedResults.map((result, idx) => {
    const sc = Number(result.score) || 0;
    const grade = getScoreGradeInfo(sc);
    const dateFormatted = result.submittedAt 
      ? new Date(result.submittedAt).toLocaleDateString('ar-EG', { month: 'numeric', day: 'numeric', year: 'numeric' })
      : '-';
    const teacherName = getTeacherName(result.teacherId, result.teacherName);
    const correctInfo = result.answersCount ? `${result.correctCount || 0} / ${result.answersCount}` : '-';

    if (isSummaryView) {
      // Summary View: Score and Date only alongside exam title
      return `
        <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : 'background-color: #ffffff;'}">
          <td style="padding: 10px 12px; text-align: center; font-weight: 800; color: #475569;">${idx + 1}</td>
          <td style="padding: 10px 12px; text-align: right;">
            <div style="font-weight: 800; color: #0d365a; font-size: 12px;">${result.examTitle || 'اختبار تقييمي'}</div>
            ${result.studentName && result.studentName !== studentName ? `<div style="font-size: 9px; color: #64748b; margin-top: 2px;">الطالب: ${result.studentName}</div>` : ''}
          </td>
          <td style="padding: 10px 12px; text-align: center; font-family: monospace; font-size: 11px; color: #475569;">
            ${dateFormatted}
          </td>
          <td style="padding: 10px 12px; text-align: center;">
            <span style="font-weight: 900; font-size: 13px; color: #0f172a; font-family: monospace;">${sc}%</span>
          </td>
          <td style="padding: 10px 12px; text-align: center;">
            <span style="display: inline-block; padding: 3px 10px; border-radius: 8px; font-size: 10px; font-weight: 800; color: ${grade.color}; background-color: ${grade.bg}; border: 1px solid ${grade.color}40;">
              ${grade.label}
            </span>
          </td>
        </tr>
      `;
    }

    // Detailed View: Full breakdown including subject, supervisor, correct answers count, and progress bar
    return `
      <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : 'background-color: #ffffff;'}">
        <td style="padding: 10px 12px; text-align: center; font-weight: 800; color: #475569;">${idx + 1}</td>
        <td style="padding: 10px 12px; text-align: right;">
          <div style="font-weight: 800; color: #0d365a; font-size: 11.5px;">${result.examTitle || 'اختبار تقييمي'}</div>
          <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">بإشراف: ${teacherName}</div>
        </td>
        <td style="padding: 10px 12px; text-align: center; font-weight: 700; color: #334155;">
          <span style="background: #f1f5f9; padding: 2px 8px; border-radius: 6px; font-size: 10px; border: 1px solid #e2e8f0;">
            ${result.category || 'مراجعة عامة'}
          </span>
        </td>
        <td style="padding: 10px 12px; text-align: center; font-family: monospace; font-size: 10.5px; color: #475569;">
          ${dateFormatted}
        </td>
        <td style="padding: 10px 12px; text-align: center; font-weight: 800; color: #0d365a;">
          ${correctInfo}
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
            <div style="width: 55px; background: #e2e8f0; height: 7px; border-radius: 4px; overflow: hidden; display: inline-block;">
              <div style="width: ${Math.min(100, Math.max(0, sc))}%; height: 100%; background: ${sc >= 80 ? '#10b981' : sc >= 60 ? '#f59e0b' : '#ef4444'};"></div>
            </div>
            <span style="font-weight: 900; font-size: 12px; color: #0f172a; width: 35px; text-align: left;">${sc}%</span>
          </div>
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          <span style="display: inline-block; padding: 3px 10px; border-radius: 8px; font-size: 10px; font-weight: 800; color: ${grade.color}; background-color: ${grade.bg}; border: 1px solid ${grade.color}40;">
            ${grade.label}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>تقرير الأداء الأكاديمي ونتائج الاختبارات - ${studentName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    body {
      font-family: 'Cairo', system-ui, -apple-system, sans-serif;
      color: #0f172a;
      background-color: #ffffff;
      margin: 0;
      padding: 24px;
      direction: rtl;
      font-size: 11px;
      line-height: 1.5;
    }
    
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
    }

    @media print {
      body {
        padding: 0;
        background: #ffffff !important;
      }
      .no-print {
        display: none !important;
      }
      .page-break-inside-avoid {
        page-break-inside: avoid !important;
      }
    }

    .report-wrapper {
      max-width: 100%;
      margin: 0 auto;
    }

    /* Official Academic Header */
    .official-header {
      width: 100%;
      border-bottom: 3px double #0d365a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .brand-title {
      font-size: 21px;
      font-weight: 900;
      color: #0d365a;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      font-size: 11px;
      color: #b45309;
      font-weight: 800;
      margin: 3px 0 0 0;
    }
    .meta-box {
      font-size: 10px;
      color: #475569;
      font-weight: 700;
      text-align: left;
      line-height: 1.6;
    }

    /* Document Title Banner */
    .doc-banner {
      background: linear-gradient(135deg, #0d365a 0%, #1e40af 100%);
      color: #ffffff;
      padding: 14px 20px;
      border-radius: 12px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .doc-banner h1 {
      margin: 0;
      font-size: 16px;
      font-weight: 900;
      letter-spacing: -0.3px;
    }
    .doc-banner p {
      margin: 3px 0 0 0;
      font-size: 10.5px;
      color: #cbd5e1;
      font-weight: 600;
    }
    .doc-badge {
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 800;
      text-align: center;
      color: #fef3c7;
    }

    /* Parent Address & Student Info Card */
    .parent-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-right: 5px solid #d4a33c;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 16px;
    }
    .parent-salutation {
      font-size: 13px;
      font-weight: 900;
      color: #0d365a;
      margin-bottom: 6px;
    }
    .student-meta-grid {
      display: table;
      width: 100%;
      table-layout: fixed;
    }
    .student-meta-cell {
      display: table-cell;
      font-size: 10.5px;
      color: #334155;
      font-weight: 700;
    }
    .student-meta-cell strong {
      color: #0f172a;
    }

    /* Key Performance Indicators (KPIs) */
    .kpi-row {
      display: table;
      width: 100%;
      table-layout: fixed;
      margin-bottom: 18px;
      border-spacing: 8px 0;
    }
    .kpi-col {
      display: table-cell;
      vertical-align: top;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 12px;
      text-align: center;
      box-shadow: 0 1px 2px rgba(0,0,0,0.02);
      border-top: 4px solid #0d365a;
    }
    .kpi-card.gold { border-top-color: #d4a33c; }
    .kpi-card.green { border-top-color: #10b981; }
    .kpi-card.indigo { border-top-color: #6366f1; }
    .kpi-card.teal { border-top-color: #0d9488; }
    .kpi-label {
      font-size: 9.5px;
      color: #64748b;
      font-weight: 800;
      margin-bottom: 4px;
    }
    .kpi-val {
      font-size: 16px;
      font-weight: 900;
      color: #0f172a;
    }
    .kpi-sub {
      font-size: 9px;
      color: #94a3b8;
      font-weight: 700;
      margin-top: 2px;
    }

    /* Standing Badge */
    .standing-banner {
      background: ${stats.evaluationBg};
      border: 1px solid ${stats.evaluationColor}40;
      border-radius: 10px;
      padding: 10px 14px;
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .standing-title {
      font-weight: 900;
      font-size: 12px;
      color: ${stats.evaluationColor};
    }
    .standing-desc {
      font-size: 10px;
      font-weight: 700;
      color: #475569;
    }

    /* Section Headings */
    .section-title {
      font-size: 12px;
      font-weight: 900;
      color: #0d365a;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Results Table */
    .exam-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      font-size: 10.5px;
    }
    .exam-table th {
      background-color: #0d365a;
      color: #ffffff;
      font-weight: 800;
      padding: 10px 12px;
      text-align: center;
      border-left: 1px solid #1e293b;
    }
    .exam-table th:first-child {
      border-top-right-radius: 6px;
    }
    .exam-table th:last-child {
      border-top-left-radius: 6px;
    }

    /* Pedagogical Feedback Section */
    .feedback-box {
      background: #fffdf5;
      border: 1px solid #fde68a;
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 18px;
      page-break-inside: avoid;
    }
    .feedback-title {
      font-size: 11.5px;
      font-weight: 900;
      color: #92400e;
      margin-bottom: 6px;
    }
    .feedback-content {
      font-size: 10.5px;
      color: #78350f;
      line-height: 1.6;
      font-weight: 600;
    }

    /* Signatures Section */
    .signatures-table {
      display: table;
      width: 100%;
      table-layout: fixed;
      margin-top: 24px;
      page-break-inside: avoid;
    }
    .sig-cell {
      display: table-cell;
      text-align: center;
      padding: 0 16px;
    }
    .sig-line {
      border-top: 1px dashed #94a3b8;
      padding-top: 6px;
      font-size: 10px;
      font-weight: 800;
      color: #334155;
    }
    .sig-stamp-box {
      width: 90px;
      height: 60px;
      margin: 0 auto 6px auto;
      border: 1.5px dashed #cbd5e1;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8.5px;
      font-weight: 800;
      color: #94a3b8;
      text-transform: uppercase;
    }

    .doc-footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      font-size: 9px;
      color: #94a3b8;
      text-align: center;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="report-wrapper">
    
    <!-- Header -->
    <table class="official-header">
      <tr>
        <td style="width: 55%; vertical-align: middle;">
          <div class="brand-title">${academyName}</div>
          <div class="brand-sub">إدارة التقييم الأكاديمي والمتابعة المدرسية المتقدمة</div>
        </td>
        <td style="width: 45%; vertical-align: middle; text-align: left;">
          <div class="meta-box">
            <div><strong>الرقم المرجعي:</strong> ${auditRef}</div>
            <div><strong>تاريخ الإصدار:</strong> ${issueDate} (${issueTime})</div>
            <div><strong>الفترة المعتمدة:</strong> ${periodLabel}</div>
            <div><strong>المدير العام:</strong> ${managerName}</div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Main Title Banner -->
    <div class="doc-banner">
      <div>
        <h1>${isSummaryView ? '📋 تقرير ملخص نتائج الاختبارات (العرض الموجز)' : '📋 تقرير الأداء الأكاديمي ونتائج الاختبارات الرسمية'}</h1>
        <p>${isSummaryView ? 'إشعار موجز رسمي لولي الأمر يركز على الدرجات والتواريخ المسجلة (Score & Date Summary)' : 'إشعار رسمي موجه لولي الأمر يتضمن تفاصيل درجات الاختبارات الإلكترونية والتقييمات الدورية'}</p>
      </div>
      <div class="doc-badge">
        ${isSummaryView ? 'العرض الموجز (الدرجة والتاريخ) ⚡' : 'وثيقة معتمدة لولي الأمر 👨‍👩‍👧'}
      </div>
    </div>

    <!-- Parent & Student Info Block -->
    <div class="parent-card">
      <div class="parent-salutation">
        حضرة ولي أمر الطالب/ـة المحترم/ـة: <span style="color: #b45309;">${studentName}</span>
      </div>
      <div class="student-meta-grid">
        <div class="student-meta-cell">
          المرحلة الدراسية: <strong>${studentGrade}</strong>
        </div>
        <div class="student-meta-cell">
          هاتف التواصل: <strong dir="ltr">${studentPhone || 'مسجل بالنظام'}</strong>
        </div>
        <div class="student-meta-cell">
          عدد الاختبارات المنجزة: <strong>${stats.totalExams} اختبارات</strong>
        </div>
        <div class="student-meta-cell">
          المواد المشملة: <strong>${subjectFilter}</strong>
        </div>
      </div>
    </div>

    <!-- Standing / General Evaluation Banner -->
    <div class="standing-banner">
      <div>
        <div class="standing-title">التقييم الأكاديمي العام للمستوى: ${stats.evaluationText}</div>
        <div class="standing-desc">
          أظهر الطالب/ـة التزاماً أكاديمياً ملحوظاً في إتمام الاختبارات المجدولة بمعدل عام بلغ (${stats.averageScore}%).
        </div>
      </div>
      <div style="font-size: 18px; font-weight: 900; color: ${stats.evaluationColor};">
        ${stats.averageScore}%
      </div>
    </div>

    <!-- Key Performance Indicators (KPIs) -->
    <div class="kpi-row">
      <div class="kpi-col">
        <div class="kpi-card gold">
          <div class="kpi-label">المعدل التراكمي للامتحانات</div>
          <div class="kpi-val" style="color: #b45309;">${stats.averageScore}%</div>
          <div class="kpi-sub">من أصل 100%</div>
        </div>
      </div>
      <div class="kpi-col">
        <div class="kpi-card green">
          <div class="kpi-label">نسبة النجاح والاجتياز</div>
          <div class="kpi-val" style="color: #047857;">${stats.passRate}%</div>
          <div class="kpi-sub">${stats.passedCount} من ${stats.totalExams} اختبارات</div>
        </div>
      </div>
      <div class="kpi-col">
        <div class="kpi-card indigo">
          <div class="kpi-label">أعلى درجة محققة</div>
          <div class="kpi-val" style="color: #4338ca;">${stats.highestScore}%</div>
          <div class="kpi-sub" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;">${stats.highestExamTitle}</div>
        </div>
      </div>
      <div class="kpi-col">
        <div class="kpi-card teal">
          <div class="kpi-label">اختبارات بدرجة امتياز</div>
          <div class="kpi-val" style="color: #0f766e;">${stats.excellentCount}</div>
          <div class="kpi-sub">درجة 90% فأعلى 🌟</div>
        </div>
      </div>
    </div>

    <!-- Exam Results Table (Detailed vs Summary) -->
    <div class="page-break-inside-avoid">
      <div class="section-title">
        <span>${isSummaryView ? '📊 ملخص نتائج الاختبارات (الدرجة وتاريخ التقديم فقط):' : '📊 سجل درجات الاختبارات التقييمية التفصيلية:'}</span>
      </div>

      <table class="exam-table">
        <thead>
          ${isSummaryView ? `
            <tr>
              <th style="width: 40px;">#</th>
              <th style="width: 45%; text-align: right;">عنوان الاختبار (Exam Title)</th>
              <th style="width: 25%;">تاريخ التقديم (Date)</th>
              <th style="width: 16%;">الدرجة (Score)</th>
              <th style="width: 14%;">التقدير (Grade)</th>
            </tr>
          ` : `
            <tr>
              <th style="width: 35px;">#</th>
              <th style="width: 30%; text-align: right;">عنوان الاختبار والمشرف</th>
              <th style="width: 16%;">التصنيف / المادة</th>
              <th style="width: 14%;">تاريخ التقديم</th>
              <th style="width: 14%;">الإجابات الصحيحة</th>
              <th style="width: 14%;">الدرجة المئوية</th>
              <th style="width: 12%;">التقدير</th>
            </tr>
          `}
        </thead>
        <tbody>
          ${tableRowsHtml || `
            <tr>
              <td colspan="${isSummaryView ? 5 : 7}" style="padding: 24px; text-align: center; color: #94a3b8; font-weight: 700;">
                لا توجد اختبارات مسجلة للطالب في الفترة المحددة.
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>

    <!-- Pedagogical Guidance / Recommendations for Parents -->
    <div class="feedback-box">
      <div class="feedback-title">💡 توصيات وتوجيهات الهيئة التدريسية لولي الأمر:</div>
      <div class="feedback-content">
        ${customNote ? `
          <div style="background: #ffffff; border: 1px solid #fde68a; padding: 10px 12px; border-radius: 8px; margin-bottom: 8px; font-weight: 700; color: #92400e;">
            <strong>ملاحظة الإدارة والمعلم الخاصة:</strong> ${customNote}
          </div>
        ` : ''}
        <ul style="margin: 0; padding-right: 18px; space-y: 4px;">
          <li>نثمن حرصكم الدائم على متابعة مسيرة الطالب الأكاديمية وندعوكم للاستمرار في تشجيعه للمحافظة على وتيرة الاستعداد للامتحانات.</li>
          <li>يُنصح بمراجعة الأسئلة التي لم يوفق الطالب في الإجابة عنها مع معلم المادة لتثبيت المفاهيم وبناء الثقة الذهنية.</li>
          <li>المنصة وبوابة الطالب متاحة على مدار الساعة للاطلاع على بنوك الأسئلة الإضافية والتواصل المستمر مع المعلم.</li>
        </ul>
      </div>
    </div>

    <!-- Official Signatures Block -->
    <div class="signatures-table">
      <div class="sig-cell">
        <div class="sig-stamp-box">ختم الاعتماد الأكاديمي</div>
        <div class="sig-line">لجنة التقييم والامتحانات</div>
      </div>
      <div class="sig-cell">
        <div style="height: 60px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 6px;">
          <span style="color: #0d365a; font-family: monospace; font-size: 11px; font-weight: bold;">معتمد إلكترونياً</span>
        </div>
        <div class="sig-line">توقيع المعلم المشرف</div>
      </div>
      <div class="sig-cell">
        <div style="height: 60px; display: flex; align-items: flex-end; justify-content: center; padding-bottom: 6px;">
          <span style="color: #0d365a; font-weight: 900; font-size: 11px;">أ. زكي أبو علان</span>
        </div>
        <div class="sig-line">المدير العام للأكاديمية</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="doc-footer">
      أكاديمية التفوق أون لاين • هاتف: 0599000000 • نظام التقييم المدرسي المعتمد • تم توليد هذا التقرير تلقائياً من قاعدة البيانات المركزية (${auditRef})
    </div>

  </div>
</body>
</html>
  `;
}

/**
 * Print Parent Report via isolated invisible iframe
 */
export function printParentExamReport(options: ParentReportOptions): void {
  const html = generateParentExamReportHTML(options);
  
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
      console.error('Error printing parent report:', e);
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 2000);
    }
  }, 500);
}

/**
 * Downloads Parent Exam Report as a PDF file
 */
export async function downloadParentExamReportPDF(options: ParentReportOptions): Promise<void> {
  const safeName = (options.studentName || 'طالب').replace(/[/\\?%*:|"<>]/g, '_').trim();
  const modeLabel = options.reportViewMode === 'summary' ? '_موجز' : '_تفصيلي';
  const filename = `تقرير_نتائج_الاختبارات_أولياء_الأمور_${safeName}${modeLabel}.pdf`;

  try {
    const htmlContent = generateParentExamReportHTML(options);

    // Render offscreen container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '794px'; // A4 width at 96 DPI
    container.style.background = '#ffffff';
    container.style.padding = '0';
    container.innerHTML = htmlContent;
    document.body.appendChild(container);

    // Wait for fonts & styles
    await new Promise(r => setTimeout(r, 400));

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    await pdf.html(container, {
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false
      },
      callback: (doc) => {
        doc.save(filename);
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      },
      margin: [15, 15, 15, 15],
      autoPaging: 'text',
      x: 0,
      y: 0,
      width: 565, // A4 printable width in pt
      windowWidth: 794
    });
  } catch (err) {
    console.warn('jsPDF HTML render fallback to print dialog:', err);
    printParentExamReport(options);
  }
}

/**
 * Captures the hidden, styled print-friendly container specifically for PDF generation
 * using html2canvas & jsPDF, and triggers an immediate download for parents.
 */
export async function downloadParentExamReportPDFFromDOM(
  containerId: string = 'parent-exam-report-print-container',
  customFilename?: string
): Promise<void> {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container #${containerId} not found in DOM`);
    return;
  }

  // Clone container into an active offscreen rendering surface
  const clone = container.cloneNode(true) as HTMLElement;
  clone.id = `${containerId}-render-clone`;
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';
  clone.style.display = 'block';
  clone.style.visibility = 'visible';
  clone.style.width = '794px';
  clone.style.backgroundColor = '#ffffff';
  document.body.appendChild(clone);

  try {
    await new Promise(r => setTimeout(r, 200));

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(customFilename || 'تقرير_نتائج_الاختبارات_أولياء_الأمور.pdf');
  } catch (err) {
    console.error('Error generating PDF from DOM container:', err);
    // Fallback: window print
    window.print();
  } finally {
    if (clone.parentNode) {
      clone.parentNode.removeChild(clone);
    }
  }
}
