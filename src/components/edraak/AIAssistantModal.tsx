import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Paperclip, 
  RefreshCcw, 
  X, 
  Maximize2, 
  Minimize2, 
  Zap, 
  Clock, 
  Check, 
  ShieldCheck,
  History,
  Plus,
  Trash2,
  Search,
  Copy,
  ChevronRight,
  ChevronLeft,
  Database,
  Calendar,
  AlertCircle,
  FileDown
} from 'lucide-react';
import { AIChatMessage, CurriculumData, StudentAiChatSession } from './types';
import { MathJaxSection } from '../MathJaxSection';
import { db } from '../../lib/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  curriculum?: CurriculumData;
  activeSubject?: string;
  studentName?: string;
  studentId?: string;
}

const defaultCurriculum: CurriculumData = {
  title: 'منهاج العلوم والبجروت المعتمد',
  subtitle: 'بيولوجيا، كيمياء، فيزياء، رياضيات',
  introduction: 'مقررات أكاديمية التفوق أون لاين الرسمية بإشراف نخبة من المعلمين المعتمدين',
  authorOrSource: 'طاقم معلّمي أكاديمية التفوق أون لاين',
  learningUnits: [
    {
      id: 'unit-bio-1',
      unitNumber: 1,
      title: 'البيولوجيا - التمثيل الضوئي والأيض الخلوي',
      subtitle: 'التفاعلات الضوئية وحلقة كالفن',
      summary: 'دراسة تحويل الطاقة الضوئية إلى طاقة كيميائية، دور الكلوروفيل، انشطار الماء وإنتاج ATP و NADPH.',
      details: [
        'تفاعلات الضوء تحدث في غشاء الثايلاكويد داخل البلاستيدات الخضراء.',
        'حلقة كالفن تحدث في الستروما وتستخدم نواتج الضوء لتثبيت ثاني أكسيد الكربون وإنتاج الجلوكوز.',
        'المعادلة الإجمالية: 6CO2 + 6H2O -> C6H12O6 + 6O2'
      ]
    },
    {
      id: 'unit-chem-1',
      unitNumber: 2,
      title: 'الكيمياء - توازن المحاليل والأكسدة والاختزال',
      subtitle: 'حسابات الرقم الهيدروجيني والموازنة الأيونية',
      summary: 'مفاهيم برونستد-لوري وحسابات التراكيز وتفاعلات انتقال الإلكترونات.',
      details: [
        'تعريف الأحماض والقواعد ومفهوم الزوج المترافق.',
        'حسابات pH = -log[H3O+] والعلاقة مع ثابت التأين Kw.',
        'موازنة تفاعلات التأكسد والاختزال بطريقة أنصاف التفاعلات.'
      ]
    }
  ],
  reviewQuestions: [],
  examQuestions: [],
  approvedReferences: [
    {
      id: 'ref-1',
      title: 'المنهاج المعتمد لبيولوجيا الخلية والبجروت',
      sourceType: 'pdf',
      authorOrPublisher: 'أ. د. زكي أبو علان - وزارة التربية والتعليم',
      subject: 'بيولوجيا',
      gradeLevel: 'بجروت',
      priority: 1,
      isApproved: true,
      approvedByTeacherName: 'أ. د. زكي أبو علان',
      approvedDate: '2026-09-01'
    }
  ]
};

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  curriculum = defaultCurriculum,
  activeSubject = 'بيولوجيا - التمثيل الضوئي',
  studentName = 'الطالب المتفوق',
  studentId
}) => {
  // Normalize current student identifier
  const resolvedStudentId = studentId || (studentName ? studentName.toLowerCase().replace(/\s+/g, '_') : '') || 'student_guest';

  // Chat History & Firestore state
  const [chatSessions, setChatSessions] = useState<StudentAiChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [historySubjectFilter, setHistorySubjectFilter] = useState<string>('all');
  const [firestoreStatus, setFirestoreStatus] = useState<'connected' | 'syncing' | 'offline'>('connected');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Active chat state
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text: `أهلاً بك يا ${studentName}! 🌟 أنا «المعلم الذكي لأكاديمية التفوق»، مساعدك التعليمي المتخصص لدعمك والإجابة عن استفساراتك اعتماداً حصرياً على المصادر والمناهج المعتمدة في مادة «${activeSubject}». كيف يمكنني مساعدتك في فهم المادة، حل المسائل خطوة بخطوة، أو الاستعداد للاختبار اليوم؟`,
      timestamp: 'الآن',
      subject: activeSubject
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [attachedSnippet, setAttachedSnippet] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Subscribe or Load Chat History from Firestore
  useEffect(() => {
    if (!isOpen) return;

    setIsLoadingHistory(true);
    const chatsRef = collection(db, 'studentAiChats');

    // Setup listener
    const unsubscribe = onSnapshot(
      chatsRef,
      (snapshot) => {
        const loaded: StudentAiChatSession[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as StudentAiChatSession;
          // Filter to show this student's chats (or general student sessions)
          if (data && (data.studentId === resolvedStudentId || data.studentName === studentName || !data.studentId)) {
            loaded.push({
              ...data,
              id: docSnap.id
            });
          }
        });

        // Sort descending by updatedAt
        loaded.sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        setChatSessions(loaded);
        setIsLoadingHistory(false);
        setFirestoreStatus('connected');

        // Cache locally as immediate fallback
        try {
          localStorage.setItem(`ai_chat_sessions_${resolvedStudentId}`, JSON.stringify(loaded));
        } catch {
          // ignore storage error
        }
      },
      (error) => {
        console.warn('Firestore real-time listener error:', error);
        setFirestoreStatus('offline');
        setIsLoadingHistory(false);

        // Fallback to local storage
        try {
          const cached = localStorage.getItem(`ai_chat_sessions_${resolvedStudentId}`);
          if (cached) {
            setChatSessions(JSON.parse(cached));
          }
        } catch {
          // ignore
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [isOpen, resolvedStudentId, studentName]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  // 2. Start a New Chat Session
  const handleStartNewChat = () => {
    const newSessionId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setActiveSessionId(newSessionId);
    setMessages([
      {
        id: `init-${Date.now()}`,
        sender: 'assistant',
        text: `أهلاً بك في جلسة جديدة يا ${studentName}! 🌿 اطرح أي استفسار أو مسألة في «${activeSubject}» وسأشرحها لك بتسلسل منطقي ومصطلحات دقيقة.`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        subject: activeSubject
      }
    ]);
    setInputQuery('');
    setAttachedSnippet(null);
  };

  // 3. Select a Session from History
  const handleSelectSession = (session: StudentAiChatSession) => {
    setActiveSessionId(session.id);
    if (session.messages && session.messages.length > 0) {
      setMessages(session.messages);
    }
    // On mobile, collapse history sidebar upon selection
    if (window.innerWidth < 768) {
      setIsHistoryOpen(false);
    }
  };

  // 4. Delete a Session from Firestore
  const handleDeleteSession = async (sessionIdToDelete: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await deleteDoc(doc(db, 'studentAiChats', sessionIdToDelete));
      setChatSessions(prev => prev.filter(s => s.id !== sessionIdToDelete));
      if (activeSessionId === sessionIdToDelete) {
        handleStartNewChat();
      }
    } catch (err) {
      console.warn('Error deleting chat from Firestore:', err);
      // Local fallback removal
      setChatSessions(prev => prev.filter(s => s.id !== sessionIdToDelete));
      if (activeSessionId === sessionIdToDelete) {
        handleStartNewChat();
      }
    } finally {
      setDeleteConfirmId(null);
    }
  };

  // 5. Send Message & Sync Session to Firestore
  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery.trim();
    if (!query && !attachedSnippet) return;

    // Determine session ID (or create one on the fly)
    const currentSessionId = activeSessionId || `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    if (!activeSessionId) {
      setActiveSessionId(currentSessionId);
    }

    const userMsgId = `user-${Date.now()}`;
    const userMsg: AIChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: attachedSnippet ? `[مرفق نص/ملف: ${attachedSnippet.slice(0, 80)}...]\n${query}` : query,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      subject: activeSubject
    };

    const updatedMessagesWithUser = [...messages, userMsg];
    setMessages(updatedMessagesWithUser);
    setInputQuery('');
    const snippetToSend = attachedSnippet;
    setAttachedSnippet(null);
    setIsLoading(true);

    try {
      // Build learning units and lessons text
      const unitsDetailText = (curriculum.learningUnits || [])
        .map(u => `[وحدة ${u.unitNumber}: ${u.title}]
الملخص: ${u.summary}
المفاهيم والشروحات:
${(u.details || []).map(d => `- ${d}`).join('\n')}`)
        .join('\n\n');

      // Teacher approved references summary
      const approvedRefsText = (curriculum.approvedReferences || [])
        .filter(r => r.isApproved)
        .map(r => `• [المصدر: ${r.title}] (${r.sourceType.toUpperCase()} - إعداد/اعتماد: ${r.authorOrPublisher || r.approvedByTeacherName || 'معلم المادة'})`)
        .join('\n');

      // Build context prompt
      const contextPrompt = `
سؤال الطالب:
"${query}"
${snippetToSend ? `\n[مرفق مستخرج من الطالب]:\n${snippetToSend}` : ''}
`;

      const res = await fetch('/api/student/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: contextPrompt,
          subject: activeSubject,
          studentName: studentName,
          curriculumContext: unitsDetailText,
          sourcesContext: approvedRefsText || 'المقررات الوزارية والمراجع المعتمدة لمنصة أكاديمية التفوق أون لاين'
        })
      });

      const data = await res.json();
      const replyText = data.reply || data.response || 'أعتذر، حدث خطأ أثناء الاتصال بنموذج الذكاء الاصطناعي. يرجى المحاولة مجدداً.';

      const aiMsg: AIChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        subject: activeSubject
      };

      const finalMessages = [...updatedMessagesWithUser, aiMsg];
      setMessages(finalMessages);

      // 6. Save/Sync to Firebase Firestore
      await syncSessionToFirestore(currentSessionId, finalMessages, query);
    } catch (err) {
      console.error('AI assistant chat error:', err);
      const errorMsg: AIChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'assistant',
        text: 'تعذر الاتصال بالخادم الذكي مؤقتاً. يرجى التحقق من اتصال الإنترنت، وسيتم حفظ مسودتك تلقائياً.',
        timestamp: 'الآن',
        subject: activeSubject
      };
      const fallbackMessages = [...updatedMessagesWithUser, errorMsg];
      setMessages(fallbackMessages);
      await syncSessionToFirestore(currentSessionId, fallbackMessages, query);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to sync session payload to Firestore
  const syncSessionToFirestore = async (
    sessionId: string, 
    chatMsgs: AIChatMessage[], 
    firstQueryHint: string
  ) => {
    try {
      setFirestoreStatus('syncing');

      // Find existing title if session exists, or derive from user question
      const existingSession = chatSessions.find(s => s.id === sessionId);
      const firstUserMsg = chatMsgs.find(m => m.sender === 'user');
      const cleanTitle = existingSession?.title || (
        firstUserMsg 
          ? firstUserMsg.text.slice(0, 42).replace(/\n/g, ' ') + (firstUserMsg.text.length > 42 ? '...' : '') 
          : firstQueryHint.slice(0, 42) || 'استفسار أكاديمي'
      );

      const sessionPayload: StudentAiChatSession = {
        id: sessionId,
        studentId: resolvedStudentId,
        studentName: studentName,
        title: cleanTitle,
        subject: activeSubject,
        messages: chatMsgs,
        messageCount: chatMsgs.length,
        createdAt: existingSession?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Write to Firestore collection studentAiChats
      const docRef = doc(db, 'studentAiChats', sessionId);
      await setDoc(docRef, sessionPayload, { merge: true });

      setFirestoreStatus('connected');

      // Update local state list instantly
      setChatSessions(prev => {
        const index = prev.findIndex(s => s.id === sessionId);
        if (index >= 0) {
          const copy = [...prev];
          copy[index] = sessionPayload;
          return copy.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
        return [sessionPayload, ...prev];
      });
    } catch (err) {
      console.warn('Firestore write warning:', err);
      setFirestoreStatus('offline');
      // Local storage fallback
      try {
        localStorage.setItem(`ai_chat_${sessionId}`, JSON.stringify(chatMsgs));
      } catch {
        // ignore
      }
    }
  };

  const handleQuickPrompt = (promptText: string) => {
    handleSendMessage(promptText);
  };

  const handleAttachUnit = (unitTitle: string) => {
    const unit = curriculum.learningUnits.find(u => u.title.includes(unitTitle)) || curriculum.learningUnits[0];
    if (unit) {
      setAttachedSnippet(`الوحدة: ${unit.title}\nالخلاصة: ${unit.summary}\nالتفاصيل: ${unit.details.slice(0, 3).join(' ')}`);
    }
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(msgId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Filtered history list
  const filteredSessions = useMemo(() => {
    const searchLower = (historySearchQuery || '').trim().toLowerCase();
    return chatSessions.filter(session => {
      const matchesSearch = !searchLower || 
        (session.title || '').toLowerCase().includes(searchLower) ||
        (session.subject || '').toLowerCase().includes(searchLower) ||
        (session.messages && session.messages.some(m => (m.text || '').toLowerCase().includes(searchLower)));

      const matchesSubject = historySubjectFilter === 'all' || 
        (session.subject || '').includes(historySubjectFilter);

      return matchesSearch && matchesSubject;
    });
  }, [chatSessions, historySearchQuery, historySubjectFilter]);

  // Subject Pill Color Helper
  const getSubjectColor = (subj: string) => {
    if (subj.includes('بيولوجيا')) return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    if (subj.includes('كيمياء')) return 'bg-amber-50 text-amber-900 border-amber-200';
    if (subj.includes('فيزياء')) return 'bg-sky-50 text-sky-900 border-sky-200';
    if (subj.includes('رياضيات')) return 'bg-indigo-50 text-indigo-900 border-indigo-200';
    return 'bg-stone-100 text-stone-800 border-stone-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className={`bg-white rounded-3xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden transition-all duration-300 ${
          isExpanded 
            ? 'w-full h-[96vh] max-w-7xl' 
            : 'w-full max-w-4xl h-[680px] max-h-[92vh]'
        }`}
        dir="rtl"
      >
        {/* ================= HEADER ================= */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-emerald-900 text-white p-3.5 sm:p-4.5 flex items-center justify-between border-b border-emerald-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-emerald-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base font-serif">المعلم الذكي لأكاديمية التفوق (AI Tutor)</h3>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-400/30">
                  Gemini Flash 3.8
                </span>
                {firestoreStatus === 'syncing' && (
                  <span className="text-[10px] bg-emerald-700/80 text-emerald-100 px-2 py-0.5 rounded-full font-bold animate-pulse flex items-center gap-1">
                    <RefreshCcw size={10} className="animate-spin" />
                    <span>مزامنة...</span>
                  </span>
                )}
                {firestoreStatus === 'connected' && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-200 px-2 py-0.5 rounded-full font-medium border border-emerald-400/30 hidden sm:flex items-center gap-1">
                    <Database size={10} className="text-emerald-300" />
                    <span>سحابي (Firestore)</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-emerald-200 break-words leading-snug">
                الطالب: <strong className="text-white">{studentName}</strong> • {activeSubject}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Toggle History Button */}
            <button
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isHistoryOpen 
                  ? 'bg-amber-400 text-emerald-950 shadow-md' 
                  : 'bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 hover:text-white border border-emerald-700/60'
              }`}
              title="عرض سجل المحادثات والاستفسارات السابقة"
            >
              <History size={15} />
              <span className="hidden sm:inline">سجل الاستفسارات</span>
              {chatSessions.length > 0 && (
                <span className="bg-emerald-950/40 text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold">
                  {chatSessions.length}
                </span>
              )}
            </button>

            {/* New Chat Button */}
            <button
              onClick={handleStartNewChat}
              className="px-2.5 sm:px-3 py-1.5 bg-emerald-800/80 hover:bg-emerald-700 text-emerald-100 hover:text-white rounded-xl text-xs font-bold border border-emerald-700/60 transition-all flex items-center gap-1 cursor-pointer"
              title="بدء محادثة جديدة"
            >
              <Plus size={15} />
              <span className="hidden md:inline">محادثة جديدة</span>
            </button>

            {/* Maximize / Minimize */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-800/60 rounded-xl transition-colors hidden sm:block cursor-pointer"
              title={isExpanded ? 'تصغير النافذة' : 'تكبير النافذة'}
            >
              {isExpanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-emerald-200 hover:text-white hover:bg-emerald-800/60 rounded-xl transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X size={19} />
            </button>
          </div>
        </div>

        {/* Teacher Authority Principle Banner */}
        <div className="bg-emerald-900/10 border-b border-emerald-900/15 px-4 py-1.5 flex items-center justify-between text-[11px] text-emerald-950 font-medium shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-700 shrink-0" />
            <span>المساعد ملتزم بمبدأ: المعلم هو المرجعية العلمية المعتمدة للمادة (شروحات مستندة لمراجع معتمدة).</span>
          </div>
          <span className="text-[10px] text-emerald-800 font-bold bg-white px-2 py-0.5 rounded-full border border-emerald-200 hidden md:inline">
            سجل دائم لكل استفساراتك 🗂️
          </span>
        </div>

        {/* ================= MAIN CONTENT WRAPPER (CHAT + CHAT HISTORY DRAWER) ================= */}
        <div className="flex-1 flex overflow-hidden relative">

          {/* ================= CHAT HISTORY SIDEBAR / DRAWER ================= */}
          {isHistoryOpen && (
            <div className="w-full sm:w-80 md:w-88 bg-stone-50 border-l border-stone-200 flex flex-col shrink-0 z-20 transition-all duration-200 absolute inset-y-0 right-0 sm:relative shadow-xl sm:shadow-none">
              
              {/* History Top Bar */}
              <div className="p-3.5 bg-white border-b border-stone-200 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 text-stone-800 font-black text-xs">
                  <History size={16} className="text-emerald-700" />
                  <span>سجل الاستفسارات السابقة</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleStartNewChat}
                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="بدء محادثة جديدة"
                  >
                    <Plus size={14} />
                    <span className="text-[11px]">جديدة</span>
                  </button>
                  <button
                    onClick={() => setIsHistoryOpen(false)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
                    title="إغلاق السجل"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* History Search & Filters */}
              <div className="p-3 border-b border-stone-200 bg-stone-50 space-y-2 shrink-0">
                <div className="relative">
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="ابحث في الاستفسارات السابقة..."
                    className="w-full bg-white border border-stone-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-emerald-700"
                  />
                  <Search size={14} className="absolute right-2.5 top-2 text-stone-400" />
                  {historySearchQuery && (
                    <button
                      onClick={() => setHistorySearchQuery('')}
                      className="absolute left-2.5 top-2 text-stone-400 hover:text-stone-700 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Subject Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
                  {['all', 'بيولوجيا', 'كيمياء', 'فيزياء', 'رياضيات'].map((subj) => (
                    <button
                      key={subj}
                      onClick={() => setHistorySubjectFilter(subj)}
                      className={`px-2.5 py-1 rounded-full font-bold whitespace-nowrap transition-all cursor-pointer ${
                        historySubjectFilter === subj
                          ? 'bg-emerald-900 text-white shadow-2xs'
                          : 'bg-white text-stone-600 hover:bg-stone-200/70 border border-stone-200'
                      }`}
                    >
                      {subj === 'all' ? 'الكل' : subj}
                    </button>
                  ))}
                </div>
              </div>

              {/* History Sessions List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {isLoadingHistory ? (
                  <div className="p-8 text-center text-stone-400 text-xs font-medium space-y-2">
                    <RefreshCcw size={20} className="animate-spin mx-auto text-emerald-700" />
                    <p>جارٍ تحميل السجل السحابي من Firestore...</p>
                  </div>
                ) : filteredSessions.length === 0 ? (
                  <div className="p-8 text-center text-stone-400 text-xs font-medium space-y-2">
                    <History size={28} className="mx-auto opacity-30 text-stone-500" />
                    <p className="font-bold text-stone-600">لا توجد استفسارات سابقة بعد</p>
                    <p className="text-[11px] text-stone-400 leading-relaxed">
                      عند طرحك لأي سؤال على المساعد الذكي، سيتم تسجيله هنا تلقائياً لتعود إليه في أي وقت.
                    </p>
                    <button
                      onClick={handleStartNewChat}
                      className="mt-2 px-3 py-1.5 bg-emerald-800 text-white rounded-xl text-xs font-bold hover:bg-emerald-900 transition-all cursor-pointer"
                    >
                      ابدأ استفسارك الأول 🚀
                    </button>
                  </div>
                ) : (
                  filteredSessions.map((session) => {
                    const isActive = session.id === activeSessionId;
                    const dateFormatted = session.updatedAt 
                      ? new Date(session.updatedAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })
                      : 'سابق';

                    return (
                      <div
                        key={session.id}
                        onClick={() => handleSelectSession(session)}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer text-right group relative ${
                          isActive
                            ? 'bg-emerald-50/90 border-emerald-600 shadow-xs'
                            : 'bg-white hover:bg-stone-100/80 border-stone-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-xs font-black truncate ${isActive ? 'text-emerald-950' : 'text-stone-800'}`}>
                              {session.title || 'استفسار بدون عنوان'}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${getSubjectColor(session.subject)}`}>
                                {session.subject}
                              </span>
                              <span className="text-[9px] text-stone-400 flex items-center gap-1">
                                <Clock size={10} />
                                <span>{dateFormatted}</span>
                              </span>
                              <span className="text-[9px] text-stone-400">
                                • {session.messages?.length || session.messageCount || 0} رسائل
                              </span>
                            </div>
                          </div>

                          {/* Delete Action with Confirmation */}
                          <div className="shrink-0">
                            {deleteConfirmId === session.id ? (
                              <div className="flex items-center gap-1 bg-rose-50 p-1 rounded-lg border border-rose-200">
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteSession(session.id, e)}
                                  className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold"
                                  title="تأكيد الحذف"
                                >
                                  حذف
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirmId(null);
                                  }}
                                  className="px-1.5 py-0.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded text-[10px]"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(session.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title="حذف هذا الاستفسار"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* History Footer Info */}
              <div className="p-3 bg-stone-100 border-t border-stone-200 text-[10px] text-stone-500 flex items-center justify-between shrink-0 font-medium">
                <span className="flex items-center gap-1">
                  <Database size={12} className="text-emerald-700" />
                  <span>حفظ سحابي مشفر بـ Firestore</span>
                </span>
                <span>{chatSessions.length} محادثات مسجلة</span>
              </div>
            </div>
          )}

          {/* ================= ACTIVE CHAT AREA ================= */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#FAF8F5]">

            {/* Quick Suggestion Chips */}
            <div className="bg-stone-50/90 border-b border-stone-200 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
              <span className="text-stone-400 font-bold shrink-0 flex items-center gap-1">
                <Zap size={13} className="text-amber-500" />
                <span>مقترحات سريعة:</span>
              </span>
              <button
                onClick={() => handleQuickPrompt('اشرح لي تفاعلات الضوء باختصار وتوضيح لمعادلة ATP و NADPH')}
                className="px-3 py-1 bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-900 border border-stone-200 rounded-full shrink-0 font-medium transition-colors cursor-pointer"
              >
                تفاعلات الضوء
              </button>
              <button
                onClick={() => handleQuickPrompt('ما هو الفرق بين الثايلاكويد والستروما وأين تحدث حلقة كالفن؟')}
                className="px-3 py-1 bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-900 border border-stone-200 rounded-full shrink-0 font-medium transition-colors cursor-pointer"
              >
                الثايلاكويد vs الستروما
              </button>
              <button
                onClick={() => handleQuickPrompt('أنشئ لي اختباراً قصيراً (Mini-Quiz) من 3 أسئلة بجروت لاختبار حفظي')}
                className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-full shrink-0 font-bold transition-colors cursor-pointer"
              >
                اختبار قصير (Mini-Quiz) 📝
              </button>
              <button
                onClick={() => handleQuickPrompt('لخص لي درس التمثيل الضوئي في 5 نقاط أساسية مقتضبة')}
                className="px-3 py-1 bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-900 border border-stone-200 rounded-full shrink-0 font-medium transition-colors cursor-pointer"
              >
                تلخيص الدرس في 5 نقاط
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {messages.map((msg) => {
                const isMe = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                        isMe
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-emerald-950 text-amber-400'
                      }`}
                    >
                      {isMe ? <User size={16} /> : <Bot size={16} />}
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed group relative ${
                        isMe
                          ? 'bg-emerald-900 text-white rounded-tr-none'
                          : 'bg-white text-stone-800 border border-stone-200 rounded-tl-none shadow-xs'
                      }`}
                    >
                      {isMe ? (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      ) : (
                        <div className="space-y-2">
                          <MathJaxSection content={msg.text} />
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-black/5">
                        <span
                          className={`text-[10px] ${
                            isMe ? 'text-emerald-300' : 'text-stone-400'
                          }`}
                        >
                          {msg.timestamp}
                        </span>

                        {/* Copy button */}
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.text)}
                          className={`text-[10px] flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity cursor-pointer ${
                            isMe ? 'text-emerald-200' : 'text-stone-500'
                          }`}
                          title="نسخ محتوى الرسالة"
                        >
                          {copiedMessageId === msg.id ? (
                            <>
                              <Check size={11} className="text-emerald-400" />
                              <span>تم النسخ!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span>نسخ</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-950 text-amber-400 flex items-center justify-center text-xs shrink-0">
                    <Bot size={16} />
                  </div>
                  <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-none p-4 shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                      <div className="w-2 h-2 rounded-full bg-emerald-700 animate-pulse" />
                      <div className="w-2 h-2 rounded-full bg-emerald-700 animate-pulse delay-100" />
                      <div className="w-2 h-2 rounded-full bg-emerald-700 animate-pulse delay-200" />
                      <span>المساعد يفكر ويراجع محتوى المساق العلمي المعتمد...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Attached Snippet Alert if any */}
            {attachedSnippet && (
              <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 flex items-center justify-between text-xs text-amber-900 shrink-0">
                <span className="truncate">
                  مرفق: {attachedSnippet.slice(0, 70)}...
                </span>
                <button
                  onClick={() => setAttachedSnippet(null)}
                  className="text-amber-800 font-bold hover:underline cursor-pointer"
                >
                  إلغاء المرفق
                </button>
              </div>
            )}

            {/* Chat Input Bar */}
            <div className="p-3 sm:p-4 bg-white border-t border-stone-200 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="اكتب استفسارك للمساعد الذكي هنا... (مثال: اشرح معادلة حلقة كالفن خطوة بخطوة)"
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-xs sm:text-sm focus:outline-none focus:border-emerald-700 transition-colors"
                  />

                  <button
                    type="button"
                    onClick={() => handleAttachUnit('التمثيل الضوئي')}
                    className="absolute left-3 top-3 text-stone-400 hover:text-emerald-700 transition-colors cursor-pointer"
                    title="إرفاق مقتطف من درس التمثيل الضوئي للسؤال عنه"
                  >
                    <Paperclip size={18} />
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || (!inputQuery.trim() && !attachedSnippet)}
                  className="p-3 bg-emerald-900 hover:bg-emerald-950 text-white rounded-2xl disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-sm flex items-center justify-center shrink-0"
                  title="إرسال"
                >
                  <Send size={18} className="rotate-180" />
                </button>
              </form>
              <div className="flex items-center justify-between mt-2 text-[10px] text-stone-400">
                <span>يعتمد المساعد على منهاج البجروت المعتمد في أكاديمية التفوق.</span>
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                  className="text-emerald-700 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <History size={12} />
                  <span>سجل الاستفسارات السابقة ({chatSessions.length})</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
};
