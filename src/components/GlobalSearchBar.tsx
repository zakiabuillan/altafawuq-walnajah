import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, X, User, GraduationCap, BookOpen, Users, 
  ArrowRight, Phone, MessageSquare, Clock, Wallet, 
  Sparkles, ExternalLink, CornerDownLeft, Command,
  History, CheckCircle2, ChevronRight, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, Teacher, GroupCourse, CourseStatus, TrialLesson } from '../types';
import { openWhatsAppChat, formatWhatsAppPhone972 } from '../lib/phoneUtils';

// Helper for Arabic text normalization
export const normalizeArabic = (text: string = ''): string => {
  return text
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // Remove tashkeel / harakat
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ى]/g, 'ي')
    .replace(/[ة]/g, 'ه')
    .trim();
};

const normalizePhoneDigits = (phone: string = ''): string => {
  if (!phone) return '';
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  let clean = phone.toString();
  for (let i = 0; i < 10; i++) {
    clean = clean.split(arabicNumerals[i]).join(i.toString());
  }
  return clean.replace(/\D/g, '').trim();
};

export type GlobalSearchCategory = 'all' | 'students' | 'trials' | 'teachers' | 'courses';

interface GlobalSearchBarProps {
  students: Student[];
  teachers: Teacher[];
  courses: GroupCourse[];
  trialLessons?: TrialLesson[];
  onSelectStudent: (student: Student) => void;
  onSelectTeacher: (teacher: Teacher) => void;
  onSelectCourse: (course: GroupCourse) => void;
  onSelectTrialLesson?: (trial: TrialLesson) => void;
  onQuickNavigateTab?: (tab: 'students' | 'teachers' | 'placement' | 'trials') => void;
  className?: string;
  isModalOpen?: boolean;
  setIsModalOpen?: (isOpen: boolean) => void;
}

export const GlobalSearchBar: React.FC<GlobalSearchBarProps> = ({
  students = [],
  teachers = [],
  courses = [],
  trialLessons = [],
  onSelectStudent,
  onSelectTeacher,
  onSelectCourse,
  onSelectTrialLesson,
  onQuickNavigateTab,
  className = '',
  isModalOpen: externalIsModalOpen,
  setIsModalOpen: externalSetIsModalOpen
}) => {
  // Controlled or uncontrolled modal state
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = externalIsModalOpen !== undefined ? externalIsModalOpen : internalIsOpen;
  const setIsOpen = externalSetIsModalOpen || setInternalIsOpen;

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<GlobalSearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('academy_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const triggerInputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut listener: Ctrl+K or Cmd+K or /
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is actively typing in a standard input or textarea (unless Ctrl+K)
      const target = e.target as HTMLElement;
      const isInputFocused = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsOpen(!isOpen);
      } else if (e.key === '/' && !isInputFocused && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Auto focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  // Save recent search
  const addRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    try {
      const updated = [trimmed, ...recentSearches.filter(s => s !== trimmed)].slice(0, 8);
      setRecentSearches(updated);
      localStorage.setItem('academy_recent_searches', JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not save recent search:", e);
    }
  };

  const clearRecentSearches = () => {
    try {
      setRecentSearches([]);
      localStorage.removeItem('academy_recent_searches');
    } catch (e) {
      console.warn("Could not clear recent searches:", e);
    }
  };

  // Perform search
  const filteredResults = useMemo(() => {
    const rawQuery = query.trim();
    if (!rawQuery) {
      return { students: [], trials: [], teachers: [], courses: [], total: 0 };
    }

    const normQuery = normalizeArabic(rawQuery);
    const digitQuery = normalizePhoneDigits(rawQuery);

    // 1. Filter Students (مع منع تكرار الطلاب المتطابقين في الاسم ورقم الهاتف)
    const matchedStudentsRaw = (activeCategory === 'all' || activeCategory === 'students')
      ? students.filter(student => {
          const normName = normalizeArabic(student.name || '');
          const normGrade = normalizeArabic(student.grade || student.academicLevel || '');
          const normPhone = normalizePhoneDigits(student.phone || '');
          const normParentPhone = normalizePhoneDigits((student as any).parentPhone || '');
          const normGuardianPhone = normalizePhoneDigits((student as any).guardianPhone || (student as any).parentPhoneNumber || '');
          const normEmail = (student.email || '').toLowerCase();
          const normCode = (student as any).studentCode || student.id || '';

          const matchesPhone = digitQuery.length >= 3 && (
            normPhone.includes(digitQuery) || 
            normParentPhone.includes(digitQuery) || 
            normGuardianPhone.includes(digitQuery)
          );

          return (
            normName.includes(normQuery) ||
            normGrade.includes(normQuery) ||
            matchesPhone ||
            normEmail.includes(rawQuery.toLowerCase()) ||
            normCode.toLowerCase().includes(rawQuery.toLowerCase())
          );
        })
      : [];

    const seenStudentSignatures = new Set<string>();
    const matchedStudents: Student[] = [];
    for (const student of matchedStudentsRaw) {
      const normN = normalizeArabic(student.name || '');
      const rawP = normalizePhoneDigits(student.phone || (student as any).parentPhone || '');
      const phoneTail = rawP.length >= 7 ? rawP.slice(-8) : rawP;
      const sig = (normN && phoneTail)
        ? `${normN}___${phoneTail}`
        : (normN && student.grade ? `${normN}___${normalizeArabic(student.grade)}` : student.id);
      if (!seenStudentSignatures.has(sig)) {
        seenStudentSignatures.add(sig);
        matchedStudents.push(student);
      }
      if (matchedStudents.length >= 15) break;
    }

    // 1.5 Filter Trial Lessons (الحصص التجريبية في كافة المنصة والنظام)
    const matchedTrials = (activeCategory === 'all' || activeCategory === 'students' || activeCategory === 'trials')
      ? (trialLessons || []).filter(trial => {
          const normStudentName = normalizeArabic(trial.studentName || '');
          const normSubject = normalizeArabic(trial.subject || '');
          const normTopic = normalizeArabic(trial.topic || '');
          const normTeacher = normalizeArabic(trial.teacherName || '');
          const normGrade = normalizeArabic(trial.grade || '');
          const normPhone = normalizePhoneDigits(trial.phone || '');
          const normStatus = normalizeArabic(trial.status === 'pending' ? 'قيد الانتظار معلقة تجريبية' : 'مكتملة تجريبية');

          return (
            normStudentName.includes(normQuery) ||
            normSubject.includes(normQuery) ||
            normTopic.includes(normQuery) ||
            normTeacher.includes(normQuery) ||
            normGrade.includes(normQuery) ||
            (digitQuery && normPhone.includes(digitQuery)) ||
            normStatus.includes(normQuery)
          );
        }).slice(0, 15)
      : [];

    // 2. Filter Teachers
    const matchedTeachers = (activeCategory === 'all' || activeCategory === 'teachers')
      ? teachers.filter(teacher => {
          const normName = normalizeArabic(teacher.name || '');
          const normSpec = normalizeArabic(teacher.specialization || '');
          const normSubjects = (teacher.subjects || []).map(s => normalizeArabic(s)).join(' ');
          const normPhone = normalizePhoneDigits(teacher.phone || teacher.contact || '');
          const normEmail = (teacher.email || '').toLowerCase();
          const normUsername = ((teacher as any).username || '').toLowerCase();

          return (
            normName.includes(normQuery) ||
            normSpec.includes(normQuery) ||
            normSubjects.includes(normQuery) ||
            (digitQuery && normPhone.includes(digitQuery)) ||
            normEmail.includes(rawQuery.toLowerCase()) ||
            normUsername.includes(rawQuery.toLowerCase())
          );
        }).slice(0, 15)
      : [];

    // 3. Filter Courses
    const matchedCourses = (activeCategory === 'all' || activeCategory === 'courses')
      ? courses.filter(course => {
          const normTitle = normalizeArabic(course.title || course.name || '');
          const normInstructor = normalizeArabic(course.instructor || '');
          const normLevel = normalizeArabic(course.level || '');
          const normSubject = normalizeArabic(course.subject || '');
          const normCode = (course.code || '').toLowerCase();

          return (
            normTitle.includes(normQuery) ||
            normInstructor.includes(normQuery) ||
            normLevel.includes(normQuery) ||
            normSubject.includes(normQuery) ||
            normCode.includes(rawQuery.toLowerCase())
          );
        }).slice(0, 15)
      : [];

    const total = matchedStudents.length + matchedTrials.length + matchedTeachers.length + matchedCourses.length;

    return {
      students: matchedStudents,
      trials: matchedTrials,
      teachers: matchedTeachers,
      courses: matchedCourses,
      total
    };
  }, [query, activeCategory, students, trialLessons, teachers, courses]);

  // Flattened array for arrow-key navigation
  const flatItems = useMemo(() => {
    const list: Array<
      | { type: 'student'; item: Student }
      | { type: 'trial'; item: TrialLesson }
      | { type: 'teacher'; item: Teacher }
      | { type: 'course'; item: GroupCourse }
    > = [];

    filteredResults.students.forEach(s => list.push({ type: 'student', item: s }));
    filteredResults.trials.forEach(tr => list.push({ type: 'trial', item: tr }));
    filteredResults.teachers.forEach(t => list.push({ type: 'teacher', item: t }));
    filteredResults.courses.forEach(c => list.push({ type: 'course', item: c }));

    return list;
  }, [filteredResults]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  const handleSelectItem = (entry: { type: 'student' | 'trial' | 'teacher' | 'course'; item: any }) => {
    if (query.trim()) {
      addRecentSearch(query);
    }
    setIsOpen(false);

    if (entry.type === 'student') {
      onSelectStudent(entry.item);
    } else if (entry.type === 'trial') {
      if (onSelectTrialLesson) {
        onSelectTrialLesson(entry.item);
      } else {
        localStorage.setItem('focus-trial-lesson-search', entry.item.studentName || entry.item.phone || '');
        window.dispatchEvent(new CustomEvent('switch-manager-tab', { detail: { tab: 'trials' } }));
      }
    } else if (entry.type === 'teacher') {
      onSelectTeacher(entry.item);
    } else if (entry.type === 'course') {
      onSelectCourse(entry.item);
    }
  };

  // Keyboard navigation within the modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1 < flatItems.length ? prev + 1 : 0));
      scrollActiveIntoView((selectedIndex + 1) % (flatItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 >= 0 ? prev - 1 : flatItems.length - 1));
      scrollActiveIntoView((selectedIndex - 1 + flatItems.length) % (flatItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        handleSelectItem(flatItems[selectedIndex]);
      }
    }
  };

  const scrollActiveIntoView = (index: number) => {
    const el = document.getElementById(`search-result-item-${index}`);
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  const highlightMatch = (text: string = '', search: string = '') => {
    if (!search.trim() || !text) return text;
    const normSearch = normalizeArabic(search.trim());
    const normText = normalizeArabic(text);
    const matchIndex = normText.indexOf(normSearch);

    if (matchIndex === -1) return text;

    const length = search.trim().length;
    const before = text.slice(0, matchIndex);
    const matched = text.slice(matchIndex, matchIndex + length);
    const after = text.slice(matchIndex + length);

    return (
      <>
        {before}
        <mark className="bg-amber-300 text-slate-900 rounded-xs px-0.5 font-black">{matched}</mark>
        {after}
      </>
    );
  };

  return (
    <>
      {/* 1. Header Search Bar Trigger Input (Top Navigation) */}
      <div className={`relative flex items-center ${className}`} dir="rtl">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between gap-3 px-3.5 py-2 bg-slate-950/70 hover:bg-slate-950 text-slate-300 hover:text-white border border-slate-700/80 hover:border-teal-500/80 rounded-xl text-xs transition-all shadow-inner group cursor-pointer"
          title="شريط البحث السريع الشامل (Ctrl + K)"
          id="global-search-bar-trigger"
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <Search size={15} className="text-teal-400 group-hover:scale-110 transition-transform shrink-0" />
            <span className="text-slate-400 group-hover:text-slate-200 text-xs font-semibold truncate select-none">
              بحث شامل عن طالب، معلم، أو دورة...
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700 rounded-md shadow-xs">
              <Command size={10} />
              <span>K</span>
            </kbd>
          </div>
        </button>
      </div>

      {/* 2. Global Search Command Palette Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 md:p-10" dir="rtl">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
              aria-hidden="true"
            />

            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -20 }}
              transition={{ type: "spring", duration: 0.25, bounce: 0.1 }}
              className="relative w-full max-w-3xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] z-10"
              role="dialog"
              aria-modal="true"
              aria-label="البحث العالمي الشامل"
            >
              {/* Search Bar Header inside Dialog */}
              <div className="p-4 sm:p-5 border-b border-slate-150 bg-slate-50/70">
                <div className="relative flex items-center">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none text-slate-400">
                    <Search size={20} className="text-teal-600" />
                  </div>

                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="اكتب اسم الطالب، رقم الهاتف، اسم المعلم، أو عنوان الدورة..."
                    className="w-full bg-white text-slate-900 placeholder-slate-400 pr-12 pl-24 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 text-sm sm:text-base font-bold outline-none transition-all shadow-xs"
                    autoComplete="off"
                    spellCheck="false"
                  />

                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                    {query && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuery('');
                          inputRef.current?.focus();
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="مسح حقل البحث"
                      >
                        <X size={16} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/80 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      title="إغلاق (Esc)"
                    >
                      <kbd className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">ESC</kbd>
                    </button>
                  </div>
                </div>

                {/* Category Filter Chips */}
                <div className="flex items-center gap-2 mt-3 overflow-x-auto no-scrollbar pb-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveCategory('all')}
                    className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      activeCategory === 'all'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>الكل</span>
                    {query.trim() && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        activeCategory === 'all' ? 'bg-slate-800 text-teal-300' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {filteredResults.total}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCategory('students')}
                    className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      activeCategory === 'students'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <GraduationCap size={14} />
                    <span>الطلاب المسجلون</span>
                    {query.trim() && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        activeCategory === 'students' ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {filteredResults.students.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCategory('trials')}
                    className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      activeCategory === 'trials'
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'bg-white text-purple-700 hover:bg-purple-50 border border-purple-200'
                    }`}
                  >
                    <Sparkles size={14} className={activeCategory === 'trials' ? 'text-amber-300' : 'text-purple-600'} />
                    <span>الحصص التجريبية</span>
                    {query.trim() && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        activeCategory === 'trials' ? 'bg-purple-800 text-purple-200' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {filteredResults.trials.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCategory('teachers')}
                    className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      activeCategory === 'teachers'
                        ? 'bg-sky-700 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <Users size={14} />
                    <span>المعلمون</span>
                    {query.trim() && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        activeCategory === 'teachers' ? 'bg-sky-800 text-sky-200' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {filteredResults.teachers.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveCategory('courses')}
                    className={`px-3 py-1.5 rounded-xl font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      activeCategory === 'courses'
                        ? 'bg-indigo-700 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <BookOpen size={14} />
                    <span>الدورات الجماعية</span>
                    {query.trim() && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        activeCategory === 'courses' ? 'bg-indigo-800 text-indigo-200' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {filteredResults.courses.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Modal Body: Results or Recent Searches / Overview */}
              <div 
                ref={listContainerRef}
                className="flex-1 overflow-y-auto p-4 sm:p-5 divide-y divide-slate-100 space-y-4 max-h-[58vh]"
              >
                {/* 1. When Query is Empty -> Show Overview + Recent Searches */}
                {!query.trim() && (
                  <div className="space-y-5">
                    {/* Quick navigation category cards */}
                    <div>
                      <h4 className="text-xs font-black text-slate-400 mb-2.5 flex items-center gap-1.5">
                        <Sparkles size={13} className="text-amber-500" />
                        <span>أقسام النظام الرئيسية (انقر للانتقال السريع)</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            onQuickNavigateTab?.('students');
                          }}
                          className="p-3 bg-emerald-50/50 hover:bg-emerald-100/60 border border-emerald-200/80 rounded-2xl flex items-center justify-between text-right group transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                              <GraduationCap size={18} />
                            </div>
                            <div>
                              <span className="text-xs font-black text-emerald-950 block">شعبة الطلاب</span>
                              <span className="text-[10px] font-bold text-emerald-700">{students.length} طالب مسجل</span>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-emerald-500 group-hover:-translate-x-1 transition-transform" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            onQuickNavigateTab?.('trials');
                          }}
                          className="p-3 bg-purple-50/60 hover:bg-purple-100/70 border border-purple-200 rounded-2xl flex items-center justify-between text-right group transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-purple-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                              <Sparkles size={18} className="text-amber-300" />
                            </div>
                            <div>
                              <span className="text-xs font-black text-purple-950 block">الحصص التجريبية</span>
                              <span className="text-[10px] font-bold text-purple-700">{trialLessons.length} لقاء مسجل</span>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-purple-500 group-hover:-translate-x-1 transition-transform" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            onQuickNavigateTab?.('teachers');
                          }}
                          className="p-3 bg-sky-50/50 hover:bg-sky-100/60 border border-sky-200/80 rounded-2xl flex items-center justify-between text-right group transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                              <Users size={18} />
                            </div>
                            <div>
                              <span className="text-xs font-black text-sky-950 block">كادر المعلمين</span>
                              <span className="text-[10px] font-bold text-sky-700">{teachers.length} معلم ومدرس</span>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-sky-500 group-hover:-translate-x-1 transition-transform" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            onQuickNavigateTab?.('placement');
                          }}
                          className="p-3 bg-indigo-50/50 hover:bg-indigo-100/60 border border-indigo-200/80 rounded-2xl flex items-center justify-between text-right group transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                              <BookOpen size={18} />
                            </div>
                            <div>
                              <span className="text-xs font-black text-indigo-950 block">الدورات الجماعية</span>
                              <span className="text-[10px] font-bold text-indigo-700">{courses.length} دورة مسجلة</span>
                            </div>
                          </div>
                          <ChevronRight size={16} className="text-indigo-500 group-hover:-translate-x-1 transition-transform" />
                        </button>
                      </div>
                    </div>

                    {/* Recent Searches (if available) */}
                    {recentSearches.length > 0 && (
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-black text-slate-400 flex items-center gap-1.5">
                            <History size={13} className="text-slate-400" />
                            <span>عمليات البحث الأخيرة</span>
                          </h4>
                          <button
                            type="button"
                            onClick={clearRecentSearches}
                            className="text-[10px] text-slate-400 hover:text-rose-600 font-bold transition-colors cursor-pointer"
                          >
                            مسح السجل
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {recentSearches.map((term, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setQuery(term);
                                inputRef.current?.focus();
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <History size={11} className="text-slate-400" />
                              <span>{term}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Helpful tips box */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center gap-3 text-xs text-slate-500">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 font-black">
                        💡
                      </div>
                      <p className="leading-relaxed">
                        <strong className="text-slate-700 font-black">تلميح ذكي:</strong> يمكنك كتابة جزء من اسم الطالب، رقم هاتفه أو رقم ولي الأمر، تخصص المعلم، أو اسم الصف الدراسي للوصول المباشر والفوري.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. When Query is Active But No Results Found */}
                {query.trim() && filteredResults.total === 0 && (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200">
                      <AlertCircle size={28} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-slate-800">
                        لم يتم العثور على أي نتائج مطابقة لـ "{query}"
                      </h4>
                      <p className="text-xs text-slate-400 font-medium mt-1 max-w-sm mx-auto">
                        تأكد من صحة كتابة الكلمة، أو جرّب البحث برقم الهاتف أو جزء من الاسم أو تبديل تصنيف الفلترة بالأعلى.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQuery('')}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      إعادة تعيين البحث
                    </button>
                  </div>
                )}

                {/* 3. When Query is Active & Results Found */}
                {query.trim() && filteredResults.total > 0 && (
                  <div className="space-y-6 pt-1">
                    {/* Students Group */}
                    {filteredResults.students.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                          <h4 className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                            <GraduationCap size={15} className="text-emerald-600" />
                            <span>الطلاب المطابقون ({filteredResults.students.length})</span>
                          </h4>
                          <span className="text-[10px] text-slate-400 font-bold">انقر للانتقال لملف الطالب</span>
                        </div>

                        <div className="space-y-1.5">
                          {filteredResults.students.map((student) => {
                            const itemIndex = flatItems.findIndex(x => x.type === 'student' && x.item.id === student.id);
                            const isSelected = selectedIndex === itemIndex;

                            return (
                              <div
                                key={student.id}
                                id={`search-result-item-${itemIndex}`}
                                onClick={() => handleSelectItem({ type: 'student', item: student })}
                                onMouseEnter={() => setSelectedIndex(itemIndex)}
                                className={`group p-3 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                  isSelected
                                    ? 'bg-emerald-50/80 border-emerald-400 shadow-sm ring-2 ring-emerald-500/20'
                                    : 'bg-white hover:bg-slate-50 border-slate-150'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                                    {(student.name || 'ط')[0]}
                                  </div>

                                  <div className="space-y-0.5 text-right">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-black text-slate-900 group-hover:text-emerald-800 transition-colors">
                                        {highlightMatch(student.name, query)}
                                      </span>
                                      
                                      <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                                        {student.grade || student.academicLevel || 'غير محدد'}
                                      </span>

                                      {student.balance < 0 ? (
                                        <span className="text-[10px] font-black bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md border border-rose-200 flex items-center gap-1">
                                          <Wallet size={10} />
                                          <span>مدين: ₪{Math.abs(student.balance)}</span>
                                        </span>
                                      ) : student.balance > 0 ? (
                                        <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                                          <Wallet size={10} />
                                          <span>رصيد: ₪{student.balance}</span>
                                        </span>
                                      ) : null}
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                                      {student.phone && (
                                        <span className="flex items-center gap-1 font-mono font-bold" dir="ltr">
                                          <Phone size={11} className="text-slate-400" />
                                          {student.phone}
                                        </span>
                                      )}
                                      {(student as any).parentPhone && (
                                        <span className="text-[10px] text-slate-400 font-mono">
                                          (ولي الأمر: {(student as any).parentPhone})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                  {student.phone && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openWhatsAppChat(student.phone, `مرحباً بك ${student.name} من أكاديمية التفوق أون لاين.`);
                                      }}
                                      className="p-2 text-emerald-600 hover:bg-emerald-100/70 rounded-xl transition-colors cursor-pointer"
                                      title="محادثة واتساب سريعة"
                                    >
                                      <MessageSquare size={15} />
                                    </button>
                                  )}
                                  <div className="flex items-center gap-1 text-xs font-black text-emerald-700 px-2.5 py-1.5 rounded-xl bg-emerald-100/60 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                    <span>فتح الملف</span>
                                    <ArrowRight size={13} className="rotate-180" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Trial Lessons Group (الحصص التجريبية واللقاءات التمهيدية في كل النظام) */}
                    {filteredResults.trials.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-purple-150">
                          <h4 className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                            <Sparkles size={15} className="text-purple-600" />
                            <span>الحصص التجريبية واللقاءات التمهيدية المطابقة ({filteredResults.trials.length})</span>
                          </h4>
                          <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                            نظام الحصص التجريبية ⚡
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {filteredResults.trials.map((trial) => {
                            const itemIndex = flatItems.findIndex(x => x.type === 'trial' && x.item.id === trial.id);
                            const isSelected = selectedIndex === itemIndex;

                            return (
                              <div
                                key={trial.id}
                                id={`search-result-item-${itemIndex}`}
                                onClick={() => handleSelectItem({ type: 'trial', item: trial })}
                                onMouseEnter={() => setSelectedIndex(itemIndex)}
                                className={`group p-3 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                  isSelected
                                    ? 'bg-purple-50/90 border-purple-400 shadow-sm ring-2 ring-purple-500/20'
                                    : 'bg-white hover:bg-purple-50/40 border-slate-150'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-800 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                                    <Sparkles size={17} className="text-amber-300" />
                                  </div>

                                  <div className="space-y-0.5 text-right">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-black text-slate-900 group-hover:text-purple-900 transition-colors">
                                        {highlightMatch(trial.studentName, query)}
                                      </span>

                                      <span className="text-[10px] font-black bg-purple-100 text-purple-900 px-2 py-0.5 rounded-md border border-purple-200 flex items-center gap-1">
                                        <span>⚡ حصة تجريبية</span>
                                      </span>

                                      {trial.status === 'pending' ? (
                                        <span className="text-[9px] font-black bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                                          قيد الانتظار
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                                          مكتملة
                                        </span>
                                      )}

                                      {trial.grade && (
                                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                                          {trial.grade}
                                        </span>
                                      )}

                                      {trial.subject && (
                                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200">
                                          {trial.subject}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                                      {trial.teacherName && (
                                        <span className="text-[11px] font-bold text-slate-600">
                                          👨‍🏫 المعلم: <strong className="text-slate-800">{trial.teacherName}</strong>
                                        </span>
                                      )}

                                      {trial.topic && (
                                        <span className="text-[10px] text-slate-400">
                                          ({trial.topic})
                                        </span>
                                      )}

                                      {trial.phone && (
                                        <span className="flex items-center gap-1 font-mono font-bold" dir="ltr">
                                          <Phone size={11} className="text-slate-400" />
                                          {trial.phone}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                  {trial.phone && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openWhatsAppChat(trial.phone, `مرحباً بك ولي أمر الطالب ${trial.studentName} بخصوص الحصة التجريبية لمادة ${trial.subject || ''} في أكاديمية التفوق أون لاين.`);
                                      }}
                                      className="p-2 text-emerald-600 hover:bg-emerald-100/70 rounded-xl transition-colors cursor-pointer"
                                      title="محادثة واتساب سريعة لولي الأمر"
                                    >
                                      <MessageSquare size={15} />
                                    </button>
                                  )}
                                  <div className="flex items-center gap-1 text-xs font-black text-purple-700 px-2.5 py-1.5 rounded-xl bg-purple-100 group-hover:bg-purple-700 group-hover:text-white transition-all">
                                    <span>عرض في الحصص التجريبية</span>
                                    <ArrowRight size={13} className="rotate-180" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Teachers Group */}
                    {filteredResults.teachers.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                          <h4 className="text-xs font-black text-sky-800 flex items-center gap-1.5">
                            <Users size={15} className="text-sky-600" />
                            <span>المعلمون المطابقون ({filteredResults.teachers.length})</span>
                          </h4>
                          <span className="text-[10px] text-slate-400 font-bold">انقر للانتقال لبطاقة المعلم</span>
                        </div>

                        <div className="space-y-1.5">
                          {filteredResults.teachers.map((teacher) => {
                            const itemIndex = flatItems.findIndex(x => x.type === 'teacher' && x.item.id === teacher.id);
                            const isSelected = selectedIndex === itemIndex;

                            return (
                              <div
                                key={teacher.id}
                                id={`search-result-item-${itemIndex}`}
                                onClick={() => handleSelectItem({ type: 'teacher', item: teacher })}
                                onMouseEnter={() => setSelectedIndex(itemIndex)}
                                className={`group p-3 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                  isSelected
                                    ? 'bg-sky-50/80 border-sky-400 shadow-sm ring-2 ring-sky-500/20'
                                    : 'bg-white hover:bg-slate-50 border-slate-150'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-indigo-700 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                                    {(teacher.name || 'م')[0]}
                                  </div>

                                  <div className="space-y-0.5 text-right">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-black text-slate-900 group-hover:text-sky-800 transition-colors">
                                        {highlightMatch(teacher.name, query)}
                                      </span>

                                      {teacher.specialization && (
                                        <span className="text-[10px] font-bold bg-sky-100/70 text-sky-800 px-2 py-0.5 rounded-md border border-sky-200">
                                          {teacher.specialization}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                                      {(teacher.phone || teacher.contact) && (
                                        <span className="flex items-center gap-1 font-mono font-bold" dir="ltr">
                                          <Phone size={11} className="text-slate-400" />
                                          {teacher.phone || teacher.contact}
                                        </span>
                                      )}

                                      {teacher.subjects && teacher.subjects.length > 0 && (
                                        <span className="text-[10px] text-slate-400">
                                          المواد: {teacher.subjects.join('، ')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                  <div className="flex items-center gap-1 text-xs font-black text-sky-700 px-2.5 py-1.5 rounded-xl bg-sky-100/60 group-hover:bg-sky-600 group-hover:text-white transition-all">
                                    <span>عرض المعلم</span>
                                    <ArrowRight size={13} className="rotate-180" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Courses Group */}
                    {filteredResults.courses.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                          <h4 className="text-xs font-black text-indigo-800 flex items-center gap-1.5">
                            <BookOpen size={15} className="text-indigo-600" />
                            <span>الدورات الجماعية المطابقة ({filteredResults.courses.length})</span>
                          </h4>
                          <span className="text-[10px] text-slate-400 font-bold">انقر للانتقال للدورة</span>
                        </div>

                        <div className="space-y-1.5">
                          {filteredResults.courses.map((course) => {
                            const itemIndex = flatItems.findIndex(x => x.type === 'course' && x.item.id === course.id);
                            const isSelected = selectedIndex === itemIndex;
                            const progress = course.totalHours > 0 
                              ? Math.round((course.completedHours / course.totalHours) * 100) 
                              : 0;

                            return (
                              <div
                                key={course.id}
                                id={`search-result-item-${itemIndex}`}
                                onClick={() => handleSelectItem({ type: 'course', item: course })}
                                onMouseEnter={() => setSelectedIndex(itemIndex)}
                                className={`group p-3 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                  isSelected
                                    ? 'bg-indigo-50/80 border-indigo-400 shadow-sm ring-2 ring-indigo-500/20'
                                    : 'bg-white hover:bg-slate-50 border-slate-150'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                                    <BookOpen size={18} />
                                  </div>

                                  <div className="space-y-0.5 text-right">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm font-black text-slate-900 group-hover:text-indigo-800 transition-colors">
                                        {highlightMatch(course.title || course.name || '', query)}
                                      </span>

                                      {course.level && (
                                        <span className="text-[10px] font-bold bg-indigo-100/70 text-indigo-800 px-2 py-0.5 rounded-md border border-indigo-200">
                                          {course.level}
                                        </span>
                                      )}

                                      {course.instructor && (
                                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                          المعلم: {course.instructor}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                                      <span className="flex items-center gap-1">
                                        <Clock size={11} className="text-slate-400" />
                                        <span>إنجاز: {course.completedHours}/{course.totalHours} ساعة ({progress}%)</span>
                                      </span>

                                      {course.classTime && (
                                        <span className="text-[10px] text-slate-400 font-bold">
                                          الموعد: {course.classTime}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                                  <div className="flex items-center gap-1 text-xs font-black text-indigo-700 px-2.5 py-1.5 rounded-xl bg-indigo-100/60 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    <span>إدارة الدورة</span>
                                    <ArrowRight size={13} className="rotate-180" />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer with Keyboard Navigation Hints */}
              <div className="p-3 sm:px-5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <kbd className="bg-white border border-slate-200 px-1 py-0.5 rounded text-[10px] font-mono text-slate-600">↑</kbd>
                    <kbd className="bg-white border border-slate-200 px-1 py-0.5 rounded text-[10px] font-mono text-slate-600">↓</kbd>
                    <span>للتنقل</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-600">Enter</kbd>
                    <span>للاختيار</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="bg-white border border-slate-200 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-600">Esc</kbd>
                    <span>للإغلاق</span>
                  </span>
                </div>

                <div className="hidden sm:flex items-center gap-1 text-slate-400">
                  <Sparkles size={11} className="text-teal-500" />
                  <span>أكاديمية التفوق أون لاين</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
