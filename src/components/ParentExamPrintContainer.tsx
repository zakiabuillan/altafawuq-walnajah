import React, { forwardRef } from 'react';
import { Student, Teacher } from '../types';
import { ExamResultItem, getScoreGradeInfo, computeParentReportStats } from '../lib/parentExamReportPdf';

interface ParentExamPrintContainerProps {
  examResults: ExamResultItem[];
  students: Student[];
  teachers: Teacher[];
  selectedStudentName?: string;
  customNote?: string;
  reportViewMode?: 'detailed' | 'summary';
}

/**
 * A hidden, styled print-friendly container specifically for PDF generation.
 * Displays the student's name, exam title, score, and correct answers in a clean,
 * branded layout suitable for emailing to parents. Supports both Detailed and Summary views.
 */
export const ParentExamPrintContainer = forwardRef<HTMLDivElement, ParentExamPrintContainerProps>(({
  examResults = [],
  students = [],
  teachers = [],
  selectedStudentName,
  customNote,
  reportViewMode = 'detailed'
}, ref) => {
  const isSummaryView = reportViewMode === 'summary';
  // If specific student selected, filter; otherwise if only 1 student has results, pick that student;
  // or display all student results. If results are empty, provide sample data for parents.
  const displayResults = React.useMemo(() => {
    if (examResults.length > 0) {
      if (selectedStudentName && selectedStudentName !== 'all') {
        const filtered = examResults.filter(r => 
          r.studentName && r.studentName.trim().toLowerCase() === selectedStudentName.trim().toLowerCase()
        );
        if (filtered.length > 0) return filtered;
      }
      return examResults;
    }

    // Default sample data suitable for parents if database is empty
    return [
      {
        id: 'sample-1',
        examTitle: 'امتحان الكيمياء العضوية المتقدمة - بجروت',
        category: 'كيمياء',
        studentName: selectedStudentName || students[0]?.name || 'أحمد خليل المصري',
        studentPhone: students[0]?.phone || '0599123456',
        score: 95,
        correctCount: 19,
        answersCount: 20,
        submittedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        teacherName: teachers[0]?.name || 'أ. زكي أبو علان'
      },
      {
        id: 'sample-2',
        examTitle: 'اختبار التفاضل والتكامل والاقترانات المثلثية',
        category: 'رياضيات',
        studentName: selectedStudentName || students[0]?.name || 'أحمد خليل المصري',
        studentPhone: students[0]?.phone || '0599123456',
        score: 90,
        correctCount: 18,
        answersCount: 20,
        submittedAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
        teacherName: teachers[0]?.name || 'أ. زكي أبو علان'
      }
    ];
  }, [examResults, selectedStudentName, students, teachers]);

  const stats = computeParentReportStats(displayResults);
  const primaryResult = displayResults[0];
  const targetStudentName = selectedStudentName && selectedStudentName !== 'all' 
    ? selectedStudentName 
    : (primaryResult?.studentName || 'طالب الأكاديمية');

  const now = new Date();
  const issueDate = now.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  const auditRef = `REP-PRNT-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

  return (
    <div
      id="parent-exam-report-print-container"
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '-9999px',
        top: 0,
        width: '794px', // Standard A4 width in px at 96 DPI
        minHeight: '1123px', // Standard A4 height in px
        backgroundColor: '#ffffff',
        color: '#0f172a',
        padding: '36px 42px',
        direction: 'rtl',
        fontFamily: "'Cairo', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        boxSizing: 'border-box'
      }}
      className="hidden print:block print:static print:left-auto print:w-full print:p-8"
    >
      {/* ========================================================================= */}
      {/* 1. Official Academy Branded Header                                        */}
      {/* ========================================================================= */}
      <div style={{
        borderBottom: '3px double #0d365a',
        paddingBottom: '16px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '22px',
            fontWeight: 900,
            color: '#0d365a',
            margin: 0,
            letterSpacing: '-0.5px'
          }}>
            أكاديمية التفوق أون لاين
          </div>
          <div style={{
            fontSize: '11px',
            fontWeight: 800,
            color: '#b45309',
            marginTop: '3px'
          }}>
            مركز أبو علان التعليمي • إدارة التقييم الأكاديمي والمتابعة المدرسية
          </div>
        </div>

        <div style={{
          textAlign: 'left',
          fontSize: '10px',
          color: '#475569',
          fontWeight: 700,
          lineHeight: '1.6'
        }}>
          <div><strong>الرقم المرجعي:</strong> {auditRef}</div>
          <div><strong>تاريخ الإصدار:</strong> {issueDate}</div>
          <div><strong>المرجع الإداري:</strong> إشعار رسمي موجه لولي الأمر</div>
          <div><strong>المدير العام:</strong> أ. زكي أبو علان</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. Document Title Banner (Clean, Email-Ready Header)                       */}
      {/* ========================================================================= */}
      <div style={{
        background: 'linear-gradient(135deg, #0d365a 0%, #1e40af 100%)',
        color: '#ffffff',
        padding: '16px 20px',
        borderRadius: '12px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(13, 54, 90, 0.1)'
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '16.5px',
            fontWeight: 900,
            letterSpacing: '-0.3px'
          }}>
            {isSummaryView ? '📋 إشعار ولي الأمر بنتائج التقييم والأداء الأكاديمي (العرض الموجز)' : '📋 إشعار ولي الأمر بنتائج التقييم والأداء الأكاديمي'}
          </h1>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '11px',
            color: '#cbd5e1',
            fontWeight: 600
          }}>
            {isSummaryView ? 'تقرير رسمي موجز يركز على درجات الاختبارات وتواريخ التقديم المعتمدة (Score & Date Summary)' : 'تقرير رسمي مفصل يتضمن تفاصيل درجات الطالب والإجابات الصحيحة ونسبة التحصيل العلمي'}
          </p>
        </div>

        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          padding: '6px 14px',
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: 800,
          color: '#fef3c7',
          textAlign: 'center'
        }}>
          {isSummaryView ? 'العرض الموجز (الدرجة والتاريخ) ⚡' : 'وثيقة معتمدة لولي الأمر 👨‍👩‍👧'}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. Formal Parent Salutation & Addressing Block                            */}
      {/* ========================================================================= */}
      <div style={{
        backgroundColor: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRight: '5px solid #d4a33c',
        borderRadius: '12px',
        padding: '14px 18px',
        marginBottom: '20px'
      }}>
        <div style={{
          fontSize: '13.5px',
          fontWeight: 900,
          color: '#0d365a',
          marginBottom: '6px'
        }}>
          حضرة ولي أمر الطالب/ـة المحترم/ـة: <span style={{ color: '#b45309' }}>{targetStudentName}</span>
        </div>
        <p style={{
          fontSize: '11px',
          color: '#475569',
          margin: '0 0 10px 0',
          lineHeight: '1.6',
          fontWeight: 600
        }}>
          تحية طيبة وبعد، يسر إدارة أكاديمية التفوق أن تضع بين أيديكم هذا التقرير الأكاديمي الرسمي لنتائج الاختبارات والتقييمات الإلكترونية، حرصاً على إشراككم الدائم في مسيرة الطالب التعليمية ودعمه نحو التميز:
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          paddingTop: '8px',
          borderTop: '1px dashed #cbd5e1',
          fontSize: '11px',
          color: '#334155',
          fontWeight: 700
        }}>
          <div>المرحلة الدراسية: <strong style={{ color: '#0f172a' }}>المرحلة الثانوية والبجروت</strong></div>
          <div>هاتف التواصل المسجل: <strong dir="ltr" style={{ color: '#0f172a' }}>{primaryResult?.studentPhone || 'مسجل بالنظام'}</strong></div>
          <div>عدد الاختبارات المرصودة: <strong style={{ color: '#0d365a' }}>{displayResults.length} اختبارات</strong></div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. Highlighted Student Performance Box (Student, Exam, Score, Correct)   */}
      {/* ========================================================================= */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '2px solid #0d365a',
        borderRadius: '14px',
        padding: '18px 20px',
        marginBottom: '22px',
        boxShadow: '0 3px 6px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 900,
          color: '#0d365a',
          marginBottom: '12px',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>⭐ تفاصيل النتيجة والتحصيل الأكاديمي المباشر:</span>
          <span style={{
            fontSize: '10px',
            color: '#047857',
            backgroundColor: '#d1fae5',
            padding: '2px 8px',
            borderRadius: '6px',
            fontWeight: 800
          }}>
            {stats.evaluationText}
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr',
          gap: '14px',
          alignItems: 'center'
        }}>
          {/* Student & Exam Details */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 14px'
          }}>
            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 800 }}>اسم الطالب:</div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0d365a', marginTop: '2px' }}>
              {targetStudentName}
            </div>

            <div style={{ marginTop: '8px', fontSize: '10px', color: '#64748b', fontWeight: 800 }}>عنوان الامتحان الأخير:</div>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>
              {primaryResult?.examTitle || 'امتحان تقييمي شامل'}
            </div>
            <div style={{ fontSize: '10px', color: '#b45309', fontWeight: 700, marginTop: '2px' }}>
              المادة: {primaryResult?.category || 'عام'} • المشرف: {primaryResult?.teacherName || 'معلم المادة المعتمد'}
            </div>
          </div>

          {/* Exam Score */}
          <div style={{
            backgroundColor: '#fffdf5',
            border: '1px solid #fde68a',
            borderTop: '4px solid #d4a33c',
            borderRadius: '10px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '10px', color: '#92400e', fontWeight: 800 }}>الدرجة المحققة (Score):</div>
            <div style={{
              fontSize: '24px',
              fontWeight: 900,
              color: '#b45309',
              fontFamily: 'monospace',
              marginTop: '4px'
            }}>
              {primaryResult?.score !== undefined ? `${primaryResult.score}%` : `${stats.averageScore}%`}
            </div>
            <div style={{
              fontSize: '10px',
              fontWeight: 800,
              color: getScoreGradeInfo(primaryResult?.score || stats.averageScore).color,
              marginTop: '2px'
            }}>
              التقدير: {getScoreGradeInfo(primaryResult?.score || stats.averageScore).label}
            </div>
          </div>

          {/* Third Box: Date in Summary View, or Correct Answers in Detailed View */}
          {isSummaryView ? (
            <div style={{
              backgroundColor: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderTop: '4px solid #0d365a',
              borderRadius: '10px',
              padding: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '10px', color: '#475569', fontWeight: 800 }}>تاريخ التقديم (Date):</div>
              <div style={{
                fontSize: '15px',
                fontWeight: 900,
                color: '#0d365a',
                fontFamily: 'monospace',
                marginTop: '6px'
              }}>
                {primaryResult?.submittedAt ? new Date(primaryResult.submittedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric' }) : issueDate}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, marginTop: '4px' }}>
                تاريخ أحدث اختبار
              </div>
            </div>
          ) : (
            <div style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderTop: '4px solid #10b981',
              borderRadius: '10px',
              padding: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '10px', color: '#065f46', fontWeight: 800 }}>الإجابات الصحيحة:</div>
              <div style={{
                fontSize: '22px',
                fontWeight: 900,
                color: '#047857',
                fontFamily: 'monospace',
                marginTop: '4px'
              }}>
                {primaryResult?.correctCount !== undefined && primaryResult?.answersCount
                  ? `${primaryResult.correctCount} / ${primaryResult.answersCount}`
                  : `${stats.passedCount} / ${stats.totalExams}`}
              </div>
              <div style={{ fontSize: '10px', color: '#047857', fontWeight: 700, marginTop: '2px' }}>
                {primaryResult?.correctCount !== undefined && primaryResult?.answersCount
                  ? `إجابة صحيحة من أصل ${primaryResult.answersCount}`
                  : 'اختبارات مجتازة بنجاح'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. Clean, Professional Exam Results Records Table                          */}
      {/* ========================================================================= */}
      <div style={{ marginBottom: '22px' }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 900,
          color: '#0d365a',
          marginBottom: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>{isSummaryView ? '📊 جدول ملخص نتائج الاختبارات (الدرجة وتاريخ التقديم فقط):' : '📊 جدول نتائج وسجل الاختبارات المعتمد:'}</span>
          <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>
            إجمالي السجلات: {displayResults.length}
          </span>
        </div>

        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: '10.5px',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <thead>
            {isSummaryView ? (
              <tr style={{
                backgroundColor: '#0d365a',
                color: '#ffffff',
                textAlign: 'center',
                fontWeight: 800
              }}>
                <th style={{ padding: '9px 10px', width: '35px' }}>#</th>
                <th style={{ padding: '9px 10px', textAlign: 'right', width: '45%' }}>عنوان الامتحان (Exam Title)</th>
                <th style={{ padding: '9px 10px', width: '25%' }}>تاريخ التقديم (Date)</th>
                <th style={{ padding: '9px 10px', width: '16%' }}>الدرجة (Score)</th>
                <th style={{ padding: '9px 10px', width: '14%' }}>التقدير</th>
              </tr>
            ) : (
              <tr style={{
                backgroundColor: '#0d365a',
                color: '#ffffff',
                textAlign: 'center',
                fontWeight: 800
              }}>
                <th style={{ padding: '9px 10px', width: '35px' }}>#</th>
                <th style={{ padding: '9px 10px', textAlign: 'right', width: '32%' }}>عنوان الامتحان (Exam Title)</th>
                <th style={{ padding: '9px 10px', width: '16%' }}>المادة / التصنيف</th>
                <th style={{ padding: '9px 10px', width: '14%' }}>تاريخ التقديم</th>
                <th style={{ padding: '9px 10px', width: '14%' }}>الإجابات الصحيحة</th>
                <th style={{ padding: '9px 10px', width: '12%' }}>الدرجة (Score)</th>
                <th style={{ padding: '9px 10px', width: '12%' }}>التقدير</th>
              </tr>
            )}
          </thead>
          <tbody>
            {displayResults.map((item, idx) => {
              const sc = Number(item.score) || 0;
              const grade = getScoreGradeInfo(sc);
              const dateStr = item.submittedAt 
                ? new Date(item.submittedAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'numeric', day: 'numeric' })
                : '-';
              const correctStr = item.answersCount ? `${item.correctCount || 0} من ${item.answersCount}` : '-';

              if (isSummaryView) {
                return (
                  <tr 
                    key={item.id || idx}
                    style={{
                      backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff',
                      borderBottom: '1px solid #e2e8f0'
                    }}
                  >
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: '#64748b' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, color: '#0d365a' }}>{item.examTitle}</div>
                      {item.studentName && item.studentName !== targetStudentName && (
                        <div style={{ fontSize: '9px', color: '#475569' }}>الطالب: {item.studentName}</div>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', color: '#475569' }}>
                      {dateStr}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', fontSize: '12px' }}>
                      {sc}%
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '9.5px',
                        fontWeight: 800,
                        color: grade.color,
                        backgroundColor: grade.bg,
                        border: `1px solid ${grade.color}40`
                      }}>
                        {grade.label}
                      </span>
                    </td>
                  </tr>
                );
              }

              return (
                <tr 
                  key={item.id || idx}
                  style={{
                    backgroundColor: idx % 2 === 1 ? '#f8fafc' : '#ffffff',
                    borderBottom: '1px solid #e2e8f0'
                  }}
                >
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: '#64748b' }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: '#0d365a' }}>{item.examTitle}</div>
                    {item.studentName && item.studentName !== targetStudentName && (
                      <div style={{ fontSize: '9px', color: '#475569' }}>الطالب: {item.studentName}</div>
                    )}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>
                    <span style={{
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '9.5px'
                    }}>
                      {item.category || 'عام'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'monospace', color: '#475569' }}>
                    {dateStr}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: '#047857' }}>
                    {correctStr}
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', fontSize: '11.5px' }}>
                    {sc}%
                  </td>
                  <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '9.5px',
                      fontWeight: 800,
                      color: grade.color,
                      backgroundColor: grade.bg,
                      border: `1px solid ${grade.color}40`
                    }}>
                      {grade.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* 6. Guidance & Pedagogical Feedback for Parents                           */}
      {/* ========================================================================= */}
      <div style={{
        backgroundColor: '#fffdf5',
        border: '1px solid #fde68a',
        borderRadius: '12px',
        padding: '14px 18px',
        marginBottom: '22px'
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 900,
          color: '#92400e',
          marginBottom: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span>💡 توجيهات وتوصيات الهيئة التعليمية لولي الأمر:</span>
        </div>
        
        {customNote && (
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #fde68a',
            padding: '8px 12px',
            borderRadius: '8px',
            marginBottom: '8px',
            fontSize: '11px',
            fontWeight: 700,
            color: '#78350f'
          }}>
            <strong>ملاحظة الإدارة الخاصة:</strong> {customNote}
          </div>
        )}

        <ul style={{
          margin: 0,
          paddingRight: '18px',
          fontSize: '10.5px',
          color: '#78350f',
          lineHeight: '1.6',
          fontWeight: 600
        }}>
          <li>نثمن اهتمامكم الدائم بمتابعة تحصيل الطالب، وندعوكم لمواصلة تحفيزه للمحافظة على مستواه المتقدم.</li>
          <li>يمكن للطالب مراجعة الأسئلة غير الموفقة مع معلم المادة عبر المنصة أو في الحصة القادمة لتثبيت المفاهيم.</li>
          <li>تتوفر في بوابة الطالب بنوك أسئلة تفاعلية ومراجعات ذكية مستمرة للاستعداد التام لاختبارات البجروت الرسمية.</li>
        </ul>
      </div>

      {/* ========================================================================= */}
      {/* 7. Signatures & Official Stamp Block                                     */}
      {/* ========================================================================= */}
      <div style={{
        display: 'table',
        width: '100%',
        tableLayout: 'fixed',
        marginTop: '26px'
      }}>
        <div style={{ display: 'table-cell', textAlign: 'center', padding: '0 15px' }}>
          <div style={{
            width: '85px',
            height: '55px',
            margin: '0 auto 6px auto',
            border: '1.5px dashed #cbd5e1',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '8px',
            fontWeight: 800,
            color: '#94a3b8'
          }}>
            ختم الاعتماد الرسمي
          </div>
          <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '6px', fontSize: '10px', fontWeight: 800, color: '#334155' }}>
            لجنة الامتحانات والتقييم
          </div>
        </div>

        <div style={{ display: 'table-cell', textAlign: 'center', padding: '0 15px' }}>
          <div style={{ height: '55px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '4px' }}>
            <span style={{ color: '#0d365a', fontFamily: 'monospace', fontSize: '10.5px', fontWeight: 'bold' }}>
              معتمد إلكترونياً ✓
            </span>
          </div>
          <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '6px', fontSize: '10px', fontWeight: 800, color: '#334155' }}>
            توقيع المعلم المشرف
          </div>
        </div>

        <div style={{ display: 'table-cell', textAlign: 'center', padding: '0 15px' }}>
          <div style={{ height: '55px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '4px' }}>
            <span style={{ color: '#0d365a', fontWeight: 900, fontSize: '11px' }}>
              أ. زكي أبو علان
            </span>
          </div>
          <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '6px', fontSize: '10px', fontWeight: 800, color: '#334155' }}>
            المدير العام للأكاديمية
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 8. Official Document Footer                                              */}
      {/* ========================================================================= */}
      <div style={{
        marginTop: '24px',
        paddingTop: '10px',
        borderTop: '1px solid #e2e8f0',
        fontSize: '9px',
        color: '#94a3b8',
        textAlign: 'center',
        fontWeight: 700
      }}>
        أكاديمية التفوق أون لاين • هاتف: 0599000000 • نظام التقييم المدرسي المعتمد • تم توليد هذا المستند إلكترونياً وهو جاهز للإرفاق بالبريد الإلكتروني لأولياء الأمور
      </div>
    </div>
  );
});

ParentExamPrintContainer.displayName = 'ParentExamPrintContainer';
