import React, { useState, useMemo } from 'react';
import { 
  CheckSquare, 
  Shuffle, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Lightbulb, 
  HelpCircle, 
  ArrowLeft, 
  Sparkles, 
  Award,
  ChevronRight,
  ChevronLeft,
  Filter,
  Layers
} from 'lucide-react';
import { CurriculumData, QuestionType, ReviewQuestion, StudentProgress } from './types';
import { MathJaxSection } from '../MathJaxSection';

interface ReviewPracticeViewProps {
  curriculum: CurriculumData;
  progress: StudentProgress;
  onRecordAnswer: (questionId: string, isCorrect: boolean) => void;
  onProceedToExam: () => void;
}

export const ReviewPracticeView: React.FC<ReviewPracticeViewProps> = ({
  curriculum,
  progress,
  onRecordAnswer,
  onProceedToExam
}) => {
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [shuffleKey, setShuffleKey] = useState<number>(0);

  // Student interaction states
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [textInput, setTextInput] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [answeredMap, setAnsweredMap] = useState<Record<string, { answer: string; isCorrect: boolean }>>({});

  // Shuffle & filter questions
  const filteredQuestions: ReviewQuestion[] = useMemo(() => {
    let list = [...curriculum.reviewQuestions];
    if (selectedTypeFilter !== 'all') {
      list = list.filter((q) => q.type === selectedTypeFilter);
    }
    // Deterministic or randomized shuffle by shuffleKey
    if (shuffleKey > 0) {
      list = [...list].sort(() => Math.random() - 0.5);
    }
    return list;
  }, [curriculum.reviewQuestions, selectedTypeFilter, shuffleKey]);

  const currentQ: ReviewQuestion | undefined = filteredQuestions[currentIdx] || filteredQuestions[0];

  const handleShuffle = () => {
    setShuffleKey((prev) => prev + 1);
    setCurrentIdx(0);
    setSelectedOption('');
    setTextInput('');
    setShowExplanation(false);
    setShowHint(false);
  };

  const handleSelectQuestion = (index: number) => {
    setCurrentIdx(index);
    const q = filteredQuestions[index];
    if (q && answeredMap[q.id]) {
      const past = answeredMap[q.id];
      setSelectedOption(past.answer);
      setTextInput(past.answer);
      setShowExplanation(true);
    } else {
      setSelectedOption('');
      setTextInput('');
      setShowExplanation(false);
      setShowHint(false);
    }
  };

  const checkAnswer = (answerGiven: string) => {
    if (!currentQ || showExplanation) return;

    let isCorrect = false;
    const cleanGiven = answerGiven.trim().toLowerCase();
    const cleanCorrect = currentQ.correctAnswer.trim().toLowerCase();

    if (currentQ.type === 'true_false' || currentQ.type === 'multiple_choice') {
      isCorrect = cleanGiven === cleanCorrect;
    } else if (currentQ.type === 'fill_blank') {
      // Allow flexible partial or trimmed match
      isCorrect = cleanGiven.includes(cleanCorrect) || cleanCorrect.includes(cleanGiven);
    } else if (currentQ.type === 'short_answer') {
      // Short answer considers student submission valid and compares with model answer
      isCorrect = answerGiven.trim().length >= 10;
    }

    setAnsweredMap((prev) => ({
      ...prev,
      [currentQ.id]: { answer: answerGiven, isCorrect }
    }));
    setShowExplanation(true);
    onRecordAnswer(currentQ.id, isCorrect);
  };

  const totalAnswered = Object.keys(answeredMap).length;
  const totalCorrect = Object.values(answeredMap).filter((a) => a.isCorrect).length;
  const currentAnswerState = currentQ ? answeredMap[currentQ.id] : undefined;

  const getTypeLabel = (type: QuestionType) => {
    switch (type) {
      case 'true_false': return 'أ. صح أو خطأ';
      case 'multiple_choice': return 'ب. اختيار من متعدد (MCQ)';
      case 'fill_blank': return 'ج. أكمل الفراغ';
      case 'short_answer': return 'د. سؤال قصير وتعليل';
    }
  };

  if (!currentQ) {
    return (
      <div className="p-10 text-center bg-white rounded-3xl border border-stone-200">
        <p className="text-stone-600">لا توجد أسئلة تطابق التصنيف المختار.</p>
        <button
          onClick={() => setSelectedTypeFilter('all')}
          className="mt-4 px-4 py-2 bg-emerald-900 text-white rounded-xl text-xs font-bold"
        >
          عرض جميع الأسئلة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Controls & Filter Tabs */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Question Type Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'جميع الأسئلة' },
            { id: 'true_false', label: 'صح أو خطأ' },
            { id: 'multiple_choice', label: 'اختيار من متعدد' },
            { id: 'fill_blank', label: 'أكمل الفراغ' },
            { id: 'short_answer', label: 'أسئلة قصيرة' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setSelectedTypeFilter(tab.id);
                setCurrentIdx(0);
                setShowExplanation(false);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedTypeFilter === tab.id
                  ? 'bg-emerald-900 text-white shadow-sm'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Shuffle & Stats Actions */}
        <div className="flex items-center gap-3 shrink-0 justify-between md:justify-end">
          <div className="text-xs text-stone-600 font-bold bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl">
            إجابات صحيحة: <span className="text-emerald-800 font-black">{totalCorrect}</span> من {totalAnswered}
          </div>

          <button
            onClick={handleShuffle}
            className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            title="إعادة خلط وترتيب الأسئلة عشوائياً عند كل محاولة"
          >
            <Shuffle size={14} />
            <span>ترتيب عشوائي 🔀</span>
          </button>
        </div>
      </div>

      {/* Main Question Card */}
      <div className="bg-white rounded-3xl p-6 md:p-10 border border-stone-200/80 shadow-sm space-y-6">
        {/* Question Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-950 text-amber-300">
              السؤال {currentIdx + 1} من {filteredQuestions.length}
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700">
              {getTypeLabel(currentQ.type)}
            </span>
          </div>

          {currentQ.hint && (
            <button
              onClick={() => setShowHint(!showHint)}
              className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              <Lightbulb size={14} className="text-amber-500" />
              <span>{showHint ? 'إخفاء التلميح' : 'تلميح دراسي 💡'}</span>
            </button>
          )}
        </div>

        {/* Hint Box */}
        {showHint && currentQ.hint && (
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start gap-2 animate-in fade-in duration-200">
            <Lightbulb size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block mb-0.5">تلميح توجيهي من المعلم:</span>
              <p className="text-stone-700">{currentQ.hint}</p>
            </div>
          </div>
        )}

        {/* Question Text */}
        <div className="pt-2">
          <h3 className="text-lg md:text-xl font-bold text-stone-900 leading-relaxed font-serif">
            {currentQ.questionText}
          </h3>
        </div>

        {/* Question Form / Options based on Type */}
        <div className="pt-2">
          {/* TYPE A: TRUE OR FALSE */}
          {currentQ.type === 'true_false' && (
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {['صح', 'خطأ'].map((opt) => {
                const isPicked = selectedOption === opt;
                let btnStyle = 'border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800';

                if (showExplanation) {
                  if (opt === currentQ.correctAnswer) {
                    btnStyle = 'border-emerald-600 bg-emerald-50 text-emerald-950 font-black ring-2 ring-emerald-500';
                  } else if (isPicked && opt !== currentQ.correctAnswer) {
                    btnStyle = 'border-rose-500 bg-rose-50 text-rose-950 font-black';
                  }
                } else if (isPicked) {
                  btnStyle = 'border-emerald-700 bg-emerald-100/70 text-emerald-950 font-bold';
                }

                return (
                  <button
                    key={opt}
                    onClick={() => {
                      setSelectedOption(opt);
                      checkAnswer(opt);
                    }}
                    disabled={showExplanation}
                    className={`py-4 rounded-2xl border-2 text-base md:text-lg font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer ${btnStyle}`}
                  >
                    <span>{opt === 'صح' ? 'نعم، صحيحة (True) ✓' : 'لا، خاطئة (False) ✗'}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* TYPE B: MULTIPLE CHOICE */}
          {currentQ.type === 'multiple_choice' && currentQ.options && (
            <div className="space-y-3">
              {currentQ.options.map((opt, oIdx) => {
                const letters = ['أ', 'ب', 'ج', 'د'];
                const letter = letters[oIdx] || `${oIdx + 1}`;
                const isPicked = selectedOption === opt;

                let cardStyle = 'border-stone-200 hover:border-emerald-500 bg-stone-50 hover:bg-white text-stone-800';

                if (showExplanation) {
                  if (opt === currentQ.correctAnswer) {
                    cardStyle = 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-500/40';
                  } else if (isPicked && opt !== currentQ.correctAnswer) {
                    cardStyle = 'border-rose-400 bg-rose-50 text-rose-950';
                  }
                } else if (isPicked) {
                  cardStyle = 'border-emerald-700 bg-emerald-100/60 text-emerald-950 font-bold';
                }

                return (
                  <button
                    key={oIdx}
                    onClick={() => {
                      setSelectedOption(opt);
                      checkAnswer(opt);
                    }}
                    disabled={showExplanation}
                    className={`w-full text-right p-4 rounded-2xl border-2 text-xs md:text-sm transition-all flex items-center gap-3.5 cursor-pointer ${cardStyle}`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-white border border-stone-300 flex items-center justify-center font-black text-xs shrink-0 text-emerald-950">
                      {letter}
                    </div>
                    <span className="flex-1 leading-relaxed">{opt}</span>
                    {showExplanation && opt === currentQ.correctAnswer && (
                      <CheckCircle2 size={20} className="text-emerald-700 shrink-0" />
                    )}
                    {showExplanation && isPicked && opt !== currentQ.correctAnswer && (
                      <XCircle size={20} className="text-rose-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* TYPE C: FILL IN THE BLANK */}
          {currentQ.type === 'fill_blank' && (
            <div className="max-w-xl space-y-3">
              <label className="block text-xs font-bold text-stone-700">
                اكتب الكلمة أو المصطلح العلمي المناسب لإكمال الفراغ:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  disabled={showExplanation}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && textInput.trim() && !showExplanation) {
                      checkAnswer(textInput);
                    }
                  }}
                  placeholder="اكتب الإجابة هنا..."
                  className="flex-1 p-3.5 border-2 border-stone-300 focus:border-emerald-700 rounded-xl text-xs md:text-sm focus:outline-none"
                />
                {!showExplanation && (
                  <button
                    onClick={() => checkAnswer(textInput)}
                    disabled={!textInput.trim()}
                    className="bg-emerald-900 hover:bg-emerald-950 disabled:opacity-50 text-white font-bold px-5 py-3.5 rounded-xl text-xs md:text-sm cursor-pointer"
                  >
                    تحقق من الإجابة
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TYPE D: SHORT ANSWER */}
          {currentQ.type === 'short_answer' && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-stone-700">
                صغ إجابتك العلمية والتعليل باختصار بأسلوبك، ثم قارنها بالإجابة النموذجية:
              </label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={showExplanation}
                placeholder="اكتب التفسير والتعليل العلمي هنا..."
                rows={4}
                className="w-full p-3.5 border-2 border-stone-300 focus:border-emerald-700 rounded-xl text-xs md:text-sm focus:outline-none"
              />
              {!showExplanation && (
                <button
                  onClick={() => checkAnswer(textInput)}
                  disabled={!textInput.trim()}
                  className="bg-emerald-900 hover:bg-emerald-950 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl text-xs md:text-sm cursor-pointer"
                >
                  إرسال الإجابة وعرض التحليل النموذجي
                </button>
              )}
            </div>
          )}
        </div>

        {/* Immediate Step-by-Step Explanation Banner */}
        {showExplanation && (
          <div className="mt-6 pt-6 border-t border-stone-200 space-y-4 animate-in fade-in duration-300">
            {/* Feedback Banner */}
            <div
              className={`p-4 rounded-2xl border flex items-center gap-3 ${
                currentAnswerState?.isCorrect
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50 border-rose-300 text-rose-950'
              }`}
            >
              {currentAnswerState?.isCorrect ? (
                <CheckCircle2 size={24} className="text-emerald-700 shrink-0" />
              ) : (
                <XCircle size={24} className="text-rose-600 shrink-0" />
              )}
              <div>
                <p className="font-extrabold text-sm md:text-base">
                  {currentAnswerState?.isCorrect ? 'أحسنت! إجابة دقيقة وصحيحة 🌟' : 'إجابة غير مكتملة أو غير صحيحة.'}
                </p>
                <p className="text-xs mt-0.5">
                  الإجابة المعتمدة: <span className="font-bold underline">{currentQ.correctAnswer}</span>
                </p>
              </div>
            </div>

            {/* Scientific Breakdown (Step-by-Step Reasoning) */}
            <div className="bg-[#FAF8F5] border border-amber-200/80 rounded-2xl p-5 md:p-6 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-950 uppercase tracking-wider">
                <Sparkles size={16} className="text-amber-600" />
                <span>التفكير العلمي المتسلسل (Step-by-Step Solution):</span>
              </div>

              <p className="text-xs md:text-sm font-bold text-stone-800">
                {currentQ.explanation.conclusion}
              </p>

              <div className="space-y-2 pt-1">
                {currentQ.explanation.steps.map((step, sIdx) => (
                  <div key={sIdx} className="text-xs text-stone-700 flex items-start gap-2 leading-relaxed">
                    <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {sIdx + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>

              {/* Chemical formula if exists */}
              {currentQ.explanation.latexFormula && (
                <div className="mt-3 p-3 bg-white border border-amber-200 rounded-xl text-center font-mono text-xs md:text-sm overflow-x-auto text-emerald-900" dir="ltr">
                  <MathJaxSection content={`$$${currentQ.explanation.latexFormula}$$`} />
                </div>
              )}

              {/* Bilingual terms */}
              {currentQ.explanation.englishTerms && currentQ.explanation.englishTerms.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
                  {currentQ.explanation.englishTerms.map((term, tIdx) => (
                    <span key={tIdx} className="bg-white border border-stone-200 px-2.5 py-1 rounded-lg text-stone-700">
                      <strong>{term.ar}</strong> <span className="text-amber-800">({term.en})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Pagination / Next Question */}
        <div className="pt-6 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSelectQuestion(Math.max(0, currentIdx - 1))}
              disabled={currentIdx === 0}
              className="p-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronRight size={18} />
            </button>

            {filteredQuestions.map((_, qIdx) => {
              const qObj = filteredQuestions[qIdx];
              const qState = qObj ? answeredMap[qObj.id] : undefined;
              let dotColor = 'bg-stone-200 text-stone-600';
              if (qState) {
                dotColor = qState.isCorrect ? 'bg-emerald-600 text-white' : 'bg-rose-500 text-white';
              }
              if (qIdx === currentIdx) {
                dotColor += ' ring-2 ring-amber-500 font-black';
              }

              return (
                <button
                  key={qIdx}
                  onClick={() => handleSelectQuestion(qIdx)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${dotColor}`}
                >
                  {qIdx + 1}
                </button>
              );
            })}

            <button
              onClick={() => handleSelectQuestion(Math.min(filteredQuestions.length - 1, currentIdx + 1))}
              disabled={currentIdx === filteredQuestions.length - 1}
              className="p-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft size={18} />
            </button>
          </div>

          <button
            onClick={onProceedToExam}
            className="bg-emerald-900 hover:bg-emerald-950 text-white font-bold px-5 py-2.5 rounded-xl text-xs md:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <span>جاهز للاختبار النهائي؟ الانتقال للامتحان</span>
            <ArrowLeft size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
