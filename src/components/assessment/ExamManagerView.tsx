import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  Plus, 
  Clock, 
  Calendar, 
  Users, 
  ShieldCheck, 
  CheckCircle, 
  AlertCircle, 
  Play, 
  Eye, 
  Shuffle, 
  Lock,
  Sparkles,
  FileText,
  UserCheck
} from 'lucide-react';
import { assessmentStore } from '../../lib/assessmentStore';
import { ResultPolicy } from '../../types/assessmentPlatform';

interface ExamManagerViewProps {
  onTakeExamAsStudent: (examId: string) => void;
}

export const ExamManagerView: React.FC<ExamManagerViewProps> = ({ onTakeExamAsStudent }) => {
  const exams = assessmentStore.exams;
  const courses = assessmentStore.courses;
  const groups = assessmentStore.groups;
  const questions = assessmentStore.questions;
  const users = assessmentStore.users;
  const currentUser = assessmentStore.currentUser;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || '');
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || '');
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 16));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16));
  const [allowedAttempts, setAllowedAttempts] = useState(1);
  const [passScore, setPassScore] = useState(60);
  const [resultPolicy, setResultPolicy] = useState<ResultPolicy>('immediate_full');
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [accommodatedStudentId, setAccommodatedStudentId] = useState<string>('');
  const [extraPercent, setExtraPercent] = useState<number>(25);

  // Filter approved questions for this course
  const approvedCourseQuestions = questions.filter(q => 
    q.status === 'approved' && (!selectedCourseId || q.courseId === selectedCourseId)
  );

  const handleToggleQuestionSelect = (qId: string) => {
    setSelectedQuestionIds(prev => 
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  const handleSelectAllApproved = () => {
    setSelectedQuestionIds(approvedCourseQuestions.map(q => q.id));
  };

  const handleCreateExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedQuestionIds.length === 0) {
        alert('يجب اختيار سؤال معتمد واحد على الأقل.');
        return;
      }

      const accommodations: Record<string, any> = {};
      if (accommodatedStudentId) {
        accommodations[accommodatedStudentId] = {
          extraTimePercent: extraPercent,
          extraMinutes: Math.round(durationMinutes * (extraPercent / 100)),
          reason: `تسهيلات وقت إضافي معتمدة (+${extraPercent}%)`
        };
      }

      assessmentStore.createExam({
        title,
        courseId: selectedCourseId,
        groupId: selectedGroupId,
        durationMinutes,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        allowedAttempts,
        passScore,
        resultPolicy,
        shuffleQuestions,
        shuffleOptions,
        selectedQuestionIds,
        accommodations
      });

      setShowCreateModal(false);
      setTitle('');
      setSelectedQuestionIds([]);
    } catch (err: any) {
      alert(err.message || 'فشل نشر الاختبار.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" dir="rtl">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <ClipboardCheck size={22} />
            </span>
            <h2 className="text-xl font-bold text-slate-900">إدارة ونشر الاختبارات المحصنة</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            إنشاء اختبارات من بنك الأسئلة المعتمد، تجميد لقطة الأسئلة (Snapshot Freeze)، ضبط الوقت على الخادم، وخلط الخيارات بمعرفات ثابتة.
          </p>
        </div>

        {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
          <button
            onClick={() => {
              if (questions.filter(q => q.status === 'approved').length === 0) {
                alert('لا توجد أسئلة معتمدة في بنك الأسئلة. يرجى اعتماد الأسئلة أولاً.');
                return;
              }
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            <span>إنشاء اختبار وتجميد الأسئلة</span>
          </button>
        )}
      </div>

      {/* Snapshot Freeze Explanation */}
      <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl flex items-start gap-3 text-xs text-blue-900">
        <Lock size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold">سياسة تجميد نسخة الاختبار (Snapshot Freeze):</h4>
          <p className="mt-0.5 text-blue-800 leading-relaxed">
            عند نشر الاختبار، يتم أخذ نسخة مجمدة غير قابلة للتعديل من الأسئلة والخيارات والدرجات. أي تعديل يطرأ لاحقاً على بنك الأسئلة لن يؤثر على نزاهة هذا الاختبار أو درجات الطلاب السابقة نهائياً.
          </p>
        </div>
      </div>

      {/* Exams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {exams.map(exam => {
          const attemptsCount = assessmentStore.attempts.filter(a => a.examId === exam.id).length;
          const now = new Date();
          const isUpcoming = new Date(exam.startDate) > now;
          const isClosed = new Date(exam.endDate) < now;
          const isActive = !isUpcoming && !isClosed;

          return (
            <div
              key={exam.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono">
                    {exam.courseName}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    isActive ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                    isUpcoming ? 'bg-amber-50 text-amber-800 border-amber-200' :
                    'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {isActive ? '● متاح حالياً' : isUpcoming ? 'قريباً' : 'مغلق'}
                  </span>
                </div>

                <h3 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-2">
                  {exam.title}
                </h3>

                <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Users size={13} />
                      <span>المجموعة:</span>
                    </span>
                    <span className="font-bold text-slate-800">{exam.groupName}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-400">
                      <Clock size={13} />
                      <span>المدة:</span>
                    </span>
                    <span className="font-bold text-slate-800">{exam.durationMinutes} دقيقة</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-400">
                      <FileText size={13} />
                      <span>الأسئلة والدرجة:</span>
                    </span>
                    <span className="font-bold text-slate-800">{exam.questionsCount} أسئلة ({exam.totalPoints} درجة)</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-slate-400">
                      <ShieldCheck size={13} />
                      <span>سياسة النتائج:</span>
                    </span>
                    <span className="text-[11px] font-medium text-slate-700">
                      {exam.resultPolicy === 'immediate_full' ? 'فورية مع التفسير' :
                       exam.resultPolicy === 'score_only' ? 'الدرجة فقط' : 'بعد إغلاق النافذة'}
                    </span>
                  </div>
                </div>

                {Object.keys(exam.accommodations).length > 0 && (
                  <div className="bg-amber-50/60 p-2 rounded-lg border border-amber-200 text-[10px] text-amber-900">
                    <strong>تسهيلات خاصة:</strong> تم تعيين وقت إضافي لـ {Object.keys(exam.accommodations).length} طالب.
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400 font-mono">
                  {attemptsCount} محاولة منجزة
                </span>

                <button
                  onClick={() => onTakeExamAsStudent(exam.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                  title="بدء تجربة الاختبار ومحاكاة الطالب"
                >
                  <Play size={13} />
                  <span>بدء الاختبار كطالب</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Exam Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Lock size={18} className="text-blue-600" />
                <span>إنشاء وتجميد اختبار رسمي جديد (Exam Snapshot)</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateExamSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الاختبار</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الاختبار الفصلي الأول في الاتزان الكيميائي"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المقرر التعليمي</label>
                  <select
                    value={selectedCourseId}
                    onChange={e => setSelectedCourseId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الشعبة المستهدفة</label>
                  <select
                    value={selectedGroupId}
                    onChange={e => setSelectedGroupId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none"
                  >
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">المدة (بالدقائق)</label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    required
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(parseInt(e.target.value, 10) || 30)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">عدد المحاولات المسموحة</label>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={allowedAttempts}
                    onChange={e => setAllowedAttempts(parseInt(e.target.value, 10) || 1)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">سياسة عرض النتائج</label>
                  <select
                    value={resultPolicy}
                    onChange={e => setResultPolicy(e.target.value as ResultPolicy)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none"
                  >
                    <option value="immediate_full">فورية مع النتيجة والتفسيرات</option>
                    <option value="score_only">عرض النتيجة الرقمية فقط</option>
                    <option value="after_window_closes">حجب الإجابات حتى إغلاق النافذة</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">بداية نافذة الإتاحة</label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">نهاية نافذة الإتاحة</label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none font-mono"
                  />
                </div>
              </div>

              {/* Shuffling options */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={e => setShuffleQuestions(e.target.checked)}
                  />
                  <span>خلط ترتيب الأسئلة لكل طالب</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffleOptions}
                    onChange={e => setShuffleOptions(e.target.checked)}
                  />
                  <span>خلط ترتيب الخيارات الأربعة</span>
                </label>
              </div>

              {/* Accommodations */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">تسهيلات الوقت الإضافي (Accommodations):</span>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={accommodatedStudentId}
                    onChange={e => setAccommodatedStudentId(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 outline-none"
                  >
                    <option value="">لا يوجد طالب محدد</option>
                    {users.filter(u => u.role === 'student').map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>

                  <select
                    value={extraPercent}
                    onChange={e => setExtraPercent(parseInt(e.target.value, 10))}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 outline-none font-bold"
                  >
                    <option value={25}>+25% وقت إضافي (+{Math.round(durationMinutes * 0.25)} د)</option>
                    <option value={50}>+50% وقت إضافي (+{Math.round(durationMinutes * 0.50)} د)</option>
                  </select>
                </div>
              </div>

              {/* Question Selection Checkbox List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    اختر الأسئلة المعتمدة لتضمينها وتجميدها ({selectedQuestionIds.length} محددة):
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllApproved}
                    className="text-xs text-blue-600 font-bold hover:underline"
                  >
                    تحديد كافة المعتمد ({approvedCourseQuestions.length})
                  </button>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-2">
                  {approvedCourseQuestions.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">لا توجد أسئلة معتمدة في هذا المقرر.</p>
                  ) : (
                    approvedCourseQuestions.map(q => (
                      <label
                        key={q.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition cursor-pointer text-xs ${
                          selectedQuestionIds.includes(q.id)
                            ? 'bg-blue-50/70 border-blue-300 text-blue-950 font-medium'
                            : 'bg-white border-slate-200 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedQuestionIds.includes(q.id)}
                          onChange={() => handleToggleQuestionSelect(q.id)}
                          className="mt-0.5"
                        />
                        <div className="space-y-0.5">
                          <p className="font-bold">{q.questionText}</p>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {q.referenceTitle} • {q.citation.pageOrSection}
                          </span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md cursor-pointer"
                >
                  تجميد ونشر الاختبار
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
