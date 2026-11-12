import React, { useState } from 'react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  BookOpen, 
  CheckCircle2, 
  Award, 
  FolderOpen, 
  Bot, 
  ArrowRight,
  GraduationCap,
  FileCheck,
  Target,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OnboardingTourStep {
  id: string;
  stepNumber: number;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  highlightSection: string;
  keyPoints: { icon: React.ReactNode; title: string; desc: string }[];
  actionLabel?: string;
  actionTargetTab?: 'curriculum' | 'materials_library' | 'dashboard';
}

interface StudentOnboardingTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
  onNavigateToTab?: (tab: 'dashboard' | 'curriculum' | 'materials_library' | 'assignments' | 'classes' | 'certificates' | 'ai_tutor' | 'edraak') => void;
}

export const StudentOnboardingTourModal: React.FC<StudentOnboardingTourModalProps> = ({
  isOpen,
  onClose,
  studentName = 'الطالب المتميز',
  onNavigateToTab
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(true);

  const steps: OnboardingTourStep[] = [
    {
      id: 'welcome',
      stepNumber: 1,
      badge: 'الخطوة الأولى • مرحباً بك',
      title: `أهلاً بك يا ${studentName} في بوابتك الأكاديمية! 🎓`,
      subtitle: 'دليلك السريع للتعرف على أحدث منظومة تعليمية تفاعلية للبجروت والتفوق',
      description: 'تم تصميم بوابتك التعليمية لتمنحك وصولاً مباشراً وفورياً لجميع الحصص، المناهج المعتمدة، التدريبات التفاعلية، والاختبارات التجريبية المعتمدة من معلميك.',
      icon: <GraduationCap size={32} className="text-emerald-700" />,
      iconBg: 'bg-emerald-100/70 border-emerald-300',
      highlightSection: 'لوحة التحكم الرئيسية (Dashboard)',
      keyPoints: [
        {
          icon: <CheckCircle2 size={16} className="text-emerald-600" />,
          title: 'بيانات أكاديمية موحدة',
          desc: 'ربط مباشر بصفك الدراسي، مجموعتك التعليمية، وأرقامك الأكاديمية المعتمدة.'
        },
        {
          icon: <Target size={16} className="text-indigo-600" />,
          title: 'ملخص الأداء والتقدم',
          desc: 'شريط تتبع تقدم الوحدات، مخطط درجات الاختبارات، وبطاقة الدرس القادم.'
        },
        {
          icon: <Compass size={16} className="text-amber-600" />,
          title: 'جولة استكشافية سريعة',
          desc: 'في 4 خطوات سريعة سنشرح لك أين تجد الدروس والشروحات، وأين تتدرب على الاختبارات.'
        }
      ]
    },
    {
      id: 'lessons',
      stepNumber: 2,
      badge: 'الخطوة الثانية • أين تجد الدروس والشروحات؟ 📚',
      title: 'استكشف الدروس والشروحات عبر تبويب "المنهاج والدروس"',
      subtitle: 'كل وحدة ودرس منظم بأسلوب علمي مع مراجع المعلم المعتمدة',
      description: 'للوصول إلى أي درس: اضغط على تبويب "المنهاج والدروس (Curriculum)" في القائمة العلوية، ثم اختر المادة الدراسية (مثل البيولوجيا أو الكيمياء) ثم الوحدة المطلوبة.',
      icon: <BookOpen size={32} className="text-indigo-700" />,
      iconBg: 'bg-indigo-100/70 border-indigo-300',
      highlightSection: 'تبويب: المنهاج والدروس (Curriculum)',
      keyPoints: [
        {
          icon: <BookOpen size={16} className="text-indigo-600" />,
          title: 'شروحات علمية مدعمة بـ LaTeX',
          desc: 'شرح تفصيلي للمفاهيم مع معادلات كيميائية وفيزيائية واضحة ومصطلحات باللغة الإنجليزية.'
        },
        {
          icon: <FolderOpen size={16} className="text-emerald-600" />,
          title: 'مراجع المعلم المعتمدة',
          desc: 'ملخصات PDF وعروض PowerPoint الرسمية المدرجة أسفل كل درس مباشرة للمطالعة والتحميل.'
        },
        {
          icon: <Sparkles size={16} className="text-amber-600" />,
          title: 'بطاقة المحطة التعليمية',
          desc: 'ملخص مركّز ومحددات زمنية لكل درس لمساعدتك على تنظيم وقتك الدراسي.'
        }
      ],
      actionLabel: 'الانتقال إلى تبويب المنهاج والدروس 📚',
      actionTargetTab: 'curriculum'
    },
    {
      id: 'exams',
      stepNumber: 3,
      badge: 'الخطوة الثالثة • أين تجد التدريبات والاختبارات؟ 📝',
      title: 'حل التدريبات الفورية والاختبارات التجريبية داخل كل درس',
      subtitle: 'تصحيح آلي فوري، تفسير نموذجي للخطوات، وتوثيق مباشر لدرجاتك',
      description: 'داخل صفحة كل درس ستجد تبويبين مخصصين للتقييم: "تدريبات تفاعلية (Practice)" و "اختبار تجريبي نهائي (Final Quiz)".',
      icon: <Award size={32} className="text-amber-700" />,
      iconBg: 'bg-amber-100/70 border-amber-300',
      highlightSection: 'تبويب: التدريبات والاختبارات داخل الدرس',
      keyPoints: [
        {
          icon: <FileCheck size={16} className="text-amber-600" />,
          title: 'تدريبات تفاعلية خطوة بخطوة',
          desc: 'أسئلة اختيار من متعدد وصح وخطأ مع ميزة "طلب تلميح" وعرض الاستنتاج العلمي الفوري.'
        },
        {
          icon: <Award size={16} className="text-emerald-600" />,
          title: 'اختبارات نهائية محددة بالوقت',
          desc: 'اختبارات بنظام البجروت والتوجيهي مع عداد زمني، وحساب لنسبة النجاح وإصدار شهادة إتمام.'
        },
        {
          icon: <Target size={16} className="text-purple-600" />,
          title: 'تحديث فوري لدرجاتك في لوحة الأداء',
          desc: 'كل اختبار تجريه يتم تسجيله في مخطط درجاتك التفاعلي في لوحة التحكم الرئيسية.'
        }
      ],
      actionLabel: 'استعراض اختبارات الدروس 📝',
      actionTargetTab: 'curriculum'
    },
    {
      id: 'materials_and_ai',
      stepNumber: 4,
      badge: 'الخطوة الرابعة • مكتبة المراجع والمساعد الذكي 🤖',
      title: 'مكتبة المذكرات والمساعد الأكاديمي الملتزم بمراجع معلمك',
      subtitle: 'قارئ ملفات PDF الذكي + مساعد AI للإجابة عن أسئلتك من مراجع المنهاج حصراً',
      description: 'يمكنك فتح أي ملف دراسي عبر قارئ PDF المدمج وإضافة ملاحظاتك الخاصة، أو سؤال المساعد الذكي الذي يشرح لك الدروس استناداً فقط لمراجع معلمك المعتمدة.',
      icon: <Bot size={32} className="text-teal-700" />,
      iconBg: 'bg-teal-100/70 border-teal-300',
      highlightSection: 'تبويب: مكتبة المذكرات والمساعد الذكي',
      keyPoints: [
        {
          icon: <FolderOpen size={16} className="text-teal-600" />,
          title: 'مكتبة المذكرات والمواد التعليمية',
          desc: 'تصفح وتنزيل كل الملازم والامتحانات السابقة المصنفة حسب المادة والصف.'
        },
        {
          icon: <Bot size={16} className="text-indigo-600" />,
          title: 'مساعد ذكي ملتزم بنسبة 100%',
          desc: 'إجابات علمية دقيقة مستخرجة حصرياً من مراجع معلمك دون تخمين أو مصادر خارجية.'
        },
        {
          icon: <Sparkles size={16} className="text-amber-600" />,
          title: 'جاهز للانطلاق والتفوق!',
          desc: 'يمكنك فتح هذه الجولة التعريفية في أي وقت بالضغط على أيقونة الجولة في أعلى الصفحة.'
        }
      ],
      actionLabel: 'استكشاف مكتبة المذكرات 📂',
      actionTargetTab: 'materials_library'
    }
  ];

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleFinish = () => {
    if (dontShowAgain) {
      try {
        localStorage.setItem('student_onboarding_tour_completed', 'true');
      } catch {
        // ignore
      }
    }
    onClose();
  };

  const handleNext = () => {
    if (isLastStep) {
      handleFinish();
    } else {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleDirectAction = (targetTab?: 'dashboard' | 'curriculum' | 'materials_library' | 'assignments' | 'classes' | 'certificates' | 'ai_tutor' | 'edraak') => {
    handleFinish();
    if (targetTab && onNavigateToTab) {
      onNavigateToTab(targetTab);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-[2rem] border border-slate-200/90 shadow-2xl w-full max-w-2xl overflow-hidden text-right flex flex-col my-auto"
      >
        
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-[#133827] via-[#1a4a34] to-[#0D365A] text-white p-6 sm:p-7 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl bg-white shadow-md border ${currentStep.iconBg}`}>
                {currentStep.icon}
              </div>
              <div>
                <span className="text-[11px] font-black tracking-wide text-amber-300 px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 inline-block mb-1">
                  {currentStep.badge}
                </span>
                <h2 className="text-base sm:text-xl font-black leading-tight text-white">
                  جولة تعريفية في بوابة الطالب 🧭
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="إغلاق الجولة"
            >
              <X size={18} />
            </button>
          </div>

          {/* Progress Bar & Steps Counter */}
          <div className="mt-5 space-y-2 relative z-10">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-100/90">
              <span>الخطوة {currentStep.stepNumber} من {steps.length}</span>
              <span className="text-amber-300 font-mono font-black">{Math.round(((currentStepIndex + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Modal Body with Animated Step Content */}
        <div className="p-6 sm:p-8 space-y-6 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              <div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
                  {currentStep.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                  {currentStep.subtitle}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                {currentStep.description}
              </div>

              {/* Highlighting Key Features for this step */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-black text-slate-400 block">
                  أبرز المميزات وطريقة الوصول:
                </span>
                <div className="grid grid-cols-1 gap-2.5">
                  {currentStep.keyPoints.map((point, idx) => (
                    <div 
                      key={idx}
                      className="p-3 rounded-xl bg-white border border-slate-200/70 shadow-2xs flex items-start gap-3 text-right"
                    >
                      <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700 shrink-0 mt-0.5">
                        {point.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 leading-none mb-1">
                          {point.title}
                        </h4>
                        <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                          {point.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Optional direct jump button */}
              {currentStep.actionLabel && (
                <button
                  type="button"
                  onClick={() => handleDirectAction(currentStep.actionTargetTab)}
                  className="w-full py-2.5 px-4 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 text-xs font-black flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>{currentStep.actionLabel}</span>
                  <ArrowRight size={14} className="rotate-180" />
                </button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 sm:p-6 bg-slate-50/90 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Don't show again toggle */}
          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-700 cursor-pointer"
            />
            <span>تم فهم الجولة، عدم إظهارها تلقائياً مرة أخرى</span>
          </label>

          {/* Nav buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ChevronRight size={15} />
                <span>السابق</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleFinish}
              className="px-3.5 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              تخطي
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-[#133827] hover:bg-[#1a4a34] text-white text-xs font-black shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <span>{isLastStep ? 'ابدأ رحلة التعلم 🚀' : 'التالي'}</span>
              {!isLastStep && <ChevronLeft size={15} />}
            </button>
          </div>
        </div>

      </motion.div>
    </div>
  );
};

export default StudentOnboardingTourModal;
