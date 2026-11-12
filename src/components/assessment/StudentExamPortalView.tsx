import React, { useState, useEffect, useRef } from 'react';
import { 
  GraduationCap, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Play, 
  RotateCcw, 
  Save, 
  Send, 
  HelpCircle, 
  BookOpen, 
  Award,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  Check,
  Sparkles
} from 'lucide-react';
import { assessmentStore } from '../../lib/assessmentStore';
import { Exam, ExamAttempt } from '../../types/assessmentPlatform';

interface StudentExamPortalViewProps {
  initialExamId?: string | null;
}

export const StudentExamPortalView: React.FC<StudentExamPortalViewProps> = ({ initialExamId }) => {
  const currentUser = assessmentStore.currentUser;
  const exams = assessmentStore.exams;
  const attempts = assessmentStore.attempts;

  // Active attempt session state
  const [activeSession, setActiveSession] = useState<{
    attempt: ExamAttempt;
    exam: any;
    questions: any[];
    canSeeFullResults: boolean;
  } | null>(null);

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, 'opt_1' | 'opt_2' | 'opt_3' | 'opt_4'>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(1800);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline_queued'>('saved');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const offlineQueueRef = useRef<Record<string, any>>({});

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Flush offline queue if any
      if (activeSession && Object.keys(offlineQueueRef.current).length > 0) {
        setSaveStatus('saving');
        try {
          assessmentStore.saveAttemptAnswers(activeSession.attempt.id, offlineQueueRef.current);
          offlineQueueRef.current = {};
          setSaveStatus('saved');
        } catch (_) {}
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [activeSession]);

  // Check if there is already an in-progress attempt for this student on mount
  useEffect(() => {
    const studentAttempts = attempts.filter(a => a.studentId === currentUser.id && a.status === 'in_progress');
    if (studentAttempts.length > 0) {
      const active = studentAttempts[0];
      const exam = exams.find(e => e.id === active.examId);
      if (exam) {
        try {
          const session = assessmentStore.sanitizeAttemptForStudent(active, exam);
          setActiveSession(session);
          setSelectedAnswers(active.answers || {});
        } catch (e) {
          console.warn('Error restoring active attempt:', e);
        }
      }
    } else if (initialExamId) {
      // Auto launch requested exam
      handleStartExam(initialExamId);
    }
  }, [currentUser.id, initialExamId]);

  // Live Server-authoritative countdown timer
  useEffect(() => {
    if (!activeSession || activeSession.attempt.status !== 'in_progress') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const expiry = new Date(activeSession.attempt.expiresAt).getTime();
      const diffSecs = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeLeftSeconds(diffSecs);

      // Auto submit when server time expires
      if (diffSecs <= 0) {
        handleAutoSubmitTimedOut();
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSession]);

  const handleStartExam = (examId: string) => {
    try {
      const session = assessmentStore.startStudentExamAttempt(examId, currentUser.id);
      setActiveSession(session);
      setSelectedAnswers(session.attempt.answers || {});
      setActiveQuestionIndex(0);
      setSubmitResult(null);
    } catch (err: any) {
      alert(err.message || 'تعذر بدء الاختبار.');
    }
  };

  // Choose option with instant auto-save and offline retry queue
  const handleSelectOption = (questionId: string, optionId: 'opt_1' | 'opt_2' | 'opt_3' | 'opt_4') => {
    if (!activeSession || activeSession.attempt.status !== 'in_progress') return;

    const updated = { ...selectedAnswers, [questionId]: optionId };
    setSelectedAnswers(updated);

    // Auto-save
    setSaveStatus('saving');
    try {
      if (navigator.onLine) {
        assessmentStore.saveAttemptAnswers(activeSession.attempt.id, { [questionId]: optionId });
        setSaveStatus('saved');
      } else {
        offlineQueueRef.current[questionId] = optionId;
        setSaveStatus('offline_queued');
      }
    } catch (e) {
      offlineQueueRef.current[questionId] = optionId;
      setSaveStatus('offline_queued');
    }
  };

  const handleAutoSubmitTimedOut = () => {
    if (!activeSession || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = assessmentStore.submitExamAttempt(activeSession.attempt.id, selectedAnswers);
      setSubmitResult(result);
      // Refresh session
      const updatedExam = exams.find(e => e.id === activeSession.exam.id);
      if (updatedExam) {
        setActiveSession(assessmentStore.sanitizeAttemptForStudent(result.attempt, updatedExam));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalSubmit = () => {
    if (!activeSession) return;
    const unansweredCount = activeSession.questions.length - Object.keys(selectedAnswers).length;
    if (unansweredCount > 0) {
      const confirm = window.confirm(`لديك (${unansweredCount}) أسئلة غير مجابة. هل ترغب بالتسليم النهائي الآن؟`);
      if (!confirm) return;
    }

    setIsSubmitting(true);
    try {
      const result = assessmentStore.submitExamAttempt(activeSession.attempt.id, selectedAnswers);
      setSubmitResult(result);
      const updatedExam = exams.find(e => e.id === activeSession.exam.id);
      if (updatedExam) {
        setActiveSession(assessmentStore.sanitizeAttemptForStudent(result.attempt, updatedExam));
      }
    } catch (err: any) {
      alert(err.message || 'فشل تسليم الاختبار.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // If in an active or completed exam session, render runner
  if (activeSession) {
    const currentQ = activeSession.questions[activeQuestionIndex];
    const isCompleted = activeSession.attempt.status === 'submitted' || activeSession.attempt.status === 'timed_out';
    const totalQuestions = activeSession.questions.length;
    const answeredCount = Object.keys(selectedAnswers).length;

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6" dir="rtl">
        {/* Active Session Top Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 font-mono">
              محاولة #{activeSession.attempt.attemptNumber} • {activeSession.exam.courseName}
            </span>
            <h2 className="text-base font-bold text-slate-900">{activeSession.exam.title}</h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Auto-save & Connection Status */}
            <div className="flex items-center gap-1.5 text-xs">
              {isOnline ? (
                saveStatus === 'saved' ? (
                  <span className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                    <Check size={13} />
                    <span>تم الحفظ تلقائياً</span>
                  </span>
                ) : saveStatus === 'saving' ? (
                  <span className="flex items-center gap-1 text-blue-600 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                    <Save size={13} className="animate-spin" />
                    <span>جارٍ الحفظ...</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    <AlertTriangle size={13} />
                    <span>في قائمة الانتظار</span>
                  </span>
                )
              ) : (
                <span className="flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                  <WifiOff size={13} />
                  <span>انقطع الاتصال (محفوظ محلياً)</span>
                </span>
              )}
            </div>

            {/* Countdown Timer */}
            {!isCompleted && (
              <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold border ${
                timeLeftSeconds < 300
                  ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                  : 'bg-slate-900 text-white border-slate-800'
              }`}>
                <Clock size={14} />
                <span>{formatTimer(timeLeftSeconds)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Post-Submission Result Card */}
        {isCompleted && (
          <div className={`p-6 rounded-2xl border text-center space-y-3 ${
            activeSession.attempt.passed
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
              : 'bg-amber-50/80 border-amber-300 text-amber-950'
          }`}>
            <div className="w-12 h-12 mx-auto rounded-full bg-white flex items-center justify-center shadow-md">
              <Award size={28} className={activeSession.attempt.passed ? 'text-emerald-600' : 'text-amber-600'} />
            </div>
            <h3 className="text-lg font-black">
              {activeSession.attempt.passed ? 'تهانينا! لقد اجتزت الاختبار بنجاح' : 'تم تسليم الاختبار'}
            </h3>
            <p className="text-2xl font-mono font-black">
              {activeSession.attempt.score} / {activeSession.attempt.maxScore} درجة ({activeSession.attempt.percentage}%)
            </p>
            <p className="text-xs text-slate-600">
              {activeSession.canSeeFullResults 
                ? 'يمكنك الآن مراجعة إجاباتك بالتفصيل أدناه مع الإجابات النموذجية والمبررات والتفسيرات البيداغوجية المعتمدة.' 
                : 'سياسة هذا الاختبار تقضي بعرض النتيجة الرقمية فقط (أو حجب التفسيرات حتى إغلاق نافذة الإتاحة للجميع).'}
            </p>
            <button
              onClick={() => setActiveSession(null)}
              className="mt-2 px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              العودة إلى قائمة الاختبارات
            </button>
          </div>
        )}

        {/* Question Stepper Indicator */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto p-2 bg-white rounded-xl border border-slate-200">
          {activeSession.questions.map((q, idx) => {
            const isAnswered = !!selectedAnswers[q.id];
            const isCurrent = idx === activeQuestionIndex;
            const itemRes = activeSession.attempt.itemResults?.[q.id];

            return (
              <button
                key={q.id}
                onClick={() => setActiveQuestionIndex(idx)}
                className={`w-9 h-9 rounded-lg text-xs font-mono font-bold transition flex items-center justify-center shrink-0 cursor-pointer ${
                  isCurrent
                    ? 'bg-slate-900 text-white ring-2 ring-emerald-500'
                    : isCompleted && itemRes
                    ? itemRes.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    : isAnswered
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Current Question Sheet */}
        {currentQ && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between text-xs text-slate-500 pb-3 border-b border-slate-100">
              <span className="font-bold text-slate-800 font-mono">
                السؤال {activeQuestionIndex + 1} من {totalQuestions}
              </span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {currentQ.points} درجات
              </span>
            </div>

            <div className="text-base font-extrabold text-slate-900 leading-relaxed">
              {currentQ.questionText}
            </div>

            {/* Shuffled Options (Stable Option IDs) */}
            <div className="space-y-3">
              {currentQ.options.map((opt: any) => {
                const isSelected = selectedAnswers[currentQ.id] === opt.id;
                const isCorrectOption = currentQ.correctOptionId === opt.id;
                const showCorrection = activeSession.canSeeFullResults;

                let borderStyle = 'border-slate-200 hover:border-slate-300 bg-white';
                if (isCompleted && showCorrection) {
                  if (isCorrectOption) {
                    borderStyle = 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-500/20 text-emerald-950 font-bold';
                  } else if (isSelected && !isCorrectOption) {
                    borderStyle = 'border-rose-400 bg-rose-50/80 text-rose-950 line-through';
                  }
                } else if (isSelected) {
                  borderStyle = 'border-slate-900 bg-slate-900 text-white font-bold shadow-md';
                }

                return (
                  <button
                    key={opt.id}
                    disabled={isCompleted}
                    onClick={() => handleSelectOption(currentQ.id, opt.id)}
                    className={`w-full text-right p-4 rounded-xl border text-xs sm:text-sm transition flex items-center justify-between gap-3 cursor-pointer ${borderStyle}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                        isSelected && !isCompleted ? 'bg-emerald-400 text-slate-950' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {opt.id.replace('opt_', '')}
                      </span>
                      <span>{opt.text}</span>
                    </div>

                    {isCompleted && showCorrection && isCorrectOption && (
                      <span className="text-xs text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                        الإجابة الصحيحة المعتمدة
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Post-submission full explanation if allowed */}
            {isCompleted && activeSession.canSeeFullResults && (
              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-2 text-xs text-emerald-950">
                <div className="font-bold flex items-center gap-1.5">
                  <BookOpen size={14} className="text-emerald-700" />
                  <span>المبرر البيداغوجي والاستشهاد الأكاديمي:</span>
                </div>
                <p className="leading-relaxed">{currentQ.explanation}</p>
                {currentQ.citation && (
                  <div className="text-[11px] text-emerald-800 font-mono pt-1">
                    المصدر: {currentQ.citation.sourceTitle} ({currentQ.citation.pageOrSection})
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Navigation & Submit Bar */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <button
            disabled={activeQuestionIndex === 0}
            onClick={() => setActiveQuestionIndex(prev => Math.max(0, prev - 1))}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <ChevronRight size={16} />
            <span>السؤال السابق</span>
          </button>

          {!isCompleted ? (
            <button
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              <Send size={15} />
              <span>تسليم الاختبار النهائي ({answeredCount}/{totalQuestions})</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveSession(null)}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
            >
              إنهاء والمغادرة
            </button>
          )}

          <button
            disabled={activeQuestionIndex === totalQuestions - 1}
            onClick={() => setActiveQuestionIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <span>السؤال التالي</span>
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>
    );
  }

  // Otherwise, render list of available exams for the student
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sky-50 text-sky-600">
              <GraduationCap size={22} />
            </span>
            <h2 className="text-xl font-bold text-slate-900">بوابة الاختبارات الأكاديمية للطالب</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            مرحباً بك يا <strong>{currentUser.name}</strong>. استعرض الاختبارات المتاحة لمجموعتك وأدائها باطمئنان مع الحفظ التلقائي ومؤقت الخادم.
          </p>
        </div>
      </div>

      {/* Available Exams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {exams.map(exam => {
          const studentAttempts = attempts.filter(a => a.examId === exam.id && a.studentId === currentUser.id);
          const hasReachedLimit = studentAttempts.length >= exam.allowedAttempts;
          const bestScore = studentAttempts.length > 0 
            ? Math.max(...studentAttempts.map(a => a.score || 0))
            : null;

          const now = new Date();
          const isClosed = new Date(exam.endDate) < now;

          return (
            <div
              key={exam.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-800 font-mono">
                    {exam.courseName}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-400">
                    {studentAttempts.length}/{exam.allowedAttempts} محاولات
                  </span>
                </div>

                <h3 className="font-extrabold text-sm text-slate-900 leading-snug">
                  {exam.title}
                </h3>

                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">المدة المحددة:</span>
                    <span className="font-bold text-slate-800">{exam.durationMinutes} دقيقة</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">عدد الأسئلة:</span>
                    <span className="font-bold text-slate-800">{exam.questionsCount} أسئلة ({exam.totalPoints} درجة)</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">درجة النجاح:</span>
                    <span className="font-bold text-slate-800">{exam.passScore}%</span>
                  </div>

                  {bestScore !== null && (
                    <div className="flex items-center justify-between text-emerald-700 bg-emerald-50 p-2 rounded-lg font-bold">
                      <span>أعلى نتيجة مسجلة:</span>
                      <span className="font-mono">{bestScore} / {exam.totalPoints}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Start Exam Button */}
              <div className="pt-3 border-t border-slate-100">
                <button
                  disabled={hasReachedLimit || isClosed}
                  onClick={() => handleStartExam(exam.id)}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-sm cursor-pointer ${
                    hasReachedLimit || isClosed
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  }`}
                >
                  <Play size={14} />
                  <span>
                    {hasReachedLimit ? 'استنفدت كافة المحاولات' : isClosed ? 'انتهت فترة الاختبار' : 'بدء الاختبار الآن'}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
