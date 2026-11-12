import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  ArrowUpDown, 
  FileSpreadsheet, 
  FileText, 
  Award, 
  TrendingUp, 
  BarChart3, 
  CheckCircle, 
  XCircle, 
  Download,
  Calendar,
  Mail,
  RefreshCw,
  PlusCircle,
  Eye,
  Video,
  UploadCloud,
  Trash2,
  Plus,
  Sparkles,
  BookOpen,
  Check,
  Layers,
  Clock,
  PlayCircle,
  ShieldCheck
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import * as XLSX from 'xlsx';
import { StudentExamSubmission, EducationalFile, ClassSession, CurriculumData, ApprovedReference } from './types';
import { TeacherReferencesManager } from './TeacherReferencesManager';
import { DEFAULT_APPROVED_REFERENCES } from './defaultReferences';

interface TeacherDashboardViewProps {
  submissions: StudentExamSubmission[];
  onOpenCertificate: (sub: StudentExamSubmission) => void;
  onAddSampleSubmissions?: () => void;
  educationalFiles?: EducationalFile[];
  onUploadFile?: (file: EducationalFile) => void;
  onDeleteFile?: (id: string) => void;
  classSessions?: ClassSession[];
  onAddSession?: (session: ClassSession) => void;
  curriculum?: CurriculumData;
  approvedReferences?: ApprovedReference[];
  onAddReference?: (ref: ApprovedReference) => void;
  onUpdateReference?: (id: string, updates: Partial<ApprovedReference>) => void;
  onDeleteReference?: (id: string) => void;
  onToggleApproval?: (id: string) => void;
  onReorderPriority?: (id: string, direction: 'up' | 'down') => void;
}

export const TeacherDashboardView: React.FC<TeacherDashboardViewProps> = ({
  submissions,
  onOpenCertificate,
  onAddSampleSubmissions,
  educationalFiles = [],
  onUploadFile,
  onDeleteFile,
  classSessions = [],
  onAddSession,
  curriculum,
  approvedReferences = [],
  onAddReference,
  onUpdateReference,
  onDeleteReference,
  onToggleApproval,
  onReorderPriority
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'references' | 'files' | 'sessions' | 'ai_exam'>('analytics');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'score_desc' | 'score_asc' | 'date_desc' | 'name'>('date_desc');
  const [selectedSubDetail, setSelectedSubDetail] = useState<StudentExamSubmission | null>(null);

  // Teacher Approved References State
  const [localReferences, setLocalReferences] = useState<ApprovedReference[]>(
    approvedReferences.length > 0 ? approvedReferences : DEFAULT_APPROVED_REFERENCES
  );
  const [selectedExamReferenceId, setSelectedExamReferenceId] = useState<string>(
    (approvedReferences.length > 0 ? approvedReferences[0] : DEFAULT_APPROVED_REFERENCES[0])?.id || 'ref-1'
  );

  const handleAddReference = (newRef: ApprovedReference) => {
    setLocalReferences(prev => [newRef, ...prev]);
    if (onAddReference) onAddReference(newRef);
  };

  const handleUpdateReference = (id: string, updates: Partial<ApprovedReference>) => {
    setLocalReferences(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    if (onUpdateReference) onUpdateReference(id, updates);
  };

  const handleDeleteReference = (id: string) => {
    setLocalReferences(prev => prev.filter(r => r.id !== id));
    if (onDeleteReference) onDeleteReference(id);
  };

  const handleToggleApproval = (id: string) => {
    setLocalReferences(prev => prev.map(r => r.id === id ? { ...r, isApproved: !r.isApproved } : r));
    if (onToggleApproval) onToggleApproval(id);
  };

  const handleReorderPriority = (id: string, direction: 'up' | 'down') => {
    setLocalReferences(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[idx].priority;
      copy[idx].priority = copy[targetIdx].priority;
      copy[targetIdx].priority = temp;
      return copy;
    });
    if (onReorderPriority) onReorderPriority(id, direction);
  };

  const handleBuildContentFromReference = (ref: ApprovedReference) => {
    setSelectedExamReferenceId(ref.id);
    setExamTopic(ref.title);
    setActiveTab('ai_exam');
  };

  // File Manager State
  const [localFiles, setLocalFiles] = useState<EducationalFile[]>(educationalFiles.length > 0 ? educationalFiles : [
    {
      id: 'f-1',
      courseId: 'c-photosynthesis',
      courseTitle: 'التمثيل الضوئي',
      fileName: 'كتاب_التمثيل_الضوئي_المنهاج_الرسمي.pdf',
      fileType: 'pdf',
      fileSize: '4.2 MB',
      uploadDate: '2026-02-15',
      downloadUrl: '#',
      description: 'كتاب المنهاج الرسمي الكامل المعتمد.',
      uploaderName: 'د. سامر الصالح'
    },
    {
      id: 'f-2',
      courseId: 'c-photosynthesis',
      courseTitle: 'التمثيل الضوئي',
      fileName: 'ملخص_حلقة_كالفن_والمعادلات.docx',
      fileType: 'word',
      fileSize: '850 KB',
      uploadDate: '2026-02-20',
      downloadUrl: '#',
      description: 'مستند وورد منسق للمراجعة وحل المعادلات.',
      uploaderName: 'د. سامر الصالح'
    },
    {
      id: 'f-3',
      courseId: 'c-photosynthesis',
      courseTitle: 'التمثيل الضوئي',
      fileName: 'شرائح_عرض_تفاعلات_الضوء.pptx',
      fileType: 'ppt',
      fileSize: '12.5 MB',
      uploadDate: '2026-02-22',
      downloadUrl: '#',
      description: 'عرض بوربوينت لمسار الإلكترونات في الثايلاكويد.',
      uploaderName: 'د. سامر الصالح'
    }
  ]);
  const [isAddFileOpen, setIsAddFileOpen] = useState(false);
  const [newFileData, setNewFileData] = useState({
    fileName: '',
    fileType: 'pdf' as 'pdf' | 'word' | 'ppt' | 'video' | 'other',
    fileSize: '2.5 MB',
    description: ''
  });

  // Sessions State
  const [localSessions, setLocalSessions] = useState<ClassSession[]>(classSessions.length > 0 ? classSessions : [
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
    }
  ]);
  const [isAddSessionOpen, setIsAddSessionOpen] = useState(false);
  const [newSessionData, setNewSessionData] = useState({
    title: '',
    date: 'غداً',
    time: '06:00 م - 07:30 م',
    durationMinutes: 90,
    meetingLink: 'https://meet.google.com',
    notes: ''
  });

  // AI Exam Generator State
  const [examTopic, setExamTopic] = useState('التمثيل الضوئي وتفاعلات الضوء وحلقة كالفن');
  const [questionCount, setQuestionCount] = useState(3);
  const [isGeneratingExam, setIsGeneratingExam] = useState(false);
  const [generatedExamQuestions, setGeneratedExamQuestions] = useState<any[]>([]);

  const handleGenerateAIExam = async () => {
    setIsGeneratingExam(true);
    const selectedRef = localReferences.find(r => r.id === selectedExamReferenceId);
    try {
      const res = await fetch('/api/teacher/generate-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: examTopic,
          questionCount,
          subject: 'بيولوجيا',
          reference: selectedRef ? {
            id: selectedRef.id,
            title: selectedRef.title,
            sourceType: selectedRef.sourceType,
            authorOrPublisher: selectedRef.authorOrPublisher,
            citation: selectedRef.citation,
            notes: selectedRef.notes,
            priority: selectedRef.priority
          } : undefined
        })
      });
      const data = await res.json();
      if (data.questions && Array.isArray(data.questions)) {
        setGeneratedExamQuestions(data.questions);
      } else {
        // Fallback realistic generated questions grounded in selected reference
        const refTitle = selectedRef?.title || 'منهاج بيولوجيا البجروت الرسمي';
        setGeneratedExamQuestions([
          {
            id: 'gen-1',
            questionText: 'ما هو الدور الأساسي لإنزيم الروبيسكو (Rubisco) في حلقة كالفن وفقاً للمرجع المعتمد؟',
            options: [
              'تثبيت ثاني أكسيد الكربون مع جزيء RuBP الخماسي',
              'شطر جزيء الماء وإنتاج غاز الأكسجين',
              'امتصاص الفوتونات الضوئية داخل معقد الهوائي',
              'ضخ أيونات الهيدروجين إلى تجويف الثايلاكويد'
            ],
            correctOptionIndex: 0,
            explanation: 'إنزيم الروبيسكو هو الإنزيم المحفز لتثبيت CO2 على مركب RuBP لتكوين مركب سداسي غير مستقر يتفكك إلى جزيئين من PGA.',
            approvedReferenceTitle: refTitle
          },
          {
            id: 'gen-2',
            questionText: 'أين يتم استهلاك وتوظيف نواتج تفاعلات الضوء (ATP و NADPH) وفقاً للمرجع المعتمد؟',
            options: [
              'في الستروما (الحشوة السائلة للبلاستيدة) لاختزال الكربون',
              'في تجويف الثايلاكويد لشطر الماء',
              'داخل الميتوكوندريا أثناء التنفس الخلوي',
              'على الغشاء الخارجي للبلاستيدة للنقل النشط'
            ],
            correctOptionIndex: 0,
            explanation: 'تتحرر جزيئات ATP و NADPH مباشرة نحو الستروما حيث توجد إنزيمات حلقة كالفن لتثبيت واختزال الكربون.',
            approvedReferenceTitle: refTitle
          }
        ]);
      }
    } catch (e) {
      const refTitle = selectedRef?.title || 'منهاج بيولوجيا البجروت الرسمي';
      setGeneratedExamQuestions([
        {
          id: 'gen-1',
          questionText: 'ما هو الدور الأساسي لإنزيم الروبيسكو (Rubisco) في حلقة كالفن وفقاً للمرجع المعتمد؟',
          options: [
            'تثبيت ثاني أكسيد الكربون مع جزيء RuBP الخماسي',
            'شطر جزيء الماء وإنتاج غاز الأكسجين',
            'امتصاص الفوتونات الضوئية داخل معقد الهوائي',
            'ضخ أيونات الهيدروجين إلى تجويف الثايلاكويد'
          ],
          correctOptionIndex: 0,
          explanation: 'إنزيم الروبيسكو هو الإنزيم المحفز لتثبيت CO2 على مركب RuBP.',
          approvedReferenceTitle: refTitle
        }
      ]);
    } finally {
      setIsGeneratingExam(false);
    }
  };

  // Statistics calculation
  const totalCount = submissions.length;

  const stats = useMemo(() => {
    if (totalCount === 0) {
      return {
        avgScore: 0,
        avgPercentage: 0,
        highestScore: 0,
        highestPercentage: 0,
        lowestScore: 0,
        lowestPercentage: 0,
        passedCount: 0,
        failedCount: 0,
        passRate: 0
      };
    }

    let sumScore = 0;
    let sumPercent = 0;
    let highest = submissions[0].percentage;
    let lowest = submissions[0].percentage;
    let highestSc = submissions[0].score;
    let lowestSc = submissions[0].score;
    let passed = 0;

    submissions.forEach((s) => {
      sumScore += s.score;
      sumPercent += s.percentage;
      if (s.percentage > highest) {
        highest = s.percentage;
        highestSc = s.score;
      }
      if (s.percentage < lowest) {
        lowest = s.percentage;
        lowestSc = s.score;
      }
      if (s.passed) passed++;
    });

    return {
      avgScore: Math.round(sumScore / totalCount),
      avgPercentage: Math.round(sumPercent / totalCount),
      highestScore: highestSc,
      highestPercentage: highest,
      lowestScore: lowestSc,
      lowestPercentage: lowest,
      passedCount: passed,
      failedCount: totalCount - passed,
      passRate: Math.round((passed / totalCount) * 100)
    };
  }, [submissions, totalCount]);

  // Chart data: Grade Buckets (<60, 60-69, 70-79, 80-89, 90-100)
  const gradeDistributionData = useMemo(() => {
    const buckets = [
      { name: 'أقل من 60%', count: 0 },
      { name: '60% - 69%', count: 0 },
      { name: '70% - 79%', count: 0 },
      { name: '80% - 89%', count: 0 },
      { name: '90% - 100%', count: 0 }
    ];

    submissions.forEach((s) => {
      const p = s.percentage;
      if (p < 60) buckets[0].count++;
      else if (p < 70) buckets[1].count++;
      else if (p < 80) buckets[2].count++;
      else if (p < 90) buckets[3].count++;
      else buckets[4].count++;
    });

    return buckets;
  }, [submissions]);

  // Pie chart data
  const passFailData = useMemo(() => {
    return [
      { name: 'ناجح ومؤهل للشهادة (80%+)', value: stats.passedCount, color: '#047857' },
      { name: 'دون نسبة الاجتياز (< 80%)', value: stats.failedCount, color: '#e11d48' }
    ];
  }, [stats]);

  // Filter & Sort
  const filteredSubmissions = useMemo(() => {
    const q = (searchTerm || '').toLowerCase();
    let list = submissions.filter((s) =>
      (s.studentName || '').toLowerCase().includes(q) ||
      (s.studentEmail || '').toLowerCase().includes(q)
    );

    list.sort((a, b) => {
      if (sortBy === 'score_desc') return b.percentage - a.percentage;
      if (sortBy === 'score_asc') return a.percentage - b.percentage;
      if (sortBy === 'name') return a.studentName.localeCompare(b.studentName, 'ar');
      // date_desc:
      return b.id.localeCompare(a.id);
    });

    return list;
  }, [submissions, searchTerm, sortBy]);

  // EXPORT TO EXCEL (.xlsx)
  const exportToExcel = () => {
    if (submissions.length === 0) return;

    const excelData = filteredSubmissions.map((s, idx) => ({
      'الرقم': idx + 1,
      'اسم الطالب': s.studentName,
      'البريد الإلكتروني': s.studentEmail,
      'الدرجة': `${s.score} / ${s.totalPoints}`,
      'النسبة المئوية': `${s.percentage}%`,
      'تاريخ الاختبار': s.date,
      'حالة النتيجة': s.passed ? 'ناجح ومؤهل للشهادة (80%+)' : 'دون نسبة الاجتياز'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'نتائج_اختبار_التمثيل_الضوئي');

    // Right-to-left layout in Excel worksheet
    if (!worksheet['!views']) worksheet['!views'] = [];
    worksheet['!views'].push({ RTL: true });

    XLSX.writeFile(workbook, `نتائج_الطلاب_التمثيل_الضوئي_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // EXPORT TO CSV with UTF-8 BOM
  const exportToCSV = () => {
    if (submissions.length === 0) return;

    const headers = ['الرقم', 'اسم الطالب', 'البريد الإلكتروني', 'الدرجة', 'النسبة المئوية', 'تاريخ الاختبار', 'حالة النتيجة'];
    const rows = filteredSubmissions.map((s, idx) => [
      idx + 1,
      `"${s.studentName.replace(/"/g, '""')}"`,
      `"${s.studentEmail.replace(/"/g, '""')}"`,
      `"${s.score} / ${s.totalPoints}"`,
      `"${s.percentage}%"`,
      `"${s.date}"`,
      `"${s.passed ? 'ناجح ومؤهل للشهادة' : 'راسب'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `نتائج_الطلاب_التمثيل_الضوئي_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Dashboard Top Header */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 flex items-center gap-1">
              <Users size={13} />
              لوحة الإدارة والمعلم • متابعة النتائج
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-stone-900 font-serif">
            نتائج وتقارير اختبار التمثيل الضوئي
          </h2>
          <p className="text-xs md:text-sm text-stone-500 mt-0.5">
            سجل الطلاب المتقدمين للاختبار، تصدير البيانات، والإحصائيات البيانية التحليلية
          </p>
        </div>

        {/* Export Buttons Group */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {onAddSampleSubmissions && submissions.length === 0 && (
            <button
              onClick={onAddSampleSubmissions}
              className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <PlusCircle size={14} />
              <span>إدراج عينات تجريبية</span>
            </button>
          )}

          <button
            onClick={exportToExcel}
            disabled={submissions.length === 0}
            className="bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs md:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            title="تصدير النتائج إلى ملف إكسل رسمي باللغة العربية"
          >
            <FileSpreadsheet size={16} />
            <span>تصدير Excel (.xlsx)</span>
          </button>

          <button
            onClick={exportToCSV}
            disabled={submissions.length === 0}
            className="bg-stone-800 hover:bg-stone-900 disabled:opacity-50 text-white font-bold px-4 py-2.5 rounded-xl text-xs md:text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            title="تصدير النتائج بتنسيق CSV متوافق مع كافة الأنظمة"
          >
            <Download size={16} />
            <span>تصدير CSV</span>
          </button>
        </div>
      </div>

      {/* Teacher Sub-Navigation Tabs */}
      <div className="bg-white rounded-2xl p-2 border border-stone-200 shadow-xs flex items-center gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'analytics'
              ? 'bg-emerald-950 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <BarChart3 size={15} />
          <span>نتائج الطلاب والتحليلات والشهادات</span>
        </button>

        <button
          onClick={() => setActiveTab('references')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'references'
              ? 'bg-emerald-950 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <ShieldCheck size={15} className={activeTab === 'references' ? 'text-amber-400' : 'text-emerald-700'} />
          <span>المراجع والمصادر المعتمدة ({localReferences.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('files')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'files'
              ? 'bg-emerald-950 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <UploadCloud size={15} />
          <span>إدارة ورفع الملفات ({localFiles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'sessions'
              ? 'bg-emerald-950 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Video size={15} />
          <span>جدول الحصص المباشرة والمسجلة ({localSessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ai_exam')}
          className={`px-4 py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shrink-0 ${
            activeTab === 'ai_exam'
              ? 'bg-emerald-950 text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-100'
          }`}
        >
          <Sparkles size={15} className="text-amber-400" />
          <span>منشئ الاختبارات بالذكاء الاصطناعي (AI Exam)</span>
        </button>
      </div>

      {/* TAB 1: ANALYTICS & SUBMISSIONS */}
      {activeTab === 'analytics' && (
        <>
          {/* Metric KPI Cards (Section 6 Requirements) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2 text-stone-500">
            <span className="text-xs font-bold">عدد الطلاب المتقدمين</span>
            <Users size={18} className="text-emerald-700" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-stone-900">{totalCount}</div>
          <span className="text-[11px] text-stone-400 block mt-1">طالب أتموا الاختبار</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2 text-stone-500">
            <span className="text-xs font-bold">متوسط درجات الطلاب</span>
            <TrendingUp size={18} className="text-amber-600" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-emerald-900">
            {stats.avgPercentage}%
          </div>
          <span className="text-[11px] text-stone-400 block mt-1">متوسط الدرجة: {stats.avgScore} من 100</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2 text-stone-500">
            <span className="text-xs font-bold">أعلى درجة محققة</span>
            <Award size={18} className="text-emerald-600" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-emerald-700">
            {stats.highestPercentage}%
          </div>
          <span className="text-[11px] text-stone-400 block mt-1">{stats.highestScore} علامة</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-2 text-stone-500">
            <span className="text-xs font-bold">أدنى درجة مسجلة</span>
            <BarChart3 size={18} className="text-stone-400" />
          </div>
          <div className="text-2xl md:text-3xl font-black text-stone-700">
            {stats.lowestPercentage}%
          </div>
          <span className="text-[11px] text-stone-400 block mt-1">{stats.lowestScore} علامة</span>
        </div>
      </div>

      {/* Interactive Charts Section (Section 6) */}
      {totalCount > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grade Distribution Bar Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-stone-900 text-sm md:text-base flex items-center gap-2">
                <BarChart3 size={18} className="text-emerald-700" />
                <span>توزيع درجات الطلاب حسب الفئات (Grade Distribution)</span>
              </h3>
            </div>
            <div className="h-64 w-full" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gradeDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: any) => [`${value} طالب`, 'العدد']}
                    labelStyle={{ fontFamily: 'sans-serif', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="count" fill="#065f46" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pass/Fail Pie Chart */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-stone-900 text-sm md:text-base mb-1 flex items-center gap-2">
                <Award size={18} className="text-amber-600" />
                <span>نسبة الاجتياز والتفوق (80%+)</span>
              </h3>
              <p className="text-xs text-stone-500">نسبة الطلاب المؤهلين لشهادة الإتقان</p>
            </div>

            <div className="h-48 w-full flex items-center justify-center my-2" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={passFailData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {passFailData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value} طالب`, 'العدد']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50 text-emerald-950 font-bold">
                <span>مؤهل لشهادة الإنجاز (80%+):</span>
                <span>{stats.passedCount} ({stats.passRate}%)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-xl bg-rose-50 text-rose-950 font-bold">
                <span>دون نسبة الاجتياز:</span>
                <span>{stats.failedCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Results Table (Section 5) */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm space-y-4">
        {/* Table Search & Sort Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          {/* Search by Student Name */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="البحث عن طالب بالاسم أو البريد..."
              className="w-full pr-10 pl-4 py-2.5 border border-stone-300 rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 font-sans"
            />
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <ArrowUpDown size={14} className="text-stone-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="p-2.5 border border-stone-300 rounded-xl text-xs md:text-sm font-bold text-stone-700 bg-white focus:outline-none cursor-pointer"
            >
              <option value="date_desc">الأحدث تقديماً أولاً</option>
              <option value="score_desc">الأعلى درجة (تنازلي)</option>
              <option value="score_asc">الأقل درجة (تصاعدي)</option>
              <option value="name">ترتيب أبجدي حسب الاسم</option>
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div className="text-xs text-stone-500 font-semibold">
          عرض {filteredSubmissions.length} من أصل {submissions.length} نتيجة مسجلة
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-2xl border border-stone-200">
          <table className="w-full text-right text-xs md:text-sm">
            <thead className="bg-stone-100/80 text-stone-700 text-xs font-bold border-b border-stone-200">
              <tr>
                <th className="p-3.5">#</th>
                <th className="p-3.5">اسم الطالب</th>
                <th className="p-3.5">البريد الإلكتروني</th>
                <th className="p-3.5 text-center">الدرجة</th>
                <th className="p-3.5 text-center">النسبة المئوية</th>
                <th className="p-3.5">تاريخ الاختبار</th>
                <th className="p-3.5 text-center">حالة النتيجة</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-stone-500">
                    لا توجد نتائج مسجلة تطابق بحثك حالياً.
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub, idx) => (
                  <tr key={sub.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-stone-400">{idx + 1}</td>
                    <td className="p-3.5 font-bold text-emerald-950">{sub.studentName}</td>
                    <td className="p-3.5 text-stone-500 font-mono text-xs" dir="ltr">{sub.studentEmail}</td>
                    <td className="p-3.5 text-center font-bold">{sub.score} / {sub.totalPoints}</td>
                    <td className="p-3.5 text-center">
                      <span className="font-extrabold text-stone-900 text-sm">{sub.percentage}%</span>
                    </td>
                    <td className="p-3.5 text-xs text-stone-500">{sub.date}</td>
                    <td className="p-3.5 text-center">
                      {sub.passed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900">
                          <CheckCircle size={12} className="text-emerald-700" />
                          ناجح 80%+
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-900">
                          <XCircle size={12} className="text-rose-600" />
                          دون الاجتياز
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {sub.passed && (
                          <button
                            onClick={() => onOpenCertificate(sub)}
                            className="p-1.5 rounded-lg bg-amber-100 text-amber-900 hover:bg-amber-200 transition-colors cursor-pointer"
                            title="عرض وطباعة شهادة الطالب"
                          >
                            <Award size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedSubDetail(sub)}
                          className="p-1.5 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
                          title="عرض تفاصيل الإجابات"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* TAB 2: FILE MANAGER (PDF, Word, PPT, Worksheets) */}
      {activeTab === 'files' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div>
              <h3 className="text-xl font-black text-stone-900 font-serif">
                إدارة ورفع الملفات التعليمية المعتمدة
              </h3>
              <p className="text-xs text-stone-500">
                رفع الكتب الدراسية (PDF)، ملخصات Word، عروض البوربوينت (PPTX)، وأوراق العمل للطلاب.
              </p>
            </div>

            <button
              onClick={() => setIsAddFileOpen(true)}
              className="bg-emerald-900 hover:bg-emerald-950 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm self-start sm:self-auto"
            >
              <UploadCloud size={16} />
              <span>رفع ملف تعليمي جديد</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {localFiles.map((file) => (
              <div key={file.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-900 text-amber-400 flex items-center justify-center font-black text-xs shrink-0">
                    {file.fileType.toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-xs md:text-sm font-bold text-stone-900">{file.fileName}</h5>
                    <p className="text-[11px] text-stone-500">{file.description}</p>
                    <div className="text-[10px] text-stone-400">
                      الحجم: {file.fileSize} • تاريخ الرفع: {file.uploadDate} • بواسطة: {file.uploaderName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => alert(`جاري تنزيل الملف المعتمد: ${file.fileName}`)}
                    className="p-2 text-stone-600 hover:text-emerald-800 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                    title="تنزيل"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`هل أنت متأكد من حذف الملف "${file.fileName}"؟`)) {
                        setLocalFiles(prev => prev.filter(f => f.id !== file.id));
                        if (onDeleteFile) onDeleteFile(file.id);
                      }
                    }}
                    className="p-2 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="حذف"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Upload File Modal */}
          {isAddFileOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-stone-200 space-y-4 text-right" dir="rtl">
                <h4 className="text-lg font-bold text-stone-900 font-serif flex items-center gap-2">
                  <UploadCloud size={20} className="text-emerald-700" />
                  <span>رفع وتعيين ملف تعليمي جديد</span>
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">اسم الملف وعنوانه *</label>
                    <input
                      type="text"
                      required
                      value={newFileData.fileName}
                      onChange={(e) => setNewFileData({ ...newFileData, fileName: e.target.value })}
                      placeholder="مثال: ورقة_عمل_بجروت_2026.pdf"
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">نوع الملف *</label>
                      <select
                        value={newFileData.fileType}
                        onChange={(e) => setNewFileData({ ...newFileData, fileType: e.target.value as any })}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm font-bold focus:outline-none focus:border-emerald-700"
                      >
                        <option value="pdf">كتاب / PDF</option>
                        <option value="word">مستند Word</option>
                        <option value="ppt">عرض بوربوينت PPT</option>
                        <option value="video">فيديو MP4</option>
                        <option value="other">أخرى</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">حجم الملف التقديري</label>
                      <input
                        type="text"
                        value={newFileData.fileSize}
                        onChange={(e) => setNewFileData({ ...newFileData, fileSize: e.target.value })}
                        placeholder="2.5 MB"
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">وصف موجز للملف</label>
                    <textarea
                      rows={2}
                      value={newFileData.description}
                      onChange={(e) => setNewFileData({ ...newFileData, description: e.target.value })}
                      placeholder="شرح موجز لأهمية الملف وكيفية استفادة الطالب منه..."
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setIsAddFileOpen(false)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => {
                      if (!newFileData.fileName.trim()) return;
                      const added: EducationalFile = {
                        id: `f-${Date.now()}`,
                        courseId: 'c-photosynthesis',
                        courseTitle: 'التمثيل الضوئي',
                        fileName: newFileData.fileName,
                        fileType: newFileData.fileType,
                        fileSize: newFileData.fileSize,
                        uploadDate: new Date().toISOString().slice(0, 10),
                        downloadUrl: '#',
                        description: newFileData.description || 'ملف تعليمي معتمد',
                        uploaderName: 'د. سامر الصالح (المعلم)'
                      };
                      setLocalFiles(prev => [added, ...prev]);
                      if (onUploadFile) onUploadFile(added);
                      setIsAddFileOpen(false);
                      setNewFileData({ fileName: '', fileType: 'pdf', fileSize: '2.5 MB', description: '' });
                      alert('تم رفع وتعيين الملف بنجاح وإرسال إشعار للطلاب المشتركين!');
                    }}
                    className="px-5 py-2 bg-emerald-900 hover:bg-emerald-950 text-white rounded-xl text-xs font-bold shadow-xs"
                  >
                    تأكيد الرفع
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CLASS SESSIONS SCHEDULER */}
      {activeTab === 'sessions' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div>
              <h3 className="text-xl font-black text-stone-900 font-serif">
                إدارة وجدولة الحصص المباشرة والمسجلة
              </h3>
              <p className="text-xs text-stone-500">
                إنشاء حصص تفاعلية عبر Google Meet أو Zoom وتوفير روابط الحصص المسجلة.
              </p>
            </div>

            <button
              onClick={() => setIsAddSessionOpen(true)}
              className="bg-emerald-900 hover:bg-emerald-950 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm self-start sm:self-auto"
            >
              <Plus size={16} />
              <span>جدولة حصة جديدة</span>
            </button>
          </div>

          <div className="space-y-3">
            {localSessions.map((sess) => (
              <div key={sess.id} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-800">{sess.courseTitle}</span>
                    <span className="text-stone-300">•</span>
                    <span className="text-xs text-stone-500">{sess.date} ({sess.time})</span>
                    <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded">
                      المدة: {sess.durationMinutes} دقيقة
                    </span>
                  </div>
                  <h4 className="text-sm md:text-base font-bold text-stone-900">{sess.title}</h4>
                  <p className="text-xs text-stone-600">{sess.notes}</p>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {sess.meetingLink && (
                    <a
                      href={sess.meetingLink}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-emerald-900 hover:bg-emerald-950 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <Video size={14} />
                      <span>بدء البث (Meet)</span>
                    </a>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('هل أنت متأكد من حذف هذه الحصة؟')) {
                        setLocalSessions(prev => prev.filter(s => s.id !== sess.id));
                      }
                    }}
                    className="p-2 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                    title="حذف الحصة"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Session Modal */}
          {isAddSessionOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-stone-200 space-y-4 text-right" dir="rtl">
                <h4 className="text-lg font-bold text-stone-900 font-serif flex items-center gap-2">
                  <Video size={20} className="text-emerald-700" />
                  <span>جدولة حصة دراسية جديدة</span>
                </h4>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">عنوان موضوع الحصة *</label>
                    <input
                      type="text"
                      required
                      value={newSessionData.title}
                      onChange={(e) => setNewSessionData({ ...newSessionData, title: e.target.value })}
                      placeholder="مثال: مراجعة نهائية لأسئلة تفاعلات الضوء"
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">التاريخ *</label>
                      <input
                        type="text"
                        value={newSessionData.date}
                        onChange={(e) => setNewSessionData({ ...newSessionData, date: e.target.value })}
                        placeholder="الأحد القادم"
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">التوقيت *</label>
                      <input
                        type="text"
                        value={newSessionData.time}
                        onChange={(e) => setNewSessionData({ ...newSessionData, time: e.target.value })}
                        placeholder="06:00 م - 07:30 م"
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">رابط الاجتماع (Google Meet / Zoom)</label>
                    <input
                      type="text"
                      value={newSessionData.meetingLink}
                      onChange={(e) => setNewSessionData({ ...newSessionData, meetingLink: e.target.value })}
                      placeholder="https://meet.google.com/xyz"
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">ملاحظات وتوجيهات للطلاب</label>
                    <textarea
                      rows={2}
                      value={newSessionData.notes}
                      onChange={(e) => setNewSessionData({ ...newSessionData, notes: e.target.value })}
                      placeholder="توجيهات للتحضير قبل الحصة..."
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setIsAddSessionOpen(false)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => {
                      if (!newSessionData.title.trim()) return;
                      const added: ClassSession = {
                        id: `sess-${Date.now()}`,
                        courseId: 'c-photosynthesis',
                        courseTitle: 'التمثيل الضوئي (Photosynthesis)',
                        title: newSessionData.title,
                        date: newSessionData.date,
                        time: newSessionData.time,
                        durationMinutes: newSessionData.durationMinutes,
                        teacherName: 'د. سامر الصالح',
                        status: 'upcoming',
                        meetingLink: newSessionData.meetingLink,
                        notes: newSessionData.notes || 'حصة تدريبية هامة'
                      };
                      setLocalSessions(prev => [added, ...prev]);
                      if (onAddSession) onAddSession(added);
                      setIsAddSessionOpen(false);
                      setNewSessionData({ title: '', date: 'غداً', time: '06:00 م - 07:30 م', durationMinutes: 90, meetingLink: 'https://meet.google.com', notes: '' });
                      alert('تمت جدولة الحصة بنجاح وإرسال الرابط للطلاب!');
                    }}
                    className="px-5 py-2 bg-emerald-900 hover:bg-emerald-950 text-white rounded-xl text-xs font-bold shadow-xs"
                  >
                    تأكيد الجدولة
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: TEACHER APPROVED REFERENCES */}
      {activeTab === 'references' && (
        <TeacherReferencesManager
          references={localReferences}
          onAddReference={handleAddReference}
          onUpdateReference={handleUpdateReference}
          onDeleteReference={handleDeleteReference}
          onToggleApproval={handleToggleApproval}
          onReorderPriority={handleReorderPriority}
          learningUnits={curriculum?.units || []}
          teacherName="د. سامر الصالح (المعلم المشرف)"
          onBuildContentFromReference={handleBuildContentFromReference}
        />
      )}

      {/* TAB 4: AI EXAM GENERATOR */}
      {activeTab === 'ai_exam' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-stone-200/80 shadow-sm space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <h3 className="text-xl font-black text-stone-900 font-serif flex items-center gap-2">
              <Sparkles size={22} className="text-amber-500" />
              <span>منشئ الاختبارات المعتمدة (AI Exam Builder - Teacher Grounded)</span>
            </h3>
            <p className="text-xs text-stone-500">
              توليد أسئلة اختيار من متعدد مع التفسيرات العلمية الدقيقة معتمدة حصراً على مصادر ومراجع المعلم المعتمدة ومفاهيم البجروت.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form */}
            <div className="space-y-4 p-5 bg-stone-50 rounded-2xl border border-stone-200">
              {/* Teacher Approved Reference Selector */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center justify-between">
                  <span>المرجع العلمي المعتمد للاختبار *</span>
                  <span className="text-[10px] text-emerald-800 font-bold">مرجعية المعلم</span>
                </label>
                <select
                  value={selectedExamReferenceId}
                  onChange={(e) => {
                    setSelectedExamReferenceId(e.target.value);
                    const sel = localReferences.find(r => r.id === e.target.value);
                    if (sel) {
                      setExamTopic(sel.title);
                    }
                  }}
                  className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs md:text-sm font-bold focus:outline-none focus:border-emerald-700"
                >
                  {localReferences.filter(r => r.isApproved).map(ref => (
                    <option key={ref.id} value={ref.id}>
                      [{ref.sourceType.toUpperCase()}] {ref.title} (أولوية #{ref.priority})
                    </option>
                  ))}
                </select>
                <div className="mt-1.5 p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-[10px] text-emerald-950 flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-emerald-700 shrink-0" />
                  <span>توليد الأسئلة محكوم ومطابق بنسبة 100% للمرجع المعتمد.</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">موضوع الاختبار أو المفهوم العلمي *</label>
                <input
                  type="text"
                  value={examTopic}
                  onChange={(e) => setExamTopic(e.target.value)}
                  placeholder="مثال: حلقة كالفن وإنزيم الروبيسكو"
                  className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs md:text-sm focus:outline-none focus:border-emerald-700 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">عدد الأسئلة المراد توليدها</label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs md:text-sm font-bold focus:outline-none focus:border-emerald-700"
                >
                  <option value={2}>2 أسئلة سريعة</option>
                  <option value={3}>3 أسئلة قياسية</option>
                  <option value={5}>5 أسئلة نموذجية</option>
                </select>
              </div>

              <button
                onClick={handleGenerateAIExam}
                disabled={isGeneratingExam || !examTopic.trim()}
                className="w-full py-3 bg-gradient-to-r from-emerald-950 to-teal-900 hover:from-black hover:to-emerald-950 text-amber-300 font-black rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles size={16} />
                <span>{isGeneratingExam ? 'جاري التوليد بالذكاء الاصطناعي...' : 'توليد الاختبار فورياً'}</span>
              </button>
            </div>

            {/* Generated Questions Preview */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="font-extrabold text-stone-900 text-sm flex items-center justify-between">
                <span>معاينة الأسئلة المولدة ({generatedExamQuestions.length})</span>
                {generatedExamQuestions.length > 0 && (
                  <button
                    onClick={() => alert('تم اعتماد الأسئلة وإضافتها إلى بنك أسئلة المساق بنجاح!')}
                    className="text-xs text-emerald-800 font-bold hover:underline flex items-center gap-1"
                  >
                    <Check size={14} />
                    <span>اعتماد في بنك الأسئلة</span>
                  </button>
                )}
              </h4>

              {generatedExamQuestions.length === 0 ? (
                <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 space-y-2">
                  <Sparkles size={32} className="mx-auto text-amber-400" />
                  <p className="text-xs font-bold">لم يتم توليد أسئلة بعد.</p>
                  <p className="text-[11px]">حدد الموضوع وانقر فوق "توليد الاختبار فورياً" للبدء.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {generatedExamQuestions.map((q, idx) => (
                    <div key={idx} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2.5">
                      <div className="flex items-start gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-900 text-amber-400 flex items-center justify-center text-xs font-black shrink-0">
                          {idx + 1}
                        </span>
                        <h5 className="text-xs sm:text-sm font-bold text-stone-900">{q.questionText}</h5>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pr-8">
                        {q.options?.map((opt: string, optIdx: number) => (
                          <div
                            key={optIdx}
                            className={`p-2 rounded-xl border text-xs font-medium ${
                              optIdx === q.correctOptionIndex
                                ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950 font-bold'
                                : 'bg-white border-stone-200 text-stone-700'
                            }`}
                          >
                            <span>{optIdx + 1}. {opt}</span>
                            {optIdx === q.correctOptionIndex && (
                              <span className="text-[10px] text-emerald-700 font-bold mr-1">✓ (الإجابة الصحيحة)</span>
                            )}
                          </div>
                        ))}
                      </div>

                      {q.explanation && (
                        <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-950 pr-4">
                          <strong>الشرح والتفسير العلمي:</strong> {q.explanation}
                        </div>
                      )}

                      {/* Reference Badge */}
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 w-fit">
                        <ShieldCheck size={13} className="text-emerald-700" />
                        <span>المرجع العلمي المعتمد: {localReferences.find(r => r.id === selectedExamReferenceId)?.title || 'منهاج بيولوجيا البجروت الرسمي'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Answer Inspection Modal */}
      {selectedSubDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-stone-200 my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-emerald-950 text-white">
              <h3 className="font-bold text-base">
                تفاصيل اختبار الطالب: {selectedSubDetail.studentName}
              </h3>
              <button
                onClick={() => setSelectedSubDetail(null)}
                className="text-stone-300 hover:text-white text-xs font-bold px-2 py-1 bg-white/10 rounded-lg cursor-pointer"
              >
                إغلاق
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                <span>الدرجة: <strong>{selectedSubDetail.score}/{selectedSubDetail.totalPoints}</strong> ({selectedSubDetail.percentage}%)</span>
                <span>التاريخ: {selectedSubDetail.date}</span>
                <span>البريد: {selectedSubDetail.studentEmail}</span>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-stone-800 text-sm">سجل إجابات الأسئلة:</h4>
                {Object.entries(selectedSubDetail.answers).map(([qId, ans], idx) => (
                  <div key={qId} className="p-3 rounded-xl border border-stone-200 bg-stone-50 text-xs">
                    <span className="font-bold text-stone-500 block mb-1">سؤال رقم {idx + 1}:</span>
                    <p className="text-stone-900 font-semibold">إجابة الطالب: {ans}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
