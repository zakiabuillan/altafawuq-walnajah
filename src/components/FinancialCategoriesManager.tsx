import React, { useState, useMemo } from 'react';
import { 
  FinancialCategory, 
  FinancialCategoryScope, 
  FinancialCategoryColor, 
  DEFAULT_FINANCIAL_CATEGORIES, 
  getCategoryBadgeClasses, 
  getCategoryScopeLabel 
} from '../types/financialCategories';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  RotateCcw, 
  Search, 
  Tags, 
  Book, 
  Layers, 
  Sparkles, 
  Wallet, 
  GraduationCap, 
  Clock, 
  Check, 
  X, 
  DollarSign, 
  Info, 
  ShieldCheck, 
  AlertTriangle,
  ArrowRight,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { logActivity } from '../lib/activityLogger';

interface FinancialCategoriesManagerProps {
  categories: FinancialCategory[];
  onSaveCategories: (updatedCategories: FinancialCategory[]) => Promise<void>;
  isSaving?: boolean;
}

const COLOR_OPTIONS: { value: FinancialCategoryColor; label: string; bg: string; border: string; preview: string }[] = [
  { value: 'emerald', label: 'زمردي (أخضر)', bg: 'bg-emerald-50', border: 'border-emerald-300', preview: 'bg-emerald-500' },
  { value: 'blue', label: 'أزرق ملكي', bg: 'bg-blue-50', border: 'border-blue-300', preview: 'bg-blue-500' },
  { value: 'purple', label: 'بنفسجي', bg: 'bg-purple-50', border: 'border-purple-300', preview: 'bg-purple-500' },
  { value: 'amber', label: 'عنبري (ذهبي)', bg: 'bg-amber-50', border: 'border-amber-300', preview: 'bg-amber-500' },
  { value: 'rose', label: 'وردي', bg: 'bg-rose-50', border: 'border-rose-300', preview: 'bg-rose-500' },
  { value: 'teal', label: 'تيل بحري', bg: 'bg-teal-50', border: 'border-teal-300', preview: 'bg-teal-500' },
  { value: 'indigo', label: 'نيلي داكن', bg: 'bg-indigo-50', border: 'border-indigo-300', preview: 'bg-indigo-500' },
  { value: 'slate', label: 'رمادي محايد', bg: 'bg-slate-100', border: 'border-slate-300', preview: 'bg-slate-500' },
];

export const FinancialCategoriesManager: React.FC<FinancialCategoriesManagerProps> = ({
  categories,
  onSaveCategories,
  isSaving = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | FinancialCategoryScope>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Form State for Add / Edit
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<FinancialCategoryScope>('both');
  const [description, setDescription] = useState('');
  const [defaultAmount, setDefaultAmount] = useState<string>('');
  const [color, setColor] = useState<FinancialCategoryColor>('blue');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
      const matchesSearch = 
        cat.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase().trim()));
      
      const matchesScope = 
        scopeFilter === 'all' ? true : 
        scopeFilter === 'both' ? cat.type === 'both' :
        cat.type === scopeFilter || cat.type === 'both';

      const matchesStatus = 
        statusFilter === 'all' ? true : 
        statusFilter === 'active' ? cat.isActive : !cat.isActive;

      return matchesSearch && matchesScope && matchesStatus;
    });
  }, [categories, searchTerm, scopeFilter, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = categories.length;
    const active = categories.filter(c => c.isActive).length;
    const deposits = categories.filter(c => c.type === 'deposit' || c.type === 'both').length;
    const sessions = categories.filter(c => c.type === 'session' || c.type === 'both').length;
    return { total, active, deposits, sessions };
  }, [categories]);

  const handleOpenAddForm = () => {
    setEditingId(null);
    setName('');
    setType('both');
    setDescription('');
    setDefaultAmount('');
    setColor('blue');
    setIsActive(true);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (category: FinancialCategory) => {
    setEditingId(category.id);
    setName(category.name);
    setType(category.type);
    setDescription(category.description || '');
    setDefaultAmount(category.defaultAmount !== undefined ? String(category.defaultAmount) : '');
    setColor((category.color as FinancialCategoryColor) || 'blue');
    setIsActive(category.isActive);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormError('');
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('يرجى إدخال اسم التصنيف المالي.');
      return;
    }

    const parsedAmount = defaultAmount.trim() !== '' ? Math.max(0, parseFloat(defaultAmount)) : undefined;

    let updatedList: FinancialCategory[];

    if (editingId) {
      // Editing existing
      updatedList = categories.map(c => {
        if (c.id === editingId) {
          return {
            ...c,
            name: name.trim(),
            type,
            description: description.trim(),
            defaultAmount: parsedAmount,
            color,
            isActive,
            updatedAt: new Date().toISOString().split('T')[0]
          };
        }
        return c;
      });
    } else {
      // Creating new
      const newCategory: FinancialCategory = {
        id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        type,
        description: description.trim(),
        defaultAmount: parsedAmount,
        color,
        isActive,
        isSystem: false,
        createdAt: new Date().toISOString().split('T')[0]
      };
      updatedList = [newCategory, ...categories];
    }

    try {
      await onSaveCategories(updatedList);
      
      await logActivity({
        actionType: editingId ? 'UPDATE_FINANCIAL_CATEGORY' : 'CREATE_FINANCIAL_CATEGORY',
        actionName: editingId ? 'تعديل تصنيف مالي مخصص' : 'إنشاء تصنيف مالي مخصص جديد',
        details: `${editingId ? 'تم تحديث بيانات' : 'تم إضافة'} التصنيف المالي: "${name.trim()}"، النطاق: ${type}، المبلغ المقترح: ₪${parsedAmount ?? 'غير محدد'}`,
      });

      setSuccessMessage(editingId ? 'تم تحديث التصنيف المالي بنجاح' : 'تمت إضافة التصنيف المالي الجديد بنجاح');
      setTimeout(() => setSuccessMessage(''), 3500);
      handleCloseForm();
    } catch (err) {
      console.error('Failed to save category:', err);
      setFormError('حدث خطأ أثناء حفظ التصنيف المالي في قاعدة البيانات.');
    }
  };

  const handleToggleActive = async (category: FinancialCategory) => {
    const updatedList = categories.map(c => {
      if (c.id === category.id) {
        return { ...c, isActive: !c.isActive };
      }
      return c;
    });

    try {
      await onSaveCategories(updatedList);
      await logActivity({
        actionType: 'TOGGLE_FINANCIAL_CATEGORY',
        actionName: category.isActive ? 'تعطيل تصنيف مالي' : 'تفعيل تصنيف مالي',
        details: `تم ${category.isActive ? 'تعطيل' : 'تفعيل'} التصنيف المالي: "${category.name}"`,
      });
    } catch (err) {
      console.error('Failed to toggle category:', err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const target = categories.find(c => c.id === id);
    const updatedList = categories.filter(c => c.id !== id);

    try {
      await onSaveCategories(updatedList);
      if (target) {
        await logActivity({
          actionType: 'DELETE_FINANCIAL_CATEGORY',
          actionName: 'حذف تصنيف مالي مخصص',
          details: `تم حذف التصنيف المالي: "${target.name}" نهائياً من إعدادات النظام`,
        });
      }
      setDeleteConfirmId(null);
      setSuccessMessage('تم حذف التصنيف المالي بنجاح');
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      console.error('Failed to delete category:', err);
    }
  };

  const handleRestoreDefaults = async () => {
    try {
      await onSaveCategories(DEFAULT_FINANCIAL_CATEGORIES);
      await logActivity({
        actionType: 'RESET_FINANCIAL_CATEGORIES',
        actionName: 'استعادة التصنيفات المالية الافتراضية',
        details: 'تمت استعادة التصنيفات المالية القياسية (رسوم كتب وملازم، اشتراكات دورات، خدمات إضافية، شحن محفظة، رسوم اختبارات، حصة تدريسية)',
      });
      setResetConfirmOpen(false);
      setSuccessMessage('تمت استعادة التصنيفات والبنود المالية القياسية بنجاح');
      setTimeout(() => setSuccessMessage(''), 3500);
    } catch (err) {
      console.error('Failed to restore default categories:', err);
    }
  };

  // Helper icon renderer
  const renderCategoryIcon = (cat: FinancialCategory) => {
    const size = 18;
    if (cat.name.includes('كتب') || cat.name.includes('كتاب') || cat.name.includes('ملزمة')) {
      return <Book size={size} />;
    }
    if (cat.name.includes('اشتراك') || cat.name.includes('باقة')) {
      return <Layers size={size} />;
    }
    if (cat.name.includes('خدمات') || cat.name.includes('إضافية') || cat.name.includes('استشارية')) {
      return <Sparkles size={size} />;
    }
    if (cat.name.includes('محفظة') || cat.name.includes('شحن') || cat.name.includes('إيداع')) {
      return <Wallet size={size} />;
    }
    if (cat.name.includes('اختبار') || cat.name.includes('امتحان') || cat.name.includes('تقييم')) {
      return <GraduationCap size={size} />;
    }
    return <Clock size={size} />;
  };

  return (
    <div className="space-y-8 text-right" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-r from-amber-400 via-emerald-400 to-indigo-400" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center border border-amber-400/30 shadow-inner">
                <Tags size={24} />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                  <span>التصنيفات والبنود المالية المخصصة</span>
                  <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    فوترة ورصد موحد 🏷️
                  </span>
                </h2>
                <p className="text-xs md:text-sm text-slate-300 font-semibold mt-1">
                  تعريف الرسوم والخدمات المعتمدة (رسوم كتب وملازم، اشتراكات شهرية، خدمات إضافية) للاستخدام المباشر عند تسجيل الحصص أو إيداع الأرصدة.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
            <button
              onClick={handleOpenAddForm}
              className="px-5 py-3 rounded-2xl bg-amber-400 text-slate-950 hover:bg-amber-300 transition-all font-black text-xs shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer active:scale-95"
              id="add-financial-category-btn"
            >
              <Plus size={16} className="stroke-[3]" />
              <span>إضافة تصنيف مالي جديد</span>
            </button>

            <button
              onClick={() => setResetConfirmOpen(true)}
              className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition-all font-black text-xs flex items-center gap-1.5 cursor-pointer"
              title="استعادة البنود والتصنيفات القياسية الموصى بها"
            >
              <RotateCcw size={14} />
              <span>استعادة الافتراضية</span>
            </button>
          </div>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5 text-right">
            <p className="text-[11px] text-slate-400 font-bold">إجمالي البنود</p>
            <p className="text-xl font-black text-white mt-1">{stats.total} <span className="text-xs font-normal text-slate-400">بند</span></p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5 text-right">
            <p className="text-[11px] text-emerald-400 font-bold">متاح لإيداع الأرصدة</p>
            <p className="text-xl font-black text-emerald-300 mt-1">{stats.deposits} <span className="text-xs font-normal text-slate-400">بند</span></p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5 text-right">
            <p className="text-[11px] text-blue-400 font-bold">متاح لتسجيل الحصص</p>
            <p className="text-xl font-black text-blue-300 mt-1">{stats.sessions} <span className="text-xs font-normal text-slate-400">بند</span></p>
          </div>
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5 text-right">
            <p className="text-[11px] text-amber-400 font-bold">التصنيفات النشطة</p>
            <p className="text-xl font-black text-amber-300 mt-1">{stats.active} <span className="text-xs font-normal text-slate-400">نشط</span></p>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs font-bold shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage('')} className="text-emerald-700 hover:text-emerald-950 p-1">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add / Edit Form Modal or Card */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -10 }}
            className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-amber-300/70 shadow-xl relative overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                  {editingId ? <Edit3 size={18} /> : <Plus size={20} />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {editingId ? 'تعديل التصنيف المالي المخصص' : 'إضافة تصنيف أو بند مالي جديد'}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold mt-0.5">
                    حدد مسمى البند ونطاق تطبيقه والمبلغ الافتراضي المقترح
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseForm}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveForm} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Category Name */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-800 block">
                    اسم التصنيف أو البند المالي <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="مثل: رسوم كتب وملازم، اشتراك شهري، خدمات إضافية، رسوم امتحانات..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none font-bold text-xs text-slate-900 transition-all text-right"
                  />
                  <p className="text-[10px] text-slate-400 font-semibold">
                    المسمى الذي سيظهر للمدير والمعلمين في قوائم الاختيار السريع وسندات القبض.
                  </p>
                </div>

                {/* Default Amount */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-800 block">
                    المبلغ المالي الافتراضي المقترح (شيكل ₪) <span className="text-slate-400 font-normal">(اختياري)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₪</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={defaultAmount}
                      onChange={e => setDefaultAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none font-black text-xs text-slate-900 transition-all text-right"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-semibold">
                    عند اختيار هذا التصنيف سيتم اقتراح هذا المبلغ تلقائياً لتسريع التوثيق مع إمكانية تعديله يدوياً.
                  </p>
                </div>
              </div>

              {/* Scope Selection */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 block">
                  نطاق الاستخدام المالي <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setType('both')}
                    className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                      type === 'both'
                        ? 'bg-purple-50 border-purple-400 text-purple-950 shadow-sm ring-2 ring-purple-400/20'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black">🔄 مشترك (كلاهما)</span>
                      {type === 'both' && <Check size={14} className="text-purple-600 stroke-[3]" />}
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">
                      متاح لشحن وإيداع الأرصدة + تسجيل الحصص والخدمات
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('deposit')}
                    className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                      type === 'deposit'
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950 shadow-sm ring-2 ring-emerald-400/20'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black">💳 إيداع وشحن الأرصدة فقط</span>
                      {type === 'deposit' && <Check size={14} className="text-emerald-600 stroke-[3]" />}
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">
                      يظهر فقط في نموذج شحن محفظة الطالب وسند القبض
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType('session')}
                    className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                      type === 'session'
                        ? 'bg-blue-50 border-blue-400 text-blue-950 shadow-sm ring-2 ring-blue-400/20'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black">🎓 تسجيل الحصص والخدمات فقط</span>
                      {type === 'session' && <Check size={14} className="text-blue-600 stroke-[3]" />}
                    </div>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">
                      يظهر فقط في واجهة تسجيل الحصص والأنشطة الأكاديمية
                    </p>
                  </button>
                </div>
              </div>

              {/* Color Theme Selector */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-800 block">
                  اللون التمييزي للبطاقة والشارة
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {COLOR_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setColor(opt.value)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                        color === opt.value
                          ? `${opt.bg} ${opt.border} text-slate-900 ring-2 ring-slate-400/30 shadow-xs`
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-3.5 h-3.5 rounded-full ${opt.preview}`} />
                      <span>{opt.label}</span>
                      {color === opt.value && <Check size={12} className="stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description & Active toggle */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-black text-slate-800 block">
                    الوصف أو البيان الإيضاحي <span className="text-slate-400 font-normal">(اختياري)</span>
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="توضيح مختصر يصف ما يشمله هذا البند المالي..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none font-semibold text-xs text-slate-900 transition-all text-right"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <label className="text-xs font-black text-slate-800 block">
                    حالة البند في النظام
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={e => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 border-slate-300 cursor-pointer"
                    />
                    <div className="text-right">
                      <span className="text-xs font-black text-slate-900 block">
                        {isActive ? '✅ مفعّل ومتاح للاستخدام' : '⏸️ معطّل مؤقتاً'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {isActive ? 'سيظهر في القوائم المنسدلة' : 'لن يظهر في نماذج الإدخال'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-5 py-2.5 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-7 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-[#D4A33C] hover:text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? (
                    <span>جاري الحفظ...</span>
                  ) : (
                    <>
                      <Check size={14} className="stroke-[3]" />
                      <span>{editingId ? 'حفظ التعديلات' : 'إضافة البند المالي'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search box */}
        <div className="relative flex-1">
          <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="بحث بالاسم أو الوصف (رسوم كتب، اشتراكات، خدمات إضافية...)"
            className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-right"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Scope Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setScopeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              scopeFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            الكل ({categories.length})
          </button>
          <button
            onClick={() => setScopeFilter('deposit')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              scopeFilter === 'deposit'
                ? 'bg-emerald-50 text-emerald-900 shadow-xs border border-emerald-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            💳 إيداع الأرصدة
          </button>
          <button
            onClick={() => setScopeFilter('session')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              scopeFilter === 'session'
                ? 'bg-blue-50 text-blue-900 shadow-xs border border-blue-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🎓 تسجيل الحصص
          </button>
          <button
            onClick={() => setScopeFilter('both')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              scopeFilter === 'both'
                ? 'bg-purple-50 text-purple-900 shadow-xs border border-purple-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            🔄 مشترك
          </button>
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
        >
          <option value="all">جميع الحالات (نشط ومعطل)</option>
          <option value="active">النشطة فقط</option>
          <option value="inactive">المعطلة فقط</option>
        </select>
      </div>

      {/* Categories Cards List */}
      <div className="space-y-3">
        {filteredCategories.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-12 text-center border border-slate-200/80 shadow-xs space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
              <Tags size={28} />
            </div>
            <div>
              <h4 className="text-base font-black text-slate-800">لم يتم العثور على تصنيفات مطابقة</h4>
              <p className="text-xs text-slate-400 font-semibold mt-1">
                جرب تغيير معايير البحث أو تصفية النطاق، أو قم بإضافة تصنيف مالي جديد.
              </p>
            </div>
            <button
              onClick={handleOpenAddForm}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-amber-500 hover:text-slate-950 text-xs font-black transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Plus size={14} />
              <span>إضافة تصنيف مالي الآن</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCategories.map(cat => {
              const badge = getCategoryBadgeClasses(cat.color);
              const scopeInfo = getCategoryScopeLabel(cat.type);

              return (
                <motion.div
                  key={cat.id}
                  layout
                  className={`bg-white rounded-2xl p-5 border transition-all shadow-xs relative overflow-hidden flex flex-col justify-between gap-4 ${
                    cat.isActive
                      ? 'border-slate-200/80 hover:border-slate-300 hover:shadow-md'
                      : 'border-slate-200 bg-slate-50/70 opacity-65'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Title, Badge, and Action Buttons */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${badge.bg} ${badge.text} border ${badge.border}`}>
                          {renderCategoryIcon(cat)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-slate-900">{cat.name}</h4>
                            {!cat.isActive && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-600 text-[10px] font-bold">
                                معطل
                              </span>
                            )}
                          </div>
                          <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${scopeInfo.badgeBg}`}>
                            {scopeInfo.iconText}
                          </span>
                        </div>
                      </div>

                      {/* Default Amount Pill */}
                      {cat.defaultAmount !== undefined && (
                        <div className="text-left shrink-0 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                          <span className="text-[10px] text-emerald-700 font-bold block">افتراضي:</span>
                          <span className="text-xs font-black text-emerald-900">₪{cat.defaultAmount}</span>
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {cat.description && (
                      <p className="text-xs text-slate-500 font-medium leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                        {cat.description}
                      </p>
                    )}
                  </div>

                  {/* Bottom Row: Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                    {/* Active toggle */}
                    <button
                      onClick={() => handleToggleActive(cat)}
                      className={`px-3 py-1.5 rounded-lg font-black text-[11px] transition-all cursor-pointer flex items-center gap-1.5 ${
                        cat.isActive
                          ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                      title={cat.isActive ? 'انقر للتعطيل المؤقت' : 'انقر للتفعيل'}
                    >
                      <span className={`w-2 h-2 rounded-full ${cat.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      <span>{cat.isActive ? 'نشط في النظام' : 'معطل مؤقتاً'}</span>
                    </button>

                    {/* Edit and Delete Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditForm(cat)}
                        className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="تعديل بيانات البند"
                      >
                        <Edit3 size={15} />
                      </button>

                      {deleteConfirmId === cat.id ? (
                        <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-1 rounded-lg">
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="px-2 py-1 bg-rose-600 text-white rounded font-bold text-[10px] hover:bg-rose-700 cursor-pointer"
                          >
                            تأكيد الحذف
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-1.5 py-1 text-slate-500 hover:text-slate-700 text-[10px]"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(cat.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="حذف هذا البند"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Instructional / Guidance Card */}
      <div className="bg-gradient-to-br from-amber-50/60 via-indigo-50/40 to-slate-50 rounded-[2rem] p-6 border border-amber-200/80 space-y-3">
        <div className="flex items-center gap-2.5 text-amber-950 font-black text-sm">
          <Info size={18} className="text-amber-600 shrink-0" />
          <span>كيف تعمل التصنيفات المالية في نظام الأكاديمية؟</span>
        </div>
        <ul className="text-xs text-slate-700 font-semibold space-y-2 list-disc list-inside leading-relaxed pr-2">
          <li>
            <strong>عند إيداع الأرصدة (شؤون الطلاب):</strong> تظهر هذه البنود في نموذج شحن رصيد الطالب كأزرار سريعة وقائمة منسدلة؛ وعند اختيارها يتم تعيين الخدمة والمبلغ المقترح تلقائياً وربطها بسند القبض المعتمد.
          </li>
          <li>
            <strong>عند تسجيل الحصص (سجل الحصص):</strong> تظهر التصنيفات كبند مالي مخصص للحصة، مما يسمح بتوثيق الحصة كـ (رسوم كتب، اشتراك شهري، خدمة استشارية، إلخ) مع تطبيق التكلفة المقترحة مباشرة.
          </li>
          <li>
            <strong>في كشوف الحساب وسجلات التدقيق:</strong> يتم تمييز كل حركة مالية ببطاقة البند المعتمد، مما يسهل المراجعة المحاسبية وإعداد التقارير الدورية للمدير العام.
          </li>
        </ul>
      </div>

      {/* Confirmation Modal for Restoring Defaults */}
      {resetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 text-right">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-2xl"
          >
            <div className="flex items-center gap-3 text-amber-600">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
                <RotateCcw size={22} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">استعادة التصنيفات الافتراضية</h4>
                <p className="text-xs text-slate-500 font-bold mt-0.5">إعادة ضبط قائمة الرسوم والخدمات</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 font-medium leading-relaxed">
              سيتم استبدال التصنيفات المالية الحالية بالبنود القياسية المعتمدة للأكاديمية (رسوم كتب وملازم، اشتراكات شهرية، خدمات إضافية، شحن محفظة، رسوم اختبارات، حصة تدريسية). هل أنت متأكد من الاستمرار؟
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResetConfirmOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-black text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleRestoreDefaults}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 text-xs font-black cursor-pointer shadow-md"
              >
                تأكيد الاستعادة
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default FinancialCategoriesManager;
