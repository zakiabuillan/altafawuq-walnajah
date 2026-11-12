import React, { useState, useMemo } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Download, 
  Calendar, 
  CheckCircle2, 
  Layers, 
  Users, 
  GraduationCap, 
  BookOpen, 
  CreditCard, 
  DollarSign, 
  Building2, 
  TrendingUp, 
  FileText, 
  Filter,
  Check,
  ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, Teacher, Session, StudentCredit, Expense } from '../types';
import { getStudentSessionCost } from '../lib/sessionPricing';

export type ExportReportType = 
  | 'all_comprehensive'
  | 'student_balances'
  | 'teacher_salaries'
  | 'sessions_profits'
  | 'student_credits'
  | 'teacher_payouts'
  | 'expenses'
  | 'monthly_analytics';

export type ExportFileFormat = 'xlsx' | 'csv';

export type ExportDateScope = 'active_filter' | 'current_month' | 'current_year' | 'all_time';

interface FinancialReportsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  teachers: Teacher[];
  sessions: Session[];
  credits: StudentCredit[];
  payments: any[];
  expenses: Expense[];
  startDate: string;
  endDate: string;
  selectedSubject?: string;
  globalSettings?: any;
  allStudentAlerts?: any[];
  teacherTableData?: any[];
}

export const FinancialReportsExportModal: React.FC<FinancialReportsExportModalProps> = ({
  isOpen,
  onClose,
  students = [],
  teachers = [],
  sessions = [],
  credits = [],
  payments = [],
  expenses = [],
  startDate,
  endDate,
  selectedSubject = 'all',
  globalSettings,
  allStudentAlerts = [],
  teacherTableData = []
}) => {
  const [reportType, setReportType] = useState<ExportReportType>('all_comprehensive');
  const [fileFormat, setFileFormat] = useState<ExportFileFormat>('xlsx');
  const [dateScope, setDateScope] = useState<ExportDateScope>('active_filter');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Resolve active dates based on date scope
  const { filterStart, filterEnd, scopeLabel } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (dateScope === 'active_filter') {
      return {
        filterStart: startDate || '',
        filterEnd: endDate || '',
        scopeLabel: startDate && endDate 
          ? `الفترة المحددة في اللوحة (${startDate} إلى ${endDate})` 
          : startDate 
          ? `ابتداءً من ${startDate}` 
          : endDate 
          ? `حتى ${endDate}` 
          : 'كافة الفترات (السجل التراكمي)'
      };
    }

    if (dateScope === 'current_month') {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      return {
        filterStart: monthStart,
        filterEnd: todayStr,
        scopeLabel: `الشهر الحالي (${monthStart} إلى ${todayStr})`
      };
    }

    if (dateScope === 'current_year') {
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();
      const startYear = currentMonth >= 8 ? currentYear : currentYear - 1;
      const endYear = startYear + 1;
      return {
        filterStart: `${startYear}-09-01`,
        filterEnd: `${endYear}-08-31`,
        scopeLabel: `العام الدراسي الحالي (${startYear}/${endYear})`
      };
    }

    return {
      filterStart: '',
      filterEnd: '',
      scopeLabel: 'كافة الفترات (سجل تراكمي شامل)'
    };
  }, [dateScope, startDate, endDate]);

  // Filter datasets based on active scope and subject
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (s.approved === false) return false;
      const sDate = s.date || '';
      if (filterStart && sDate < filterStart) return false;
      if (filterEnd && sDate > filterEnd) return false;
      if (selectedSubject && selectedSubject !== 'all') {
        if ((s.subject || '').trim() !== selectedSubject.trim()) return false;
      }
      return true;
    });
  }, [sessions, filterStart, filterEnd, selectedSubject]);

  const filteredCredits = useMemo(() => {
    return credits.filter(c => {
      const cDate = c.date || '';
      if (filterStart && cDate < filterStart) return false;
      if (filterEnd && cDate > filterEnd) return false;
      return true;
    });
  }, [credits, filterStart, filterEnd]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const pDate = p.date || '';
      if (filterStart && pDate < filterStart) return false;
      if (filterEnd && pDate > filterEnd) return false;
      return true;
    });
  }, [payments, filterStart, filterEnd]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const eDate = e.date || '';
      if (filterStart && eDate < filterStart) return false;
      if (filterEnd && eDate > filterEnd) return false;
      return true;
    });
  }, [expenses, filterStart, filterEnd]);

  // Helper to adjust column widths for XLSX sheets
  const autoFitCols = (worksheet: any, data: any[]) => {
    if (!data || data.length === 0) return;
    const maxLens: Record<string, number> = {};
    data.forEach(row => {
      Object.keys(row).forEach(key => {
        const val = String(row[key] ?? '');
        maxLens[key] = Math.max(maxLens[key] || key.length + 3, val.length + 3);
      });
    });
    worksheet['!cols'] = Object.keys(maxLens).map(key => ({ wch: Math.min(maxLens[key], 45) }));
    worksheet['!views'] = [{ rightToLeft: true, showGridLines: true }];
  };

  // Helper to trigger CSV download with UTF-8 BOM
  const downloadCsv = (headers: string[], rows: (string | number)[][], filename: string) => {
    const escape = (val: any) => {
      if (val === null || val === undefined) return '';
      let str = String(val).trim();
      if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        str = `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escape).join(','),
      ...rows.map(row => row.map(escape).join(','))
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Build row data for each module
  const getStudentBalancesData = () => {
    return (allStudentAlerts.length > 0 ? allStudentAlerts : students).map((st: any, idx) => {
      const studentObj = students.find(s => s.id === st.id) || st;
      const phone = studentObj.phone || studentObj.phoneNumber || 'غير مسجل';
      const grade = studentObj.grade || studentObj.academicLevel || 'غير محدد';
      const topped = Number((st.totalToppedUp ?? 0).toFixed(2));
      const spent = Number((st.totalSpent ?? 0).toFixed(2));
      const bal = Number((st.balance ?? (topped - spent)).toFixed(2));

      return {
        '#': idx + 1,
        'اسم الطالب': studentObj.name || 'طالب',
        'الصف / المستوى': grade,
        'رقم الهاتف': phone,
        'إجمالي الشحن (₪)': topped,
        'المستهلك بالحصص (₪)': spent,
        'الرصيد المتبقي (₪)': bal,
        'حد الأمان الأدنى (₪)': st.threshold ?? -100,
        'الحالة المالية': studentObj.isOpenBalance
          ? 'رصيد مفتوح من المدير 🔓'
          : bal < (st.threshold ?? -100) 
          ? 'رصيد حرج 🚨' 
          : bal <= 0 
          ? 'رصيد منخفض ⚠️' 
          : 'رصيد إيجابي آمن ✅'
      };
    });
  };

  const getTeacherSalariesData = () => {
    return (teacherTableData.length > 0 ? teacherTableData : teachers).map((t: any, idx) => {
      const teacherObj = teachers.find(item => item.id === t.id) || t;
      const earned = Number((t.earned ?? 0).toFixed(2));
      const paid = Number((t.paid ?? 0).toFixed(2));
      const balance = Number((t.balance ?? (earned - paid)).toFixed(2));

      return {
        '#': idx + 1,
        'اسم المعلم': teacherObj.name || 'معلم',
        'المادة / التخصص': teacherObj.subject || 'عام',
        'رقم الهاتف': teacherObj.phone || 'غير مسجل',
        'ساعات التدريس المعتمدة': Number((t.hours ?? 0).toFixed(1)),
        'إجمالي المستحقات المرصودة (₪)': earned,
        'إجمالي المبالغ المصروفة (₪)': paid,
        'الرصيد المتبقي المستحق للمعلم (₪)': balance,
        'الحالة المحاسبية': balance > 0 ? 'مستحق للصرف ⏳' : 'مسدد بالكامل ✅'
      };
    });
  };

  const getSessionsProfitsData = () => {
    return filteredSessions.map((session, idx) => {
      const teacherObj = teachers.find(t => t.id === session.teacherId);
      const studentObj = students.find(s => s.id === session.studentId);
      const studentFee = getStudentSessionCost(session, studentObj, teacherObj, globalSettings);
      
      let teacherPayout = 0;
      if (session.customPayout !== undefined && Number(session.customPayout) > 0) {
        teacherPayout = Number(session.customPayout);
      } else {
        const rate = teacherObj?.payoutRate || teacherObj?.hourlyRate || globalSettings?.defaultTeacherHourlyRate || 35;
        teacherPayout = (Number(session.durationHours) || 1) * rate;
      }

      const netProfit = studentFee - teacherPayout;

      return {
        '#': idx + 1,
        'تاريخ الحصة': session.date || 'غير محدد',
        'المادة الدراسية': session.subject || 'مادة عامة',
        'عنوان / موضوع الدرس': session.topic || session.title || 'حصة تعليمية',
        'اسم المعلم': teacherObj?.name || 'غير معروف',
        'اسم الطالب': studentObj?.name || 'غير معروف',
        'المدة (ساعات)': Number((session.durationHours || 1).toFixed(2)),
        'تكلفة الحصة على الطالب (₪)': Number(studentFee.toFixed(2)),
        'أجر المعلم عن الحصة (₪)': Number(teacherPayout.toFixed(2)),
        'صافي ربح المنصة (₪)': Number(netProfit.toFixed(2)),
        'نوع الحصة': session.isGroupSession || session.isGroup ? 'دورة جماعية' : 'فردية خصوصي',
        'الملاحظات': session.notes || '-'
      };
    }).sort((a, b) => (b['تاريخ الحصة'] || '').localeCompare(a['تاريخ الحصة'] || ''));
  };

  const getStudentCreditsData = () => {
    return filteredCredits.map((c, idx) => {
      const studentObj = students.find(s => s.id === c.studentId);
      return {
        '#': idx + 1,
        'تاريخ الشحن': c.date || 'غير محدد',
        'اسم الطالب': studentObj?.name || 'غير معروف',
        'المبلغ المشحون (₪)': Number((c.amount || 0).toFixed(2)),
        'طريقة الدفع': c.method || 'نقداً',
        'رقم السند / المرجع': c.reference || '-',
        'البيان والملاحظات': c.note || 'شحن رصيد محفظة'
      };
    }).sort((a, b) => (b['تاريخ الشحن'] || '').localeCompare(a['تاريخ الشحن'] || ''));
  };

  const getTeacherPaymentsData = () => {
    return filteredPayments.map((p, idx) => {
      const teacherObj = teachers.find(t => t.id === p.teacherId);
      return {
        '#': idx + 1,
        'تاريخ الدفعة': p.date || 'غير محدد',
        'اسم المعلم': teacherObj?.name || 'غير معروف',
        'المبلغ المصروف (₪)': Number((p.amount || 0).toFixed(2)),
        'رقم السند / الشيك / الحوالة': p.reference || '-',
        'البيان والملاحظات': p.note || 'صرف مستحقات معلم'
      };
    }).sort((a, b) => (b['تاريخ الدفعة'] || '').localeCompare(a['تاريخ الدفعة'] || ''));
  };

  const getExpensesData = () => {
    return filteredExpenses.map((exp, idx) => {
      return {
        '#': idx + 1,
        'تاريخ المصروف': exp.date || 'غير محدد',
        'التصنيف': exp.category || 'عام',
        'البند / الوصف': exp.title || exp.note || 'مصروف تشغيلي',
        'المبلغ المصروف (₪)': Number((exp.amount || 0).toFixed(2)),
        'طريقة الدفع': exp.paymentMethod || 'نقداً',
        'الجهة المستفيدة': exp.paidTo || '-',
        'رقم الفاتورة / المرجع': exp.invoiceRef || '-',
        'ملاحظات إضافية': exp.note || '-'
      };
    }).sort((a, b) => (b['تاريخ المصروف'] || '').localeCompare(a['تاريخ المصروف'] || ''));
  };

  const getMonthlyAnalyticsData = () => {
    const monthMap = new Map<string, { revenue: number; teacherCost: number; expenses: number; sessionCount: number }>();

    filteredSessions.forEach(s => {
      const mKey = (s.date || '').slice(0, 7) || 'غير محدد';
      const cur = monthMap.get(mKey) || { revenue: 0, teacherCost: 0, expenses: 0, sessionCount: 0 };
      const teacherObj = teachers.find(t => t.id === s.teacherId);
      const studentObj = students.find(st => st.id === s.studentId);
      const fee = getStudentSessionCost(s, studentObj, teacherObj, globalSettings);
      const rate = teacherObj?.payoutRate || teacherObj?.hourlyRate || globalSettings?.defaultTeacherHourlyRate || 35;
      const payout = s.customPayout !== undefined && Number(s.customPayout) > 0 ? Number(s.customPayout) : (Number(s.durationHours) || 1) * rate;

      cur.revenue += fee;
      cur.teacherCost += payout;
      cur.sessionCount += 1;
      monthMap.set(mKey, cur);
    });

    filteredExpenses.forEach(exp => {
      const mKey = (exp.date || '').slice(0, 7) || 'غير محدد';
      const cur = monthMap.get(mKey) || { revenue: 0, teacherCost: 0, expenses: 0, sessionCount: 0 };
      cur.expenses += Number(exp.amount || 0);
      monthMap.set(mKey, cur);
    });

    const rows: any[] = [];
    Array.from(monthMap.entries()).sort((a, b) => b[0].localeCompare(a[0])).forEach(([month, data], idx) => {
      const netProfit = data.revenue - data.teacherCost - data.expenses;
      const margin = data.revenue > 0 ? ((netProfit / data.revenue) * 100).toFixed(1) + '%' : '0%';
      rows.push({
        '#': idx + 1,
        'الشهر (السنة-الشهر)': month,
        'عدد الحصص': data.sessionCount,
        'إجمالي الإيرادات المحصلة (₪)': Math.round(data.revenue),
        'أجور ورواتب المعلمين (₪)': Math.round(data.teacherCost),
        'المصروفات التشغيلية (₪)': Math.round(data.expenses),
        'صافي الربح الفعلي للمنصة (₪)': Math.round(netProfit),
        'هامش الربحية (%)': margin
      });
    });

    return rows;
  };

  // Main Export Handler
  const handleExecuteExport = (selectedFormat: ExportFileFormat) => {
    setIsExporting(true);
    setExportSuccessMsg('');

    try {
      const dateTag = new Date().toISOString().split('T')[0];

      if (selectedFormat === 'xlsx') {
        const workbook = XLSX.utils.book_new();

        if (reportType === 'all_comprehensive') {
          // 1. Student Balances
          const stData = getStudentBalancesData();
          const wsSt = XLSX.utils.json_to_sheet(stData);
          autoFitCols(wsSt, stData);
          XLSX.utils.book_append_sheet(workbook, wsSt, 'أرصدة الطلاب');

          // 2. Teachers Salaries
          const tData = getTeacherSalariesData();
          const wsT = XLSX.utils.json_to_sheet(tData);
          autoFitCols(wsT, tData);
          XLSX.utils.book_append_sheet(workbook, wsT, 'مستحقات المعلمين');

          // 3. Sessions & Profit
          const sessData = getSessionsProfitsData();
          const wsSess = XLSX.utils.json_to_sheet(sessData);
          autoFitCols(wsSess, sessData);
          XLSX.utils.book_append_sheet(workbook, wsSess, 'سجل الحصص والأرباح');

          // 4. Student Credits
          const crData = getStudentCreditsData();
          const wsCr = XLSX.utils.json_to_sheet(crData);
          autoFitCols(wsCr, crData);
          XLSX.utils.book_append_sheet(workbook, wsCr, 'شحن أرصدة الطلاب');

          // 5. Teacher Payments
          const payData = getTeacherPaymentsData();
          const wsPay = XLSX.utils.json_to_sheet(payData);
          autoFitCols(wsPay, payData);
          XLSX.utils.book_append_sheet(workbook, wsPay, 'صرف دفعات المعلمين');

          // 6. Expenses
          const expData = getExpensesData();
          const wsExp = XLSX.utils.json_to_sheet(expData);
          autoFitCols(wsExp, expData);
          XLSX.utils.book_append_sheet(workbook, wsExp, 'المصروفات التشغيلية');

          // 7. Monthly Analytics
          const monData = getMonthlyAnalyticsData();
          const wsMon = XLSX.utils.json_to_sheet(monData);
          autoFitCols(wsMon, monData);
          XLSX.utils.book_append_sheet(workbook, wsMon, 'الأرباح والأداء الشهري');

          XLSX.writeFile(workbook, `التقرير_المالي_الشامل_المتكامل_${dateTag}.xlsx`);
        } else {
          let sheetData: any[] = [];
          let sheetName = 'التقرير المالي';
          let filePrefix = 'تقرير_مالي';

          if (reportType === 'student_balances') {
            sheetData = getStudentBalancesData();
            sheetName = 'أرصدة الطلاب';
            filePrefix = 'كشف_ارصدة_الطلاب';
          } else if (reportType === 'teacher_salaries') {
            sheetData = getTeacherSalariesData();
            sheetName = 'مستحقات المعلمين';
            filePrefix = 'مسير_رواتب_المعلمين';
          } else if (reportType === 'sessions_profits') {
            sheetData = getSessionsProfitsData();
            sheetName = 'الحصص والأرباح';
            filePrefix = 'سجل_الحصص_والأرباح';
          } else if (reportType === 'student_credits') {
            sheetData = getStudentCreditsData();
            sheetName = 'شحن الرصيد';
            filePrefix = 'سجل_شحن_ارصدة_الطلاب';
          } else if (reportType === 'teacher_payouts') {
            sheetData = getTeacherPaymentsData();
            sheetName = 'دفعات المعلمين';
            filePrefix = 'سجل_صرف_رواتب_المعلمين';
          } else if (reportType === 'expenses') {
            sheetData = getExpensesData();
            sheetName = 'المصروفات';
            filePrefix = 'سجل_المصروفات_التشغيلية';
          } else if (reportType === 'monthly_analytics') {
            sheetData = getMonthlyAnalyticsData();
            sheetName = 'الأرباح الشهرية';
            filePrefix = 'ملخص_الأداء_والأرباح_الشهرية';
          }

          const worksheet = XLSX.utils.json_to_sheet(sheetData);
          autoFitCols(worksheet, sheetData);
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
          XLSX.writeFile(workbook, `${filePrefix}_${dateTag}.xlsx`);
        }
      } else {
        // CSV Export
        let dataRows: any[] = [];
        let filePrefix = 'تقرير_مالي';

        if (reportType === 'all_comprehensive' || reportType === 'sessions_profits') {
          dataRows = getSessionsProfitsData();
          filePrefix = reportType === 'all_comprehensive' ? 'كشف_الحصص_والأرباح_الشامل' : 'سجل_الحصص_والأرباح';
        } else if (reportType === 'student_balances') {
          dataRows = getStudentBalancesData();
          filePrefix = 'كشف_ارصدة_الطلاب';
        } else if (reportType === 'teacher_salaries') {
          dataRows = getTeacherSalariesData();
          filePrefix = 'مسير_رواتب_المعلمين';
        } else if (reportType === 'student_credits') {
          dataRows = getStudentCreditsData();
          filePrefix = 'سجل_شحن_ارصدة_الطلاب';
        } else if (reportType === 'teacher_payouts') {
          dataRows = getTeacherPaymentsData();
          filePrefix = 'سجل_صرف_رواتب_المعلمين';
        } else if (reportType === 'expenses') {
          dataRows = getExpensesData();
          filePrefix = 'سجل_المصروفات_التشغيلية';
        } else if (reportType === 'monthly_analytics') {
          dataRows = getMonthlyAnalyticsData();
          filePrefix = 'ملخص_الأداء_والأرباح_الشهرية';
        }

        if (dataRows.length > 0) {
          const headers = Object.keys(dataRows[0]);
          const rows = dataRows.map(item => headers.map(h => item[h]));
          downloadCsv(headers, rows, `${filePrefix}_${dateTag}`);
        } else {
          downloadCsv(['الرسالة'], [['لا توجد بيانات مطابقة للفترة المحددة']], `${filePrefix}_${dateTag}`);
        }
      }

      setExportSuccessMsg('تم إنشاء وتحميل ملف التقرير بنجاح! 🚀');
      setTimeout(() => setExportSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Error generating export file:', err);
      alert('حدث خطأ أثناء إعداد ملف التصدير. يرجى التأكد من البيانات والمحاولة مجدداً.');
    } finally {
      setIsExporting(false);
    }
  };

  const reportModules = [
    {
      id: 'all_comprehensive',
      title: 'التقرير المالي المتكامل الشامل (Excel Multi-Sheet)',
      desc: 'ملف موحد يحتوي على كافة الجداول المحاسبية (الطلاب، المعلمين، الحصص، الدفعات، الشحن، المصروفات، والأرباح).',
      icon: Layers,
      color: 'text-amber-600 bg-amber-500/10 border-amber-300'
    },
    {
      id: 'student_balances',
      title: 'كشف أرصدة ومحافظ الطلاب والتحصيلات',
      desc: 'تفاصيل شحن كل طالب، المبالغ المستهلكة بالحصص، الرصيد المتبقي، وحدود الأمان.',
      icon: GraduationCap,
      color: 'text-blue-600 bg-blue-500/10 border-blue-300'
    },
    {
      id: 'teacher_salaries',
      title: 'كشف مسير رواتب ومستحقات المعلمين',
      desc: 'ساعات التدريس المنجزة، المستحقات المرصودة، المبالغ المصروفة، والرصيد المتبقي للصرف.',
      icon: Users,
      color: 'text-emerald-600 bg-emerald-500/10 border-emerald-300'
    },
    {
      id: 'sessions_profits',
      title: 'سجل الحصص التعليمية وهوامش أرباح المنصة',
      desc: 'سجل تفصيلي بكافة الحصص المنفذة مع تكلفة الطالب، أجر المعلم، وصافي ربح المنصة.',
      icon: BookOpen,
      color: 'text-indigo-600 bg-indigo-500/10 border-indigo-300'
    },
    {
      id: 'student_credits',
      title: 'سجل شحن المحافظ وسندات القبض',
      desc: 'سجل تدفقات القبض وشحن المحافظ بالتاريخ والمبالغ وطرق الدفع وأرقام السندات.',
      icon: CreditCard,
      color: 'text-teal-600 bg-teal-500/10 border-teal-300'
    },
    {
      id: 'teacher_payouts',
      title: 'سجل صرف دفعات وأجور المعلمين',
      desc: 'سجل خروج الأموال والدفعات المسددة للأساتذة مع أرقام الحوالات والسندات البنكية.',
      icon: DollarSign,
      color: 'text-rose-600 bg-rose-500/10 border-rose-300'
    },
    {
      id: 'expenses',
      title: 'سجل المصروفات التشغيلية والتأسيسية',
      desc: 'تفصيل المصاريف المعتمدة مصنفة حسب الإيجار، الفواتير، الرواتب، التسويق، والتصنيفات المخصصة.',
      icon: Building2,
      color: 'text-purple-600 bg-purple-500/10 border-purple-300'
    },
    {
      id: 'monthly_analytics',
      title: 'ملخص الأداء المالي والأرباح الشهرية التراكمية',
      desc: 'جدول مقارنة شهري يوضح الإيرادات، أجور المعلمين، المصروفات، وصافي الأرباح ونسبة الربحية.',
      icon: TrendingUp,
      color: 'text-cyan-600 bg-cyan-500/10 border-cyan-300'
    }
  ] as const;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden text-right my-8 animate-in fade-in zoom-in-95 duration-200" 
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-[#0D365A] to-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-[#D4A33C] flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 shrink-0">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black tracking-tight text-white">مركز تصدير التقارير المالية والتحليلات</h3>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black rounded-full">
                  Excel & CSV
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-1">
                تصدير وتحميل البيانات المحاسبية والإحصائية المعتمدة للمنصة مباشرة بنقرة واحدة
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="إغلاق النافذة"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {/* Success Banner */}
          {exportSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 font-black text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{exportSuccessMsg}</span>
            </div>
          )}

          {/* Section 1: Date Scope Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Calendar size={15} className="text-indigo-600" />
                <span>نطاق الفترة الزمنية للتصدير:</span>
              </label>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                {scopeLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'active_filter', label: 'الفترة الحالية باللوحة' },
                { id: 'current_month', label: 'الشهر الحالي' },
                { id: 'current_year', label: 'العام الدراسي الحالي' },
                { id: 'all_time', label: 'كافة الفترات (شامل)' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDateScope(opt.id as ExportDateScope)}
                  className={`p-2.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    dateScope === opt.id
                      ? 'bg-[#1A365D] text-white border-[#1A365D] shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 2: Report Type Selection */}
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Layers size={15} className="text-amber-600" />
              <span>اختر نوع التقرير / البيانات المحاسبية المراد تصديرها:</span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reportModules.map(mod => {
                const isSelected = reportType === mod.id;
                const IconComponent = mod.icon;
                return (
                  <div
                    key={mod.id}
                    onClick={() => setReportType(mod.id as ExportReportType)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                      isSelected
                        ? 'border-[#0D365A] bg-blue-50/40 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${mod.color}`}>
                      <IconComponent size={18} />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-900">{mod.title}</h4>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-[#0D365A] text-white flex items-center justify-center shrink-0">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{mod.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Summary of Records Included */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-bold text-slate-600 flex items-center gap-1.5">
              <Filter size={14} className="text-slate-500" />
              <span>معاينة إحصائيات البيانات المستهدفة:</span>
            </span>
            <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono font-bold text-slate-700">
              <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                الحصص: <strong className="text-indigo-600">{filteredSessions.length}</strong>
              </span>
              <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                الطلاب: <strong className="text-blue-600">{students.length}</strong>
              </span>
              <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                المعلمون: <strong className="text-emerald-600">{teachers.length}</strong>
              </span>
              <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                المصروفات: <strong className="text-purple-600">{filteredExpenses.length}</strong>
              </span>
              <span className="bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                حركات الشحن: <strong className="text-teal-600">{filteredCredits.length}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer with One-click Export Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-bold">
            ملفات Excel و CSV متوافقة ومجهزة بترميز UTF-8 لدعم اللغة العربية بشكل سليم وكامل.
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs transition-all cursor-pointer"
            >
              إلغاء
            </button>

            {/* CSV Button */}
            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleExecuteExport('csv')}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-[#D4A33C] hover:text-amber-200 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
              title="تصدير وتنزيل البيانات كملف CSV مدقق"
            >
              <Download size={15} />
              <span>تنزيل ملف CSV 📄</span>
            </button>

            {/* Excel Button */}
            <button
              type="button"
              disabled={isExporting}
              onClick={() => handleExecuteExport('xlsx')}
              className="flex-1 sm:flex-initial px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer border border-emerald-500 disabled:opacity-50"
              title="تصدير وتنزيل البيانات كملف Excel (.xlsx) منسق"
            >
              <FileSpreadsheet size={16} />
              <span>تنزيل ملف Excel (.xlsx) 📊</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
