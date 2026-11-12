import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { Expense, ExpenseCategory, Session, Student, Teacher, Payment, StudentCredit, GroupCourse, isTrialSession, formatCustomDate } from '../types';
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  DollarSign, 
  TrendingDown, 
  TrendingUp,
  BarChart3,
  GraduationCap,
  Users,
  Trash2, 
  Pencil, 
  Download, 
  Printer, 
  Tag, 
  FileText, 
  CreditCard, 
  Building2, 
  Zap, 
  Megaphone, 
  BookOpen, 
  Wrench, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Sparkles, 
  PieChart as PieChartIcon,
  Layers,
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Award,
  Coffee,
  HelpCircle,
  Eye,
  RefreshCw,
  Wallet,
  Car,
  Shield,
  Phone,
  Gift,
  Laptop,
  ShoppingBag,
  SlidersHorizontal,
  Settings2,
  FolderPlus
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';
import { logActivity } from '../lib/activityLogger';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { 
  computeMonthlyFinancialReport, 
  ComputedMonthlyFinancialSummary, 
  ARABIC_MONTH_NAMES 
} from '../lib/monthlyFinancialPdfReport';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  Legend,
  LineChart,
  Line,
  ComposedChart
} from 'recharts';

export interface ExpenseCategoryDef {
  id: string;
  name: string;
  icon: any;
  color: string;
  badgeBg: string;
  borderBg: string;
  textColor: string;
  defaultTitle: string;
  isCustom?: boolean;
  description?: string;
}

// Available Lucide icons that managers can pick for their custom categories
export const AVAILABLE_CATEGORY_ICONS: Array<{ id: string; name: string; icon: any }> = [
  { id: 'Wallet', name: 'محفظة / رواتب', icon: Wallet },
  { id: 'Building2', name: 'مقر / عقار', icon: Building2 },
  { id: 'Zap', name: 'فواتير / طاقة', icon: Zap },
  { id: 'BookOpen', name: 'كتب / قرطاسية', icon: BookOpen },
  { id: 'Megaphone', name: 'تسويق / إعلانات', icon: Megaphone },
  { id: 'Wrench', name: 'صيانة / فني', icon: Wrench },
  { id: 'Coffee', name: 'ضيافة / بوفيه', icon: Coffee },
  { id: 'Layers', name: 'برمجيات / منصات', icon: Layers },
  { id: 'Car', name: 'مواصلات / سيارات', icon: Car },
  { id: 'Shield', name: 'تأمين / تراخيص', icon: Shield },
  { id: 'Phone', name: 'اتصالات / إنترنت', icon: Phone },
  { id: 'Gift', name: 'جوائز / مكافآت', icon: Gift },
  { id: 'Laptop', name: 'أجهزة / حواسيب', icon: Laptop },
  { id: 'ShoppingBag', name: 'مشتريات / تجهيزات', icon: ShoppingBag },
  { id: 'Tag', name: 'وسم / تصنيف عام', icon: Tag },
  { id: 'Award', name: 'رسوم / شهادات', icon: Award },
  { id: 'DollarSign', name: 'تمويل / مالية', icon: DollarSign },
  { id: 'Receipt', name: 'إيصال / فواتير', icon: Receipt },
];

// Available rich color palette for custom categories
export const AVAILABLE_CATEGORY_COLORS = [
  { hex: '#10b981', name: 'زمردي أخضر' },
  { hex: '#3b82f6', name: 'أزرق ملكي' },
  { hex: '#8b5cf6', name: 'بنفسجي' },
  { hex: '#ec4899', name: 'وردي أنيق' },
  { hex: '#f59e0b', name: 'كهرماني / ذهبي' },
  { hex: '#06b6d4', name: 'سماوي' },
  { hex: '#f97316', name: 'برتقالي' },
  { hex: '#14b8a6', name: 'تركواز' },
  { hex: '#6366f1', name: 'نيلي' },
  { hex: '#e11d48', name: 'قرمزي' },
  { hex: '#64748b', name: 'رمادي فضي' },
  { hex: '#84cc16', name: 'ليموني' },
];

export const STANDARD_EXPENSE_CATEGORIES: ExpenseCategoryDef[] = [
  { 
    id: 'rent', 
    name: 'الإيجار والمقر والقاعات التدريسية', 
    icon: Building2, 
    color: '#8b5cf6', 
    badgeBg: 'bg-purple-500/10', 
    borderBg: 'border-purple-500/30', 
    textColor: 'text-purple-600 dark:text-purple-400',
    defaultTitle: 'إيجار المقر والقاعات التدريسية'
  },
  { 
    id: 'bills', 
    name: 'فواتير الخدمات (كهرباء، مياه، إنترنت)', 
    icon: Zap, 
    color: '#eab308', 
    badgeBg: 'bg-amber-500/10', 
    borderBg: 'border-amber-500/30', 
    textColor: 'text-amber-600 dark:text-amber-400',
    defaultTitle: 'فواتير الخدمات والمرافق (كهرباء / إنترنت / مياه)'
  },
  { 
    id: 'salaries', 
    name: 'الرواتب والأجور والمكافآت الإدارية', 
    icon: Wallet, 
    color: '#10b981', 
    badgeBg: 'bg-emerald-500/10', 
    borderBg: 'border-emerald-500/30', 
    textColor: 'text-emerald-600 dark:text-emerald-400',
    defaultTitle: 'رواتب موظفين إداريين وسكرتاريا ومكافآت كادر'
  },
  { 
    id: 'stationery', 
    name: 'القرطاسية والمطبوعات والأوراق', 
    icon: BookOpen, 
    color: '#3b82f6', 
    badgeBg: 'bg-blue-500/10', 
    borderBg: 'border-blue-500/30', 
    textColor: 'text-blue-600 dark:text-blue-400',
    defaultTitle: 'شراء قرطاسية ومستلزمات تصوير وأوراق'
  },
  { 
    id: 'marketing', 
    name: 'إعلانات ممولة وتسويق إلكتروني', 
    icon: Megaphone, 
    color: '#ec4899', 
    badgeBg: 'bg-pink-500/10', 
    borderBg: 'border-pink-500/30', 
    textColor: 'text-pink-600 dark:text-pink-400',
    defaultTitle: 'حملة إعلانات ممولة وتسويق إلكتروني'
  },
  { 
    id: 'maintenance', 
    name: 'صيانة وتجهيزات تقنية وفنية', 
    icon: Wrench, 
    color: '#f97316', 
    badgeBg: 'bg-orange-500/10', 
    borderBg: 'border-orange-500/30', 
    textColor: 'text-orange-600 dark:text-orange-400',
    defaultTitle: 'صيانة وتجهيزات تقنية وفنية للمركز'
  },
  { 
    id: 'hospitality', 
    name: 'ضيافة وبوفيه ونظافة المركز', 
    icon: Coffee, 
    color: '#14b8a6', 
    badgeBg: 'bg-teal-500/10', 
    borderBg: 'border-teal-500/30', 
    textColor: 'text-teal-600 dark:text-teal-400',
    defaultTitle: 'مستلزمات ضيافة وبوفيه ونظافة المركز'
  },
  { 
    id: 'software', 
    name: 'اشتراكات برمجية وسيرفرات وتطبيقات', 
    icon: Layers, 
    color: '#06b6d4', 
    badgeBg: 'bg-cyan-500/10', 
    borderBg: 'border-cyan-500/30', 
    textColor: 'text-cyan-600 dark:text-cyan-400',
    defaultTitle: 'تجديد اشتراك منصات وسيرفرات سحابية'
  },
  { 
    id: 'funding', 
    name: 'تمويل ومصاريف إدارية عامة', 
    icon: DollarSign, 
    color: '#64748b', 
    badgeBg: 'bg-slate-500/10', 
    borderBg: 'border-slate-500/30', 
    textColor: 'text-slate-600 dark:text-slate-400',
    defaultTitle: 'مصاريف تشغيلية إدارية عامة'
  },
  { 
    id: 'other', 
    name: 'مصاريف تشغيلية متفرقة أخرى', 
    icon: HelpCircle, 
    color: '#6b7280', 
    badgeBg: 'bg-gray-500/10', 
    borderBg: 'border-gray-500/30', 
    textColor: 'text-gray-600 dark:text-gray-400',
    defaultTitle: 'مصاريف تشغيلية متفرقة'
  }
];

// Backward-compatible alias for existing imports
export const EXPENSE_CATEGORIES = STANDARD_EXPENSE_CATEGORIES;

export const PAYMENT_METHODS = [
  { id: 'cash', name: 'نقدي (كاش)' },
  { id: 'bank_transfer', name: 'تحويل بنكي / حوالة' },
  { id: 'credit_card', name: 'بطاقة ائتمان / فيزا' },
  { id: 'check', name: 'شيك مصرفي' },
  { id: 'electronic_wallet', name: 'محفظة إلكترونية (جوال باي / بال باي)' },
  { id: 'other', name: 'طريقة أخرى' }
];

export function convertCustomCategoryToDef(cat: ExpenseCategory): ExpenseCategoryDef {
  const iconDef = AVAILABLE_CATEGORY_ICONS.find(i => i.id === cat.icon) || AVAILABLE_CATEGORY_ICONS[0];
  const color = cat.color || '#6366f1';
  return {
    id: cat.id,
    name: cat.name,
    icon: iconDef.icon,
    color: color,
    badgeBg: 'bg-indigo-500/10',
    borderBg: 'border-indigo-500/30',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    defaultTitle: cat.defaultTitle || cat.name,
    isCustom: true,
    description: cat.description
  };
}

export function getCategoryMeta(catId?: string, customCategories?: ExpenseCategory[]): ExpenseCategoryDef {
  if (!catId) return STANDARD_EXPENSE_CATEGORIES[STANDARD_EXPENSE_CATEGORIES.length - 1];

  // 1. Check custom categories first
  if (customCategories && customCategories.length > 0) {
    const customFound = customCategories.find(c => c.id === catId);
    if (customFound) {
      return convertCustomCategoryToDef(customFound);
    }
  }

  // 2. Check standard categories
  const found = STANDARD_EXPENSE_CATEGORIES.find(c => c.id === catId);
  if (found) return found;

  // 3. Backward compatibility alias (e.g. electricity -> bills)
  if (catId === 'electricity') {
    const bills = STANDARD_EXPENSE_CATEGORIES.find(c => c.id === 'bills');
    if (bills) return bills;
  }

  // 4. Fallback for funding
  if (catId === 'funding') {
    const funding = STANDARD_EXPENSE_CATEGORIES.find(c => c.id === 'funding');
    if (funding) return funding;
  }

  // Fallback for custom category name stored directly
  return {
    id: catId,
    name: catId,
    icon: Tag,
    color: '#6366f1',
    badgeBg: 'bg-indigo-500/10',
    borderBg: 'border-indigo-500/30',
    textColor: 'text-indigo-600 dark:text-indigo-400',
    defaultTitle: catId,
    isCustom: true
  };
}

export interface OperatingExpensesManagerProps {
  onExpensesChange?: () => void;
  compactView?: boolean;
  sessions?: Session[];
  teachers?: Teacher[];
  students?: Student[];
  credits?: StudentCredit[];
  payments?: Payment[];
  groupCourses?: GroupCourse[];
  globalSettings?: any;
}

export const OperatingExpensesManager: React.FC<OperatingExpensesManagerProps> = ({
  onExpensesChange,
  compactView = false,
  sessions = [],
  teachers = [],
  students = [],
  credits = [],
  payments = [],
  groupCourses = [],
  globalSettings = {}
}) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Sub-view Tab: 'expenses_list' (سجل المصاريف) | 'revenue_comparison' (مقارنة الإيرادات بالمصاريف) | 'category_analytics' (تحليل الفئات)
  const [activeViewTab, setActiveViewTab] = useState<'expenses_list' | 'revenue_comparison' | 'category_analytics'>('expenses_list');

  // Custom Categories state & listener
  const [customCategories, setCustomCategories] = useState<ExpenseCategory[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);

  // Category Management Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalTab, setCategoryModalTab] = useState<'list' | 'form'>('list');
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null);
  const [catFormName, setCatFormName] = useState('');
  const [catFormDefaultTitle, setCatFormDefaultTitle] = useState('');
  const [catFormColor, setCatFormColor] = useState(AVAILABLE_CATEGORY_COLORS[0].hex);
  const [catFormIcon, setCatFormIcon] = useState('Tag');
  const [catFormDescription, setCatFormDescription] = useState('');
  const [catFormSubmitting, setCatFormSubmitting] = useState(false);
  const [catFormError, setCatFormError] = useState('');
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [categoryDeleteError, setCategoryDeleteError] = useState('');

  // Combined standard + custom categories
  const allCategories = useMemo<ExpenseCategoryDef[]>(() => {
    const customDefs = customCategories.map(convertCustomCategoryToDef);
    return [...STANDARD_EXPENSE_CATEGORIES, ...customDefs];
  }, [customCategories]);

  // Filter and Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  
  // Date filter (Year & Month)
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [isAllTime, setIsAllTime] = useState<boolean>(false);

  // Modal states for Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('bills');
  const [formDate, setFormDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [formPaymentMethod, setFormPaymentMethod] = useState<string>('cash');
  const [formInvoiceRef, setFormInvoiceRef] = useState('');
  const [formPaidTo, setFormPaidTo] = useState('');
  const [formNote, setFormNote] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Delete confirmation
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Print voucher modal state
  const [printExpense, setPrintExpense] = useState<Expense | null>(null);

  // Real-time listener for Firestore collection 'expenseCategories'
  useEffect(() => {
    setIsCategoriesLoading(true);
    const q = query(collection(db, 'expenseCategories'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ExpenseCategory));
      setCustomCategories(data);
      setIsCategoriesLoading(false);
    }, (error) => {
      console.warn("Retrying expenseCategories snapshot without orderBy...", error);
      const unsubFallback = onSnapshot(collection(db, 'expenseCategories'), (snap) => {
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as ExpenseCategory));
        data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setCustomCategories(data);
        setIsCategoriesLoading(false);
      });
      return () => unsubFallback();
    });

    return () => unsub();
  }, []);

  // Real-time listener for Firestore collection 'expenses'
  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Expense));
      setExpenses(data);
      setIsLoading(false);
      onExpensesChange?.();
    }, (error) => {
      console.warn("Retrying expenses snapshot without orderBy...", error);
      const unsubFallback = onSnapshot(collection(db, 'expenses'), (snap) => {
        const data = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Expense));
        data.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setExpenses(data);
        setIsLoading(false);
        onExpensesChange?.();
      });
      return () => unsubFallback();
    });

    return () => unsub();
  }, []);

  // Filtered expenses based on search and selected filters
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      // Date filter
      if (!isAllTime && expense.date) {
        const parts = expense.date.split('-');
        if (parts.length >= 2) {
          const expYear = parseInt(parts[0], 10);
          const expMonth = parseInt(parts[1], 10);
          if (expYear !== selectedYear || expMonth !== selectedMonth) {
            return false;
          }
        }
      }

      // Category filter
      if (selectedCategory !== 'all') {
        if ((expense.category || 'funding') !== selectedCategory) {
          return false;
        }
      }

      // Payment method filter
      if (selectedPaymentMethod !== 'all') {
        if ((expense.paymentMethod || 'cash') !== selectedPaymentMethod) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const title = (expense.title || '').toLowerCase();
        const note = (expense.note || '').toLowerCase();
        const paidTo = (expense.paidTo || '').toLowerCase();
        const invRef = (expense.invoiceRef || '').toLowerCase();
        const catMeta = getCategoryMeta(expense.category, customCategories);
        const catName = catMeta.name.toLowerCase();

        return (
          title.includes(q) ||
          note.includes(q) ||
          paidTo.includes(q) ||
          invRef.includes(q) ||
          catName.includes(q) ||
          String(expense.amount).includes(q)
        );
      }

      return true;
    });
  }, [expenses, isAllTime, selectedYear, selectedMonth, selectedCategory, selectedPaymentMethod, searchQuery, customCategories]);

  // Key KPI stats
  const stats = useMemo(() => {
    // Current month expenses
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;

    const currentMonthExpenses = expenses.filter(e => {
      if (!e.date) return false;
      const parts = e.date.split('-');
      return parseInt(parts[0], 10) === curYear && parseInt(parts[1], 10) === curMonth;
    });

    const totalCurrentMonth = currentMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Selected period total
    const totalFiltered = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Annual expenses (current year)
    const annualExpenses = expenses.filter(e => {
      if (!e.date) return false;
      return parseInt(e.date.split('-')[0], 10) === selectedYear;
    });
    const totalAnnual = annualExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Top spending category for selected period
    const catMap: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const cat = e.category || 'funding';
      catMap[cat] = (catMap[cat] || 0) + (Number(e.amount) || 0);
    });

    let topCategory = 'لا يوجد';
    let topCategoryAmount = 0;
    Object.entries(catMap).forEach(([cat, amt]) => {
      if (amt > topCategoryAmount) {
        topCategoryAmount = amt;
        topCategory = getCategoryMeta(cat, customCategories).name;
      }
    });

    return {
      totalCurrentMonth,
      totalFiltered,
      totalAnnual,
      countFiltered: filteredExpenses.length,
      topCategory,
      topCategoryAmount
    };
  }, [expenses, filteredExpenses, selectedYear, customCategories]);

  // Chart data: Distribution by category
  const categoryChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const cat = e.category || 'funding';
      map[cat] = (map[cat] || 0) + (Number(e.amount) || 0);
    });

    return Object.entries(map).map(([catId, value]) => {
      const meta = getCategoryMeta(catId, customCategories);
      return {
        id: catId,
        name: meta.name,
        value: Number(value.toFixed(1)),
        color: meta.color
      };
    }).sort((a, b) => b.value - a.value);
  }, [filteredExpenses, customCategories]);

  // Monthly trend chart data for current selected year
  const monthlyTrendData = useMemo(() => {
    const monthNames = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const months = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i + 1,
      monthName: monthNames[i],
      total: 0
    }));

    expenses.forEach(e => {
      if (!e.date) return;
      const parts = e.date.split('-');
      if (parseInt(parts[0], 10) === selectedYear) {
        const m = parseInt(parts[1], 10);
        if (m >= 1 && m <= 12) {
          months[m - 1].total += Number(e.amount) || 0;
        }
      }
    });

    return months;
  }, [expenses, selectedYear]);

  // 3. Comprehensive Monthly Revenue vs Teacher Payouts vs Operating Expenses Comparison
  const monthlyComparisonData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const summary = computeMonthlyFinancialReport({
        year: selectedYear,
        month: m,
        sessions: sessions || [],
        expenses: expenses || [],
        teachers: teachers || [],
        students: students || [],
        payments: payments || [],
        credits: credits || [],
        groupCourses: groupCourses || [],
        globalSettings: globalSettings || {}
      });

      const revenue = summary.totalTeachingRevenue || 0;
      const teacherPayouts = summary.totalTeacherPayouts || 0;
      const opExpenses = summary.totalOperatingExpenses || 0;
      const netProfit = summary.netRealizedProfit !== undefined 
        ? summary.netRealizedProfit 
        : (revenue - teacherPayouts - opExpenses);
      const grossProfit = revenue - teacherPayouts;
      const expenseRatio = revenue > 0 ? (opExpenses / revenue) * 100 : 0;
      const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

      return {
        monthIndex: m,
        monthName: ARABIC_MONTH_NAMES[i] || `شهر ${m}`,
        shortName: (ARABIC_MONTH_NAMES[i] || `شهر ${m}`).split(' ')[0],
        revenue: Number(revenue.toFixed(1)),
        teacherPayouts: Number(teacherPayouts.toFixed(1)),
        operatingExpenses: Number(opExpenses.toFixed(1)),
        grossProfit: Number(grossProfit.toFixed(1)),
        netProfit: Number(netProfit.toFixed(1)),
        hours: Number((summary.totalHoursTaught || 0).toFixed(1)),
        sessionsCount: summary.totalSessionsCount || 0,
        expenseRatio: Number(expenseRatio.toFixed(1)),
        profitMargin: Number(profitMargin.toFixed(1)),
        expensesCount: summary.expensesList?.length || 0,
        expensesByCategory: summary.expensesByCategory || [],
        summary
      };
    });
  }, [selectedYear, sessions, expenses, teachers, students, payments, credits, groupCourses, globalSettings]);

  // Selected single month comparison summary
  const selectedMonthComparison = useMemo(() => {
    return monthlyComparisonData[selectedMonth - 1] || monthlyComparisonData[0];
  }, [monthlyComparisonData, selectedMonth]);

  // Annual cumulative totals
  const annualComparisonTotals = useMemo(() => {
    const rev = monthlyComparisonData.reduce((acc, m) => acc + m.revenue, 0);
    const payouts = monthlyComparisonData.reduce((acc, m) => acc + m.teacherPayouts, 0);
    const exp = monthlyComparisonData.reduce((acc, m) => acc + m.operatingExpenses, 0);
    const net = monthlyComparisonData.reduce((acc, m) => acc + m.netProfit, 0);
    const hours = monthlyComparisonData.reduce((acc, m) => acc + m.hours, 0);
    const sessionsTotal = monthlyComparisonData.reduce((acc, m) => acc + m.sessionsCount, 0);
    const ratio = rev > 0 ? (exp / rev) * 100 : 0;
    const margin = rev > 0 ? (net / rev) * 100 : 0;

    return {
      totalRevenue: Number(rev.toFixed(1)),
      totalPayouts: Number(payouts.toFixed(1)),
      totalExpenses: Number(exp.toFixed(1)),
      netProfit: Number(net.toFixed(1)),
      totalHours: Number(hours.toFixed(1)),
      totalSessions: sessionsTotal,
      expenseRatio: Number(ratio.toFixed(1)),
      profitMargin: Number(margin.toFixed(1))
    };
  }, [monthlyComparisonData]);

  // Export Monthly Comparison Table to Excel
  const exportMonthlyComparisonToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const rows = monthlyComparisonData.map(m => ({
      'الشهر': m.monthName,
      'ساعات التدريس': m.hours,
      'عدد الحصص المنفذة': m.sessionsCount,
      'إجمالي الإيرادات التعليمية (₪)': m.revenue,
      'أتعاب ورواتب المعلمين (₪)': m.teacherPayouts,
      'المصاريف التشغيلية للمركز (₪)': m.operatingExpenses,
      'صافي الربح التشغيلي (₪)': m.netProfit,
      'نسبة المصاريف للإيراد (%)': `${m.expenseRatio}%`,
      'هامش الربح الصافي (%)': `${m.profitMargin}%`,
      'الحالة المالية': m.netProfit > 0 ? 'فائض ربحي' : (m.netProfit === 0 ? 'متوازن' : 'عجز مالي')
    }));

    // Add totals row
    rows.push({
      'الشهر': `الإجمالي السنوي لسنة ${selectedYear}`,
      'ساعات التدريس': annualComparisonTotals.totalHours,
      'عدد الحصص المنفذة': annualComparisonTotals.totalSessions,
      'إجمالي الإيرادات التعليمية (₪)': annualComparisonTotals.totalRevenue,
      'أتعاب ورواتب المعلمين (₪)': annualComparisonTotals.totalPayouts,
      'المصاريف التشغيلية للمركز (₪)': annualComparisonTotals.totalExpenses,
      'صافي الربح التشغيلي (₪)': annualComparisonTotals.netProfit,
      'نسبة المصاريف للإيراد (%)': `${annualComparisonTotals.expenseRatio}%`,
      'هامش الربح الصافي (%)': `${annualComparisonTotals.profitMargin}%`,
      'الحالة المالية': annualComparisonTotals.netProfit > 0 ? 'فائض تشغيلي ممتاز' : 'عجز تشغيلي'
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 22 }, { wch: 22 },
      { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 18 }, { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, `مقارنة الإيرادات ${selectedYear}`);
    XLSX.writeFile(workbook, `مقارنة_المصاريف_التشغيلية_بالإيرادات_${selectedYear}.xlsx`);
  };

  // Open modal for new expense
  const handleOpenCreateModal = (presetCategory?: string) => {
    setEditingExpense(null);
    const cat = presetCategory || 'bills';
    const catMeta = getCategoryMeta(cat, customCategories);
    setFormCategory(cat);
    setFormTitle(catMeta.defaultTitle);
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormPaymentMethod('cash');
    setFormInvoiceRef('');
    setFormPaidTo('');
    setFormNote('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setFormCategory(expense.category || 'funding');
    setFormTitle(expense.title || expense.note || getCategoryMeta(expense.category, customCategories).defaultTitle);
    setFormAmount(String(expense.amount || ''));
    setFormDate(expense.date || new Date().toISOString().split('T')[0]);
    setFormPaymentMethod(expense.paymentMethod || 'cash');
    setFormInvoiceRef(expense.invoiceRef || '');
    setFormPaidTo(expense.paidTo || '');
    setFormNote(expense.note || '');
    setFormError('');
    setIsModalOpen(true);
  };

  // Submit expense (Create / Update)
  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const numAmount = parseFloat(formAmount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('يرجى إدخال مبلغ صحيح أكبر من الصفر.');
      return;
    }

    if (!formDate) {
      setFormError('يرجى تحديد تاريخ المصروف.');
      return;
    }

    setFormSubmitting(true);
    try {
      const currentUserName = localStorage.getItem('academy_user_name') || 'المدير العام (زكي أبو علان)';
      const finalTitle = formTitle.trim() || getCategoryMeta(formCategory, customCategories).defaultTitle;

      const expenseData = {
        title: finalTitle,
        category: formCategory,
        amount: numAmount,
        date: formDate,
        paymentMethod: formPaymentMethod,
        invoiceRef: formInvoiceRef.trim(),
        paidTo: formPaidTo.trim(),
        note: formNote.trim() || finalTitle,
        updatedAt: new Date().toISOString()
      };

      if (editingExpense) {
        // Update existing expense
        const expRef = doc(db, 'expenses', editingExpense.id);
        await updateDoc(expRef, expenseData);

        await logActivity({
          actionType: 'EXPENSE_UPDATE',
          actionName: 'تعديل مصروف تشغيلي',
          actor: currentUserName,
          details: `تم تعديل بيانات المصروف "${finalTitle}" بقيمة ₪${numAmount} بتاريخ ${formDate} (الفئة: ${getCategoryMeta(formCategory, customCategories).name}).`,
          amount: numAmount
        });
      } else {
        // Add new expense
        const newDocData = {
          ...expenseData,
          createdAt: new Date().toISOString(),
          createdBy: currentUserName
        };
        await addDoc(collection(db, 'expenses'), newDocData);

        await logActivity({
          actionType: 'EXPENSE_CREATE',
          actionName: 'تسجيل مصروف تشغيلي جديد',
          actor: currentUserName,
          details: `تم إضافة مصروف تشغيلي جديد للمركز: "${finalTitle}" بقيمة ₪${numAmount} بتاريخ ${formDate} (الفئة: ${getCategoryMeta(formCategory, customCategories).name}).`,
          amount: numAmount
        });
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving expense:", err);
      setFormError('حدث خطأ أثناء حفظ المصروف في قاعدة البيانات.');
      handleFirestoreError(err, OperationType.WRITE, 'expenses');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Category Management Handlers
  const handleOpenCategoryModal = (catToEdit?: ExpenseCategory) => {
    setCategoryDeleteError('');
    if (catToEdit) {
      setEditingCategory(catToEdit);
      setCatFormName(catToEdit.name || '');
      setCatFormDefaultTitle(catToEdit.defaultTitle || '');
      setCatFormColor(catToEdit.color || AVAILABLE_CATEGORY_COLORS[0].hex);
      setCatFormIcon(catToEdit.icon || 'Tag');
      setCatFormDescription(catToEdit.description || '');
      setCatFormError('');
      setCategoryModalTab('form');
    } else {
      setEditingCategory(null);
      setCatFormName('');
      setCatFormDefaultTitle('');
      setCatFormColor(AVAILABLE_CATEGORY_COLORS[0].hex);
      setCatFormIcon('Tag');
      setCatFormDescription('');
      setCatFormError('');
      setCategoryModalTab('list');
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatFormError('');
    const trimmedName = catFormName.trim();
    if (!trimmedName) {
      setCatFormError('يرجى إدخال اسم التصنيف.');
      return;
    }

    // Check collision with standard category names
    const standardCollision = STANDARD_EXPENSE_CATEGORIES.some(c => c.name.toLowerCase() === trimmedName.toLowerCase());
    if (standardCollision) {
      setCatFormError('هذا الاسم مستخدم بالفعل ضمن التصنيفات الأساسية للنظام.');
      return;
    }

    setCatFormSubmitting(true);
    try {
      const currentUserName = localStorage.getItem('academy_user_name') || 'المدير العام';
      const catData: Partial<ExpenseCategory> = {
        name: trimmedName,
        color: catFormColor,
        icon: catFormIcon,
        defaultTitle: catFormDefaultTitle.trim() || trimmedName,
        description: catFormDescription.trim(),
        updatedAt: new Date().toISOString()
      };

      if (editingCategory) {
        const catRef = doc(db, 'expenseCategories', editingCategory.id);
        await updateDoc(catRef, catData);
        await logActivity({
          actionType: 'SETTINGS_UPDATE',
          actionName: 'تعديل تصنيف مصروف تشغيلي',
          actor: currentUserName,
          details: `تم تحديث بيانات تصنيف المصروفات التشغيلية "${trimmedName}".`
        });
      } else {
        const newId = 'cat_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
        const catRef = doc(db, 'expenseCategories', newId);
        await setDoc(catRef, {
          ...catData,
          id: newId,
          createdAt: new Date().toISOString(),
          createdBy: currentUserName
        });
        await logActivity({
          actionType: 'SETTINGS_UPDATE',
          actionName: 'إضافة تصنيف مصروف تشغيلي مخصص',
          actor: currentUserName,
          details: `تم إضافة تصنيف تشغيلي مخصص جديد باسم "${trimmedName}".`
        });
      }

      setCategoryModalTab('list');
      setEditingCategory(null);
      setCatFormName('');
      setCatFormDefaultTitle('');
    } catch (err) {
      console.error("Error saving expense category:", err);
      setCatFormError('حدث خطأ أثناء حفظ التصنيف في قاعدة البيانات.');
      handleFirestoreError(err, OperationType.WRITE, 'expenseCategories');
    } finally {
      setCatFormSubmitting(false);
    }
  };

  const executeDeleteCategory = async (catId: string) => {
    setIsDeletingCategory(true);
    setCategoryDeleteError('');
    try {
      const linkedCount = expenses.filter(e => e.category === catId).length;
      if (linkedCount > 0) {
        setCategoryDeleteError(`لا يمكن حذف هذا التصنيف لوجود (${linkedCount}) مصاريف مرتبطة به حالياً. يمكنك تعديل اسمه أو تغيير تصنيف المصاريف أولاً.`);
        setIsDeletingCategory(false);
        return;
      }

      const catToDelete = customCategories.find(c => c.id === catId);
      const catName = catToDelete?.name || catId;
      const currentUserName = localStorage.getItem('academy_user_name') || 'المدير العام';

      await deleteDoc(doc(db, 'expenseCategories', catId));
      await logActivity({
        actionType: 'SETTINGS_UPDATE',
        actionName: 'حذف تصنيف مصروف مخصص',
        actor: currentUserName,
        details: `تم حذف تصنيف المصروفات المخصص "${catName}".`
      });

      setDeleteCategoryId(null);
    } catch (err) {
      console.error("Error deleting expense category:", err);
      setCategoryDeleteError('حدث خطأ أثناء حذف التصنيف.');
      handleFirestoreError(err, OperationType.DELETE, `expenseCategories/${catId}`);
    } finally {
      setIsDeletingCategory(false);
    }
  };

  // Delete expense handler
  const executeDeleteExpense = async (id: string) => {
    setIsDeleting(true);
    try {
      const target = expenses.find(e => e.id === id);
      const title = target?.title || target?.note || 'مصروف تشغيلي';
      const amt = target?.amount || 0;
      const currentUserName = localStorage.getItem('academy_user_name') || 'المدير العام';

      await deleteDoc(doc(db, 'expenses', id));

      await logActivity({
        actionType: 'EXPENSE_DELETE',
        actionName: 'حذف مصروف تشغيلي',
        actor: currentUserName,
        details: `تم حذف المصروف "${title}" بقيمة ₪${amt} من سجلات الأكاديمية.`,
        amount: amt
      });

      setDeleteExpenseId(null);
    } catch (err) {
      console.error("Error deleting expense:", err);
      handleFirestoreError(err, OperationType.DELETE, `expenses/${id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  // Export to Excel (.xlsx)
  const exportExpensesToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const sheetData = filteredExpenses.map((e, idx) => {
      const catMeta = getCategoryMeta(e.category, customCategories);
      const payMeta = PAYMENT_METHODS.find(p => p.id === e.paymentMethod);
      return {
        'م': idx + 1,
        'تاريخ الصرف': e.date || '',
        'عنوان / بيان المصروف': e.title || e.note || catMeta.defaultTitle,
        'فئة المصروف التشغيلي': catMeta.name,
        'المبلغ (شيكل ₪)': e.amount,
        'طريقة الدفع': payMeta?.name || 'نقدي',
        'الجهة المستلمة / المورد': e.paidTo || '-',
        'رقم السند / الفاتورة': e.invoiceRef || '-',
        'ملاحظات إضافية': e.note || '',
        'المسؤول عن التسجيل': e.createdBy || 'المدير العام'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "المصاريف التشغيلية للمركز");
    
    const periodLabel = isAllTime ? 'كامل_الفترات' : `${selectedYear}_شهر_${selectedMonth}`;
    XLSX.writeFile(workbook, `سجل_المصاريف_التشغيلية_أكاديمية_التفوق_${periodLabel}.xlsx`);
  };

  // Print voucher handler
  const printExpenseVoucher = (expense: Expense) => {
    const catMeta = getCategoryMeta(expense.category, customCategories);
    const payMeta = PAYMENT_METHODS.find(p => p.id === expense.paymentMethod);
    const title = expense.title || expense.note || catMeta.defaultTitle;

    const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <title>سند صرف مالي رسمي - أكاديمية التفوق</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');
    body {
      font-family: 'Cairo', sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 30px;
      direction: rtl;
      background: #fff;
    }
    .voucher-card {
      border: 3px double #0d365a;
      border-radius: 16px;
      padding: 25px 35px;
      max-width: 780px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 900;
      color: #0d365a;
      margin: 0;
    }
    .brand-sub {
      font-size: 11px;
      color: #d4a33c;
      font-weight: 700;
      margin-top: 4px;
    }
    .voucher-badge {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 8px 18px;
      border-radius: 10px;
      text-align: center;
    }
    .voucher-badge h2 {
      margin: 0;
      font-size: 16px;
      color: #0d365a;
      font-weight: 800;
    }
    .voucher-badge p {
      margin: 3px 0 0 0;
      font-size: 11px;
      color: #64748b;
    }
    .amount-highlight {
      background: #f8fafc;
      border: 2px solid #0d365a;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 25px;
    }
    .amount-val {
      font-size: 26px;
      font-weight: 900;
      color: #059669;
    }
    .grid-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 25px;
    }
    .field-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 10px 14px;
      border-radius: 8px;
    }
    .field-label {
      font-size: 11px;
      color: #64748b;
      font-weight: 700;
      margin-bottom: 3px;
    }
    .field-val {
      font-size: 13px;
      font-weight: 800;
      color: #1e293b;
    }
    .notes-box {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 35px;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding-top: 15px;
      border-top: 1px dashed #cbd5e1;
    }
    .sig-col {
      text-align: center;
      width: 28%;
    }
    .sig-title {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      margin-bottom: 35px;
    }
    .sig-line {
      border-top: 1px solid #94a3b8;
      font-size: 10px;
      color: #64748b;
      padding-top: 5px;
    }
    @media print {
      body { padding: 0; }
      .voucher-card { border: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="voucher-card">
    <div class="header">
      <div>
        <h1 class="brand-title">أكاديمية التفوق</h1>
        <div class="brand-sub">إدارة الشؤون المالية والمصاريف التشغيلية</div>
      </div>
      <div class="voucher-badge">
        <h2>سند صرف تشغيلي</h2>
        <p>رقم السند: #${expense.id.slice(-6).toUpperCase()}</p>
      </div>
    </div>

    <div class="amount-highlight">
      <div>
        <div style="font-size: 11px; color: #64748b; font-weight: 700;">المبلغ المصروف المعتمد:</div>
        <div class="amount-val">₪ ${Number(expense.amount).toFixed(2)} شيكل</div>
      </div>
      <div style="text-align: left;">
        <div style="font-size: 11px; color: #64748b; font-weight: 700;">تاريخ الصرف:</div>
        <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${expense.date}</div>
      </div>
    </div>

    <div class="grid-fields">
      <div class="field-box">
        <div class="field-label">بيان وعنوان المصروف</div>
        <div class="field-val">${title}</div>
      </div>
      <div class="field-box">
        <div class="field-label">فئة المصروف التشغيلي</div>
        <div class="field-val">${catMeta.name}</div>
      </div>
      <div class="field-box">
        <div class="field-label">الجهة المستلمة / المورد</div>
        <div class="field-val">${expense.paidTo || 'صرف مباشر لمصلحة المركز'}</div>
      </div>
      <div class="field-box">
        <div class="field-label">طريقة الدفع</div>
        <div class="field-val">${payMeta?.name || 'نقدي (كاش)'}</div>
      </div>
      <div class="field-box">
        <div class="field-label">رقم الفاتورة أو المرجع المالي</div>
        <div class="field-val">${expense.invoiceRef || 'غير محدد'}</div>
      </div>
      <div class="field-box">
        <div class="field-label">المسؤول عن التسجيل والاعتماد</div>
        <div class="field-val">${expense.createdBy || 'المدير العام (زكي أبو علان)'}</div>
      </div>
    </div>

    ${expense.note ? `
      <div class="notes-box">
        <div style="font-size: 11px; font-weight: 800; color: #b45309; margin-bottom: 4px;">ملاحظات وتفاصيل إضافية:</div>
        <div style="font-size: 12px; color: #78350f;">${expense.note}</div>
      </div>
    ` : ''}

    <div class="signatures">
      <div class="sig-col">
        <div class="sig-title">المحاسب المسؤول / المنظم</div>
        <div class="sig-line">التوقيع والاعتماد</div>
      </div>
      <div class="sig-col">
        <div class="sig-title">المستلم / المورد</div>
        <div class="sig-line">توقيع المستلم</div>
      </div>
      <div class="sig-col">
        <div class="sig-title">إدارة الأكاديمية (المدير العام)</div>
        <div class="sig-line">ختم وتوقيع الإدارة</div>
      </div>
    </div>
  </div>
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.error("Print error:", e);
        }
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 3000);
      }, 300);
    }
  };

  const monthsList = [
    { value: 1, label: '1 - يناير (كانون الثاني)' },
    { value: 2, label: '2 - فبراير (شباط)' },
    { value: 3, label: '3 - مارس (آذار)' },
    { value: 4, label: '4 - أبريل (نيسان)' },
    { value: 5, label: '5 - مايو (أيار)' },
    { value: 6, label: '6 - يونيو (حزيران)' },
    { value: 7, label: '7 - يوليو (تموز)' },
    { value: 8, label: '8 - أغسطس (آب)' },
    { value: 9, label: '9 - سبتمبر (أيلول)' },
    { value: 10, label: '10 - أكتوبر (تشرين الأول)' },
    { value: 11, label: '11 - نوفمبر (تشرين الثاني)' },
    { value: 12, label: '12 - ديسمبر (كانون الأول)' }
  ];

  const currentYear = new Date().getFullYear();
  const yearsList = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="space-y-8 animate-in fade-in duration-300" dir="rtl">
      
      {/* Header Banner & Action Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0D365A] to-slate-900 text-white rounded-[2rem] p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-inner">
              <Receipt size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">إدارة المصاريف التشغيلية للمركز</h2>
                <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  الأرباح والخسائر 💸
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                توثيق وضبط فواتير الكهرباء، الإيجارات، المطبوعات، الإعلانات الممولة ومصاريف التشغيل لتضمينها تلقائياً في تقارير المركز
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => handleOpenCreateModal()}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all transform active:scale-95 cursor-pointer"
              id="add-operating-expense-btn"
            >
              <Plus size={18} />
              <span>إضافة مصروف تشغيلي جديد</span>
            </button>

            <button
              onClick={exportExpensesToExcel}
              disabled={filteredExpenses.length === 0}
              className="px-4 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              title="تصدير السجل إلى Excel"
            >
              <Download size={16} className="text-emerald-400" />
              <span>تصدير Excel</span>
            </button>

            <button
              onClick={() => handleOpenCategoryModal()}
              className="px-4 py-3 rounded-2xl bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/60 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
              title="إدارة وتخصيص تصنيفات المصاريف التشغيلية"
              id="manage-expense-categories-btn"
            >
              <SlidersHorizontal size={16} className="text-indigo-400" />
              <span>إدارة التصنيفات ({allCategories.length})</span>
            </button>
          </div>
        </div>

        {/* Quick Presets Ribbon */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 ml-2">
            <Sparkles size={13} className="text-amber-400" />
            <span>تسجيل سريع بنقرة واحدة:</span>
          </span>
          {allCategories.slice(0, 7).map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => handleOpenCreateModal(cat.id)}
                className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-xs font-bold text-slate-200 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-105"
              >
                <Icon size={13} style={{ color: cat.color }} />
                <span>+ {cat.name.split(' ')[0]}</span>
                {cat.isCustom && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" title="تصنيف مخصص" />}
              </button>
            );
          })}
          <button
            onClick={() => handleOpenCategoryModal()}
            className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-xs font-bold text-indigo-200 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <FolderPlus size={13} className="text-indigo-300" />
            <span>+ تصنيف مخصص</span>
          </button>
        </div>
      </div>

      {/* Sub-view Navigation Tabs */}
      <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex-wrap">
        <button
          onClick={() => setActiveViewTab('expenses_list')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeViewTab === 'expenses_list'
              ? 'bg-[#0D365A] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Receipt size={16} className={activeViewTab === 'expenses_list' ? 'text-amber-400' : 'text-slate-400'} />
          <span>سجل وتوثيق المصاريف التشغيلية ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveViewTab('revenue_comparison')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeViewTab === 'revenue_comparison'
              ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 size={16} className={activeViewTab === 'revenue_comparison' ? 'text-emerald-300' : 'text-emerald-500'} />
          <span>التقارير الشهرية ومقارنة الإيرادات 📊</span>
        </button>

        <button
          onClick={() => setActiveViewTab('category_analytics')}
          className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
            activeViewTab === 'category_analytics'
              ? 'bg-purple-900 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <PieChartIcon size={16} className={activeViewTab === 'category_analytics' ? 'text-purple-300' : 'text-purple-500'} />
          <span>تحليلات الفئات ومخطط الإنفاق 🥧</span>
        </button>
      </div>

      {activeViewTab === 'expenses_list' && (
        <>
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Total Selected Period */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">مصاريف الفترة المحددة</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <DollarSign size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              ₪ {stats.totalFiltered.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </div>
            <div className="text-[11px] text-slate-400 font-bold mt-1 flex items-center gap-1">
              <span>عدد السندات: {stats.countFiltered}</span>
              <span>•</span>
              <span>{isAllTime ? 'كامل السجلات' : `شهر ${selectedMonth} / ${selectedYear}`}</span>
            </div>
          </div>
        </div>

        {/* Current Month Total */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-red-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي الشهر الجاري</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-rose-600 tracking-tight">
              ₪ {stats.totalCurrentMonth.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </div>
            <div className="text-[11px] text-slate-400 font-bold mt-1">
              يخصم تلقائياً من الأرباح الشهرية
            </div>
          </div>
        </div>

        {/* Annual Cumulative */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي مصاريف سنة {selectedYear}</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <Calendar size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              ₪ {stats.totalAnnual.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </div>
            <div className="text-[11px] text-slate-400 font-bold mt-1">
              التراكمي لكامل أشهر العام الحالي
            </div>
          </div>
        </div>

        {/* Top Spending Category */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">أعلى فئة إنفاق في الفترة</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
              <Tag size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-lg font-black text-purple-700 truncate tracking-tight">
              {stats.topCategory}
            </div>
            <div className="text-[11px] text-slate-400 font-bold mt-1">
              {stats.topCategoryAmount > 0 ? `المبلغ: ₪${stats.topCategoryAmount.toFixed(1)}` : 'لا توجد بيانات'}
            </div>
          </div>
        </div>

      </div>

      {/* Filters & Search Control Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالعنوان، البيان، رقم الفاتورة، أو الجهة المستلمة..."
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Month / Year / All-Time Picker */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsAllTime(!isAllTime)}
              className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isAllTime
                  ? 'bg-slate-900 text-amber-400 border border-slate-800 shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Calendar size={14} />
              <span>{isAllTime ? 'عرض كامل السجلات' : 'تحديد شهر وسنة'}</span>
            </button>

            {!isAllTime && (
              <>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  {monthsList.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                >
                  {yearsList.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </>
            )}
          </div>

        </div>

        {/* Category & Payment Method Pills */}
        <div className="flex items-center justify-between gap-4 pt-3 border-t border-slate-100 flex-wrap">
          
          {/* Categories Pill Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              جميع الفئات ({expenses.length})
            </button>
            {allCategories.map(cat => {
              const Icon = cat.icon;
              const count = expenses.filter(e => (e.category || 'funding') === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? `${cat.badgeBg} ${cat.textColor} ring-2 ring-current font-black`
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon size={13} style={{ color: cat.color }} />
                  <span>{cat.name.split(' ')[0]} ({count})</span>
                  {cat.isCustom && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1 py-0.2 rounded font-normal">مخصص</span>}
                </button>
              );
            })}
            <button
              onClick={() => handleOpenCategoryModal()}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
              title="إدارة وتخصيص التصنيفات"
            >
              <Settings2 size={13} />
              <span>إدارة</span>
            </button>
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap">طريقة الدفع:</span>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="all">الكل</option>
              {PAYMENT_METHODS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Expenses List Table / Cards */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileText size={18} className="text-slate-500" />
            <h3 className="text-sm font-black text-slate-900">سجل الفواتير والمصاريف ({filteredExpenses.length})</h3>
          </div>
          <div className="text-xs font-black text-slate-700">
            المجموع: <span className="text-amber-600">₪ {stats.totalFiltered.toLocaleString()}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold">جاري تحميل المصاريف التشغيلية...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-20 px-4 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
              <Receipt size={28} />
            </div>
            <h4 className="text-sm font-black text-slate-800">لا توجد مصاريف مسجلة في هذه الفترة</h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              لم يتم العثور على أي فواتير أو بنود مصروفات تطابق معايير الفرز المحددة. يمكنك إضافة مصروف جديد بالضغط على الزر أدناه.
            </p>
            <button
              onClick={() => handleOpenCreateModal()}
              className="mt-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold text-xs rounded-xl inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <Plus size={14} />
              <span>إضافة أول مصروف الآن</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black text-slate-500">
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">بيان المصروف</th>
                  <th className="py-3 px-4">الفئة</th>
                  <th className="py-3 px-4">الجهة / المورد</th>
                  <th className="py-3 px-4">طريقة الدفع</th>
                  <th className="py-3 px-4">رقم الفاتورة</th>
                  <th className="py-3 px-4 text-left">المبلغ (₪)</th>
                  <th className="py-3 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {filteredExpenses.map((expense) => {
                  const catMeta = getCategoryMeta(expense.category);
                  const Icon = catMeta.icon;
                  const payMeta = PAYMENT_METHODS.find(p => p.id === expense.paymentMethod);
                  const title = expense.title || expense.note || catMeta.defaultTitle;

                  return (
                    <tr key={expense.id} className="hover:bg-slate-50/70 transition-colors group">
                      
                      {/* Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {expense.date}
                      </td>

                      {/* Title & Note */}
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900">{title}</div>
                        {expense.note && expense.note !== title && (
                          <div className="text-[10px] text-slate-400 font-medium truncate max-w-xs">{expense.note}</div>
                        )}
                      </td>

                      {/* Category Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black ${catMeta.badgeBg} ${catMeta.textColor} border ${catMeta.borderBg}`}>
                          <Icon size={12} />
                          <span>{catMeta.name.split(' ')[0]}</span>
                        </span>
                      </td>

                      {/* Paid To */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        {expense.paidTo || '-'}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-semibold">
                          {payMeta?.name || 'نقدي'}
                        </span>
                      </td>

                      {/* Invoice Ref */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {expense.invoiceRef ? `#${expense.invoiceRef}` : '-'}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-left">
                        <span className="text-sm font-black text-slate-950 font-mono">
                          ₪ {Number(expense.amount).toFixed(2)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-1">
                          
                          {/* Print Voucher */}
                          <button
                            onClick={() => printExpenseVoucher(expense)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                            title="طباعة سند صرف رسمي"
                          >
                            <Printer size={15} />
                          </button>

                          {/* Edit */}
                          <button
                            onClick={() => handleOpenEditModal(expense)}
                            className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                            title="تعديل بيانات المصروف"
                          >
                            <Pencil size={15} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteExpenseId(expense.id)}
                            className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="حذف المصروف"
                          >
                            <Trash2 size={15} />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>
      </>
      )}

      {/* REVENUE & PROFIT COMPARISON VIEW */}
      {activeViewTab === 'revenue_comparison' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Control Bar for Revenue & Profit Comparison */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  تقرير المقارنة الشهرية: الإيرادات مقابل المصاريف التشغيلية
                </h3>
                <p className="text-xs text-slate-500">
                  مقارنة دقيقة لأرباح التدريس وأتعاب المعلمين والمصاريف التشغيلية للمركز لسنة {selectedYear}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Year Selector */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
                {yearsList.map(y => (
                  <button
                    key={y}
                    onClick={() => setSelectedYear(y)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      selectedYear === y 
                        ? 'bg-[#0D365A] text-white shadow-xs' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>

              {/* Export Comparison to Excel */}
              <button
                onClick={exportMonthlyComparisonToExcel}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title="تصدير جدول المقارنة إلى Excel"
              >
                <Download size={15} />
                <span>تصدير المقارنة Excel</span>
              </button>

              {/* Quick Add Expense */}
              <button
                onClick={() => handleOpenCreateModal()}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Plus size={15} />
                <span>تسجيل مصروف +</span>
              </button>
            </div>
          </div>

          {/* Quick Month Switcher Strip */}
          <div className="bg-slate-900 text-white rounded-3xl p-3.5 border border-slate-800 shadow-md">
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <span className="text-[11px] font-bold text-amber-400 whitespace-nowrap ml-2 flex items-center gap-1">
                <Calendar size={13} />
                <span>اختر الشهر للمعاينة:</span>
              </span>
              <div className="flex items-center gap-1.5">
                {monthlyComparisonData.map(m => (
                  <button
                    key={m.monthIndex}
                    onClick={() => setSelectedMonth(m.monthIndex)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedMonth === m.monthIndex
                        ? 'bg-amber-400 text-slate-950 font-black shadow-sm ring-2 ring-amber-400/40'
                        : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <span>{m.shortName}</span>
                    {m.operatingExpenses > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4 Executive KPI Cards for the Selected Month */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            
            {/* Card 1: Total Teaching Revenue */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">
                  إيرادات التدريس ({selectedMonthComparison.shortName})
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-emerald-600 tracking-tight">
                  ₪ {selectedMonthComparison.revenue.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </div>
                <div className="text-[11px] text-slate-400 font-bold mt-1 flex items-center gap-1.5">
                  <span>{selectedMonthComparison.sessionsCount} حصة منجزة</span>
                  <span>•</span>
                  <span>{selectedMonthComparison.hours} ساعة</span>
                </div>
              </div>
            </div>

            {/* Card 2: Teacher Payouts */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">
                  أتعاب ورواتب المعلمين
                </span>
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <GraduationCap size={20} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-amber-600 tracking-tight">
                  ₪ {selectedMonthComparison.teacherPayouts.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </div>
                <div className="text-[11px] text-slate-400 font-bold mt-1">
                  أجور الحصص المعتمدة للمركز
                </div>
              </div>
            </div>

            {/* Card 3: Operating Expenses */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-rose-500/40 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">
                  المصاريف التشغيلية للمركز
                </span>
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <Receipt size={20} />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-rose-600 tracking-tight">
                  ₪ {selectedMonthComparison.operatingExpenses.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </div>
                <div className="text-[11px] text-slate-400 font-bold mt-1 flex items-center gap-1.5">
                  <span>{selectedMonthComparison.expensesCount} سندات صرف</span>
                  <span>•</span>
                  <span>نسبة المصاريف: {selectedMonthComparison.expenseRatio}%</span>
                </div>
              </div>
            </div>

            {/* Card 4: Net Realized Profit */}
            <div className={`rounded-3xl p-5 border shadow-sm relative overflow-hidden transition-all ${
              selectedMonthComparison.netProfit > 0
                ? 'bg-gradient-to-br from-emerald-950 to-slate-900 text-white border-emerald-500/40'
                : selectedMonthComparison.netProfit === 0
                ? 'bg-white text-slate-900 border-slate-200'
                : 'bg-gradient-to-br from-rose-950 to-slate-900 text-white border-rose-500/40'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold opacity-80">
                  صافي الربح التشغيلي الحقيقي
                </span>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                  selectedMonthComparison.netProfit >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}>
                  <DollarSign size={20} />
                </div>
              </div>
              <div className="mt-3">
                <div className={`text-2xl font-black tracking-tight ${
                  selectedMonthComparison.netProfit > 0 ? 'text-emerald-400' : selectedMonthComparison.netProfit === 0 ? 'text-slate-900' : 'text-rose-400'
                }`}>
                  ₪ {selectedMonthComparison.netProfit.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                </div>
                <div className="text-[11px] opacity-80 font-bold mt-1 flex items-center gap-1.5">
                  <span>هامش الربح: {selectedMonthComparison.profitMargin}%</span>
                  <span>•</span>
                  <span>{selectedMonthComparison.netProfit >= 0 ? 'فائض تشغيلي 🟢' : 'عجز مالي 🔴'}</span>
                </div>
              </div>
            </div>

          </div>

          {/* Annual Summary Stats Bar */}
          <div className="bg-gradient-to-r from-slate-900 via-[#0D365A] to-slate-900 text-white rounded-3xl p-5 border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Award size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black">
                  ملخص الأداء المالي التراكمي لسنة {selectedYear}
                </h4>
                <p className="text-[11px] text-slate-300">
                  إجمالي الإيرادات السنوية: ₪{annualComparisonTotals.totalRevenue.toLocaleString()} | المصاريف التشغيلية: ₪{annualComparisonTotals.totalExpenses.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold">صافي الربح السنوي الكلي</div>
                <div className="text-base font-black text-amber-300">
                  ₪ {annualComparisonTotals.netProfit.toLocaleString()}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold">متوسط نسبة المصاريف</div>
                <div className="text-base font-black text-rose-300">
                  {annualComparisonTotals.expenseRatio}%
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold">متوسط هامش الربح</div>
                <div className="text-base font-black text-emerald-300">
                  {annualComparisonTotals.profitMargin}%
                </div>
              </div>
            </div>
          </div>

          {/* Recharts Comparison Chart */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 size={18} className="text-[#0D365A]" />
                <h3 className="text-sm font-black text-slate-900">
                  المخطط البياني المقارن: الإيرادات، أتعاب المعلمين، المصاريف التشغيلية وصافي الأرباح
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-400">
                كافة أشهر سنة {selectedYear}
              </span>
            </div>

            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyComparisonData} margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="shortName" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip 
                    formatter={(value: any, name: string) => {
                      const labels: Record<string, string> = {
                        revenue: 'الإيرادات التعليمية',
                        teacherPayouts: 'أتعاب المعلمين',
                        operatingExpenses: 'المصاريف التشغيلية',
                        netProfit: 'صافي الربح التشغيلي'
                      };
                      return [`₪ ${Number(value).toLocaleString()}`, labels[name] || name];
                    }}
                    labelFormatter={(label) => `شهر ${label}`}
                    contentStyle={{ fontFamily: 'Cairo', borderRadius: '12px', textAlign: 'right', direction: 'rtl' }}
                  />
                  <Legend 
                    formatter={(value) => {
                      const labels: Record<string, string> = {
                        revenue: 'الإيرادات التعليمية (₪)',
                        teacherPayouts: 'أتعاب المعلمين (₪)',
                        operatingExpenses: 'المصاريف التشغيلية (₪)',
                        netProfit: 'صافي الربح التشغيلي (₪)'
                      };
                      return labels[value] || value;
                    }}
                    wrapperStyle={{ paddingTop: '10px', fontSize: '11px', fontFamily: 'Cairo' }}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="revenue" />
                  <Bar dataKey="teacherPayouts" fill="#f59e0b" radius={[4, 4, 0, 0]} name="teacherPayouts" />
                  <Bar dataKey="operatingExpenses" fill="#f43f5e" radius={[4, 4, 0, 0]} name="operatingExpenses" />
                  <Line type="monotone" dataKey="netProfit" stroke="#0D365A" strokeWidth={3} dot={{ r: 4, fill: '#d4a33c' }} name="netProfit" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Selected Month Expense Categories Breakdown Strip */}
          {selectedMonthComparison.expensesByCategory && selectedMonthComparison.expensesByCategory.length > 0 && (
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag size={18} className="text-amber-500" />
                  <h3 className="text-sm font-black text-slate-900">
                    تفصيل المصاريف التشغيلية لشهر {selectedMonthComparison.monthName} حسب الفئة
                  </h3>
                </div>
                <span className="text-xs font-black text-rose-600">
                  المجموع: ₪{selectedMonthComparison.operatingExpenses.toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {selectedMonthComparison.expensesByCategory.map(cat => {
                  const meta = getCategoryMeta(cat.category);
                  const Icon = meta.icon;
                  return (
                    <div 
                      key={cat.category}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl ${meta.badgeBg} ${meta.textColor} flex items-center justify-center shrink-0`}>
                          <Icon size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 truncate">{cat.categoryName}</div>
                          <div className="text-[10px] text-slate-400">{cat.count} سندات صرف</div>
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <div className="text-xs font-black text-slate-900">₪{cat.amount.toFixed(1)}</div>
                        <div className="text-[10px] text-rose-600 font-bold">{cat.percentage.toFixed(0)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Monthly Comparison Breakdown Table */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#0D365A]" />
                <h3 className="text-sm font-black text-slate-900">
                  جدول البيانات التفصيلي للأداء المالي الشهري لسنة {selectedYear}
                </h3>
              </div>
              <div className="text-xs text-slate-400 font-bold">
                انقر على أي شهر لتحديده واستعراض تفاصيله
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-black">
                    <th className="py-3.5 px-4">الشهر</th>
                    <th className="py-3.5 px-3">ساعات التدريس</th>
                    <th className="py-3.5 px-3">الحصص</th>
                    <th className="py-3.5 px-3 text-emerald-700">إجمالي الإيرادات</th>
                    <th className="py-3.5 px-3 text-amber-700">أتعاب المعلمين</th>
                    <th className="py-3.5 px-3 text-rose-700">المصاريف التشغيلية</th>
                    <th className="py-3.5 px-3">صافي الربح التشغيلي</th>
                    <th className="py-3.5 px-3">نسبة المصاريف</th>
                    <th className="py-3.5 px-3">الحالة والأداء</th>
                    <th className="py-3.5 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyComparisonData.map(m => {
                    const isSelected = m.monthIndex === selectedMonth;
                    return (
                      <tr 
                        key={m.monthIndex}
                        onClick={() => setSelectedMonth(m.monthIndex)}
                        className={`transition-colors cursor-pointer hover:bg-slate-50 ${
                          isSelected ? 'bg-amber-500/10 font-bold' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-black text-slate-900 flex items-center gap-2">
                          {isSelected && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                          <span>{m.monthName}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-bold">{m.hours} س</td>
                        <td className="py-3 px-3 text-slate-600 font-bold">{m.sessionsCount}</td>
                        <td className="py-3 px-3 font-black text-emerald-700">
                          ₪ {m.revenue.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-black text-amber-700">
                          ₪ {m.teacherPayouts.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-black text-rose-700">
                          ₪ {m.operatingExpenses.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-black">
                          <span className={m.netProfit > 0 ? 'text-emerald-600' : m.netProfit === 0 ? 'text-slate-700' : 'text-rose-600'}>
                            ₪ {m.netProfit.toLocaleString()}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-bold">
                          {m.expenseRatio}%
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black inline-flex items-center gap-1 ${
                            m.netProfit > 0 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : m.netProfit === 0
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {m.netProfit > 0 ? 'فائض ربحي 🟢' : m.netProfit === 0 ? 'متوازن 🟡' : 'عجز مالي 🔴'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMonth(m.monthIndex);
                              setActiveViewTab('expenses_list');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-[#0D365A] hover:text-white text-slate-700 font-bold text-[11px] transition-colors cursor-pointer"
                            title="استعراض مصاريف هذا الشهر"
                          >
                            سندات الشهر ({m.expensesCount})
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-black text-xs">
                    <td className="py-3.5 px-4 text-amber-300">
                      الإجمالي السنوي لسنة {selectedYear}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      {annualComparisonTotals.totalHours} س
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      {annualComparisonTotals.totalSessions}
                    </td>
                    <td className="py-3.5 px-3 text-emerald-400">
                      ₪ {annualComparisonTotals.totalRevenue.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-amber-400">
                      ₪ {annualComparisonTotals.totalPayouts.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-rose-400">
                      ₪ {annualComparisonTotals.totalExpenses.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-emerald-300">
                      ₪ {annualComparisonTotals.netProfit.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-slate-300">
                      {annualComparisonTotals.expenseRatio}%
                    </td>
                    <td className="py-3.5 px-3 text-amber-300">
                      {annualComparisonTotals.netProfit > 0 ? 'فائض سنوي ممتاز 🏆' : 'عجز سنوي'}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={exportMonthlyComparisonToExcel}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] transition-colors cursor-pointer"
                      >
                        تصدير Excel
                      </button>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* CATEGORY ANALYTICS VIEW */}
      {activeViewTab === 'category_analytics' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <PieChartIcon size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  تحليلات وهيكل المصاريف التشغيلية للمركز
                </h3>
                <p className="text-xs text-slate-500">
                  رؤية تفصيلية لتوزيع النفقات الشهرية والسنوية على المقر، الكهرباء، القرطاسية، والتسويق
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">سنة التحليل:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                {yearsList.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category Distribution Pie Chart */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <PieChartIcon size={18} className="text-amber-500" />
                    <h3 className="text-sm font-black text-slate-800">توزيع المصاريف حسب الفئة</h3>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400">الفترة المحددة</span>
                </div>
                <div className="h-56 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: any) => [`₪ ${val}`, 'المبلغ']}
                        contentStyle={{ fontFamily: 'Cairo', borderRadius: '12px', textAlign: 'right', direction: 'rtl' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Legend List */}
              <div className="space-y-2 mt-4 max-h-48 overflow-y-auto pr-1">
                {categoryChartData.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="font-bold text-slate-700">{item.name}</span>
                    </div>
                    <span className="font-black text-slate-900">₪ {item.value.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Trend Bar Chart */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-blue-500" />
                  <h3 className="text-sm font-black text-slate-800">منحنى الإنفاق التشغيلي الشهري لسنة {selectedYear}</h3>
                </div>
                <span className="text-[11px] font-bold text-slate-400">إجمالي العام: ₪{stats.totalAnnual.toFixed(0)}</span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="monthName" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip 
                      formatter={(val: any) => [`₪ ${val}`, 'إجمالي المصاريف']}
                      labelFormatter={(label) => `شهر ${label}`}
                      contentStyle={{ fontFamily: 'Cairo', borderRadius: '12px', textAlign: 'right', direction: 'rtl' }}
                    />
                    <Bar dataKey="total" fill="#0D365A" radius={[6, 6, 0, 0]}>
                      {monthlyTrendData.map((entry, index) => (
                        <Cell 
                          key={`bar-${index}`} 
                          fill={entry.monthIndex === selectedMonth && !isAllTime ? '#d4a33c' : '#0D365A'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="text-[11px] text-slate-400 text-center mt-2 font-bold">
                يظهر العمود باللون الذهبي للشهر المختار حالياً ({selectedMonth})
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Expense Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden"
              dir="rtl"
            >
              
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-slate-900 to-[#0D365A] text-white p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <Receipt size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black">
                      {editingExpense ? 'تعديل بيانات المصروف التشغيلي' : 'تسجيل مصروف تشغيلي جديد للمركز'}
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      يتم إدراجه تلقائياً ضمن التقارير المحاسبية والأرباح والخسائر
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSubmitExpense} className="p-6 space-y-5">
                
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Category Selector Grid */}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-2">
                    فئة المصروف التشغيلي <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allCategories.map(cat => {
                      const Icon = cat.icon;
                      const isSelected = formCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setFormCategory(cat.id);
                            if (!formTitle || formTitle === getCategoryMeta(formCategory, customCategories).defaultTitle) {
                              setFormTitle(cat.defaultTitle);
                            }
                          }}
                          className={`p-2.5 rounded-2xl border text-right transition-all cursor-pointer flex items-center gap-2 ${
                            isSelected
                              ? 'bg-amber-50 border-amber-400 text-amber-950 font-black shadow-xs ring-2 ring-amber-400/20'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                            <Icon size={14} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[11px] truncate font-bold">{cat.name.split(' ')[0]} {cat.name.split(' ')[1] || ''}</span>
                            {cat.isCustom && <span className="text-[9px] text-indigo-500 font-semibold">مخصص</span>}
                          </div>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => handleOpenCategoryModal()}
                      className="p-2.5 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700/60 bg-indigo-50/40 hover:bg-indigo-100/60 text-indigo-700 dark:text-indigo-300 transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold"
                      title="إضافة تصنيف تشغيلي مخصص جديد"
                    >
                      <FolderPlus size={15} />
                      <span>+ تصنيف مخصص</span>
                    </button>
                  </div>
                </div>

                {/* Title & Amount Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-black text-slate-700 mb-1.5">
                      عنوان / بيان المصروف <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="مثال: فاتورة كهرباء شهر 8 - المقر الرئيسي"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1.5">
                      المبلغ (₪) <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        min="0.01"
                        required
                        value={formAmount}
                        onChange={(e) => setFormAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">₪</span>
                    </div>
                  </div>

                </div>

                {/* Date & Payment Method */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1.5">
                      تاريخ الصرف <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1.5">
                      طريقة الدفع
                    </label>
                    <select
                      value={formPaymentMethod}
                      onChange={(e) => setFormPaymentMethod(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    >
                      {PAYMENT_METHODS.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                </div>

                {/* Paid To & Invoice Ref */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  
                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1.5">
                      الجهة المستلمة / المورد (اختياري)
                    </label>
                    <input
                      type="text"
                      value={formPaidTo}
                      onChange={(e) => setFormPaidTo(e.target.value)}
                      placeholder="مثال: شركة الكهرباء، صاحب العقار..."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-slate-700 mb-1.5">
                      رقم الفاتورة أو السند (اختياري)
                    </label>
                    <input
                      type="text"
                      value={formInvoiceRef}
                      onChange={(e) => setFormInvoiceRef(e.target.value)}
                      placeholder="مثال: INV-9842"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                </div>

                {/* Note Field */}
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5">
                    ملاحظات وتفاصيل السند
                  </label>
                  <textarea
                    rows={2}
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    placeholder="أضف أي تفاصيل أو شروط خاصة بالمصروف..."
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {formSubmitting && <RefreshCw size={14} className="animate-spin" />}
                    <span>{editingExpense ? 'حفظ التعديلات' : 'اعتماد وتسجيل المصروف'}</span>
                  </button>
                </div>

              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteExpenseId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl w-full max-w-md text-right space-y-4"
              dir="rtl"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Trash2 size={24} />
              </div>
              <h3 className="text-base font-black text-slate-900">تأكيد حذف المصروف التشغيلي</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف هذا المصروف نهائياً من سجلات الأكاديمية؟ سيتم تحديث تقارير الأرباح والخسائر وحسابات المركز فوراً.
              </p>
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => setDeleteExpenseId(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  onClick={() => executeDeleteExpense(deleteExpenseId)}
                  disabled={isDeleting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? 'جاري الحذف...' : 'نعم، احذف المصروف'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Management Modal */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
              dir="rtl"
            >
              {/* Header */}
              <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center shadow-inner">
                    <SlidersHorizontal size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black tracking-tight">إدارة وتخصيص تصنيفات المصاريف التشغيلية</h3>
                    <p className="text-[11px] text-indigo-200/80">
                      تخصيص الفئات (إيجار، فواتير، رواتب...) وإضافة تصنيفات جديدة بمرونة كاملة
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsCategoryModalOpen(false);
                    setEditingCategory(null);
                  }}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Tabs */}
              <div className="px-6 pt-4 pb-2 bg-slate-50 border-b border-slate-200/80 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryModalTab('list');
                    setEditingCategory(null);
                    setCatFormError('');
                  }}
                  className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    categoryModalTab === 'list'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Layers size={14} />
                  <span>كافة التصنيفات ({allCategories.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCategoryModalTab('form');
                    setCatFormError('');
                  }}
                  className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                    categoryModalTab === 'form'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Plus size={14} />
                  <span>{editingCategory ? 'تعديل التصنيف المختار' : 'إضافة تصنيف جديد +'}</span>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                
                {categoryDeleteError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{categoryDeleteError}</span>
                  </div>
                )}

                {categoryModalTab === 'list' ? (
                  <div className="space-y-6">
                    {/* Standard Categories Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-500" />
                          <h4 className="text-xs font-black text-slate-800">
                            التصنيفات الأساسية المعتمدة ({STANDARD_EXPENSE_CATEGORIES.length})
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">مثبتة قياسياً في المنظومة</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {STANDARD_EXPENSE_CATEGORIES.map(cat => {
                          const Icon = cat.icon;
                          const count = expenses.filter(e => (e.category || 'funding') === cat.id).length;
                          const totalAmt = expenses
                            .filter(e => (e.category || 'funding') === cat.id)
                            .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

                          return (
                            <div
                              key={cat.id}
                              className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between gap-3 transition-colors"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                                  style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                                >
                                  <Icon size={16} />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-black text-slate-900 truncate">
                                    {cat.name}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-medium truncate">
                                    {cat.defaultTitle}
                                  </div>
                                </div>
                              </div>

                              <div className="text-left shrink-0">
                                <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                                  {count} مصروف
                                </span>
                                {totalAmt > 0 && (
                                  <div className="text-[10px] font-black text-amber-600 mt-0.5">
                                    ₪{totalAmt.toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Categories Section */}
                    <div className="pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Tag size={16} className="text-indigo-600" />
                          <h4 className="text-xs font-black text-slate-800">
                            التصنيفات المخصصة من الإدارة ({customCategories.length})
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(null);
                            setCatFormName('');
                            setCatFormDefaultTitle('');
                            setCatFormColor(AVAILABLE_CATEGORY_COLORS[0].hex);
                            setCatFormIcon('Tag');
                            setCatFormDescription('');
                            setCatFormError('');
                            setCategoryModalTab('form');
                          }}
                          className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>إضافة تصنيف مخصص</span>
                        </button>
                      </div>

                      {customCategories.length === 0 ? (
                        <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-2 bg-slate-50/40">
                          <Tag size={24} className="mx-auto text-slate-300" />
                          <div className="text-xs font-bold text-slate-600">لا توجد تصنيفات مخصصة مضافة حتى الآن</div>
                          <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                            يمكن للمدير إضافة تصنيفات تشغيلية مخصصة بحرية، مثل: اشتراكات أدوات الذكاء الاصطناعي، أتعاب استشارية، مصاريف نقل ومواصلات، أو تأمينات وتراخيص.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategory(null);
                              setCategoryModalTab('form');
                            }}
                            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-sm transition-all cursor-pointer"
                          >
                            <Plus size={14} />
                            <span>إنشاء أول تصنيف مخصص</span>
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {customCategories.map(cat => {
                            const iconDef = AVAILABLE_CATEGORY_ICONS.find(i => i.id === cat.icon) || AVAILABLE_CATEGORY_ICONS[0];
                            const IconComponent = iconDef.icon;
                            const count = expenses.filter(e => e.category === cat.id).length;
                            const totalAmt = expenses
                              .filter(e => e.category === cat.id)
                              .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

                            return (
                              <div
                                key={cat.id}
                                className="p-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/20 hover:bg-indigo-50/40 flex items-center justify-between gap-3 transition-colors"
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                                  >
                                    <IconComponent size={16} />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-black text-slate-900 truncate">{cat.name}</span>
                                      <span className="text-[9px] font-bold px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded-full">مخصص</span>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium truncate">
                                      {cat.defaultTitle || cat.name}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="text-left">
                                    <span className="inline-block text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100/70 text-indigo-700">
                                      {count} مصروف
                                    </span>
                                    {totalAmt > 0 && (
                                      <div className="text-[10px] font-black text-amber-600 mt-0.5">
                                        ₪{totalAmt.toLocaleString()}
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 border-r border-slate-200 pr-1 mr-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenCategoryModal(cat)}
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-100/60 transition-colors cursor-pointer"
                                      title="تعديل التصنيف"
                                    >
                                      <Pencil size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteCategoryId(cat.id)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                      title="حذف التصنيف"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Form Tab: Add / Edit Custom Category */
                  <form onSubmit={handleSaveCategory} className="space-y-5">
                    
                    {catFormError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-2">
                        <AlertCircle size={16} className="shrink-0" />
                        <span>{catFormError}</span>
                      </div>
                    )}

                    {/* Name & Default Title */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-1.5">
                          اسم التصنيف <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={catFormName}
                          onChange={(e) => {
                            setCatFormName(e.target.value);
                            if (!catFormDefaultTitle || catFormDefaultTitle === catFormName) {
                              setCatFormDefaultTitle(e.target.value);
                            }
                          }}
                          placeholder="مثال: اشتراكات منصات الذكاء الاصطناعي"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black text-slate-700 mb-1.5">
                          البيان الافتراضي للمصروف
                        </label>
                        <input
                          type="text"
                          value={catFormDefaultTitle}
                          onChange={(e) => setCatFormDefaultTitle(e.target.value)}
                          placeholder="مثال: تجديد اشتراك ChatGPT / Claude للأكاديمية"
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Color Palette Selector */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-2">
                        اختر اللون المميز للتصنيف
                      </label>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {AVAILABLE_CATEGORY_COLORS.map(c => {
                          const isSelected = catFormColor === c.hex;
                          return (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => setCatFormColor(c.hex)}
                              title={c.name}
                              className={`w-8 h-8 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                                isSelected ? 'scale-110 ring-3 ring-indigo-500 ring-offset-2' : 'hover:scale-105 opacity-80 hover:opacity-100'
                              }`}
                              style={{ backgroundColor: c.hex }}
                            >
                              {isSelected && <CheckCircle2 size={16} className="text-white drop-shadow-sm" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Icon Picker Grid */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-2">
                        اختر أيقونة معبرة
                      </label>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {AVAILABLE_CATEGORY_ICONS.map(item => {
                          const IconComp = item.icon;
                          const isSelected = catFormIcon === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setCatFormIcon(item.id)}
                              className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold ring-2 ring-indigo-400/20'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: `${catFormColor}20`, color: catFormColor }}
                              >
                                <IconComp size={16} />
                              </div>
                              <span className="text-[10px] leading-tight truncate w-full">{item.name.split('/')[0]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-black text-slate-700 mb-1.5">
                        وصف أو معايير استخدام هذا التصنيف (اختياري)
                      </label>
                      <textarea
                        rows={2}
                        value={catFormDescription}
                        onChange={(e) => setCatFormDescription(e.target.value)}
                        placeholder="ملاحظات تفيد المحاسب أو المدير حول ما يندرج تحت هذا البند..."
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>

                    {/* Live Preview Card */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-xs"
                          style={{ backgroundColor: `${catFormColor}20`, color: catFormColor }}
                        >
                          {(() => {
                            const iconDef = AVAILABLE_CATEGORY_ICONS.find(i => i.id === catFormIcon) || AVAILABLE_CATEGORY_ICONS[0];
                            const IconC = iconDef.icon;
                            return <IconC size={18} />;
                          })()}
                        </div>
                        <div>
                          <div className="text-xs font-black text-slate-900">
                            معاينة حية: {catFormName.trim() || 'اسم التصنيف'}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium">
                            {catFormDefaultTitle.trim() || 'البيان الافتراضي للتصنيف'}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                        مخصص للأكاديمية
                      </span>
                    </div>

                    {/* Form Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryModalTab('list');
                          setEditingCategory(null);
                        }}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      >
                        إلغاء
                      </button>

                      <button
                        type="submit"
                        disabled={catFormSubmitting}
                        className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {catFormSubmitting && <RefreshCw size={14} className="animate-spin" />}
                        <span>{editingCategory ? 'حفظ تعديلات التصنيف' : 'حفظ واعتماد التصنيف الجديد'}</span>
                      </button>
                    </div>

                  </form>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Category Confirmation Modal */}
      <AnimatePresence>
        {deleteCategoryId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xl w-full max-w-md text-right space-y-4"
              dir="rtl"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Trash2 size={24} />
              </div>
              <h3 className="text-base font-black text-slate-900">تأكيد حذف التصنيف المخصص</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف هذا التصنيف المخصص؟ لن يؤثر الحذف على التصنيفات الأساسية، ولكن لا يمكن استرجاع هذا التصنيف بعد حذفه.
              </p>
              {categoryDeleteError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-2xl">
                  {categoryDeleteError}
                </div>
              )}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  onClick={() => {
                    setDeleteCategoryId(null);
                    setCategoryDeleteError('');
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  onClick={() => executeDeleteCategory(deleteCategoryId)}
                  disabled={isDeletingCategory}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isDeletingCategory ? 'جاري الحذف...' : 'نعم، احذف التصنيف'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
