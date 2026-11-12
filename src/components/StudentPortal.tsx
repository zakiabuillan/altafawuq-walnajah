import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  RotateCcw, 
  HelpCircle, 
  FileText, 
  Download, 
  Send, 
  Bot, 
  Clock, 
  Award, 
  GraduationCap, 
  CheckSquare, 
  Lock, 
  Calendar, 
  Bell, 
  LogOut, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle, 
  Check, 
  ExternalLink,
  Search,
  Flame,
  Printer,
  X,
  History,
  Compass,
  Phone,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatWhatsAppPhone972, cleanLocalPhoneDigits } from '../lib/phoneUtils';
import { SmartClassroomBoardView } from './whiteboard/SmartClassroomBoardView';
import { MathJaxSection } from './MathJaxSection';
import { EdraakApp } from './edraak/EdraakApp';
import { AIAssistantModal } from './edraak/AIAssistantModal';
import EducationalMaterialsManager from './EducationalMaterialsManager';
import PdfAnnotatorViewerModal from './PdfAnnotatorViewerModal';
import { StudentPerformanceSummary } from './StudentPerformanceSummary';
import { StudentOnboardingTourModal } from './StudentOnboardingTourModal';
import { EducationalResourceDoc } from '../types/educationalResources';
import { StudentAccount, getCurrentlyLoggedInStudent, saveStudentAccount, logoutStudent } from '../lib/studentAccounts';
import { ACADEMIC_CURRICULUM, SubjectCurriculum, EducationalUnit, Lesson, InteractivePracticeQuestion } from '../lib/studentCurriculum';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface StudentPortalProps {
  currentStudent?: StudentAccount | null;
  onLogout?: () => void;
  sessions?: any[];
  teachers?: any[];
}

export const StudentPortal: React.FC<StudentPortalProps> = ({
  currentStudent: initialStudent,
  onLogout,
  sessions = [],
  teachers = []
}) => {
  // 1. Current Student State (from props or localStorage or fallback demo)
  const [student, setStudent] = useState<StudentAccount>(() => {
    if (initialStudent) return initialStudent;
    const fromStorage = getCurrentlyLoggedInStudent();
    if (fromStorage) return fromStorage;
    // Fallback default demo student if opened directly
    return {
      id: 'student-mohammad-101',
      studentId: 'student-mohammad-101',
      name: 'محمد أحمد',
      username: 'mohammad101',
      password: 'Bio@2026',
      email: 'mohammad.ahmed@altafawuq.edu',
      phone: '059-9123456',
      grade: 'الثاني عشر (توجيهي علمي)',
      groupName: 'مجموعة التفوق للبجروت',
      academicId: 'TAF-2026-101',
      avatarUrl: '👨‍🎓',
      registeredSubjects: ['بيولوجيا', 'كيمياء'],
      isActive: true,
      isFirstLogin: false,
      termsAccepted: true,
      createdAt: '2026-09-01',
      completedLessonsCount: 4,
      completedUnitsCount: 1,
      averageGrade: 88
    };
  });

  // 2. Navigation State
  // 'dashboard' | 'curriculum' | 'materials_library' | 'assignments' | 'classes' | 'certificates' | 'ai_tutor' | 'smartboard' | 'edraak'
  const [activeNav, setActiveNav] = useState<'dashboard' | 'curriculum' | 'materials_library' | 'assignments' | 'classes' | 'certificates' | 'ai_tutor' | 'smartboard' | 'edraak'>('dashboard');

  // Curriculum Journey Drilldown States
  // Steps: 1. Subject -> 2. Unit -> 3. Lesson -> 4. Lesson Tabs (explanation, practice, quiz, certificate)
  const [selectedSubjectKey, setSelectedSubjectKey] = useState<string>('بيولوجيا');
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [lessonTab, setLessonTab] = useState<'explanation' | 'practice' | 'quiz' | 'certificate'>('explanation');

  // First Login Modal State
  const [showFirstLoginModal, setShowFirstLoginModal] = useState<boolean>(() => {
    return student?.isFirstLogin === true || student?.termsAccepted === false;
  });

  // Onboarding Tour Modal State (Opens automatically for new access or via manual button)
  const [showOnboardingTour, setShowOnboardingTour] = useState<boolean>(() => {
    try {
      return localStorage.getItem('student_onboarding_tour_completed') !== 'true';
    } catch {
      return false;
    }
  });
  const [firstLoginNewPassword, setFirstLoginNewPassword] = useState('');
  const [firstLoginConfirmPassword, setFirstLoginConfirmPassword] = useState('');
  const [showFirstNewPass, setShowFirstNewPass] = useState(false);
  const [showFirstConfirmPass, setShowFirstConfirmPass] = useState(false);
  const [firstLoginEmail, setFirstLoginEmail] = useState(student.email || '');
  const [firstLoginPhone, setFirstLoginPhone] = useState(cleanLocalPhoneDigits(student.phone || ''));
  const [firstLoginAvatar, setFirstLoginAvatar] = useState(student.avatarUrl || '👨‍🎓');
  const [firstLoginTermsAgreed, setFirstLoginTermsAgreed] = useState(false);
  const [firstLoginError, setFirstLoginError] = useState('');

  // Interactive Practice State
  const [currentPracticeIndex, setCurrentPracticeIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Final Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  // AI Assistant Chat State
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [activePdfResource, setActivePdfResource] = useState<EducationalResourceDoc | null>(null);
  const [aiInputMessage, setAiInputMessage] = useState('');
  const [aiChatHistory, setAiChatHistory] = useState<{ role: 'student' | 'tutor'; text: string; time: string }[]>([
    {
      role: 'tutor',
      text: 'مرحباً بك يا بطل! 🌟 أنا «المعلم الذكي لأكاديمية التفوق»، مساعدك التعليمي المتخصص لدعمك في فهم المادة التعليمية، حل التمارين خطوة بخطوة، والاستعداد للاختبارات اعتماداً على المصادر والمناهج المعتمدة. كيف يمكنني إرشادك اليوم؟',
      time: 'الآن'
    }
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Notifications State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      title: 'مرحباً بك في الأكاديمية! 🎉',
      body: 'تم تفعيل حسابك التعليمي الموحد وربطه بمساقات البجروت المعتمدة.',
      time: 'اليوم، 10:00 ص',
      read: false
    },
    {
      id: 'notif-2',
      title: 'حصة تفاعلية قادمة في البيولوجيا 🧬',
      body: 'موعد الحصة القادمة: غداً الساعة 05:00 م مع أ. د. زكي أبو علان (مراجعة حلقة كالفن).',
      time: 'أمس، 06:30 م',
      read: false
    },
    {
      id: 'notif-3',
      title: 'مهمة تدريبية جديدة 📝',
      body: 'تم نشر تدريبات الوحدة الأولى في الحسابات الكيميائية للمراجعة قبل الاختبار.',
      time: 'منذ يومين',
      read: true
    }
  ]);

  const [examSubmissions, setExamSubmissions] = useState<any[]>([]);

  // Real-time synchronization for student alerts and exam results
  useEffect(() => {
    const cleanPhone = cleanLocalPhoneDigits(student.phone || '');
    
    // 1. Listen to real-time student notifications
    const notifCol = collection(db, 'student_notifications');
    const unsubNotif = onSnapshot(notifCol, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        const p = cleanLocalPhoneDigits(data.studentPhone || '');
        const nameMatches = data.studentName && data.studentName.trim().toLowerCase() === student.name.trim().toLowerCase();
        const phoneMatches = Boolean(cleanPhone && p && (p === cleanPhone || cleanPhone.includes(p) || p.includes(cleanPhone)));
        
        if (phoneMatches || nameMatches) {
          list.push({
            id: d.id,
            title: data.title || 'نتيجة اختبار',
            body: data.message || '',
            time: data.createdAt ? new Date(data.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : 'الآن',
            read: data.isRead || false,
            whatsappUrl: data.whatsappUrl,
            score: data.score,
            gradeBand: data.gradeBand
          });
        }
      });
      if (list.length > 0) {
        setNotifications(prev => {
          const incomingIds = new Set(list.map(l => l.id));
          return [...list, ...prev.filter(p => !incomingIds.has(p.id))];
        });
      }
    }, (err) => console.warn("Error listening to student_notifications:", err));

    // 2. Listen to real examResults
    const examCol = collection(db, 'examResults');
    const unsubExams = onSnapshot(examCol, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        const p = cleanLocalPhoneDigits(data.studentPhone || '');
        const nameMatches = data.studentName && data.studentName.trim().toLowerCase() === student.name.trim().toLowerCase();
        const phoneMatches = Boolean(cleanPhone && p && (p === cleanPhone || cleanPhone.includes(p) || p.includes(cleanPhone)));

        if (phoneMatches || nameMatches) {
          list.push({ id: d.id, ...data });
        }
      });
      list.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
      setExamSubmissions(list);
    }, (err) => console.warn("Error listening to student examResults:", err));

    return () => {
      unsubNotif();
      unsubExams();
    };
  }, [student.phone, student.name]);

  // Handle First Login Submission
  const handleFirstLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFirstLoginError('');

    if (!firstLoginNewPassword.trim() || firstLoginNewPassword.length < 6) {
      setFirstLoginError('يرجى إدخال كلمة مرور جديدة لا تقل عن 6 خانات وتتضمن حروفاً وأرقاماً.');
      return;
    }
    if (firstLoginNewPassword !== firstLoginConfirmPassword) {
      setFirstLoginError('كلمتا المرور غير متطابقتين. يرجى التحقق وإعادة الإدخال.');
      return;
    }
    if (!firstLoginTermsAgreed) {
      setFirstLoginError('يجب الموافقة على سياسة الاستخدام وميثاق النزاهة الأكاديمية للمتابعة.');
      return;
    }

    const finalPhone = firstLoginPhone.trim() ? formatWhatsAppPhone972(firstLoginPhone) : (student.phone || '');

    const updated: StudentAccount = {
      ...student,
      password: firstLoginNewPassword.trim(),
      email: firstLoginEmail.trim(),
      phone: finalPhone,
      avatarUrl: firstLoginAvatar,
      isFirstLogin: false,
      termsAccepted: true
    };

    await saveStudentAccount(updated);
    setStudent(updated);
    setShowFirstLoginModal(false);
  };

  // Safe Logout
  const handleLogout = () => {
    logoutStudent();
    if (onLogout) {
      onLogout();
    } else {
      window.location.href = window.location.origin + '?view=login';
    }
  };

  // Check if student has access to a subject
  const studentRegisteredSubjects = student.registeredSubjects || ['بيولوجيا'];
  const currentSubjectCurriculum = ACADEMIC_CURRICULUM[selectedSubjectKey] || ACADEMIC_CURRICULUM['بيولوجيا'];

  // Current Unit & Lesson
  const currentUnit = currentSubjectCurriculum.units.find(u => u.id === selectedUnitId) || currentSubjectCurriculum.units[0];
  const currentLesson = currentUnit?.lessons.find(l => l.id === selectedLessonId) || currentUnit?.lessons[0];
  const currentPractice = currentLesson?.practiceQuestions[currentPracticeIndex] || currentLesson?.practiceQuestions[0];

  // Ask AI Assistant Handler
  const handleSendAiMessage = async () => {
    if (!aiInputMessage.trim()) return;
    const userMsg = aiInputMessage.trim();
    setAiInputMessage('');
    
    const newChat = [
      ...aiChatHistory,
      { role: 'student' as const, text: userMsg, time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) }
    ];
    setAiChatHistory(newChat);
    setIsAiLoading(true);

    try {
      const lessonDetails = currentLesson ? `
الوحدة: ${currentUnit?.title || ''}
الدرس الحالي: ${currentLesson.title}
الملخص: ${currentLesson.summary || ''}
محتوى الدرس: ${currentLesson.content || ''}
      ` : `المادة: ${selectedSubjectKey}`;

      const res = await fetch('/api/student/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          studentName: student.name,
          subject: selectedSubjectKey,
          curriculumContext: lessonDetails,
          sourcesContext: `منهاج ومراجع ${selectedSubjectKey} المعتمدة من معلم المادة في أكاديمية التفوق أون لاين`,
          studentsContext: `الصف: ${student.grade} - المجموعة: ${student.groupName} - الدرس الحالي: ${currentLesson?.title || 'عام'}`
        })
      });
      const data = await res.json();
      if (data.success && data.reply) {
        setAiChatHistory([
          ...newChat,
          { role: 'tutor', text: data.reply, time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) }
        ]);
      } else {
        setAiChatHistory([
          ...newChat,
          { role: 'tutor', text: data.error || 'أعتذر، واجهت صعوبة مؤقتة في معالجة الشرح، يرجى المحاولة مجدداً.', time: 'الآن' }
        ]);
      }
    } catch (err) {
      setAiChatHistory([
        ...newChat,
        { role: 'tutor', text: 'تعذر الاتصال بخادم الأكاديمية الذكي. يرجى التحقق من اتصالك بالإنترنت.', time: 'الآن' }
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Handle Quiz Submission
  const handleFinalQuizSubmit = () => {
    if (!currentLesson?.finalQuiz) return;
    const questions = currentLesson.finalQuiz.questions;
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctAnswerIndex) {
        correctCount++;
      }
    });
    const percentage = Math.round((correctCount / questions.length) * 100);
    setQuizScore(percentage);
    setQuizSubmitted(true);

    // Save quiz attempt for Student Performance Summary Chart
    try {
      const stored = localStorage.getItem(`student_quizzes_${student.id}`);
      const history = stored ? JSON.parse(stored) : [];
      history.push({
        id: `q-${Date.now()}`,
        quizTitle: currentLesson.title,
        subject: selectedSubjectKey,
        score: percentage,
        date: 'اليوم',
        totalQuestions: questions.length
      });
      localStorage.setItem(`student_quizzes_${student.id}`, JSON.stringify(history.slice(-8)));
    } catch {
      // ignore
    }

    // If passed, increment completed lessons
    if (percentage >= (currentLesson.finalQuiz.passScorePercentage || 80)) {
      const updated: StudentAccount = {
        ...student,
        completedLessonsCount: (student.completedLessonsCount || 0) + 1,
        averageGrade: Math.round(((student.averageGrade || 85) + percentage) / 2)
      };
      setStudent(updated);
      saveStudentAccount(updated);
    }
  };

  // If user requested Edraak interactive course mode
  if (activeNav === 'edraak') {
    return (
      <EdraakApp
        onBackToPortal={() => setActiveNav('curriculum')}
        currentStudent={{
          id: student.id || student.studentId || 'student-portal-user',
          name: student.name || 'طالب أكاديمية التفوق',
          email: student.email || ''
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-800 font-sans flex flex-col select-none selection:bg-[#D49B29]/30" dir="rtl">
      
      {/* ===================== SECURE STUDENT HEADER ===================== */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#133827] to-[#1e583c] text-white flex items-center justify-center shadow-md font-black text-xl">
              🎓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900 tracking-tight">أكاديمية التفوق أون لاين</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  بوابة الطالب الرسمية
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-bold">منصة التعلم الأكاديمي والتحضير للبجروت المعتمدة</p>
            </div>
          </div>

          {/* Student Profile Pill & Quick Controls (STRICTLY NO STAFF LINKS) */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Ask AI Assistant Floating Button */}
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Bot size={15} />
              <span className="hidden sm:inline">المساعد الذكي</span>
            </button>

            {/* Notifications Center */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="الإشعارات والتنبيهات"
              >
                <Bell size={17} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
                )}
              </button>

              {/* Notifications Popover */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 text-right space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-black text-slate-800">آخر الإشعارات الأكاديمية</span>
                      <button 
                        onClick={() => {
                          setNotifications(notifications.map(n => ({ ...n, read: true })));
                        }}
                        className="text-[10px] text-emerald-700 font-bold hover:underline cursor-pointer"
                      >
                        تحديد الكل كمقروء
                      </button>
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {notifications.map(n => (
                        <div 
                          key={n.id} 
                          className={`p-3 rounded-xl border text-xs space-y-1 transition-all ${
                            n.read ? 'bg-slate-50/70 border-slate-100 text-slate-600' : 'bg-amber-50/60 border-amber-200/60 text-slate-900'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-black text-slate-800">{n.title}</span>
                            <span className="text-[9px] text-slate-400 font-bold">{n.time}</span>
                          </div>
                          <p className="text-[11px] leading-relaxed font-medium">{n.body}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Onboarding Tour Trigger Button */}
            <button
              onClick={() => setShowOnboardingTour(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/90 text-xs font-black transition-all cursor-pointer shadow-2xs"
              title="جولة تعريفية لبوابة الطالب لشرح الدروس والاختبارات"
            >
              <Compass size={14} className="text-amber-600" />
              <span className="hidden sm:inline">جولة تعريفية 🧭</span>
            </button>

            {/* Student Identity Card */}
            <div className="flex items-center gap-2.5 bg-slate-100/90 border border-slate-200 px-3 py-1.5 rounded-2xl">
              <div className="w-8 h-8 rounded-xl bg-white shadow-xs flex items-center justify-center text-base">
                {student.avatarUrl || '👨‍🎓'}
              </div>
              <div className="hidden md:block text-right">
                <span className="text-xs font-black text-slate-900 block leading-tight">{student.name}</span>
                <span className="text-[10px] text-slate-500 font-bold block">{student.grade}</span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              title="تسجيل الخروج من الحساب"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>

        {/* Primary Tab Navigation Bar */}
        <div className="border-t border-slate-200/60 bg-white px-4 sm:px-6 lg:px-8 overflow-x-auto no-scrollbar">
          <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 py-2">
            {[
              { id: 'dashboard', label: 'لوحة التحكم الرئيسية', icon: BookOpen },
              { id: 'curriculum', label: 'المواد ورحلة التعلم', icon: GraduationCap },
              { id: 'smartboard', label: 'اللوح الذكي 4K 🖥️', icon: Sparkles },
              { id: 'materials_library', label: 'المكتبة والمراجع المعتمدة 📚', icon: FileText },
              { id: 'assignments', label: 'المهام والواجبات', icon: CheckSquare },
              { id: 'classes', label: 'الحصص والجدول', icon: Calendar },
              { id: 'certificates', label: 'النتائج والشهادات', icon: Award },
              { id: 'ai_tutor', label: 'المساعد الذكي (AI)', icon: Bot }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeNav === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveNav(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-[#133827] text-white shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ===================== MAIN PORTAL BODY ===================== */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* -------------------- VIEW 1: DASHBOARD (لوحة التحكم الرئيسية) -------------------- */}
        {activeNav === 'dashboard' && (
          <div className="space-y-8">
            
            {/* Welcome Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#133827] via-[#1a4a34] to-[#0D365A] text-white p-6 sm:p-8 shadow-xl">
              <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-black border border-white/10">
                    <Sparkles size={13} />
                    <span>مرحباً بك في فصلك الأكاديمي المباشر</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                    أهلاً بك مجدداً يا {student.name}! 🌟
                  </h1>
                  <p className="text-xs sm:text-sm text-emerald-100/90 font-medium max-w-2xl leading-relaxed">
                    الصف: <strong className="text-white">{student.grade}</strong> | المجموعة: <strong className="text-amber-300">{student.groupName || 'مجموعة التفوق للبجروت'}</strong>
                    {student.academicId && <> | الرقم الأكاديمي: <span className="font-mono text-white/90">{student.academicId}</span></>}
                  </p>
                </div>

                {/* Direct Action to Learning Journey */}
                <div className="flex flex-wrap gap-2.5">
                  <button
                    onClick={() => setShowOnboardingTour(true)}
                    className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl text-xs font-black transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Compass size={15} className="text-amber-300" />
                    <span>دليل المنصة 🧭</span>
                  </button>
                  <button
                    onClick={() => setActiveNav('curriculum')}
                    className="px-5 py-3 bg-amber-400 hover:bg-amber-300 text-emerald-950 rounded-2xl text-xs font-black shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <span>متابعة رحلة التعلم 🚀</span>
                    <ArrowRight size={14} className="rotate-180" />
                  </button>
                  <button
                    onClick={() => setActiveNav('edraak')}
                    className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-2xl text-xs font-black transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                  >
                    <GraduationCap size={15} className="text-amber-300" />
                    <span>مساق إدراك التفاعلي</span>
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Summary Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                { 
                  title: 'المواد المسجل بها', 
                  value: `${studentRegisteredSubjects.length} مواد`, 
                  subtitle: studentRegisteredSubjects.join(' • '),
                  icon: BookOpen, 
                  color: 'text-emerald-700', 
                  bg: 'bg-emerald-50 border-emerald-200/80' 
                },
                { 
                  title: 'الدروس المكتملة', 
                  value: `${student.completedLessonsCount || 4} دروس`, 
                  subtitle: 'مكتملة مع الشرح والتقييم',
                  icon: CheckCircle2, 
                  color: 'text-indigo-700', 
                  bg: 'bg-indigo-50 border-indigo-200/80' 
                },
                { 
                  title: 'الوحدات المنجزة', 
                  value: `${student.completedUnitsCount || 1} وحدات`, 
                  subtitle: 'من المنهاج المعتمد',
                  icon: GraduationCap, 
                  color: 'text-amber-700', 
                  bg: 'bg-amber-50 border-amber-200/80' 
                },
                { 
                  title: 'متوسط الدرجات', 
                  value: `${student.averageGrade || 88}%`, 
                  subtitle: 'المستوى الأكاديمي العام',
                  icon: Award, 
                  color: 'text-purple-700', 
                  bg: 'bg-purple-50 border-purple-200/80' 
                }
              ].map((kpi, idx) => {
                const Icon = kpi.icon;
                return (
                  <div key={idx} className={`p-5 rounded-2xl border ${kpi.bg} shadow-xs space-y-2 text-right transition-all hover:shadow-md`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-600">{kpi.title}</span>
                      <div className={`p-2 rounded-xl bg-white shadow-xs ${kpi.color}`}>
                        <Icon size={16} />
                      </div>
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</div>
                    <p className="text-[10px] font-bold text-slate-500 truncate">{kpi.subtitle}</p>
                  </div>
                );
              })}
            </div>

            {/* Student Performance Summary Component (Progress bar, Recent Quiz scores chart, and Next steps card) */}
            <StudentPerformanceSummary
              student={student}
              activeSubjectKey={selectedSubjectKey}
              sessions={sessions}
              teachers={teachers}
              onNavigateToLesson={(subKey, unitId, lessonId) => {
                setSelectedSubjectKey(subKey);
                setSelectedUnitId(unitId);
                setSelectedLessonId(lessonId);
                setLessonTab('explanation');
                setActiveNav('curriculum');
              }}
              onViewAllCurriculum={() => setActiveNav('curriculum')}
              onViewSchedule={() => setActiveNav('classes')}
            />

            {/* Dashboard Sections Grid: Registered Subjects Cards & Learning Journey */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900">المواد الدراسية المسجل بها 📚</h2>
                  <p className="text-xs text-slate-500 font-medium">اختر المادة للانتقال إلى الوحدات والدروس والمراجع المعتمدة</p>
                </div>
                <button
                  onClick={() => setActiveNav('curriculum')}
                  className="text-xs font-black text-[#133827] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>استعراض الرحلة التعليمية كاملة</span>
                  <ChevronLeft size={14} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {studentRegisteredSubjects.map(subKey => {
                  const subject = ACADEMIC_CURRICULUM[subKey] || {
                    id: subKey,
                    subjectName: subKey,
                    englishName: 'Science',
                    icon: '🔬',
                    leadTeacher: 'كادر أكاديمية التفوق',
                    units: []
                  };
                  return (
                    <div 
                      key={subKey}
                      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all space-y-4 text-right flex flex-col justify-between group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">{subject.icon}</span>
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                            مسجل ونشط ✓
                          </span>
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-800 transition-colors">
                            {subject.subjectName} ({subject.englishName})
                          </h3>
                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            المعلم المعتمد: {subject.leadTeacher}
                          </p>
                        </div>
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between font-bold">
                          <span>الوحدات الدراسية: {subject.units.length} وحدة</span>
                          <span>الدروس المتاحة: {subject.units.reduce((acc, u) => acc + u.lessons.length, 0)} درس</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedSubjectKey(subKey);
                          setSelectedUnitId(subject.units[0]?.id || null);
                          setSelectedLessonId(subject.units[0]?.lessons[0]?.id || null);
                          setActiveNav('curriculum');
                        }}
                        className="w-full py-2.5 bg-[#133827] hover:bg-[#1a4a34] text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      >
                        <span>بدء الدراسة والمراجعة</span>
                        <ChevronLeft size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Widgets 3-Column: Upcoming Classes, Tasks, Exams */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Widget 1: Upcoming Classes */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 text-right">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-emerald-700" />
                    <h3 className="text-xs font-black text-slate-900">الحصص القادمة</h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">مباشر ومسجل</span>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-950">بيولوجيا - حلقة كالفن</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-200/60 text-emerald-800">غداً 05:00 م</span>
                    </div>
                    <p className="text-[10px] text-slate-600 font-medium">معلم المادة: أ. د. زكي أبو علان</p>
                    <div className="pt-1 flex items-center justify-between text-[10px]">
                      <span className="text-emerald-700 font-bold">عبر القاعة التفاعلية</span>
                      <button 
                        type="button"
                        onClick={() => setActiveNav('classes')}
                        className="text-xs font-black text-emerald-900 hover:text-emerald-700 hover:underline cursor-pointer transition-colors"
                      >
                        انضمام للحصة
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800">كيمياء - الحساب المولي</span>
                      <span className="text-[10px] font-bold text-slate-500">الخميس 06:00 م</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">معلم المادة: أ. د. كمال منصور</p>
                    <div className="pt-1 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-bold">عبر القاعة التفاعلية</span>
                      <button 
                        type="button"
                        onClick={() => setActiveNav('classes')}
                        className="text-xs font-black text-slate-700 hover:text-slate-900 hover:underline cursor-pointer transition-colors"
                      >
                        جدول الحصص
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Widget 2: Required Tasks & Assignments */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 text-right">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare size={16} className="text-indigo-700" />
                    <h3 className="text-xs font-black text-slate-900">المهام المطلوبة</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveNav('assignments')}
                    className="text-[10px] font-bold text-indigo-700 hover:underline cursor-pointer"
                  >
                    2 مهام نشطة ←
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div 
                    onClick={() => setActiveNav('assignments')}
                    className="p-3 rounded-xl bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 hover:border-indigo-300 transition-all space-y-1 cursor-pointer"
                    title="الانتقال للمهمة"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-indigo-950">حل مسائل التمثيل الضوئي (STP)</span>
                      <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">متبقي يومين</span>
                    </div>
                    <p className="text-[10px] text-slate-600 font-medium">المادة: بيولوجيا | الدرس الأول والثاني</p>
                  </div>

                  <div 
                    onClick={() => setActiveNav('assignments')}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 hover:border-slate-300 transition-all space-y-1 cursor-pointer"
                    title="الانتقال للمهمة"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800">مراجعة قوانين نيوتن ومسائل القوة</span>
                      <span className="text-[9px] font-bold text-slate-500">متبقي 4 أيام</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">المادة: فيزياء | تدريبات الميكانيكا</p>
                  </div>
                </div>
              </div>

              {/* Widget 3: Upcoming Exams */}
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 text-right">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-amber-700" />
                    <h3 className="text-xs font-black text-slate-900">الاختبارات القادمة</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveNav('curriculum')}
                    className="text-[10px] font-bold text-amber-700 hover:underline cursor-pointer"
                  >
                    تقييم معتمد ←
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div 
                    onClick={() => setActiveNav('curriculum')}
                    className="p-3 rounded-xl bg-amber-50/50 hover:bg-amber-50 border border-amber-200/60 hover:border-amber-300 transition-all space-y-1 cursor-pointer"
                    title="الانتقال للاختبار والمراجعة"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-950">اختبار بجروت تجريبي - بيولوجيا</span>
                      <span className="text-[10px] font-bold text-amber-800">الأحد القادم</span>
                    </div>
                    <p className="text-[10px] text-slate-600 font-medium">الوحدة: الأيض الخلوي والتمثيل الضوئي (50 دقيقة)</p>
                  </div>

                  <div 
                    onClick={() => setActiveNav('curriculum')}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/60 hover:border-slate-300 transition-all space-y-1 cursor-pointer"
                    title="الانتقال للاختبار والمراجعة"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800">اختبار المول والحسابات الكيميائية</span>
                      <span className="text-[10px] font-bold text-slate-500">الأسبوع بعد القادم</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">الوحدة: الكيمياء العامة (30 دقيقة)</p>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* -------------------- VIEW 2: CURRICULUM & LEARNING JOURNEY (رحلة الطالب التعليمية) -------------------- */}
        {activeNav === 'curriculum' && (
          <div className="space-y-6">
            
            {/* Subject Selector Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">رحلة الطالب التعليمية 🧭</h2>
                <p className="text-xs text-slate-500 font-medium">
                  المواد الدراسية ← الوحدات التعليمية ← الدروس ← الشرح والمراجع ← التدريب ← الاختبار ← الشهادة
                </p>
              </div>

              {/* Subject Tabs (Filtered to registered subjects only) */}
              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60">
                {studentRegisteredSubjects.map(subKey => {
                  const isSel = selectedSubjectKey === subKey;
                  return (
                    <button
                      key={subKey}
                      onClick={() => {
                        setSelectedSubjectKey(subKey);
                        const cur = ACADEMIC_CURRICULUM[subKey];
                        setSelectedUnitId(cur?.units[0]?.id || null);
                        setSelectedLessonId(cur?.units[0]?.lessons[0]?.id || null);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        isSel ? 'bg-[#133827] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>{subKey}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Educational Journey Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Left Column: Units & Lessons Tree */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3 text-right">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-black text-slate-800">وحدات ودروس {selectedSubjectKey}</span>
                    <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded">معتمدة</span>
                  </div>

                  <div className="space-y-3">
                    {currentSubjectCurriculum.units.map(unit => {
                      const isUnitActive = currentUnit?.id === unit.id;
                      return (
                        <div key={unit.id} className="space-y-1.5">
                          <button
                            onClick={() => {
                              setSelectedUnitId(unit.id);
                              setSelectedLessonId(unit.lessons[0]?.id || null);
                            }}
                            className={`w-full text-right p-2.5 rounded-xl text-xs font-black flex items-center justify-between transition-all cursor-pointer ${
                              isUnitActive ? 'bg-emerald-50 text-emerald-950 border border-emerald-200' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <span>الوحدة {unit.unitNumber}: {unit.title}</span>
                            <span className="text-[10px] text-slate-400 font-bold">{unit.lessons.length} دروس</span>
                          </button>

                          {/* Lessons in this unit */}
                          {isUnitActive && (
                            <div className="pr-3 space-y-1 border-r-2 border-emerald-300 mr-2">
                              {unit.lessons.map(lesson => {
                                const isLessonActive = currentLesson?.id === lesson.id;
                                return (
                                  <button
                                    key={lesson.id}
                                    onClick={() => {
                                      setSelectedLessonId(lesson.id);
                                      setCurrentPracticeIndex(0);
                                      setSelectedAnswer('');
                                      setIsAnswerRevealed(false);
                                      setQuizSubmitted(false);
                                      setQuizScore(null);
                                    }}
                                    className={`w-full text-right p-2 rounded-lg text-[11px] font-bold flex items-center justify-between transition-all cursor-pointer ${
                                      isLessonActive ? 'bg-[#133827] text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span className="truncate">الدرس {lesson.lessonNumber}: {lesson.title}</span>
                                    <CheckCircle2 size={12} className={isLessonActive ? 'text-amber-300' : 'text-slate-300'} />
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Edraak Switcher Banner if Biology */}
                {selectedSubjectKey === 'بيولوجيا' && (
                  <div className="bg-gradient-to-br from-emerald-900 to-[#0D365A] text-white p-4 rounded-2xl shadow-sm space-y-2.5 text-right">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="text-amber-400" size={18} />
                      <span className="text-xs font-black">منهاج إدراك التفاعلي</span>
                    </div>
                    <p className="text-[10px] text-emerald-100 leading-relaxed font-medium">
                      يمكنك خوض التجربة البصرية الكاملة لمحاكاة التمثيل الضوئي والشروحات ثلاثية الأبعاد.
                    </p>
                    <button
                      onClick={() => setActiveNav('edraak')}
                      className="w-full py-2 bg-amber-400 hover:bg-amber-500 text-emerald-950 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>فتح مساق إدراك الآن</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Active Lesson Workspace & Step Journey */}
              <div className="lg:col-span-3 space-y-4">
                
                {/* Lesson Header Card & Mode Switcher */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 text-right">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] text-emerald-800 font-bold mb-1">
                        <span>{selectedSubjectKey}</span>
                        <span>•</span>
                        <span>الوحدة {currentUnit?.unitNumber}: {currentUnit?.title}</span>
                      </div>
                      <h2 className="text-base sm:text-lg font-black text-slate-900">
                        الدرس {currentLesson?.lessonNumber}: {currentLesson?.title}
                      </h2>
                    </div>

                    {/* Lesson Sub-Tabs following strict user specification */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200/60 self-stretch sm:self-auto justify-center">
                      {[
                        { id: 'explanation', label: 'الشرح والمراجع 📖' },
                        { id: 'practice', label: 'المراجعة والتدريب 💡' },
                        { id: 'quiz', label: 'الاختبار النهائي 📝' },
                        { id: 'certificate', label: 'النتائج والشهادة 🏆' }
                      ].map(t => (
                        <button
                          key={t.id}
                          onClick={() => setLessonTab(t.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                            lessonTab === t.id ? 'bg-[#133827] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 1. EXPLANATION & APPROVED REFERENCES TAB */}
                  {lessonTab === 'explanation' && (
                    <div className="space-y-6 pt-2">
                      
                      {/* Summary callout */}
                      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/70 text-xs text-emerald-950 leading-relaxed font-bold space-y-1">
                        <span className="font-black text-emerald-900 block">💡 ملخص الدرس الأكاديمي:</span>
                        <p>{currentLesson?.summary}</p>
                      </div>

                      {/* Rich Content Markdown & Formulas */}
                      <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed text-slate-800 space-y-4">
                        <MathJaxSection content={currentLesson?.contentMarkdown || ''} />
                      </div>

                      {/* Teacher-Approved References Section (PDF, DOCX) */}
                      <div className="border-t border-slate-200/80 pt-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-[#133827]" />
                            <h3 className="text-xs font-black text-slate-900">المراجع والملفات المعتمدة من معلم المادة</h3>
                          </div>
                          <span className="text-[10px] text-slate-500 font-bold">المصدر العلمي الحصري المعتمد</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {currentLesson?.approvedReferences.map(ref => (
                            <div 
                              key={ref.id}
                              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-right hover:border-emerald-300 transition-colors"
                            >
                              <div className="space-y-0.5">
                                <span className="text-xs font-black text-slate-900 block leading-snug">{ref.title}</span>
                                <span className="text-[10px] text-slate-500 font-medium block">
                                  باعتماد: {ref.teacherName} • الحجم: {ref.size}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActivePdfResource({
                                      id: ref.id,
                                      title: ref.title,
                                      subject: student.selectedSubject || 'بيولوجيا',
                                      unit_id: currentUnit?.id || 'unit-bio-1',
                                      unit_title: currentUnit?.title || 'البناء الضوئي',
                                      type: 'pdf',
                                      pdf_category: 'شروحات ومذكرات دراسية',
                                      content: ref.notes || currentLesson?.summary || 'محتوى المرجع المعتمد من المعلم مع الملاحظات التوضيحية والشروحات المحددة.',
                                      teacher_id: 'teacher-zaki',
                                      teacher_name: ref.teacherName || 'أ. د. زكي أبو علان',
                                      academic_citation: ref.title,
                                      file_name: `${ref.title}.pdf`,
                                      file_size: ref.size,
                                      page_count: 3,
                                      pdf_annotations: [
                                        {
                                          id: `anno-${ref.id}-1`,
                                          pageNumber: 1,
                                          selectionCoords: { x: 8, y: 14, width: 84, height: 18 },
                                          note: 'ملاحظة المعلم: ركز على المعادلة العامة وتوزيع ذرات الأكسجين الناتجة من شطر الماء في هذا الجزء.',
                                          color: 'amber',
                                          authorName: ref.teacherName || 'أ. د. زكي أبو علان',
                                          createdAt: new Date().toISOString()
                                        },
                                        {
                                          id: `anno-${ref.id}-2`,
                                          pageNumber: 1,
                                          selectionCoords: { x: 10, y: 46, width: 80, height: 16 },
                                          note: 'ملاحظة مهمة للامتحان: قارن بين التفاعلات الضوئية وحلقة كالفن من حيث موقع الحدوث والمدخلات والمخرجات.',
                                          color: 'emerald',
                                          authorName: ref.teacherName || 'أ. د. زكي أبو علان',
                                          createdAt: new Date().toISOString()
                                        }
                                      ],
                                      created_at: new Date().toISOString(),
                                      updated_at: new Date().toISOString()
                                    });
                                  }}
                                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-[11px] font-black flex items-center gap-1 transition-colors cursor-pointer"
                                  title="فتح مستند الـ PDF واستعراض الملاحظات التوضيحية المدونة من المعلم"
                                >
                                  <FileText size={13} className="text-emerald-700" />
                                  <span>تصفح وملاحظات المعلم 📄</span>
                                </button>
                                <button
                                  onClick={() => alert(`جاري تنزيل الملف المعتمد: "${ref.title}"...`)}
                                  className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 shadow-xs"
                                  title="تحميل الملف"
                                >
                                  <Download size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bottom action to proceed to Practice */}
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => setLessonTab('practice')}
                          className="px-5 py-2.5 bg-[#133827] hover:bg-[#1a4a34] text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer"
                        >
                          <span>الانتقال إلى المراجعة والتدريب</span>
                          <ChevronLeft size={14} />
                        </button>
                      </div>

                    </div>
                  )}

                  {/* 2. PRACTICE & STEP-BY-STEP REVIEW TAB */}
                  {lessonTab === 'practice' && (
                    <div className="space-y-6 pt-2">
                      
                      {/* Step Navigation Pill */}
                      <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                        <span className="text-xs font-black text-slate-700">
                          السؤال التدريبي ({currentPracticeIndex + 1} من {currentLesson?.practiceQuestions.length})
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            disabled={currentPracticeIndex === 0}
                            onClick={() => {
                              setCurrentPracticeIndex(prev => prev - 1);
                              setSelectedAnswer('');
                              setIsAnswerRevealed(false);
                              setShowHint(false);
                            }}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40 cursor-pointer"
                          >
                            <ChevronRight size={14} />
                          </button>
                          <button
                            disabled={currentPracticeIndex >= (currentLesson?.practiceQuestions.length || 1) - 1}
                            onClick={() => {
                              setCurrentPracticeIndex(prev => prev + 1);
                              setSelectedAnswer('');
                              setIsAnswerRevealed(false);
                              setShowHint(false);
                            }}
                            className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-40 cursor-pointer"
                          >
                            <ChevronLeft size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Question Box */}
                      {currentPractice && (
                        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
                          <div className="flex items-start gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-[#133827] text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                              {currentPractice.questionNumber}
                            </span>
                            <h3 className="text-sm font-black text-slate-900 leading-relaxed">
                              {currentPractice.questionText}
                            </h3>
                          </div>

                          {/* Options if True/False or Multiple Choice */}
                          {currentPractice.options && (
                            <div className="space-y-2 pt-2">
                              {currentPractice.options.map((opt, oIdx) => {
                                const isChosen = selectedAnswer === opt;
                                return (
                                  <button
                                    key={oIdx}
                                    onClick={() => setSelectedAnswer(opt)}
                                    className={`w-full text-right p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                                      isChosen 
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-black' 
                                        : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    <span>{opt}</span>
                                    {isChosen && <Check size={15} className="text-emerald-700" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Verification & Hint Controls */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                            <button
                              onClick={() => setShowHint(!showHint)}
                              className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <HelpCircle size={14} />
                              <span>{showHint ? 'إخفاء التلميح' : 'طلب تلميح توجيهي'}</span>
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setIsAnswerRevealed(true)}
                                className="px-4 py-2 bg-[#133827] hover:bg-[#1a4a34] text-white rounded-xl text-xs font-black transition-all cursor-pointer"
                              >
                                <span>تحقق من الإجابة والتفسير العلمي</span>
                              </button>
                            </div>
                          </div>

                          {/* Hint Box */}
                          {showHint && currentPractice.hint && (
                            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 font-bold leading-relaxed">
                              💡 <strong>تلميح المعلم:</strong> {currentPractice.hint}
                            </div>
                          )}

                          {/* Detailed Step-by-Step Explanation following user instruction */}
                          {isAnswerRevealed && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-5 rounded-2xl bg-[#FAF8F5] border border-slate-200 space-y-3"
                            >
                              <div className="flex items-center gap-2 text-xs font-black text-emerald-900 border-b border-slate-200 pb-2">
                                <Sparkles size={15} className="text-amber-500" />
                                <span>التفسير العلمي المتسلسل والنتيجة النهائية:</span>
                              </div>
                              <p className="text-xs font-extrabold text-slate-900">{currentPractice.explanation.conclusion}</p>
                              
                              <div className="space-y-1.5 pr-2 border-r-2 border-emerald-400">
                                {currentPractice.explanation.steps.map((st, sIdx) => (
                                  <p key={sIdx} className="text-xs text-slate-700 leading-relaxed font-medium">
                                    • {st}
                                  </p>
                                ))}
                              </div>

                              {currentPractice.explanation.latexFormula && (
                                <div className="p-3 bg-white rounded-xl border border-slate-200 text-center font-serif text-xs">
                                  <MathJaxSection content={`$$${currentPractice.explanation.latexFormula}$$`} />
                                </div>
                              )}

                              {currentPractice.explanation.englishTerms && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {currentPractice.explanation.englishTerms.map((term, tIdx) => (
                                    <span key={tIdx} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                      {term.ar} ({term.en})
                                    </span>
                                  ))}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </div>
                      )}

                      {/* Proceed to Quiz Button */}
                      <div className="flex justify-between items-center pt-2">
                        <button
                          onClick={() => setLessonTab('explanation')}
                          className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                        >
                          ← العودة للشرح
                        </button>
                        <button
                          onClick={() => setLessonTab('quiz')}
                          className="px-5 py-2.5 bg-[#133827] hover:bg-[#1a4a34] text-white rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer"
                        >
                          <span>الانتقال إلى الاختبار النهائي</span>
                          <ChevronLeft size={14} />
                        </button>
                      </div>

                    </div>
                  )}

                  {/* 3. FINAL EXAM / QUIZ TAB */}
                  {lessonTab === 'quiz' && (
                    <div className="space-y-6 pt-2">
                      
                      {/* Quiz Intro Bar */}
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-indigo-50 border border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-right">
                        <div>
                          <h3 className="text-xs font-black text-slate-900">{currentLesson?.finalQuiz?.title}</h3>
                          <p className="text-[10px] text-slate-600 font-medium">
                            زمن الاختبار: {currentLesson?.finalQuiz?.timeLimitMinutes} دقائق • درجة الاجتياز: {currentLesson?.finalQuiz?.passScorePercentage}%
                          </p>
                        </div>
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-white text-slate-800 border border-slate-200 shadow-xs">
                          {currentLesson?.finalQuiz?.questions.length} أسئلة تقييمية
                        </span>
                      </div>

                      {/* Quiz Questions List */}
                      <div className="space-y-5">
                        {currentLesson?.finalQuiz?.questions.map((q, qIdx) => {
                          const chosen = quizAnswers[qIdx];
                          return (
                            <div key={q.id} className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200 space-y-3">
                              <div className="flex items-start gap-2">
                                <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                                  {qIdx + 1}
                                </span>
                                <p className="text-xs font-black text-slate-900 leading-relaxed">{q.questionText}</p>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {q.options.map((opt, oIdx) => {
                                  const isSelected = chosen === oIdx;
                                  return (
                                    <button
                                      key={oIdx}
                                      disabled={quizSubmitted}
                                      onClick={() => {
                                        setQuizAnswers(prev => ({ ...prev, [qIdx]: oIdx }));
                                      }}
                                      className={`p-2.5 rounded-xl border text-xs text-right font-bold transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-emerald-100/80 border-emerald-300 text-emerald-950 font-black'
                                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Submit Quiz Action */}
                      {!quizSubmitted ? (
                        <div className="flex justify-end pt-3">
                          <button
                            onClick={handleFinalQuizSubmit}
                            className="px-6 py-3 bg-[#133827] hover:bg-[#1a4a34] text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                          >
                            <CheckSquare size={15} />
                            <span>تسليم الاختبار النهائي واحتساب النتيجة</span>
                          </button>
                        </div>
                      ) : (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className={`p-6 rounded-3xl border text-center space-y-3 ${
                            (quizScore || 0) >= 80 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                              : 'bg-amber-50 border-amber-200 text-amber-950'
                          }`}
                        >
                          <div className="text-3xl">{(quizScore || 0) >= 80 ? '🎉' : '⚠️'}</div>
                          <h3 className="text-base font-black">
                            {(quizScore || 0) >= 80 ? 'مبارك! اجتزت الاختبار بنجاح باهر' : 'أحسنت المحاولة! يرجى مراجعة المفاهيم'}
                          </h3>
                          <div className="text-2xl font-black">{quizScore}%</div>
                          <p className="text-xs font-medium">
                            {(quizScore || 0) >= 80 
                              ? 'تم اعتماد النتيجة وتسجيل الدرس كمكتمل في سجلك الأكاديمي، وإصدار شهادة الإنجاز!'
                              : 'درجة الاجتياز المطلوبة هي 80%. يمكنك إعادة مراجعة الشرح وتقديم الاختبار مجدداً.'}
                          </p>

                          <div className="flex justify-center gap-3 pt-2">
                            {(quizScore || 0) >= 80 ? (
                              <button
                                onClick={() => setLessonTab('certificate')}
                                className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-black cursor-pointer shadow-md"
                              >
                                عرض شهادة الإتمام الأكاديمية 🏆
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setQuizSubmitted(false);
                                  setQuizScore(null);
                                  setQuizAnswers({});
                                }}
                                className="px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-black cursor-pointer"
                              >
                                إعادة تقديم الاختبار ↺
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}

                    </div>
                  )}

                  {/* 4. RESULTS & CERTIFICATE TAB */}
                  {lessonTab === 'certificate' && (
                    <div className="space-y-6 pt-2">
                      <div className="bg-[#FAF8F5] border-2 border-amber-300/80 rounded-3xl p-6 sm:p-10 shadow-lg text-center space-y-6 relative overflow-hidden">
                        
                        {/* Gold Border Watermark Decor */}
                        <div className="absolute top-2 right-2 text-4xl opacity-15 pointer-events-none">🏆</div>
                        <div className="absolute bottom-2 left-2 text-4xl opacity-15 pointer-events-none">🎓</div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Altafawuq Online Academy</span>
                          <h2 className="text-xl sm:text-2xl font-black text-slate-900">شهادة إتمام واجتياز أكاديمي معتمدة</h2>
                          <p className="text-xs text-slate-500 font-bold">بموجب المعايير الأكاديمية لمناهج البجروت والعلوم</p>
                        </div>

                        <div className="py-4 space-y-2 border-y border-amber-200/60 max-w-lg mx-auto">
                          <p className="text-xs text-slate-600 font-medium">تشهد أكاديمية التفوق أون لاين بأن الطالب المتميز:</p>
                          <div className="text-xl font-black text-[#133827]">{student.name}</div>
                          <p className="text-xs text-slate-600 font-medium">
                            قد أتم بنجاح دراسة واجتياز اختبار مساق: <strong>{selectedSubjectKey}</strong>
                          </p>
                          <p className="text-xs font-bold text-slate-800">
                            موضوع: ({currentLesson?.title}) بنسبة تفوق: <span className="text-emerald-700 font-black">{quizScore || student.averageGrade || 90}%</span>
                          </p>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold max-w-md mx-auto pt-2">
                          <div>
                            <span>التاريخ: {new Date().toLocaleDateString('ar-EG')}</span>
                          </div>
                          <div>
                            <span>معلم المادة: {currentSubjectCurriculum.leadTeacher}</span>
                          </div>
                        </div>

                        <div className="pt-2 flex justify-center gap-3">
                          <button
                            onClick={() => window.print()}
                            className="px-5 py-2.5 bg-[#133827] hover:bg-[#1a4a34] text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <Printer size={14} />
                            <span>طباعة أو حفظ الشهادة (PDF)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>

          </div>
        )}

        {/* -------------------- VIEW: MATERIALS LIBRARY (المكتبة والمراجع المعتمدة وبنك التدريبات) -------------------- */}
        {activeNav === 'materials_library' && (
          <div className="space-y-6" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">المكتبة والمراجع المعتمدة وبنك التدريبات 📚</h2>
                <p className="text-xs text-slate-500 font-medium">المواد والمراجع والملخصات المعتمدة من معلمك مع مساعد أكاديمي ذكي واختبارات تجريبية فورية</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/80 shadow-xs">
              <EducationalMaterialsManager
                initialViewMode="student"
                studentGroupName={student.groupName}
                studentId={student.studentId || student.id}
              />
            </div>
          </div>
        )}

        {/* -------------------- VIEW 3: ASSIGNMENTS (المهام والواجبات) -------------------- */}
        {activeNav === 'assignments' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">المهام والواجبات المطلوبة 📝</h2>
                <p className="text-xs text-slate-500 font-medium">قائمة الواجبات المنزلية والمهام التدريبية المعتمدة من معلميك</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  id: 'task-1',
                  subject: 'بيولوجيا',
                  title: 'موازنة معادلة التمثيل الضوئي وحساب نواتج ATP',
                  dueDate: '2026-09-08',
                  status: 'قيد الإنجاز',
                  teacher: 'أ. د. زكي أبو علان'
                },
                {
                  id: 'task-2',
                  subject: 'كيمياء',
                  title: 'حل أسئلة الحجم المولي للغازات في الظروف المعيارية STP',
                  dueDate: '2026-09-10',
                  status: 'جديد',
                  teacher: 'أ. د. كمال منصور'
                },
                {
                  id: 'task-3',
                  subject: 'فيزياء',
                  title: 'تطبيق القانون الثاني لنيوتن على الأجسام على المستويات المائلة',
                  dueDate: '2026-09-12',
                  status: 'جديد',
                  teacher: 'د. سمير الخطيب'
                }
              ].map(t => (
                <div key={t.id} className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3 text-right">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {t.subject}
                    </span>
                    <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded">
                      تاريخ التسليم: {t.dueDate}
                    </span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900">{t.title}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">إشراف المعلم: {t.teacher}</p>
                  
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => {
                        setSelectedSubjectKey(t.subject);
                        setActiveNav('curriculum');
                      }}
                      className="px-4 py-2 bg-[#133827] hover:bg-[#1a4a34] text-white rounded-xl text-xs font-black cursor-pointer"
                    >
                      فتح تفاصيل المهمة والحل
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* -------------------- VIEW 4: CLASSES & SCHEDULE (الحصص والجدول الأسبوعي) -------------------- */}
        {activeNav === 'classes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">جدول الحصص المباشرة واللقاءات 📅</h2>
                <p className="text-xs text-slate-500 font-medium">مواعيد الحصص التفاعلية مع المعلمين وروابط القاعات المباشرة</p>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4 text-right">
              <div className="space-y-3">
                {[
                  {
                    day: 'الإثنين',
                    time: '05:00 م - 06:00 م',
                    subject: 'بيولوجيا',
                    topic: 'مراجعة حلقة كالفن والعوامل المحددة للتمثيل الضوئي',
                    teacher: 'أ. د. زكي أبو علان',
                    isLive: true
                  },
                  {
                    day: 'الأربعاء',
                    time: '06:00 م - 07:00 م',
                    subject: 'كيمياء',
                    topic: 'تطبيقات عملية على قوانين الغازات والمول',
                    teacher: 'أ. د. كمال منصور',
                    isLive: false
                  },
                  {
                    day: 'السبت',
                    time: '04:30 م - 05:30 م',
                    subject: 'فيزياء',
                    topic: 'حل نماذج بجروت في الميكانيكا وقوانين الحركة',
                    teacher: 'د. سمير الخطيب',
                    isLive: false
                  }
                ].map((c, idx) => (
                  <div 
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{c.subject} - {c.topic}</span>
                        {c.isLive && (
                          <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 animate-pulse">
                            الحصة القادمة 🔴
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        اليوم: {c.day} | الموعد: {c.time} | المعلم: {c.teacher}
                      </p>
                    </div>

                    <button
                      onClick={() => alert(`الانتقال للقاعة التفاعلية لمادة ${c.subject}...`)}
                      className="px-4 py-2 bg-[#133827] hover:bg-[#1a4a34] text-white rounded-xl text-xs font-black transition-all cursor-pointer shrink-0"
                    >
                      دخول القاعة التفاعلية 🎥
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* -------------------- VIEW 5: CERTIFICATES & RESULTS (النتائج والشهادات) -------------------- */}
        {activeNav === 'certificates' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">سجل النتائج والشهادات المعتمدة 🏆</h2>
                <p className="text-xs text-slate-500 font-medium">سجل درجاتك في الاختبارات وشهادات الإنجاز الصادرة من الأكاديمية</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Dynamic Exam Results from Real Submissions */}
              {examSubmissions.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-800">نتائج الاختبارات المصححة تلقائياً 📝</span>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {examSubmissions.length} اختبارات
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {examSubmissions.map(sub => {
                      const isPassing = sub.passed !== undefined ? sub.passed : (sub.score >= 60);
                      const gradeBand = sub.gradeBand || {
                        label: isPassing ? 'اجتياز معتمد 🏆' : 'يحتاج مراجعة 🔴',
                        badge: isPassing ? 'ناجح' : 'إعادة'
                      };

                      return (
                        <div key={sub.id} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 text-right">
                          <div className="flex items-center justify-between">
                            <span className="text-2xl">🎖️</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-black px-3 py-1 rounded-full border ${
                                isPassing 
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                                  : 'bg-rose-50 text-rose-800 border-rose-200'
                              }`}>
                                {gradeBand.label}
                              </span>
                              <span className="text-base font-black text-[#0D365A]">
                                {sub.score}%
                              </span>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-sm font-black text-slate-900">{sub.examTitle || 'اختبار إلكتروني'}</h3>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              القاعدة المطبقة: <span className="font-bold text-slate-700">{sub.ruleName || 'القاعدة المعيارية'}</span>
                              {sub.submittedAt && ` • ${new Date(sub.submittedAt).toLocaleDateString('ar-EG')}`}
                            </p>
                          </div>

                          {sub.feedbackNote && (
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs text-slate-600 font-medium leading-relaxed">
                              💡 {sub.feedbackNote}
                            </div>
                          )}

                          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold">
                              {sub.correctCount ?? 0} صحيحة من {sub.answersCount || sub.answers?.length || 0}
                            </span>
                            <button
                              onClick={() => window.print()}
                              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                            >
                              <Printer size={13} />
                              <span>طباعة الشهادة</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Standard Course Certificates */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-black text-slate-700 block">شهادات الدورات التأسيسية المعتمدة 📜</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[
                    {
                      id: 'cert-1',
                      subject: 'بيولوجيا',
                      title: 'شهادة إتمام وحدة الأيض الخلوي والتمثيل الضوئي',
                      grade: '92%',
                      date: '2026-09-01',
                      teacher: 'أ. د. زكي أبو علان'
                    },
                    {
                      id: 'cert-2',
                      subject: 'كيمياء',
                      title: 'شهادة اجتياز اختبار الحسابات الكيميائية والمول (مرجع VEB Chemistry)',
                      grade: '88%',
                      date: '2026-08-28',
                      teacher: 'أ. د. كمال منصور'
                    }
                  ].map(c => (
                    <div key={c.id} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 text-right">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl">🎖️</span>
                        <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                          الدرجة: {c.grade}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">{c.title}</h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          المادة: {c.subject} • تاريخ الإصدار: {c.date} • اعتماد: {c.teacher}
                        </p>
                      </div>
                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={() => window.print()}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                        >
                          <Printer size={13} />
                          <span>طباعة الشهادة الرسمية</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- VIEW: SMART CLASSROOM BOARD VIEW (اللوح الذكي التفاعلي 4K) -------------------- */}
        {activeNav === 'smartboard' && (
          <div className="w-full -mt-2">
            <SmartClassroomBoardView
              onClose={() => setActiveNav('dashboard')}
            />
          </div>
        )}

        {/* -------------------- VIEW 6: AI TUTOR DEDICATED VIEW (المساعد الذكي) -------------------- */}
        {activeNav === 'ai_tutor' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs text-right space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Bot size={22} className="text-[#133827]" />
                  <h2 className="text-base font-black text-slate-900">المعلم الذكي لأكاديمية التفوق</h2>
                </div>
                <button
                  onClick={() => setIsAiModalOpen(true)}
                  className="px-4 py-2 bg-[#133827] hover:bg-[#1a4a34] text-white rounded-2xl text-xs font-black flex items-center gap-2 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
                >
                  <History size={14} />
                  <span>سجل الاستفسارات السابقة (Chat History)</span>
                </button>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                مساعد تعليمي متخصص في دعم الطلاب والإجابة عن استفساراتهم اعتماداً حصرياً على المصادر والمناهج المعتمدة داخل المنظومة، وتقديم الحلول خطوة بخطوة.
              </p>
            </div>

            {/* Chat Box */}
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-md flex flex-col h-[520px]">
              
              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto space-y-4 p-2 text-right">
                {aiChatHistory.map((msg, idx) => (
                  <div 
                    key={idx} 
                    className={`flex flex-col ${msg.role === 'student' ? 'items-end' : 'items-start'}`}
                  >
                    <div 
                      className={`max-w-xl p-4 rounded-2xl text-xs leading-relaxed ${
                        msg.role === 'student'
                          ? 'bg-[#133827] text-white rounded-br-none'
                          : 'bg-[#FAF8F5] border border-slate-200 text-slate-900 rounded-bl-none'
                      }`}
                    >
                      {msg.role === 'tutor' ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-emerald-900 font-black text-[11px]">
                            <Sparkles size={13} className="text-amber-500" />
                            <span>المعلم الذكي:</span>
                          </div>
                          <div className="font-medium whitespace-pre-line">
                            <MathJaxSection content={msg.text} />
                          </div>
                        </div>
                      ) : (
                        <div className="font-medium">{msg.text}</div>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 font-bold px-1 mt-1">{msg.time}</span>
                  </div>
                ))}

                {isAiLoading && (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl w-fit text-xs text-slate-600 font-bold animate-pulse">
                    <Bot size={16} className="text-[#133827]" />
                    <span>المعلم الذكي يقوم بتحليل الاستفسار وصياغة الحل والشرح خطوة بخطوة...</span>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <div className="border-t border-slate-100 pt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={aiInputMessage}
                  onChange={e => setAiInputMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendAiMessage()}
                  placeholder="اطرح سؤالك الأكاديمي في البيولوجيا أو الكيمياء أو الفيزياء أو الرياضيات..."
                  className="flex-1 bg-slate-50 border border-slate-200 px-4 py-3 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-[#133827]"
                />
                <button
                  onClick={handleSendAiMessage}
                  disabled={isAiLoading || !aiInputMessage.trim()}
                  className="px-5 py-3 bg-[#133827] hover:bg-[#1a4a34] text-white rounded-2xl text-xs font-black disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>إرسال</span>
                  <Send size={13} />
                </button>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* ===================== FIRST LOGIN MANDATORY PROTOCOL MODAL ===================== */}
      <AnimatePresence>
        {showFirstLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 max-w-lg w-full p-6 sm:p-8 space-y-6 text-right font-sans my-8"
            >
              <div className="flex items-center gap-3.5 border-b border-slate-100 pb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs text-2xl shrink-0">
                  🔐
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">أول تسجيل دخول: إعداد حساب الطالب</h3>
                  <p className="text-[11px] text-slate-500 font-bold">يرجى تغيير كلمة المرور وتحديث بياناتك والموافقة على اللوائح</p>
                </div>
              </div>

              {firstLoginError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold leading-relaxed flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{firstLoginError}</span>
                </div>
              )}

              <form onSubmit={handleFirstLoginSubmit} className="space-y-4">
                
                {/* 1. Change Password */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
                  <span className="text-xs font-black text-slate-800 block">1. تغيير كلمة المرور الأولية (إلزامي):</span>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-600 block">كلمة المرور الجديدة:</label>
                      <button
                        type="button"
                        onClick={() => setShowFirstNewPass(!showFirstNewPass)}
                        className="text-[10px] font-bold text-slate-500 hover:text-[#133827] flex items-center gap-1 cursor-pointer"
                      >
                        {showFirstNewPass ? <EyeOff size={12} /> : <Eye size={12} />}
                        <span>{showFirstNewPass ? "إخفاء" : "إظهار"}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showFirstNewPass ? "text" : "password"}
                        value={firstLoginNewPassword}
                        onChange={e => setFirstLoginNewPassword(e.target.value)}
                        placeholder="أدخل كلمة مرور قوية (6 خانات على الأقل)"
                        className="w-full bg-white border border-slate-200 px-3.5 py-2.5 pl-10 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#133827]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowFirstNewPass(!showFirstNewPass)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        title={showFirstNewPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                      >
                        {showFirstNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-600 block">تأكيد كلمة المرور الجديدة:</label>
                      <button
                        type="button"
                        onClick={() => setShowFirstConfirmPass(!showFirstConfirmPass)}
                        className="text-[10px] font-bold text-slate-500 hover:text-[#133827] flex items-center gap-1 cursor-pointer"
                      >
                        {showFirstConfirmPass ? <EyeOff size={12} /> : <Eye size={12} />}
                        <span>{showFirstConfirmPass ? "إخفاء" : "إظهار"}</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showFirstConfirmPass ? "text" : "password"}
                        value={firstLoginConfirmPassword}
                        onChange={e => setFirstLoginConfirmPassword(e.target.value)}
                        placeholder="أعد كتابة كلمة المرور للتأكيد"
                        className="w-full bg-white border border-slate-200 px-3.5 py-2.5 pl-10 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#133827]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowFirstConfirmPass(!showFirstConfirmPass)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        title={showFirstConfirmPass ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                      >
                        {showFirstConfirmPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Update Personal Details */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
                  <span className="text-xs font-black text-slate-800 block">2. تحديث البيانات الشخصية والصورة:</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-600 block">البريد الإلكتروني:</label>
                      <input
                        type="email"
                        value={firstLoginEmail}
                        onChange={e => setFirstLoginEmail(e.target.value)}
                        placeholder="بريدك الإلكتروني"
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#133827]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-600 block">رقم الهاتف / واتساب (المقدمة 972+ تلقائية):</label>
                      <div className="relative flex items-center" dir="ltr">
                        <div className="bg-emerald-50 border border-r-0 border-slate-200 text-emerald-800 font-mono font-black text-[11px] px-2.5 py-2 rounded-l-xl flex items-center gap-1 shrink-0 select-none">
                          <Phone size={11} className="text-emerald-600" />
                          <span>+972</span>
                        </div>
                        <input
                          type="tel"
                          value={firstLoginPhone}
                          onChange={e => setFirstLoginPhone(cleanLocalPhoneDigits(e.target.value))}
                          placeholder="50 123 4567"
                          className="w-full bg-white border border-slate-200 px-3 py-2 rounded-r-xl text-xs text-slate-900 focus:outline-none focus:border-emerald-600 font-mono font-bold text-left"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-600 block">اختر الرمز أو الصورة الشخصية:</label>
                    <div className="flex gap-2">
                      {['👨‍🎓', '👩‍🎓', '👨‍🔬', '👩‍🔬', '🌟'].map(emoji => (
                        <button
                          type="button"
                          key={emoji}
                          onClick={() => setFirstLoginAvatar(emoji)}
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center text-lg transition-all cursor-pointer ${
                            firstLoginAvatar === emoji ? 'bg-emerald-100 border-emerald-400 scale-105' : 'bg-white border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. Accept Terms & Policy */}
                <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={firstLoginTermsAgreed}
                      onChange={e => setFirstLoginTermsAgreed(e.target.checked)}
                      className="accent-[#133827] mt-1 w-4 h-4 rounded cursor-pointer"
                    />
                    <div className="text-xs leading-relaxed text-slate-800 font-bold">
                      أوافق على <strong className="text-amber-900 underline">سياسة الاستخدام وميثاق النزاهة الأكاديمية</strong> لأكاديمية التفوق أون لاين، والالتزام بحضور الحصص وعدم مشاركة بيانات الدخول.
                    </div>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#133827] hover:bg-[#1a4a34] text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-950/20 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={16} />
                  <span>تأكيد البيانات وبدء رحلتي التعليمية 🚀</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================== FLOATING AI ASSISTANT MODAL WITH FIRESTORE CHAT HISTORY ===================== */}
      {isAiModalOpen && (
        <AIAssistantModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          studentName={student.name}
          studentId={student.id}
          activeSubject={selectedSubjectKey}
        />
      )}

      {/* ===================== PDF ANNOTATOR & VIEWER MODAL FOR STUDENT ===================== */}
      <AnimatePresence>
        {activePdfResource && (
          <PdfAnnotatorViewerModal
            resource={activePdfResource}
            mode="student"
            onClose={() => setActivePdfResource(null)}
            onUpdateAnnotations={(updated) => {
              setActivePdfResource((prev) => (prev ? { ...prev, pdf_annotations: updated } : null));
            }}
          />
        )}
      </AnimatePresence>

      {/* ===================== GUIDED ONBOARDING TOUR MODAL FOR STUDENTS ===================== */}
      <AnimatePresence>
        {showOnboardingTour && (
          <StudentOnboardingTourModal
            isOpen={showOnboardingTour}
            onClose={() => setShowOnboardingTour(false)}
            studentName={student.name}
            onNavigateToTab={(tab) => {
              setActiveNav(tab as any);
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
};
