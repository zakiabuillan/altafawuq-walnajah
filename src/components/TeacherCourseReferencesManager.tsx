import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Library,
  Plus,
  FileText,
  CheckCircle2,
  XCircle,
  UploadCloud,
  Link as LinkIcon,
  Video,
  FileSpreadsheet,
  Sparkles,
  Trash2,
  Edit,
  Eye,
  Layers,
  Search,
  FolderPlus,
  ListPlus,
  HelpCircle,
  CheckSquare,
  Globe,
  Award,
  AlertCircle,
  Filter,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Send,
  GraduationCap
} from 'lucide-react';
import {
  TeacherCourse,
  CourseReference,
  CourseUnit,
  CourseLesson,
  BankQuestion,
  ReferenceSourceType,
  SubjectType,
  getTeacherCourses,
  saveSingleCourse,
  deleteTeacherCourse,
  toggleCoursePublishStatus
} from '../lib/courseManagement';

interface TeacherCourseReferencesManagerProps {
  currentTeacherName?: string;
  onPreviewAsStudent?: (courseId: string, unitId?: string, lessonId?: string) => void;
}

export const TeacherCourseReferencesManager: React.FC<TeacherCourseReferencesManagerProps> = ({
  currentTeacherName = 'أ. د. زكي أبو علان',
  onPreviewAsStudent
}) => {
  // Main Data States
  const [courses, setCourses] = useState<TeacherCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'courses' | 'references' | 'units_lessons' | 'question_bank'>('courses');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [refTypeFilter, setRefTypeFilter] = useState<string>('all');

  // Modal States
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<TeacherCourse | null>(null);

  const [isRefModalOpen, setIsRefModalOpen] = useState(false);
  const [editingRef, setEditingRef] = useState<CourseReference | null>(null);

  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<CourseUnit | null>(null);

  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [targetUnitIdForLesson, setTargetUnitIdForLesson] = useState<string>('');
  const [editingLesson, setEditingLesson] = useState<CourseLesson | null>(null);

  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [generatingLessonId, setGeneratingLessonId] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string>('');
  const [aiErrorMessage, setAiErrorMessage] = useState<string>('');

  // Selected Lesson Detail View
  const [viewingLesson, setViewingLesson] = useState<CourseLesson | null>(null);
  const [lessonSubTab, setLessonSubTab] = useState<'explanation' | 'practice' | 'quiz' | 'references'>('explanation');

  // Load Courses
  const loadData = () => {
    const loaded = getTeacherCourses();
    setCourses(loaded);
    if (loaded.length > 0 && (!selectedCourseId || !loaded.some(c => c.id === selectedCourseId))) {
      setSelectedCourseId(loaded[0].id);
    }
  };

  useEffect(() => {
    loadData();
    const handleCoursesUpdated = () => loadData();
    window.addEventListener('altafawuq_courses_updated', handleCoursesUpdated);
    return () => window.removeEventListener('altafawuq_courses_updated', handleCoursesUpdated);
  }, []);

  const currentCourse = courses.find(c => c.id === selectedCourseId) || courses[0];

  // Stats
  const totalCourses = courses.length;
  const publishedCourses = courses.filter(c => c.status === 'published').length;
  const totalApprovedRefs = courses.reduce((acc, c) => acc + (c.references?.filter(r => r.isApproved).length || 0), 0);
  const totalQuestionsInBank = courses.reduce((acc, c) => acc + (c.questionBank?.length || 0), 0);
  const totalUnits = courses.reduce((acc, c) => acc + (c.units?.length || 0), 0);

  // Reference Types Labels & Icons
  const refTypesMeta: Record<ReferenceSourceType, { label: string; icon: React.ReactNode; color: string }> = {
    pdf: { label: 'ملف PDF معتمد', icon: <FileText size={16} className="text-rose-500" />, color: 'bg-rose-50 border-rose-200 text-rose-800' },
    word: { label: 'ملف Word معتمد', icon: <FileText size={16} className="text-blue-500" />, color: 'bg-blue-50 border-blue-200 text-blue-800' },
    powerpoint: { label: 'عرض PowerPoint', icon: <FileSpreadsheet size={16} className="text-amber-500" />, color: 'bg-amber-50 border-amber-200 text-amber-800' },
    text: { label: 'ملف نصي معتمد', icon: <FileText size={16} className="text-slate-500" />, color: 'bg-slate-50 border-slate-200 text-slate-800' },
    website: { label: 'موقع إلكتروني معتمد', icon: <Globe size={16} className="text-emerald-500" />, color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
    video: { label: 'فيديو تعليمي معتمد', icon: <Video size={16} className="text-purple-500" />, color: 'bg-purple-50 border-purple-200 text-purple-800' },
    ebook: { label: 'كتاب إلكتروني معتمد', icon: <BookOpen size={16} className="text-indigo-500" />, color: 'bg-indigo-50 border-indigo-200 text-indigo-800' },
    article: { label: 'مقال علمي معتمد', icon: <FileText size={16} className="text-teal-500" />, color: 'bg-teal-50 border-teal-200 text-teal-800' },
    teacher_notes: { label: 'ملاحظات المعلم', icon: <Edit size={16} className="text-amber-600" />, color: 'bg-amber-50 border-amber-300 text-amber-900' }
  };

  // Handlers for Course Management
  const handleTogglePublish = (courseId: string) => {
    toggleCoursePublishStatus(courseId);
    loadData();
  };

  const handleDeleteCourse = (courseId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه المادة وجميع مراجعها ووحداتها؟')) {
      deleteTeacherCourse(courseId);
      loadData();
    }
  };

  // AI Content Generator: builds explanation, quiz, reviews, key terms and bank questions from references
  const handleGenerateLessonFromReferences = async (course: TeacherCourse, unit: CourseUnit, lesson: CourseLesson) => {
    setIsGeneratingAi(true);
    setGeneratingLessonId(lesson.id);
    setAiErrorMessage('');
    setAiSuccessMessage('');

    try {
      // Find the specific references selected for this lesson or its parent unit
      const lessonRefs = course.references.filter(r => 
        (lesson.linkedReferenceIds && lesson.linkedReferenceIds.includes(r.id)) ||
        (unit.linkedReferenceIds && unit.linkedReferenceIds.includes(r.id))
      );

      const payload = {
        courseName: course.name,
        subjectType: course.subjectType,
        gradeLevel: course.gradeLevel,
        unitTitle: unit.title,
        lessonTitle: lesson.title,
        references: lessonRefs.length > 0 ? lessonRefs : course.references
      };

      const res = await fetch('/api/teacher/generate-from-references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success && data.data) {
        const generated = data.data;

        // Update the lesson
        const updatedUnits = course.units.map(u => {
          if (u.id === unit.id) {
            return {
              ...u,
              lessons: u.lessons.map(l => {
                if (l.id === lesson.id) {
                  return {
                    ...l,
                    summary: generated.summary || l.summary,
                    contentMarkdown: generated.contentMarkdown || l.contentMarkdown,
                    keyConcepts: generated.keyConcepts || l.keyConcepts,
                    flashcards: generated.flashcards || l.flashcards,
                    practiceQuestions: generated.practiceQuestions?.length > 0 ? generated.practiceQuestions : l.practiceQuestions,
                    finalQuiz: generated.finalQuiz || l.finalQuiz
                  };
                }
                return l;
              })
            };
          }
          return u;
        });

        // Add questions to Question Bank
        const newBankItems: BankQuestion[] = (generated.questionBankItems || []).map((q: any, i: number) => ({
          id: `qb-gen-${Date.now()}-${i}`,
          courseId: course.id,
          unitId: unit.id,
          unitTitle: unit.title,
          lessonTitle: lesson.title,
          question: q.question,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation,
          referenceUsed: q.referenceUsed || lessonRefs[0]?.title || 'المرجعيات المعتمدة',
          fileNameOrUrl: q.fileNameOrUrl || lessonRefs[0]?.citation || 'المادة التعليمية المعتمدة',
          pageNumber: q.pageNumber || 'ص ' + Math.floor(Math.random() * 50 + 1),
          questionType: q.questionType || 'multiple_choice',
          createdAt: new Date().toISOString().slice(0, 10)
        }));

        const updatedCourse: TeacherCourse = {
          ...course,
          units: updatedUnits,
          questionBank: [...(course.questionBank || []), ...newBankItems]
        };

        saveSingleCourse(updatedCourse);
        loadData();
        setAiSuccessMessage(`تم بنجاح استخراج وتوليد الشرح، وأسئلة المراجعة، والاختبار وبنك الأسئلة للدرس «${lesson.title}» استناداً حصرياً للمراجع المعتمدة!`);
      } else {
        setAiErrorMessage(data.error || 'تعذر استخراج المحتوى تلقائياً من المرجعيات المعتمدة.');
      }
    } catch (err: any) {
      setAiErrorMessage(err.message || 'حدث خطأ في الاتصال بمحرك التحليل الأكاديمي.');
    } finally {
      setIsGeneratingAi(false);
      setGeneratingLessonId(null);
    }
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-slate-900 via-[#1e293b] to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-xs font-black">
              <Library size={14} className="text-amber-400" />
              <span>نظام إدارة المواد والمرجعيات الأكاديمية المعتمدة</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
              <span>إدارة المواد والمرجعيات وبنك الأسئلة 📚</span>
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm font-semibold max-w-2xl leading-relaxed">
              تحديد المواد التعليمية، واعتماد المصادر والمراجع الرسمية كمرجعية وحيدة وحصرية، وتوليد الشروحات والاختبارات وبنك الأسئلة بدقة أكاديمية كاملة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setEditingCourse(null);
                setIsCourseModalOpen(true);
              }}
              className="px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus size={16} />
              <span>إنشاء مادة تعليمية جديدة</span>
            </button>

            {currentCourse && onPreviewAsStudent && (
              <button
                onClick={() => onPreviewAsStudent(currentCourse.id)}
                className="px-5 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-black text-xs rounded-2xl transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                title="معاينة المادة كما يراها الطالب في بوابته الأكاديمية"
              >
                <Eye size={16} className="text-sky-300" />
                <span>معاينة كما يراها الطالب 🎓</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
            <div className="text-slate-400 text-[10px] font-bold">إجمالي المواد</div>
            <div className="text-lg font-black text-white mt-0.5">{totalCourses} مادة</div>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
            <div className="text-slate-400 text-[10px] font-bold">المواد المنشورة</div>
            <div className="text-lg font-black text-emerald-400 mt-0.5">{publishedCourses} منشورة للطلبة</div>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
            <div className="text-slate-400 text-[10px] font-bold">المرجعيات المعتمدة</div>
            <div className="text-lg font-black text-amber-400 mt-0.5">{totalApprovedRefs} مرجع رسمي</div>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50">
            <div className="text-slate-400 text-[10px] font-bold">الوحدات والدروس</div>
            <div className="text-lg font-black text-indigo-300 mt-0.5">{totalUnits} وحدات دراسية</div>
          </div>
          <div className="bg-slate-800/50 p-3 rounded-2xl border border-slate-700/50 col-span-2 sm:col-span-1">
            <div className="text-slate-400 text-[10px] font-bold">بنك الأسئلة المعتمد</div>
            <div className="text-lg font-black text-rose-300 mt-0.5">{totalQuestionsInBank} سؤال موثق</div>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts Banner */}
      {aiSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{aiSuccessMessage}</span>
          </div>
          <button onClick={() => setAiSuccessMessage('')} className="text-emerald-700 hover:text-emerald-900">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {aiErrorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
            <span>{aiErrorMessage}</span>
          </div>
          <button onClick={() => setAiErrorMessage('')} className="text-rose-700 hover:text-rose-900">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Navigation Tabs Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'courses'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <BookOpen size={15} />
            <span>المواد الدراسية ({courses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('references')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'references'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Library size={15} />
            <span>📚 المرجعيات المعتمدة ({currentCourse?.references?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('units_lessons')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'units_lessons'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Layers size={15} />
            <span>الوحدات والدروس ({currentCourse?.units?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('question_bank')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'question_bank'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <CheckSquare size={15} />
            <span>🎯 بنك الأسئلة المعتمد ({currentCourse?.questionBank?.length || 0})</span>
          </button>
        </div>

        {/* Current Active Course Selector */}
        {courses.length > 0 && (
          <div className="flex items-center gap-2 pr-2">
            <span className="text-[11px] font-black text-slate-500">المادة المحددة:</span>
            <select
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 outline-none focus:border-indigo-500"
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status === 'published' ? 'منشورة' : 'مسودة'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: COURSES MANAGEMENT */}
      {activeTab === 'courses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div className="relative w-full sm:w-80">
              <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث باسم المادة أو الصف..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500">الحالة:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
              >
                <option value="all">جميع الحالات</option>
                <option value="published">منشورة للطلاب</option>
                <option value="draft">مسودة قيد الإعداد</option>
              </select>
            </div>
          </div>

          {/* Course Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses
              .filter(c => statusFilter === 'all' || c.status === statusFilter)
              .filter(c => !searchQuery.trim() || c.name.includes(searchQuery) || c.gradeLevel.includes(searchQuery))
              .map(course => (
                <div
                  key={course.id}
                  className={`bg-white rounded-3xl border transition-all hover:shadow-lg flex flex-col justify-between overflow-hidden ${
                    selectedCourseId === course.id ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200'
                  }`}
                >
                  {/* Top Image & Badges */}
                  <div className="relative h-40 bg-slate-100 overflow-hidden">
                    <img
                      src={course.imageUrl}
                      alt={course.name}
                      className="w-full h-full object-cover"
                      onError={e => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      <span className="px-2.5 py-1 bg-white/90 backdrop-blur text-slate-900 text-[10px] font-black rounded-lg shadow-sm">
                        {course.subjectType}
                      </span>
                      <span className="px-2.5 py-1 bg-indigo-600/90 text-white text-[10px] font-black rounded-lg shadow-sm">
                        {course.gradeLevel}
                      </span>
                    </div>

                    <div className="absolute top-3 left-3">
                      <button
                        onClick={() => handleTogglePublish(course.id)}
                        className={`px-3 py-1 text-[10px] font-black rounded-lg shadow-sm flex items-center gap-1 transition-all ${
                          course.status === 'published'
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                            : 'bg-slate-700 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {course.status === 'published' ? (
                          <>
                            <CheckCircle2 size={12} />
                            <span>منشورة</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={12} />
                            <span>مسودة</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="absolute bottom-3 right-3 left-3 text-white">
                      <h3 className="font-black text-sm drop-shadow">{course.name}</h3>
                      <p className="text-[10px] text-slate-200 font-semibold truncate mt-0.5">{course.leadTeacher}</p>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                    <p className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>

                    {/* Stats pills */}
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-black">
                      <div className="bg-amber-50 text-amber-900 border border-amber-200/60 p-2 rounded-xl">
                        <span>📚 {course.references?.length || 0} مرجعيات</span>
                      </div>
                      <div className="bg-indigo-50 text-indigo-900 border border-indigo-200/60 p-2 rounded-xl">
                        <span>🗂 {course.units?.length || 0} وحدات</span>
                      </div>
                      <div className="bg-rose-50 text-rose-900 border border-rose-200/60 p-2 rounded-xl">
                        <span>🎯 {course.questionBank?.length || 0} أسئلة</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setSelectedCourseId(course.id);
                          setActiveTab('references');
                        }}
                        className="px-3 py-2 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Library size={13} />
                        <span>إدارة المرجعيات 📚</span>
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCourse(course);
                            setIsCourseModalOpen(true);
                          }}
                          className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl transition-all"
                          title="تعديل بيانات المادة"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course.id)}
                          className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all"
                          title="حذف المادة"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TAB 2: APPROVED REFERENCES (📚 المرجعيات المعتمدة) */}
      {activeTab === 'references' && currentCourse && (
        <div className="space-y-5">
          {/* Header Actions for References */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-400/30 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">📚</span>
                <h2 className="text-lg font-black text-slate-900">
                  المرجعيات المعتمدة لمادة: «{currentCourse.name}»
                </h2>
              </div>
              <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                تعتبر هذه المرجعيات <strong className="text-amber-700">المصدر الأكاديمي الرسمي والوحيد للمادة</strong>. يعتمد عليها الذكاء الاصطناعي في الشرح والاختبارات وبنك الأسئلة ولا يُسمح له بالإجابة خارجها.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingRef(null);
                setIsRefModalOpen(true);
              }}
              className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-2xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Plus size={16} />
              <span>إضافة مرجع معتمد جديد 📚</span>
            </button>
          </div>

          {/* Reference filter bar */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200 text-xs font-bold">
            <span className="text-slate-500 ml-2">نوع المرجع:</span>
            <button
              onClick={() => setRefTypeFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                refTypeFilter === 'all' ? 'bg-slate-900 text-white font-black' : 'bg-slate-100 text-slate-700'
              }`}
            >
              الكل ({currentCourse.references?.length || 0})
            </button>
            {Object.entries(refTypesMeta).map(([typeKey, meta]) => {
              const count = currentCourse.references?.filter(r => r.sourceType === typeKey).length || 0;
              if (count === 0 && refTypeFilter !== typeKey) return null;
              return (
                <button
                  key={typeKey}
                  onClick={() => setRefTypeFilter(typeKey)}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                    refTypeFilter === typeKey ? 'bg-slate-900 text-white font-black' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {meta.icon}
                  <span>{meta.label} ({count})</span>
                </button>
              );
            })}
          </div>

          {/* References List Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentCourse.references
              ?.filter(r => refTypeFilter === 'all' || r.sourceType === refTypeFilter)
              .map(ref => {
                const meta = refTypesMeta[ref.sourceType] || refTypesMeta.pdf;
                return (
                  <div
                    key={ref.id}
                    className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black border flex items-center gap-1.5 ${meta.color}`}>
                          {meta.icon}
                          <span>{meta.label}</span>
                        </div>

                        <div className="flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          <span>معتمد رسمياً ✅</span>
                        </div>
                      </div>

                      {/* Title & Publisher */}
                      <div>
                        <h3 className="text-sm font-black text-slate-900 leading-snug">{ref.title}</h3>
                        <p className="text-[11px] text-slate-500 font-bold mt-1">
                          جهة الإصدار/المؤلف: <span className="text-slate-700">{ref.authorOrPublisher}</span>
                        </p>
                      </div>

                      {/* Official Academic Citation */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 text-[11px] text-slate-700 font-medium">
                        <strong className="text-slate-900 font-bold">التوثيق الأكاديمي: </strong>
                        <span>{ref.citation}</span>
                        {ref.pageCount && <span className="mr-2 text-slate-500 font-bold">({ref.pageCount} صفحة)</span>}
                      </div>

                      {/* Teacher Notes if any */}
                      {ref.notes && (
                        <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/50 text-[10px] text-amber-900 font-bold">
                          <strong className="text-amber-950 font-black">ملاحظات المعلم: </strong>
                          <span>{ref.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        {ref.urlOrContent && ref.urlOrContent.startsWith('http') && (
                          <a
                            href={ref.urlOrContent}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all"
                          >
                            <ExternalLink size={11} />
                            <span>فتح الرابط</span>
                          </a>
                        )}
                        <span className="text-[10px] text-slate-400 font-bold">اعتُمد: {ref.approvedDate}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingRef(ref);
                            setIsRefModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg"
                          title="تعديل المرجع"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('هل أنت متأكد من حذف هذا المرجع المعتمد؟')) {
                              const updatedRefs = currentCourse.references.filter(r => r.id !== ref.id);
                              saveSingleCourse({ ...currentCourse, references: updatedRefs });
                              loadData();
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg"
                          title="حذف المرجع"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* TAB 3: UNITS & LESSONS (المادة ↓ الوحدات ↓ الدروس) */}
      {activeTab === 'units_lessons' && currentCourse && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200">
            <div>
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>هيكلية المنهاج الأكاديمي: المادة ↓ الوحدات ↓ الدروس</span>
              </h2>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                قم بربط كل وحدة ودرس بالمرجعيات المعتمدة، ثم اضغط على زر توليد المحتوى الذكي لبناء الشرح والأسئلة تلقائياً.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingUnit(null);
                setIsUnitModalOpen(true);
              }}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-2xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-600/20 shrink-0"
            >
              <FolderPlus size={16} />
              <span>+ إضافة وحدة تعليمية جديدة</span>
            </button>
          </div>

          {/* Units Hierarchy List */}
          <div className="space-y-5">
            {currentCourse.units?.map((unit, uIdx) => (
              <div key={unit.id} className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                {/* Unit Header */}
                <div className="p-5 bg-gradient-to-r from-indigo-50/60 to-transparent border-b border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                        {unit.unitNumber || uIdx + 1}
                      </span>
                      <h3 className="text-sm font-black text-slate-900">{unit.title}</h3>
                    </div>
                    <p className="text-xs text-slate-600 font-medium max-w-2xl pr-9">{unit.description}</p>
                    
                    {/* Linked References Badges for this Unit */}
                    <div className="flex flex-wrap items-center gap-1.5 pr-9 pt-1">
                      <span className="text-[10px] font-black text-slate-400">المرجعيات المعتمدة للوحدة:</span>
                      {unit.linkedReferenceIds && unit.linkedReferenceIds.length > 0 ? (
                        unit.linkedReferenceIds.map(refId => {
                          const refObj = currentCourse.references.find(r => r.id === refId);
                          return (
                            <span key={refId} className="px-2 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-md text-[9px] font-black">
                              📚 {refObj?.title || refId}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold italic">جميع مراجع المادة معتمدة</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setTargetUnitIdForLesson(unit.id);
                        setEditingLesson(null);
                        setIsLessonModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 text-xs font-black rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <ListPlus size={14} className="text-indigo-600" />
                      <span>+ إضافة درس</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingUnit(unit);
                        setIsUnitModalOpen(true);
                      }}
                      className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl"
                      title="تعديل بيانات الوحدة"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`هل أنت متأكد من حذف الوحدة «${unit.title}» وجميع دروسها؟`)) {
                          const updated = currentCourse.units.filter(u => u.id !== unit.id);
                          saveSingleCourse({ ...currentCourse, units: updated });
                          loadData();
                        }
                      }}
                      className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl"
                      title="حذف الوحدة"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Lessons inside Unit */}
                <div className="p-4 space-y-3">
                  {unit.lessons && unit.lessons.length > 0 ? (
                    unit.lessons.map((lesson, lIdx) => (
                      <div
                        key={lesson.id}
                        className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-2xl p-4 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-lg">
                              الدرس {lesson.lessonNumber || lIdx + 1}
                            </span>
                            <h4 className="text-xs font-black text-slate-900">{lesson.title}</h4>
                            <span className="text-[10px] text-slate-400 font-bold">({lesson.durationMinutes} دقيقة)</span>
                          </div>

                          <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                            {lesson.summary || 'لم يتم توليد ملخص بعد.'}
                          </p>

                          {/* Linked References for this lesson */}
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            <span className="text-[9px] font-black text-slate-400">مراجع الدرس:</span>
                            {lesson.linkedReferenceIds && lesson.linkedReferenceIds.length > 0 ? (
                              lesson.linkedReferenceIds.map(rid => {
                                const refObj = currentCourse.references.find(r => r.id === rid);
                                return (
                                  <span key={rid} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-black text-slate-700">
                                    📖 {refObj?.title || rid}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-[9px] text-slate-400 italic">مراجع الوحدة المعتمدة</span>
                            )}
                          </div>
                        </div>

                        {/* Actions for this lesson */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* AI Generation Trigger */}
                          <button
                            onClick={() => handleGenerateLessonFromReferences(currentCourse, unit, lesson)}
                            disabled={isGeneratingAi}
                            className="px-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            title="توليد محتوى الشرح والمراجعات والاختبار وبنك الأسئلة من المراجع المعتمدة"
                          >
                            {isGeneratingAi && generatingLessonId === lesson.id ? (
                              <>
                                <Loader2 size={13} className="animate-spin" />
                                <span>جاري التوليد الأكاديمي...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles size={13} />
                                <span>توليد المحتوى من المراجع ✨</span>
                              </>
                            )}
                          </button>

                          {/* View Lesson Details */}
                          <button
                            onClick={() => {
                              setViewingLesson(lesson);
                              setLessonSubTab('explanation');
                            }}
                            className="px-3 py-2 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={13} />
                            <span>استعراض المحتوى</span>
                          </button>

                          <button
                            onClick={() => {
                              setTargetUnitIdForLesson(unit.id);
                              setEditingLesson(lesson);
                              setIsLessonModalOpen(true);
                            }}
                            className="p-2 hover:bg-white text-slate-500 rounded-xl border border-transparent hover:border-slate-200"
                            title="تعديل الدرس"
                          >
                            <Edit size={14} />
                          </button>

                          <button
                            onClick={() => {
                              if (window.confirm(`هل أنت متأكد من حذف الدرس «${lesson.title}»؟`)) {
                                const updatedLessons = unit.lessons.filter(l => l.id !== lesson.id);
                                const updatedUnits = currentCourse.units.map(u => u.id === unit.id ? { ...u, lessons: updatedLessons } : u);
                                saveSingleCourse({ ...currentCourse, units: updatedUnits });
                                loadData();
                              }
                            }}
                            className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl"
                            title="حذف الدرس"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-400 text-xs font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      لا توجد دروس مضافة في هذه الوحدة حتى الآن. اضغط "+ إضافة درس" للبدء.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: APPROVED QUESTION BANK (🎯 بنك الأسئلة المعتمد) */}
      {activeTab === 'question_bank' && currentCourse && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border border-rose-400/30 p-5 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <h2 className="text-lg font-black text-slate-900">
                  بنك الأسئلة المعتمد لمادة: «{currentCourse.name}»
                </h2>
              </div>
              <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                جميع الأسئلة مستخرجة حصرياً من المراجع المعتمدة، وتحتوي كل مسألة على الإجابة، وتفسيرها العلمي، والتوثيق الدقيق باسم الملف أو الموقع ورقم الصفحة.
              </p>
            </div>

            <div className="px-4 py-2 bg-rose-600 text-white text-xs font-black rounded-2xl shadow-md flex items-center gap-2">
              <CheckSquare size={16} />
              <span>إجمالي: {currentCourse.questionBank?.length || 0} سؤال معتمد</span>
            </div>
          </div>

          {/* Question Bank Cards */}
          <div className="space-y-3">
            {currentCourse.questionBank && currentCourse.questionBank.length > 0 ? (
              currentCourse.questionBank.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 text-[10px] font-black">
                        <span className="bg-slate-900 text-white px-2 py-0.5 rounded-md">
                          سؤال {idx + 1}
                        </span>
                        {q.unitTitle && (
                          <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-md">
                            {q.unitTitle}
                          </span>
                        )}
                        {q.lessonTitle && (
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                            {q.lessonTitle}
                          </span>
                        )}
                        <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
                          {q.questionType === 'multiple_choice' ? 'اختيار من متعدد' : q.questionType === 'true_false' ? 'صح/خطأ' : 'سؤال قصير'}
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-slate-900 leading-snug pt-1">
                        {q.question}
                      </h4>
                    </div>

                    <button
                      onClick={() => {
                        const updated = currentCourse.questionBank.filter(item => item.id !== q.id);
                        saveSingleCourse({ ...currentCourse, questionBank: updated });
                        loadData();
                      }}
                      className="p-1.5 text-slate-300 hover:text-rose-600 rounded-lg transition-all"
                      title="حذف من بنك الأسئلة"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Options if multiple choice */}
                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                            opt === q.answer
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-black'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${opt === q.answer ? 'bg-emerald-600' : 'bg-slate-300'}`} />
                          <span>{opt}</span>
                          {opt === q.answer && (
                            <span className="mr-auto text-[9px] bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded font-black">
                              الإجابة الصحيحة
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Explanation & Academic Citation */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5 text-[11px]">
                    <div className="text-slate-800 font-bold leading-relaxed">
                      <span className="text-indigo-950 font-black">💡 تفسير الإجابة: </span>
                      {q.explanation}
                    </div>

                    <div className="pt-1.5 border-t border-slate-200 flex flex-wrap items-center justify-between text-[10px] text-slate-500 font-bold">
                      <div className="flex items-center gap-3">
                        <span>📚 المرجع المستخدم: <strong className="text-slate-700">{q.referenceUsed}</strong></span>
                        <span>📄 اسم الملف/المصدر: <strong className="text-slate-700">{q.fileNameOrUrl}</strong></span>
                        {q.pageNumber && <span>رقم الصفحة: <strong className="text-slate-700">{q.pageNumber}</strong></span>}
                      </div>
                      <span className="text-slate-400">تاريخ التوثيق: {q.createdAt}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs font-bold bg-white rounded-3xl border border-dashed border-slate-200">
                لا توجد أسئلة في بنك الأسئلة المعتمد حتى الآن. استخدم زر "توليد المحتوى من المراجع ✨" في قسم الوحدات والدروس لاستخراج أسئلة موثقة تلقائياً.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW LESSON DETAILS MODAL */}
      <AnimatePresence>
        {viewingLesson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
            >
              {/* Modal Header */}
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                    محتوى الدرس المعتمد
                  </span>
                  <h3 className="text-lg font-black text-white mt-1">{viewingLesson.title}</h3>
                </div>
                <button
                  onClick={() => setViewingLesson(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-all"
                >
                  ✕
                </button>
              </div>

              {/* Subtabs for Viewing */}
              <div className="flex items-center gap-2 p-3 bg-slate-100 border-b border-slate-200 text-xs font-black">
                <button
                  onClick={() => setLessonSubTab('explanation')}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    lessonSubTab === 'explanation' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📖 محتوى الشرح
                </button>
                <button
                  onClick={() => setLessonSubTab('practice')}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    lessonSubTab === 'practice' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📝 أسئلة المراجعة ({viewingLesson.practiceQuestions?.length || 0})
                </button>
                <button
                  onClick={() => setLessonSubTab('quiz')}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    lessonSubTab === 'quiz' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  🎯 الاختبار النهائي ({viewingLesson.finalQuiz?.questions?.length || 0})
                </button>
                <button
                  onClick={() => setLessonSubTab('references')}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    lessonSubTab === 'references' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📚 المرجعيات المرتبطة
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] space-y-4">
                {lessonSubTab === 'explanation' && (
                  <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900 font-bold leading-relaxed">
                      <strong>ملخص الدرس: </strong> {viewingLesson.summary}
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                      {viewingLesson.contentMarkdown || 'لم تتم إضافة محتوى الشرح بعد.'}
                    </div>

                    {/* Key concepts if any */}
                    {viewingLesson.keyConcepts && viewingLesson.keyConcepts.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <h4 className="text-xs font-black text-slate-900">🗂 المفاهيم والمصطلحات الأساسية المعتمدة:</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {viewingLesson.keyConcepts.map((kc, i) => (
                            <div key={i} className="p-3 bg-white border border-slate-200 rounded-xl space-y-1 text-xs">
                              <span className="font-black text-indigo-700">{kc.term}</span>
                              <p className="text-slate-600 text-[11px] font-medium">{kc.definition}</p>
                              <span className="text-[9px] text-slate-400 block pt-1">المصدر: {kc.referenceCitation}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {lessonSubTab === 'practice' && (
                  <div className="space-y-3">
                    {viewingLesson.practiceQuestions?.map((pq, idx) => (
                      <div key={pq.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded">سؤال {idx + 1}</span>
                          <h4 className="font-black text-slate-900">{pq.question}</h4>
                        </div>
                        {pq.options && (
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            {pq.options.map((opt, oIdx) => (
                              <div key={oIdx} className={`p-2 rounded-lg border text-xs ${opt === pq.answer ? 'bg-emerald-50 border-emerald-300 font-black text-emerald-900' : 'bg-white border-slate-200 text-slate-700'}`}>
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                          <strong>💡 التفسير:</strong> {pq.explanation}
                          <div className="text-[10px] text-slate-400 pt-1">المرجع: {pq.referenceUsed} ({pq.fileNameOrUrl})</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {lessonSubTab === 'quiz' && (
                  <div className="space-y-3">
                    <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl flex items-center justify-between text-xs font-bold text-indigo-900">
                      <span>عنوان الاختبار: {viewingLesson.finalQuiz?.title || 'اختبار تقييم الدرس'}</span>
                      <span>وقت الإنجاز: {viewingLesson.finalQuiz?.timeLimitMinutes || 15} دقيقة</span>
                      <span>نسبة الاجتياز: {viewingLesson.finalQuiz?.passScorePercentage || 80}%</span>
                    </div>

                    {viewingLesson.finalQuiz?.questions?.map((fq, idx) => (
                      <div key={fq.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded">سؤال {idx + 1}</span>
                          <h4 className="font-black text-slate-900">{fq.question}</h4>
                        </div>
                        {fq.options && (
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            {fq.options.map((opt, oIdx) => (
                              <div key={oIdx} className={`p-2 rounded-lg border text-xs ${opt === fq.answer ? 'bg-emerald-50 border-emerald-300 font-black text-emerald-900' : 'bg-white border-slate-200 text-slate-700'}`}>
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
                          <strong>💡 التفسير:</strong> {fq.explanation}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {lessonSubTab === 'references' && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-900">المرجعيات الرسمية المخصصة لهذا الدرس:</h4>
                    {viewingLesson.linkedReferenceIds?.map(refId => {
                      const refObj = currentCourse.references.find(r => r.id === refId);
                      return (
                        <div key={refId} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                          <h5 className="font-black text-slate-900">📚 {refObj?.title || refId}</h5>
                          <p className="text-slate-500 text-[11px] font-medium">{refObj?.citation}</p>
                          {refObj?.notes && <p className="text-amber-800 text-[10px] font-bold">ملاحظات: {refObj.notes}</p>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE / EDIT COURSE MODAL */}
      <AnimatePresence>
        {isCourseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900">
                  {editingCourse ? 'تعديل بيانات المادة التعليمية' : 'إنشاء مادة تعليمية جديدة'}
                </h3>
                <button onClick={() => setIsCourseModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <CourseForm
                initialData={editingCourse}
                onSave={courseData => {
                  saveSingleCourse(courseData);
                  loadData();
                  setIsCourseModalOpen(false);
                }}
                onCancel={() => setIsCourseModalOpen(false)}
                defaultTeacher={currentTeacherName}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE / EDIT REFERENCE MODAL */}
      <AnimatePresence>
        {isRefModalOpen && currentCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>📚 إضافة / تعديل مرجع معتمد لمادة «{currentCourse.name}»</span>
                </h3>
                <button onClick={() => setIsRefModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <ReferenceForm
                courseId={currentCourse.id}
                initialData={editingRef}
                units={currentCourse.units || []}
                teacherName={currentTeacherName}
                onSave={refData => {
                  let updatedRefs = [...(currentCourse.references || [])];
                  if (editingRef) {
                    updatedRefs = updatedRefs.map(r => r.id === refData.id ? refData : r);
                  } else {
                    updatedRefs.push(refData);
                  }
                  saveSingleCourse({ ...currentCourse, references: updatedRefs });
                  loadData();
                  setIsRefModalOpen(false);
                }}
                onCancel={() => setIsRefModalOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE / EDIT UNIT MODAL */}
      <AnimatePresence>
        {isUnitModalOpen && currentCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900">
                  {editingUnit ? 'تعديل بيانات الوحدة' : 'إضافة وحدة تعليمية جديدة'}
                </h3>
                <button onClick={() => setIsUnitModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <UnitForm
                course={currentCourse}
                initialData={editingUnit}
                onSave={unitData => {
                  let updatedUnits = [...(currentCourse.units || [])];
                  if (editingUnit) {
                    updatedUnits = updatedUnits.map(u => u.id === unitData.id ? unitData : u);
                  } else {
                    updatedUnits.push(unitData);
                  }
                  saveSingleCourse({ ...currentCourse, units: updatedUnits });
                  loadData();
                  setIsUnitModalOpen(false);
                }}
                onCancel={() => setIsUnitModalOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE / EDIT LESSON MODAL */}
      <AnimatePresence>
        {isLessonModalOpen && currentCourse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-black text-slate-900">
                  {editingLesson ? 'تعديل بيانات الدرس' : 'إضافة درس تعليمي جديد'}
                </h3>
                <button onClick={() => setIsLessonModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <LessonForm
                course={currentCourse}
                unitId={targetUnitIdForLesson}
                initialData={editingLesson}
                onSave={lessonData => {
                  const updatedUnits = currentCourse.units.map(u => {
                    if (u.id === targetUnitIdForLesson) {
                      let lessons = [...(u.lessons || [])];
                      if (editingLesson) {
                        lessons = lessons.map(l => l.id === lessonData.id ? lessonData : l);
                      } else {
                        lessons.push(lessonData);
                      }
                      return { ...u, lessons };
                    }
                    return u;
                  });
                  saveSingleCourse({ ...currentCourse, units: updatedUnits });
                  loadData();
                  setIsLessonModalOpen(false);
                }}
                onCancel={() => setIsLessonModalOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// SUB-COMPONENTS: FORMS FOR COURSE / REF / UNIT / LESSON
// ==========================================

interface CourseFormProps {
  initialData?: TeacherCourse | null;
  onSave: (data: TeacherCourse) => void;
  onCancel: () => void;
  defaultTeacher: string;
}

const CourseForm: React.FC<CourseFormProps> = ({ initialData, onSave, onCancel, defaultTeacher }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [gradeLevel, setGradeLevel] = useState(initialData?.gradeLevel || 'الصف الحادي عشر');
  const [subjectType, setSubjectType] = useState<SubjectType>(initialData?.subjectType || 'علمي');
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80');
  const [status, setStatus] = useState<'published' | 'draft'>(initialData?.status || 'published');
  const [leadTeacher, setLeadTeacher] = useState(initialData?.leadTeacher || defaultTeacher);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const courseData: TeacherCourse = {
      id: initialData?.id || `course-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      gradeLevel,
      subjectType,
      imageUrl,
      status,
      leadTeacher,
      createdAt: initialData?.createdAt || new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
      references: initialData?.references || [],
      units: initialData?.units || [],
      questionBank: initialData?.questionBank || []
    };

    onSave(courseData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-right">
      <div className="space-y-1">
        <label className="text-xs font-black text-slate-700">اسم المادة التعليمية *</label>
        <input
          type="text"
          required
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="مثال: مادة الأحياء والبيولوجيا (بجروت)"
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-black text-slate-700">وصف المادة</label>
        <textarea
          rows={2}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="نبذة عن المادة وأهدافها الأكاديمية..."
          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-black text-slate-700">الصف الدراسي</label>
          <select
            value={gradeLevel}
            onChange={e => setGradeLevel(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
          >
            <option value="الصف العاشر">الصف العاشر</option>
            <option value="الصف الحادي عشر">الصف الحادي عشر</option>
            <option value="الصف الثاني عشر (بجروت)">الصف الثاني عشر (بجروت)</option>
            <option value="المرحلة الجامعية">المرحلة الجامعية</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-black text-slate-700">نوع المادة</label>
          <select
            value={subjectType}
            onChange={e => setSubjectType(e.target.value as SubjectType)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
          >
            <option value="علمي">علمي</option>
            <option value="أدبي">أدبي</option>
            <option value="لغات">لغات</option>
            <option value="تقني">تقني</option>
            <option value="علوم إنسانية">علوم إنسانية</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-black text-slate-700">حالة المادة</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as any)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
          >
            <option value="published">منشورة للطلاب (متاحة فوراً)</option>
            <option value="draft">مسودة (غير منشورة بعد)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-black text-slate-700">معلم المادة</label>
          <input
            type="text"
            value={leadTeacher}
            onChange={e => setLeadTeacher(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-black text-slate-700">صورة المادة (رابط صورة)</label>
        <input
          type="url"
          value={imageUrl}
          onChange={e => setImageUrl(e.target.value)}
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-100 rounded-xl"
        >
          إلغاء
        </button>
        <button
          type="submit"
          className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl shadow-md"
        >
          حفظ بيانات المادة
        </button>
      </div>
    </form>
  );
};

interface ReferenceFormProps {
  courseId: string;
  initialData?: CourseReference | null;
  units: CourseUnit[];
  teacherName: string;
  onSave: (ref: CourseReference) => void;
  onCancel: () => void;
}

const ReferenceForm: React.FC<ReferenceFormProps> = ({
  courseId,
  initialData,
  units,
  teacherName,
  onSave,
  onCancel
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [sourceType, setSourceType] = useState<ReferenceSourceType>(initialData?.sourceType || 'pdf');
  const [authorOrPublisher, setAuthorOrPublisher] = useState(initialData?.authorOrPublisher || 'وزارة التعليم / المعلم');
  const [citation, setCitation] = useState(initialData?.citation || '');
  const [urlOrContent, setUrlOrContent] = useState(initialData?.urlOrContent || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [fileSize, setFileSize] = useState(initialData?.fileSize || '5.2 MB');
  const [pageCount, setPageCount] = useState<number>(initialData?.pageCount || 20);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>(initialData?.linkedUnitIds || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !citation.trim()) return;

    const ref: CourseReference = {
      id: initialData?.id || `ref-${Date.now()}`,
      courseId,
      title: title.trim(),
      sourceType,
      authorOrPublisher: authorOrPublisher.trim(),
      citation: citation.trim(),
      urlOrContent: urlOrContent.trim(),
      notes: notes.trim(),
      fileSize,
      pageCount,
      isApproved: true,
      approvedDate: initialData?.approvedDate || new Date().toISOString().slice(0, 10),
      approvedByTeacher: teacherName,
      linkedUnitIds: selectedUnitIds
    };

    onSave(ref);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-right">
      <div className="space-y-1">
        <label className="text-xs font-black text-slate-700">عنوان المرجع الأكاديمي المعتمد *</label>
        <input
          type="text"
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="مثال: كتاب الأحياء للصف الثاني عشر المعتمد"
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-amber-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-black text-slate-700">نوع المصدر والمرجعية</label>
          <select
            value={sourceType}
            onChange={e => setSourceType(e.target.value as ReferenceSourceType)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
          >
            <option value="pdf">ملف PDF معتمد</option>
            <option value="word">ملف Word معتمد</option>
            <option value="powerpoint">عرض PowerPoint</option>
            <option value="text">ملف نصي معتمد</option>
            <option value="website">رابط موقع إلكتروني</option>
            <option value="video">رابط فيديو تعليمي</option>
            <option value="ebook">كتاب إلكتروني</option>
            <option value="article">مقال علمي</option>
            <option value="teacher_notes">ملاحظات خاصة بالمعلم</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-black text-slate-700">المؤلف / جهة الإصدار</label>
          <input
            type="text"
            value={authorOrPublisher}
            onChange={e => setAuthorOrPublisher(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-black text-slate-700">التوثيق الأكاديمي الرسمي (Citation) *</label>
        <input
          type="text"
          required
          value={citation}
          onChange={e => setCitation(e.target.value)}
          placeholder="مثال: كتاب الأحياء المعتمد، وزارة التعليم، ص 45-128"
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-amber-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-black text-slate-700">رابط المصدر أو محتواه النصي</label>
        <textarea
          rows={2}
          value={urlOrContent}
          onChange={e => setUrlOrContent(e.target.value)}
          placeholder="https://... أو مقتطفات نصية من المرجع..."
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-black text-slate-700">ملاحظات خاصة بالمعلم حول المرجع</label>
        <input
          type="text"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="إرشادات للذكاء الاصطناعي والطلاب حول كيفية استخدام هذا المرجع..."
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
        />
      </div>

      {/* Linked Units Selection */}
      {units && units.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-black text-slate-700 block">ربط هذا المرجع بالوحدات الدراسية:</label>
          <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
            {units.map(u => (
              <label key={u.id} className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedUnitIds.includes(u.id)}
                  onChange={e => {
                    if (e.target.checked) {
                      setSelectedUnitIds([...selectedUnitIds, u.id]);
                    } else {
                      setSelectedUnitIds(selectedUnitIds.filter(id => id !== u.id));
                    }
                  }}
                  className="rounded text-amber-500"
                />
                <span>{u.title}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-100 rounded-xl"
        >
          إلغاء
        </button>
        <button
          type="submit"
          className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-md"
        >
          اعتماد وحفظ المرجع 📚
        </button>
      </div>
    </form>
  );
};

interface UnitFormProps {
  course: TeacherCourse;
  initialData?: CourseUnit | null;
  onSave: (unit: CourseUnit) => void;
  onCancel: () => void;
}

const UnitForm: React.FC<UnitFormProps> = ({ course, initialData, onSave, onCancel }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [unitNumber, setUnitNumber] = useState(initialData?.unitNumber || (course.units?.length || 0) + 1);
  const [selectedRefIds, setSelectedRefIds] = useState<string[]>(initialData?.linkedReferenceIds || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const unit: CourseUnit = {
      id: initialData?.id || `unit-${Date.now()}`,
      courseId: course.id,
      unitNumber,
      title: title.trim(),
      description: description.trim(),
      linkedReferenceIds: selectedRefIds,
      lessons: initialData?.lessons || []
    };

    onSave(unit);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-right">
      <div className="space-y-1">
        <label className="text-xs font-black text-slate-700">عنوان الوحدة التعليمية *</label>
        <input
          type="text"
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="مثال: الوحدة الثانية: التمثيل الضوئي"
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-black text-slate-700">وصف الوحدة</label>
        <textarea
          rows={2}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="شرح موجز لأهداف الوحدة ومحتواها..."
          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
        />
      </div>

      {/* Select Linked References */}
      <div className="space-y-1.5 pt-1">
        <label className="text-xs font-black text-slate-700 block">اختيار المرجعيات المعتمدة المرتبطة بهذه الوحدة *</label>
        <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
          {course.references?.map(ref => (
            <label key={ref.id} className="flex items-center gap-2 text-xs font-bold text-slate-800 p-1.5 hover:bg-white rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={selectedRefIds.includes(ref.id)}
                onChange={e => {
                  if (e.target.checked) {
                    setSelectedRefIds([...selectedRefIds, ref.id]);
                  } else {
                    setSelectedRefIds(selectedRefIds.filter(id => id !== ref.id));
                  }
                }}
                className="rounded text-indigo-600"
              />
              <span>📚 {ref.title}</span>
              <span className="text-[10px] text-slate-400 mr-auto">({ref.sourceType})</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-100 rounded-xl"
        >
          إلغاء
        </button>
        <button
          type="submit"
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md"
        >
          حفظ الوحدة
        </button>
      </div>
    </form>
  );
};

interface LessonFormProps {
  course: TeacherCourse;
  unitId: string;
  initialData?: CourseLesson | null;
  onSave: (lesson: CourseLesson) => void;
  onCancel: () => void;
}

const LessonForm: React.FC<LessonFormProps> = ({ course, unitId, initialData, onSave, onCancel }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [durationMinutes, setDurationMinutes] = useState(initialData?.durationMinutes || 45);
  const [summary, setSummary] = useState(initialData?.summary || '');
  const [contentMarkdown, setContentMarkdown] = useState(initialData?.contentMarkdown || '');
  const [selectedRefIds, setSelectedRefIds] = useState<string[]>(initialData?.linkedReferenceIds || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const lesson: CourseLesson = {
      id: initialData?.id || `lesson-${Date.now()}`,
      unitId,
      courseId: course.id,
      lessonNumber: initialData?.lessonNumber || 1,
      title: title.trim(),
      durationMinutes,
      summary: summary.trim(),
      contentMarkdown: contentMarkdown.trim() || `### مقدمة الدرس\nسيتم توليد الشرح تلقائياً من المرجعيات المعتمدة.`,
      linkedReferenceIds: selectedRefIds,
      practiceQuestions: initialData?.practiceQuestions || [],
      finalQuiz: initialData?.finalQuiz || {
        id: `quiz-${Date.now()}`,
        title: `اختبار تقييم درس ${title}`,
        timeLimitMinutes: 15,
        passScorePercentage: 80,
        questions: []
      },
      keyConcepts: initialData?.keyConcepts || [],
      flashcards: initialData?.flashcards || []
    };

    onSave(lesson);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-right">
      <div className="space-y-1">
        <label className="text-xs font-black text-slate-700">عنوان الدرس التعليمي *</label>
        <input
          type="text"
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="مثال: التفاعلات الضوئية وسلسلة نقل الإلكترون"
          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-black text-slate-700">مدة الدرس بالدقائق</label>
          <input
            type="number"
            min={10}
            max={180}
            value={durationMinutes}
            onChange={e => setDurationMinutes(parseInt(e.target.value) || 45)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-black text-slate-700">ملخص الدرس</label>
          <input
            type="text"
            value={summary}
            onChange={e => setSummary(e.target.value)}
            placeholder="ملخص الدرس المركز..."
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none"
          />
        </div>
      </div>

      {/* Select Linked References */}
      <div className="space-y-1.5 pt-1">
        <label className="text-xs font-black text-slate-700 block">اختيار المرجعيات المعتمدة لهذا الدرس *</label>
        <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
          {course.references?.map(ref => (
            <label key={ref.id} className="flex items-center gap-2 text-xs font-bold text-slate-800 p-1.5 hover:bg-white rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={selectedRefIds.includes(ref.id)}
                onChange={e => {
                  if (e.target.checked) {
                    setSelectedRefIds([...selectedRefIds, ref.id]);
                  } else {
                    setSelectedRefIds(selectedRefIds.filter(id => id !== ref.id));
                  }
                }}
                className="rounded text-indigo-600"
              />
              <span>📖 {ref.title}</span>
              <span className="text-[10px] text-slate-400 mr-auto">{ref.citation}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-black text-slate-700">محتوى الشرح (اختياري، يمكن توليده تلقائياً بالذكاء الاصطناعي من المراجع)</label>
        <textarea
          rows={4}
          value={contentMarkdown}
          onChange={e => setContentMarkdown(e.target.value)}
          placeholder="اتركه فارغاً لاستخدام ميزة التوليد التلقائي من المرجعيات المعتمدة..."
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium outline-none"
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-100 rounded-xl"
        >
          إلغاء
        </button>
        <button
          type="submit"
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md"
        >
          حفظ بيانات الدرس
        </button>
      </div>
    </form>
  );
};
