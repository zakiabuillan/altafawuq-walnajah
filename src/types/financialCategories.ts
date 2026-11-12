export type FinancialCategoryScope = 'deposit' | 'session' | 'both';

export type FinancialCategoryColor = 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'teal' | 'indigo' | 'slate';

export interface FinancialCategory {
  id: string;
  name: string;
  type: FinancialCategoryScope;
  description?: string;
  defaultAmount?: number;
  color?: FinancialCategoryColor;
  icon?: string;
  isActive: boolean;
  isSystem?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_FINANCIAL_CATEGORIES: FinancialCategory[] = [
  {
    id: 'cat_books',
    name: 'رسوم كتب وملازم دراسية',
    type: 'both',
    description: 'قيمة المناهج المطبوعة، الكراسات والملازم التعليمية والملخصات المعتمدة',
    defaultAmount: 100,
    color: 'blue',
    icon: 'Book',
    isActive: true,
    isSystem: true,
    createdAt: '2026-01-01'
  },
  {
    id: 'cat_subscription',
    name: 'اشتراكات شهرية ودورات',
    type: 'both',
    description: 'باقة اشتراك شهري منتظم أو تسجيل في دورة دراسية شاملة',
    defaultAmount: 250,
    color: 'purple',
    icon: 'Layers',
    isActive: true,
    isSystem: true,
    createdAt: '2026-01-01'
  },
  {
    id: 'cat_extra_services',
    name: 'خدمات إضافية واستشارية',
    type: 'both',
    description: 'جلسات دعم إضافية، متابعة فردية خاصة، أو خدمات تدريس استثنائية',
    defaultAmount: 50,
    color: 'amber',
    icon: 'Sparkles',
    isActive: true,
    isSystem: true,
    createdAt: '2026-01-01'
  },
  {
    id: 'cat_wallet_topup',
    name: 'شحن رصيد المحفظة التعليمية',
    type: 'deposit',
    description: 'إيداع عام لرصيد المحفظة لاقتطاع رسوم الحصص والأنشطة الأكاديمية لاحقاً',
    defaultAmount: 200,
    color: 'emerald',
    icon: 'Wallet',
    isActive: true,
    isSystem: true,
    createdAt: '2026-01-01'
  },
  {
    id: 'cat_exam_fees',
    name: 'رسوم اختبارات وتقييمات',
    type: 'both',
    description: 'رسوم إجراء امتحانات المستوى الدورية، الاختبارات التجريبية، والتقييمات الشاملة',
    defaultAmount: 75,
    color: 'rose',
    icon: 'GraduationCap',
    isActive: true,
    isSystem: true,
    createdAt: '2026-01-01'
  },
  {
    id: 'cat_tutoring_session',
    name: 'حصة تدريسية خصوصية',
    type: 'session',
    description: 'تسجيل لقاء تعليمي فردي مباشر وفق المعدل الساعي المعتمد',
    defaultAmount: 60,
    color: 'teal',
    icon: 'Clock',
    isActive: true,
    isSystem: true,
    createdAt: '2026-01-01'
  }
];

export function getCategoryBadgeClasses(color?: FinancialCategoryColor | string): {
  bg: string;
  text: string;
  border: string;
  dot: string;
  chipBg: string;
} {
  switch (color) {
    case 'emerald':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-800',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        chipBg: 'bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20'
      };
    case 'blue':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-800',
        border: 'border-blue-200',
        dot: 'bg-blue-500',
        chipBg: 'bg-blue-500/10 text-blue-700 hover:bg-blue-500/20'
      };
    case 'purple':
      return {
        bg: 'bg-purple-50',
        text: 'text-purple-800',
        border: 'border-purple-200',
        dot: 'bg-purple-500',
        chipBg: 'bg-purple-500/10 text-purple-700 hover:bg-purple-500/20'
      };
    case 'amber':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        chipBg: 'bg-amber-500/10 text-amber-800 hover:bg-amber-500/20'
      };
    case 'rose':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-800',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
        chipBg: 'bg-rose-500/10 text-rose-700 hover:bg-rose-500/20'
      };
    case 'teal':
      return {
        bg: 'bg-teal-50',
        text: 'text-teal-800',
        border: 'border-teal-200',
        dot: 'bg-teal-500',
        chipBg: 'bg-teal-500/10 text-teal-700 hover:bg-teal-500/20'
      };
    case 'indigo':
      return {
        bg: 'bg-indigo-50',
        text: 'text-indigo-800',
        border: 'border-indigo-200',
        dot: 'bg-indigo-500',
        chipBg: 'bg-indigo-500/10 text-indigo-700 hover:bg-indigo-500/20'
      };
    case 'slate':
    default:
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-800',
        border: 'border-slate-200',
        dot: 'bg-slate-500',
        chipBg: 'bg-slate-200 text-slate-700 hover:bg-slate-300'
      };
  }
}

export function getCategoryScopeLabel(scope: FinancialCategoryScope): {
  label: string;
  badgeBg: string;
  iconText: string;
} {
  switch (scope) {
    case 'deposit':
      return {
        label: 'إيداع وشحن الأرصدة فقط',
        badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        iconText: '💳 إيداع'
      };
    case 'session':
      return {
        label: 'تسجيل الحصص والخدمات فقط',
        badgeBg: 'bg-blue-100 text-blue-800 border-blue-300',
        iconText: '🎓 حصص'
      };
    case 'both':
    default:
      return {
        label: 'مشترك (إيداع وحصص)',
        badgeBg: 'bg-purple-100 text-purple-800 border-purple-300',
        iconText: '🔄 مشترك'
      };
  }
}
