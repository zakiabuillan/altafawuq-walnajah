import React from 'react';
import { 
  BookOpen, 
  Play, 
  Award, 
  CheckCircle2, 
  UploadCloud, 
  ArrowLeft, 
  Sparkles, 
  Clock, 
  Layers, 
  FlaskConical, 
  Zap, 
  CheckSquare, 
  Users,
  Compass
} from 'lucide-react';
import { CurriculumData, StudentProgress } from './types';

interface HomePageProps {
  curriculum: CurriculumData;
  progress: StudentProgress;
  onStartLearning: () => void;
  onOpenReview: () => void;
  onOpenExam: () => void;
  onOpenUploadPdf: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  curriculum,
  progress,
  onStartLearning,
  onOpenReview,
  onOpenExam,
  onOpenUploadPdf
}) => {
  // Calculate completion percentage:
  // Units read: up to 40%
  // Review questions: up to 30%
  // Final exam: 30%
  const totalUnits = Math.max(curriculum.learningUnits.length, 1);
  const unitsRatio = Math.min((progress.unitsRead.length / totalUnits), 1);

  const totalRevQuestions = Math.max(curriculum.reviewQuestions.length, 1);
  const revAnsweredCount = Object.keys(progress.reviewQuestionsAnswered).length;
  const revRatio = Math.min((revAnsweredCount / totalRevQuestions), 1);

  const examRatio = progress.examCompleted ? 1 : 0;

  const totalProgressPercent = Math.round((unitsRatio * 40) + (revRatio * 30) + (examRatio * 30));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Edraak-Inspired Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-900 text-white shadow-xl border border-emerald-800/40 p-6 md:p-12">
        <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3"></div>

        <div className="relative z-10 max-w-3xl">
          {/* Tag & Meta */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Sparkles size={13} />
              مساق تفاعلي متكامل • بيولوجيا
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-800/60 text-emerald-200">
              <Compass size={13} />
              مستوحى من تصميم منصة إدراك (Edraak)
            </span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight font-serif mb-4 leading-tight">
            {curriculum.title}
          </h1>

          <p className="text-base md:text-lg text-emerald-100/90 leading-relaxed mb-6 font-normal">
            {curriculum.introduction}
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={onStartLearning}
              className="bg-amber-500 hover:bg-amber-600 text-emerald-950 font-black px-7 py-3.5 rounded-xl text-sm md:text-base flex items-center gap-2.5 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <Play size={18} className="fill-emerald-950" />
              <span>ابدأ التعلم الآن</span>
            </button>

            <button
              onClick={onOpenReview}
              className="bg-emerald-900/80 hover:bg-emerald-800 text-white font-bold px-6 py-3.5 rounded-xl text-sm md:text-base border border-emerald-700/50 flex items-center gap-2 transition-all cursor-pointer"
            >
              <CheckSquare size={18} className="text-amber-400" />
              <span>المراجعة والتدريب (4 أنواع أسئلة)</span>
            </button>

            <button
              onClick={onOpenUploadPdf}
              className="bg-white/10 hover:bg-white/20 text-emerald-100 font-semibold px-4 py-3.5 rounded-xl text-xs md:text-sm border border-white/20 flex items-center gap-2 transition-all cursor-pointer"
              title="رفع ملف PDF جديد لاستخراج المنهج آلياً"
            >
              <UploadCloud size={16} className="text-amber-300" />
              <span>رفع ملف PDF للدرس</span>
            </button>
          </div>
        </div>

        {/* Global Progress Bar Card inside Hero */}
        <div className="mt-8 pt-6 border-t border-emerald-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-black text-sm">
              {totalProgressPercent}%
            </div>
            <div>
              <p className="text-xs text-emerald-300 font-bold">شريط تقدم إنجاز الطالب في المساق</p>
              <p className="text-[11px] text-emerald-200/70">
                {progress.unitsRead.length} من {totalUnits} وحدات شُرحت • {revAnsweredCount} أسئلة تدريب • {progress.examCompleted ? 'الاختبار منجز ✅' : 'الاختبار بانتظارك'}
              </p>
            </div>
          </div>

          <div className="w-full md:w-72 bg-emerald-950/80 rounded-full h-3 p-0.5 border border-emerald-700/40">
            <div
              className="bg-gradient-to-r from-amber-400 to-amber-300 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(totalProgressPercent, 3)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Course Highlights & Features Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
            <BookOpen size={20} />
          </div>
          <div>
            <span className="text-xs text-stone-500 block">وحدات الشرح</span>
            <span className="text-base font-extrabold text-stone-900">{curriculum.learningUnits.length} وحدات تفصيلية</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <CheckSquare size={20} />
          </div>
          <div>
            <span className="text-xs text-stone-500 block">أنواع الأسئلة</span>
            <span className="text-base font-extrabold text-stone-900">4 أنماط تدريبية</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-xs text-stone-500 block">الاختبار النهائي</span>
            <span className="text-base font-extrabold text-stone-900">محدد بزمن 20 دقيقة</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
            <Award size={20} />
          </div>
          <div>
            <span className="text-xs text-stone-500 block">شهادة الإنجاز</span>
            <span className="text-base font-extrabold text-stone-900">عند الحصول على 80%+</span>
          </div>
        </div>
      </div>

      {/* Curriculum Units Outline */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 pb-4 border-b border-stone-100">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-stone-900 font-serif">
              مخطط وحدات الدرس (Curriculum Units)
            </h2>
            <p className="text-xs md:text-sm text-stone-500 mt-0.5">
              مستخرجة ومنظمة بدقة وفق منهج البيولوجيا العلمي ومعايير البجروت
            </p>
          </div>

          <button
            onClick={onStartLearning}
            className="text-xs md:text-sm text-emerald-800 hover:text-emerald-950 font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>استعراض كل الوحدات</span>
            <ArrowLeft size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {curriculum.learningUnits.map((unit, idx) => {
            const isRead = progress.unitsRead.includes(unit.id);
            return (
              <div
                key={unit.id}
                onClick={onStartLearning}
                className="group p-5 rounded-2xl border border-stone-200 hover:border-emerald-700/60 hover:shadow-md transition-all cursor-pointer bg-stone-50/50 hover:bg-white flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-900">
                      الوحدة {idx + 1}
                    </span>
                    {isRead ? (
                      <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={12} />
                        تمت القراءة
                      </span>
                    ) : (
                      <span className="text-[11px] text-stone-400">لم تكتمل بعد</span>
                    )}
                  </div>
                  <h3 className="font-bold text-stone-900 text-base group-hover:text-emerald-900 transition-colors mb-1.5">
                    {unit.title}
                  </h3>
                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {unit.summary}
                  </p>
                </div>

                {unit.chemicalEquation && (
                  <div className="mt-3 pt-2.5 border-t border-stone-200/60 text-[11px] font-mono text-emerald-900 bg-emerald-50/50 px-2.5 py-1 rounded-lg">
                    {unit.chemicalEquation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Access Pathways */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Practice Module Banner */}
        <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-200/80 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center mb-4 shadow-md shadow-amber-500/20">
              <CheckSquare size={24} />
            </div>
            <h3 className="text-xl font-bold text-amber-950 font-serif mb-2">
              المراجعة والتدريب التفاعلي
            </h3>
            <p className="text-xs md:text-sm text-amber-900/80 leading-relaxed mb-4">
              بنك أسئلة ذكي يحتوي على 4 أنواع: صح أو خطأ، اختيار من متعدد، أكمل الفراغ، وأسئلة قصيرة. مع ميزة الترتيب العشوائي للأسئلة والتغذية الراجعة العلمية الفورية.
            </p>
          </div>
          <button
            onClick={onOpenReview}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <span>بدء التدريب والمراجعة</span>
            <ArrowLeft size={16} />
          </button>
        </div>

        {/* Final Exam Banner */}
        <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-emerald-900/10 to-emerald-950/5 border border-emerald-300/60 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-900 text-white flex items-center justify-center mb-4 shadow-md shadow-emerald-900/20">
              <Award size={24} className="text-amber-300" />
            </div>
            <h3 className="text-xl font-bold text-emerald-950 font-serif mb-2">
              الاختبار النهائي الشامل والشهادة
            </h3>
            <p className="text-xs md:text-sm text-emerald-900/80 leading-relaxed mb-4">
              اختبار مقيد بزمن ومصحح تلقائياً لقياس مستوى الفهم. يتطلب تسجيل الاسم والبريد الإلكتروني، ويمنح شهادة إنجاز معتمدة عند تحقيق 80% فأعلى.
            </p>
          </div>
          <button
            onClick={onOpenExam}
            className="w-full bg-emerald-900 hover:bg-emerald-950 text-white font-bold py-3 rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <span>دخول الاختبار النهائي ⏱️</span>
            <ArrowLeft size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
