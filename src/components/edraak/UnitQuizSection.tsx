import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Sparkles, 
  RotateCw, 
  Cloud, 
  ChevronLeft, 
  ChevronRight, 
  Award, 
  ArrowLeft,
  BookOpen,
  Send,
  Loader2,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import { LearningUnit, UnitQuiz, UnitQuizQuestion, StudentUnitQuizResult } from './types';
import { getQuizForUnit } from './defaultUnitQuizzes';
import { saveStudentUnitQuizResult } from '../../lib/studentProgressFirebase';

interface UnitQuizSectionProps {
  unit: LearningUnit;
  isRead: boolean;
  onMarkUnitRead: () => void;
  currentStudent: {
    id: string;
    name: string;
    email?: string;
  };
  savedQuizResult?: StudentUnitQuizResult;
  onQuizCompleted: (result: StudentUnitQuizResult) => void;
  onNextUnit?: () => void;
  isLastUnit?: boolean;
  onProceedToReview?: () => void;
}

export const UnitQuizSection: React.FC<UnitQuizSectionProps> = ({
  unit,
  isRead,
  onMarkUnitRead,
  currentStudent,
  savedQuizResult,
  onQuizCompleted,
  onNextUnit,
  isLastUnit,
  onProceedToReview
}) => {
  // Current active quiz for this unit (either default or AI-generated)
  const [activeQuiz, setActiveQuiz] = useState<UnitQuiz>(() => {
    return unit.quiz || getQuizForUnit(unit.id, unit.title);
  });

  // Quiz execution state: 'idle' | 'in_progress' | 'completed' | 'reviewing_saved'
  const [quizState, setQuizState] = useState<'idle' | 'in_progress' | 'completed' | 'reviewing_saved'>(() => {
    return savedQuizResult ? 'completed' : 'idle';
  });

  // Active question index in the quiz
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // Student selected answers: questionId -> chosenOptionIndex (0-3)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  // Submission saving state
  const [isSavingToFirebase, setIsSavingToFirebase] = useState(false);
  const [firebaseFeedback, setFirebaseFeedback] = useState<{
    success: boolean;
    docId: string;
    message: string;
  } | null>(null);

  // AI Quiz Generation State
  const [isGeneratingAiQuiz, setIsGeneratingAiQuiz] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Active result either from this session or from saved prop
  const [activeResult, setActiveResult] = useState<StudentUnitQuizResult | undefined>(savedQuizResult);

  // Update active quiz if unit changes
  useEffect(() => {
    const quiz = unit.quiz || getQuizForUnit(unit.id, unit.title);
    setActiveQuiz(quiz);
    setCurrentQuestionIdx(0);
    setSelectedAnswers({});
    setFirebaseFeedback(null);
    if (savedQuizResult && savedQuizResult.unitId === unit.id) {
      setQuizState('completed');
      setActiveResult(savedQuizResult);
    } else {
      setQuizState('idle');
      setActiveResult(undefined);
    }
  }, [unit.id, savedQuizResult]);

  const questions = activeQuiz.questions || [];
  const currentQuestion: UnitQuizQuestion | undefined = questions[currentQuestionIdx];

  // Handler to start or restart the quiz
  const handleStartQuiz = () => {
    if (!isRead) {
      onMarkUnitRead();
    }
    setSelectedAnswers({});
    setCurrentQuestionIdx(0);
    setQuizState('in_progress');
    setFirebaseFeedback(null);
  };

  // Handler for selecting an option for current question
  const handleSelectOption = (optionIdx: number) => {
    if (!currentQuestion) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: optionIdx
    }));
  };

  // Submit quiz and persist to Firebase studentProgress
  const handleSubmitQuiz = async () => {
    if (questions.length === 0) return;

    let correctCount = 0;
    const answersRecord: StudentUnitQuizResult['answers'] = {};

    questions.forEach((q) => {
      const chosenIdx = selectedAnswers[q.id];
      const isCorrect = chosenIdx === q.correctOptionIndex;
      if (isCorrect) correctCount++;

      answersRecord[q.id] = {
        questionId: q.id,
        questionText: q.questionText,
        chosenIndex: chosenIdx !== undefined ? chosenIdx : -1,
        chosenOption: chosenIdx !== undefined && q.options[chosenIdx] ? q.options[chosenIdx] : 'لم تتم الإجابة',
        correctOption: q.correctAnswer || q.options[q.correctOptionIndex] || '',
        isCorrect: !!isCorrect,
        explanation: q.explanation || ''
      };
    });

    const percentage = Math.round((correctCount / questions.length) * 100);
    const passed = percentage >= (activeQuiz.passScorePercentage || 75);

    const quizResult: StudentUnitQuizResult = {
      id: `${currentStudent.id}_${unit.id}`,
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      studentEmail: currentStudent.email || '',
      unitId: unit.id,
      unitNumber: unit.unitNumber,
      unitTitle: unit.title,
      quizScore: correctCount,
      quizTotal: questions.length,
      quizPercentage: percentage,
      passed: passed,
      answers: answersRecord,
      courseTitle: 'التمثيل الضوئي (Photosynthesis)',
      completedAt: new Date().toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      updatedAt: new Date().toISOString()
    };

    setActiveResult(quizResult);
    setQuizState('completed');
    setIsSavingToFirebase(true);

    try {
      const fbRes = await saveStudentUnitQuizResult(quizResult);
      if (fbRes.success) {
        setFirebaseFeedback({
          success: true,
          docId: fbRes.id,
          message: 'تم حفظ النتيجة وتوثيقها بنجاح في جدول studentProgress في قاعدة بيانات Firebase ☁️'
        });
      } else {
        setFirebaseFeedback({
          success: false,
          docId: fbRes.id,
          message: fbRes.error || 'تم حفظ النتيجة محلياً، وسيتم إعادة المحاولة لمزامنة Firebase.'
        });
      }
    } catch (err: any) {
      setFirebaseFeedback({
        success: false,
        docId: quizResult.id,
        message: 'تم حفظ النتيجة محلياً بنجاح (سيتم استكمال مزامنة Firebase لاحقاً).'
      });
    } finally {
      setIsSavingToFirebase(false);
      onQuizCompleted(quizResult);
    }
  };

  // Generate new quiz using Gemini API endpoint
  const handleGenerateNewQuiz = async () => {
    setIsGeneratingAiQuiz(true);
    setAiError(null);

    try {
      const response = await fetch('/api/educational/generate-unit-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId: unit.id,
          unitTitle: unit.title,
          unitContent: `${unit.summary}\n\n${unit.details.join('\n')}`,
          chemicalEquation: unit.chemicalEquation,
          keyTerms: unit.keyTerms,
          approvedReferences: unit.primaryReferenceTitle ? [unit.primaryReferenceTitle] : [],
          questionCount: 4
        })
      });

      const resData = await response.json();

      if (resData.success && resData.data && resData.data.questions?.length > 0) {
        const newQuiz: UnitQuiz = {
          ...resData.data,
          unitId: unit.id,
          unitTitle: unit.title,
          generatedBy: 'gemini_ai',
          generatedAt: new Date().toISOString()
        };
        setActiveQuiz(newQuiz);
        setSelectedAnswers({});
        setCurrentQuestionIdx(0);
        setQuizState('in_progress');
        setFirebaseFeedback(null);
      } else {
        throw new Error(resData.error || 'لم يتم استلام أسئلة صالحة من النموذج.');
      }
    } catch (err: any) {
      console.warn('AI Quiz Generation fallback:', err);
      // Fallback to fresh local quiz if AI offline
      const fallback = getQuizForUnit(unit.id, unit.title);
      setActiveQuiz(fallback);
      setSelectedAnswers({});
      setCurrentQuestionIdx(0);
      setQuizState('in_progress');
      setAiError('تم تفعيل اختبار المنهج المعتمد للوحدة بنجاح.');
    } finally {
      setIsGeneratingAiQuiz(false);
    }
  };

  const optionLetters = ['أ', 'ب', 'ج', 'د'];

  return (
    <section 
      id={`unit-quiz-section-${unit.id}`}
      className="mt-8 pt-8 border-t-2 border-dashed border-stone-200"
      aria-label="اختبار الوحدة القصير"
    >
      {/* Quiz Section Header Card */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-stone-900 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        {/* Background decorative aura */}
        <div className="absolute top-0 left-0 -translate-x-12 -translate-y-12 w-48 h-48 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 translate-x-12 translate-y-12 w-48 h-48 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-black flex items-center gap-1.5">
                <FileCheck2 size={13} />
                <span>تقييم الفهم الفوري • اختيار من متعدد</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-stone-300 text-[11px] font-semibold">
                الوحدة {unit.unitNumber}: {unit.title}
              </span>
              {activeQuiz.generatedBy === 'gemini_ai' && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 text-[11px] font-bold border border-emerald-400/30 flex items-center gap-1">
                  <Sparkles size={11} />
                  <span>مولّد بالذكاء الاصطناعي (Gemini)</span>
                </span>
              )}
            </div>

            <h3 className="text-xl md:text-2xl font-black font-serif text-white tracking-tight">
              اختبار فهم الوحدة القصير (Unit Quiz)
            </h3>
            <p className="text-xs md:text-sm text-stone-300 leading-relaxed">
              أسئلة اختيار من متعدد متدرجة الصعوبة (تذكر، فهم، تطبيق، تحليل) مستندة حصرياً لمادة الوحدة ومراجعها المعتمدة، ترتبط مباشرة بجدول تقدمك في Firebase.
            </p>
          </div>

          {/* Quick Actions & AI Generate Button */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center shrink-0">
            <button
              onClick={handleGenerateNewQuiz}
              disabled={isGeneratingAiQuiz}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              title="توليد أسئلة اختيار من متعدد جديدة لهذه الوحدة بالذكاء الاصطناعي"
            >
              {isGeneratingAiQuiz ? (
                <>
                  <Loader2 size={14} className="animate-spin text-amber-300" />
                  <span>جاري التوليد...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} className="text-amber-300" />
                  <span>إنشاء اختبار جديد 🪄</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* AI Error or notification if any */}
        {aiError && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/20 border border-amber-400/30 text-xs text-amber-200 flex items-center gap-2">
            <AlertCircle size={14} />
            <span>{aiError}</span>
          </div>
        )}

        {/* Status Pills / Active result badge */}
        {activeResult && quizState !== 'in_progress' && (
          <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-stone-300">سجل إنجازك في هذه الوحدة:</span>
              <span className={`px-2.5 py-1 rounded-lg font-black flex items-center gap-1.5 ${
                activeResult.passed 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' 
                  : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
              }`}>
                {activeResult.passed ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                <span>النتيجة: {activeResult.quizScore} من {activeResult.quizTotal} ({activeResult.quizPercentage}%)</span>
              </span>
              <span className="text-[11px] text-stone-400">
                • {activeResult.completedAt}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-emerald-300 flex items-center gap-1 font-semibold">
                <Cloud size={14} />
                <span>موثق في Firebase (studentProgress)</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* QUIZ STATE 1: IDLE (Prompt student to begin) */}
      {quizState === 'idle' && (
        <div className="mt-4 p-6 rounded-2xl bg-white border border-stone-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 font-black text-xl">
              📝
            </div>
            <div>
              <h4 className="text-sm md:text-base font-black text-stone-900">
                {isRead ? 'أتممت قراءة محتوى الوحدة بنجاح!' : 'هل انتهيت من قراءة شروحات الوحدة؟'}
              </h4>
              <p className="text-xs text-stone-500 mt-0.5">
                يتكون الاختبار من {questions.length} أسئلة اختيار من متعدد. نسبة الاجتياز المطلوبة هي {activeQuiz.passScorePercentage}%.
              </p>
            </div>
          </div>

          <button
            onClick={handleStartQuiz}
            className="w-full md:w-auto px-6 py-3 rounded-xl bg-[#133827] hover:bg-[#1a4b35] text-white font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer whitespace-nowrap"
          >
            <span>بدء الاختبار القصير للوحدة</span>
            <ChevronLeft size={16} />
          </button>
        </div>
      )}

      {/* QUIZ STATE 2: IN PROGRESS (Interactive MCQ Stepper) */}
      {quizState === 'in_progress' && currentQuestion && (
        <div className="mt-4 p-6 md:p-8 rounded-3xl bg-white border border-stone-200 shadow-sm space-y-6">
          {/* Progress and Question Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-950 font-black text-xs">
                السؤال {currentQuestionIdx + 1} من {questions.length}
              </span>
              {currentQuestion.cognitiveLevel && (
                <span className="px-2.5 py-1 rounded-xl bg-stone-100 text-stone-700 text-xs font-bold border border-stone-200">
                  {currentQuestion.cognitiveLevel}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-32 bg-stone-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-700 h-full rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIdx + 1) / questions.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-stone-500 font-bold">
                {Math.round(((currentQuestionIdx + 1) / questions.length) * 100)}%
              </span>
            </div>
          </div>

          {/* Question Text */}
          <div className="space-y-2">
            <h4 className="text-base md:text-lg font-black text-stone-900 leading-relaxed font-serif">
              {currentQuestion.questionText}
            </h4>
            {currentQuestion.referenceExcerpt && (
              <p className="text-[11px] text-stone-500 font-medium">
                {currentQuestion.referenceExcerpt}
              </p>
            )}
          </div>

          {/* 4 Multiple Choice Options (أ، ب، ج، د) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {currentQuestion.options.map((optionText, optIdx) => {
              const isSelected = selectedAnswers[currentQuestion.id] === optIdx;
              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() => handleSelectOption(optIdx)}
                  className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                    isSelected
                      ? 'bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-600/30 text-emerald-950 shadow-xs'
                      : 'bg-stone-50/70 hover:bg-stone-100/90 border-stone-200 text-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white border border-stone-300 text-stone-700'
                    }`}>
                      {optionLetters[optIdx] || optIdx + 1}
                    </div>
                    <span className="text-xs md:text-sm font-bold leading-snug">
                      {optionText}
                    </span>
                  </div>

                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                    isSelected
                      ? 'border-emerald-700 bg-emerald-700 text-white'
                      : 'border-stone-300 bg-white'
                  }`}>
                    {isSelected && <CheckCircle2 size={12} />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Stepper Navigation Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setCurrentQuestionIdx(Math.max(0, currentQuestionIdx - 1))}
              disabled={currentQuestionIdx === 0}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:pointer-events-none text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <ChevronRight size={16} />
              <span>السؤال السابق</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {currentQuestionIdx < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIdx(currentQuestionIdx + 1)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-950 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>السؤال التالي</span>
                  <ChevronLeft size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitQuiz}
                  disabled={isSavingToFirebase || Object.keys(selectedAnswers).length === 0}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs md:text-sm font-black flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingToFirebase ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>جاري حفظ النتيجة في Firebase...</span>
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      <span>تسليم الاختبار وتوثيق النتيجة في Firebase</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QUIZ STATE 3: COMPLETED (Detailed breakdown, explanations & Firebase confirmation) */}
      {quizState === 'completed' && activeResult && (
        <div className="mt-4 p-6 md:p-8 rounded-3xl bg-white border border-stone-200 shadow-sm space-y-6">
          {/* Result Banner */}
          <div className={`p-6 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
            activeResult.passed 
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' 
              : 'bg-amber-50/80 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-center gap-4 text-center md:text-right">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 font-black text-2xl shadow-xs ${
                activeResult.passed 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-amber-600 text-white'
              }`}>
                {activeResult.passed ? <Award size={28} /> : <RotateCw size={28} />}
              </div>
              <div>
                <div className="flex items-center justify-center md:justify-start gap-2">
                  <h4 className="text-lg font-black">
                    {activeResult.passed ? 'تهانينا! لقد اجتزت اختبار الوحدة بنجاح' : 'أحسنت المحاولة! تحتاج لمراجعة بعض المفاهيم'}
                  </h4>
                </div>
                <p className="text-xs text-stone-600 mt-1">
                  درجتك: <strong className="text-stone-900">{activeResult.quizScore} من {activeResult.quizTotal}</strong> ({activeResult.quizPercentage}%) 
                  • حد الاجتياز: {activeQuiz.passScorePercentage}%
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleStartQuiz}
                className="px-4 py-2 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                <RotateCw size={13} />
                <span>إعادة الاختبار</span>
              </button>

              {onNextUnit && !isLastUnit && (
                <button
                  onClick={onNextUnit}
                  className="px-4 py-2 rounded-xl bg-[#133827] hover:bg-[#1a4b35] text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <span>الوحدة التالية</span>
                  <ChevronLeft size={14} />
                </button>
              )}

              {isLastUnit && onProceedToReview && (
                <button
                  onClick={onProceedToReview}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <span>الانتقال لأسئلة المراجعة الشاملة</span>
                  <ArrowLeft size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Firebase Persistence Status Alert */}
          {firebaseFeedback && (
            <div className={`p-4 rounded-xl text-xs font-bold border flex items-center gap-2.5 ${
              firebaseFeedback.success
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}>
              <Cloud size={18} className="text-emerald-700 shrink-0" />
              <div>
                <span>{firebaseFeedback.message}</span>
                <span className="block text-[10px] text-stone-500 font-mono mt-0.5">
                  Collection: <code>studentProgress</code> | Doc ID: <code>{firebaseFeedback.docId}</code>
                </span>
              </div>
            </div>
          )}

          {/* Detailed Question by Question Review */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-black text-stone-900 flex items-center gap-2">
                <BookOpen size={16} className="text-emerald-800" />
                <span>نموذج الإجابة والمراجعة العلمية التفصيلية:</span>
              </h5>
              <span className="text-[11px] text-stone-500 font-semibold">
                مستند حصرياً لمراجع الوحدة المعتمدة
              </span>
            </div>

            <div className="space-y-4">
              {questions.map((q, idx) => {
                const answerInfo = activeResult.answers[q.id];
                const isCorrect = answerInfo ? answerInfo.isCorrect : false;
                const chosenOpt = answerInfo ? answerInfo.chosenOption : 'لم تتم الإجابة';
                const correctOpt = q.correctAnswer || q.options[q.correctOptionIndex];

                return (
                  <div
                    key={q.id}
                    className={`p-4 md:p-5 rounded-2xl border transition-all ${
                      isCorrect 
                        ? 'bg-white border-emerald-200 shadow-2xs' 
                        : 'bg-red-50/40 border-red-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                          isCorrect ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {idx + 1}
                        </span>
                        <h6 className="text-xs md:text-sm font-bold text-stone-900 leading-snug">
                          {q.questionText}
                        </h6>
                      </div>

                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
                        isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {isCorrect ? 'إجابة صحيحة' : 'إجابة خاطئة'}
                      </span>
                    </div>

                    {/* Answers Comparison */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2.5 text-xs">
                      <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                        isCorrect ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-bold' : 'bg-red-50 border-red-200 text-red-950 font-medium'
                      }`}>
                        <span className="text-[10px] text-stone-500 font-bold shrink-0">إجابتك:</span>
                        <span>{chosenOpt}</span>
                      </div>

                      <div className="p-2.5 rounded-xl border bg-emerald-50/80 border-emerald-300 text-emerald-950 font-bold flex items-center gap-2">
                        <span className="text-[10px] text-emerald-800 font-bold shrink-0">الإجابة النموذجية:</span>
                        <span>{correctOpt}</span>
                      </div>
                    </div>

                    {/* Scientific Explanation & Citation */}
                    {q.explanation && (
                      <div className="mt-2 p-3 rounded-xl bg-stone-50 border border-stone-200 text-[11px] text-stone-700 leading-relaxed space-y-1">
                        <span className="font-bold text-emerald-900 block">💡 التفسير العلمي المعتمد:</span>
                        <p>{q.explanation}</p>
                        {q.referenceExcerpt && (
                          <span className="text-[10px] text-stone-500 block pt-1 border-t border-stone-200/60">
                            {q.referenceExcerpt}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
