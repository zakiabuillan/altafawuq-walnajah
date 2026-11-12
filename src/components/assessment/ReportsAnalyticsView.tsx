import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Download, 
  Filter, 
  Users, 
  Award, 
  HelpCircle, 
  CheckCircle, 
  AlertTriangle, 
  ArrowUpRight, 
  FileSpreadsheet,
  TrendingUp,
  Percent,
  Layers,
  PieChart as PieIcon,
  BookOpen
} from 'lucide-react';
import { assessmentStore } from '../../lib/assessmentStore';
import { ItemAnalysisData } from '../../types/assessmentPlatform';

export const ReportsAnalyticsView: React.FC = () => {
  const exams = assessmentStore.exams;
  const attempts = assessmentStore.attempts;
  const courses = assessmentStore.courses;
  const groups = assessmentStore.groups;
  const learningOutcomes = assessmentStore.learningOutcomes;
  const currentUser = assessmentStore.currentUser;

  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'students' | 'learning_outcomes' | 'item_analysis'>('item_analysis');

  const activeExam = exams.find(e => e.id === selectedExamId) || exams[0];

  // RBAC Filter: Only show attempts belonging to groups the teacher is authorized to view
  const examAttempts = useMemo(() => {
    return attempts.filter(a => {
      if (a.examId !== activeExam?.id) return false;
      // If user is teacher, check group ownership
      if (currentUser.role === 'teacher') {
        const group = groups.find(g => g.id === a.groupId);
        if (group && group.teacherId !== currentUser.id && activeExam.teacherId !== currentUser.id) {
          return false;
        }
      }
      return true;
    });
  }, [attempts, activeExam, currentUser, groups]);

  // Overall Statistics
  const totalSubmissions = examAttempts.filter(a => a.status === 'submitted' || a.status === 'timed_out').length;
  const averageScore = totalSubmissions > 0
    ? Math.round(examAttempts.reduce((acc, a) => acc + (a.percentage || 0), 0) / totalSubmissions)
    : 0;
  const passCount = examAttempts.filter(a => a.passed).length;
  const passRate = totalSubmissions > 0 ? Math.round((passCount / totalSubmissions) * 100) : 0;

  // Item Analysis calculations
  const itemAnalysisList: ItemAnalysisData[] = useMemo(() => {
    if (!activeExam) return [];
    return assessmentStore.calculateItemAnalysis(activeExam.id);
  }, [activeExam, attempts]);

  // Learning Outcomes Mastery Breakdown
  const loMasteryStats = useMemo(() => {
    if (!activeExam || examAttempts.length === 0) return [];

    const statsMap: Record<string, { code: string; text: string; correct: number; total: number }> = {};

    activeExam.frozenQuestionsSnapshot.forEach(q => {
      const lo = learningOutcomes.find(l => l.id === q.learningOutcomeId);
      if (!statsMap[q.learningOutcomeId]) {
        statsMap[q.learningOutcomeId] = {
          code: q.learningOutcomeCode || lo?.code || 'LO',
          text: lo?.text || 'ناتج تعلم مرتبط',
          correct: 0,
          total: 0
        };
      }

      examAttempts.forEach(att => {
        const res = att.itemResults?.[q.id];
        if (res) {
          statsMap[q.learningOutcomeId].total++;
          if (res.isCorrect) statsMap[q.learningOutcomeId].correct++;
        }
      });
    });

    return Object.values(statsMap).map(item => ({
      ...item,
      percentage: item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0
    }));
  }, [activeExam, examAttempts, learningOutcomes]);

  // Export Sanitized CSV without unnecessary PII (student name, email stripped if necessary)
  const handleExportCsv = () => {
    if (!activeExam) return;

    const headers = ['Question_ID', 'Question_Text', 'Sample_Size_N', 'Measured_Difficulty_P_Value', 'Target_Difficulty', 'Discrimination_Index_D', 'Distractor_Opt1_Pct', 'Distractor_Opt2_Pct', 'Distractor_Opt3_Pct', 'Distractor_Opt4_Pct', 'Quality_Flag'];
    const rows = itemAnalysisList.map(item => [
      item.questionId,
      `"${item.questionText.replace(/"/g, '""').slice(0, 80)}"`,
      item.sampleSizeN,
      item.pValueDifficulty,
      item.targetDifficulty,
      item.discriminationIndexD,
      item.distractorPercentages.opt_1,
      item.distractorPercentages.opt_2,
      item.distractorPercentages.opt_3,
      item.distractorPercentages.opt_4,
      item.qualityFlag
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Item_Analysis_${activeExam.title.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <BarChart3 size={22} />
            </span>
            <h2 className="text-xl font-bold text-slate-900">التقارير الأكاديمية والتحليل السيكومتري للأسئلة</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            مؤشرات صعوبة الأسئلة المقاسة ($P$-value)، معامل التمييز ($D$-index)، وتحليل المشتتات والبدائل مع إتقان نواتج التعلم (LOs).
          </p>
        </div>

        {/* Export sanitized report */}
        <button
          onClick={handleExportCsv}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
        >
          <Download size={16} />
          <span>تصدير تحليل الأسئلة (CSV)</span>
        </button>
      </div>

      {/* Target Difficulty vs Measured Difficulty Clarification Banner */}
      <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl flex items-start gap-3 text-xs text-blue-900">
        <TrendingUp size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold">التفريق العلمي الصارم بين الصعوبة المستهدفة والصعوبة المقاسة:</h4>
          <p className="mt-0.5 text-blue-800 leading-relaxed">
            يصنف النظام الصعوبة التي يحددها المعلم أو نموذج التوليد بوصفها <strong>"صعوبة مستهدفة" (Target Difficulty)</strong>، ولا تُعتمد كصعوبة فعلية إلا بعد إجراء الاختبار واحتساب <strong>معامل الصعوبة المقاس ($P$-value)</strong> رياضياً بنسبة الإجابات الصحيحة في العينة ($N$).
          </p>
        </div>
      </div>

      {/* Exam Picker & Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Selector */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-center">
          <label className="block text-xs text-slate-400 font-bold mb-1">اختر الاختبار المعني بالتحليل:</label>
          <select
            value={selectedExamId}
            onChange={e => setSelectedExamId(e.target.value)}
            className="w-full text-xs p-2 rounded-lg border border-slate-300 font-bold outline-none"
          >
            {exams.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.title}</option>
            ))}
          </select>
        </div>

        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold">العينة المنجزة (N)</span>
            <p className="text-2xl font-mono font-black text-slate-900 mt-0.5">{totalSubmissions}</p>
            <span className="text-[10px] text-slate-500">طالب في الشعبة</span>
          </div>
          <span className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Users size={18} />
          </span>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold">متوسط درجات الشعبة</span>
            <p className="text-2xl font-mono font-black text-emerald-600 mt-0.5">{averageScore}%</p>
            <span className="text-[10px] text-slate-500">من أصل 100%</span>
          </div>
          <span className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <TrendingUp size={18} />
          </span>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold">نسبة الاجتياز والنجاح</span>
            <p className="text-2xl font-mono font-black text-blue-600 mt-0.5">{passRate}%</p>
            <span className="text-[10px] text-slate-500">حققوا درجة الاجتياز</span>
          </div>
          <span className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <CheckCircle size={18} />
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('item_analysis')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'item_analysis'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          تحليل الأسئلة والبدائل (Item & Distractor Analysis)
        </button>
        <button
          onClick={() => setActiveTab('learning_outcomes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'learning_outcomes'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          مؤشرات إتقان نواتج التعلم (LOs)
        </button>
        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'students'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          نتائج طلاب الشعبة المصرح لهم ({examAttempts.length})
        </button>
      </div>

      {/* Tab 1: Item Analysis & Distractor Analysis */}
      {activeTab === 'item_analysis' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <span>
              <strong>دليل المؤشرات:</strong> معامل الصعوبة المقاس ($P$-value) بين 0 و 1 (الأعلى أسهل). معامل التمييز ($D$-index) أعلى من 0.30 يعتبر ممتازاً.
            </span>
            <span className="text-slate-400 font-mono">حجم العينة: N = {totalSubmissions}</span>
          </div>

          <div className="space-y-4">
            {itemAnalysisList.map((item, idx) => {
              const qualityBadge = {
                excellent: { label: 'ممتاز', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
                good: { label: 'جيد', color: 'bg-blue-50 text-blue-800 border-blue-200' },
                needs_review: { label: 'يحتاج مراجعة', color: 'bg-amber-50 text-amber-800 border-amber-200' },
                flawed: { label: 'معيب / تمييز سلبي', color: 'bg-rose-50 text-rose-800 border-rose-200' }
              }[item.qualityFlag];

              return (
                <div key={item.questionId} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-400">س {idx + 1}</span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">{item.questionText}</h4>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${qualityBadge.color}`}>
                      {qualityBadge.label}
                    </span>
                  </div>

                  {/* Psychometric Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">معامل الصعوبة المقاس (P-value):</span>
                      <span className="font-mono font-bold text-slate-800 text-base">{item.pValueDifficulty}</span>
                      <span className="text-[10px] text-slate-500 block">
                        ({Math.round(item.pValueDifficulty * 100)}% إجابات صحيحة)
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">الصعوبة المستهدفة (الأولية):</span>
                      <span className="font-bold text-slate-800 text-base">
                        {item.targetDifficulty === 'easy' ? 'سهل' : item.targetDifficulty === 'hard' ? 'متقدم' : 'متوسط'}
                      </span>
                      <span className="text-[10px] text-slate-400 block">محددة قبل التطبيق</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">معامل التمييز (D-index):</span>
                      <span className={`font-mono font-bold text-base ${item.discriminationIndexD < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {item.discriminationIndexD}
                      </span>
                      <span className="text-[10px] text-slate-400 block">الفارق بين العليا والدنيا</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">التفسير السيكومتري:</span>
                      <span className="text-[11px] text-slate-700 font-medium block leading-snug">{item.interpretation}</span>
                    </div>
                  </div>

                  {/* Distractor Analysis Bars (opt_1, opt_2, opt_3, opt_4) */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs font-bold text-slate-700 block">
                      توزيع اختيار البدائل والمشتتات (Distractor Analysis):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {(['opt_1', 'opt_2', 'opt_3', 'opt_4'] as const).map(optKey => {
                        const isCorrect = item.correctOptionId === optKey;
                        const pct = item.distractorPercentages[optKey];
                        const count = item.distractorCounts[optKey];
                        return (
                          <div
                            key={optKey}
                            className={`p-2.5 rounded-xl border text-xs ${
                              isCorrect
                                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono font-bold">
                                البديل ({optKey.replace('opt_', '')}) {isCorrect && '✔ الصحيح'}
                              </span>
                              <span className="font-mono font-bold">{pct}%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isCorrect ? 'bg-emerald-500' : 'bg-amber-400'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {count} من {item.sampleSizeN} اختاروا هذا البديل
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Learning Outcomes Mastery */}
      {activeTab === 'learning_outcomes' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Award size={18} className="text-amber-500" />
            <span>معدل إتقان نواتج التعلم المستهدفة في الاختبار</span>
          </h3>

          <div className="space-y-3">
            {loMasteryStats.map(lo => (
              <div key={lo.code} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-800">
                      {lo.code}
                    </span>
                    <h5 className="text-xs font-bold text-slate-900">{lo.text}</h5>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-600">
                    {lo.percentage}% إتقان
                  </span>
                </div>

                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      lo.percentage >= 80 ? 'bg-emerald-500' : lo.percentage >= 60 ? 'bg-blue-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${lo.percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>تمت الإجابة بشكل صحيح على {lo.correct} من أصل {lo.total} استجابة</span>
                  <span>المستوى: {lo.percentage >= 75 ? 'متقن تماماً' : 'يحتاج مراجعة تعزيزية'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Student Results (RBAC isolated to authorized group) */}
      {activeTab === 'students' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Users size={18} className="text-sky-600" />
              <span>نتائج المحاولات المسجلة لشعبة {activeExam.groupName}</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              محصورة في مستخدمي الشعبة المصرح لهم
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold">
                  <th className="py-2.5 px-3">اسم الطالب</th>
                  <th className="py-2.5 px-3">رقم المحاولة</th>
                  <th className="py-2.5 px-3">وقت التسليم</th>
                  <th className="py-2.5 px-3">الدرجة</th>
                  <th className="py-2.5 px-3">النسبة</th>
                  <th className="py-2.5 px-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {examAttempts.map(att => (
                  <tr key={att.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-bold text-slate-800">{att.studentName}</td>
                    <td className="py-3 px-3 font-mono">#{att.attemptNumber}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {att.submittedAt ? new Date(att.submittedAt).toLocaleTimeString('ar') : 'قيد الأداء'}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {att.score} / {att.maxScore}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-600">
                      {att.percentage}%
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        att.passed ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                      }`}>
                        {att.passed ? 'ناجح' : 'لم يجتز'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
