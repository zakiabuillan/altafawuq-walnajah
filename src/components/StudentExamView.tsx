import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  User, 
  Phone, 
  CheckCircle, 
  AlertCircle, 
  BookOpen, 
  GraduationCap, 
  Send, 
  Award,
  ChevronLeft,
  XCircle,
  HelpCircle,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { MathJaxSection } from './MathJaxSection';
import { 
  AutoGradingRule, 
  GradedResultCalculation, 
  fetchAutoGradingRules, 
  matchAutoGradingRule, 
  calculateGradedSubmission, 
  dispatchStudentResultAlert 
} from '../lib/autoGradingEngine';

interface OnlineExam {
  id: string;
  title: string;
  description: string;
  grade: string;
  subject: string;
  category?: string;
  questions: {
    id: string;
    text: string;
    options: string[];
    correctOptionIndex: number;
  }[];
  teacherId: string;
  teacherName: string;
}

interface StudentExamViewProps {
  examId: string;
}

export default function StudentExamView({ examId }: StudentExamViewProps) {
  const [exam, setExam] = useState<OnlineExam | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Auto-Grading Rules
  const [autoGradingRules, setAutoGradingRules] = useState<AutoGradingRule[]>([]);

  // Student Input State
  const [studentName, setStudentName] = useState('');
  const [studentPhone, setStudentPhone] = useState('');
  const [selectedAnswers, setSelectedAnswers] = useState<{ [qIndex: number]: number }>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    score: number;
    correctCount: number;
    total: number;
    gradeCalc?: GradedResultCalculation;
    rule?: AutoGradingRule;
    whatsappUrl?: string;
  } | null>(null);

  useEffect(() => {
    // Load rules
    fetchAutoGradingRules().then(rules => {
      setAutoGradingRules(rules);
    }).catch(console.warn);

    const fetchExam = async () => {
      setLoading(true);
      setError(null);
      try {
        const docRef = doc(db, 'onlineExams', examId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setExam({
            id: docSnap.id,
            title: data.title || '',
            description: data.description || '',
            grade: data.grade || '',
            subject: data.subject || '',
            category: data.category || '',
            questions: data.questions || [],
            teacherId: data.teacherId || '',
            teacherName: data.teacherName || ''
          });
        } else {
          setError('عذراً، هذا الاختبار الإلكتروني غير متوفر أو ربما تم حذفه من قبل الإدارة أو المعلم.');
        }
      } catch (err) {
        console.error('Error loading exam:', err);
        handleFirestoreError(err, OperationType.GET, `onlineExams/${examId}`);
        setError('حدث خطأ فني أثناء تحميل بيانات الاختبار، يرجى التحديث وإعادة المحاولة.');
      } finally {
        setLoading(false);
      }
    };

    if (examId) {
      fetchExam();
    }
  }, [examId]);

  const handleSelectAnswer = (qIndex: number, optionIndex: number) => {
    if (submitted) return; // Prevent changing after submission
    setSelectedAnswers(prev => ({
      ...prev,
      [qIndex]: optionIndex
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exam || submitting || submitted) return;

    // Validation
    if (!studentName.trim() || studentName.trim().split(' ').filter(Boolean).length < 2) {
      alert('الرجاء إدخال اسمك الثنائي الكامل على الأقل.');
      return;
    }
    if (!studentPhone.trim() || studentPhone.trim().length < 8) {
      alert('الرجاء إدخال رقم هاتف هاتف صحيح للتواصل رصد وحفظ النتيجة.');
      return;
    }

    // Check if all questions are answered
    const unansweredIndices: number[] = [];
    exam.questions.forEach((_, idx) => {
      if (selectedAnswers[idx] === undefined) {
        unansweredIndices.push(idx + 1);
      }
    });

    if (unansweredIndices.length > 0) {
      alert(`يرجى الإجابة عن جميع الأسئلة. لم تقم بإجابة الأسئلة التالية: ${unansweredIndices.join('، ')}`);
      return;
    }

    setSubmitting(true);
    try {
      // 1. Pick manager's auto-grading rule
      const matchedRule = matchAutoGradingRule(autoGradingRules, exam.subject);

      // 2. Perform automatic real-time evaluation
      const gradeCalc = calculateGradedSubmission(exam.questions, selectedAnswers, matchedRule);

      // 3. Save submission with rich grading criteria
      const submissionDoc = {
        examId: exam.id,
        examTitle: exam.title,
        category: exam.category || 'مراجعة عامة',
        studentName: studentName.trim(),
        studentPhone: studentPhone.trim(),
        score: gradeCalc.score,
        rawScore: gradeCalc.rawScore,
        correctCount: gradeCalc.correctCount,
        wrongCount: gradeCalc.wrongCount,
        answersCount: exam.questions.length,
        answers: exam.questions.map((_, idx) => selectedAnswers[idx]),
        submittedAt: new Date().toISOString(),
        teacherId: exam.teacherId || '',
        autoGradingRuleId: matchedRule.id,
        ruleName: matchedRule.name,
        penaltyDeducted: gradeCalc.penaltyDeducted,
        bonusAdded: gradeCalc.bonusAdded,
        curveAdded: gradeCalc.curveAdded,
        passed: gradeCalc.passed,
        isExcellence: gradeCalc.isExcellence,
        gradeBand: gradeCalc.gradeBand,
        feedbackNote: gradeCalc.feedbackNote,
        alertDispatched: true
      };

      const docRef = await addDoc(collection(db, 'examResults'), submissionDoc);

      // 4. Dispatch automatic notification to student portal & WhatsApp
      const alertResult = await dispatchStudentResultAlert({
        studentName: studentName.trim(),
        studentPhone: studentPhone.trim(),
        examId: exam.id,
        examTitle: exam.title,
        submissionId: docRef.id,
        gradeCalc,
        rule: matchedRule
      });

      setSubmissionResult({
        score: gradeCalc.score,
        correctCount: gradeCalc.correctCount,
        total: exam.questions.length,
        gradeCalc,
        rule: matchedRule,
        whatsappUrl: alertResult.whatsappUrl
      });
      setSubmitted(true);
    } catch (err: any) {
      console.error('Error submitting exam answers:', err);
      handleFirestoreError(err, OperationType.CREATE, 'examResults');
      alert(`حدث خطأ غير متوقع أثناء إرسال إجابات الامتحان: ${err?.message || err}. الرجاء المحاولة مرة أخرى.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl max-w-sm w-full text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <span className="text-xs font-black text-slate-800 block">جاري تحميل الاختبار التفاعلي...</span>
          <p className="text-[10px] text-slate-400 font-bold">بوابة التفوق الأكاديمي، نحضر البيانات الأكاديمية وصياغة الأسئلة</p>
        </div>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
            <XCircle size={28} />
          </div>
          <h3 className="text-sm font-black text-slate-800">تنبيه: تعذر الوصول للاختبار</h3>
          <p className="text-xs font-bold text-slate-500 leading-relaxed">{error || 'الاختبار المطلوب لم يعد متوفراً.'}</p>
          <div className="pt-2">
            <button 
              onClick={() => window.location.href = window.location.origin}
              className="px-5 py-2 bg-slate-900 text-white hover:bg-slate-800 text-[11px] font-black rounded-xl cursor-pointer"
            >
              الذهاب للرئيسية 🏠
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Top Header Branding Block */}
        <div className="bg-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-md flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-lg shadow-indigo-600/10">
              🎓
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight leading-tight">أكاديمية التفوق أونلاين</h1>
              <p className="text-[11px] text-emerald-400 font-extrabold mt-1">📞 التواصل: 0509329568</p>
              <p className="text-[9px] text-slate-400 font-bold mt-0.5">بوابة الاختبارات الأكاديمية والامتحانات الرسمية التفاعلية</p>
            </div>
          </div>
          <div className="text-left text-[10px] font-bold text-slate-400 font-mono">
            STUDENT EXAMINATION PORTAL
          </div>
        </div>

        {/* Success Screen (Graded result view) */}
        {submitted && submissionResult && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
            <div className="text-center space-y-3 pb-6 border-b border-slate-100">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle size={32} className="animate-bounce" />
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">أحسنت! تم رصد وتصحيح اختبارك تلقائياً بنجاح 🎉</h2>
              <p className="text-xs text-slate-500 font-bold max-w-md mx-auto">
                تم احتساب الدرجة تلقائياً بناءً على قواعد التقييم المعتمدة من إدارة الأكاديمية وإرسال تنبيه بالنتيجة لحسابك.
              </p>

              {/* Scorecard with rule breakdown */}
              <div className="mt-4 p-5 rounded-3xl bg-slate-50 border border-slate-200/80 max-w-md mx-auto space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-[#0D365A]">
                    {submissionResult.score}%
                  </span>
                  <div className="text-left">
                    <span className={`text-xs font-black px-3 py-1 rounded-full border ${
                      submissionResult.gradeCalc?.passed
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}>
                      {submissionResult.gradeCalc?.gradeBand.label || (submissionResult.score >= 60 ? 'اجتياز معتمد 🏆' : 'يحتاج مراجعة 🔴')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                      {submissionResult.correctCount} صحيحة من {submissionResult.total}
                    </span>
                  </div>
                </div>

                {submissionResult.gradeCalc?.feedbackNote && (
                  <div className="p-3 bg-white rounded-2xl border border-slate-200/70 text-right text-xs text-slate-700 font-medium leading-relaxed">
                    💡 <span className="font-bold">ملاحظة التقييم: </span>{submissionResult.gradeCalc.feedbackNote}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 pt-2 border-t border-slate-200/60 font-bold">
                  <span>القاعدة المطبقة: {submissionResult.rule?.name || 'القاعدة المعيارية'}</span>
                  {submissionResult.gradeCalc?.penaltyDeducted ? (
                    <span className="text-rose-600">خصم خطأ: -{submissionResult.gradeCalc.penaltyDeducted}</span>
                  ) : null}
                  {submissionResult.gradeCalc?.bonusAdded ? (
                    <span className="text-amber-600">بونص: +{submissionResult.gradeCalc.bonusAdded}</span>
                  ) : null}
                </div>

                {/* WhatsApp Alert Direct Trigger */}
                {submissionResult.whatsappUrl && (
                  <div className="pt-2">
                    <a
                      href={submissionResult.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <span>إرسال تقرير النتيجة إلى واتساب 📱</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Comprehensive pedagogical feedback loop */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                <Award size={14} className="text-indigo-600" />
                <span>مراجعة وتصحيح تفصيلي لإجاباتك:</span>
              </h3>

              <div className="space-y-4">
                {exam.questions.map((q, idx) => {
                  const studentAnswerIdx = selectedAnswers[idx];
                  const isCorrectSubmit = studentAnswerIdx === q.correctOptionIndex;

                  return (
                    <div key={q.id} className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/20">
                      <div className="flex justify-between items-start gap-3">
                        <h4 className="text-xs font-black text-slate-900 leading-relaxed" style={{ unicodeBidi: 'plaintext' }}>
                          <span className="text-slate-400 inline-block ml-1">س{idx + 1}:</span>
                          <MathJaxSection as="span" className="inline">{q.text}</MathJaxSection>
                        </h4>
                        
                        {isCorrectSubmit ? (
                          <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 border border-emerald-100 rounded-full flex items-center gap-1 shrink-0">
                            <CheckCircle2 size={11} />
                            <span>صح</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-black bg-rose-50 text-rose-700 px-2 py-0.5 border border-rose-100 rounded-full flex items-center gap-1 shrink-0">
                            <XCircle size={11} />
                            <span>خطأ</span>
                          </span>
                        )}
                      </div>

                      {/* Options rendering with student vs model key */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {q.options.map((opt, optIdx) => {
                          const isStudentSelected = optIdx === studentAnswerIdx;
                          const isTheModelAnswer = optIdx === q.correctOptionIndex;

                          let styleClass = "border-slate-150 bg-white text-slate-700";
                          let indicator = null;

                          if (isTheModelAnswer) {
                            styleClass = "border-emerald-300 bg-emerald-500/5 text-emerald-800 font-extrabold";
                            indicator = <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-black">الإجابة الصحيحة ✔️</span>;
                          } else if (isStudentSelected && !isCorrectSubmit) {
                            styleClass = "border-rose-300 bg-rose-500/5 text-rose-800";
                            indicator = <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-black">إجابتك ❌</span>;
                          }

                          return (
                            <div 
                              key={optIdx} 
                              className={`p-2.5 px-3 rounded-xl border text-[11px] flex justify-between items-center transition-colors ${styleClass}`}
                            >
                              <span className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-slate-400 w-4 h-4 rounded-full bg-slate-100/80 border border-slate-200 flex items-center justify-center shrink-0">
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <MathJaxSection as="span" className="inline">{opt}</MathJaxSection>
                              </span>
                              {indicator}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 text-center">
              <p className="text-[10px] text-slate-400 font-bold mb-3">يمكنك إغلاق هذه الصفحة الآن أو حفظ لقطة شاشة لعلامتك!</p>
              <button 
                onClick={() => window.location.href = window.location.origin}
                className="px-6 py-2.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-black rounded-xl cursor-pointer transition-all shadow-sm"
              >
                الذهاب للموقع الرئيسي 🏠
              </button>
            </div>
          </div>
        )}

        {/* Regular Exam Solver Interface */}
        {!submitted && (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Exam metadata card */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="bg-indigo-900 text-white p-4 rounded-2xl text-center shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-850 rounded-full blur-xl opacity-50 -mr-6 -mt-6"></div>
                <h3 className="text-sm font-black relative z-10">أكاديمية التفوق أونلاين</h3>
                <p className="text-[11px] font-black text-indigo-200 mt-1 relative z-10">📞 التواصل: 0509329568</p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-black">
                    {exam.subject}
                  </span>
                  <h2 className="text-sm font-black text-slate-900 mt-1">{exam.title}</h2>
                </div>
                <div className="text-right sm:text-left">
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded block font-bold">
                    {exam.grade}
                  </span>
                  <span className="text-[9px] text-[#D4A33C] font-black block mt-1.5">
                     تحت إشراف المعلم: {exam.teacherName} 👑
                  </span>
                </div>
              </div>

              {exam.description && (
                <p className="text-xs text-slate-500 font-bold leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                  ⚠️ تعليمات هامة: {exam.description}
                </p>
              )}

              <div className="flex items-center gap-4 text-slate-400 text-[10px] font-bold">
                <span className="flex items-center gap-1">
                  <BookOpen size={12} className="text-slate-400" />
                  <span>عدد الأسئلة الإجمالي: {exam.questions.length} أسئلة</span>
                </span>
                <span className="flex items-center gap-1">
                  <Award size={12} className="text-slate-400" />
                  <span>طريقة التقديم: اختيار من متعدد تفاعلي</span>
                </span>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-5">
              {exam.questions.map((q, idx) => {
                const stepCount = idx + 1;
                const activeOption = selectedAnswers[idx];

                return (
                  <div key={q.id} className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                      <span className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-700 font-mono text-[10px] font-black flex items-center justify-center">
                        {stepCount}
                      </span>
                      <h3 className="text-xs font-black text-slate-800" style={{ unicodeBidi: 'plaintext' }}>
                        <MathJaxSection as="span" className="inline">{q.text}</MathJaxSection>
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir="rtl">
                      {q.options.map((option, optIdx) => {
                        const isSelected = activeOption === optIdx;

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleSelectAnswer(idx, optIdx)}
                            className={`p-3.5 px-4 rounded-2xl border text-right text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected 
                                ? 'bg-indigo-600/5 border-indigo-505 text-indigo-700 shadow-sm shadow-indigo-650/5 ring-1 ring-indigo-500/20' 
                                : 'bg-white border-slate-200 hover:border-slate-350 text-slate-700 hover:bg-slate-50/50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-5 h-5 rounded-full border text-[10px] font-black flex items-center justify-center shrink-0 ${
                                isSelected 
                                  ? 'bg-indigo-600 text-white border-indigo-600' 
                                  : 'bg-slate-50 border-slate-200 text-slate-400'
                              }`}>
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <MathJaxSection as="span" className="inline">{option}</MathJaxSection>
                            </div>
                            
                            {/* Radio custom checkmark */}
                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-indigo-600' : 'border-slate-300'
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Student Registration Form Block */}
            <div className="bg-white p-6 rounded-3xl border-2 border-indigo-500/20 shadow-md space-y-4">
              <div className="border-b border-indigo-50 pb-2 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-700 flex items-center justify-center text-xs">🎓</span>
                <h3 className="text-xs font-black text-slate-800">بيانات الطالب وتأكيد إرسال الإجابات</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 flex items-center gap-1">
                    <User size={13} className="text-slate-400" />
                    <span>اسم الطالب الثنائي/الرباعي *</span>
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="مثال: يوسف محمود علان"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 bg-[#FAFAFA]/70 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-slate-700 flex items-center gap-1">
                    <Phone size={13} className="text-slate-400" />
                    <span>رقم الهاتف المعتمد *</span>
                  </label>
                  <input 
                    type="tel"
                    required
                    placeholder="مثال: 0599123456"
                    value={studentPhone}
                    onChange={(e) => setStudentPhone(e.target.value)}
                    className="w-full text-xs font-bold px-3 py-2.5 border border-slate-200 rounded-xl focus:border-indigo-500 bg-[#FAFAFA]/70 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Submit button bar */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting || submitted}
                className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-98 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>جاري تصحيح وإرسال إجاباتك الأكاديمية...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>إرسال الإجابات وتسليم الاختبار ✔️</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
}
