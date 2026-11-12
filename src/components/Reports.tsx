// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { Teacher, Session, Student, Payment, StudentCredit, GroupCourse, Expense, formatCustomDate, isTrialSession } from '../types';
import { TeacherProductivityDashboard } from './TeacherProductivityDashboard';
import { CustomizableDashboard } from './CustomizableDashboard';
import { TeacherSalariesFlowChart } from './TeacherSalariesFlowChart';
import { StudentGrowthAndSubjectDistribution } from './StudentGrowthAndSubjectDistribution';
import { StudentFinancialBalancesCharts } from './StudentFinancialBalancesCharts';
import FinancialAudit from './FinancialAudit';
import { MonthlyFinancialReportModal } from './MonthlyFinancialReportModal';
import { MonthlyProfitComparisonDashboard } from './MonthlyProfitComparisonDashboard';
import { ParentExamReportModal } from './ParentExamReportModal';
import UnifiedPaymentsManagerModal from './UnifiedPaymentsManagerModal';
import { ParentExamPrintContainer } from './ParentExamPrintContainer';
import { downloadParentExamReportPDFFromDOM } from '../lib/parentExamReportPdf';
import { ReportsRechartsAnalytics } from './ReportsRechartsAnalytics';
import { FinancialReportsExportModal } from './FinancialReportsExportModal';
import { 
  BarChart3, Clock, DollarSign, Users, Briefcase, 
  Search, ArrowLeft, ArrowRight, CreditCard, CheckCircle2, TrendingUp, AlertCircle,
  Wallet, List, LayoutGrid, MoreHorizontal, Plus, FileText, Activity, Landmark, AlertTriangle,
  Bell, BellRing, Send, Download, FileSpreadsheet, Calendar, Pencil, Trash2, Archive, RotateCcw, Printer, X,
  ChevronDown, Sparkles, Filter, BookOpen, GraduationCap, Loader2, PieChart as PieIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';
import ExcelJS from 'exceljs';

const isOlderThanTwoMonths = (dateStr?: string) => {
  if (!dateStr) return false;
  try {
    const recordDate = new Date(dateStr);
    if (isNaN(recordDate.getTime())) return false;
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    return recordDate < twoMonthsAgo;
  } catch (e) {
    return false;
  }
};
import { useBalanceAlerts } from '../lib/useBalanceAlerts';
import { getStudentDefaultHourlyRate } from '../lib/sessionPricing';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { 
  ResponsiveContainer, 
  AreaChart, Area, XAxis, YAxis, Tooltip, 
  BarChart, Bar, Cell, PieChart, Pie, 
  LineChart, Line, Legend, CartesianGrid
} from 'recharts';
import { ResponsiveGridLayout, useContainerWidth } from 'react-grid-layout';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';

// Required styles for react-grid-layout
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const columnHelper = createColumnHelper<any>();

interface ReportsProps {
  tabView?: 'dashboard' | 'accounting' | 'audit' | 'profit_comparison' | 'student_financials' | 'recharts_analytics';
  examResults?: any[];
  sessions?: Session[];
}

export default function Reports({ tabView = 'dashboard', examResults: initialExamResults, sessions: propSessions }: ReportsProps) {
  const [examResults, setExamResults] = useState<any[]>(initialExamResults || []);
  const [isParentExamModalOpen, setIsParentExamModalOpen] = useState(false);
  const [isExportingParentPdf, setIsExportingParentPdf] = useState(false);
  const [parentReportViewMode, setParentReportViewMode] = useState<'detailed' | 'summary'>('detailed');
  const [activeWidgetMenu, setActiveWidgetMenu] = useState<string | null>(null);
  const parentReportPrintRef = useRef<HTMLDivElement>(null);

  // Directly triggers PDF generation from the hidden print-friendly container
  const handleDirectDownloadParentExamPDF = async () => {
    setIsExportingParentPdf(true);
    try {
      const modeSuffix = parentReportViewMode === 'summary' ? '_موجز' : '_تفصيلي';
      await downloadParentExamReportPDFFromDOM(
        'parent-exam-report-print-container',
        `تقرير_نتائج_الاختبارات_أولياء_الأمور${modeSuffix}.pdf`
      );
    } catch (err) {
      console.error('Error generating PDF from hidden container:', err);
    } finally {
      setIsExportingParentPdf(false);
    }
  };

  // Real-time synchronization for examResults collection
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'examResults'), (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setExamResults(list);
    }, (err) => {
      console.error("Error subscribing to examResults in Reports:", err);
    });
    return () => unsub();
  }, []);
  const currentUserRole = useMemo(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('academy_user_role') || 'manager';
    }
    return 'manager';
  }, []);

  const currentUserName = useMemo(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('academy_user_name') || 'المدير العام';
    }
    return 'المدير العام';
  }, []);

  const { width, containerRef } = useContainerWidth();
  const { alerts, threshold: alertThreshold } = useBalanceAlerts();
  const [globalSettings, setGlobalSettings] = useState({
    defaultHourlyRate: 50,
    defaultStudentHourlyRate: 60,
    defaultSecondaryStudentHourlyRate: 60,
    defaultMiddleStudentHourlyRate: 50,
    defaultPrimaryStudentHourlyRate: 50,
    defaultTeacherHourlyRate: 35,
    customReportPeriods: [] as { id: string; name: string; startDate: string; endDate: string }[],
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGlobalSettings({
          defaultHourlyRate: data.defaultHourlyRate ?? 50,
          defaultStudentHourlyRate: data.defaultStudentHourlyRate ?? data.defaultHourlyRate ?? 60,
          defaultSecondaryStudentHourlyRate: data.defaultSecondaryStudentHourlyRate ?? 60,
          defaultMiddleStudentHourlyRate: data.defaultMiddleStudentHourlyRate ?? 50,
          defaultPrimaryStudentHourlyRate: data.defaultPrimaryStudentHourlyRate ?? 50,
          defaultTeacherHourlyRate: data.defaultTeacherHourlyRate ?? 35,
          customReportPeriods: data.customReportPeriods || [],
        });
      }
    });
    return () => unsub();
  }, []);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printPreviewHtml, setPrintPreviewHtml] = useState('');
  const [printPreviewTitle, setPrintPreviewTitle] = useState('');
  const [isDownloadingPreviewPdf, setIsDownloadingPreviewPdf] = useState(false);
  const [isMonthlyFinancialModalOpen, setIsMonthlyFinancialModalOpen] = useState(false);
  const [isExportCenterModalOpen, setIsExportCenterModalOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(e.target as Node)) {
        setIsActionsMenuOpen(false);
      }
    };
    if (isActionsMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActionsMenuOpen]);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<Session[]>(propSessions || []);

  useEffect(() => {
    if (propSessions && Array.isArray(propSessions) && propSessions.length > 0) {
      setSessions(propSessions);
    }
  }, [propSessions]);

  const sortedStudents = useMemo(() => {
    const lastSessionMap: Record<string, string> = {};
    sessions.forEach(session => {
      const timeKey = session.createdAt || session.date || '';
      if (!timeKey) return;

      const stIds: string[] = [];
      if (session.studentId) stIds.push(session.studentId);
      if (Array.isArray(session.studentIds)) {
        session.studentIds.forEach((id: string) => { if (id && !stIds.includes(id)) stIds.push(id); });
      }
      if (Array.isArray(session.students)) {
        session.students.forEach((st: any) => {
          const id = typeof st === 'string' ? st : st?.id;
          if (id && !stIds.includes(id)) stIds.push(id);
        });
      }

      stIds.forEach(id => {
        const currentLast = lastSessionMap[id];
        if (!currentLast || timeKey > currentLast) {
          lastSessionMap[id] = timeKey;
        }
      });
    });

    return [...students].sort((a, b) => {
      // 1. Active students first (Active > Paused / Graduated)
      const isActiveA = (a.academicStatus || 'Active') === 'Active' ? 1 : 0;
      const isActiveB = (b.academicStatus || 'Active') === 'Active' ? 1 : 0;
      if (isActiveA !== isActiveB) {
        return isActiveB - isActiveA;
      }

      // 2. Students with sessions come first, ordered by latest session date/entry timestamp (newest first)
      const dateA = lastSessionMap[a.id] || '';
      const dateB = lastSessionMap[b.id] || '';

      if (dateA && dateB) {
        return dateB.localeCompare(dateA);
      }
      if (dateA) return -1;
      if (dateB) return 1;
      
      // 3. Fallback: Registration date (newest first)
      const regA = a.registrationDate || a.createdAt || '';
      const regB = b.registrationDate || b.createdAt || '';
      if (regA && regB) {
        return regB.localeCompare(regA);
      }
      if (regA) return -1;
      if (regB) return 1;

      // 4. Fallback: Name
      return (a.name || '').localeCompare(b.name || '', 'ar');
    });
  }, [students, sessions]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [credits, setCredits] = useState<StudentCredit[]>([]);
  const [groupCourses, setGroupCourses] = useState<GroupCourse[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Settle previous months dues states
  const [isSubmittingSettleDues, setIsSubmittingSettleDues] = useState(false);
  const [settleDuesSuccess, setSettleDuesSuccess] = useState(false);

  // New Expense form states
  const [newExpenseAmount, setNewExpenseAmount] = useState<string>('');
  const [newExpenseCategory, setNewExpenseCategory] = useState<string>('funding');
  const [newExpenseDate, setNewExpenseDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [newExpenseNote, setNewExpenseNote] = useState<string>('');

  // Editing Expense states
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editExpenseAmount, setEditExpenseAmount] = useState<string>('');
  const [editExpenseCategory, setEditExpenseCategory] = useState<string>('funding');
  const [editExpenseDate, setEditExpenseDate] = useState<string>('');
  const [editExpenseNote, setEditExpenseNote] = useState<string>('');

  // Tab and alert states
  const [activeTab, setActiveTab ] = useState<'dashboard' | 'student_growth' | 'student_financials' | 'accounting' | 'custom' | 'audit' | 'scheduled' | 'expenses' | 'profit_comparison' | 'recharts_analytics'>(tabView);

  // Advanced Filtering State: Time Period (يومي، أسبوعي، شهري، سنوي، مخصص) and Subject Filter
  type TimePeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  const [timePeriodType, setTimePeriodType] = useState<TimePeriodType>('monthly');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [periodAnchorDate, setPeriodAnchorDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [dashboardStartDate, setDashboardStartDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });
  const [dashboardEndDate, setDashboardEndDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    return `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
  });

  const calculatePeriodRange = useCallback((type: TimePeriodType, anchorDateStr: string) => {
    const anchor = new Date(anchorDateStr || new Date().toISOString().split('T')[0]);
    if (isNaN(anchor.getTime())) {
      const today = new Date().toISOString().split('T')[0];
      return { start: today, end: today, label: today };
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const monthsAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const dayNamesAr = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    if (type === 'daily') {
      const dStr = `${anchor.getFullYear()}-${pad(anchor.getMonth() + 1)}-${pad(anchor.getDate())}`;
      const label = `يومي: ${dayNamesAr[anchor.getDay()]} ${anchor.getDate()} ${monthsAr[anchor.getMonth()]} ${anchor.getFullYear()}`;
      return { start: dStr, end: dStr, label };
    }

    if (type === 'weekly') {
      // Arab calendar week: Saturday to Friday
      const day = anchor.getDay(); // 0: Sunday, 6: Saturday
      const diffToSaturday = (day + 1) % 7;
      const startD = new Date(anchor);
      startD.setDate(anchor.getDate() - diffToSaturday);
      const endD = new Date(startD);
      endD.setDate(startD.getDate() + 6);

      const startStr = `${startD.getFullYear()}-${pad(startD.getMonth() + 1)}-${pad(startD.getDate())}`;
      const endStr = `${endD.getFullYear()}-${pad(endD.getMonth() + 1)}-${pad(endD.getDate())}`;
      const label = `أسبوعي: (${startD.getDate()} ${monthsAr[startD.getMonth()]} - ${endD.getDate()} ${monthsAr[endD.getMonth()]} ${endD.getFullYear()})`;
      return { start: startStr, end: endStr, label };
    }

    if (type === 'monthly') {
      const year = anchor.getFullYear();
      const month = anchor.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const startStr = `${year}-${pad(month + 1)}-01`;
      const endStr = `${year}-${pad(month + 1)}-${pad(lastDay)}`;
      const label = `شهري: ${monthsAr[month]} ${year}`;
      return { start: startStr, end: endStr, label };
    }

    if (type === 'yearly') {
      const year = anchor.getFullYear();
      const startStr = `${year}-01-01`;
      const endStr = `${year}-12-31`;
      const label = `سنوي: عام ${year}`;
      return { start: startStr, end: endStr, label };
    }

    return {
      start: dashboardStartDate,
      end: dashboardEndDate,
      label: 'نطاق مخصص'
    };
  }, [dashboardStartDate, dashboardEndDate]);

  const activePeriodLabel = useMemo(() => {
    if (timePeriodType === 'custom') {
      if (dashboardStartDate && dashboardEndDate) {
        return `مخصص (${dashboardStartDate} إلى ${dashboardEndDate})`;
      } else if (dashboardStartDate) {
        return `من ${dashboardStartDate}`;
      } else if (dashboardEndDate) {
        return `حتى ${dashboardEndDate}`;
      }
      return 'كامل السجل (غير محدد)';
    }
    return calculatePeriodRange(timePeriodType, periodAnchorDate).label;
  }, [timePeriodType, periodAnchorDate, dashboardStartDate, dashboardEndDate, calculatePeriodRange]);

  const handleSelectPeriodType = (type: TimePeriodType) => {
    setTimePeriodType(type);
    if (type !== 'custom') {
      const range = calculatePeriodRange(type, periodAnchorDate);
      setDashboardStartDate(range.start);
      setDashboardEndDate(range.end);
    }
  };

  const shiftPeriod = (direction: 'prev' | 'next') => {
    const current = new Date(periodAnchorDate || new Date().toISOString().split('T')[0]);
    if (isNaN(current.getTime())) return;
    const factor = direction === 'next' ? 1 : -1;

    if (timePeriodType === 'daily') {
      current.setDate(current.getDate() + factor);
    } else if (timePeriodType === 'weekly') {
      current.setDate(current.getDate() + (factor * 7));
    } else if (timePeriodType === 'monthly') {
      current.setMonth(current.getMonth() + factor);
    } else if (timePeriodType === 'yearly') {
      current.setFullYear(current.getFullYear() + factor);
    }

    const newDateStr = current.toISOString().split('T')[0];
    setPeriodAnchorDate(newDateStr);
    const range = calculatePeriodRange(timePeriodType, newDateStr);
    setDashboardStartDate(range.start);
    setDashboardEndDate(range.end);
  };

  const resetToToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setPeriodAnchorDate(todayStr);
    const range = calculatePeriodRange(timePeriodType, todayStr);
    setDashboardStartDate(range.start);
    setDashboardEndDate(range.end);
  };

  const resetAllFilters = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setPeriodAnchorDate(todayStr);
    setTimePeriodType('monthly');
    setSelectedSubjectFilter('all');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    setDashboardStartDate(`${year}-${month}-01`);
    setDashboardEndDate(`${year}-${month}-${String(lastDay).padStart(2, '0')}`);
  };

  // Extract all distinct subjects across sessions, group courses, teachers, and globalSettings
  const availableSubjects = useMemo(() => {
    const subjectCountMap = new Map<string, number>();

    sessions.forEach(s => {
      const sub = (s.subject || '').trim();
      if (sub) {
        subjectCountMap.set(sub, (subjectCountMap.get(sub) || 0) + 1);
      }
    });

    groupCourses.forEach(g => {
      const sub = (g.subject || g.name || '').trim();
      if (sub && !subjectCountMap.has(sub)) {
        subjectCountMap.set(sub, 0);
      }
    });

    teachers.forEach(t => {
      if (Array.isArray(t.subjects)) {
        t.subjects.forEach(sub => {
          const s = (sub || '').trim();
          if (s && !subjectCountMap.has(s)) {
            subjectCountMap.set(s, 0);
          }
        });
      }
    });

    if (Array.isArray(globalSettings?.allowedSubjects)) {
      globalSettings.allowedSubjects.forEach((sub: string) => {
        const s = (sub || '').trim();
        if (s && !subjectCountMap.has(s)) {
          subjectCountMap.set(s, 0);
        }
      });
    }

    return Array.from(subjectCountMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ar'));
  }, [sessions, groupCourses, teachers, globalSettings]);

  const [customTeacherFilter, setCustomTeacherFilter] = useState<string>('all');
  const [customTeacherSearch, setCustomTeacherSearch] = useState<string>('');
  const [customSpecificDate, setCustomSpecificDate] = useState<string>('');
  const [customFinancialClassification, setCustomFinancialClassification] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}-01`;
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      if (dashboardStartDate && s.date && s.date < dashboardStartDate) return false;
      if (dashboardEndDate && s.date && s.date > dashboardEndDate) return false;
      if (selectedSubjectFilter && selectedSubjectFilter !== 'all') {
        const sSub = (s.subject || '').trim().toLowerCase();
        const sTopic = (s.topic || '').trim().toLowerCase();
        const fSub = selectedSubjectFilter.trim().toLowerCase();

        let matchGroup = false;
        if (s.groupId) {
          const g = groupCourses.find(item => item.id === s.groupId);
          if (g && ((g.subject && g.subject.trim().toLowerCase() === fSub) || (g.name && g.name.trim().toLowerCase().includes(fSub)))) {
            matchGroup = true;
          }
        }

        if (sSub !== fSub && !sTopic.includes(fSub) && !matchGroup) {
          return false;
        }
      }
      return true;
    });
  }, [sessions, dashboardStartDate, dashboardEndDate, selectedSubjectFilter, groupCourses]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const pDate = p.date || (p.createdAt ? p.createdAt.split('T')[0] : '');
      if (dashboardStartDate && pDate && pDate < dashboardStartDate) return false;
      if (dashboardEndDate && pDate && pDate > dashboardEndDate) return false;
      return true;
    });
  }, [payments, dashboardStartDate, dashboardEndDate]);

  const filteredCredits = useMemo(() => {
    return credits.filter(c => {
      const cDate = c.date || (c.createdAt ? c.createdAt.split('T')[0] : '');
      if (dashboardStartDate && cDate && cDate < dashboardStartDate) return false;
      if (dashboardEndDate && cDate && cDate > dashboardEndDate) return false;
      return true;
    });
  }, [credits, dashboardStartDate, dashboardEndDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      const eDate = e.date || (e.createdAt ? e.createdAt.split('T')[0] : '');
      if (dashboardStartDate && eDate && eDate < dashboardStartDate) return false;
      if (dashboardEndDate && eDate && eDate > dashboardEndDate) return false;
      return true;
    });
  }, [expenses, dashboardStartDate, dashboardEndDate]);
  const [showNotificationCenter, setShowNotificationCenter] = useState(true);
  const [sentAlertNotification, setSentAlertNotification] = useState<string[]>([]);
  const [alertStatusMessage, setAlertStatusMessage] = useState<string | null>(null);
  const [toastAlert, setToastAlert] = useState<string | null>(null);

  // States for interactive teacher monthly performance charts
  const [perfMetric, setPerfMetric] = useState<'hours' | 'financial'>('hours');
  const [perfTeacherId, setPerfTeacherId] = useState<string>('all');

  // New states for interactive simulated notification to parents
  const [activeNotifier, setActiveNotifier] = useState<any | null>(null);
  const [notifierChannel, setNotifierChannel] = useState<'sms' | 'email'>('sms');
  const [notifierCustomContact, setNotifierCustomContact] = useState<string>('');
  const [notifierMessage, setNotifierMessage] = useState<string>('');
  const [notifierProgress, setNotifierProgress] = useState<'idle' | 'sending' | 'success'>('idle');

  // Sync prop changes into state
  useEffect(() => {
    setActiveTab(tabView);
  }, [tabView]);

  // States for student balances dashboard
  const [studentSearchVal, setStudentSearchVal] = useState('');
  const [studentBalanceFilter, setStudentBalanceFilter] = useState<'all' | 'positive' | 'negative'>('all');
  const [studentPageNum, setStudentPageNum] = useState(1);

  // Dashboard Widget Customization States
  const [widgets, setWidgets] = useState<any[]>(() => {
    const saved = localStorage.getItem('manager_dashboard_widgets_v2');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: 'indicators', name: 'المؤشرات الكلية اليومية السريعة', description: 'إيرادات اليوم، الطلاب النشطين، حصص اليوم، والنشاط المباشر', visible: true },
      { id: 'productivity', name: 'إنتاجية المعلمين والأجور الجارية', description: 'تتبع كفاءة المدرسين المنجزة ومستحقاتهم المالية للفترة الحالية', visible: true },
      { id: 'liquidity', name: 'توزيع الأرصدة والسيولة الوقائية للطلاب', description: 'تحليل توزيع ملاءة أرصدة الطلاب الكلية (السيولة والذمم والديون)', visible: true },
      { id: 'charts', name: 'الرسوم التحليلية والربحية الكلية للمركز', description: 'المحاسبة والربحية الإجمالية، كثافة عمل المعلمين، ونسبة تسوية الذمم', visible: true },
      { id: 'evolution', name: 'منحنى تطور أداء المعلمين التاريخي والشهري', description: 'تتبع تطور ساعات التدريس المنجزة، العائدات وصافي الفوائد شهرياً', visible: true },
      { id: 'temporal', name: 'المنحنى الزمني للمبيعات والتعليم الجاري', description: 'كشف مقارن بالإيرادات وتكاليف التشغيل اليومية التراكمية لآخر 30 يوماً', visible: true }
    ];
  });
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const getLocalDateString = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().split('T')[0];
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const updated = [...widgets];
    const item = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, item);
    setDraggedIndex(index);
    setWidgets(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    localStorage.setItem('manager_dashboard_widgets_v2', JSON.stringify(widgets));
  };

  const toggleWidgetVisibility = (id: string) => {
    const updated = widgets.map(w => w.id === id ? { ...w, visible: !w.visible } : w);
    setWidgets(updated);
    localStorage.setItem('manager_dashboard_widgets_v2', JSON.stringify(updated));
  };

  const resetWidgets = () => {
    const defaultWidgets = [
      { id: 'indicators', name: 'المؤشرات الكلية اليومية السريعة', description: 'إيرادات اليوم، الطلاب النشطين، حصص اليوم، والنشاط المباشر', visible: true },
      { id: 'productivity', name: 'إنتاجية المعلمين والأجور الجارية', description: 'تتبع كفاءة المدرسين المنجزة ومستحقاتهم المالية للفترة الحالية', visible: true },
      { id: 'liquidity', name: 'توزيع الأرصدة والسيولة الوقائية للطلاب', description: 'تحليل توزيع ملاءة أرصدة الطلاب الكلية (السيولة والذمم والديون)', visible: true },
      { id: 'charts', name: 'الرسوم التحليلية والربحية الكلية للمركز', description: 'المحاسبة والربحية الإجمالية، كثافة عمل المعلمين، ونسبة تسوية الذمم', visible: true },
      { id: 'evolution', name: 'منحنى تطور أداء المعلمين التاريخي والشهري', description: 'تتبع تطور ساعات التدريس المنجزة، العائدات وصافي الفوائد شهرياً', visible: true },
      { id: 'temporal', name: 'المنحنى الزمني للمبيعات والتعليم الجاري', description: 'كشف مقارن بالإيرادات وتكاليف التشغيل اليومية التراكمية لآخر 30 يوماً', visible: true }
    ];
    setWidgets(defaultWidgets);
    localStorage.setItem('manager_dashboard_widgets_v2', JSON.stringify(defaultWidgets));
  };

  const moveWidgetUp = (index: number) => {
    if (index === 0) return;
    const updated = [...widgets];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setWidgets(updated);
    localStorage.setItem('manager_dashboard_widgets_v2', JSON.stringify(updated));
  };

  const moveWidgetDown = (index: number) => {
    if (index === widgets.length - 1) return;
    const updated = [...widgets];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setWidgets(updated);
    localStorage.setItem('manager_dashboard_widgets_v2', JSON.stringify(updated));
  };

  // Payment Form State inside overlay
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentDate, setNewPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Payment edit states inside Reports.tsx
  const [activeLedgerTab, setActiveLedgerTab] = useState<'sessions' | 'payments'>('sessions');
  const [paymentArchivedView, setPaymentArchivedView] = useState<'active' | 'archived'>('active');
  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [editPayAmount, setEditPayAmount] = useState<number | ''>('');
  const [editPayDate, setEditPayDate] = useState('');
  const [editPayNote, setEditPayNote] = useState('');
  const [isSubmittingEditPayment, setIsSubmittingEditPayment] = useState(false);
  const [editPaymentSuccess, setEditPaymentSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'payment' } | null>(null);

  // Dropsdown states for exporting financial records
  const [showTeacherExDropdown, setShowTeacherExDropdown] = useState(false);
  const [isPaymentsManagerModalOpen, setIsPaymentsManagerModalOpen] = useState(false);
  const [showStudentExDropdown, setShowStudentExDropdown] = useState(false);
  const [showTeacherSessExDropdown, setShowTeacherSessExDropdown] = useState(false);

  // States for dynamic monthly financial reports for student & teacher in CSV format
  const [monReportType, setMonReportType] = useState<'student' | 'teacher' | 'center'>('student');
  const [monSelectedStudentId, setMonSelectedStudentId] = useState('');
  const [monSelectedTeacherId, setMonSelectedTeacherId] = useState('');
  const [monSelectedYear, setMonSelectedYear] = useState<number>(new Date().getFullYear());
  const [monSelectedMonth, setMonSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [isGeneratingMonthlyPdf, setIsGeneratingMonthlyPdf] = useState(false);
  const [isExportingFinancialPDF, setIsExportingFinancialPDF] = useState(false);
  const [isExportingFinancialExcel, setIsExportingFinancialExcel] = useState(false);

  // States for Scheduled Performance Reports
  const [scheduledReports, setScheduledReports] = useState<any[]>([]);
  const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any | null>(null);
  const [scheduleStudentId, setScheduleStudentId] = useState('');
  const [scheduleAcademicProgress, setScheduleAcademicProgress] = useState('تقدم أكاديمي ممتاز ومستمر في جميع المواضيع التدريسية، مع تطور لافت في الفهم وحل التدريبات.');
  const [scheduleNotes, setScheduleNotes] = useState('يرجى الاستمرار في المتابعة المنزلية لضمان المحافظة على هذا المستوى المتميز.');
  const [scheduleStatus, setScheduleStatus] = useState<'active' | 'inactive'>('active');
  const [isGeneratingReport, setIsGeneratingReport] = useState<string | null>(null);

  // Core multi-format CSV/Excel Exporter Utility
  const downloadCSVFile = (headers: string[], rows: (string | number)[][], fileName: string, delimiter: string = ',') => {
    const escapeCell = (val: any) => {
      if (val === null || val === undefined) return '';
      let str = String(val).trim();
      // Clean quotes and handle separator characters properly
      if (str.includes('"') || str.includes(delimiter) || str.includes('\n') || str.includes('\r')) {
        str = `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCell).join(delimiter),
      ...rows.map(row => row.map(escapeCell).join(delimiter))
    ].join('\r\n');

    // Prepend UTF-8 BOM to guarantee proper Arabic rendering in Microsoft Excel
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStudentBillingRateForSession = (studentId: string, teacherId: string, session?: any) => {
    if (session && isTrialSession(session)) {
      return 0;
    }
    const student = (students || []).find(st => st.id === studentId);
    const teacher = (teachers || []).find(t => t.id === teacherId);
    const ass = (assignments || []).find(a => a.studentId === studentId && a.teacherId === teacherId);
    
    if (ass && ass.studentBillingRate !== undefined && ass.studentBillingRate !== 0) {
      return ass.studentBillingRate;
    }
    return getStudentDefaultHourlyRate(student, globalSettings, teacher);
  };

  const getTeacherPayoutRateForSession = (studentId: string, teacherId: string, session?: any) => {
    if (session && isTrialSession(session)) {
      return 0;
    }
    const teacher = (teachers || []).find(t => t.id === teacherId);
    const ass = (assignments || []).find(a => a.studentId === studentId && a.teacherId === teacherId);
    
    if (ass && ass.teacherPayoutRate !== undefined && ass.teacherPayoutRate !== null && Number(ass.teacherPayoutRate) > 0) {
      return Number(ass.teacherPayoutRate);
    }
    return teacher?.payoutRate || teacher?.hourlyRate || globalSettings.defaultTeacherHourlyRate || 35;
  };

  const getTeacherPreviousMonthsBalance = (teacherId: string) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;

    const prevSessions = sessions.filter(s => {
      if (s.teacherId !== teacherId || s.approved === false || s.status === 'pending' || s.status === 'booked' || !s.date) return false;
      return s.date < currentMonthStr;
    });

    const totalPrevEarned = prevSessions.reduce((sum, s) => {
      if (s.customPayout !== undefined) return sum + s.customPayout;
      const rate = getTeacherPayoutRateForSession(s.studentId, teacherId);
      return sum + (s.durationHours * rate);
    }, 0);

    const prevPayments = payments.filter(p => {
      const pDate = p.date || (p.createdAt ? p.createdAt.split('T')[0] : '');
      if (p.teacherId !== teacherId || !pDate) return false;
      return pDate < currentMonthStr;
    });

    const totalPrevPaid = prevPayments.reduce((sum, p) => sum + p.amount, 0);

    return totalPrevEarned - totalPrevPaid;
  };

  const handleSettleTeacherPreviousDues = async (teacherId: string) => {
    const bal = getTeacherPreviousMonthsBalance(teacherId);
    if (bal <= 0) return;

    setIsSubmittingSettleDues(true);
    try {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      const firstDayCurrentMonth = new Date(currentYear, currentMonth - 1, 1);
      const lastDayPrevMonth = new Date(firstDayCurrentMonth.getTime() - 24 * 60 * 60 * 1000);
      const lastDayPrevMonthStr = lastDayPrevMonth.toISOString().split('T')[0];

      const teacher = teachers.find(t => t.id === teacherId);

      // Add payment record
      const paymentData = {
        teacherId: teacherId,
        amount: Number(bal.toFixed(2)),
        date: lastDayPrevMonthStr,
        note: `تصفية تلقائية لمستحقات نهاية الشهر السابق (${lastDayPrevMonthStr}) - تم الدفع`
      };

      const docRef = await addDoc(collection(db, 'payments'), paymentData);

      // Update local state so it updates live
      setPayments(prev => [...prev, { id: docRef.id, ...paymentData }]);

      // Log activity
      const { logActivity } = await import('../lib/activityLogger');
      await logActivity({
        actionType: 'PAYMENT_CREATE',
        actionName: 'تصفية مستحقات الأشهر السابقة تلقائياً',
        details: `تصفير تلقائي وتسوية مستحقات المعلم "${teacher?.name}" للأشهر السابقة بمبلغ: ₪${bal.toFixed(2)} بتاريخ نهاية الشهر الماضي: ${lastDayPrevMonthStr}`,
        amount: Number(bal.toFixed(2))
      });

      setSettleDuesSuccess(true);
      setTimeout(() => {
        setSettleDuesSuccess(false);
      }, 3000);

    } catch (error) {
      console.error("Error settling previous dues:", error);
      alert("حدث خطأ أثناء عملية تسوية المستحقات. يرجى المحاولة لاحقاً.");
    } finally {
      setIsSubmittingSettleDues(false);
    }
  };

  // Safe date parser helper that supports strings, Firestore Timestamps, and Date objects
  const safeParseDate = (dateVal: any): { year: number; month: number; day: number; dateStr: string } | null => {
    if (!dateVal) return null;
    try {
      if (typeof dateVal === 'string') {
        const parts = dateVal.split(/[-/T ]/);
        if (parts.length >= 2) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const d = parts[2] ? parseInt(parts[2], 10) : 1;
          if (!isNaN(y) && !isNaN(m)) {
            return { year: y, month: m, day: isNaN(d) ? 1 : d, dateStr: `${y}-${String(m).padStart(2, '0')}-${String(isNaN(d) ? 1 : d).padStart(2, '0')}` };
          }
        }
        const parsed = new Date(dateVal);
        if (!isNaN(parsed.getTime())) {
          return { year: parsed.getFullYear(), month: parsed.getMonth() + 1, day: parsed.getDate(), dateStr: parsed.toISOString().split('T')[0] };
        }
      } else if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
        return { year: dateVal.getFullYear(), month: dateVal.getMonth() + 1, day: dateVal.getDate(), dateStr: dateVal.toISOString().split('T')[0] };
      } else if (typeof dateVal === 'object' && typeof dateVal.toDate === 'function') {
        const d = dateVal.toDate();
        return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), dateStr: d.toISOString().split('T')[0] };
      } else if (typeof dateVal === 'object' && typeof dateVal.seconds === 'number') {
        const d = new Date(dateVal.seconds * 1000);
        return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), dateStr: d.toISOString().split('T')[0] };
      } else if (typeof dateVal === 'number' && !isNaN(dateVal)) {
        const d = new Date(dateVal);
        return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), dateStr: d.toISOString().split('T')[0] };
      }
    } catch {
      return null;
    }
    return null;
  };

  // Helpers to calculate starting balance before a given month/year
  const getStudentStartBalance = (studentId: string, year: number, month: number) => {
    const prevCredits = (credits || []).filter(c => {
      if (c.studentId !== studentId || !c.date) return false;
      const pd = safeParseDate(c.date);
      if (!pd) return false;
      return pd.year < year || (pd.year === year && pd.month < month);
    });
    const totalPrevToppedUp = prevCredits.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    const prevSessions = (sessions || []).filter(s => {
      if (s.studentId !== studentId || s.approved === false || !s.date) return false;
      const pd = safeParseDate(s.date);
      if (!pd) return false;
      return pd.year < year || (pd.year === year && pd.month < month);
    });
    
    const totalPrevSpent = prevSessions.reduce((sum, s) => {
      if (s.customFee !== undefined && !isNaN(Number(s.customFee))) return sum + Number(s.customFee);
      const rate = getStudentBillingRateForSession(studentId, s.teacherId);
      return sum + ((Number(s.durationHours) || 0) * (Number(rate) || 0));
    }, 0);

    return (Number(totalPrevToppedUp) || 0) - (Number(totalPrevSpent) || 0);
  };

  const getTeacherStartBalance = (teacherId: string, year: number, month: number) => {
    const prevSessions = (sessions || []).filter(s => {
      if (s.teacherId !== teacherId || s.approved === false || !s.date) return false;
      const pd = safeParseDate(s.date);
      if (!pd) return false;
      return pd.year < year || (pd.year === year && pd.month < month);
    });
    
    const totalPrevEarned = prevSessions.reduce((sum, s) => {
      if (s.customPayout !== undefined && !isNaN(Number(s.customPayout))) return sum + Number(s.customPayout);
      const rate = getTeacherPayoutRateForSession(s.studentId, teacherId);
      return sum + ((Number(s.durationHours) || 0) * (Number(rate) || 0));
    }, 0);

    const prevPayments = (payments || []).filter(p => {
      if (p.teacherId !== teacherId || !p.date) return false;
      const pd = safeParseDate(p.date);
      if (!pd) return false;
      return pd.year < year || (pd.year === year && pd.month < month);
    });
    const totalPrevPaid = prevPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return (Number(totalPrevEarned) || 0) - (Number(totalPrevPaid) || 0);
  };

  const exportMonthlyReport = () => {
    const year = monSelectedYear;
    const month = monSelectedMonth;
    const arabicMonths = [
      'يناير (كانون الثاني)', 'فبراير (شباط)', 'مارس (آذار)', 'أبريل (نيسان)', 'مايو (أيار)', 'يونيو (حزيران)',
      'يوليو (تموز)', 'أغسطس (آب)', 'سبتمبر (أيلول)', 'أكتوبر (تشرين الأول)', 'نوفمبر (تشرين الثاني)', 'ديسمبر (كانون الأول)'
    ];
    const monthLabel = arabicMonths[month - 1];

    if (monReportType === 'student') {
      if (monSelectedStudentId) {
        const student = students.find(s => s.id === monSelectedStudentId);
        if (student) {
          const startBalance = getStudentStartBalance(student.id, year, month);
          
          const currentMonthCredits = credits.filter(c => {
            if (c.studentId !== student.id || !c.date) return false;
            const parts = c.date.split('-');
            if (parts.length < 2) return false;
            return parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month;
          }).sort((a, b) => a.date.localeCompare(b.date));

          const currentMonthSessions = sessions.filter(s => {
            if (s.studentId !== student.id || s.approved === false || !s.date) return false;
            const parts = s.date.split('-');
            if (parts.length < 2) return false;
            return parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month;
          }).sort((a, b) => a.date.localeCompare(b.date));

          const totalCredits = currentMonthCredits.reduce((sum, c) => sum + c.amount, 0);
          
          const totalSpent = currentMonthSessions.reduce((sum, s) => {
            if (s.customFee !== undefined) return sum + s.customFee;
            const rate = getStudentBillingRateForSession(student.id, s.teacherId);
            return sum + (s.durationHours * rate);
          }, 0);

          const endBalance = startBalance + totalCredits - totalSpent;

          // Overall balance check
          const overallApprovedSessions = sessions.filter(s => s.studentId === student.id && s.approved !== false);
          const overallSpent = overallApprovedSessions.reduce((sum, s) => {
            if (s.customFee !== undefined) return sum + s.customFee;
            const rate = getStudentBillingRateForSession(student.id, s.teacherId);
            return sum + (s.durationHours * rate);
          }, 0);
          const overallToppedUp = credits.filter(c => c.studentId === student.id).reduce((sum, c) => sum + c.amount, 0);
          const currentOverallBalance = overallToppedUp - overallSpent;

          const headers = ['التاريخ/اللقاء', 'البيان بالكامل', 'التفاصيل / القيمة', 'معدل الساعة المعين للمستفيد', 'القيمة الإجمالية (شيكل ₪)', 'حالة العملية / الاعتماد'];
          
          const rows: any[][] = [];
          rows.push(['التقرير المالي الشهري التفصيلي المخصص للطالب والمستفيد', student.name, 'الفترة والفرز المستهدف:', `${monthLabel} لسنة ${year}`, '', '']);
          rows.push(['الرصيد الافتتاحي قبل بداية الشهر المعني', `${startBalance.toFixed(1)} شيكل ₪`, '', '', '', '']);
          rows.push(['', '', '', '', '', '']);
          rows.push(['--- سجل عمليات شحن الرصيد والتحصيلات الجارية خلال الشهر المعني ---', '', '', '', '', '']);
          
          if (currentMonthCredits.length === 0) {
            rows.push(['لا توجد أي تغذية مالية أو إيصال قبض مسجل لهذا الطالب في هذا الشهر', '', '', '', '', '']);
          } else {
            currentMonthCredits.forEach(c => {
              rows.push([
                c.date || '',
                `شحن رصيد المحفظة - طريقة الدفع: ${c.method || 'غير محددة'}`,
                c.note || 'تعبئة رصيد جاري',
                `رقم السند: ${c.reference || 'لا يوجد'}`,
                c.amount,
                'مقبوضة ومقيدة'
              ]);
            });
          }
          rows.push(['إجمالي المبالغ المدفوعة والمشحونة هذا الشهر', `${totalCredits.toFixed(1)} شيكل ₪`, '', '', '', '']);
          rows.push(['', '', '', '', '', '']);
          
          rows.push(['--- سجل الحصص التعليمية المنجزة المستهلكة خلال نفس الشهر ---', '', '', '', '', '']);
          if (currentMonthSessions.length === 0) {
            rows.push(['لا توجد أي حصص أو لقاءات تدريسية مسجلة لهذا الطالب في هذا الشهر المالي', '', '', '', '', '']);
          } else {
            currentMonthSessions.forEach(s => {
              const tName = teachers.find(t => t.id === s.teacherId)?.name || 'معلم غير معروف';
              const rate = s.customFee !== undefined 
                ? (s.customFee / s.durationHours)
                : getStudentBillingRateForSession(student.id, s.teacherId);
              const cost = s.customFee !== undefined ? s.customFee : s.durationHours * rate;
              
              rows.push([
                s.date || '',
                `${s.subject || 'مادة عامة'} - الموضوع التدريسي: ${s.topic || 'لا يوجد تفاصيل موضوع'}`,
                `مكتملة مع المعلم: ${tName} لمدة: ${s.durationHours} ساعة`,
                `سعر الساعة: ${rate.toFixed(1)} ₪`,
                cost,
                'معتمدة بالكامل'
              ]);
            });
          }
          rows.push(['إجمالي الاستهلاك الفعلي للحصص الدراسية هذا الشهر', `${totalSpent.toFixed(1)} شيكل ₪`, '', '', '', '']);
          rows.push(['', '', '', '', '', '']);
          rows.push(['الرصيد الإغلاقي للمستفيد نهاية الشهر المحاسبي المعني', `${endBalance.toFixed(1)} شيكل ₪`, '', '', '', '']);
          rows.push(['الرصيد الحالي الشامل الآن للطالب في ذمة الأكاديمية (اللحظي)', `${currentOverallBalance.toFixed(1)} شيكل ₪`, '', '', '', '']);

          const fileName = `التقرير_المالي_الشهري_للطالب_${student.name.replace(/\s+/g, '_')}_${year}_${month}`;
          downloadCSVFile(headers, rows, fileName, ',');
          return;
        }
      }

      // General All Students CSV Ledger
      const headers = ['#', 'اسم الطالب', 'رصيد بداية الشهر (₪)', 'إيداعات ودفعات الشهر (₪)', 'استهلاك الحصص للشهر (₪)', 'رصيد نهاية الشهر (₪)', 'الرصيد اللحظي التراكمي (₪)', 'الحالة'];
      const rows: any[][] = [];
      rows.push(['كشف الحساب المالي العام الشامل لكافة طلاب أكاديمية التفوق', '', 'الفترة:', `${monthLabel} لسنة ${year}`, '', '', '', '']);
      rows.push(['', '', '', '', '', '', '', '']);

      let grandStartBalance = 0;
      let grandMonthCredits = 0;
      let grandMonthSpent = 0;
      let grandEndBalance = 0;
      let grandOverallBalance = 0;

      sortedStudents.forEach((st, idx) => {
        const startBal = getStudentStartBalance(st.id, year, month);
        const stCredits = credits.filter(c => {
          if (c.studentId !== st.id || !c.date) return false;
          const parts = c.date.split('-');
          return parts.length >= 2 && parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month;
        }).reduce((sum, c) => sum + c.amount, 0);

        const stSessions = sessions.filter(s => {
          if (s.studentId !== st.id || s.approved === false || !s.date) return false;
          const parts = s.date.split('-');
          return parts.length >= 2 && parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month;
        });

        const stSpent = stSessions.reduce((sum, s) => {
          if (s.customFee !== undefined) return sum + s.customFee;
          const rate = getStudentBillingRateForSession(st.id, s.teacherId);
          return sum + (s.durationHours * rate);
        }, 0);

        const endBal = startBal + stCredits - stSpent;

        const allApproved = sessions.filter(s => s.studentId === st.id && s.approved !== false);
        const allSpent = allApproved.reduce((sum, s) => {
          if (s.customFee !== undefined) return sum + s.customFee;
          const rate = getStudentBillingRateForSession(st.id, s.teacherId);
          return sum + (s.durationHours * rate);
        }, 0);
        const allCredits = credits.filter(c => c.studentId === st.id).reduce((sum, c) => sum + c.amount, 0);
        const overallBal = allCredits - allSpent;

        grandStartBalance += startBal;
        grandMonthCredits += stCredits;
        grandMonthSpent += stSpent;
        grandEndBalance += endBal;
        grandOverallBalance += overallBal;

        const status = overallBal > 0 ? 'رصيد دائن (له)' : overallBal < 0 ? 'رصيد مدين (عليه)' : 'متزن';

        rows.push([
          idx + 1,
          st.name,
          startBal.toFixed(1),
          stCredits.toFixed(1),
          stSpent.toFixed(1),
          endBal.toFixed(1),
          overallBal.toFixed(1),
          status
        ]);
      });

      rows.push(['', '', '', '', '', '', '', '']);
      rows.push([
        'المجموع الإجمالي الكلي لكافة الطلاب',
        `${sortedStudents.length} طالب`,
        grandStartBalance.toFixed(1),
        grandMonthCredits.toFixed(1),
        grandMonthSpent.toFixed(1),
        grandEndBalance.toFixed(1),
        grandOverallBalance.toFixed(1),
        '-'
      ]);

      const fileName = `التقرير_المالي_العام_الشامل_لكافة_الطلاب_${year}_${month}`;
      downloadCSVFile(headers, rows, fileName, ',');
    } else if (monReportType === 'teacher') {
      if (monSelectedTeacherId) {
        const teacher = teachers.find(t => t.id === monSelectedTeacherId);
        if (teacher) {
          const startBalance = getTeacherStartBalance(teacher.id, year, month);

      const currentMonthTeacherSessions = sessions.filter(s => {
        if (s.teacherId !== teacher.id || s.approved === false || !s.date) return false;
        const parts = s.date.split('-');
        if (parts.length < 2) return false;
        return parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month;
      }).sort((a, b) => a.date.localeCompare(b.date));

      const currentMonthTeacherPayments = payments.filter(p => {
        if (p.teacherId !== teacher.id || !p.date) return false;
        const parts = p.date.split('-');
        if (parts.length < 2) return false;
        return parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month;
      }).sort((a, b) => a.date.localeCompare(b.date));

      const totalEarned = currentMonthTeacherSessions.reduce((sum, s) => {
        if (s.customPayout !== undefined) return sum + s.customPayout;
        const rate = getTeacherPayoutRateForSession(s.studentId, teacher.id);
        return sum + (s.durationHours * rate);
      }, 0);

      const totalPaid = currentMonthTeacherPayments.reduce((sum, p) => sum + p.amount, 0);
      const endBalance = startBalance + totalEarned - totalPaid;

      // Overall balance check
      const overallTeacherSessions = sessions.filter(s => s.teacherId === teacher.id && s.approved !== false);
      const overallEarned = overallTeacherSessions.reduce((sum, s) => {
        if (s.customPayout !== undefined) return sum + s.customPayout;
        const rate = getTeacherPayoutRateForSession(s.studentId, teacher.id);
        return sum + (s.durationHours * rate);
      }, 0);
      const overallPaid = payments.filter(p => p.teacherId === teacher.id).reduce((sum, p) => sum + p.amount, 0);
      const currentOverallBalance = overallEarned - overallPaid;

      const headers = ['التاريخ/السند', 'البيان والموضوع التفصيلي الحُر', 'ساعات العمل لخدمة الطالب', 'معدل الحساب / سند دفع', 'أتعاب المعاملة الدورية (شيكل ₪)', 'حالة العملية / التدقيق'];

      const rows: any[][] = [];
      rows.push(['التقرير المالي الشهري التفصيلي لرواتب ومستحقات المعلم الأستاذ', teacher.name, 'السنة والشهر المستهدف:', `${monthLabel} لسنة ${year}`, '', '']);
      rows.push(['مستحقات معلقة للمدرس مستدعاة بداية هذا الشهر', `${startBalance.toFixed(1)} شيكل ₪`, '', '', '', '']);
      rows.push(['', '', '', '', '', '']);
      rows.push(['--- سجل الحصص والدروس واللقاءات التدريسية المنجزة خلال هذا الشهر ---', '', '', '', '', '']);

      if (currentMonthTeacherSessions.length === 0) {
        rows.push(['لا توجد أي حصص تدريسية مسجلة أو معتمدة للمعلم في هذا الشهر المالي', '', '', '', '', '']);
      } else {
        currentMonthTeacherSessions.forEach(s => {
          const sName = students.find(st => st.id === s.studentId)?.name || 'طالب غير معروف';
          const rate = s.customPayout !== undefined 
            ? (s.customPayout / s.durationHours)
            : getTeacherPayoutRateForSession(s.studentId, teacher.id);
          const wages = s.customPayout !== undefined ? s.customPayout : s.durationHours * rate;
          
          rows.push([
            s.date || '',
            `${s.subject || 'مادة عامة'} - الموضوع الشارح: ${s.topic || 'شرح عام ومراجعة'}`,
            `تأدية الحصص لمصلحة الطالب: ${sName} بمدة: ${s.durationHours} ساعة`,
            `متوسط سعر الساعة للمدرس: ${rate.toFixed(1)} ₪`,
            wages,
            'حصة معتمدة ومقيدة'
          ]);
        });
      }
      rows.push(['إجمالي أتعاب الدروس المستحقة هذا الشهر المكتسبة', `${totalEarned.toFixed(1)} شيكل ₪`, '', '', '', '']);
      rows.push(['', '', '', '', '', '']);

      rows.push(['--- سجل الرواتب والدفعات المصروفة والواصلة للمدرس خلال هذا الشهر ---', '', '', '', '', '']);
      if (currentMonthTeacherPayments.length === 0) {
        rows.push(['لم تسجل أو تصرف أي دفعات مالية أو رواتب للمدرس في هذا الشهر الصرفي', '', '', '', '', '']);
      } else {
        currentMonthTeacherPayments.forEach(p => {
          rows.push([
            p.date || '',
            p.note || 'سند صرف رواتب وأجر المعلم للدروس المنجزة',
            p.reference || 'تحويل مباشر بالذمة',
            'سند قبض مالي',
            p.amount,
            'مدفوعة بالكامل'
          ]);
        });
      }
      rows.push(['إجمالي المبالغ المصروفة والمسددة فعلياً هذا الشهر', `${totalPaid.toFixed(1)} شيكل ₪`, '', '', '', '']);
      rows.push(['', '', '', '', '', '']);
      rows.push(['صافي مستحقات الأستاذ المصفرة/المتبقية نهاية الشهر المالي المعني', `${endBalance.toFixed(1)} شيكل ₪`, '', '', '', '']);
      rows.push(['إجمالي رصيد ومستحقات الأستاذ المعلقة الآن بالنظام (اللحظي)', `${currentOverallBalance.toFixed(1)} شيكل ₪`, '', '', '', '']);

          const fileName = `التقرير_المالي_الشهري_للمعلم_${teacher.name.replace(/\s+/g, '_')}_${year}_${month}`;
          downloadCSVFile(headers, rows, fileName, ',');
          return;
        }
      }

      // General All Teachers CSV Ledger
      const headers = ['#', 'اسم المعلم', 'ساعات التدريس المنفذة', 'الأجور والمستحقات المكتسبة (₪)', 'المبالغ المدفوعة والمسددة (₪)', 'الرصيد المتبقي بالذمة (₪)', 'الحالة'];
      const rows: any[][] = [];
      rows.push(['كشف مسير أجور ومستحقات كافة المعلمين - أكاديمية التفوق', '', 'الفترة:', `${monthLabel} لسنة ${year}`, '', '', '']);
      rows.push(['', '', '', '', '', '', '']);

      let grandHours = 0;
      let grandEarned = 0;
      let grandPaid = 0;
      let grandBalance = 0;

      teachers.forEach((t, idx) => {
        const tSessions = sessions.filter(s => {
          if (s.teacherId !== t.id || s.approved === false || !s.date) return false;
          const parts = s.date.split('-');
          return parts.length >= 2 && parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month;
        });

        const uniqueSessionsMap = new Map<string, Session>();
        tSessions.forEach(s => {
          const key = s.isGroupSession ? `${s.date}_${s.teacherId}_${s.groupId || ''}` : s.id;
          if (!uniqueSessionsMap.has(key)) uniqueSessionsMap.set(key, s);
        });
        const hours = Array.from(uniqueSessionsMap.values()).reduce((sum, s) => sum + s.durationHours, 0);

        const earned = tSessions.reduce((sum, s) => {
          if (s.customPayout !== undefined) return sum + s.customPayout;
          const key = s.isGroupSession ? `${s.date}_${s.teacherId}_${s.groupId || ''}` : s.id;
          const isPrimary = uniqueSessionsMap.get(key)?.id === s.id;
          if (!isPrimary) return sum;
          const rate = getTeacherPayoutRateForSession(s.studentId, t.id);
          return sum + (s.durationHours * rate);
        }, 0);

        const paid = payments.filter(p => {
          if (p.teacherId !== t.id || !p.date) return false;
          const parts = p.date.split('-');
          return parts.length >= 2 && parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month;
        }).reduce((sum, p) => sum + (p.amount || 0), 0);

        const balance = earned - paid;
        grandHours += hours;
        grandEarned += earned;
        grandPaid += paid;
        grandBalance += balance;

        const status = balance > 0 ? 'متبقي له مستحقات' : balance < 0 ? 'مستلم زيادة' : 'مسدد بالكامل';

        rows.push([
          idx + 1,
          t.name,
          hours.toFixed(1),
          earned.toFixed(1),
          paid.toFixed(1),
          balance.toFixed(1),
          status
        ]);
      });

      rows.push(['', '', '', '', '', '', '']);
      rows.push([
        'المجموع الإجمالي لكافة المعلمين',
        `${teachers.length} معلم`,
        grandHours.toFixed(1),
        grandEarned.toFixed(1),
        grandPaid.toFixed(1),
        grandBalance.toFixed(1),
        '-'
      ]);

      const fileName = `كشف_مسير_أجور_ورواتب_المعلمين_الشامل_${year}_${month}`;
      downloadCSVFile(headers, rows, fileName, ',');
    } else if (monReportType === 'center') {
      const currentMonthSessions = sessions.filter(s => {
        if (s.approved === false || !s.date) return false;
        const parts = s.date.split('-');
        if (parts.length < 2) return false;
        return parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month;
      });

      // 1. Group Courses
      const groupCoursesPerformance = groupCourses.map(course => {
        const courseSessions = currentMonthSessions.filter(s =>
          s.isGroupSession && (s.groupId === course.id || s.courseCode === course.code)
        );
        
        if (courseSessions.length === 0) return null;
        
        const uniqueStudents = Array.from(new Set(courseSessions.map(s => s.studentId)));
        
        const uniqueSessionsMap = new Map<string, Session>();
        courseSessions.forEach(s => {
          const key = `${s.date}_${s.teacherId}_${s.groupId || ''}`;
          if (!uniqueSessionsMap.has(key)) {
            uniqueSessionsMap.set(key, s);
          }
        });
        const totalHours = Array.from(uniqueSessionsMap.values()).reduce((sum, s) => sum + s.durationHours, 0);
        
        const revenue = courseSessions.reduce((sum, s) => {
          if (s.customFee !== undefined) return sum + s.customFee;
          const rate = getStudentBillingRateForSession(s.studentId, s.teacherId);
          return sum + (s.durationHours * rate);
        }, 0);
        
        const payout = courseSessions.reduce((sum, s) => {
          if (s.customPayout !== undefined) return sum + s.customPayout;
          const key = `${s.date}_${s.teacherId}_${s.groupId || ''}`;
          const isPrimary = uniqueSessionsMap.get(key)?.id === s.id;
          if (!isPrimary) return sum;
          
          const rate = getTeacherPayoutRateForSession(s.studentId, s.teacherId);
          return sum + (s.durationHours * rate);
        }, 0);
        
        return {
          name: course.name || course.title || 'دورة جماعية غير مسماة',
          type: 'جماعية',
          hours: totalHours,
          studentsCount: uniqueStudents.length,
          revenue,
          payout,
          margin: revenue - payout
        };
      }).filter(Boolean);

      // 2. Individual Subjects
      const individualSessions = currentMonthSessions.filter(s => !s.isGroupSession);
      const individualSubjectsMap = new Map<string, Session[]>();
      individualSessions.forEach(s => {
        const sub = s.subject || 'مادة عامة';
        if (!individualSubjectsMap.has(sub)) {
          individualSubjectsMap.set(sub, []);
        }
        individualSubjectsMap.get(sub)!.push(s);
      });

      const individualPerformance = Array.from(individualSubjectsMap.entries()).map(([subName, subSessions]) => {
        const uniqueStudents = Array.from(new Set(subSessions.map(s => s.studentId)));
        const totalHours = subSessions.reduce((sum, s) => sum + s.durationHours, 0);
        
        const revenue = subSessions.reduce((sum, s) => {
          if (s.customFee !== undefined) return sum + s.customFee;
          const rate = getStudentBillingRateForSession(s.studentId, s.teacherId);
          return sum + (s.durationHours * rate);
        }, 0);

        const payout = subSessions.reduce((sum, s) => {
          if (s.customPayout !== undefined) return sum + s.customPayout;
          const rate = getTeacherPayoutRateForSession(s.studentId, s.teacherId);
          return sum + (s.durationHours * rate);
        }, 0);

        return {
          name: subName,
          type: 'فردية',
          hours: totalHours,
          studentsCount: uniqueStudents.length,
          revenue,
          payout,
          margin: revenue - payout
        };
      });

      const allCoursesPerformance = [...groupCoursesPerformance, ...individualPerformance];

      const totalHoursTaught = allCoursesPerformance.reduce((sum, c) => sum + c.hours, 0);
      const totalRevenueAccrued = allCoursesPerformance.reduce((sum, c) => sum + c.revenue, 0);
      const totalPayoutAccrued = allCoursesPerformance.reduce((sum, c) => sum + c.payout, 0);
      const totalNetProfit = totalRevenueAccrued - totalPayoutAccrued;

      const totalDeposits = credits.filter(c => {
        if (!c.date) return false;
        const parts = c.date.split('-');
        if (parts.length < 2) return false;
        return parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month;
      }).reduce((sum, c) => sum + c.amount, 0);

      const totalPaymentsPaid = payments.filter(p => {
        if (!p.date) return false;
        const parts = p.date.split('-');
        if (parts.length < 2) return false;
        return parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month;
      }).reduce((sum, p) => sum + p.amount, 0);

      // Group current month sessions by teacher
      const teachersPerformanceMap = new Map<string, Session[]>();
      currentMonthSessions.forEach(s => {
        const tId = s.teacherId;
        if (tId) {
          if (!teachersPerformanceMap.has(tId)) {
            teachersPerformanceMap.set(tId, []);
          }
          teachersPerformanceMap.get(tId)!.push(s);
        }
      });

      const teachersPerformance = Array.from(teachersPerformanceMap.entries()).map(([tId, tSessions]) => {
        const teacher = teachers.find(t => t.id === tId);
        if (!teacher) return null;

        const uniqueSessionsMap = new Map<string, Session>();
        tSessions.forEach(s => {
          const key = s.isGroupSession 
            ? `${s.date}_${s.teacherId}_${s.groupId || ''}`
            : s.id;
          if (!uniqueSessionsMap.has(key)) {
            uniqueSessionsMap.set(key, s);
          }
        });
        const hours = Array.from(uniqueSessionsMap.values()).reduce((sum, s) => sum + s.durationHours, 0);

        const earned = tSessions.reduce((sum, s) => {
          if (s.customPayout !== undefined) return sum + s.customPayout;
          const key = s.isGroupSession ? `${s.date}_${s.teacherId}_${s.groupId || ''}` : s.id;
          const isPrimary = uniqueSessionsMap.get(key)?.id === s.id;
          if (!isPrimary) return sum;
          
          const rate = getTeacherPayoutRateForSession(s.studentId, teacher.id);
          return sum + (s.durationHours * rate);
        }, 0);

        const paid = payments.filter(p => {
          if (p.teacherId !== tId || !p.date) return false;
          const parts = p.date.split('-');
          if (parts.length < 2) return false;
          return parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month;
        }).reduce((sum, p) => sum + (p.amount || 0), 0);

        return {
          name: teacher.name,
          hours,
          earned,
          paid,
          balance: earned - paid
        };
      }).filter(Boolean);

      const headers = ['الموضوع / الفئة', 'النوع / الاسم', 'الساعات المنفذة', 'عدد الطلاب النشطين', 'إجمالي الإيرادات والدخل (₪)', 'أجور ورواتب المعلمين (₪)', 'صافي الربح للمركز (₪)'];
      const rows: any[][] = [];
      rows.push(['التقرير المالي الشهري الشامل لمركز التدريب - أكاديمية التفوق', '', 'الشهر والفرز المستهدف:', `${monthLabel} لسنة ${year}`, '', '', '']);
      rows.push(['', '', '', '', '', '', '']);
      
      rows.push(['--- مؤشرات الأداء المالي والتدفقات النقدية الكلية للمركز ---', '', '', '', '', '', '']);
      rows.push(['إجمالي ساعات التدريس الفعلية من اللقاءات المعتمدة', `${totalHoursTaught.toFixed(1)} ساعة`, '', '', '', '', '']);
      rows.push(['إجمالي الإيرادات التشغيلية المستحقة (الحصص المنجزة)', `₪${totalRevenueAccrued.toFixed(1)}`, '', '', '', '', '']);
      rows.push(['إجمالي أجور ورواتب المعلمين المستحقة عن الشهر المعني', `₪${totalPayoutAccrued.toFixed(1)}`, '', '', '', '', '']);
      rows.push(['صافي الأرباح التشغيلية للمركز', `₪${totalNetProfit.toFixed(1)}`, '', '', '', '', '']);
      rows.push(['إجمالي المقبوضات والتحصيلات النقدية لطلاب المركز (شحن رصيد)', `₪${totalDeposits.toFixed(1)}`, '', '', '', '', '']);
      rows.push(['إجمالي المبالغ المصروفة والمدفوعة فعلياً للمدرسين خلال الشهر', `₪${totalPaymentsPaid.toFixed(1)}`, '', '', '', '', '']);
      rows.push(['', '', '', '', '', '', '']);

      rows.push(['--- تفاصيل دخل كل دورة ومادة دراسية (جماعي وفردي) ---', '', '', '', '', '', '']);
      allCoursesPerformance.forEach(c => {
        rows.push([
          c.name,
          `دورة ${c.type}`,
          `${c.hours.toFixed(1)} ساعة`,
          `${c.studentsCount} طالب`,
          c.revenue.toFixed(1),
          c.payout.toFixed(1),
          c.margin.toFixed(1)
        ]);
      });
      rows.push(['', '', '', '', '', '', '']);

      rows.push(['--- تفاصيل رواتب المعلمين عن الشهر المعني ---', '', '', '', '', '', '']);
      teachersPerformance.forEach(t => {
        rows.push([
          t.name,
          'أستاذ / معلم',
          `${t.hours.toFixed(1)} ساعة`,
          '-',
          t.earned.toFixed(1),
          t.paid.toFixed(1),
          t.balance.toFixed(1)
        ]);
      });

      const fileName = `التقرير_المالي_الشهري_الشامل_للمركز_${year}_${month}`;
      downloadCSVFile(headers, rows, fileName, ',');
    }
  };

  const convertHTMLToPDFAndDownload = async (htmlContent: string, title: string): Promise<void> => {
    // Helper to safely convert base64 data URL to Uint8Array without fetch()
    const dataUrlToUint8Array = (dataUrl: string): Uint8Array => {
      const parts = dataUrl.split(',');
      const base64 = parts.length > 1 ? parts[1] : parts[0];
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    };

    // Create an in-document container positioned behind UI to ensure html2canvas can measure geometry and render all text & tables
    const container = document.createElement('div');
    container.id = 'temp-pdf-render-container';
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
    container.style.margin = '0';
    container.style.padding = '0';
    container.style.boxSizing = 'border-box';
    container.style.direction = 'rtl';

    // Parse htmlContent to extract style tags and body innerHTML cleanly
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const styles = Array.from(doc.querySelectorAll('style, link[rel="stylesheet"]')).map(s => s.outerHTML).join('\n');
      const bodyHtml = doc.body ? doc.body.innerHTML : htmlContent;
      container.innerHTML = `${styles}<div style="direction: rtl; text-align: right; font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ffffff; color: #1e293b; padding: 28px; box-sizing: border-box; width: 100%;">${bodyHtml}</div>`;
    } catch {
      container.innerHTML = `<div style="direction: rtl; text-align: right; font-family: 'Cairo', sans-serif; background: #ffffff; color: #1e293b; padding: 28px; box-sizing: border-box; width: 100%;">${htmlContent}</div>`;
    }
    document.body.appendChild(container);

    try {
      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch {
          // ignore font loading errors
        }
      }

      const images = Array.from(container.querySelectorAll('img'));
      if (images.length > 0) {
        await Promise.all(
          images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise(res => {
              img.onload = res;
              img.onerror = res;
              setTimeout(res, 500);
            });
          })
        );
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

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas render produced invalid empty dimensions');
      }

      // Construct high-quality A4 PDF using pdf-lib
      const pdfDoc = await PDFDocument.create();
      const imgDataUrl = canvas.toDataURL('image/png');
      const imgBytes = dataUrlToUint8Array(imgDataUrl);
      const embeddedImg = await pdfDoc.embedPng(imgBytes);

      // A4 dimensions in pt: 595.28 x 841.89
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 20;
      const printableWidth = pageWidth - (margin * 2);
      const fullImgHeight = (canvas.height * printableWidth) / canvas.width;
      const maxPageContentHeight = pageHeight - (margin * 2);
      const totalPages = Math.max(1, Math.ceil(fullImgHeight / maxPageContentHeight));

      if (totalPages === 1) {
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        page.drawImage(embeddedImg, {
          x: margin,
          y: pageHeight - margin - fullImgHeight,
          width: printableWidth,
          height: fullImgHeight
        });
      } else {
        const sliceHeightPx = (maxPageContentHeight / printableWidth) * canvas.width;

        for (let p = 0; p < totalPages; p++) {
          const sy = p * sliceHeightPx;
          const sHeight = Math.min(sliceHeightPx, canvas.height - sy);
          if (sHeight <= 0) break;

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.round(sHeight);
          const pageCtx = pageCanvas.getContext('2d');
          if (pageCtx) {
            pageCtx.fillStyle = '#ffffff';
            pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            pageCtx.drawImage(
              canvas,
              0, sy, canvas.width, sHeight,
              0, 0, canvas.width, sHeight
            );
          }

          const pageDataUrl = pageCanvas.toDataURL('image/png');
          const pageBytes = dataUrlToUint8Array(pageDataUrl);
          const pageImg = await pdfDoc.embedPng(pageBytes);

          const page = pdfDoc.addPage([pageWidth, pageHeight]);
          const renderedHeight = (sHeight * printableWidth) / canvas.width;
          page.drawImage(pageImg, {
            x: margin,
            y: pageHeight - margin - renderedHeight,
            width: printableWidth,
            height: renderedHeight
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanTitle = (title || 'التقرير_المالي').replace(/[^\w\u0600-\u06FF-_]/g, '_');
      link.download = `${cleanTitle}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  };

  const printHTMLThroughIframe = async (htmlContent: string, title?: string, downloadDirectly: boolean = false) => {
    let docTitle = title || '';
    if (!docTitle) {
      const match = htmlContent.match(/<title>(.*?)<\/title>/i);
      if (match && match[1]) {
        docTitle = match[1];
      }
    }
    setPrintPreviewHtml(htmlContent);
    setPrintPreviewTitle(docTitle || 'التقرير المالي الأكاديمي');

    if (downloadDirectly) {
      try {
        await convertHTMLToPDFAndDownload(htmlContent, docTitle || 'التقرير_المالي');
        setToastAlert('تم تصدير وتنزيل ملف PDF المحاسبي بنجاح 📕');
      } catch (err) {
        console.warn('Direct PDF download failed, opening preview modal instead:', err);
        setShowPrintPreview(true);
      }
    } else {
      setShowPrintPreview(true);
    }
  };

  const exportPeriodFinancialReportToPDF = () => {
    const startStr = dashboardStartDate || 'بداية التسجيل';
    const endStr = dashboardEndDate || 'اليوم';
    
    // Filter sessions, credits, payments in selected range
    const periodSessions = sessions.filter(s => {
      if (s.approved === false) return false;
      if (dashboardStartDate && s.date && s.date < dashboardStartDate) return false;
      if (dashboardEndDate && s.date && s.date > dashboardEndDate) return false;
      return true;
    });

    const periodCredits = credits.filter(c => {
      if (dashboardStartDate && c.date && c.date < dashboardStartDate) return false;
      if (dashboardEndDate && c.date && c.date > dashboardEndDate) return false;
      return true;
    });

    const periodPayments = payments.filter(p => {
      if (dashboardStartDate && p.date && p.date < dashboardStartDate) return false;
      if (dashboardEndDate && p.date && p.date > dashboardEndDate) return false;
      return true;
    });

    // Helper functions for session fee & session cost
    const getSessionFee = (s: Session) => {
      if (s.customFee !== undefined) return s.customFee;
      const rate = getStudentBillingRateForSession(s.studentId, s.teacherId);
      return s.durationHours * rate;
    };

    const getSessionCost = (s: Session) => {
      if (s.customPayout !== undefined) return s.customPayout;
      const rate = getTeacherPayoutRateForSession(s.studentId, s.teacherId);
      return s.durationHours * rate;
    };

    // Calculate aggregated values
    const totalHours = periodSessions.reduce((sum, s) => sum + s.durationHours, 0);
    const totalRevenue = periodSessions.reduce((sum, s) => sum + getSessionFee(s), 0);
    const totalCosts = periodSessions.reduce((sum, s) => sum + getSessionCost(s), 0);
    const totalProfit = totalRevenue - totalCosts;
    const totalTopUps = periodCredits.reduce((sum, c) => sum + c.amount, 0);
    const totalPaidTeachers = periodPayments.reduce((sum, p) => sum + p.amount, 0);

    // Students summary
    const studentSummary = sortedStudents.map(st => {
      const stSessions = periodSessions.filter(s => s.studentId === st.id);
      const stCredits = periodCredits.filter(c => c.studentId === st.id);
      const hours = stSessions.reduce((sum, s) => sum + s.durationHours, 0);
      const revenue = stSessions.reduce((sum, s) => sum + getSessionFee(s), 0);
      const toppedUp = stCredits.reduce((sum, c) => sum + c.amount, 0);
      
      const overallSpent = sessions.filter(s => s.studentId === st.id && s.approved !== false).reduce((sum, s) => sum + getSessionFee(s), 0);
      const overallToppedUp = credits.filter(c => c.studentId === st.id).reduce((sum, c) => sum + c.amount, 0);
      const currentBalance = overallToppedUp - overallSpent;

      return {
        name: st.name,
        hours,
        revenue,
        toppedUp,
        currentBalance
      };
    }).filter(item => item.hours > 0 || item.toppedUp > 0);

    // Teachers summary
    const teacherSummary = teachers.map(t => {
      const tSessions = periodSessions.filter(s => s.teacherId === t.id);
      const tPayments = periodPayments.filter(p => p.teacherId === t.id);
      const hours = tSessions.reduce((sum, s) => sum + s.durationHours, 0);
      const earned = tSessions.reduce((sum, s) => sum + getSessionCost(s), 0);
      const paid = tPayments.reduce((sum, p) => sum + p.amount, 0);

      const overallEarned = sessions.filter(s => s.teacherId === t.id && s.approved !== false).reduce((sum, s) => sum + getSessionCost(s), 0);
      const overallPaid = payments.filter(p => p.teacherId === t.id).reduce((sum, p) => sum + p.amount, 0);
      const currentBalance = overallEarned - overallPaid;

      return {
        name: t.name,
        hours,
        earned,
        paid,
        currentBalance
      };
    }).filter(item => item.hours > 0 || item.paid > 0);

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>التقرير المالي الدوري الشامل - أبو علان سنتر</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
    body {
      font-family: 'Cairo', sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 40px;
      direction: rtl;
      background-color: #ffffff;
    }
    .header-table {
      width: 100%;
      border-bottom: 3px double #0d365a;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
    .brand-title {
      font-size: 22px;
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
      font-size: 16px;
      font-weight: 800;
      color: #0d365a;
      text-align: center;
      margin: 20px 0;
      background: #f1f5f9;
      padding: 12px;
      border-radius: 12px;
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
      width: 50%;
      padding: 8px;
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
    .summary-boxes {
      display: table;
      width: 100%;
      margin-bottom: 30px;
      table-layout: fixed;
    }
    .summary-cell {
      display: table-cell;
      padding: 6px;
    }
    .stat-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-right: 5px solid #0d365a;
      border-radius: 8px;
      padding: 12px;
      height: 100%;
    }
    .stat-box.highlight {
      border-right-color: #d4a33c;
      background: #fffdf5;
    }
    .stat-box.profit {
      border-right-color: #10b981;
      background: #f0fdf4;
    }
    .stat-label {
      font-size: 10px;
      color: #475569;
      font-weight: 700;
    }
    .stat-amount {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 4px;
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
    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #0d365a;
      border-bottom: 2px solid #cbd5e1;
      padding-bottom: 4px;
      margin: 25px 0 12px 0;
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
  <table class="header-table">
    <tr>
      <td>
        <h1 class="brand-title">أبو علان سنتر للخدمات التعليمية</h1>
        <p class="brand-sub">نظام الإدارة المالية والتدقيق والتقارير الشامل المعتمد Pro v2.5</p>
      </td>
      <td style="text-align: left; vertical-align: top;">
        <span style="font-size: 10px; color: #64748b; font-weight: 750;">تاريخ التوليد: ${new Date().toLocaleDateString('ar-EG')}</span>
      </td>
    </tr>
  </table>

  <div class="doc-title">
    التقرير المالي الدوري وتحليل الأرباح والخسائر <br/>
    <span style="font-size: 12px; font-weight: 600; color: #475569;">للفترة الزمنية: من [ ${startStr} ] إلى [ ${endStr} ]</span>
  </div>

  <div class="grid-info">
    <div class="info-row">
      <div class="info-col">
        <div class="info-card">
          <div class="info-label">المسؤول عن التقرير:</div>
          <div class="info-val">مدير المنصة أ.زكي أبو علان</div>
        </div>
      </div>
      <div class="info-col">
        <div class="info-card">
          <div class="info-label">نطاق الفرز المالي:</div>
          <div class="info-val">جميع الطلاب، الحصص، المقاصة الدورية والمدفوعات</div>
        </div>
      </div>
    </div>
  </div>

  <div class="section-title">الملخص المالي العام للفترة المحددة</div>
  <div class="summary-boxes">
    <div class="summary-cell">
      <div class="stat-box">
        <div class="stat-label">مجموع الساعات المنجزة</div>
        <div class="stat-amount">${totalHours.toFixed(1)} ساعة</div>
      </div>
    </div>
    <div class="summary-cell">
      <div class="stat-box highlight">
        <div class="stat-label">إجمالي إيرادات الحصص (المركز)</div>
        <div class="stat-amount">₪${totalRevenue.toFixed(0)}</div>
      </div>
    </div>
    <div class="summary-cell">
      <div class="stat-box">
        <div class="stat-label">إجمالي مستحقات المعلمين</div>
        <div class="stat-amount">₪${totalCosts.toFixed(0)}</div>
      </div>
    </div>
    <div class="summary-cell">
      <div class="stat-box profit">
        <div class="stat-label">صافي الهامش الدفتري للمركز</div>
        <div class="stat-amount">₪${totalProfit.toFixed(0)}</div>
      </div>
    </div>
  </div>

  <div class="summary-boxes">
    <div class="summary-cell" style="width: 50%;">
      <div class="stat-box highlight" style="border-right-color: #10b981;">
        <div class="stat-label">إجمالي إيداعات الطلاب المسجلة (خلال الفترة)</div>
        <div class="stat-amount">₪${totalTopUps.toFixed(0)}</div>
      </div>
    </div>
    <div class="summary-cell" style="width: 50%;">
      <div class="stat-box" style="border-right-color: #e11d48;">
        <div class="stat-label">إجمالي الرواتب والمدفوعات المسددة للمعلمين (خلال الفترة)</div>
        <div class="stat-amount">₪${totalPaidTeachers.toFixed(0)}</div>
      </div>
    </div>
  </div>

  <div class="section-title">تفاصيل إيرادات المركز وأرصدة الطلاب خلال الفترة</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>اسم الطالب</th>
        <th>الساعات المنجزة بالفترة</th>
        <th>رسوم الحصص المستحقة للمركز</th>
        <th>الإيداعات المشحونة بالفترة</th>
        <th>رصيد المحفظة الحالي لطالب</th>
      </tr>
    </thead>
    <tbody>
      ${studentSummary.length === 0 ? `
        <tr>
          <td colspan="5" style="text-align: center; color: #94a3b8;">لا توجد معاملات مالية أو حصص مسجلة للطلاب خلال هذه الفترة.</td>
        </tr>
      ` : studentSummary.map(st => `
        <tr>
          <td><strong>${st.name}</strong></td>
          <td>${st.hours.toFixed(1)} ساعة</td>
          <td>₪${st.revenue.toFixed(0)}</td>
          <td>₪${st.toppedUp.toFixed(0)}</td>
          <td style="font-weight: 700; color: ${st.currentBalance >= 0 ? '#10b981' : '#ef4444'};">₪${st.currentBalance.toFixed(0)}</td>
        </tr>
      `).join('')}
    </tbody>
    ${studentSummary.length > 0 ? `
    <tfoot>
      <tr style="background: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1;">
        <td style="font-weight: 800; padding: 10px;">مجموع الساعات الكلي لجميع الحصص المسجلة (نهاية الكشف):</td>
        <td style="font-weight: 900; color: #1d4ed8; padding: 10px; background: #e0f2fe;">${studentSummary.reduce((sum, st) => sum + st.hours, 0).toFixed(1)} ساعة</td>
        <td style="font-weight: 800; padding: 10px;">₪${studentSummary.reduce((sum, st) => sum + st.revenue, 0).toFixed(0)}</td>
        <td style="font-weight: 800; padding: 10px;">₪${studentSummary.reduce((sum, st) => sum + st.toppedUp, 0).toFixed(0)}</td>
        <td>-</td>
      </tr>
    </tfoot>
    ` : ''}
  </table>

  <div class="section-title">تفاصيل مستحقات ورواتب المعلمين خلال الفترة</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>اسم المعلم</th>
        <th>ساعات التدريس بالفترة</th>
        <th>مستحقات المعلم المرصودة بالفترة</th>
        <th>المبالغ المدفوعة له بالفترة</th>
        <th>الرصيد المعلق بفي ذمة المعلم</th>
      </tr>
    </thead>
    <tbody>
      ${teacherSummary.length === 0 ? `
        <tr>
          <td colspan="5" style="text-align: center; color: #94a3b8;">لا توجد معاملات مالية أو حصص مسجلة للمعلمين خلال هذه الفترة.</td>
        </tr>
      ` : teacherSummary.map(t => `
        <tr>
          <td><strong>${t.name}</strong></td>
          <td>${t.hours.toFixed(1)} ساعة</td>
          <td>₪${t.earned.toFixed(0)}</td>
          <td>₪${t.paid.toFixed(0)}</td>
          <td style="font-weight: 700; color: ${t.currentBalance > 0 ? '#ef4444' : '#10b981'};">₪${t.currentBalance.toFixed(0)}</td>
        </tr>
      `).join('')}
    </tbody>
    ${teacherSummary.length > 0 ? `
    <tfoot>
      <tr style="background: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1;">
        <td style="font-weight: 800; padding: 10px;">مجموع الساعات الكلي لجميع الحصص المسجلة (نهاية الكشف):</td>
        <td style="font-weight: 900; color: #1d4ed8; padding: 10px; background: #e0f2fe;">${teacherSummary.reduce((sum, t) => sum + t.hours, 0).toFixed(1)} ساعة</td>
        <td style="font-weight: 800; padding: 10px;">₪${teacherSummary.reduce((sum, t) => sum + t.earned, 0).toFixed(0)}</td>
        <td style="font-weight: 800; padding: 10px;">₪${teacherSummary.reduce((sum, t) => sum + t.paid, 0).toFixed(0)}</td>
        <td>-</td>
      </tr>
    </tfoot>
    ` : ''}
  </table>

  <div style="margin: 25px 0; padding: 16px 20px; background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; page-break-inside: avoid;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <span style="font-size: 24px;">⏱️</span>
      <div>
        <div style="font-size: 11px; color: #64748b; font-weight: bold;">مجموع ساعات التدريس الإجمالية للفترة (نهاية الكشف)</div>
        <div style="font-size: 18px; font-weight: 900; color: #1d4ed8;">
          ${totalHours.toFixed(1)} ساعة معتمدة (${periodSessions.length} حصة)
        </div>
      </div>
    </div>
    <div style="text-align: left;">
      <div style="font-size: 11px; color: #64748b; font-weight: bold;">صافي أرباح وتشغيل المركز</div>
      <div style="font-size: 18px; font-weight: 900; color: ${totalProfit >= 0 ? '#16a34a' : '#dc2626'};">
        ₪${totalProfit.toFixed(0)}
      </div>
    </div>
  </div>

  <div class="signatures">
    <div class="sig-col">
      <div class="sig-line">إعداد قسم التدقيق المحاسبي</div>
    </div>
    <div class="sig-col">
      <div class="sig-line">توقيع مدقق الحسابات المعتمد</div>
    </div>
    <div class="sig-col">
      <div class="sig-line">خاتم وتوقيع مدير المنصة أ.زكي أبو علان</div>
    </div>
  </div>
</body>
</html>
    `;

    printHTMLThroughIframe(html);
  };

  const exportAllFinancialAnalyticsToOrganizedPDF = () => {
    const startStr = dashboardStartDate || 'بداية السجلات المحفوظة';
    const endStr = dashboardEndDate || 'تاريخ اليوم';
    const issueDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const issueTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const auditRef = 'FIN-FULL-' + Math.floor(100000 + Math.random() * 900000);

    const approvedSessions = filteredSessions.filter(s => s.approved !== false);

    // Core Financial Metrics
    const totalHours = approvedSessions.reduce((sum, s) => sum + s.durationHours, 0);
    const totalRevenue = approvedSessions.reduce((sum, s) => {
      if (s.customFee !== undefined) return sum + s.customFee;
      const rate = getStudentBillingRateForSession(s.studentId, s.teacherId);
      return sum + (s.durationHours * rate);
    }, 0);
    const totalTeacherPayout = approvedSessions.reduce((sum, s) => {
      if (s.customPayout !== undefined) return sum + s.customPayout;
      const rate = getTeacherPayoutRateForSession(s.studentId, s.teacherId);
      return sum + (s.durationHours * rate);
    }, 0);
    const grossMargin = totalRevenue - totalTeacherPayout;

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const financingExpenses = filteredExpenses.filter(e => e.category === 'funding' || e.category === 'مصروفات تمويل').reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const otherExpenses = filteredExpenses.filter(e => e.category !== 'funding' && e.category !== 'مصروفات تمويل').reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const netOperatingProfit = totalRevenue - totalTeacherPayout - totalExpenses;

    const totalTopUps = filteredCredits.reduce((sum, c) => sum + c.amount, 0);
    const totalPaidTeachers = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const pendingTeacherPayouts = totalTeacherPayout - totalPaidTeachers;
    const netStudentBalances = allStudentAlerts.reduce((sum, st) => sum + st.balance, 0);

    // Courses & Subjects Performance Breakdown
    const groupSessions = approvedSessions.filter(s => s.isGroupSession);
    const groupMap = new Map<string, Session[]>();
    groupSessions.forEach(s => {
      const gKey = s.groupId || s.courseId || s.subject || 'دورة جماعية';
      if (!groupMap.has(gKey)) groupMap.set(gKey, []);
      groupMap.get(gKey)!.push(s);
    });

    const groupCoursesPerf = Array.from(groupMap.entries()).map(([gKey, gSessions]) => {
      const course = groupCourses.find(g => g.id === gKey);
      const name = course?.name || course?.title || gSessions[0]?.subject || gKey;
      const hours = gSessions.reduce((sum, s) => sum + s.durationHours, 0);
      const studentsCount = new Set(gSessions.map(s => s.studentId)).size;
      const revenue = gSessions.reduce((sum, s) => {
        if (s.customFee !== undefined) return sum + s.customFee;
        const rate = getStudentBillingRateForSession(s.studentId, s.teacherId);
        return sum + (s.durationHours * rate);
      }, 0);
      const payout = gSessions.reduce((sum, s) => {
        if (s.customPayout !== undefined) return sum + s.customPayout;
        const rate = getTeacherPayoutRateForSession(s.studentId, s.teacherId);
        return sum + (s.durationHours * rate);
      }, 0);
      return { name, type: 'دورة جماعية', hours, studentsCount, revenue, payout, margin: revenue - payout };
    });

    const indSessions = approvedSessions.filter(s => !s.isGroupSession);
    const indMap = new Map<string, Session[]>();
    indSessions.forEach(s => {
      const sub = s.subject || 'مادة عامة فردية';
      if (!indMap.has(sub)) indMap.set(sub, []);
      indMap.get(sub)!.push(s);
    });

    const indCoursesPerf = Array.from(indMap.entries()).map(([sub, subSessions]) => {
      const hours = subSessions.reduce((sum, s) => sum + s.durationHours, 0);
      const studentsCount = new Set(subSessions.map(s => s.studentId)).size;
      const revenue = subSessions.reduce((sum, s) => {
        if (s.customFee !== undefined) return sum + s.customFee;
        const rate = getStudentBillingRateForSession(s.studentId, s.teacherId);
        return sum + (s.durationHours * rate);
      }, 0);
      const payout = subSessions.reduce((sum, s) => {
        if (s.customPayout !== undefined) return sum + s.customPayout;
        const rate = getTeacherPayoutRateForSession(s.studentId, s.teacherId);
        return sum + (s.durationHours * rate);
      }, 0);
      return { name: sub, type: 'حصص فردية خاصة', hours, studentsCount, revenue, payout, margin: revenue - payout };
    });

    const allCoursesAnalytics = [...groupCoursesPerf, ...indCoursesPerf].sort((a, b) => b.revenue - a.revenue);

    // Teachers Ledger
    const teacherDataList = teachers.map(t => {
      const tSessions = approvedSessions.filter(s => s.teacherId === t.id);
      const tPayments = filteredPayments.filter(p => p.teacherId === t.id);
      const hours = tSessions.reduce((sum, s) => sum + s.durationHours, 0);
      const earned = tSessions.reduce((sum, s) => {
        if (s.customPayout !== undefined) return sum + s.customPayout;
        const rate = getTeacherPayoutRateForSession(s.studentId, t.id);
        return sum + (s.durationHours * rate);
      }, 0);
      const paid = tPayments.reduce((sum, p) => sum + p.amount, 0);
      const balance = earned - paid;
      return {
        name: t.name,
        hours,
        earned,
        paid,
        balance,
        status: balance > 50 ? 'متبقي مستحق' : balance < -50 ? 'مدفوع مقدماً' : 'مسوى بالكامل'
      };
    }).filter(t => t.hours > 0 || t.paid > 0 || Math.abs(t.balance) > 1).sort((a, b) => b.hours - a.hours);

    // Students Balances & Liquidity Risk
    const studentsDataList = allStudentAlerts.map(st => {
      const stSessions = approvedSessions.filter(s => s.studentId === st.id);
      const hours = stSessions.reduce((sum, s) => sum + s.durationHours, 0);
      return {
        name: st.name,
        phone: st.phone || 'غير مسجل',
        hours,
        totalToppedUp: st.totalToppedUp,
        totalSpent: st.totalSpent,
        balance: st.balance,
        threshold: st.threshold,
        status: st.isOpenBalance ? 'رصيد مفتوح من المدير 🔓' : st.isCritical ? 'حرج دون حد الأمان' : st.isApproaching ? 'يقترب من النفاد' : 'آمن ومستقر'
      };
    }).sort((a, b) => a.balance - b.balance);

    // Operational Expenses
    const expensesList = filteredExpenses.map(e => ({
      date: e.date || 'غير محدد',
      note: e.note || 'مصروف تشغيلي عام',
      category: e.category === 'funding' || e.category === 'مصروفات تمويل' ? 'مصروفات تمويل' : 'مصروفات أخرى وتشغيل',
      amount: Number(e.amount || 0)
    })).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Recent Cashflow Transactions (payments & credits)
    const recentCashflow = [
      ...filteredPayments.map(p => {
        const t = teachers.find(teach => teach.id === p.teacherId);
        return {
          type: 'صرف مستحقات معلم (مدفوعات)',
          isOut: true,
          person: t?.name || 'معلم',
          amount: p.amount,
          date: p.date || '',
          note: p.note || 'دفعة راتب / مستحقات'
        };
      }),
      ...filteredCredits.map(c => {
        const st = students.find(s => s.id === c.studentId);
        return {
          type: 'شحن رصيد محفظة طالب (مقبوضات)',
          isOut: false,
          person: st?.name || 'طالب',
          amount: c.amount,
          date: c.date || '',
          note: c.note || c.method || 'إيداع محفظة'
        };
      })
    ].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 15);

    const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <title>التقرير المالي والتحليلي الشامل المنظم - ${startStr} إلى ${endStr}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      direction: rtl;
      font-size: 11px;
      line-height: 1.5;
    }
    .page-container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
    }
    .header-banner {
      background: linear-gradient(135deg, #0d365a 0%, #1a4971 100%);
      color: #ffffff;
      padding: 16px 20px;
      border-radius: 12px;
      margin-bottom: 18px;
      border-bottom: 3px solid #d4a33c;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
    }
    .header-table td {
      vertical-align: middle;
      padding: 0;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 900;
      margin: 0;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      font-size: 11px;
      color: #cbd5e1;
      margin: 3px 0 0 0;
      font-weight: 600;
    }
    .meta-box {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 10px;
      line-height: 1.6;
      text-align: left;
      color: #f1f5f9;
    }
    .meta-box strong {
      color: #fde047;
    }
    .report-title-bar {
      text-align: center;
      margin: 14px 0 16px 0;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 10px;
    }
    .report-main-title {
      font-size: 16px;
      font-weight: 900;
      color: #0d365a;
      margin: 0 0 4px 0;
    }
    .report-period-tag {
      display: inline-block;
      background: #f1f5f9;
      color: #334155;
      padding: 3px 12px;
      border-radius: 16px;
      font-size: 10px;
      font-weight: 700;
      border: 1px solid #cbd5e1;
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 18px 0 8px 0;
      padding-bottom: 4px;
      border-bottom: 1.5px solid #0d365a;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      color: #0d365a;
      margin: 0;
      display: inline-block;
    }
    .section-badge {
      font-size: 9px;
      background: #e0e7ff;
      color: #3730a3;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 700;
    }
    /* Grid KPI Cards */
    .kpi-grid {
      display: table;
      width: 100%;
      table-layout: fixed;
      border-spacing: 6px;
      margin-bottom: 14px;
    }
    .kpi-row {
      display: table-row;
    }
    .kpi-card {
      display: table-cell;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 10px;
      text-align: center;
      vertical-align: middle;
    }
    .kpi-card.highlight-profit {
      background: #ecfdf5;
      border-color: #10b981;
    }
    .kpi-card.highlight-revenue {
      background: #eff6ff;
      border-color: #3b82f6;
    }
    .kpi-card.highlight-expense {
      background: #fff1f2;
      border-color: #f43f5e;
    }
    .kpi-card.highlight-gold {
      background: #fefce8;
      border-color: #eab308;
    }
    .kpi-label {
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 3px;
    }
    .kpi-val {
      font-size: 14px;
      font-weight: 900;
      color: #0f172a;
      font-family: inherit;
    }
    .kpi-val.green { color: #047857; }
    .kpi-val.blue { color: #1d4ed8; }
    .kpi-val.red { color: #b91c1c; }
    .kpi-val.gold { color: #b45309; }

    /* Tables */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 9.5px;
    }
    table.data-table th {
      background: #0d365a;
      color: #ffffff;
      padding: 6px 8px;
      font-weight: 800;
      text-align: right;
      border: 1px solid #0d365a;
    }
    table.data-table td {
      padding: 5.5px 8px;
      border: 1px solid #cbd5e1;
      color: #1e293b;
      vertical-align: middle;
    }
    table.data-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    table.data-table tr.total-row td {
      background: #f1f5f9;
      font-weight: 900;
      color: #0f172a;
      border-top: 2px solid #0d365a;
    }
    .badge {
      display: inline-block;
      padding: 1.5px 6px;
      border-radius: 4px;
      font-size: 8.5px;
      font-weight: 700;
      text-align: center;
    }
    .badge-green { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .badge-amber { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .badge-red { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .badge-blue { background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd; }
    
    .signatures-block {
      margin-top: 25px;
      width: 100%;
      display: table;
      table-layout: fixed;
      border-collapse: collapse;
      page-break-inside: avoid;
    }
    .sig-cell {
      display: table-cell;
      width: 33.33%;
      text-align: center;
      padding: 10px;
      vertical-align: top;
    }
    .sig-box {
      border: 1px dashed #94a3b8;
      border-radius: 8px;
      padding: 12px 8px 8px 8px;
      background: #f8fafc;
    }
    .sig-title {
      font-size: 10px;
      font-weight: 800;
      color: #1e293b;
      margin-bottom: 24px;
    }
    .sig-line {
      border-top: 1px solid #475569;
      margin: 0 15px;
      padding-top: 4px;
      font-size: 9px;
      color: #64748b;
      font-weight: 700;
    }
    .doc-footer {
      margin-top: 16px;
      text-align: center;
      font-size: 8.5px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
      font-weight: 600;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .page-break {
        page-break-before: always;
      }
      tr {
        page-break-inside: avoid;
      }
      .kpi-grid, .signatures-block {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- Header Banner -->
    <div class="header-banner">
      <table class="header-table">
        <tr>
          <td>
            <h1 class="brand-title">أكاديمية التفوق أون لاين</h1>
            <p class="brand-sub">نظام التقارير المالية والتحليلات الإحصائية الموحدة - إدارة أبو علان سنتر</p>
          </td>
          <td style="text-align: left; width: 220px;">
            <div class="meta-box">
              <div><strong>تاريخ الإصدار:</strong> ${issueDate}</div>
              <div><strong>وقت التوليد:</strong> ${issueTime}</div>
              <div><strong>الرقم المرجعي:</strong> ${auditRef}</div>
              <div><strong>حالة التقرير:</strong> معتمد ومدقق رسمياً</div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Title Bar -->
    <div class="report-title-bar">
      <h2 class="report-main-title">التقرير المالي والتحليلي الشامل لكافة الأنشطة والعمليات</h2>
      <div class="report-period-tag">الفترة المشمولة: من [${startStr}] إلى [${endStr}]</div>
    </div>

    <!-- SECTION 1: EXECUTIVE KPIS -->
    <div class="section-header">
      <h3 class="section-title">أولاً: ملخص المؤشرات المالية والتشغيلية الرئيسية (Executive Summary)</h3>
      <span class="section-badge">نظرة عامة شمولية</span>
    </div>

    <div class="kpi-grid">
      <div class="kpi-row">
        <div class="kpi-card highlight-revenue">
          <div class="kpi-label">إجمالي إيرادات الحصص</div>
          <div class="kpi-val blue">${totalRevenue.toFixed(2)} ₪</div>
        </div>
        <div class="kpi-card highlight-gold">
          <div class="kpi-label">مستحقات وأجور المعلمين</div>
          <div class="kpi-val gold">${totalTeacherPayout.toFixed(2)} ₪</div>
        </div>
        <div class="kpi-card highlight-expense">
          <div class="kpi-label">إجمالي المصروفات التشغيلية</div>
          <div class="kpi-val red">${totalExpenses.toFixed(2)} ₪</div>
        </div>
        <div class="kpi-card highlight-profit">
          <div class="kpi-label">صافي الربح التشغيلي المحقق</div>
          <div class="kpi-val green">${netOperatingProfit.toFixed(2)} ₪</div>
        </div>
      </div>
      <div class="kpi-row">
        <div class="kpi-card">
          <div class="kpi-label">إجمالي ساعات التدريس</div>
          <div class="kpi-val">${totalHours.toFixed(1)} س</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">إجمالي شحن محافظ الطلاب</div>
          <div class="kpi-val">${totalTopUps.toFixed(2)} ₪</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">المدفوع فعلياً للمعلمين</div>
          <div class="kpi-val">${totalPaidTeachers.toFixed(2)} ₪</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">مستحقات المعلمين المتبقية</div>
          <div class="kpi-val ${pendingTeacherPayouts > 0 ? 'gold' : ''}">${pendingTeacherPayouts.toFixed(2)} ₪</div>
        </div>
      </div>
    </div>

    <!-- SECTION 2: COURSES & SUBJECTS ANALYTICS -->
    <div class="section-header">
      <h3 class="section-title">ثانياً: تحليل ربحية المواد والدورات التعليمية (Course & Subject Analytics)</h3>
      <span class="section-badge">${allCoursesAnalytics.length} مادة ودورة</span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 25%;">اسم المادة / الدورة التعليمية</th>
          <th style="width: 13%;">نوع التعليم</th>
          <th style="width: 10%; text-align: center;">الساعات</th>
          <th style="width: 10%; text-align: center;">الطلاب</th>
          <th style="width: 14%;">الإيرادات المحققة</th>
          <th style="width: 14%;">أجور المعلمين</th>
          <th style="width: 14%;">صافي الهامش الربحي</th>
        </tr>
      </thead>
      <tbody>
        ${allCoursesAnalytics.length === 0 ? `
          <tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 12px;">لا توجد حصص منجزة مسجلة خلال الفترة المحددة</td></tr>
        ` : allCoursesAnalytics.map(c => `
          <tr>
            <td><strong>${c.name}</strong></td>
            <td><span class="badge ${c.type === 'دورة جماعية' ? 'badge-blue' : 'badge-amber'}">${c.type}</span></td>
            <td style="text-align: center; font-weight: 700;">${c.hours.toFixed(1)}</td>
            <td style="text-align: center;">${c.studentsCount}</td>
            <td style="font-weight: 700; color: #1d4ed8;">${c.revenue.toFixed(2)} ₪</td>
            <td style="color: #b45309;">${c.payout.toFixed(2)} ₪</td>
            <td style="font-weight: 800; color: ${c.margin >= 0 ? '#047857' : '#b91c1c'};">${c.margin.toFixed(2)} ₪</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="2" style="font-weight: 800;">مجموع الساعات الكلي لجميع الحصص المسجلة (نهاية الكشف):</td>
          <td style="text-align: center; font-weight: 900; color: #1d4ed8; background: #e0f2fe;">${allCoursesAnalytics.reduce((s, c) => s + c.hours, 0).toFixed(1)} س</td>
          <td style="text-align: center;">-</td>
          <td style="color: #1d4ed8;">${allCoursesAnalytics.reduce((s, c) => s + c.revenue, 0).toFixed(2)} ₪</td>
          <td style="color: #b45309;">${allCoursesAnalytics.reduce((s, c) => s + c.payout, 0).toFixed(2)} ₪</td>
          <td style="color: #047857;">${allCoursesAnalytics.reduce((s, c) => s + c.margin, 0).toFixed(2)} ₪</td>
        </tr>
      </tbody>
    </table>

    <!-- SECTION 3: OPERATIONAL EXPENSES -->
    <div class="section-header">
      <h3 class="section-title">ثالثاً: كشف المصروفات التشغيلية والتمويلية المدققة (Expenses Ledger)</h3>
      <span class="section-badge">${expensesList.length} بنود مصروفات</span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 18%;">تاريخ الصرف</th>
          <th style="width: 44%;">البيان / تفاصيل المصروف</th>
          <th style="width: 20%;">تصنيف المصروف</th>
          <th style="width: 18%;">المبلغ المصروف</th>
        </tr>
      </thead>
      <tbody>
        ${expensesList.length === 0 ? `
          <tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 12px;">لا توجد مصروفات مسجلة خلال هذه الفترة</td></tr>
        ` : expensesList.map(e => `
          <tr>
            <td>${e.date}</td>
            <td>${e.note}</td>
            <td><span class="badge ${e.category === 'مصروفات تمويل' ? 'badge-amber' : 'badge-blue'}">${e.category}</span></td>
            <td style="font-weight: 800; color: #b91c1c;">${e.amount.toFixed(2)} ₪</td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td colspan="3">إجمالي المصروفات (تمويلية: ${financingExpenses.toFixed(2)} ₪ + أخرى: ${otherExpenses.toFixed(2)} ₪)</td>
          <td style="color: #b91c1c;">${totalExpenses.toFixed(2)} ₪</td>
        </tr>
      </tbody>
    </table>

    <!-- PAGE BREAK FOR CLEAN PRINTING -->
    <div class="page-break"></div>

    <!-- SECTION 4: TEACHERS LEDGER -->
    <div class="section-header" style="margin-top: 12px;">
      <h3 class="section-title">رابعاً: كشف أداء ومستحقات الكادر التعليمي (Teachers Financial Ledger)</h3>
      <span class="section-badge">${teacherDataList.length} معلماً</span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 26%;">اسم المعلم</th>
          <th style="width: 12%; text-align: center;">ساعات العمل</th>
          <th style="width: 16%;">المستحقات المكتسبة</th>
          <th style="width: 16%;">المبالغ المسددة</th>
          <th style="width: 16%;">الرصيد المتبقي</th>
          <th style="width: 14%; text-align: center;">الحالة المحاسبية</th>
        </tr>
      </thead>
      <tbody>
        ${teacherDataList.length === 0 ? `
          <tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 12px;">لا توجد سجلات مستحقات للمعلمين خلال هذه الفترة</td></tr>
        ` : teacherDataList.map(t => `
          <tr>
            <td><strong>${t.name}</strong></td>
            <td style="text-align: center; font-weight: 700;">${t.hours.toFixed(1)}</td>
            <td style="color: #0f172a; font-weight: 700;">${t.earned.toFixed(2)} ₪</td>
            <td style="color: #047857; font-weight: 700;">${t.paid.toFixed(2)} ₪</td>
            <td style="font-weight: 800; color: ${t.balance > 0 ? '#b91c1c' : t.balance < 0 ? '#047857' : '#64748b'};">
              ${t.balance.toFixed(2)} ₪
            </td>
            <td style="text-align: center;">
              <span class="badge ${t.status === 'متبقي مستحق' ? 'badge-red' : t.status === 'مدفوع مقدماً' ? 'badge-green' : 'badge-blue'}">
                ${t.status}
              </span>
            </td>
          </tr>
        `).join('')}
        <tr class="total-row">
          <td style="font-weight: 800;">مجموع الساعات الكلي لجميع الحصص المسجلة (نهاية الكشف):</td>
          <td style="text-align: center; font-weight: 900; color: #1d4ed8; background: #e0f2fe;">${teacherDataList.reduce((s, t) => s + t.hours, 0).toFixed(1)} س</td>
          <td>${teacherDataList.reduce((s, t) => s + t.earned, 0).toFixed(2)} ₪</td>
          <td style="color: #047857;">${teacherDataList.reduce((s, t) => s + t.paid, 0).toFixed(2)} ₪</td>
          <td style="color: #b91c1c;">${teacherDataList.reduce((s, t) => s + t.balance, 0).toFixed(2)} ₪</td>
          <td style="text-align: center;">-</td>
        </tr>
      </tbody>
    </table>

    <!-- SECTION 5: STUDENTS LIQUIDITY & SOLVENCY -->
    <div class="section-header">
      <h3 class="section-title">خامساً: كشف ملاءة وأرصدة محافظ الطلاب وتحليل المخاطر (Students Liquidity & Balances)</h3>
      <span class="section-badge">${studentsDataList.length} طالباً</span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 25%;">اسم الطالب</th>
          <th style="width: 16%;">رقم الهاتف</th>
          <th style="width: 14%;">إجمالي الشحن</th>
          <th style="width: 14%;">المستهلك بالحصص</th>
          <th style="width: 15%;">رصيد المحفظة الحالي</th>
          <th style="width: 16%; text-align: center;">مستوى أمان المحفظة</th>
        </tr>
      </thead>
      <tbody>
        ${studentsDataList.length === 0 ? `
          <tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 12px;">لا توجد سجلات أرصدة للطلاب</td></tr>
        ` : studentsDataList.slice(0, 30).map(st => `
          <tr>
            <td><strong>${st.name}</strong></td>
            <td style="direction: ltr; text-align: right; color: #64748b;">${st.phone}</td>
            <td style="color: #047857; font-weight: 700;">${st.totalToppedUp.toFixed(2)} ₪</td>
            <td style="color: #64748b;">${st.totalSpent.toFixed(2)} ₪</td>
            <td style="font-weight: 800; color: ${st.balance < 0 ? '#b91c1c' : st.balance <= st.threshold ? '#b45309' : '#047857'};">
              ${st.balance.toFixed(2)} ₪
            </td>
            <td style="text-align: center;">
              <span class="badge ${st.status.includes('حرج') ? 'badge-red' : st.status.includes('يقترب') ? 'badge-amber' : 'badge-green'}">
                ${st.status}
              </span>
            </td>
          </tr>
        `).join('')}
        ${studentsDataList.length > 30 ? `
          <tr><td colspan="6" style="text-align: center; font-size: 9px; color: #64748b; background: #f1f5f9;">+ تم تضمين أول 30 طالباً حسب الأولوية المالية والمخاطر من أصل ${studentsDataList.length} طالباً</td></tr>
        ` : ''}
        <tr class="total-row">
          <td colspan="2">إجمالي السيولة النقدية لمحافظ الطلاب</td>
          <td style="color: #047857;">${studentsDataList.reduce((s, st) => s + st.totalToppedUp, 0).toFixed(2)} ₪</td>
          <td>${studentsDataList.reduce((s, st) => s + st.totalSpent, 0).toFixed(2)} ₪</td>
          <td style="color: #047857;">${netStudentBalances.toFixed(2)} ₪</td>
          <td style="text-align: center;">-</td>
        </tr>
      </tbody>
    </table>

    <!-- SECTION 6: RECENT CASH FLOW OPERATIONS -->
    ${recentCashflow.length > 0 ? `
      <div class="section-header">
        <h3 class="section-title">سادساً: سجل أحدث التدفقات والعمليات النقدية (Recent Cashflow Operations)</h3>
        <span class="section-badge">آخر ${recentCashflow.length} عمليات</span>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 14%;">التاريخ</th>
            <th style="width: 24%;">نوع العملية</th>
            <th style="width: 22%;">الطرف المعني</th>
            <th style="width: 24%;">البيان والملاحظات</th>
            <th style="width: 16%;">المبلغ المحرك</th>
          </tr>
        </thead>
        <tbody>
          ${recentCashflow.map(op => `
            <tr>
              <td>${op.date}</td>
              <td>
                <span class="badge ${op.isOut ? 'badge-red' : 'badge-green'}">
                  ${op.type}
                </span>
              </td>
              <td><strong>${op.person}</strong></td>
              <td>${op.note}</td>
              <td style="font-weight: 800; color: ${op.isOut ? '#b91c1c' : '#047857'};">
                ${op.isOut ? '-' : '+'}${op.amount.toFixed(2)} ₪
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : ''}

    <!-- SECTION 7: OFFICIAL SIGNATURES -->
    <div class="signatures-block">
      <div class="sig-cell">
        <div class="sig-box">
          <div class="sig-title">إعداد وتدقيق قسم المحاسبة</div>
          <div class="sig-line">توقيع المحاسب القانوني</div>
        </div>
      </div>
      <div class="sig-cell">
        <div class="sig-box">
          <div class="sig-title">المراجعة والرقابة المالية</div>
          <div class="sig-line">توقيع المسؤول المالي المعتمد</div>
        </div>
      </div>
      <div class="sig-cell">
        <div class="sig-box">
          <div class="sig-title">اعتماد وختم إدارة المنصة</div>
          <div class="sig-line">المدير العام أ. زكي أبو علان</div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="doc-footer">
      هذا المستند تقرير رسمي صادر عن نظام أكاديمية التفوق أون لاين للخدمات التعليمية والإدارية. جميع الأرقام والبيانات مدققة ومطابقة لقيود قاعدة البيانات حتى تاريخه.
    </div>
  </div>
</body>
</html>
    `;

    printHTMLThroughIframe(html, 'التقرير_المالي_والتحليلي_الشامل_المنظم');
  };

  // Dedicated Print / PDF Exporter for Visual Charts and Graphical Analytics
  const exportVisualChartsReportToPDF = () => {
    const startStr = dashboardStartDate || 'بداية السجلات';
    const endStr = dashboardEndDate || 'تاريخ اليوم';
    const issueDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const issueTime = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const auditRef = 'CHART-PDF-' + Math.floor(100000 + Math.random() * 900000);

    const approvedSessions = filteredSessions.filter(s => s.approved !== false);

    // Key financial metrics
    const totalRev = stats.totalRevenue || 0;
    const totalTeacherCost = stats.totalCosts || 0;
    const totalOpExpense = stats.totalExpenses || 0;
    const totalCombinedCost = totalTeacherCost + totalOpExpense;
    const netProfit = stats.netProfit || (totalRev - totalCombinedCost);
    const marginPct = totalRev > 0 ? (netProfit / totalRev) * 100 : 0;
    const totalHours = stats.totalHours || 0;
    const isProfitable = netProfit >= 0;

    let viewName = 'لوحة التحليلات والمؤشرات البيانية العامة';
    if (activeTab === 'profit_comparison') viewName = 'مقارنة الأرباح والأداء المالي الشهري التراكمي';
    else if (activeTab === 'student_growth') viewName = 'تحليلات نمو الطلاب وتوزع المواد الدراسية';
    else if (activeTab === 'student_financials') viewName = 'تحليلات توزيع أرصدة الطلاب والرسوم الدراسية المحصلة';
    else if (activeTab === 'accounting') viewName = 'التدفقات المالية ومستحقات المعلمين';
    else if (activeTab === 'expenses') viewName = 'تحليلات المصروفات التشغيلية والتأسيسية';

    // 1. Try extracting active DOM SVG charts from the current screen
    let capturedChartsHtml = '';
    try {
      const surfaces = Array.from(document.querySelectorAll('svg.recharts-surface'));
      if (surfaces.length > 0) {
        const serializer = new XMLSerializer();
        const capturedBlocks: string[] = [];
        surfaces.slice(0, 3).forEach((svgEl, idx) => {
          const cloned = svgEl.cloneNode(true) as SVGSVGElement;
          cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          cloned.setAttribute('style', 'max-width: 100%; height: auto; display: block; margin: 0 auto;');
          
          // Determine parent card title if present
          const parentCard = svgEl.closest('.bg-white, .rounded-2xl, .rounded-3xl, section, [class*="card"]');
          const heading = parentCard?.querySelector('h3, h4, h2')?.textContent?.trim() || `المخطط البياني المباشر رقم (${idx + 1})`;
          
          capturedBlocks.push(`
            <div class="chart-box" style="page-break-inside: avoid; margin-bottom: 22px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 12px; padding: 14px;">
              <div style="font-size: 13px; font-weight: 800; color: #0d365a; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
                <span>📊 ${heading}</span>
                <span style="font-size: 10px; color: #64748b; font-weight: normal; background: #f8fafc; padding: 2px 8px; border-radius: 6px; border: 1px solid #e2e8f0;">مُستخرج مباشرة من شاشة النظام</span>
              </div>
              <div style="display: flex; justify-content: center; align-items: center; overflow: hidden; max-height: 300px; padding: 4px;">
                ${serializer.serializeToString(cloned)}
              </div>
            </div>
          `);
        });
        if (capturedBlocks.length > 0) {
          capturedChartsHtml = `
            <div style="margin-bottom: 25px; page-break-inside: avoid;">
              <div class="section-title">📌 المخططات البيانية التفاعلية المباشرة من شاشة المدير:</div>
              ${capturedBlocks.join('')}
            </div>
          `;
        }
      }
    } catch (e) {
      console.warn('DOM SVG capture skipped:', e);
    }

    // 2. Build High-Resolution Vector SVG Chart for Monthly Performance & Net Profit Trajectory
    const chartData = monthlyPerfChartData && monthlyPerfChartData.length > 0 ? monthlyPerfChartData : [
      { name: 'الشهر الحالي', hours: totalHours, payout: totalTeacherCost, revenue: totalRev, profit: netProfit }
    ];

    const chartW = 720;
    const chartH = 260;
    const padLeft = 65;
    const padRight = 35;
    const padTop = 35;
    const padBottom = 45;
    const plotW = chartW - padLeft - padRight;
    const plotH = chartH - padTop - padBottom;

    const allValues = chartData.flatMap(d => [d.revenue, d.payout, d.profit]);
    const maxVal = Math.max(100, ...allValues) * 1.15;
    const minVal = Math.min(0, ...allValues);
    const valRange = maxVal - minVal || 1;

    const getX = (i: number) => padLeft + (chartData.length === 1 ? plotW / 2 : (i / (chartData.length - 1)) * plotW);
    const getY = (val: number) => padTop + plotH - ((val - minVal) / valRange) * plotH;

    // Build SVG paths
    const revPoints = chartData.map((d, i) => `${getX(i)},${getY(d.revenue)}`);
    const payoutPoints = chartData.map((d, i) => `${getX(i)},${getY(d.payout)}`);
    const profitPoints = chartData.map((d, i) => `${getX(i)},${getY(d.profit)}`);

    const revPath = revPoints.length > 1 ? `M ${revPoints.join(' L ')}` : `M ${getX(0) - 20},${getY(chartData[0].revenue)} L ${getX(0) + 20},${getY(chartData[0].revenue)}`;
    const payoutPath = payoutPoints.length > 1 ? `M ${payoutPoints.join(' L ')}` : `M ${getX(0) - 20},${getY(chartData[0].payout)} L ${getX(0) + 20},${getY(chartData[0].payout)}`;
    const profitPath = profitPoints.length > 1 ? `M ${profitPoints.join(' L ')}` : `M ${getX(0) - 20},${getY(chartData[0].profit)} L ${getX(0) + 20},${getY(chartData[0].profit)}`;

    const revArea = chartData.length > 1 
      ? `M ${revPoints[0]} L ${revPoints.join(' L ')} L ${getX(chartData.length - 1)},${padTop + plotH} L ${getX(0)},${padTop + plotH} Z`
      : '';

    // Generate grid lines
    const gridSteps = 4;
    const gridLines = Array.from({ length: gridSteps + 1 }).map((_, stepIdx) => {
      const stepVal = minVal + (valRange / gridSteps) * stepIdx;
      const stepY = getY(stepVal);
      return `
        <line x1="${padLeft}" y1="${stepY}" x2="${chartW - padRight}" y2="${stepY}" stroke="#e2e8f0" stroke-width="1" stroke-dasharray="3,3" />
        <text x="${padLeft - 8}" y="${stepY + 4}" font-size="9" fill="#94a3b8" text-anchor="end" font-family="'Cairo', sans-serif">₪${Math.round(stepVal).toLocaleString()}</text>
      `;
    }).join('');

    // X-axis month markers
    const xMarkers = chartData.map((d, i) => {
      const x = getX(i);
      return `
        <line x1="${x}" y1="${padTop + plotH}" x2="${x}" y2="${padTop + plotH + 5}" stroke="#94a3b8" stroke-width="1" />
        <text x="${x}" y="${padTop + plotH + 20}" font-size="10" font-weight="700" fill="#475569" text-anchor="middle" font-family="'Cairo', sans-serif">${d.name}</text>
      `;
    }).join('');

    // Data points & markers
    const dataPointsMarkup = chartData.map((d, i) => {
      const x = getX(i);
      const yRev = getY(d.revenue);
      const yPay = getY(d.payout);
      const yProf = getY(d.profit);
      const isProf = d.profit >= 0;

      return `
        <!-- Revenue Solid Dot -->
        <circle cx="${x}" cy="${yRev}" r="4.5" fill="#D4A33C" stroke="#ffffff" stroke-width="2" />
        <text x="${x}" y="${yRev - 8}" font-size="9" font-weight="bold" fill="#B45309" text-anchor="middle" font-family="'Cairo', sans-serif">₪${Math.round(d.revenue).toLocaleString()}</text>

        <!-- Payout Hollow Dashed Dot -->
        <circle cx="${x}" cy="${yPay}" r="4" fill="#ffffff" stroke="#f43f5e" stroke-width="2" />

        <!-- Profit Diamond Dot -->
        <polygon points="${x},${yProf - 5} ${x + 5},${yProf} ${x},${yProf + 5} ${x - 5},${yProf}" fill="${isProf ? '#10B981' : '#EF4444'}" stroke="#ffffff" stroke-width="1.5" />
        <text x="${x}" y="${yProf + 16}" font-size="9.5" font-weight="800" fill="${isProf ? '#047857' : '#B91C1C'}" text-anchor="middle" font-family="'Cairo', sans-serif">₪${Math.round(d.profit).toLocaleString()}</text>
      `;
    }).join('');

    // 3. Vector SVG Bar Chart for Monthly Teaching Hours
    const barChartH = 190;
    const maxHours = Math.max(10, ...chartData.map(d => d.hours)) * 1.25;
    const barW = Math.min(42, Math.max(20, (plotW / chartData.length) * 0.45));

    const barsMarkup = chartData.map((d, i) => {
      const x = getX(i) - barW / 2;
      const bH = (d.hours / maxHours) * (barChartH - 60);
      const y = (barChartH - 30) - bH;
      return `
        <rect x="${x}" y="${y}" width="${barW}" height="${bH}" rx="6" fill="#0D365A" stroke="#1E293B" stroke-width="1" />
        <text x="${x + barW / 2}" y="${y - 6}" font-size="9.5" font-weight="800" fill="#0D365A" text-anchor="middle" font-family="'Cairo', sans-serif">${d.hours} س</text>
        <text x="${x + barW / 2}" y="${barChartH - 12}" font-size="9.5" font-weight="700" fill="#64748b" text-anchor="middle" font-family="'Cairo', sans-serif">${d.name}</text>
      `;
    }).join('');

    // Construct printable HTML template
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>تقرير التحليلات والرسوم البيانية الرسمية - ${startStr} إلى ${endStr}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    
    * {
      box-sizing: border-box;
    }
    body {
      font-family: 'Cairo', sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 30px;
      direction: rtl;
      background-color: #ffffff;
      font-size: 11px;
      line-height: 1.5;
    }
    
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    
    @media print {
      body {
        padding: 0;
        background: #ffffff !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print {
        display: none !important;
      }
      .page-break-before {
        page-break-before: always;
      }
      .chart-container, .table-box, .kpi-row {
        page-break-inside: avoid !important;
      }
    }

    .header-table {
      width: 100%;
      border-bottom: 3px double #0d365a;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 900;
      color: #0d365a;
      margin: 0;
    }
    .brand-sub {
      font-size: 11px;
      color: #d4a33c;
      font-weight: 800;
      margin: 3px 0 0 0;
    }
    .meta-table {
      font-size: 10px;
      color: #475569;
      font-weight: 700;
      text-align: left;
    }
    
    .doc-banner {
      background: linear-gradient(135deg, #0d365a 0%, #1e40af 100%);
      color: #ffffff;
      padding: 14px 20px;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 20px;
    }
    .doc-banner h1 {
      margin: 0;
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 0.5px;
    }
    .doc-banner p {
      margin: 4px 0 0 0;
      font-size: 11px;
      color: #cbd5e1;
      font-weight: 600;
    }

    .kpis-grid {
      display: table;
      width: 100%;
      table-layout: fixed;
      margin-bottom: 20px;
      border-spacing: 8px 0;
    }
    .kpi-cell {
      display: table-cell;
      vertical-align: top;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 12px;
      border-top: 4px solid #0d365a;
    }
    .kpi-card.gold { border-top-color: #d4a33c; }
    .kpi-card.green { border-top-color: #10b981; }
    .kpi-card.rose { border-top-color: #f43f5e; }
    .kpi-card.indigo { border-top-color: #6366f1; }
    .kpi-label {
      font-size: 9.5px;
      color: #64748b;
      font-weight: 800;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 14px;
      font-weight: 900;
      color: #0f172a;
    }
    .kpi-sub {
      font-size: 9px;
      color: #94a3b8;
      font-weight: 700;
      margin-top: 2px;
    }

    .legend-guide {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 8px 14px;
      margin-bottom: 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      font-size: 10px;
      font-weight: 700;
      color: #334155;
    }
    .legend-pill {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      padding: 2px 8px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .chart-container {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 22px;
      page-break-inside: avoid;
    }
    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .chart-title {
      font-size: 13px;
      font-weight: 900;
      color: #0d365a;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .chart-tag {
      font-size: 9.5px;
      background: #eff6ff;
      color: #1e40af;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 800;
      border: 1px solid #bfdbfe;
    }

    .table-box {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      font-size: 10px;
    }
    .table-box th {
      background: #0d365a;
      color: #ffffff;
      padding: 8px 10px;
      font-weight: 800;
      border: 1px solid #0d365a;
      text-align: right;
    }
    .table-box td {
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
      text-align: right;
    }
    .table-box tr:nth-child(even) {
      background: #f8fafc;
    }
    .table-box tr.total-row {
      background: #fffdf5;
      font-weight: 900;
      border-top: 2px solid #d4a33c;
    }

    .proportions-bar {
      display: flex;
      width: 100%;
      height: 24px;
      border-radius: 8px;
      overflow: hidden;
      margin: 10px 0;
      border: 1px solid #cbd5e1;
    }

    .signatures-grid {
      display: table;
      width: 100%;
      table-layout: fixed;
      margin-top: 30px;
      page-break-inside: avoid;
    }
    .sig-cell {
      display: table-cell;
      text-align: center;
      padding: 0 15px;
    }
    .sig-line {
      border-top: 1px dashed #94a3b8;
      padding-top: 8px;
      font-size: 10px;
      font-weight: 800;
      color: #334155;
    }
    
    .doc-footer {
      margin-top: 25px;
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
  <!-- Official Header -->
  <table class="header-table">
    <tr>
      <td style="width: 55%; vertical-align: middle;">
        <div class="brand-title">أكاديمية التفوق أون لاين</div>
        <div class="brand-sub">نظام الإدارة الأكاديمية والتحليل المالي المتقدم (أبو علان سنتر)</div>
      </td>
      <td style="width: 45%; vertical-align: middle; text-align: left;">
        <div class="meta-table">
          <div><strong>المرجع الإداري:</strong> ${auditRef}</div>
          <div><strong>تاريخ الإصدار:</strong> ${issueDate} - ${issueTime}</div>
          <div><strong>فترة التقرير:</strong> ${startStr} إلى ${endStr} (${activePeriodLabel})</div>
          ${selectedSubjectFilter !== 'all' ? `<div><strong>الموضوع الدراسي المعتمد:</strong> ${selectedSubjectFilter}</div>` : ''}
          <div><strong>المدير المعتمد:</strong> أ. زكي أبو علان</div>
        </div>
      </td>
    </tr>
  </table>

  <!-- Document Banner -->
  <div class="doc-banner">
    <h1>📊 التقرير البياني الرسمي لتحليلات ومؤشرات الأداء المالي والأكاديمي</h1>
    <p>تقرير إحصائي بياني يتضمن تطور الإيرادات والتكاليف، صافي الأرباح المحققة، وساعات التدريس (${viewName})${selectedSubjectFilter !== 'all' ? ` - تصفية المادة: ${selectedSubjectFilter}` : ''}</p>
  </div>

  <!-- Key Metrics Cards -->
  <div class="kpis-grid">
    <div class="kpi-cell">
      <div class="kpi-card gold">
        <div class="kpi-label">أقساط الطلاب (الإيرادات)</div>
        <div class="kpi-value">₪${totalRev.toLocaleString()}</div>
        <div class="kpi-sub">${approvedSessions.length} حصة معتمدة</div>
      </div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-card rose">
        <div class="kpi-label">أجور المعلمين المستحقة</div>
        <div class="kpi-value">₪${totalTeacherCost.toLocaleString()}</div>
        <div class="kpi-sub">${((totalTeacherCost / (totalRev || 1)) * 100).toFixed(1)}% من الإيرادات</div>
      </div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-card indigo">
        <div class="kpi-label">المصروفات التشغيلية</div>
        <div class="kpi-value">₪${totalOpExpense.toLocaleString()}</div>
        <div class="kpi-sub">${((totalOpExpense / (totalRev || 1)) * 100).toFixed(1)}% من الإيرادات</div>
      </div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-card ${isProfitable ? 'green' : 'rose'}">
        <div class="kpi-label">صافي ربح المنصة التشغيلي</div>
        <div class="kpi-value" style="color: ${isProfitable ? '#047857' : '#b91c1c'};">₪${netProfit.toLocaleString()}</div>
        <div class="kpi-sub">${isProfitable ? 'نمو محقق 🟢' : 'تراجع 🔴'} (${marginPct.toFixed(1)}%)</div>
      </div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-card">
        <div class="kpi-label">إجمالي ساعات التدريس</div>
        <div class="kpi-value">${totalHours.toFixed(1)} س</div>
        <div class="kpi-sub">${teachers.length} معلمين | ${students.length} طلاب</div>
      </div>
    </div>
  </div>

  <!-- Accessible Patterns Legend Guide -->
  <div class="legend-guide">
    <div>
      <span style="color: #0d365a; font-weight: 800;">👁️ دليل أنماط التمييز (سهولة القراءة بالطباعة بالأبيض والأسود أو لعمى الألوان):</span>
    </div>
    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
      <span class="legend-pill">
        <span style="font-family: monospace; font-weight: 900; color: #d4a33c;">─── ●</span>
        <span>خط متصل بنقاط مصمتة (الإيرادات/أقساط الطلاب)</span>
      </span>
      <span class="legend-pill">
        <span style="font-family: monospace; font-weight: 900; color: #f43f5e;">╌╌╌ ○</span>
        <span>خط متقطع بنقاط مجوفة (أجور المعلمين والتكاليف)</span>
      </span>
      <span class="legend-pill">
        <span style="font-family: monospace; font-weight: 900; color: #10b981;">┈┈┈ ◆</span>
        <span>خط منقط بنقاط مميزة (صافي أرباح المركز)</span>
      </span>
    </div>
  </div>

  <!-- Section 1: Vector SVG Chart of Revenue, Costs & Net Profit Curve -->
  <div class="chart-container">
    <div class="chart-header">
      <div class="chart-title">
        <span>📈 المخطط البياني لتطور الإيرادات والمستحقات وصافي الأرباح الشهرية</span>
      </div>
      <div class="chart-tag">مخطط متجهي عالي الدقة (Vector SVG)</div>
    </div>

    <div style="display: flex; justify-content: center; width: 100%;">
      <svg width="100%" height="260" viewBox="0 0 ${chartW} ${chartH}" xmlns="http://www.w3.org/2000/svg" style="max-width: 720px; font-family: 'Cairo', sans-serif;">
        <defs>
          <linearGradient id="pdfRevGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#D4A33C" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#D4A33C" stop-opacity="0.02"/>
          </linearGradient>
        </defs>
        
        <!-- Grid lines -->
        ${gridLines}

        <!-- Revenue shaded area -->
        ${revArea ? `<path d="${revArea}" fill="url(#pdfRevGrad)" />` : ''}

        <!-- Payout Line (Dashed 6,4) -->
        <path d="${payoutPath}" fill="none" stroke="#f43f5e" stroke-width="2.5" stroke-dasharray="6,4" />

        <!-- Revenue Line (Solid) -->
        <path d="${revPath}" fill="none" stroke="#D4A33C" stroke-width="3" />

        <!-- Profit Line (Dotted 2,3) -->
        <path d="${profitPath}" fill="none" stroke="${isProfitable ? '#10B981' : '#EF4444'}" stroke-width="3" stroke-dasharray="2,3" />

        <!-- X Markers -->
        ${xMarkers}

        <!-- Data points & values -->
        ${dataPointsMarkup}
      </svg>
    </div>
  </div>

  <!-- Section 2: Vector SVG Bar Chart for Monthly Teaching Hours -->
  <div class="chart-container">
    <div class="chart-header">
      <div class="chart-title">
        <span>⏱️ توزيع ساعات التدريس والنشاط الأكاديمي عبر الأشهر (ساعات)</span>
      </div>
      <div class="chart-tag">معدل الإنجاز التدريسي</div>
    </div>

    <div style="display: flex; justify-content: center; width: 100%;">
      <svg width="100%" height="190" viewBox="0 0 ${chartW} ${barChartH}" xmlns="http://www.w3.org/2000/svg" style="max-width: 720px; font-family: 'Cairo', sans-serif;">
        <!-- Base line -->
        <line x1="${padLeft}" y1="${barChartH - 30}" x2="${chartW - padRight}" y2="${barChartH - 30}" stroke="#cbd5e1" stroke-width="1.5" />
        <!-- Bars -->
        ${barsMarkup}
      </svg>
    </div>
  </div>

  <!-- Section 3: Captured Active Screen Charts (if detected) -->
  ${capturedChartsHtml}

  <!-- Section 4: Comprehensive Monthly Statistics Table -->
  <div class="chart-container">
    <div class="chart-header">
      <div class="chart-title">
        <span>📑 جدول البيانات الإحصائية والمالية التفصيلية</span>
      </div>
      <div class="chart-tag">جدول التدقيق الرقمي</div>
    </div>

    <table class="table-box">
      <thead>
        <tr>
          <th>الشهر / الفترة</th>
          <th>ساعات التدريس</th>
          <th>أقساط الطلاب (الإيرادات)</th>
          <th>أجور المعلمين</th>
          <th>المصروفات التشغيلية</th>
          <th>صافي ربح المركز</th>
          <th>هامش الربحية</th>
          <th>حالة النمو</th>
        </tr>
      </thead>
      <tbody>
        ${chartData.map(item => {
          const itemRev = item.revenue;
          const itemPay = item.payout;
          const itemProf = item.profit;
          const itemExp = itemRev - itemPay - itemProf > 0 ? (itemRev - itemPay - itemProf) : 0;
          const mPct = itemRev > 0 ? (itemProf / itemRev) * 100 : 0;
          const isGrow = itemProf >= 0;

          return `
            <tr>
              <td><strong>${item.name}</strong></td>
              <td>${item.hours.toFixed(1)} س</td>
              <td style="color: #92400e; font-weight: 700;">₪${itemRev.toLocaleString()}</td>
              <td style="color: #be123c; font-weight: 700;">₪${itemPay.toLocaleString()}</td>
              <td>₪${Math.round(itemExp).toLocaleString()}</td>
              <td style="font-weight: 800; color: ${isGrow ? '#047857' : '#b91c1c'};">₪${itemProf.toLocaleString()}</td>
              <td>${mPct.toFixed(1)}%</td>
              <td>
                <span style="font-weight: 800; color: ${isGrow ? '#047857' : '#b91c1c'};">
                  ${isGrow ? 'نمو 🟢' : 'انخفاض 🔴'}
                </span>
              </td>
            </tr>
          `;
        }).join('')}
        <tr class="total-row">
          <td>المجموع الإجمالي / المعدل</td>
          <td>${totalHours.toFixed(1)} ساعة</td>
          <td style="color: #92400e;">₪${totalRev.toLocaleString()}</td>
          <td style="color: #be123c;">₪${totalTeacherCost.toLocaleString()}</td>
          <td>₪${totalOpExpense.toLocaleString()}</td>
          <td style="color: ${isProfitable ? '#047857' : '#b91c1c'};">₪${netProfit.toLocaleString()}</td>
          <td>${marginPct.toFixed(1)}%</td>
          <td>${isProfitable ? 'فائض تشغيلي 🟢' : 'عجز تشغيلي 🔴'}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Signatures -->
  <div class="signatures-grid">
    <div class="sig-cell">
      <div class="sig-line">إعداد وحدة التحليل والتقارير البيانية</div>
    </div>
    <div class="sig-cell">
      <div class="sig-line">تدقيق ومراجعة الحسابات الإدارية</div>
    </div>
    <div class="sig-cell">
      <div class="sig-line">اعتماد وختم مدير الأكاديمية: أ. زكي أبو علان</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="doc-footer">
    تم استخراج هذا التقرير البياني الرسمي إلكترونياً من منصة أكاديمية التفوق أون لاين للخدمات التعليمية والإدارية. جميع البيانات مستندة إلى القيود الأكاديمية والمالية المعتمدة حتى تاريخه.
  </div>
</body>
</html>
    `;

    printHTMLThroughIframe(html, `تقرير_المخططات_البيانية_${startStr}_إلى_${endStr}`);
  };
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleStudentId) {
      alert('الرجاء اختيار الطالب أولاً لتفعيل الجدولة.');
      return;
    }
    const student = students.find(s => s.id === scheduleStudentId);
    if (!student) return;

    const path = 'scheduledReports';
    try {
      if (editingSchedule) {
        const docRef = doc(db, path, editingSchedule.id);
        const updateData = {
          studentId: scheduleStudentId,
          studentName: student.name,
          academicProgress: scheduleAcademicProgress,
          notes: scheduleNotes,
          status: scheduleStatus,
          updatedAt: new Date().toISOString()
        };
        await updateDoc(docRef, updateData);
        setScheduledReports(prev => prev.map(r => r.id === editingSchedule.id ? { ...r, ...updateData } : r));
      } else {
        // Prevent duplicate schedules for the same student
        const exists = scheduledReports.some(r => r.studentId === scheduleStudentId);
        if (exists) {
          alert('هذا الطالب لديه جدول تقارير دوري نشط بالفعل. يمكنك تعديله من قائمة الجدولة أدناه.');
          return;
        }

        const newData = {
          studentId: scheduleStudentId,
          studentName: student.name,
          academicProgress: scheduleAcademicProgress,
          notes: scheduleNotes,
          frequency: 'monthly',
          status: scheduleStatus,
          lastGenerated: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, path), newData);
        setScheduledReports(prev => [...prev, { id: docRef.id, ...newData }]);
      }

      // Log activity
      try {
        const { logActivity } = await import('../lib/activityLogger');
        await logActivity({
          actionType: editingSchedule ? 'EDIT_SCHEDULE' : 'ADD_SCHEDULE',
          actionName: editingSchedule ? 'تعديل جدولة تقرير دوري' : 'جدولة تقرير دوري لطالب',
          actor: `${currentUserName} (${currentUserRole === 'manager' ? 'مدير' : 'معلم'})`,
          details: editingSchedule 
            ? `تم تعديل معطيات وتفاصيل جدولة التقارير الدورية الخاصة بالطالب "${student.name}"`
            : `تم تفعيل جدولة تقارير أداء دورية (شهرياً) بنجاح للطالب "${student.name}"`
        });
      } catch (e) {
        console.error("Activity logging failed", e);
      }

      setIsSchedulingModalOpen(false);
      setEditingSchedule(null);
      setScheduleStudentId('');
      setScheduleAcademicProgress('تقدم أكاديمي ممتاز ومستمر في جميع المواضيع التدريسية، مع تطور لافت في الفهم وحل التدريبات.');
      setScheduleNotes('يرجى الاستمرار في المتابعة المنزلية لضمان المحافظة على هذا المستوى المتميز.');
      setScheduleStatus('active');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Open the modal to edit a schedule
  const handleOpenEditSchedule = (schedule: any) => {
    setEditingSchedule(schedule);
    setScheduleStudentId(schedule.studentId);
    setScheduleAcademicProgress(schedule.academicProgress);
    setScheduleNotes(schedule.notes || '');
    setScheduleStatus(schedule.status);
    setIsSchedulingModalOpen(true);
  };

  // Toggle active/inactive status
  const handleToggleScheduleStatus = async (schedule: any) => {
    const path = 'scheduledReports';
    const newStatus = schedule.status === 'active' ? 'inactive' : 'active';
    try {
      const docRef = doc(db, path, schedule.id);
      await updateDoc(docRef, { status: newStatus, updatedAt: new Date().toISOString() });
      setScheduledReports(prev => prev.map(r => r.id === schedule.id ? { ...r, status: newStatus } : r));

      // Log activity
      try {
        const { logActivity } = await import('../lib/activityLogger');
        await logActivity({
          actionType: 'TOGGLE_SCHEDULE',
          actionName: 'تعديل حالة جدولة التقارير',
          actor: `${currentUserName} (${currentUserRole === 'manager' ? 'مدير' : 'معلم'})`,
          details: `تم تغيير حالة جدولة التقارير الدورية للطالب "${schedule.studentName}" إلى ${newStatus === 'active' ? 'نشط' : 'معطل'}`
        });
      } catch (e) {
        console.error("Activity logging failed", e);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  // Delete a schedule
  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف جدولة التقارير الدورية لهذا الطالب؟')) return;
    const path = 'scheduledReports';
    const schedule = scheduledReports.find(r => r.id === scheduleId);
    try {
      await deleteDoc(doc(db, path, scheduleId));
      setScheduledReports(prev => prev.filter(r => r.id !== scheduleId));

      // Log activity
      if (schedule) {
        try {
          const { logActivity } = await import('../lib/activityLogger');
          await logActivity({
            actionType: 'DELETE_SCHEDULE',
            actionName: 'إلغاء جدولة تقرير دوري',
            actor: `${currentUserName} (${currentUserRole === 'manager' ? 'مدير' : 'معلم'})`,
            details: `تم حذف وإلغاء جدولة التقارير الدورية للطالب "${schedule.studentName}"`
          });
        } catch (e) {
          console.error("Activity logging failed", e);
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Generate the actual monthly PDF report for a scheduled student
  const handleGenerateScheduledReport = async (schedule: any, year: number, month: number) => {
    setIsGeneratingReport(schedule.studentId);
    try {
      const student = students.find(s => s.id === schedule.studentId);
      if (!student) {
        alert('تعذر العثور على بيانات الطالب.');
        return;
      }

      // Filter sessions for this student in the chosen year/month
      const approvedSessions = sessions.filter(s => s.approved !== false && s.studentId === student.id);
      const targetSessions = approvedSessions.filter(s => {
        if (!s.date) return false;
        const parts = s.date.split('-');
        if (parts.length < 2) return false;
        return parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month;
      });

      // Group Sessions by subject for stats
      const subjectStats: Record<string, { sessions: number, hours: number }> = {};
      targetSessions.forEach(s => {
        const subj = s.subject || 'مواضيع عامة';
        if (!subjectStats[subj]) {
          subjectStats[subj] = { sessions: 0, hours: 0 };
        }
        subjectStats[subj].sessions += 1;
        subjectStats[subj].hours += s.durationHours;
      });

      const totalSessionsCount = targetSessions.length;
      const totalHoursCount = targetSessions.reduce((sum, s) => sum + s.durationHours, 0);

      // Financial Calculation
      // 1. Session cost in this month
      const totalSpentThisMonth = targetSessions.reduce((sum, s) => {
        if (s.customFee !== undefined) return sum + s.customFee;
        const teacher = teachers.find(t => t.id === s.teacherId);
        const rate = getStudentDefaultHourlyRate(student, globalSettings, teacher);
        return sum + (s.durationHours * rate);
      }, 0);

      // 2. Credits (Topped up) this month
      const studentCredits = credits.filter(c => c.studentId === student.id);
      const creditsThisMonth = studentCredits.filter(c => {
        const cDate = c.date || (c.createdAt ? c.createdAt.split('T')[0] : '');
        if (!cDate) return false;
        const parts = cDate.split('-');
        if (parts.length < 2) return false;
        return parseInt(parts[0], 10) === year && parseInt(parts[1], 10) === month;
      });
      const totalCreditsThisMonth = creditsThisMonth.reduce((sum, c) => sum + c.amount, 0);

      // 3. Lifetime values & current actual balance
      const totalSpentLifetime = approvedSessions.reduce((sum, s) => {
        if (s.customFee !== undefined) return sum + s.customFee;
        const teacher = teachers.find(t => t.id === s.teacherId);
        const rate = getStudentDefaultHourlyRate(student, globalSettings, teacher);
        return sum + (s.durationHours * rate);
      }, 0);
      const totalToppedUpLifetime = studentCredits.reduce((sum, c) => sum + c.amount, 0);
      const currentBalance = totalToppedUpLifetime - totalSpentLifetime;

      const arabicMonths = [
        'يناير (كانون الثاني)', 'فبراير (شباط)', 'مارس (آذار)', 'أبريل (نيسان)', 'مايو (أيار)', 'يونيو (حزيران)',
        'يوليو (تموز)', 'أغسطس (آب)', 'سبتمبر (أيلول)', 'أكتوبر (تشرين الأول)', 'نوفمبر (تشرين الثاني)', 'ديسمبر (كانون الأول)'
      ];
      const monthLabel = arabicMonths[month - 1];

      // Build subject distribution HTML
      let subjectStatsHTML = '';
      if (Object.keys(subjectStats).length > 0) {
        subjectStatsHTML = `
          <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; margin-bottom: 20px;">
            ${Object.entries(subjectStats).map(([subj, data]) => `
              <div class="stat-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                <div class="stat-title" style="font-size: 10px; font-weight: 800; color: #64748b; margin-bottom: 5px;">${subj}</div>
                <div class="stat-value" style="font-size: 20px; font-weight: 900; color: #0f172a;">${data.hours.toFixed(1)} <span class="stat-unit" style="font-size: 11px; color: #64748b;">ساعة</span></div>
                <div class="stat-sub" style="font-size: 10px; color: #94a3b8; margin-top: 5px; font-weight: 700;">${data.sessions} حصص منجزة</div>
              </div>
            `).join('')}
          </div>
        `;
      } else {
        subjectStatsHTML = `<p class="no-data" style="text-align: center; color: #64748b; font-size: 12px; font-weight: 700; padding: 20px; margin: 0;">لا توجد حصص مسجلة لهذا الطالب خلال هذا الشهر.</p>`;
      }

      // Build session list HTML
      let sessionRowsHTML = '';
      if (targetSessions.length > 0) {
        sessionRowsHTML = targetSessions.map((s, idx) => {
          const teacherObj = teachers.find(t => t.id === s.teacherId);
          const teacherName = teacherObj?.name || 'مدرس مجهول';
          const formattedDate = s.date ? formatCustomDate(s.date) : 'غير محدد';
          return `
            <tr>
              <td style="font-size: 11.5px; font-weight: 700; padding: 10px 12px; border: 1px solid #e2e8f0; color: #334155;">${idx + 1}</td>
              <td style="font-size: 11.5px; font-weight: 700; padding: 10px 12px; border: 1px solid #e2e8f0; color: #334155;">${formattedDate}</td>
              <td style="font-size: 11.5px; font-weight: 700; padding: 10px 12px; border: 1px solid #e2e8f0; color: #334155;">${s.subject || 'موضوع عام'}</td>
              <td style="font-size: 11.5px; font-weight: 700; padding: 10px 12px; border: 1px solid #e2e8f0; color: #334155;">${teacherName}</td>
              <td style="font-size: 11.5px; font-weight: 700; padding: 10px 12px; border: 1px solid #e2e8f0; color: #334155;">${s.durationHours} ساعة</td>
              <td style="font-size: 11.5px; font-weight: 700; padding: 10px 12px; border: 1px solid #e2e8f0; color: #334155;">${s.topic || s.notes || 'لقاء دراسي اعتيادي'}</td>
            </tr>
          `;
        }).join('');
      } else {
        sessionRowsHTML = `<tr><td colspan="6" class="no-data" style="text-align: center; color: #64748b; font-size: 12px; font-weight: 700; padding: 20px; margin: 0;">لا توجد حصص مفصلة مسجلة في هذه الفترة</td></tr>`;
      }

      const balanceStatusColor = currentBalance >= 0 ? '#10B981' : '#EF4444';
      const balanceStatusBg = currentBalance >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
      const balanceText = currentBalance >= 0 ? 'رصيد كافٍ ومستقر (دائن)' : 'مستحق الدفع (ذمم معلقة)';

      const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 40px;
      color: #1e293b;
      background-color: #ffffff;
      line-height: 1.6;
      direction: rtl;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #0d365a;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header-logo {
      text-align: right;
    }
    .header-logo h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 900;
      color: #0d365a;
    }
    .header-logo p {
      margin: 5px 0 0 0;
      font-size: 11px;
      color: #64748b;
      font-weight: 700;
    }
    .report-title {
      text-align: left;
    }
    .report-title h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 800;
      color: #d4a33c;
    }
    .report-title p {
      margin: 5px 0 0 0;
      font-size: 12px;
      color: #475569;
      font-weight: 700;
    }
    .student-info {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 30px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    .info-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .info-label {
      font-size: 11px;
      color: #64748b;
      font-weight: 800;
      width: 130px;
    }
    .info-value {
      font-size: 13px;
      color: #0f172a;
      font-weight: 700;
    }
    .section-title {
      font-size: 15px;
      font-weight: 900;
      color: #0d365a;
      border-right: 4px solid #d4a33c;
      padding-right: 10px;
      margin-bottom: 20px;
      margin-top: 30px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 15px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .stat-title {
      font-size: 10px;
      font-weight: 800;
      color: #64748b;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
    }
    .stat-unit {
      font-size: 11px;
      color: #64748b;
    }
    .stat-sub {
      font-size: 10px;
      color: #94a3b8;
      margin-top: 5px;
      font-weight: 700;
    }
    .progress-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 25px;
    }
    .progress-text {
      font-size: 12.5px;
      color: #14532d;
      font-weight: 700;
      margin: 0;
      white-space: pre-wrap;
    }
    .financial-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 20px;
    }
    .financial-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 15px;
      text-align: center;
    }
    .financial-card.balance {
      background: ${balanceStatusBg};
      border-color: ${balanceStatusColor};
      color: ${balanceStatusColor};
    }
    .table-container {
      width: 100%;
      overflow-x: auto;
      margin-bottom: 25px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: right;
    }
    th {
      background-color: #0d365a;
      color: #ffffff;
      font-size: 11px;
      font-weight: 900;
      padding: 12px;
      border: 1px solid #e2e8f0;
    }
    td {
      font-size: 11.5px;
      font-weight: 700;
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      color: #334155;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .no-data {
      text-align: center;
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      padding: 20px;
      margin: 0;
    }
    .signatures {
      margin-top: 50px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 30px;
      text-align: center;
    }
    .sig-col {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    .sig-line {
      border-top: 1px solid #cbd5e1;
      width: 180px;
      margin-top: 40px;
      padding-top: 8px;
      font-size: 11px;
      color: #64748b;
      font-weight: 800;
    }
  </style>
  <title>تقرير الأداء الدوري للطلب - ${student.name}</title>
</head>
<body>
  <div class="header">
    <div class="header-logo">
      <h1>أكاديمية التفوق الأكاديمي الرسمية</h1>
      <p>تنمية المهارات، صناعة قادة المستقبل، والتميز التعليمي</p>
    </div>
    <div class="report-title">
      <h2>تقرير الأداء الأكاديمي والمالي الدوري</h2>
      <p>عن شهر: ${monthLabel} ${year}</p>
    </div>
  </div>

  <div class="student-info" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 30px;">
    <div class="info-item" style="display: flex; align-items: center; gap: 10px;">
      <span class="info-label" style="font-size: 11px; color: #64748b; font-weight: 800; width: 130px;">اسم الطالب:</span>
      <span class="info-value" style="font-size: 13px; color: #0f172a; font-weight: 700;">${student.name}</span>
    </div>
    <div class="info-item" style="display: flex; align-items: center; gap: 10px;">
      <span class="info-label" style="font-size: 11px; color: #64748b; font-weight: 800; width: 130px;">المرحلة / الصف:</span>
      <span class="info-value" style="font-size: 13px; color: #0f172a; font-weight: 700;">${student.grade || student.academicLevel || 'غير محدد'}</span>
    </div>
    <div class="info-item" style="display: flex; align-items: center; gap: 10px;">
      <span class="info-label" style="font-size: 11px; color: #64748b; font-weight: 800; width: 130px;">تاريخ إصدار التقرير:</span>
      <span class="info-value" style="font-size: 13px; color: #0f172a; font-weight: 700;">${new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
    </div>
    <div class="info-item" style="display: flex; align-items: center; gap: 10px;">
      <span class="info-label" style="font-size: 11px; color: #64748b; font-weight: 800; width: 130px;">دورية التقرير:</span>
      <span class="info-value" style="font-size: 13px; color: #0f172a; font-weight: 700;">شهرياً (Periodic Monthly)</span>
    </div>
  </div>

  <div class="section-title" style="font-size: 15px; font-weight: 900; color: #0d365a; border-right: 4px solid #d4a33c; padding-right: 10px; margin-bottom: 20px; margin-top: 30px;">أولاً: ملخص الساعات والحصص المنجزة</div>
  <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px; margin-bottom: 20px;">
    <div class="stat-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
      <div class="stat-title" style="font-size: 10px; font-weight: 800; color: #64748b; margin-bottom: 5px;">إجمالي الحصص المنجزة</div>
      <div class="stat-value" style="font-size: 20px; font-weight: 900; color: #0f172a;">${totalSessionsCount} <span class="stat-unit" style="font-size: 11px; color: #64748b;">لقاءات</span></div>
      <div class="stat-sub" style="font-size: 10px; color: #94a3b8; margin-top: 5px; font-weight: 700;">خلال الشهر المحدد</div>
    </div>
    <div class="stat-card" style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
      <div class="stat-title" style="font-size: 10px; font-weight: 800; color: #64748b; margin-bottom: 5px;">إجمالي الساعات الدراسية</div>
      <div class="stat-value" style="font-size: 20px; font-weight: 900; color: #0f172a;">${totalHoursCount.toFixed(1)} <span class="stat-unit" style="font-size: 11px; color: #64748b;">ساعة</span></div>
      <div class="stat-sub" style="font-size: 10px; color: #94a3b8; margin-top: 5px; font-weight: 700;">ساعات فعلية متلقاة</div>
    </div>
  </div>

  <h4 style="font-size: 12px; margin-top: 15px; font-weight: 800; color: #475569;">توزيع ساعات التعلم على المواد التدريسية:</h4>
  ${subjectStatsHTML}

  <div class="section-title" style="font-size: 15px; font-weight: 900; color: #0d365a; border-right: 4px solid #d4a33c; padding-right: 10px; margin-bottom: 20px; margin-top: 30px;">ثانياً: التقييم والتطور الأكاديمي</div>
  <div class="progress-box" style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
    <p class="progress-text" style="font-size: 12.5px; color: #14532d; font-weight: 700; margin: 0; white-space: pre-wrap;">${academicProgress}</p>
  </div>
  
  ${notes ? `
  <div class="section-title" style="font-size: 15px; font-weight: 900; color: #0d365a; border-right: 4px solid #d4a33c; padding-right: 10px; margin-bottom: 20px; margin-top: 30px;">توجيهات وملاحظات إضافية</div>
  <div class="progress-box" style="background-color: #f8fafc; border-color: #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
    <p class="progress-text" style="font-size: 12.5px; color: #475569; font-weight: 700; margin: 0; white-space: pre-wrap;">${notes}</p>
  </div>
  ` : ''}

  <div class="section-title" style="font-size: 15px; font-weight: 900; color: #0d365a; border-right: 4px solid #d4a33c; padding-right: 10px; margin-bottom: 20px; margin-top: 30px;">ثالثاً: الوضع والتقرير المالي الجاري</div>
  <div class="financial-summary" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
    <div class="financial-card" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; text-align: center;">
      <div class="stat-title" style="font-size: 10px; font-weight: 800; color: #64748b; margin-bottom: 5px;">تكلفة حصص هذا الشهر</div>
      <div class="stat-value" style="font-size: 20px; font-weight: 900; color: #0d365a;">${totalSpentThisMonth.toFixed(1)} ₪</div>
      <div class="stat-sub" style="font-size: 10px; color: #94a3b8; margin-top: 5px; font-weight: 700;">حسب ساعات المواد المنجزة</div>
    </div>
    <div class="financial-card" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; text-align: center;">
      <div class="stat-title" style="font-size: 10px; font-weight: 800; color: #64748b; margin-bottom: 5px;">مدفوعات شحن الرصيد المالي</div>
      <div class="stat-value" style="font-size: 20px; font-weight: 900; color: #10b981;">${totalCreditsThisMonth.toFixed(1)} ₪</div>
      <div class="stat-sub" style="font-size: 10px; color: #94a3b8; margin-top: 5px; font-weight: 700;">المسددة خلال هذا الشهر</div>
    </div>
    <div class="financial-card balance" style="background: ${balanceStatusBg}; border-color: ${balanceStatusColor}; color: ${balanceStatusColor}; border-radius: 12px; padding: 15px; text-align: center;">
      <div class="stat-title" style="font-size: 10px; font-weight: 800; color: inherit; margin-bottom: 5px;">الرصيد المتبقي بمحفظة الطالب الكلية</div>
      <div class="stat-value" style="font-size: 20px; font-weight: 900; color: inherit;">${currentBalance.toFixed(1)} ₪</div>
      <div class="stat-sub" style="font-size: 10px; color: inherit; font-weight:800; margin-top: 5px;">حالة المحفظة: ${balanceText}</div>
    </div>
  </div>

  <div class="section-title" style="font-size: 15px; font-weight: 900; color: #0d365a; border-right: 4px solid #d4a33c; padding-right: 10px; margin-bottom: 20px; margin-top: 30px;">رابعاً: سجل الحصص واللقاءات بالتفصيل خلال الشهر</div>
  <div class="table-container" style="width: 100%; overflow-x: auto; margin-bottom: 25px;">
    <table style="width: 100%; border-collapse: collapse; text-align: right;">
      <thead>
        <tr>
          <th style="background-color: #0d365a; color: #ffffff; font-size: 11px; font-weight: 900; padding: 12px; border: 1px solid #e2e8f0; width: 5%">#</th>
          <th style="background-color: #0d365a; color: #ffffff; font-size: 11px; font-weight: 900; padding: 12px; border: 1px solid #e2e8f0; width: 15%">تاريخ الحصة</th>
          <th style="background-color: #0d365a; color: #ffffff; font-size: 11px; font-weight: 900; padding: 12px; border: 1px solid #e2e8f0; width: 15%">المادة</th>
          <th style="background-color: #0d365a; color: #ffffff; font-size: 11px; font-weight: 900; padding: 12px; border: 1px solid #e2e8f0; width: 20%">الأستاذ</th>
          <th style="background-color: #0d365a; color: #ffffff; font-size: 11px; font-weight: 900; padding: 12px; border: 1px solid #e2e8f0; width: 15%">مدة اللقاء</th>
          <th style="background-color: #0d365a; color: #ffffff; font-size: 11px; font-weight: 900; padding: 12px; border: 1px solid #e2e8f0; width: 30%">موضوع اللقاء / التقدم</th>
        </tr>
      </thead>
      <tbody>
        ${sessionRowsHTML}
      </tbody>
      ${totalSessionsCount > 0 ? `
      <tfoot>
        <tr style="background: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1;">
          <td colspan="4" style="text-align: right; font-weight: 800; padding: 10px; font-size: 12px;">مجموع الساعات الكلي لجميع الحصص المسجلة (${totalSessionsCount} حصة):</td>
          <td style="font-weight: 900; color: #1d4ed8; padding: 10px; font-size: 13px; text-align: center; background: #e0f2fe;">${totalHoursCount.toFixed(1)} ساعة</td>
          <td style="font-size: 11px; color: #64748b; padding: 10px; text-align: center;">معتمد ومطابق</td>
        </tr>
      </tfoot>
      ` : ''}
    </table>
  </div>

  <div class="signatures" style="margin-top: 50px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 30px; text-align: center;">
    <div class="sig-col" style="display: flex; flex-direction: column; align-items: center;">
      <div class="sig-line" style="border-top: 1px solid #cbd5e1; width: 180px; margin-top: 40px; padding-top: 8px; font-size: 11px; color: #64748b; font-weight: 800;">توقيع منسق التقارير والقبول</div>
    </div>
    <div class="sig-col" style="display: flex; flex-direction: column; align-items: center;">
      <div class="sig-line" style="border-top: 1px solid #cbd5e1; width: 180px; margin-top: 40px; padding-top: 8px; font-size: 11px; color: #64748b; font-weight: 800;">خاتم وتوقيع المدير العام للتعليم والأكاديمية</div>
    </div>
  </div>
</body>
</html>
      `;

      // Update last generated field in firestore
      const docRef = doc(db, 'scheduledReports', schedule.id);
      const nowIso = new Date().toISOString();
      await updateDoc(docRef, { lastGenerated: nowIso, updatedAt: nowIso });
      setScheduledReports(prev => prev.map(r => r.id === schedule.id ? { ...r, lastGenerated: nowIso, updatedAt: nowIso } : r));

      // Log activity
      try {
        const { logActivity } = await import('../lib/activityLogger');
        await logActivity({
          actionType: 'GENERATE_SCHEDULED_REPORT',
          actionName: 'تصدير تقرير أداء دوري (PDF)',
          actor: `${currentUserName} (${currentUserRole === 'manager' ? 'مدير' : 'معلم'})`,
          details: `تم بنجاح توليد وتنزيل تقرير الأداء الدوري المجدول للطالب "${student.name}" عن شهر: ${monthLabel} ${year}`
        });
      } catch (e) {
        console.error("Activity logging failed", e);
      }

      printHTMLThroughIframe(html, `تقرير_أداء_${student.name}_شهر_${month}_${year}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'scheduledReports');
    } finally {
      setIsGeneratingReport(null);
    }
  };

  const exportMonthlyReportToPDF = async (downloadDirectly: boolean = false) => {
    const year = monSelectedYear;
    const month = monSelectedMonth;
    const arabicMonths = [
      'يناير (كانون الثاني)', 'فبراير (شباط)', 'مارس (آذار)', 'أبريل (نيسان)', 'مايو (أيار)', 'يونيو (حزيران)',
      'يوليو (تموز)', 'أغسطس (آب)', 'سبتمبر (أيلول)', 'أكتوبر (تشرين الأول)', 'نوفمبر (تشرين الثاني)', 'ديسمبر (كانون الأول)'
    ];
    const monthLabel = arabicMonths[month - 1];

    setIsGeneratingMonthlyPdf(true);
    try {
      if (monReportType === 'student') {
        if (monSelectedStudentId) {
          const student = students.find(s => s.id === monSelectedStudentId);
          if (student) {
            const startBalance = getStudentStartBalance(student.id, year, month);
      
      const currentMonthCredits = (credits || []).filter(c => {
        if (c.studentId !== student.id || !c.date) return false;
        const pd = safeParseDate(c.date);
        if (!pd) return false;
        return pd.year === year && pd.month === month;
      }).sort((a, b) => {
        const da = safeParseDate(a.date)?.dateStr || '';
        const db = safeParseDate(b.date)?.dateStr || '';
        return da.localeCompare(db);
      });

      const currentMonthSessions = (sessions || []).filter(s => {
        if (s.studentId !== student.id || s.approved === false || !s.date) return false;
        const pd = safeParseDate(s.date);
        if (!pd) return false;
        return pd.year === year && pd.month === month;
      }).sort((a, b) => {
        const da = safeParseDate(a.date)?.dateStr || '';
        const db = safeParseDate(b.date)?.dateStr || '';
        return da.localeCompare(db);
      });

      const totalCredits = currentMonthCredits.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      
      const totalSpent = currentMonthSessions.reduce((sum, s) => {
        if (s.customFee !== undefined && !isNaN(Number(s.customFee))) return sum + Number(s.customFee);
        const t = teachers.find(teacher => teacher.id === s.teacherId);
        const rate = getStudentDefaultHourlyRate(student, globalSettings, t);
        return sum + ((Number(s.durationHours) || 0) * (Number(rate) || 0));
      }, 0);

      const endBalance = (Number(startBalance) || 0) + totalCredits - totalSpent;

      const overallApprovedSessions = (sessions || []).filter(s => s.studentId === student.id && s.approved !== false);
      const overallSpent = overallApprovedSessions.reduce((sum, s) => {
        if (s.customFee !== undefined && !isNaN(Number(s.customFee))) return sum + Number(s.customFee);
        const t = teachers.find(teacher => teacher.id === s.teacherId);
        const rate = getStudentDefaultHourlyRate(student, globalSettings, t);
        return sum + ((Number(s.durationHours) || 0) * (Number(rate) || 0));
      }, 0);
      const overallToppedUp = (credits || []).filter(c => c.studentId === student.id).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      const currentOverallBalance = overallToppedUp - overallSpent;

      const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>تقرير مالي شهري - الطالب: ${student.name}</title>
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
      width: 50%;
      padding: 8px;
    }
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 16px;
    }
    .info-label {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 4px;
      font-weight: 600;
    }
    .info-val {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .summary-boxes {
      display: table;
      width: 100%;
      margin-bottom: 30px;
      table-layout: fixed;
    }
    .summary-cell {
      display: table-cell;
      padding: 6px;
    }
    .stat-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-right: 5px solid #0d365a;
      border-radius: 8px;
      padding: 12px;
      height: 100%;
    }
    .stat-box.highlight {
      border-right-color: #d4a33c;
      background: #fffdf5;
    }
    .stat-label {
      font-size: 10px;
      color: #475569;
      font-weight: 700;
    }
    .stat-amount {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 4px;
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
    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #0d365a;
      border-bottom: 2px solid #cbd5e1;
      padding-bottom: 4px;
      margin: 25px 0 12px 0;
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
        <div class="brand-sub">قسم التدقيق والمراجعة المحاسبية للمنصة</div>
      </td>
      <td style="border:none; padding:0; text-align:left; vertical-align:middle; font-size:11px; color:#64748b; font-weight:bold;">
        تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}
      </td>
    </tr>
  </table>

  <div class="doc-title">التقرير المالي الشهري التفصيلي المخصص للطالب والمستفيد</div>

  <div class="grid-info">
    <div class="info-row">
      <div class="info-col">
        <div class="info-card">
          <div class="info-label">اسم الطالب المستفيد</div>
          <div class="info-val">${student.name}</div>
        </div>
      </div>
      <div class="info-col">
        <div class="info-card">
          <div class="info-label">الفترة المالية والمحاسبية المستهدفة</div>
          <div class="info-val">${monthLabel} لسنة ${year}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="summary-boxes">
    <div class="summary-cell">
      <div class="stat-box">
        <div class="stat-label">الرصيد الافتتاحي للشهر</div>
        <div class="stat-amount">${startBalance.toFixed(1)} ₪</div>
      </div>
    </div>
    <div class="summary-cell">
      <div class="stat-box">
        <div class="stat-label">المقبوضات وشحن المحفظة</div>
        <div class="stat-amount" style="color: #059669;">+${totalCredits.toFixed(1)} ₪</div>
      </div>
    </div>
    <div class="summary-cell">
      <div class="stat-box">
        <div class="stat-label flex items-center justify-between">استهلاك الحصص التعليمية</div>
        <div class="stat-amount" style="color: #dc2626;">-${totalSpent.toFixed(1)} ₪</div>
      </div>
    </div>
    <div class="summary-cell">
      <div class="stat-box highlight">
        <div class="stat-label">رصيد ختام الشهر المعني</div>
        <div class="stat-amount">${endBalance.toFixed(1)} ₪</div>
      </div>
    </div>
  </div>

  <div class="section-title">أولاً: سجل عمليات شحن الرصيد والتحصيلات الجارية</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 15%">التاريخ</th>
        <th style="width: 25%">طريقة الدفع</th>
        <th style="width: 30%">الملاحظات والبيان جاري</th>
        <th style="width: 15%">رقم السند</th>
        <th style="width: 15%">القيمة الإجمالية</th>
      </tr>
    </thead>
    <tbody>
      ${currentMonthCredits.length === 0 ? `
        <tr>
          <td colSpan="5" style="text-align: center; color: #64748b;">لا توجد أي تغذية مالية أو إيصال قبض مسجل لهذا الطالب في هذا الشهر</td>
        </tr>
      ` : currentMonthCredits.map(c => `
        <tr>
          <td>${c.date || ''}</td>
          <td>شحن رصيد - ${c.method || 'غير محددة'}</td>
          <td>${c.note || 'تعبئة رصيد جاري'}</td>
          <td>${c.reference || 'لا يوجد'}</td>
          <td style="font-weight: 700; color: #059669;">${c.amount} ₪</td>
        </tr>
      `).join('')}
      <tr style="background-color: #f1f5f9; font-weight: bold;">
        <td colSpan="4" style="text-align: left;">إجمالي المبالغ والتحصيلات للمستفيد هذا الشهر:</td>
        <td style="color: #059669;">${totalCredits.toFixed(1)} ₪</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">ثانياً: سجل الحصص واللقاءات المنفذة والمستهلكة</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 15%">التاريخ</th>
        <th style="width: 30%">المادة والوصف التعليمي</th>
        <th style="width: 20%">المعلم والحصص</th>
        <th style="width: 15%">سعر الساعة</th>
        <th style="width: 20%">التكلفة الإجمالية</th>
      </tr>
    </thead>
    <tbody>
      ${currentMonthSessions.length === 0 ? `
        <tr>
          <td colSpan="5" style="text-align: center; color: #64748b;">لا توجد أي حصص أو لقاءات تدريسية مسجلة لهذا الطالب في هذا الشهر المالي</td>
        </tr>
      ` : currentMonthSessions.map(s => {
        const tName = teachers.find(t => t.id === s.teacherId)?.name || 'معلم غير معروف';
        const teacherObj = teachers.find(teacher => teacher.id === s.teacherId);
        const rate = s.customFee !== undefined 
          ? (s.customFee / s.durationHours)
          : getStudentDefaultHourlyRate(student, globalSettings, teacherObj);
        const cost = s.customFee !== undefined ? s.customFee : s.durationHours * rate;
        
        return `
          <tr>
            <td>${s.date || ''}</td>
            <td><strong>${s.subject || 'مادة عامة'}</strong><br/><span style="font-size:9px; color:#64748b">${s.topic || 'لا يوجد تفاصيل موضوع'}</span></td>
            <td>الأستاذ/ ${tName}<br/><span style="font-size:9px; color:#64748b">المدة: ${s.durationHours} ساعة</span></td>
            <td>${rate.toFixed(1)} ₪</td>
            <td style="font-weight: 700; color: #dc2626;">${cost.toFixed(1)} ₪</td>
          </tr>
        `;
      }).join('')}
      <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1;">
        <td colSpan="2" style="text-align: right; font-weight: 800; padding: 10px;">مجموع الساعات الكلي لجميع الحصص المسجلة (${currentMonthSessions.length} حصة):</td>
        <td style="color: #1d4ed8; font-weight: 900; padding: 10px; background: #e0f2fe; text-align: center;">${currentMonthSessions.reduce((sum, s) => sum + s.durationHours, 0).toFixed(1)} ساعة</td>
        <td style="text-align: left; font-weight: 800; padding: 10px;">إجمالي الاستهلاك:</td>
        <td style="color: #dc2626; font-weight: 900; padding: 10px;">${totalSpent.toFixed(1)} ₪</td>
      </tr>
    </tbody>
  </table>

  <div class="grid-info" style="margin-top: 15px;">
    <div class="info-row">
      <div class="info-col">
        <div class="info-card" style="border-right: 5px solid #d4a33c; background: #fffdf5;">
          <div class="info-label">الرصيد الكلي المتبقي في ذمة الأكاديمية (اللحظي الحالي)</div>
          <div class="info-val" style="font-size: 15px; color: #d4a33c;">${currentOverallBalance.toFixed(1)} ₪</div>
        </div>
      </div>
      <div class="info-col">
        <div class="info-card">
          <div class="info-label">مراجعة وتدقيق قسم المحاسبة</div>
          <div class="info-val" style="font-size: 12px; color: #64748b;">تعتبر كافة السجلات معتمدة ومطابقة بعد مطابقتها بالتوقيعات أدناه</div>
        </div>
      </div>
    </div>
  </div>

  <div class="signatures">
    <div class="sig-col">
      <div class="sig-line">توقيع المحاسب المسؤول</div>
    </div>
    <div class="sig-col">
      <div class="sig-line">توقيع المراجع الإداري</div>
    </div>
    <div class="sig-col">
      <div class="sig-line">خاتم أكاديمية التفوق الرسمية</div>
    </div>
  </div>
</body>
</html>
      `;
            await printHTMLThroughIframe(html, `تقرير_مالي_${student.name}_شهر_${month}_${year}`, downloadDirectly);
            return;
          }
        }

        // Comprehensive Student Financial Ledger for All Students
        const studentLedgerRows = (sortedStudents || []).map((st, idx) => {
          const startBalance = getStudentStartBalance(st.id, year, month);

          const currentMonthCredits = (credits || []).filter(c => {
            if (c.studentId !== st.id || !c.date) return false;
            const pd = safeParseDate(c.date);
            if (!pd) return false;
            return pd.year === year && pd.month === month;
          });
          const totalCredits = currentMonthCredits.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

          const currentMonthSessions = (sessions || []).filter(s => {
            if (s.studentId !== st.id || s.approved === false || !s.date) return false;
            const pd = safeParseDate(s.date);
            if (!pd) return false;
            return pd.year === year && pd.month === month;
          });
          const totalSpent = currentMonthSessions.reduce((sum, s) => {
            if (s.customFee !== undefined && !isNaN(Number(s.customFee))) return sum + Number(s.customFee);
            const t = teachers.find(teacher => teacher.id === s.teacherId);
            const rate = getStudentDefaultHourlyRate(st, globalSettings, t);
            return sum + ((Number(s.durationHours) || 0) * (Number(rate) || 0));
          }, 0);

          const endBalance = (Number(startBalance) || 0) + totalCredits - totalSpent;

          const overallApprovedSessions = (sessions || []).filter(s => s.studentId === st.id && s.approved !== false);
          const overallSpent = overallApprovedSessions.reduce((sum, s) => {
            if (s.customFee !== undefined && !isNaN(Number(s.customFee))) return sum + Number(s.customFee);
            const t = teachers.find(teacher => teacher.id === s.teacherId);
            const rate = getStudentDefaultHourlyRate(st, globalSettings, t);
            return sum + ((Number(s.durationHours) || 0) * (Number(rate) || 0));
          }, 0);
          const overallToppedUp = (credits || []).filter(c => c.studentId === st.id).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
          const currentOverallBalance = overallToppedUp - overallSpent;

          return {
            num: idx + 1,
            name: st.name || 'طالب',
            startBalance: Number(startBalance) || 0,
            totalCredits: Number(totalCredits) || 0,
            totalSpent: Number(totalSpent) || 0,
            endBalance: Number(endBalance) || 0,
            currentOverallBalance: Number(currentOverallBalance) || 0,
            sessionsCount: currentMonthSessions.length || 0
          };
        });

        const totalGrandStartBalance = studentLedgerRows.reduce((sum, r) => sum + (Number(r.startBalance) || 0), 0);
        const totalGrandCredits = studentLedgerRows.reduce((sum, r) => sum + (Number(r.totalCredits) || 0), 0);
        const totalGrandSpent = studentLedgerRows.reduce((sum, r) => sum + (Number(r.totalSpent) || 0), 0);
        const totalGrandEndBalance = studentLedgerRows.reduce((sum, r) => sum + (Number(r.endBalance) || 0), 0);
        const totalGrandOverallBalance = studentLedgerRows.reduce((sum, r) => sum + (Number(r.currentOverallBalance) || 0), 0);
        const totalGrandSessions = studentLedgerRows.reduce((sum, r) => sum + (Number(r.sessionsCount) || 0), 0);

        const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>التقرير المالي المحاسبي الشامل لكافة الطلاب - ${monthLabel} لسنة ${year}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    * { box-sizing: border-box; }
    body {
      font-family: 'Cairo', sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 30px;
      direction: rtl;
      background: #ffffff;
      font-size: 11px;
    }
    .header-table {
      width: 100%;
      border-bottom: 3px double #0d365a;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 900;
      color: #0d365a;
      margin: 0;
    }
    .brand-sub {
      font-size: 11px;
      color: #d4a33c;
      font-weight: 700;
      margin: 3px 0 0 0;
    }
    .meta-box {
      text-align: left;
      font-size: 11px;
      color: #475569;
      font-weight: 700;
      line-height: 1.5;
    }
    .doc-banner {
      background: linear-gradient(135deg, #0d365a 0%, #1e3a8a 100%);
      color: #ffffff;
      padding: 12px 16px;
      border-radius: 10px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .doc-banner h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 900;
    }
    .doc-banner span {
      background: #d4a33c;
      color: #0f172a;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
    }
    .kpi-grid {
      display: table;
      width: 100%;
      margin-bottom: 20px;
      table-layout: fixed;
    }
    .kpi-cell {
      display: table-cell;
      padding: 5px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 8px;
      text-align: center;
    }
    .kpi-label {
      font-size: 10px;
      color: #64748b;
      font-weight: 800;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 15px;
      font-weight: 900;
      color: #0d365a;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    .data-table th {
      background-color: #0d365a;
      color: #ffffff;
      padding: 8px 6px;
      font-size: 10px;
      font-weight: 800;
      text-align: right;
      border: 1px solid #0d365a;
    }
    .data-table td {
      padding: 7px 6px;
      font-size: 11px;
      border: 1px solid #e2e8f0;
      text-align: right;
    }
    .data-table tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .total-row {
      background-color: #f1f5f9 !important;
      font-weight: 900;
      border-top: 2px solid #0d365a;
    }
    .total-row td {
      padding: 9px 6px;
      font-size: 11px;
    }
    .badge-pos {
      color: #059669;
      background: #ecfdf5;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      display: inline-block;
    }
    .badge-neg {
      color: #dc2626;
      background: #fef2f2;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      display: inline-block;
    }
    .badge-zero {
      color: #475569;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      display: inline-block;
    }
    .signatures {
      display: table;
      width: 100%;
      margin-top: 30px;
      page-break-inside: avoid;
    }
    .sig-col {
      display: table-cell;
      width: 33.33%;
      text-align: center;
    }
    .sig-line {
      border-top: 1px dashed #94a3b8;
      width: 75%;
      margin: 40px auto 4px;
      padding-top: 5px;
      font-size: 10px;
      font-weight: 800;
      color: #334155;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td style="text-align: right;">
        <h1 class="brand-title">أكاديمية التفوق للتعليم والتدريب</h1>
        <p class="brand-sub">نظام الإدارة المالية والمحاسبة الأكاديمية الذكية</p>
      </td>
      <td class="meta-box">
        <div><strong>تاريخ الإصدار:</strong> ${new Date().toLocaleDateString('ar-EG')}</div>
        <div><strong>الفترة المعتمدة:</strong> ${monthLabel} لسنة ${year}</div>
        <div><strong>حالة الاعتماد:</strong> <span style="color:#059669; font-weight:800;">سجل رسمي معتمد ✔</span></div>
      </td>
    </tr>
  </table>

  <div class="doc-banner">
    <h2>التقرير المالي المحاسبي الشامل لجميع الطلاب</h2>
    <span>شهر: ${monthLabel} ${year}</span>
  </div>

  <div class="kpi-grid">
    <div class="kpi-cell">
      <div class="kpi-card">
        <div class="kpi-label">إجمالي الطلاب</div>
        <div class="kpi-value">${studentLedgerRows.length} طالب</div>
      </div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-card">
        <div class="kpi-label">حصص الشهر المنجزة</div>
        <div class="kpi-value">${totalGrandSessions} حصة</div>
      </div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-card">
        <div class="kpi-label">إيداعات ودفعات الشهر</div>
        <div class="kpi-value" style="color: #059669;">${totalGrandCredits.toFixed(1)} ₪</div>
      </div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-card">
        <div class="kpi-label">استهلاك الحصص للشهر</div>
        <div class="kpi-value" style="color: #d97706;">${totalGrandSpent.toFixed(1)} ₪</div>
      </div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-card">
        <div class="kpi-label">صافي أرصدة الطلاب اللحظية</div>
        <div class="kpi-value" style="${totalGrandOverallBalance < 0 ? 'color: #dc2626;' : 'color: #059669;'}">${totalGrandOverallBalance.toFixed(1)} ₪</div>
      </div>
    </div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 4%;">#</th>
        <th style="width: 22%;">اسم الطالب</th>
        <th style="width: 12%;">رصيد بداية الشهر</th>
        <th style="width: 12%;">إيداعات الشهر (+)</th>
        <th style="width: 12%;">استهلاك الحصص (-)</th>
        <th style="width: 12%;">رصيد نهاية الشهر</th>
        <th style="width: 14%;">الرصيد اللحظي التراكمي</th>
        <th style="width: 12%;">الحالة المالية</th>
      </tr>
    </thead>
    <tbody>
      ${studentLedgerRows.length === 0 ? `
        <tr>
          <td colspan="8" style="text-align: center; color: #64748b; padding: 20px;">لا يوجد طلاب مسجلون في النظام حالياً</td>
        </tr>
      ` : studentLedgerRows.map(r => {
        const badgeClass = r.currentOverallBalance > 0 ? 'badge-pos' : r.currentOverallBalance < 0 ? 'badge-neg' : 'badge-zero';
        const badgeText = r.currentOverallBalance > 0 ? 'رصيد دائن (له)' : r.currentOverallBalance < 0 ? 'رصيد مدين (عليه)' : 'متزن (0 ₪)';
        return `
          <tr>
            <td>${r.num}</td>
            <td><strong>${r.name}</strong><br/><span style="font-size:9px; color:#64748b">${r.sessionsCount} حصة هذا الشهر</span></td>
            <td>${r.startBalance.toFixed(1)} ₪</td>
            <td style="color: #059669; font-weight: 700;">+${r.totalCredits.toFixed(1)} ₪</td>
            <td style="color: #d97706; font-weight: 700;">-${r.totalSpent.toFixed(1)} ₪</td>
            <td style="font-weight: 800; ${r.endBalance < 0 ? 'color: #dc2626;' : 'color: #059669;'}">${r.endBalance.toFixed(1)} ₪</td>
            <td style="font-weight: 800; ${r.currentOverallBalance < 0 ? 'color: #dc2626;' : 'color: #059669;'}">${r.currentOverallBalance.toFixed(1)} ₪</td>
            <td><span class="${badgeClass}">${badgeText}</span></td>
          </tr>
        `;
      }).join('')}
      <tr class="total-row">
        <td colspan="2" style="font-weight: 900; text-align: center;">المجموع الإجمالي الكلي (${studentLedgerRows.length} طالب):</td>
        <td>${totalGrandStartBalance.toFixed(1)} ₪</td>
        <td style="color: #059669;">+${totalGrandCredits.toFixed(1)} ₪</td>
        <td style="color: #d97706;">-${totalGrandSpent.toFixed(1)} ₪</td>
        <td style="${totalGrandEndBalance < 0 ? 'color: #dc2626;' : 'color: #059669;'}">${totalGrandEndBalance.toFixed(1)} ₪</td>
        <td style="${totalGrandOverallBalance < 0 ? 'color: #dc2626;' : 'color: #059669;'}">${totalGrandOverallBalance.toFixed(1)} ₪</td>
        <td>-</td>
      </tr>
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-col">
      <div class="sig-line">توقيع المحاسب والمفوض المالي</div>
    </div>
    <div class="sig-col">
      <div class="sig-line">توقيع مدقق الحسابات المعتمد</div>
    </div>
    <div class="sig-col">
      <div class="sig-line">خاتم وتوقيع مدير المنصة أ.زكي أبو علان</div>
    </div>
  </div>
</body>
</html>
        `;
        await printHTMLThroughIframe(html, `التقرير_المالي_الشامل_لكافة_الطلاب_شهر_${month}_${year}`, downloadDirectly);
        return;
      } else if (monReportType === 'teacher') {
        if (monSelectedTeacherId) {
          const teacher = teachers.find(t => t.id === monSelectedTeacherId);
          if (teacher) {
            const startBalance = getTeacherStartBalance(teacher.id, year, month);

      const currentMonthTeacherSessions = (sessions || []).filter(s => {
        if (s.teacherId !== teacher.id || s.approved === false || !s.date) return false;
        const pd = safeParseDate(s.date);
        if (!pd) return false;
        return pd.year === year && pd.month === month;
      }).sort((a, b) => {
        const da = safeParseDate(a.date)?.dateStr || '';
        const db = safeParseDate(b.date)?.dateStr || '';
        return da.localeCompare(db);
      });

      const currentMonthTeacherPayments = (payments || []).filter(p => {
        if (p.teacherId !== teacher.id || !p.date) return false;
        const pd = safeParseDate(p.date);
        if (!pd) return false;
        return pd.year === year && pd.month === month;
      }).sort((a, b) => {
        const da = safeParseDate(a.date)?.dateStr || '';
        const db = safeParseDate(b.date)?.dateStr || '';
        return da.localeCompare(db);
      });

      const totalTaughtHours = currentMonthTeacherSessions.reduce((sum, s) => sum + (Number(s.durationHours) || 0), 0);

      const totalEarned = currentMonthTeacherSessions.reduce((sum, s) => {
        if (s.customPayout !== undefined && !isNaN(Number(s.customPayout))) return sum + Number(s.customPayout);
        const rate = getTeacherPayoutRateForSession(s.studentId, teacher.id);
        return sum + ((Number(s.durationHours) || 0) * (Number(rate) || 0));
      }, 0);

      const totalPaid = currentMonthTeacherPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const endBalance = (Number(startBalance) || 0) + totalEarned - totalPaid;

      const overallTeacherSessions = (sessions || []).filter(s => s.teacherId === teacher.id && s.approved !== false);
      const overallEarned = overallTeacherSessions.reduce((sum, s) => {
        if (s.customPayout !== undefined && !isNaN(Number(s.customPayout))) return sum + Number(s.customPayout);
        const rate = getTeacherPayoutRateForSession(s.studentId, teacher.id);
        return sum + ((Number(s.durationHours) || 0) * (Number(rate) || 0));
      }, 0);
      const overallPaid = (payments || []).filter(p => p.teacherId === teacher.id).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const currentOverallBalance = overallEarned - overallPaid;

      const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>رواتب ومستحقات أستاذ - ${teacher.name}</title>
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
      width: 50%;
      padding: 8px;
    }
    .info-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 16px;
    }
    .info-label {
      font-size: 11px;
      color: #64748b;
      margin-bottom: 4px;
      font-weight: 600;
    }
    .info-val {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .summary-boxes {
      display: table;
      width: 100%;
      margin-bottom: 30px;
      table-layout: fixed;
    }
    .summary-cell {
      display: table-cell;
      padding: 6px;
    }
    .stat-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-right: 5px solid #0d365a;
      border-radius: 8px;
      padding: 12px;
      height: 100%;
    }
    .stat-box.highlight {
      border-right-color: #d4a33c;
      background: #fffdf5;
    }
    .stat-label {
      font-size: 10px;
      color: #475569;
      font-weight: 700;
    }
    .stat-amount {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 4px;
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
    .section-title {
      font-size: 13px;
      font-weight: 800;
      color: #0d365a;
      border-bottom: 2px solid #cbd5e1;
      padding-bottom: 4px;
      margin: 25px 0 12px 0;
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
      body {
        padding: 5px !important;
        margin: 0 !important;
        font-size: 8.5pt !important;
        line-height: 1.3 !important;
      }
      @page {
        size: A4 portrait;
        margin: 8mm !important;
      }
      .brand-title {
        font-size: 18px !important;
      }
      .brand-sub {
        font-size: 10px !important;
      }
      .doc-title {
        font-size: 13px !important;
        margin: 10px 0 !important;
        padding: 6px !important;
      }
      .grid-info {
        margin-bottom: 12px !important;
      }
      .info-card {
        padding: 8px 12px !important;
        border-radius: 8px !important;
      }
      .info-label {
        font-size: 9px !important;
      }
      .info-val {
        font-size: 11px !important;
      }
      .summary-boxes {
        margin-bottom: 15px !important;
      }
      .summary-cell {
        padding: 4px !important;
      }
      .stat-box {
        padding: 8px !important;
        border-radius: 6px !important;
      }
      .stat-label {
        font-size: 9px !important;
      }
      .stat-amount {
        font-size: 11px !important;
      }
      .section-title {
        font-size: 11px !important;
        margin: 12px 0 6px 0 !important;
        padding-bottom: 2px !important;
      }
      table.data-table {
        margin-bottom: 12px !important;
      }
      table.data-table th, table.data-table td {
        padding: 4px 8px !important;
        font-size: 9px !important;
      }
      .signatures {
        margin-top: 20px !important;
      }
      .sig-col {
        padding: 5px 10px !important;
      }
      .sig-line {
        font-size: 9px !important;
      }
    }
  </style>
</head>
<body>
  <table class="header-table" style="border:none; margin-bottom:5px;">
    <tr style="border:none;">
      <td style="border:none; padding:0; vertical-align:middle;">
        <span class="brand-title">أكاديمية التفوق</span>
        <div class="brand-sub">قسم الرواتب وأجور الكادر والأساتذة الكرام</div>
      </td>
      <td style="border:none; padding:0; text-align:left; vertical-align:middle; font-size:11px; color:#64748b; font-weight:bold;">
        تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}
      </td>
    </tr>
  </table>

  <div class="doc-title">التقرير المالي الشهري التفصيلي لرواتب ومستحقات المعلم الأستاذ</div>

  <div class="grid-info">
    <div class="info-row">
      <div class="info-col">
        <div class="info-card">
          <div class="info-label">اسم الأستاذ / المعلم المعين</div>
          <div class="info-val">${teacher.name}</div>
        </div>
      </div>
      <div class="info-col">
        <div class="info-card">
          <div class="info-label">الفترة المحاسبية والتوثيقية</div>
          <div class="info-val">${monthLabel} لسنة ${year}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="summary-boxes">
    <div class="summary-cell">
      <div class="stat-box">
        <div class="stat-label">أتعاب سابقة مستحقة بداية الشهر</div>
        <div class="stat-amount">${startBalance.toFixed(1)} ₪</div>
      </div>
    </div>
    <div class="summary-cell">
      <div class="stat-box">
        <div class="stat-label">أتعاب الحصص المكتسبة هذا الشهر</div>
        <div class="stat-amount" style="color: #059669;">+${totalEarned.toFixed(1)} ₪</div>
      </div>
    </div>
    <div class="summary-cell">
      <div class="stat-box">
        <div class="stat-label">الدفعات والرواتب المصروفة فعلياً</div>
        <div class="stat-amount" style="color: #dc2626;">-${totalPaid.toFixed(1)} ₪</div>
      </div>
    </div>
    <div class="summary-cell">
      <div class="stat-box highlight">
        <div class="stat-label">مستحقات معلقة نهاية الشهر المعني</div>
        <div class="stat-amount">${endBalance.toFixed(1)} ₪</div>
      </div>
    </div>
  </div>

  <div class="section-title">أولاً: سجل الحصص والدروس التعليمية المكتسبة هذا الشهر</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 15%">التاريخ</th>
        <th style="width: 25%">اسم الطالب وحساب الرسوم</th>
        <th style="width: 30%">المادة والموضوع الشارح</th>
        <th style="width: 15%">سعر حد الساعة</th>
        <th style="width: 15%">الأجر المالي</th>
      </tr>
    </thead>
    <tbody>
      ${currentMonthTeacherSessions.length === 0 ? `
        <tr>
          <td colSpan="5" style="text-align: center; color: #64748b;">لا توجد أي حصص تدريسية مسجلة أو معتمدة للمعلم في هذا الشهر المالي</td>
        </tr>
      ` : currentMonthTeacherSessions.map(s => {
        const sName = students.find(st => st.id === s.studentId)?.name || 'طالب غير معروف';
        const rate = s.customPayout !== undefined 
          ? (s.customPayout / s.durationHours)
          : getTeacherPayoutRateForSession(s.studentId, teacher.id);
        const wages = s.customPayout !== undefined ? s.customPayout : s.durationHours * rate;
        
        return `
          <tr>
            <td>${s.date || ''}</td>
            <td><strong>الطالب: ${sName}</strong><br/><span style="font-size:9px; color:#64748b">المدة المنجزة: ${s.durationHours} ساعة</span></td>
            <td><strong>${s.subject || 'مادة عامة'}</strong><br/><span style="font-size:9px; color:#64748b">${s.topic || 'شرح عام ومراجعة'}</span></td>
            <td>${rate.toFixed(1)} ₪</td>
            <td style="font-weight: 700; color: #059669;">${wages.toFixed(1)} ₪</td>
          </tr>
        `;
      }).join('')}
      <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1;">
        <td colSpan="2" style="text-align: right; font-weight: 800; padding: 10px;">مجموع الساعات الكلي لجميع الحصص المسجلة (${currentMonthTeacherSessions.length} حصة):</td>
        <td style="color: #1d4ed8; font-weight: 900; padding: 10px; background: #e0f2fe; text-align: center;">${totalTaughtHours.toFixed(1)} ساعة</td>
        <td style="text-align: left; font-weight: 800; padding: 10px;">إجمالي المستحقات:</td>
        <td style="color: #059669; font-weight: 900; padding: 10px;">${totalEarned.toFixed(1)} ₪</td>
      </tr>
    </tbody>
  </table>

  <div class="section-title">ثانياً: سجل الرواتب والدفعات المصروفة والواصلة للمعلم</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 15%">التاريخ</th>
        <th style="width: 35%">بيان السند والصرف المالي</th>
        <th style="width: 30%">طريقة التحويل / المرجع</th>
        <th style="width: 20%">القيمة المصروفة</th>
      </tr>
    </thead>
    <tbody>
      ${currentMonthTeacherPayments.length === 0 ? `
        <tr>
          <td colSpan="4" style="text-align: center; color: #64748b;">لم تسجل أو تصرف أي رواتب في هذا الشهر الصرفي للمعلم</td>
        </tr>
      ` : currentMonthTeacherPayments.map(p => `
        <tr>
          <td>${p.date || ''}</td>
          <td>${p.note || 'سند صرف رواتب وأجر المعلم للدروس المنجزة'}</td>
          <td>${p.reference || 'تحويل مباشر بالذمة'}</td>
          <td style="font-weight: 700; color: #dc2626;">${p.amount} ₪</td>
        </tr>
      `).join('')}
      <tr style="background-color: #f1f5f9; font-weight: bold;">
        <td colSpan="3" style="text-align: left;">إجمالي الدفعات والمبالغ المصروفة والمسددة:</td>
        <td style="color: #dc2626;">${totalPaid.toFixed(1)} ₪</td>
      </tr>
    </tbody>
  </table>

  <div class="grid-info" style="margin-top: 15px;">
    <div class="info-row">
      <div class="info-col">
        <div class="info-card" style="border-right: 5px solid #d4a33c; background: #fffdf5;">
          <div class="info-label">إجمالي رصيد ومستحقات الأستاذ المعلقة حالياً بالنظام (تراكمي)</div>
          <div class="info-val" style="font-size: 15px; color: #d4a33c;">${currentOverallBalance.toFixed(1)} ₪</div>
        </div>
      </div>
      <div class="info-col">
        <div class="info-card">
          <div class="info-label">معلومات هامة للمعلم الكرام</div>
          <div class="info-val" style="font-size: 11px; color: #64748b;">يرجى مراجعة قسم الحسابات في حال وجود أي تباين أو فروقات في الساعات كحد أقصى 5 أيام من نهاية الشهر الدراسي.</div>
        </div>
      </div>
    </div>
  </div>

  <div class="signatures">
    <div class="sig-col">
      <div class="sig-line">توقيع المدرس المستلم</div>
    </div>
    <div class="sig-col">
      <div class="sig-line">توقيع المحاسب والمفوض</div>
    </div>
    <div class="sig-col">
      <div class="sig-line">مدير المنصة أ.زكي أبو علان</div>
    </div>
  </div>
      `;
            await printHTMLThroughIframe(html, `كشف_أجور_${teacher.name}_شهر_${month}_${year}`, downloadDirectly);
            return;
          }
        }

        // Comprehensive Teachers Wages Ledger
        const teacherLedgerRows = (teachers || []).map((teacher, idx) => {
          const startBalance = getTeacherStartBalance(teacher.id, year, month);

          const currentMonthTeacherSessions = (sessions || []).filter(s => {
            if (s.teacherId !== teacher.id || s.approved === false || !s.date) return false;
            const pd = safeParseDate(s.date);
            if (!pd) return false;
            return pd.year === year && pd.month === month;
          });

          const uniqueSessionsMap = new Map<string, Session>();
          currentMonthTeacherSessions.forEach(s => {
            const key = s.isGroupSession ? `${s.date}_${s.teacherId}_${s.groupId || ''}` : s.id;
            if (!uniqueSessionsMap.has(key)) uniqueSessionsMap.set(key, s);
          });
          const totalTaughtHours = Array.from(uniqueSessionsMap.values()).reduce((sum, s) => sum + (Number(s.durationHours) || 0), 0);

          const totalEarned = currentMonthTeacherSessions.reduce((sum, s) => {
            if (s.customPayout !== undefined && !isNaN(Number(s.customPayout))) return sum + Number(s.customPayout);
            const key = s.isGroupSession ? `${s.date}_${s.teacherId}_${s.groupId || ''}` : s.id;
            const isPrimary = uniqueSessionsMap.get(key)?.id === s.id;
            if (!isPrimary) return sum;
            const rate = getTeacherPayoutRateForSession(s.studentId, teacher.id);
            return sum + ((Number(s.durationHours) || 0) * (Number(rate) || 0));
          }, 0);

          const currentMonthTeacherPayments = (payments || []).filter(p => {
            if (p.teacherId !== teacher.id || !p.date) return false;
            const pd = safeParseDate(p.date);
            if (!pd) return false;
            return pd.year === year && pd.month === month;
          });
          const totalPaid = currentMonthTeacherPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
          const endBalance = (Number(startBalance) || 0) + totalEarned - totalPaid;

          return {
            num: idx + 1,
            name: teacher.name || 'معلم',
            specialty: teacher.specialty || (Array.isArray(teacher.subjects) ? teacher.subjects.join(', ') : 'تعليم وتدريب عام'),
            hours: Number(totalTaughtHours) || 0,
            sessionsCount: currentMonthTeacherSessions.length || 0,
            startBalance: Number(startBalance) || 0,
            earned: Number(totalEarned) || 0,
            paid: Number(totalPaid) || 0,
            balance: Number(endBalance) || 0
          };
        });

        const grandTeacherHours = teacherLedgerRows.reduce((sum, r) => sum + (Number(r.hours) || 0), 0);
        const grandTeacherEarned = teacherLedgerRows.reduce((sum, r) => sum + (Number(r.earned) || 0), 0);
        const grandTeacherPaid = teacherLedgerRows.reduce((sum, r) => sum + (Number(r.paid) || 0), 0);
        const grandTeacherBalance = teacherLedgerRows.reduce((sum, r) => sum + (Number(r.balance) || 0), 0);
        const grandTeacherSessions = teacherLedgerRows.reduce((sum, r) => sum + (Number(r.sessionsCount) || 0), 0);

        const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>كشف مسير أجور ومستحقات كافة المعلمين - ${monthLabel} لسنة ${year}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    * { box-sizing: border-box; }
    body {
      font-family: 'Cairo', sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 30px;
      direction: rtl;
      background: #ffffff;
      font-size: 11px;
    }
    .header-table {
      width: 100%;
      border-bottom: 3px double #0d365a;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 900;
      color: #0d365a;
      margin: 0;
    }
    .brand-sub {
      font-size: 11px;
      color: #d4a33c;
      font-weight: 700;
      margin: 3px 0 0 0;
    }
    .meta-box {
      text-align: left;
      font-size: 11px;
      color: #475569;
      font-weight: 700;
      line-height: 1.5;
    }
    .doc-banner {
      background: linear-gradient(135deg, #0d365a 0%, #1e3a8a 100%);
      color: #ffffff;
      padding: 12px 16px;
      border-radius: 10px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .doc-banner h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 900;
    }
    .doc-banner span {
      background: #d4a33c;
      color: #0f172a;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 800;
    }
    .kpi-grid {
      display: table;
      width: 100%;
      margin-bottom: 20px;
      table-layout: fixed;
    }
    .kpi-cell {
      display: table-cell;
      padding: 5px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 8px;
      text-align: center;
    }
    .kpi-label {
      font-size: 10px;
      color: #64748b;
      font-weight: 800;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 15px;
      font-weight: 900;
      color: #0d365a;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 25px;
    }
    .data-table th {
      background-color: #0d365a;
      color: #ffffff;
      padding: 8px 6px;
      font-size: 10px;
      font-weight: 800;
      text-align: right;
      border: 1px solid #0d365a;
    }
    .data-table td {
      padding: 7px 6px;
      font-size: 11px;
      border: 1px solid #e2e8f0;
      text-align: right;
    }
    .data-table tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .total-row {
      background-color: #f1f5f9 !important;
      font-weight: 900;
      border-top: 2px solid #0d365a;
    }
    .total-row td {
      padding: 9px 6px;
      font-size: 11px;
    }
    .badge-pos {
      color: #dc2626;
      background: #fef2f2;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      display: inline-block;
    }
    .badge-ok {
      color: #059669;
      background: #ecfdf5;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 700;
      display: inline-block;
    }
    .signatures {
      display: table;
      width: 100%;
      margin-top: 30px;
      page-break-inside: avoid;
    }
    .sig-col {
      display: table-cell;
      width: 33.33%;
      text-align: center;
    }
    .sig-line {
      border-top: 1px dashed #94a3b8;
      width: 75%;
      margin: 40px auto 4px;
      padding-top: 5px;
      font-size: 10px;
      font-weight: 800;
      color: #334155;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td style="text-align: right;">
        <h1 class="brand-title">أكاديمية التفوق للتعليم والتدريب</h1>
        <p class="brand-sub">مسير رواتب واستحقاقات الكادر التدريسي المعتمد</p>
      </td>
      <td class="meta-box">
        <div><strong>تاريخ التوليد:</strong> ${new Date().toLocaleDateString('ar-EG')}</div>
        <div><strong>الفترة المعتمدة:</strong> ${monthLabel} لسنة ${year}</div>
        <div><strong>حالة الصرف:</strong> <span style="color:#059669; font-weight:800;">كشف مدقق وموثق ✔</span></div>
      </td>
    </tr>
  </table>

  <div class="doc-banner">
    <h2>كشف مسير أجور ومستحقات كافة المعلمين</h2>
    <span>شهر: ${monthLabel} ${year}</span>
  </div>

  <div class="kpi-grid">
    <div class="kpi-cell">
      <div class="kpi-card">
        <div class="kpi-label">عدد المعلمين</div>
        <div class="kpi-value">${teacherLedgerRows.length} معلم</div>
      </div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-card">
        <div class="kpi-label">ساعات التدريس المنجزة</div>
        <div class="kpi-value" style="color:#1d4ed8;">${grandTeacherHours.toFixed(1)} ساعة</div>
      </div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-card">
        <div class="kpi-label">إجمالي الأجور المكتسبة</div>
        <div class="kpi-value" style="color: #059669;">${grandTeacherEarned.toFixed(1)} ₪</div>
      </div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-card">
        <div class="kpi-label">إجمالي المسدد والمصروف</div>
        <div class="kpi-value" style="color: #d97706;">${grandTeacherPaid.toFixed(1)} ₪</div>
      </div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-card">
        <div class="kpi-label">الرصيد المتبقي بالذمة</div>
        <div class="kpi-value" style="${grandTeacherBalance > 0 ? 'color: #dc2626;' : 'color: #059669;'}">${grandTeacherBalance.toFixed(1)} ₪</div>
      </div>
    </div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 4%;">#</th>
        <th style="width: 20%;">اسم المعلم</th>
        <th style="width: 14%;">التخصص / المواد</th>
        <th style="width: 10%;">ساعات التدريس</th>
        <th style="width: 12%;">رصيد سابق</th>
        <th style="width: 13%;">مستحقات الشهر (+)</th>
        <th style="width: 13%;">المسدد فعلياً (-)</th>
        <th style="width: 14%;">الرصيد المتبقي بالذمة</th>
      </tr>
    </thead>
    <tbody>
      ${teacherLedgerRows.length === 0 ? `
        <tr>
          <td colspan="8" style="text-align: center; color: #64748b; padding: 20px;">لا يوجد معلمون مسجلون في المنظومة حالياً</td>
        </tr>
      ` : teacherLedgerRows.map(r => {
        const isDue = r.balance > 0;
        return `
          <tr>
            <td>${r.num}</td>
            <td><strong>${r.name}</strong><br/><span style="font-size:9px; color:#64748b">${r.sessionsCount} حصة منجزة</span></td>
            <td>${r.specialty}</td>
            <td style="font-weight: 700; text-align: center;">${r.hours.toFixed(1)} س</td>
            <td>${r.startBalance.toFixed(1)} ₪</td>
            <td style="color: #059669; font-weight: 700;">+${r.earned.toFixed(1)} ₪</td>
            <td style="color: #d97706; font-weight: 700;">-${r.paid.toFixed(1)} ₪</td>
            <td style="font-weight: 800; ${isDue ? 'color: #dc2626; background: #fef2f2;' : 'color: #059669;'}">${r.balance.toFixed(1)} ₪</td>
          </tr>
        `;
      }).join('')}
      <tr class="total-row">
        <td colspan="3" style="font-weight: 900; text-align: center;">المجموع الإجمالي العام (${teacherLedgerRows.length} معلم):</td>
        <td style="text-align: center; color: #1d4ed8;">${grandTeacherHours.toFixed(1)} س</td>
        <td>-</td>
        <td style="color: #059669;">+${grandTeacherEarned.toFixed(1)} ₪</td>
        <td style="color: #d97706;">-${grandTeacherPaid.toFixed(1)} ₪</td>
        <td style="${grandTeacherBalance > 0 ? 'color: #dc2626;' : 'color: #059669;'}">${grandTeacherBalance.toFixed(1)} ₪</td>
      </tr>
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-col">
      <div class="sig-line">توقيع المحاسب والمفوض الرئيسي</div>
    </div>
    <div class="sig-col">
      <div class="sig-line">توقيع مدقق الحسابات المعتمد</div>
    </div>
    <div class="sig-col">
      <div class="sig-line">خاتم وتوقيع مدير المنصة أ.زكي أبو علان</div>
    </div>
  </div>
</body>
</html>
        `;
        await printHTMLThroughIframe(html, `كشف_مسير_أجور_ورواتب_المعلمين_الشامل_شهر_${month}_${year}`, downloadDirectly);
        return;
      } else if (monReportType === 'center') {
      const currentMonthSessions = (sessions || []).filter(s => {
        if (s.approved === false || !s.date) return false;
        const pd = safeParseDate(s.date);
        if (!pd) return false;
        return pd.year === year && pd.month === month;
      });

      // 1. Group Courses
      const groupCoursesPerformance = (groupCourses || []).map(course => {
        if (!course) return null;
        const courseSessions = currentMonthSessions.filter(s =>
          s.isGroupSession && (s.groupId === course.id || s.courseCode === course.code)
        );
        
        if (courseSessions.length === 0) return null;
        
        const uniqueStudents = Array.from(new Set(courseSessions.map(s => s.studentId)));
        
        const uniqueSessionsMap = new Map<string, Session>();
        courseSessions.forEach(s => {
          const key = `${s.date}_${s.teacherId}_${s.groupId || ''}`;
          if (!uniqueSessionsMap.has(key)) {
            uniqueSessionsMap.set(key, s);
          }
        });
        const totalHours = Array.from(uniqueSessionsMap.values()).reduce((sum, s) => sum + (Number(s.durationHours) || 0), 0);
        
        const revenue = courseSessions.reduce((sum, s) => {
          if (s.customFee !== undefined && !isNaN(Number(s.customFee))) return sum + Number(s.customFee);
          const rate = getStudentBillingRateForSession(s.studentId, s.teacherId);
          return sum + ((Number(s.durationHours) || 0) * (Number(rate) || 0));
        }, 0);
        
        const payout = courseSessions.reduce((sum, s) => {
          if (s.customPayout !== undefined && !isNaN(Number(s.customPayout))) return sum + Number(s.customPayout);
          const key = `${s.date}_${s.teacherId}_${s.groupId || ''}`;
          const isPrimary = uniqueSessionsMap.get(key)?.id === s.id;
          if (!isPrimary) return sum;
          
          const rate = getTeacherPayoutRateForSession(s.studentId, s.teacherId);
          return sum + ((Number(s.durationHours) || 0) * (Number(rate) || 0));
        }, 0);
        
        return {
          name: course.name || course.title || 'دورة جماعية غير مسماة',
          type: 'جماعية',
          hours: Number(totalHours) || 0,
          studentsCount: uniqueStudents.length,
          revenue: Number(revenue) || 0,
          payout: Number(payout) || 0,
          margin: (Number(revenue) || 0) - (Number(payout) || 0)
        };
      }).filter((c): c is NonNullable<typeof c> => Boolean(c));

      // 2. Individual Subjects
      const individualSessions = currentMonthSessions.filter(s => !s.isGroupSession);
      const individualSubjectsMap = new Map<string, Session[]>();
      individualSessions.forEach(s => {
        const sub = s.subject || 'مادة عامة';
        if (!individualSubjectsMap.has(sub)) {
          individualSubjectsMap.set(sub, []);
        }
        individualSubjectsMap.get(sub)!.push(s);
      });

      const individualPerformance = Array.from(individualSubjectsMap.entries()).map(([subName, subSessions]) => {
        const uniqueStudents = Array.from(new Set(subSessions.map(s => s.studentId)));
        const totalHours = subSessions.reduce((sum, s) => sum + (Number(s.durationHours) || 0), 0);
        
        const revenue = subSessions.reduce((sum, s) => {
          if (s.customFee !== undefined && !isNaN(Number(s.customFee))) return sum + Number(s.customFee);
          const rate = getStudentBillingRateForSession(s.studentId, s.teacherId);
          return sum + ((Number(s.durationHours) || 0) * (Number(rate) || 0));
        }, 0);

        const payout = subSessions.reduce((sum, s) => {
          if (s.customPayout !== undefined && !isNaN(Number(s.customPayout))) return sum + Number(s.customPayout);
          const rate = getTeacherPayoutRateForSession(s.studentId, s.teacherId);
          return sum + ((Number(s.durationHours) || 0) * (Number(rate) || 0));
        }, 0);

        return {
          name: subName,
          type: 'فردية',
          hours: Number(totalHours) || 0,
          studentsCount: uniqueStudents.length,
          revenue: Number(revenue) || 0,
          payout: Number(payout) || 0,
          margin: (Number(revenue) || 0) - (Number(payout) || 0)
        };
      });

      const allCoursesPerformance = [...groupCoursesPerformance, ...individualPerformance];

      const totalHoursTaught = allCoursesPerformance.reduce((sum, c) => sum + (Number(c.hours) || 0), 0);
      const totalRevenueAccrued = allCoursesPerformance.reduce((sum, c) => sum + (Number(c.revenue) || 0), 0);
      const totalPayoutAccrued = allCoursesPerformance.reduce((sum, c) => sum + (Number(c.payout) || 0), 0);
      const totalNetProfit = totalRevenueAccrued - totalPayoutAccrued;

      const totalDeposits = (credits || []).filter(c => {
        if (!c.date) return false;
        const pd = safeParseDate(c.date);
        if (!pd) return false;
        return pd.year === year && pd.month === month;
      }).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

      const totalPaymentsPaid = (payments || []).filter(p => {
        if (!p.date) return false;
        const pd = safeParseDate(p.date);
        if (!pd) return false;
        return pd.year === year && pd.month === month;
      }).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      // Group current month sessions by teacher
      const teachersPerformanceMap = new Map<string, Session[]>();
      currentMonthSessions.forEach(s => {
        const tId = s.teacherId;
        if (tId) {
          if (!teachersPerformanceMap.has(tId)) {
            teachersPerformanceMap.set(tId, []);
          }
          teachersPerformanceMap.get(tId)!.push(s);
        }
      });

      const teachersPerformance = Array.from(teachersPerformanceMap.entries()).map(([tId, tSessions]) => {
        const teacher = (teachers || []).find(t => t.id === tId);
        if (!teacher) return null;

        const uniqueSessionsMap = new Map<string, Session>();
        tSessions.forEach(s => {
          const key = s.isGroupSession 
            ? `${s.date}_${s.teacherId}_${s.groupId || ''}`
            : s.id;
          if (!uniqueSessionsMap.has(key)) {
            uniqueSessionsMap.set(key, s);
          }
        });
        const hours = Array.from(uniqueSessionsMap.values()).reduce((sum, s) => sum + (Number(s.durationHours) || 0), 0);

        const earned = tSessions.reduce((sum, s) => {
          if (s.customPayout !== undefined && !isNaN(Number(s.customPayout))) return sum + Number(s.customPayout);
          const key = s.isGroupSession ? `${s.date}_${s.teacherId}_${s.groupId || ''}` : s.id;
          const isPrimary = uniqueSessionsMap.get(key)?.id === s.id;
          if (!isPrimary) return sum;
          
          const rate = getTeacherPayoutRateForSession(s.studentId, teacher.id);
          return sum + ((Number(s.durationHours) || 0) * (Number(rate) || 0));
        }, 0);

        const paid = (payments || []).filter(p => {
          if (p.teacherId !== tId || !p.date) return false;
          const pd = safeParseDate(p.date);
          if (!pd) return false;
          return pd.year === year && pd.month === month;
        }).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        return {
          name: teacher.name || 'معلم',
          hours: Number(hours) || 0,
          earned: Number(earned) || 0,
          paid: Number(paid) || 0,
          balance: (Number(earned) || 0) - (Number(paid) || 0)
        };
      }).filter((t): t is NonNullable<typeof t> => Boolean(t));

      const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>التقرير المالي الشامل للمركز - ${monthLabel} لسنة ${year}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
    body {
      font-family: 'Cairo', sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 35px;
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
      font-size: 18px;
      font-weight: 800;
      color: #0d365a;
      text-align: center;
      margin: 20px 0;
      background: #f1f5f9;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .summary-boxes {
      display: table;
      width: 100%;
      margin-bottom: 30px;
      table-layout: fixed;
    }
    .summary-cell {
      display: table-cell;
      padding: 6px;
    }
    .stat-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-right: 5px solid #0d365a;
      border-radius: 8px;
      padding: 12px;
      height: 100%;
    }
    .stat-box.highlight {
      border-right-color: #d4a33c;
      background: #fffdf5;
    }
    .stat-box.success {
      border-right-color: #10b981;
      background: #f0fdf4;
    }
    .stat-label {
      font-size: 10px;
      color: #475569;
      font-weight: 700;
    }
    .stat-amount {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 4px;
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
      padding: 10px 12px;
      text-align: right;
      border: 1px solid #cbd5e1;
    }
    table.data-table td {
      border: 1px solid #cbd5e1;
      padding: 10px 12px;
      font-size: 11px;
      color: #334155;
    }
    table.data-table tr:nth-child(even) td {
      background: #f8fafc;
    }
    .section-title {
      font-size: 14px;
      font-weight: 800;
      color: #0d365a;
      border-bottom: 2px solid #cbd5e1;
      padding-bottom: 6px;
      margin: 25px 0 12px 0;
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
      text-align: center;
      padding: 10px;
    }
    .sig-line {
      border-top: 1px dashed #94a3b8;
      display: inline-block;
      width: 80%;
      padding-top: 8px;
      font-size: 11px;
      font-weight: 700;
      color: #475569;
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td>
        <h1 class="brand-title">أكاديمية التفوق التعليمية</h1>
        <p class="brand-sub">نظام التدقيق والتقارير المالية والتحليل الإحصائي الرقمي</p>
      </td>
      <td style="text-align: left; font-size: 11px; color: #64748b; font-weight: 700;">
        تاريخ الطباعة: ${new Date().toLocaleDateString('ar-EG')} ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
      </td>
    </tr>
  </table>

  <h2 class="doc-title">التقرير المالي الشهري الشامل لمركز التدريب - ${monthLabel} لسنة ${year}</h2>

  <div class="summary-boxes">
    <div class="summary-cell">
      <div class="stat-box">
        <div class="stat-label">إجمالي ساعات التدريس</div>
        <div class="stat-amount">${totalHoursTaught.toFixed(1)} ساعة</div>
      </div>
    </div>
    <div class="summary-cell">
      <div class="stat-box">
        <div class="stat-label">إجمالي إيرادات الحصص المنجزة</div>
        <div class="stat-amount" style="color: #10b981;">₪${totalRevenueAccrued.toFixed(0)}</div>
      </div>
    </div>
    <div class="summary-cell">
      <div class="stat-box">
        <div class="stat-label">إجمالي رواتب المعلمين المستحقة</div>
        <div class="stat-amount" style="color: #ef4444;">₪${totalPayoutAccrued.toFixed(0)}</div>
      </div>
    </div>
    <div class="summary-cell">
      <div class="stat-box highlight">
        <div class="stat-label">الربح التشغيلي للمركز</div>
        <div class="stat-amount" style="color: #0d365a;">₪${totalNetProfit.toFixed(0)}</div>
      </div>
    </div>
  </div>

  <div class="summary-boxes" style="margin-top: -15px; margin-bottom: 25px;">
    <div class="summary-cell" style="width: 50%;">
      <div class="stat-box success">
        <div class="stat-label">المقبوضات النقدية والتحصيلات (شحن أرصدة)</div>
        <div class="stat-amount" style="color: #059669;">₪${totalDeposits.toFixed(0)}</div>
      </div>
    </div>
    <div class="summary-cell" style="width: 50%;">
      <div class="stat-box" style="border-right-color: #f59e0b; background: #fffbeb;">
        <div class="stat-label">المدفوعات الفعلية المصروفة للمعلمين</div>
        <div class="stat-amount" style="color: #d97706;">₪${totalPaymentsPaid.toFixed(0)}</div>
      </div>
    </div>
  </div>

  <h3 class="section-title">أولاً: تفاصيل دخل ومصاريف كل دورة / مادة دراسية</h3>
  <table class="data-table">
    <thead>
      <tr>
        <th>اسم المادة / الدورة</th>
        <th style="width: 15%;">نوع الدورة</th>
        <th style="width: 15%; text-align: center;">الساعات المنجزة</th>
        <th style="width: 15%; text-align: center;">الطلاب النشطين</th>
        <th style="width: 15%; text-align: left;">إجمالي الدخل (₪)</th>
        <th style="width: 15%; text-align: left;">أجور المدرسين (₪)</th>
        <th style="width: 15%; text-align: left;">صافي الربح للمركز (₪)</th>
      </tr>
    </thead>
    <tbody>
      ${allCoursesPerformance.map(c => `
        <tr>
          <td style="font-weight: 700; color: #0f172a;">${c.name}</td>
          <td>
            <span style="padding: 2px 6px; font-size: 10px; font-weight: bold; border-radius: 4px; ${c.type === 'جماعية' ? 'background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;' : 'background: #f8fafc; color: #475569; border: 1px solid #e2e8f0;'}">
              ${c.type}
            </span>
          </td>
          <td style="text-align: center; font-weight: bold;">${c.hours.toFixed(1)} ساعة</td>
          <td style="text-align: center; font-weight: bold;">${c.studentsCount}</td>
          <td style="text-align: left; font-weight: 700; color: #059669;">${c.revenue.toFixed(1)} ₪</td>
          <td style="text-align: left; font-weight: 700; color: #ef4444;">${c.payout.toFixed(1)} ₪</td>
          <td style="text-align: left; font-weight: 700; color: #0d365a; background: #f8fafc;">${c.margin.toFixed(1)} ₪</td>
        </tr>
      `).join('')}
      <tr style="background-color: #f1f5f9; font-weight: 800;">
        <td colspan="2">إجمالي مجاميع الدورات والمواد:</td>
        <td style="text-align: center;">${totalHoursTaught.toFixed(1)} ساعة</td>
        <td style="text-align: center;">-</td>
        <td style="text-align: left; color: #059669;">${totalRevenueAccrued.toFixed(1)} ₪</td>
        <td style="text-align: left; color: #ef4444;">${totalPayoutAccrued.toFixed(1)} ₪</td>
        <td style="text-align: left; color: #0d365a;">${totalNetProfit.toFixed(1)} ₪</td>
      </tr>
    </tbody>
  </table>

  <h3 class="section-title">ثانياً: ملخص رواتب وأجور المعلمين عن الشهر المعني</h3>
  <table class="data-table">
    <thead>
      <tr>
        <th>اسم المعلم الأستاذ</th>
        <th style="width: 20%; text-align: center;">الساعات المنفذة بالشهر</th>
        <th style="width: 25%; text-align: left;">الأجور والرواتب المكتسبة (₪)</th>
        <th style="width: 25%; text-align: left;">المبالغ والرواتب المدفوعة فعلياً (₪)</th>
        <th style="width: 25%; text-align: left;">صافي الرصيد المتبقي للمدرس للشهر (₪)</th>
      </tr>
    </thead>
    <tbody>
      ${teachersPerformance.map(t => `
        <tr>
          <td style="font-weight: 700; color: #0f172a;">${t.name}</td>
          <td style="text-align: center; font-weight: bold;">${t.hours.toFixed(1)} ساعة</td>
          <td style="text-align: left; font-weight: bold; color: #475569;">${t.earned.toFixed(1)} ₪</td>
          <td style="text-align: left; font-weight: bold; color: #d97706;">${t.paid.toFixed(1)} ₪</td>
          <td style="text-align: left; font-weight: 700; ${t.balance > 0 ? 'color: #ef4444; background: #fef2f2;' : 'color: #059669;'}">${t.balance.toFixed(1)} ₪</td>
        </tr>
      `).join('')}
      <tr style="background-color: #f1f5f9; font-weight: 800;">
        <td>إجمالي رواتب ومستحقات الكادر التعليمي:</td>
        <td style="text-align: center;">${totalHoursTaught.toFixed(1)} ساعة</td>
        <td style="text-align: left; color: #475569;">${totalPayoutAccrued.toFixed(1)} ₪</td>
        <td style="text-align: left; color: #d97706;">${totalPaymentsPaid.toFixed(1)} ₪</td>
        <td style="text-align: left; color: #ef4444;">${(totalPayoutAccrued - totalPaymentsPaid).toFixed(1)} ₪</td>
      </tr>
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-col">
      <div class="sig-line">توقيع المحاسب والمفوض الرئيسي</div>
    </div>
    <div class="sig-col">
      <div class="sig-line">توقيع مدقق الحسابات المعتمد</div>
    </div>
    <div class="sig-col">
      <div class="sig-line">خاتم وتوقيع مدير المنصة أ.زكي أبو علان</div>
    </div>
  </div>
</body>
</html>
      `;
      await printHTMLThroughIframe(html, `التقرير_المالي_الشامل_للمركز_شهر_${month}_${year}`, downloadDirectly);
    }
  } catch (err: any) {
    console.error("Failed to generate monthly PDF report:", err);
    setToastAlert(`تعذر توليد التقرير المالي: ${err?.message || 'يرجى مراجعة البيانات والمحاولة مرة أخرى'}`);
  } finally {
    setIsGeneratingMonthlyPdf(false);
  }
};

  // Exporter for Teacher General Ledger and Clearances
  const exportTeacherLedger = (format: 'xlsx' | 'csv') => {
    // Export either filtered table view or entire records
    const rowsToExport = table.getRowModel().rows.map(row => row.original);
    
    const headers = [
      'اسم المعلم المستقطب',
      'مجموع ساعات التدريس',
      'إجمالي المستحقات المرصودة (شيكل ₪)',
      'إجمالي المبالغ المدفوعة (شيكل ₪)',
      'الرصيد المتبقي بالذمة (شيكل ₪)',
      'الحالة المحاسبية'
    ];

    const delimiter = format === 'xlsx' ? ';' : ',';

    const data = rowsToExport.map(item => [
      item.name,
      `${item.hours} ساعة`,
      (item.earned || 0).toFixed(0),
      (item.paid || 0).toFixed(0),
      (item.balance || 0).toFixed(0),
      item.status
    ]);

    const fileName = `دفتر_الاستاذ_العام_للمعلمين_${new Date().toISOString().split('T')[0]}`;
    downloadCSVFile(headers, data, fileName, delimiter);
  };

  // Exporter for selected teacher's full sessions log
  const exportTeacherSessions = (teacherId: string, format: 'xlsx' | 'csv') => {
    const teacherObj = teachers.find(t => t.id === teacherId);
    if (!teacherObj) return;

    const teacherSessions = sessions
      .filter(s => s.teacherId === teacherId)
      .sort((a, b) => b.date.localeCompare(a.date));

    const headers = [
      'اسم الطالب',
      'المهارة / المادة التدريسية',
      'الساعات المنجزة',
      'معدل أجر الساعة المعين للأستاذ (₪)',
      'إجمالي مستحقات الحصة للأستاذ (₪)',
      'تاريخ اللقاء والدرس',
      'ملاحظات ومخرجات الحصة'
    ];

    const delimiter = format === 'xlsx' ? ';' : ',';

    const data = teacherSessions.map(session => {
      const studentObj = students.find(st => st.id === session.studentId);
      const isCustomPayout = session.customPayout !== undefined;
      const rate = isCustomPayout 
        ? (session.customPayout / session.durationHours)
        : getTeacherPayoutRateForSession(session.studentId, teacherObj.id);
      const totalCost = isCustomPayout ? session.customPayout : (session.durationHours * rate);

      return [
        studentObj?.name || 'مجهول',
        session.subject || 'مادة عامة',
        `${session.durationHours} ساعة`,
        rate.toFixed(0),
        totalCost.toFixed(0),
        formatCustomDate(session.date),
        session.notes || 'لا يوجد ملاحظات مدونة'
      ];
    });

    const fileName = `كشف_حصص_الاستاذ_${teacherObj.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
    downloadCSVFile(headers, data, fileName, delimiter);
  };

  // Exporter for school-wide student balances & liquidity margins
  const exportStudentBalances = (format: 'xlsx' | 'csv') => {
    const headers = [
      'اسم الطالب',
      'البريد الإلكتروني',
      'رقم الهاتف الجوال',
      'إجمالي السيولة المشحونة بالمحفظة (₪)',
      'إجمالي السيولة المستهلكة بالحصص (₪)',
      'الرصيد المتبقي بمحفظته الجارية (₪)',
      'حد التنبيه الوقائي وعتبة الأمان (₪)',
      'حالة الحساب والملاءة المالية'
    ];

    const delimiter = format === 'xlsx' ? ';' : ',';

    const data = allStudentAlerts.map(item => {
      const statusText = item.isCritical 
        ? 'حرج - مستهلك كافة الرصيد ويتطلب شحن فوري' 
        : item.isApproaching 
        ? 'تحذيري - رصيد منخفض يقترب من النفاد' 
        : 'آمن - رصيد كاف ومستقر';

      return [
        item.name,
        item.email || 'غير متوفر',
        item.phone || 'غير متوفر',
        item.totalToppedUp.toFixed(0),
        item.totalSpent.toFixed(0),
        item.balance.toFixed(0),
        item.threshold,
        statusText
      ];
    });

    const fileName = `كشف_أرصدة_وموائمة_الطلاب_المالية_${new Date().toISOString().split('T')[0]}`;
    downloadCSVFile(headers, data, fileName, delimiter);
  };

  const filteredCustomSessions = useMemo(() => {
    return sessions.filter(session => {
      // 1. Teacher Filter (Dropdown selection)
      if (customTeacherFilter !== 'all' && session.teacherId !== customTeacherFilter) {
        return false;
      }

      // 2. Teacher Name Text Search
      if (customTeacherSearch.trim() !== '') {
        const teacherObj = teachers.find(t => t.id === session.teacherId);
        const tName = teacherObj?.name ? (teacherObj.name || '').toLowerCase() : '';
        if (!tName.includes((customTeacherSearch || '').toLowerCase())) {
          return false;
        }
      }

      // 3. Specific Date Filter vs Date Range Filter
      if (customSpecificDate) {
        if (session.date !== customSpecificDate) {
          return false;
        }
      } else {
        if (customStartDate && session.date && session.date < customStartDate) {
          return false;
        }
        if (customEndDate && session.date && session.date > customEndDate) {
          return false;
        }
      }

      // 4. Financial Classification Filter
      if (customFinancialClassification !== 'all') {
        const studentObj = students.find(s => s.id === session.studentId);
        const teacherObj = teachers.find(t => t.id === session.teacherId);
        
        // Calculate Student Revenue
        const studentRate = getStudentDefaultHourlyRate(studentObj, globalSettings, teacherObj);
        const revenue = session.customFee !== undefined 
          ? session.customFee 
          : (session.durationHours * studentRate);
          
        // Calculate Teacher Payout
        const teacherRate = teacherObj?.hourlyRate ?? globalSettings.defaultTeacherHourlyRate ?? 35;
        const payout = session.customPayout !== undefined 
          ? session.customPayout 
          : (session.durationHours * teacherRate);
          
        const netProfit = revenue - payout;

        switch (customFinancialClassification) {
          case 'profitable':
            if (netProfit <= 0) return false;
            break;
          case 'unprofitable':
            if (netProfit > 0) return false;
            break;
          case 'free':
            if (revenue > 0) return false;
            break;
          case 'high_value':
            if (revenue <= 100) return false;
            break;
          case 'group':
            if (!session.isGroupSession && !session.groupId) return false;
            break;
          case 'individual':
            if (session.isGroupSession || session.groupId) return false;
            break;
          default:
            break;
        }
      }

      return true;
    });
  }, [
    sessions,
    customTeacherFilter,
    customTeacherSearch,
    customStartDate,
    customEndDate,
    customSpecificDate,
    customFinancialClassification,
    teachers,
    students,
    globalSettings
  ]);

  const exportCustomReportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const sheetData = filteredCustomSessions.map(session => {
      const studentObj = students.find(s => s.id === session.studentId);
      const teacherObj = teachers.find(t => t.id === session.teacherId);
      return {
        'اسم الطالب': studentObj ? studentObj.name : 'طالب محذوف',
        'اسم المعلم': teacherObj ? teacherObj.name : 'معلم غير معروف',
        'تاريخ الحصة': session.date || '',
        'مدة الحصة (بالساعات)': session.durationHours,
        'المادة الدراسية': session.subject || '',
        'الموضوع / الشرح': session.topic || '',
        'ملاحظات المعلم': session.notes || '',
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "تقرير كشف الحصص المخصص");
    XLSX.writeFile(workbook, `كشف_الحصص_المخصص_الأبعاد_والمقاييس_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportCustomReportToPDF = () => {
    const approvedSessions = filteredCustomSessions;
    const totalHours = approvedSessions.reduce((sum, s) => sum + s.durationHours, 0);
    
    let teacherNameFilter = 'جميع المعلمين بالأكاديمية';
    if (customTeacherFilter !== 'all') {
      const selectedT = teachers.find(t => t.id === customTeacherFilter);
      if (selectedT) teacherNameFilter = selectedT.name;
    }

    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>كشف الحصص التفاعلي - أكاديمية التفوق</title>
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
      width: 33.33%;
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
        <div class="brand-sub">تقرير كشف حصص ونشاط المنصة الأكاديمي المخصص</div>
      </td>
      <td style="border:none; padding:0; text-align:left; vertical-align:middle; font-size:11px; color:#64748b; font-weight:bold;">
        تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}
      </td>
    </tr>
  </table>

  <div class="doc-title">تقرير كشف الحصص واللقاءات التعليمية المختار الأبعاد</div>

  <div class="grid-info">
    <div class="info-row">
      <div class="info-col">
        <div class="info-card">
          <div class="info-label">المعلم المفلتر حالياً</div>
          <div class="info-val">${teacherNameFilter}</div>
        </div>
      </div>
      <div class="info-col">
        <div class="info-card">
          <div class="info-label">فترة تاريخ بداية الكشف</div>
          <div class="info-val">${customStartDate || 'من تاريخ بدء التشغيل بالنظام'}</div>
        </div>
      </div>
      <div class="info-col">
        <div class="info-card">
          <div class="info-label">فترة تاريخ نهاية الكشف</div>
          <div class="info-val">${customEndDate || 'إلى اللحظة الحالية'}</div>
        </div>
      </div>
    </div>
  </div>

  <div class="grid-info" style="margin-top:-10px; margin-bottom: 25px;">
    <div class="info-row">
      <div class="info-col">
        <div class="info-card" style="background:#eef2f6; border-color:#cbd5e1">
          <div class="info-label" style="color:#091e36; font-weight:bold;">إجمالي سجلات الحصص المنجزة</div>
          <div class="info-val" style="font-size:14px; color:#0d365a;">${approvedSessions.length} حركة لقاء مكتمل</div>
        </div>
      </div>
      <div class="info-col">
        <div class="info-card" style="background:#edfcf7; border-color:#a7f3d0">
          <div class="info-label" style="color:#047857; font-weight:bold;">إجمالي عدد الساعات المستهلكة</div>
          <div class="info-val" style="font-size:14px; color:#047857;">${totalHours.toFixed(1)} ساعة تدريسية</div>
        </div>
      </div>
      <div class="info-col">
        <div class="info-card">
          <div class="info-label">حالة التقارير</div>
          <div class="info-val" style="color:#2563eb;">معتمد ومستخرج للأغراض الحسابية</div>
        </div>
      </div>
    </div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 25%">اسم الطالب</th>
        <th style="width: 25%">المعلم المربوط</th>
        <th style="width: 15%">تاريخ الحصة</th>
        <th style="width: 15%">مدة الحصة بالعقد</th>
        <th style="width: 20%">المادة والمساق</th>
      </tr>
    </thead>
    <tbody>
      ${approvedSessions.length === 0 ? `
        <tr>
          <td colSpan="5" style="text-align: center; color: #64748b;">لا توجد أي حصص تدريسية مطابقة لمعايير الفلترة الزمنية والأبوية المدونة</td>
        </tr>
      ` : approvedSessions.map(session => {
        const studentObj = students.find(s => s.id === session.studentId);
        const teacherObj = teachers.find(t => t.id === session.teacherId);
        return `
          <tr>
            <td><strong>${studentObj?.name || 'طالب محذوف / مجهول'}</strong></td>
            <td>الأستاذ/ ${teacherObj?.name || 'معلم غير معروف'}</td>
            <td style="font-family: monospace;">${session.date ? session.date : '-'}</td>
            <td style="font-family: monospace; font-weight:700;">${session.durationHours} ساعة</td>
            <td>${session.subject || 'مادة عامة'}</td>
          </tr>
        `;
      }).join('')}
    </tbody>
    ${approvedSessions.length > 0 ? `
    <tfoot>
      <tr style="background: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1;">
        <td colspan="3" style="text-align: right; font-weight: 800; padding: 10px; font-size: 13px;">مجموع الساعات الكلي لجميع الحصص المسجلة (${approvedSessions.length} حصة):</td>
        <td style="font-weight: 900; color: #1d4ed8; padding: 10px; font-size: 14px; background: #e0f2fe; text-align: center; font-family: monospace;">${totalHours.toFixed(1)} ساعة</td>
        <td style="text-align: center; color: #64748b; font-size: 11px;">معتمد ومطابق</td>
      </tr>
    </tfoot>
    ` : ''}
  </table>

  <div class="signatures" style="margin-top: 60px;">
    <div class="sig-col">
      <div class="sig-line">توقيع مسؤول التسجيل والأبعاد</div>
    </div>
    <div class="sig-col">
      <div class="sig-line">تدقيق ومصادقة الحسابات العامة</div>
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

  // Comprehensive Real-time Balance Risk Calculations (Critical vs. Approaching)
  const allStudentAlerts = useMemo(() => {
    const approvedSessions = sessions.filter(s => s.approved !== false);
    
    return sortedStudents.map(student => {
      const studentSessions = approvedSessions.filter(s => s.studentId === student.id);
      const studentCredits = credits.filter(c => c.studentId === student.id);

      const totalSpent = studentSessions.reduce((sum, s) => {
        if (s.customFee !== undefined) return sum + s.customFee;
        const teacher = teachers.find(t => t.id === s.teacherId);
        const rate = getStudentDefaultHourlyRate(student, globalSettings, teacher);
        return sum + (s.durationHours * rate);
      }, 0);

      const totalToppedUp = studentCredits.reduce((sum, c) => sum + c.amount, 0);
      const balance = totalToppedUp - totalSpent;

      const studentThreshold = typeof student.lowBalanceThreshold === 'number'
        ? student.lowBalanceThreshold
        : alertThreshold;

      const isOpenBalance = !!student.isOpenBalance;
      const isCritical = !isOpenBalance && balance < studentThreshold;
      // Approaching state: balance is positive or non-critical, but within 60 ₪ above threshold
      const isApproaching = !isOpenBalance && !isCritical && balance < (studentThreshold + 60);

      return {
        id: student.id,
        name: student.name,
        email: student.email || '',
        phone: student.phone || '',
        balance,
        threshold: studentThreshold,
        totalSpent,
        totalToppedUp,
        isCritical,
        isApproaching,
        isOpenBalance,
        differenceToThreshold: balance - studentThreshold
      };
    });
  }, [students, sessions, credits, teachers, alertThreshold]);

  const openNotifier = (claim: any, defaultChannel: 'sms' | 'email' = 'sms') => {
    setActiveNotifier(claim);
    setNotifierChannel(defaultChannel);
    setNotifierProgress('idle');
    const contact = defaultChannel === 'sms' ? claim.phone : claim.email;
    setNotifierCustomContact(contact || (defaultChannel === 'sms' ? '0599000000' : 'parent@example.com'));
    
    const lessonsCount = Math.max(1, Math.round(Number(claim.balance) / (Number(claim.hourlyRate) || 60)));
    const balanceDisplay = Math.round(Number(claim.balance));
    const msg = `السلام عليكم ورحمة الله وبركاته، تحية طيبة من إدارة أكاديمية التفوق أون لاين.\n\nنود إبلاغكم بأن الرصيد المالي الحالي المتوفر في محفظة الطالب/ة (${claim.name}) هو (${balanceDisplay} ₪) (ما يعادل ${lessonsCount} حصة دراسية).\n\nارجو التواصل مع إدارة المنصة لتجديد الحزمة \n\nشاكرين ثقتكم الدائمة بأكاديميتنا ونتمنى لـ (${claim.name}) دوام التفوق والنجاح 🌸`;
    setNotifierMessage(msg);
  };

  const handleNotifierChannelChange = (channel: 'sms' | 'email') => {
    if (!activeNotifier) return;
    setNotifierChannel(channel);
    const contact = channel === 'sms' ? activeNotifier.phone : activeNotifier.email;
    setNotifierCustomContact(contact || (channel === 'sms' ? '0599000000' : 'parent@example.com'));
    const lessonsCount = Math.max(1, Math.round(Number(activeNotifier.balance) / (Number(activeNotifier.hourlyRate) || 60)));
    const balanceDisplay = Math.round(Number(activeNotifier.balance));
    const msg = `السلام عليكم ورحمة الله وبركاته، تحية طيبة من إدارة أكاديمية التفوق أون لاين.\n\nنود إبلاغكم بأن الرصيد المالي الحالي المتوفر في محفظة الطالب/ة (${activeNotifier.name}) هو (${balanceDisplay} ₪) (ما يعادل ${lessonsCount} حصة دراسية).\n\nارجو التواصل مع إدارة المنصة لتجديد الحزمة \n\nشاكرين ثقتكم الدائمة بأكاديميتنا ونتمنى لـ (${activeNotifier.name}) دوام التفوق والنجاح 🌸`;
    setNotifierMessage(msg);
  };

  const executeSendNotification = () => {
    if (!activeNotifier) return;
    setNotifierProgress('sending');
    setTimeout(() => {
      setNotifierProgress('success');
      setSentAlertNotification(prev => [...prev, `${activeNotifier.name}-${notifierChannel}`]);
      setAlertStatusMessage(`🚀 تم الإرسال بنجاح (عبر ${notifierChannel === 'sms' ? 'رسالة نصية SMS' : 'بريد إلكتروني'}): الموجه لولي أمر الطالب ${activeNotifier.name}`);
      setTimeout(() => {
        setAlertStatusMessage(null);
      }, 5000);
    }, 1800);
  };

  const criticalAlerts = useMemo(() => allStudentAlerts.filter(s => s.isCritical), [allStudentAlerts]);
  const approachingAlerts = useMemo(() => allStudentAlerts.filter(s => s.isApproaching), [allStudentAlerts]);

  // Triggers automatic warning alert to direct manager's attention under UI when loaded
  useEffect(() => {
    if (!isLoading && (criticalAlerts.length > 0 || approachingAlerts.length > 0)) {
      setToastAlert(`🚨 تنبيه تلقائي فوري للمدير: تم رصد ${criticalAlerts.length} طالب برصيد حرج منخفض، و ${approachingAlerts.length} طالب توشك أرصدتهم لتفوق عتبة الأمان!`);
      const timer = setTimeout(() => {
        setToastAlert(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, criticalAlerts.length, approachingAlerts.length]);

  const handleAutoRemind = (studentName: string) => {
    if (sentAlertNotification.includes(studentName)) return;
    setSentAlertNotification(prev => [...prev, studentName]);
    setAlertStatusMessage(`تم تفعيل إرسال إشعار تلقائي ذكي لـ ( ${studentName} ) لتنبيهه بالتحصيل وإعادة الشحن! 💬✉️`);
    setTimeout(() => {
      setAlertStatusMessage(null);
    }, 4500);
  };

  // Grid Layout State (Used primarily on statistical dashboards)
  const defaultLayouts = {
    lg: [
      { i: 'hours', x: 0, y: 0, w: 3, h: 4 },
      { i: 'topups', x: 3, y: 0, w: 3, h: 4 },
      { i: 'payout', x: 6, y: 0, w: 3, h: 4 },
      { i: 'balances', x: 9, y: 0, w: 3, h: 4 },
      { i: 'margin', x: 0, y: 4, w: 4, h: 8 },
      { i: 'utilization', x: 4, y: 4, w: 4, h: 8 },
      { i: 'payout_status', x: 8, y: 4, w: 4, h: 8 },
      { i: 'time_series', x: 0, y: 12, w: 12, h: 10 },
      { i: 'teacher_list', x: 0, y: 22, w: 12, h: 12 },
    ]
  };

  const [layouts, setLayouts] = useState<any>(() => {
    const saved = localStorage.getItem('reports_layout');
    try {
      return saved ? JSON.parse(saved) : defaultLayouts;
    } catch {
      return defaultLayouts;
    }
  });

  const onLayoutChange = (currentLayout: any, allLayouts: any) => {
    const newLayouts = { lg: allLayouts.lg };
    setLayouts(newLayouts);
    localStorage.setItem('reports_layout', JSON.stringify(newLayouts));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tSnap, sSnap, stSnap, pSnap, cSnap, gSnap, rSnap, expSnap, assSnap, examSnap] = await Promise.all([
        getDocs(collection(db, 'teachers')),
        getDocs(collection(db, 'sessions')),
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'payments')),
        getDocs(collection(db, 'studentCredits')),
        getDocs(collection(db, 'groupCourses')),
        getDocs(collection(db, 'scheduledReports')),
        getDocs(collection(db, 'expenses')),
        getDocs(collection(db, 'assignments')),
        getDocs(collection(db, 'examResults')).catch(() => ({ docs: [] } as any))
      ]);

      setTeachers(tSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher)));
      setSessions(sSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Session)));
      setStudents(stSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
      setPayments(pSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
      setCredits(cSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as StudentCredit)));
      setGroupCourses(gSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GroupCourse)));
      setScheduledReports(rSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setExpenses(expSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
      setAssignments(assSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      if (examSnap && examSnap.docs) {
        setExamResults(examSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'reports/all-data');
    } finally {
      setIsLoading(false);
    }
  };

  const logPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId || !newPaymentAmount) return;

    try {
      const paymentData = {
        teacherId: selectedTeacherId,
        amount: parseFloat(newPaymentAmount),
        date: newPaymentDate,
      };
      const docRef = await addDoc(collection(db, 'payments'), paymentData);
      setPayments([...payments, { id: docRef.id, ...paymentData }]);
      setNewPaymentAmount('');
      setShowPaymentForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'payments');
    }
  };

  const handleOpenEditPayment = (payment: Payment) => {
    setEditingPayment(payment);
    setEditPayAmount(payment.amount !== undefined ? payment.amount : '');
    setEditPayDate(payment.date || '');
    setEditPayNote(payment.note || '');
    setIsEditPaymentModalOpen(true);
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment || !editPayAmount || Number(editPayAmount) <= 0 || !editPayDate) return;

    setIsSubmittingEditPayment(true);
    const path = 'payments';
    try {
      const pNote = editPayNote.trim() || 'صرف مستحقات المعلم';
      const paymentRef = doc(db, path, editingPayment.id);
      
      const teacherObj = teachers.find(t => t.id === editingPayment.teacherId);
      const teacherName = teacherObj?.name || 'معلم مجهول';
      
      await updateDoc(paymentRef, {
        amount: Number(editPayAmount),
        date: editPayDate,
        note: pNote
      });

      // Update local state is crucial! It automatically recalculates all figures instantly.
      setPayments(prev => prev.map(p => p.id === editingPayment.id ? { ...p, amount: Number(editPayAmount), date: editPayDate, note: pNote } : p));
      
      setEditPaymentSuccess(true);
      setTimeout(() => {
        setEditPaymentSuccess(false);
        setIsEditPaymentModalOpen(false);
        setEditingPayment(null);
        setEditPayAmount('');
        setEditPayNote('');
        setEditPayDate('');
      }, 1500);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      setIsSubmittingEditPayment(false);
    }
  };

  const handleDeletePayment = (paymentId: string) => {
    setDeleteConfirm({ id: paymentId, type: 'payment' });
  };

  const executeDeletePayment = async (paymentId: string) => {
    if (!paymentId) return;
    const path = `payments/${paymentId}`;
    try {
      const originalPayment = payments.find(p => p.id === paymentId);
      const amount = originalPayment ? originalPayment.amount : 0;
      const teacherObj = originalPayment ? teachers.find(t => t.id === originalPayment.teacherId) : null;
      const teacherName = teacherObj?.name || 'معلم مجهول';

      await deleteDoc(doc(db, 'payments', paymentId));

      try {
        const { logActivity } = await import('../lib/activityLogger');
        await logActivity({
          actionType: 'PAYMENT_DELETE',
          actionName: 'حذف دفعة معلم',
          details: `حذف الدفعة المالية للمدرس "${teacherName}" بقيمة: ₪${amount} (رقم الدفعة: ${paymentId})`
        });
      } catch (logErr) {
        console.error("Failed to log activity:", logErr);
      }

      setPayments(prev => prev.filter(p => p.id !== paymentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleArchivePayment = async (paymentId: string) => {
    try {
      const paymentRef = doc(db, 'payments', paymentId);
      await updateDoc(paymentRef, { archived: true });
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, archived: true } : p));
      try {
        const { logActivity } = await import('../lib/activityLogger');
        await logActivity({
          actionType: 'PAYMENT_ARCHIVE',
          actionName: 'أرشفة دفعة مالية',
          details: `تم أرشفة الدفعة المالية للمعلم (رقم الدفعة: ${paymentId}) لتنظيف الواجهة وحفظ السجلات.`
        });
      } catch (logErr) {
        console.error("Failed to log activity:", logErr);
      }
    } catch (error) {
       console.error("Error archiving payment:", error);
    }
  };

  const handleUnarchivePayment = async (paymentId: string) => {
    try {
      const paymentRef = doc(db, 'payments', paymentId);
      await updateDoc(paymentRef, { archived: false });
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, archived: false } : p));
      try {
        const { logActivity } = await import('../lib/activityLogger');
        await logActivity({
          actionType: 'PAYMENT_UNARCHIVE',
          actionName: 'استعادة دفعة مالية',
          details: `تم استعادة الدفعة المالية للمعلم من الأرشيف (رقم الدفعة: ${paymentId}).`
        });
      } catch (logErr) {
        console.error("Failed to log activity:", logErr);
      }
    } catch (error) {
       console.error("Error unarchiving payment:", error);
    }
  };

  // Data Aggregations
  const stats = useMemo(() => {
    const approvedSessions = filteredSessions.filter(s => s.approved !== false);
    const totalHours = approvedSessions.reduce((sum, s) => sum + s.durationHours, 0);
    const totalRevenue = approvedSessions.reduce((sum, s) => {
      if (isTrialSession(s)) return sum;
      if (s.customFee !== undefined) return sum + s.customFee;
      const rate = getStudentBillingRateForSession(s.studentId, s.teacherId, s);
      return sum + (s.durationHours * rate);
    }, 0);
    const totalCosts = approvedSessions.reduce((sum, s) => {
      if (isTrialSession(s)) return sum;
      if (s.customPayout !== undefined) return sum + s.customPayout;
      const rate = getTeacherPayoutRateForSession(s.studentId, s.teacherId, s);
      return sum + (s.durationHours * rate);
    }, 0);
    const totalPaid = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalTopUps = filteredCredits.reduce((sum, c) => sum + c.amount, 0);

    const payoutDue = totalCosts - totalPaid;
    const studentConsumedTotal = totalRevenue;
    const netStudentBalance = totalTopUps - studentConsumedTotal;

    // Time-series (last 30 days or custom period)
    let periodDays: string[] = [];
    if (dashboardStartDate && dashboardEndDate) {
      const start = new Date(dashboardStartDate);
      const end = new Date(dashboardEndDate);
      const dayDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const limitDays = Math.min(dayDiff, 90); // Protect against UI crash/freeze of infinite layouts
      for (let i = 0; i <= limitDays; i++) {
        const next = new Date(start);
        next.setDate(start.getDate() + i);
        periodDays.push(next.toISOString().split('T')[0]);
      }
    } else {
      periodDays = Array.from({ length: 30 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        return d.toISOString().split('T')[0];
      });
    }

    const timeSeriesData = periodDays.map(date => {
      const daySessions = approvedSessions.filter(s => s.date === date);
      const dayRevenue = daySessions.reduce((sum, s) => {
        if (isTrialSession(s)) return sum;
        if (s.customFee !== undefined) return sum + s.customFee;
        const rate = getStudentBillingRateForSession(s.studentId, s.teacherId, s);
        return sum + (s.durationHours * rate);
      }, 0);
      const dayCosts = daySessions.reduce((sum, s) => {
        if (isTrialSession(s)) return sum;
        if (s.customPayout !== undefined) return sum + s.customPayout;
        const rate = getTeacherPayoutRateForSession(s.studentId, s.teacherId, s);
        return sum + (s.durationHours * rate);
      }, 0);
      const dayHours = daySessions.reduce((sum, s) => sum + s.durationHours, 0);

      return { date, revenue: dayRevenue, costs: dayCosts, margin: dayRevenue - dayCosts, hours: dayHours };
    });

    const last7Days = periodDays.slice(-7);
    const hoursSparkline = last7Days.map(date => ({
      val: approvedSessions.filter(s => s.date === date).reduce((sum, s) => sum + s.durationHours, 0)
    }));

    // Utilization
    const utilizationData = teachers.map(t => ({
      name: t.name,
      hours: approvedSessions.filter(s => s.teacherId === t.id).reduce((sum, s) => sum + s.durationHours, 0)
    })).sort((a, b) => b.hours - a.hours).slice(0, 8);

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const financingExpenses = filteredExpenses.filter(e => e.category === 'funding' || e.category === 'مصروفات تمويل').reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const otherExpenses = filteredExpenses.filter(e => e.category === 'other' || e.category === 'مصروفات أخرى').reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const netProfit = totalRevenue - totalCosts - totalExpenses;

    return {
      totalHours,
      totalRevenue,
      totalCosts,
      margin: totalRevenue - totalCosts,
      payoutDue,
      netStudentBalance,
      totalTopUps,
      totalPaid,
      timeSeriesData,
      utilizationData,
      hoursSparkline,
      totalExpenses,
      financingExpenses,
      otherExpenses,
      netProfit
    };
  }, [teachers, students, filteredSessions, filteredPayments, filteredCredits, filteredExpenses, dashboardStartDate, dashboardEndDate]);

  // Preparatory math for the monthly performance of teachers
  const monthlyPerfChartData = useMemo(() => {
    const approvedSessions = filteredSessions.filter(s => s.approved !== false && s.date);
    
    // Group sessions by month (YYYY-MM) first
    const monthMap: Record<string, { monthKey: string; monthLabel: string; totalHours: number; totalPayout: number; totalRevenue: number; teachersMap: Record<string, { hours: number; payout: number; revenue: number }> }> = {};
    
    const monthsAr = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    
    approvedSessions.forEach(s => {
      const dateStr = s.date!;
      const parts = dateStr.split('-');
      if (parts.length < 2) return;
      const monthKey = parts[0] + '-' + parts[1]; // e.g. "2026-05"
      const monthNum = parseInt(parts[1], 10);
      const year = parts[0];
      const monthLabel = `${monthsAr[monthNum - 1]} ${year}`;
      
      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          monthKey,
          monthLabel,
          totalHours: 0,
          totalPayout: 0,
          totalRevenue: 0,
          teachersMap: {}
        };
      }
      
      const teacherId = s.teacherId;
      if (!monthMap[monthKey].teachersMap[teacherId]) {
        monthMap[monthKey].teachersMap[teacherId] = { hours: 0, payout: 0, revenue: 0 };
      }
      
      // Calculate individual payouts and fees per session
      let payout = 0;
      if (s.customPayout !== undefined) {
        payout = s.customPayout;
      } else {
        const rate = getTeacherPayoutRateForSession(s.studentId, teacherId);
        payout = s.durationHours * rate;
      }
      
      let revenue = 0;
      if (s.customFee !== undefined) {
        revenue = s.customFee;
      } else {
        const rate = getStudentBillingRateForSession(s.studentId, teacherId);
        revenue = s.durationHours * rate;
      }
      
      monthMap[monthKey].totalHours += s.durationHours;
      monthMap[monthKey].totalPayout += payout;
      monthMap[monthKey].totalRevenue += revenue;
      
      monthMap[monthKey].teachersMap[teacherId].hours += s.durationHours;
      monthMap[monthKey].teachersMap[teacherId].payout += payout;
      monthMap[monthKey].teachersMap[teacherId].revenue += revenue;
    });
    
    // Sort keys chronologically
    const sortedKeys = Object.keys(monthMap).sort();

    // Group expenses by month (YYYY-MM)
    const expensesByMonth: Record<string, number> = {};
    expenses.forEach(e => {
      if (e.date) {
        const parts = e.date.split('-');
        if (parts.length >= 2) {
          const monthKey = `${parts[0]}-${parts[1]}`;
          expensesByMonth[monthKey] = (expensesByMonth[monthKey] || 0) + Number(e.amount || 0);
        }
      }
    });
    
    // Format data for chart depending on selected teacher
    const formattedData = sortedKeys.map(key => {
      const item = monthMap[key];
      const monthExpense = expensesByMonth[key] || 0;
      if (perfTeacherId === 'all') {
        const profit = item.totalRevenue - item.totalPayout - monthExpense;
        return {
          name: item.monthLabel,
          hours: parseFloat(item.totalHours.toFixed(1)),
          payout: parseFloat(item.totalPayout.toFixed(0)),
          revenue: parseFloat(item.totalRevenue.toFixed(0)),
          profit: parseFloat(profit.toFixed(0))
        };
      } else {
        const teacherData = item.teachersMap[perfTeacherId] || { hours: 0, payout: 0, revenue: 0 };
        const profit = teacherData.revenue - teacherData.payout;
        return {
          name: item.monthLabel,
          hours: parseFloat(teacherData.hours.toFixed(1)),
          payout: parseFloat(teacherData.payout.toFixed(0)),
          revenue: parseFloat(teacherData.revenue.toFixed(0)),
          profit: parseFloat(profit.toFixed(0))
        };
      }
    });
    
    return formattedData;
  }, [filteredSessions, teachers, students, perfTeacherId, expenses]);

  // Dynamic Real-time Calculations for Most Profitable Subject & Top Performing Teacher based on sessions
  const topHighlights = useMemo(() => {
    const sourceSessions = (filteredSessions && filteredSessions.length > 0) ? filteredSessions : sessions;
    const approvedSessions = sourceSessions.filter(s => s.approved !== false);

    // Grouping for Subjects
    const subjectMap: Record<string, {
      name: string;
      revenue: number;
      costs: number;
      netProfit: number;
      hours: number;
      sessionsCount: number;
    }> = {};

    // Grouping for Teachers
    const teacherMap: Record<string, {
      id: string;
      name: string;
      specialty: string;
      hours: number;
      sessionsCount: number;
      revenue: number;
      costs: number;
    }> = {};

    approvedSessions.forEach(s => {
      const dur = Number(s.durationHours) || 1;
      const subj = (s.subject || 'مادة عامة').trim();
      const teacherId = s.teacherId;

      let fee = 0;
      if (!isTrialSession(s)) {
        if (s.customFee !== undefined) {
          fee = s.customFee;
        } else {
          const rate = getStudentBillingRateForSession(s.studentId, s.teacherId, s);
          fee = dur * rate;
        }
      }

      let cost = 0;
      if (!isTrialSession(s)) {
        if (s.customPayout !== undefined) {
          cost = s.customPayout;
        } else {
          const rate = getTeacherPayoutRateForSession(s.studentId, s.teacherId, s);
          cost = dur * rate;
        }
      }

      const profit = fee - cost;

      // Accumulate for Subject
      if (!subjectMap[subj]) {
        subjectMap[subj] = {
          name: subj,
          revenue: 0,
          costs: 0,
          netProfit: 0,
          hours: 0,
          sessionsCount: 0
        };
      }
      subjectMap[subj].revenue += fee;
      subjectMap[subj].costs += cost;
      subjectMap[subj].netProfit += profit;
      subjectMap[subj].hours += dur;
      subjectMap[subj].sessionsCount += 1;

      // Accumulate for Teacher
      if (teacherId) {
        if (!teacherMap[teacherId]) {
          const tObj = teachers.find(t => t.id === teacherId);
          teacherMap[teacherId] = {
            id: teacherId,
            name: tObj?.name || 'معلم غير محدد',
            specialty: tObj?.specialty || tObj?.subject || 'كادر تدريسي',
            hours: 0,
            sessionsCount: 0,
            revenue: 0,
            costs: 0
          };
        }
        teacherMap[teacherId].hours += dur;
        teacherMap[teacherId].sessionsCount += 1;
        teacherMap[teacherId].revenue += fee;
        teacherMap[teacherId].costs += cost;
      }
    });

    const subjects = Object.values(subjectMap);
    subjects.sort((a, b) => (b.netProfit - a.netProfit) || (b.revenue - a.revenue) || (b.hours - a.hours));
    const topSubject = subjects.length > 0 ? subjects[0] : null;

    const teachersRanked = Object.values(teacherMap);
    teachersRanked.sort((a, b) => (b.hours - a.hours) || (b.sessionsCount - a.sessionsCount) || (b.revenue - a.revenue));
    const topTeacher = teachersRanked.length > 0 ? teachersRanked[0] : null;

    return {
      topSubject,
      topTeacher,
      totalSessionsAnalyzed: approvedSessions.length,
      isFiltered: Boolean(dashboardStartDate || dashboardEndDate || (selectedSubjectFilter && selectedSubjectFilter !== 'all'))
    };
  }, [sessions, filteredSessions, teachers, students, assignments, globalSettings, dashboardStartDate, dashboardEndDate, selectedSubjectFilter]);

  // Table Setup
  const teacherTableData = useMemo(() => {
    const approvedSessions = filteredSessions.filter(s => s.approved !== false);
    return teachers.map(teacher => {
      const teacherSessions = approvedSessions.filter(s => s.teacherId === teacher.id);
      const teacherPayments = filteredPayments.filter(p => p.teacherId === teacher.id);
      const totalHours = teacherSessions.reduce((sum, s) => sum + s.durationHours, 0);
      const earned = teacherSessions.reduce((sum, s) => {
        if (s.customPayout !== undefined) return sum + s.customPayout;
        const rate = getTeacherPayoutRateForSession(s.studentId, teacher.id);
        return sum + (s.durationHours * rate);
      }, 0);
      const paid = teacherPayments.reduce((sum, p) => sum + p.amount, 0);
      const balance = earned - paid;
      
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dt = d.toISOString().split('T')[0];
        return { val: teacherSessions.filter(s => s.date === dt).reduce((sum, s) => sum + s.durationHours, 0) };
      });

      return {
        id: teacher.id,
        name: teacher.name,
        hours: totalHours,
        earned,
        paid,
        balance,
        sparkline: last7Days,
        status: balance > 50 ? 'مستحق' : balance < -50 ? 'مدفوع مقدمًا' : 'مسوى'
      };
    });
  }, [teachers, filteredSessions, filteredPayments]);

  const columns = useMemo(() => [
    columnHelper.accessor('name', {
      header: 'اسم المعلم المستقطب',
      cell: info => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">
            {info.getValue().charAt(0)}
          </div>
          <span className="font-bold text-slate-800 truncate">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('hours', {
      header: 'ساعات العمل',
      cell: info => <span className="font-bold text-xs">{info.getValue()} ساعة</span>,
    }),
    columnHelper.accessor('balance', {
      header: 'مستحقات معلقة للمركز',
      cell: info => (
        <span className={`font-bold text-xs ${info.getValue() > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
          ₪{info.getValue().toFixed(0)}
        </span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'الحالة المحاسبية',
      cell: info => {
        const status = info.getValue();
        return (
          <span className={`px-2.5 py-0.5 rounded text-[9px] font-black border ${
            status === 'مستحق' ? 'bg-rose-50 border-rose-100 text-rose-600' : 
            status === 'مدفوع مقدمًا' ? 'bg-amber-50 border-amber-100 text-amber-600' : 
            'bg-emerald-50 border-emerald-100 text-emerald-600'
          }`}>
            {status}
          </span>
        );
      },
    }),
    columnHelper.accessor('id', {
      header: 'إجراءات ومقاصة',
      cell: info => {
        const teacherId = info.getValue();
        const prevMonthsBalance = getTeacherPreviousMonthsBalance(teacherId);
        
        return (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSelectedTeacherId(teacherId)}
              className="p-1 px-3 text-[9px] font-black text-indigo-600 bg-indigo-50 border border-transparent rounded hover:bg-[#D4A33C] hover:text-slate-950 transition-all uppercase whitespace-nowrap"
            >
              كشف الفواتير والرواتب 
            </button>
            {prevMonthsBalance > 0 && (
              <button
                onClick={async () => {
                  if (confirm(`هل أنت متأكد من رغبتك في تسوية وتصفية ديون الأشهر السابقة للمعلم بقيمة ₪${prevMonthsBalance.toFixed(2)}؟`)) {
                    await handleSettleTeacherPreviousDues(teacherId);
                  }
                }}
                className="p-1 px-3 text-[9px] font-black text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-100 rounded transition-all whitespace-nowrap"
              >
                تصفية الديون السابقة (₪{prevMonthsBalance.toFixed(0)}) 💸
              </button>
            )}
          </div>
        );
      },
      enableSorting: false,
    }),
  ], []);

  const table = useReactTable({
    data: teacherTableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      globalFilter: searchQuery,
    },
    onGlobalFilterChange: setSearchQuery,
  });

  const handleExportAllFinancialToExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // 1. Teachers Ledger Sheet
      const teachersSheetData = teacherTableData.map(item => ({
        'اسم المعلم': item.name,
        'ساعات العمل الكلية': item.hours,
        'إجمالي المستحقات المرصودة (₪)': Number(item.earned.toFixed(2)),
        'إجمالي المبالغ المصروفة (₪)': Number(item.paid.toFixed(2)),
        'الرصيد المتبقي المستحق (₪)': Number(item.balance.toFixed(2)),
        'الحالة المحاسبية': item.status
      }));
      const worksheet1 = XLSX.utils.json_to_sheet(teachersSheetData);
      autoFitColumnWidths(worksheet1, teachersSheetData);
      worksheet1['!pageSetup'] = { fitToPage: true, fitToWidth: 1, fitToHeight: 1 };
      worksheet1['!views'] = [{ showGridLines: true }];
      XLSX.utils.book_append_sheet(workbook, worksheet1, "رواتب ومستحقات المعلمين");

      // 2. Student Balances Sheet
      const studentsSheetData = allStudentAlerts.map(item => ({
        'اسم الطالب': item.name,
        'البريد الإلكتروني': item.email || 'غير متوفر',
        'رقم الهاتف الجوال': item.phone || 'غير متوفر',
        'إجمالي شحن المحفظة (₪)': Number(item.totalToppedUp.toFixed(2)),
        'إجمالي المستهلك بالحصص (₪)': Number(item.totalSpent.toFixed(2)),
        'الرصيد المتبقي الحر (₪)': Number(item.balance.toFixed(2)),
        'حد الأمان الأدنى (₪)': item.threshold,
        'الحالة المالية للمحفظة': item.isOpenBalance
          ? 'رصيد مفتوح من المدير 🔓'
          : item.isCritical 
          ? 'رصيد حرج (تحت الأمان) 🚨' 
          : item.isApproaching 
          ? 'رصيد منخفض تحذيري ⚠️' 
          : 'رصيد آمن ومستقر ✅'
      }));
      const worksheet2 = XLSX.utils.json_to_sheet(studentsSheetData);
      autoFitColumnWidths(worksheet2, studentsSheetData);
      worksheet2['!pageSetup'] = { fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
      worksheet2['!views'] = [{ showGridLines: true }];
      XLSX.utils.book_append_sheet(workbook, worksheet2, "أرصدة ومحافظ الطلاب");

      // 3. Teacher Payments Sheet
      const PaymentsSheetData = payments.map(p => {
        const teacherObj = teachers.find(t => t.id === p.teacherId);
        return {
          'اسم المعلم': teacherObj ? teacherObj.name : 'معلم محذوف/غير معروف',
          'قيمة الدفعة المصروفة (₪)': Number(p.amount || 0),
          'تاريخ الدفعة': p.date || 'غير محدد',
          'المرجع / السند': p.reference || 'لا يوجد',
          'ملاحظات الصرف': p.note || 'صرف مستحقات المعلم'
        };
      }).sort((a, b) => {
        const dateA = a['تاريخ الدفعة'] || '';
        const dateB = b['تاريخ الدفعة'] || '';
        return dateB.localeCompare(dateA);
      });
      const worksheet3 = XLSX.utils.json_to_sheet(PaymentsSheetData);
      autoFitColumnWidths(worksheet3, PaymentsSheetData);
      worksheet3['!pageSetup'] = { fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
      worksheet3['!views'] = [{ showGridLines: true }];
      XLSX.utils.book_append_sheet(workbook, worksheet3, "دفعات ورواتب المعلمين");

      // 4. Student Credit Sheet
      const CreditsSheetData = credits.map(c => {
        const studentObj = students.find(s => s.id === c.studentId);
        return {
          'اسم الطالب': studentObj ? studentObj.name : 'طالب محذوف/غير معروف',
          'قيمة شحن الرصيد (₪)': Number(c.amount || 0),
          'تاريخ الشحن': c.date || 'غير محدد',
          'طريقة الدفع': c.method || 'غير محددة',
          'رقم المرجع / الحوالة': c.reference || 'لا يوجد',
          'ملاحظات العمليات': c.note || 'لا يوجد ملاحظات'
        };
      }).sort((a, b) => {
        const dateA = a['تاريخ الشحن'] || '';
        const dateB = b['تاريخ الشحن'] || '';
        return dateB.localeCompare(dateA);
      });
      const worksheet4 = XLSX.utils.json_to_sheet(CreditsSheetData);
      autoFitColumnWidths(worksheet4, CreditsSheetData);
      worksheet4['!pageSetup'] = { fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
      worksheet4['!views'] = [{ showGridLines: true }];
      XLSX.utils.book_append_sheet(workbook, worksheet4, "شحن أرصدة الطلاب");

      // 5. Sessions & Margins Sheet
      const approvedSessions = sessions.filter(s => s.approved !== false);
      const SessionsSheetData = approvedSessions.map(session => {
        const teacherObj = teachers.find(t => t.id === session.teacherId);
        const studentObj = students.find(st => st.id === session.studentId);
        
        let studentFee = 0;
        if (session.customFee !== undefined) {
          studentFee = session.customFee;
        } else {
          const rate = getStudentBillingRateForSession(session.studentId, session.teacherId);
          studentFee = session.durationHours * rate;
        }

        let teacherPayout = 0;
        if (session.customPayout !== undefined) {
          teacherPayout = session.customPayout;
        } else {
          const rate = getTeacherPayoutRateForSession(session.studentId, session.teacherId);
          teacherPayout = session.durationHours * rate;
        }

        const netProfit = studentFee - teacherPayout;

        return {
          'المادة / المهارة': session.subject || 'مادة عامة',
          'اسم المعلم': teacherObj ? teacherObj.name : 'معلم غير معروف',
          'اسم الطالب': studentObj ? studentObj.name : 'طالب غير معروف',
          'عدد الساعات': session.durationHours,
          'تكلفة الحصة على الطالب (₪)': Number(studentFee.toFixed(2)),
          'مستحقات المعلم عن الحصة (₪)': Number(teacherPayout.toFixed(2)),
          'صافي ربح الحصة للمركز (₪)': Number(netProfit.toFixed(2)),
          'تاريخ اللقاء': session.date || 'غير محدد',
          'ملاحظات اللقاء': session.notes || 'لا يوجد ملاحظات مدونة'
        };
      }).sort((a, b) => {
        const dateA = a['تاريخ اللقاء'] || '';
        const dateB = b['تاريخ اللقاء'] || '';
        return dateB.localeCompare(dateA);
      });
      
      const worksheet5 = XLSX.utils.json_to_sheet(SessionsSheetData);
      autoFitColumnWidths(worksheet5, SessionsSheetData);
      worksheet5['!pageSetup'] = { fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
      worksheet5['!views'] = [{ showGridLines: true }];
      XLSX.utils.book_append_sheet(workbook, worksheet5, "أرصدة الدروس وصافي الأرباح");

      XLSX.writeFile(workbook, `التقرير_المالي_المتكامل_المدقق_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error("Error creating comprehensive export:", error);
      alert("حدث خطأ أثناء إعداد وتصدير كشف التقارير المالية المتكامل.");
    }
  };

  // Dedicated PDF Exporter for the Current Financial Dashboard (Center Income & Student Balances) using pdf-lib
  const handleExportFinancialDashboardPDF = async () => {
    if (isLoading) {
      alert("يرجى الانتظار حتى اكتمال تحميل البيانات المالية.");
      return;
    }

    setIsExportingFinancialPDF(true);

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '840px';
    container.style.minHeight = '1188px';
    container.style.opacity = '1';
    container.style.visibility = 'visible';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-999999';
    container.style.background = '#ffffff';
    container.style.padding = '28px';
    container.style.direction = 'rtl';
    container.style.boxSizing = 'border-box';
    container.style.fontFamily = "'Cairo', sans-serif, system-ui";

    const totalRev = Math.round(stats.totalRevenue || 0);
    const totalTeacherCost = Math.round(stats.totalCosts || 0);
    const totalOpExpense = Math.round(stats.totalExpenses || 0);
    const netCenterProfit = Math.round(stats.netProfit || (totalRev - totalTeacherCost - totalOpExpense));
    const profitMarginPct = totalRev > 0 ? ((netCenterProfit / totalRev) * 100).toFixed(1) : '0';
    const totalHours = (stats.totalHours || 0).toFixed(1);
    const totalTopUps = Math.round(stats.totalTopUps || 0);
    const totalTeacherPaid = Math.round(stats.totalPaid || 0);
    const teacherPayoutDue = Math.round(stats.payoutDue || (totalTeacherCost - totalTeacherPaid));

    // Student balance metrics
    const studentList = allStudentAlerts || [];
    const totalStudentsCount = studentList.length;
    const positiveBalancesTotal = Math.round(studentList.filter(s => (s.balance || 0) > 0).reduce((sum, s) => sum + s.balance, 0));
    const totalDebtAmount = Math.round(studentList.filter(s => (s.balance || 0) < 0).reduce((sum, s) => sum + Math.abs(s.balance), 0));
    const netStudentWallets = positiveBalancesTotal - totalDebtAmount;
    const criticalStudentsCount = studentList.filter(s => s.isCritical).length;

    const periodStr = dashboardStartDate && dashboardEndDate 
      ? `من ${dashboardStartDate} إلى ${dashboardEndDate}`
      : 'الفترة الشاملة الحالية';

    container.innerHTML = `
      <div style="direction: rtl; text-align: right; font-family: 'Cairo', sans-serif; color: #0f172a;">
        <!-- Header -->
        <div style="border-bottom: 3px double #0d365a; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h1 style="margin: 0; font-size: 24px; font-weight: 900; color: #0d365a;">أكاديمية التفوق التعليمية</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: 700; color: #d4a33c;">الإدارة المالية والمحاسبية العامة | تقرير المركز المالي وأرصدة الطلاب</p>
          </div>
          <div style="text-align: left; font-size: 11px; color: #475569; font-weight: 700; line-height: 1.6;">
            <div><strong>تاريخ التقرير:</strong> ${new Date().toLocaleDateString('ar-EG')}</div>
            <div><strong>وقت الاستخراج:</strong> ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
            <div><strong>نطاق الفترة:</strong> <span style="color: #0d365a; font-weight: 800;">${periodStr}</span></div>
            <div><strong>حالة الرصد:</strong> <span style="color: #059669; font-weight: 800;">كشف مالي معتمد ✔</span></div>
          </div>
        </div>

        <!-- Banner -->
        <div style="background: linear-gradient(135deg, #0d365a 0%, #1e3a8a 100%); color: #ffffff; padding: 14px 18px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h2 style="margin: 0; font-size: 17px; font-weight: 900;">التقرير الشامل لأداء المركز المالي وأرصدة ومستحقات الطلاب</h2>
            <p style="margin: 4px 0 0 0; font-size: 11px; opacity: 0.9;">بيان تدفقات إيرادات الحصص، مستحقات المعلمين، المصروفات، وصافي أرباح المنصة مع أرصدة المحافظ</p>
          </div>
          <div style="text-align: left;">
            <span style="background: #d4a33c; color: #0f172a; padding: 5px 12px; border-radius: 8px; font-size: 11px; font-weight: 900; display: inline-block;">
              ${totalStudentsCount} طالب مسجل
            </span>
          </div>
        </div>

        <!-- Section 1: KPI Summary Cards Grid -->
        <div style="margin-bottom: 18px;">
          <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 900; color: #0d365a; border-right: 4px solid #d4a33c; padding-right: 8px;">
            المؤشرات المالية الكلية للمركز (Financial Dashboard KPIs)
          </h3>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px;">
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; color: #64748b; margin-bottom: 4px;">إجمالي إيرادات ورسوم المركز</div>
              <div style="font-size: 18px; font-weight: 900; color: #0d365a;">₪${totalRev.toLocaleString()}</div>
              <div style="font-size: 9px; color: #64748b; margin-top: 3px;">من إجمالي ${totalHours} ساعة تدريس</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; color: #64748b; margin-bottom: 4px;">أتعاب ومستحقات المعلمين</div>
              <div style="font-size: 18px; font-weight: 900; color: #dc2626;">₪${totalTeacherCost.toLocaleString()}</div>
              <div style="font-size: 9px; color: #64748b; margin-top: 3px;">المسدد: ₪${totalTeacherPaid.toLocaleString()} | المستحق: ₪${teacherPayoutDue.toLocaleString()}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; color: #64748b; margin-bottom: 4px;">المصروفات التشغيلية والنفقات</div>
              <div style="font-size: 18px; font-weight: 900; color: #d97706;">₪${totalOpExpense.toLocaleString()}</div>
              <div style="font-size: 9px; color: #64748b; margin-top: 3px;">نفقات عامة وتشغيلية للمنصة</div>
            </div>
            <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 12px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; color: #166534; margin-bottom: 4px;">صافي ربح المركز (Net Profit)</div>
              <div style="font-size: 18px; font-weight: 900; color: ${netCenterProfit >= 0 ? '#15803d' : '#dc2626'};">₪${netCenterProfit.toLocaleString()}</div>
              <div style="font-size: 9px; font-weight: 800; color: #15803d; margin-top: 3px;">هامش ربح: ${profitMarginPct}%</div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; color: #64748b; margin-bottom: 3px;">إجمالي شحن ومقبوضات محافظ الطلاب</div>
              <div style="font-size: 16px; font-weight: 900; color: #0284c7;">₪${totalTopUps.toLocaleString()}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; color: #64748b; margin-bottom: 3px;">إجمالي أرصدة الطلاب الدائنة (السيولة)</div>
              <div style="font-size: 16px; font-weight: 900; color: #059669;">₪${positiveBalancesTotal.toLocaleString()}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; text-align: center;">
              <div style="font-size: 10px; font-weight: 800; color: #64748b; margin-bottom: 3px;">إجمالي الذمم والديون المستحقة على الطلاب</div>
              <div style="font-size: 16px; font-weight: 900; color: #e11d48;">₪${totalDebtAmount.toLocaleString()} (${criticalStudentsCount} طلاب بحاجة لسداد)</div>
            </div>
          </div>
        </div>

        <!-- Section 2: Center Income & Operating Statement Table -->
        <div style="margin-bottom: 24px;">
          <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 900; color: #0d365a; border-right: 4px solid #d4a33c; padding-right: 8px;">
            جدول بيان دخل المركز المالي والأرباح التشغيلية
          </h3>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #0d365a; color: #ffffff;">
                <th style="padding: 9px 10px; border: 1px solid #0d365a; text-align: right; width: 40%;">البند المالي والمحاسبي</th>
                <th style="padding: 9px 10px; border: 1px solid #0d365a; text-align: center; width: 25%;">القيمة الإجمالية (₪)</th>
                <th style="padding: 9px 10px; border: 1px solid #0d365a; text-align: right; width: 35%;">التوصيف والبيان</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background: #ffffff;">
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: 800; color: #0f172a;">إجمالي إيرادات الحصص والدورات التعليمية</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: 900; color: #0d365a;">₪${totalRev.toLocaleString()}</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; color: #64748b; font-size: 10px;">عائدات الحصص المنجزة المعتمدة (${totalHours} ساعة تدريس)</td>
              </tr>
              <tr style="background: #f8fafc;">
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: 800; color: #0f172a;">مستحقات وأجور الكادر التعليمي (التكاليف المباشرة)</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: 900; color: #dc2626;">(₪${totalTeacherCost.toLocaleString()})</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; color: #64748b; font-size: 10px;">أتعاب المعلمين المستحقة عن الحصص المنفذة</td>
              </tr>
              <tr style="background: #ffffff;">
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; font-weight: 800; color: #0f172a;">إجمالي المصروفات التشغيلية والتأسيسية</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: 900; color: #d97706;">(₪${totalOpExpense.toLocaleString()})</td>
                <td style="padding: 8px 10px; border: 1px solid #e2e8f0; color: #64748b; font-size: 10px;">نفقات المنصة، السيرفرات، الإعلانات والتطوير</td>
              </tr>
              <tr style="background: #ecfdf5; border-top: 2px solid #059669;">
                <td style="padding: 9px 10px; border: 1px solid #86efac; font-weight: 900; color: #166534; font-size: 12px;">صافي أرباح المركز التشغيلية الفائضة (Net Margin)</td>
                <td style="padding: 9px 10px; border: 1px solid #86efac; text-align: center; font-weight: 900; color: #15803d; font-size: 13px;">₪${netCenterProfit.toLocaleString()}</td>
                <td style="padding: 9px 10px; border: 1px solid #86efac; color: #166534; font-weight: 800; font-size: 10px;">نسبة الهامش الربحي: ${profitMarginPct}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Section 3: Student Balances Breakdown Table -->
        <div style="margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <h3 style="margin: 0; font-size: 13px; font-weight: 900; color: #0d365a; border-right: 4px solid #d4a33c; padding-right: 8px;">
              كشف تفصيلي بأرصدة ومستحقات وحسابات الطلاب
            </h3>
            <span style="font-size: 10px; font-weight: 800; color: #64748b;">
              إجمالي الطلاب المدرجين: ${studentList.length} طالب
            </span>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 10.5px;">
            <thead>
              <tr style="background: #0d365a; color: #ffffff;">
                <th style="padding: 8px 6px; border: 1px solid #0d365a; text-align: center; width: 5%;">#</th>
                <th style="padding: 8px 8px; border: 1px solid #0d365a; text-align: right; width: 24%;">اسم الطالب</th>
                <th style="padding: 8px 8px; border: 1px solid #0d365a; text-align: right; width: 15%;">رقم الهاتف</th>
                <th style="padding: 8px 8px; border: 1px solid #0d365a; text-align: center; width: 14%;">الشحن والدفعات (₪)</th>
                <th style="padding: 8px 8px; border: 1px solid #0d365a; text-align: center; width: 14%;">المستهلك بالحصص (₪)</th>
                <th style="padding: 8px 8px; border: 1px solid #0d365a; text-align: center; width: 14%;">الرصيد المتبقي (₪)</th>
                <th style="padding: 8px 8px; border: 1px solid #0d365a; text-align: center; width: 14%;">الحالة المالية</th>
              </tr>
            </thead>
            <tbody>
              ${studentList.length === 0 ? `
                <tr>
                  <td colspan="7" style="padding: 16px; text-align: center; color: #64748b; font-weight: 700;">لا توجد سجلات طلاب متاحة حالياً.</td>
                </tr>
              ` : studentList.map((st, idx) => {
                const bal = Math.round(st.balance || 0);
                const topped = Math.round(st.totalToppedUp || 0);
                const spent = Math.round(st.totalSpent || 0);
                const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
                const isDebt = bal < 0;
                const isCritical = st.isCritical;
                
                let statusBadge = '';
                if (st.isOpenBalance) {
                  statusBadge = '<span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 900; font-size: 9.5px; background: #ecfdf5; color: #047857;">رصيد مفتوح من المدير 🔓</span>';
                } else if (isDebt) {
                  statusBadge = '<span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 900; font-size: 9.5px; background: #fee2e2; color: #b91c1c;">مدين - ذمة مستحقة ⚠️</span>';
                } else if (isCritical) {
                  statusBadge = '<span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 900; font-size: 9.5px; background: #fef3c7; color: #b45309;">رصيد حرج منخفض ⏳</span>';
                } else {
                  statusBadge = '<span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 900; font-size: 9.5px; background: #ecfdf5; color: #047857;">مستقر وكافٍ ✅</span>';
                }

                return `
                  <tr style="background: ${bg};">
                    <td style="padding: 7px 6px; border: 1px solid #e2e8f0; text-align: center; font-weight: 700; color: #64748b;">${idx + 1}</td>
                    <td style="padding: 7px 8px; border: 1px solid #e2e8f0; font-weight: 800; color: #0f172a;">${st.name || 'طالب مجهول'}</td>
                    <td style="padding: 7px 8px; border: 1px solid #e2e8f0; font-family: monospace; font-size: 10px; color: #475569;">${st.phone || '-'}</td>
                    <td style="padding: 7px 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: 800; color: #0284c7;">₪${topped.toLocaleString()}</td>
                    <td style="padding: 7px 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: 800; color: #64748b;">₪${spent.toLocaleString()}</td>
                    <td style="padding: 7px 8px; border: 1px solid #e2e8f0; text-align: center;">
                      <span style="font-weight: 900; font-size: 11px; color: ${isDebt ? '#dc2626' : isCritical ? '#d97706' : '#15803d'};">
                        ${isDebt ? `(₪${Math.abs(bal).toLocaleString()})` : `₪${bal.toLocaleString()}`}
                      </span>
                    </td>
                    <td style="padding: 7px 8px; border: 1px solid #e2e8f0; text-align: center;">
                      ${statusBadge}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="background: #f1f5f9; font-weight: 900; border-top: 2px solid #0d365a;">
                <td colspan="3" style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: right; color: #0d365a;">
                  الإجماليات الكلية لأرصدة ومحافظ الطلاب:
                </td>
                <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center; color: #0284c7;">
                  ₪${Math.round(studentList.reduce((sum, s) => sum + (s.totalToppedUp || 0), 0)).toLocaleString()}
                </td>
                <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center; color: #64748b;">
                  ₪${Math.round(studentList.reduce((sum, s) => sum + (s.totalSpent || 0), 0)).toLocaleString()}
                </td>
                <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center; color: ${netStudentWallets >= 0 ? '#15803d' : '#dc2626'};">
                  ₪${netStudentWallets.toLocaleString()}
                </td>
                <td style="padding: 9px 8px; border: 1px solid #cbd5e1; text-align: center; font-size: 10px; color: #475569;">
                  صافي رصيد المحافظ
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Official Signatures Block -->
        <div style="display: flex; justify-content: space-between; margin-top: 36px; padding-top: 14px; border-top: 1px dashed #cbd5e1; text-align: center; font-size: 11px; font-weight: 800; color: #475569;">
          <div style="width: 30%;">
            <div>المحاسب المالي للمنصة</div>
            <div style="border-top: 1px dashed #94a3b8; width: 80%; margin: 35px auto 0;">التوقيع والاعتماد</div>
          </div>
          <div style="width: 30%;">
            <div>المشرف الأكاديمي والإداري</div>
            <div style="border-top: 1px dashed #94a3b8; width: 80%; margin: 35px auto 0;">التوقيع والاعتماد</div>
          </div>
          <div style="width: 30%;">
            <div>مدير المنصة: أ. زكي أبو علان</div>
            <div style="border-top: 1px dashed #94a3b8; width: 80%; margin: 35px auto 0;">الخاتم والاعتماد الرسمي</div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    try {
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

      const dataUrlToUint8Array = (dataUrl: string): Uint8Array => {
        const parts = dataUrl.split(',');
        const base64 = parts.length > 1 ? parts[1] : parts[0];
        const binary = atob(base64);
        const len = binary.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      };

      const pdfDoc = await PDFDocument.create();

      const imgDataUrl = canvas.toDataURL('image/png');
      const imgBytes = dataUrlToUint8Array(imgDataUrl);
      const embeddedImg = await pdfDoc.embedPng(imgBytes);

      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 20;
      const printableWidth = pageWidth - (margin * 2);
      const fullImgHeight = (canvas.height * printableWidth) / canvas.width;
      const maxPageContentHeight = pageHeight - (margin * 2);
      const totalPages = Math.max(1, Math.ceil(fullImgHeight / maxPageContentHeight));

      if (totalPages === 1) {
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        page.drawImage(embeddedImg, {
          x: margin,
          y: pageHeight - margin - fullImgHeight,
          width: printableWidth,
          height: fullImgHeight
        });
      } else {
        const sliceHeightPx = (maxPageContentHeight / printableWidth) * canvas.width;

        for (let p = 0; p < totalPages; p++) {
          const sy = p * sliceHeightPx;
          const sHeight = Math.min(sliceHeightPx, canvas.height - sy);
          if (sHeight <= 0) break;

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.round(sHeight);
          const pageCtx = pageCanvas.getContext('2d');
          if (pageCtx) {
            pageCtx.fillStyle = '#ffffff';
            pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            pageCtx.drawImage(
              canvas,
              0, sy, canvas.width, sHeight,
              0, 0, canvas.width, sHeight
            );
          }

          const pageDataUrl = pageCanvas.toDataURL('image/png');
          const pageBytes = dataUrlToUint8Array(pageDataUrl);
          const pageImg = await pdfDoc.embedPng(pageBytes);

          const page = pdfDoc.addPage([pageWidth, pageHeight]);
          const renderedHeight = (sHeight * printableWidth) / canvas.width;
          page.drawImage(pageImg, {
            x: margin,
            y: pageHeight - margin - renderedHeight,
            width: printableWidth,
            height: renderedHeight
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `تقرير_المركز_المالي_وأرصدة_الطلاب_أكاديمية_التفوق_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating financial dashboard PDF:", error);
      alert("حدث خطأ أثناء إنشاء وتصدير ملف الـ PDF للمركز المالي. يرجى المحاولة مجدداً.");
    } finally {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
      setIsExportingFinancialPDF(false);
    }
  };

  // Dedicated Excel Exporter for the Current Financial Dashboard using exceljs (.xlsx)
  const handleExportFinancialDashboardExcel = async () => {
    if (isLoading) {
      alert("يرجى الانتظار حتى اكتمال تحميل البيانات المالية.");
      return;
    }

    setIsExportingFinancialExcel(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'أكاديمية التفوق التعليمية';
      workbook.lastModifiedBy = 'مدير المنصة: أ. زكي أبو علان';
      workbook.created = new Date();
      workbook.modified = new Date();

      const totalRev = Math.round(stats.totalRevenue || 0);
      const totalTeacherCost = Math.round(stats.totalCosts || 0);
      const totalOpExpense = Math.round(stats.totalExpenses || 0);
      const netCenterProfit = Math.round(stats.netProfit || (totalRev - totalTeacherCost - totalOpExpense));
      const profitMarginPct = totalRev > 0 ? ((netCenterProfit / totalRev) * 100).toFixed(1) : '0';
      const totalHours = (stats.totalHours || 0).toFixed(1);
      const totalTopUps = Math.round(stats.totalTopUps || 0);
      const totalTeacherPaid = Math.round(stats.totalPaid || 0);
      const teacherPayoutDue = Math.round(stats.payoutDue || (totalTeacherCost - totalTeacherPaid));

      // Student balance metrics
      const studentList = allStudentAlerts || [];
      const positiveBalancesTotal = Math.round(studentList.filter(s => (s.balance || 0) > 0).reduce((sum, s) => sum + s.balance, 0));
      const totalDebtAmount = Math.round(studentList.filter(s => (s.balance || 0) < 0).reduce((sum, s) => sum + Math.abs(s.balance), 0));
      const netStudentWallets = positiveBalancesTotal - totalDebtAmount;
      const criticalStudentsCount = studentList.filter(s => s.isCritical).length;

      const periodStr = dashboardStartDate && dashboardEndDate 
        ? `من ${dashboardStartDate} إلى ${dashboardEndDate}`
        : 'الفترة الشاملة الحالية';

      // ==========================================
      // SHEET 1: ملخص المركز المالي والأرباح التشغيلية
      // ==========================================
      const sheet1 = workbook.addWorksheet('المركز المالي والأرباح', {
        views: [{ rightToLeft: true, showGridLines: true }]
      });

      sheet1.columns = [
        { width: 34 },
        { width: 24 },
        { width: 48 },
        { width: 18 }
      ];

      // Title Banner
      sheet1.mergeCells('A1:C1');
      const titleCell = sheet1.getCell('A1');
      titleCell.value = 'أكاديمية التفوق التعليمية - تقرير المركز المالي والأداء المحاسبي';
      titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D365A' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet1.getRow(1).height = 34;

      // Subtitle / Period Row
      sheet1.mergeCells('A2:C2');
      const subCell = sheet1.getCell('A2');
      subCell.value = `نطاق الفترة: ${periodStr} | تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-EG')} - ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`;
      subCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF475569' } };
      subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      subCell.alignment = { horizontal: 'center', vertical: 'middle' };
      sheet1.getRow(2).height = 24;

      sheet1.addRow([]); // Blank row

      // KPI Section Heading
      const kpiHeadRow = sheet1.addRow(['مؤشرات الأداء المالي الكلية للمركز (KPIs)', '', '']);
      sheet1.mergeCells(`A${kpiHeadRow.number}:C${kpiHeadRow.number}`);
      const kpiHeadCell = sheet1.getCell(`A${kpiHeadRow.number}`);
      kpiHeadCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0D365A' } };
      kpiHeadCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      kpiHeadCell.alignment = { horizontal: 'right', vertical: 'middle' };
      kpiHeadRow.height = 24;

      // Table Header for KPIs
      const kpiTableHeader = sheet1.addRow(['المؤشر المالي', 'القيمة المحققة', 'ملاحظات وتفاصيل المؤشر']);
      kpiTableHeader.eachCell(cell => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
      });
      kpiTableHeader.height = 24;

      const kpiData: [string, any, string][] = [
        ['إجمالي إيرادات ورسوم المركز (₪)', totalRev, `عائدات الساعات التدريسية المنجزة (${totalHours} ساعة)`],
        ['أتعاب ومستحقات المعلمين (₪)', totalTeacherCost, `المسدد فعلياً: ₪${totalTeacherPaid.toLocaleString()} | المتبقي للصرف: ₪${teacherPayoutDue.toLocaleString()}`],
        ['المصروفات التشغيلية والنفقات (₪)', totalOpExpense, 'النفقات العامة، السيرفرات والتشغيل'],
        ['صافي أرباح المركز (Net Profit) (₪)', netCenterProfit, `نسبة هامش الربح التشغيلي: ${profitMarginPct}%`],
        ['إجمالي ساعات التدريس المعتمدة', parseFloat(totalHours), 'مجموع الساعات الأكاديمية المنفذة'],
        ['إجمالي شحن ومقبوضات محافظ الطلاب (₪)', totalTopUps, 'دفعات أولياء الأمور الواردة'],
        ['إجمالي أرصدة الطلاب الدائنة (السيولة) (₪)', positiveBalancesTotal, 'سيولة الطلاب المتاحة للاستهلاك في الحصص'],
        ['إجمالي الذمم والديون المستحقة على الطلاب (₪)', totalDebtAmount, `${criticalStudentsCount} طلاب برصيد حرج/مدين يتطلب سداداً`]
      ];

      kpiData.forEach(item => {
        const row = sheet1.addRow(item);
        row.height = 22;
        row.getCell(1).font = { name: 'Arial', size: 10, bold: true };
        row.getCell(2).font = { name: 'Arial', size: 10, bold: true, color: { argb: typeof item[1] === 'number' && item[1] < 0 ? 'FFDC2626' : 'FF0F172A' } };
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(3).font = { name: 'Arial', size: 9, color: { argb: 'FF64748B' } };
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        });
      });

      sheet1.addRow([]); // Blank row

      // Center Income Statement Table Heading
      const incomeHeadRow = sheet1.addRow(['جدول بيان دخل المركز المالي والأرباح التشغيلية', '', '']);
      sheet1.mergeCells(`A${incomeHeadRow.number}:C${incomeHeadRow.number}`);
      const incomeHeadCell = sheet1.getCell(`A${incomeHeadRow.number}`);
      incomeHeadCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0D365A' } };
      incomeHeadCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      incomeHeadCell.alignment = { horizontal: 'right', vertical: 'middle' };
      incomeHeadRow.height = 24;

      const incomeHeader = sheet1.addRow(['البند المالي والمحاسبي', 'القيمة الإجمالية (₪)', 'التوصيف والبيان المحاسبي']);
      incomeHeader.eachCell(cell => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D365A' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
      });
      incomeHeader.height = 24;

      const statementRows: [string, number, string][] = [
        ['إجمالي إيرادات الحصص والدورات التعليمية', totalRev, `عائدات الحصص المنجزة المعتمدة (${totalHours} ساعة تدريس)`],
        ['مستحقات وأجور الكادر التعليمي (التكاليف المباشرة)', -totalTeacherCost, 'أتعاب المعلمين المستحقة عن الحصص المنفذة'],
        ['إجمالي المصروفات التشغيلية والتأسيسية', -totalOpExpense, 'نفقات المنصة، السيرفرات، الإعلانات والتطوير'],
        ['صافي أرباح المركز التشغيلية الفائضة (Net Margin)', netCenterProfit, `نسبة الهامش الربحي للمركز: ${profitMarginPct}%`]
      ];

      statementRows.forEach((item, idx) => {
        const row = sheet1.addRow(item);
        row.height = 23;
        const isNet = idx === 3;
        row.getCell(1).font = { name: 'Arial', size: isNet ? 11 : 10, bold: isNet, color: { argb: isNet ? 'FF166534' : 'FF0F172A' } };
        row.getCell(2).font = { name: 'Arial', size: isNet ? 11 : 10, bold: true, color: { argb: isNet ? 'FF15803D' : (typeof item[1] === 'number' && item[1] < 0 ? 'FFDC2626' : 'FF0F172A') } };
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(3).font = { name: 'Arial', size: 9, bold: isNet, color: { argb: isNet ? 'FF166534' : 'FF64748B' } };
        if (isNet) {
          row.eachCell(cell => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
            cell.border = {
              top: { style: 'medium', color: { argb: 'FF16A34A' } },
              bottom: { style: 'medium', color: { argb: 'FF16A34A' } },
              left: { style: 'thin', color: { argb: 'FF86EFAC' } },
              right: { style: 'thin', color: { argb: 'FF86EFAC' } }
            };
          });
        } else {
          row.eachCell(cell => {
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
              right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
            };
          });
        }
      });

      // ==========================================
      // SHEET 2: كشف أرصدة ومستحقات الطلاب
      // ==========================================
      const sheet2 = workbook.addWorksheet('أرصدة الطلاب', {
        views: [{ rightToLeft: true, showGridLines: true }]
      });

      sheet2.columns = [
        { header: '#', key: 'idx', width: 6 },
        { header: 'اسم الطالب', key: 'name', width: 26 },
        { header: 'رقم الهاتف', key: 'phone', width: 16 },
        { header: 'البريد الإلكتروني', key: 'email', width: 24 },
        { header: 'إجمالي الشحن والدفعات (₪)', key: 'topped', width: 20 },
        { header: 'إجمالي المستهلك بالحصص (₪)', key: 'spent', width: 20 },
        { header: 'رصيد المحفظة الحالي (₪)', key: 'balance', width: 20 },
        { header: 'حد الأمان الوقائي (₪)', key: 'threshold', width: 16 },
        { header: 'الحالة المالية للمحفظة', key: 'status', width: 26 }
      ];

      // Format Sheet 2 Header Row
      const stHeaderRow = sheet2.getRow(1);
      stHeaderRow.height = 28;
      stHeaderRow.eachCell(cell => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D365A' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF0D365A' } },
          bottom: { style: 'medium', color: { argb: 'FFD4A33C' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
      });

      studentList.forEach((st, idx) => {
        const bal = Math.round(st.balance || 0);
        const topped = Math.round(st.totalToppedUp || 0);
        const spent = Math.round(st.totalSpent || 0);
        const isDebt = bal < 0;
        const isCritical = st.isCritical;
        const statusText = st.isOpenBalance
          ? 'رصيد مفتوح من المدير 🔓'
          : isDebt 
          ? 'مدين - ذمة مستحقة ⚠️'
          : isCritical 
          ? 'رصيد حرج منخفض ⏳'
          : 'مستقر وكافٍ ✅';

        const row = sheet2.addRow({
          idx: idx + 1,
          name: st.name || 'طالب مجهول',
          phone: st.phone || '-',
          email: st.email || '-',
          topped,
          spent,
          balance: bal,
          threshold: st.threshold || 0,
          status: statusText
        });

        row.height = 21;
        row.getCell('idx').alignment = { horizontal: 'center' };
        row.getCell('name').font = { bold: true };
        row.getCell('phone').alignment = { horizontal: 'center' };
        row.getCell('topped').alignment = { horizontal: 'center' };
        row.getCell('spent').alignment = { horizontal: 'center' };
        row.getCell('balance').alignment = { horizontal: 'center' };
        row.getCell('balance').font = {
          bold: true,
          color: { argb: isDebt ? 'FFDC2626' : isCritical ? 'FFD97706' : 'FF15803D' }
        };
        row.getCell('threshold').alignment = { horizontal: 'center' };
        row.getCell('status').alignment = { horizontal: 'center' };

        // Soft highlight for debt or critical
        if (isDebt) {
          row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
          row.getCell('status').font = { bold: true, color: { argb: 'FFB91C1C' } };
        } else if (isCritical) {
          row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
          row.getCell('status').font = { bold: true, color: { argb: 'FFB45309' } };
        } else {
          row.getCell('status').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
          row.getCell('status').font = { bold: true, color: { argb: 'FF047857' } };
        }

        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        });
      });

      // Sheet 2 Summary Row
      const stTotalRow = sheet2.addRow({
        idx: '',
        name: 'الإجماليات الكلية لكافة الطلاب',
        phone: '',
        email: '',
        topped: Math.round(studentList.reduce((sum, s) => sum + (s.totalToppedUp || 0), 0)),
        spent: Math.round(studentList.reduce((sum, s) => sum + (s.totalSpent || 0), 0)),
        balance: netStudentWallets,
        threshold: '',
        status: `الصافي: ₪${netStudentWallets.toLocaleString()}`
      });
      stTotalRow.height = 26;
      stTotalRow.eachCell(cell => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0D365A' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        cell.border = {
          top: { style: 'double', color: { argb: 'FF0D365A' } },
          bottom: { style: 'medium', color: { argb: 'FF0D365A' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
      });

      // ==========================================
      // SHEET 3: مسير وأتعاب المعلمين
      // ==========================================
      const sheet3 = workbook.addWorksheet('رواتب ومستحقات المعلمين', {
        views: [{ rightToLeft: true, showGridLines: true }]
      });

      sheet3.columns = [
        { header: '#', key: 'idx', width: 6 },
        { header: 'اسم المعلم', key: 'name', width: 26 },
        { header: 'التخصص الأكاديمي', key: 'subject', width: 20 },
        { header: 'ساعات العمل المنفذة', key: 'hours', width: 18 },
        { header: 'إجمالي المستحقات (₪)', key: 'earned', width: 20 },
        { header: 'المبالغ المصروفة (₪)', key: 'paid', width: 20 },
        { header: 'الرصيد المتبقي المستحق (₪)', key: 'balance', width: 22 },
        { header: 'الحالة المحاسبية', key: 'status', width: 22 }
      ];

      const tHeaderRow = sheet3.getRow(1);
      tHeaderRow.height = 28;
      tHeaderRow.eachCell(cell => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D365A' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF0D365A' } },
          bottom: { style: 'medium', color: { argb: 'FFD4A33C' } },
          left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
        };
      });

      (teacherTableData || []).forEach((tItem, idx) => {
        const row = sheet3.addRow({
          idx: idx + 1,
          name: tItem.name || 'معلم',
          subject: tItem.subject || 'عام',
          hours: tItem.hours || 0,
          earned: Math.round(tItem.earned || 0),
          paid: Math.round(tItem.paid || 0),
          balance: Math.round(tItem.balance || 0),
          status: tItem.status || (tItem.balance > 0 ? 'مستحق للصرف' : 'مسدد بالكامل')
        });

        row.height = 21;
        row.getCell('idx').alignment = { horizontal: 'center' };
        row.getCell('name').font = { bold: true };
        row.getCell('hours').alignment = { horizontal: 'center' };
        row.getCell('earned').alignment = { horizontal: 'center' };
        row.getCell('paid').alignment = { horizontal: 'center' };
        row.getCell('balance').alignment = { horizontal: 'center' };
        row.getCell('balance').font = {
          bold: true,
          color: { argb: (tItem.balance || 0) > 0 ? 'FFDC2626' : 'FF15803D' }
        };
        row.getCell('status').alignment = { horizontal: 'center' };
        row.getCell('status').font = { bold: true };

        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        });
      });

      // Write buffer and download as .xlsx
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `تقرير_المركز_المالي_والأرصدة_أكاديمية_التفوق_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting financial dashboard with exceljs:", error);
      alert("حدث خطأ أثناء تصدير ملف Excel للمركز المالي. يرجى المحاولة مجدداً.");
    } finally {
      setIsExportingFinancialExcel(false);
    }
  };

  const autoFitColumnWidths = (worksheet: any, data: any[]) => {
    const maxLens: Record<string, number> = {};
    if (!data || data.length === 0) return;
    data.forEach(row => {
      Object.keys(row).forEach(key => {
        const val = String(row[key] ?? '');
        maxLens[key] = Math.max(maxLens[key] || 10, val.length + 4);
      });
    });
    worksheet["!cols"] = Object.keys(maxLens).map(key => ({ wch: maxLens[key] }));
  };

  if (isLoading) {
    return (
      <div className="py-40 flex flex-col items-center justify-center gap-4 text-center select-none" dir="rtl">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-[#D4A33C] rounded-full animate-spin" />
        <p className="text-xs font-black text-slate-400 animate-pulse">جاري تجميع وتجهيز كشوف الحسابات...</p>
      </div>
    );
  }

  const WidgetHeader = ({ title, icon: Icon, color }: { title: string, icon: any, color?: string }) => {
    const isMenuOpen = activeWidgetMenu === title;
    return (
      <div className="relative flex items-center justify-between mb-4 border-b border-slate-50 pb-2.5 drag-handle cursor-grab active:cursor-grabbing">
        <div className="flex items-center gap-2">
          <Icon size={14} className={color || "text-slate-400"} strokeWidth={1.5} />
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</h3>
        </div>
        <div className="relative">
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveWidgetMenu(isMenuOpen ? null : title);
            }}
            className="p-1 rounded-lg text-slate-300 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="خيارات إضافية"
          >
            <MoreHorizontal size={14} />
          </button>
          {isMenuOpen && (
            <div 
              onClick={(e) => e.stopPropagation()} 
              className="absolute left-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-right select-none animate-in fade-in zoom-in-95 duration-150"
            >
              <button
                type="button"
                onClick={() => {
                  window.print();
                  setActiveWidgetMenu(null);
                }}
                className="w-full px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>طباعة هذا القسم</span>
                <Printer size={12} className="text-slate-400" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setToastAlert(`تم تحديث ومزامنة بيانات مؤشر: ${title}`);
                  setActiveWidgetMenu(null);
                }}
                className="w-full px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>تحديث البيانات</span>
                <RotateCcw size={12} className="text-slate-400" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto text-slate-800" dir="rtl">
      {/* Floating Real-time Auto-Notification Alert Toast for Manager */}
      <AnimatePresence>
        {toastAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -40 }}
            className="fixed top-6 right-6 left-6 md:left-auto md:w-[480px] z-50 bg-slate-900 border border-slate-800 text-white p-5 rounded-2xl shadow-2xl flex items-start gap-4 text-right"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 shadow-md">
              <BellRing size={18} className="animate-bounce" />
            </div>
            <div className="flex-1 space-y-1">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-wide block">إشعار أمان الرصيد الذكي</span>
              <p className="text-xs font-bold leading-relaxed">{toastAlert}</p>
            </div>
            <button 
              onClick={() => setToastAlert(null)}
              className="text-slate-400 hover:text-white transition-colors text-xs font-extrabold cursor-pointer"
            >
              إغلاق ×
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Premium Dashboard Header & Interactive Tab Selector */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-slate-100 gap-6">
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>مركز التقارير والمراقبة المالية الشاملة</span>
            <span className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full font-black font-sans">v2.5 Pro</span>
          </h2>
          <p className="text-xs font-bold text-slate-400 mt-1">تحليلات الأداء، رصد السيولة المباشرة ومراقبة أرصدة الطلاب والتحصيل الذكي</p>
        </div>

        {/* Dynamic Controls */}
        <div className="flex items-center flex-wrap gap-3 w-full md:w-auto">
          {/* Global Date Range Picker */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-2xl shadow-xs text-xs font-bold font-sans hover:border-[#1A365D]/30 transition-all">
            <span className="text-slate-500 font-extrabold flex items-center gap-1.5">
              <Calendar size={13} className="text-indigo-600 shrink-0" />
              <span>فترة التقرير:</span>
            </span>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={dashboardStartDate}
                onChange={(e) => {
                  setDashboardStartDate(e.target.value);
                  setTimePeriodType('custom');
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[11px] font-mono text-slate-800 cursor-pointer outline-none focus:border-indigo-500"
                title="من تاريخ الكلي للوحة"
              />
              <span className="text-slate-400 font-normal px-0.5">إلى</span>
              <input
                type="date"
                value={dashboardEndDate}
                onChange={(e) => {
                  setDashboardEndDate(e.target.value);
                  setTimePeriodType('custom');
                }}
                className="bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-[11px] font-mono text-slate-800 cursor-pointer outline-none focus:border-indigo-500"
                title="إلى تاريخ الكلي للوحة"
              />
            </div>
            
            {/* Quick Presets */}
            <div className="flex items-center gap-1 border-r border-slate-200 pr-1.5 mr-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  const end = d.toISOString().split('T')[0];
                  d.setDate(d.getDate() - 7);
                  const start = d.toISOString().split('T')[0];
                  setDashboardStartDate(start);
                  setDashboardEndDate(end);
                  setTimePeriodType('custom');
                }}
                className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-extrabold text-slate-650 transition-colors cursor-pointer"
              >
                آخر 7 أيام
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSelectPeriodType('monthly');
                }}
                className={`px-2 py-1 border rounded-lg text-[10px] font-extrabold transition-colors cursor-pointer ${
                  timePeriodType === 'monthly' ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-650'
                }`}
              >
                هذا الشهر
              </button>
              {(globalSettings.customReportPeriods || []).map((period) => (
                <button
                  key={period.id}
                  type="button"
                  onClick={() => {
                    setDashboardStartDate(period.startDate);
                    setDashboardEndDate(period.endDate);
                    setTimePeriodType('custom');
                  }}
                  className={`px-2 py-1 border rounded-lg text-[10px] font-extrabold transition-colors cursor-pointer ${
                    dashboardStartDate === period.startDate && dashboardEndDate === period.endDate
                      ? 'bg-indigo-600 border-indigo-650 text-white font-black'
                      : 'bg-indigo-50/40 hover:bg-indigo-50 border-indigo-100 text-indigo-750'
                  }`}
                  title={`من ${period.startDate} إلى ${period.endDate}`}
                >
                  {period.name}
                </button>
              ))}
              {(dashboardStartDate || dashboardEndDate || selectedSubjectFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    resetAllFilters();
                  }}
                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg text-[10px] font-extrabold transition-colors cursor-pointer"
                  title="إعادة ضبط الفلاتر"
                >
                  مسح ×
                </button>
              )}
            </div>
          </div>

          {/* Custom Tab Selector */}
          <div className="bg-slate-100/80 p-1 rounded-2xl flex items-center gap-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-white text-[#0D365A] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <BarChart3 size={13} />
                <span>لوحة الإحصائيات العامة</span>
              </span>
            </button>
            <button
              id="tab-profit-comparison-btn"
              onClick={() => setActiveTab('profit_comparison')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'profit_comparison'
                  ? 'bg-white text-[#0D365A] shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <TrendingUp size={13} className="text-emerald-600" />
                <span>مقارنة أرباح الشهرين 📈</span>
              </span>
            </button>
            <button
              id="tab-recharts-analytics-btn"
              onClick={() => setActiveTab('recharts_analytics')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'recharts_analytics'
                  ? 'bg-white text-[#0D365A] shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <PieIcon size={13} className="text-indigo-600" />
                <span>الصفوف وتطور الإيرادات (Recharts) 📊</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('student_growth')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'student_growth'
                  ? 'bg-white text-[#0D365A] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <TrendingUp size={13} className="text-[#D4A33C]" />
                <span>نمو الطلاب وتوزع المواد</span>
              </span>
            </button>
            <button
              id="tab-student-financials-btn"
              onClick={() => setActiveTab('student_financials')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'student_financials'
                  ? 'bg-white text-[#0D365A] shadow-sm font-black'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <BarChart3 size={13} className="text-emerald-600" />
                <span>أرصدة الطلاب والرسوم المحصلة 📊</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('accounting')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'accounting'
                  ? 'bg-white text-[#0D365A] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Wallet size={13} />
                <span>دفتر الأستاذ والرواتب</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-white text-[#0D365A] shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <List size={13} />
                <span>لوحة كشف الحصص التفاعلية</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'audit'
                  ? 'bg-white text-[#0D365A] shadow-sm font-black'
                  : 'text-slate-550 hover:text-slate-850'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-[#D4A33C] animate-pulse" />
                <span>التدقيق والتوحيد المالي 🔍</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'scheduled'
                  ? 'bg-white text-[#0D365A] shadow-sm font-black'
                  : 'text-slate-550 hover:text-slate-850'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-indigo-600" />
                <span>جدولة التقارير الدورية (شهرياً) 📅</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('expenses')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'expenses'
                  ? 'bg-white text-[#0D365A] shadow-sm font-black'
                  : 'text-slate-550 hover:text-slate-850'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <DollarSign size={13} className="text-amber-600" />
                <span>إدارة المصروفات التشغيلية 💸</span>
              </span>
            </button>
          </div>

          {/* Actions Menu Dropdown */}
          <div className="relative" ref={actionsMenuRef}>
            <button
              onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-md cursor-pointer border border-slate-700 font-sans"
              title="قائمة الإجراءات وخيارات التصدير المالي المتقدمة"
              id="reports-actions-menu-btn"
            >
              <Sparkles size={14} className="text-[#D4A33C]" />
              <span>قائمة الإجراءات</span>
              <ChevronDown size={14} className={`transition-transform duration-200 ${isActionsMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isActionsMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[120] overflow-hidden text-right"
                  dir="rtl"
                >
                  <div className="p-3 bg-gradient-to-r from-slate-900 to-[#0D365A] text-white border-b border-slate-800">
                    <span className="text-xs font-black block">خيارات وإجراءات التقارير المالية</span>
                    <span className="text-[10px] text-slate-300 font-bold">تصدير، تدقيق، وطباعة رسمية</span>
                  </div>

                  <div className="p-2 space-y-1">
                    <div className="text-[10px] font-black text-slate-400 px-3 pt-1 pb-0.5">تقارير PDF الرسمية</div>
                    
                    {/* The requested print chart reports option */}
                    <button
                      onClick={() => {
                        setIsActionsMenuOpen(false);
                        exportVisualChartsReportToPDF();
                      }}
                      className="w-full px-3 py-2.5 text-right rounded-xl text-xs font-black text-blue-700 bg-blue-50/80 hover:bg-blue-100/90 transition-colors flex items-center justify-between group cursor-pointer border border-blue-200/80"
                      id="menu-print-visual-charts-pdf"
                    >
                      <div className="flex items-center gap-2">
                        <Printer size={15} className="text-blue-600 shrink-0" />
                        <div>
                          <div className="font-black text-slate-900">طباعة التقارير البيانية (PDF)</div>
                          <div className="text-[10px] text-blue-600 font-bold">تصدير المخططات الحالية لملف PDF للطباعة</div>
                        </div>
                      </div>
                      <span className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black">مخططات</span>
                    </button>

                    {/* The requested option: تصدير جميع التقارير المالية والتحليلات الحالية إلى ملف PDF منظم */}
                    <button
                      onClick={() => {
                        setIsActionsMenuOpen(false);
                        exportAllFinancialAnalyticsToOrganizedPDF();
                      }}
                      className="w-full px-3 py-2.5 text-right rounded-xl text-xs font-black text-rose-700 bg-rose-50/70 hover:bg-rose-100/80 transition-colors flex items-center justify-between group cursor-pointer border border-rose-200/60"
                      id="menu-export-all-financial-pdf"
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={15} className="text-rose-600 shrink-0 animate-pulse" />
                        <div>
                          <div className="font-black text-slate-900">تصدير جميع التقارير والتحليلات (PDF)</div>
                          <div className="text-[10px] text-rose-600 font-bold">ملف PDF منظم وشامل لكافة البيانات</div>
                        </div>
                      </div>
                      <span className="text-[9px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-black">شامل</span>
                    </button>

                    {/* The requested option: تحميل تقرير نتائج الاختبارات لأولياء الأمور كـ PDF */}
                    <button
                      onClick={() => {
                        setIsActionsMenuOpen(false);
                        setIsParentExamModalOpen(true);
                      }}
                      className="w-full px-3 py-2.5 text-right rounded-xl text-xs font-black text-amber-950 bg-amber-50 hover:bg-amber-100 transition-colors flex items-center justify-between group cursor-pointer border border-amber-300"
                      id="menu-parent-exam-report-pdf"
                    >
                      <div className="flex items-center gap-2">
                        <GraduationCap size={15} className="text-amber-600 shrink-0" />
                        <div>
                          <div className="font-black text-slate-900">تقرير نتائج الاختبارات لأولياء الأمور (PDF)</div>
                          <div className="text-[10px] text-amber-700 font-bold">وثيقة درجات وتقييم رسمي لولي الأمر</div>
                        </div>
                      </div>
                      <span className="text-[9px] bg-amber-600 text-white px-2 py-0.5 rounded-full font-black">أولياء الأمور</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsActionsMenuOpen(false);
                        exportPeriodFinancialReportToPDF();
                      }}
                      className="w-full px-3 py-2 text-right rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2 cursor-pointer"
                      id="menu-export-period-pdf"
                    >
                      <FileText size={14} className="text-rose-500 shrink-0" />
                      <span>تصدير تقرير الفترة المحددة (PDF)</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsActionsMenuOpen(false);
                        setIsMonthlyFinancialModalOpen(true);
                      }}
                      className="w-full px-3 py-2 text-right rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2 cursor-pointer"
                      id="menu-export-monthly-pdf"
                    >
                      <FileText size={14} className="text-[#D4A33C] shrink-0" />
                      <span>التقرير المالي الشهري الشامل (PDF)</span>
                    </button>

                    <div className="border-t border-slate-100 my-1"></div>
                    <div className="text-[10px] font-black text-slate-400 px-3 pt-1 pb-0.5">مركز التصدير المالي المتقدم</div>

                    <button
                      onClick={() => {
                        setIsActionsMenuOpen(false);
                        setIsExportCenterModalOpen(true);
                      }}
                      className="w-full px-3 py-2 text-right rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100/80 transition-colors flex items-center gap-2 cursor-pointer border border-emerald-200/60"
                      id="menu-open-export-center-modal"
                    >
                      <FileSpreadsheet size={15} className="text-emerald-600 shrink-0" />
                      <div className="flex flex-col">
                        <span>مركز تصدير التقارير (Excel / CSV) ⚡</span>
                        <span className="text-[10px] font-normal text-emerald-600">8 تقارير محاسبية تفصيلية بضغطة زر</span>
                      </div>
                    </button>

                    <div className="border-t border-slate-100 my-1"></div>
                    <div className="text-[10px] font-black text-slate-400 px-3 pt-1 pb-0.5">كشوف حسابات Excel</div>

                    <button
                      onClick={() => {
                        setIsActionsMenuOpen(false);
                        handleExportAllFinancialToExcel();
                      }}
                      className="w-full px-3 py-2 text-right rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2 cursor-pointer"
                      id="menu-export-all-excel"
                    >
                      <FileSpreadsheet size={14} className="text-emerald-600 shrink-0" />
                      <span>تصدير التقرير المالي الشامل (Excel)</span>
                    </button>

                    <div className="border-t border-slate-100 my-1"></div>
                    <div className="text-[10px] font-black text-slate-400 px-3 pt-1 pb-0.5">إجراءات إدارية</div>

                    <button
                      onClick={() => {
                        setIsActionsMenuOpen(false);
                        setActiveTab('student_financials');
                      }}
                      className="w-full px-3 py-2 text-right rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2 cursor-pointer"
                      id="menu-goto-student-financials"
                    >
                      <BarChart3 size={14} className="text-emerald-600 shrink-0" />
                      <span>تحليلات أرصدة الطلاب والتحصيل (Recharts) 📊</span>
                    </button>

                    <button
                      onClick={() => {
                        setIsActionsMenuOpen(false);
                        setActiveTab('audit');
                      }}
                      className="w-full px-3 py-2 text-right rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2 cursor-pointer"
                      id="menu-goto-audit"
                    >
                      <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                      <span>التدقيق والتوحيد المالي 🔍</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Dedicated Download Exam Report as PDF for Parents with View Mode Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-amber-400/40 shadow-md">
            <button
              onClick={() => setIsParentExamModalOpen(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:opacity-95 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs font-sans"
              title="تحميل وإصدار تقرير نتائج الاختبارات لأولياء الأمور بصيغة PDF مع المؤشرات والتوصيات"
              id="download-parent-exam-report-pdf-btn"
            >
              <GraduationCap size={16} className="text-slate-950" />
              <span>تقرير أولياء الأمور (PDF) 👨‍👩‍👧</span>
              {examResults.length > 0 && (
                <span className="bg-slate-950 text-amber-300 px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold">
                  {examResults.length}
                </span>
              )}
            </button>

            {/* Quick Option Selector for Manager: Detailed View vs Summary View */}
            <div className="flex items-center gap-1 px-1 bg-slate-800/90 rounded-xl py-0.5 border border-slate-700/80">
              <button
                type="button"
                onClick={() => setParentReportViewMode('detailed')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                  parentReportViewMode === 'detailed'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="العرض التفصيلي: تفصيل كامل للاختبارات والإجابات والتوصيات"
              >
                <span>تفصيلي 📑</span>
              </button>
              <button
                type="button"
                onClick={() => setParentReportViewMode('summary')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                  parentReportViewMode === 'summary'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="العرض الموجز: الدرجة وتاريخ التقديم فقط (Score & Date Only)"
              >
                <span>موجز (درجة وتاريخ) ⚡</span>
              </button>
            </div>
          </div>

          {/* Dedicated Direct Export Button: Excel & CSV Export Center */}
          <button
            type="button"
            onClick={() => setIsExportCenterModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-700 to-green-700 hover:from-emerald-700 hover:to-green-800 hover:scale-[1.02] active:scale-[0.98] text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-md cursor-pointer border border-emerald-400 font-sans select-none"
            title="تصدير وتنزيل التقارير المالية والتحليلات مباشرة إلى ملفات Excel أو CSV مع دعم كامل لترميز UTF-8"
            id="export-reports-excel-csv-btn"
          >
            <FileSpreadsheet size={16} className="text-amber-300 animate-pulse shrink-0" />
            <span>تصدير التقارير (Excel / CSV) 📊</span>
            <span className="bg-emerald-950/60 text-emerald-300 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold">تصدير فوري</span>
          </button>

          {/* New Dedicated Export Button: Current Financial Dashboard PDF (Center Income & Student Balances) */}
          <button
            onClick={handleExportFinancialDashboardPDF}
            disabled={isExportingFinancialPDF}
            className={`px-4 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-700 to-[#0D365A] hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-md cursor-pointer border border-emerald-400/60 font-sans select-none ${
              isExportingFinancialPDF ? 'opacity-80 cursor-wait' : ''
            }`}
            title="تصدير كشف رسمي فوري للمركز المالي وصافي الأرباح وأرصدة الطلاب بصيغة PDF معتمداً"
            id="export-financial-dashboard-pdf-btn"
          >
            {isExportingFinancialPDF ? (
              <Loader2 size={15} className="animate-spin text-emerald-200" />
            ) : (
              <FileText size={15} className="text-emerald-300 animate-pulse" />
            )}
            <span>{isExportingFinancialPDF ? 'جاري تجهيز تقرير المركز المالي...' : 'تقرير المركز المالي والأرصدة (PDF) 📊'}</span>
          </button>

          {/* New Dedicated Export Button: Current Financial Dashboard Excel (.xlsx via exceljs) */}
          <button
            onClick={handleExportFinancialDashboardExcel}
            disabled={isExportingFinancialExcel}
            className={`px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-700 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-md cursor-pointer border border-emerald-400/60 font-sans select-none ${
              isExportingFinancialExcel ? 'opacity-80 cursor-wait' : ''
            }`}
            title="تصدير كشف رسمي فوري للمركز المالي وصافي الأرباح وأرصدة الطلاب بصيغة ملف Excel (.xlsx)"
            id="export-financial-dashboard-excel-btn"
          >
            {isExportingFinancialExcel ? (
              <Loader2 size={15} className="animate-spin text-emerald-200" />
            ) : (
              <FileSpreadsheet size={15} className="text-emerald-200 animate-pulse" />
            )}
            <span>{isExportingFinancialExcel ? 'جاري إنشاء ملف Excel...' : 'تقرير المركز المالي والأرصدة (Excel) 📊'}</span>
          </button>

          {/* Primary Quick Button: Export All Financial Reports to Organized PDF */}
          <button
            onClick={exportAllFinancialAnalyticsToOrganizedPDF}
            className="px-4 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-[#0D365A] hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-md cursor-pointer border border-rose-400 font-sans"
            title="تصدير جميع التقارير المالية والتحليلات الحالية إلى ملف PDF منظم وشامل مع الاعتمادات الرسمية"
            id="export-all-financial-analytics-pdf-btn"
          >
            <FileText size={15} className="text-amber-300 animate-pulse" />
            <span>تصدير جميع التقارير والتحليلات (PDF منظم) 📑</span>
          </button>

          {/* Dedicated Print Visual Charts Report to PDF Button */}
          <button
            onClick={exportVisualChartsReportToPDF}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-700 via-indigo-600 to-[#0D365A] hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-md cursor-pointer border border-blue-400/60 font-sans"
            title="تصدير وطباعة التقارير والمخططات البيانية الحالية إلى صيغة PDF للطباعة مع الرسوم التفاعلية والمؤشرات"
            id="print-visual-charts-pdf-btn"
          >
            <Printer size={15} className="text-cyan-300 animate-pulse" />
            <span>طباعة التقارير البيانية (PDF) 🖨️</span>
          </button>

          {/* Comprehensive Financial Export Button */}
          <button
            onClick={handleExportAllFinancialToExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98] text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-md cursor-pointer border border-emerald-500 font-sans"
            title="تصدير تقرير مالي كامل متعدد الجداول (المعلمين، الطلاب، الدفعات، الأرباح) في ملف Excel واحد متكامل"
            id="export-comprehensive-excel-btn"
          >
            <FileSpreadsheet size={15} />
            <span>تقرير مالي شامل (Excel) 📊</span>
          </button>

          {/* Periodic Financial PDF Export Button */}
          <button
            onClick={exportPeriodFinancialReportToPDF}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 hover:scale-[1.02] active:scale-[0.98] text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-md cursor-pointer border border-rose-500 font-sans"
            title="تصدير تقرير مالي تفصيلي احترافي للفترة المحددة بصيغة PDF قابلة للطباعة والتوقيع"
            id="export-period-financial-pdf-btn"
          >
            <FileText size={15} />
            <span>تقرير الفترة (PDF) 📕</span>
          </button>

          {/* Monthly Financial PDF Report Button with full Expenses & Profits */}
          <button
            onClick={() => setIsMonthlyFinancialModalOpen(true)}
            className="px-4 py-2.5 bg-[#0D365A] hover:bg-[#154673] hover:scale-[1.02] active:scale-[0.98] text-[#D4A33C] hover:text-amber-300 rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-md cursor-pointer border border-[#D4A33C]/40 font-sans"
            title="توليد وتحميل التقرير المالي الشهري الشامل بصيغة PDF يتضمن كافة المصاريف التشغيلية والأرباح المحققة للمدير"
            id="export-monthly-financial-pdf-btn"
          >
            <FileText size={15} className="text-[#D4A33C]" />
            <span>تقرير شهري PDF 📄</span>
          </button>

          {/* Interactive Colored Bell Alert Icon with Pulse Effects */}
          <button
            onClick={() => setShowNotificationCenter(!showNotificationCenter)}
            className={`relative p-3 rounded-2xl flex items-center justify-center transition-all cursor-pointer hover:scale-[1.03] active:scale-[0.97] border ${
              criticalAlerts.length > 0
                ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-[0_4px_12px_rgba(244,63,94,0.15)]'
                : approachingAlerts.length > 0
                ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-[0_4px_12px_rgba(245,158,11,0.15)]'
                : 'bg-emerald-50 border-emerald-100 text-emerald-600'
            }`}
            title="مركز تنبيهات أرصدة الطلاب ومخاطر الدفع"
          >
            {/* Pulsing ring surrounding bell if alert triggers */}
            {(criticalAlerts.length > 0 || approachingAlerts.length > 0) && (
              <span className="absolute inset-0 rounded-2xl border-2 border-inherit animate-ping opacity-25"></span>
            )}
            
            {criticalAlerts.length > 0 ? (
              <BellRing size={16} className="animate-bounce" />
            ) : (
              <Bell size={16} />
            )}

            {/* Notification Badge */}
            {(criticalAlerts.length > 0 || approachingAlerts.length > 0) && (
              <span className={`absolute -top-1.5 -left-1.5 h-5 min-w-5 px-1 flex items-center justify-center rounded-full text-[9px] font-black text-white ${
                criticalAlerts.length > 0 ? 'bg-rose-600' : 'bg-amber-500'
              }`}>
                {criticalAlerts.length + approachingAlerts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Expanded Smart Alert & Risk Center Panel */}
      <AnimatePresence>
        {showNotificationCenter && (criticalAlerts.length > 0 || approachingAlerts.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-br from-slate-900 via-[#0D365A] to-slate-950 text-white rounded-[2rem] p-6 text-right space-y-5 shadow-xl relative animate-fade-in">
              {/* Background ambient pattern */}
              <div className="absolute top-0 left-0 bg-radial-gradient from-white/[0.05] to-transparent w-full h-full pointer-events-none" />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl flex items-center justify-center shadow-lg ${
                    criticalAlerts.length > 0 ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'
                  }`}>
                    <BellRing size={20} className="p-0.5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black tracking-wide text-white flex items-center gap-2">
                      <span>نظام الإنذار المبكر ومراقبة الأرصدة التلقائي</span>
                      <span className="text-[10px] bg-rose-500/20 text-rose-300 font-black px-2 py-0.5 rounded-full border border-rose-500/30">مفعل</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">تنبيهات فورية للمدير تفيد بوجود أرصدة ناضبة أو تقترب من السحب المكشوف (عتبة التنبيه العام: {alertThreshold} ₪)</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-black text-slate-400">تحديث فوري تلقائي</span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
              </div>

              {/* Status Simulation Messages */}
              {alertStatusMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-emerald-600 border border-emerald-555 text-white text-xs font-black p-3.5 rounded-xl flex items-center gap-2 shadow-inner"
                >
                  <CheckCircle2 size={13} className="shrink-0" />
                  <span>{alertStatusMessage}</span>
                </motion.div>
              )}

              {/* Two columns: 1. Critical below limit [Red], 2. Approaching limit [Amber/Orange] */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10 text-right">
                
                {/* COLUMN 1: Critical (Below Threshold) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-rose-950">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <h5 className="text-xs font-black text-rose-400">حالات حرجة متجاوزة للحد ({criticalAlerts.length})</h5>
                  </div>

                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {criticalAlerts.length === 0 ? (
                      <p className="text-[10px] text-slate-500 py-4 font-bold">لا يوجد أي طلاب بالرصيد الحرج حالياً 👍</p>
                    ) : (
                      criticalAlerts.map(claim => (
                        <div
                          key={claim.id}
                          className="bg-slate-900/40 hover:bg-slate-900/75 border border-red-500/20 hover:border-red-500/40 rounded-2xl p-3.5 flex items-center justify-between transition-all"
                        >
                          <div className="space-y-1">
                            <h6 className="text-xs font-black text-white">{claim.name}</h6>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-slate-400">التكلفة المستهلكة: <strong className="text-slate-350">{claim.totalSpent} ₪</strong></span>
                              <span className="text-slate-600">•</span>
                              <span className="text-[9px] text-slate-400">الشحن الكلي: <strong className="text-emerald-500">{claim.totalToppedUp} ₪</strong></span>
                            </div>
                            <div className="text-[9px] text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-lg inline-block">
                              تجاوز الحد بمقدار: {Math.abs(claim.differenceToThreshold).toFixed(0)} ₪
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 text-left">
                            <span className="text-xs font-black text-rose-500 font-mono" dir="ltr">
                              {claim.balance.toFixed(0)} ₪
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => claim.phone ? openNotifier(claim, 'sms') : null}
                                disabled={!claim.phone}
                                className={`px-2 py-1 rounded-lg text-[9px] font-black flex items-center gap-1 transition-all select-none ${
                                  !claim.phone
                                    ? 'bg-slate-800 text-slate-500 border border-slate-700 opacity-50 cursor-not-allowed'
                                    : sentAlertNotification.includes(`${claim.name}-sms`)
                                    ? 'bg-rose-950/40 text-rose-500/60 border border-rose-900/40 cursor-not-allowed'
                                    : 'bg-rose-600 hover:bg-rose-500 hover:scale-[1.02] active:scale-[0.98] text-white shadow-[0_2px_8px_rgba(244,63,94,0.15)] cursor-pointer'
                                }`}
                                title={claim.phone ? "إرسال رسالة نصية SMS تفاعلية لولي الأمر" : "رقم الهاتف غير مدخل لملف هذا الطالب."}
                              >
                                <Send size={9} />
                                <span>{sentAlertNotification.includes(`${claim.name}-sms`) ? 'تم SMS 📱' : claim.phone ? 'SMS 📱' : 'SMS (غير مدخل)'}</span>
                              </button>
                              <button
                                onClick={() => claim.email ? openNotifier(claim, 'email') : null}
                                disabled={!claim.email}
                                className={`px-2 py-1 rounded-lg text-[9px] font-black flex items-center gap-1 transition-all select-none ${
                                  !claim.email
                                    ? 'bg-slate-800 text-slate-500 border border-slate-700 opacity-50 cursor-not-allowed'
                                    : sentAlertNotification.includes(`${claim.name}-email`)
                                    ? 'bg-blue-950/40 text-blue-450/60 border border-blue-900/40 cursor-not-allowed'
                                    : 'bg-indigo-650 hover:bg-indigo-650/80 hover:scale-[1.02] active:scale-[0.98] text-white shadow-[0_2px_8px_rgba(99,102,241,0.15)] cursor-pointer'
                                }`}
                                title={claim.email ? "إرسال بريد إلكتروني تفصيلي لولي الأمر" : "البريد الإلكتروني غير مدخل لملف هذا الطالب."}
                              >
                                <Send size={9} />
                                <span>{sentAlertNotification.includes(`${claim.name}-email`) ? 'تم بريد ✉️' : claim.email ? 'بريد ✉️' : 'بريد (غير مدخل)'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* COLUMN 2: Approaching (Within 60 ₪ above Threshold) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-amber-950">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <h5 className="text-xs font-black text-amber-400">حالات تقترب من الحد الأدنى ({approachingAlerts.length})</h5>
                  </div>

                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {approachingAlerts.length === 0 ? (
                      <p className="text-[10px] text-slate-500 py-4 font-bold">لا توجد أرصدة قريبة من الحد الأدنى حالياً 🌟</p>
                    ) : (
                      approachingAlerts.map(claim => (
                        <div
                          key={claim.id}
                          className="bg-slate-900/40 hover:bg-slate-900/75 border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-3.5 flex items-center justify-between transition-all"
                        >
                          <div className="space-y-1">
                            <h6 className="text-xs font-black text-white">{claim.name}</h6>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-slate-400">المستهلك: <strong className="text-slate-350">{claim.totalSpent} ₪</strong></span>
                              <span className="text-slate-600">•</span>
                              <span className="text-[9px] text-slate-400">الحد المعين: <strong className="text-amber-500">{claim.threshold} ₪</strong></span>
                            </div>
                            <div className="text-[9px] text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded-lg inline-block">
                              متبقي للأمان: {claim.differenceToThreshold.toFixed(0)} ₪ فقط!
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 text-left">
                            <span className="text-xs font-black text-amber-500 font-mono" dir="ltr">
                              {claim.balance.toFixed(0)} ₪
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => claim.phone ? openNotifier(claim, 'sms') : null}
                                disabled={!claim.phone}
                                className={`px-2 py-1 rounded-lg text-[9px] font-black flex items-center gap-1 transition-all select-none ${
                                  !claim.phone
                                    ? 'bg-slate-800 text-slate-500 border border-slate-700 opacity-50 cursor-not-allowed'
                                    : sentAlertNotification.includes(`${claim.name}-sms`)
                                    ? 'bg-rose-950/40 text-rose-500/60 border border-rose-900/40 cursor-not-allowed'
                                    : 'bg-rose-600 hover:bg-rose-500 hover:scale-[1.02] active:scale-[0.98] text-white shadow-[0_2px_8px_rgba(244,63,94,0.15)] cursor-pointer'
                                }`}
                                title={claim.phone ? "إرسال رسالة نصية SMS تذكيرية تفاعلية" : "رقم الهاتف غير مدخل لملف هذا الطالب."}
                              >
                                <Send size={9} />
                                <span>{sentAlertNotification.includes(`${claim.name}-sms`) ? 'تم SMS 📱' : claim.phone ? 'SMS 📱' : 'SMS (غير مدخل)'}</span>
                              </button>
                              <button
                                onClick={() => claim.email ? openNotifier(claim, 'email') : null}
                                disabled={!claim.email}
                                className={`px-2 py-1 rounded-lg text-[9px] font-black flex items-center gap-1 transition-all select-none ${
                                  !claim.email
                                    ? 'bg-slate-800 text-slate-500 border border-slate-700 opacity-50 cursor-not-allowed'
                                    : sentAlertNotification.includes(`${claim.name}-email`)
                                    ? 'bg-blue-950/40 text-blue-450/60 border border-blue-900/40 cursor-not-allowed'
                                    : 'bg-indigo-650 hover:bg-indigo-650/80 hover:scale-[1.02] active:scale-[0.98] text-white shadow-[0_2px_8px_rgba(99,102,241,0.15)] cursor-pointer'
                                }`}
                                title={claim.email ? "إرسال بريد الكتروني تذكيري تفصيلي" : "البريد الإلكتروني غير مدخل لملف هذا الطالب."}
                              >
                                <Send size={9} />
                                <span>{sentAlertNotification.includes(`${claim.name}-email`) ? 'تم بريد ✉️' : claim.email ? 'بريد ✉️' : 'بريد (غير مدخل)'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🌟 Dynamic Executive Statistics Cards: Top Profitable Subject & Top Performing Teacher */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5" aria-label="أبرز المؤشرات الإحصائية الأكاديمية">
        {/* Card 1: أكثر مادة دراسية ربحية */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-amber-50/25 to-white border border-amber-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all text-right group">
          <div className="absolute -top-10 -left-10 w-36 h-36 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                <Sparkles size={22} className="animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-amber-700 uppercase tracking-wide">
                    المؤشر الأكاديمي الأكثر ربحية
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-900 border border-amber-300/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>محدث حياً</span>
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-0.5 tracking-tight">
                  أكثر مادة دراسية ربحية 💎
                </h3>
              </div>
            </div>

            {topHighlights.isFiltered ? (
              <span className="text-[10px] font-black px-2.5 py-1 bg-amber-100/60 text-amber-900 rounded-xl border border-amber-200/80 shrink-0">
                حسب الفترة المحددة ⏱️
              </span>
            ) : (
              <span className="text-[10px] font-black px-2.5 py-1 bg-slate-100 text-slate-600 rounded-xl border border-slate-200 shrink-0">
                كافة الحصص المسجلة
              </span>
            )}
          </div>

          {topHighlights.topSubject ? (
            <div className="mt-5 space-y-4 relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-amber-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">المادة المتصدرة:</span>
                  <span className="text-lg sm:text-xl font-black text-[#0D365A] bg-amber-100/70 px-3 py-1 rounded-xl border border-amber-300">
                    {topHighlights.topSubject.name}
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-bold text-slate-500">صافي الأرباح:</span>
                  <span className="text-2xl font-black text-emerald-600 font-mono">
                    ₪{Math.round(topHighlights.topSubject.netProfit).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Sub-metrics Grid */}
              <div className="grid grid-cols-3 gap-2.5 pt-1 text-center font-sans">
                <div className="bg-white/90 border border-slate-200/80 rounded-2xl p-2.5 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">إجمالي العائدات</span>
                  <span className="text-xs font-black text-slate-800 font-mono">
                    ₪{Math.round(topHighlights.topSubject.revenue).toLocaleString()}
                  </span>
                </div>
                <div className="bg-white/90 border border-slate-200/80 rounded-2xl p-2.5 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">الساعات المنفذة</span>
                  <span className="text-xs font-black text-[#0D365A]">
                    {topHighlights.topSubject.hours.toFixed(1)} س ({topHighlights.topSubject.sessionsCount} حصة)
                  </span>
                </div>
                <div className="bg-white/90 border border-slate-200/80 rounded-2xl p-2.5 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">هامش الربحية</span>
                  <span className="text-xs font-black text-emerald-700">
                    {topHighlights.topSubject.revenue > 0 ? Math.round((topHighlights.topSubject.netProfit / topHighlights.topSubject.revenue) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 p-6 rounded-2xl bg-amber-50/40 border border-dashed border-amber-200 text-center">
              <p className="text-xs font-bold text-amber-800">بانتظار رصد الحصص لتحديد المادة الدراسية الأكثر ربحية للفترة المحددة.</p>
            </div>
          )}
        </div>

        {/* Card 2: أكثر معلم أداءً */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-indigo-50/25 to-white border border-indigo-200/80 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all text-right group">
          <div className="absolute -top-10 -left-10 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-start justify-between gap-4 relative z-10">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0D365A] to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-900/20 shrink-0">
                <GraduationCap size={22} className="text-amber-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-indigo-700 uppercase tracking-wide">
                    كفاءة الكادر التعليمي
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-100 text-indigo-900 border border-indigo-300/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>محدث حياً</span>
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-0.5 tracking-tight">
                  أكثر معلم أداءً ونشاطاً 🌟
                </h3>
              </div>
            </div>

            {topHighlights.isFiltered ? (
              <span className="text-[10px] font-black px-2.5 py-1 bg-indigo-100/60 text-indigo-900 rounded-xl border border-indigo-200/80 shrink-0">
                حسب الفترة المحددة ⏱️
              </span>
            ) : (
              <span className="text-[10px] font-black px-2.5 py-1 bg-slate-100 text-slate-600 rounded-xl border border-slate-200 shrink-0">
                كافة الحصص المسجلة
              </span>
            )}
          </div>

          {topHighlights.topTeacher ? (
            <div className="mt-5 space-y-4 relative z-10">
              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-indigo-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">المعلم المتصدر:</span>
                  <span className="text-lg sm:text-xl font-black text-slate-900 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-200">
                    {topHighlights.topTeacher.name}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">({topHighlights.topTeacher.specialty})</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-bold text-slate-500">ساعات الإنجاز:</span>
                  <span className="text-2xl font-black text-[#0D365A] font-mono">
                    {topHighlights.topTeacher.hours.toFixed(1)} <span className="text-xs text-slate-500 font-bold">ساعة</span>
                  </span>
                </div>
              </div>

              {/* Sub-metrics Grid */}
              <div className="grid grid-cols-3 gap-2.5 pt-1 text-center font-sans">
                <div className="bg-white/90 border border-slate-200/80 rounded-2xl p-2.5 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">الحصص المعتمدة</span>
                  <span className="text-xs font-black text-indigo-700">
                    {topHighlights.topTeacher.sessionsCount} حصة منجزة
                  </span>
                </div>
                <div className="bg-white/90 border border-slate-200/80 rounded-2xl p-2.5 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">العائد للمركز</span>
                  <span className="text-xs font-black text-emerald-600 font-mono">
                    ₪{Math.round(topHighlights.topTeacher.revenue).toLocaleString()}
                  </span>
                </div>
                <div className="bg-white/90 border border-slate-200/80 rounded-2xl p-2.5 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">مستحقات المعلم</span>
                  <span className="text-xs font-black text-slate-800 font-mono">
                    ₪{Math.round(topHighlights.topTeacher.costs).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 p-6 rounded-2xl bg-indigo-50/40 border border-dashed border-indigo-200 text-center">
              <p className="text-xs font-bold text-indigo-800">بانتظار رصد الحصص لتحديد المعلم الأكثر أداءً للفترة المحددة.</p>
            </div>
          )}
        </div>
      </section>

      {/* =================== ADVANCED FILTERS PANEL (الفترة الزمنية + الموضوع الدراسي) =================== */}
      <section className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/90 shadow-sm space-y-4">
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Filter size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight">خيارات التصفية المتقدمة للتقارير والمخططات البيانية</h3>
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-700 text-[11px] font-bold rounded-full">تحديث فوري</span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                تصفية شاملة للمخططات والإحصائيات حسب الفترة الزمنية (يومي، أسبوعي، شهري، سنوي) أو حسب الموضوع الدراسي
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {(selectedSubjectFilter !== 'all' || timePeriodType !== 'monthly') && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                title="إلغاء جميع خيارات التصفية والعودة للإعدادات الافتراضية"
              >
                <RotateCcw size={13} />
                <span>إعادة ضبط التصفية</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Column 1: Time Period Filter (7 cols) */}
          <div className="lg:col-span-7 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <Clock size={14} className="text-indigo-600" />
                <span>الفترة الزمنية:</span>
              </label>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                {activePeriodLabel}
              </span>
            </div>

            {/* Time Period Type Buttons */}
            <div className="grid grid-cols-5 gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
              {[
                { type: 'daily', label: 'يومي', icon: Clock },
                { type: 'weekly', label: 'أسبوعي', icon: Calendar },
                { type: 'monthly', label: 'شهري', icon: BarChart3 },
                { type: 'yearly', label: 'سنوي', icon: TrendingUp },
                { type: 'custom', label: 'مخصص', icon: Filter }
              ].map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleSelectPeriodType(type as TimePeriodType)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    timePeriodType === type
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={12} />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            {/* Interval Stepper & Date Pickers */}
            {timePeriodType !== 'custom' ? (
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => shiftPeriod('prev')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                  title="الانتقال إلى الفترة السابقة"
                >
                  <ArrowRight size={13} />
                  <span>السابق</span>
                </button>

                <div className="text-center px-2 py-1 bg-white border border-slate-200 rounded-xl shadow-2xs flex-1">
                  <span className="text-xs font-mono font-black text-slate-800">
                    {dashboardStartDate === dashboardEndDate ? dashboardStartDate : `${dashboardStartDate} ↔ ${dashboardEndDate}`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => shiftPeriod('next')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                  title="الانتقال إلى الفترة التالية"
                >
                  <span>التالي</span>
                  <ArrowLeft size={13} />
                </button>

                <button
                  type="button"
                  onClick={resetToToday}
                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 rounded-xl text-[11px] font-black transition-all cursor-pointer shrink-0"
                  title="العودة إلى اليوم / الفترة الحالية"
                >
                  الحالي
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">من تاريخ:</span>
                  <input
                    type="date"
                    value={dashboardStartDate}
                    onChange={(e) => setDashboardStartDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-bold text-slate-500 block mb-1">إلى تاريخ:</span>
                  <input
                    type="date"
                    value={dashboardEndDate}
                    onChange={(e) => setDashboardEndDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Column 2: Subject Filter (5 cols) */}
          <div className="lg:col-span-5 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                <BookOpen size={14} className="text-emerald-600" />
                <span>الموضوع الدراسي:</span>
              </label>
              {selectedSubjectFilter !== 'all' ? (
                <button
                  type="button"
                  onClick={() => setSelectedSubjectFilter('all')}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <X size={11} />
                  <span>عرض الكل</span>
                </button>
              ) : (
                <span className="text-[11px] font-bold text-slate-400">
                  {availableSubjects.length} مادة مسجلة
                </span>
              )}
            </div>

            {/* Subject Select Dropdown */}
            <div className="relative">
              <select
                value={selectedSubjectFilter}
                onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 shadow-2xs appearance-none pr-8 cursor-pointer"
              >
                <option value="all">
                  كافة المواد والمواضيع الدراسية ({availableSubjects.reduce((acc, s) => acc + s.count, 0)} حصة)
                </option>
                {availableSubjects.map((sub) => (
                  <option key={sub.name} value={sub.name}>
                    {sub.name} ({sub.count} حصة)
                  </option>
                ))}
              </select>
              <div className="absolute top-1/2 left-3 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown size={14} />
              </div>
            </div>

            {/* Quick Filter Subject Pills */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block">المواد الأكثر نشاطاً:</span>
              <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto pt-0.5 custom-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedSubjectFilter('all')}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    selectedSubjectFilter === 'all'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  الكل
                </button>
                {availableSubjects.slice(0, 6).map((sub) => (
                  <button
                    key={sub.name}
                    type="button"
                    onClick={() => setSelectedSubjectFilter(sub.name)}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      selectedSubjectFilter === sub.name
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    <span>{sub.name}</span>
                    <span className={`text-[9px] px-1 py-0.2 rounded-full font-mono ${
                      selectedSubjectFilter === sub.name ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {sub.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Active Filter Summary Strip */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl px-4 py-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 font-bold rounded-lg text-[10px] border border-indigo-400/20">
              نتائج التصفية الحالية
            </span>
            <span className="font-bold text-slate-300">•</span>
            <span className="font-bold text-slate-200">
              الفترة: <strong className="text-white font-mono">{activePeriodLabel}</strong>
            </span>
            <span className="font-bold text-slate-400">•</span>
            <span className="font-bold text-slate-200">
              المادة: <strong className="text-amber-300">{selectedSubjectFilter === 'all' ? 'جميع المواد' : selectedSubjectFilter}</strong>
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-bold self-end md:self-auto">
            <span className="text-emerald-400">
              الحصص المطابقة: <strong className="text-white font-mono text-xs">{filteredSessions.length}</strong> حصة
            </span>
            <span className="text-cyan-300">
              الساعات المنجزة: <strong className="text-white font-mono text-xs">{filteredSessions.reduce((acc, s) => acc + (s.durationHours !== undefined ? Number(s.durationHours) : ((s.duration || 60) / 60)), 0).toFixed(1)}</strong> ساعة
            </span>
          </div>
        </div>
      </section>

      {/* 1. TOP OVERVIEW SUMMARY KPI BLOCKS (Always Rendered on Both views) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
         {/* KPI Item 1 */}
         <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex items-center justify-between group">
            <div className="space-y-1">
               <span className="text-[10px] font-black text-slate-400 block uppercase">ساعات العمل المنجزة</span>
               <h4 className="text-3xl font-black text-slate-900 leading-none">{stats.totalHours.toFixed(1)} <span className="text-xs text-slate-400 font-bold">ساعة</span></h4>
               <p className="text-[8px] font-black text-slate-300">مجموع التدريس الفعلي</p>
            </div>
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
               <Clock size={22} />
            </div>
         </div>

         {/* KPI Item 2 */}
         <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex items-center justify-between group">
            <div className="space-y-1">
               <span className="text-[10px] font-black text-slate-400 block uppercase">مجموع الإيرادات المحصلة</span>
               <h4 className="text-3xl font-black text-emerald-600 leading-none">₪{stats.totalTopUps}</h4>
               <p className="text-[8px] font-black text-slate-300">شحنات حسابات الطلاب</p>
            </div>
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
               <TrendingUp size={22} />
            </div>
         </div>

         {/* KPI Item 3 */}
         <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex items-center justify-between group font-bold">
            <div className="space-y-1">
               <span className="text-[10px] font-black text-slate-400 block uppercase">حسابات منخفضة الرصيد</span>
               <h4 className="text-3xl font-black text-rose-600 leading-none">{criticalAlerts.length} <span className="text-xs text-slate-400">حرجة</span></h4>
               <p className="text-[8px] font-black text-amber-500">{approachingAlerts.length} في نطاق الخطر والنفاد</p>
            </div>
            <div className="w-12 h-12 bg-rose-50 text-rose-555 rounded-2xl flex items-center justify-center relative">
               {(criticalAlerts.length > 0 || approachingAlerts.length > 0) && (
                 <span className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-rose-600 animate-ping"></span>
               )}
               <AlertTriangle size={22} className={criticalAlerts.length > 0 ? "text-rose-600 animate-pulse" : "text-amber-500"} />
            </div>
         </div>

         {/* KPI Item 4 */}
         <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex items-center justify-between group">
            <div className="space-y-1">
               <span className="text-[10px] font-black text-slate-400 block uppercase">صافي أرباح المركز</span>
               <h4 className="text-3xl font-black text-[#D4A33C] leading-none">₪{stats.netProfit.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</h4>
               <p className="text-[8px] font-black text-slate-300">بعد خصم أجور الأساتذة والمصروفات</p>
            </div>
            <div className="w-12 h-12 bg-amber-50 text-[#D4A33C] rounded-2xl flex items-center justify-center">
               <Landmark size={22} />
            </div>
         </div>
      </section>

      {/* Comprehensive Export Card Panel */}
      <div className="bg-gradient-to-br from-slate-900 via-[#0D365A] to-slate-950 text-white rounded-[2rem] p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none transition-all group-hover:bg-emerald-500/15 duration-500" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 text-right">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 font-black text-[10px] rounded-full border border-emerald-500/30">تصنيف محاسبي منظم ✨</span>
              <span className="text-slate-500 text-xs font-bold">•</span>
              <span className="text-slate-300 text-xs font-black flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                تحديث فوري مباشر لقاعدة البيانات
              </span>
            </div>
            <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
              <span>التقرير المالي واللوجيستي الشامل للأكاديمية</span>
              <span className="text-[10px] px-2 py-0.5 bg-indigo-500/30 text-indigo-200 border border-indigo-500/20 rounded font-black">Excel Multi-Sheet</span>
            </h3>
            <p className="text-xs text-slate-350 font-bold leading-relaxed max-w-4xl">
              أداة التصدير الذكي تتيح لك تحميل كافة السجلات الحية دفعة واحدة في ملف Excel موحد وجداول منفصلة ومرتبة محاسبياً وتضم:
              <span className="text-[#D4A33C] font-extrabold"> رواتب ومستحقات المعلمين </span>،
              <span className="text-[#D4A33C] font-extrabold"> أرصدة ومحافظ الطلاب الحاليين </span>،
              <span className="text-[#D4A33C] font-extrabold"> سجل صرف دفعات الأساتذة بالتفصيل </span>،
              <span className="text-[#D4A33C] font-extrabold"> حركات شحن وتعبئة الأرصدة </span>، و
              <span className="text-[#D4A33C] font-extrabold"> كشف اللقاءات مع هوامش صافي أرباح الأكاديمية </span>.
            </p>
          </div>
          
          <button
            onClick={handleExportAllFinancialToExcel}
            className="w-full lg:w-auto px-6 py-4 bg-[#D4A33C] hover:bg-[#c29331] text-slate-950 font-black text-xs rounded-2xl flex items-center justify-center gap-3 transition-all shadow-[0_12px_24px_rgba(212,163,60,0.15)] hover:scale-[1.02] active:scale-[0.98] border border-[#fbe0a3] shrink-0 cursor-pointer select-none"
            title="تصدير تقرير مالي كامل متعدد الجداول (المعلمين، الطلاب، الدفعات، الأرباح) في ملف Excel واحد متكامل"
          >
            <FileSpreadsheet size={18} className="animate-pulse" />
            <span>تنزيل التقرير المالي المكامل (Excel)</span>
          </button>
        </div>
      </div>

      {/* Monthly Dynamic CSV Financial Report Customizer */}
      <section className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 text-right space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#D4A33C]/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Download size={16} className="text-[#D4A33C]" />
              <span>مصدر التقارير المالية الشهرية المفصلة للطلاب والمعلمين (CSV و PDF)</span>
              <span className="text-[9px] bg-[#D4A33C]/10 text-[#D4A33C] px-2 py-0.5 rounded-full font-black">أداة محاسبية ذكية</span>
            </h4>
            <p className="text-xs text-slate-455 font-bold">قم بتخصيص فلاتر الاستخراج للحصول على كشف تفصيلي لحركات الحساب واللقاءات لشهر محدد لطالب معين أو معلّم معيّن بصيغة CSV أو مستند PDF محاسبي رسمي فوري للتحميل والطباعة.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* 1. Selector Group for Type (Student, Teacher, or Center) */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-600 mr-1">الفئة المحاسبية المستهدفة</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setMonReportType('student')}
                className={`py-2 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                  monReportType === 'student'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                الطلاب
              </button>
              <button
                type="button"
                onClick={() => setMonReportType('teacher')}
                className={`py-2 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                  monReportType === 'teacher'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                أجور المعلمين
              </button>
              <button
                type="button"
                onClick={() => setMonReportType('center')}
                className={`py-2 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                  monReportType === 'center'
                    ? 'bg-[#0D365A] text-[#D4A33C] font-extrabold shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                مركز التدريب
              </button>
            </div>
          </div>

          {/* 2. Selector Group for Student / Teacher List depending on Selection */}
          {monReportType === 'student' ? (
            <div className="space-y-2 md:col-span-1">
              <label className="block text-xs font-black text-slate-600 mr-1">اختر الطالب المستهدف</label>
              <select
                value={monSelectedStudentId}
                onChange={(e) => setMonSelectedStudentId(e.target.value)}
                className="w-full h-[46px] px-4 bg-slate-55 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none font-bold text-xs"
              >
                <option value="">-- كشف حساب عام لكافة الطلاب (شامل) 📊 --</option>
                {sortedStudents.map(st => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>
          ) : monReportType === 'teacher' ? (
            <div className="space-y-2 md:col-span-1">
              <label className="block text-xs font-black text-slate-600 mr-1">اختر الأستاذ المعني</label>
              <select
                value={monSelectedTeacherId}
                onChange={(e) => setMonSelectedTeacherId(e.target.value)}
                className="w-full h-[46px] px-4 bg-slate-55 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none font-bold text-xs"
              >
                <option value="">-- كشف مسير رواتب عام لكافة المعلمين (شامل) 💼 --</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2 md:col-span-1 opacity-60">
              <label className="block text-xs font-black text-slate-600 mr-1">نطاق الفرز المالي للمركز</label>
              <div className="w-full h-[46px] flex items-center px-4 bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs text-slate-500 select-none">
                كامل الدورات والمواد والمعلمين 📊
              </div>
            </div>
          )}

          {/* 3. Month picker */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-600 mr-1">الشهر الدفتري المستهدف</label>
            <select
              value={monSelectedMonth}
              onChange={(e) => setMonSelectedMonth(parseInt(e.target.value, 10))}
              className="w-full h-[46px] px-4 bg-slate-55 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none font-bold text-xs"
            >
              <option value="1">يناير (1)</option>
              <option value="2">فبراير (2)</option>
              <option value="3">مارس (3)</option>
              <option value="4">أبريل (4)</option>
              <option value="5">مايو (5)</option>
              <option value="6">يونيو (6)</option>
              <option value="7">يوليو (7)</option>
              <option value="8">أغسطس (8)</option>
              <option value="9">سبتمبر (9)</option>
              <option value="10">أكتوبر (10)</option>
              <option value="11">نوفمبر (11)</option>
              <option value="12">ديسمبر (12)</option>
            </select>
          </div>

          {/* 4. Year Picker */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-600 mr-1">السنة المالية للفرز</label>
            <select
              value={monSelectedYear}
              onChange={(e) => setMonSelectedYear(parseInt(e.target.value, 10))}
              className="w-full h-[46px] px-4 bg-slate-55 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none font-bold text-xs"
            >
              {[2024, 2025, 2026, 2027].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-end pt-2">
          {/* Dedicated Download Exam Report as PDF for Parents with View Mode Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-2xl border border-amber-400/40 shadow-md">
            <button
              onClick={() => setIsParentExamModalOpen(true)}
              className="px-5 py-3 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:opacity-95 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 transition-all active:scale-95 cursor-pointer select-none"
              title="تحميل وإصدار تقرير نتائج الاختبارات لأولياء الأمور بصيغة PDF مع الإحصائيات والتوصيات"
              id="section-download-parent-report-btn"
            >
              <GraduationCap size={16} className="text-slate-950" />
              <span>تقرير أولياء الأمور (PDF) 👨‍👩‍👧</span>
              {examResults.length > 0 && (
                <span className="bg-slate-950 text-amber-300 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold">
                  {examResults.length}
                </span>
              )}
            </button>

            {/* Quick Option Selector for Manager: Detailed View vs Summary View */}
            <div className="flex items-center gap-1 px-1 bg-slate-800/90 rounded-xl py-0.5 border border-slate-700/80">
              <button
                type="button"
                onClick={() => setParentReportViewMode('detailed')}
                className={`px-2.5 py-2 rounded-lg text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                  parentReportViewMode === 'detailed'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="العرض التفصيلي: تفصيل كامل للاختبارات والإجابات والتوصيات"
              >
                <span>تفصيلي 📑</span>
              </button>
              <button
                type="button"
                onClick={() => setParentReportViewMode('summary')}
                className={`px-2.5 py-2 rounded-lg text-[11px] font-black transition-all cursor-pointer flex items-center gap-1 ${
                  parentReportViewMode === 'summary'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
                title="العرض الموجز: الدرجة وتاريخ التقديم فقط (Score & Date Only)"
              >
                <span>موجز (درجة وتاريخ) ⚡</span>
              </button>
            </div>
          </div>

          {/* New Export Button: Current Financial Dashboard PDF (Center Income & Student Balances) */}
          <button
            onClick={handleExportFinancialDashboardPDF}
            disabled={isExportingFinancialPDF}
            className={`px-6 py-3.5 bg-gradient-to-r from-emerald-700 via-teal-800 to-[#0D365A] hover:opacity-95 text-white font-black text-xs rounded-2xl flex items-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer border border-emerald-400/50 select-none ${
              isExportingFinancialPDF ? 'opacity-80 cursor-wait' : ''
            }`}
            title="تصدير كشف رسمي فوري للمركز المالي وصافي الأرباح وأرصدة ومستحقات الطلاب بصيغة PDF معتمداً"
            id="section-export-financial-dashboard-pdf-btn"
          >
            {isExportingFinancialPDF ? (
              <Loader2 size={15} className="animate-spin text-emerald-200" />
            ) : (
              <FileText size={15} className="text-emerald-300" />
            )}
            <span>{isExportingFinancialPDF ? 'جاري استخراج التقرير المالي...' : 'تصدير التقرير المالي والأرصدة (PDF) 📊'}</span>
          </button>

          {/* New Export Button: Current Financial Dashboard Excel (.xlsx via exceljs) */}
          <button
            onClick={handleExportFinancialDashboardExcel}
            disabled={isExportingFinancialExcel}
            className={`px-6 py-3.5 bg-gradient-to-r from-emerald-700 to-green-800 hover:opacity-95 text-white font-black text-xs rounded-2xl flex items-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer border border-emerald-400/50 select-none ${
              isExportingFinancialExcel ? 'opacity-80 cursor-wait' : ''
            }`}
            title="تصدير بيانات لوحة المؤشرات المالية وأرصدة ومستحقات الطلاب بصيغة Excel (.xlsx)"
            id="section-export-financial-dashboard-excel-btn"
          >
            {isExportingFinancialExcel ? (
              <Loader2 size={15} className="animate-spin text-emerald-200" />
            ) : (
              <FileSpreadsheet size={15} className="text-emerald-300" />
            )}
            <span>{isExportingFinancialExcel ? 'جاري إنشاء ملف Excel...' : 'تصدير التقرير المالي والأرصدة (Excel) 📊'}</span>
          </button>

          <button
            onClick={exportVisualChartsReportToPDF}
            className="px-6 py-3.5 bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-extrabold text-xs rounded-2xl flex items-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer border border-blue-400/40 select-none"
            title="تصدير وطباعة التقارير والرسوم البيانية الحالية إلى صيغة PDF للطباعة"
            id="section-print-visual-charts-btn"
          >
            <Printer size={15} className="text-cyan-300" />
            <span>طباعة التقارير البيانية (PDF) 🖨️</span>
          </button>

          <button
            onClick={exportMonthlyReport}
            className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-[#D4A33C] hover:text-amber-300 font-extrabold text-xs rounded-2xl flex items-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer border border-slate-800 select-none"
          >
            <Download size={15} />
            <span>تصدير كـ CSV 📄</span>
          </button>
          
          <button
            onClick={() => exportMonthlyReportToPDF(false)}
            disabled={isGeneratingMonthlyPdf}
            className={`px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs rounded-2xl flex items-center gap-2 transition-all shadow-xs active:scale-95 cursor-pointer border border-slate-300 select-none ${isGeneratingMonthlyPdf ? 'opacity-80 cursor-wait' : ''}`}
            title="معاينة كشف الحساب المالي وطباعته أو حفظه"
            id="section-preview-monthly-pdf-btn"
          >
            {isGeneratingMonthlyPdf ? (
              <Loader2 size={15} className="animate-spin text-blue-600" />
            ) : (
              <FileText size={15} className="text-blue-600" />
            )}
            <span>معاينة وطباعة الكشف 👁️</span>
          </button>

          <button
            onClick={() => exportMonthlyReportToPDF(true)}
            disabled={isGeneratingMonthlyPdf}
            className={`px-6 py-3.5 bg-gradient-to-r from-[#0D365A] via-[#154673] to-[#0D365A] hover:opacity-95 text-[#D4A33C] hover:text-amber-300 font-black text-xs rounded-2xl flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer border border-amber-400/30 select-none ${isGeneratingMonthlyPdf ? 'opacity-80 cursor-wait' : ''}`}
            title="تنزيل كشف الحساب المالي كملف PDF مباشر لجهازك"
            id="section-export-monthly-pdf-btn"
          >
            {isGeneratingMonthlyPdf ? (
              <Loader2 size={15} className="animate-spin text-amber-300" />
            ) : (
              <Download size={15} className="text-amber-400" />
            )}
            <span>{isGeneratingMonthlyPdf ? 'جاري إنشاء وتنزيل الـ PDF...' : 'تحميل كملف PDF فوري 📕'}</span>
          </button>
        </div>
      </section>

      {/* Conditionally Render views */}
      {activeTab === 'dashboard' ? (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Recharts Analytics: Student Grade Distribution (Pie Chart) & Monthly Revenue Evolution (Line Chart) */}
          <ReportsRechartsAnalytics
            students={students}
            sessions={sessions}
            teachers={teachers}
            assignments={assignments}
            globalSettings={globalSettings}
          />

          <CustomizableDashboard
            teachers={teachers}
            students={students}
            sessions={filteredSessions}
            allSessions={sessions}
            payments={filteredPayments}
            credits={credits}
            expenses={expenses}
            groupCourses={groupCourses}
            assignments={assignments}
            stats={stats}
            monthlyPerfChartData={monthlyPerfChartData}
            perfMetric={perfMetric}
            setPerfMetric={setPerfMetric}
            perfTeacherId={perfTeacherId}
            setPerfTeacherId={setPerfTeacherId}
            globalSettings={globalSettings}
            allStudentAlerts={allStudentAlerts}
            exportStudentBalances={exportStudentBalances}
            TeacherProductivityDashboard={TeacherProductivityDashboard}
            onOpenMonthlyFinancialReport={(year, month) => {
              setIsMonthlyFinancialModalOpen(true);
            }}
            onNavigateToStudentFinancials={() => setActiveTab('student_financials')}
            onExportFinancialDashboardPDF={handleExportFinancialDashboardPDF}
            isExportingFinancialPDF={isExportingFinancialPDF}
            onExportFinancialDashboardExcel={handleExportFinancialDashboardExcel}
            isExportingFinancialExcel={isExportingFinancialExcel}
          />
        </div>
      ) : activeTab === 'recharts_analytics' ? (
        <div className="space-y-8 animate-in fade-in duration-300">
          <ReportsRechartsAnalytics
            students={students}
            sessions={sessions}
            teachers={teachers}
            assignments={assignments}
            globalSettings={globalSettings}
          />
        </div>
      ) : activeTab === 'profit_comparison' ? (
        /* =================== MONTHLY PROFIT COMPARISON VIEW =================== */
        <div className="space-y-8 animate-in fade-in duration-300">
          <MonthlyProfitComparisonDashboard
            sessions={sessions}
            expenses={expenses}
            teachers={teachers}
            students={students}
            assignments={assignments}
            payments={payments}
            credits={credits}
            groupCourses={groupCourses}
            globalSettings={globalSettings}
            onOpenMonthlyFinancialReport={(year, month) => {
              setIsMonthlyFinancialModalOpen(true);
            }}
          />
        </div>
      ) : activeTab === 'student_growth' ? (
        /* =================== STUDENT GROWTH & SUBJECT DISTRIBUTION VIEW =================== */
        <div className="space-y-8 animate-in fade-in duration-300">
          <StudentGrowthAndSubjectDistribution
            students={students}
            groupCourses={groupCourses}
            sessions={filteredSessions}
          />
        </div>
      ) : activeTab === 'student_financials' ? (
        /* =================== STUDENT FINANCIAL BALANCES & TUITION CHARTS (RECHARTS) =================== */
        <div className="space-y-8 animate-in fade-in duration-300">
          <StudentFinancialBalancesCharts
            students={students}
            sessions={filteredSessions}
            credits={filteredCredits}
            teachers={teachers}
            groupCourses={groupCourses}
            globalSettings={globalSettings}
            startDate={dashboardStartDate}
            endDate={dashboardEndDate}
            selectedSubject={selectedSubjectFilter}
            timePeriodLabel={activePeriodLabel}
            onOpenNotifyModal={(st) => openNotifier(st, 'sms')}
          />
        </div>
      ) : activeTab === 'accounting' ? (
        /* =================== ACCOUNTING & LEDGERS VIEWS =================== */
        <div className="space-y-10">
          {/* Visual Teacher Salaries & Monthly Financial Flows Chart (Recharts) */}
          <TeacherSalariesFlowChart
            teachers={teachers}
            sessions={filteredSessions}
            payments={filteredPayments}
            students={students}
            assignments={assignments}
            globalSettings={globalSettings}
          />

          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">دفتر الأستاذ العام والمخالصة المالية</h3>
                <p className="text-xs font-medium text-slate-400 mt-1">كشف شامل لمستحقات الأساتذة، المدفوعات المسجلة والذمم المعلقة</p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                <button 
                  type="button"
                  id="open-unified-payments-reports-btn"
                  onClick={() => setIsPaymentsManagerModalOpen(true)}
                  className="h-10 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer select-none border border-amber-300"
                  title="لوحة إدارة وتعديل كافة دفعات المعلمين والطلاب"
                >
                  <CreditCard size={14} />
                  <span>إدارة وتعديل كافة الدفعات 💳</span>
                </button>

                {/* Export button with dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setShowTeacherExDropdown(!showTeacherExDropdown)}
                    className="h-10 px-4 bg-emerald-600 hover:bg-emerald-750 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer select-none"
                  >
                    <Download size={14} />
                    <span>تصدير كشف المعلمين</span>
                  </button>
                  
                  {showTeacherExDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowTeacherExDropdown(false)} />
                      <div className="absolute left-0 mt-2 w-56 bg-white border border-slate-150 rounded-xl shadow-xl z-20 text-right overflow-hidden animate-fade-in">
                        <button
                          onClick={() => { exportTeacherLedger('xlsx'); setShowTeacherExDropdown(false); }}
                          className="w-full px-4 py-3 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-colors flex items-center gap-2 justify-start border-b border-slate-100"
                        >
                          <FileSpreadsheet size={15} className="text-emerald-600" />
                          <span>تنزيل مخصص لبرنامج إكسل (Excel)</span>
                        </button>
                        <button
                          onClick={() => { exportTeacherLedger('csv'); setShowTeacherExDropdown(false); }}
                          className="w-full px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2 justify-start"
                        >
                          <FileText size={15} className="text-slate-500" />
                          <span>تنزيل كملف CSV عام</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div className="relative group w-full md:w-64">
                  <Search size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#D4A33C]" />
                  <input 
                    type="text" 
                    placeholder="ابحث عن اسم معلم..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] outline-none transition-all shadow-sm"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto text-right">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/30 border-b border-slate-105">
                     <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">اسم الأستاذ المستقطب</th>
                     <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">مجموع ساعات التدريس</th>
                     <th className="px-6 py-4 text-[10px] font-black text-[#D4A33C] uppercase">إجمالي المستحقات المرصودة (الأرباح والمستحقات المترتبة بعد إنهاء اللقاء)</th>
                     <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase">حالة المقاصة</th>
                     <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase">التحكم بكشوف الراتب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-amber-500/5 group transition-all">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-6 py-4 text-xs font-bold text-slate-800">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {table.getRowModel().rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-20 text-center text-xs font-black text-slate-400">
                         لا يوجد أساتذة مسجلين في الوقت الحالي
                      </td>
                    </tr>
                  )}
                </tbody>
                {table.getRowModel().rows.length > 0 && (
                  <tfoot className="border-t-2 border-slate-300 bg-slate-100/90 font-black">
                    <tr className="hover:bg-slate-200/50 transition-colors">
                      <td className="px-6 py-4 text-xs font-black text-slate-900 border-l border-slate-200">
                        مجموع الساعات الكلي لجميع الحصص المسجلة ({table.getRowModel().rows.length} معلماً):
                      </td>
                      <td className="px-6 py-4 text-xs font-black text-indigo-700 bg-indigo-100/70 font-mono border-l border-slate-200">
                        {table.getRowModel().rows.reduce((sum, r) => sum + (r.original.hours || 0), 0).toFixed(1)} ساعة
                      </td>
                      <td className="px-6 py-4 text-xs font-black text-slate-900 font-mono border-l border-slate-200">
                        ₪{table.getRowModel().rows.reduce((sum, r) => sum + (r.original.balance || 0), 0).toFixed(0)}
                      </td>
                      <td colSpan={2} className="px-6 py-4 text-xs text-slate-500">
                        إجمالي ساعات ومستحقات الكادر التعليمي
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </section>
        </div>
      ) : activeTab === 'audit' ? (
        /* =================== FINANCIAL AUDIT VIEW =================== */
        <FinancialAudit 
          sessions={sessions}
          students={students}
          teachers={teachers}
          globalSettings={globalSettings}
          fetchMainData={fetchData}
          setToastAlert={setToastAlert}
        />
      ) : activeTab === 'scheduled' ? (
        /* =================== SCHEDULED REPORTS SECTION =================== */
        <div className="space-y-8 animate-in fade-in duration-300" dir="rtl">
          {/* Header section with Stats Cards */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-xs">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">جدولة تقارير الأداء الدورية (شهرياً)</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1">توليد تقارير أداء شاملة (حصص، تقييم أكاديمي، وضع مالي) بصيغة PDF قابلة للتحميل لكل طالب.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setEditingSchedule(null);
                setScheduleStudentId('');
                setScheduleAcademicProgress('تقدم أكاديمي ممتاز ومستمر في جميع المواضيع التدريسية، مع تطور لافت في الفهم وحل التدريبات.');
                setScheduleNotes('يرجى الاستمرار في المتابعة المنزلية لضمان المحافظة على هذا المستوى المتميز.');
                setScheduleStatus('active');
                setIsSchedulingModalOpen(true);
              }}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-md cursor-pointer border border-indigo-500 font-sans"
            >
              <Plus size={15} />
              <span>جدولة طالب جديد ➕</span>
            </button>
          </div>

          {/* Quick Filter Bar for Report Generation Month */}
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              <span className="text-xs font-black text-slate-700">تحديد الفترة المراد توليد التقارير عنها:</span>
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={monSelectedMonth}
                onChange={(e) => setMonSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                  <option key={m} value={m}>
                    {m === 1 ? 'يناير (01)' : m === 2 ? 'فبراير (02)' : m === 3 ? 'مارس (03)' : m === 4 ? 'أبريل (04)' : m === 5 ? 'مايو (05)' : m === 6 ? 'يونيو (06)' : m === 7 ? 'يوليو (07)' : m === 8 ? 'أغسطس (08)' : m === 9 ? 'سبتمبر (09)' : m === 10 ? 'أكتوبر (10)' : m === 11 ? 'نوفمبر (11)' : 'ديسمبر (12)'}
                  </option>
                ))}
              </select>

              <select
                value={monSelectedYear}
                onChange={(e) => setMonSelectedYear(parseInt(e.target.value))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Table list of schedules */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h4 className="text-sm font-black text-slate-800">الطلاب المدرجين في نظام الجدولة الدورية</h4>
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-lg">
                إجمالي المجدولين: {scheduledReports.length} طالب
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-150">
                    <th className="px-6 py-4 text-xs font-black text-slate-500">اسم الطالب</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500">الصف / المرحلة</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500">تواتر التقارير</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500">التطور الأكاديمي المجدول</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500">الحالة</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500">آخر تقرير تم إصداره</th>
                    <th className="px-6 py-4 text-xs font-black text-slate-500 text-center">خيارات التوليد والتحكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scheduledReports.map((schedule) => {
                    const studentObj = students.find(s => s.id === schedule.studentId);
                    return (
                      <tr key={schedule.id} className="hover:bg-slate-50/40 transition-all duration-150">
                        <td className="px-6 py-4 text-xs font-black text-slate-900">
                          {schedule.studentName}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-500">
                          {studentObj?.grade || studentObj?.academicLevel || 'غير محدد'}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-500">
                          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-[10px]">
                            شهرياً
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-500 max-w-[200px] truncate" title={schedule.academicProgress}>
                          {schedule.academicProgress}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => handleToggleScheduleStatus(schedule)}
                            className={`px-3 py-1 rounded-full text-[10px] font-black cursor-pointer border ${
                              schedule.status === 'active'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-slate-50 border-slate-200 text-slate-400'
                            }`}
                          >
                            {schedule.status === 'active' ? 'نشط 🟢' : 'معطل 🔴'}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-slate-400">
                          {schedule.lastGenerated ? (
                            <span className="text-slate-600 font-sans" dir="ltr">
                              {new Date(schedule.lastGenerated).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : 'لم يتم التوليد بعد ⚠️'}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleGenerateScheduledReport(schedule, monSelectedYear, monSelectedMonth)}
                              disabled={isGeneratingReport === schedule.studentId}
                              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black shadow-xs transition-all cursor-pointer disabled:bg-indigo-400"
                            >
                              {isGeneratingReport === schedule.studentId ? (
                                <span>جاري التوليد... ⏳</span>
                              ) : (
                                <>
                                  <FileText size={11} />
                                  <span>توليد وتنزيل التقرير PDF 📄</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditSchedule(schedule)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg cursor-pointer"
                              title="تعديل الإعدادات والتقييم المجدول"
                            >
                              <Pencil size={11} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSchedule(schedule.id)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-lg cursor-pointer"
                              title="حذف الجدولة"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {scheduledReports.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-20 text-center text-xs font-black text-slate-400">
                        لا توجد جداول تقارير دورية مضافة حالياً. اضغط على "جدولة طالب جديد" لبدء المتابعة الدورية.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Robust Scheduling Dialog / Modal Overlay */}
          {isSchedulingModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[250] p-4 text-right" dir="rtl">
              <div className="bg-white rounded-[2rem] max-w-lg w-full overflow-hidden border border-slate-150 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-indigo-600" />
                    <h3 className="text-sm font-black text-slate-900">
                      {editingSchedule ? 'تعديل جدول التقرير الدوري للطالب' : 'إنشاء جدول تقارير دوري جديد (شهرياً)'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSchedulingModalOpen(false);
                      setEditingSchedule(null);
                    }}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    <X size={16} />
                  </button>
                </div>

                <form onSubmit={handleSaveSchedule} className="p-6 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">اختر الطالب المستهدف للتقرير الدوري:</label>
                    <select
                      value={scheduleStudentId}
                      onChange={(e) => setScheduleStudentId(e.target.value)}
                      disabled={!!editingSchedule}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50"
                      required
                    >
                      <option value="">-- يرجى تحديد الطالب من القائمة --</option>
                      {sortedStudents.filter(s => !s.archived).map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.grade || s.academicLevel || 'غير محدد'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">التقييم والتطور الأكاديمي المجدول (سيظهر بالتقرير):</label>
                    <textarea
                      value={scheduleAcademicProgress}
                      onChange={(e) => setScheduleAcademicProgress(e.target.value)}
                      rows={4}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="صف التطور الأكاديمي، نقاط القوة، وتوصيات المدرس للمساق الأكاديمي..."
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">توجيهات وملاحظات إضافية لأولياء الأمور (اختياري):</label>
                    <textarea
                      value={scheduleNotes}
                      onChange={(e) => setScheduleNotes(e.target.value)}
                      rows={2}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="أي نصائح إضافية، مثل توجيهات المتابعة المنزلية..."
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-500 mb-1">الحالة التشغيلية للجدولة:</label>
                    <select
                      value={scheduleStatus}
                      onChange={(e) => setScheduleStatus(e.target.value as 'active' | 'inactive')}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="active">مفعل ونشط (سيتم إصدار تقارير له) 🟢</option>
                      <option value="inactive">معطل مؤقتاً 🔴</option>
                    </select>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer"
                    >
                      {editingSchedule ? 'حفظ التعديلات ✅' : 'إدراج بالجدولة ➕'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsSchedulingModalOpen(false);
                        setEditingSchedule(null);
                      }}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'expenses' ? (
        /* =================== EXPENSES MANAGEMENT SECTION =================== */
        <div className="space-y-8 animate-in fade-in duration-300" dir="rtl">
          {/* Header section with Stats Cards */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">إدارة المصروفات التشغيلية للمركز</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1">تتبع وإدارة بنود المصاريف مثل مصروفات التمويل والمصروفات الأخرى لتحديث حساب الأرباح الصافية بدقة.</p>
                </div>
              </div>
            </div>
            
            {/* Quick stats for expenses in active timeframe */}
            <div className="flex flex-wrap gap-4">
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl text-right min-w-[120px]">
                <span className="text-[10px] font-black text-blue-500 uppercase block">مصروفات تمويل</span>
                <h4 className="text-lg font-black text-blue-700 mt-0.5">₪{stats.financingExpenses.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</h4>
              </div>
              <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl text-right min-w-[120px]">
                <span className="text-[10px] font-black text-amber-500 uppercase block">مصروفات أخرى</span>
                <h4 className="text-lg font-black text-amber-700 mt-0.5">₪{stats.otherExpenses.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</h4>
              </div>
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl text-right min-w-[120px]">
                <span className="text-[10px] font-black text-rose-500 uppercase block">إجمالي المصروفات</span>
                <h4 className="text-lg font-black text-rose-700 mt-0.5">₪{stats.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</h4>
              </div>
            </div>
          </div>

          {/* Grid Layout for Add Expense and History */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-right">
            
            {/* Card 1: Add/Edit Expense Form */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>{editingExpenseId ? 'تعديل بند مصروف مالي ✏️' : 'تسجيل مصروف مالي جديد ➕'}</span>
              </h4>
              
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const amountNum = parseFloat(editingExpenseId ? editExpenseAmount : newExpenseAmount);
                  if (isNaN(amountNum) || amountNum <= 0) {
                    setToastAlert({ type: 'error', message: 'يرجى إدخال مبلغ صحيح أكبر من صفر.' });
                    return;
                  }

                  try {
                    const expenseData = {
                      amount: amountNum,
                      category: editingExpenseId ? editExpenseCategory : newExpenseCategory,
                      date: editingExpenseId ? editExpenseDate : newExpenseDate,
                      note: editingExpenseId ? editExpenseNote : newExpenseNote,
                    };

                    if (editingExpenseId) {
                      await updateDoc(doc(db, 'expenses', editingExpenseId), {
                        ...expenseData,
                        updatedAt: new Date().toISOString()
                      });
                      setToastAlert({ type: 'success', message: 'تم تحديث المصروف بنجاح ✅' });
                      setEditingExpenseId(null);
                    } else {
                      const expWithMeta = {
                        ...expenseData,
                        createdAt: new Date().toISOString()
                      };
                      await addDoc(collection(db, 'expenses'), expWithMeta);
                      setToastAlert({ type: 'success', message: 'تم تسجيل المصروف بنجاح ✅' });
                      setNewExpenseAmount('');
                      setNewExpenseNote('');
                    }
                    await fetchData();
                  } catch (err) {
                    setToastAlert({ type: 'error', message: 'فشل في حفظ المصروف في قاعدة البيانات.' });
                  }
                }}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 block">قيمة المصروف (شيكل ₪)</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    value={editingExpenseId ? editExpenseAmount : newExpenseAmount}
                    onChange={(e) => editingExpenseId ? setEditExpenseAmount(e.target.value) : setNewExpenseAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black outline-none focus:ring-2 focus:ring-amber-500/20 text-right"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 block">تصنيف وبند المصروف</label>
                  <select
                    value={editingExpenseId ? editExpenseCategory : newExpenseCategory}
                    onChange={(e) => editingExpenseId ? setEditExpenseCategory(e.target.value) : setNewExpenseCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="funding">مصروفات تمويل (Funding Expenses)</option>
                    <option value="other">مصروفات أخرى (Other Expenses)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 block">تاريخ المصروف</label>
                  <input 
                    type="date"
                    required
                    value={editingExpenseId ? editExpenseDate : newExpenseDate}
                    onChange={(e) => editingExpenseId ? setEditExpenseDate(e.target.value) : setNewExpenseDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20 text-right"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 block">بيان المصروف وتفاصيله (اختياري)</label>
                  <textarea 
                    value={editingExpenseId ? editExpenseNote : newExpenseNote}
                    onChange={(e) => editingExpenseId ? setEditExpenseNote(e.target.value) : setNewExpenseNote(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500/20 text-right"
                    placeholder="اكتب تفاصيل أو سبب صرف هذا المبلغ..."
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    type="submit"
                    className="flex-1 bg-[#1A365D] text-white hover:bg-[#D4A33C] hover:text-slate-950 py-3 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer"
                  >
                    {editingExpenseId ? 'حفظ التعديلات' : 'تسجيل المصروف 💸'}
                  </button>
                  {editingExpenseId && (
                    <button 
                      type="button"
                      onClick={() => setEditingExpenseId(null)}
                      className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl text-xs font-black transition-all cursor-pointer"
                    >
                      إلغاء
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Card 2: Expense History Table List */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900">سجل المصروفات المدرجة</h4>
                <span className="text-[10px] px-2.5 py-1 bg-slate-100 rounded-full font-black text-slate-550">
                  فرز بحسب الفترة المحددة: {filteredExpenses.length} مصروف
                </span>
              </div>

              <div className="border border-slate-100 rounded-2xl overflow-hidden text-right">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-150">
                    <tr>
                      <th className="px-4 py-3 font-black text-slate-400">التصنيف</th>
                      <th className="px-4 py-3 font-black text-slate-400">القيمة</th>
                      <th className="px-4 py-3 font-black text-slate-400">التاريخ</th>
                      <th className="px-4 py-3 font-black text-slate-400">البيان المالي والتفاصيل</th>
                      <th className="px-4 py-3 font-black text-slate-400 text-left">التحكم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredExpenses.sort((a,b) => b.date.localeCompare(a.date)).map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          {exp.category === 'funding' || exp.category === 'مصروفات تمويل' ? (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black border border-blue-100">
                              مصروفات تمويل
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black border border-amber-100">
                              مصروفات أخرى
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-black text-slate-900">₪{Number(exp.amount).toFixed(1)}</td>
                        <td className="px-4 py-3 text-slate-500 font-bold">{exp.date}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate font-medium" title={exp.note}>
                          {exp.note || '—'}
                        </td>
                        <td className="px-4 py-3 text-left">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingExpenseId(exp.id);
                                setEditExpenseAmount(String(exp.amount));
                                setEditExpenseCategory(exp.category);
                                setEditExpenseDate(exp.date);
                                setEditExpenseNote(exp.note || '');
                              }}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                              title="تعديل تفاصيل المصروف"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={async () => {
                                if (window.confirm('هل أنت متأكد من رغبتك في حذف هذا المصروف نهائياً؟')) {
                                  try {
                                    await deleteDoc(doc(db, 'expenses', exp.id));
                                    setToastAlert({ type: 'success', message: 'تم حذف المصروف بنجاح' });
                                    await fetchData();
                                  } catch (err) {
                                    setToastAlert({ type: 'error', message: 'فشل في حذف المصروف.' });
                                  }
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="حذف المصروف نهائياً"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredExpenses.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-xs font-black text-slate-400">
                          لا توجد مصروفات مسجلة في هذه الفترة الزمنية المحددة.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      ) : activeTab === 'audit' ? (
        /* =================== FINANCIAL AUDIT VIEW =================== */
        <FinancialAudit 
          sessions={sessions}
          students={students}
          teachers={teachers}
          globalSettings={globalSettings}
          fetchMainData={fetchData}
          setToastAlert={setToastAlert}
        />
      ) : (
        /* =================== CUSTOM DETAILED LESSONS REPORT =================== */
        <div className="space-y-8 animate-in fade-in duration-300">
          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden text-right" dir="rtl">
            {/* أعلى التقرير (Header) */}
            <div className="p-8 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 leading-tight">لوحة كشف الحصص التفاعلية</h3>
                  <p className="text-xs font-bold text-slate-400 mt-1">عرض حركة الحصص والنشاط التعليمي بأبعاد مخصصة ومقاييس الأداء</p>
                </div>
                
                {/* Export custom table to spreadsheet or PDF if user desires */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={exportCustomReportToExcel}
                    className="px-4 py-2 bg-[#1A365D] hover:bg-[#11243f] text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border-none"
                  >
                    <FileSpreadsheet size={14} className="text-[#D4A33C]" />
                    <span>تصدير كشف الحصص المخصص (Excel) 📊</span>
                  </button>

                  <button
                    type="button"
                    onClick={exportCustomReportToPDF}
                    className="px-4 py-2 bg-[#0D365A] hover:bg-[#154673] text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border-none"
                  >
                    <FileText size={14} className="text-[#D4A33C]" />
                    <span>تصدير كشف الحصص كـ PDF 📕</span>
                  </button>
                </div>
              </div>

              {/* أدوات التحكم بالفلترة والزمن في أعلى التقرير */}
              <div className="space-y-4">
                {(globalSettings.customReportPeriods || []).length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-150 p-4.5 rounded-2xl text-right" dir="rtl">
                    <span className="text-[11px] font-black text-slate-500 ml-2">الفترات الزمنية المعتمدة (تحديد تلقائي):</span>
                    {(globalSettings.customReportPeriods || []).map((period) => (
                      <button
                        key={period.id}
                        type="button"
                        onClick={() => {
                          setCustomStartDate(period.startDate);
                          setCustomEndDate(period.endDate);
                        }}
                        className={`px-3 py-1.5 border rounded-xl text-[11px] font-black transition-colors cursor-pointer ${
                          customStartDate === period.startDate && customEndDate === period.endDate
                            ? 'bg-indigo-600 border-indigo-650 text-white shadow-sm'
                            : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        {period.name}
                      </button>
                    ))}
                    {(customStartDate || customEndDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomStartDate('');
                          setCustomEndDate('');
                        }}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl text-[11px] font-black transition-colors cursor-pointer"
                      >
                        مسح الفلترة ×
                      </button>
                    )}
                  </div>
                )}
                
                <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-6">
                  {/* Row 1: المعلم (اسم المعلم وقائمة الاختيار) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 text-right">
                      <label htmlFor="custom-teacher-filter" className="block text-xs font-black text-slate-600 mr-1 flex items-center gap-1.5">
                        <Users size={13} className="text-[#D4A33C]" />
                        <span>اختيار معلم محدد (من القائمة):</span>
                      </label>
                      <select
                        id="custom-teacher-filter"
                        value={customTeacherFilter}
                        onChange={(e) => setCustomTeacherFilter(e.target.value)}
                        className="w-full h-11 px-3.5 bg-slate-5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-[#1A365D] transition-all cursor-pointer"
                      >
                        <option value="all">-- جميع المعلمين بالمنصة --</option>
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 text-right">
                      <label htmlFor="custom-teacher-search" className="block text-xs font-black text-slate-600 mr-1 flex items-center gap-1.5">
                        <Search size={13} className="text-[#D4A33C]" />
                        <span>البحث النصي السريع عن اسم المعلم:</span>
                      </label>
                      <div className="relative">
                        <Search size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          id="custom-teacher-search"
                          placeholder="اكتب جزءاً من اسم المعلم للبحث المباشر..."
                          value={customTeacherSearch}
                          onChange={(e) => setCustomTeacherSearch(e.target.value)}
                          className="w-full h-11 pr-10 pl-3.5 bg-slate-5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-[#1A365D] transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: التواريخ (تاريخ محدد، أو نطاق زمني) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2 text-right">
                      <label htmlFor="custom-specific-date" className="block text-xs font-black text-slate-600 mr-1 flex items-center gap-1.5">
                        <Calendar size={13} className="text-[#D4A33C]" />
                        <span>تاريخ محدد (البحث عن يوم معين):</span>
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          id="custom-specific-date"
                          value={customSpecificDate}
                          onChange={(e) => setCustomSpecificDate(e.target.value)}
                          className={`w-full h-11 px-3.5 bg-slate-5 border rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-[#1A365D] transition-all cursor-pointer ${
                            customSpecificDate ? 'border-amber-500 ring-2 ring-amber-500/10' : 'border-slate-200'
                          }`}
                        />
                        {customSpecificDate && (
                          <button
                            type="button"
                            onClick={() => setCustomSpecificDate('')}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md px-1.5 py-0.5 border-none cursor-pointer"
                            title="مسح التاريخ المحدد"
                          >
                            مسح ×
                          </button>
                        )}
                      </div>
                      {customSpecificDate && (
                        <p className="text-[10px] text-amber-600 font-bold leading-tight mt-1 mr-1">
                          ⚡ تم تنشيط فلترة اليوم المحدد؛ سيتم تجاهل النطاق الزمني.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 text-right">
                      <label htmlFor="custom-start-date" className={`block text-xs font-black mr-1 flex items-center gap-1.5 ${customSpecificDate ? 'text-slate-400' : 'text-slate-600'}`}>
                        <Clock size={13} className={customSpecificDate ? 'text-slate-300' : 'text-[#D4A33C]'} />
                        <span>تاريخ بداية النطاق الزمني:</span>
                      </label>
                      <input
                        type="date"
                        id="custom-start-date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        disabled={!!customSpecificDate}
                        className="w-full h-11 px-3.5 bg-slate-5 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-[#1A365D] transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                      />
                    </div>

                    <div className="space-y-2 text-right">
                      <label htmlFor="custom-end-date" className={`block text-xs font-black mr-1 flex items-center gap-1.5 ${customSpecificDate ? 'text-slate-400' : 'text-slate-600'}`}>
                        <Clock size={13} className={customSpecificDate ? 'text-slate-300' : 'text-[#D4A33C]'} />
                        <span>تاريخ نهاية النطاق الزمني:</span>
                      </label>
                      <input
                        type="date"
                        id="custom-end-date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        disabled={!!customSpecificDate}
                        className="w-full h-11 px-3.5 bg-slate-5 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-[#1A365D] transition-all cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Row 3: التصنيف المالي */}
                  <div className="space-y-2 text-right pt-4 border-t border-slate-100">
                    <label htmlFor="custom-financial-classification" className="block text-xs font-black text-slate-600 mr-1 flex items-center gap-1.5">
                      <DollarSign size={13} className="text-[#D4A33C]" />
                      <span>التصنيف المالي للحصص والعمليات التعليمية:</span>
                    </label>
                    <select
                      id="custom-financial-classification"
                      value={customFinancialClassification}
                      onChange={(e) => setCustomFinancialClassification(e.target.value)}
                      className="w-full h-11 px-3.5 bg-slate-5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-[#1A365D] transition-all cursor-pointer"
                    >
                      <option value="all">-- جميع الحصص والعمليات (الكل) --</option>
                      <option value="profitable">حصص ذات هامش ربح إيجابي (إيراد الطالب &gt; مستحق المعلم) 📈</option>
                      <option value="unprofitable">حصص متعادلة أو ذات هامش ربح سلبي/تطوعي (إيراد &lt;= مستحق المعلم) 📉</option>
                      <option value="free">حصص مجانية بالكامل للطلبة (الرسوم = 0) 🎁</option>
                      <option value="high_value">حصص عالية القيمة للمركز (إجمالي الرسوم &gt; 100 ₪) 💎</option>
                      <option value="group">حصص جماعية (مجموعات/دورات) 👥</option>
                      <option value="individual">حصص فردية (خاصة) 👤</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* وسط التقرير (جدول البيانات الرئيسي) */}
            <div className="p-8">
              <div className="flex items-center justify-between mb-4.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-black block">إحصاءات الكشف</span>
                  <span className="text-xs font-bold text-slate-550">
                    عدد الصفوف المطابقة: <strong className="text-slate-800 font-extrabold">{filteredCustomSessions.length} حركة</strong>
                  </span>
                </div>
                
                {filteredCustomSessions.length > 0 && (
                  <div className="text-xs font-black text-slate-705">
                    مجموع الساعات للمقاييس: <strong className="text-indigo-600 font-extrabold font-mono text-sm">
                      {filteredCustomSessions.reduce((sum, s) => sum + s.durationHours, 0).toFixed(1)} ساعة
                    </strong>
                  </div>
                )}
              </div>

              <div className="overflow-hidden border border-slate-150 rounded-2xl shadow-sm">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-155">
                      <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right border-l border-slate-150 bg-slate-50/70">اسم الطالب</th>
                      <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right border-l border-slate-150 bg-slate-50/70">اسم المعلم</th>
                      <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right border-l border-slate-150 bg-slate-50/70">المادة / المساق</th>
                      <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right border-l border-slate-150 bg-slate-50/70">تاريخ الحصة</th>
                      <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right border-l border-slate-150 bg-indigo-50/40">مدة الحصة</th>
                      <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right border-l border-slate-150 bg-slate-50/70">رسوم الطالب (الإيراد)</th>
                      <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right border-l border-slate-150 bg-slate-50/70">مستحق المعلم (الأجر)</th>
                      <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right border-l border-slate-150 bg-slate-50/70">صافي هامش الربح</th>
                      <th className="px-4 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">التصنيف المالي والنوع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-105">
                    {filteredCustomSessions.map(session => {
                      const studentObj = students.find(s => s.id === session.studentId);
                      const teacherObj = teachers.find(t => t.id === session.teacherId);
                      
                      // Calculate Student Revenue
                      const studentRate = getStudentDefaultHourlyRate(studentObj, globalSettings, teacherObj);
                      const revenue = session.customFee !== undefined 
                        ? session.customFee 
                        : (session.durationHours * studentRate);
                        
                      // Calculate Teacher Payout
                      const teacherRate = teacherObj?.hourlyRate ?? globalSettings.defaultTeacherHourlyRate ?? 35;
                      const payout = session.customPayout !== undefined 
                        ? session.customPayout 
                        : (session.durationHours * teacherRate);
                        
                      const netProfit = revenue - payout;
                      const isGroup = session.isGroupSession || session.groupId;

                      // Financial badge
                      let financialBadge = (
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-black border border-emerald-100 whitespace-nowrap block text-center">
                          ربحية موجبة 📈 (+{(netProfit).toFixed(0)} ₪)
                        </span>
                      );
                      if (revenue === 0) {
                        financialBadge = (
                          <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black border border-amber-100 whitespace-nowrap block text-center">
                            حصة مجانية 🎁 (0 ₪)
                          </span>
                        );
                      } else if (netProfit <= 0) {
                        financialBadge = (
                          <span className="px-2 py-1 bg-rose-50 text-rose-700 rounded-lg text-[10px] font-black border border-rose-100 whitespace-nowrap block text-center">
                            هامش سلبي/تعادل 📉 ({(netProfit).toFixed(0)} ₪)
                          </span>
                        );
                      }

                      return (
                        <tr key={session.id} className="hover:bg-slate-50/70 transition-all">
                          {/* اسم الطالب */}
                          <td className="px-4 py-3.5 text-xs font-black text-slate-800 border-l border-slate-100">
                            {studentObj ? studentObj.name : <span className="text-slate-400 font-normal">طالب محذوف / غير موجود</span>}
                          </td>
                          {/* اسم المعلم */}
                          <td className="px-4 py-3.5 text-xs font-bold text-slate-700 border-l border-slate-100">
                            {teacherObj ? teacherObj.name : <span className="text-slate-400 font-normal">معلم محذوف / غير معروف</span>}
                          </td>
                          {/* المادة */}
                          <td className="px-4 py-3.5 text-xs font-bold text-slate-500 border-l border-slate-100">
                            {session.subject || 'مادة عامة'}
                          </td>
                          {/* تاريخ الحصة */}
                          <td className="px-4 py-3.5 text-xs font-bold text-slate-650 font-mono border-l border-slate-100">
                            {session.date ? formatCustomDate(session.date) : <span className="text-slate-400">-</span>}
                          </td>
                          {/* مدة الحصة */}
                          <td className="px-4 py-3.5 text-xs font-black text-indigo-700 bg-indigo-50/15 font-mono border-l border-slate-100">
                            {session.durationHours} ساعة
                          </td>
                          {/* إيراد الطالب */}
                          <td className="px-4 py-3.5 text-xs font-black text-emerald-700 font-mono border-l border-slate-100">
                            {revenue.toFixed(1)} ₪
                          </td>
                          {/* مستحق المعلم */}
                          <td className="px-4 py-3.5 text-xs font-black text-orange-700 font-mono border-l border-slate-100">
                            {payout.toFixed(1)} ₪
                          </td>
                          {/* صافي الربح */}
                          <td className={`px-4 py-3.5 text-xs font-black font-mono border-l border-slate-100 ${netProfit > 0 ? 'text-teal-600' : 'text-rose-600'}`}>
                            {netProfit.toFixed(1)} ₪
                          </td>
                          {/* التصنيف المالي */}
                          <td className="px-4 py-3.5 text-xs font-bold">
                            <div className="flex flex-col gap-1 items-start">
                              {financialBadge}
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${isGroup ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-600 border border-slate-200'} whitespace-nowrap block w-full text-center`}>
                                {isGroup ? '👥 حصة جماعية' : '👤 حصة فردية'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredCustomSessions.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-20 text-center text-sm font-black text-slate-400">
                          لا يوجد حصص مطابقة لمعايير البحث المحددة أعلاه. يرجى تعديل خيارات الفلترة أو التواريخ أو التصنيفات.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {filteredCustomSessions.length > 0 && (
                    <tfoot className="border-t-2 border-slate-300 bg-slate-100/90 font-black">
                      <tr className="hover:bg-slate-200/50 transition-colors">
                        <td colSpan={4} className="px-4 py-4 text-xs font-black text-slate-900 border-l border-slate-200 text-right">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                            <span>مجموع الساعات الكلي لجميع الحصص المسجلة ({filteredCustomSessions.length} حصة):</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-xs font-black text-indigo-700 bg-indigo-100/70 font-mono border-l border-slate-200">
                          {filteredCustomSessions.reduce((sum, s) => sum + s.durationHours, 0).toFixed(1)} ساعة
                        </td>
                        <td className="px-4 py-4 text-xs font-black text-emerald-700 font-mono border-l border-slate-200">
                          {filteredCustomSessions.reduce((sum, session) => {
                            const studentObj = students.find(s => s.id === session.studentId);
                            const teacherObj = teachers.find(t => t.id === session.teacherId);
                            const studentRate = getStudentDefaultHourlyRate(studentObj, globalSettings, teacherObj);
                            return sum + (session.customFee !== undefined ? session.customFee : (session.durationHours * studentRate));
                          }, 0).toFixed(1)} ₪
                        </td>
                        <td className="px-4 py-4 text-xs font-black text-orange-700 font-mono border-l border-slate-200">
                          {filteredCustomSessions.reduce((sum, session) => {
                            const teacherObj = teachers.find(t => t.id === session.teacherId);
                            const teacherRate = teacherObj?.hourlyRate ?? globalSettings.defaultTeacherHourlyRate ?? 35;
                            return sum + (session.customPayout !== undefined ? session.customPayout : (session.durationHours * teacherRate));
                          }, 0).toFixed(1)} ₪
                        </td>
                        <td className="px-4 py-4 text-xs font-black text-teal-700 font-mono border-l border-slate-200">
                          {(() => {
                            const rev = filteredCustomSessions.reduce((sum, session) => {
                              const studentObj = students.find(s => s.id === session.studentId);
                              const teacherObj = teachers.find(t => t.id === session.teacherId);
                              const studentRate = getStudentDefaultHourlyRate(studentObj, globalSettings, teacherObj);
                              return sum + (session.customFee !== undefined ? session.customFee : (session.durationHours * studentRate));
                            }, 0);
                            const pay = filteredCustomSessions.reduce((sum, session) => {
                              const teacherObj = teachers.find(t => t.id === session.teacherId);
                              const teacherRate = teacherObj?.hourlyRate ?? globalSettings.defaultTeacherHourlyRate ?? 35;
                              return sum + (session.customPayout !== undefined ? session.customPayout : (session.durationHours * teacherRate));
                            }, 0);
                            const net = rev - pay;
                            return `${net >= 0 ? '+' : ''}${net.toFixed(1)} ₪`;
                          })()}
                        </td>
                        <td className="px-4 py-4 text-center text-xs font-black text-slate-700">
                          إجمالي الكشف المالي
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Teacher Detailed Overlay for financial tracking */}
      <AnimatePresence>
        {selectedTeacherId && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6" dir="rtl">
            <motion.div 
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] border border-slate-100 text-right"
            >
              <div className="p-8 border-b border-slate-150 flex items-center justify-between bg-white">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-lg">
                    <FileText size={22} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 leading-none">
                      {teachers.find(t => t.id === selectedTeacherId)?.name}
                    </h3>
                    <p className="text-[10px] font-black text-[#D4A33C] uppercase tracking-widest mt-1.5">كشف الحساب والمكافآت التفصيلية</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setSelectedTeacherId(null); setShowPaymentForm(false); }}
                  className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-colors border border-slate-150"
                >
                  <ArrowLeft size={18} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                <div className="grid grid-cols-4 gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-right">
                   {(() => {
                     const t = teachers.find(t => t.id === selectedTeacherId);
                     const s = sessions.filter(s => s.teacherId === selectedTeacherId && s.approved !== false && s.status !== 'pending' && s.status !== 'booked');
                     const hrs = s.reduce((sum, sx) => sum + sx.durationHours, 0);
                     const val = s.reduce((sum, sx) => {
                       if (sx.customPayout !== undefined) return sum + sx.customPayout;
                       const rate = getTeacherPayoutRateForSession(sx.studentId, selectedTeacherId!);
                       return sum + (sx.durationHours * rate);
                     }, 0);
                     const p = payments.filter(px => px.teacherId === selectedTeacherId).reduce((sum, px) => sum + px.amount, 0);
                     return [
                       { label: 'ساعات التدريس', val: `${hrs} ساعة`, color: 'text-indigo-650' },
                       { label: 'المستحقات الكلية', val: `₪${val.toFixed(0)}`, color: 'text-slate-900' },
                       { label: 'المدفوع الكاش', val: `₪${p.toFixed(0)}`, color: 'text-emerald-500' },
                       { label: 'المتبقي في الذمة', val: `₪${(val - p).toFixed(0)}`, color: 'text-rose-500' },
                     ].map((stat, i) => (
                       <div key={i} className="space-y-1">
                          <p className="text-[9px] font-black text-slate-400 uppercase">{stat.label}</p>
                          <h4 className={`text-xl font-black ${stat.color}`}>{stat.val}</h4>
                       </div>
                     ))
                   })()}
                </div>

                {/* Previous Months' Dues Settlement Panel */}
                {(() => {
                  const prevBalance = getTeacherPreviousMonthsBalance(selectedTeacherId);
                  if (prevBalance <= 0) return null;
                  return (
                    <div className="bg-rose-50/70 border border-rose-100 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-right">
                      <div className="space-y-1 text-right">
                        <span className="text-[10px] bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-md font-black w-fit block">
                          تنبيه مستحقات معلقة للأشهر السابقة 💸
                        </span>
                        <h4 className="text-sm font-black text-slate-800">
                          هذا المعلم لديه ذمم مالية مستحقة للأشهر السابقة بقيمة: 
                          <span className="text-rose-600 font-mono font-black text-base mx-1">₪{prevBalance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })}</span>
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium">
                          يمكنك كمدير منصة تصفية وتصفير هذه الديون السابقة فورياً. سيقوم النظام بإنشاء دفعة تسوية آلية مؤرخة بآخر يوم من الشهر الماضي.
                        </p>
                      </div>
                      
                      <button
                        type="button"
                        disabled={isSubmittingSettleDues}
                        onClick={() => handleSettleTeacherPreviousDues(selectedTeacherId)}
                        className="px-5 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 cursor-pointer select-none whitespace-nowrap shrink-0"
                      >
                        {isSubmittingSettleDues ? 'جاري التسوية...' : settleDuesSuccess ? 'تمت التسوية بنجاح! ✓' : 'تصفير وتسوية المستحقات السابقة 💸'}
                      </button>
                    </div>
                  );
                })()}

                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-slate-400">شجرة محاسبة مدفوعات الأستاذ</span>
                  <button 
                    onClick={() => setShowPaymentForm(!showPaymentForm)}
                    className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs hover:bg-[#D4A33C] hover:text-slate-950 transition-style flex items-center gap-2 shadow-lg"
                  >
                    <Plus size={14} />
                    تسجيل دفعة نقدية جديدة
                  </button>
                </div>

                {/* Log Payment Form */}
                <AnimatePresence>
                  {showPaymentForm && (
                    <motion.form 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      onSubmit={logPayment}
                      className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100/50 flex flex-col md:flex-row items-end gap-5 overflow-hidden text-right"
                    >
                      <div className="grid grid-cols-2 gap-4 flex-1 w-full text-right">
                        <div className="space-y-1.5 flex flex-col">
                          <label className="text-[10px] font-black text-indigo-500 uppercase">قيمة الدفعة (شيكل ₪)</label>
                          <input 
                            type="number"
                            required
                            step="0.01"
                            value={newPaymentAmount}
                            onChange={e => setNewPaymentAmount(e.target.value)}
                            className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-xs font-black outline-none focus:ring-4 focus:ring-indigo-650/10 text-right"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-1.5 flex flex-col">
                          <label className="text-[10px] font-black text-indigo-500 uppercase">تاريخ الدفعة</label>
                          <input 
                            type="date"
                            required
                            value={newPaymentDate}
                            onChange={e => setNewPaymentDate(e.target.value)}
                            className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-3 text-xs font-bold outline-none text-right"
                          />
                        </div>
                      </div>
                      <button 
                        type="submit"
                        className="bg-indigo-650 text-white hover:bg-[#D4A33C] hover:text-slate-950 px-8 py-3.5 rounded-xl text-xs font-black transition-all shadow-md"
                      >
                        تسجيل الدفعة
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Past sessions / History table inside detailed profile ledger */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">مذكرات وسجلات النشاطات والمخرجات</h4>
                      
                      {/* Tab Selectors */}
                      <div className="flex items-center gap-2 mt-3 text-right">
                        <button
                          type="button"
                          onClick={() => setActiveLedgerTab('sessions')}
                          className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all border ${
                            activeLedgerTab === 'sessions'
                              ? 'bg-[#1A365D] text-white border-[#1A365D]'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                          }`}
                        >
                          سجل الحصص المنفذة ({sessions.filter(s => s.teacherId === selectedTeacherId && s.approved !== false && s.status !== 'pending' && s.status !== 'booked').length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveLedgerTab('payments')}
                          className={`px-3 py-1.5 text-[11px] font-black rounded-lg transition-all border ${
                            activeLedgerTab === 'payments'
                              ? 'bg-[#1A365D] text-white border-[#1A365D]'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                          }`}
                        >
                          سجل الدفعات المالية ({payments.filter(p => p.teacherId === selectedTeacherId).length})
                        </button>
                      </div>
                    </div>
                    
                    {/* Exporter button details for selected teacher */}
                    <div className="relative shrink-0">
                      <button
                        onClick={() => setShowTeacherSessExDropdown(!showTeacherSessExDropdown)}
                        className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] rounded-lg flex items-center justify-center gap-1.5 transition-all select-none border border-slate-200 cursor-pointer"
                      >
                        <Download size={11} />
                        <span>تصدير السجل المالي للساعات</span>
                      </button>
                      
                      {showTeacherSessExDropdown && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowTeacherSessExDropdown(false)} />
                          <div className="absolute left-0 mt-1 w-52 bg-white border border-slate-150 rounded-lg shadow-xl z-20 text-right overflow-hidden animate-fade-in font-sans">
                            <button
                              onClick={() => { exportTeacherSessions(selectedTeacherId!, 'xlsx'); setShowTeacherSessExDropdown(false); }}
                              className="w-full px-3 py-2 text-[10px] font-black text-slate-700 hover:bg-indigo-50 hover:text-indigo-800 transition-colors flex items-center gap-2 justify-start border-b border-slate-100"
                            >
                              <FileSpreadsheet size={12} className="text-indigo-600" />
                              <span>تنزيل مخصص لبرنامج إكسل (Excel)</span>
                            </button>
                            <button
                              onClick={() => { exportTeacherSessions(selectedTeacherId!, 'csv'); setShowTeacherSessExDropdown(false); }}
                              className="w-full px-3 py-2 text-[10px] font-black text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2 justify-start"
                            >
                              <FileText size={12} className="text-slate-500" />
                              <span>تنزيل كملف CSV عام</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {activeLedgerTab === 'sessions' ? (
                    <div className="border border-slate-100 rounded-[1.5rem] overflow-hidden text-right">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-4 font-black text-slate-400">الطالب</th>
                            <th className="px-6 py-4 font-black text-slate-400">المادة</th>
                            <th className="px-6 py-4 font-black text-slate-400">الساعات</th>
                            <th className="px-6 py-4 font-black text-slate-400 text-left">التاريخ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-800">
                          {sessions.filter(s => s.teacherId === selectedTeacherId && s.approved !== false && s.status !== 'pending' && s.status !== 'booked').sort((a,b) => b.date.localeCompare(a.date)).map(session => (
                            <tr key={session.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-900">{students.find(st => st.id === session.studentId)?.name}</td>
                              <td className="px-6 py-4 text-slate-450 uppercase">{session.subject}</td>
                              <td className="px-6 py-4 font-black text-indigo-600">{session.durationHours} ساعة</td>
                              <td className="px-6 py-4 text-left font-sans text-slate-400">{formatCustomDate(session.date)}</td>
                            </tr>
                          ))}
                        </tbody>
                        {(() => {
                          const teacherSessionsList = sessions.filter(s => s.teacherId === selectedTeacherId && s.approved !== false && s.status !== 'pending' && s.status !== 'booked');
                          if (teacherSessionsList.length === 0) return null;
                          const totalHrs = teacherSessionsList.reduce((sum, s) => sum + s.durationHours, 0);
                          return (
                            <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-black">
                              <tr>
                                <td colSpan={2} className="px-6 py-3.5 text-xs text-slate-900">
                                  مجموع الساعات الكلي لجميع الحصص المسجلة ({teacherSessionsList.length} حصة):
                                </td>
                                <td className="px-6 py-3.5 text-xs text-indigo-700 bg-indigo-50/50 font-mono">
                                  {totalHrs.toFixed(1)} ساعة
                                </td>
                                <td className="px-6 py-3.5 text-left text-xs text-slate-500">
                                  إجمالي الحصص
                                </td>
                              </tr>
                            </tfoot>
                          );
                        })()}
                      </table>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Active / Archive Toggle Pill tabs */}
                      <div className="flex border-b border-slate-200">
                        <button
                          type="button"
                          onClick={() => setPaymentArchivedView('active')}
                          className={`flex-1 py-2.5 text-center text-[11px] font-black transition-all border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
                            paymentArchivedView === 'active'
                              ? 'border-[#D4A33C] text-[#1A365D]'
                              : 'border-transparent text-slate-400 hover:text-slate-650'
                          }`}
                        >
                          💸 الدفعات النشطة ({payments.filter(p => p.teacherId === selectedTeacherId && !p.archived).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentArchivedView('archived')}
                          className={`flex-1 py-2.5 text-center text-[11px] font-black transition-all border-b-2 cursor-pointer flex items-center justify-center gap-1.5 ${
                            paymentArchivedView === 'archived'
                              ? 'border-[#D4A33C] text-[#1A365D]'
                              : 'border-transparent text-slate-400 hover:text-slate-650'
                          }`}
                        >
                          📦 أرشيف الدفعات القديمة (&gt; شهرين) ({payments.filter(p => p.teacherId === selectedTeacherId && p.archived).length})
                        </button>
                      </div>

                      <div className="border border-slate-100 rounded-[1.5rem] overflow-hidden text-right">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-6 py-4 font-black text-slate-400">المبلغ المدفوع</th>
                              <th className="px-6 py-4 font-black text-slate-400">التاريخ</th>
                              <th className="px-6 py-4 font-black text-slate-400">الملاحظات والبيان</th>
                              <th className="px-6 py-4 font-black text-slate-400 text-left">التحكم</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-800">
                            {(() => {
                              const teacherPayments = payments.filter(p => {
                                if (p.teacherId !== selectedTeacherId) return false;
                                if (paymentArchivedView === 'active' && p.archived) return false;
                                if (paymentArchivedView === 'archived' && !p.archived) return false;
                                return true;
                              });

                              if (teacherPayments.length === 0) {
                                return (
                                  <tr>
                                    <td colSpan={4} className="py-8 text-center text-slate-400 font-bold">
                                      {paymentArchivedView === 'active' 
                                        ? "لا يوجد أي دفعات مالية نشطة مسجلة بعد لهذا المعلم" 
                                        : "لا يوجد أي دفعات مؤرشفة لهذا المعلم"}
                                    </td>
                                  </tr>
                                );
                              }
                              return teacherPayments.sort((a,b) => b.date.localeCompare(a.date)).map(pay => (
                                <tr key={pay.id} className="hover:bg-slate-55/45 transition-colors">
                                  <td className="px-6 py-4 font-bold text-emerald-600">₪{pay.amount.toFixed(1)}</td>
                                  <td className="px-6 py-4 font-bold text-slate-500">{formatCustomDate(pay.date)}</td>
                                  <td className="px-6 py-4 text-slate-600">
                                    {pay.note || <span className="text-slate-350 italic">بدون بيان</span>}
                                    {pay.archived && (
                                      <span className="mr-2 px-1.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[8px] font-black">مؤرشفة</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-left">
                                    <div className="flex items-center gap-1.5 justify-end">
                                      <button
                                        onClick={() => handleOpenEditPayment(pay)}
                                        className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-[#D4A33C] hover:text-slate-950 transition-colors flex items-center justify-center cursor-pointer inline-flex"
                                        title="تعديل الدفعة بقلم بجوارها"
                                      >
                                        <Pencil size={11} />
                                      </button>
                                      {!pay.archived && isOlderThanTwoMonths(pay.date) && (
                                        <button
                                          onClick={() => handleArchivePayment(pay.id)}
                                          className="h-7 px-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-1 justify-center cursor-pointer inline-flex text-[9px] font-black"
                                          title="أرشفة الدفعة"
                                        >
                                          <Archive size={11} />
                                          <span>أرشفة</span>
                                        </button>
                                      )}
                                      {pay.archived && (
                                        <button
                                          onClick={() => handleUnarchivePayment(pay.id)}
                                          className="h-7 px-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-150 transition-colors flex items-center gap-1 justify-center cursor-pointer inline-flex text-[9px] font-black"
                                          title="إلغاء الأرشفة"
                                        >
                                          <RotateCcw size={11} />
                                          <span>استعادة</span>
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleDeletePayment(pay.id)}
                                        className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 transition-colors flex items-center justify-center cursor-pointer inline-flex"
                                        title="حذف الدفعة"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unified Payments Manager Modal */}
      {isPaymentsManagerModalOpen && (
        <UnifiedPaymentsManagerModal
          isOpen={isPaymentsManagerModalOpen}
          onClose={() => setIsPaymentsManagerModalOpen(false)}
          initialTab="teachers"
          students={students}
          teachers={teachers}
          sessions={sessions}
          credits={credits}
          payments={payments}
          setCredits={setCredits}
          setPayments={setPayments}
          setStudents={setStudents}
          onRefreshData={fetchAllData}
        />
      )}

      {/* Parent Notification Interactive Simulator Overlay */}
      <AnimatePresence>
        {activeNotifier && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 md:p-6" dir="rtl">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-100 text-right"
            >
              {/* Header */}
              <div className="p-6 md:p-8 border-b border-slate-150 flex items-center justify-between bg-white relative">
                <div className="flex items-center gap-4 relative z-10">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                    notifierChannel === 'sms' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    {notifierChannel === 'sms' ? <span className="text-xl">📱</span> : <span className="text-xl">✉️</span>}
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black text-slate-900 leading-none">
                      إخطار ولي أمر الطالب: {activeNotifier.name}
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">
                      محاكاة تفاعلية ذكية للاتصالات والتحصيل المالي المتأخر
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveNotifier(null)}
                  className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-450 transition-colors border border-slate-200"
                >
                  <span className="text-base font-black">×</span>
                </button>
              </div>

              {/* Body */}
              <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6 flex flex-col">
                
                {/* Channel Selector */}
                <div className="space-y-2 text-right">
                  <label className="text-[10px] font-black text-slate-400 uppercase block">قناة الاتصال المفضلة</label>
                  <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-2 select-none">
                    <button
                      type="button"
                      onClick={() => handleNotifierChannelChange('sms')}
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        notifierChannel === 'sms'
                          ? 'bg-rose-600 text-white shadow-md'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span>📱</span>
                      <span>رسالة نصية قصيرة SMS (محاكاة)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNotifierChannelChange('email')}
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        notifierChannel === 'email'
                          ? 'bg-indigo-650 text-white shadow-md'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <span>✉️</span>
                      <span>بريد إلكتروني رسمي (محاكاة)</span>
                    </button>
                  </div>
                </div>

                {/* Editable Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 text-right flex flex-col">
                    <label className="text-[10px] font-black text-slate-400 uppercase">
                      {notifierChannel === 'sms' ? 'رقم هاتف ولي الأمر' : 'بريد ولي الأمر المستهدف'}
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={notifierCustomContact}
                      onChange={e => setNotifierCustomContact(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-black outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] text-left"
                      placeholder={notifierChannel === 'sms' ? '0599000000' : 'parent@example.com'}
                    />
                  </div>

                  <div className="space-y-2 text-right">
                    <label className="text-[10px] font-black text-slate-400 uppercase block">الرصيد المالي الحالي للتعليم</label>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 flex justify-between items-center">
                      <span className="font-sans font-black text-rose-600">{activeNotifier.balance.toFixed(0)} ₪</span>
                      <span className="text-[10px] text-slate-400">عتبة الأمان: {activeNotifier.threshold} ₪</span>
                    </div>
                  </div>
                </div>

                {/* Textarea message text customization */}
                <div className="space-y-2 text-right">
                  <label className="text-[10px] font-black text-slate-400 uppercase block">محتوى نص رسالة الإخطار</label>
                  <textarea
                    rows={4}
                    value={notifierMessage}
                    onChange={e => setNotifierMessage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold leading-relaxed outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-[#D4A33C] text-right resize-none animate-none"
                  />
                </div>

                {/* Simulated live preview phone/mail template */}
                <div className="space-y-2 text-right">
                  <label className="text-[10px] font-black text-slate-400 uppercase block">المعاينة المباشرة على الأجهزة</label>
                  
                  {notifierChannel === 'sms' ? (
                    /* Mobile device mockup preview */
                    <div className="bg-slate-900 text-white rounded-[2rem] p-4 font-sans text-right max-w-sm mx-auto shadow-inner border border-slate-800">
                      <div className="flex items-center justify-between text-[9px] text-slate-500 pb-2 border-b border-slate-800">
                        <span>Vodafone / Jawwal</span>
                        <span>١٢:٠٠ م</span>
                      </div>
                      <div className="mt-3 flex items-start gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-black text-amber-500">
                          EDU
                        </div>
                        <div className="bg-slate-800 text-white text-[11px] p-3 rounded-2xl rounded-tr-none leading-relaxed max-w-[80%] text-right font-bold w-full">
                          {notifierMessage}
                        </div>
                      </div>
                      <div className="text-[8px] text-slate-600 text-center mt-4">المحاكاة تعكس مظهر الرسائل النصية المباشرة المستلمة</div>
                    </div>
                  ) : (
                    /* Email letter box mockup preview */
                    <div className="bg-slate-50 rounded-[1.5rem] border border-slate-200 p-5 space-y-3 shadow-inner text-right">
                      <div className="border-b border-slate-200/80 pb-2 text-[10px] text-slate-500 space-y-1">
                        <div><strong>من:</strong> أكاديمية المستقبل للتعليم &lt;no-reply@future-edu.ps&gt;</div>
                        <div><strong>إلى:</strong> {notifierCustomContact}</div>
                        <div><strong>الموضوع:</strong> إخطار شحن الرصيد المالي لخدمات التعليم - الطالب {activeNotifier.name}</div>
                      </div>
                      <div className="text-slate-800 text-xs font-bold leading-relaxed whitespace-pre-line pt-2">
                        {notifierMessage}
                      </div>
                    </div>
                  )}
                </div>

                {/* Notifier Progress and Success States */}
                <AnimatePresence>
                  {notifierProgress === 'sending' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-amber-100 border border-amber-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 text-center"
                    >
                      <div className="w-8 h-8 border-4 border-amber-300 border-t-amber-800 rounded-full animate-spin" />
                      <span className="text-xs font-black text-amber-800 animate-pulse">جاري إرسال الإخطار لولي الأمر عبر كابل المحاكاة المباشر...</span>
                    </motion.div>
                  )}

                  {notifierProgress === 'success' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 text-center text-emerald-800"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl font-black">
                        ✓
                      </div>
                      <h4 className="text-xs font-black">تم إرسال التنبيه التفاعلي بنجاح! 🎉</h4>
                      <p className="text-[10px] font-bold text-emerald-600">تم تسجيل المعاملة وحفظ الحالة للتفعيل التلقائي في الكشوفات.</p>
                      <button
                        type="button"
                        onClick={() => setActiveNotifier(null)}
                        className="mt-2 bg-emerald-800 text-white text-[10px] font-black px-4 py-1.5 rounded-lg hover:bg-emerald-900 transition-colors"
                      >
                        حسناً، إغلاق
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

              {/* Footer */}
              {notifierProgress === 'idle' && (
                <div className="p-6 border-t border-slate-150 flex items-center justify-between bg-slate-50/50 text-right">
                  <button
                    type="button"
                    onClick={() => setActiveNotifier(null)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100/50 text-slate-500 font-black text-xs transition-colors cursor-pointer"
                  >
                    تراجع
                  </button>
                  <button
                    type="button"
                    onClick={executeSendNotification}
                    className={`px-8 py-3 rounded-xl font-black text-xs text-white transition-all flex items-center gap-2 shadow-lg cursor-pointer ${
                      notifierChannel === 'sms' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-indigo-650 hover:bg-indigo-700'
                    }`}
                  >
                    <span>🚀 إرسال التنبيه المباشر بنجاح</span>
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Teacher Payment Edit Modal */}
      <AnimatePresence>
        {isEditPaymentModalOpen && editingPayment && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/40" dir="rtl">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden relative text-right"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => { setIsEditPaymentModalOpen(false); setEditingPayment(null); }}
                className="absolute top-8 left-8 p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
                type="button"
              >
                ×
              </button>

              <div className="p-10">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl">
                    <Pencil size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight font-sans">تعديل الدفعة المالية للمعلم</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase mt-1">تعديل قيمة وتاريخ وسند الصرف والمدفوعات</p>
                  </div>
                </div>

                <form onSubmit={handleUpdatePayment} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-indigo-500" />
                        المبلغ المعدل (₪)
                      </label>
                      <input 
                        type="number" 
                        required
                        min="1"
                        placeholder="مثال: 200"
                        value={editPayAmount}
                        onChange={e => {
                          const val = e.target.value;
                          setEditPayAmount(val === '' ? '' : parseFloat(val));
                        }}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-sm text-right"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 col-span-2">
                        <label className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-indigo-500" />
                          التاريخ المعدل
                        </label>
                        <input 
                          type="date" 
                          required
                          value={editPayDate}
                          onChange={e => setEditPayDate(e.target.value)}
                          className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none font-bold text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-indigo-500" />
                        ملاحظة / بيان الصرف المعدّل
                      </label>
                      <textarea 
                        value={editPayNote}
                        onChange={e => setEditPayNote(e.target.value)}
                        placeholder="مثال: دفعة رصيد الحصص لشهر مايو..."
                        rows={2}
                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-xs resize-none"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    {editPaymentSuccess ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="bg-emerald-600 text-white p-5 rounded-2xl flex items-center gap-4 shadow-xl"
                      >
                        <CheckCircle2 size={24} className="shrink-0" />
                        <div>
                          <p className="font-black text-sm">تم تعديل الدفعة بنجاح!</p>
                          <p className="text-emerald-100 text-[10px] font-bold mt-0.5">تم تحديث الحسابات والذمم وإعادة حساب الميزانية فوراً.</p>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="flex gap-4">
                        <button 
                          type="submit"
                          disabled={isSubmittingEditPayment || !editPayAmount || Number(editPayAmount) <= 0}
                          className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer"
                        >
                          {isSubmittingEditPayment ? (
                            <span>جاري التعديل...</span>
                          ) : (
                            <>
                              حفظ التعديلات الماليّة
                            </>
                          )}
                        </button>
                        <button 
                          type="button"
                          onClick={() => { setIsEditPaymentModalOpen(false); setEditingPayment(null); }}
                          className="px-6 py-4 bg-slate-150 text-slate-700 rounded-2xl font-black text-sm transition-all"
                        >
                          إلغاء
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Secure Delete Governance Confirmation Pop-up */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[200] p-4 text-right" dir="rtl">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] max-w-sm w-full p-6 border border-slate-100 shadow-2xl space-y-5"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                <AlertTriangle size={24} />
              </div>
              <div className="space-y-2">
                <h3 className="text-base font-black text-rose-600 leading-none">
                  حذف الدفعة المالية للمعلم ⚠️
                </h3>
                <p className="text-xs font-bold text-slate-600 leading-relaxed">
                  {(() => {
                    const pay = payments.find(p => p.id === deleteConfirm.id);
                    if (!pay) return 'هل أنت متأكد من رغبتك في حذف هذه الدفعة المالية؟';
                    const teach = teachers.find(t => t.id === pay.teacherId);
                    return `تنبيه مالي حرج: هل أنت متأكد من رغبتك في حذف الدفعة المالية المصروفة للمعلم (${teach?.name || 'مجهول'}) بقيمة (₪${pay.amount}) وتاريخ (${pay.date})؟ يؤدي هذا الإجراء إلى إلغاء إثبات صرف الدفعة في سجلات المحاسبة والتقارير.`;
                  })()}
                </p>
              </div>
              <div className="flex gap-2.5 justify-end">
                <button
                  onClick={async () => {
                    const { id } = deleteConfirm;
                    setDeleteConfirm(null);
                    await executeDeletePayment(id);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[11px] font-black transition-all cursor-pointer shadow-md shadow-rose-650/10 text-center"
                >
                  تأكيد العملية
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-black transition-all cursor-pointer text-center"
                >
                  إلغاء
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                  type="button"
                  onClick={async () => {
                    setIsDownloadingPreviewPdf(true);
                    try {
                      await convertHTMLToPDFAndDownload(printPreviewHtml, printPreviewTitle || 'التقرير_المالي');
                      setToastAlert('تم تحميل ملف PDF المحاسبي بنجاح 📕');
                    } catch (err) {
                      console.error('PDF generation error:', err);
                      setToastAlert('تعذر توليد ملف PDF، يرجى المحاولة مرة أخرى');
                    } finally {
                      setIsDownloadingPreviewPdf(false);
                    }
                  }}
                  disabled={isDownloadingPreviewPdf}
                  className={`flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-[#0D365A] to-blue-800 hover:from-blue-900 hover:to-indigo-900 text-[#D4A33C] hover:text-amber-300 rounded-xl text-xs font-black shadow-sm transition-all duration-200 cursor-pointer border border-amber-400/30 ${isDownloadingPreviewPdf ? 'opacity-80 cursor-wait' : ''}`}
                  title="تنزيل مباشر كملف PDF حقيقي على جهازك"
                >
                  {isDownloadingPreviewPdf ? (
                    <Loader2 size={13} className="animate-spin text-amber-300" />
                  ) : (
                    <Download size={13} className="text-amber-400" />
                  )}
                  <span>{isDownloadingPreviewPdf ? 'جاري تحويل الـ PDF...' : 'تنزيل كملف PDF مباشر 📕'}</span>
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
            <div className="bg-amber-500/10 border-b border-amber-500/10 text-amber-900 p-3 text-[10px] font-black text-center flex items-center justify-center gap-2">
              <span>💡 يمكنك الضغط على زر <strong>"تنزيل كملف PDF مباشر 📕"</strong> لحفظ التقرير كملف PDF حقيقي على جهازك مباشرة بنقرة واحدة، أو استخدام خيار الطباعة والحفظ.</span>
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
      {/* Monthly Comprehensive Financial Report Modal with Expenses & Profit Analysis */}
      <MonthlyFinancialReportModal
        isOpen={isMonthlyFinancialModalOpen}
        onClose={() => setIsMonthlyFinancialModalOpen(false)}
        teachers={teachers}
        students={students}
        sessions={sessions}
        payments={payments}
        credits={credits}
        expenses={expenses}
        groupCourses={groupCourses}
        globalSettings={globalSettings}
      />

      {/* Financial Reports Excel & CSV Export Center Modal */}
      <FinancialReportsExportModal
        isOpen={isExportCenterModalOpen}
        onClose={() => setIsExportCenterModalOpen(false)}
        students={students}
        teachers={teachers}
        sessions={sessions}
        credits={credits}
        payments={payments}
        expenses={expenses}
        startDate={dashboardStartDate}
        endDate={dashboardEndDate}
        selectedSubject={selectedSubjectFilter}
        globalSettings={globalSettings}
        allStudentAlerts={allStudentAlerts}
        teacherTableData={teacherTableData}
      />

      {/* Parent Exam Results Report as PDF Modal */}
      <ParentExamReportModal
        isOpen={isParentExamModalOpen}
        onClose={() => setIsParentExamModalOpen(false)}
        examResults={examResults}
        students={students}
        teachers={teachers}
        reportViewMode={parentReportViewMode}
        onReportViewModeChange={setParentReportViewMode}
      />

      {/* Hidden, styled print-friendly container specifically for PDF generation */}
      <ParentExamPrintContainer
        ref={parentReportPrintRef}
        examResults={examResults}
        students={students}
        teachers={teachers}
        reportViewMode={parentReportViewMode}
      />
    </div>
  );
}
