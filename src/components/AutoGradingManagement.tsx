import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Settings2, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  RefreshCw, 
  Plus, 
  Edit3, 
  Trash2, 
  ShieldCheck, 
  Bell, 
  Sparkles, 
  BookOpen, 
  FileCheck2, 
  TrendingUp, 
  Percent, 
  MessageSquare, 
  Smartphone, 
  Info, 
  ArrowLeft,
  X,
  User,
  Calendar,
  Check,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, getDocs, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  AutoGradingRule, 
  DEFAULT_GRADE_BANDS, 
  INITIAL_AUTO_GRADING_RULES, 
  fetchAutoGradingRules, 
  saveAutoGradingRule, 
  setDefaultAutoGradingRule, 
  deleteAutoGradingRule, 
  calculateGradedSubmission, 
  dispatchStudentResultAlert,
  buildWhatsAppResultMessage
} from '../lib/autoGradingEngine';

export const AutoGradingManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rules' | 'submissions' | 'logs'>('rules');
  const [rules, setRules] = useState<AutoGradingRule[]>(INITIAL_AUTO_GRADING_RULES);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [alertLogs, setAlertLogs] = useState<any[]>([]);
  const [loadingRules, setLoadingRules] = useState<boolean>(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState<boolean>(true);

  // Search & Filters
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [selectedRuleFilter, setSelectedRuleFilter] = useState<string>('all');

  // Rule Editor Modal State
  const [editingRule, setEditingRule] = useState<AutoGradingRule | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Fetch rules on mount and listen to Firestore
  useEffect(() => {
    let unsubscribe: () => void = () => {};
    const initRules = async () => {
      setLoadingRules(true);
      try {
        const colRef = collection(db, 'auto_grading_rules');
        unsubscribe = onSnapshot(colRef, (snap) => {
          if (!snap.empty) {
            const list: AutoGradingRule[] = [];
            snap.forEach(d => list.push({ id: d.id, ...d.data() } as AutoGradingRule));
            list.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
            setRules(list);
          } else {
            // Seed initial rules if empty
            INITIAL_AUTO_GRADING_RULES.forEach(r => {
              setDoc(doc(db, 'auto_grading_rules', r.id), r).catch(console.warn);
            });
            setRules(INITIAL_AUTO_GRADING_RULES);
          }
          setLoadingRules(false);
        }, (err) => {
          console.warn("Error listening to auto_grading_rules:", err);
          fetchAutoGradingRules().then(setRules).finally(() => setLoadingRules(false));
        });
      } catch (e) {
        fetchAutoGradingRules().then(setRules).finally(() => setLoadingRules(false));
      }
    };
    initRules();
    return () => unsubscribe();
  }, []);

  // 2. Listen to exam submissions in real-time
  useEffect(() => {
    setLoadingSubmissions(true);
    try {
      const colRef = collection(db, 'examResults');
      const unsubscribe = onSnapshot(colRef, (snap) => {
        const list: any[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() });
        });
        list.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
        setSubmissions(list);
        setLoadingSubmissions(false);
      }, (err) => {
        console.warn("Error listening to examResults:", err);
        setLoadingSubmissions(false);
      });
      return () => unsubscribe();
    } catch (e) {
      setLoadingSubmissions(false);
    }
  }, []);

  // 3. Listen to exam alert logs
  useEffect(() => {
    try {
      const colRef = collection(db, 'exam_alerts');
      const unsubscribe = onSnapshot(colRef, (snap) => {
        const list: any[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() });
        });
        list.sort((a, b) => (b.sentAt || '').localeCompare(a.sentAt || ''));
        setAlertLogs(list);
      }, (err) => {
        console.warn("Error listening to exam_alerts:", err);
      });
      return () => unsubscribe();
    } catch (e) {
      // ignore
    }
  }, []);

  // Actions
  const handleSetDefault = async (ruleId: string) => {
    try {
      await setDefaultAutoGradingRule(ruleId);
      showToast('تم تعيين القاعدة كقاعدة تصحيح معتمدة وتطبيقها تلقائياً! 🎯');
    } catch (e) {
      showToast('حدث خطأ أثناء ضبط القاعدة الافتراضية.');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (rules.length <= 1) {
      alert('لا يمكن حذف آخر قاعدة تصحيح باقية في النظام.');
      return;
    }
    if (window.confirm('هل أنت متأكد من رغبتك في حذف قاعدة التصحيح هذه؟')) {
      await deleteAutoGradingRule(ruleId);
      showToast('تم حذف قاعدة التصحيح بنجاح.');
    }
  };

  const handleOpenNewRuleModal = () => {
    const newRule: AutoGradingRule = {
      id: `rule-${Date.now()}`,
      name: 'قاعدة تصحيح مخصصة جديدة',
      description: 'قواعد تصحيح واحتساب درجات مخصصة وضوابط إشعار للطلاب.',
      subjectScope: 'all',
      scoringModel: 'equal',
      maxScore: 100,
      easyPoints: 10,
      mediumPoints: 10,
      hardPoints: 10,
      penaltyPerWrongAnswer: 0,
      allowNegativeTotal: false,
      bonusPoints: 0,
      curvePercent: 0,
      passThreshold: 60,
      excellenceThreshold: 85,
      allowRetakeBelow: 55,
      gradeBands: DEFAULT_GRADE_BANDS,
      autoAlertStudent: true,
      autoAlertParent: true,
      notifyViaStudentPortal: true,
      notifyViaWhatsApp: true,
      whatsappTemplate: 'مرحباً {studentName}، نبارك لك إتمام اختبار "{examTitle}" في أكاديمية التفوق. درجتك المعتمدة هي {score}% ({gradeLabel}).',
      portalAlertTitle: '🎉 صدرت نتيجة اختبارك في {examTitle}',
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setEditingRule(newRule);
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    if (!editingRule.name.trim()) {
      alert('يرجى تحديد اسم لقاعدة التصحيح.');
      return;
    }

    try {
      await saveAutoGradingRule(editingRule);
      setIsRuleModalOpen(false);
      setEditingRule(null);
      showToast('تم حفظ وضبط قاعدة التصحيح التلقائي بنجاح! 💾');
    } catch (err) {
      console.error(err);
      showToast('فشل حفظ القاعدة. يرجى إعادة المحاولة.');
    }
  };

  // Re-grade submission using a specific rule
  const handleRegradeSubmission = async (submission: any, targetRule: AutoGradingRule) => {
    try {
      // Re-calculate using submission answers
      const mockQuestions = (submission.answers || []).map((ans: any, idx: number) => ({
        correctOptionIndex: ans, // If not present, default
        difficulty: 'medium'
      }));

      // If we have actual questions in submission, calculate directly
      let correct = submission.correctCount ?? 0;
      let total = submission.answersCount || (submission.answers ? submission.answers.length : 1);
      if (total === 0) total = 1;

      // Calculate new score based on rule parameters
      let rawScorePercent = (correct / total) * targetRule.maxScore;
      let wrongCount = total - correct;
      let penalty = targetRule.penaltyPerWrongAnswer * (targetRule.maxScore / total) * wrongCount;
      let netScore = rawScorePercent - penalty;
      if (!targetRule.allowNegativeTotal && netScore < 0) netScore = 0;
      netScore += targetRule.bonusPoints;
      netScore += (netScore * (targetRule.curvePercent / 100));
      let finalScore = Math.min(targetRule.maxScore, Math.max(0, Math.round(netScore)));

      const bands = targetRule.gradeBands || DEFAULT_GRADE_BANDS;
      let matchedBand = bands.find(b => finalScore >= b.min && finalScore <= b.max) || bands[bands.length - 1];

      await updateDoc(doc(db, 'examResults', submission.id), {
        score: finalScore,
        autoGradingRuleId: targetRule.id,
        ruleName: targetRule.name,
        rawScore: Math.round(rawScorePercent),
        penaltyDeducted: Math.round(penalty * 10) / 10,
        bonusAdded: targetRule.bonusPoints,
        gradeBand: matchedBand,
        passed: finalScore >= targetRule.passThreshold,
        regradedAt: new Date().toISOString()
      });

      showToast(`تمت إعادة تصحيح الاختبار للطالب (${submission.studentName}) بنجاح! الدرجة الجديدة: ${finalScore}% ✨`);
    } catch (e: any) {
      console.error("Error regrading:", e);
      showToast('تعذر إعادة التصحيح التلقائي. تأكد من توفر بيانات الاختبار.');
    }
  };

  // Send WhatsApp or Portal Alert
  const handleSendAlert = async (submission: any) => {
    const activeRule = rules.find(r => r.id === submission.autoGradingRuleId) || 
                       rules.find(r => r.isDefault) || 
                       rules[0];

    const gradeCalc: any = {
      score: submission.score,
      gradeBand: submission.gradeBand || {
        label: submission.score >= 60 ? 'ناجح' : 'يحتاج مراجعة',
        badge: submission.score >= 85 ? 'امتياز' : 'اجتياز'
      },
      feedbackNote: submission.gradeBand?.feedback || 'تم رصد النتيجة بنجاح في سجلات الأكاديمية.',
      passed: submission.score >= (activeRule.passThreshold || 60)
    };

    const res = await dispatchStudentResultAlert({
      studentName: submission.studentName || 'الطالب',
      studentPhone: submission.studentPhone || '',
      examId: submission.examId || '',
      examTitle: submission.examTitle || 'اختبار إلكتروني',
      submissionId: submission.id,
      gradeCalc,
      rule: activeRule
    });

    if (res.whatsappUrl) {
      window.open(res.whatsappUrl, '_blank');
      showToast('تم تسجيل التنبيه وفتح نافذة واتساب لإرسال الإشعار للطالب! 📱');
    } else {
      showToast('تم إرسال وحفظ التنبيه في البوابة التعليمية للطالب بنجاح! 🔔');
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    const matchSearch = (s.studentName || '').toLowerCase().includes(submissionSearch.toLowerCase()) ||
                        (s.examTitle || '').toLowerCase().includes(submissionSearch.toLowerCase()) ||
                        (s.studentPhone || '').includes(submissionSearch);
    if (!matchSearch) return false;
    if (selectedRuleFilter !== 'all' && s.autoGradingRuleId !== selectedRuleFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white border border-amber-500/50 px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-bold backdrop-blur-md"
          >
            <Sparkles className="text-amber-400 shrink-0" size={18} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0D365A] via-[#114674] to-[#0D365A] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-white/10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/20 text-amber-300 rounded-full text-xs font-black border border-amber-400/30">
              <Award size={14} />
              <span>نظام إدارة التصحيح التلقائي والتنبيهات المباشرة 🎓⚡</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              قواعد التصحيح التلقائي ورصد الدرجات وإشعارات النتائج
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 max-w-2xl leading-relaxed font-medium">
              يتيح لمدير الأكاديمية ضبط وتعيين معايير التصحيح التلقائي للاختبارات (الأوزان، خصم التخمين، كيرف الدعم، ونسب النجاح والامتياز)، مع إرسال إشعارات فورية مباشرة للطالب عبر بوابة الطالب وتطبيق واتساب فور اعتماد النتيجة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleOpenNewRuleModal}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus size={16} />
              <span>إنشاء قاعدة تصحيح جديدة</span>
            </button>
          </div>
        </div>

        {/* Quick Tabs Bar */}
        <div className="flex items-center gap-2 pt-6 border-t border-white/10 mt-6 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-white text-slate-900 shadow-md font-bold'
                : 'bg-white/10 text-white/80 hover:bg-white/15 hover:text-white'
            }`}
          >
            <Sliders size={15} />
            <span>قواعد التصحيح المعتمدة ({rules.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'submissions'
                ? 'bg-white text-slate-900 shadow-md font-bold'
                : 'bg-white/10 text-white/80 hover:bg-white/15 hover:text-white'
            }`}
          >
            <FileCheck2 size={15} />
            <span>سجل نتائج الطلاب والتصحيح التلقائي ({submissions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-white text-slate-900 shadow-md font-bold'
                : 'bg-white/10 text-white/80 hover:bg-white/15 hover:text-white'
            }`}
          >
            <Bell size={15} />
            <span>سجل التنبيهات الصادرة ({alertLogs.length})</span>
          </button>
        </div>
      </div>

      {/* -------------------- TAB 1: RULES MANAGEMENT -------------------- */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-base font-black text-slate-900">قواعد التقييم المسبقة والنشطة في الأكاديمية</h2>
              <p className="text-xs text-slate-500 font-medium">اختر القاعدة الافتراضية ليتم تطبيقها تلقائياً على كافة الاختبارات الإلكترونية المقدمة من الطلاب</p>
            </div>
            <div className="text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              القاعدة المعتمدة حالياً: <span className="text-[#0D365A] font-black">{rules.find(r => r.isDefault)?.name || rules[0]?.name}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {rules.map((rule) => {
              const isDefault = rule.isDefault;
              return (
                <div
                  key={rule.id}
                  className={`bg-white rounded-3xl p-6 border transition-all duration-300 relative flex flex-col justify-between ${
                    isDefault 
                      ? 'border-amber-400 shadow-xl shadow-amber-500/5 ring-2 ring-amber-400/20' 
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-black text-slate-900">{rule.name}</h3>
                          {isDefault && (
                            <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 flex items-center gap-1 shadow-xs">
                              <CheckCircle2 size={12} />
                              <span>القاعدة الافتراضية المعتمدة</span>
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            {rule.subjectScope === 'all' ? 'لكافة المواد' : `مخصصة لمادة: ${rule.subjectScope}`}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">{rule.description}</p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingRule(rule);
                            setIsRuleModalOpen(true);
                          }}
                          className="p-2 text-slate-500 hover:text-[#0D365A] hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                          title="تعديل تفاصيل القاعدة"
                        >
                          <Edit3 size={15} />
                        </button>
                        {!isDefault && (
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="حذف القاعدة"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Technical Parameter Chips */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-center">
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                        <span className="text-[10px] text-slate-400 font-bold block">نسبة النجاح</span>
                        <span className="text-xs font-black text-emerald-700">{rule.passThreshold}%</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                        <span className="text-[10px] text-slate-400 font-bold block">حد الامتياز</span>
                        <span className="text-xs font-black text-blue-700">{rule.excellenceThreshold}%</span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                        <span className="text-[10px] text-slate-400 font-bold block">خصم الخطأ (تخمين)</span>
                        <span className="text-xs font-black text-rose-600">
                          {rule.penaltyPerWrongAnswer > 0 ? `-${rule.penaltyPerWrongAnswer} درجة` : 'لا يوجد خصم'}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                        <span className="text-[10px] text-slate-400 font-bold block">كيرف / بونص</span>
                        <span className="text-xs font-black text-amber-600">
                          {rule.bonusPoints > 0 ? `+${rule.bonusPoints} بونص` : ''} {rule.curvePercent > 0 ? `+${rule.curvePercent}% كيرف` : (rule.bonusPoints === 0 ? 'معياري' : '')}
                        </span>
                      </div>
                    </div>

                    {/* Notification Capabilities */}
                    <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-150 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-black text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <Bell size={13} className="text-[#0D365A]" />
                          <span>قنوات الإشعار والتنبيه التلقائي:</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rule.notifyViaStudentPortal ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            بوابة الطالب {rule.notifyViaStudentPortal ? '✓' : '✕'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            rule.notifyViaWhatsApp ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            واتساب {rule.notifyViaWhatsApp ? '✓' : '✕'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono line-clamp-2 bg-white p-2 rounded-lg border border-slate-200/70">
                        {rule.whatsappTemplate}
                      </p>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    {!isDefault ? (
                      <button
                        onClick={() => handleSetDefault(rule.id)}
                        className="px-4 py-2 bg-[#0D365A] hover:bg-[#114674] text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                      >
                        <Check size={14} />
                        <span>تعيين كقاعدة معتمدة للاختبارات</span>
                      </button>
                    ) : (
                      <span className="text-xs font-black text-amber-700 flex items-center gap-1">
                        <ShieldCheck size={16} />
                        <span>مفعّلة كقاعدة أساسية عامة</span>
                      </span>
                    )}

                    <button
                      onClick={() => {
                        setEditingRule(rule);
                        setIsRuleModalOpen(true);
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      تعديل الإعدادات ⚙️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* -------------------- TAB 2: LIVE SUBMISSIONS & AUTO-GRADING -------------------- */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="ابحث باسم الطالب، عنوان الاختبار، أو رقم الهاتف..."
                value={submissionSearch}
                onChange={e => setSubmissionSearch(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0D365A]"
              />
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedRuleFilter}
                onChange={e => setSelectedRuleFilter(e.target.value)}
                className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="all">كافة القواعد المطبقة</option>
                {rules.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Submissions Table / Cards */}
          {loadingSubmissions ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
              <RefreshCw size={24} className="animate-spin mx-auto text-[#0D365A] mb-2" />
              <p className="text-xs text-slate-500 font-bold">جاري تحميل سجل نتائج الاختبارات والتصحيح...</p>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
              <FileCheck2 size={40} className="mx-auto text-slate-300" />
              <h3 className="text-sm font-black text-slate-800">لا توجد تسليمات اختبارات مطابقة</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                عندما يكمل الطلاب اختباراتهم الإلكترونية، ستظهر درجاتهم المحسوبة تلقائياً هنا مع إمكانية إعادة التقييم وإرسال إشعارات مباشرة.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-black">
                    <tr>
                      <th className="py-3.5 px-4">الطالب</th>
                      <th className="py-3.5 px-4">الاختبار المسلم</th>
                      <th className="py-3.5 px-4">الدرجة المحسوبة</th>
                      <th className="py-3.5 px-4">قاعدة التصحيح</th>
                      <th className="py-3.5 px-4">الحالة والتقدير</th>
                      <th className="py-3.5 px-4">تاريخ التسليم</th>
                      <th className="py-3.5 px-4 text-center">إجراءات وإشعار</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubmissions.map((sub) => {
                      const appliedRule = rules.find(r => r.id === sub.autoGradingRuleId) || rules.find(r => r.isDefault) || rules[0];
                      const isPassing = (sub.score ?? 0) >= (appliedRule.passThreshold || 60);

                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-black text-slate-900">{sub.studentName || 'طالب غير محدد'}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{sub.studentPhone || 'بدون هاتف'}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800">{sub.examTitle || 'اختبار إلكتروني'}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              صحيح: {sub.correctCount ?? 0} من {sub.answersCount || sub.answers?.length || 0}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-base font-black ${isPassing ? 'text-emerald-700' : 'text-rose-600'}`}>
                                {sub.score ?? 0}%
                              </span>
                              {sub.rawScore !== undefined && sub.rawScore !== sub.score && (
                                <span className="text-[10px] text-slate-400 line-through">
                                  ({sub.rawScore}%)
                                </span>
                              )}
                            </div>
                            {sub.penaltyDeducted > 0 && (
                              <span className="text-[9px] text-rose-500 font-bold block">خصم -{sub.penaltyDeducted}</span>
                            )}
                            {sub.bonusAdded > 0 && (
                              <span className="text-[9px] text-amber-600 font-bold block">بونص +{sub.bonusAdded}</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200">
                              {sub.ruleName || appliedRule.name}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border ${
                              isPassing 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                : 'bg-rose-50 text-rose-800 border-rose-200'
                            }`}>
                              {isPassing ? 'اجتياز معتمد ✓' : 'دون مستوى الاجتياز ✕'}
                            </span>
                            {sub.gradeBand?.label && (
                              <div className="text-[9px] text-slate-500 font-bold mt-1">
                                {sub.gradeBand.label}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 text-[11px] font-medium whitespace-nowrap">
                            {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('ar-EG', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) : 'غير محدد'}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Send Alert Button */}
                              <button
                                onClick={() => handleSendAlert(sub)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                                title="إرسال تنبيه فوري للطالب بالنتيجة عبر واتساب وبوابة الطالب"
                              >
                                <Send size={11} />
                                <span>إرسال تنبيه</span>
                              </button>

                              {/* Re-calculate with another rule */}
                              <button
                                onClick={() => {
                                  const target = prompt(`اختر رقم القاعدة لإعادة التصحيح:\n` + rules.map((r, i) => `${i + 1}. ${r.name}`).join('\n'));
                                  if (target) {
                                    const idx = parseInt(target, 10) - 1;
                                    if (rules[idx]) {
                                      handleRegradeSubmission(sub, rules[idx]);
                                    }
                                  }
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                title="إعادة التصحيح التلقائي بقاعدة أخرى"
                              >
                                <RefreshCw size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------- TAB 3: DISPATCHED ALERTS LOG -------------------- */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900">سجل الإشعارات والتنبيهات الموجهة للطلاب</h2>
              <p className="text-xs text-slate-500 font-medium">سجل زمني لجميع تنبيهات نتائج الاختبارات التي تم إصدارها وإرسالها للطلاب</p>
            </div>
            <span className="text-xs font-black bg-blue-50 text-blue-800 px-3 py-1 rounded-full border border-blue-200">
              إجمالي التنبيهات: {alertLogs.length}
            </span>
          </div>

          {alertLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Bell size={36} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold">لم يتم تسجيل تنبيهات نتائج بعد في هذا السجل.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alertLogs.map((log) => (
                <div key={log.id} className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900">{log.studentName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({log.studentPhone || 'رقم غير مسجل'})</span>
                      <span className="text-[10px] font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                        الدرجة: {log.score}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      الاختبار: <span className="font-bold text-slate-700">{log.examTitle}</span> • تم التطبيق وفق: <span className="font-bold text-slate-700">{log.ruleName}</span>
                    </p>
                  </div>

                  <div className="text-left shrink-0">
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {log.sentAt ? new Date(log.sentAt).toLocaleString('ar-EG') : 'غير محدد'}
                    </span>
                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      تم الإرسال بنجاح ✓
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* -------------------- RULE EDITOR MODAL -------------------- */}
      <AnimatePresence>
        {isRuleModalOpen && editingRule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto text-right p-6 sm:p-8 space-y-6"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <Sliders size={20} />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900">
                      إعداد وتعديل قاعدة التصحيح التلقائي
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      تحديد معايير الحساب الدقيق والدرجات والخصومات وصيغ التنبيهات
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsRuleModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSaveRule} className="space-y-5">
                {/* Rule Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-black text-slate-800">اسم قاعدة التصحيح <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={editingRule.name}
                      onChange={e => setEditingRule({ ...editingRule, name: e.target.value })}
                      placeholder="مثال: قاعدة بجروت الكيمياء المعيارية (نموذج 037381)"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0D365A]"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-black text-slate-800">وصف القاعدة والهدف منها</label>
                    <input
                      type="text"
                      value={editingRule.description}
                      onChange={e => setEditingRule({ ...editingRule, description: e.target.value })}
                      placeholder="مثال: توزيع الدرجات متكافئ بنسبة 100% مع بونص تشجيعي وإرسال إشعار فوري."
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0D365A]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-800">نطاق المادة الدراسية</label>
                    <input
                      type="text"
                      value={editingRule.subjectScope}
                      onChange={e => setEditingRule({ ...editingRule, subjectScope: e.target.value })}
                      placeholder="all أو اسم مادة مثل: كيمياء / بيولوجيا"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#0D365A]"
                    />
                    <span className="text-[10px] text-slate-400 block font-bold">ضع "all" لتشمل كافة المواد</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-800">نموذج احتساب الدرجات</label>
                    <select
                      value={editingRule.scoringModel}
                      onChange={e => setEditingRule({ ...editingRule, scoringModel: e.target.value as any })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                    >
                      <option value="equal">متكافئ (توزيع متساوٍ لجميع الأسئلة)</option>
                      <option value="difficulty_weighted">مرجح بصعوبة الأسئلة (سهل/متوسط/صعب)</option>
                    </select>
                  </div>
                </div>

                {/* Quantitative Parameters */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Sliders size={14} className="text-[#0D365A]" />
                    <span>المعايير الرقمية ونسب الاجتياز والتعديل</span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">الدرجة العظمى</label>
                      <input
                        type="number"
                        min="10"
                        max="1000"
                        value={editingRule.maxScore}
                        onChange={e => setEditingRule({ ...editingRule, maxScore: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">نسبة النجاح (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editingRule.passThreshold}
                        onChange={e => setEditingRule({ ...editingRule, passThreshold: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">حد الامتياز (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editingRule.excellenceThreshold}
                        onChange={e => setEditingRule({ ...editingRule, excellenceThreshold: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">خصم الخطأ (تخمين)</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        max="1"
                        value={editingRule.penaltyPerWrongAnswer}
                        onChange={e => setEditingRule({ ...editingRule, penaltyPerWrongAnswer: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-rose-600"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">بونص إضافي (نقاط)</label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={editingRule.bonusPoints}
                        onChange={e => setEditingRule({ ...editingRule, bonusPoints: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-amber-700"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">كيرف الدعم (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        value={editingRule.curvePercent}
                        onChange={e => setEditingRule({ ...editingRule, curvePercent: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-blue-700"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">حد الإعادة المسموح</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={editingRule.allowRetakeBelow}
                        onChange={e => setEditingRule({ ...editingRule, allowRetakeBelow: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-900"
                      />
                    </div>
                  </div>
                </div>

                {/* Notifications & Alert Settings */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Smartphone size={14} className="text-[#0D365A]" />
                    <span>إعدادات الإشعار التلقائي للطالب والواتساب</span>
                  </h4>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-800">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingRule.notifyViaStudentPortal}
                        onChange={e => setEditingRule({ ...editingRule, notifyViaStudentPortal: e.target.checked })}
                        className="w-4 h-4 text-[#0D365A] rounded"
                      />
                      <span>إرسال إشعار فوري لبوابة الطالب</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingRule.notifyViaWhatsApp}
                        onChange={e => setEditingRule({ ...editingRule, notifyViaWhatsApp: e.target.checked })}
                        className="w-4 h-4 text-[#0D365A] rounded"
                      />
                      <span>تجهيز وإرسال تنبيه واتساب فوري</span>
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-700">قالب رسالة الواتساب للطالب</label>
                    <textarea
                      rows={3}
                      value={editingRule.whatsappTemplate}
                      onChange={e => setEditingRule({ ...editingRule, whatsappTemplate: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 block font-bold">
                      المتغيرات المتاحة: {'{studentName}'}، {'{examTitle}'}، {'{score}'}، {'{gradeLabel}'}، {'{badge}'}، {'{portalLink}'}
                    </span>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRuleModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black cursor-pointer"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#0D365A] hover:bg-[#114674] text-white rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <Check size={14} />
                    <span>حفظ واعتماد القاعدة</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AutoGradingManagement;
