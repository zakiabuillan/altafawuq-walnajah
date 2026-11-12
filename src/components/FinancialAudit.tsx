// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { db } from '../lib/firebase';
import { doc, updateDoc, deleteField } from 'firebase/firestore';
import { Session, Student, Teacher, formatCustomDate, isTrialSession } from '../types';
import { notifyTeacherOnSessionChange } from '../lib/notificationUtils';
import { calculateStudentDiscount, calculateTeacherBonuses } from '../lib/financialRules';
import { getStudentDefaultHourlyRate } from '../lib/sessionPricing';
import { 
  AlertTriangle, Check, RefreshCw, AlertCircle, TrendingDown, Clock, 
  UserX, ShieldCheck, Edit3, Trash2, ArrowLeftRight, HelpCircle, Info,
  FileSpreadsheet, FileText, Printer, Download, X
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface FinancialAuditProps {
  sessions: Session[];
  students: Student[];
  teachers: Teacher[];
  globalSettings: {
    defaultHourlyRate: number;
    defaultStudentHourlyRate: number;
    defaultTeacherHourlyRate: number;
  };
  fetchMainData: () => Promise<void>;
  setToastAlert: (msg: string | null) => void;
}

export default function FinancialAudit({
  sessions,
  students,
  teachers,
  globalSettings,
  fetchMainData,
  setToastAlert
}: FinancialAuditProps) {
  const [filterType, setFilterType] = useState<'all' | 'mismatch' | 'loss' | 'overlap' | 'orphan' | 'irregular'>('all');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printPreviewHtml, setPrintPreviewHtml] = useState('');
  const [printPreviewTitle, setPrintPreviewTitle] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Manual fast edit modal state
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editDuration, setEditDuration] = useState<number>(1);
  const [editCustomFee, setEditCustomFee] = useState<string>('');
  const [editCustomPayout, setEditCustomPayout] = useState<string>('');

  // Computes active financial rules, student discounts, and teacher bonuses
  const appliedRulesSummary = useMemo(() => {
    let totalDiscountAmount = 0;
    let totalBonusAmount = 0;
    const studentDiscountsList: Array<{ studentName: string; ruleName: string; discount: number; hours: number }> = [];
    const teacherBonusesList: Array<{ teacherName: string; ruleName: string; bonus: number }> = [];

    // Iterate over each student
    students.forEach(student => {
      const studentSessions = sessions.filter(s => s.studentId === student.id && s.status === 'completed');
      const baseStudentRate = getStudentDefaultHourlyRate(student, globalSettings);
      
      const { discountAmount, appliedRules } = calculateStudentDiscount(
        student,
        baseStudentRate,
        globalSettings.financialRules || [],
        studentSessions.length
      );

      if (discountAmount > 0) {
        const studentHours = studentSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
        totalDiscountAmount += discountAmount * studentHours;
        appliedRules.forEach(ruleStr => {
          studentDiscountsList.push({
            studentName: student.name,
            ruleName: ruleStr,
            discount: discountAmount,
            hours: studentHours
          });
        });
      }
    });

    // Iterate over each teacher
    teachers.forEach(teacher => {
      const teacherSessions = sessions.filter(s => s.teacherId === teacher.id && s.status === 'completed');
      const teacherHours = teacherSessions.reduce((sum, s) => sum + (s.durationHours || 0), 0);
      const teacherStudentsCount = new Set(teacherSessions.map(s => s.studentId)).size;

      const { bonusAmount, appliedRules } = calculateTeacherBonuses(
        teacher,
        globalSettings.financialRules || [],
        teacherHours,
        teacherStudentsCount
      );

      if (bonusAmount > 0) {
        totalBonusAmount += bonusAmount;
        appliedRules.forEach(ruleStr => {
          teacherBonusesList.push({
            teacherName: teacher.name,
            ruleName: ruleStr,
            bonus: bonusAmount
          });
        });
      }
    });

    return {
      totalDiscountAmount,
      totalBonusAmount,
      studentDiscountsList,
      teacherBonusesList
    };
  }, [sessions, students, teachers, globalSettings]);

  // 1. Helper to parse time HH:mm to minutes
  const parseTimeToMinutes = (timeStr: string | undefined): number | null => {
    if (!timeStr) return null;
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return null;
    const hrs = parseInt(parts[0], 10);
    const mins = parseInt(parts[1], 10);
    if (isNaN(hrs) || isNaN(mins)) return null;
    return hrs * 60 + mins;
  };

  // 2. Perform the Financial Audit Calculations
  const auditResults = useMemo(() => {
    const issuesList: Array<{
      id: string; // unique issue id
      session: Session;
      student?: Student;
      teacher?: Teacher;
      importance: 'critical' | 'warning' | 'info';
      issueType: 'loss' | 'orphan' | 'overlap' | 'mismatch' | 'irregular';
      title: string;
      description: string;
      currentValues: {
        studentRate: number;
        studentFee: number;
        teacherRate: number;
        teacherPayout: number;
        isCustomFee: boolean;
        isCustomPayout: boolean;
      };
      suggestedValues?: {
        studentFee: number;
        teacherPayout: number;
      };
    }> = [];

    // Filter sessions that are relevant for financial audits (not pending or booked unless of interest, but standard is processed/un-approved/approved completed sessions)
    // All logged sessions that are completed or approved or active:
    const activeSessions = sessions.filter(s => s.status !== 'pending' && s.status !== 'booked');

    // Build map for overlap detection
    // Key: date_teacherId
    const dateTeacherSchedule: Record<string, Session[]> = {};
    activeSessions.forEach(s => {
      if (s.date && s.teacherId) {
        const key = `${s.date}_${s.teacherId}`;
        if (!dateTeacherSchedule[key]) {
          dateTeacherSchedule[key] = [];
        }
        dateTeacherSchedule[key].push(s);
      }
    });

    activeSessions.forEach(session => {
      const student = students.find(st => st.id === session.studentId);
      const teacher = teachers.find(t => t.id === session.teacherId);

      const hasStudent = !!student;
      const hasTeacher = !!teacher;

      // Rate Definitions
      const baseStudentRate = getStudentDefaultHourlyRate(student, globalSettings, teacher);

      // Apply dynamic student discount rules
      const studentCompletedSessionsCount = activeSessions.filter(s => s.studentId === session.studentId && s.status === 'completed').length;
      const { discountAmount } = calculateStudentDiscount(
        student || {},
        baseStudentRate,
        globalSettings.financialRules || [],
        studentCompletedSessionsCount
      );
      const expectedStudentRate = Math.max(0, baseStudentRate - discountAmount);

      const expectedTeacherRate = teacher 
        ? (teacher.payoutRate || teacher.hourlyRate || globalSettings.defaultTeacherHourlyRate || 35)
        : globalSettings.defaultTeacherTeacherRate || 35;

      // Fees computed in system
      const isTrial = isTrialSession(session);
      const isCustomFee = session.customFee !== undefined;
      const currentStudentFee = isTrial ? 0 : (isCustomFee ? session.customFee : (session.durationHours * expectedStudentRate));

      const isCustomPayout = session.customPayout !== undefined;
      const currentTeacherPayout = isTrial ? 0 : (isCustomPayout ? session.customPayout : (session.durationHours * expectedTeacherRate));

      const computedProfit = currentStudentFee - currentTeacherPayout;

      // ------- CHECK A: ORPHANED SESSIONS -------
      if (!hasStudent || !hasTeacher) {
        issuesList.push({
          id: `orphan_${session.id}`,
          session,
          student,
          teacher,
          importance: 'critical',
          issueType: 'orphan',
          title: 'حصة يتيمة (حساب مفقود)',
          description: !hasStudent && !hasTeacher
            ? 'الطالب المعني والمعلم المنسّب غير موجودين في قاعدة البيانات الحالية.'
            : !hasStudent
            ? 'الطالب المعني بهذه الحصة غير موجود أو تم حذفه من قاعدة البيانات.'
            : 'المعلم المعني بهذه الحصة غير موجود أو تم حذفه من قاعدة البيانات.',
          currentValues: {
            studentRate: expectedStudentRate,
            studentFee: currentStudentFee,
            teacherRate: expectedTeacherRate,
            teacherPayout: currentTeacherPayout,
            isCustomFee,
            isCustomPayout
          }
        });
        return; // Skip other fine-grained rate checks for orphans
      }

      // ------- CHECK B: NEGATIVE OPERATIVE MARGIN (LOSS LEAK) -------
      if (computedProfit < 0) {
        issuesList.push({
          id: `loss_${session.id}`,
          session,
          student,
          teacher,
          importance: 'critical',
          issueType: 'loss',
          title: 'تسعير سالب (عجز تشغيلي مالي)',
          description: `الحصة المسجلة تسبب خسارة مالية مباشرة للمركز لأن مستحقات المعلم (₪${currentTeacherPayout}) أكبر من قيمة رسوم الطالب المترتبة (₪${currentStudentFee}).`,
          currentValues: {
            studentRate: expectedStudentRate,
            studentFee: currentStudentFee,
            teacherRate: expectedTeacherRate,
            teacherPayout: currentTeacherPayout,
            isCustomFee,
            isCustomPayout
          },
          suggestedValues: {
            studentFee: session.durationHours * expectedStudentRate,
            teacherPayout: session.durationHours * expectedTeacherRate
          }
        });
      }

      // ------- CHECK C: MANUAL OVERRIDES / DATA MISMATCH -------
      // If manual customFee is active, or customPayout is active, flag for review/unification to verify it matches contracts
      if (isCustomFee || isCustomPayout) {
        const standardStudentFee = session.durationHours * expectedStudentRate;
        const standardTeacherPayout = session.durationHours * expectedTeacherRate;

        const feeDiscrepancy = isCustomFee && Math.abs(currentStudentFee - standardStudentFee) > 0.01;
        const payoutDiscrepancy = isCustomPayout && Math.abs(currentTeacherPayout - standardTeacherPayout) > 0.01;

        if (feeDiscrepancy || payoutDiscrepancy) {
          issuesList.push({
            id: `mismatch_${session.id}`,
            session,
            student,
            teacher,
            importance: 'warning',
            issueType: 'mismatch',
            title: 'استخدام تسعيرة يدوية مخصصة',
            description: `تحتوي هذه الحصة على تعديلات يدوية مستقلة تختلف عن المعدلات الحالية المسجلة بملفات البيانات (الفرق لرسوم الطالب: ₪${(currentStudentFee - standardStudentFee).toFixed(1)}، الفرق للمعلم: ₪${(currentTeacherPayout - standardTeacherPayout).toFixed(1)}).`,
            currentValues: {
              studentRate: expectedStudentRate,
              studentFee: currentStudentFee,
              teacherRate: expectedTeacherRate,
              teacherPayout: currentTeacherPayout,
              isCustomFee,
              isCustomPayout
            },
            suggestedValues: {
              studentFee: standardStudentFee,
              teacherPayout: standardTeacherPayout
            }
          });
        }
      }

      // ------- CHECK D: IRRREGULAR DATA =======
      const durationErr = session.durationHours <= 0 || session.durationHours > 5;
      const timeMissing = !session.startTime || !session.date;

      if (durationErr || timeMissing) {
        issuesList.push({
          id: `irregular_${session.id}`,
          session,
          student,
          teacher,
          importance: durationErr ? 'critical' : 'warning',
          issueType: 'irregular',
          title: 'بيانات غير طبيعية أو مفقودة',
          description: durationErr 
            ? `مدة الحصة المسجلة (${session.durationHours} ساعة) غير طبيعية أو سالبة وتحتاج لتوحيد وتعديل.`
            : 'الحصة تفتقر إلى إدخال تاريخ دقيق أو وقت بدء مجدول بشكل سليم.',
          currentValues: {
            studentRate: expectedStudentRate,
            studentFee: currentStudentFee,
            teacherRate: expectedTeacherRate,
            teacherPayout: currentTeacherPayout,
            isCustomFee,
            isCustomPayout
          }
        });
      }

      // ------- CHECK E: TIME OVERLAP (SAME DATE & SAME TEACHER) -------
      if (session.date && session.teacherId && session.startTime) {
        const key = `${session.date}_${session.teacherId}`;
        const siblingSessions = dateTeacherSchedule[key] || [];
        
        const myStart = parseTimeToMinutes(session.startTime);
        if (myStart !== null) {
          const myEnd = myStart + (session.durationHours * 60);

          siblingSessions.forEach(sibling => {
            if (sibling.id === session.id) return; // don't compare to self
            
            const sibStart = parseTimeToMinutes(sibling.startTime);
            if (sibStart !== null) {
              const sibEnd = sibStart + (sibling.durationHours * 60);

              // Overlap condition
              if (myStart < sibEnd && sibStart < myEnd) {
                // Ensure we don't insert duplicate overlap issues for the exact same pair (S1 vs S2 and S2 vs S1)
                const exists = issuesList.some(item => 
                  item.issueType === 'overlap' && 
                  item.session.id === sibling.id && 
                  item.session.teacherId === session.teacherId
                );

                if (!exists) {
                  const sibSt = students.find(s => s.id === sibling.studentId);
                  issuesList.push({
                    id: `overlap_${session.id}_${sibling.id}`,
                    session,
                    student,
                    teacher,
                    importance: 'warning',
                    issueType: 'overlap',
                    title: 'تداخل وقت المعلم (حجوزات مزدوجة)',
                    description: `المعلم لديه تداخل زمني على نفس التاريخ مع طالب كورس آخر: "${sibSt?.name || 'طالب آخر'}" (يبدأ ${sibling.startTime}، مدة ${sibling.durationHours} ساعة). تداخل الأوقات يسبب خللاً في كشوف الرواتب وقيم الالتزامات.`,
                    currentValues: {
                      studentRate: expectedStudentRate,
                      studentFee: currentStudentFee,
                      teacherRate: expectedTeacherRate,
                      teacherPayout: currentTeacherPayout,
                      isCustomFee,
                      isCustomPayout
                    }
                  });
                }
              }
            }
          });
        }
      }
    });

    return issuesList;
  }, [sessions, students, teachers, globalSettings]);

  // Filter issues based on active filter button
  const filteredIssues = useMemo(() => {
    if (filterType === 'all') return auditResults;
    return auditResults.filter(issue => issue.issueType === filterType);
  }, [auditResults, filterType]);

  // Statistics summaries
  const auditCounters = useMemo(() => {
    const total = auditResults.length;
    const critical = auditResults.filter(i => i.importance === 'critical').length;
    const warning = auditResults.filter(i => i.importance === 'warning').length;
    
    // Total financial value under pending inspection
    const totalValueUnderReview = auditResults.reduce((sum, item) => sum + item.currentValues.studentFee, 0);

    return { total, critical, warning, totalValueUnderReview };
  }, [auditResults]);

  // 3. Quick correction: apply Standard Master profile rates (eliminating manual customFee & customPayout overrides)
  const handleUnifyToStandard = async (sessionId: string) => {
    setIsProcessing(sessionId);
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        customFee: deleteField(),
        customPayout: deleteField()
      });

      // Log action inside global audit trail (using current timestamp & action logger standard)
      try {
        const { logActivity } = await import('../lib/activityLogger');
        const sessionObj = sessions.find(s => s.id === sessionId);
        const stName = students.find(st => st.id === sessionObj?.studentId)?.name || 'مجهول';
        await logActivity({
          actionType: 'UPDATE_TASK',
          actionName: 'توحيد تسعير حصة مالية',
          details: `تم توحيد الحصة التدريسية لمصلحة (${stName}) وإلغاء التسعيرة الفرعية المخصصة لتعتمد تلقائياً على عقود النظام المعتمدة.`
        });
      } catch (err) {
        console.error("Error logging activity logger standard:", err);
      }

      setToastAlert('تم توحيد وتصفير التعديلات اليدوية المسجلة على الحصة بنجاح! طُبقت تسعيرة العقود المسجلة بالملف 🌟');
      await fetchMainData();
    } catch (error) {
      console.error("Error unifying session finances:", error);
      setToastAlert('حدث خطأ أثناء محاولة توحيد بيانات التسعير للحصة.');
    } finally {
      setIsProcessing(null);
    }
  };

  // 4. Batch Auto-Unify All mismatches
  const handleBatchUnifyMismatches = async () => {
    const mismatches = auditResults.filter(item => item.issueType === 'mismatch' || item.issueType === 'loss');
    if (mismatches.length === 0) {
      setToastAlert('لا توجد حصص ذات تسعيرة يدوية أو خسائر معلقة حالياً لتوحيدها تلقائياً.');
      return;
    }

    if (!window.confirm(`هل أنت متأكد من رغبتك في توحيد بيانات (${mismatches.length}) حصص مالية متضررة دفعة واحدة وتطبيق معدلات العقود المعتمدة بالملفات؟`)) {
      return;
    }

    setIsProcessing('batch');
    let successCount = 0;
    try {
      for (const issue of mismatches) {
        const sessionRef = doc(db, 'sessions', issue.session.id);
        await updateDoc(sessionRef, {
          customFee: deleteField(),
          customPayout: deleteField()
        });
        successCount++;
      }

      try {
        const { logActivity } = await import('../lib/activityLogger');
        await logActivity({
          actionType: 'UPDATE_TASK',
          actionName: 'توحيد جماعي للبيانات المالية',
          details: `قام المدير بتشغيل أداة التدقيق والتوحيد المالي لتعميم تسعيرة العقود على عدد (${successCount}) حصص مستهدفة.`
        });
      } catch (e) {
        console.error(e);
      }

      setToastAlert(`تم بنجاح توحيد وتصحيح وإلغاء الفروقات المالية المخصصة لعدد (${successCount}) حصص دراسية متضررة 🚀`);
      await fetchMainData();
    } catch (e) {
      console.error(e);
      setToastAlert('حدث قصور جزئي أثناء التوحيد التلقائي لبعض الحصص، يرجى الفحص اليدوي.');
    } finally {
      setIsProcessing(null);
    }
  };

  // 5. Open editing state
  const handleStartManualEdit = (session: Session) => {
    setEditingSession(session);
    setEditDuration(session.durationHours);
    setEditCustomFee(session.customFee !== undefined ? String(session.customFee) : '');
    setEditCustomPayout(session.customPayout !== undefined ? String(session.customPayout) : '');
  };

  // 6. Submit manual fast edits
  const handleSaveManualEdit = async () => {
    if (!editingSession) return;
    setIsProcessing(editingSession.id);
    try {
      const sessionRef = doc(db, 'sessions', editingSession.id);
      
      const payload: any = {
        durationHours: Number(editDuration)
      };

      if (editCustomFee.trim() === '') {
        payload.customFee = deleteField();
      } else {
        payload.customFee = Number(editCustomFee);
      }

      if (editCustomPayout.trim() === '') {
        payload.customPayout = deleteField();
      } else {
        payload.customPayout = Number(editCustomPayout);
      }

      await updateDoc(sessionRef, payload);

      try {
        await notifyTeacherOnSessionChange(editingSession.id, editingSession, payload);
      } catch (notifyErr) {
        console.error("Error creating notification on FinancialAudit manual edit:", notifyErr);
      }

      setEditingSession(null);
      setToastAlert('تم تعديل وحفظ التفاصيل المالية والزمنية للحصة بنجاح وتحديث الكشوف المرتبطة! 🎉');
      await fetchMainData();
    } catch (error) {
      console.error(error);
      setToastAlert('عذراً، فشل تحديث معلومات الحصة الدراسية.');
    } finally {
      setIsProcessing(null);
    }
  };

  const printHTMLThroughIframe = (htmlContent: string, title?: string) => {
    let docTitle = title || '';
    if (!docTitle) {
      const match = htmlContent.match(/<title>(.*?)<\/title>/i);
      if (match && match[1]) {
        docTitle = match[1];
      }
    }
    setPrintPreviewHtml(htmlContent);
    setPrintPreviewTitle(docTitle || 'تقرير التدقيق المالي');
    setShowPrintPreview(true);
  };

  const handleExportToExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();
      
      const sheetData = filteredIssues.map(issue => {
        const studentLabel = issue.student?.name || (issue.session.isGroupSession ? `مجموعة: ${issue.session.courseCode}` : 'مجهول/تم حذفه');
        const teacherLabel = issue.teacher?.name || 'مجهول/تم حذفه';
        const typeArabic = 
          issue.issueType === 'loss' ? 'تسعير سالب / خسارة ورسوم أقل' :
          issue.issueType === 'mismatch' ? 'تسعيرة يدوية مخصصة' :
          issue.issueType === 'overlap' ? 'تداخل زمني وجدول مزدوج' :
          issue.issueType === 'orphan' ? 'حصة يتيمة مجهولة الربط' : 'قيمة أو مدة غير طبيعية';

        const importanceArabic = 
          issue.importance === 'critical' ? 'حرج جداً (أحمر)' :
          issue.importance === 'warning' ? 'تحذير (برتقالي)' : 'مراجعة (أزرق)';

        return {
          'عنوان التنبيه المالي': issue.title,
          'نوع المخالفة المحاسبية': typeArabic,
          'الأهمية والخطورة': importanceArabic,
          'تاريخ اللقاء': issue.session.date ? formatCustomDate(issue.session.date) : 'غير محدد',
          'وقت البدء': issue.session.startTime || 'غير محدد',
          'مدة الحصة (بالساعات)': issue.session.durationHours,
          'اسم الطالب المعني': studentLabel,
          'المعلم المشرف': teacherLabel,
          'قيمة رسوم كشف الطالب (₪)': issue.currentValues.studentFee,
          'قيمة مستحقات راتب المعلم (₪)': issue.currentValues.teacherPayout,
          'صافي أرباح الأكاديمية (₪)': issue.currentValues.studentFee - issue.currentValues.teacherPayout,
          'وصف تفاصيل المشكلة المالية': issue.description
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "تقرير المطابقة والمخالفات المالية");
      
      XLSX.writeFile(workbook, `تقرير_التدقيق_والمطابقة_المالية_${new Date().toISOString().split('T')[0]}.xlsx`);
      setToastAlert("تم تصدير سجل التدقيق المالي النشط إلى Excel بنجاح! 📊");
    } catch (error) {
      console.error("Excel Export Error:", error);
      setToastAlert("حدث خطأ أثناء محاولة تصدير سجلات التدقيق إلى ملف Excel.");
    }
  };

  const handleExportToPDF = () => {
    const activeIssues = filteredIssues;
    const totalIssues = activeIssues.length;
    const criticalCount = activeIssues.filter(i => i.importance === 'critical').length;
    const warningCount = activeIssues.filter(i => i.importance === 'warning').length;
    const infoCount = activeIssues.filter(i => i.importance === 'info').length;

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>تقرير التدقيق والمطابقة المالية - أكاديمية التفوق</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
    body {
      font-family: 'Cairo', sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 30px;
      direction: rtl;
    }
    .header-table {
      width: 100%;
      border-bottom: 3px double #0d365a;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      color: #0d365a;
      margin: 0;
    }
    .brand-sub {
      font-size: 11px;
      color: #d4a33c;
      font-weight: 700;
      margin: 4px 0 0 0;
    }
    .doc-title {
      font-size: 17px;
      font-weight: 800;
      color: #0d365a;
      text-align: center;
      margin: 20px 0;
      background: #f1f5f9;
      padding: 10px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .grid-info {
      display: table;
      width: 100%;
      margin-bottom: 25px;
    }
    .info-row {
      display: table-row;
    }
    .info-col {
      display: table-cell;
      width: 25%;
      padding: 6px;
    }
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 16px;
    }
    .info-label {
      font-size: 10px;
      color: #64748b;
      margin-bottom: 4px;
      font-weight: 600;
    }
    .info-val {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    table.data-table th {
      background: #0d365a;
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 8px 12px;
      text-align: right;
      border: 1px solid #cbd5e1;
    }
    table.data-table td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
      font-size: 11px;
      color: #334155;
    }
    table.data-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .status-badge {
      display: inline-block;
      padding: 2px 6px;
      font-size: 9px;
      font-weight: 700;
      border-radius: 4px;
    }
    .status-critical {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }
    .status-warning {
      background: #fef3c7;
      color: #92400e;
      border: 1px solid #fcd34d;
    }
    .status-info {
      background: #ccfbf1;
      color: #0f766e;
      border: 1px solid #99f6e4;
    }
    .signatures {
      display: table;
      width: 100%;
      margin-top: 50px;
      border-collapse: collapse;
    }
    .sig-col {
      display: table-cell;
      width: 33.33%;
      padding: 10px 20px;
      text-align: center;
    }
    .sig-line {
      border-top: 1px dashed #94a3b8;
      padding-top: 8px;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
    }
    @media print {
      body { padding: 0; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  <table class="header-table" style="border:none; margin-bottom:5px;">
    <tr style="border:none;">
      <td style="border:none; padding:0; vertical-align:middle;">
        <span class="brand-title">أكاديمية التفوق</span>
        <div class="brand-sub">نظام التدقيق، المطابقة المالية والرقابة الداخلية للأرقام والمكسب</div>
      </td>
      <td style="border:none; padding:0; text-align:left; vertical-align:middle; font-size:11px; color:#64748b; font-weight:bold;">
        تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}
      </td>
    </tr>
  </table>

  <div class="doc-title">سجل فحص الحصص وحالات عدم المطابقة المالية - تصفية: ${filterType === 'all' ? 'جميع المخالفات' : filterType}</div>

  <div class="grid-info">
    <div class="info-row">
      <div class="info-col">
        <div class="info-card">
          <div class="info-label">إجمالي المخالفات المسجلة</div>
          <div class="info-val" style="color: #0f172a;">${totalIssues} تنبيه فحص</div>
        </div>
      </div>
      <div class="info-col">
        <div class="info-card" style="background:#fef2f2; border-color:#fca5a5;">
          <div class="info-label" style="color:#991b1b; font-weight:700;">منها حالات حرجة عاجلة</div>
          <div class="info-val" style="color: #991b1b;">${criticalCount} حالة عجز/يتيمة</div>
        </div>
      </div>
      <div class="info-col">
        <div class="info-card" style="background:#fffbeb; border-color:#fcd34d;">
          <div class="info-label" style="color:#92400e; font-weight:700;">منها تحذيرات / تداخلات</div>
          <div class="info-val" style="color: #92400e;">${warningCount} تداخل/تسعيرة مخصصة</div>
        </div>
      </div>
      <div class="info-col">
        <div class="info-card">
          <div class="info-label">الأهمية البسيطة (معلومات)</div>
          <div class="info-val" style="color: #0f766e;">${infoCount} سجلات تنويه</div>
        </div>
      </div>
    </div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 15%">نوع المخالفة</th>
        <th style="width: 8%">الأهمية</th>
        <th style="width: 25%">الأطراف المعنية (طالب / معلم)</th>
        <th style="width: 32%">وصف وتفاصيل التضارب المالي للمستند</th>
        <th style="width: 10%">الربح الفعلي</th>
        <th style="width: 10%">التاريخ والمستند</th>
      </tr>
    </thead>
    <tbody>
      ${activeIssues.length === 0 ? `
        <tr>
          <td colspan="6" style="text-align: center; color: #64748b; padding: 25px;">لا توجد أي مخالفات مالية مطابقة للفلترة الحالية في كشوف التدقيق والتوحيد</td>
        </tr>
      ` : activeIssues.map(issue => {
        const studentLabel = issue.student?.name || (issue.session.isGroupSession ? `مجموعة: ${issue.session.courseCode}` : 'مجهول/محذوف');
        const teacherLabel = issue.teacher?.name || 'مجهول/محذوف';
        const badgeClass = issue.importance === 'critical' ? 'status-critical' : issue.importance === 'warning' ? 'status-warning' : 'status-info';
        const importanceText = issue.importance === 'critical' ? 'حرج جداً' : issue.importance === 'warning' ? 'تحذير' : 'إرشاد';
        const profit = issue.currentValues.studentFee - issue.currentValues.teacherPayout;
        const profitStyle = profit < 0 ? 'color: #ef4444; font-weight: bold;' : 'color: #10b981; font-weight: bold;';

        return `
          <tr>
            <td><strong>${issue.title}</strong></td>
            <td><span class="status-badge ${badgeClass}">${importanceText}</span></td>
            <td>
              <div>الطالب: <strong>${studentLabel}</strong></div>
              <div style="font-size:10px; color:#64748b; margin-top:2px;">المعلم: ${teacherLabel}</div>
            </td>
            <td>
              <div style="font-size:10.5px; line-height:1.4;">${issue.description}</div>
              <div style="font-size:9.5px; color:#475569; margin-top:4px; font-family: monospace;">
                رسوم الطالب: ₪${issue.currentValues.studentFee.toFixed(1)} | راتب المعلم: ₪${issue.currentValues.teacherPayout.toFixed(1)}
              </div>
            </td>
            <td style="font-family: monospace; ${profitStyle}">₪${profit.toFixed(1)}</td>
            <td style="font-size:10px;">
              <div>${issue.session.date ? formatCustomDate(issue.session.date) : '-'}</div>
              <div style="font-family:monospace; color:#85929E; font-size:9px; margin-top:2px;">#${issue.session.id.substring(0, 7)}</div>
            </td>
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="signatures" style="margin-top: 60px;">
    <div class="sig-col">
      <div class="sig-line">إعداد وتوقيع مراقب الحسابات والدقة</div>
    </div>
    <div class="sig-col">
      <div class="sig-line">مصادقة وإقرار الدائرة المالية والتوحيد</div>
    </div>
    <div class="sig-col">
      <div class="sig-line">مدير المنصة أ.زكي أبو علان</div>
    </div>
  </div>
</body>
</html>
    `;
    printHTMLThroughIframe(html);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 text-right" dir="rtl">
      
      {/* 1. Introductory Info Bar */}
      <section className="bg-slate-900 text-white rounded-[2rem] p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-[#D4A33C]/10 rounded-full blur-3xl -translate-x-10 -translate-y-10" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl translate-x-10 translate-y-10" />
        
        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-4xl">
            <span className="bg-[#D4A33C]/20 text-[#D4A33C] text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full border border-[#D4A33C]/30">
              قسم الرقابة والامتياز المالي 🛡️
            </span>
            <h3 className="text-xl font-black text-white leading-tight">أداة التدقيق المالي الآمن والمطابقة التلقائية</h3>
            <p className="text-xs text-slate-350 leading-relaxed font-sans font-medium">
              يقوم هذا النظام بفحص وتدقيق كل حصة دراسية معتمدة مسبقاً لمطابقتها مع عقود الطلاب ومعامِلات المعلمين المسجلين بملفاتهم الشخصية.
              يساعدك التدقيق في اكتشاف تداخل الأوقات للمعلمين وحالات الخسارة التشغيلية ومعالجة البيانات قبل الفوترة النهائية وتصدير تقارير الرواتب.
            </p>
          </div>
          
          {auditResults.length > 0 && (
            <button
              onClick={handleBatchUnifyMismatches}
              disabled={isProcessing !== null}
              className="px-5 py-3.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-amber-500/10 flex items-center gap-2 transition-all shrink-0 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <RefreshCw size={14} className={isProcessing === 'batch' ? 'animate-spin' : ''} />
              <span>توحيد جميع فروقات التسعير تلقائياً ⚡</span>
            </button>
          )}
        </div>
      </section>

      {/* 1.5 Premium Export Actions Panel */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-right">
          <h4 className="text-sm font-black text-slate-900">تصدير تقرير التدقيق والامتياز المالي الحالي</h4>
          <p className="text-[11px] text-slate-400 font-bold">يمكنك حفظ السجلات الحالية المفلترة كملف Excel للمحاسب أو طباعتها وتصديرها كملف PDF عالي الجودة للأرشفة والتحليل الخارجي.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end animate-in fade-in">
          <button
            onClick={handleExportToExcel}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl flex items-center gap-2 transition-all shadow-md shadow-emerald-600/5 hover:scale-[1.02] active:scale-[0.98] cursor-pointer border border-emerald-500 font-sans"
            title="تصدير السجلات المفلترة كجداول مالية في ملف Excel"
          >
            <FileSpreadsheet size={15} />
            <span>تصدير كشف التدقيق (Excel) 📊</span>
          </button>
          <button
            onClick={handleExportToPDF}
            className="px-5 py-3 bg-[#0D365A] hover:bg-[#154673] text-white font-black text-xs rounded-2xl flex items-center gap-2 transition-all shadow-md shadow-slate-900/5 hover:scale-[1.02] active:scale-[0.98] cursor-pointer border-none font-sans"
            title="طباعة وتصدير كشف التدقيق كملف PDF محاسبي منسق"
          >
            <FileText size={15} />
            <span>تصدير كشف التدقيق كـ PDF 📕</span>
          </button>
        </div>
      </div>

      {/* 2. Key Insights Statistics Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <AlertTriangle size={22} className={auditCounters.total > 0 ? 'animate-pulse' : ''} />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold block">إجمالي تنبيهات المراجعة</span>
            <span className="text-xl font-black text-slate-900 font-mono">
              {auditCounters.total} <span className="text-xs font-bold text-slate-400 font-sans">تنبيه ومخالفة</span>
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <TrendingDown size={22} />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold block">مشاكل مسببة للعجز والخسارة</span>
            <span className="text-xl font-black text-rose-700 font-mono">
              {auditResults.filter(i => i.issueType === 'loss').length} <span className="text-xs font-bold text-slate-400 font-sans">عملية عجز</span>
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0D365A]/5 text-[#0D365A] flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold block">تداخل مواعيد وحجوزات مزدوجة</span>
            <span className="text-xl font-black text-indigo-950 font-mono">
              {auditResults.filter(i => i.issueType === 'overlap').length} <span className="text-xs font-bold text-slate-400 font-sans">تداخلات زمنية</span>
            </span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-extrabold block">إجمالي الأموال تحت الفحص والرقابة</span>
            <span className="text-xl font-black text-emerald-700 font-mono">
              ₪{auditCounters.totalValueUnderReview.toFixed(0)}
            </span>
          </div>
        </div>

      </div>

      {/* ===================== ACTIVE FINANCIAL RULES SUMMARY SECTION ===================== */}
      {(globalSettings.financialRules && globalSettings.financialRules.length > 0) && (
        <section className="bg-[#FAFBFD] border border-slate-200/70 rounded-[2rem] p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-150 pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-md">
                <Check size={18} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">السياسات المالية النشطة وحساب الحوافز التلقائي</h4>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">تفاصيل مطابقة وتطبيق قواعد الخصومات والمكافآت التلقائية المعتمدة على اللقاءات المنجزة</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-black">
              <div className="bg-rose-50 border border-rose-100 text-rose-700 px-3 py-1.5 rounded-xl">
                إجمالي خصومات الطلاب الممنوحة: ₪{appliedRulesSummary.totalDiscountAmount.toFixed(0)}
              </div>
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-xl">
                إجمالي بونص المعلمين المستحق: ₪{appliedRulesSummary.totalBonusAmount.toFixed(0)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Student discounts impact */}
            <div className="space-y-3">
              <h5 className="text-xs font-black text-slate-700">تأثير خصومات الطلاب ({appliedRulesSummary.studentDiscountsList.length})</h5>
              <div className="bg-white border border-slate-150 rounded-2xl p-4 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {appliedRulesSummary.studentDiscountsList.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-800">{item.studentName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-normal">({item.ruleName})</span>
                      <span className="text-rose-600">-₪{item.discount} / ساعة</span>
                    </div>
                  </div>
                ))}
                {appliedRulesSummary.studentDiscountsList.length === 0 && (
                  <p className="text-[10px] text-slate-400 text-center py-4">لم يتم تطبيق أي خصومات على الطلاب للحصص المكتملة في هذا الكشف بعد.</p>
                )}
              </div>
            </div>

            {/* Teacher bonuses impact */}
            <div className="space-y-3">
              <h5 className="text-xs font-black text-slate-700">تأثير مكافآت المعلمين الكلية ({appliedRulesSummary.teacherBonusesList.length})</h5>
              <div className="bg-white border border-slate-150 rounded-2xl p-4 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {appliedRulesSummary.teacherBonusesList.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-800">{item.teacherName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-normal">({item.ruleName})</span>
                      <span className="text-emerald-600">+₪{item.bonus}</span>
                    </div>
                  </div>
                ))}
                {appliedRulesSummary.teacherBonusesList.length === 0 && (
                  <p className="text-[10px] text-slate-400 text-center py-4">لم يتم احتساب أي بونص مستحق للمعلمين للحصص المكتملة في هذا الكشف بعد.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Interactive Issue Filtering Controls */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-100 w-full md:w-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              filterType === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-550 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span>الكل ({auditResults.length})</span>
          </button>
          
          <button
            onClick={() => setFilterType('loss')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'loss'
                ? 'bg-rose-650 bg-rose-600 text-white shadow-sm'
                : 'text-slate-550 hover:bg-rose-50 hover:text-rose-700'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span>تسعير سالب وحسومات خسارة ({auditResults.filter(i => i.issueType === 'loss').length})</span>
          </button>

          <button
            onClick={() => setFilterType('mismatch')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'mismatch'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-550 hover:bg-amber-50 hover:text-amber-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span>تسعيرات يدوية مخصصة ({auditResults.filter(i => i.issueType === 'mismatch').length})</span>
          </button>

          <button
            onClick={() => setFilterType('overlap')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'overlap'
                ? 'bg-indigo-950 text-white shadow-sm'
                : 'text-slate-550 hover:bg-indigo-50 hover:text-indigo-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
            <span>تداخل مواعيد المعلمين ({auditResults.filter(i => i.issueType === 'overlap').length})</span>
          </button>

          <button
            onClick={() => setFilterType('orphan')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'orphan'
                ? 'bg-violet-955 bg-indigo-900 text-white shadow-sm'
                : 'text-slate-550 hover:bg-violet-50 hover:text-indigo-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-violet-600 shrink-0" />
            <span>حصص يتيمة ومجهولة ({auditResults.filter(i => i.issueType === 'orphan').length})</span>
          </button>

          <button
            onClick={() => setFilterType('irregular')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              filterType === 'irregular'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-550 hover:bg-teal-50 hover:text-teal-800'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
            <span>أوقات أو مدد غير طبيعية ({auditResults.filter(i => i.issueType === 'irregular').length})</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 font-extrabold flex items-center gap-1">
          <Info size={13} className="text-slate-350" />
          <span>التحديث تلقائي بنسبة 100% فور حفظ العمليات.</span>
        </div>
      </div>

      {/* 4. Display of Audit Findings */}
      {filteredIssues.length === 0 ? (
        <div className="bg-emerald-50/50 border border-dashed border-emerald-200 rounded-[2.5rem] p-16 text-center space-y-4 animate-in fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
            <ShieldCheck size={32} />
          </div>
          <div className="space-y-1">
            <h4 className="text-lg font-black text-slate-900">حالة ممتازة! لم يتم رصد أي تضاربات مالية</h4>
            <p className="text-xs font-medium text-slate-500 font-sans max-w-xl mx-auto">
              فحص البيانات المحددة لم يكشف عن أي تداخلات في مواعيد وجداول المعلمين، أو عجز في تسعير الساعات أو فروقات يدوية غير مبررة بالملفات المعتمدة. بيانات المركز متناسقة تماماً ومطابقة لقيود العقود والموازين 🌟.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredIssues.map((issue) => {
            const isOrph = issue.issueType === 'orphan';
            const showUnify = issue.issueType === 'mismatch' || issue.issueType === 'loss';
            const studentLabel = issue.student?.name || (issue.session.isGroupSession ? `مجموعة الكورس: ${issue.session.courseCode}` : 'مفقود/مجهول ⚠️');
            const teacherLabel = issue.teacher?.name || 'مفقود/مجهول ⚠️';

            return (
              <div 
                key={issue.id} 
                className={`p-6 bg-white border rounded-[2rem] shadow-sm hover:shadow-md transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-6 text-right relative overflow-hidden ${
                  issue.importance === 'critical' 
                    ? 'border-r-8 border-r-rose-500 border-slate-100' 
                    : issue.importance === 'warning'
                    ? 'border-r-8 border-r-amber-500 border-slate-100'
                    : 'border-r-8 border-r-teal-500 border-slate-100'
                }`}
              >
                
                {/* Visual Label Corner */}
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-black rounded-full ${
                      issue.importance === 'critical'
                        ? 'bg-rose-50 text-rose-700 border border-rose-100'
                        : issue.importance === 'warning'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-teal-50 text-teal-700 border border-teal-100'
                    }`}>
                      {issue.importance === 'critical' ? (
                        <AlertCircle size={11} className="animate-bounce" />
                      ) : (
                        <AlertTriangle size={11} />
                      )}
                      <span>{issue.title}</span>
                    </span>

                    <span className="text-[10px] bg-slate-100 text-slate-550 border border-slate-200 font-extrabold px-3 py-1 rounded-full">
                      تاريخ الحصة: {issue.session.date ? formatCustomDate(issue.session.date) : 'تاريخ غير محدد'}
                    </span>
                    
                    {issue.session.startTime && (
                      <span className="text-[10px] bg-slate-100 text-slate-550 border border-slate-200 font-extrabold px-3 py-1 rounded-full">
                        وقت الحصة: {issue.session.startTime}
                      </span>
                    )}

                    <span className="text-[10px] bg-slate-900 text-slate-100 font-black px-3 py-1 rounded-full font-mono">
                      مستند: {issue.session.id.substring(0, 7)}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-slate-900 leading-snug">
                    حصة {issue.session.subject || 'متابعة'} للطالب <strong className="text-[#0D365A] font-black">{studentLabel}</strong> بقيادة المعلم <strong className="text-[#D4A33C] font-black">{teacherLabel}</strong>
                  </h4>

                  <p className="text-xs font-medium text-slate-550 font-sans max-w-4xl leading-relaxed">
                    {issue.description}
                  </p>

                  {/* Pricing Comparison Panel (ONLY IF NOT AN ORPHAN) */}
                  {!isOrph && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 border border-slate-100 rounded-2xl w-full text-right font-sans">
                      <div>
                        <span className="text-[9px] font-black text-slate-400 block">رسوم الحصة الحالية (للطالب)</span>
                        <span className="text-xs font-black text-indigo-950 font-mono">
                          ₪{issue.currentValues.studentFee.toFixed(1)}
                          {issue.currentValues.isCustomFee && (
                            <span className="text-[9px] font-bold text-amber-600 block">(محدد يدوياً)</span>
                          )}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] font-black text-slate-400 block">مستحقات الحصة الحالية (للمعلم)</span>
                        <span className="text-xs font-black text-rose-700 font-mono">
                          ₪{issue.currentValues.teacherPayout.toFixed(1)}
                          {issue.currentValues.isCustomPayout && (
                            <span className="text-[9px] font-bold text-amber-600 block">(محدد يدوياً)</span>
                          )}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] font-black text-slate-400 block">الربح التشغيلي المباشر للفرق</span>
                        <span className={`text-xs font-black font-mono ${(issue.currentValues.studentFee - issue.currentValues.teacherPayout) < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                          ₪{(issue.currentValues.studentFee - issue.currentValues.teacherPayout).toFixed(1)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[9px] font-black text-slate-400 block">معدل المدة المسجلة</span>
                        <span className="text-xs font-black text-slate-700 font-sans block">
                          {issue.session.durationHours} ساعة
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Operations Buttons (Actions) */}
                <div className="flex xl:flex-col items-stretch gap-2 shrink-0 justify-end">
                  
                  {showUnify && (
                    <button
                      type="button"
                      disabled={isProcessing === issue.session.id}
                      onClick={() => handleUnifyToStandard(issue.session.id)}
                      className="px-4 py-2.5 bg-emerald-550 hover:bg-emerald-600 text-slate-900 border border-slate-200 hover:border-emerald-600 hover:text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      title="توحيد الحصة التدريسية وتطبيق تسعيرات العقود القياسية المخزنة"
                    >
                      <ShieldCheck size={13} className="text-emerald-600 hover:text-white" />
                      <span>{isProcessing === issue.session.id ? 'جاري التوحيد...' : 'توحيد وتطبيق الأسعار ⚡'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleStartManualEdit(issue.session)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    title="تعديل تفاصيل ووقت ومدة الحصة يدوياً"
                  >
                    <Edit3 size={13} className="text-[#D4A33C]" />
                    <span>تعديل التفاصيل المالية ✏️</span>
                  </button>

                  {!isOrph && issue.suggestedValues && (
                    <div className="text-[9px] text-slate-400 bg-[#D4A33C]/5 border border-[#D4A33C]/10 p-2 rounded-xl text-center self-center max-w-[200px] font-medium font-sans">
                      التسعير المالي القياسي المقترح: رسوم طالب <strong>₪{issue.suggestedValues.studentFee.toFixed(1)}</strong>، راتب معلم <strong>₪{issue.suggestedValues.teacherPayout.toFixed(1)}</strong>.
                    </div>
                  )}

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 5. Sleek Floating Manual Edit Overlay Modal Dialog */}
      {editingSession && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 w-full max-w-lg shadow-2xl overflow-hidden relative text-right" dir="rtl">
            <div className="h-2 bg-[#D4A33C]" />
            
            <div className="p-8 space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-slate-900">تعديل وضبط موازين الحصة الدراسية</h4>
                  <p className="text-[11px] text-slate-400 font-extrabold">مستند حصة: {editingSession.id.substring(0, 10)}...</p>
                </div>
                <button
                  onClick={() => setEditingSession(null)}
                  className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-950 transition-colors cursor-pointer text-base font-extrabold"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                
                {/* Duration select */}
                <div className="space-y-1.5 font-sans">
                  <label className="text-xs font-black text-slate-700 block">مدة الحصة بالخيار الزمني (ساعات)</label>
                  <select
                    value={editDuration}
                    onChange={e => setEditDuration(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#D4A33C]/10 focus:border-[#D4A33C]/60 outline-none font-bold text-xs"
                  >
                    {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.5, 4, 4.5, 5].map((p) => (
                      <option key={p} value={p}>{p} ساعة</option>
                    ))}
                  </select>
                </div>

                {/* Custom Fee override input */}
                <div className="space-y-1.5 font-sans">
                  <label className="text-xs font-black text-slate-700 block">تسعير رسوم الطالب الإجمالية (₪) (امسح السعر لتطبيق التلقائي)</label>
                  <input
                    type="number"
                    placeholder="سيتم تطبيق رسوم العقد التلقائي للملف إن ترك فارغاً"
                    value={editCustomFee}
                    onChange={e => setEditCustomFee(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#D4A33C]/10 focus:border-[#D4A33C]/60 outline-none font-bold text-xs text-right"
                  />
                </div>

                {/* Custom Payout override input */}
                <div className="space-y-1.5 font-sans">
                  <label className="text-xs font-black text-slate-700 block">مستحقات وراتب المعلم للحصة بـ (₪) (امسح الراتب لتطبيق التلقائي)</label>
                  <input
                    type="number"
                    placeholder="سيتم تطبيق مستحق الرواتب الملف التلقائي إن ترك فارغاً"
                    value={editCustomPayout}
                    onChange={e => setEditCustomPayout(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-[#D4A33C]/10 focus:border-[#D4A33C]/60 outline-none font-bold text-xs text-right"
                  />
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-amber-900 text-[10px] leading-relaxed font-sans font-medium flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>
                    <strong>تنبيه هام ومساعد:</strong> إن مسح الأرقام كلياً وترك الحقول فارغة سيؤدي فوراً إلى تصفير الأرقام المخصصة وجعل الحصة تعتمد مرونة العقود التلقائية لملف الطالب والأساتذة لتفادي تضارب الحسابات.
                  </span>
                </div>

              </div>

              <div className="flex items-center gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-2xl transition-all cursor-pointer"
                >
                  إلغاء وتراجع
                </button>

                <button
                  type="button"
                  disabled={isProcessing === editingSession.id}
                  onClick={handleSaveManualEdit}
                  className="px-6 py-3 bg-[#0D365A] hover:bg-[#061e33] text-white font-black text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing === editingSession.id ? 'جاري الحفظ والتدقيق...' : 'حفظ التعديلات المالية ✔️'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Robust Print Preview Overlay Modal */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[250] p-4 text-right no-print" dir="rtl">
          <div className="bg-white rounded-[2rem] max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-150 shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header / Actions toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{printPreviewTitle || 'معاينة التقرير قبل الطباعة والتصدير'}</h3>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">يمكنك مراجعة التنسيق، طباعته وحفظه كملف PDF رسمي، أو تنزيله كملف مستقل</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    // Temporarily inject print helper stylesheet
                    const styleId = 'temp-print-styles';
                    let styleEl = document.getElementById(styleId);
                    if (!styleEl) {
                      styleEl = document.createElement('style');
                      styleEl.id = styleId;
                      styleEl.innerHTML = `
                        @media print {
                          body > * {
                            display: none !important;
                          }
                          #temp-print-root {
                            display: block !important;
                            width: 100% !important;
                            direction: rtl !important;
                          }
                        }
                      `;
                      document.head.appendChild(styleEl);
                    }
                    
                    // Create printing container
                    const printRoot = document.createElement('div');
                    printRoot.id = 'temp-print-root';
                    printRoot.innerHTML = printPreviewHtml;
                    document.body.appendChild(printRoot);
                    
                    window.print();
                    
                    // Cleanup
                    setTimeout(() => {
                      printRoot.remove();
                      styleEl?.remove();
                    }, 1200);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-sm transition-all duration-200 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>طباعة وحفظ كـ PDF 🖨️</span>
                </button>
                
                <button
                  onClick={() => {
                    // Package as standalone file with onload print triggers
                    const downloadContent = `
                      <!DOCTYPE html>
                      <html lang="ar" dir="rtl">
                      <head>
                        <meta charset="utf-8">
                        <title>${printPreviewTitle || 'تقرير'}</title>
                        <script>
                          window.onload = function() {
                            setTimeout(function() {
                              window.print();
                            }, 500);
                          }
                        </script>
                      </head>
                      <body style="margin:0; padding:0; background:white;">
                        ${printPreviewHtml}
                      </body>
                      </html>
                    `;
                    const blob = new Blob([downloadContent], { type: 'text/html;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${printPreviewTitle || 'report'}.html`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-sm transition-all duration-200 cursor-pointer"
                  title="تنزيل كملف HTML مستقل لفتحه وحفظه بصيغة PDF مباشرة"
                >
                  <Download size={13} />
                  <span>تنزيل كملف مستقل 📥</span>
                </button>
                
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer"
                >
                  <X size={13} />
                  <span>إغلاق ❌</span>
                </button>
              </div>
            </div>

            {/* Hint alert strip */}
            <div className="bg-amber-500/10 border-b border-amber-500/10 text-amber-900 p-3 text-[10px] font-black text-center">
              💡 <strong>ملاحظة هامة:</strong> في حال لم يتم استدعاء واجهة طباعة المتصفح تلقائياً بسبب حماية المتصفح، يرجى الضغط على زر <strong>"تنزيل كملف مستقل 📥"</strong> وحفظه، ثم فتحه من جهازك لطباعته وحفظه كـ PDF بنقرة واحدة.
            </div>

            {/* Scrollable sheet container styled like elegant paper review */}
            <div className="flex-1 overflow-y-auto bg-slate-100/40 p-6 md:p-8 flex justify-center">
              <div 
                className="bg-white p-8 md:p-12 w-full max-w-[210mm] shadow-lg border border-slate-200/60 rounded-xl text-right font-sans relative"
                dangerouslySetInnerHTML={{ __html: printPreviewHtml }}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
