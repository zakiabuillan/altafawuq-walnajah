import React, { useState } from 'react';
import { 
  Bot, 
  Send, 
  BookOpen, 
  ShieldAlert, 
  AlertCircle, 
  ExternalLink, 
  Flag, 
  Sparkles, 
  Lock, 
  CheckCircle,
  HelpCircle,
  User,
  Info
} from 'lucide-react';
import { assessmentStore } from '../../lib/assessmentStore';
import { SmartTutorMessage, SmartTutorCitation } from '../../types/assessmentPlatform';

export const SmartTutorChatView: React.FC = () => {
  const currentUser = assessmentStore.currentUser;
  const courses = assessmentStore.courses;
  const references = assessmentStore.references;

  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id || '');
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<SmartTutorMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content: `أهلاً بك يا ${currentUser.name} في منصة التفوق. أنا "المعلم الذكي لأكاديمية التفوق"، مساعدك التعليمي المتخصص للإجابة عن استفساراتك اعتماداً حصرياً على المراجع والمقررات التعليمية المعتمدة داخل النظام.

يسعدني مساعدتك في:
- فهم المفاهيم العلمية بدقة.
- استعراض خطوات حل المسائل وفق المنهاج.
- توثيق كل معلومة برقم الصفحة والمقطع المعتمد.`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [activeCitationModal, setActiveCitationModal] = useState<SmartTutorCitation | null>(null);
  const [reportModalMessageId, setReportModalMessageId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');

  const activeCourse = courses.find(c => c.id === selectedCourseId) || courses[0];
  const approvedRefsCount = references.filter(r => r.status === 'approved' && (r.courseId === activeCourse?.id || r.specialtyId === activeCourse?.specialtyId)).length;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const query = inputText.trim();
    setInputText('');

    const userMsg: SmartTutorMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);

    // Grounded RAG Query
    setTimeout(() => {
      const tutorResponse = assessmentStore.askSmartTutor(currentUser.id, selectedCourseId, query);
      setMessages(prev => [...prev, tutorResponse]);
    }, 400);
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportModalMessageId) return;
    assessmentStore.reportTutorAnswer(reportModalMessageId, reportReason);
    alert('تم تسجيل إبلاغك بنجاح في سجل التدقيق الأكاديمي لمراجعته من قِبل المراجع العلمي.');
    setReportModalMessageId(null);
    setReportReason('');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <Bot size={22} />
            </span>
            <h2 className="text-xl font-bold text-slate-900">المعلم الذكي لأكاديمية التفوق (Grounded AI Tutor)</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            إجابات مدعمة باستشهادات قابلة للمعاينة من المراجع المعتمدة حصراً، مع التزام صارم بعدم التوليد أو التخمين خارج النص.
          </p>
        </div>

        {/* Course Selector & Exam Silence Toggle */}
        <div className="flex items-center gap-3">
          <div className="text-xs">
            <span className="text-slate-400 block text-[10px] font-bold">نطاق المادة:</span>
            <select
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg text-xs p-1.5 font-bold outline-none"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Teacher toggle: disable tutor during exams */}
          {(currentUser.role === 'teacher' || currentUser.role === 'admin') && (
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex items-center gap-2 text-xs">
              <Lock size={14} className="text-slate-500" />
              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={assessmentStore.isTutorDisabledDuringExams}
                  onChange={e => {
                    assessmentStore.isTutorDisabledDuringExams = e.target.checked;
                    assessmentStore.notify();
                  }}
                />
                <span>تعطيل الذكاء أثناء الاختبارات النشطة</span>
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Grounding Status Pill */}
      <div className="bg-emerald-50/70 border border-emerald-200 p-3.5 rounded-xl flex items-center justify-between text-xs text-emerald-950">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-emerald-600" />
          <span>
            <strong>قاعدة المعرفة الحالية:</strong> متاح ({approvedRefsCount}) مرجع معتمد لمقرر {activeCourse?.name}.
          </span>
        </div>
        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
          استرجاع محكم RAG
        </span>
      </div>

      {/* Chat Messages Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[560px]">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map(msg => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser ? 'bg-slate-900 text-white' : 'bg-emerald-600 text-white'
                }`}>
                  {isUser ? <User size={16} /> : <Bot size={16} />}
                </div>

                {/* Message Bubble */}
                <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed space-y-3 ${
                  isUser 
                    ? 'bg-slate-900 text-white rounded-tr-none' 
                    : msg.isRefusal
                    ? 'bg-amber-50/90 border border-amber-200 text-amber-950 rounded-tl-none font-medium'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none'
                }`}>
                  <div className="whitespace-pre-wrap select-text">
                    {msg.content}
                  </div>

                  {/* Grounded Clickable Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                      <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                        <BookOpen size={13} />
                        <span>الاستشهادات والمواضع المعتمدة (قابلة للمعاينة):</span>
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {msg.citations.map((cite, cIdx) => (
                          <button
                            key={cIdx}
                            onClick={() => setActiveCitationModal(cite)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-900 text-[11px] font-bold hover:bg-emerald-50 transition shadow-sm cursor-pointer"
                          >
                            <ExternalLink size={11} />
                            <span>{cite.referenceTitle} ({cite.pageOrSection})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pedagogical Follow-up Prompt */}
                  {msg.pedagogicalEvaluation?.clarificationPrompt && (
                    <div className="bg-emerald-100/50 p-2.5 rounded-lg border border-emerald-200 text-[11px] text-emerald-900 font-bold">
                      💡 {msg.pedagogicalEvaluation.clarificationPrompt}
                    </div>
                  )}

                  {/* Footer metadata & Report Button */}
                  {!isUser && (
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span>{new Date(msg.timestamp).toLocaleTimeString('ar')}</span>
                      <button
                        onClick={() => setReportModalMessageId(msg.id)}
                        className="flex items-center gap-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="الإبلاغ عن إجابة خاطئة أو غير دقيقة"
                      >
                        <Flag size={11} />
                        <span>إبلاغ عن الإجابة</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-4 bg-slate-50 border-t border-slate-200 flex items-center gap-3">
          <input
            type="text"
            placeholder="اطرح استفسارك الأكاديمي (مثال: ما هو مبدأ لوشاتيليه؟ أو كيف أحسب ثابت الاتزان؟)..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            className="flex-1 text-xs sm:text-sm p-3 bg-white rounded-xl border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Send size={15} />
            <span>إرسال</span>
          </button>
        </form>
      </div>

      {/* Citation Preview Modal */}
      {activeCitationModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4" dir="rtl">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BookOpen size={18} className="text-emerald-600" />
              <span>معاينة الاستشهاد المعتمد</span>
            </h3>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block">المرجع المعتمد:</span>
                <span className="font-bold text-slate-800">{activeCitationModal.referenceTitle} (الإصدار {activeCitationModal.version})</span>
              </div>

              <div>
                <span className="text-slate-400 block">الموضع الدقيق:</span>
                <span className="font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                  {activeCitationModal.pageOrSection}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block">نص المقطع المعتمد المقتبس منه:</span>
                <p className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700 italic select-text mt-1 leading-relaxed">
                  "{activeCitationModal.snippet}"
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveCitationModal(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Erroneous Answer Modal */}
      {reportModalMessageId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4" dir="rtl">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 text-rose-700">
              <Flag size={18} />
              <span>الإبلاغ عن إجابة خاطئة أو غير دقيقة</span>
            </h3>
            <p className="text-xs text-slate-500">
              سيتم تسجيل إبلاغك في سجل التدقيق الأكاديمي وسيقوم المراجع العلمي للمادة بمطابقة الشرح مع المرجع المعتمد.
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">سبب الإبلاغ والملاحظات:</label>
                <textarea
                  rows={3}
                  required
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  placeholder="مثال: الشرح لم يذكر أثر التغير في الضغط بشكل صحيح وفق صفحة 118..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-1 focus:ring-rose-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportModalMessageId(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-md"
                >
                  إرسال الإبلاغ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
