import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Home, 
  CheckSquare, 
  Award, 
  Users, 
  UploadCloud, 
  Sparkles, 
  GraduationCap, 
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Bell,
  Bot,
  UserCheck,
  Settings2
} from 'lucide-react';
import { CurriculumData, StudentExamSubmission, StudentProgress, UserAccount, NotificationItem, Course, StudentUnitQuizResult } from './types';
import { DEFAULT_PHOTOSYNTHESIS_CURRICULUM } from './defaultPhotosynthesisData';
import { HomePage } from './HomePage';
import { LessonsView } from './LessonsView';
import { ReviewPracticeView } from './ReviewPracticeView';
import { FinalExamView } from './FinalExamView';
import { TeacherDashboardView } from './TeacherDashboardView';
import { CertificateModal } from './CertificateModal';
import { PdfUploadModal } from './PdfUploadModal';
import { StudentDashboardView } from './StudentDashboardView';
import { AdminDashboardView } from './AdminDashboardView';
import { AIAssistantModal } from './AIAssistantModal';
import { NotificationsModal } from './NotificationsModal';
import { fetchStudentQuizProgress, subscribeStudentQuizProgress } from '../../lib/studentProgressFirebase';

interface EdraakAppProps {
  onBackToPortal?: () => void;
  currentStudent?: {
    id: string;
    name: string;
    email?: string;
  };
}

// Initial sample submissions to demonstrate Teacher Dashboard & Charts immediately
const INITIAL_SAMPLE_SUBMISSIONS: StudentExamSubmission[] = [
  {
    id: 'sub-101',
    studentName: 'سارة خالد المنصور',
    studentEmail: 'sara.mansoor@example.com',
    score: 100,
    totalPoints: 100,
    percentage: 100,
    date: '2 سبتمبر 2026، 10:15 ص',
    answers: {},
    passed: true,
    timeSpentSeconds: 620
  },
  {
    id: 'sub-102',
    studentName: 'عمر طارق النجار',
    studentEmail: 'omar.najjar@example.com',
    score: 90,
    totalPoints: 100,
    percentage: 90,
    date: '2 سبتمبر 2026، 11:30 ص',
    answers: {},
    passed: true,
    timeSpentSeconds: 780
  },
  {
    id: 'sub-103',
    studentName: 'مريم إبراهيم درويش',
    studentEmail: 'maryam.darwish@example.com',
    score: 80,
    totalPoints: 100,
    percentage: 80,
    date: '2 سبتمبر 2026، 12:45 م',
    answers: {},
    passed: true,
    timeSpentSeconds: 840
  },
  {
    id: 'sub-104',
    studentName: 'محمود سامي الصالح',
    studentEmail: 'mahmoud.saleh@example.com',
    score: 70,
    totalPoints: 100,
    percentage: 70,
    date: '2 سبتمبر 2026، 01:10 م',
    answers: {},
    passed: false,
    timeSpentSeconds: 950
  },
  {
    id: 'sub-105',
    studentName: 'هدى عبد الرحمن الزين',
    studentEmail: 'huda.zein@example.com',
    score: 90,
    totalPoints: 100,
    percentage: 90,
    date: '2 سبتمبر 2026، 02:00 م',
    answers: {},
    passed: true,
    timeSpentSeconds: 710
  }
];

const INITIAL_USERS: UserAccount[] = [
  {
    id: 'u-1',
    fullName: 'د. محمود المشرف',
    email: 'admin@altafawuq.com',
    role: 'admin',
    status: 'active',
    createdAt: '2026-01-10',
    permissions: ['all']
  },
  {
    id: 'u-2',
    fullName: 'د. سامر الصالح',
    email: 'samer.saleh@altafawuq.com',
    role: 'teacher',
    status: 'active',
    createdAt: '2026-02-15',
    permissions: ['create_course', 'grade_exam', 'upload_files']
  },
  {
    id: 'u-3',
    fullName: 'سارة خالد المنصور',
    email: 'sara.mansoor@example.com',
    role: 'student',
    status: 'active',
    createdAt: '2026-03-01'
  },
  {
    id: 'u-4',
    fullName: 'عمر طارق النجار',
    email: 'omar.najjar@example.com',
    role: 'student',
    status: 'active',
    createdAt: '2026-03-12'
  }
];

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'n-1',
    title: 'ورقة عمل جديدة متوفرة',
    message: 'قام د. سامر الصالح برفع ورقة عمل بجروت جديدة حول تفاعلات الضوء وحلقة كالفن.',
    date: 'اليوم، 10:30 ص',
    type: 'file',
    isRead: false
  },
  {
    id: 'n-2',
    title: 'حصة تدريبية مباشرة',
    message: 'موعد الحصة المباشرة غداً الساعة 06:00 م عبر Google Meet لمراجعة مفاهيم إنزيم الروبيسكو.',
    date: 'أمس، 05:00 م',
    type: 'session',
    isRead: false
  },
  {
    id: 'n-3',
    title: 'إطلاق منشئ الاختبارات بالذكاء الاصطناعي',
    message: 'يمكن للمعلمين والطلاب الآن الاستفادة من توليد الاختبارات والأسئلة التدريبية الذكية.',
    date: '1 سبتمبر 2026',
    type: 'exam',
    isRead: true
  }
];

const INITIAL_COURSES: Course[] = [
  {
    id: 'c-photosynthesis',
    title: 'التمثيل الضوئي (Photosynthesis) - مستوى 5 وحدات',
    code: 'BIO-BAGRUT-5U',
    subject: 'بيولوجيا',
    gradeLevel: 'المرحلة الثانوية والبجروت',
    description: 'منهاج تفاعلي متكامل وشامل لعملية التمثيل الضوئي، التفاعلات الضوئية، وحلقة كالفن مع بنك أسئلة واختبار نهائي معتمد.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=600&q=80',
    instructorName: 'د. سامر الصالح',
    instructorTitle: 'كبير مدرسي البيولوجيا والبجروت',
    totalHours: 35,
    totalLectures: 4,
    studentsCount: 148,
    rating: 4.9,
    status: 'published'
  }
];

export const EdraakApp: React.FC<EdraakAppProps> = ({ onBackToPortal, currentStudent }) => {
  const activeStudent = currentStudent || {
    id: 'student-mohammad-101',
    name: 'محمد أحمد',
    email: 'mohammad.ahmed@altafawuq.edu'
  };

  // Current active LMS user role: 'student' | 'teacher' | 'admin'
  const [currentRole, setCurrentRole] = useState<'student' | 'teacher' | 'admin'>('student');

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'home' | 'student_portal' | 'lessons' | 'review' | 'exam' | 'teacher' | 'admin'>('home');

  // Curriculum State (default or uploaded from PDF)
  const [curriculum, setCurriculum] = useState<CurriculumData>(() => {
    try {
      const saved = localStorage.getItem('edraak_photosynthesis_curriculum');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.approvedReferences || parsed.approvedReferences.length === 0) {
          parsed.approvedReferences = DEFAULT_PHOTOSYNTHESIS_CURRICULUM.approvedReferences;
        }
        return parsed;
      }
    } catch (_) {}
    return DEFAULT_PHOTOSYNTHESIS_CURRICULUM;
  });

  // Student Progress State
  const [progress, setProgress] = useState<StudentProgress>(() => {
    try {
      const saved = localStorage.getItem('edraak_student_progress');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (_) {}
    return {
      unitsRead: ['unit-1'],
      reviewQuestionsAnswered: {},
      examCompleted: false
    };
  });

  // Teacher Submissions State
  const [submissions, setSubmissions] = useState<StudentExamSubmission[]>(() => {
    try {
      const saved = localStorage.getItem('edraak_exam_submissions');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (_) {}
    return INITIAL_SAMPLE_SUBMISSIONS;
  });

  // Admin users state
  const [users, setUsers] = useState<UserAccount[]>(() => {
    try {
      const saved = localStorage.getItem('edraak_lms_users');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_USERS;
  });

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem('edraak_lms_notifications');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return INITIAL_NOTIFICATIONS;
  });

  // Modals state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeCertificateSub, setActiveCertificateSub] = useState<StudentExamSubmission | null>(null);

  // Sync to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('edraak_photosynthesis_curriculum', JSON.stringify(curriculum));
    } catch (_) {}
  }, [curriculum]);

  useEffect(() => {
    try {
      localStorage.setItem('edraak_student_progress', JSON.stringify(progress));
    } catch (_) {}
  }, [progress]);

  useEffect(() => {
    try {
      localStorage.setItem('edraak_exam_submissions', JSON.stringify(submissions));
    } catch (_) {}
  }, [submissions]);

  useEffect(() => {
    try {
      localStorage.setItem('edraak_lms_users', JSON.stringify(users));
    } catch (_) {}
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem('edraak_lms_notifications', JSON.stringify(notifications));
    } catch (_) {}
  }, [notifications]);

  // Synchronize student unit quiz results with Firebase collection 'studentProgress'
  useEffect(() => {
    if (!activeStudent?.id) return;

    fetchStudentQuizProgress(activeStudent.id).then((savedResults) => {
      if (savedResults && Object.keys(savedResults).length > 0) {
        setProgress((prev) => ({
          ...prev,
          unitQuizResults: {
            ...(prev.unitQuizResults || {}),
            ...savedResults
          }
        }));
      }
    });

    const unsubscribe = subscribeStudentQuizProgress(activeStudent.id, (realtimeResults) => {
      setProgress((prev) => ({
        ...prev,
        unitQuizResults: {
          ...(prev.unitQuizResults || {}),
          ...realtimeResults
        }
      }));
    });

    return () => unsubscribe();
  }, [activeStudent.id]);

  // Handlers
  const handleSaveUnitQuizResult = (result: StudentUnitQuizResult) => {
    setProgress((prev) => ({
      ...prev,
      unitQuizResults: {
        ...(prev.unitQuizResults || {}),
        [result.unitId]: result
      }
    }));
  };

  const handleToggleUnitRead = (unitId: string) => {
    setProgress((prev) => {
      const isAlreadyRead = prev.unitsRead.includes(unitId);
      const updated = isAlreadyRead
        ? prev.unitsRead.filter((id) => id !== unitId)
        : [...prev.unitsRead, unitId];
      return { ...prev, unitsRead: updated };
    });
  };

  const handleRecordReviewAnswer = (questionId: string, isCorrect: boolean) => {
    setProgress((prev) => ({
      ...prev,
      reviewQuestionsAnswered: {
        ...prev.reviewQuestionsAnswered,
        [questionId]: isCorrect
      }
    }));
  };

  const handleExamSubmitted = (submission: StudentExamSubmission) => {
    setSubmissions((prev) => [submission, ...prev]);
    setProgress((prev) => ({
      ...prev,
      examCompleted: true,
      highestExamScore: Math.max(prev.highestExamScore || 0, submission.score),
      highestExamPercentage: Math.max(prev.highestExamPercentage || 0, submission.percentage),
      studentName: submission.studentName,
      studentEmail: submission.studentEmail
    }));
  };

  const handleOpenCertificate = (sub: StudentExamSubmission) => {
    setActiveCertificateSub(sub);
    setIsCertModalOpen(true);
  };

  const handleCurriculumLoaded = (newCurriculum: CurriculumData) => {
    setCurriculum(newCurriculum);
    setProgress({
      unitsRead: [],
      reviewQuestionsAnswered: {},
      examCompleted: false
    });
    setActiveTab('home');
  };

  const handleResetToDefault = () => {
    setCurriculum(DEFAULT_PHOTOSYNTHESIS_CURRICULUM);
    localStorage.removeItem('edraak_photosynthesis_curriculum');
  };

  const handleAddSampleSubmissions = () => {
    setSubmissions(INITIAL_SAMPLE_SUBMISSIONS);
  };

  // User management handlers
  const handleAddUser = (newUserData: Omit<UserAccount, 'id' | 'createdAt'>) => {
    const newUser: UserAccount = {
      ...newUserData,
      id: `u-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    setUsers(prev => [newUser, ...prev]);
  };

  const handleUpdateUser = (id: string, updates: Partial<UserAccount>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  };

  const handleDeleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const handleResetPassword = (id: string, newPass: string) => {
    alert(`تم تحديث كلمة المرور للمستخدم بنجاح.`);
  };

  const handleRoleChange = (role: 'student' | 'teacher' | 'admin') => {
    setCurrentRole(role);
    if (role === 'admin') {
      setActiveTab('admin');
    } else if (role === 'teacher') {
      setActiveTab('teacher');
    } else {
      setActiveTab('home');
    }
  };

  // Navigation Items dynamic based on Role
  const navItems = [
    ...(currentRole === 'student' ? [
      { id: 'home', label: 'الرئيسية', icon: Home },
      { id: 'student_portal', label: 'بوابة الطالب', icon: GraduationCap },
      { id: 'lessons', label: 'قسم الشرح', icon: BookOpen },
      { id: 'review', label: 'المراجعة والتدريب', icon: CheckSquare },
      { id: 'exam', label: 'الاختبار النهائي', icon: Award },
    ] : []),
    ...(currentRole === 'teacher' ? [
      { id: 'teacher', label: 'لوحة المعلم والتحليلات', icon: Users },
      { id: 'lessons', label: 'استعراض المنهاج', icon: BookOpen },
      { id: 'review', label: 'بنك الأسئلة', icon: CheckSquare },
      { id: 'exam', label: 'معاينة الاختبار', icon: Award },
    ] : []),
    ...(currentRole === 'admin' ? [
      { id: 'admin', label: 'لوحة الإدارة (LMS Admin)', icon: ShieldCheck },
      { id: 'teacher', label: 'متابعة نتائج المعلمين', icon: Users },
      { id: 'home', label: 'معاينة الواجهة', icon: Home },
    ] : []),
  ];

  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 font-sans flex flex-col" dir="rtl">
      {/* Edraak Inspired Sticky Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-emerald-950 text-white shadow-md border-b border-emerald-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Brand */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-emerald-950 font-black shadow-md">
                <GraduationCap size={22} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base md:text-lg tracking-tight font-serif">
                    إدراك التفوق
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    LMS Platform
                  </span>
                </div>
                <span className="text-[10px] text-emerald-300 block -mt-0.5">
                  مساق التمثيل الضوئي التفاعلي
                </span>
              </div>
            </div>

            {/* Middle Nav Tabs (Desktop) */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-900 text-amber-300 border border-emerald-800 shadow-inner'
                        : 'text-emerald-100 hover:text-white hover:bg-emerald-900/50'
                    }`}
                  >
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right Action Tools */}
            <div className="flex items-center gap-2">
              {/* Role Switcher Pill */}
              <div className="hidden sm:flex items-center bg-emerald-900/70 p-1 rounded-xl border border-emerald-800 text-xs font-bold">
                <button
                  onClick={() => handleRoleChange('student')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    currentRole === 'student' ? 'bg-amber-400 text-emerald-950 font-black shadow-xs' : 'text-emerald-200 hover:text-white'
                  }`}
                  title="الدخول بصلاحيات الطالب"
                >
                  طالب
                </button>
                <button
                  onClick={() => handleRoleChange('teacher')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    currentRole === 'teacher' ? 'bg-amber-400 text-emerald-950 font-black shadow-xs' : 'text-emerald-200 hover:text-white'
                  }`}
                  title="الدخول بصلاحيات المعلم"
                >
                  معلم
                </button>
                <button
                  onClick={() => handleRoleChange('admin')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 active:scale-95 active:shadow-[0_0_15px_rgba(251,191,36,0.7)] ${
                    currentRole === 'admin' ? 'bg-amber-400 text-emerald-950 font-black shadow-[0_0_15px_rgba(251,191,36,0.5)] ring-2 ring-amber-300' : 'text-emerald-200 hover:text-white'
                  }`}
                  title="الدخول بصلاحيات مسؤول النظام"
                >
                  <Settings2 size={12} />
                  <span>إدارة</span>
                </button>
              </div>

              {/* AI Assistant Button */}
              <button
                onClick={() => setIsAIAssistantOpen(true)}
                className="bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-emerald-950 text-xs font-black px-3 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title="المساعد الذكي لأكاديمية التفوق"
              >
                <Sparkles size={14} />
                <span className="hidden lg:inline">المساعد الذكي</span>
              </button>

              {/* Notifications Button */}
              <button
                onClick={() => setIsNotificationsOpen(true)}
                className="relative bg-emerald-900/80 hover:bg-emerald-900 text-emerald-100 p-2 rounded-xl border border-emerald-700/50 transition-all cursor-pointer"
                title="الإشعارات والتنبيهات"
              >
                <Bell size={16} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 text-emerald-950 font-black text-[10px] rounded-full flex items-center justify-center">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Upload PDF Button */}
              <button
                onClick={() => setIsPdfModalOpen(true)}
                className="bg-emerald-900/80 hover:bg-emerald-900 text-emerald-100 text-xs font-bold px-3 py-2 rounded-xl border border-emerald-700/50 flex items-center gap-1.5 transition-all cursor-pointer"
                title="معالجة وتوليد محتوى جديد من ملف PDF"
              >
                <UploadCloud size={14} className="text-amber-400" />
                <span className="hidden sm:inline">رفع PDF</span>
              </button>

              {onBackToPortal && (
                <button
                  onClick={onBackToPortal}
                  className="text-emerald-300 hover:text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg hover:bg-emerald-900 transition-colors flex items-center gap-1 cursor-pointer"
                  title="العودة إلى البوابة الرئيسية"
                >
                  <ArrowRight size={13} />
                  <span className="hidden sm:inline">البوابة</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex items-center justify-around border-t border-emerald-900/60 bg-emerald-950/95 py-2 px-2 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex flex-col items-center gap-1 shrink-0 ${
                  isActive ? 'text-amber-300 bg-emerald-900' : 'text-emerald-200'
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        {activeTab === 'home' && (
          <HomePage
            curriculum={curriculum}
            progress={progress}
            onStartLearning={() => setActiveTab('lessons')}
            onOpenReview={() => setActiveTab('review')}
            onOpenExam={() => setActiveTab('exam')}
            onOpenUploadPdf={() => setIsPdfModalOpen(true)}
          />
        )}

        {activeTab === 'student_portal' && (
          <StudentDashboardView
            studentName="سارة خالد المنصور"
            studentEmail="sara.mansoor@example.com"
            curriculum={curriculum}
            progress={progress}
            submissions={submissions}
            onOpenLessons={() => setActiveTab('lessons')}
            onOpenReview={() => setActiveTab('review')}
            onOpenExam={() => setActiveTab('exam')}
            onOpenCertificate={handleOpenCertificate}
            onOpenAssistant={() => setIsAIAssistantOpen(true)}
          />
        )}

        {activeTab === 'lessons' && (
          <LessonsView
            curriculum={curriculum}
            progress={progress}
            onToggleUnitRead={handleToggleUnitRead}
            onProceedToReview={() => setActiveTab('review')}
            currentStudent={activeStudent}
            onSaveUnitQuizResult={handleSaveUnitQuizResult}
          />
        )}

        {activeTab === 'review' && (
          <ReviewPracticeView
            curriculum={curriculum}
            progress={progress}
            onRecordAnswer={handleRecordReviewAnswer}
            onProceedToExam={() => setActiveTab('exam')}
          />
        )}

        {activeTab === 'exam' && (
          <FinalExamView
            curriculum={curriculum}
            onExamSubmitted={handleExamSubmitted}
            onOpenCertificate={handleOpenCertificate}
          />
        )}

        {activeTab === 'teacher' && (
          <TeacherDashboardView
            submissions={submissions}
            onOpenCertificate={handleOpenCertificate}
            onAddSampleSubmissions={handleAddSampleSubmissions}
            curriculum={curriculum}
            approvedReferences={curriculum.approvedReferences || []}
            onAddReference={(newRef) => {
              setCurriculum(prev => ({
                ...prev,
                approvedReferences: [newRef, ...(prev.approvedReferences || [])]
              }));
            }}
            onUpdateReference={(id, updates) => {
              setCurriculum(prev => ({
                ...prev,
                approvedReferences: (prev.approvedReferences || []).map(r => r.id === id ? { ...r, ...updates } : r)
              }));
            }}
            onDeleteReference={(id) => {
              setCurriculum(prev => ({
                ...prev,
                approvedReferences: (prev.approvedReferences || []).filter(r => r.id !== id)
              }));
            }}
            onToggleApproval={(id) => {
              setCurriculum(prev => ({
                ...prev,
                approvedReferences: (prev.approvedReferences || []).map(r => r.id === id ? { ...r, isApproved: !r.isApproved } : r)
              }));
            }}
          />
        )}

        {activeTab === 'admin' && (
          <AdminDashboardView
            users={users}
            courses={INITIAL_COURSES}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            onResetPassword={handleResetPassword}
            onOpenTeacherView={() => {
              setCurrentRole('teacher');
              setActiveTab('teacher');
            }}
            onOpenAnalytics={() => {
              setCurrentRole('teacher');
              setActiveTab('teacher');
            }}
          />
        )}
      </main>

      {/* Edraak-Style Footer */}
      <footer className="bg-emerald-950 text-emerald-200 text-xs py-8 border-t border-emerald-900/60 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="text-amber-400" size={18} />
            <span className="font-bold text-white">منصة إدراك التفوق • نظام إدارة التعلم المتقدم (LMS)</span>
          </div>
          <p className="text-emerald-300/70 text-center md:text-right">
            نظام تعليمي متكامل يشمل بوابة الطالب، لوحة المعلم، إدارة النظام، والمساعد الذكي للبجروت
          </p>
          <div className="text-[11px] text-emerald-400/60">
            أكاديمية التفوق أون لاين © 2026
          </div>
        </div>
      </footer>

      {/* AI Assistant Modal */}
      <AIAssistantModal
        isOpen={isAIAssistantOpen}
        onClose={() => setIsAIAssistantOpen(false)}
        curriculum={curriculum}
        activeSubject="بيولوجيا"
        studentName="سارة خالد المنصور"
      />

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllRead={() => {
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        }}
        onSelectNotification={(n) => {
          setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item));
          if (n.type === 'file') {
            setCurrentRole('teacher');
            setActiveTab('teacher');
          } else if (n.type === 'session') {
            setCurrentRole('student');
            setActiveTab('student_portal');
          } else if (n.type === 'exam') {
            setActiveTab('exam');
          }
          setIsNotificationsOpen(false);
        }}
      />

      {/* PDF Upload Modal */}
      <PdfUploadModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        onCurriculumLoaded={handleCurriculumLoaded}
        onResetToDefault={handleResetToDefault}
        currentTitle={curriculum.title}
      />

      {/* Certificate Modal */}
      {activeCertificateSub && (
        <CertificateModal
          isOpen={isCertModalOpen}
          onClose={() => setIsCertModalOpen(false)}
          studentName={activeCertificateSub.studentName}
          score={activeCertificateSub.score}
          totalPoints={activeCertificateSub.totalPoints}
          percentage={activeCertificateSub.percentage}
          date={activeCertificateSub.date}
          courseTitle={curriculum.title}
        />
      )}
    </div>
  );
};

