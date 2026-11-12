import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Clock, 
  User, 
  Mail, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  RotateCcw, 
  Printer, 
  Send,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CurriculumData, ExamQuestion, StudentExamSubmission } from './types';

interface FinalExamViewProps {
  curriculum: CurriculumData;
  onExamSubmitted: (submission: StudentExamSubmission) => void;
  onOpenCertificate: (submission: StudentExamSubmission) => void;
}

const EXAM_DURATION_SECONDS = 20 * 60; // 20 minutes

export const FinalExamView: React.FC<FinalExamViewProps> = ({
  curriculum,
  onExamSubmitted,
  onOpenCertificate
}) => {
  // Student registration gate state
  const [studentName, setStudentName] = useState<string>('');
  const [studentEmail, setStudentEmail] = useState<string>('');
  const [nameError, setNameError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [isExamStarted, setIsExamStarted] = useState<boolean>(false);

  // Active exam state
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(EXAM_DURATION_SECONDS);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [submissionResult, setSubmissionResult] = useState<StudentExamSubmission | null>(null);

  const questions: ExamQuestion[] = curriculum.examQuestions;
  const currentQ = questions[currentQIndex];

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isExamStarted && !isSubmitted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isExamStarted, isSubmitted, timeLeft]);

  // Validation function before starting
  const validateAndStart = (e: React.FormEvent) => {
    e.preventDefault();
    let hasErr = false;

    if (!studentName.trim() || studentName.trim().length < 3) {
      setNameError('الرجاء إدخال الاسم الكامل الثلاثي أو الثنائي للطالب.');
      hasErr = true;
    } else {
      setNameError('');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!studentEmail.trim() || !emailRegex.test(studentEmail.trim())) {
      setEmailError('الرجاء إدخال بريد إلكتروني صالح لاستلام النتيجة والشهادة.');
      hasErr = true;
    } else {
      setEmailError('');
    }

    if (!hasErr) {
      setIsExamStarted(true);
      setTimeLeft(EXAM_DURATION_SECONDS);
      setSelectedAnswers({});
      setIsSubmitted(false);
      setSubmissionResult(null);
    }
  };

  const handleSelectOption = (questionId: string, option: string) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: option
    }));
  };

  const handleSubmitExam = () => {
    if (isSubmitted) return;

    let totalPoints = 0;
    let earnedPoints = 0;

    questions.forEach((q) => {
      const qPoints = q.points || 10;
      totalPoints += qPoints;
      if (selectedAnswers[q.id] === q.correctAnswer) {
        earnedPoints += qPoints;
      }
    });

    const percentage = Math.round((earnedPoints / Math.max(totalPoints, 1)) * 100);
    const passed = percentage >= 80;

    const submission: StudentExamSubmission = {
      id: `sub-${Date.now()}`,
      studentName: studentName.trim(),
      studentEmail: studentEmail.trim(),
      score: earnedPoints,
      totalPoints,
      percentage,
      date: new Date().toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      answers: selectedAnswers,
      passed,
      timeSpentSeconds: EXAM_DURATION_SECONDS - timeLeft
    };

    setIsSubmitted(true);
    setSubmissionResult(submission);
    onExamSubmitted(submission);

    if (passed) {
      try {
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch (_) {}
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. GATE VIEW: Mandatory Registration Form
  if (!isExamStarted) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 md:p-10 border border-stone-200/80 shadow-md animate-in fade-in duration-300">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-900 mx-auto flex items-center justify-center mb-4 shadow-inner">
            <Award size={36} className="text-emerald-800" />
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-emerald-950 font-serif mb-2">
            الاختبار النهائي الشامل: {curriculum.title}
          </h2>
          <p className="text-xs md:text-sm text-stone-500 max-w-md mx-auto leading-relaxed">
            يرجى إدخال بيانات الطالب الكاملة قبل بدء الاختبار. لن يُسمح ببدء الاختبار وتوثيق النتيجة وإصدار الشهادة بدون التحقق من البيانات.
          </p>
        </div>

        {/* Instructions list */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 mb-6 text-xs text-stone-700 space-y-2">
          <p className="font-bold text-stone-900 text-sm mb-1">تعليمات الاختبار:</p>
          <p>• مدة الاختبار: <strong>20 دقيقة</strong> بمؤقت تنازلي دقيق.</p>
          <p>• عدد الأسئلة: <strong>{questions.length} أسئلة شاملة</strong> تغطي جميع نواتج التعلم.</p>
          <p>• درجة الاجتياز والشهادة: <strong>80% فأعلى</strong> تمنحك شهادة إنجاز معتمدة قابلة للطباعة.</p>
          <p>• التصحيح تلقائي وفوري فور الضغط على زر إنهاء الاختبار.</p>
        </div>

        <form onSubmit={validateAndStart} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
              <User size={14} className="text-emerald-700" />
              <span>الاسم الكامل للطالب (كما سيظهر في الشهادة):</span>
            </label>
            <input
              type="text"
              value={studentName}
              onChange={(e) => {
                setStudentName(e.target.value);
                if (nameError) setNameError('');
              }}
              placeholder="مثال: يوسف أحمد التميمي"
              className={`w-full p-3.5 border-2 rounded-xl text-xs md:text-sm focus:outline-none transition-colors ${
                nameError ? 'border-rose-400 bg-rose-50' : 'border-stone-300 focus:border-emerald-700'
              }`}
            />
            {nameError && (
              <p className="text-rose-600 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                <span>{nameError}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-800 mb-1.5 flex items-center gap-1.5">
              <Mail size={14} className="text-emerald-700" />
              <span>البريد الإلكتروني المعتمد:</span>
            </label>
            <input
              type="email"
              value={studentEmail}
              onChange={(e) => {
                setStudentEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              placeholder="student@example.com"
              className={`w-full p-3.5 border-2 rounded-xl text-xs md:text-sm focus:outline-none transition-colors ${
                emailError ? 'border-rose-400 bg-rose-50' : 'border-stone-300 focus:border-emerald-700'
              }`}
              dir="ltr"
            />
            {emailError && (
              <p className="text-rose-600 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} />
                <span>{emailError}</span>
              </p>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-900 hover:bg-emerald-950 text-white font-extrabold py-4 rounded-xl text-sm md:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all cursor-pointer mt-6"
          >
            <span>بدء الاختبار النهائي الآن ⏱️</span>
            <ArrowLeft size={18} />
          </button>
        </form>
      </div>
    );
  }

  // 2. EXAM SUBMISSION SUMMARY VIEW
  if (isSubmitted && submissionResult) {
    const isPassed = submissionResult.passed;

    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
        {/* Results Hero Card */}
        <div
          className={`rounded-3xl p-8 md:p-12 text-center text-white border shadow-xl ${
            isPassed
              ? 'bg-gradient-to-r from-emerald-950 to-teal-900 border-emerald-700'
              : 'bg-gradient-to-r from-stone-900 to-stone-800 border-stone-700'
          }`}
        >
          <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 bg-white/10 backdrop-blur-sm border-2 border-white/20">
            {isPassed ? (
              <Award size={44} className="text-amber-400" />
            ) : (
              <RotateCcw size={40} className="text-stone-300" />
            )}
          </div>

          <h2 className="text-2xl md:text-4xl font-extrabold font-serif mb-2">
            {isPassed ? 'مبارك! لقد اجتزت الاختبار بنجاح وتفوق 🎉' : 'انتهى الاختبار • يمكنك إعادة المحاولة والمراجعة'}
          </h2>
          <p className="text-xs md:text-sm text-stone-200 mb-6">
            اسم الطالب: <strong>{submissionResult.studentName}</strong> • {submissionResult.date}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 my-6">
            <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-3.5 backdrop-blur-sm">
              <span className="text-xs text-stone-300 block">الدرجة النهائية</span>
              <span className="text-2xl md:text-3xl font-black text-amber-300">
                {submissionResult.score} / {submissionResult.totalPoints}
              </span>
            </div>

            <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-3.5 backdrop-blur-sm">
              <span className="text-xs text-stone-300 block">النسبة المئوية</span>
              <span className="text-2xl md:text-3xl font-black text-white">
                {submissionResult.percentage}%
              </span>
            </div>

            <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-3.5 backdrop-blur-sm">
              <span className="text-xs text-stone-300 block">حالة النتيجة</span>
              <span className={`text-base md:text-lg font-black ${isPassed ? 'text-emerald-300' : 'text-rose-300'}`}>
                {isPassed ? 'ناجح بتفوق (اجتياز 80%+)' : 'لم يتحقق الاجتياز (< 80%)'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            {isPassed && (
              <button
                onClick={() => onOpenCertificate(submissionResult)}
                className="bg-amber-500 hover:bg-amber-600 text-emerald-950 font-black px-7 py-3.5 rounded-xl text-xs md:text-sm flex items-center gap-2 shadow-lg cursor-pointer transition-all hover:scale-105"
              >
                <Award size={18} />
                <span>عرض وطباعة شهادة الإنجاز المعتمدة 🎓</span>
              </button>
            )}

            <button
              onClick={() => {
                setIsExamStarted(false);
                setIsSubmitted(false);
                setSubmissionResult(null);
              }}
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3.5 rounded-xl text-xs md:text-sm border border-white/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw size={16} />
              <span>إعادة محاولة الاختبار من جديد</span>
            </button>
          </div>
        </div>

        {/* Detailed Question by Question Answer Review */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm space-y-6">
          <div className="border-b border-stone-200 pb-4">
            <h3 className="text-xl font-bold text-stone-900 font-serif">
              مراجعة وتفكيك إجابات الاختبار بالتفصيل:
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              استعراض الإجابة التي اخترتها ومقارنتها بالإجابة الصحيحة مع الشرح العلمي
            </p>
          </div>

          <div className="space-y-4">
            {questions.map((q, idx) => {
              const studentChoice = submissionResult.answers[q.id];
              const isCorrect = studentChoice === q.correctAnswer;

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border ${
                    isCorrect ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-stone-500">السؤال {idx + 1}</span>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                        isCorrect ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-900'
                      }`}
                    >
                      {isCorrect ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {isCorrect ? `صحيحة (+${q.points} علامة)` : 'غير صحيحة (0 علامة)'}
                    </span>
                  </div>

                  <h4 className="font-bold text-stone-900 text-sm md:text-base mb-3 leading-relaxed">
                    {q.questionText}
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs mb-3">
                    <div className={`p-2.5 rounded-xl border ${isCorrect ? 'border-emerald-300 bg-white' : 'border-rose-300 bg-white'}`}>
                      <span className="text-stone-500 block mb-0.5">إجابتك:</span>
                      <strong className={isCorrect ? 'text-emerald-900' : 'text-rose-900'}>
                        {studentChoice || 'لم تتم الإجابة'}
                      </strong>
                    </div>

                    {!isCorrect && (
                      <div className="p-2.5 rounded-xl border border-emerald-300 bg-white">
                        <span className="text-stone-500 block mb-0.5">الإجابة النموذجية الصحيحة:</span>
                        <strong className="text-emerald-900">{q.correctAnswer}</strong>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-stone-600 bg-white/80 p-3 rounded-xl border border-stone-200/60 leading-relaxed">
                    <strong>التفسير العلمي:</strong> {q.explanation}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 3. ACTIVE EXAM VIEW (In Progress)
  const answeredCount = Object.keys(selectedAnswers).length;
  const isTimeCritical = timeLeft < 300; // < 5 mins

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header: Timer + Progress + Student Info */}
      <div className="bg-white rounded-2xl p-4 md:p-5 border border-stone-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4 sticky top-16 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-xs">
            {answeredCount}/{questions.length}
          </div>
          <div>
            <span className="text-xs text-stone-500 block">الطالب: {studentName}</span>
            <span className="text-xs font-bold text-emerald-950">
              تمت الإجابة عن {answeredCount} من {questions.length} أسئلة
            </span>
          </div>
        </div>

        {/* Countdown Timer */}
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-sm md:text-base font-bold border transition-colors ${
            isTimeCritical
              ? 'bg-rose-100 text-rose-900 border-rose-300 animate-pulse'
              : 'bg-amber-50 text-amber-950 border-amber-300'
          }`}
        >
          <Clock size={16} className={isTimeCritical ? 'text-rose-600' : 'text-amber-600'} />
          <span>الوقت المتبقي: {formatTimer(timeLeft)}</span>
        </div>

        <button
          onClick={handleSubmitExam}
          className="bg-emerald-900 hover:bg-emerald-950 text-white font-bold px-5 py-2.5 rounded-xl text-xs md:text-sm flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
        >
          <Send size={14} />
          <span>إنهاء وتسليم الاختبار</span>
        </button>
      </div>

      {/* Main Question Card */}
      {currentQ && (
        <div className="bg-white rounded-3xl p-6 md:p-10 border border-stone-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-950 text-amber-300">
              السؤال {currentQIndex + 1} من {questions.length}
            </span>
            <span className="text-xs font-bold text-stone-500">
              {currentQ.points} علامات • {currentQ.unitRef || 'شامل'}
            </span>
          </div>

          <h3 className="text-lg md:text-2xl font-bold text-stone-900 leading-relaxed font-serif">
            {currentQ.questionText}
          </h3>

          {/* Options */}
          <div className="space-y-3 pt-2">
            {currentQ.options.map((opt, oIdx) => {
              const letters = ['أ', 'ب', 'ج', 'د'];
              const letter = letters[oIdx] || `${oIdx + 1}`;
              const isPicked = selectedAnswers[currentQ.id] === opt;

              return (
                <button
                  key={oIdx}
                  onClick={() => handleSelectOption(currentQ.id, opt)}
                  className={`w-full text-right p-4 rounded-2xl border-2 text-xs md:text-sm transition-all flex items-center gap-3.5 cursor-pointer ${
                    isPicked
                      ? 'border-emerald-800 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-600/30'
                      : 'border-stone-200 hover:border-emerald-500 bg-stone-50 hover:bg-white text-stone-800'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                      isPicked ? 'bg-emerald-900 text-white' : 'bg-white border border-stone-300 text-stone-700'
                    }`}
                  >
                    {letter}
                  </div>
                  <span className="flex-1 leading-relaxed">{opt}</span>
                  {isPicked && <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Navigation & Jump Palette */}
          <div className="pt-6 border-t border-stone-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              {questions.map((q, qIdx) => {
                const isAnswered = Boolean(selectedAnswers[q.id]);
                const isCurrent = qIdx === currentQIndex;

                let btnClass = 'bg-stone-100 text-stone-600 hover:bg-stone-200';
                if (isAnswered) btnClass = 'bg-emerald-800 text-white';
                if (isCurrent) btnClass += ' ring-2 ring-amber-500 font-black';

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQIndex(qIdx)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${btnClass}`}
                  >
                    {qIdx + 1}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))}
                disabled={currentQIndex === 0}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:pointer-events-none text-xs font-bold cursor-pointer"
              >
                السابق
              </button>

              {currentQIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQIndex(currentQIndex + 1)}
                  className="bg-emerald-900 hover:bg-emerald-950 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer"
                >
                  التالي
                </button>
              ) : (
                <button
                  onClick={handleSubmitExam}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black px-5 py-2 rounded-xl text-xs cursor-pointer"
                >
                  تسليم الاختبار
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
