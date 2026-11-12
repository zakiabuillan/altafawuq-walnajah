import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  GraduationCap, 
  BookOpenCheck, 
  Activity, 
  CheckCircle2, 
  Lightbulb, 
  Eye, 
  RotateCcw,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface DirectorTourStep {
  id: 'students' | 'teachers' | 'sessions';
  targetSelector: string;
  tabKey: 'students' | 'teachers' | 'sessions';
  badge: string;
  title: string;
  subtitle: string;
  accentColor: {
    name: string;
    border: string;
    bg: string;
    text: string;
    badgeBg: string;
    ring: string;
    glow: string;
    dot: string;
    gradient: string;
  };
  icon: React.ReactNode;
  summary: string;
  features: { title: string; desc: string }[];
  proTip: string;
}

interface DirectorTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: 'students' | 'teachers' | 'sessions') => void;
  currentTab?: string;
}

const TOUR_STORAGE_KEY = 'academy_director_tour_completed';

export const DirectorTour: React.FC<DirectorTourProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  currentTab
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(true);
  const [isCompletedSuccess, setIsCompletedSuccess] = useState(false);

  const steps: DirectorTourStep[] = [
    {
      id: 'students',
      targetSelector: '#director-tour-students',
      tabKey: 'students',
      badge: 'الخطوة 1 من 3 • قسم الطلاب',
      title: 'شؤون وسجلات الطلاب',
      subtitle: 'المركز الرئيسي لإدارة الحسابات الأكاديمية والمالية للطلاب',
      accentColor: {
        name: 'teal',
        border: 'border-teal-500/40',
        bg: 'bg-teal-950/90',
        text: 'text-teal-300',
        badgeBg: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
        ring: 'ring-teal-400',
        glow: 'shadow-[0_0_35px_rgba(20,184,166,0.45)]',
        dot: 'bg-teal-400',
        gradient: 'from-teal-500 to-emerald-600'
      },
      icon: <GraduationCap size={24} className="text-teal-300" />,
      summary: 'هنا تجد قاعدة بيانات الطلاب المتكاملة لمتابعة سير دراستهم وأرصدة حصصهم.',
      features: [
        {
          title: 'متابعة الأرصدة والاشتراكات',
          desc: 'الاطلاع الفوري على الحصص المتبقية والمستهلكة وتجديد الباقات بنقرة واحدة.'
        },
        {
          title: 'إضافة وتعيين الطلاب',
          desc: 'تسجيل الطلاب الجدد، وتحديد صفوفهم، وإسنادهم لمعلميهم المعتمدين.'
        },
        {
          title: 'بيانات الاتصال وأولياء الأمور',
          desc: 'سجلات مباشرة للتواصل مع أولياء الأمور وتدوين الملاحظات التقييمية.'
        }
      ],
      proTip: '💡 يمكنك البحث عن أي طالب بالاسم أو رقم الهاتف وتصدير كشوفات الطلاب فورياً.'
    },
    {
      id: 'teachers',
      targetSelector: '#director-tour-teachers',
      tabKey: 'teachers',
      badge: 'الخطوة 2 من 3 • قسم المعلمين',
      title: 'شؤون وإدارة الكادر التعليمي',
      subtitle: 'متابعة المعلمين، تخصصاتهم، ومستوى إنجاز الحصص التعليمية',
      accentColor: {
        name: 'sky',
        border: 'border-sky-500/40',
        bg: 'bg-sky-950/90',
        text: 'text-sky-300',
        badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
        ring: 'ring-sky-400',
        glow: 'shadow-[0_0_35px_rgba(14,165,233,0.45)]',
        dot: 'bg-sky-400',
        gradient: 'from-sky-500 to-indigo-600'
      },
      icon: <BookOpenCheck size={24} className="text-sky-300" />,
      summary: 'إدارة شاملة لجميع معلمي الأكاديمية وصلاحياتهم والصفوف الموكلة إليهم.',
      features: [
        {
          title: 'إدارة بيانات المعلمين والتخصصات',
          desc: 'تنظيم المعلمين حسب المواد (رياضيات، كيمياء، أحياء، لغات) وبيانات الاتصال.'
        },
        {
          title: 'توزيع وتعيين الطلاب',
          desc: 'ربط الطلاب بمعلميهم المحددين لمتابعة الحصص الخاصة والمشتركة بكل يسر.'
        },
        {
          title: 'متابعة إنجاز الحصص الشهري',
          desc: 'إحصائيات دقيقة عن عدد الحصص المنفذة لكل معلم لسهولة المحاسبة والتقييم.'
        }
      ],
      proTip: '💡 يمكنك تعيين أكثر من معلم للطالب الواحد بحسب مواده الدراسية المختلفة.'
    },
    {
      id: 'sessions',
      targetSelector: '#director-tour-sessions',
      tabKey: 'sessions',
      badge: 'الخطوة 3 من 3 • قسم رصد الحصص',
      title: 'رصد واعتماد الحصص الفردية',
      subtitle: 'المحرك الأساسي لتسجيل الدروس اليومية واقتطاع الأرصدة بدقة فائقة',
      accentColor: {
        name: 'emerald',
        border: 'border-emerald-500/40',
        bg: 'bg-emerald-950/90',
        text: 'text-emerald-300',
        badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
        ring: 'ring-emerald-400',
        glow: 'shadow-[0_0_35px_rgba(16,185,129,0.45)]',
        dot: 'bg-emerald-400',
        gradient: 'from-emerald-500 to-teal-600'
      },
      icon: <Activity size={24} className="text-emerald-300" />,
      summary: 'القلب النابض للعملية التعليمية؛ لتوثيق كل حصة تعليمية فور انتهائها وتدقيقها.',
      features: [
        {
          title: 'رصد الحصص اليومية',
          desc: 'تسجيل تاريخ الحصة، موضوع الدرس، الملاحظات التوجيهية، ومدتها الزمنية.'
        },
        {
          title: 'الاعتماد وخصم الأرصدة تلقائياً',
          desc: 'بمجرد اعتماد الحصة يخصم النظام الحصة من رصيد الطالب ويحدّث سجل المعلم.'
        },
        {
          title: 'سجل تدقيق شفاف (Audit Log)',
          desc: 'توثيق كامل لتوقيت التسجيل ومن قام باعتماد الحصة لمنع أي تكرار أو التباس.'
        }
      ],
      proTip: '💡 تظهر شارة برتقالية منبهة عند وجود حصص جديدة بانتظار اعتماد المدير.'
    }
  ];

  const currentStep = steps[currentStepIndex];

  // Update position based on the targeted DOM element
  const updateTargetPosition = useCallback(() => {
    if (!isOpen) return;
    const targetElement = document.querySelector(currentStep.targetSelector);
    if (targetElement) {
      // Ensure the target element is visible in the viewport
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      const rect = targetElement.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep.targetSelector]);

  // Navigate to corresponding tab automatically on step change
  useEffect(() => {
    if (!isOpen) return;
    onNavigateTab(currentStep.tabKey);
    // Give time for layout update then recalculate target rect
    const timer = setTimeout(() => {
      updateTargetPosition();
    }, 120);

    const handleResizeOrScroll = () => {
      updateTargetPosition();
    };

    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [isOpen, currentStepIndex, currentStep.tabKey, onNavigateTab, updateTargetPosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleFinishTour();
      } else if (e.key === 'ArrowLeft') {
        // Arabic RTL: Left means Next
        if (currentStepIndex < steps.length - 1) {
          handleNext();
        } else {
          handleFinishTour();
        }
      } else if (e.key === 'ArrowRight') {
        // Arabic RTL: Right means Previous
        if (currentStepIndex > 0) {
          handlePrev();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, steps.length]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleFinishTour();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleFinishTour = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem(TOUR_STORAGE_KEY, 'true');
      } catch {
        // ignore
      }
    }
    setIsCompletedSuccess(true);
    setTimeout(() => {
      setIsCompletedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleRestartTour = () => {
    setCurrentStepIndex(0);
    setIsCompletedSuccess(false);
  };

  if (!isOpen) return null;

  // Calculate bubble position relative to highlighted target
  const getBubbleStyle = () => {
    if (!targetRect) {
      // Fallback center modal if element not found or measuring
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed' as const,
        maxWidth: '540px',
        width: 'calc(100vw - 32px)'
      };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const bubbleWidth = Math.min(540, viewportWidth - 32);

    // Prefer showing below target tab bar
    let top = targetRect.bottom + 16;
    let arrowPosition: 'top' | 'bottom' = 'top';

    // If bottom overflow, place above target
    if (top + 460 > viewportHeight && targetRect.top > 480) {
      top = Math.max(16, targetRect.top - 470);
      arrowPosition = 'bottom';
    }

    // Center horizontally relative to the target element, constrained to viewport
    const targetCenterX = targetRect.left + targetRect.width / 2;
    let left = targetCenterX - bubbleWidth / 2;

    if (left < 16) left = 16;
    if (left + bubbleWidth > viewportWidth - 16) {
      left = viewportWidth - bubbleWidth - 16;
    }

    return {
      top: `${Math.max(16, Math.min(top, viewportHeight - 480))}px`,
      left: `${left}px`,
      position: 'fixed' as const,
      width: `${bubbleWidth}px`,
      arrowPosition,
      arrowLeft: `${Math.max(24, Math.min(bubbleWidth - 24, targetCenterX - left))}px`
    };
  };

  const bubblePosition = getBubbleStyle();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans select-none" dir="rtl" id="director-onboarding-tour-root">
      {/* Dimmed Dark Backdrop with Subtle Grid */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-all"
        onClick={handleFinishTour}
      />

      {/* Target Element Spotlight Cutout Ring */}
      {targetRect && (
        <motion.div
          key={`spotlight-${currentStep.id}`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className={`fixed pointer-events-none z-50 rounded-2xl ring-4 ${currentStep.accentColor.ring} ${currentStep.accentColor.glow} transition-all duration-300`}
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8
          }}
        >
          {/* Animated corner pulses */}
          <span className={`absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full ${currentStep.accentColor.dot} animate-ping opacity-75`} />
          <span className={`absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full ${currentStep.accentColor.dot}`} />
        </motion.div>
      )}

      {/* Completion Toast Notification */}
      <AnimatePresence>
        {isCompletedSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-slate-900/95 border-2 border-emerald-500 text-white px-8 py-6 rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.5)] text-center flex flex-col items-center gap-3 backdrop-blur-md"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400">
              <Check size={36} strokeWidth={3} className="animate-bounce" />
            </div>
            <h3 className="text-xl font-black text-emerald-300">اكتملت الجولة التعليمية بنجاح! 🎓</h3>
            <p className="text-sm text-slate-300 max-w-sm">
              لوحة التحكم جاهزة لاستقبال مهامك الإدارية. يمكنك إعادة تشغيل هذه الجولة في أي وقت عبر زر المساعدة أعلى الشاشة.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Instructional Guided Bubble (الفقاعة الإرشادية) */}
      {!isCompletedSuccess && (
        <motion.div
          key={`tour-bubble-${currentStep.id}`}
          initial={{ opacity: 0, y: 15, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            top: bubblePosition.top,
            left: bubblePosition.left,
            position: bubblePosition.position,
            width: bubblePosition.width
          }}
          className="z-50 bg-slate-900/98 border border-slate-700/80 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-xl overflow-hidden text-right flex flex-col"
          id="director-tour-bubble"
        >
          {/* Top Decorative Pointer Arrow Tail */}
          {targetRect && bubblePosition.arrowPosition === 'top' && (
            <div
              className="absolute -top-2 w-4 h-4 bg-slate-900 border-t border-r border-slate-700/80 rotate-[-45deg]"
              style={{ left: bubblePosition.arrowLeft }}
            />
          )}

          {/* Header Banner */}
          <div className="p-5 pb-3.5 border-b border-slate-800/80 relative bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900">
            <div className="flex items-center justify-between gap-3">
              {/* Step Badge */}
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${currentStep.accentColor.badgeBg}`}>
                  <Sparkles size={13} className="animate-spin-slow" />
                  <span>{currentStep.badge}</span>
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  ({currentStepIndex + 1} من {steps.length})
                </span>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleFinishTour}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                title="إغلاق الجولة (Esc)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Title & Icon Header */}
            <div className="flex items-center gap-3.5 mt-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${currentStep.accentColor.border} ${currentStep.accentColor.bg} shadow-md`}>
                {currentStep.icon}
              </div>
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">
                  {currentStep.title}
                </h3>
                <p className="text-xs text-slate-300 font-bold mt-0.5">
                  {currentStep.subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Bubble Body Content */}
          <div className="p-5 space-y-4 max-h-[58vh] overflow-y-auto no-scrollbar">
            {/* Quick Summary */}
            <p className="text-xs text-slate-300 leading-relaxed font-medium bg-slate-800/40 p-3 rounded-xl border border-slate-800">
              {currentStep.summary}
            </p>

            {/* Key Functional Features list */}
            <div className="space-y-2.5">
              <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Eye size={13} className="text-slate-400" />
                <span>أبرز مهام وإمكانات هذا القسم:</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {currentStep.features.map((feature, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/60 border border-slate-750/70 hover:border-slate-700 transition-colors"
                  >
                    <div className="mt-0.5 shrink-0">
                      <CheckCircle2 size={16} className={currentStep.accentColor.text} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-100">
                        {feature.title}
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-normal mt-0.5 font-medium">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro-Tip Box */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs font-bold leading-relaxed">
              <Lightbulb size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <span>{currentStep.proTip}</span>
            </div>
          </div>

          {/* Footer Controls & Navigation */}
          <div className="p-4 bg-slate-950/70 border-t border-slate-800/90 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              {/* Step indicator dots */}
              <div className="flex items-center gap-1.5">
                {steps.map((step, idx) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setCurrentStepIndex(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      idx === currentStepIndex 
                        ? `w-6 ${step.accentColor.dot}` 
                        : 'w-2 bg-slate-700 hover:bg-slate-600'
                    }`}
                    title={step.title}
                  />
                ))}
              </div>

              {/* Navigation Action Buttons */}
              <div className="flex items-center gap-2">
                {currentStepIndex > 0 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer border border-slate-700/60"
                  >
                    <ChevronRight size={15} />
                    <span>السابق</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleNext}
                  className={`px-4 py-2 bg-gradient-to-r ${currentStep.accentColor.gradient} hover:opacity-95 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98]`}
                >
                  <span>
                    {currentStepIndex === steps.length - 1 ? 'إنهاء واستكشاف اللوحة' : 'التالي'}
                  </span>
                  {currentStepIndex === steps.length - 1 ? (
                    <Check size={15} strokeWidth={2.5} />
                  ) : (
                    <ChevronLeft size={15} />
                  )}
                </button>
              </div>
            </div>

            {/* Bottom Row: Don't show again toggle & Skip Tour button */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-850 text-[11px] text-slate-400">
              <label className="flex items-center gap-2 cursor-pointer hover:text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-teal-500 focus:ring-teal-500/20 w-3.5 h-3.5 cursor-pointer"
                />
                <span>عدم إظهار هذه الجولة تلقائياً في المرات القادمة</span>
              </label>

              <button
                type="button"
                onClick={handleFinishTour}
                className="text-slate-400 hover:text-slate-200 font-bold transition-colors cursor-pointer"
              >
                تخطي الجولة
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DirectorTour;
