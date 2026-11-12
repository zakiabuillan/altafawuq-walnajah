import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Keyboard,
  X,
  Command,
  Save,
  PlusCircle,
  Search,
  Users,
  GraduationCap,
  BookOpenCheck,
  Clock,
  Sparkles,
  BookOpen,
  BarChart3,
  Archive,
  Settings,
  CornerDownLeft,
  Check
} from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'global' | 'navigation' | 'students' | 'sessions'>('all');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcutGroups = [
    {
      id: 'global',
      title: 'الإجراءات العامة السريعة',
      badge: 'العمليات الأساسية',
      color: 'blue',
      items: [
        {
          keys: [modKey, 'S'],
          title: 'حفظ وتأكيد البيانات',
          description: 'حفظ الحصة الحالية، استمارة الطالب، المعلم، أو السند المالي المفتوح فوراً دون استخدام الفأرة.',
          tag: 'حفظ فوري'
        },
        {
          keys: [modKey, 'N'],
          title: 'إنشاء / تسجيل عنصر جديد',
          description: 'فتح نموذج تسجيل حصة جديدة، إضافة طالب، أو إنشاء سجل جديد في التبويب النشط.',
          tag: 'إنشاء سريع'
        },
        {
          keys: [modKey, 'K'],
          altKeys: ['/'],
          title: 'شريط البحث العلوي العالمي (Global Search)',
          description: 'فتح نافذة البحث السريع الشامل للبحث عن الطلاب والمعلمين والدورات من أي مكان في النظام.',
          tag: 'بحث عالمي'
        },
        {
          keys: [modKey, 'F'],
          title: 'البحث في الصفحة الحالية',
          description: 'نقل مؤشر الكتابة تلقائياً إلى حقل البحث في التبويب النشط.',
          tag: 'بحث محلي'
        },
        {
          keys: [modKey, '/'],
          altKeys: ['?'],
          title: 'دليل اختصارات المفاتيح',
          description: 'فتح نافذة الدليل الشامل لاختصارات لوحة المفاتيح في أي وقت.',
          tag: 'مساعدة'
        },
        {
          keys: ['Esc'],
          title: 'إغلاق النوافذ والقوائم',
          description: 'إغلاق النوافذ المنبثقة، قوائم المعاينة، أو الخروج من وضع التعديل.',
          tag: 'إلغاء / إغلاق'
        }
      ]
    },
    {
      id: 'sessions',
      title: 'اختصارات تسجيل وإدارة الحصص',
      badge: 'تسريع الرصد',
      color: 'emerald',
      items: [
        {
          keys: [modKey, 'S'],
          title: 'اعتماد ورصد الحصة',
          description: 'إرسال نموذج تسجيل الحصة وحفظها مع التحقق المالي التلقائي لرصيد الطالب.',
          tag: 'رصد الحصة'
        },
        {
          keys: [modKey, 'N'],
          title: 'تجهيز نموذج حصة جديدة',
          description: 'تفريغ الحقول وتركيز المؤشر لاختيار المعلم والطالب وبدء رصد حصة تالية.',
          tag: 'تفريغ الحقول'
        },
        {
          keys: [modKey, 'P'],
          title: 'معاينة وطباعة التقرير',
          description: 'استخراج التقرير الشهري أو المصفّى وتجهيز الطباعة الرسمية للبيانات المحددة.',
          tag: 'طباعة فورية'
        }
      ]
    },
    {
      id: 'students',
      title: 'اختصارات إدارة وشؤون الطلاب',
      badge: 'إدارة الطلاب',
      color: 'teal',
      items: [
        {
          keys: [modKey, 'N'],
          title: 'إضافة طالب جديد',
          description: 'فتح نافذة التسجيل الشامل أو التسجيل السريع للطلاب وتجهيز حقل الاسم.',
          tag: 'طالب جديد'
        },
        {
          keys: [modKey, 'S'],
          title: 'حفظ بطاقة الطالب / الشحن المالي',
          description: 'حفظ بيانات الطالب الجديد أو اعتماد وتأكيد سند القبض وشحن الرصيد.',
          tag: 'حفظ الطالب'
        },
        {
          keys: [modKey, 'Shift', 'F'],
          title: 'التبديل بين معايير التصفية',
          description: 'إظهار وإخفاء أدوات الفرز المتقدم والتصفية حسب المرحلة والمعلم والأرصدة.',
          tag: 'تصفية ذكية'
        }
      ]
    },
    {
      id: 'navigation',
      title: 'التنقل المباشر بين أقسام لوحة الإدارة',
      badge: 'التبديل الفوري',
      color: 'purple',
      items: [
        { keys: ['Alt', '1'], title: 'الحصص التجريبية', description: 'اللقاءات التمهيدية وطلبات التنسيب الجديدة', icon: Sparkles },
        { keys: ['Alt', '2'], title: 'شؤون الطلاب', description: 'إدارة الطلاب، الحسابات، الأرصدة وسجل الحركات', icon: GraduationCap },
        { keys: ['Alt', '3'], title: 'شؤون المعلمين', description: 'الكادر التدريسي، الرواتب والمهام الموكلة', icon: BookOpenCheck },
        { keys: ['Alt', '4'], title: 'تسجيل الحصص', description: 'منظومة رصد واعتماد الحصص الفردية والتقييمات', icon: Clock },
        { keys: ['Alt', '5'], title: 'الدورات الجماعية', description: 'تجهيز الشُعب والدراسة المشتركة والأفواج', icon: Users },
        { keys: ['Alt', '6'], title: 'المكتبة والسبورة', description: 'السبورة التفاعلية وفهرس الكتب والملفات', icon: BookOpen },
        { keys: ['Alt', '7'], title: 'التقارير والمخططات', description: 'التحليلات البيانية، الإحصائيات والأرباح', icon: BarChart3 },
        { keys: ['Alt', '8'], title: 'سجل الأرشفة', description: 'الحصص المؤرشفة والبيانات السابقة', icon: Archive },
        { keys: ['Alt', '9'], title: 'الإعدادات العامة', description: 'الأسعار الافتراضية وخيارات النظام والنسخ الاحتياطي', icon: Settings },
        { keys: [modKey, 'Shift', 'W'], title: 'اللوح والسبورة الذكية', description: 'فتح شاشة اللوح الذكي التفاعلي (Smart Whiteboard) فوراً للمدير للشرح والكتابة', icon: Sparkles },
        { keys: ['Alt', '0'], title: 'اللوح الذكي (تبويب 0)', description: 'التبديل المباشر إلى قسم اللوح الذكي التفاعلي', icon: Sparkles }
      ]
    }
  ];

  const filteredGroups = activeCategory === 'all' 
    ? shortcutGroups 
    : shortcutGroups.filter(g => g.id === activeCategory);

  const handleTestKey = (keyLabel: string) => {
    setCopiedKey(keyLabel);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden text-right flex flex-col max-h-[90vh]"
          dir="rtl"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-inner">
                <Keyboard size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-white">دليل اختصارات لوحة المفاتيح</h3>
                  <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                    إنتاجية قصوى ⚡
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-bold mt-1">
                  استخدم الاختصارات لتسريع تسجيل الحصص وإدارة الطلاب دون لمس الفأرة
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer border border-slate-700/50"
              title="إغلاق (Esc)"
            >
              <X size={18} />
            </button>
          </div>

          {/* Category Filter Chips */}
          <div className="px-6 py-3 border-b border-slate-800/80 bg-slate-950/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              كافة الاختصارات
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('global')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'global'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              الإجراءات العامة
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('sessions')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'sessions'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-400'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              تسجيل الحصص
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('students')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'students'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 ring-1 ring-teal-400'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              شؤون الطلاب
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory('navigation')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                activeCategory === 'navigation'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              التنقل بالأقسام (Alt+1..9)
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
            {filteredGroups.map(group => (
              <div key={group.id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    <h4 className="text-sm font-black text-slate-200">{group.title}</h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700/60">
                    {group.badge}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.items.map((item, idx) => {
                    const IconComponent = (item as any).icon;
                    return (
                      <div
                        key={idx}
                        className="bg-slate-850/90 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/40 transition-all rounded-2xl p-3.5 flex flex-col justify-between group"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            {IconComponent && (
                              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                                <IconComponent size={14} />
                              </div>
                            )}
                            <div>
                              <div className="text-xs font-black text-white group-hover:text-indigo-300 transition-colors">
                                {item.title}
                              </div>
                              {item.tag && (
                                <span className="text-[9px] font-bold text-slate-400">
                                  {item.tag}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Key badges */}
                          <div className="flex items-center gap-1 shrink-0" dir="ltr">
                            {item.keys.map((k, kIdx) => (
                              <React.Fragment key={kIdx}>
                                {kIdx > 0 && <span className="text-slate-500 text-xs font-bold">+</span>}
                                <kbd className="px-2 py-1 bg-slate-900 text-slate-200 border border-slate-600/80 rounded-lg text-xs font-mono font-bold shadow-sm ring-1 ring-slate-800">
                                  {k}
                                </kbd>
                              </React.Fragment>
                            ))}
                            {item.altKeys && (
                              <>
                                <span className="text-slate-500 text-[10px] font-bold mx-1">أو</span>
                                {item.altKeys.map((ak, akIdx) => (
                                  <kbd key={akIdx} className="px-2 py-1 bg-slate-900 text-slate-200 border border-slate-600/80 rounded-lg text-xs font-mono font-bold shadow-sm">
                                    {ak}
                                  </kbd>
                                ))}
                              </>
                            )}
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1">
                          {item.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Info */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs font-bold text-slate-400">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-black">💡 تلميح:</span>
              <span>يمكنك الضغط على <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-200 rounded text-[10px] font-mono border border-slate-700">Ctrl + S</kbd> أثناء وجودك في أي استمارة لتنفيذ الحفظ مباشرة.</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs transition-colors cursor-pointer shadow-md"
            >
              حسناً، فهمت
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
