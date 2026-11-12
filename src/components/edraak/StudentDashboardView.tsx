import React, { useState } from 'react';
import { 
  GraduationCap, 
  BookOpen, 
  Video, 
  Calendar, 
  FileText, 
  Award, 
  Clock, 
  CheckCircle2, 
  Download, 
  ExternalLink, 
  Sparkles, 
  ArrowLeft, 
  PlayCircle,
  FileSpreadsheet,
  File,
  Layers,
  ChevronRight,
  User,
  Star
} from 'lucide-react';
import { Course, ClassSession, EducationalFile, StudentExamSubmission, StudentProgress, CurriculumData } from './types';

interface StudentDashboardViewProps {
  studentName: string;
  studentEmail: string;
  curriculum: CurriculumData;
  progress: StudentProgress;
  submissions: StudentExamSubmission[];
  onOpenLessons: () => void;
  onOpenReview: () => void;
  onOpenExam: () => void;
  onOpenCertificate: (sub: StudentExamSubmission) => void;
  onOpenAssistant: () => void;
}

export const StudentDashboardView: React.FC<StudentDashboardViewProps> = ({
  studentName,
  studentEmail,
  curriculum,
  progress,
  submissions,
  onOpenLessons,
  onOpenReview,
  onOpenExam,
  onOpenCertificate,
  onOpenAssistant
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'classes' | 'library' | 'exams'>('overview');

  // Sample enrolled courses data
  const enrolledCourses: Course[] = [
    {
      id: 'c-photosynthesis',
      title: curriculum.title || 'التمثيل الضوئي (Photosynthesis)',
      code: 'BIO-301',
      subject: 'بيولوجيا',
      grade: 'المرحلة الثانوية والبجروت',
      teacherId: 't-1',
      teacherName: 'د. سامر الصالح (مدرس الأحياء)',
      description: curriculum.introduction || 'دراسة تفصيلية لتفاعلات الضوء وحلقة كالفن وإنتاج الطاقة في النباتات.',
      progressPercent: progress.examCompleted ? 100 : Math.round((progress.unitsRead.length / Math.max(curriculum.learningUnits.length, 1)) * 70),
      status: progress.examCompleted ? 'completed' : 'active',
      totalLessons: curriculum.learningUnits.length || 4,
      completedLessons: progress.unitsRead.length,
      enrolledStudentsCount: 42
    },
    {
      id: 'c-chem-organic',
      title: 'الكيمياء العضوية والتفاعلات الحيوية',
      code: 'CHEM-402',
      subject: 'كيمياء',
      grade: 'المرحلة الثانوية والبجروت',
      teacherId: 't-2',
      teacherName: 'أ. ليلى قدورة',
      description: 'مفاهيم الروابط الهيدروجينية، الإسترات، والسكريات الأحادية المتكونة بالبناء الضوئي.',
      progressPercent: 45,
      status: 'active',
      totalLessons: 6,
      completedLessons: 3,
      enrolledStudentsCount: 38
    },
    {
      id: 'c-physics-optics',
      title: 'الفيزياء: الضوء والأطياف الكهرومغناطيسية',
      code: 'PHYS-201',
      subject: 'فيزياء',
      grade: 'المرحلة الثانوية',
      teacherId: 't-3',
      teacherName: 'م. أحمد بركات',
      description: 'طول موجة الضوء الأحمر والأزرق وتأثير طيف الامتصاص على صبغة الكلوروفيل.',
      progressPercent: 80,
      status: 'active',
      totalLessons: 5,
      completedLessons: 4,
      enrolledStudentsCount: 50
    }
  ];

  // Sample scheduled and past class sessions
  const classSessions: ClassSession[] = [
    {
      id: 'sess-1',
      courseId: 'c-photosynthesis',
      courseTitle: 'التمثيل الضوئي (Photosynthesis)',
      title: 'مناقشة تفاعلات الضوء وإنتاج ATP و NADPH',
      date: 'اليوم',
      time: '05:00 م - 06:30 م',
      durationMinutes: 90,
      teacherName: 'د. سامر الصالح',
      status: 'upcoming',
      meetingLink: 'https://meet.google.com',
      notes: 'يرجى مراجعة الوحدة الأولى والثانية قبل بدء الحصة.'
    },
    {
      id: 'sess-2',
      courseId: 'c-photosynthesis',
      courseTitle: 'التمثيل الضوئي (Photosynthesis)',
      title: 'حل وتفكيك أسئلة بجروت في حلقة كالفن والروبيسكو',
      date: 'بعد غد',
      time: '04:00 م - 05:30 م',
      durationMinutes: 90,
      teacherName: 'د. سامر الصالح',
      status: 'upcoming',
      meetingLink: 'https://meet.google.com',
      notes: 'سيتم تقديم اختبار قصير تفاعلي أثناء البث المباشر.'
    },
    {
      id: 'sess-3',
      courseId: 'c-photosynthesis',
      courseTitle: 'التمثيل الضوئي (Photosynthesis)',
      title: 'الحصة المسجلة: مقدمة البلاستيدات الخضراء والغشاء الداخلي',
      date: '28 فبراير 2026',
      time: 'مسجلة (متاحة دائماً)',
      durationMinutes: 50,
      teacherName: 'د. سامر الصالح',
      status: 'completed',
      recordingUrl: 'https://youtube.com',
      notes: 'تسجيل كامل عالي الدقة مع التلخيص السبوري.'
    }
  ];

  // Sample educational library files
  const libraryFiles: EducationalFile[] = [
    {
      id: 'file-1',
      courseId: 'c-photosynthesis',
      courseTitle: 'التمثيل الضوئي',
      fileName: 'كتاب_التمثيل_الضوئي_المنهاج_الرسمي.pdf',
      fileType: 'pdf',
      fileSize: '4.2 MB',
      uploadDate: '2026-02-15',
      downloadUrl: '#',
      description: 'الملف المعتمد الكامل الذي يحتوي على الشرح المنهجي والمخططات.',
      uploaderName: 'د. سامر الصالح'
    },
    {
      id: 'file-2',
      courseId: 'c-photosynthesis',
      courseTitle: 'التمثيل الضوئي',
      fileName: 'ملخص_حلقة_كالفن_والمعادلات.docx',
      fileType: 'word',
      fileSize: '850 KB',
      uploadDate: '2026-02-20',
      downloadUrl: '#',
      description: 'مستند Word منسق للمراجعة السريعة وموازنة الذرات.',
      uploaderName: 'د. سامر الصالح'
    },
    {
      id: 'file-3',
      courseId: 'c-photosynthesis',
      courseTitle: 'التمثيل الضوئي',
      fileName: 'شرائح_عرض_تفاعلات_الضوء.pptx',
      fileType: 'ppt',
      fileSize: '12.5 MB',
      uploadDate: '2026-02-22',
      downloadUrl: '#',
      description: 'عرض بوربوينت بالرسوم المتحركة لمسار الإلكترونات في الثايلاكويد.',
      uploaderName: 'د. سامر الصالح'
    },
    {
      id: 'file-4',
      courseId: 'c-photosynthesis',
      courseTitle: 'التمثيل الضوئي',
      fileName: 'ورقة_عمل_بجروت_مسائل_حسابية.pdf',
      fileType: 'pdf',
      fileSize: '1.1 MB',
      uploadDate: '2026-02-25',
      downloadUrl: '#',
      description: 'بنك أسئلة وتطبيقات عملية مع نماذج الحل.',
      uploaderName: 'أكاديمية التفوق'
    }
  ];

  // Compute student stats
  const completedCoursesCount = enrolledCourses.filter(c => c.status === 'completed').length;
  const completedClassesCount = classSessions.filter(s => s.status === 'completed').length;
  const completedExamsCount = submissions.length;
  const avgGrade = completedExamsCount > 0 
    ? Math.round(submissions.reduce((acc, cur) => acc + cur.percentage, 0) / completedExamsCount)
    : 92;

  const passedCertificates = submissions.filter(s => s.passed);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-900 text-white rounded-3xl p-6 md:p-10 border border-emerald-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-xs font-bold flex items-center gap-1">
                <Sparkles size={13} />
                بوابة الطالب الأكاديمية
              </span>
              <span className="text-xs text-emerald-200">
                منصة إدراك • أكاديمية التفوق أون لاين
              </span>
            </div>
            <h1 className="text-2xl md:text-4xl font-black font-serif mb-2">
              مرحباً بك، {studentName || 'طالبنا المتميز'}! 🎓
            </h1>
            <p className="text-emerald-100/80 text-xs md:text-sm max-w-2xl leading-relaxed">
              تابع تقدمك في مساقات البجروت والعلوم، استعرض الحصص المباشرة والمسجلة، وتفاعل مع المساعد الذكي للحصول على أعلى الدرجات.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenAssistant}
              className="bg-amber-400 hover:bg-amber-500 text-emerald-950 font-black px-4 py-2.5 rounded-xl text-xs md:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <Sparkles size={16} />
              <span>المساعد الذكي (اسأل الآن)</span>
            </button>
            <button
              onClick={onOpenLessons}
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 rounded-xl text-xs md:text-sm border border-white/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <BookOpen size={16} />
              <span>متابعة مساق التمثيل الضوئي</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">المواد المسجلة</span>
            <BookOpen size={18} className="text-emerald-700" />
          </div>
          <div className="text-2xl font-black text-stone-900">{enrolledCourses.length} مواد</div>
          <span className="text-[11px] text-stone-400">منها {completedCoursesCount} مكتملة</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">الحصص المكتملة</span>
            <Video size={18} className="text-blue-600" />
          </div>
          <div className="text-2xl font-black text-stone-900">{completedClassesCount} حصة</div>
          <span className="text-[11px] text-stone-400">و 2 حصص قادمة</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">نسبة الإنجاز</span>
            <CheckCircle2 size={18} className="text-amber-600" />
          </div>
          <div className="text-2xl font-black text-stone-900">
            {Math.round(enrolledCourses.reduce((acc, c) => acc + c.progressPercent, 0) / enrolledCourses.length)}%
          </div>
          <span className="text-[11px] text-emerald-600 font-bold">أداء ممتاز مستمر</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">الاختبارات المنجزة</span>
            <FileText size={18} className="text-purple-600" />
          </div>
          <div className="text-2xl font-black text-stone-900">{completedExamsCount}</div>
          <span className="text-[11px] text-stone-400">{passedCertificates.length} شهادة مستحقة</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold">متوسط الدرجات (GPA)</span>
            <Award size={18} className="text-amber-500" />
          </div>
          <div className="text-2xl font-black text-emerald-800">{avgGrade}%</div>
          <span className="text-[11px] text-amber-700 font-bold">تقدير: ممتاز مرتفع</span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-stone-200 shadow-xs flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-emerald-950 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Layers size={15} />
          <span>لوحة المتابعة العامة</span>
        </button>

        <button
          onClick={() => setActiveTab('courses')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'courses'
              ? 'bg-emerald-950 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <BookOpen size={15} />
          <span>المواد الدراسية ({enrolledCourses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('classes')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'classes'
              ? 'bg-emerald-950 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Video size={15} />
          <span>الحصص التعليمية</span>
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'library'
              ? 'bg-emerald-950 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <FileText size={15} />
          <span>المكتبة التعليمية ({libraryFiles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('exams')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'exams'
              ? 'bg-emerald-950 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Award size={15} />
          <span>الاختبارات والشهادات</span>
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Course Progress Highlight */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200 shadow-sm">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-stone-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-black">
                  <GraduationCap size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                      المساق الأساسي
                    </span>
                    <span className="text-xs text-stone-400">كود: BIO-301</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-stone-900 font-serif">
                    {curriculum.title}
                  </h3>
                  <p className="text-xs text-stone-500">المعلم: د. سامر الصالح</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onOpenLessons}
                  className="bg-emerald-900 hover:bg-emerald-950 text-white font-bold px-4 py-2 rounded-xl text-xs md:text-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <BookOpen size={15} />
                  <span>متابعة الشرح</span>
                </button>
                <button
                  onClick={onOpenReview}
                  className="bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold px-4 py-2 rounded-xl text-xs md:text-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>تدريبات المراجعة</span>
                </button>
                <button
                  onClick={onOpenExam}
                  className="bg-amber-500 hover:bg-amber-600 text-emerald-950 font-black px-4 py-2 rounded-xl text-xs md:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                >
                  <Award size={15} />
                  <span>الاختبار النهائي</span>
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="pt-6 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-stone-700">نسبة التقدم الكلي في مساق التمثيل الضوئي</span>
                <span className="text-emerald-800">
                  {progress.examCompleted ? '100% (تم اجتياز المساق)' : `${progress.unitsRead.length} من ${curriculum.learningUnits.length} وحدات تمت دراستها`}
                </span>
              </div>
              <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-l from-emerald-600 to-teal-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.round((progress.unitsRead.length / Math.max(curriculum.learningUnits.length, 1)) * 100))}%`
                  }}
                />
              </div>
            </div>

            {/* Unit Quizzes Results & Firebase Tracking */}
            <div className="mt-6 pt-6 border-t border-stone-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                    <FileText size={16} />
                  </span>
                  <div>
                    <h4 className="text-sm font-black text-stone-900">
                      نتائج الاختبارات القصيرة للوحدات (Quizzes) • جدول Firebase
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      توثيق درجات الاختيار من متعدد لكل وحدة مباشرة في جدول <code>studentProgress</code>
                    </p>
                  </div>
                </div>
                <button
                  onClick={onOpenLessons}
                  className="text-xs font-black text-emerald-800 hover:text-emerald-950 flex items-center gap-1 underline cursor-pointer"
                >
                  <span>فتح قسم الشرح والاختبارات</span>
                  <ArrowLeft size={13} />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {curriculum.learningUnits.map((unit) => {
                  const quizRes = progress.unitQuizResults?.[unit.id];
                  return (
                    <div 
                      key={unit.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        quizRes 
                          ? quizRes.passed
                            ? 'bg-emerald-50/60 border-emerald-200 shadow-2xs'
                            : 'bg-amber-50/60 border-amber-200 shadow-2xs'
                          : 'bg-stone-50/70 border-stone-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-stone-500 text-[10px]">
                          الوحدة {unit.unitNumber}
                        </span>
                        {quizRes ? (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            quizRes.passed 
                              ? 'bg-emerald-200/60 text-emerald-900' 
                              : 'bg-amber-200/60 text-amber-900'
                          }`}>
                            {quizRes.quizScore}/{quizRes.quizTotal} ({quizRes.quizPercentage}%)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-200/70 text-stone-600">
                            لم يُقدّم بعد
                          </span>
                        )}
                      </div>

                      <h5 className="text-xs font-black text-stone-900 truncate mb-2" title={unit.title}>
                        {unit.title}
                      </h5>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-stone-200/60">
                        {quizRes ? (
                          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1 truncate">
                            <span>☁️ Firebase: {quizRes.id}</span>
                          </span>
                        ) : (
                          <button
                            onClick={onOpenLessons}
                            className="text-[10px] text-stone-600 hover:text-emerald-800 font-bold flex items-center gap-1"
                          >
                            <span>بدء الاختبار</span>
                            <ArrowLeft size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Grid: Upcoming Classes & Quick Library Access */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Sessions */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h4 className="font-extrabold text-stone-900 flex items-center gap-2 text-sm md:text-base">
                  <Calendar size={18} className="text-emerald-700" />
                  <span>الحصص الدراسية القادمة والمسجلة</span>
                </h4>
                <button 
                  onClick={() => setActiveTab('classes')}
                  className="text-xs text-emerald-700 font-bold hover:underline"
                >
                  عرض الكل
                </button>
              </div>

              <div className="space-y-3">
                {classSessions.map((sess) => (
                  <div key={sess.id} className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          sess.status === 'upcoming' ? 'bg-amber-100 text-amber-900' : 'bg-stone-200 text-stone-700'
                        }`}>
                          {sess.status === 'upcoming' ? 'قادمة' : 'مسجلة'}
                        </span>
                        <span className="text-xs text-stone-500">{sess.date} • {sess.time}</span>
                      </div>
                      <h5 className="text-xs md:text-sm font-bold text-stone-800">{sess.title}</h5>
                      <p className="text-[11px] text-stone-500">{sess.notes}</p>
                    </div>

                    {sess.meetingLink ? (
                      <a
                        href={sess.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
                      >
                        <Video size={13} />
                        <span>انضمام</span>
                      </a>
                    ) : (
                      <a
                        href={sess.recordingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
                      >
                        <PlayCircle size={13} />
                        <span>مشاهدة</span>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Files */}
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h4 className="font-extrabold text-stone-900 flex items-center gap-2 text-sm md:text-base">
                  <FileText size={18} className="text-amber-600" />
                  <span>المكتبة التعليمية وأوراق العمل</span>
                </h4>
                <button 
                  onClick={() => setActiveTab('library')}
                  className="text-xs text-emerald-700 font-bold hover:underline"
                >
                  عرض الكل ({libraryFiles.length})
                </button>
              </div>

              <div className="space-y-2.5">
                {libraryFiles.slice(0, 3).map((f) => (
                  <div key={f.id} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-black text-xs">
                        {f.fileType.toUpperCase()}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-stone-800 block truncate max-w-[200px] sm:max-w-xs">
                          {f.fileName}
                        </span>
                        <span className="text-[10px] text-stone-400">{f.fileSize} • {f.uploadDate}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => alert(`جاري تنزيل الملف: ${f.fileName}`)}
                      className="text-emerald-800 hover:text-emerald-950 p-2 rounded-lg hover:bg-stone-200 transition-colors"
                      title="تنزيل الملف"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Enrolled Courses */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrolledCourses.map((c) => (
              <div key={c.id} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm flex flex-col justify-between space-y-4 hover:border-emerald-500 transition-colors">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-lg">
                      {c.subject} • {c.code}
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                      c.status === 'completed' ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-700'
                    }`}>
                      {c.status === 'completed' ? 'مكتمل ✅' : 'قيد الدراسة'}
                    </span>
                  </div>

                  <h4 className="text-lg font-extrabold text-stone-900 font-serif">
                    {c.title}
                  </h4>
                  <p className="text-xs text-stone-500 line-clamp-2">
                    {c.description}
                  </p>
                  <p className="text-xs text-stone-600 font-medium">
                    المعلم: {c.teacherName}
                  </p>

                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between text-[11px] font-bold text-stone-500">
                      <span>التقدم الدراسي</span>
                      <span className="text-emerald-800">{c.progressPercent}%</span>
                    </div>
                    <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-700 rounded-full"
                        style={{ width: `${c.progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs text-stone-400">{c.totalLessons} دروس</span>
                  <button
                    onClick={onOpenLessons}
                    className="bg-emerald-900 hover:bg-emerald-950 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <span>دخول المساق</span>
                    <ArrowLeft size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Classes & Sessions */}
      {activeTab === 'classes' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-stone-900 font-serif">
                جدول الحصص والتسجيلات المباشرة
              </h3>
              <p className="text-xs text-stone-500">
                يمكنك الانضمام للبث المباشر مع معلم المادة أو مشاهدة الحصص السابقة في أي وقت.
              </p>
            </div>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-900 px-3 py-1 rounded-xl">
              منهاج معتمد
            </span>
          </div>

          <div className="space-y-3">
            {classSessions.map((sess) => (
              <div key={sess.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-800">{sess.courseTitle}</span>
                    <span className="text-stone-300">•</span>
                    <span className="text-xs text-stone-500">{sess.date} ({sess.time})</span>
                  </div>
                  <h4 className="text-sm md:text-base font-bold text-stone-900">{sess.title}</h4>
                  <p className="text-xs text-stone-600">{sess.notes}</p>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  {sess.meetingLink && (
                    <a
                      href={sess.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-emerald-900 hover:bg-emerald-950 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                    >
                      <Video size={15} />
                      <span>انضمام مباشر (Google Meet)</span>
                    </a>
                  )}
                  {sess.recordingUrl && (
                    <a
                      href={sess.recordingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
                    >
                      <PlayCircle size={15} />
                      <span>مشاهدة التسجيل</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Library */}
      {activeTab === 'library' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-stone-900 font-serif">
                المكتبة التعليمية الرقمية
              </h3>
              <p className="text-xs text-stone-500">
                جميع المراجع، الكتب المدرسية، ملخصات Word، عروض البوربوينت، وأوراق العمل.
              </p>
            </div>
            <span className="text-xs font-bold bg-amber-100 text-amber-900 px-3 py-1 rounded-xl">
              تنزيل مجاني ومتاح
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {libraryFiles.map((f) => (
              <div key={f.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-900 text-amber-400 flex items-center justify-center font-black text-xs shrink-0">
                    {f.fileType.toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs md:text-sm font-bold text-stone-900">{f.fileName}</h5>
                    <p className="text-[11px] text-stone-500">{f.description}</p>
                    <div className="text-[10px] text-stone-400">
                      الحجم: {f.fileSize} • تاريخ الرفع: {f.uploadDate} • بواسطة: {f.uploaderName}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => alert(`جاري تنزيل الملف المعتمد: ${f.fileName}`)}
                  className="bg-white hover:bg-stone-100 text-emerald-900 border border-stone-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all shrink-0 cursor-pointer shadow-2xs"
                >
                  <Download size={14} />
                  <span>تنزيل</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Exams & Certificates */}
      {activeTab === 'exams' && (
        <div className="space-y-6">
          {/* Available Exams */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200 shadow-sm space-y-4">
            <h4 className="font-extrabold text-stone-900 font-serif text-base md:text-lg">
              الاختبارات الرسمية المتاحة
            </h4>

            <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-emerald-900 bg-emerald-200/60 px-2 py-0.5 rounded">
                    اختبار نهائي شامل
                  </span>
                  <span className="text-xs text-stone-500">المدة: 20 دقيقة • {curriculum.examQuestions.length} أسئلة</span>
                </div>
                <h5 className="text-base font-bold text-emerald-950">
                  الاختبار النهائي لمساق {curriculum.title}
                </h5>
                <p className="text-xs text-emerald-900/80">
                  يتطلب إدخال الاسم والبريد، تصحيح آلي فوري، وتصدر الشهادة مباشرة عند تحقيق 80% فأكثر.
                </p>
              </div>

              <button
                onClick={onOpenExam}
                className="bg-amber-500 hover:bg-amber-600 text-emerald-950 font-black px-6 py-3 rounded-xl text-xs md:text-sm flex items-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
              >
                <Award size={16} />
                <span>بدء الاختبار النهائي الآن</span>
              </button>
            </div>
          </div>

          {/* Past Submissions and Certificates */}
          <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200 shadow-sm space-y-4">
            <h4 className="font-extrabold text-stone-900 font-serif text-base md:text-lg">
              سجل النتائج والشهادات المكتسبة
            </h4>

            {submissions.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-500 space-y-2">
                <Award size={36} className="mx-auto text-stone-300" />
                <p className="text-sm font-bold">لم تقم بإجراء الاختبار النهائي بعد.</p>
                <p className="text-xs">
                  أكمل دراسة الوحدات التعليمية ومراجعة الأسئلة، ثم تقدم للاختبار للحصول على شهادتك المعتمدة!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((sub) => (
                  <div key={sub.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-800">{sub.studentName}</span>
                        <span className="text-xs text-stone-400">• {sub.date}</span>
                      </div>
                      <h5 className="text-sm font-bold text-stone-900">
                        النتيجة: {sub.score} من {sub.totalPoints} ({sub.percentage}%)
                      </h5>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full inline-block ${
                        sub.passed ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
                      }`}>
                        {sub.passed ? 'ناجح ومتفوق (مؤهل للشهادة)' : 'يحتاج إعادة محاولة لتحقيق 80%'}
                      </span>
                    </div>

                    {sub.passed && (
                      <button
                        onClick={() => onOpenCertificate(sub)}
                        className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                      >
                        <Award size={15} className="text-amber-400" />
                        <span>عرض وتحميل الشهادة (QR + ختم)</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
